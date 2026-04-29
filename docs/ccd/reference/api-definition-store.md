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
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# API: Definition Store

## TL;DR

- `ccd-definition-store-api` owns the case-type schema: it ingests Excel definitions, stores them, and serves them to data-store and UI.
- Import is `POST /import` (multipart); all other endpoints are read-only GETs.
- A failed import returns HTTP 400 or 422 — validation runs before any DB write.
- On import, definition-store pushes ES index mappings via `DefinitionImportedEvent`; data-store does not read mappings at query time.
- All four search/workbasket layout endpoints live under `/api/display/`.

## Endpoints

### Import

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/import` | S2S | Upload a definition `.xlsx` as multipart `file`. Params: `reindex` (bool, default `false`), `deleteOldIndex` (bool, default `false`). Returns `ResponseEntity<String>` with a summary message. |

`reindex=true` creates a new ES index, migrates data, then atomically flips the alias (`ElasticDefinitionImportListener.java:72–89`).

### Case type retrieval

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/data/case-type/{id}` | Full case-type definition consumed by data-store — includes ACLs, events, fields, states. |
| `GET` | `/api/data/jurisdictions` | Lists all jurisdictions. |
| `GET` | `/api/data/jurisdictions/{id}/case-type` | Lists case types for a jurisdiction. |

### Display / search configuration

| Method | Path | Response type |
|--------|------|---------------|
| `GET` | `/api/display/search-input-definition/{id}` | `SearchInputDefinition` — fields shown in search filter UI (`DisplayApiController.java:58–68`) |
| `GET` | `/api/display/search-result-definition/{id}` | `SearchResultDefinition` — columns shown in search results (`DisplayApiController.java:70–80`) |
| `GET` | `/api/display/work-basket-input-definition/{id}` | `WorkbasketInputDefinition` — workbasket filter inputs (`DisplayApiController.java:107–117`) |
| `GET` | `/api/display/work-basket-definition/{id}` | `WorkBasketResult` — workbasket result columns (`DisplayApiController.java:119–129`) |
| `GET` | `/api/display/search-cases-result-fields/{id}?use_case=<value>` | `SearchCasesResult` — Global Search result columns, filtered by named use-case (`DisplayApiController.java:131–144`) |

`SearchInputDefinition` and `SearchResultDefinition` are served without ACL filtering — data-store applies access-profile filtering at query time.

## Import pipeline

The import follows an ordered sequence inside `ImportServiceImpl.importFormDefinitions()` (`ImportServiceImpl.java:178`):

1. Parse xlsx into `Map<String, DefinitionSheet>` via `SpreadsheetParser` (`ImportServiceImpl.java:182`).
2. Run structural validation: `SpreadsheetValidator.validate()` checks sheet presence, column max-lengths, and display-context-parameter format (`SpreadsheetValidator.java:43`).
3. Write to DB in order: Jurisdiction → Field types → Metadata fields → Case types (with domain validators) → UI layouts → User profiles (`ImportServiceImpl.java:192–346`).
4. Parse optional sheets: Banner, JurisdictionUiConfig, ChallengeQuestion, Category, RoleToAccessProfiles, SearchCriteria, SearchParty, AccessType/AccessTypeRoles, Welsh translations.
5. Publish `DefinitionImportedEvent` → ES listener seeds index mappings (`ImportServiceImpl.java:300`).

## Validation

Validation runs in two layers before any DB commit:

| Layer | Class | What it checks |
|-------|-------|----------------|
| Structural | `SpreadsheetValidator` | Sheet presence, required columns, column value max-lengths, display context param format |
| Domain | `CaseTypeService.createAll()` chain | Event/state references, ACL completeness, `retainHiddenValue` consistency, dot-notation path resolution, access-profile existence |

Failures throw `InvalidImportException` or `MapperException`, mapped to HTTP 400/422 by `ControllerExceptionHandler`.

Key structural rules (`SpreadsheetValidator.java:43–96`):
- Exactly one Jurisdiction row.
- At least one CaseType row.
- `CaseField`, `ComplexTypes`, and `FixedLists` sheets must be present.
- Sheet tab names must match `SheetName` enum exactly (37 values); mismatch throws `MapperException`.

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

Index name format: `String.format(config.getCasesIndexNameFormat(), caseTypeId.toLowerCase())` — first index gets suffix `-000001` (`ElasticDefinitionImportListener.java:29,69`).

## See also

- [`explanation/case-type-definition.md`](../explanation/case-type-definition.md) — how the spreadsheet model maps to DB entities
- [`reference/permissions.md`](permissions.md) — ACL model and CRUD string format

## Glossary

| Term | Definition |
|------|-----------|
| `DefinitionImportedEvent` | Spring application event published after a successful import DB write; carries case type entities and reindex flags |
| `DefinitionFileUploadMetadata` | JSON body returned from `POST /import`; contains jurisdiction, caseTypes list, userId, taskId |
| `SearchAliasField` | Definition-store entity that maps a named ES alias to a `caseFieldPath`; generates `_keyword` sub-alias for text sort |
| `reindex` | Import flag; when `true`, creates a new ES index, reindexes all case data into it, then atomically swaps the alias |
