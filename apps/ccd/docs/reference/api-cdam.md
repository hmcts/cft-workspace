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
  - ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/controller/endpoints/CaseDocumentAmController.java
  - ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/controller/advice/ErrorResponse.java
  - ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/controller/advice/CaseDocumentControllerAdvice.java
  - ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/model/GeneratedHashCodeResponse.java
  - ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/service/impl/DocumentManagementServiceImpl.java
  - ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/client/dmstore/DocumentStoreClient.java
  - ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/ApplicationParams.java
  - ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/util/ApplicationUtils.java
  - ccd-case-document-am-api:src/main/resources/application.yaml
  - ccd-case-document-am-api:src/main/resources/service_config.json
  - ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/model/AuthorisedServices.java
  - rpx-xui-webapp:src/app/app.constants.ts
  - rpx-xui-webapp:src/app/services/ccd-config/ccd-case.config.ts
  - rpx-xui-webapp:src/assets/config/config.json
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
last_reviewed: 2026-08-20T00:00:00Z
title: 'API: CDAM (Case Document Access Management)'
diataxis: reference
product: ccd
sources_sha:
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentAmApiClient.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentService.java": "e3fca30b92506584a590ae203811d60202129d2d"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentUtils.java": "e3fca30b92506584a590ae203811d60202129d2d"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseDocumentController.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/search/CaseDocumentsMetadata.java": "40ec50b801024f957da5ad60dc97b4134006a34f"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/domain/DocumentHashToken.java": "40ec50b801024f957da5ad60dc97b4134006a34f"
  "rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/Service.java": "732ec28c7a68359452f0e767b5bd605d10608e61"
  "rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/CftlibExec.java": "7e12e7008bf04be9b6353b576c174eb26191b561"
  "rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/LibRunner.java": "f64ba45d798a92139deb311aff036a709f8a8dd3"
  "platops/cnp-flux-config:apps/ccd/ccd-case-document-am-api/prod.yaml": "51608cee72db3e528bf2ac2da20e3ef6e6b80f5f"
  "ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/controller/endpoints/CaseDocumentAmController.java": "cf06c5f0618c9dc1bcdc5c636d899ae2500ef2af"
  "ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/controller/advice/ErrorResponse.java": "a3a5d5b6428a627427b24e16900c32e0981c2488"
  "ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/controller/advice/CaseDocumentControllerAdvice.java": "ffcde0d9598de941886406b0933faab07523d58f"
  "ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/model/GeneratedHashCodeResponse.java": "d54aae25a8de4bcfc1c8c49c2542522f0b14180c"
  "ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/service/impl/DocumentManagementServiceImpl.java": "cf06c5f0618c9dc1bcdc5c636d899ae2500ef2af"
  "ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/client/dmstore/DocumentStoreClient.java": "d742391c5b190ec96fce266f6568866505c12b82"
  "ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/ApplicationParams.java": "db0396da539218528933c0482046bab08a5ef58e"
  "ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/util/ApplicationUtils.java": "d54aae25a8de4bcfc1c8c49c2542522f0b14180c"
  "ccd-case-document-am-api:src/main/resources/application.yaml": "116d99f942a127dd17a3f08d8f3622e7006dc5cc"
  "ccd-case-document-am-api:src/main/resources/service_config.json": "5e9a44cd94d3808723ba7080618af2d3348928d9"
  "ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/model/AuthorisedServices.java": "e893297272ba2a0bf3e742f4a65cfa6083226e9d"
  "rpx-xui-webapp:src/app/app.constants.ts": "2e29d1848469082fd2b49a33461aefef7c37d779"
  "rpx-xui-webapp:src/app/services/ccd-config/ccd-case.config.ts": "eed279a4dd5502643063241d86c2911799acac38"
  "rpx-xui-webapp:src/assets/config/config.json": "eed279a4dd5502643063241d86c2911799acac38"
---

# API: CDAM (Case Document Access Management)

## TL;DR

- CDAM (`ccd-case-document-am-api`) is the document storage gateway — it controls upload, access tokens, and retrieval of case documents via six REST endpoints.
- Documents uploaded via CDAM are stored immediately (before the CCD event completes) with a TTL — **1 day by default**, not minutes; the TTL is cleared when the event successfully attaches documents.
- Hash tokens (SHA-256, salted with the S2S TOTP secret) prevent URL-swapping attacks; CCD data-store validates and strips them before persisting case data. A token is **not stable across the attach boundary** — the caseId is part of the digest input once known.
- Auth: S2S (`ServiceAuthorization`) + `service_config.json` whitelisting on all CDAM calls; user JWT (`Authorization`) additionally required for download.
- Callers must be listed in `CASE_DOCUMENT_S2S_AUTHORISED_SERVICES` (flux config). ExUI's LaunchDarkly flag is an *exclusion* list — secure mode is on for every case type unless the case type is named in `mc-cdam-exclusion-list`.
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
| `PATCH` | `/cases/documents/{documentId}` | Set the document's TTL — nothing else; body is `UpdateTtlRequest` (`CaseDocumentAmController.java:261-285`) | S2S (by microservice ID) |
| `DELETE` | `/cases/documents/{documentId}` | Delete document | S2S (by microservice ID) |

All seven rows are confirmed against `CaseDocumentAmController` at `origin/master` — the mappings
are declared at `CaseDocumentAmController.java:85-86` (metadata), `:143-144` (binary),
`:214-215` (upload), `:261-262` (patch document), `:308-309` (attachToCase), `:353-354` (delete)
and `:385-386` (token). `DELETE` additionally takes a `permanent` query parameter, default
`false` (`:367`) — the hard-delete switch behind the FinRem incident described in
[Documents and CDAM](../explanation/documents-and-cdam.md#onboarding-gotchas).

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

The 200 body is a single `hashToken` string (`GeneratedHashCodeResponse.java:11`).

**Error response (404):**

```json
{
  "status": 404,
  "error": "Resource not found 00000000-0000-0000-0000-000000000000",
  "exception": "uk.gov.hmcts.reform.ccd.documentam.exception.ResourceNotFoundException",
  "timestamp": "14-07-2021 18:34:23.911",
  "path": "/cases/documents/00000000-0000-0000-0000-000000000000/token"
}
```

Every CDAM error — from any endpoint — comes back in this one envelope: `status`, `error`
(the exception's localised message), `exception` (the Java class name), `timestamp` formatted
`dd-MM-yyyy HH:mm:ss.SSS`, and the request `path`
(`ErrorResponse.java:10-18`, `CaseDocumentControllerAdvice.java:166-179`).

<!-- DIVERGENCE: Confluence 1456373814 documents the error body as {errorCode, errorMessage, errorDescription, timeStamp}, and 1958303773 (v21) repeats that shape. No such fields exist in CDAM today: ErrorResponse.java:10-18 defines status/error/exception/timestamp/path and every handler in CaseDocumentControllerAdvice funnels through errorDetailsResponseEntity (:166-179). The timestamp format in the Confluence example does still match getTimeStamp() (:162-164), so the pages look like an accurate record of an older CDAM release. Source wins. -->

### Upload endpoint

`POST /cases/documents`

Accepts multipart form data with the document binary and metadata headers (`jurisdictionId`, `caseTypeId`, `classification`). Returns document URLs plus the generated hash token.

The upload flow:

1. ExUI/service sends document + metadata to CDAM.
2. CDAM forwards to dm-store, **setting the TTL itself** on the multipart body: `ttl` = now + `documentTtlInDays` (`DocumentStoreClient.java:284`, `:295-298`; the streaming variant does the same at `:401`).
3. CDAM hashes each returned document and attaches a `hashToken` (`DocumentManagementServiceImpl.java:274-281`, `:307-330`).
4. Returns the dm-store document envelope extended with `hashToken`.

### What the hash token is actually over

`ApplicationUtils.generateHashCode()` is SHA-256 — note the comment above it in source says SHA-512, which is wrong; the `MessageDigest.getInstance` argument is `"SHA-256"` (`ApplicationUtils.java:15-18`).

The salt is **not** a dedicated document-hash secret: it is the S2S TOTP secret, injected as `@Value("${idam.s2s-auth.totp_secret}")` (`ApplicationParams.java:22-23`). Rotating the S2S TOTP secret therefore invalidates every previously issued hash token.

The digest input is a bare concatenation, and it has two forms (`DocumentManagementServiceImpl.java:211-223`):

| When | Input |
|---|---|
| No case id yet (upload) | `salt` + `documentId` + `jurisdictionId` + `caseTypeId` |
| Case id known (token endpoint) | `salt` + `documentId` + `caseId` + `jurisdictionId` + `caseTypeId` |

So **a document's hash token is not stable across its lifetime** — the value issued at upload is not the value the token endpoint returns once the document has a case id. Treat a hash token as a single-use credential for one attach or one download, not as an identifier to cache. At upload the document id is recovered by taking the last 36 characters of the dm-store self href rather than from a field (`:322-328`).

<!-- DIVERGENCE: LLD page 1456373800 describes the hash as being over (caseTypeId, jurisdictionId, documentId) with a generic CCD vault key. Source order is documentId → (caseId) → jurisdictionId → caseTypeId, the key is specifically idam.s2s-auth.totp_secret, and the LLD omits the caseId variant that makes the token unstable across attach. Source wins. -->

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

1. **S2S whitelist**: add the service's S2S name to `CASE_DOCUMENT_S2S_AUTHORISED_SERVICES`, which backs `idam.s2s-authorised.services` (`application.yaml:72-73`). Production sets it in `cnp-flux-config:apps/ccd/ccd-case-document-am-api/prod.yaml:17`; the in-repo default list applies only where the variable is unset.
2. **`service_config.json`**: add an entry giving the service's permitted `caseTypeId` list, `jurisdictionId` and `permissions`. This file is a **classpath** resource, bound through `@PropertySource(value = "classpath:service_config.json")` on `AuthorisedServices` (`AuthorisedServices.java:12-20`), so unlike step 1 it is not environment-overridable — onboarding a service needs a CDAM code change and release. Every document endpoint calls `checkServicePermission`, which resolves the caller's entry and rejects the call with `ForbiddenException` unless the case type, jurisdiction and requested permission all match (`DocumentManagementServiceImpl.java:350-370`, `:376-405`). `"*"` is accepted as a wildcard in either field (`:381`, `:392`).
3. **LaunchDarkly**: check the case type is *not* in ExUI's `mc-cdam-exclusion-list` flag (`app.constants.ts:10`, registered at `ccd-case.config.ts:45-49`).
4. **Service code**: the calling service must use CDAM endpoints rather than dm-store directly, and must send the case type its `service_config.json` entry names — `validateCaseTypeId` compares the submitted `caseTypeId` against that list (`DocumentManagementServiceImpl.java:376-386`).

<!-- DIVERGENCE: Confluence 1915164271 and 1953044768 describe step 3 as enabling CDAM for a case type by LaunchDarkly flag. The flag is an exclusion list (mc-cdam-exclusion-list, seeded from documentSecureModeCaseTypeExclusions in rpx-xui-webapp:src/assets/config/config.json:18): secure mode is on by default and listing a case type opts it out. Source wins. -->

## Feature flags

Three flags in data-store govern CDAM integration behaviour. All three must be enabled together for consistent operation.

| Flag | Effect when false |
|------|-------------------|
| `attachDocumentEnabled` | `applyPatch` call is skipped; documents not registered with CDAM (`CaseDocumentService.java:92`) |
| `documentHashCloneEnabled` | `document_hash` is not stripped on outbound data (`CaseDocumentService.java:45`) |
| `documentHashCheckingEnabled` | Missing hash tokens are not validated (`CaseDocumentService.java:109`) |

## TTL (Time-To-Live) mechanism

Documents uploaded via CDAM initially carry a TTL. **The default is 1 day, not minutes** — `documentTtlInDays: ${DOCUMENT_TTL_IN_DAYS:1}` (`application.yaml:81`, read via `ApplicationParams.java:19-20`). Deployments can shorten it with `DOCUMENT_TTL_IN_DAYS`, but the unit is whole days, so a sub-day TTL is not expressible without a code change.

CDAM sets the value on the upload itself rather than relying on a dm-store default: `getEffectiveTTL()` returns `now + documentTtlInDays` and is added to the multipart body as `ttl` (`DocumentStoreClient.java:284`, `:295-298`, and `:401` for the streaming path).

- If the CCD event completes successfully, CDAM clears the TTL when `PATCH /cases/documents/attachToCase` succeeds — the document becomes permanent. The clear is explicit, not an omission: CDAM sends a `null` TTL via a named constant, `private static final Date NULL_TTL = null`, in the `UpdateDocumentsCommand` it issues to dm-store (`DocumentManagementServiceImpl.java:56`, `:118-119`, `:168`).
- If the CCD event fails or is abandoned, the document auto-deletes from doc-store after TTL expiry — no orphaned documents. With the default that window is a day, so a failed event leaves the binary retrievable-by-id in dm-store for materially longer than the LLD implies.

<!-- DIVERGENCE: LLD page 1456373800 gives the TTL as "approximately 10 minutes". Source default is 1 day (DOCUMENT_TTL_IN_DAYS:1). Source wins. -->

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
