---
topic: architecture
audience: both
sources:
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/endpoint/ImportController.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/DisplayApiController.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/GenericLayoutRepository.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/SpreadsheetValidator.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/CaseDefinitionController.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/UserRoleController.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/DraftDefinitionController.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/endpoint/ElasticsearchIndexController.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/AccessTypesController.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/ImportAuditController.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/BaseTypeController.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ProcessUploadServiceImpl.java
status: confluence-augmented
confluence:
  - id: "499712037"
    title: "Import a definition using cUrl, get role and add role"
    last_modified: "unknown"
    space: "RCCD"
  - id: "930743291"
    title: "ElasticSearch import error on change of CCD definition field type"
    last_modified: "unknown"
    space: "RCCD"
  - id: "843514186"
    title: "CCD ElasticSearch and new search API Design LLD"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1063059491"
    title: "Definition import fails with a 422 Unprocessible Entity error"
    last_modified: "unknown"
    space: "RCCD"
  - id: "557614199"
    title: "Case Configuration/Definition Import"
    last_modified: "unknown"
    space: "RCCD"
confluence_checked_at: "2026-04-29T00:00:00Z"
last_reviewed: 2026-04-29T00:00:00Z
---

# API: Definition Store

## TL;DR

- `ccd-definition-store-api` owns the case-type schema: it ingests Excel definitions, stores them, and serves them to data-store and UI.
- Import is `POST /import` (multipart); most other endpoints are read-only GETs. User-role and draft-definition endpoints also accept writes.
- A failed import returns HTTP 400 or 422 with a descriptive message; validation runs before any DB write.
- On import, definition-store pushes ES index mappings via `DefinitionImportedEvent`; data-store does not read mappings at query time.
- ES does not support field type changes; incompatible changes (e.g. Number to Text) require deleting the index first.
- The `/elastic-support/index` endpoint recreates ES indices for all (or specified) case types without re-importing definitions.

## Endpoints

### Import

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/import` | S2S + `ccd-import` role | Upload a definition `.xlsx` as multipart `file`. Params: `reindex` (bool, default `false`), `deleteOldIndex` (bool, default `false`). Returns HTTP 201 with body `"Case Definition data successfully imported"`. |

On success the response may include:

| Header | Condition | Value |
|--------|-----------|-------|
| `Definition-Import-Warnings` | Validation produced non-fatal warnings | Multi-value header; each value is a warning string |
| `Elasticsearch-Reindex-Task` | `reindex=true` was passed | ES task ID for tracking reindex progress |

`reindex=true` creates a new ES index, migrates data, then atomically flips the alias (`ElasticDefinitionImportListener.java:72-89`).

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- Confluence states the import is gated through the API Gateway at paths like
     /definition_import/import in AAT/Demo, requiring a CCD_IMPORT_USER_TOKEN JWT
     with the ccd-import role. This gateway routing is not defined in definition-store
     source but rather in the API gateway configuration. -->

### Case type retrieval

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/data/case-type/{id}` | Full case-type definition consumed by data-store -- includes ACLs, events, fields, states. |
| `GET` | `/api/data/case-type/{ctid}/version` | Returns `CaseTypeVersionInformation` (version number only) for lightweight polling. |
| `GET` | `/api/data/caseworkers/{uid}/jurisdictions/{jid}/case-types/{ctid}` | Same as `/api/data/case-type/{id}` but with legacy caseworker/jurisdiction path segments (ignored by impl). |
| `GET` | `/api/data/caseworkers/{uid}/jurisdictions/{jid}/case-types/{ctid}/roles` | Case roles for a case type (list of `CaseRole`). |
| `GET` | `/api/data/caseworkers/{uid}/jurisdictions/{jid}/case-types/{ctid}/access/profile/roles` | Role-to-access-profile mappings (`RoleAssignment` list). |
| `GET` | `/api/data/jurisdictions` | Lists all jurisdictions. Optional query param `ids` (comma-separated) to filter. |
| `GET` | `/api/data/jurisdictions/{jurisdiction_id}/case-type` | Lists case types for a jurisdiction. **Deprecated** -- marked `@Deprecated(forRemoval = true)` due to performance issues; no longer called by data-store. |

### Display / search configuration

| Method | Path | Response type |
|--------|------|---------------|
| `GET` | `/api/display/search-input-definition/{id}` | `SearchInputDefinition` -- fields shown in search filter UI (`DisplayApiController.java:58-68`) |
| `GET` | `/api/display/search-result-definition/{id}` | `SearchResultDefinition` -- columns shown in search results (`DisplayApiController.java:70-80`) |
| `GET` | `/api/display/work-basket-input-definition/{id}` | `WorkbasketInputDefinition` -- workbasket filter inputs (`DisplayApiController.java:107-117`) |
| `GET` | `/api/display/work-basket-definition/{id}` | `WorkBasketResult` -- workbasket result columns (`DisplayApiController.java:119-129`) |
| `GET` | `/api/display/search-cases-result-fields/{id}?use_case=<value>` | `SearchCasesResult` -- Global Search result columns, filtered by named use-case (`DisplayApiController.java:131-144`) |

`SearchInputDefinition` and `SearchResultDefinition` are served without ACL filtering -- data-store applies access-profile filtering at query time.

### User roles (access profiles)

| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/api/user-role` | Create-or-update a user role. Body: `{"role": "...", "security_classification": "PUBLIC\|PRIVATE\|RESTRICTED"}`. Returns 201 (created) or 205 (updated). |
| `POST` | `/api/user-role` | Create a user role (always 201). Same body shape. |
| `GET` | `/api/user-role?role=<base64>` | Get a single role by base64-encoded role name. |
| `GET` | `/api/user-roles/{roles}` | Get multiple roles by comma-separated names in path. |
| `GET` | `/api/user-roles` | Get all registered user roles. |

These endpoints are called by `ccd-admin-web` to register IDAM roles before definition import. Roles referenced in Authorisation tabs must exist here; if missing, the import fails with a validation error.

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- Confluence documents that IDAM roles are case-sensitive and must be lowercase by
     convention. The definition-store source does not enforce lowercase but the role
     must match exactly what is registered in IDAM. -->

### Draft definitions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/draft` | Create a draft definition (JSON body). Increments version per jurisdiction. Returns 201. |
| `PUT` | `/api/draft/save` | Save/update a draft definition. Returns 200. |
| `DELETE` | `/api/draft/{jurisdiction}/{version}` | Soft-delete a draft definition. Returns 204. |
| `GET` | `/api/drafts?jurisdiction=<jid>` | List all drafts for a jurisdiction. |
| `GET` | `/api/draft?jurisdiction=<jid>&version=<v>` | Get a specific draft version (latest if version omitted). |

### Elasticsearch support

These endpoints are conditionally enabled (`elasticsearch.enabled=true`).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/elastic-support/index` | Create ES indices for all case types (or a subset via `ctid` param). Returns 201 with `IndicesCreationResult`. Does not require a definition re-import. |
| `POST` | `/elastic-support/global-search/index` | Create the Global Search ES index. Returns 201. |
| `GET` | `/elastic-support/case-types` | Returns a list of all unique case type reference strings. |

The `/elastic-support/index` endpoint accepts an optional `ctid` query parameter (comma-separated case type IDs). If omitted, it processes every case type ever imported.

### Access types

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/retrieve-access-types` | Returns `AccessTypeJurisdictionResults` for all case types. Optional body: `OrganisationProfileIds` to filter. |

### Other endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/base-types` | List all base field types (cached in memory after first call). |
| `GET` | `/api/import-audits` | Fetches import audit records from Azure Blob Storage. Returns empty list if Azure storage is not configured. |
| `GET` | `/api/idam/adminweb/authorization` | Returns `AdminWebAuthorization` for the current user (used by admin-web to check permissions). |
| `GET` | `/api/idam/profile/roles` | Returns IDAM profile/roles for the current user. |
| `DELETE` | `/api/testing-support/cleanup-case-type/{changeId}?caseTypeIds=...` | Test-only. Deletes case type and all related rows. Guarded by `testing-support-endpoints.enabled=false` (disabled in prod). |

## Import pipeline

The import follows an ordered sequence inside `ImportServiceImpl.importFormDefinitions()` (`ImportServiceImpl.java:178`):

1. Parse xlsx into `Map<String, DefinitionSheet>` via `SpreadsheetParser` (`ImportServiceImpl.java:182`).
2. Run structural validation: `SpreadsheetValidator.validate()` checks sheet presence, column max-lengths, and display-context-parameter format (`SpreadsheetValidator.java:43`).
3. Write to DB in order: Jurisdiction -> Field types -> Metadata fields -> Case types (with domain validators) -> UI layouts -> User profiles (`ImportServiceImpl.java:192-346`).
4. Parse optional sheets: Banner, JurisdictionUiConfig, ChallengeQuestion, Category, RoleToAccessProfiles, SearchCriteria, SearchParty, AccessType/AccessTypeRoles, Welsh translations.
5. Publish `DefinitionImportedEvent` -> ES listener seeds index mappings (`ImportServiceImpl.java:300`).
6. If Azure storage is configured, upload the original spreadsheet to blob storage for audit purposes.

## Validation

Validation runs in two layers before any DB commit:

| Layer | Class | What it checks |
|-------|-------|----------------|
| Structural | `SpreadsheetValidator` | Sheet presence, required columns, column value max-lengths, display context param format |
| Domain | `CaseTypeService.createAll()` chain | Event/state references, ACL completeness, `retainHiddenValue` consistency, dot-notation path resolution, access-profile existence |

Failures throw `InvalidImportException` or `MapperException`, mapped to HTTP 400/422 by `ControllerExceptionHandler`.

Key structural rules (`SpreadsheetValidator.java:43-96`):
- Exactly one Jurisdiction row.
- At least one CaseType row.
- `CaseField`, `ComplexTypes`, and `FixedLists` sheets must be present.
- Sheet tab names must match `SheetName` enum exactly (37 values); mismatch throws `MapperException`.

### Common import errors

Based on operational experience:

1. **Missing field references** -- field IDs referenced in event configs or layouts but not defined on the `CaseField` tab.
2. **Undefined FixedList/ComplexType** -- `FieldTypeParameter` references a list or complex type that does not exist on the corresponding tab.
3. **Missing user roles** -- roles referenced in `Authorisation` tabs that have not been registered via `/api/user-role`. Fix by calling `PUT /api/user-role` with the role and classification before re-importing.
4. **Case-sensitive role names** -- IDAM roles must match exactly (e.g. `caseworker-test` not `Caseworker-test`).
<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- The case-sensitivity guidance comes from Confluence troubleshooting page 1063059491.
     Source does not explicitly enforce lowercase but the role string is matched verbatim
     against IDAM. -->

## Response shapes

### `SearchInputField` (fields array in `SearchInputDefinition`)

| JSON key | Type | Notes |
|----------|------|-------|
| `case_field_id` | string | Field reference |
| `case_field_element_path` | string | Dot-notation path into complex type, or null for top-level |
| `label` | string | |
| `order` | int | Display order |
| `role` | string | Access-profile restriction; null = no restriction |
| `show_condition` | string | |
| `display_context_parameter` | string | e.g. `#TABLE(...)` |

### `SearchResultsField` (adds sort)

All `SearchInputField` keys plus:

| JSON key | Type | Notes |
|----------|------|-------|
| `sort_order` | object | `{direction, priority}` |
| `metadata` | bool | True for metadata fields (e.g. `[CASE_REFERENCE]`) |
| `case_type_id` | string | |

## ES index seeding

On import, `DefinitionImportedEvent` is published carrying `List<CaseTypeEntity>`, `reindex`, `deleteOldIndex`. Two listener modes:

| Spring bean | Condition | Behaviour on ES failure |
|-------------|-----------|------------------------|
| `SynchronousElasticDefinitionImportListener` | `elasticsearch.enabled=true` AND `failImportIfError=true` | Rolls back import |
| `AsynchronousElasticDefinitionImportListener` | `failImportIfError=false` | ES errors are logged but import succeeds |

Index name format: `String.format(config.getCasesIndexNameFormat(), caseTypeId.toLowerCase())` -- first index gets suffix `-000001` (`ElasticDefinitionImportListener.java:29,69`).

### ES field type change rules

ES does not support changing the type of an existing mapped field. On definition import, the ES Mapper generates a new mapping and applies it to the existing index:

| Definition change | Import allowed? | ES mapping impact | Existing cases indexable? |
|-------------------|-----------------|-------------------|---------------------------|
| Field added | Yes | New field mapping added | Yes |
| Field removed | Yes | Old mapping remains (unused) | Yes |
| Field type changed (same ES type, e.g. Text -> TextArea) | Yes | No mapping conflict | Yes |
| Field type changed (different ES type, e.g. Number -> Text) | **No** -- import rejected | N/A | N/A |

When a field type change is incompatible, the workaround is:
1. Delete the ES index for the affected case type (via DevOps or `/elastic-support/index` after deletion).
2. Re-import the definition (which recreates the index with the new mapping).
3. Trigger reindexing of existing cases (Logstash will pick them up).

To temporarily bypass ES errors on test environments, set `ELASTIC_SEARCH_FAIL_ON_IMPORT=false` in definition-store configuration. This leaves ES indices out of sync and should not be used in production.

### Non-searchable fields

The `Searchable` column on `CaseField` and `ComplexTypes` tabs controls whether a field is indexed in ES. Default is `true`. Setting to `false` adds the field with `enabled: false` in the ES mapping, meaning:

- The field cannot be used as a search term (queries return no results for it).
- The field's data is still returned in search results (it appears in `case_data`).
- If a parent complex field is non-searchable, all nested children are also non-searchable regardless of their own `Searchable` value.

This is useful for services with large numbers of complex fields that hit the ES field count limit. Marking non-UI-searchable fields as `Searchable=false` can reduce mappings from thousands of fields to hundreds.

## Production import process

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- The below process comes from Confluence page 557614199 and describes operational
     procedure rather than code behaviour. -->

Before importing to production, the recommended operational workflow is:

1. Definition uploaded to a sandbox environment by a developer.
2. QA tests the definition in a representative environment (Demo/AAT).
3. A ticket is raised for the CDM team to perform the production import.
4. CDM team imports via `ccd-admin-web` (which calls `POST /import`).
5. If the import fails on missing roles, roles are registered first via the user-role endpoint.

## See also

- [`explanation/case-type-definition.md`](../explanation/case-type-definition.md) -- how the spreadsheet model maps to DB entities
- [`reference/permissions.md`](permissions.md) -- ACL model and CRUD string format

## Glossary

See [Glossary](glossary.md) for term definitions used in this page.

