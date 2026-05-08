---
topic: definition-import
audience: both
sources:
  - ccd-admin-web:src/main/routes/importDefinition.ts
  - ccd-admin-web:src/main/service/import-service.ts
  - ccd-admin-web:config/default.yaml
  - ccd-admin-web:src/main/app.ts
  - ccd-admin-web:src/main/routes/userRoles.ts
  - ccd-admin-web:src/main/routes/indexElasticsearch.ts
  - ccd-admin-web:src/main/role/roles-based-authorizer.ts
  - ccd-admin-web:charts/ccd-admin-web/values.yaml
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/endpoint/ImportController.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ProcessUploadServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/SpreadsheetParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/SpreadsheetValidator.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/ElasticDefinitionImportListener.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/UserRoleController.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence:
  - id: "557614199"
    title: "Case Configuration/Definition Import"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1063059491"
    title: "Definition import fails with a \"422 Unprocessible Entity\" error"
    last_modified: "unknown"
    space: "RCCD"
  - id: "499712037"
    title: "Import a definition using cUrl, get role and add role"
    last_modified: "unknown"
    space: "RCCD"
  - id: "930743291"
    title: "ElasticSearch import error on change of CCD definition field type"
    last_modified: "unknown"
    space: "RCCD"
  - id: "679641313"
    title: "AAT & DEMO : Case Configuration & User Management"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1958072178"
    title: "Delete ElasticSearch Index to import new case definition in AAT"
    last_modified: "unknown"
    space: "RRFM"
confluence_checked_at: "2026-04-29T00:00:00Z"
---

# Publish a Definition to AAT

## TL;DR

- A case-type definition is an `.xlsx` spreadsheet uploaded to `ccd-definition-store-api` via `POST /import`.
- The upload is gated behind IDAM authentication and requires the `ccd-import` IDAM role (or a role in the comma-separated `security.roles_whitelist`).
- `ccd-admin-web` is the UI for manual uploads; it enforces an 8 MB file-size limit and accepts only `.xls`/`.xlsx` files.
- On import the definition store validates sheet structure, runs domain-level consistency checks, and seeds or updates Elasticsearch index mappings.
- Roles referenced in your definition's Authorisation sheets must already exist in the definition store before import -- add them via the admin-web **Manage User Roles** page or `PUT /api/user-role`.
- Import is NOT idempotent on field types -- re-importing appends new types rather than replacing them.

---

## Prerequisites

- An IDAM account with the `ccd-import` role (or a role on `security.roles_whitelist` in the admin-web config, default `"ccd-import"`).
- A valid service-to-service (S2S) token for `ccd-admin-web` if uploading through the UI, or your own service token if calling the API directly.
- The definition spreadsheet built and exported from your config-generator project (e.g. via `ccd-config-generator`).
- VPN connection (F5) if accessing the environment from a local machine.
- All **user roles** referenced in your definition's `AuthorisationCaseField`, `AuthorisationCaseEvent`, `AuthorisationCaseType`, and `AuthorisationComplexType` sheets must already exist in the definition store. If they do not, the import will fail with a role-not-found error. See [Add missing roles](#add-missing-roles-before-import) below.

---

## Option A -- Upload via ccd-admin-web (manual / ad-hoc)

### Steps

1. Navigate to the admin-web URL for your AAT environment:
   ```
   https://ccd-admin-web.aat.platform.hmcts.net
   ```
   <!-- DIVERGENCE: Confluence (page 679641313) lists the old internal URL https://ccd-admin-web-aat.service.core-compute-aat.internal/import. Source (charts/ccd-admin-web/values.yaml) shows the current ingress is ccd-admin-web.{{ .Values.global.environment }}.platform.hmcts.net. Source wins. -->

2. Sign in with your IDAM credentials. The app redirects to IDAM's OAuth2 login page; on success it sets an `httpOnly` cookie.

3. From the home page, click **Import Case Definition** (route `GET /import`). The page shows the last import audit history fetched from `definition-store /api/import-audits` (`importDefinition.ts:24,79`).

4. Click **Choose file** and select your `.xlsx` definition file. The file must be:
   - `.xls` or `.xlsx` extension -- any other type is rejected by multer before the file is sent (`importDefinition.ts:14`).
   - 8 MB or smaller -- the limit was reduced from 10 MB for compliance (`importDefinition.ts:20`).

5. Click **Submit**. The form `POST /import` fires.
   - On success: the text **"Case Definition data successfully imported"** is displayed above the file chooser, and the import audit table gains a new row with your jurisdiction, case-type references, and a timestamp.
   - On error: an error banner appears. The message is sourced directly from `definition-store`'s response body (`importDefinition.ts:57-67`). See [Troubleshooting](#troubleshooting) below.

### Verify

- After upload, the import audit table at `GET /import` gains a new row with your username, jurisdiction, and case-type references.
- Navigate to a case list for the updated case type in ExUI and confirm the new fields or events are visible.

---

## Option B -- Pipeline upload (automated / CI)

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

## Add missing roles before import

If your definition references roles that do not yet exist in the definition store, the import will fail. You have two options:

### Via admin-web UI

1. In `ccd-admin-web`, click **Manage User Roles** from the top navigation.
2. Search the page (Ctrl-F) for the role you need. If it already exists, no action is needed.
3. If the role does not exist, click the green **Create User Role** button.
4. Enter the role name in the **User Role** field. Select a **Security Classification** (`PUBLIC`, `PRIVATE`, or `RESTRICTED`). Default is `PUBLIC`.
5. Click **Create**.

### Via API (curl)

```bash
curl -X PUT \
  "${DEFINITION_STORE_URL}/api/user-role" \
  -H "Authorization: Bearer ${IDAM_TOKEN}" \
  -H "ServiceAuthorization: ${S2S_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"role":"caseworker-myservice","security_classification":"PUBLIC"}'
```

The `PUT /api/user-role` endpoint creates the role if it does not exist, or updates it if it does (`UserRoleController.java:46-61`). The `POST /api/user-role` variant always creates (returns 201).

> **Important**: IDAM roles are **case-sensitive** and the convention is **lowercase**. A role like `Caseworker-test` will not match `caseworker-test`.
<!-- CONFLUENCE-ONLY: case-sensitivity detail from Confluence page 1063059491, not explicitly validated in source code but consistent with IDAM behaviour -->

---

## What happens on import

The import pipeline inside `ImportServiceImpl` (`ImportServiceImpl.java:178`) runs in order:

1. `SpreadsheetParser.parse()` -- reads all xlsx tabs into `Map<String, DefinitionSheet>` keyed by exact sheet name (`SpreadsheetParser.java`). Sheet names must match the `SheetName` enum exactly (e.g. `"AuthorisationCaseField"`, `"WorkBasketInputFields"`); a mismatch throws `MapperException`.
2. `SpreadsheetValidator.validate()` -- structural checks: exactly one Jurisdiction row, at least one CaseType row, required sheets and columns present (`SpreadsheetValidator.java:43`).
3. Ordered pipeline: Jurisdiction -> Field types -> Metadata fields -> Case types (domain validation via `CaseTypeService.createAll`) -> UI layouts -> User profiles (`ImportServiceImpl.java:192-346`).
4. Optional sheets parsed after core: Banner, RoleToAccessProfiles, SearchCriteria, SearchParty, Welsh translations, and others.
5. `DefinitionImportedEvent` published -- triggers ES mapping upsert. If `reindex=false` (the default), `HighLevelCCDElasticClient.upsertMapping()` merges the new mapping into the current index. If the index does not exist yet, it is created as `<caseTypeId>_cases-000001` (`ElasticDefinitionImportListener.java:69`).
6. Raw `.xlsx` is stored in Azure Blob via `FileStorageService` (`ProcessUploadServiceImpl.java`).

---

## Promotion to production

For production uploads, the process is more controlled:

1. Complete all testing and QA approval in AAT/Demo.
2. Raise a JIRA ticket on the **RDM** project (or clone an existing one) attaching the definition file.
3. The CDM team (or CFT L2 support) performs the production import via `ccd-admin-web.platform.hmcts.net`.
4. QA approval must be confirmed on the ticket before the upload proceeds.
5. If multiple definition files are involved, any ordering constraints must be stated on the ticket.
<!-- CONFLUENCE-ONLY: not verified in source -->

---

## Troubleshooting

### "Wrong file type" or "File too large"

multer rejects the file before it reaches the store. Ensure the file is `.xls`/`.xlsx` and under 8 MB. The error is stored in `req.session.error` and shown on the import page after a 302 redirect (`importDefinition.ts:29-33`).

### 401 Unauthorised

- Via UI: admin-web clears the `accessToken` cookie and renders an error page. Navigate back to the home page to trigger re-authentication.
- Via API: your IDAM bearer token has expired or the S2S token lease has expired. Re-request both tokens.

### 403 Forbidden -- "You are not authorised"

Your IDAM account lacks the `ccd-import` role (or a role in the comma-separated `security.roles_whitelist`, default value `"ccd-import"`, `config/default.yaml:16`). The whitelist is split on commas (`roles-based-authorizer.ts:7`). Ask your team's access administrator to grant the role in AAT IDAM.

### 400 / 422 from definition store -- validation error

The error message is sourced from `definition-store`'s response body (`import-service.ts:23-28`). Common causes:

| Symptom | Likely cause |
|---|---|
| "A definition must contain a ... sheet" | An expected xlsx tab is missing or named incorrectly. Check against `SheetName` enum. |
| "retainHiddenValue requires showCondition" | `CaseEventToFields` has `retainHiddenValue=Y` but no `ShowCondition`. |
| "Invalid CRUD string" | An Authorisation sheet has a value outside `[CRUDcrud]` in the CRUD column. |
| Access profile / role not found | A CRUD row references an access profile not present in `RoleToAccessProfiles` sheet or a role not registered in the definition store. **Fix**: add the role via Manage User Roles or `PUT /api/user-role` before retrying. |
| "OtherCaseReference is not a valid path" | `SearchCriteria` sheet has a dot-notation value that does not resolve to a real field. |
| Role capitalisation mismatch | Roles are case-sensitive. `Caseworker-test` is not the same as `caseworker-test`. Convention is all lowercase. |
| Field IDs not found | A field referenced in `CaseEventToFields`, `SearchInputFields`, or layout sheets is not defined on the `CaseField` tab. |
| FixedList / ComplexType not found | `FieldTypeParameter` references a list or complex type not defined on its respective tab. |

### ElasticSearch error on field type change

If you change a field's type (e.g. `Number` to `Text`), ES rejects the mapping update because it cannot change an existing field's type. The import fails with:

```
ElasticSearch initialisation exception: ... mapper [data.field.path] of different type
```

**Note**: Some type changes are safe (e.g. `Text` to `TextArea`) because they map to the same ES type. Only radical changes (e.g. `Number` to `Text`) trigger this error.

**Resolution for AAT/test environments**:

1. Delete the ES index for the affected case type (requires bastion access -- see below).
2. Re-import the definition immediately after deletion.

**Detailed ES index deletion procedure (AAT)**:

1. Request JIT access for Non-Production Bastion via <https://myaccess.microsoft.com/>.
2. Ensure F5 VPN is connected; login via `az login`.
3. SSH into the bastion: `ssh bastion-dev-nonprod.platform.hmcts.net`
4. List indices: `curl 'http://<ES-IP>:9200/_cat/indices?v' | grep <your-service>`
5. Delete the index: `curl --request DELETE 'http://<ES-IP>:9200/<index-name>'`
6. Immediately upload the definition via admin-web: `https://ccd-admin-web.aat.platform.hmcts.net/import`
7. Steps 5-6 may need repeating quickly due to a race condition where the old template re-creates before import completes.
<!-- CONFLUENCE-ONLY: not verified in source -->

**Alternative**: use the admin-web **Elasticsearch** page (`/elasticsearch`) to trigger a reindex via the UI, or pass `reindex=true` on the API import call.

### ES index not updated after import

If `elasticsearch.failImportIfError=false` (asynchronous listener is active), ES mapping errors do not fail the import. Check definition-store logs for ES errors. Pass `reindex=true` to force a full index rebuild on the next import.

---

## Environment URLs

| Environment | Admin-web URL |
|---|---|
| AAT | `https://ccd-admin-web.aat.platform.hmcts.net` |
| Demo | `https://ccd-admin-web.demo.platform.hmcts.net` |
| Production | `https://ccd-admin-web.platform.hmcts.net` |

The URL pattern is `ccd-admin-web.{environment}.platform.hmcts.net` (derived from the Helm chart ingress: `charts/ccd-admin-web/values.yaml`). Older Confluence documentation references internal URLs like `ccd-admin-web-aat.service.core-compute-aat.internal` -- these are no longer the primary ingress.

For issues or questions, use the **#cdm_ps_requests** Slack channel.

---

## See also

- [`reference/definition-spreadsheet.md`](../reference/definition-spreadsheet.md) -- sheet-by-sheet column reference
- [`explanation/definition-import.md`](../explanation/definition-import.md) -- detailed explanation of the import pipeline internals
- [`explanation/case-type-model.md`](../explanation/case-type-model.md) -- how case types, events, and fields relate
- [`reference/glossary.md`](../reference/glossary.md) -- access profile, CRUD, S2S token
