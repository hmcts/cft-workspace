---
topic: event-model
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/AboutToSubmit.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/MidEvent.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerAddNote.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CreateTestCase.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/Permissions.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Add an Event

## TL;DR

- An event is defined by a `@Component` class implementing `CCDConfig<T,S,R>`; the SDK aggregates all such beans automatically.
- Entry point: `configBuilder.event("myEvent")` returns an `EventTypeBuilder` — chain `.name()`, `.forStates()` / `.forAllStates()`, callbacks, permissions, then `.fields()` for pages and fields.
- Mid-event callbacks attach per-page: `fields().page("page1", this::myMidEvent)`.
- About-to-submit callback: `.aboutToSubmitCallback(this::myAboutToSubmit)`; mutually exclusive with the decentralised `submitHandler`.
- Permissions: `.grant(Permissions.CREATE_READ_UPDATE, UserRole.CASE_WORKER)` on the event builder.
- XUI needs no extra configuration — it reads the event definition from CCD at runtime.
- Verify locally with cftlib + `curl` against `http://localhost:4452`.

## Prerequisites

- An existing case type wired via `CCDConfig<CaseData, State, UserRole>`.
- A `CaseData` field (e.g. `myNote`) already declared on `CaseData` with appropriate `@CCD` access annotation.
- cftlib running locally (`./gradlew bootWithCCD` or equivalent).

## Step 1 — Create the event component

Create a new `@Component` class. Each event lives in its own class; Spring component scanning picks it up.

```java
package uk.gov.hmcts.myservice.events;

import org.springframework.stereotype.Component;
import uk.gov.hmcts.ccd.sdk.api.CCDConfig;
import uk.gov.hmcts.ccd.sdk.api.ConfigBuilder;
import uk.gov.hmcts.ccd.sdk.api.CaseDetails;
import uk.gov.hmcts.ccd.sdk.api.callback.AboutToStartOrSubmitResponse;
import uk.gov.hmcts.myservice.model.CaseData;
import uk.gov.hmcts.myservice.model.State;
import uk.gov.hmcts.myservice.model.UserRole;
import uk.gov.hmcts.myservice.common.PageBuilder;

import static uk.gov.hmcts.myservice.model.UserRole.CASE_WORKER;
import static uk.gov.hmcts.myservice.model.UserRole.LEGAL_ADVISER;
import static uk.gov.hmcts.myservice.model.access.Permissions.CREATE_READ_UPDATE;

@Component
public class MyEvent implements CCDConfig<CaseData, State, UserRole> {

    public static final String MY_EVENT = "myEvent";

    @Override
    public void configure(ConfigBuilder<CaseData, State, UserRole> configBuilder) {
        new PageBuilder(configBuilder
            .event(MY_EVENT)
            .forAllStates()
            .name("My event")
            .description("Does the thing")
            .aboutToSubmitCallback(this::aboutToSubmit)
            .grant(CREATE_READ_UPDATE, CASE_WORKER, LEGAL_ADVISER))
            .page("myEventPage1", this::midEvent)
            .pageLabel("Step 1")
            .mandatory(CaseData::getMyNote);
    }

    private AboutToStartOrSubmitResponse<CaseData, State> aboutToSubmit(
            CaseDetails<CaseData, State> details,
            CaseDetails<CaseData, State> beforeDetails) {
        CaseData data = details.getData();
        // mutate data here
        return AboutToStartOrSubmitResponse.<CaseData, State>builder()
            .data(data)
            .build();
    }

    private AboutToStartOrSubmitResponse<CaseData, State> midEvent(
            CaseDetails<CaseData, State> details,
            CaseDetails<CaseData, State> beforeDetails) {
        // validate page 1 data; return errors to block progression
        return AboutToStartOrSubmitResponse.<CaseData, State>builder()
            .data(details.getData())
            .build();
    }
}
```

Key points:
- `PageBuilder` is a thin project-local wrapper around `EventBuilder.fields()` — copy from `test-projects/e2e/src/main/java/.../common/ccd/PageBuilder.java` or inline the calls directly on `EventBuilder.fields()`.
- `forAllStates()` makes the event available in every state. Scope it with `.forStates(State.Draft, State.Submitted)` when needed.
- `aboutToSubmitCallback` and `submitHandler` (decentralised mode) are mutually exclusive — the SDK throws `IllegalStateException` at startup if both are set (`Event.java:196-203`).

## Step 2 — Add a second page (optional)

Chain an additional `.page()` call after the first. Page order follows declaration order.

```java
.page("myEventPage1", this::midEvent)
.pageLabel("Step 1")
.mandatory(CaseData::getMyNote)
.page("myEventPage2")
.pageLabel("Step 2")
.optional(CaseData::getMyOptionalField);
```

Mid-event callbacks are keyed by page ID. The callback fires when the user moves off that page inside the XUI wizard (`FieldCollection.java:495-497`).

## Step 3 — Add an about-to-submit callback

The `aboutToSubmit` method signature must be:

```java
AboutToStartOrSubmitResponse<CaseData, State> aboutToSubmit(
    CaseDetails<CaseData, State> details,
    CaseDetails<CaseData, State> beforeDetails)
```

Return the (mutated) `CaseData` in the response builder. You may also return a `State` override:

```java
return AboutToStartOrSubmitResponse.<CaseData, State>builder()
    .data(data)
    .state(State.Submitted)
    .build();
```

## Step 4 — Set permissions

Permissions attach to the event via `.grant()` on the `EventTypeBuilder` (before `.fields()` is called).

```java
.grant(CREATE_READ_UPDATE, CASE_WORKER, LEGAL_ADVISER)
.grant(Permissions.READ, UserRole.SOLICITOR)
```

`Permissions` constants (`Permissions.java`):

| Constant | Bits |
|---|---|
| `CREATE_READ_UPDATE_DELETE` | CRUD |
| `CREATE_READ_UPDATE` | CRU |
| `READ` | R |

To prevent a role from inheriting state-level permissions on this event, call `.explicitGrants()` on the builder — this disables permission inheritance (`Event.java:142`).

To allow a role to see the event in history without triggering it, use `.grantHistoryOnly(UserRole.SOLICITOR)` (`CaseworkerAddNote.java:56`).

## Step 5 — Set pre/post state transitions (optional)

```java
.event(MY_EVENT)
.forStates(State.Draft)
.postState(State.Submitted)
```

`preState` / `postState` may be set to the same state if no transition is needed.

## Step 6 — What XUI needs

Nothing extra. XUI reads the event definition from CCD data-store at runtime. Once the definition is imported (see Verify below), the event appears in the case action list for roles that have `CREATE_READ_UPDATE` or `CREATE_READ_UPDATE_DELETE` on it.

## Verify

### With cftlib (local)

1. Start cftlib: `./gradlew bootWithCCD` (or your project's equivalent target).
2. cftlib auto-imports the generated definition on startup via `CftLibConfig.importJsonDefinition`.
3. Open `http://localhost:3000` (XUI), find a case, and confirm `My event` appears in the actions dropdown for a `CASE_WORKER` user.

### With curl against cftlib data-store

Trigger the event directly (useful in CI or without XUI):

```bash
CASE_ID=1234567890123456
TOKEN=$(curl -s http://localhost:5000/o/token \
  -d "grant_type=password&username=caseworker@example.com&password=Password12&client_id=ccd_gateway&client_secret=AAAAAAAAAAAAAAAA&scope=openid profile roles" \
  | jq -r .access_token)

# Start event token
START=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "ServiceAuthorization: eyJ..." \
  "http://localhost:4452/cases/$CASE_ID/event-triggers/myEvent/token" \
  | jq -r .token)

# Submit
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "ServiceAuthorization: eyJ..." \
  -H "Content-Type: application/json" \
  "http://localhost:4452/cases/$CASE_ID/events" \
  -d "{\"event\":{\"id\":\"myEvent\"},\"data\":{\"myNote\":\"test value\"},\"event_token\":\"$START\"}" \
  | jq .
```

A `201 Created` response with the updated case confirms the event and callbacks executed successfully.

## See also

- [Event model](../explanation/event-model.md) — what events are and how CCD processes them
- [Add a page mid-event callback](add-a-page-mid-event-callback.md) — attaching mid-event callbacks to wizard pages
- [config-generator API reference](../reference/config-generator-api.md) — full SDK builder API

## Glossary

| Term | Meaning |
|---|---|
| `EventTypeBuilder` | Fluent builder returned by `configBuilder.event(id)`; wires callbacks, permissions, state transitions |
| `FieldCollectionBuilder` | Returned by `EventTypeBuilder.fields()`; declares ordered pages and fields |
| `AboutToSubmit` | Functional interface `(CaseDetails, CaseDetails) -> AboutToStartOrSubmitResponse`; fires before CCD persists the event |
| `MidEvent` | Same signature as `AboutToSubmit`; fires when user navigates between wizard pages |
| `explicitGrants()` | Disables state-level permission inheritance for this event; only grants declared on the event apply |

## Example

<!-- source: libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerAddNote.java:29-85 -->
```java
// from libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerAddNote.java
@Component
@Slf4j
public class CaseworkerAddNote implements CCDConfig<CaseData, State, UserRole> {
    public static final String CASEWORKER_ADD_NOTE = "caseworker-add-note";

    @Override
    public void configure(final ConfigBuilder<CaseData, State, UserRole> configBuilder) {
        new PageBuilder(configBuilder
            .event(CASEWORKER_ADD_NOTE)
            .forAllStates()
            .name("Add note")
            .description("Add note")
            .aboutToSubmitCallback(this::aboutToSubmit)
            .showEventNotes()
            .grant(CREATE_READ_UPDATE,
                CASE_WORKER, SOLICITOR, JUDGE)
            .grant(CREATE_READ_UPDATE_DELETE,
                SUPER_USER)
            .grantHistoryOnly(LEGAL_ADVISOR, JUDGE))
            .page("addCaseNotes")
            .pageLabel("Add case notes")
            .optional(CaseData::getNote);
    }

    public AboutToStartOrSubmitResponse<CaseData, State> aboutToSubmit(
        final CaseDetails<CaseData, State> details,
        final CaseDetails<CaseData, State> beforeDetails
    ) {
        var caseData = details.getData();
        // ... business logic ...
        return AboutToStartOrSubmitResponse.<CaseData, State>builder()
            .data(caseData)
            .build();
    }
}
```
