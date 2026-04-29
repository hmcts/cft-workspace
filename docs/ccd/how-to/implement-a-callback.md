---
topic: callbacks
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/CallbackRequest.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/CallbackResponse.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/stdapi/CallbackInvoker.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/DefaultCreateEventOperation.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/NoFaultDivorce.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/caseworker/event/CaseworkerConfirmService.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemApplyNoticeOfChange.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Implement a Callback

## TL;DR

- A callback is an HTTP POST that CCD sends to your service at key points in an event lifecycle: `about_to_start`, `about_to_submit`, `submitted`, and `mid_event`.
- CCD posts a `CallbackRequest` JSON body containing `case_details`, `case_details_before`, `event_id`, and `ignore_warning`.
- Your handler returns a `CallbackResponse` with `data` (mutated fields), `errors`, and/or `warnings`; non-empty `errors` causes CCD to return HTTP 422 to the caller.
- CCD adds `ServiceAuthorization` (S2S) and `Authorization` (user JWT) headers to every callback; validate the S2S token.
- `about_to_submit` runs inside the CCD transaction; `submitted` runs after commit and its failure is swallowed — use it only for side-effects such as notifications.
- Retry: CCD retries failed callbacks up to three times (T+1 s, T+3 s) unless the event definition sets `retriesTimeout: [0]`.

## Steps

### 1. Register the callback URL in the event definition

In your CCD definition (or via `ccd-config-generator` SDK), set one or more callback URLs on the event:

```json
{
  "CallBackURLAboutToStartEvent": "https://your-service/callbacks/about-to-start",
  "CallBackURLAboutToSubmitEvent": "https://your-service/callbacks/about-to-submit",
  "CallBackURLSubmittedEvent": "https://your-service/callbacks/submitted"
}
```

With the `ccd-config-generator` SDK, chain callbacks on the `EventBuilder`:

```java
configBuilder.event("my-event")
    .forStates(DRAFT)
    .name("My Event")
    .aboutToStartCallback(this::aboutToStart)
    .aboutToSubmitCallback(this::aboutToSubmit)
    .submittedCallback(this::submitted);
```

The callback host is set once on the case-type config, not per-event
(`NoFaultDivorce.java:38` sets it from the `CASE_API_URL` environment variable).

For `mid_event`, the URL is taken from the `WizardPage` definition, not the event definition
(`CallbackInvoker.java:182`).

### 2. Implement the controller endpoints

Add a `@RestController` with the three paths CCD calls. Use the standard Spring MVC pattern:

```java
@RestController
@RequestMapping("/callbacks")
public class CcdCallbackController {

    @PostMapping("/about-to-start")
    public AboutToStartOrSubmitResponse<CaseData, State> aboutToStart(
            @RequestHeader(SERVICE_AUTHORIZATION) String serviceAuthorization,
            @RequestBody CallbackRequest callbackRequest) {

        verifyS2SToken(serviceAuthorization);   // see step 3
        CaseDetails<CaseData, State> details = extractDetails(callbackRequest);

        // mutate details.getData() as needed
        return AboutToStartOrSubmitResponse.<CaseData, State>builder()
                .data(details.getData())
                .build();
    }

    @PostMapping("/about-to-submit")
    public AboutToStartOrSubmitResponse<CaseData, State> aboutToSubmit(
            @RequestHeader(SERVICE_AUTHORIZATION) String serviceAuthorization,
            @RequestBody CallbackRequest callbackRequest) {
        // ...
    }

    @PostMapping("/submitted")
    public SubmittedCallbackResponse submitted(
            @RequestHeader(SERVICE_AUTHORIZATION) String serviceAuthorization,
            @RequestBody CallbackRequest callbackRequest) {
        // fire notifications, etc.
        return SubmittedCallbackResponse.builder().build();
    }
}
```

When using `ccd-config-generator`, the SDK framework registers callbacks reflectively — your event class is a plain `@Component` implementing `CCDConfig`, and the controller dispatch is handled by the SDK. No explicit `@RequestMapping` is needed on the event class (`service-nfdiv` research notes).

### 3. Validate the S2S token

CCD adds `ServiceAuthorization` (bearer token from S2S/SIDAM) and `Authorization` (user JWT) to every callback request (`CallbackService.java:140`). Your service must verify the S2S token:

```java
@Value("${idam.s2s-auth.microservice}")
private String expectedService;

private void verifyS2SToken(String serviceAuthorization) {
    String callingService = authTokenValidator.getServiceName(serviceAuthorization);
    if (!"ccd_data".equals(callingService)) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unexpected S2S caller: " + callingService);
    }
}
```

The calling service name is `ccd_data`. Use `uk.gov.hmcts.reform.authorisation.validators.AuthTokenValidator` from the `service-auth-provider-java-client` library.

### 4. Understand the request body

CCD sends a `CallbackRequest` (`CallbackRequest.java`) with these top-level fields:

| Field | Type | Notes |
|---|---|---|
| `case_details` | `CaseDetails` | Current case state, including `data` map |
| `case_details_before` | `CaseDetails` | Case state before the event; `null` for `about_to_start` |
| `event_id` | `String` | The triggering event's ID |
| `ignore_warning` | `boolean` | Whether the user acknowledged warnings |

`case_details.data` is a `Map<String, JsonNode>` (or typed via the SDK generics).

### 5. Return the response

Your handler must return a JSON body matching `CallbackResponse` (`CallbackResponse.java`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `data` | `Map<String, Object>` | No | Mutated case fields; merged back into the case |
| `data_classification` | `Map` | No | Field-level security classifications |
| `security_classification` | `String` | No | Overall case classification |
| `state` | `String` | No | Override the post-event case state |
| `errors` | `List<String>` | No | Non-empty list causes CCD to return HTTP 422 |
| `warnings` | `List<String>` | No | Shown to the user; ignored if `ignore_warning` is true |
| `error_message_override` | `String` | No | Replaces CCD's default error message on 422 |

Return errors as a list, not as exceptions (`SystemRequestNoticeOfChange.java:105-108`):

```java
List<String> errors = new ArrayList<>();
if (someConditionFailed) {
    errors.add("Cannot proceed: condition X was not met.");
}
return AboutToStartOrSubmitResponse.<CaseData, State>builder()
        .data(caseData)
        .errors(errors)
        .build();
```

`submitted` callbacks use a different response type with `confirmation_header` and `confirmation_body` fields (`AfterSubmitCallbackResponse`).

### 6. Handle idempotency

CCD retries callbacks up to three times on failure (`CallbackService.java:75`):
`@Retryable(CallbackException.class, maxAttempts=3, backoff=delay=1000ms, multiplier=3)`.
The retry schedule is T+1 s, T+3 s.

Your handler must be safe to call multiple times with the same input:

- Do not send duplicate notifications inside `about_to_submit` — move side-effects to `submitted`.
- For external API calls (document generation, payment), guard with a check such as "has document already been generated for this event token?" before calling downstream.
- If your handler calls another service that requires idempotency, pass a stable key derived from `case_details.id` + `event_id`.

To disable retries on a specific event, set `retriesTimeout: [0]` in the event definition. CCD then calls `CallbackService.sendSingleRequest()` instead of the retryable path (`CallbackInvoker.java:77-83` for about-to-start, `CallbackInvoker.java:103-109` for about-to-submit).

### 7. Handle the submitted callback correctly

`submitted` fires **after** the CCD database transaction has committed. CCD catches any `CallbackException` thrown from your endpoint and logs it — the case save is **not** rolled back (`DefaultCreateEventOperation.java:100-104`).

Consequences:
- Failures in `submitted` are silent from the user's perspective; the event appears successful.
- Never perform data mutations that must be consistent with the case save inside `submitted`.
- Use `submitted` for notifications, audit webhooks, and other fire-and-forget side-effects.
- Log and alert aggressively inside your `submitted` handler so silent failures are visible.

### 8. Handle errors returned to CCD

CCD calls `validateCallbackErrorsAndWarnings()` on your response (`CallbackService.java:191-205`):

- If `errors` is non-empty → CCD returns HTTP 422 to the original caller, using `error_message_override` if set.
- If `warnings` is non-empty **and** `ignore_warning` is `false` → CCD also returns 422; the UI shows the warnings and offers the user a chance to re-submit with `ignore_warning=true`.
- If `warnings` is non-empty **and** `ignore_warning` is `true` → warnings are ignored and the event proceeds.

Return your handler's own HTTP 200 in all cases where you want CCD to inspect `errors`/`warnings`. An HTTP 4xx/5xx from your service is treated as a callback failure (triggers retry), not a validation error.

## Verify

1. Trigger the event via ExUI or the CCD Data Store API (`POST /cases/{caseId}/events`). Check the event appears in the case history (`GET /cases/{caseId}/events`).
2. Confirm your service received the callback by inspecting application logs or a WireMock capture. In integration tests, assert via `MockMvc`:

```java
mockMvc.perform(post("/callbacks/about-to-submit")
        .header(SERVICE_AUTHORIZATION, "Bearer <s2s-token>")
        .contentType(APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(callbackRequest)))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.data.myField").value("expected-value"));
```

See `LegalAdvisorMakeDecisionIT.java` in nfdiv-case-api for a full `@SpringBootTest` + WireMock integration test pattern.

## See also

- [Callbacks](../explanation/callbacks.md) — lifecycle phases and sequence diagram
- [Callback contract reference](../reference/callback-contract.md) — full request/response field reference

## Glossary

| Term | Definition |
|---|---|
| `about_to_start` | Callback fired when a user opens an event form; can pre-populate or gate the form |
| `about_to_submit` | Callback fired before CCD persists the event; runs inside the CCD transaction |
| `submitted` | Callback fired after the CCD transaction commits; failures do not roll back the case save |
| `mid_event` | Callback fired between wizard pages; URL is on the `WizardPage`, not the event |
| S2S | Service-to-service token issued by SIDAM; validates the caller identity in the `ServiceAuthorization` header |

## Example

<!-- source: libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerAddNote.java:62-84 -->
```java
// from libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerAddNote.java

// aboutToSubmit callback method — receives current and before snapshots, returns mutated data:
public AboutToStartOrSubmitResponse<CaseData, State> aboutToSubmit(
    final CaseDetails<CaseData, State> details,
    final CaseDetails<CaseData, State> beforeDetails
) {
    log.info("Caseworker add notes callback invoked for Case Id: {}", details.getId());

    var caseData = details.getData();
    final User caseworkerUser = idamService.retrieveUser(request.getHeader(AUTHORIZATION));

    var params = new MapSqlParameterSource()
        .addValue("reference", details.getId())
        .addValue("author", caseworkerUser.getUserDetails().getName())
        .addValue("note", caseData.getNote());

    db.update(
        "insert into case_notes(reference, author, note) values (:reference, :author, :note)",
        params
    );

    return AboutToStartOrSubmitResponse.<CaseData, State>builder()
        .data(caseData)
        .build();
}
```
