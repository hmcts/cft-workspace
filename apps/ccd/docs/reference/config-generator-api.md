---
topic: data-types
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CCDConfig.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/HasRole.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/DecentralisedConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CCD.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CaseCategory.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Tab.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/NoticeOfChange.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/AboutToSubmit.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/Submitted.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/MidEvent.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/Submit.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/Start.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/ServicePersistenceController.java
status: confluence-augmented
confluence:
  - id: "1518683566"
    title: "Approach to CCD"
    last_modified: "unknown"
    space: "DATS"
  - id: "1632907349"
    title: "How to add a new Jurisdiction"
    last_modified: "unknown"
    space: "SPT"
  - id: "1933860267"
    title: "Case File View document display"
    last_modified: "unknown"
    space: "RRFM"
  - id: "1890786925"
    title: "Investigate possibility of including headers on CYA Page"
    last_modified: "unknown"
    space: "RRFM"
confluence_checked_at: "2026-04-29T12:00:00Z"
last_reviewed: 2026-04-29T00:00:00Z
---

# Config Generator API reference

## TL;DR

- Entry point: implement `CCDConfig<T,S,R>` and call `ConfigBuilder` methods inside `configure(ConfigBuilder<T,S,R> builder)`.
- `ConfigBuilder.event(String id)` returns an `EventTypeBuilder`; select state via `.forState()` / `.initialState()` / `.forAllStates()`, then chain `.name()`, `.fields()`, `.grant()`, callbacks.
- Field metadata is declared via the `@CCD` annotation on model properties (label, hint, access, typeOverride, regex, showCondition, retainHiddenValue).
- `@JsonUnwrapped(prefix = "...")` flattens nested classes into individual CCD fields, avoiding complex-type UI limitations.
- Decentralised services use `DecentralisedConfigBuilder.decentralisedEvent()` with `Submit<T,S>` handlers instead of callbacks.
- `addPreEventHook(Function)` registers a pre-deserialisation data-migration hook, used by teams to retire/rename fields without breaking existing cases.

---

## `ConfigBuilder<T, S, R extends HasRole>`

Top-level interface. `T` = case data class, `S` = state enum, `R` = role enum.

| Method | Returns | Description |
|---|---|---|
| `event(String id)` | `EventTypeBuilder` | Define a CCD event. |
| `caseType(String id, String name, String desc)` | `void` | Set case type ID, display name, and description. |
| `jurisdiction(String id, String name, String desc)` | `void` | Set jurisdiction ID, display name, and description. |
| `tab(String tabId, String tabLabel)` | `TabBuilder` | Define a display tab. |
| `grant(S state, Set<Permission> perms, R... roles)` | `void` | Explicit state-level permission grant. Additional grants are also inferred from event-level permissions. |
| `noticeOfChange()` | `NoticeOfChangeBuilder` | Configure NoC flows. |
| `searchCriteria()` | `SearchCriteriaBuilder` | Configure global search criteria fields. |
| `searchParty()` | `SearchPartyBuilder` | Configure global search party fields. |
| `caseRoleToAccessProfile(R role)` | `CaseRoleToAccessProfileBuilder` | Map a case role to an IDAM access profile. |
| `categories(R role)` | `CaseCategoryBuilder` | Define Case File View document categories (role-scoped). |
| `workBasketResultFields()` | `SearchBuilder` | Configure workbasket result list columns. |
| `workBasketInputFields()` | `SearchBuilder` | Configure workbasket input (filter) fields. |
| `searchResultFields()` | `SearchBuilder` | Configure search result columns. |
| `searchInputFields()` | `SearchBuilder` | Configure search input (filter) fields. |
| `searchCasesFields()` | `SearchCasesBuilder` | Configure global search result fields. |
| `omitHistoryForRoles(R... roles)` | `void` | Suppress event history visibility for roles. |
| `setCallbackHost(String host)` | `void` | Base URL for webhook generation at definition-gen time. |
| `hmctsServiceId(String value)` | `void` | Sets the `HMCTSServiceId` supplementary value. |
| `addPreEventHook(Function<Map,Map> hook)` | `void` | Register a pre-deserialisation data transform (migration hook). |
| `shutterService()` / `shutterService(R...)` | `void` | Mark the service as shuttered (optionally for specific roles). |
| `attachScannedDocEvent()` | `EventTypeBuilderImpl` | Register the built-in `attachScannedDocs` event for bulk-scan. |
| `handleSupplementaryEvent()` | `EventTypeBuilderImpl` | Register the built-in `handleEvidence` supplementary event. |
| `grantComplexType(getter, listElementCode, perms, roles)` | `void` | Grant field-level complex type authorisation. |

---

## `EventTypeBuilder<T,R,S>` (state selector)

Returned by `ConfigBuilder.event(id)`. You call one method to specify pre/post states, which returns an `Event.EventBuilder`.

| Method | Returns | Description |
|---|---|---|
| `forState(S state)` | `EventBuilder` | Event applies to cases in `state` and stays in `state`. |
| `initialState(S state)` | `EventBuilder` | Event creates a new case in `state` (no pre-state). |
| `forStateTransition(S from, S to)` | `EventBuilder` | Transitions case from `from` to `to`. |
| `forStateTransition(EnumSet from, S to)` | `EventBuilder` | Multiple pre-states, single post-state. |
| `forStateTransition(S from, EnumSet to)` | `EventBuilder` | Single pre-state, multiple post-states. |
| `forStateTransition(EnumSet from, EnumSet to)` | `EventBuilder` | Multiple pre and post states. |
| `forAllStates()` | `EventBuilder` | Event available in any state, stays in current state. |
| `forStates(EnumSet states)` | `EventBuilder` | Event available in the given set of states. |
| `forStates(S... states)` | `EventBuilder` | Vararg form of `forStates`. |

Source: `EventTypeBuilder.java`.

---

## `Event.EventBuilder<T,R,S>`

Returned by calling a state-selector method. All methods return `this` (fluent).

| Method | Description |
|---|---|
| `name(String name)` | Human-readable event name. Also sets `description` if not already set. |
| `showSummary()` | Show the check-your-answers (CYA) page. |
| `showSummary(boolean)` | Explicitly enable/disable CYA page. |
| `showEventNotes()` | Show the event notes field. |
| `publishToCamunda()` | Flag event for Camunda message publish (work allocation). |
| `publishToCamunda(boolean)` | Explicit Camunda flag. |
| `ttlIncrement(Integer days)` | Increment the case TTL by `days` on event submission. |
| `aboutToSubmitCallback(AboutToSubmit<T,S> cb)` | Register about-to-submit webhook lambda. Mutually exclusive with `submitHandler`. |
| `submittedCallback(Submitted<T,S> cb)` | Register submitted webhook lambda. Mutually exclusive with `submitHandler`. |
| `grant(Set<Permission> perms, R... roles)` | Attach CRUD permissions to the event. |
| `grant(Permission perm, R... roles)` | Single-permission convenience overload. |
| `grant(HasAccessControl... accessControls)` | Attach permissions from access-control objects. |
| `grantHistoryOnly(R... roles)` | Grant READ-only with history-only flag for specified roles. |
| `explicitGrants()` | Disable permission inheritance from states. |
| `retries(int... intervals)` | Set retry intervals (ms) for all webhooks on this event. |
| `fields()` | Access the `FieldCollectionBuilder` for this event's pages/fields. |

> **Constraint**: `submitHandler` and `aboutToSubmitCallback`/`submittedCallback` are mutually exclusive. Setting both throws `IllegalStateException` at startup (`Event.java:188-199`).

---

## `FieldCollectionBuilder<T, S, Parent>`

Accessed via `EventBuilder.fields()`. Builds ordered wizard pages and fields.

### Page methods

| Method | Description |
|---|---|
| `page(String id)` | Switch current page context; subsequent field calls belong to this page. Resets field ordering. |
| `page(String id, MidEvent<T,S> callback)` | Page with a mid-event callback. Fires when user advances past this page. |
| `pageLabel(String label)` | Set a heading label for the current page. |
| `showCondition(String condition)` | Attach a show-condition expression to the current page. |

### Field methods

All field methods accept a typed property getter (`TypedPropertyGetter<T, ?>` i.e. a method reference like `CaseData::getFieldName`) and return `this`.

| Method | DisplayContext | ShowSummary | Notes |
|---|---|---|---|
| `mandatory(getter)` | Mandatory | Yes | Field is required. |
| `mandatory(getter, showCondition)` | Mandatory | Yes | With show condition. |
| `mandatory(getter, showCondition, defaultValue, label, hint)` | Mandatory | Yes | Full overload. |
| `mandatoryNoSummary(getter)` | Mandatory | No | Hidden on CYA page. |
| `mandatoryWithLabel(getter, label)` | Mandatory | Yes | Override CCD field label. |
| `mandatoryWithDisplayContextParameter(getter, showCond, param)` | Mandatory | - | With display context parameter (e.g. `#ARGUMENT(...)`). |
| `optional(getter)` | Optional | Yes | Field is not required. |
| `optional(getter, showCondition)` | Optional | Yes | With show condition. |
| `optional(getter, showCondition, retainHiddenValue)` | Optional | Yes | Controls value retention when hidden. |
| `optionalNoSummary(getter)` | Optional | No | Hidden on CYA page. |
| `optionalWithLabel(getter, label)` | Optional | Yes | Override CCD field label. |
| `readonly(getter)` | ReadOnly | Yes | Read-only (immutable). |
| `readonly(getter, showCondition)` | ReadOnly | Yes | With show condition. |
| `readonlyNoSummary(getter)` | ReadOnly | No | Read-only, hidden on CYA. |
| `readonlyWithLabel(getter, label)` | ReadOnly | No | Override label. |
| `label(String id, String value)` | ReadOnly | No | Static label field (markdown supported, e.g. `"## Heading"`). |
| `label(String id, String value, String showCond, boolean showSummary)` | ReadOnly | Param | Label with CYA visibility control. |
| `complex(getter)` | Complex | Yes | Begin nested complex type builder; returns `FieldCollectionBuilder<U,...>`. |
| `list(getter)` | - | Yes | Begin collection (`ListValue<U>`) builder. |
| `done()` | - | - | Return to parent builder (exits complex/list context). |

Labels support markdown-style headings (`"## Section Title"`) and appear both in the event form and optionally on the CYA page when `showSummary = true`.
<!-- CONFLUENCE-ONLY: label fourth-param showSummary for CYA visibility not verified in source beyond FieldCollection.java:484 -->

### Check Your Answers (CYA) page behaviour

When `.showSummary()` is called on an event, each field's `showSummary` flag determines whether it appears on the generated CYA page with a "Change" link. The `ShowSummaryChangeOption` column in the generated definition is set to `"Y"` for fields with `showSummary = true`. Fields added via `*NoSummary` methods are excluded from CYA.

---

## `@CCD` annotation

Applied to fields on case data classes. Controls how the field appears in the generated CCD definition.

| Element | Type | Default | Description |
|---|---|---|---|
| `label` | `String` | `""` | Human-readable label. Context-dependent: field label, state name, FixedList element, role name. |
| `hint` | `String` | `""` | Hint text (fields), ListElementCode (FixedLists), description (roles), TitleDisplay (states). |
| `showCondition` | `String` | `""` | CCD show-condition expression. |
| `regex` | `String` | `""` | Validation regex for the field. |
| `displayOrder` | `int` | `0` | Ordering within the type. |
| `typeOverride` | `FieldType` | `Unspecified` | Override the inferred CCD field type (e.g. `FixedList`, `TextArea`, `MultiSelectList`). |
| `typeParameterOverride` | `String` | `""` | Type parameter (e.g. the FixedList code or Collection element type). |
| `categoryID` | `String` | `""` | Case File View category ID for document fields. |
| `access` | `Class<? extends HasAccessControl>[]` | `{}` | Access control classes for field-level authorisation. |
| `inheritAccessFromParent` | `boolean` | `true` | Whether to inherit parent complex type access. |
| `showSummaryContent` | `boolean` | `false` | Show field content (not just label) on case summary tab. |
| `ignore` | `boolean` | `false` | Exclude this field from CCD definition generation entirely. |
| `searchable` | `boolean` | `true` | Whether the field is searchable in Elasticsearch. |
| `min` | `int` | `MIN_VALUE` | Minimum value (numeric fields). |
| `max` | `int` | `MAX_VALUE` | Maximum value (numeric fields). |
| `retainHiddenValue` | `boolean` | `false` | If `true`, retain the field value when hidden by a show condition. |

Example:

```java
@CCD(
    label = "Application type",
    access = {DefaultAccess.class},
    typeOverride = FixedList,
    typeParameterOverride = "ApplicationType"
)
private ApplicationType applicationType;
```

---

## `@JsonUnwrapped` pattern

Teams use Jackson's `@JsonUnwrapped(prefix = "...")` to flatten a nested Java class into individual CCD fields. This avoids complex-type UI rendering (which can be awkward in ExUI) while maintaining clean Java domain modelling.

```java
public class CaseData {
    @JsonUnwrapped(prefix = "applicant1")
    private Applicant applicant1 = new Applicant();

    @JsonUnwrapped(prefix = "applicant2")
    private Applicant applicant2 = new Applicant();
}

public class Applicant {
    @CCD(label = "First name")
    private String firstName;

    @CCD(label = "Last name")
    private String lastName;
}
```

This generates CCD fields: `applicant1FirstName`, `applicant1LastName`, `applicant2FirstName`, `applicant2LastName`.

The `FieldCollectionBuilder.complex()` method detects `@JsonUnwrapped` fields and shares the parent's field list/ordering state rather than creating a nested complex type (`FieldCollection.java:414-443`).

---

## `addPreEventHook` (migration hooks)

Registered via `configBuilder.addPreEventHook(RetiredFields::migrate)`. The hook is a `Function<Map<String, Object>, Map<String, Object>>` that transforms the raw JSON map **before** Jackson deserialises it into `CaseData`. This allows:

- Renaming fields (copy value from old key to new key)
- Migrating data formats between schema versions
- Maintaining a `dataVersion` field for background bulk-migration via cron

Pattern from NFDIV/Adoption:

```java
private static final Map<String, Consumer<Map<String, Object>>> migrations = Map.of(
    "exampleRetiredField", data -> data.put("applicant1FirstName", data.get("exampleRetiredField"))
);
```

Teams maintain a `dataVersion` integer field. A cron periodically queries for cases with older versions and triggers `system-migrate-case`, which invokes the hook to migrate data forward.

---

## `DecentralisedConfigBuilder<T, S, R>`

Extends `ConfigBuilder` for decentralised services (services that own their own persistence rather than relying on CCD's data store).

| Method | Description |
|---|---|
| `decentralisedEvent(String id, Submit<T,S> handler)` | Event with mandatory submit handler; replaces `aboutToSubmitCallback`/`submittedCallback`. |
| `decentralisedEvent(String id, Submit<T,S> handler, Start<T,S> startHandler)` | Event with both submit and start handlers. |

Decentralised events use different callback interfaces (see below).

---

## Callback functional interfaces

### Standard callbacks (`uk.gov.hmcts.ccd.sdk.api.callback`)

| Interface | Method signature | Webhook phase |
|---|---|---|
| `AboutToStart<T,S>` | `AboutToStartOrSubmitResponse<T,S> handle(CaseDetails<T,S>)` | Before the form is shown. |
| `AboutToSubmit<T,S>` | `AboutToStartOrSubmitResponse<T,S> handle(CaseDetails<T,S>, CaseDetails<T,S>)` | Before case data is persisted. Second arg is "before" state. |
| `Submitted<T,S>` | `SubmittedCallbackResponse handle(CaseDetails<T,S>, CaseDetails<T,S>)` | After case data is persisted. |
| `MidEvent<T,S>` | `AboutToStartOrSubmitResponse<T,S> handle(CaseDetails<T,S>, CaseDetails<T,S>)` | Between wizard pages. |

<!-- DIVERGENCE: Confluence (DATS page) says Submitted returns void, but source (Submitted.java) shows SubmittedCallbackResponse. Source wins. -->

### `AboutToStartOrSubmitResponse<T,S>`

The standard response object for `AboutToStart`, `AboutToSubmit`, and `MidEvent` callbacks:

| Field | Type | Description |
|---|---|---|
| `data` | `T` | Modified case data to persist. |
| `errors` | `List<String>` | Validation errors (blocks submission). |
| `warnings` | `List<String>` | Warnings (user can override). |
| `state` | `S` | Override the target state (optional). |
| `dataClassification` | `Map<String, Object>` | Security classification overrides. |
| `securityClassification` | `String` | Case-level security classification. |
| `errorMessageOverride` | `String` | Custom error message text. |

### Decentralised callbacks

| Interface | Method signature | Description |
|---|---|---|
| `Submit<T,S>` | `SubmitResponse<S> submit(EventPayload<T,S>)` | Replaces both AboutToSubmit and Submitted. Service owns persistence. |
| `Start<T,S>` | `T start(EventPayload<T,S>)` | Replaces AboutToStart for decentralised events. Returns populated case data. |

`EventPayload<T,S>` is a record: `(Long caseReference, T caseData, MultiValueMap<String, String> urlParams)`.

`SubmitResponse<S>` fields: `confirmationHeader`, `confirmationBody`, `errors`, `warnings`, `ignoreWarning`, `state`, `caseSecurityClassification`.

---

## `TabBuilder<T, R>`

Returned by `ConfigBuilder.tab(tabId, tabLabel)`. Defines a display tab on the case view.

| Method | Description |
|---|---|
| `field(getter)` | Add a field to the tab. |
| `field(getter, showCondition)` | Field with show condition. |
| `field(getter, showCondition, displayContextParam)` | Field with display context parameter (e.g. `"#ARGUMENT(CaseFileView)"`). |
| `field(String fieldName)` | Add field by name string. |
| `field(String fieldName, showCondition)` | Named field with show condition. |
| `label(String fieldName, showCondition, label)` | Add a label to the tab. |
| `forRoles(R... roles)` | Restrict tab visibility to specified roles. |
| `collection(getter)` | Add a collection field. |
| `showCondition(String)` | Tab-level show condition (set via Lombok builder). |

Case File View tabs use the reserved tab ID `"caseFileView"` with `#ARGUMENT(CaseFileView)` display context parameter.

---

## `CaseCategoryBuilder<R>`

Returned by `ConfigBuilder.categories(R role)`. Defines document categories for Case File View.

| Method | Description |
|---|---|
| `categoryID(String id)` | Category identifier (matches document `categoryId` values). |
| `categoryLabel(String label)` | Display label in the Case File View UI. |
| `displayOrder(int order)` | Sort order. |
| `parentCategoryID(String id)` | Parent category for hierarchical display. |
| `build()` | Finalise and register the category. |

---

## `NoticeOfChangeBuilder<T, S, R>`

Returned by `ConfigBuilder.noticeOfChange()`.

| Method | Description |
|---|---|
| `challenge(String id)` | Begin a challenge question definition. Returns `ChallengeBuilder`. |
| `eventId(String)` | Override the NoC-applied event ID (default: `"notice-of-change-applied"`). |
| `eventName(String)` | Override the NoC-applied event name. |
| `requestEventId(String)` | Override the NoC-request event ID (default: `"noc-request"`). |
| `requestEventName(String)` | Override the NoC-request event name. |
| `forStates(S... states)` | Restrict NoC to specific states. |
| `aboutToStartCallback(AboutToStart<T,S>)` | NoC about-to-start callback. |
| `aboutToSubmitCallback(AboutToSubmit<T,S>)` | NoC about-to-submit callback. |
| `submittedCallback(Submitted<T,S>)` | NoC submitted callback. |
| `build()` | Finalise the NoC configuration. |

---

## `Permission` enum and constants

```java
public enum Permission { C, R, U, D }

// Convenience sets:
Permission.CR   // Set.of(C, R)
Permission.CRU  // Set.of(C, R, U)
Permission.CRUD // Set.of(C, R, U, D)
```

---

## `HasRole`

Role enum contract. Your role enum must implement `HasRole`:

| Method | Returns | Description |
|---|---|---|
| `getRole()` | `String` | The CCD role string (e.g. `"caseworker-divorce-solicitor"`). |
| `getCaseTypePermissions()` | `String` | CRUD string for case-type level access (e.g. `"CRU"`). |

Example:

```java
public enum UserRole implements HasRole {
    CASEWORKER("caseworker-myservice", "CRU"),
    SOLICITOR("caseworker-myservice-solicitor", "CRU"),
    SYSTEM_UPDATE("caseworker-myservice-systemupdate", "CRU"),
    CREATOR("[CREATOR]", "CRU");

    private final String role;
    private final String caseTypePermissions;

    @Override public String getRole() { return role; }
    @Override public String getCaseTypePermissions() { return caseTypePermissions; }
}
```

---

## `CCDConfig<T, S, R extends HasRole>`

Marker interface implemented by service teams. Spring discovers all beans implementing it.

```java
@Component
public class MyCaseConfig implements CCDConfig<MyCaseData, State, UserRole> {
    @Override
    public void configure(ConfigBuilder<MyCaseData, State, UserRole> builder) {
        builder.setCallbackHost(System.getenv().getOrDefault("CASE_API_URL", "http://localhost:4013"));
        builder.caseType("MY_CASE", "My Case Type", "Description");
        builder.jurisdiction("MY_JURISDICTION", "My Jurisdiction", "Description");
        builder.addPreEventHook(RetiredFields::migrate);

        builder.event("CREATE_CASE")
            .initialState(State.DRAFT)
            .name("Create Case")
            .showSummary()
            .grant(Permission.CRU, UserRole.CASEWORKER)
            .aboutToSubmitCallback(this::handleAboutToSubmit)
            .fields()
                .page("page1")
                .pageLabel("Enter details")
                .mandatory(MyCaseData::getApplicantName)
                .optional(MyCaseData::getApplicantEmail);
    }
}
```

---

## Built-in complex types (`uk.gov.hmcts.ccd.sdk.type`)

| Class | CCD type | Notes |
|---|---|---|
| `Address` | `Address` | UK address (unvalidated). |
| `AddressUK` | `AddressUK` | Validated UK address fields. |
| `AddressGlobal` / `AddressGlobalUK` | `AddressGlobal` | International address variants. |
| `CaseLink` | `CaseLink` | Reference to another CCD case. |
| `CaseLocation` | `CaseLocation` | HMCTS court/region location. |
| `Document` | `Document` | URL + binary URL + filename + categoryId + uploadTimestamp. |
| `DynamicList` / `DynamicListElement` | `DynamicList` | Runtime-populated dropdown. |
| `DynamicMultiSelectList` | `DynamicMultiSelectList` | Multi-select dynamic list. |
| `Flags` / `FlagDetail` | `Flags` | Case Flags complex type; annotated `@ComplexType(name="Flags", generate=false)`. |
| `KeyValue` | `KeyValue` | Generic key-value pair. |
| `ListValue<T>` | `Collection` | Collection item wrapper providing `id` + `value`. |
| `Organisation` / `OrganisationPolicy` | `Organisation` / `OrganisationPolicy` | Org/PBA policy reference. |
| `ChangeOrganisationRequest` | `ChangeOrganisationRequest` | NoC organisation-change payload. |
| `PreviousOrganisation` | `PreviousOrganisation` | Historical org records for NoC. |
| `OrderSummary` / `Fee` / `WaysToPay` | -- | Payment-related complex types. |
| `ScannedDocument` / `ExceptionRecord` / `BulkScanEnvelope` | -- | Bulk-scan document types. |
| `SearchCriteria` / `SearchParty` | -- | Global search party/criteria types. |
| `TTL` | `TTL` | Case retention time-to-live. |
| `YesOrNo` | `YesOrNo` | Enum `YES` / `NO`. |
| `FieldType` | -- | Enum of all CCD primitive field types (Text, Date, Collection, etc.). |
| `ComponentLauncher` | `ComponentLauncher` | Launcher component reference. |
| `LinkReason` | `LinkReason` | Reason for a case link. |

---

## Ejecting from the SDK

The ccd-config-generator library generates standard CCD JSON output compatible with the `ccd-definition-processor` tooling. If limitations are encountered, teams can "eject" by running `generateCCDConfig` once, then maintaining the JSON directly. The generated JSON is a valid input for the XLS-to-import pipeline.
<!-- CONFLUENCE-ONLY: not verified in source -->

---

## See also

- [First case type with config-generator](../tutorials/first-case-type-config-generator.md) -- end-to-end tutorial using this API to build a case type
- [Data types](../explanation/data-types.md) -- explanation of CCD field types and their Java SDK equivalents
- [Glossary](glossary.md) -- CCD terms including ListValue, HasRole, YesOrNo
