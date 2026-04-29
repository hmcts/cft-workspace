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
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Publish a Definition to AAT

## TL;DR

- A case-type definition is an `.xlsx` spreadsheet uploaded to `ccd-definition-store-api` via `POST /import`.
- The upload is gated behind IDAM authentication and requires the `ccd-import` IDAM role (or a whitelisted superset role).
- `ccd-admin-web` is the UI for manual uploads; it enforces an 8 MB file-size limit and accepts only `.xls`/`.xlsx` files.
- On import the definition store validates sheet structure, runs domain-level consistency checks, and seeds or updates Elasticsearch index mappings.
- Pipeline-driven promotion typically calls `POST /import` directly with a service token; the admin UI is used for ad-hoc uploads.
- Import is NOT idempotent on field types — re-importing appends new types rather than replacing them.

---

## Prerequisites

- An IDAM account with the `ccd-import` role (or a role on `security.roles_whitelist` in the admin-web config).
- A valid service-to-service (S2S) token for `ccd-admin-web` if uploading through the UI, or your own service token if calling the API directly.
- The definition spreadsheet built and exported from your config-generator project (e.g. via `ccd-config-generator`).

---

## Option A — Upload via ccd-admin-web (manual / ad-hoc)

### Steps

1. Navigate to the admin-web URL for your AAT environment (e.g. `https://ccd-admin-web.aat.platform.hmcts.net`).

2. Sign in with your IDAM credentials. The app redirects to IDAM's OAuth2 login page; on success it sets an `httpOnly` cookie (`oauth2redirect.ts:16-21`).

3. From the home page, click **Import Case Definition** (route `GET /import`). The page shows the last import audit history fetched from `definition-store /api/import-audits` (`importDefinition.ts:84`).

4. Click **Choose file** and select your `.xlsx` definition file. The file must be:
   - `.xls` or `.xlsx` extension — any other type is rejected by multer before the file is sent (`importDefinition.ts:13-16`).
   - 8 MB or smaller — the limit was reduced from 10 MB for compliance (`importDefinition.ts:19-20`).

5. Click **Upload**. The form `POST /import` fires. On success the page re-renders with the updated audit list.

6. If an error banner appears, read the message — it is sourced directly from `definition-store`'s response body (`importDefinition.ts:57-67`). See [Troubleshooting](#troubleshooting) below.

### Verify

- After upload, the import audit table at `GET /import` gains a new row with your jurisdiction, case-type references, and a timestamp.
- Navigate to a case list for the updated case type in ExUI and confirm the new fields or events are visible.

---

## Option B — Pipeline upload (automated / CI)

Service-team Jenkins pipelines call the definition-store import endpoint directly.

### Steps

1. Obtain an S2S token for your pipeline service (TOTP-based, leased from `idam.s2s_url/lease`).

2. Obtain an IDAM bearer token for a service account that has the `ccd-import` role.

3. Call the import endpoint:

   ```bash
   curl -X POST \
     "${DEFINITION_STORE_URL}/import" \
     -H "Authorization: Bearer ${IDAM_TOKEN}" \
     -H "ServiceAuthorization: ${S2S_TOKEN}" \
     -F "file=@path/to/definition.xlsx"
   ```

   Optional query parameters:
   | Parameter | Default | Effect |
   |---|---|---|
   | `reindex` | `false` | Create a new ES index, reindex all data, flip alias atomically (`ElasticDefinitionImportListener.java:72-89`). |
   | `deleteOldIndex` | `false` | Delete the previous ES index after reindex completes. |

4. A `201 Created` response returns a summary message string (`ImportController.java:62` returns `ResponseEntity<String>`).

### Verify

```bash
curl -s \
  "${DEFINITION_STORE_URL}/api/data/case-type/${CASE_TYPE_ID}" \
  -H "Authorization: Bearer ${IDAM_TOKEN}" \
  -H "ServiceAuthorization: ${S2S_TOKEN}" \
  | jq '.name'
```

The response should reflect the case-type name from the newly imported definition.

---

## What happens on import

The import pipeline inside `ImportServiceImpl` (`ImportServiceImpl.java:178`) runs in order:

1. `SpreadsheetParser.parse()` — reads all xlsx tabs into `Map<String, DefinitionSheet>` keyed by exact sheet name (`SpreadsheetParser.java`). Sheet names must match the `SheetName` enum exactly (e.g. `"AuthorisationCaseField"`, `"WorkBasketInputFields"`); a mismatch throws `MapperException`.
2. `SpreadsheetValidator.validate()` — structural checks: exactly one Jurisdiction row, at least one CaseType row, required sheets and columns present (`SpreadsheetValidator.java:43`).
3. Ordered pipeline: Jurisdiction → Field types → Metadata fields → Case types (domain validation via `CaseTypeService.createAll`) → UI layouts → User profiles (`ImportServiceImpl.java:192-346`).
4. Optional sheets parsed after core: Banner, RoleToAccessProfiles, SearchCriteria, SearchParty, Welsh translations, and others.
5. `DefinitionImportedEvent` published — triggers ES mapping upsert. If `reindex=false` (the default), `HighLevelCCDElasticClient.upsertMapping()` merges the new mapping into the current index. If the index does not exist yet, it is created as `<caseTypeId>_cases-000001` (`ElasticDefinitionImportListener.java:68-71`).
6. Raw `.xlsx` is stored in Azure Blob via `FileStorageService` (`ProcessUploadServiceImpl.java`).

---

## Troubleshooting

### "Wrong file type" or "File too large"

multer rejects the file before it reaches the store. Ensure the file is `.xls`/`.xlsx` and under 8 MB. The error is stored in `req.session.error` and shown on the import page after a 302 redirect (`importDefinition.ts:29-33`).

### 401 Unauthorised

- Via UI: admin-web clears the `accessToken` cookie and renders an error page (`app.ts:112-122`). Navigate back to the home page to trigger re-authentication.
- Via API: your IDAM bearer token has expired or the S2S token lease has expired. Re-request both tokens.

### 403 Forbidden — "You are not authorised"

Your IDAM account lacks the `ccd-import` role (or the whitelisted role configured in `security.roles_whitelist`, default value `"ccd-import"`, `config/default.yaml:16`). Ask your team's access administrator to grant the role in AAT IDAM.

### 400 / 422 from definition store — validation error

The error message is sourced from `definition-store`'s response body (`import-service.ts:23-28`). Common causes:

| Symptom | Likely cause |
|---|---|
| "A definition must contain a ... sheet" | An expected xlsx tab is missing or named incorrectly. Check against `SheetName` enum. |
| "retainHiddenValue requires showCondition" | `CaseEventToFields` has `retainHiddenValue=Y` but no `ShowCondition` (`HiddenFieldsValidator.java:206-213`). |
| "Invalid CRUD string" | `AuthorisationCaseField` (or another Authorisation sheet) has a value outside `[CRUDcrud]` in the CRUD column (`CrudValidator.java:12-17`). |
| Access profile not found | A CRUD column references an access profile not present in `RoleToAccessProfiles` sheet (`AuthorisationParser.java:22-35`). |
| "OtherCaseReference is not a valid path" | `SearchCriteria` sheet has a dot-notation value that does not resolve to a real field (`SearchCriteriaValidator.java:24-49`). |

### ES index not updated after import

If `elasticsearch.failImportIfError=false` (asynchronous listener is active), ES mapping errors do not fail the import. Check definition-store logs for ES errors. Pass `reindex=true` to force a full index rebuild on the next import.

---

## See also

- [`reference/definition-spreadsheet.md`](../reference/definition-spreadsheet.md) — sheet-by-sheet column reference
- [`explanation/case-type-model.md`](../explanation/case-type-model.md) — how case types, events, and fields relate
- [`reference/glossary.md`](../reference/glossary.md) — access profile, CRUD, S2S token
