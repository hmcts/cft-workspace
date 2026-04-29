---
topic: work-basket
audience: both
sources:
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/WorkBasketInputCaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/WorkBasketCaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/GenericLayoutEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/SortOrder.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/GenericLayoutParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/WorkbasketLayoutParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/WorkbasketInputLayoutParser.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/DisplayApiController.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/model/SearchInputField.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/model/SearchResultsField.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Search.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/SearchField.java
status: confluence-augmented
last_reviewed: "2026-04-29T00:00:00Z"
confluence_checked_at: "2026-04-29T00:00:00Z"
confluence:
  - id: "1126761193"
    title: "Configuring Workbasket & Search Default Ordering"
    last_modified: "2019-08"
    space: "RCCD"
  - id: "207804327"
    title: "CCD Definition Glossary for Setting up a Service in CCD"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1057948326"
    title: "Per-role CaseTabs, Workbasket and Search"
    last_modified: "2021-03"
    space: "RCCD"
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/WorkBasketInputFields.json
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/WorkBasketResultFields.json
---

# Enable Work Basket

## TL;DR

- A work basket gives caseworkers a filterable queue of cases; it requires two sheets in the definition: **WorkBasketInputFields** (filter controls) and **WorkBasketResultFields** (result columns).
- Both sheets share the same base columns: `LiveFrom`, `LiveTo`, `CaseTypeID`, `CaseFieldID`, `Label`, `DisplayOrder`, `AccessProfile` (legacy alias `UserRole`), `DisplayContextParameter`, and optionally `ListElementCode` (also exposed as `CaseFieldElementPath`) for nested complex fields.
- **WorkBasketResultFields** additionally accepts a single `ResultsOrdering` column with values like `1:ASC` or `2:DESC` to set up to two default sort columns. **WorkBasketInputFields does not** — supplying `ResultsOrdering` there causes a `MapperException` at import.
- **WorkBasketInputFields** additionally accepts a `FieldShowCondition` to conditionally hide a filter control. **WorkBasketResultFields does not** — supplying `FieldShowCondition` there causes a `MapperException`.
- Definition-store exposes the configured fields at `GET /api/display/work-basket-input-definition/{caseTypeId}` and `GET /api/display/work-basket-definition/{caseTypeId}`.
- Using `ccd-config-generator`, call `configBuilder.workBasketResultFields()` and `configBuilder.workBasketInputFields()` instead of editing the spreadsheet directly. The Java SDK does not currently expose default-ordering or per-role configuration via fluent methods (those still need the `ResultsOrdering` / `AccessProfile` columns set in the generated JSON).

## Prerequisites

- The case type must already exist with at least one `CaseField` defined.
- Every field referenced must have `Searchable = Yes` (the default `true`); non-searchable fields are excluded from the Elasticsearch index and cannot be filtered.
- The access profiles that will use the work basket must already be defined in `AuthorisationCaseType` with at minimum `R` (read) permission on the case type.

## Steps

### Option A — Excel definition spreadsheet

1. Open your definition spreadsheet. Confirm it contains a tab named exactly `WorkBasketInputFields` and a tab named exactly `WorkBasketResultFields`. Tab names are case-sensitive; a mismatch causes a `MapperException` at import (`SheetName.java:16-17`).

2. Populate **WorkBasketInputFields**. Each row is one filter control:

   | Column | Required | Notes |
   |---|---|---|
   | `LiveFrom` | No | Start date from which this row is valid; checked for a valid date value |
   | `LiveTo` | No | End date until which this row is valid; **not currently validated** |
   | `CaseTypeID` | Yes | Must match the `CaseType.ID` value (max length 70) |
   | `CaseFieldID` | Yes | Must match a `CaseField.ID` value, or be a metadata reference like `[CASE_REFERENCE]` (max length 70) |
   | `Label` | No | Display label for the filter input (max length 30); falls back to the field label |
   | `DisplayOrder` | No | Integer; controls left-to-right order of filter inputs |
   | `AccessProfile` | No | Restricts this input to a specific access profile. Legacy alias `UserRole` is still accepted (`ColumnName.java:9`). Blank = visible to all roles |
   | `FieldShowCondition` | No | CCD show-condition expression; hides the control when false |
   | `ListElementCode` | No | Dot-notation path into a complex field, e.g. `applicant.firstName` (max length 70) — the column is exposed in some templates as `CaseFieldElementPath` but stored as `list_element_code` |
   | `DisplayContextParameter` | No | `#TABLE(...)` or `#DATETIMEDISPLAY(...)` format hints |

   <!-- DIVERGENCE: Confluence page 207804327 (CCD Definition Glossary) does not list FieldShowCondition on the WorkBasketInputFields table, but apps/ccd/ccd-definition-store-api/excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/WorkbasketInputLayoutParser.java:58-61 explicitly populates it. Source wins. -->

   Example rows (two filter inputs — case reference and applicant name):

   ```
   CaseTypeID              CaseFieldID          Label              DisplayOrder
   MyJurisdiction_MyCase   [CASE_REFERENCE]     Case number        1
   MyJurisdiction_MyCase   applicantLastName    Applicant surname  2
   ```

   `[CASE_REFERENCE]` is a metadata field and does not need a `ListElementCode`. See [`docs/ccd/explanation/work-basket.md`](../explanation/work-basket.md) for the full list of metadata identifiers.

3. Populate **WorkBasketResultFields**. Each row is one result column:

   | Column | Required | Notes |
   |---|---|---|
   | `LiveFrom` | No | Start date from which this row is valid |
   | `LiveTo` | No | End date until which this row is valid |
   | `CaseTypeID` | Yes | (max length 70) |
   | `CaseFieldID` | Yes | (max length 70) |
   | `Label` | No | Column header (max length 200) |
   | `DisplayOrder` | No | Integer; left-to-right column order |
   | `AccessProfile` | No | Restricts column visibility (legacy alias `UserRole`) |
   | `ResultsOrdering` | No | Default sort. Format: `<priority>:<direction>` where priority is `1` or `2` and direction is `ASC` or `DESC` (e.g. `1:ASC`, `2:DESC`). Pattern is **case-sensitive**: `^(1\|2):(ASC\|DESC)$` (`GenericLayoutParser.java:41`). Up to two ordering columns total per role; if blank for all rows, the fallback is **Created date, oldest first** |
   | `ListElementCode` | No | Dot-notation for nested complex fields (max length 70) |
   | `DisplayContextParameter` | No | Format hints |

   <!-- DIVERGENCE: The previous draft documented separate `SortOrderDirection` and `SortOrderPriority` columns. apps/ccd/ccd-definition-store-api/excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java:81 defines the column as `ResultsOrdering`, parsed by GenericLayoutParser.java:240 with regex `^(1|2):(ASC|DESC)$`. The split fields only exist on the database side as embedded SortOrder columns sort_order_direction / sort_order_priority. Source wins. -->

   <!-- DIVERGENCE: Confluence page 207804327 (CCD Definition Glossary) does not list ResultsOrdering on the WorkBasketResultFields table; only the dedicated Confluence page 1126761193 ("Configuring Workbasket & Search Default Ordering") documents it. Source confirms ResultsOrdering is supported here. Source wins. -->

   `ResultsOrdering` is decomposed at parse time into a `SortOrder` embeddable and stored as `sort_order_direction` / `sort_order_priority` in the `workbasket_case_field` table (`SortOrder.java:7-13`).

   Validation rules applied at import (all in `GenericLayoutParser.validateSortOrders`):

   - Pattern is case-sensitive — `1:asc`, `1:Asc`, etc. are rejected.
   - Priority must be exactly `1` or `2`. There is no `3:ASC` etc.
   - Within a single `AccessProfile` group on the same sheet, two rows cannot share the same priority (e.g. two `1:ASC` rows for the same role).
   - There must be no gap in priorities — supplying `2:DESC` without a corresponding `1:...` row in the same role group is rejected.

4. Import the definition via `POST /import` (multipart/form-data). The work-basket sheets are parsed in the UI-layouts phase of the import pipeline.

### Option B — ccd-config-generator SDK

1. In your `CCDConfig.configure()` implementation, call the work-basket builders on `ConfigBuilder`:

   ```java
   @Override
   public void configure(ConfigBuilder<CaseData, State, UserRole> builder) {

       builder.workBasketResultFields()
           .caseReferenceField()
           .field(CaseData::getApplicantLastName, "Applicant surname");

       builder.workBasketInputFields()
           .caseReferenceField()
           .field(CaseData::getApplicantLastName, "Applicant surname");
   }
   ```

   <!-- DIVERGENCE: The previous draft showed a 3-arg `.field(getter, "[CASE_REFERENCE]", "label")` form and a `fieldWithDisplayOrder()` method. libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Search.java:26-40 only exposes `.field(getter, label)`, `.field(fieldName, label)`, and `.caseReferenceField()`. There is no `fieldWithDisplayOrder` method. Display order is implicit in declaration order. Source wins. -->

   Available `SearchBuilder` methods (`Search.java:26-40`):
   - `.field(TypedPropertyGetter<T,?> getter, String label)` — most common form, types the field by getter reference.
   - `.field(String fieldName, String label)` — when the field is referenced by raw ID (e.g. a metadata field or a string-only ID).
   - `.caseReferenceField()` — convenience that adds `[CASE_REFERENCE]` with label `"Case Number"`.

   `workBasketResultFields()` and `workBasketInputFields()` both return a `Search.SearchBuilder` — the same builder type used for `searchResultFields()` and `searchInputFields()` (`ConfigBuilder.java:43-49`).

2. Run the definition generator (`./gradlew generateCCDConfig` / `gCC`) to produce the updated JSON files, then import as normal.

   <!-- CONFLUENCE-ONLY: The SDK currently does not expose fluent builders for ResultsOrdering, AccessProfile-keyed per-role overrides, FieldShowCondition, or DisplayContextParameter on workbasket fields. Services that need those features today either post-process the generated JSON or fall back to editing the spreadsheet directly. Not verified as a permanent gap — this may close in a future SDK release. -->

### Per-role configuration

Both sheets support per-role configuration by repeating the same `CaseFieldID` with different `AccessProfile` values:

```
CaseTypeID              CaseFieldID          Label                AccessProfile             DisplayOrder
MyJurisdiction_MyCase   applicantLastName    Applicant surname    caseworker-caa            1
MyJurisdiction_MyCase   applicantLastName    Surname              caseworker-judiciary      1
```

- A row with blank `AccessProfile` is visible to **all** roles. Per-role rows are *additive* on top of any role-blank rows.
- Different roles can see different `Label` values for the same `CaseFieldID`.
- Different roles can have different `DisplayOrder` for the same `CaseFieldID`, achieving role-specific column ordering.
- For `ResultsOrdering` specifically, a global (blank-role) row can supply the `1:` priority while role-specific rows supply `2:` — but you cannot have two `1:...` rows that both apply to the same role.

See [`docs/ccd/explanation/work-basket.md`](../explanation/work-basket.md) for the per-role semantics in more depth.

## Verify

After importing, confirm the work-basket is configured by calling the definition-store display endpoints directly:

```bash
# Work-basket filter inputs
curl -s -H "Authorization: Bearer $S2S_TOKEN" \
  "https://<definition-store-host>/api/display/work-basket-input-definition/MyJurisdiction_MyCase" \
  | jq '.fields[].case_field_id'

# Work-basket result columns
curl -s -H "Authorization: Bearer $S2S_TOKEN" \
  "https://<definition-store-host>/api/display/work-basket-definition/MyJurisdiction_MyCase" \
  | jq '.fields[].case_field_id'
```

Both endpoints are served by `DisplayApiController`. A successful response returns a JSON object with a `fields` array; each entry contains `case_field_id`, `label`, `order`, and (for result fields) `sort_order` (with sub-properties `priority` and `direction`).

In ExUI, navigate to the work basket list for the case type — the configured filter inputs should appear in the filter panel, and the result columns should appear as table headers, sorted by your `ResultsOrdering` configuration if any.

## Example

### WorkBasketInputFields.json

```json
// apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/WorkBasketInputFields.json
[ {
  "LiveFrom" : "01/01/2019",
  "CaseTypeID" : "BEFTA_CASETYPE_1_1",
  "CaseFieldID" : "TextField",
  "Label" : "Search `Text` field",
  "DisplayOrder" : 1
} ]
```

<!-- source: apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/WorkBasketInputFields.json:1-8 -->

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

### WorkBasketResultFields.json with default ordering

```json
[ {
  "LiveFrom" : "01/01/2024",
  "CaseTypeID" : "MyJurisdiction_MyCase",
  "CaseFieldID" : "[CASE_REFERENCE]",
  "Label" : "Case number",
  "DisplayOrder" : 1
}, {
  "LiveFrom" : "01/01/2024",
  "CaseTypeID" : "MyJurisdiction_MyCase",
  "CaseFieldID" : "createdDate",
  "Label" : "Created",
  "DisplayOrder" : 2,
  "ResultsOrdering" : "1:DESC"
}, {
  "LiveFrom" : "01/01/2024",
  "CaseTypeID" : "MyJurisdiction_MyCase",
  "CaseFieldID" : "applicantLastName",
  "Label" : "Applicant surname",
  "DisplayOrder" : 3,
  "ResultsOrdering" : "2:ASC"
} ]
```

This sorts the work basket primarily by `createdDate` (newest first), then alphabetically by `applicantLastName`.

## See also

- [`docs/ccd/reference/definition-sheets.md`](../reference/definition-sheets.md) — full column reference for all definition sheets
- [`docs/ccd/explanation/work-basket.md`](../explanation/work-basket.md) — how the work basket relates to search input/result configuration, per-role behaviour, and metadata field references
- [`docs/ccd/explanation/search-and-workbasket.md`](../explanation/search-and-workbasket.md) — relationship between work basket and the legacy/new search endpoints

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

