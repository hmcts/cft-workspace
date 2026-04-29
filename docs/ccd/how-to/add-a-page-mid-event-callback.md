---
topic: callbacks
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/MidEvent.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/CaseEventToFieldsGenerator.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CreateTestCase.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerAddNote.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerRoundTripData.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/common/ccd/PageBuilder.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseDataValidatorController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/MidEventCallback.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackType.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "262439680"
    title: "Callbacks (Webhooks) documentation"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1438948553"
    title: "CCD Callback Framework"
    last_modified: "unknown"
    space: "CRef"
  - id: "648970642"
    title: "RDM 2471 - MidEvent Callback"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1775332773"
    title: "CCD-5344 - Validation endpoint data exposure with MidEvent callbacks"
    last_modified: "unknown"
    space: "CCD"
  - id: "1056801404"
    title: "Show Conditions and how they work"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1839007406"
    title: "Callback System in IA Case API"
    last_modified: "unknown"
    space: "DATS"
---

# Add a Page Mid-Event Callback

## TL;DR

- A mid-event callback fires after the user clicks **Continue** on a wizard page and before the next page is shown — letting the service populate or validate fields between pages.
- Attach it per page: `fields().page("pageId", this::myMidEvent)` — keyed to the page ID, not to individual fields (`FieldCollection.java:495-498`).
- The SDK callback signature is `handle(CaseDetails<T,S> details, CaseDetails<T,S> detailsBefore)` — first parameter is the in-progress (after) snapshot, second is the pre-event (before) snapshot (`MidEvent.java:7`).
- The request payload only includes fields from the **current and previous pages** — fields on later pages are stripped. Successive mid-event calls in the same journey can therefore see different snapshots of unvisited fields.
- Mid-event responses are **not persisted** — only `aboutToSubmit`/decentralised submit writes data. To push computed values to a later page, set them on `details.getData()` and return `.data(...)`.
- Page show-conditions use CCD's expression syntax (`.showCondition("partyType=\"ORGANISATION\"")`) and run independently of the mid-event callback.

## Steps

### 1. Define your case data fields

Ensure the fields you want to read and write are present on your case data class. Fields written by the mid-event callback must be declared on `CaseData` with appropriate access annotations.

```java
// CaseData.java (excerpt)
@CCD(label = "Party type", access = {DefaultAccess.class})
private PartyType partyType;

@CCD(label = "Computed reference", access = {DefaultAccess.class})
private String computedReference;
```

### 2. Implement the mid-event callback method

The method must match the `MidEvent<T, S>` functional interface. The first parameter (`details`) is the in-progress case as the user has it on screen so far; the second (`detailsBefore`) is the case as it stood when the event began.

```java
// In your event @Component class
private AboutToStartOrSubmitResponse<CaseData, State> populateReference(
        CaseDetails<CaseData, State> details,        // in-progress (after)
        CaseDetails<CaseData, State> detailsBefore) {  // pre-event (before)

    CaseData data = details.getData();

    if (data.getPartyType() == null) {
        return AboutToStartOrSubmitResponse.<CaseData, State>builder()
                .errors(List.of("Party type is required"))
                .build();
    }

    data.setComputedReference("REF-" + data.getPartyType().name());

    return AboutToStartOrSubmitResponse.<CaseData, State>builder()
            .data(data)
            .build();
}
```

Key points:
- Return `.data(data)` to push mutations back to CCD. If you omit `.data()`, **only fields defined within the `data` node will be used to alter case data** — i.e. anything you don't include is left untouched.
- Return `.errors(List.of(...))` to block the user from advancing. The UI displays the error and keeps the user on the current page.
- `details` (often called `after`) holds the case data the user has entered on the current and previous pages; `detailsBefore` (often called `before`) holds the case data as it was when the event began.
- Do not rely on fields from pages the user hasn't yet visited being present in `details.getData()` — CCD strips them before invoking the callback (see [Why next-page fields are absent](#why-next-page-fields-are-absent)).

### 3. Wire the callback to the page

Call `fields().page(pageId, callback)` to attach the mid-event callback. All `.field()` / `.mandatory()` / `.optional()` calls made after this call belong to that page (`FieldCollection.java:495-498`).

```java
// In your CCDConfig.configure() or event @Component
@Override
public void configure(ConfigBuilder<CaseData, State, UserRole> configBuilder) {
    new PageBuilder(configBuilder
            .event("collect-party-details")
            .forAllStates()
            .name("Collect party details")
            .aboutToSubmitCallback(this::aboutToSubmit))
        .page("partyTypePage")                          // page 1 — no mid-event callback
            .mandatory(CaseData::getPartyType)
        .page("computedReferencePage", this::populateReference)  // page 2 — fires when page 1 is submitted
            .readonly(CaseData::getComputedReference)
        .page("confirmationPage")                       // page 3 — no mid-event callback
            .mandatory(CaseData::getSomeOtherField);
}
```

The mid-event callback registered on `"computedReferencePage"` fires when the user clicks **Continue** on `"partyTypePage"` (i.e. after completing the previous page, before rendering the next). The callback name is the destination page; the trigger is completing the preceding page.

### 4. Add a conditional page (optional)

Use `.showCondition(...)` on the page builder to show or hide a page based on field values. The SDK emits this as a `PageShowCondition` column in the generated CCD definition (`CaseEventToFieldsGenerator.java:145-150`).

```java
.page("additionalDetailsPage")
    .showCondition("partyType=\"ORGANISATION\"")
    .mandatory(CaseData::getOrganisationName)
```

<!-- DIVERGENCE: Earlier drafts of this page used `.pageShowConditions(...)`, but the SDK API is `.showCondition(condition)` on the page builder (`FieldCollection.java:373-376`). Source wins. -->

The condition syntax is CCD's expression language (see [Show-condition syntax](#show-condition-syntax) below). The field referenced must be on a preceding page or pre-populated by a mid-event callback — see "Validation of hidden fields" below.

### 5. Add an about-to-submit callback for final processing

The mid-event callback handles inter-page logic. Use `aboutToSubmitCallback` for final validation or side effects once the user submits the whole event.

```java
configBuilder.event("collect-party-details")
    .aboutToSubmitCallback(this::aboutToSubmit);
```

```java
private AboutToStartOrSubmitResponse<CaseData, State> aboutToSubmit(
        CaseDetails<CaseData, State> details,
        CaseDetails<CaseData, State> detailsBefore) {

    // Final validation / state mutation
    return AboutToStartOrSubmitResponse.<CaseData, State>builder()
            .data(details.getData())
            .state(State.Submitted)
            .build();
}
```

## Why next-page fields are absent

When CCD invokes a mid-event callback, the `case_details` request payload contains only the fields belonging to the current page and **previous** pages — never fields from pages the user hasn't yet visited. This is deliberate: a user can navigate **back** through pages without first fixing invalid values, and forwarding those invalid downstream values to the callback would let it make decisions on data that would never be persisted.

What this means in practice:

- On the first mid-event call, fields from later pages will be `null` (the user hasn't entered them yet).
- On a subsequent mid-event call after the user revisits an earlier page, fields from later pages will **also** be absent from the payload — even if the user had previously filled them in.
- Mid-event responses are not persisted; only `aboutToSubmit` / decentralised submit writes data. Anything you set during a mid-event is held in the in-progress event payload and re-supplied on the next mid-event call (or to `aboutToSubmit`).
- Successive mid-event callbacks in the same journey can therefore see different values for fields that aren't on pages already traversed. This is expected.

<!-- CONFLUENCE-ONLY: server-side reload-and-overlay behaviour described in https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=262439680 — the "stripped before sending to callback" behaviour is observable from the data store source (apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/MidEventCallback.java filters wizard pages by ID), but the explicit reload semantics aren't documented in source comments. -->

## Show-condition syntax

`.showCondition(...)` strings are evaluated against fields visible on the current and previous pages of the event, plus metadata like `[STATE]`. The grammar:

| Comparator | Example | Notes |
|---|---|---|
| `=` | `partyType="ORGANISATION"` | Exact equality. For multi-select, equals the **whole** comma-separated selection. |
| `!=` | `partyType!="INDIVIDUAL"` | Not equal. |
| `CONTAINS` | `tags CONTAINS "urgent"` | Multi-select only — true if the value is among the selections. |
| `="*"` | `partyType="*"` | Field has any value (i.e. is non-blank). |
| `=""` / `!=""` | `partyType!=""` | Blank check. |

Compound conditions:

```
partyType="ORGANISATION" AND organisationName!=""
partyType="INDIVIDUAL" OR partyType="SOLE_TRADER"
partyType!="OTHER" AND (organisationName!="" OR partyType="INDIVIDUAL")
```

`AND` and `OR` can be mixed in a single statement (RDM-10133); use parentheses to disambiguate priority. There's no documented hard limit on chained conditions, but the platform team has only QA'd up to 4.

Nested complex types use dotted paths: `applicantContact.address.AddressLine1="*"`.

Metadata works in show conditions: `[STATE]="Awaiting Review"`. CCD also supports `[INJECTED_DATA.<key>]` references for `CaseTypeTab`/`ComplexTypes` show conditions (configured via a `CallbackGetCase`/read callback on the case type) — but **not** for event page-show conditions.

<!-- CONFLUENCE-ONLY: full operator/value/wildcard grammar comes from https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1056801404 (Show Conditions and how they work). The SDK passes the show-condition string straight through to the generated `PageShowCondition` column without parsing it. -->

### Validation of hidden fields

If a **mandatory** field is never shown (because its show condition is never met) it is omitted from the logic that enables the page's Continue button — and is not displayed on the Check Your Answers (`ShowSummary`) page. A page show-condition that is never met effectively skips the page entirely.

The CaseField or Metadata referenced in a show condition **must** be present somewhere on the UI; otherwise its value is not sent to the front end and so isn't available for comparison.

## Access control on the response

Since CCD-5344 (now fixed), CCD applies access control to the data returned **from** the validate endpoint to ExUI. The flow is:

1. Service receives the full case data in the mid-event request.
2. Service returns case data (mutated or not) in the response.
3. CCD filters the response so that only fields the **user** has read access to are sent back to the client.

There is no change to the payload **sent** to the service — services still receive the entire case data, including fields the user can't read. But services should not rely on hidden fields **round-tripping** back to the UI: if a `FieldShowCondition` depends on a field the user can't read, it won't evaluate as expected.

<!-- CONFLUENCE-ONLY: access-control filtering of mid-event responses is described in https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1775332773 (CCD-5344). The data store applies access control via `AuthorisedValidateCaseFieldsOperation` — the source confirms the wiring (apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/domain/service/validate/AuthorisedValidateCaseFieldsOperation.java) but the user-visibility motivation is documented in Confluence. -->

## Callback signatures reference

| Callback type | SDK interface | Trigger |
|---|---|---|
| `aboutToStartCallback` | `AboutToStart<T,S>` | Before the first page is shown (called at least once per case/event creation) |
| Mid-event (per page) | `MidEvent<T,S>` | After user clicks Continue on a page, before next page renders |
| `aboutToSubmitCallback` | `AboutToSubmit<T,S>` | Before changes are persisted (called repeatedly if validation fails) |
| `submittedCallback` | `Submitted<T,S>` | After CCD persists the event |

The `MidEvent<T,S>` interface has the same shape as `AboutToSubmit<T,S>`: two `CaseDetails` parameters (`details`, `detailsBefore`) and an `AboutToStartOrSubmitResponse` return type (`MidEvent.java:6-7`).

The CCD-side endpoint that drives mid-event callbacks is `POST /case-types/{caseTypeId}/validate?pageId=<pageId>` on the data store (`CaseDataValidatorController.java:39-70`). ExUI calls this whenever the user clicks Continue on an event page; the `MidEventCallback` service then looks up the wizard page by ID and dispatches to the configured service URL (`MidEventCallback.java:54-63`).

### Multiple mid-event callbacks per event

The SDK pattern is one mid-event callback per page — `pagesToMidEvent` is a map keyed by page ID (`FieldCollection.java:39`), so each page can have at most one mid-event callback registered. The data-store `CallbackType` enum has a single `MID_EVENT` value (`CallbackType.java:8`); there is no second mid-event slot in the SDK or the data store.

<!-- DIVERGENCE: The Civil Reform "CCD Callback Framework" Confluence page (https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1438948553) describes a `MID_SECONDARY` enum value and a `cases/callbacks/mid-secondary` URL. That is a service-team workaround inside `unspec-service`'s own callback handler, not part of CCD's `CallbackType` enum (apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackType.java only defines ABOUT_TO_START, ABOUT_TO_SUBMIT, SUBMITTED, MID_EVENT, GET_CASE). Source wins — if you need multiple mid-event behaviours per event, register one callback per page. -->

## What to read and write

| Situation | What to do |
|---|---|
| Read a field the user just filled in | Read from `details.getData()` (the first parameter) |
| Read a field that existed before the event started | Read from `detailsBefore.getData()` (the second parameter) |
| Push a computed value to a later page | Set it on `details.getData()` and return `.data(details.getData())` |
| Validate and block progress | Return `.errors(List.of("message"))` — `.data()` is ignored when errors are present |
| Show a non-blocking message | Return `.warnings(List.of("message"))` — user sees a warning but can proceed |
| Allow progress without changes | Return `.data(details.getData())` (or omit `.data()` to leave fields untouched) |

## Verify

1. Start the local stack (`./gradlew bootRun` or via cftlib) and open an existing case.
2. Trigger the event. Fill in the first page and click **Continue**.
3. Confirm the mid-event callback fires: the computed field should appear populated on the second page, or — if you returned an error — the UI should display the error and remain on the first page.
4. Check application logs. CCD-side, look for `POST /case-types/<caseType>/validate?pageId=<pageId>` against the data store. Service-side, the inbound URL is whatever you registered (in SDK projects it's typically `POST /callbacks/mid-event` or similar). Set `LOG_CALLBACK_DETAILS=*` (data store env var) to log full callback request/response JSON during investigation; turn it off again afterwards because the payloads can contain sensitive case data.

## See also

- [`docs/ccd/explanation/callbacks.md`](../explanation/callbacks.md) — overview of all callback types and their lifecycle
- [`docs/ccd/reference/event-configuration.md`](../reference/event-configuration.md) — full event builder field reference
- [`docs/ccd/how-to/add-an-about-to-submit-callback.md`](add-an-about-to-submit-callback.md) — final-submission callback how-to

## Example

<!-- source: libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerRoundTripData.java:30-96 -->
```java
// from libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerRoundTripData.java
@Override
public void configure(final ConfigBuilder<CaseData, State, UserRole> configBuilder) {
    new PageBuilder(configBuilder
        .event(CASEWORKER_ROUNDTRIP_DATA)
        .forAllStates()
        .aboutToStartCallback(this::roundTripStart)
        .aboutToSubmitCallback(this::roundTripSubmit)
        .name("Populate round-trip data")
        .grant(CREATE_READ_UPDATE_DELETE, SUPER_USER, CASE_WORKER))
        .page("roundTripData", this::roundTripMidEvent)  // mid-event callback wired here
        .pageLabel("Round-trip data set")
        .optional(CaseData::getApplicationType)
        .optional(CaseData::getSetInAboutToStart)
        .optional(CaseData::getSetInMidEvent)
        .optional(CaseData::getSetInAboutToSubmit)
        .done();
}

// Mid-event callback fires when user navigates off the "roundTripData" page:
private AboutToStartOrSubmitResponse<CaseData, State> roundTripMidEvent(
    CaseDetails<CaseData, State> details,
    CaseDetails<CaseData, State> before
) {
    details.getData().setSetInMidEvent(MID_EVENT_MARKER);
    return AboutToStartOrSubmitResponse.<CaseData, State>builder()
        .data(details.getData())
        .build();
}
```
