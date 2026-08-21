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
  - ccd-data-store-api:src/main/resources/application.properties
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/RestTemplateConfiguration.java
  - cnp-flux-config:apps/ccd/ccd-data-store-api/prod.yaml
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/case-edit-confirm/case-edit-confirm.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/case-edit-confirm/case-edit-confirm.html
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/domain/confirmation.model.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/markdown/markdown-component.module.ts
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
title: Callback Contract
diataxis: reference
product: ccd
sources_sha:
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/CallbackRequest.java": "e52c0d58a4f31bf268ce1cee0553931f2c9e7634"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/CallbackResponse.java": "0c5bd4c1bc52130ee793289b9d59881e999a4a6b"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackService.java": "0c5bd4c1bc52130ee793289b9d59881e999a4a6b"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackType.java": "10297f77ee0795341f6c10ed4d2c3949004352b3"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/stdapi/CallbackInvoker.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/AfterSubmitCallbackResponse.java": "b40a37b41eef311b5612999246c6cf88fa759026"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/SignificantItem.java": "6f9c38a7fbd69966893d2ab2cd9108bbd036c551"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/GetCaseCallbackResponse.java": "79f714a392fbf79aec7acc2e648fb56bc7a11f68"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseDetails.java": "aa61dd252c0e9a2607835f1034c7dcf0376eebba"
  "ccd-data-store-api:src/main/resources/application.properties": "5daf60c31eeb61da276722c2639fa50d279a26a8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/RestTemplateConfiguration.java": "22de17a5ced831b6f4fc98c6d35cd036819fb9f6"
  "cnp-flux-config:apps/ccd/ccd-data-store-api/prod.yaml": "e2f115cfbdce6268b717d319e1c22ea4d8d9d1b2"
  ? "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/case-edit-confirm/case-edit-confirm.component.ts"
  : "db39163cb7de92af326a333fe7430558a051c135"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/case-edit-confirm/case-edit-confirm.html": "315741f6698ef3b7d46e49e27742eefae21d0e24"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/domain/confirmation.model.ts": "7f1b0d12f0af5a80788e266558817af09930cd4f"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/markdown/markdown-component.module.ts": "315741f6698ef3b7d46e49e27742eefae21d0e24"
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

Both fields are optional. If the callback returns an error or times out, the failure is caught and logged — the case has already been saved (`DefaultCreateEventOperation.java:100-104`). The confirmation page button text is hardcoded as `Close and Return to case details` (`ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/case-edit-confirm/case-edit-confirm.component.ts:18`) and the callback response cannot change it: the `Confirmation` object the toolkit builds from the response carries only case ID, status, header and body, and the template renders the button label from a separate component field (`case-edit-confirm.html:20`).

Both fields go through the toolkit's `<ccd-markdown>` component, which delegates to `ngx-markdown` (`markdown-component.module.ts:4`) — a `marked`-backed renderer, so the full CommonMark set is available, not a restricted subset. Headings, bold, links, line breaks and paragraphs all render.

<!-- DIVERGENCE: Confluence 1417545038 documents the confirmation-page markdown subset as ngx-md. Source: the toolkit imports ngx-markdown (ccd-case-ui-toolkit projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/markdown/markdown-component.module.ts:4). Source wins. -->

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

The integers in a `RetriesTimeout*` column are never read as timeouts. `isRetriesDisabled()` is the only consumer, and it tests for a single-element list containing `0` (`CallbackInvoker.java:207-209`) — every other value, including a comma-separated list like `2,5,10`, is indistinguishable from leaving the column blank. `CallbackService.java:42` records the discard.

The per-attempt timeout is a service-wide setting, not a per-callback one: `http.client.read.timeout`, defaulting to 30000 ms (`application.properties:195`) and set to `29000` in every deployed environment, production included (`cnp-flux-config:apps/ccd/ccd-data-store-api/prod.yaml:40`).

| Retry value | Attempts | Worst-case wall clock |
|---|---|---|
| Empty (default) | 3, at T, T+1 s, T+4 s | ~91 s (3 × 29 s + 4 s of backoff) |
| `0` | 1, no retry | ~29 s |
| Any other value | 3, at T, T+1 s, T+4 s | ~91 s |

<!-- DIVERGENCE: Confluence 1139900520 states the callback timeout is always 60 s per attempt, giving a 184 s ceiling. Source: the per-attempt limit is http.client.read.timeout — 30000 ms by default (ccd-data-store-api application.properties:195) and 29000 ms in every deployed environment (cnp-flux-config apps/ccd/ccd-data-store-api/prod.yaml:40), for a ~91 s ceiling. Source wins. -->

### Timeout complications

Multiple layers impose their own timeouts. The callback code must be idempotent because CCD may re-invoke it after a timeout even if the first invocation actually completed.

| Layer | Default timeout | Effect if exceeded |
|---|---|---|
| CCD API Gateway | 30 s | User session dropped; CCD API may still be waiting |
| ExUI API (Node) | 120 s | Request fails from user perspective |
| CCD Data Store (callback) | 29 s per attempt, up to ~91 s total | `CallbackException` raised |

The data-store ceiling sits close to the gateway's, so a callback that exhausts its retries will almost always outlive the browser request. The user sees an error, but the callback may still succeed server-side, and on the next page load the case may have advanced.
<!-- CONFLUENCE-ONLY: not verified in source -->

### HTTP client timeouts

Connection and read timeouts are set via `${http.client.connection.timeout}` and `${http.client.read.timeout}` (`RestTemplateConfiguration.java:48-52`), both defaulting to 30000 ms (`application.properties:194-195`).

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
