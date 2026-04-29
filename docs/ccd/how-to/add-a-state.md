---
topic: overview
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/EventTypeBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/EventTypeBuilderImpl.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CCD.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/StateGenerator.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/State.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/DefaultStateAccess.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CreateTestCase.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/SimpleCaseConfiguration.java
  - ccd-config-generator:test-projects/e2e/src/cftlib/java/uk/gov/hmcts/divorce/cftlib/CftLibConfig.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "207804327"
    title: "CCD Definition Glossary for Setting up a Service in CCD"
    space: "RCCD"
    version: 154
  - id: "1552125154"
    title: "How to change a State"
    space: "CRef"
    version: 4
  - id: "859832393"
    title: "Case state model (as defined on CCD)"
    space: "ROC"
    version: 24
  - id: "1525465594"
    title: "How To Guide - Global Search"
    space: "RCCD"
    version: 55
  - id: "1616386673"
    title: "CCD Service Operations Guide"
    space: "CCD"
---

# Add a State

## TL;DR

- A CCD state is an enum constant annotated with `@CCD(label, hint, access)` in your case type's `State` enum. The generator emits one row in the `State.json` definition tab per constant.
- `@CCD.label` populates both `Name` and `Description` columns; `@CCD.hint` populates `TitleDisplay` — the text rendered on the case-view title line, which supports field interpolation like `${hyphenatedCaseRef}`.
- Transitions are declared on events. `forState(s)` is the simple in-place case (preState = postState = s); cross-state transitions use `forStateTransition(from, to)`, `forStates(...)`, `forAllStates()`, or `initialState(s)` for case creation.
- State-level read/write permissions come from the `access` classes on `@CCD` (one or more `HasAccessControl` implementations) plus optional `ConfigBuilder.grant(state, …)` overrides. Both feed into the `AuthorisationCaseState` definition tab.
- Tab visibility is controlled per-tab by show conditions — states don't automatically show or hide tabs. Show conditions cannot reference the state directly, so model a flag field if you need state-driven visibility.
- Verify with cftlib: boot the stack, trigger the transition event, and check `GET /cases/{ref}` returns the new state.

## Steps

### 1. Add the enum constant

Open your `State` enum and add a new constant. Annotate it with `@CCD` to supply the human-readable label, the case-view title display (`hint`), and the access classes that govern who can read or transition cases in this state.

```java
// src/main/java/…/model/State.java
@CCD(
    label = "Awaiting Payment",
    hint  = "### Case number: ${hyphenatedCaseRef}\n ### ${applicant1LastName} and ${applicant2LastName}\n",
    access = {DefaultStateAccess.class}
)
AwaitingPayment,
```

How the annotation maps to the generated `State.json` row — see `StateGenerator.java:36-54` and the `@CCD` Javadoc at `CCD.java:10-26`:

| `@CCD` attribute | `State.json` column | Notes |
|---|---|---|
| `label` | `Name` and `Description` | Same value goes to both. If absent, the enum constant name is used. |
| `hint`  | `TitleDisplay` | Rendered on the case-view title line. Supports CCD field interpolation (`${fieldId}`) and Markdown. |
| `access` | drives `AuthorisationCaseState` rows | Each class implements `HasAccessControl` and returns a `SetMultimap<HasRole, Permission>`. |

`DefaultStateAccess` (or whichever access class you choose) implements `HasAccessControl`. The Divorce e2e test-project enum at `divorcecase/model/State.java:13-412` shows ~50 states using this pattern, with `hint` strings like `"### Case number: ${hyphenatedCaseRef}\n ### ${applicant1LastName} and ${applicant2LastName}\n"` — these render directly as the case-view title.

If you need different permissions for this state, either create a new access class or use an explicit grant (see step 3). You can list multiple access classes — the e2e enum uses `access = {DefaultStateAccess.class, SolicitorAccess.class}` to combine grants.

<!-- DIVERGENCE: An older draft of this page described `hint` as "Case is pending payment confirmation"-style help text. Source (CCD.java:24, StateGenerator.java:50) shows hint maps to TitleDisplay — the case-view title bar text — and conventionally contains Markdown + ${field} interpolation, not a tooltip. Source wins. -->

### 2. Wire transitions on events

State transitions are declared on events, not on the state. The SDK's `EventTypeBuilder` (`EventTypeBuilder.java`) provides several helpers; pick the one that matches your transition shape:

| Builder method | preState | postState | Use when |
|---|---|---|---|
| `forState(s)` | `{s}` | `{s}` | Event runs in state `s` and leaves the case in `s` (in-place edit). Override postState from the callback if needed. |
| `forStateTransition(from, to)` | `{from}` | `{to}` | Single allowed source, single destination. |
| `forStateTransition(EnumSet, to)` / `(from, EnumSet)` / `(EnumSet, EnumSet)` | as supplied | as supplied | Multiple allowed source or destination states. |
| `forStates(s1, s2, …)` | `{s1, s2, …}` | `{s1, s2, …}` | Event valid in any of these states; leaves the case in whichever it was in. |
| `forAllStates()` | all states | all states | Cross-cutting events (e.g. document attach, case flags create) — produces `*` in the generated JSON's `PreConditionState(s)` and `PostConditionState`. |
| `initialState(s)` | `{}` (empty) | `{s}` | Case-creation events. The generated row has empty `PreConditionState(s)`. |

`forState(s)` sets **both** preState and postState to `{s}` (`EventTypeBuilderImpl.java:25-27`). Returning a different `state(...)` from your `aboutToSubmit` callback overrides the postState at runtime — that's the common pattern for transitioning out of a state via an in-place edit form. For a clean static transition with no callback logic, prefer `forStateTransition(from, to)`.

```java
// src/main/java/…/sow014/nfd/ConfirmPayment.java
@Component
public class ConfirmPayment implements CCDConfig<CaseData, State, UserRole> {

    @Override
    public void configure(ConfigBuilder<CaseData, State, UserRole> configBuilder) {
        configBuilder.event("confirm-payment")
            .forStateTransition(State.AwaitingPayment, State.CaseIssued)  // pre → post, declared statically
            .name("Confirm Payment")
            .description("Mark payment as received")
            .aboutToSubmitCallback(this::aboutToSubmit)
            .grant(Permissions.CREATE_READ_UPDATE, UserRole.CASE_WORKER);
    }

    private AboutToStartOrSubmitResponse<CaseData, State> aboutToSubmit(
            CaseDetails<CaseData, State> details,
            CaseDetails<CaseData, State> detailsBefore) {
        return AboutToStartOrSubmitResponse.<CaseData, State>builder()
            // Optional: override the postState at runtime, e.g. to branch on data
            // .state(State.OnHold)
            .build();
    }
}
```

`Event.preState` and `Event.postState` are `Set<S>` fields populated by the builder methods above (`Event.java:29-30, 77-81, 210-216`).

To create a case directly in the new state, use `.initialState(State.AwaitingPayment)` on the creation event. See `CreateTestCase.java:93-104` for the three-callback pattern (about-to-start / about-to-submit / submitted).

#### What lands in `State.json` and `CaseEvent.json`

After regeneration, the SDK writes two files driven by your enum and event configs:

- **`State.json`** — one row per enum constant with columns `ID`, `Name`, `Description`, `DisplayOrder` and (when `hint` is set) `TitleDisplay`. Max length per the CCD definition glossary: ID 70, Name/Description 100, TitleDisplay 100.
- **`CaseEvent.json`** — your event row with `PreConditionState(s)` and `PostConditionState`. The CCD definition glossary documents the wildcard semantics:
    - `*` in `PreConditionState(s)` means "any state".
    - `*` in `PostConditionState` means "no change — stay in current state".
    - Multiple allowed pre-states are joined with semicolons in the JSON output, e.g. `"orderForJudgeReview;approved"`.
    - Except for case-creation events, **no event can have an empty `PreConditionState(s)`** — the import will reject it.

### 3. Set state-level permissions

The access class on `@CCD` covers the common case. For fine-grained overrides use `ConfigBuilder.grant()`:

```java
// In your root CCDConfig.configure()
configBuilder.grant(State.AwaitingPayment,
    Permissions.CREATE_READ_UPDATE,
    UserRole.CASE_WORKER, UserRole.LEGAL_ADVISOR);
```

`ConfigBuilder.grant(S state, Set<Permission> permissions, R... role)` is declared at `ConfigBuilder.java:39`. Grants set here supplement (not replace) grants from the access class on the enum constant — both contribute rows to the generated `AuthorisationCaseState` tab.

The CRUD letters carry state-specific meaning at import time:

| CRUD letter | Effect on a state |
|---|---|
| `C` | User can create cases that **end up in this state as a final state** (typically only meaningful on the initial state of case-creation events). |
| `R` | Read/view cases that are in this state. |
| `U` | Modify cases that are in this state. |
| `D` | Delete — not implemented. <!-- CONFLUENCE-ONLY: per CCD Definition Glossary; not verified in current source --> |

If you add a new state but forget to grant any role read access, cases that transition into that state will become invisible to those users. The CCD Service Operations Guide notes that the import surfaces a warning when a state in the `State` tab has no matching `AuthorisationCaseState` row, but the import does not fail.

<!-- CONFLUENCE-ONLY: import warning text "{} in AuthorisationCaseState tab — During the import operation, case state is not defined in the AuthorisationCaseState tab" — not verified in source -->

#### Don't forget global / cross-cutting AccessProfiles

If your case type has been onboarded to Global Search or Work Allocation, there is a `GS_profile` (or equivalent) AccessProfile that needs read access to every searchable state. Adding a new state means adding rows to `AuthorisationCaseState` for the GS / WA profiles too — otherwise cases in the new state won't appear in search results or task lists.

### 4. Check tab visibility

Tabs do not respond to states automatically. If a tab should only appear in certain states, add a show condition on the tab definition:

```java
configBuilder.tab("paymentTab", "Payment")
    .showCondition("applicationType=\"jointApplication\"")
    .field(CaseData::getPaymentReference);
```

`ConfigBuilder.tab(String tabId, String tabLabel)` is at `ConfigBuilder.java:41`. The show condition is a CCD expression evaluated against the case data fields — it cannot directly reference the current state by name, so model a field (e.g. a `YesOrNo` flag set in the transition callback) if you need state-driven tab visibility.

### 5. Regenerate definitions

Run the SDK generator to regenerate JSON definitions:

```bash
cd libs/ccd-config-generator
./gradlew generateCCDConfig
```

The output lands in `build/definitions/` (or wherever your project configures the output path). These files — including the updated `State.json`, `CaseEvent.json`, and `AuthorisationCaseState.json` — are consumed by `ccd-definition-store-api`.

## Verify

1. Start the cftlib stack. `CftLibConfig` calls `generateAllCaseTypesToJSON` then `importJsonDefinition` on startup (`CftLibConfig.java`), so the new state is imported automatically. Watch the import logs for any `'{}' in AuthorisationCaseState tab` warnings — those indicate states without grants.

2. Trigger the creation or transition event through the CCD UI (or via REST) and confirm the case moves to the new state:

```bash
curl -s http://localhost:4452/cases/{caseRef} \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" \
  | jq '.state'
# Expected: "AwaitingPayment"
```

Alternatively, use the decentralised persistence endpoint if your case type runs in decentralised mode:

```bash
curl -s "http://localhost:4013/ccd-persistence/cases?case-refs={caseRef}" \
  -H "Authorization: Bearer $USER_TOKEN" \
  | jq '.[0].state'
```

3. Visit the case in XUI Manage Cases. The case-view title line should render the `TitleDisplay` (your `@CCD.hint`) with case-data interpolation resolved — useful for spotting typos in field references like `${hyphenatedCaseRef}`.

## See also

- [`docs/ccd/explanation/states-and-transitions.md`](../explanation/states-and-transitions.md) — conceptual overview of the state machine model
- [`docs/ccd/how-to/add-an-event.md`](add-an-event.md) — full event wiring guide including callbacks
- [`docs/ccd/reference/permissions.md`](../reference/permissions.md) — permission constants and access class patterns

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

