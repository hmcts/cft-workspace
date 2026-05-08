---
topic: event-model
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/AboutToSubmit.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/MidEvent.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/CaseEventGenerator.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/CaseEventToFieldsGenerator.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerAddNote.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CreateTestCase.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/Permissions.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "207804327"
    title: "CCD Definition Glossary for Setting up a Service in CCD"
    space: "RCCD"
    last_modified: "canonical reference (v154)"
  - id: "1775332773"
    title: "CCD-5344 - Validation endpoint data exposure with MidEvent callbacks"
    space: "CCD"
    last_modified: "v1"
  - id: "1864476018"
    title: "Truncated CCD callbacks"
    space: "DATS"
    last_modified: "v5 (2025-06)"
  - id: "1438948553"
    title: "CCD Callback Framework"
    space: "CRef"
    last_modified: "v3"
  - id: "1194099763"
    title: "How-to: Add a new event in CCD (legacy JSON workflow)"
    space: "DIV"
    last_modified: "v7 (2019)"
---

# Add an Event

## TL;DR

- An event is defined by a `@Component` class implementing `CCDConfig<T,S,R>`; the SDK aggregates all such beans automatically.
- Entry point: `configBuilder.event("myEvent")` returns an `EventTypeBuilder` — chain `.name()`, `.forStates()` / `.forAllStates()`, callbacks, permissions, then `.fields()` for pages and fields.
- Mid-event callbacks attach per-page: `fields().page("page1", this::myMidEvent)`. They run when the user clicks "Continue" between wizard pages.
- About-to-submit callback: `.aboutToSubmitCallback(this::myAboutToSubmit)`; mutually exclusive with the decentralised `submitHandler`.
- Permissions: `.grant(Permissions.CREATE_READ_UPDATE, UserRole.CASE_WORKER)` on the event builder.
- XUI needs no extra configuration — it reads the event definition from CCD at runtime.
- Verify locally with cftlib + `curl` against `http://localhost:4452`.
- **Gotcha:** disable Jackson `AUTO_CLOSE_JSON_CONTENT` on your `ObjectMapper`, or a serialisation exception in AboutToSubmit can silently erase case fields. See [Gotcha: AboutToSubmit serialisation truncation](#gotcha-abouttosubmit-serialisation-truncation).

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

Mid-event callbacks are keyed by page ID. The callback fires when the user clicks "Continue" on that page in the XUI wizard, via the CCD Validate endpoint (`FieldCollection.java:495-497`). CCD includes the case details prior to the event (the stored values, if any) and the event-so-far in the request payload.

Multiple mid-event callbacks within a single event are supported by CCD as long as their URLs differ — the SDK gives each page its own URL automatically, so you don't need to do anything beyond `.page(id, midEvent)` per page. See the [`CaseEventToFieldsGenerator`](https://github.com/hmcts/ccd-config-generator) which emits the per-page `CallBackURLMidEvent` column.

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

`preState` / `postState` may be set to the same state if no transition is needed. In raw CCD definition JSON the convention `PostConditionState = "*"` means "keep the current state" — useful when state is determined dynamically by an about-to-submit callback. The SDK equivalent is to omit `.postState(...)` entirely (defaults to current state) or to override `state` in the `AboutToStartOrSubmitResponse` returned by your callback.

<!-- CONFLUENCE-ONLY: the "*" wildcard convention is documented in CCD Definition Glossary (id 207804327, RCCD); not directly visible in SDK source. -->

## Step 5b — Tweak event UI behaviour (optional)

The `EventBuilder` exposes several flags that the generated CCD definition emits as columns on the `CaseEvent` row. Common tweaks:

```java
.event(MY_EVENT)
.forAllStates()
.name("My event")
.showSummary()                          // generate a Check-Your-Answers page (CaseEvent.ShowSummary=Y)
.showEventNotes()                       // expose Summary & Comment fields at the end of the event
.endButtonLabel("Save and continue")    // override the submit button label (default in SDK; CCD default is "Submit")
.ttlIncrement(30)                       // set System TTL to today + N days when this event fires
.retries(5, 10, 15)                     // override retry timeouts for all webhooks (default 15s, 3 tries, 0/1/3s pauses)
```

The retry vocabulary is comma-separated seconds: `5,10,15` means three retries waiting 5, 10, 15 seconds respectively (`Event.java:230-235`). `Webhook.values()` covers all four CCD callback types — about-to-start, mid, about-to-submit, submitted.

Field-level CYA inclusion is per-field via the `FieldCollectionBuilder`; the field flag is honoured only when `.showSummary()` is set on the event.

<!-- DIVERGENCE: SDK default for endButtonLabel is "Save and continue" (Event.java:57); CCD's documented default in the definition glossary is "Submit". The SDK injects the override at generation time, so the label users see is "Save and continue" unless overridden — source wins. -->

## Step 5c — Mid-event callback security (CCD-5344)

Mid-event callbacks are special: ExUI invokes the CCD Validate endpoint when the user clicks "Continue" between wizard pages, and CCD then calls your service's mid-event handler. The callback payload sent to your service contains the **full** case data (including fields the user can't read), so services can apply business logic that requires the wider context.

CCD 5344 closed a leak where the response sent back to the browser was not access-filtered. As of the fix, CCD applies the standard role/access-profile/CRUD pipeline to the response before returning it to ExUI. This means:

- Whatever your mid-event handler returns is filtered by CCD before reaching the client.
- **Don't rely** on access-restricted fields being present in the response on the client side — for example, `ShowConditions` that depend on values returned only via mid-event for fields the user lacks read access to will not work.
- It is still safe (and idiomatic) to echo the entire `CaseData` back; CCD will filter as needed.

<!-- CONFLUENCE-ONLY: behavioural change documented in CCD Confluence (id 1775332773); the access-control filter lives in ccd-data-store-api, not in ccd-config-generator, so isn't directly visible in this workspace's SDK source. -->

## Gotcha: AboutToSubmit serialisation truncation

If your AboutToSubmit handler throws mid-serialisation, Jackson's default `AUTO_CLOSE_JSON_CONTENT` produces a valid but incomplete response — CCD erases the missing fields. Disable this feature on your `ObjectMapper` and add a startup verifier.

See [Truncated response prevention](../reference/callback-contract.md#truncated-response-prevention) for the mitigation code and detection guidance.

<!-- CONFLUENCE-ONLY: documented in DATS Confluence page id 1864476018; the Jackson default behaviour is upstream and not modelled in ccd-config-generator. -->

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

See [Glossary](../reference/glossary.md) for term definitions used in this page.

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
