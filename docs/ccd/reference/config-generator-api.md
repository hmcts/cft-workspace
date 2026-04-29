---
topic: data-types
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CCDConfig.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/HasRole.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/ServicePersistenceController.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Config Generator API reference

## TL;DR

- Entry point: implement `CCDConfig<T,S,R>` and call `ConfigBuilder` methods inside `configure(ConfigBuilder<T,S,R> builder)`.
- `ConfigBuilder.event(String id)` returns an `EventTypeBuilder`; chain `.name()`, `.fields()`, `.grant()`, callbacks, then it auto-registers.
- Callbacks are typed lambdas (`AboutToSubmit<T,S>`, `Submitted<T,S>`, `MidEvent<T,S>`); mutually exclusive with `submitHandler` (decentralised mode).
- Built-in CCD complex types live in `uk.gov.hmcts.ccd.sdk.type.*` — `Document`, `YesOrNo`, `ListValue<T>`, `DynamicList`, `OrganisationPolicy`, etc.
- Permissions are granted at event level via `EventBuilder.grant()` or at state level via `ConfigBuilder.grant()`.

---

## `ConfigBuilder<T, S, R extends HasRole>`

Top-level interface. `T` = case data class, `S` = state enum, `R` = role enum.

| Method | Returns | Description |
|---|---|---|
| `event(String id)` | `EventTypeBuilder` | Define a CCD event (`ConfigBuilder.java:15`). |
| `tab(String tabId, String tabLabel)` | `TabBuilder` | Define a display tab (`ConfigBuilder.java:41`). |
| `grant(S state, Set<Permission> perms, R... roles)` | `void` | Explicit state-level permission grant (`ConfigBuilder.java:39`). |
| `noticeOfChange()` | `NoticeOfChangeBuilder` | Configure NoC flows (`ConfigBuilder.java:70`). |
| `searchCriteria()` | `SearchCriteriaBuilder` | Configure global search criteria (`ConfigBuilder.java:66`). |
| `caseRoleToAccessProfile(R role)` | `CaseRoleToAccessProfileBuilder` | Map a case role to an IDAM access profile (`ConfigBuilder.java:62`). |
| `workBasketResultFields()` | `SearchBuilder` | Configure workbasket list columns (`ConfigBuilder.java:43`). |
| `searchResultFields()` | `SearchBuilder` | Configure search result columns (`ConfigBuilder.java:45`). |
| `omitHistoryForRoles(R... roles)` | `void` | Suppress event history visibility for roles (`ConfigBuilder.java:29`). |
| `setCallbackHost(String host)` | `void` | Base URL for webhook generation at definition-gen time (`ConfigBuilder.java:53`). |

---

## `EventTypeBuilder<T,R,S>` (top-level interface)

Returned by `ConfigBuilder.event(id)`. This is a **state-selector** — you call one of its methods to specify pre/post states, then it returns an `Event.EventBuilder` for configuration.

| Method | Returns | Description |
|---|---|---|
| `forState(S state)` | `Event.EventBuilder` | Event applies to cases already in `state` and stays in `state`. |
| `initialState(S state)` | `Event.EventBuilder` | Event creates a new case in `state` (no pre-state). |
| `forStateTransition(S from, S to)` | `Event.EventBuilder` | Event transitions case from `from` to `to`. |
| `forStateTransition(EnumSet from, S to)` | `Event.EventBuilder` | Multiple pre-states, single post-state. |
| `forStateTransition(S from, EnumSet to)` | `Event.EventBuilder` | Single pre-state, multiple post-states. |
| `forStateTransition(EnumSet from, EnumSet to)` | `Event.EventBuilder` | Multiple pre and post states. |
| `forAllStates()` | `Event.EventBuilder` | Event available in any state, stays in current state. |
| `forStates(EnumSet states)` | `Event.EventBuilder` | Event available in the given set of states. |
| `forStates(S... states)` | `Event.EventBuilder` | Vararg form of `forStates`. |

Source: `EventTypeBuilder.java:5-24`.

---

## `Event.EventBuilder<T,R,S>` (inner class of `Event`)

Returned by calling a state-selector method on `EventTypeBuilder`. All methods return `this` (fluent).

| Method | Description |
|---|---|
| `name(String name)` | Human-readable event name displayed in CCD UI (`Event.java:103`). |
| `showSummary()` | Show the check-your-answers page (`Event.java:121`). |
| `showEventNotes()` | Show the event notes field (`Event.java:111`). |
| `aboutToSubmitCallback(AboutToSubmit<T,S> cb)` | Register about-to-submit webhook lambda (`Event.java:196`). Mutually exclusive with `submitHandler`. |
| `submittedCallback(Submitted<T,S> cb)` | Register submitted webhook lambda (`Event.java:186`). Mutually exclusive with `submitHandler`. |
| `publishToCamunda()` | Flag event for Camunda message publish (`Event.java:131`). |
| `grant(Set<Permission> perms, R... roles)` | Attach CRUD permissions to the event (`Event.java:160`). |
| `explicitGrants()` | Disable permission inheritance from states (`Event.java:142`). |
| `retries(int... intervals)` | Set retry intervals for all webhooks (`Event.java:178`). |
| `ttlIncrement(Integer days)` | Increment the case TTL by `days` on event submission (`Event.java:136`). |
| `fields()` | Access the `FieldCollectionBuilder` for this event's pages/fields (`Event.java:99`). |

> **Constraint**: `submitHandler` and `aboutToSubmitCallback`/`submittedCallback` are mutually exclusive. Setting both throws `IllegalStateException` at startup (`Event.java:188-199`).

> **Note**: There is no public `aboutToStartCallback` setter on `EventBuilder`. It must be set directly on the `Event` object or via internal SDK flows (e.g. NoC — `ConfigBuilderImpl.java:116`).

---

## `FieldCollectionBuilder` (inner class of `FieldCollection<T,S>`)

Accessed via `EventBuilder.fields()`. Builds ordered pages and fields.

| Method | Description |
|---|---|
| `page(String id)` | Switch current page context; subsequent `.field()` calls belong to this page (`FieldCollection.java:500`). |
| `page(String id, MidEvent<T,S> callback)` | Page with a mid-event callback attached; stored in `pagesToMidEvent` map (`FieldCollection.java:495`). |
| `pageShowCondition(String id, String expr)` | Attach a show-condition expression to a page; stored in `pageShowConditions` map (`FieldCollection.java:34`). |
| `field(...)` | Add a field to the current page. Accepts field reference, optional show-condition, and display order. |

Mid-event callbacks are keyed by page ID string. The callback fires when the user moves off that page. Fields added after `page(id, callback)` inherit `pageId = id` and `pageDisplayOrder` during build (`FieldCollection.java:361-365`).

---

## Callback functional interfaces

All live under `uk.gov.hmcts.ccd.sdk.api.callback`.

| Interface | Method signature | Webhook phase |
|---|---|---|
| `AboutToStart<T,S>` | `AboutToStartResponse<T,S> handle(CaseDetails<T,S>)` | Before the form is shown to the user. |
| `AboutToSubmit<T,S>` | `AboutToSubmitResponse<T,S> handle(CaseDetails<T,S>, CaseDetails<T,S>)` | Before case data is persisted. |
| `Submitted<T,S>` | `void handle(CaseDetails<T,S>, CaseDetails<T,S>)` | After case data is persisted (fire-and-forget). |
| `MidEvent<T,S>` | `AboutToStartResponse<T,S> handle(CaseDetails<T,S>, CaseDetails<T,S>)` | Between wizard pages. |

---

## Built-in complex types (`uk.gov.hmcts.ccd.sdk.type`)

| Class | CCD type | Notes |
|---|---|---|
| `Address` | `Address` | UK address (unvalidated). |
| `AddressUK` | `AddressUK` | Validated UK address fields. |
| `AddressGlobal` / `AddressGlobalUK` | `AddressGlobal` | International address variants. |
| `CaseLink` | `CaseLink` | Reference to another CCD case. |
| `CaseLocation` | `CaseLocation` | HMCTS court/region location. |
| `Document` | `Document` | URL + binary URL + filename. |
| `DynamicList` / `DynamicListElement` | `DynamicList` | Runtime-populated dropdown. |
| `DynamicMultiSelectList` | `DynamicMultiSelectList` | Multi-select dynamic list. |
| `Flags` / `FlagDetail` | `Flags` | Case Flags complex type; annotated `@ComplexType(name="Flags", generate=false)` (`Flags.java:17`). |
| `KeyValue` | `KeyValue` | Generic key-value pair. |
| `ListValue<T>` | `Collection` | Collection item wrapper providing `id` + `value`. |
| `Organisation` / `OrganisationPolicy` | `Organisation` / `OrganisationPolicy` | Org/PBA policy reference. |
| `ChangeOrganisationRequest` | `ChangeOrganisationRequest` | NoC organisation-change payload. |
| `PreviousOrganisation` | `PreviousOrganisation` | Historical org records for NoC. |
| `OrderSummary` / `Fee` / `WaysToPay` | — | Payment-related complex types. |
| `ScannedDocument` / `ExceptionRecord` / `BulkScanEnvelope` | — | Bulk-scan document types. |
| `SearchCriteria` / `SearchParty` | — | Global search party/criteria types. |
| `TTL` | `TTL` | Case retention time-to-live. |
| `YesOrNo` | `YesOrNo` | Enum `YES` / `NO`. |
| `FieldType` | — | Enum of all CCD primitive field types (Text, Date, Collection, …). |
| `ComponentLauncher` | `ComponentLauncher` | Launcher component reference. |
| `LinkReason` | `LinkReason` | Reason for a case link. |

---

## `CCDConfig<T, S, R extends HasRole>`

Marker interface implemented by service teams.

```java
@Component
public class MyCaseConfig implements CCDConfig<MyCaseData, State, UserRole> {
    @Override
    public void configure(ConfigBuilder<MyCaseData, State, UserRole> builder) {
        builder.event("CREATE_CASE")
            .name("Create Case")
            .grant(Set.of(CREATE, READ), UserRole.CASEWORKER)
            .aboutToSubmitCallback(this::handleAboutToSubmit)
            .fields()
                .page("page1")
                .field(MyCaseData::getApplicantName);
    }
}
```

---

## `HasRole`

Role enum contract. Your role enum must implement `HasRole`, which exposes:

| Method | Returns | Description |
|---|---|---|
| `getRole()` | `String` | The CCD role string (e.g. `"caseworker-divorce-solicitor"`). |
| `getCaseTypePermissions()` | `String` | CRUD string for case-type level access. |

---

## See also

- [First case type with config-generator](../tutorials/first-case-type-config-generator.md) — end-to-end tutorial using this API to build a case type
- [Data types](../explanation/data-types.md) — explanation of CCD field types and their Java SDK equivalents
- [Glossary](glossary.md) — CCD terms including ListValue, HasRole, YesOrNo
