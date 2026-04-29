---
topic: work-basket
audience: both
sources:
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/WorkBasketInputCaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/WorkBasketCaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/GenericLayoutEntity.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/DisplayApiController.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/model/SearchInputField.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/model/SearchResultsField.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
status: reviewed
last_reviewed: "2026-04-29T00:00:00Z"
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/WorkBasketInputFields.json
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/WorkBasketResultFields.json
---

# Enable Work Basket

## TL;DR

- A work basket gives caseworkers a filterable queue of cases; it requires two sheets in the definition: **WorkBasketInputFields** (filter controls) and **WorkBasketResultFields** (result columns).
- Both sheets share the same base columns: `CaseTypeID`, `CaseFieldID`, `Label`, `DisplayOrder`, `AccessProfile`, `DisplayContextParameter`, and optionally `CaseFieldElementPath` for nested complex fields.
- Result rows additionally accept `SortOrder` columns (`SortOrderDirection`, `SortOrderPriority`) to set default column sort.
- Input rows additionally accept a `ShowCondition` to conditionally hide a filter control.
- Definition-store exposes the configured fields at `GET /api/display/work-basket-input-definition/{caseTypeId}` and `GET /api/display/work-basket-definition/{caseTypeId}`.
- Using `ccd-config-generator`, call `configBuilder.workBasketResultFields()` and `configBuilder.workBasketInputFields()` instead of editing the spreadsheet directly.

## Prerequisites

- The case type must already exist with at least one `CaseField` defined.
- Every field referenced must have a `CaseFieldEntity.searchable = true` (the default); non-searchable fields are excluded from the ES index and cannot be filtered.
- The access profiles that will use the work basket must already be defined in `AuthorisationCaseType` with at minimum `R` (read) permission on the case type.

## Steps

### Option A — Excel definition spreadsheet

1. Open your definition spreadsheet. Confirm it contains a tab named exactly `WorkBasketInputFields` and a tab named exactly `WorkBasketResultFields`. Tab names are case-sensitive; a mismatch causes a `MapperException` at import (`SheetName.java:6–37`).

2. Populate **WorkBasketInputFields**. Each row is one filter control:

   | Column | Required | Notes |
   |---|---|---|
   | `CaseTypeID` | Yes | Must match the `CaseType.ID` value |
   | `CaseFieldID` | Yes | Must match a `CaseField.ID` value |
   | `Label` | No | Display label for the filter input; falls back to the field label |
   | `DisplayOrder` | No | Integer; controls left-to-right order of filter inputs |
   | `AccessProfile` | No | Restricts this input to a specific access profile |
   | `ShowCondition` | No | CCD show-condition expression; hides the control when false |
   | `CaseFieldElementPath` | No | Dot-notation path into a complex field, e.g. `applicant.firstName` |
   | `DisplayContextParameter` | No | `#TABLE(...)` or `#DATETIMEDISPLAY(...)` format hints |

   Example rows (two filter inputs — case reference and applicant name):

   ```
   CaseTypeID         CaseFieldID          Label              DisplayOrder
   MyJurisdiction_MyCase   [CaseReference]      Case number        1
   MyJurisdiction_MyCase   applicantLastName    Applicant surname  2
   ```

   `[CaseReference]` is a metadata field and does not need a `CaseFieldElementPath`.

3. Populate **WorkBasketResultFields**. Each row is one result column:

   | Column | Required | Notes |
   |---|---|---|
   | `CaseTypeID` | Yes | |
   | `CaseFieldID` | Yes | |
   | `Label` | No | Column header |
   | `DisplayOrder` | No | Integer; left-to-right column order |
   | `AccessProfile` | No | Restricts column visibility |
   | `SortOrderDirection` | No | `ASC` or `DESC`; sets default sort direction |
   | `SortOrderPriority` | No | Integer; lower number = higher sort priority when multiple columns sorted |
   | `CaseFieldElementPath` | No | Dot-notation for nested complex fields |
   | `DisplayContextParameter` | No | Format hints |

   `SortOrder` values are stored as `sort_order_direction` / `sort_order_priority` in the `workbasket_case_field` table (`SortOrder.java:9–12`).

4. Import the definition via `POST /import` (multipart/form-data). The work-basket sheets are parsed in the UI-layouts phase of the import pipeline (`ImportServiceImpl.java:192–346`, step 5).

### Option B — ccd-config-generator SDK

1. In your `CCDConfig.configure()` implementation, call the work-basket builders on `ConfigBuilder`:

   ```java
   @Override
   public void configure(ConfigBuilder<CaseData, State, UserRole> builder) {

       builder.workBasketResultFields()
           .field(CaseData::getCaseReference, "[CASE_REFERENCE]", "Case number")
           .field(CaseData::getApplicantLastName, "Applicant surname")
           .fieldWithDisplayOrder(CaseData::getCreatedDate, "Created", 3);

       builder.workBasketInputFields()
           .field(CaseData::getCaseReference, "[CASE_REFERENCE]", "Case number")
           .field(CaseData::getApplicantLastName, "Applicant surname");
   }
   ```

   `workBasketResultFields()` and `workBasketInputFields()` both return a `SearchBuilder` — the same builder type used for `searchResultFields()` and `searchInputFields()` (`ConfigBuilder.java:43–49`).

2. Run the definition generator to produce the updated spreadsheet or JSON files, then import as normal.

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

Both endpoints are served by `DisplayApiController.java:107–129`. A successful response returns a JSON object with a `fields` array; each entry contains `case_field_id`, `label`, `order`, and (for result fields) `sort_order`.

In ExUI, navigate to the work basket list for the case type — the configured filter inputs should appear in the filter panel, and the result columns should appear as table headers.

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

## See also

- [`docs/ccd/reference/definition-sheets.md`](../reference/definition-sheets.md) — full column reference for all definition sheets
- [`docs/ccd/explanation/search-and-workbasket.md`](../explanation/search-and-workbasket.md) — how the work basket relates to search input/result configuration

## Glossary

| Term | Meaning |
|---|---|
| `WorkBasketInputFields` | Definition sheet that configures the filter controls shown above the work-basket case list |
| `WorkBasketResultFields` | Definition sheet that configures the columns shown in the work-basket case list |
| `CaseFieldElementPath` | Dot-notation path to a sub-field inside a complex type, e.g. `applicant.address.postCode` |
| `SortOrder` | Embedded columns (`SortOrderDirection`, `SortOrderPriority`) on result sheets that set the default column sort |
| `DisplayContextParameter` | Format hint string such as `#TABLE(...)` or `#DATETIMEDISPLAY(...)` applied to a layout field |
