---
topic: supplementary-data
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/supplementarydata/AuthorisedSupplementaryDataUpdateOperation.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/supplementarydata/DefaultSupplementaryDataRepository.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/CaseDetailsEntity.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/supplementarydata/SupplementaryDataOperation.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPI.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Supplementary Data

## TL;DR

- A separate JSONB column on the case record, distinct from the main `data` column, used to store platform-level metadata that sits alongside case data but is not part of the case-type definition.
- Written and read exclusively by service accounts (S2S-gated); regular case GET responses do not include it.
- Supports three operations: `$set` (overwrite a path), `$inc` (atomic numeric increment), `$find` (read back specific paths).
- Endpoint: `POST /cases/{caseId}/supplementary-data` — returns HTTP 200 with the updated values.
- Not versioned or audited via the normal event history; changes do not trigger callbacks.

## What supplementary data is

Supplementary data is a dedicated `supplementary_data` JSONB column on the `case_data` table (`CaseDetailsEntity.java:94,135`). It is entirely separate from the `data` column that holds user-visible case fields defined in the case-type definition.

Its primary use is to allow platform services — search indexers, assignment engines, payment integrations — to attach structured metadata to a case without touching the event lifecycle or requiring definition changes. Common values stored here include HMCTSServiceId, case count references, and assignment counters.

## How it differs from case data

| Dimension | Case data (`data` column) | Supplementary data (`supplementary_data` column) |
|---|---|---|
| Schema | Defined in case-type definition | Free-form JSONB; no schema validation |
| Who writes | Caseworkers and solicitors via events | Service accounts only (S2S-gated) |
| Included in case GET | Yes | No — must be fetched explicitly |
| Event lifecycle | Every write is an audited event | No events; no callbacks |
| Versioned | Yes — full snapshot per event | No |
| Atomic increment | No | Yes — `$inc` operation |

## Writing supplementary data

Send `POST /cases/{caseId}/supplementary-data` (`CaseController.java:417`) with a `SupplementaryDataUpdateRequest` body:

```json
{
  "supplementary_data_updates": {
    "$set": {
      "HMCTSServiceId": "BBA3"
    },
    "$inc": {
      "orgs_assigned_users.OrgA": 1
    }
  }
}
```

- `$set` overwrites the value at the given JSONB path.
- `$inc` atomically increments a numeric value. The key must already exist and be numeric, or the operation fails at the query layer.
- Both operations can be combined in one request.

The request is validated by `SupplementaryDataUpdateRequestValidator` before execution (`CaseController.java:422`). `AuthorisedSupplementaryDataUpdateOperation` enforces the S2S/role check before delegating to `DefaultSupplementaryDataRepository` (`AuthorisedSupplementaryDataUpdateOperation.java:18-32`).

`DefaultSupplementaryDataRepository` selects a `SupplementaryDataQueryBuilder` implementation based on the operation enum (`DefaultSupplementaryDataRepository.java:64-70`). The response is wrapped in `SupplementaryDataResource` and returned HTTP 200 (`CaseController.java:428`).

## Reading supplementary data

Use the `$find` operation in the same endpoint, specifying the paths to retrieve. There is no dedicated GET endpoint.

Supplementary data is intentionally excluded from standard `GET /cases/{caseId}` responses. Callers that need it must request it explicitly.

## Decentralised cases

For decentralised case types, writes are routed to `POST /ccd-persistence/cases/{case-ref}/supplementary-data` on the owning service via `DelegatingSupplementaryDataUpdateOperation` (`ServicePersistenceAPI.java:52`). The interface contract is the same.

## Gotchas

- `$inc` requires an existing numeric value at the target path — calling it on a missing or non-numeric path will fail.
- Supplementary data changes are invisible to caseworkers browsing the UI; they appear in no audit trail.
- Only service accounts with a valid S2S token can write supplementary data. There is no caseworker role that grants write access.

## See also

- [`docs/ccd/explanation/case-data-model.md`](case-data-model.md) — how the main `data` column and case-type definition relate
- [`docs/ccd/reference/endpoints.md`](../reference/endpoints.md) — full endpoint reference including supplementary-data path
