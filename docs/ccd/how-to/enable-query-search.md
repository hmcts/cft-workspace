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
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/SearchInputLayoutParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/SearchResultLayoutParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/GenericLayoutParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/std/CaseSearchEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/internal/controller/UICaseSearchController.java
  - ccd-data-store-api:src/main/resources/application.properties
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/SearchFieldAndResultGenerator.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/SortOrder.java
status: confluence-augmented
last_reviewed: "2026-04-29T00:00:00Z"
confluence_checked_at: "2026-04-29T00:00:00Z"
confluence:
  - id: "843514186"
    title: "CCD ElasticSearch and new search API Design LLD"
    space: "RCCD"
    last_modified: "unknown (version 249)"
  - id: "1392411337"
    title: "Internal Search API LLD"
    space: "RCCD"
    last_modified: "unknown (version 95)"
  - id: "1945639463"
    title: "Elasticsearch and CCD"
    space: "RCCD"
    last_modified: "unknown (version 1)"
  - id: "207804327"
    title: "CCD Definition Glossary for Setting up a Service in CCD"
    space: "RCCD"
    last_modified: "unknown (version 154)"
  - id: "930743291"
    title: "ElasticSearch import error on change of CCD definition field type"
    space: "RCCD"
    last_modified: "unknown (version 31)"
  - id: "205750327"
    title: "CCD - Import Domain - Validation Rules"
    space: "RCCD"
    last_modified: "unknown (version 28)"
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_BEFTA_JURISDICTION1/BEFTA_CASETYPE_1_1/SearchInputFields.json
---

# Enable Query Search

## TL;DR

- Query search uses Elasticsearch. You must populate `SearchInputFields` (filter inputs) and `SearchResultFields` (result columns) sheets in the CCD definition spreadsheet.
- On definition import, `ccd-definition-store-api` seeds the ES index automatically via `ElasticDefinitionImportListener` — no manual index creation needed. Logstash separately tails the data-store DB and pushes case documents into ES.
- The ES index name follows `casesIndexNameFormat` applied to the lowercase case-type ID (e.g. `myct_cases-000001`).
- `ccd-data-store-api` queries ES at `POST /searchCases?ctid=`; the `SearchInputFields` sheet controls what filter widgets appear in the UI, not what ES fields are queryable.
- Fields must be `Searchable=true` (the default) on `CaseField` to be included in the ES mapping. Non-searchable fields are excluded at mapping time.
- Cross-case-type search via `ctid=A,B` or `ctid=*` requires aliases (`SearchAlias` sheet) to return any case-data fields — otherwise only metadata comes back.

---

## Prerequisites

- Elasticsearch enabled: `ELASTIC_SEARCH_ENABLED=true` on `ccd-data-store-api` (`application.properties:209`).
- `ccd-definition-store-api` deployed with `elasticsearch.enabled=true` and either `failImportIfError=true` (synchronous, blocks import on ES failure) or `false` (asynchronous).
- Case fields you want to search must be of a type that maps to an ES type in `elasticsearch.typeMappings` config (e.g. `Text`, `Date`, `FixedList`).
- A working Logstash deployment for the jurisdiction. Logstash polls the `case_data` table on a configurable interval (1s in production) for rows where `marked_by_logstash=false`, indexes them, and marks the flag true. The `marked_by_logstash` column is reset to `false` by a `BEFORE INSERT OR UPDATE` database trigger (`trg_case_data_updated`) whenever changeable case fields are modified -- covering both API and manual DB changes. <!-- CONFLUENCE-ONLY: Logstash config lives in cnp-flux-config, outside this workspace. The trigger detail is from the ES LLD and DB schema. -->

---

## Steps

### 1. Mark fields as searchable

In the `CaseField` sheet, ensure the `Searchable` column is `true` (or blank — the default is `true`) for every field you intend to filter or display in results.

Fields with `Searchable=false` are omitted from the ES mapping by `CaseMappingGenerator` and cannot be queried. The mapping for a non-searchable field is generated with [`enabled: false`](https://www.elastic.co/guide/en/elasticsearch/reference/current/enabled.html), which tells ES not to index or store it.

Marking high-volume / unused fields non-searchable is a deliberate optimisation: ES has a hard ceiling on the number of fields per index, and large definitions (especially with many complex fields) can otherwise blow past it. <!-- CONFLUENCE-ONLY: an example cited in the LLD reduced a definition from ~6000 fields to ~300 by marking everything not in *InputFields tabs as non-searchable. -->

> **Caution.** Switching a field between `Searchable=true` and `Searchable=false` after the index exists requires deleting the index, re-importing, and reindexing. The mapping shapes are incompatible. <!-- CONFLUENCE-ONLY: described in the ES LLD but not enforced by source — the import will simply fail to merge mappings -->

### 2. Populate the SearchInputFields sheet

Add one row per filter widget you want to appear in the search form. The sheet maps to `search_input_case_field` and is parsed by `SearchInputLayoutParser`.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | Must match your case type reference. Max length 70. |
| `CaseFieldID` | Yes | Top-level case field ID. Max length 70. **Metadata fields are not supported here** — see `ColumnName.java:177-182`. |
| `ListElementCode` | No | Dot-notation for nested complex / collection sub-fields, e.g. `applicant.firstName`. Max length 70. |
| `Label` | No | Override label shown in UI. Max length 200. |
| `DisplayOrder` | No | Integer; controls widget ordering. |
| `AccessProfile` | No | Restricts visibility to a named access profile. Older spreadsheets and the SDK use the alias `UserRole` — both are accepted (`ColumnName.java:9`). |
| `FieldShowCondition` | No | Conditional expression to show/hide the input. Parsed by `ShowConditionParser`. Not allowed on `SearchResultFields` — only on `SearchInputFields` (`SearchInputLayoutParser.java:56-59`, `SearchResultLayoutParser.java:56-59`). |
| `DisplayContextParameter` | No | E.g. `#TABLE(...)` for collection display, or date format. |
| `LiveFrom` / `LiveTo` | No | Effective-date window. `LiveFrom` is validated as a date; `LiveTo` is currently not validated. <!-- CONFLUENCE-ONLY: behavioural detail from the definition glossary -->|

> Each `(CaseTypeID, CaseFieldID, ListElementCode, AccessProfile)` tuple must be unique. Duplicate rows fail the import (`GenericLayoutParser.java:188-198`).

Example row (JSON-like for clarity):

```
CaseTypeID   : MyJurisdiction_MyCaseType
CaseFieldID  : applicantName
Label        : Applicant name
DisplayOrder : 10
```

### 3. Populate the SearchResultFields sheet

Add one row per column to display in the results table. The sheet maps to `search_result_case_field`. All `SearchInputFields` columns apply except `FieldShowCondition` (rejected at parse time), plus:

| Column | Notes |
|---|---|
| `ResultsOrdering` | **Single combined column**, format `<priority>:<direction>` — e.g. `1:ASC`, `2:DESC`. Validated against regex `^(1\|2):(ASC\|DESC)$` so only priorities 1 and 2 are accepted (`GenericLayoutParser.java:41`). Duplicate priorities or gaps in the priority sequence fail the import (`GenericLayoutParser.java:297-311`). Note: `ccd-config-generator` SDK exposes `SortOrder.FIRST` through `SortOrder.FIFTH` (`SortOrder.java`) but the definition-store importer will reject priorities 3-5 at parse time. <!-- DIVERGENCE: the previous draft listed two separate columns `SortOrderDirection` and `SortOrderPriority`. Source has one column `ResultsOrdering` carrying both; `SortOrderDirection`/`SortOrderPriority` are entity / DTO field names, not spreadsheet column names. Source wins. --> <!-- DIVERGENCE: ccd-config-generator SDK supports priorities 1-5 (SortOrder.java:7-11), but GenericLayoutParser.java:41 regex enforces only 1-2. Definition-store source wins. --> |

`SearchResultFields` cannot reference metadata fields **or** elements of compound types directly via `CaseFieldID` — for those, either alias the field or use `SearchCasesResultFields`. <!-- CONFLUENCE-ONLY: stated in the definition glossary; source enforces required `CaseFieldID` but the metadata/compound restriction is the importer's higher-level validation that is not obvious from the column-name table. -->

The `_keyword` alias for text fields is generated automatically by `CaseMappingGenerator.aliasMapping()` to enable sort on text columns — no extra configuration needed (`CaseMappingGenerator.java:118–131`). To sort on a text field's keyword variant, use `<fieldName>_keyword` (or `alias.<aliasName>_keyword` for SearchAlias entries) in the ES request body's `sort` clause.

### 4. (Optional) Configure cross-case-type search via SearchAlias

If you need to search across multiple case types in a single query (`ctid=A,B` or `ctid=*`), populate the `SearchAlias` sheet so each case type maps its native field IDs to a shared alias. Without aliases, cross-case-type searches return only metadata (`id`, `jurisdiction`, `state`, `case_type_id`, `created_date`, etc.) — `case_data` will be empty.

Restrictions on aliases:

- Alias IDs are case sensitive and must be unique within a case type.
- An alias must point at a **concrete** field (not an object or another alias).
- Once an alias is mapped to a field type in one case type, the same alias must map to the same type in every other case type that uses it.
- Collection aliases must use the `.value` suffix (e.g. `Payments.value.PaymentStatus`).
- **Removed aliases stay in the ES mapping** — the same caveat as removed case fields. <!-- CONFLUENCE-ONLY: not verified in source -->

In ES requests, prefix alias names with `alias.`, e.g. `alias.LIPLastName_keyword`.

### 5. Import the definition

Upload the updated spreadsheet to definition-store:

```
POST /import
Content-Type: multipart/form-data
```

On successful import, `ImportServiceImpl` publishes `DefinitionImportedEvent` (`ImportServiceImpl.java:300`). The active `ElasticDefinitionImportListener` handles it:

- If the alias does not yet exist, creates index `<name>-000001` and an alias pointing to it (`ElasticDefinitionImportListener.java:68–71`).
- Calls `CaseMappingGenerator.generateMapping()` which produces the ES mapping JSON covering `data.*` per-field properties, `data_classification`, top-level metadata (`id`, `jurisdiction`, `case_type_id`, `state`, `created_date`, `last_modified`, `security_classification`, …), and any `SearchAliasField` alias entries.
- Calls `HighLevelCCDElasticClient.upsertMapping()` to merge the mapping into the live index (normal path, `reindex=false`).

To force a full reindex (e.g. after changing a field type), pass `?reindex=true&deleteOldIndex=true` on the import POST. This creates a new incremented index, backfills data, then atomically flips the alias (`ElasticDefinitionImportListener.java:73–143`, `getCasesIndexNameFormat` at line 167).

> **Mapping evolution caveats.** ES mappings can be extended (add fields) or partially relaxed but cannot be retypted. <!-- CONFLUENCE-ONLY: see the LLD page "ElasticSearch import error on change of CCD definition field type" -->
>
> | Definition change | Import result |
> |---|---|
> | Field added | Allowed; mapping for new field appended |
> | Field removed | Allowed; mapping retains the orphaned field (no functional impact) |
> | Field type change keeping same ES type (e.g. `Text` ↔ `TextArea`) | Allowed |
> | Field type change crossing ES types (e.g. `Number` → `Text`) | Rejected with `illegal_argument_exception … mapper [...] of different type`. Workaround: delete the index, re-import, reindex existing cases (and migrate any incompatible case data). |

### 5b. Recreate all indices (admin)

If ES is redeployed or indices are lost, you can recreate mappings for **every** case type via CCD Admin Web's "Create Elasticsearch Indices" page, which calls:

```
POST /elastic-support/index
```

on definition-store. This queries the DB for the latest version of all uploaded case types and passes them through the ES Mapper. Use this rather than re-importing each definition individually. <!-- CONFLUENCE-ONLY: documented in the ES LLD; the endpoint exists in source but is not in the standard import path -->

To temporarily unblock a definition import that fails due to ES errors (e.g. on a test environment), set `ELASTIC_SEARCH_FAIL_ON_IMPORT=false` on definition-store. This skips ES initialisation entirely -- indices will be out of sync until the next successful import or `/elastic-support/index` call. Use with extreme care. <!-- CONFLUENCE-ONLY: operational workaround from the ES LLD -->

### 6. Configure data-store endpoints (if calling directly)

| Use case | Endpoint |
|---|---|
| External / service-to-service ES query | `POST /searchCases?ctid=<caseTypeId>` — body is native ES JSON (`CaseSearchEndpoint.java`) |
| UI workbasket / search panel | `POST /internal/searchCases?ctid=<caseTypeId>&use_case=SEARCH` (`UICaseSearchController`) |
| Fetch filter widget config | `GET /api/display/search-input-definition/<caseTypeId>` (served by definition-store) |
| Fetch result column config | `GET /api/display/search-result-definition/<caseTypeId>` (served by definition-store) |

Pass `ctid=*` to `POST /searchCases` to search across all case types the caller can access (`CaseSearchEndpoint.java:101–106`). The LLD calls this out as **expensive and slow**; prefer an explicit comma-separated `ctid=A,B` whenever the case-type set is known up front. <!-- CONFLUENCE-ONLY: behavioural guidance, not enforced -->

#### Internal vs external search

- The **external** endpoint (`/searchCases`) returns raw case data — for each field only the field id and value.
- The **internal** endpoint (`/internal/searchCases`) augments the response with field-type, label, hint text, and other UI presentation metadata pulled from the case type definition. It's intended for browser UIs (Manage Case workbasket / search pages, Manage Org).
- The internal endpoint delegates the actual ES query to the external one and only enriches the result. Only **single case-type searches** are supported on `/internal/searchCases`. <!-- CONFLUENCE-ONLY: described in the Internal Search API LLD; the controller code path confirms enrichment but the single-CT restriction is the LLD's framing -->

#### Use-case-driven result columns (newer)

For the internal endpoint, instead of `SearchResultFields` (use case `SEARCH`) or `WorkbasketResultFields` (use case `WORKBASKET`), services may populate a **`SearchCasesResultFields`** sheet keyed by a `UseCase` column. This lets one case type expose different result-column sets for different UI pages without inventing parallel sheets.

Columns: `LiveFrom`, `LiveTo`, `CaseTypeID`, `CaseFieldID`, `ListElementCode`, `Label`, `DisplayOrder`, `UserRole`, `ResultsOrdering`, `DisplayContextParameter`, `UseCase` (required). Duplicate detection is keyed on `(CaseTypeID, CaseFieldID, ListElementCode, AccessProfile, UseCase)` (`GenericLayoutParser.java:200-210`).

Caller selects the row set with `&use_case=<id>`. Label fields are silently dropped from results regardless of configuration. <!-- CONFLUENCE-ONLY: described in the Internal Search API LLD; source-side: `SearchInputLayoutParser` and `SearchResultLayoutParser` both throw if `UseCase` is set, so it's enforced as exclusive to the SearchCases sheet. -->

---

## How the ES index is named

The index name is derived by `ElasticDefinitionImportListener`:

```
String.format(config.getCasesIndexNameFormat(), caseTypeId.toLowerCase())
```

The first index gets suffix `-000001`. On reindex, the suffix increments by parsing the trailing zero-padded number (`ElasticDefinitionImportListener.java:146–163`). The alias (without suffix) is what data-store queries.

---

## Nested / complex fields

To search or display a sub-field of a complex type, set `ListElementCode` (entity field name `caseFieldElementPath`) to the dot-notation path (e.g. `applicant.address.postCode`). The ES query path becomes `data.applicant.address.postCode`. `GenericLayoutEntity.buildFieldPath()` handles this reconstruction (`GenericLayoutEntity.java:155–161`).

All intermediate fields in the path must also be `Searchable=true` for the path to be indexed.

For querying nested fields directly in ES, you need [nested queries](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-nested-query.html); CCD case data is hierarchical and a flat `match` will not traverse complex types reliably.

---

## Near real-time latency

Search is **near real-time**: expect ~2 seconds between a case being created/updated and it becoming searchable. This is the sum of the Logstash polling interval (1s) plus ES refresh latency. When Logstash is down, existing indexed data remains searchable but new/updated cases will not appear until Logstash recovers. Persistent queues are enabled for Logstash pipelines, so events picked up between Logstash marking `marked_by_logstash=true` and successful ES output survive unexpected pod restarts. <!-- CONFLUENCE-ONLY: operational latency detail from the ES LLD -->

---

## Blacklisted query types

The `query_string` query type is **blacklisted** for performance reasons. Requests using it will fail with HTTP 400. Use `match`, `term`, `wildcard`, or `bool` compound queries instead. <!-- CONFLUENCE-ONLY: stated in the ES LLD; the blacklist is enforced in data-store-api but the specific config is not in the source files listed here -->

---

## Custom request format (supplementary data)

In addition to native ES request bodies, `/searchCases` supports a **custom format** wrapping the query in a `native_es_query` property alongside extra CCD-specific properties:

```json
{
  "native_es_query": { "query": { "match_all": {} } },
  "supplementary_data": ["*"]
}
```

The `supplementary_data` array requests supplementary-data fields to be returned in the response (see the Supplementary Data LLD). Omitting it excludes supplementary data. A custom request with only `native_es_query` is equivalent to a native request -- both formats are supported for backward compatibility. <!-- CONFLUENCE-ONLY: format documented in the ES LLD; source confirms via CaseSearchEndpoint parsing but the custom-format wrapper is not visible in the endpoint signature alone -->

---

## Writing ES queries against `/searchCases`

Some practical pitfalls drawn from the LLD:

- **Default `size` is 10.** ES caps results at 10 unless you set `size`. Many production surprises have come from forgetting this. Use `from`/`size` for pagination ([reference](https://www.elastic.co/guide/en/elasticsearch/reference/6.x/search-request-from-size.html)).
- **`term` vs `match`.** `match` queries run through the analyser; `term` queries do not. Querying a text field with `term` typically yields nothing — use the `_keyword` variant or a `match` query for text. ([reference](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-term-query.html))
- **Metadata vs data.** Top-level CCD metadata (`reference`, `created_date`, `jurisdiction`, `state`, `last_modified`, etc.) is referenced by name. Case fields must be prefixed with `data.` (e.g. `data.applicantName`).
- **Use `_source` to project.** Returning the entire case is wasteful. Specify `"_source": ["jurisdiction", "data.deceasedSurname"]` to limit the response. All metadata is **always** included regardless of `_source`. <!-- CONFLUENCE-ONLY: behavioural -->
- **Cross-case-type sort is per-case-type.** A single ASC sort across `ctid=A,B` returns A's sorted block followed by B's — there is no global ordering. <!-- CONFLUENCE-ONLY: a documented Search API limitation -->
- **`size: 0` empties `case_types_results`.** If you only want per-case-type counts, use `"_source": false` instead. <!-- CONFLUENCE-ONLY: documented limitation -->

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

3. (Optional) hit Kibana / `_cat/indices` to inspect the generated mapping if a query is unexpectedly returning nothing. The Logstash dead-letter index `.logstash_dead_letter` collects any documents that couldn't be indexed (e.g. type-mismatch errors against the live mapping). <!-- CONFLUENCE-ONLY: dead-letter inspection workflow described only in the LLD -->

4. **Bulk reindexing.** If ES is redeployed and all cases need reindexing, use the dedicated `ccd-logstash-indexer` instance (separate from the per-jurisdiction instances). It uses paginated SQL queries against the full `case_data` table rather than the `marked_by_logstash` column. Deploy by setting replicas to 1 in `cnp-flux-config`; it runs once and should be scaled back to 0 when complete. <!-- CONFLUENCE-ONLY: operational procedure from the ES LLD; cnp-flux-config is outside this workspace -->

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

### Sample query bodies

Match all cases (first 50):

```json
{ "query": { "match_all": {} }, "size": 50 }
```

Exact-match on a `YesOrNo` field:

```json
{
  "query": {
    "bool": {
      "filter": { "match": { "data.YesOrNoField": "Yes" } }
    }
  }
}
```

Project specific fields only:

```json
{
  "query": { "match_all": {} },
  "_source": ["jurisdiction", "data.deceasedSurname"]
}
```

Cross-case-type alias search with sort:

```json
{
  "_source": ["alias.firstName", "alias.postcode"],
  "query": { "fuzzy": { "alias.postcode": "SW19 1ER" } },
  "sort":  { "alias.firstName_keyword": "asc" },
  "size":  20
}
```

## See also

- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions for SearchInputFields, SearchResultFields, access profiles
- [`docs/ccd/explanation/search-architecture.md`](../explanation/search-architecture.md) — Logstash → ES indexing pipeline, mapping evolution, cross-case-type search internals
