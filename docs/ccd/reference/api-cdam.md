---
topic: documents-and-cdam
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentAmApiClient.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentUtils.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseDocumentController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/search/CaseDocumentsMetadata.java
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/Service.java
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/CftlibExec.java
  - rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/LibRunner.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# API: CDAM (Case Document Access Management)

## TL;DR

- CDAM (`ccd-case-document-am-api`) is the document storage gateway — it controls upload, access tokens, and retrieval of case documents.
- Documents in case data carry `document_url`, `document_binary_url`, and an optional `document_hash` field.
- CCD data-store calls CDAM via Feign client (`CaseDocumentAmApiClient`) to register newly attached documents via `PATCH /cases/documents/attachToCase`.
- A hash token in `document_hash` prevents URL-swapping attacks; data-store validates and strips it before persisting case data.
- Auth: S2S (`ServiceAuthorization`) is required on all CDAM calls; user JWT (`Authorization`) is forwarded for retrieval.
- In local dev (cftlib), CDAM runs in-process on `http://localhost:4455`.

## Endpoints

### Document retrieval from CCD data-store

| Method | Path | Controller | Notes |
|--------|------|------------|-------|
| `GET` | `/cases/{caseId}/documents/{documentId}` | `CaseDocumentController.getCaseDocumentMetadata()` | Returns document metadata; enforces case-level RBAC |

Source: `CaseDocumentController.java:59`.

### CDAM endpoints called by data-store (Feign)

| Method | Path | Feign method | Purpose |
|--------|------|--------------|---------|
| `PATCH` | `/cases/documents/attachToCase` | `CaseDocumentAmApiClient.applyPatch()` | Register new/modified documents against a case |

Source: `CaseDocumentAmApiClient.applyPatch()` at `CaseDocumentAmApiClient.java:31-49`, `CaseDocumentService.java:104`.

<!-- TODO: research note insufficient for CDAM-side upload and hash-token issue endpoints — CaseDocumentAmApiClient notes only cover the applyPatch call. -->

## Document field shape

Document complex-type fields in case data contain three JSON keys:

| Field | Constant | Description |
|-------|----------|-------------|
| `document_url` | `CaseDocumentUtils.DOCUMENT_URL` | CDAM URL for document metadata |
| `document_binary_url` | `CaseDocumentUtils.DOCUMENT_BINARY_URL` | URL for binary download (note: constant is set to `"document_url"` — likely a copy-paste bug at `CaseDocumentUtils.java:32`) |
| `document_hash` | `CaseDocumentUtils.DOCUMENT_HASH` | Hash token; stripped before storage |

Source: `CaseDocumentUtils.java:31-33`.

## Hash-token lifecycle

1. A callback response includes `document_hash` on new document fields.
2. `CaseDocumentService.extractDocumentHashToken(db, preCb, postCb)` walks DB snapshot, pre-callback, and post-callback trees to detect new or modified documents (`CaseDocumentService.java:51-79`).
3. `verifyNoTamper()` rejects any callback response that changed an existing hash value — this prevents URL-swapping attacks (`CaseDocumentService.java:131-138`).
4. New documents are registered with CDAM via `applyPatch(CaseDocumentsMetadata)` (`CaseDocumentService.java:104`).
5. `stripDocumentHashes()` removes `document_hash` from case data before it is stored or returned to clients (`CaseDocumentService.java:41-48`). The `case_data` table therefore never holds hash values.

## Auth model

| Header | Value | Required |
|--------|-------|----------|
| `ServiceAuthorization` | S2S token (service-to-service) | Yes — all CDAM calls |
| `Authorization` | User JWT | Yes — document retrieval |

Auth headers are sourced from `SecurityUtils.authorizationHeaders()`. CDAM Feign exceptions map to `ServiceException` (`CaseDocumentAmApiClient.java:46-57`).

## Feature flags

Three flags in data-store govern CDAM integration behaviour. Partial enablement creates inconsistent results.

| Flag | Effect when false |
|------|-------------------|
| `attachDocumentEnabled` | `applyPatch` call is skipped; documents not registered with CDAM (`CaseDocumentService.java:92`) |
| `documentHashCloneEnabled` | `document_hash` is not stripped on outbound data (`CaseDocumentService.java:45`) |
| `documentHashCheckingEnabled` | Missing hash tokens are not validated (`CaseDocumentService.java:109`) |

## Local development (cftlib)

CDAM runs in-process alongside CCD as `Service.ccdCaseDocumentAmApi` (`Service.java:13`), main class `uk.gov.hmcts.reform.ccd.documentam.Application`. The env var `CASE_DOCUMENT_AM_URL` is set to `http://localhost:4455` by both `CftlibExec.java:46` and `LibRunner.java:107`.

## Gotchas

- `DOCUMENT_BINARY_URL` constant value is `"document_url"` not `"document_binary_url"` — possible copy-paste bug (`CaseDocumentUtils.java:32`).
- Hashes are stripped before DB storage; only CDAM holds the authoritative token mapping.
- Hearing recordings are excluded from hash processing (`CaseDocumentUtils.java:83`).
- All three feature flags must be enabled together for consistent behaviour.

## See also

- [`documents-and-cdam explanation`](../explanation/documents-and-cdam.md) — conceptual overview of the document model
- [`CaseDocumentController`](../../../apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseDocumentController.java) — REST controller source
- [`CaseDocumentService`](../../../apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentService.java) — hash-token logic source
