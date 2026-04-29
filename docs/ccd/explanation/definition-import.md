---
topic: definition-import
audience: both
sources:
  - ccd-admin-web:src/main/routes/importDefinition.ts
  - ccd-admin-web:src/main/service/import-service.ts
  - ccd-admin-web:config/default.yaml
  - ccd-admin-web:src/main/app.ts
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/endpoint/ImportController.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ProcessUploadServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/SpreadsheetParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/SpreadsheetValidator.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/ElasticDefinitionImportListener.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/SynchronousElasticDefinitionImportListener.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/AsynchronousElasticDefinitionImportListener.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/mapping/CaseMappingGenerator.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/client/HighLevelCCDElasticClient.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Definition Import

## TL;DR

- A CCD case-type definition travels from an Excel (.xlsx) upload in `ccd-admin-web` `POST /import` → validation and persistence in `ccd-definition-store-api` `POST /import` → ES index seeding triggered by `DefinitionImportedEvent`.
- Admin Web enforces an 8 MB file-size cap and only accepts `.xls`/`.xlsx`; anything else is rejected before the file reaches the definition store.
- The definition store runs two validation passes: structural (sheet presence, column lengths) then domain (ACL completeness, cross-sheet references). Either pass can return a 400/422 with a human-readable message.
- ES index seeding is either synchronous (failure blocks import) or asynchronous (failure is logged but import succeeds), controlled by `elasticsearch.failImportIfError`.
- The first import of a case type creates index `<caseTypeId>_cases-000001` and an alias; subsequent imports upsert the mapping. Pass `reindex=true` to roll a new numbered index and flip the alias atomically.
- After a successful import the data-store's definition cache must be invalidated before it serves the new definition — this is not automatic from the import call itself.

## The full deploy path

### 1. Upload via ccd-admin-web

A user with the `ccd-import` IDAM role visits `GET /import` in `ccd-admin-web`. The page checks the `canImportDefinition` capability flag, which comes from `ccd-definition-store-api` at `GET /api/idam/adminweb/authorization` (`admin-web-role-authorizer-filter.ts:14-18`).

Submitting the form triggers `POST /import`. The multer middleware validates the upload before any bytes reach the store:

- Extension must be `.xls` or `.xlsx` (`importDefinition.ts:13-16`).
- File size must not exceed 8 MB (`importDefinition.ts:19`). This limit was reduced from 10 MB for compliance.

On a multer error the session error is set and the browser is redirected 302 back to the import page (`importDefinition.ts:31-33`). On success, `uploadFile()` (`import-service.ts:5`) POSTs the raw file as multipart `file` field to `adminWeb.import_url` (default `http://localhost:4451/import`) with both `Authorization: Bearer <idam-token>` and `ServiceAuthorization: <s2s-token>` headers (`import-service.ts:8-17`).

CSRF is intentionally not applied to `/import` (`app.ts:87`).

### 2. Ingestion in ccd-definition-store-api

`ImportController.processUpload()` (`ImportController.java:62`) receives the multipart POST at `POST /import`. Optional query params `reindex` (bool, default `false`) and `deleteOldIndex` (bool, default `false`) control Elasticsearch behaviour.

The call chain is:

```
ImportController.processUpload()
  └── ProcessUploadServiceImpl
        ├── ImportServiceImpl.importFormDefinitions()
        └── FileStorageService (Azure Blob — stores raw xlsx)
```

Inside `ImportServiceImpl.importFormDefinitions()` (`ImportServiceImpl.java:178`):

1. `SpreadsheetParser.parse()` reads the xlsx into `Map<String, DefinitionSheet>` keyed by sheet name (`ImportServiceImpl.java:182`).
2. `SpreadsheetValidator.validate()` runs structural checks (`ImportServiceImpl.java:184`).
3. An ordered pipeline persists entities to the DB (`ImportServiceImpl.java:192–346`): Jurisdiction → Field types → Metadata fields → Case types (with domain validation) → UI layouts → User profiles. Optional sheets (Banner, RoleToAccessProfiles, SearchCriteria, AccessType/AccessTypeRoles, Welsh translations) are processed after the core pipeline.
4. `DefinitionImportedEvent` is published after all DB writes (`ImportServiceImpl.java:300`).
5. `DefinitionFileUploadMetadata` is returned to the caller with jurisdiction, caseType references, userId, and taskId.

### 3. Validation passes

Validation happens in two layers:

**Structural** (`SpreadsheetValidator.java:43–96`):

- Exactly one Jurisdiction row must be present.
- At least one CaseType row must be present.
- `CaseField`, `ComplexTypes`, and `FixedList` sheets must exist.
- Column values are checked against `SpreadSheetValidationMappingEnum` max-lengths cell-by-cell during parsing.
- `DisplayContextParameter` values (`#TABLE(...)`, `#DATETIMEDISPLAY(...)`) are validated for format.

**Domain** (inside `CaseTypeService.createAll()`, `ImportServiceImpl.java:247`):

- Event and state references must resolve.
- CRUD strings must match `^[CRUDcrud\s]{1,5}$` (`CrudValidator.java:12-17`).
- A field with `retainHiddenValue` must have a `showCondition` (`HiddenFieldsValidator.java:206–213`).
- `OtherCaseReference` values must be valid dot-notation paths resolvable against defined fields (`SearchCriteriaValidator.java:24–49`).
- Every referenced access profile in `RoleToAccessProfiles` must exist in `accessProfileRepository`.
- Complex ACL child paths cannot exceed the CRUD of their parent path for the same access profile (`CaseFieldEntityComplexFieldACLValidatorImpl.java:127–150`).

Both layers throw `InvalidImportException` or `MapperException` on failure; `ControllerExceptionHandler` maps these to HTTP 400/422. The error message from the store's response body is surfaced inline on the Admin Web import page (`importDefinition.ts:57-67`).

Sheet names in the xlsx must exactly match the `SheetName` enum values (e.g. `WorkBasketInputFields`, `AuthorisationCaseField`). A mismatch throws `MapperException("A definition must contain a ... sheet")`.

### 4. Elasticsearch index seeding

After DB writes, `ImportServiceImpl` publishes `DefinitionImportedEvent` carrying the list of `CaseTypeEntity` objects plus the `reindex` and `deleteOldIndex` flags.

Either `SynchronousElasticDefinitionImportListener` or `AsynchronousElasticDefinitionImportListener` handles the event:

| Listener | Spring condition | ES failure behaviour |
|---|---|---|
| `SynchronousElasticDefinitionImportListener` | `elasticsearch.enabled=true` AND `failImportIfError=true` | Blocks the import — HTTP 500 returned to Admin Web |
| `AsynchronousElasticDefinitionImportListener` | `elasticsearch.enabled=true` AND `failImportIfError=false` | ES error is logged; import succeeds |

For each case type in the event (`ElasticDefinitionImportListener.java:55`):

- **First import**: creates index `<caseTypeId>_cases-000001` and an alias pointing to it (`ElasticDefinitionImportListener.java:68-71`). The index name format is driven by `CcdElasticSearchProperties.casesIndexNameFormat`.
- **Normal path** (`reindex=false`): `CaseMappingGenerator.generateMapping()` produces the ES mapping JSON; `HighLevelCCDElasticClient.upsertMapping()` merges it into the current index.
- **Reindex path** (`reindex=true`): the current index is set read-only; a new incremented index (e.g. `-000002`) is created with the new mapping; data is reindexed into it; on success the alias is flipped atomically; on failure the new index is removed and the old index has write restored (`ElasticDefinitionImportListener.java:73–143`).

`CaseMappingGenerator` emits: predefined property mappings, a `data` object (per-field typed via `TypeMappingGenerator`), a `data_classification` object, and alias mappings for `SearchAliasField` entries. Text fields automatically get a `<name>_keyword` alias for sort support (`CaseMappingGenerator.java:118–131`).

A fresh ES client is created per import to avoid stale connections (`ElasticDefinitionImportListener.java:52-54`).

### 5. Data-store cache

The definition store does not push changes to `ccd-data-store-api`. The data store caches case-type definitions in memory and must be told to invalidate its cache after import. This is not triggered by the import itself.

<!-- TODO: research note insufficient for cache invalidation endpoint details — confirm whether data-store exposes a dedicated cache-bust endpoint or relies on TTL. -->

## What goes wrong and how to tell

| Symptom | Likely cause | Where to look |
|---|---|---|
| Admin Web rejects file immediately, no request to store | Wrong extension or file > 8 MB | `importDefinition.ts:13-19`; multer error in session |
| 400/422 from store with validation message | Structural or domain validation failure | Error text on import page; store logs for full stack |
| Sheet not found error | Excel tab name does not match `SheetName` enum exactly | Check tab names against `SheetName.java` values |
| `retainHiddenValue` validation failure | Field has `retainHiddenValue` set but no `showCondition` | `HiddenFieldsValidator.java:206–213` |
| Import succeeds but search returns no results | ES mapping not updated or alias not pointing at current index | ES alias state; check if `SynchronousElasticDefinitionImportListener` was active |
| Import fails with ES error | ES unreachable during synchronous listener run | `elasticsearch.failImportIfError` setting; ES cluster health |
| Import succeeds but data-store serves old definition | Data-store cache not yet invalidated | Trigger cache invalidation manually after import |
| 403 on `/import` page | User missing `ccd-import` IDAM role or `canImportDefinition` is false | IDAM role assignment; definition-store authorization endpoint |
| S2S auth failure (401 from admin-web) | S2S token expired or wrong secret | `service-token-generator.ts`; `secrets.ccd.microservicekey-ccd-admin` |

## See also

- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions for DefinitionImportedEvent, access profile, CRUD
- [`docs/ccd/explanation/case-type-model.md`](case-type-model.md) — structure of the xlsx spreadsheet and what each sheet maps to

## Glossary

| Term | Definition |
|---|---|
| `DefinitionImportedEvent` | Spring application event published by `ImportServiceImpl` after all DB writes complete; carries `List<CaseTypeEntity>` and the `reindex`/`deleteOldIndex` flags. |
| `canImportDefinition` | Capability flag returned by definition-store's `/api/idam/adminweb/authorization` endpoint; gates access to the Admin Web import page. |
| `failImportIfError` | `elasticsearch.*` Spring property; when `true` the `SynchronousElasticDefinitionImportListener` is active and an ES failure causes the whole import to roll back. |
| reindex path | Import mode (`reindex=true`) that creates a new numbered ES index, migrates data, then atomically flips the alias — used when field type changes require a full reindex. |
