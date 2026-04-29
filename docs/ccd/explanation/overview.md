---
topic: overview
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CCDConfig.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/HasRole.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/NoFaultDivorce.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CreateTestCase.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/SimpleCaseConfiguration.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/EventEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# What is CCD?

## TL;DR

- CCD (Core Case Data) is the HMCTS platform for storing, routing, and displaying case data. Every HMCTS service built on CFT has at least one **case type** defined in CCD.
- The core model is: **Jurisdiction → Case Type → States + Events + Fields + Tabs**. A case is always in exactly one state; events drive state transitions.
- Case type definitions are authored in Java (via the `ccd-config-generator` SDK) or as Excel/JSON and imported into `ccd-definition-store-api` via `POST /import`.
- Access is controlled by CRUD ACLs applied at four scopes: case type, event, state, and field.
- CCD's data is stored in `ccd-data-store-api`; definitions live in `ccd-definition-store-api`. These two services are the core runtime.

---

## The case-type model

A **jurisdiction** is the top-level grouping — roughly a business area (e.g. `DIVORCE`, `PROBATE`). Each jurisdiction owns one or more **case types**.

```
Jurisdiction
└── Case Type
    ├── States         (e.g. Draft, Submitted, Closed)
    ├── Events         (e.g. createCase, submitApplication)
    │   ├── pre-state / post-state
    │   ├── Fields shown on the wizard (CaseEventToFields)
    │   └── Callbacks  (aboutToStart, aboutToSubmit, submitted)
    ├── Case Fields    (the data model — typed, ACL-protected)
    ├── Complex Types  (reusable nested field shapes)
    ├── Fixed Lists    (enumerated dropdown values)
    ├── Tabs           (case-view UI layout)
    └── ACLs           (CRUD per access-profile, at each scope)
```

### States

A case is always in exactly one **state**. States are defined on the case type and carry their own ACL: which access-profiles can read or update a case in that state.

Example states from the `E2E` test case type (`State.java`): `Draft`, `Submitted`, `ConditionalOrderDrafted`, `FinalOrderComplete`, `Archived`. The `State` enum entries are annotated with `@CCD(label, hint, access)`.

### Events

An **event** moves a case from a `preState` (or any state, or "case creation") to a `postState`. Events carry:

| Field | Meaning |
|---|---|
| `preState` | Required current state(s), or `*` for any state |
| `postState` | State after the event completes |
| `aboutToStartCallback` | Webhook called before the form is shown |
| `aboutToSubmitCallback` | Webhook called before data is saved |
| `submittedCallback` | Webhook called after data is saved |
| `showCondition` | Expression; event only appears when true |
| `canCreate` | If true, this event creates a new case |
| `publishToCamunda` | Flag to publish a Camunda message on completion |
| `ttlIncrement` | Days to add to the case time-to-live |

In the SDK: `ConfigBuilder.event(String id)` returns an `EventTypeBuilder`; chain `.name()`, `.forAllStates()` / `.forState()`, `.aboutToSubmitCallback()`, `.grant()`, then `.fields()` to build the wizard (`ConfigBuilder.java:15`, `Event.java:29-44`).

### Case fields and types

Every piece of data stored on a case is a **case field** with a declared type. Primitive types include `Text`, `Date`, `DateTime`, `Number`, `YesOrNo`, `Document`, `Collection`, `FixedList`, `MultiSelectList`, `Label`, `OrderSummary`, and others. The SDK's `FieldType.java` enum covers most common types; some platform types like `Number` and `DateTime` are recognised by the definition store but are not present in the SDK enum.

Fields can be grouped into **complex types** — reusable nested structures. The SDK ships a library of common ones:

| SDK class | Purpose |
|---|---|
| `AddressGlobalUK` | Validated UK postal address |
| `Document` | Document reference (URL + binary URL + filename) |
| `CaseLink` | Reference to another CCD case |
| `Organisation` / `OrganisationPolicy` | Org/PBA reference for NoC |
| `DynamicList` | Runtime-populated dropdown |
| `Flags` / `FlagDetail` | Case flags complex type |
| `SearchCriteria` / `SearchParty` | Global search party data |
| `TTL` | Case retention time-to-live |
| `ListValue<T>` | Wrapper for items in a `Collection` field (`id` + `value`) |

### Tabs

**Tabs** define what the case-view UI shows. Each tab has an ordered list of fields (or complex-field paths). Tabs use `DisplayGroupType=TAB` and `DisplayGroupPurpose=VIEW` in the DB (`DisplayGroupEntity.java:54-59`). Wizard pages in events use `type=PAGE` and `purpose=EDIT`.

### ACLs

Access is expressed as CRUD strings (`C`, `R`, `U`, `D` in any combination) applied to an **access-profile** at four scopes:

| Sheet / table | Scope |
|---|---|
| `AuthorisationCaseType` → `case_type_acl` | Whole case type |
| `AuthorisationCaseEvent` → `event_acl` | Single event |
| `AuthorisationCaseState` → `state_acl` | Single state |
| `AuthorisationCaseField` → `case_field_acl` | Single field |
| `AuthorisationComplexType` → `complex_field_acl` | Nested sub-field (dot-path) |

Access profiles are strings (e.g. `caseworker-divorce-courtadmin_beta`). IDAM roles map to access profiles via the `RoleToAccessProfiles` sheet. Definition-store stores ACLs; `ccd-data-store-api` enforces them at runtime.

In the SDK, `ConfigBuilder.grant(state, permissions, roles...)` sets state-level grants, and `EventBuilder.grant(permissions, roles...)` sets event-level grants (`ConfigBuilder.java:39`, `Event.java:160`).

---

## A minimal example

The `E2E_SIMPLE` case type in `test-projects/e2e` is the smallest complete example (`SimpleCaseConfiguration.java`). It shows the entire model in one file:

```java
// Case type: E2E_SIMPLE, jurisdiction: DIVORCE
public class SimpleCaseConfiguration implements CCDConfig<SimpleCaseData, SimpleCaseState, UserRole> {

    @Override
    public void configure(ConfigBuilder<SimpleCaseData, SimpleCaseState, UserRole> configBuilder) {
        // Two events with a state transition
        configBuilder.event("create-simple-case")
            .forStateTransition(EnumSet.noneOf(SimpleCaseState.class), SimpleCaseState.CREATED)
            .name("Create simple case")
            .grant(Permissions.CREATE_READ_UPDATE, UserRole.CASE_WORKER)
            .fields()
            .page("simpleCaseCreation")
            .mandatory(SimpleCaseData::getSubject);

        configBuilder.event("simple-case-follow-up")
            .forStateTransition(SimpleCaseState.CREATED, SimpleCaseState.FOLLOW_UP)
            .name("Follow up")
            .grant(Permissions.CREATE_READ_UPDATE, UserRole.CASE_WORKER)
            .fields()
            .page("simpleCaseFollowUp")
            .optional(SimpleCaseData::getFollowUpNote);

        // Search and workbasket columns
        configBuilder.searchInputFields().field(SimpleCaseData::getSubject);
        configBuilder.searchResultFields().field(SimpleCaseData::getSubject);
        configBuilder.workBasketInputFields().field(SimpleCaseData::getSubject);
        configBuilder.workBasketResultFields().field(SimpleCaseData::getSubject);
    }
}
```

This produces a case type with:
- Two states: `Open` and `Closed`
- Two events: `create-simple-case` (creates a case, goes to `Open`) and `simple-case-follow-up` (`Open → Closed`)
- One data field: `subject` (Text)
- Caseworker CRUD on both events; no callbacks

---

## How definitions get into CCD

The `ccd-definition-store-api` ingests definitions as either an Excel spreadsheet or a directory of JSON files. The import endpoint is `POST /import` (multipart) — `ImportController.java:62`.

The import pipeline processes sheets in order (`ImportServiceImpl.java:192-346`):

1. Jurisdiction
2. Field types (FixedLists, ComplexTypes)
3. Metadata fields
4. Case types + domain validation
5. UI layouts (tabs, wizard pages, search/workbasket columns)
6. User profiles
7. Optional: Banner, RoleToAccessProfiles, SearchCriteria, SearchParty, GlobalSearch, Welsh translations

After DB writes, `DefinitionImportedEvent` is published, which triggers Elasticsearch index creation or mapping update for the imported case types.

The SDK (`ccd-config-generator`) generates the JSON definition from annotated Java classes. Service teams implement `CCDConfig<T,S,R>` and run `./gradlew generateCCDConfig` to produce the JSON, then import it.

---

## The two runtime services

| Service | Role |
|---|---|
| `ccd-definition-store-api` | Stores case type definitions (states, events, fields, ACLs, layouts). Serves definitions to data-store and UI. Import endpoint: `POST /import`. |
| `ccd-data-store-api` | Stores case instances. Enforces ACLs at runtime. Triggers callbacks. Exposes case CRUD + event submission APIs. |

The ExUI (Case Management UI) reads definitions from definition-store and case data from data-store. Service team backends receive webhook callbacks from data-store at `aboutToStart`, `aboutToSubmit`, and `submitted` phases.

---

## See also

- [Architecture](architecture.md) — how definition-store, data-store, and ExUI fit together at runtime
- [Event model](event-model.md) — lifecycle of a single event: wizard, callbacks, state transition
- [Glossary](../reference/glossary.md) — definitions for jurisdiction, case type, access profile, and more
