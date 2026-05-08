---
topic: callbacks
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/CallbackRequest.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/CallbackResponse.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackType.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/stdapi/CallbackInvoker.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/AfterSubmitCallbackResponse.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/SignificantItem.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/GetCaseCallbackResponse.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseDetails.java
status: confluence-augmented
confluence:
  - id: "1438948553"
    title: "CCD Callback Framework"
    last_modified: "unknown"
    space: "CRef"
  - id: "1139900520"
    title: "Configurable Callback timeouts and retries"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1864476018"
    title: "Truncated CCD callbacks"
    last_modified: "unknown"
    space: "DATS"
  - id: "447021232"
    title: "CCD Workflow - States / Events / CallBacks"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1468020967"
    title: "Callback Patterns"
    last_modified: "unknown"
    space: "~lee.ash"
  - id: "1417545038"
    title: "CMC-126: Confirmation Pages Using Submitted Callbacks"
    last_modified: "unknown"
    space: "CRef"
confluence_checked_at: "2026-04-29T00:00:00Z"
---

# Callback Contract

CCD dispatches HTTP POST requests to your service at defined points in the event lifecycle. This page documents the exact JSON shape for each callback type, the expected response fields, and how CCD reacts to errors.

## TL;DR

- All callbacks are `POST` with a `CallbackRequest` body; your service returns a `CallbackResponse`.
- Four event-lifecycle types: `about_to_start`, `about_to_submit`, `mid_event`, `submitted` (plus `get_case`).
- Return `errors` to abort the event with HTTP 422; return `warnings` to prompt the user for confirmation.
- `submitted` fires after the DB commit — its failure is swallowed and does not roll back the case save.
- CCD retries failed callbacks up to 3 times (T+1 s, T+3 s) unless `retriesTimeout` is `[0]` for the event.
- Disable Jackson `AUTO_CLOSE_JSON_CONTENT` in your service to prevent silent data corruption from truncated responses.

---

## Callback types

| Type | Trigger | URL source | Can mutate data? | Failure rolls back? |
|---|---|---|---|---|
| `about_to_start` | `GET /cases/{caseId}/event-triggers/{eventId}` — before the form loads | `CaseEventDefinition.callBackURLAboutToStartEvent` | Yes — merged into form | Yes (422 returned to client) |
| `about_to_submit` | `POST /cases/{caseId}/events` — inside the DB transaction, before persist | `CaseEventDefinition.callBackURLAboutToSubmitEvent` | Yes — merged before save | Yes (transaction rolls back) |
| `mid_event` | Between wizard pages | `WizardPage.callBackURLMidEvent` | Yes — merged into next page | Yes (422 returned to client) |
| `submitted` | After DB commit | `CaseEventDefinition.callBackURLSubmittedEvent` | No — case already saved | No — exception is caught and logged |
| `get_case` | When case view is loaded (configured at case-type level) | `CaseTypeDefinition.callbackGetCaseUrl` | No — injects metadata fields only | No |

> `mid_event` URL is on `WizardPage`, not on the event definition (`CallbackInvoker.java:173`). Multiple mid-event callbacks are supported within a single event by assigning different callback URLs to different wizard pages.

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
    "last_state_modified_date": "2024-05-01T11:00:00.000",
    "case_data": {
      "applicantFirstName": "Jane",
      "applicantLastName": "Smith"
    },
    "data_classification": {
      "applicantFirstName": "PUBLIC",
      "applicantLastName": "PUBLIC"
    },
    "supplementary_data": {}
  },
  "case_details_before": {
    "id": 1234567890123456,
    "jurisdiction": "PROBATE",
    "case_type_id": "GrantOfRepresentation",
    "state": "CaseCreated",
    "case_data": {
      "applicantFirstName": "Jane"
    }
  },
  "event_id": "updateApplicantDetails",
  "ignore_warning": false
}
```

<!-- DIVERGENCE: Confluence and many service-team docs show the data field as "data", but CaseDetails.java:84 annotates it @JsonProperty("case_data"). The wire format is "case_data". The ccd-config-generator SDK accepts both via @JsonAlias("data"). Source wins. -->

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
| `id` | long | Internal numeric case reference (16 digits). |
| `jurisdiction` | string | Jurisdiction ID. |
| `case_type_id` | string | Case type ID. |
| `state` | string | Current state ID. |
| `security_classification` | string | `PUBLIC`, `PRIVATE`, or `RESTRICTED`. |
| `version` | integer | Optimistic-lock version counter. |
| `created_date` | ISO-8601 datetime | When the case was created. |
| `last_modified` | ISO-8601 datetime | When the case was last modified. |
| `last_state_modified_date` | ISO-8601 datetime | When the state last changed. |
| `case_data` | map | Case field values keyed by field ID. |
| `data_classification` | map | Per-field security classification. |
| `supplementary_data` | map | Service-managed supplementary data (not subject to case-type validation). |

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
  "significant_item": {
    "type": "DOCUMENT",
    "description": "Generated order",
    "url": "http://dm-store/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  },
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
| `security_classification` | string | No | Updated overall case classification. Validated by `SecurityValidationService` — must not downgrade. |
| `significant_item` | object | No | A document or item flagged as the most significant output of this event (see below). |
| `state` | string | No | New case state ID. If omitted, state remains unchanged. Also accepted as a key in `data` (lower priority than top-level). |
| `errors` | string array | No | Non-empty list causes CCD to return HTTP 422 to the client and abort the event. |
| `warnings` | string array | No | Non-empty list prompts user confirmation unless `ignore_warning` is `true`. If user has not confirmed, CCD returns HTTP 422. |
| `error_message_override` | string | No | Replaces the default error message in the 422 response when `errors` is non-empty. |

### `significant_item` sub-fields

Returned from `about_to_submit` to highlight the primary document produced by the event (e.g. a generated order). Validated by `ValidateSignificantDocument`.

| Field | Type | Notes |
|---|---|---|
| `type` | string | Currently only `DOCUMENT` is supported (`SignificantItemType.java`). |
| `description` | string | Human-readable label for the item. |
| `url` | string | Full URL to the document in dm-store/CDAM. |

### State priority in `about_to_submit`

CCD resolves the post-event state with the following priority (`CallbackResponse.updateCallbackStateBasedOnPriority()`):

1. Top-level `state` field in the response (highest priority).
2. A `state` key inside the `data` map (extracted and removed from data before merge).
3. The `PostConditionState` from the event definition (lowest priority — used if callback returns no state).

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
| `confirmation_header` | string | Markdown. Rendered as the confirmation panel heading (green box) in ExUI. |
| `confirmation_body` | string | Markdown. Rendered as the confirmation panel body below the heading. |

Both fields are optional. If the callback returns an error or times out, the failure is caught and logged — the case has already been saved (`DefaultCreateEventOperation.java:100-104`). The confirmation page button text ("Close and Return to case details") is hardcoded in `ccd-case-ui-toolkit` and cannot be customised via the callback response.
<!-- CONFLUENCE-ONLY: not verified in source -->

Markdown supported in these fields includes headings (`#`), bold, links, line breaks (`\n`, `<br/>`), and paragraphs. See [ngx-md](https://dimpu.github.io/ngx-md/) for the supported subset.
<!-- CONFLUENCE-ONLY: not verified in source -->

---

## `get_case` callback

The `get_case` callback is configured at the case-type level (not per-event). CCD invokes it when rendering case view to inject additional metadata fields.

- **URL**: `CaseTypeDefinition.callbackGetCaseUrl`
- **Retries**: `CaseTypeDefinition.retriesGetCaseUrl`
- **Response**: `GetCaseCallbackResponse` containing a `metadataFields` list of `CaseViewField` objects.

This is used for dynamically computed fields that are not stored in case data.

---

## HTTP and auth

### Request headers sent by CCD

| Header | Value |
|---|---|
| `Authorization` | User JWT (`SecurityUtils.java`) |
| `ServiceAuthorization` | S2S token for `ccd_data` service |
| `Content-Type` | `application/json` |
| `Client-Context` | Forwarded from the originating request if present; merged from response |

### Expected response status codes

| Status | CCD behaviour |
|---|---|
| `200 OK` | Response body parsed; `errors`/`warnings` evaluated. |
| `4xx` / `5xx` | Treated as `CallbackException`; retried up to 3 times. If still failing, the event is aborted with HTTP 422. |

---

## Retry behaviour

CCD retries on `CallbackException` with `@Retryable(maxAttempts=3, backoff=delay=1000ms, multiplier=3)` — attempts at T, T+1 s, T+4 s (`CallbackService.java:75`).

### Disabling retries

Set the `RetriesTimeout` column to `0` for the event. `CallbackInvoker.isRetriesDisabled()` checks for a single-element list containing `0` and uses `sendSingleRequest` instead of the retryable `send` (`CallbackInvoker.java:207-209`).

### Configuration columns

Each callback type has its own retries/timeout column in the CCD definition:

| Column | Applies to |
|---|---|
| `RetriesTimeoutAboutToStartEvent` | `about_to_start` |
| `RetriesTimeoutURLAboutToSubmitEvent` | `about_to_submit` |
| `RetriesTimeoutURLSubmittedEvent` | `submitted` |
| `RetriesTimeoutURLMidEvent` | `mid_event` (on WizardPage) |

### Effective timeout values

| Retry value | Attempt 1 timeout | Attempt 2 (after 1s delay) | Attempt 3 (after 3s delay) |
|---|---|---|---|
| Empty (default) | 60 s | 60 s | 60 s |
| `0` | 60 s (single attempt, no retry) | N/A | N/A |
| Any other value | 60 s | 60 s | 60 s |

> The per-callback configurable timeout values advertised in older documentation (comma-separated lists like `2,5,10`) are **not implemented** in CCD. Any value other than `0` behaves identically to leaving the column blank. The timeout is always 60 seconds per attempt.
<!-- CONFLUENCE-ONLY: not verified in source -->

### Timeout complications

Multiple layers impose their own timeouts. The callback code must be idempotent because CCD may re-invoke it after a timeout even if the first invocation actually completed.

| Layer | Default timeout | Effect if exceeded |
|---|---|---|
| CCD API Gateway | 30 s | User session dropped; CCD API may still be waiting |
| ExUI API (Node) | 120 s | Request fails from user perspective |
| CCD Data Store (callback) | 60 s per attempt, up to 184 s total | `CallbackException` raised |

If the gateway times out before CCD finishes its retry cycle, the user sees an error, but the callback may still succeed server-side. On the user's next page load, the case may have advanced.
<!-- CONFLUENCE-ONLY: not verified in source -->

### HTTP client timeouts

Connection and read timeouts are set via `${http.client.connection.timeout}` and `${http.client.read.timeout}` (`RestTemplateConfiguration.java`).

---

## Error and warning handling

```
callback returns errors: ["Field X is required"]
       |
       v
CallbackService.validateCallbackErrorsAndWarnings()
       |
       +-- errors non-empty?  -> throw ApiException -> HTTP 422
       |
       +-- error_message_override set (even without errors)?  -> throw ApiException -> HTTP 422
       |
       +-- warnings non-empty AND ignore_warning=false?  -> throw ApiException -> HTTP 422
                                                                (user must re-submit with ignore_warning=true)
```

The 422 body includes the `errors` list and, if set, `error_message_override` replaces the default message. The default message is: "Unable to proceed because there are one or more callback Errors or Warnings" (`CallbackService.java:49-50`).

Note: `error_message_override` alone (without `errors` or `warnings`) is also sufficient to trigger the 422 response (`CallbackService.java:194`).

---

## Truncated response prevention

A critical operational hazard: if your callback handler throws an exception **during JSON serialisation** of the response (e.g. a `NullPointerException` in a custom getter), Spring's default Jackson configuration will auto-close the JSON stream, producing a syntactically valid but **incomplete** response. CCD receives HTTP 200 with missing fields and **erases** those fields from the case.

**Mitigation** — disable `AUTO_CLOSE_JSON_CONTENT` in your service's `ObjectMapper`:

```java
@Bean
public ObjectMapper getMapper() {
    return JsonMapper.builder()
        .disable(JsonGenerator.Feature.AUTO_CLOSE_JSON_CONTENT)
        .build();
}
```

**Verification** — add a startup check:

```java
@Component
public class JacksonConfigurationVerifier {
    @Autowired
    public JacksonConfigurationVerifier(ObjectMapper objectMapper) {
        if (objectMapper.getFactory().isEnabled(JsonGenerator.Feature.AUTO_CLOSE_JSON_CONTENT)) {
            throw new IllegalStateException(
                "AUTO_CLOSE_JSON_CONTENT must be disabled to prevent silent data corruption.");
        }
    }
}
```

To detect past occurrences, search AppInsights traces for `Response already committed. Ignoring:`.

---

## Best-practice usage by callback type

| Callback | Appropriate use | Anti-pattern |
|---|---|---|
| `about_to_start` | Validate whether event can proceed; pre-populate fields; load dynamic lists | Orchestrating downstream calls |
| `mid_event` | Page-level validation; dynamic list refresh; transform displayed data | Orchestrating downstream calls |
| `about_to_submit` | Final validation; state override; data enrichment; set computed fields | Long-running orchestration (use `submitted` instead) |
| `submitted` | Notifications; correspondence; updating external systems; scheduling jobs | Expecting to mutate case data (already saved) |

If downstream orchestration is unavoidable in `about_to_submit`, the callback should return immediately, move the case to an "awaiting X" state, and trigger a subsequent event once processing completes. The callback must be idempotent because retries may cause multiple invocations.

---

## See also

- [Callbacks](../explanation/callbacks.md) — conceptual overview of the callback lifecycle
- [Implement a callback](../how-to/implement-a-callback.md) — step-by-step guide to writing and registering a callback handler
- [Event definition reference](event-definition.md) — where callback URLs are configured in the event definition

## Glossary

See [Glossary](glossary.md) for term definitions used in this page.

