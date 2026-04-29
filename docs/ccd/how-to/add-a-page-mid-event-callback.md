---
topic: callbacks
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/MidEvent.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CreateTestCase.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerAddNote.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/common/ccd/PageBuilder.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Add a Page Mid-Event Callback

## TL;DR

- A mid-event callback fires after the user completes one wizard page and before the next page is shown — letting the service populate or validate fields in between.
- Attach it per page: `fields().page("pageId", this::myMidEvent)` — keyed to the page ID, not to individual fields (`FieldCollection.java:495`).
- The callback signature is `AboutToStartOrSubmitResponse<CaseData, State> myMidEvent(CaseDetails<CaseData, State> details, CaseDetails<CaseData, State> detailsBefore)` — current state first, before state second (`MidEvent.java:7`).
- Mutate `details.getData()` to push computed values to subsequent pages; return errors in the response to block progression.
- Page show-conditions (`pageShowCondition`) use CCD expression syntax and are independent of mid-event callbacks.
- `submitHandler` (decentralised mode) and `aboutToSubmitCallback`/`submittedCallback` (legacy webhook) are mutually exclusive — but mid-event callbacks work in both modes.

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

The method must match the `MidEvent<T, S>` functional interface. Read from `details.getData()` (the "after" snapshot — fields the user has filled in so far) and return mutated data or errors.

```java
// In your event @Component class
private AboutToStartOrSubmitResponse<CaseData, State> populateReference(
        CaseDetails<CaseData, State> before,
        CaseDetails<CaseData, State> after) {

    CaseData data = after.getData();

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
- Return `.data(data)` to push mutations back to CCD. If you omit `.data()`, CCD discards your changes.
- Return `.errors(List.of(...))` to block the user from advancing. The UI displays the error and keeps the user on the current page.
- `before` holds the case data as it was when the event started; `after` holds the data the user has entered up to this page.

### 3. Wire the callback to the page

Call `fields().page(pageId, callback)` to attach the mid-event callback. All `.field()` calls made after this call belong to that page.

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

The mid-event callback registered on `"computedReferencePage"` fires when the user clicks **Continue** on `"partyTypePage"` (i.e., after completing the previous page, before rendering the next). This matches CCD's callback model: the callback name is the destination page, the trigger is completing the preceding page (`FieldCollection.java:495-497`).

### 4. Add a conditional page (optional)

Use `pageShowCondition` to show or hide a page based on field values. This is expressed as a CCD condition string and is independent of the mid-event callback.

```java
.page("additionalDetailsPage")
    .pageShowConditions("partyType=\"ORGANISATION\"")
    .mandatory(CaseData::getOrganisationName)
```

The condition syntax follows CCD's expression language: `fieldId="value"` for equality, `AND`/`OR` for compound conditions. The field referenced must be on a preceding page or pre-populated by a mid-event callback.

### 5. Add an about-to-submit callback for final processing

The mid-event callback handles inter-page logic. Use `aboutToSubmitCallback` for final validation or side effects once the user submits the whole event.

```java
configBuilder.event("collect-party-details")
    .aboutToSubmitCallback(this::aboutToSubmit);
```

```java
private AboutToStartOrSubmitResponse<CaseData, State> aboutToSubmit(
        CaseDetails<CaseData, State> before,
        CaseDetails<CaseData, State> after) {

    // Final validation / state mutation
    return AboutToStartOrSubmitResponse.<CaseData, State>builder()
            .data(after.getData())
            .state(State.Submitted)
            .build();
}
```

## Callback signatures reference

| Callback type | Interface | Trigger |
|---|---|---|
| `aboutToStartCallback` | `AboutToStart<T,S>` | Before the first page is shown |
| Mid-event (per page) | `MidEvent<T,S>` | After user submits a page, before next page renders |
| `aboutToSubmitCallback` | `AboutToSubmit<T,S>` | After user submits the final page |
| `submittedCallback` | `Submitted<T,S>` | After CCD persists the event |

The `MidEvent<T,S>` interface has the same shape as `AboutToSubmit<T,S>`: two `CaseDetails` parameters and an `AboutToStartOrSubmitResponse` return type.

## What to read and write

| Situation | What to do |
|---|---|
| Read a field the user just filled in | Read from `after.getData()` |
| Read a field that existed before the event started | Read from `before.getData()` |
| Push a computed value to a later page | Set it on `after.getData()` and return `.data(after.getData())` |
| Validate and block progress | Return `.errors(List.of("message"))` — do not include `.data()` |
| Allow progress without changes | Return `.data(after.getData())` |

## Verify

1. Start the local stack (`./gradlew bootRun` or via cftlib) and open an existing case.
2. Trigger the event. Fill in the first page and click **Continue**.
3. Confirm the mid-event callback fires: the computed field should appear populated on the second page, or — if you returned an error — the UI should display the error and remain on the first page.
4. Check application logs for the incoming `POST /callback?page=computedReferencePage` (or the page ID you registered) to confirm CCD is routing to your controller.

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
