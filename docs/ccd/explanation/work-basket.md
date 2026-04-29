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
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/ui/QueryEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/internal/controller/UICaseSearchController.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/WorkBasketResultFields.json
---

# Work Basket

## TL;DR

- The work basket is the queue-style case list in ExUI where caseworkers filter and view cases assigned to their team or role.
- Two definition sheets control it: `WorkBasketInputFields` (the filter form) and `WorkBasketResultFields` (the result columns).
- Both are served by `ccd-definition-store-api` via `GET /api/display/work-basket-input-definition/{id}` and `GET /api/display/work-basket-definition/{id}`.
- ExUI calls the internal `POST /internal/searchCases?ctid=&use_case=WORKBASKET` endpoint on `ccd-data-store-api` to execute the filtered query against Elasticsearch.
- Work basket is distinct from work allocation — work allocation (Task Manager/WA) is a separate system that assigns tasks; the work basket only shows cases.

## Definition sheets

### WorkBasketInputFields

Each row defines one filter input rendered above the case list.

| Column | Description |
|---|---|
| `CaseTypeID` | Case type this row belongs to |
| `CaseFieldID` | Field to filter on |
| `CaseFieldElementPath` | Dot-notation path into a complex field (e.g. `applicant.lastName`); null for top-level fields |
| `Label` | Display label for the input control |
| `DisplayOrder` | Left-to-right ordering of inputs |
| `AccessProfile` | If set, only users with this access profile see this input |
| `DisplayContextParameter` | Format hints (e.g. `#TABLE(...)`, `#DATETIMEDISPLAY(...)`) |
| `ShowCondition` | Conditional display expression — input hidden unless condition is met |

Stored in DB table `workbasket_input_case_field`. Entity: `WorkBasketInputCaseFieldEntity`, which extends `InputCaseFieldEntity` (adds `show_condition`) and `GenericLayoutEntity` (base columns). Sheet name must be exactly `"WorkBasketInputFields"` (`SheetName.java`).

Served as `WorkbasketInputDefinition{caseTypeId, fields[]}` from `DisplayApiController.java:107–117`.

### WorkBasketResultFields

Each row defines one column in the result table.

| Column | Description |
|---|---|
| `CaseTypeID` | Case type this row belongs to |
| `CaseFieldID` | Field value to display in the column |
| `CaseFieldElementPath` | Dot-notation path for nested complex fields |
| `Label` | Column header |
| `DisplayOrder` | Left-to-right column ordering |
| `AccessProfile` | Role-restricted column — hidden for users without this profile |
| `DisplayContextParameter` | Rendering hints |
| `SortOrderDirection` | `ASC` or `DESC` — default sort direction for this column |
| `SortOrderPriority` | Integer — lower number = higher priority when sorting by multiple columns |

Stored in `workbasket_case_field`. Entity: `WorkBasketCaseFieldEntity`, extending `GenericLayoutEntity`. Sort order columns (`sort_order_direction`, `sort_order_priority`) are embedded inline, not a separate table (`SortOrder.java:9–12`). Sheet name: `"WorkBasketResultFields"`.

Served as `WorkBasketResult` from `DisplayApiController.java:119–129`.

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

The `use_case=WORKBASKET` parameter on `/internal/searchCases` is what causes `UICaseSearchController` to use the work-basket result field list rather than the standard search result list (`UICaseSearchController.java:149–155`).

The legacy DB-backed endpoint `GET /caseworkers/{uid}/jurisdictions/{jid}/case-types/{ctid}/cases` (served by `QueryEndpoint.java:156`) predates Elasticsearch and is still active when ES is disabled (`ELASTIC_SEARCH_ENABLED=false`). The companion endpoint `GET /caseworkers/{uid}/jurisdictions/{jid}/case-types/{ctid}/work-basket-inputs` (`QueryEndpoint.java:205`) returns the filter field configuration regardless of whether ES is enabled.

## Common patterns

**Role-restricted columns.** Set `AccessProfile` on a `WorkBasketResultFields` row to show a sensitive column (e.g. a solicitor reference) only to users who hold that profile. Definition-store serves all rows; data-store filters by the caller's access profiles at query time.

**Nested complex field access.** Use `CaseFieldElementPath` to surface a sub-field of a complex type as a filter or column — e.g. `applicant.firstName`. The ES path becomes `data.applicant.firstName`. The path is built by `GenericLayoutEntity.buildFieldPath()` (`GenericLayoutEntity.java:155–161`).

**Default sort.** Set `SortOrderDirection=DESC` and `SortOrderPriority=1` on the date field (e.g. `lastModified`) in `WorkBasketResultFields` to get newest-first ordering by default. Multiple sort columns are supported via ascending priority integers.

**Conditional filter inputs.** Use `ShowCondition` on a `WorkBasketInputFields` row to hide an input until another input has a value — mirrors the same `showCondition` syntax used on event fields.

## Work basket vs work allocation

The work basket is a **CCD concept** — it is a filtered, role-scoped view of case data held in the CCD Elasticsearch index.

Work allocation (the WA/Task Manager component) is a **separate system** that tracks tasks assigned to users and teams. It has its own data store and its own UI panels in ExUI. A caseworker may use the work basket to find a case, then see WA tasks associated with that case — but the two lists are populated from entirely different back-ends. Configuring `WorkBasketInputFields` and `WorkBasketResultFields` has no effect on WA task assignment or task list columns.

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

- [`docs/ccd/explanation/search-configuration.md`](search-configuration.md) — SearchInputFields and SearchResultFields, which share the same `GenericLayoutEntity` base
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions of access profile, display context parameter, use case
