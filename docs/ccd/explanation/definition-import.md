---
topic: definition-import
audience: both
sources:
  - ccd-admin-web:src/main/routes/importDefinition.ts
  - ccd-admin-web:src/main/service/import-service.ts
  - ccd-admin-web:src/main/views/response.html
  - ccd-admin-web:config/default.yaml
  - ccd-admin-web:src/main/app.ts
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/endpoint/ImportController.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ProcessUploadServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ProcessUploadService.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/SpreadsheetParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/SpreadsheetValidator.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/ElasticDefinitionImportListener.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/SynchronousElasticDefinitionImportListener.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/AsynchronousElasticDefinitionImportListener.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/mapping/CaseMappingGenerator.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/client/HighLevelCCDElasticClient.java
  - ccd-data-store-api:src/main/resources/application.properties
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/config/CacheConfiguration.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/definition/DefaultCaseDefinitionRepository.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "203951529"
    title: "CCD - Import Case Definition Domain"
    space: "RCCD"
  - id: "464093316"
    title: "CCD Case Admin Web High Level Design"
    space: "RCCD"
  - id: "688685210"
    title: "CCD Case Admin Web User Guide"
    space: "RCCD"
  - id: "1063059491"
    title: 'Definition import fails with a "422 Unprocessible Entity" error'
    space: "RCCD"
  - id: "930743291"
    title: "ElasticSearch import error on change of CCD definition field type"
    space: "RCCD"
  - id: "1498635469"
    title: "Automated Definition Imports in Jenkins Pipelines with High Level Data Setup Stages"
    space: "RCCD"
  - id: "499712037"
    title: "Import a definition using cUrl, get role and add role"
    space: "RCCD"
  - id: "1616386673"
    title: "CCD Service Operations Guide"
    space: "CCD"
---

# Definition Import

## TL;DR

- A CCD case-type definition travels from an Excel (.xlsx) upload in `ccd-admin-web` `POST /import` → validation and persistence in `ccd-definition-store-api` `POST /import` → ES index seeding triggered by `DefinitionImportedEvent`.
- Two entry points exist: interactive uploads via Admin Web (which posts directly to the definition store), and pipeline / cUrl uploads via the `ccd-api-gateway` at `POST /definition_import/import`. Both land at the same definition-store endpoint.
- Admin Web enforces an 8 MB file-size cap and only accepts `.xls`/`.xlsx`; anything else is rejected before the file reaches the store. The user must hold the `ccd-import` IDAM role.
- Validation runs in two passes: structural (sheet presence, column lengths, role-name capitalisation, undefined `FixedList`/`ComplexType` references) then domain (ACL completeness, cross-sheet references). Either pass returns 400/422 with a human-readable message.
- ES index seeding is either synchronous (failure blocks import) or asynchronous (failure is logged but import succeeds), controlled by `elasticsearch.failImportIfError`. Field-type changes are not supported by ES — they require a delete-and-rebuild or a data-migration workaround.
- The data-store does not get pushed to. It re-fetches case-type definitions from the definition store and caches them with a 30 s default TTL (`default.cache.ttl`), so a fresh import becomes effective on the next cache miss.

## The full deploy path

### 1. Upload via ccd-admin-web (or via the API gateway)

There are two routes to the definition-store import endpoint:

| Caller | Hits | Notes |
|---|---|---|
| Interactive user via Admin Web | `POST /import` directly on `ccd-definition-store-api` (default `http://localhost:4451/import` set by `adminWeb.import_url`) | Multer-validated browser upload. |
| Jenkins pipelines / cUrl scripts / BEFTA | `POST /definition_import/import` on the `ccd-api-gateway`, which forwards to the definition-store `/import` after IDAM/S2S auth | Used by the **High Level Data Setup** Jenkins stage and the operator cUrl scripts. |

**Admin Web flow.** A user with the `ccd-import` IDAM role visits `GET /import` in `ccd-admin-web`. The page checks the `canImportDefinition` capability flag, which comes from `ccd-definition-store-api` at `GET /api/idam/adminweb/authorization` (`admin-web-role-authorizer-filter.ts:14-18`).

Submitting the form triggers `POST /import`. The multer middleware validates the upload before any bytes reach the store:

- Extension must be `.xls` or `.xlsx` (`importDefinition.ts:13-16`).
- File size must not exceed 8 MB (`importDefinition.ts:19`). This limit was reduced from 10 MB for compliance.

On a multer error the session error is set and the browser is redirected 302 back to the import page (`importDefinition.ts:31-33`). On success, `uploadFile()` (`import-service.ts:5`) POSTs the raw file as multipart `file` field to `adminWeb.import_url` with both `Authorization: Bearer <idam-token>` and `ServiceAuthorization: <s2s-token>` headers (`import-service.ts:8-17`).

CSRF is intentionally not applied to `/import` (`app.ts:87`).

**User-roles prerequisite.** Any IDAM role referenced in the spreadsheet (`Authorisation*` tabs, `RoleToAccessProfiles`) must already be **replicated in CCD** via Admin Web → Manage User Roles before the import will pass. If the import fails with a missing-role error, the operator is expected to add the role using the Admin Web UI, or via the `definition_import/api/user-role` cUrl endpoint, then retry.

**Pipeline flow.** The Jenkins **High Level Data Setup** stage (Java/Node/Angular `preview`/`master`/`demo`/`ithc`/`perftest` builds) loads `DEFINITION_IMPORTER_USERNAME`/`DEFINITION_IMPORTER_PASSWORD` from the product Key Vault, fetches an IDAM token, and POSTs the spreadsheet to `${DEFINITION_STORE_URL_BASE}/import` (or via the gateway). BEFTA's tooling can fill in environment-specific callback URLs in JSON definitions before converting them to xlsx.

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

The raw xlsx is also persisted to Azure Blob Storage via `FileStorageService` for audit and replay. <!-- CONFLUENCE-ONLY: the audit/storage purpose is not stated in source comments — inferred from "Files are stored in Azure Storage on Import" (Confluence: Case Configuration/Definition Import, RCCD-557614199). -->

**User-profile side-channel.** The xlsx may also carry user-profile rows. These are written to a *separate* user-profile data store (not the definition-store DB). The user-profile data and case-data definitions are imported via the same spreadsheet but persisted independently — the two stores are linked at runtime by jurisdiction id.

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

**Common 422 root causes** (in operator experience, RCCD-1063059491):

- Field IDs referenced from `Authorisation*`, `CaseEventToFields`, `CaseTypeTab` etc. that are not defined on the `CaseField` tab.
- `FixedList` / `ComplexType` types referenced from `FieldType` / `FieldTypeParameter` columns but not defined on the `FixedLists` / `ComplexTypes` tabs.
- IDAM roles referenced on `Authorisation*` tabs with the wrong capitalisation. **IDAM role names are case-sensitive and lowercase by convention** — `Caseworker-test` will fail where `caseworker-test` succeeds.
- IDAM roles referenced that have not yet been replicated in CCD via Manage User Roles.

**Soft warnings.** A successful import can still emit warnings (validation problems that did not block persistence — invalid email addresses, missing default jurisdiction/case type/state values in the WorkBasket tab, missing `AuthorisationCase{Events,Fields,...}` rows for some case types). These come back from the definition store on the `Definition-Import-Warnings` HTTP response header (`ImportController.java:33` — `IMPORT_WARNINGS_HEADER = "Definition-Import-Warnings"`) and are rendered as a bullet list on the Admin Web success page (`response.html:4-10`).

### 4. Elasticsearch index seeding

After DB writes, `ImportServiceImpl` publishes `DefinitionImportedEvent` carrying the list of `CaseTypeEntity` objects plus the `reindex` and `deleteOldIndex` flags.

Either `SynchronousElasticDefinitionImportListener` or `AsynchronousElasticDefinitionImportListener` handles the event:

| Listener | Spring condition | ES failure behaviour |
|---|---|---|
| `SynchronousElasticDefinitionImportListener` | `elasticsearch.enabled=true` AND `failImportIfError=true` | Blocks the import — HTTP 500 returned to Admin Web |
| `AsynchronousElasticDefinitionImportListener` | `elasticsearch.enabled=true` AND `failImportIfError=false` | ES error is logged (`Errors initialising ElasticSearch will not fail the definition import`); import succeeds |

For each case type in the event (`ElasticDefinitionImportListener.java:55`):

- **First import**: creates index `<caseTypeId>_cases-000001` and an alias pointing to it (`ElasticDefinitionImportListener.java:68-71`). The index name format is driven by `CcdElasticSearchProperties.casesIndexNameFormat`.
- **Normal path** (`reindex=false`): `CaseMappingGenerator.generateMapping()` produces the ES mapping JSON; `HighLevelCCDElasticClient.upsertMapping()` merges it into the current index.
- **Reindex path** (`reindex=true`): the current index is set read-only; a new incremented index (e.g. `-000002`) is created with the new mapping; data is reindexed into it; on success the alias is flipped atomically; on failure the new index is removed and the old index has write restored (`ElasticDefinitionImportListener.java:73–143`).

`CaseMappingGenerator` emits: predefined property mappings, a `data` object (per-field typed via `TypeMappingGenerator`), a `data_classification` object, and alias mappings for `SearchAliasField` entries. Text fields automatically get a `<name>_keyword` alias for sort support (`CaseMappingGenerator.java:118–131`).

A fresh ES client is created per import to avoid stale connections (`ElasticDefinitionImportListener.java:52-54`).

#### Field-type changes in Elasticsearch

ES does **not** support changing the type of an existing field in a mapping. A definition import that changes (say) `Number` → `Text` for a field will fail at the `upsertMapping` step with:

```
ElasticSearch initialisation exception: ElasticsearchStatusException
  [Elasticsearch exception [type=illegal_argument_exception,
   reason=mapper [data.<path>] of different type,
   current_type [double], merged_type [text]]]
```

Some changes are tolerated where the underlying ES type is identical — `Text` ↔ `TextArea` both map to ES `text`, for example. <!-- CONFLUENCE-ONLY: ES type-equivalence rule documented in RCCD-930743291; not asserted explicitly in source comments. -->

When a field-type change is needed, the workarounds depend on environment and on whether existing case data must survive:

| Scenario | Action |
|---|---|
| Test environment, old cases discardable | Ask DevOps to delete the case-type's ES index, re-upload definition, redeploy LogStash to reindex. |
| Test environment, ignoring search correctness | Ask CCD to flip `failImportIfError=false` temporarily, upload, flip back. |
| Prod, no cases yet hold the field | Delete the ES index for the case type; upload; redeploy LogStash. |
| Prod, cases hold the field | **Two-step migration**: import a definition with both old and new fields plus a custom `Migrate` event, run that event over every case to copy values, then upload a definition that drops the old field and the `Migrate` event. |

<!-- CONFLUENCE-ONLY: the migration playbook above is the operator-level remediation documented in RCCD-930743291. The source code blocks the import; it does not embed the workaround. -->

### 5. Data-store cache

The definition store does not push changes to `ccd-data-store-api`. The data store caches case-type definitions in-process using Caffeine and re-fetches when entries expire (`CacheConfiguration.java:60`, `DefaultCaseDefinitionRepository.java:77` — `@Cacheable("caseTypeDefinitionsCache")`).

The relevant TTLs (`application.properties:43-49`):

| Property | Default | Effect |
|---|---|---|
| `default.cache.ttl` (`DEFAULT_CACHE_TTL_SEC`) | `30` seconds | Applies to most case-type definition caches. |
| `definition.cache.jurisdiction-ttl` (`DEFINITION_CACHE_JURISDICTION_TTL_SEC`) | `30` seconds | Jurisdiction definition cache. |

So in normal operation a freshly imported definition becomes effective on the data store within ~30 seconds — there is no manual cache-bust call. The `ccd-admin-web` UI used to expose a reindex button that nudged the data store; **this button has been removed** (referenced in DATS-1915172599 onboarding notes), and operators now rely on the TTL or pod restarts. <!-- CONFLUENCE-ONLY: the removal of the reindex button is documented anecdotally in DATS-1915172599; the data-store source has no explicit cache-eviction endpoint. -->

For larger or longer-running case types, the per-request "request-scope" cache (`definition.cache.request-scope.case-types`, `application.properties:52-54`) can be enabled to avoid repeat fetches inside a single request handler.

## What goes wrong and how to tell

| Symptom | Likely cause | Where to look |
|---|---|---|
| Admin Web rejects file immediately, no request to store | Wrong extension or file > 8 MB | `importDefinition.ts:13-19`; multer error in session |
| 422 from store with "field IDs not defined" message | Field ID referenced on `Authorisation*`/event/tab tabs but missing from `CaseField` | Cross-check IDs against the `CaseField` tab |
| 422 from store with "no such role" message | IDAM role mis-capitalised or not yet replicated in CCD | IDAM role assignment; Admin Web → Manage User Roles |
| 422 from store with `FieldType`/`FieldTypeParameter` error | Referenced `FixedList`/`ComplexType` not defined on the relevant tab | `FixedLists` / `ComplexTypes` tabs |
| Sheet not found error | Excel tab name does not match `SheetName` enum exactly | Check tab names against `SheetName.java` values |
| `retainHiddenValue` validation failure | Field has `retainHiddenValue` set but no `showCondition` | `HiddenFieldsValidator.java:206–213` |
| Import succeeds, warnings shown | Validation problems that did not block persistence | `Definition-Import-Warnings` response header rendered in `response.html:4-10` |
| Import fails with `mapper [...] of different type` ES error | Field type was changed in a way ES cannot merge | RCCD-930743291; see "Field-type changes in Elasticsearch" above |
| Import succeeds but search returns no results | ES mapping not updated or alias not pointing at current index | ES alias state; check if `SynchronousElasticDefinitionImportListener` was active |
| Import fails with ES error (sync mode) | ES unreachable or mapping conflict during synchronous listener run | `elasticsearch.failImportIfError` setting; ES cluster health |
| Import succeeds but data-store serves old definition | Data-store cache not yet expired (default 30 s TTL) | Wait for TTL to elapse; or restart data-store pods |
| Translation-service errors logged but import passed | Welsh translations sheet failed to upload | Log line `Errors calling Translation service will not fail the definition import` |
| 403 on `/import` page | User missing `ccd-import` IDAM role or `canImportDefinition` is false | IDAM role assignment; definition-store authorization endpoint |
| S2S auth failure (401 from admin-web) | S2S token expired or wrong secret | `service-token-generator.ts`; `secrets.ccd.microservicekey-ccd-admin` |
| Pipeline import fails with auth error | `definition-importer-username` or `-password` missing from product Key Vault | RCCD-1498635469 implementation steps; check `*product*-aat`, `*product*-prod` etc. |

## See also

- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions for DefinitionImportedEvent, access profile, CRUD
- [`docs/ccd/explanation/case-type-model.md`](case-type-model.md) — structure of the xlsx spreadsheet and what each sheet maps to
- [RetainHiddenValue](retain-hidden-value.md) — the `HiddenFieldsValidator` cited in the validation table is explained in depth here, including what it rejects and why

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

