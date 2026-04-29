---
topic: callbacks
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/CallbackRequest.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/CallbackResponse.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackType.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackInvoker.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/stdapi/CallbackInvoker.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Callback Contract

CCD dispatches HTTP POST requests to your service at defined points in the event lifecycle. This page documents the exact JSON shape for each callback type, the expected response fields, and how CCD reacts to errors.

## TL;DR

- All callbacks are `POST` with a `CallbackRequest` body; your service returns a `CallbackResponse`.
- Four event-lifecycle types: `about_to_start`, `about_to_submit`, `mid_event`, `submitted` (plus `get_case`).
- Return `errors` to abort the event with HTTP 422; return `warnings` to prompt the user for confirmation.
- `submitted` fires after the DB commit — its failure is swallowed and does not roll back the case save.
- CCD retries failed callbacks up to 3 times (T+1 s, T+3 s) unless `retriesTimeout` is `[0]` for the event.
- Both `Authorization` (user JWT) and `ServiceAuthorization` (S2S) headers are forwarded on every callback request.

---

## Callback types

| Type | Trigger | URL source | Can mutate data? | Failure rolls back? |
|---|---|---|---|---|
| `about_to_start` | `GET /cases/{caseId}/event-triggers/{eventId}` — before the form loads | `CaseEventDefinition.callBackURLAboutToStartEvent` | Yes — merged into form | Yes (422 returned to client) |
| `about_to_submit` | `POST /cases/{caseId}/events` — inside the DB transaction, before persist | `CaseEventDefinition.callBackURLAboutToSubmitEvent` | Yes — merged before save | Yes (transaction rolls back) |
| `mid_event` | Between wizard pages | `WizardPage.callBackURLMidEvent` | Yes — merged into next page | Yes (422 returned to client) |
| `submitted` | After DB commit | `CaseEventDefinition.callBackURLSubmittedEvent` | No — case already saved | No — exception is caught and logged |

> `mid_event` URL is on `WizardPage`, not on the event definition (`CallbackInvoker.java:182`).
> Decentralised case types skip `about_to_submit` and `submitted` (`CallbackInvoker.java:98-99, 123-125`).

---

## Request shape

All four lifecycle callbacks receive the same `CallbackRequest` body (`CallbackRequest.java`).

```json
{
  "case_details": {
    "id": 1234567890123456,
    "jurisdiction": "PROBATE",
    "case_type_id": "GrantOfRepresentation",
    "state": "CaseCreated",
    "security_classification": "PUBLIC",
    "version": 3,
    "created_date": "2024-01-15T09:30:00.000",
    "last_modified": "2024-06-10T14:22:00.000",
    "data": {
      "applicantFirstName": "Jane",
      "applicantLastName": "Smith"
    },
    "data_classification": {
      "applicantFirstName": "PUBLIC",
      "applicantLastName": "PUBLIC"
    }
  },
  "case_details_before": {
    "id": 1234567890123456,
    "jurisdiction": "PROBATE",
    "case_type_id": "GrantOfRepresentation",
    "state": "CaseCreated",
    "data": {
      "applicantFirstName": "Jane"
    }
  },
  "event_id": "updateApplicantDetails",
  "ignore_warning": false
}
```

### Request fields

| Field | Type | Notes |
|---|---|---|
| `case_details` | `CaseDetails` object | Current case state at point of callback. |
| `case_details_before` | `CaseDetails` object | Case state before this event began. `null` for `about_to_start` on a new case. |
| `event_id` | string | The event ID as defined in the case-type definition. |
| `ignore_warning` | boolean | `true` when the user has acknowledged warnings and re-submitted. |

### `case_details` sub-fields

| Field | Type | Notes |
|---|---|---|
| `id` | long | Internal numeric case reference. |
| `jurisdiction` | string | Jurisdiction ID. |
| `case_type_id` | string | Case type ID. |
| `state` | string | Current state ID. |
| `security_classification` | string | `PUBLIC`, `PRIVATE`, or `RESTRICTED`. |
| `version` | integer | Optimistic-lock version counter. |
| `created_date` | ISO-8601 datetime | |
| `last_modified` | ISO-8601 datetime | |
| `data` | map | Case field values keyed by field ID. |
| `data_classification` | map | Per-field security classification. |

---

## Response shape

For `about_to_start`, `about_to_submit`, and `mid_event`, return a `CallbackResponse` (`CallbackResponse.java`).

```json
{
  "data": {
    "applicantFirstName": "Jane",
    "applicantLastName": "Smith-Jones"
  },
  "data_classification": {
    "applicantFirstName": "PUBLIC",
    "applicantLastName": "PUBLIC"
  },
  "security_classification": "PUBLIC",
  "state": "CaseAmended",
  "errors": [],
  "warnings": [],
  "error_message_override": null
}
```

### Response fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `data` | map | No | Updated case fields. Merged over existing data. Omit fields you did not change. |
| `data_classification` | map | No | Updated per-field classifications. |
| `security_classification` | string | No | Updated overall case classification. |
| `state` | string | No | New case state ID. If omitted, state remains unchanged. |
| `errors` | string array | No | Non-empty list causes CCD to return HTTP 422 to the client and abort the event (`CallbackService.java:191-205`). |
| `warnings` | string array | No | Non-empty list prompts user confirmation unless `ignore_warning` is `true`. If user has not confirmed, CCD returns HTTP 422. |
| `error_message_override` | string | No | Replaces the default error message in the 422 response when `errors` is non-empty. |

---

## `submitted` callback — different response shape

The `submitted` callback uses `AfterSubmitCallbackResponse`, a simpler shape with no data mutation.

```json
{
  "confirmation_header": "# Application submitted",
  "confirmation_body": "Your application reference is **1234-5678-9012-3456**.\n\nWe will contact you within 5 working days."
}
```

| Field | Type | Notes |
|---|---|---|
| `confirmation_header` | string | Markdown. Rendered as the confirmation panel heading in ExUI. |
| `confirmation_body` | string | Markdown. Rendered as the confirmation panel body. |

Both fields are optional. If the callback returns an error or times out, the failure is caught and logged — the case has already been saved (`DefaultCreateEventOperation.java:100-104`).

---

## HTTP and auth

### Request headers sent by CCD

| Header | Value |
|---|---|
| `Authorization` | User JWT (`SecurityUtils.java:39-41`) |
| `ServiceAuthorization` | S2S token for `ccd_data` service |
| `Content-Type` | `application/json` |
| `Client-Context` | Forwarded from the originating request if present; merged from response |

### Expected response status codes

| Status | CCD behaviour |
|---|---|
| `200 OK` | Response body parsed; `errors`/`warnings` evaluated. |
| `4xx` / `5xx` | Treated as `CallbackException`; retried up to 3 times. If still failing, the event is aborted with HTTP 422. |

### Retry behaviour

CCD retries on `CallbackException` with `@Retryable(maxAttempts=3, backoff=delay=1000ms, multiplier=3)` — attempts at T, T+1 s, T+4 s (`CallbackService.java:75`). Disable retries for a specific event by setting `retriesTimeout` to `[0]` in the event definition; `CallbackInvoker.isRetriesDisabled()` then uses `sendSingleRequest` (`CallbackInvoker.java:76-83, 207-209`).

HTTP client timeouts are set via `${http.client.connection.timeout}` and `${http.client.read.timeout}` (`RestTemplateConfiguration.java:48-52`).

---

## Error and warning handling

```
callback returns errors: ["Field X is required"]
       │
       ▼
CallbackService.validateCallbackErrorsAndWarnings()
       │
       ├── errors non-empty?  → throw ApiException → HTTP 422
       │
       └── warnings non-empty AND ignore_warning=false?  → throw ApiException → HTTP 422
                                                                (user must re-submit with ignore_warning=true)
```

The 422 body includes the `errors` list and, if set, `error_message_override` replaces the default message (`CallbackService.java:191-205`).

---

## See also

- [Callbacks](../explanation/callbacks.md) — conceptual overview of the callback lifecycle
- [Implement a callback](../how-to/implement-a-callback.md) — step-by-step guide to writing and registering a callback handler
- [Event definition reference](event-definition.md) — where callback URLs are configured in the event definition

## Glossary

| Term | Definition |
|---|---|
| `CallbackRequest` | JSON body CCD POSTs to your service on every lifecycle callback. Defined in `CallbackRequest.java`. |
| `CallbackResponse` | JSON body your service returns for `about_to_start`, `about_to_submit`, and `mid_event`. Defined in `CallbackResponse.java`. |
| `AfterSubmitCallbackResponse` | Simplified response shape for `submitted` callbacks; carries confirmation markdown only. |
| `CallbackException` | Internal exception that triggers the retry mechanism in `CallbackService`. |
| `ignore_warning` | Boolean flag in the request; `true` when the user has confirmed a warning and the event is being re-submitted. |
