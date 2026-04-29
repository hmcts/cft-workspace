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
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "262439680"
    title: "Callbacks (Webhooks) documentation"
    space: "RCCD"
  - id: "1139900520"
    title: "Configurable Callback timeouts and retries"
    space: "RCCD"
  - id: "1468020967"
    title: "Callback Patterns"
    space: "~lee.ash"
  - id: "1839007406"
    title: "Callback System in IA Case API"
    space: "DATS"
  - id: "1417545038"
    title: "CMC-126: Confirmation Pages Using Submitted Callbacks"
    space: "CRef"
---

# Implement a Callback

## TL;DR

- A callback is an HTTP POST that CCD sends to your service at key points in an event lifecycle: `about_to_start`, `mid_event`, `about_to_submit`, and `submitted`. CCD treats it as an RPC, not a REST call — return HTTP 200 for valid invocations and reserve 4xx/5xx for genuine failures.
- CCD posts a `CallbackRequest` JSON body containing `case_details`, `case_details_before`, `event_id`, and `ignore_warning`. Full shape: see [Callback contract reference](../reference/callback-contract.md).
- Your handler returns a `CallbackResponse` with `data` (mutated fields), `errors`, and/or `warnings`; non-empty `errors` causes CCD to return HTTP 422 to the caller.
- CCD adds `ServiceAuthorization` (S2S) and `Authorization` (user JWT) headers to every callback; validate the S2S token.
- `about_to_submit` runs inside the CCD transaction; `submitted` runs after commit and its failure is swallowed — use it only for side-effects such as notifications.
- Retry: CCD retries failed callbacks up to three times (T+1 s, T+3 s) unless the event definition sets `retriesTimeout: [0]`. Each callback attempt has a 60 s timeout — the callback may complete after CCD has already given up, so handlers must be idempotent.

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

If you author a raw definition spreadsheet, the four URL columns and their retry-timeout
companions are:

| Callback | URL column | Retries column |
|---|---|---|
| `about_to_start` | `CallBackURLAboutToStartEvent` | `RetriesTimeoutAboutToStartEvent` |
| `about_to_submit` | `CallBackURLAboutToSubmitEvent` | `RetriesTimeoutURLAboutToSubmitEvent` |
| `submitted` | `CallBackURLSubmittedEvent` | `RetriesTimeoutURLSubmittedEvent` |
| `mid_event` | `CallBackURLMidEvent` (on the wizard page) | `RetriesTimeoutURLMidEvent` |

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

`case_details.data` is a `Map<String, JsonNode>` (or typed via the SDK generics). For the
full shape of `CaseDetails` (jurisdiction, classification, supplementary data, etc.) see
[Callback contract reference](../reference/callback-contract.md).

Three behavioural details shape what your handler can rely on:

- **`about_to_start` may be called more than once** for the same event because of CCD's
  save-and-resume logic — the partially populated form is saved if the user navigates away
  before the final page. Your `about_to_start` handler must therefore be idempotent.
- **`mid_event` only sees current-and-previous-page fields**: CCD strips fields on later
  pages from the payload before invoking the callback. Successive mid-event callbacks in
  the same journey can see different values for fields not yet visited (e.g. first call
  sees `null`, second call sees the stored value once the user has visited that page).
  Mid-event responses are also not persisted — only `about_to_submit` writes data.
  <!-- CONFLUENCE-ONLY: "successive mid-event callbacks can see different values" — sourced from
       Confluence 262439680; the source code in MidEventCallback / DefaultGetEventOperation
       implements page-trimming but the user-visible consequence isn't documented in source. -->
- **`about_to_submit` may also be called multiple times** per logical user submission if
  validation errors are returned and the user re-submits — see
  [Confluence 262439680](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=262439680)
  for the exhaustive list of scenarios.

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

`submitted` callbacks use a different response type with `confirmation_header` and
`confirmation_body` fields (`AfterSubmitCallbackResponse`). Both fields accept Markdown and
render in the green confirmation box / body of the post-submit page in ExUI:

```java
@PostMapping("/submitted")
public SubmittedCallbackResponse handleSubmitted(@RequestBody CallbackRequest req) {
    Long id = req.getCaseDetails().getId();
    return SubmittedCallbackResponse.builder()
        .confirmationHeader(format("# You've responded\n## Claim number: %s", id))
        .confirmationBody("<br/><p>Defendant must respond before " + LocalDate.now() + "</p>")
        .build();
}
```

#### Two warnings about the about-to-submit response

- **`data` and `data_classification` are PUT, not PATCH.** What you return is what gets
  persisted: any fields you omit from the response `data` are not preserved by CCD —
  copy the input data, mutate, and return the full map. The same holds for
  `data_classification`: returning a partial map *replaces* the existing classifications
  for the case rather than merging.
  <!-- CONFLUENCE-ONLY: PUT-vs-PATCH for data_classification is documented in Confluence 262439680;
       not explicitly called out in CallbackResponse.java, though the merge behaviour in
       DefaultCreateEventOperation is consistent with this. -->
- **`state` override is a top-level metadata field.** Set `state` on the response to
  override the post-event state; the case is only re-stated if the value is non-null.
  An older approach using a case field of type Text with id `state` is **deprecated** —
  do not introduce new uses of it (RDM-6970). See
  [reference/callback-contract.md](../reference/callback-contract.md) for the full table.

### 6. Handle idempotency

CCD retries callbacks up to three times on failure (`CallbackService.java:75`):
`@Retryable(CallbackException.class, maxAttempts=3, backoff=delay=1000ms, multiplier=3)`.
The retry schedule is T+1 s, T+3 s.

Each individual attempt has a 60 s timeout (this is the only configured timeout — see the
"Unimplemented configurability" note below). With three attempts plus delays, CCD can wait
up to ~184 s before giving up — but **the upstream caller is bounded by tighter limits**:

- The CCD API Gateway times out user sessions at **30 s**.
- The ExUI / XUI API layer times out at the nodejs default of **120 s**.
- The CCD API itself waits at least 60 s per attempt.

This staircase means your callback can complete *after* CCD has already aborted — when the
user logs back in, they may see the case as it was originally (CCD rolled back) yet your
side-effects have already fired.
<!-- CONFLUENCE-ONLY: cross-system timeout cascade (30 s gateway / 120 s ExUI / 60 s CCD)
     is operational documentation in Confluence 1139900520; not present in source. -->

Your handler must therefore be safe to call multiple times with the same input:

- Do not send duplicate notifications inside `about_to_submit` — move side-effects to `submitted`.
- For external API calls (document generation, payment), guard with a check such as "has document already been generated for this event token?" before calling downstream.
- If your handler calls another service that requires idempotency, pass a stable key derived from `case_details.id` + `event_id`.

To disable retries on a specific event, set `retriesTimeout: [0]` in the event definition.
CCD then calls `CallbackService.sendSingleRequest()` instead of the retryable path
(`CallbackInvoker.java:77-83` for about-to-start, `CallbackInvoker.java:103-109` for
about-to-submit). `CallbackInvoker.isRetriesDisabled()` only treats the literal list `[0]`
as disabling retries.

#### Unimplemented configurability

The `RetriesTimeoutURL...` columns in the definition spreadsheet were originally specified
to take a comma-separated list of per-attempt timeouts (e.g. `2,5,10` = three attempts at
2 s, 5 s, 10 s). **This is not implemented.** Anything other than the single value `0` is
treated like an empty value and uses the default schedule above. RDM-4316 in
`CallbackService.java:42` records the discarded behaviour.
<!-- DIVERGENCE: Confluence 1139900520 historically advertised configurable per-attempt timeouts
     and unlimited retries. Source confirms (CallbackService.java:42 comment, fixed @Retryable
     annotation) that only `[0]` is honoured. Source wins. -->

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

### 9. Pick the right callback for the job

A single event can have all four callbacks wired, but most should not. The CCD BA-blessed
patterns are:
<!-- CONFLUENCE-ONLY: derived from Confluence 1468020967 "Callback Patterns" (Lee Ash personal
     space) and 1839007406 "Callback System in IA Case API". These are guidance, not enforced
     by source. -->

| Callback | Use for | Don't use for |
|---|---|---|
| `about_to_start` | Pre-populating fields, gating event start with complex business rules, dynamic-list lookups | Orchestrating downstream processing |
| `mid_event` | Per-page validation, mutating fields shown on later pages, dynamic lists | Orchestrating downstream processing; relying on fields the user hasn't reached yet |
| `about_to_submit` | Validating data before persistence, computing derived fields, overriding `state` | Sending notifications, writing to other systems, or any side-effect that must not double-fire on retry |
| `submitted` | Notifications, document generation triggers, audit webhooks, confirmation pages | Anything that must roll back if the case save fails (it can't — the save has already committed) |

If you genuinely need to orchestrate downstream processing before the case is saved (e.g.
a payment provider that must succeed first), the BA recommendation is: return immediately
from the callback, model an `awaiting_x` state, and trigger a follow-up event when the
downstream call completes. Do not block in `about_to_submit`.

#### Single-handler invariant

The `ccd-config-generator` SDK registers exactly one handler per event-and-stage. Some
hand-rolled services (notably IA and SSCS) build their own dispatcher that runs multiple
`PreSubmitCallbackHandler` beans in sequence per event. If you adopt that pattern, be aware
that the dispatcher loop can lose changes when one handler returns a *copy* of case data and
a later handler mutates the *original* — see the SSCS Create Bundle post-mortem
([Confluence 1783782103](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1783782103)).
Either feed each handler the previous handler's output, or stick to one handler per event.

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

3. To debug a callback against a deployed CCD, set the `LOG_CALLBACK_DETAILS` env var on
   the data-store-api pod. It accepts a comma-separated list of URL substrings (matched
   with `String::contains`), or `*` to log everything (`CallbackService.java:262-267`).
   Off by default because callback bodies often contain sensitive case data.

   ```bash
   LOG_CALLBACK_DETAILS=/case-orchestration/payment-confirmation,/case-orchestration/notify
   ```

## See also

- [Callbacks](../explanation/callbacks.md) — lifecycle phases and sequence diagram
- [Callback contract reference](../reference/callback-contract.md) — full request/response field reference

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

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
