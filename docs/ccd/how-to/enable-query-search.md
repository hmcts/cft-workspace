---
topic: search
audience: both
sources:
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/ElasticDefinitionImportListener.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/mapping/CaseMappingGenerator.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/config/CcdElasticSearchProperties.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/SearchInputCaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/SearchResultCaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/GenericLayoutEntity.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/DisplayApiController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/std/CaseSearchEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/internal/controller/UICaseSearchController.java
  - ccd-data-store-api:src/main/resources/application.properties
status: reviewed
last_reviewed: "2026-04-29T00:00:00Z"
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/SearchInputFields.json
---

# Enable Query Search

## TL;DR

- Query search uses Elasticsearch. You must populate `SearchInputFields` (filter inputs) and `SearchResultFields` (result columns) sheets in the CCD definition spreadsheet.
- On definition import, `ccd-definition-store-api` seeds the ES index automatically via `ElasticDefinitionImportListener` — no manual index creation needed.
- The ES index name follows `casesIndexNameFormat` applied to the lowercase case-type ID (e.g. `myct_cases-000001`).
- `ccd-data-store-api` queries ES at `POST /searchCases?ctid=`; the `SearchInputFields` sheet controls what filter widgets appear in the UI, not what ES fields are queryable.
- Fields must be `searchable=true` (the default) on `CaseField` to be included in the ES mapping. Non-searchable fields are excluded at mapping time.

---

## Prerequisites

- Elasticsearch enabled: `ELASTIC_SEARCH_ENABLED=true` on `ccd-data-store-api` (`application.properties:209`).
- `ccd-definition-store-api` deployed with `elasticsearch.enabled=true` and either `failImportIfError=true` (synchronous, blocks import on ES failure) or `false` (asynchronous).
- Case fields you want to search must be of a type that maps to an ES type in `elasticsearch.typeMappings` config (e.g. `Text`, `Date`, `FixedList`).

---

## Steps

### 1. Mark fields as searchable

In the `CaseField` sheet, ensure the `Searchable` column is `true` (or blank — the default is `true`) for every field you intend to filter or display in results.

Fields with `Searchable=false` are omitted from the ES mapping by `CaseMappingGenerator` and cannot be queried.

### 2. Populate the SearchInputFields sheet

Add one row per filter widget you want to appear in the search form. The sheet maps to `search_input_case_field`.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | Must match your case type reference |
| `CaseFieldID` | Yes | Top-level field ID |
| `CaseFieldElementPath` | No | Dot-notation for nested complex fields, e.g. `applicant.firstName` |
| `Label` | No | Override label shown in UI |
| `DisplayOrder` | No | Integer; controls widget ordering |
| `AccessProfile` | No | Restricts visibility to a named access profile |
| `ShowCondition` | No | Conditional expression to show/hide the input |
| `DisplayContextParameter` | No | E.g. `#TABLE(...)` for collection display |

Example row (JSON-like for clarity):

```
CaseTypeID   : MyJurisdiction_MyCaseType
CaseFieldID  : applicantName
Label        : Applicant name
DisplayOrder : 10
```

### 3. Populate the SearchResultFields sheet

Add one row per column to display in the results table. The sheet maps to `search_result_case_field`.

All `SearchInputFields` columns apply, plus:

| Column | Notes |
|---|---|
| `SortOrderDirection` | `ASC` or `DESC` — makes the column sortable |
| `SortOrderPriority` | Integer; lower = higher sort priority when multiple columns sortable |

The `_keyword` alias for text fields is generated automatically by `CaseMappingGenerator.aliasMapping()` to enable sort on text columns — no extra configuration needed (`CaseMappingGenerator.java:118–131`).

### 4. Import the definition

Upload the updated spreadsheet to definition-store:

```
POST /import
Content-Type: multipart/form-data
```

On successful import, `ImportServiceImpl` publishes `DefinitionImportedEvent` (`ImportServiceImpl.java:300`). The active `ElasticDefinitionImportListener` handles it:

- If the alias does not yet exist, creates index `<name>-000001` and an alias pointing to it (`ElasticDefinitionImportListener.java:68–71`).
- Calls `CaseMappingGenerator.generateMapping()` which produces the ES mapping JSON covering `data.*` per-field properties, `data_classification`, and any `SearchAliasField` alias entries.
- Calls `HighLevelCCDElasticClient.upsertMapping()` to merge the mapping into the live index (normal path, `reindex=false`).

To force a full reindex (e.g. after changing a field type), pass `?reindex=true&deleteOldIndex=true` on the import POST. This creates a new incremented index, backfills data, then atomically flips the alias (`ElasticDefinitionImportListener.java:73–143`).

### 5. Configure data-store endpoints (if calling directly)

| Use case | Endpoint |
|---|---|
| External / service-to-service ES query | `POST /searchCases?ctid=<caseTypeId>` — body is native ES JSON |
| UI workbasket / search panel | `POST /internal/searchCases?ctid=<caseTypeId>&use_case=SEARCH` |
| Fetch filter widget config | `GET /api/display/search-input-definition/<caseTypeId>` (served by definition-store) |
| Fetch result column config | `GET /api/display/search-result-definition/<caseTypeId>` (served by definition-store) |

Pass `ctid=*` to `POST /searchCases` to search across all case types the caller can access (`CaseSearchEndpoint.java:101–106`).

---

## How the ES index is named

The index name is derived by `ElasticDefinitionImportListener`:

```
String.format(config.getCasesIndexNameFormat(), caseTypeId.toLowerCase())
```

The first index gets suffix `-000001`. On reindex, the suffix increments by parsing the trailing zero-padded number (`ElasticDefinitionImportListener.java:146–163`). The alias (without suffix) is what data-store queries.

---

## Nested / complex fields

To search or display a sub-field of a complex type, set `CaseFieldElementPath` to the dot-notation path (e.g. `applicant.address.postCode`). The ES query path becomes `data.applicant.address.postCode`. `GenericLayoutEntity.buildFieldPath()` handles this reconstruction (`GenericLayoutEntity.java:155–161`).

All intermediate fields in the path must also be `searchable=true` for the path to be indexed.

---

## Verify

1. After import, check the alias exists in Elasticsearch:
   ```
   GET <es-host>/_cat/aliases/<caseTypeId>_cases?v
   ```
   You should see the alias pointing to `<caseTypeId>_cases-000001` (or the latest increment).

2. Run a search via data-store and confirm results are returned:
   ```
   POST /searchCases?ctid=<caseTypeId>
   Content-Type: application/json
   Authorization: Bearer <token>
   ServiceAuthorization: <s2s-token>

   { "query": { "match_all": {} }, "size": 1 }
   ```
   A `200` response with `cases` array confirms ES search is active for the case type.

---

## Example

### SearchInputFields.json

```json
// apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/SearchInputFields.json
[ {
  "LiveFrom" : "01/01/2019",
  "CaseTypeID" : "BEFTA_CASETYPE_1_1",
  "CaseFieldID" : "TextField",
  "Label" : "Search `Text` field",
  "DisplayOrder" : 1
} ]
```

<!-- source: apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/SearchInputFields.json:1-8 -->

## See also

- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions for SearchInputFields, SearchResultFields, access profiles
