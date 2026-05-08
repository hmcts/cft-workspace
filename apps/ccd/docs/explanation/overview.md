---
topic: overview
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CCDConfig.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/HasRole.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/EventTypeBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Webhook.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/MidEvent.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/NoFaultDivorce.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CreateTestCase.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/SimpleCaseConfiguration.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/model/SimpleCaseState.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/endpoint/ImportController.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/EventEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
  - ccd-data-store-api:src/main/resources/db/migration/V0001__Base_version.sql
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1792870568"
    title: "Reform CFT CCD architecture and design overview"
    space: "RTA"
    last_modified: "unknown"
  - id: "204041440"
    title: "Reform: Case Management Home"
    space: "RCCD"
    last_modified: "unknown"
  - id: "1478703621"
    title: "Core Case Data (CCD) - a brief overview for Reform MI"
    space: "ADM"
    last_modified: "unknown"
  - id: "1446913183"
    title: "01 CCD SOG - Overview"
    space: "RCCD"
    last_modified: "unknown"
---

# What is CCD?

## TL;DR

- CCD (Core Case Data) is HMCTS's multi-tenanted case-management platform — a single deployed instance that holds all Reform CFT case data, with each jurisdiction defining its own case model, state model, and access control on top.
- The core model is: **Jurisdiction → Case Type → States + Events + Fields + Tabs**. A case is always in exactly one state; events drive state transitions and are the only way case data changes.
- CCD is **event-sourced**: every change to a case is a recorded event with the full case payload, alongside a current-state snapshot row. Both live in Postgres `jsonb`.
- Case-type definitions are authored in Java (via the `ccd-config-generator` SDK) or as Excel/JSON and imported into `ccd-definition-store-api` via `POST /import`.
- Access is controlled by CRUD ACLs applied at four scopes (case type, event, state, field), combined with role-based access and per-field data classification.
- CCD is **deliberately generic**: jurisdiction-specific business logic lives in service backends, invoked via callbacks (`aboutToStart`, `midEvent`, `aboutToSubmit`, `submitted`) — never inside CCD itself.

---

## The case-type model

A **jurisdiction** is the top-level grouping — roughly a business area (e.g. `DIVORCE`, `PROBATE`). Each jurisdiction owns one or more **case types**.

Note that jurisdiction and case type are not the same: Probate, for example, has multiple case types under one jurisdiction (`GrantOfRepresentation`, `Caveat`, `StandingSearch`, `WillLodgement`).

```
Jurisdiction
└── Case Type
    ├── States         (e.g. Draft, Submitted, Closed)
    ├── Events         (e.g. createCase, submitApplication)
    │   ├── pre-state(s) / post-state(s)
    │   ├── Fields shown on the wizard (CaseEventToFields)
    │   └── Callbacks  (aboutToStart, midEvent, aboutToSubmit, submitted)
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
| `midEventCallback` | Webhook called when navigating between wizard pages — used to validate or populate fields mid-event (e.g. enrich data from an external lookup before the user proceeds) |
| `aboutToSubmitCallback` | Webhook called before data is saved (typical place for cross-field validation; can block the save) |
| `submittedCallback` | Webhook called after data is saved (cannot change case data) |
| `showCondition` | Expression; event only appears when true |
| `canCreate` | If true, this event creates a new case |
| `publishToCamunda` | Flag to publish a Camunda-bound message on completion (rides the CCD message bus) |
| `ttlIncrement` | Days to add to the case time-to-live |

In the SDK: `ConfigBuilder.event(String id)` returns an `EventTypeBuilder`; chain `.name()`, `.forAllStates()` / `.forStates()` / `.forStateTransition(from, to)`, `.aboutToSubmitCallback()`, `.grant()`, then `.fields()` to build the wizard (`ConfigBuilder.java:15`, `Event.java:29-44`).

`forStateTransition` is overloaded: it accepts `EnumSet`s on either side, so a single event can declare multiple acceptable pre-states or — significantly — choose between **multiple possible post-states based on case data** (`EventTypeBuilder.java:11-23`). This is meant for simple data-driven branching (e.g. "if liability already accepted, go to `ReadyForDirections`, otherwise `ScheduleHearing`"); complex state-machine logic should still live outside CCD.

### Case fields and types

Every piece of data stored on a case is a **case field** with a declared type. Primitive types include `Text`, `Date`, `DateTime`, `Number`, `YesOrNo`, `Document`, `Collection`, `FixedList`, `MultiSelectList`, `Label`, `OrderSummary`, and others. The SDK's `FieldType.java` enum covers most common types; some platform types like `Number` and `DateTime` are recognised by the definition store but are not present in the SDK enum.

Fields can be grouped into **complex types** — reusable nested structures. CCD ships a library of common ones (sometimes called **basetypes** in older Confluence docs); the SDK exposes them as Java classes:

| SDK class | Purpose |
|---|---|
| `AddressGlobalUK` | Validated UK postal address (triggers ExUI postcode-lookup component) |
| `Document` | Document reference (URL + binary URL + filename); document bytes live in CDAM/DocStore, not CCD |
| `CaseLink` | Reference to another CCD case |
| `Organisation` / `OrganisationPolicy` | Org/PBA reference for case sharing and Notice of Change |
| `DynamicList` | Runtime-populated dropdown |
| `Flags` / `FlagDetail` | Case flags complex type |
| `SearchCriteria` / `SearchParty` | Global search party data |
| `TTL` | Case retention time-to-live |
| `ListValue<T>` | Wrapper for items in a `Collection` field (`id` + `value`) |

CRUD permissions on a `Collection` apply to the **whole collection**, not individual items — so you cannot grant a user access to one document in a list and not the others.

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

CCD's runtime access-control evaluation layers three concerns:

1. **Role-based access** — does the user (via IDAM roles and any case-specific roles) have access to this case at all?
2. **CRUD permissions** — for each case type / state / event / field they reach, what operations are allowed?
3. **Data classification** — is the user's security classification at least as high as the field's? Each field carries a classification (`PUBLIC`, `PRIVATE`, `RESTRICTED`); user roles carry a maximum classification, and fields above that are filtered out of responses.

In the SDK, `ConfigBuilder.grant(state, permissions, roles...)` sets state-level grants, and `EventBuilder.grant(permissions, roles...)` sets event-level grants (`ConfigBuilder.java:39`, `Event.java:160`).

---

## A minimal example

The `E2E_SIMPLE` case type in `test-projects/e2e` is the smallest complete example (`SimpleCaseConfiguration.java`). It shows the entire model in one file:

```java
// Case type: E2E_SIMPLE, jurisdiction: DIVORCE
@Component
public class SimpleCaseConfiguration implements CCDConfig<SimpleCaseData, SimpleCaseState, UserRole> {

    public static final String CASE_TYPE = "E2E_SIMPLE";
    public static final String JURISDICTION = "DIVORCE";

    @Override
    public void configure(ConfigBuilder<SimpleCaseData, SimpleCaseState, UserRole> configBuilder) {
        configBuilder.caseType(CASE_TYPE, "Simple e2e case type", "Additional simple case type for e2e tests");
        configBuilder.jurisdiction(JURISDICTION, "Family Divorce", "Family Divorce: simple case tests");

        // Case-creation event (no pre-state) → CREATED
        configBuilder.event("create-simple-case")
            .forStateTransition(EnumSet.noneOf(SimpleCaseState.class), SimpleCaseState.CREATED)
            .name("Create simple case")
            .grant(CREATE_READ_UPDATE, UserRole.CASE_WORKER)
            .fields()
            .page("simpleCaseCreation")
            .mandatory(SimpleCaseData::getSubject);

        // Follow-up event: CREATED → FOLLOW_UP
        configBuilder.event("simple-case-follow-up")
            .forStateTransition(SimpleCaseState.CREATED, SimpleCaseState.FOLLOW_UP)
            .name("Simple case follow up")
            .grant(CREATE_READ_UPDATE, UserRole.CASE_WORKER)
            .fields()
            .page("simpleCaseFollowUp")
            .optional(SimpleCaseData::getFollowUpNote);

        // Search and workbasket columns
        configBuilder.searchInputFields().field(SimpleCaseData::getSubject, "Subject");
        configBuilder.searchResultFields().field(SimpleCaseData::getSubject, "Subject");
        configBuilder.workBasketInputFields().field(SimpleCaseData::getSubject, "Subject");
        configBuilder.workBasketResultFields().field(SimpleCaseData::getSubject, "Subject");
    }
}
```

This produces a case type with:
- Three states declared on the enum (`DRAFT`, `CREATED`, `FOLLOW_UP`); the configured events use only `CREATED` and `FOLLOW_UP` (`SimpleCaseState.java`).
- Two events: `create-simple-case` (creates a case, lands in `CREATED`) and `simple-case-follow-up` (`CREATED → FOLLOW_UP`).
- One required data field on the wizard: `subject` (Text).
- Caseworker CRUD on both events; the real `SimpleCaseConfiguration` also wires `aboutToStartCallback` and `aboutToSubmitCallback` lambdas.

---

## How definitions get into CCD

The `ccd-definition-store-api` ingests definitions as either an Excel spreadsheet or a directory of JSON files. The import endpoint is `POST /import` (multipart) — `ImportController.java:42` (`URI_IMPORT = "/import"`).

Internally, development teams maintain their definitions as JSON in GitHub (versioned alongside callback code). The JSON is converted to XLSX via the `ccd-definition-processor` Docker image just before upload. CCD records every import for auditability.

The import pipeline processes sheets in order (`ImportServiceImpl.java:192-346`):

1. Jurisdiction
2. Field types (FixedLists, ComplexTypes)
3. Metadata fields
4. Case types + domain validation
5. UI layouts (tabs, wizard pages, search/workbasket columns)
6. User profiles
7. Optional: Banner, RoleToAccessProfiles, SearchCriteria, SearchParty, GlobalSearch, Welsh translations

After DB writes, `DefinitionImportedEvent` is published, which triggers Elasticsearch index creation or mapping update for the imported case types — for each case type the definition store creates an **index, mapping, and alias** in ES.

The newly-imported definition becomes active immediately. Older definition versions are retained: in-flight cases continue to be viewed against the definition version they were created under, but fine-grained authorisation always uses the latest definition.

The SDK (`ccd-config-generator`) generates the JSON definition from annotated Java classes. Service teams implement `CCDConfig<T,S,R>` and run `./gradlew generateCCDConfig` (alias `gCC`) to produce the JSON, then import it.

---

## The two runtime services

| Service | Role |
|---|---|
| `ccd-definition-store-api` | Stores case type definitions (states, events, fields, ACLs, layouts). Serves definitions to data-store and UI. Import endpoint: `POST /import`. Owns the ES index lifecycle. |
| `ccd-data-store-api` | Stores case instances. Enforces ACLs, role-based access and data classification at runtime. Triggers callbacks. Exposes case CRUD + event submission APIs. |

Inside `ccd-data-store-api`'s schema, two tables capture the event-sourcing model (`V0001__Base_version.sql:67-101`):

- **`case_data`** — current case state (one row per case, payload as `jsonb`).
- **`case_event`** — append-only event log (one row per event, full payload as `jsonb` plus event metadata: who, when, why, pre/post state).

Note that `case_event` stores **the entire case payload** at the time of the event, not just a delta — replaying events reconstructs case history without requiring delta application logic.

ExUI (the Case Management UI) reads definitions from definition-store and case data from data-store. Service team backends receive webhook callbacks from data-store at `aboutToStart`, `midEvent`, `aboutToSubmit`, and `submitted` phases.

CCD also exposes a **message bus** (Azure Service Bus topic): completed events can be configured to publish messages that downstream systems (Work Allocation, service-specific consumers) subscribe to. This is an extension of the `submitted` callback model — it lets services react to events asynchronously without blocking the CCD thread. The `publishToCamunda` flag on an Event is the SDK's way to opt in.

<!-- CONFLUENCE-ONLY: the Azure Service Bus topic mechanism and "publishToCamunda rides the CCD message bus" is described in the Reform CFT CCD architecture overview but is not directly verifiable from the SDK source alone — `Event.publishToCamunda` is just a boolean flag; the runtime publishing path lives in ccd-data-store-api. -->

---

## Why CCD looks the way it does

A few design decisions shape every other page in this tree; understanding them up front saves a lot of head-scratching later.

- **Multi-tenanted by design.** A single CCD instance hosts all Reform jurisdictions. This trades isolation for a consistent operator experience and lower per-jurisdiction overhead, but means all definition imports, all schema concerns, and all access control go through one managed product. There is no per-service CCD deployment.
- **Configuration over code, in CCD.** Jurisdictions evolve constantly, so the case model, state machine, wizard layout, and access rules are all *configuration* loaded at runtime. CCD itself never grows business logic for a particular jurisdiction.
- **Business logic is externalised to service backends.** When CCD needs to invoke logic on behalf of a jurisdiction (default-fill a form, validate, fetch a fee, send a notification) it calls a webhook on the service. CCD has no awareness of "what a Divorce case means" beyond the field shapes the service has declared.
- **Event sourcing for cases, not for definitions.** Case data is event-sourced (full payload per event in `case_event`). Definitions are versioned in the definition store but not event-sourced — they are imported as snapshots.
- **JSON-on-Postgres for flexibility.** Sub-domain shapes (a Divorce case vs a Probate case) are stored as JSON and managed at the application layer, not as relational tables. This was a deliberate trade-off to allow definition changes and multiple concurrent definition versions without schema migrations.
- **Search via Elasticsearch v2 API.** The Postgres-backed v1 search API exists for guaranteed-consistency reads; the ES-backed v2 search API is what almost everything uses, with up to ~2 seconds of indexing lag.

---

## See also

- [Architecture](architecture.md) — how definition-store, data-store, and ExUI fit together at runtime
- [Event model](event-model.md) — lifecycle of a single event: wizard, callbacks, state transition
- [Glossary](../reference/glossary.md) — definitions for jurisdiction, case type, access profile, and more
