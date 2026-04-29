---
topic: work-basket
audience: both
sources:
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/WorkBasketInputCaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/WorkBasketCaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/GenericLayoutEntity.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/DisplayApiController.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/model/SearchInputField.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/model/SearchResultsField.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/model/WorkBasketUserDefault.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/ui/QueryEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/internal/controller/UICaseSearchController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/search/SearchResultDefinitionService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/search/MetaData.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Search.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/SearchField.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "207804327"
    title: "CCD Definition Glossary for Setting up a Service in CCD"
    space: "RCCD"
  - id: "1057948326"
    title: "Per-role CaseTabs, Workbasket and Search"
    space: "RCCD"
  - id: "1392411337"
    title: "Internal Search API LLD"
    space: "RCCD"
  - id: "1580172699"
    title: "Introduction to CCD Configuration - User Guide"
    space: "CRef"
  - id: "728727629"
    title: "Release Plan - Allowing any Flexible Case field data in the first column on caselist"
    space: "RCCD"
  - id: "221085798"
    title: "RDM ??? - Display/Referencing metadata, SubComplex, Collection item fields"
    space: "RCCD"
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/WorkBasketResultFields.json
---

# Work Basket

## TL;DR

- The work basket is the queue-style case list in ExUI where caseworkers filter and view cases assigned to their team or role.
- Two definition sheets control it: `WorkBasketInputFields` (the filter form) and `WorkBasketResultFields` (the result columns).
- Both are served by `ccd-definition-store-api` via `GET /api/display/work-basket-input-definition/{id}` and `GET /api/display/work-basket-definition/{id}`.
- ExUI calls the internal `POST /internal/searchCases?ctid=&use_case=WORKBASKET` endpoint on `ccd-data-store-api` to execute the filtered query against Elasticsearch.
- The first column is no longer implicitly Case Reference — services must include `[CASE_REFERENCE]` (or another field) in `WorkBasketResultFields` explicitly.
- Work basket is distinct from work allocation — work allocation (Task Manager/WA) is a separate system that assigns tasks; the work basket only shows cases.

## Definition sheets

### WorkBasketInputFields

Each row defines one filter input rendered above the case list.

| Column | Description | Notes |
|---|---|---|
| `LiveFrom` | Start date from which the row is valid | Validated as a date |
| `LiveTo` | End date until which the row is valid | Not validated |
| `CaseTypeID` | Case type this row belongs to | Max length 70 |
| `CaseFieldID` | Field to filter on. Metadata fields are referenced in square brackets (e.g. `[CASE_REFERENCE]`, `[STATE]`) | Max length 70 |
| `CaseFieldElementPath` | Dot-notation path into a complex field (e.g. `applicant.lastName`); collection element by index (`AliasNames(1).FirstName`); null for top-level fields. Also accepted spreadsheet column name: `ListElementCode`. | Max length 70 |
| `Label` | Display label for the input control | Max length 30 (per Confluence glossary) — **shorter than the result-column `Label`** |
| `DisplayOrder` | Left-to-right ordering of inputs | |
| `AccessProfile` | If set, only users with this access profile see this input. Legacy spreadsheet alias: `UserRole` (still accepted by the importer — see `ColumnName.java:9`). | If blank, available to all roles |
| `DisplayContextParameter` | Format hints (e.g. `#TABLE(...)`, `#DATETIMEDISPLAY(...)`) | |
| `ShowCondition` | Conditional display expression — input hidden unless condition is met | Same syntax as event-field show conditions |

Stored in DB table `workbasket_input_case_field`. Entity: `WorkBasketInputCaseFieldEntity`, which extends `InputCaseFieldEntity` (adds `show_condition`) and `GenericLayoutEntity` (base columns). Sheet name must be exactly `"WorkBasketInputFields"` (`SheetName.java:16`).

Served as `WorkbasketInputDefinition{caseTypeId, fields[]}` from `DisplayApiController.java:107–117`.

### WorkBasketResultFields

Each row defines one column in the result table.

| Column | Description | Notes |
|---|---|---|
| `LiveFrom` | Start date from which the row is valid | Validated as a date |
| `LiveTo` | End date until which the row is valid | Not validated |
| `CaseTypeID` | Case type this row belongs to | Max length 70 |
| `CaseFieldID` | Field value to display in the column. Metadata fields use square brackets (`[CASE_REFERENCE]`, `[STATE]`, `[CREATED_DATE]`, etc.). | Max length 70. Label fields cannot appear in result columns — they are not persisted in the DB or ES. |
| `CaseFieldElementPath` | Dot-notation path for nested complex fields; collection element by index. Also accepted spreadsheet column name: `ListElementCode`. | Max length 70 |
| `Label` | Column header | Max length 200 |
| `DisplayOrder` | Left-to-right column ordering | |
| `AccessProfile` | Role-restricted column — hidden for users without this profile. Legacy alias: `UserRole`. | If blank, visible to all roles |
| `DisplayContextParameter` | Rendering hints | |
| `SortOrderDirection` | `ASC` or `DESC` — default sort direction for this column | |
| `SortOrderPriority` | Integer — lower number = higher priority when sorting by multiple columns | |

Stored in `workbasket_case_field`. Entity: `WorkBasketCaseFieldEntity`, extending `GenericLayoutEntity`. Sort order columns (`sort_order_direction`, `sort_order_priority`) are embedded inline, not a separate table (`SortOrder.java:9–12`). Sheet name: `"WorkBasketResultFields"` (`SheetName.java:17`).

Served as `WorkBasketResult` from `DisplayApiController.java:119–129`.

#### Metadata fields you can reference

Metadata properties are referenced as `[NAME]` in `CaseFieldID` (and as a filter in `WorkBasketInputFields`). The set implemented in `MetaData.java:43–49` is:

| Reference | Description |
|---|---|
| `[CASE_REFERENCE]` | The 16-digit case ID |
| `[JURISDICTION]` | Case's jurisdiction ID |
| `[CASE_TYPE]` | Case type ID |
| `[STATE]` | Current state ID |
| `[CREATED_DATE]` | Date the case was created |
| `[LAST_MODIFIED_DATE]` | Date the case was last modified |
| `[LAST_STATE_MODIFIED_DATE]` | Date of the most recent state transition |
| `[SECURITY_CLASSIFICATION]` | Case-level security classification |

<!-- DIVERGENCE: Confluence page 221085798 lists `[JURISDICTION_DESC]`, `[CASE_TYPE_DESC]`, `[STATE_DESC]`, `[CREATED_DATETIME]` and `[LAST_MODIFIED_DATETIME]` as planned but unimplemented. apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/data/casedetails/search/MetaData.java:43–49 confirms they are still not implemented; only the names listed above are recognised. Source wins. -->

<!-- CONFLUENCE-ONLY: Cross-case linking via `CaseLink.<field>` is described on Confluence page 221085798 as a separate ticket-breakdown bullet — not verified as a layout-resolver feature for WorkBasketInputFields/WorkBasketResultFields in source. Treat as historical design intent rather than current behaviour. -->

#### Per-role configuration

Both `WorkBasketInputFields` and `WorkBasketResultFields` support per-role configuration through the `AccessProfile`/`UserRole` column. The behaviour is additive:

- Rows with the column **blank** are visible to all roles.
- Rows with the column **set** are visible only to users holding that access profile.
- The same `CaseFieldID` may appear on multiple rows with different roles, allowing per-role `Label` text or column ordering — a user sees the row whose role they hold.

This matches the per-role customisation pattern documented across `CaseTypeTab`, `WorkBasketInputFields`, `WorkBasketResultFields`, `SearchInputFields` and `SearchResultFields` (Confluence: "Per-role CaseTabs, Workbasket and Search").

## How ExUI uses these definitions

```
ExUI
 │
 ├─ GET /api/display/work-basket-input-definition/{caseTypeId}
 │      → definition-store returns the filter field list
 │      → ExUI renders the input form
 │
 ├─ POST /internal/searchCases?ctid={caseTypeId}&use_case=WORKBASKET
 │      → data-store executes ES query with user-supplied filter values
 │      → UICaseSearchController applies ElasticsearchSortService
 │      → CaseSearchResultViewGenerator shapes columns from WorkBasketResultFields
 │
 └─ GET /api/display/work-basket-definition/{caseTypeId}
        → definition-store returns the result column list
        → ExUI applies column ordering and headers
```

The `use_case=WORKBASKET` parameter on `/internal/searchCases` is what causes `UICaseSearchController` to use the work-basket result field list rather than the standard search result list (`UICaseSearchController.java:149–155`). The selection of which `*ResultFields` tab to read is centralised in `SearchResultDefinitionService.getSearchResultDefinition`:

- `use_case` omitted → return all case fields ("standard request") with header info from the `CaseField` tab.
- `use_case=WORKBASKET` → read `WorkBasketResultFields`.
- `use_case=SEARCH` → read `SearchResultFields`.
- Any other value → read `SearchCasesResultFields` filtered by the `UseCase` column (case-insensitive). If no rows match, an error is returned.

The Confluence "Internal Search API LLD" notes that `WorkBasketResultFields` and `SearchResultFields` are intended to be migrated into the more general `SearchCasesResultFields` in future, with the legacy tabs eventually removed. <!-- CONFLUENCE-ONLY: scheduled deprecation timing not visible in source — the switch in `SearchResultDefinitionService.java:38–45` still carries a `TODO` to remove these legacy branches. -->

The legacy DB-backed endpoint `GET /caseworkers/{uid}/jurisdictions/{jid}/case-types/{ctid}/cases` (served by `QueryEndpoint.java:156`) predates Elasticsearch and is still active when ES is disabled (`ELASTIC_SEARCH_ENABLED=false`). The companion endpoint `GET /caseworkers/{uid}/jurisdictions/{jid}/case-types/{ctid}/work-basket-inputs` (`QueryEndpoint.java:205`) returns the filter field configuration regardless of whether ES is enabled.

### Headers in the response

For workbasket (use-case) requests, the response `headers[]` array always contains the configured columns from `WorkBasketResultFields` even when there are no matching cases — so ExUI can render the empty table with column headers. Each header carries `label`, `order`, `case_field_id`, `case_field_type` and `display_context_parameter`. Case metadata fields (`[CASE_REFERENCE]` and the rest) are returned in the `cases.fields` and `cases.fields_formatted` map for every request, but only appear in the `headers[]` array for the workbasket use case if explicitly listed in `WorkBasketResultFields`.

### UserProfile defaults

When a user logs in to ExUI for the first time, the jurisdiction, case type and state to display in the case list are taken from the `UserProfile` definition tab (entity: `WorkBasketUserDefault`, served by definition-store):

- `WorkBasketDefaultJurisdiction` — initial jurisdiction shown
- `WorkBasketDefaultCaseType` — initial case type shown
- `WorkBasketDefaultState` — initial state filter applied

For multi-jurisdictional users the defaults are taken from the most recently imported definition that includes a row for them. <!-- CONFLUENCE-ONLY: "most recently imported wins" rule documented in Confluence page 207804327 (`UserProfile` row); behaviour not directly verified in source. -->

## Common patterns

**Including the case reference column.** The first column is no longer implicitly Case Reference — every case-list display is now driven entirely by `WorkBasketResultFields`. To show the case ID, add a row with `CaseFieldID = [CASE_REFERENCE]` (typically `Label = "Case Number"`, `DisplayOrder = 1`). Services migrating from older configurations have to add this row explicitly.

**Role-restricted columns.** Set `AccessProfile` on a `WorkBasketResultFields` row to show a sensitive column (e.g. a solicitor reference) only to users who hold that profile. Definition-store serves all rows; data-store filters by the caller's access profiles at query time.

**Per-role column ordering or labels.** Add multiple rows for the same `CaseFieldID` with different `AccessProfile` values and different `Label`/`DisplayOrder` — each user only sees the row matching their role. Useful where caseworkers and judiciary need slightly different headers or column orders.

**Nested complex field access.** Use `CaseFieldElementPath` to surface a sub-field of a complex type as a filter or column — e.g. `applicant.firstName`. The ES path becomes `data.applicant.firstName`. The path is built by `GenericLayoutEntity.buildFieldPath()` (`GenericLayoutEntity.java:155–161`). Collection items can be referenced by index (`AliasNames(1).FirstName`).

**Default sort.** Set `SortOrderDirection=DESC` and `SortOrderPriority=1` on the date field (e.g. `lastModified`) in `WorkBasketResultFields` to get newest-first ordering by default. Multiple sort columns are supported via ascending priority integers.

**Conditional filter inputs.** Use `ShowCondition` on a `WorkBasketInputFields` row to hide an input until another input has a value — mirrors the same `showCondition` syntax used on event fields.

### config-generator (Java SDK) equivalents

Service teams using `libs/ccd-config-generator` configure the work basket fluently through `ConfigBuilder`:

```java
configBuilder.workBasketInputFields()
    .field(CaseData::getApplicantSurname, "Applicant surname");

configBuilder.workBasketResultFields()
    .caseReferenceField()                              // emits `[CASE_REFERENCE]` row
    .field(CaseData::getApplicationType, "Type")
    .field("state", "State");                          // string IDs work too
```

Helpers map directly onto the Excel columns: `field(getter, label)` produces `CaseFieldID` + `Label`; `caseReferenceField()` is shorthand for a `[CASE_REFERENCE]` column with label "Case Number" (`Search.java:37–40`). The optional `userRole`, `listElementCode`, `showCondition`, `displayContextParameter` and `order` properties on `SearchField` (`SearchField.java`) round-trip to the corresponding spreadsheet columns. The same `SearchBuilder` API is used for `searchInputFields()` and `searchResultFields()` — see [`search-configuration.md`](search-configuration.md).

## Work basket vs work allocation

The work basket is a **CCD concept** — it is a filtered, role-scoped view of case data held in the CCD Elasticsearch index.

Work allocation (the WA/Task Manager component) is a **separate system** that tracks tasks assigned to users and teams. It has its own data store and its own UI panels in ExUI. A caseworker may use the work basket to find a case, then see WA tasks associated with that case — but the two lists are populated from entirely different back-ends. Configuring `WorkBasketInputFields` and `WorkBasketResultFields` has no effect on WA task assignment or task list columns.

See [`work-allocation-integration.md`](work-allocation-integration.md) for the WA-specific configuration and how cases link to tasks.

## Example

### WorkBasketResultFields.json

```json
// apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/WorkBasketResultFields.json
[ {
  "LiveFrom" : "1/1/19",
  "CaseTypeID" : "BEFTA_CASETYPE_1_1",
  "CaseFieldID" : "TextField",
  "Label" : "`Text` field",
  "DisplayOrder" : 1
}, {
  "LiveFrom" : "1/1/19",
  "CaseTypeID" : "BEFTA_CASETYPE_1_1",
  "CaseFieldID" : "EmailField",
  "Label" : "`Email` field",
  "DisplayOrder" : 2
} ]
```

<!-- source: apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/WorkBasketResultFields.json:1-16 -->

## See also

- [`docs/ccd/explanation/search-configuration.md`](search-configuration.md) — `SearchInputFields`, `SearchResultFields`, and `SearchCasesResultFields`, which share the same `GenericLayoutEntity` base and the same `use_case` selection mechanism
- [`docs/ccd/explanation/work-allocation-integration.md`](work-allocation-integration.md) — work allocation (WA/Task Manager), a separate system from the work basket
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions of access profile, display context parameter, use case
