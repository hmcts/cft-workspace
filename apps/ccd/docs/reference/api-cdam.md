---
topic: documents-and-cdam
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentAmApiClient.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentUtils.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseDocumentController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/search/CaseDocumentsMetadata.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/domain/DocumentHashToken.java
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/Service.java
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/CftlibExec.java
  - rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/LibRunner.java
  - platops/cnp-flux-config:apps/ccd/ccd-case-document-am-api/prod.yaml
status: confluence-augmented
confluence:
  - id: "1456373814"
    title: "GET /cases/documents/{documentId}/token"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1456373800"
    title: "Case Document & CCD - Data Store Design"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1945644195"
    title: "CDAM Architecture"
    last_modified: "2026-02-27"
    space: "RTA"
  - id: "1915164271"
    title: "Secure doc store (CDAM) onboarding and gotchas"
    last_modified: "unknown"
    space: "FR"
  - id: "1456373795"
    title: "Case Document Access Management LLD"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1953044768"
    title: "CCD Case Document Access Management (CDAM) onboarding"
    last_modified: "unknown"
    space: "DATS"
confluence_checked_at: "2026-04-29T00:00:00Z"
last_reviewed: 2026-04-29T00:00:00Z
---

# API: CDAM (Case Document Access Management)

## TL;DR

- CDAM (`ccd-case-document-am-api`) is the document storage gateway — it controls upload, access tokens, and retrieval of case documents via six REST endpoints.
- Documents uploaded via CDAM are stored immediately (before the CCD event completes) with a short TTL; the TTL is removed when the event successfully attaches documents.
- Hash tokens (SHA-256 + vault secret) prevent URL-swapping attacks; CCD data-store validates and strips them before persisting case data.
- Auth: S2S (`ServiceAuthorization`) + `service_config.json` whitelisting on all CDAM calls; user JWT (`Authorization`) additionally required for download.
- Callers must be listed in `CASE_DOCUMENT_S2S_AUTHORISED_SERVICES` (flux config) and ExUI must enable CDAM via LaunchDarkly per case type.
- In local dev (cftlib), CDAM runs in-process on `http://localhost:4455`.

## CDAM REST endpoints

The following endpoints are exposed by `ccd-case-document-am-api` itself (port 4455 locally, Azure-hosted in deployed environments):

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/cases/documents` | Upload document(s) with metadata | S2S (by microservice ID) |
| `PATCH` | `/cases/documents/attachToCase` | Register documents against a case (called by data-store) | S2S (ccd_data only) |
| `GET` | `/cases/documents/{documentId}/token` | Generate hash token for a document | S2S (bulk_scan only) |
| `GET` | `/cases/documents/{documentId}` | Retrieve document metadata | S2S + User R permission |
| `GET` | `/cases/documents/{documentId}/binary` | Download document binary | S2S + User R permission |
| `PATCH` | `/cases/documents/{documentId}` | Update document metadata | S2S (by microservice ID) |
| `DELETE` | `/cases/documents/{documentId}` | Delete document | S2S (by microservice ID) |

<!-- CONFLUENCE-ONLY: CDAM endpoint table from LLD page 1456373800 — full API source not in this workspace -->

### Hash-token generation endpoint

`GET /cases/documents/{documentId}/token`

Returns the SHA-256 hash token for a given document. Currently scoped to the bulk-scan orchestrator service (service segregation enforced).

**Parameters:**

| Name | Location | Type | Required |
|------|----------|------|----------|
| `documentId` | path | UUID string | Yes |
| `Authorization` | header | Bearer user token | Yes |
| `ServiceAuthorization` | header | Bearer S2S token | Yes |

**Success response (200):**

```json
{
  "hashToken": "5dbedb79c7793a21f1cb7402e6b8d1659b2cfdfa4b80418e336914644abde1fb"
}
```

**Error response (404):**

```json
{
  "errorCode": 404,
  "errorMessage": "Not Found",
  "errorDescription": "Resource not found 00000000-0000-0000-0000-000000000000",
  "timeStamp": "14-07-2021 18:34:23.911"
}
```

Source: Confluence page "GET /cases/documents/{documentId}/token" (RCCD space).

<!-- CONFLUENCE-ONLY: hash-token endpoint detail from page 1456373814 — CDAM source not in workspace -->

### Upload endpoint

`POST /cases/documents`

Accepts multipart form data with the document binary and metadata headers (`jurisdictionId`, `caseTypeId`, `classification`). Returns document URLs plus the generated hash token.

The upload flow:

1. ExUI/service sends document + metadata to CDAM.
2. CDAM persists to doc-store with a short TTL (configurable, default ~10 minutes).
3. CDAM generates a hash token using SHA-256 over `(caseTypeId, jurisdictionId, documentId)` + a secret key from the CCD vault.
4. Returns the `StoredDocumentHalResource` envelope extended with `hashToken`.

<!-- CONFLUENCE-ONLY: upload endpoint flow detail from LLD page 1456373800 — CDAM source not in workspace -->

## CCD data-store endpoints (document-related)

### Document metadata retrieval

| Method | Path | Controller | Notes |
|--------|------|------------|-------|
| `GET` | `/cases/{caseId}/documents/{documentId}` | `CaseDocumentController.getCaseDocumentMetadata()` | Returns document metadata with permissions; enforces case-level RBAC |

Source: `CaseDocumentController.java:59`.

### CDAM Feign call (data-store to CDAM)

| Method | Path | Feign method | Purpose |
|--------|------|--------------|---------|
| `PATCH` | `/cases/documents/attachToCase` | `CaseDocumentClientApi.patchDocument()` | Register new/modified documents against a case |

The data-store invokes this via `CaseDocumentAmApiClient.applyPatch()` which delegates to the `CaseDocumentClientApi` Feign interface (`uk.gov.hmcts.reform.ccd.document.am.feign.CaseDocumentClientApi`).

Source: `CaseDocumentAmApiClient.java:31-49`, `CaseDocumentService.java:88-105`.

## Document field shape

Document complex-type fields in case data contain these JSON keys:

| Field | Constant | Description |
|-------|----------|-------------|
| `document_url` | `CaseDocumentUtils.DOCUMENT_URL` | CDAM URL for document metadata |
| `document_binary_url` | `CaseDocumentUtils.DOCUMENT_BINARY_URL` | URL for binary download |
| `document_hash` | `CaseDocumentUtils.DOCUMENT_HASH` | Hash token; stripped before storage |
| `upload_timestamp` | `CaseDocumentUtils.UPLOAD_TIMESTAMP` | Timestamp of upload |

Source: `CaseDocumentUtils.java:31-34`.

> **Bug**: `DOCUMENT_BINARY_URL` constant value is `"document_url"` (not `"document_binary_url"`). This means `getDocumentId()` falls through to `DOCUMENT_URL` in practice. See `CaseDocumentUtils.java:32`.

## Hash-token lifecycle

1. User uploads a document via CDAM `POST /cases/documents` — CDAM generates a hash token (SHA-256 over document metadata + vault secret) and returns it with the document URL.
2. ExUI includes `document_hash` in the case event submission to CCD data-store.
3. `CaseDocumentService.extractDocumentHashToken(db, preCb, postCb)` walks the DB snapshot, pre-callback, and post-callback data trees to detect new or modified documents (`CaseDocumentService.java:51-80`).
4. `verifyNoTamper()` rejects any callback response that changed an existing hash value — prevents URL-swapping attacks (`CaseDocumentService.java:131-138`).
5. `validate()` checks that all new documents have non-null hash tokens (when `documentHashCheckingEnabled` is true) — throws `ValidationException` if any are missing (`CaseDocumentService.java:108-120`).
6. `attachCaseDocuments()` sends new documents to CDAM via `PATCH /cases/documents/attachToCase` with `CaseDocumentsMetadata` payload. CDAM validates the hash, bulk-updates doc-store metadata (adds caseId), and removes the TTL (`CaseDocumentService.java:88-105`).
7. `stripDocumentHashes()` removes `document_hash` from case data before it is stored or returned to clients (`CaseDocumentService.java:41-48`). The `case_data` table never holds hash values.

### CaseDocumentsMetadata payload

```json
{
  "caseId": "1234567890123456",
  "caseTypeId": "FinancialRemedyMVP2",
  "jurisdictionId": "DIVORCE",
  "documentHashTokens": [
    { "id": "69ee67e7-7177-4b42-b005-088638f95784", "hashToken": "5dbedb79..." }
  ]
}
```

Source: `CaseDocumentsMetadata.java`, `DocumentHashToken.java`.

## Auth model

### CDAM-side auth

Two levels of authorisation:

1. **Service-level (S2S)**: Every call requires a valid `ServiceAuthorization` header. CDAM checks the calling service ID against `service_config.json` which maps `(serviceId, jurisdictionId, caseTypeId)` to allowed permissions. The S2S whitelist is also enforced at infrastructure level via `CASE_DOCUMENT_S2S_AUTHORISED_SERVICES` in flux config.

2. **User-level**: Document download (`GET /cases/documents/{documentId}` and `.../binary`) additionally requires a valid `Authorization` (user JWT). CDAM calls back to CCD data-store `GET /cases/{caseId}/documents/{documentId}` to verify the user has Read permission on the case-field containing the document.

| Header | Value | Required for |
|--------|-------|--------------|
| `ServiceAuthorization` | S2S token | All CDAM calls |
| `Authorization` | User JWT | Download endpoints + hash-token generation |

### Data-store side

Auth headers are sourced from `SecurityUtils.authorizationHeaders()`. CDAM Feign exceptions map to `DocumentTokenException` (403), `BadSearchRequest` (400), `ResourceNotFoundException` (404), or generic `ServiceException` (`CaseDocumentAmApiClient.java:40-58`).

## Service configuration and onboarding

To enable CDAM for a new service/case type:

1. **S2S whitelist**: Add the service's S2S name to `CASE_DOCUMENT_S2S_AUTHORISED_SERVICES` in `cnp-flux-config/apps/ccd/ccd-case-document-am-api/<env>.yaml`.
2. **service_config.json**: Configure permitted case types, jurisdiction, and permissions in `ccd-case-document-am-api`'s `service_config.json`.
3. **LaunchDarkly**: ExUI must enable CDAM for the case type via LD flag — this ensures documents uploaded during manage-case event callbacks persist correct metadata.
4. **Service code**: The calling service must use CDAM endpoints (not direct EM/doc-store calls), passing the correct case type that matches the `service_config.json` entry.

<!-- CONFLUENCE-ONLY: onboarding steps from pages 1915164271 and 1953044768 — not verified in source -->

## Feature flags

Three flags in data-store govern CDAM integration behaviour. All three must be enabled together for consistent operation.

| Flag | Effect when false |
|------|-------------------|
| `attachDocumentEnabled` | `applyPatch` call is skipped; documents not registered with CDAM (`CaseDocumentService.java:92`) |
| `documentHashCloneEnabled` | `document_hash` is not stripped on outbound data (`CaseDocumentService.java:45`) |
| `documentHashCheckingEnabled` | Missing hash tokens are not validated (`CaseDocumentService.java:109`) |

## TTL (Time-To-Live) mechanism

Documents uploaded via CDAM initially have a short TTL (configurable, approximately 10 minutes). This means:

- If the CCD event completes successfully, CDAM removes the TTL when `PATCH /cases/documents/attachToCase` succeeds — the document becomes permanent.
- If the CCD event fails or is abandoned, the document auto-deletes from doc-store after TTL expiry — no orphaned documents.

<!-- CONFLUENCE-ONLY: TTL detail from LLD page 1456373800 — CDAM source not in workspace -->

## MOVING_CASE_TYPES

The `MOVING_CASE_TYPES` environment variable in CDAM's flux config lists case types that have been migrated to CDAM. This is separate from the S2S whitelist and controls which case types CDAM processes. Current prod list includes: `CMC_ExceptionRecord`, `FINREM_ExceptionRecord`, `SSCS_ExceptionRecord`, `PROBATE_ExceptionRecord`, `PUBLICLAW_ExceptionRecord`, `DIVORCE_ExceptionRecord`, `DIVORCE`, `FinancialRemedyMVP2`, `FinancialRemedyContested`, all Employment Tribunal regions, `Benefit`, `Asylum`, and others.

Source: `cnp-flux-config/apps/ccd/ccd-case-document-am-api/prod.yaml`.

## Local development (cftlib)

CDAM runs in-process alongside CCD as `Service.ccdCaseDocumentAmApi` (`Service.java:13`), main class `uk.gov.hmcts.reform.ccd.documentam.Application`. The env var `CASE_DOCUMENT_AM_URL` is set to `http://localhost:4455` by both `CftlibExec.java:46` and `LibRunner.java:107`.

## Architecture note

CDAM exists as a separate microservice for historical/organisational reasons (CCD team resource constraints; Evidence Management insisted DocStore remain generic). The architecturally-preferred design is to integrate CDAM functionality directly into CCD data-store with a dedicated blob store, eliminating the DocStore intermediary. This is the recommended long-term direction per the RTA architecture team.

<!-- CONFLUENCE-ONLY: architectural rationale from page 1945644195 — represents current team position -->

## Gotchas

- `DOCUMENT_BINARY_URL` constant value is `"document_url"` not `"document_binary_url"` — confirmed bug (`CaseDocumentUtils.java:32`).
- Hashes are stripped before DB storage; only CDAM holds the authoritative token mapping.
- Hearing recordings are excluded from hash processing (`CaseDocumentUtils.java:83` — URLs containing `hearing-recordings` are filtered out).
- All three feature flags must be enabled together for consistent behaviour.
- Documents from exception-record-to-case conversion may retain the wrong case type metadata, causing 403 on retrieval (known incident from FinRem CDAM enablement).
- Intermittent 404s have been observed during event processing when CDAM is enabled (CCD-7418 — investigation ongoing).
- The `permanent` parameter on `DELETE /cases/documents/{documentId}` controls hard vs soft delete — enabling the wrong code path can cause irreversible data loss.

## See also

- [`documents-and-cdam explanation`](../explanation/documents-and-cdam.md) — conceptual overview of the document model
- [`CaseDocumentController`](../../../apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseDocumentController.java) — REST controller source
- [`CaseDocumentService`](../../../apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentService.java) — hash-token logic source
- [CDAM Swagger](https://hmcts.github.io/reform-api-docs/swagger.html?url=https://hmcts.github.io/reform-api-docs/specs/ccd-case-document-am-api.json) — published API spec
