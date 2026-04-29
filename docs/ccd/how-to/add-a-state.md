---
topic: overview
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/State.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/DefaultStateAccess.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CreateTestCase.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/SimpleCaseConfiguration.java
  - ccd-config-generator:test-projects/e2e/src/cftlib/java/uk/gov/hmcts/divorce/cftlib/CftLibConfig.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Add a State

## TL;DR

- A CCD state is an enum constant annotated with `@CCD(label, hint, access)` in your case type's `State` enum.
- Transitions are declared on events via `.preState()`/`.postState()` on the `EventTypeBuilder`, not on the state itself.
- State-level permissions are set either through the `access` attribute on `@CCD` or explicitly via `ConfigBuilder.grant(state, permissions, roles)`.
- Tab visibility is controlled per-tab by show conditions — states don't automatically show or hide tabs.
- Verify with cftlib: boot the stack, trigger the transition event, and check `GET /ccd-persistence/cases/{ref}` returns the new state.

## Steps

### 1. Add the enum constant

Open your `State` enum and add a new constant. Annotate it with `@CCD` to supply the UI label and the access class that governs who can read/act on the case in this state.

```java
// src/main/java/…/model/State.java
@CCD(
    label = "Awaiting Payment",
    hint  = "Case is pending payment confirmation",
    access = {DefaultStateAccess.class}
)
AwaitingPayment,
```

`DefaultStateAccess` (or whichever access class you choose) implements `HasAccessControl` and returns a `SetMultimap<HasRole, Permission>` controlling which roles can see and transition cases in this state (`DefaultStateAccess.java:22-29`).

If you need different permissions for this state, either create a new access class implementing `HasAccessControl` or use an explicit grant (see step 3).

### 2. Wire transitions on events

State transitions are declared on events, not on the state. Locate the event(s) that should lead into (or out of) the new state and set `preState`/`postState`.

```java
// src/main/java/…/sow014/nfd/ConfirmPayment.java
@Component
public class ConfirmPayment implements CCDConfig<CaseData, State, UserRole> {

    @Override
    public void configure(ConfigBuilder<CaseData, State, UserRole> configBuilder) {
        configBuilder.event("confirm-payment")
            .forState(State.AwaitingPayment)          // preState — only callable in this state
            .name("Confirm Payment")
            .description("Mark payment as received")
            .aboutToSubmitCallback(this::aboutToSubmit)
            .grant(Permissions.CREATE_READ_UPDATE, UserRole.CASE_WORKER);
    }

    private AboutToStartOrSubmitResponse<CaseData, State> aboutToSubmit(
            CaseDetails<CaseData, State> details,
            CaseDetails<CaseData, State> detailsBefore) {
        return AboutToStartOrSubmitResponse.<CaseData, State>builder()
            .state(State.CaseIssued)   // postState — where the case lands after submit
            .build();
    }
}
```

`Event.preState` and `Event.postState` are set here (`Event.java:29-44`). The `forState(S)` builder method is a shorthand for `.preState(state)`. Return the desired `postState` from your `aboutToSubmitCallback` response, or set it statically via `.postState(State.X)` on the builder if no logic is needed.

To create a case directly in the new state, set `.initialState(State.AwaitingPayment)` on the creation event (see `CreateTestCase.java:93-104` for the three-callback pattern).

### 3. Set state-level permissions

The access class on `@CCD` covers the common case. For fine-grained overrides use `ConfigBuilder.grant()`:

```java
// In your root CCDConfig.configure()
configBuilder.grant(State.AwaitingPayment,
    Permissions.CREATE_READ_UPDATE,
    UserRole.CASE_WORKER, UserRole.LEGAL_ADVISOR);
```

`ConfigBuilder.grant(S state, Set<Permission> permissions, R... role)` is declared at `ConfigBuilder.java:39`. Grants set here supplement (not replace) grants from the access class on the enum constant.

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

The output lands in `build/definitions/` (or wherever your project configures the output path). These files are consumed by `ccd-definition-store-api`.

## Verify

1. Start the cftlib stack. `CftLibConfig` calls `generateAllCaseTypesToJSON` then `importJsonDefinition` on startup (`CftLibConfig.java`), so the new state is imported automatically.

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

## See also

- [`docs/ccd/explanation/states-and-transitions.md`](../explanation/states-and-transitions.md) — conceptual overview of the state machine model
- [`docs/ccd/how-to/add-an-event.md`](add-an-event.md) — full event wiring guide including callbacks
- [`docs/ccd/reference/permissions.md`](../reference/permissions.md) — permission constants and access class patterns

## Glossary

| Term | Meaning |
|------|---------|
| `preState` | The state(s) a case must be in before the event can be triggered. |
| `postState` | The state the case transitions to after a successful event submission. |
| Access class | A class implementing `HasAccessControl` that declares role-permission grants for a state or field. |
