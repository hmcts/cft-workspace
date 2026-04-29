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
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/std/SupplementaryDataUpdateRequest.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/std/CaseDataContent.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/std/validator/SupplementaryDataUpdateRequestValidator.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/DefaultEndpointAuthorisationService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/resource/SupplementaryDataResource.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1440497258"
    title: "Case Supplementary Data LLD"
    space: "RCCD"
    version: 129
  - id: "1525465594"
    title: "How To Guide - Global Search"
    space: "RCCD"
    version: 55
  - id: "1753715071"
    title: "CCD Configurationless Approach"
    space: "AM"
    version: 4
---

# Supplementary Data

## TL;DR

- A separate JSONB column on the case record (`supplementary_data`), distinct from `data`, for platform metadata not declared in the case-type definition. Properties added on-the-fly. Common contents: `HMCTSServiceId`, `orgs_assigned_users.<orgId>` counters.
- Three operators: `$set`, `$inc` (atomic, signed), `$find`. One level of dotted nesting max (`a.b`, not `a.b.c`).
- Update endpoint: `POST /cases/{caseId}/supplementary-data` (uses `supplementary_data_updates` wrapper). On case creation, use the `supplementary_data_request` field on the create payload.
- Returned in callback **requests**; cannot be modified via callback **responses**. Excluded from `GET /cases/{caseId}`; retrieved via Elasticsearch search with a top-level `supplementary_data: [...]` array.
- Coarse access control only — jurisdiction caseworkers write within their jurisdiction; cross-jurisdictional roles write everywhere. Type fixed by first write. Don't store sensitive data.

## What supplementary data is

A dedicated `supplementary_data` JSONB column on the `case_data` table (`CaseDetailsEntity.java:94,135`), entirely separate from the `data` column. It lets platform services — search indexers, assignment engines, payment integrations — attach structured metadata to a case without touching the event lifecycle or requiring definition changes. Originally introduced for "Assign Access to a Case"; now widely used by Global Search, Work Allocation, Case Flags and others.

Properties are key-value pairs. Keys are strings with at most one dotted level (`propX_1.propX_2`); the validator rejects deeper paths. Values can be String, Number, Boolean, or Object — Arrays and Dates are not officially supported. **The type of a property is fixed by the first value written**: ES dynamic mapping infers the type, and changing it later requires manual ES intervention.

## How it differs from case data

| Dimension | Case data (`data` column) | Supplementary data (`supplementary_data` column) |
|---|---|---|
| Schema | Defined in case-type definition | Free-form JSONB; type fixed by first write |
| Nesting | Arbitrary | Max one level of dotted nesting (`a.b`, not `a.b.c`) |
| Who writes | Caseworkers and solicitors via events | Caseworkers within their jurisdiction; cross-jurisdiction roles globally |
| Included in case GET | Yes | No — must be fetched via Elasticsearch with `supplementary_data: [...]` |
| Event lifecycle | Every write is an audited event | No events; no audit history |
| Versioned | Yes — full snapshot per event | No |
| Atomic increment | No | Yes — `$inc` operation |
| CRUD access control | Yes (per-field, per-state) | No — coarse jurisdictional check only |

## Writing supplementary data

### Targeted update endpoint

Send `POST /cases/{caseId}/supplementary-data` (`CaseController.java:367-417`) with a `SupplementaryDataUpdateRequest` body:

```json
{
  "supplementary_data_updates": {
    "$set": {
      "HMCTSServiceId": "BBA3"
    },
    "$inc": {
      "orgs_assigned_users.OrgA": 1,
      "orgs_assigned_users.OrgB": -1
    }
  }
}
```

- `$set` overwrites or creates the value at the given path.
- `$inc` atomically adjusts a numeric value (positive or negative); creates the field set to the delta if missing (MongoDB-inspired).
- Operators can be combined.

`SupplementaryDataUpdateRequestValidator` enforces: non-empty body, max one nested level (`a.b.c` is rejected with `MORE_THAN_ONE_NESTED_LEVEL`), and operator must be one of `$set`/`$inc`/`$find`. `AuthorisedSupplementaryDataUpdateOperation` then runs the access check (`DefaultEndpointAuthorisationService.java:30-34`) before delegating to `DefaultSupplementaryDataRepository`, which selects the right `SupplementaryDataQueryBuilder` for the operator. The response is HTTP 200 with the updated values wrapped in `SupplementaryDataResource`:

```json
{ "supplementary_data": { "HMCTSServiceId": "BBA3", "orgs_assigned_users.OrgA": 4 } }
```

### During case creation

The case-creation endpoints (e.g. v2 `POST /case-types/{caseTypeId}/cases`) accept a `supplementary_data_request` field on the create payload (`CaseDataContent.java:43-44`, `DefaultCreateCaseOperation.java:232-240`). The wrapper key here is `supplementary_data_request` — *not* `supplementary_data_updates` — but the same `$set` / `$inc` operators apply:

```json
{ "data": { "...": "..." },
  "event": { "id": "createCase" },
  "supplementary_data_request": { "$set": { "HMCTSServiceId": "BBA3" } } }
```

### Bulk update across cases

<!-- DIVERGENCE: The "Case Supplementary Data LLD" Confluence page (1440497258) documents a `POST /cases/supplementary-data` endpoint accepting a `cases: [...]` list with `successes` / `failures` response arrays. No matching route exists in `CaseController.java` or anywhere under `apps/ccd/ccd-data-store-api/src/main/java/`. Source wins — this endpoint is not implemented. -->

## Reading supplementary data

There is no dedicated GET endpoint, and supplementary data is intentionally excluded from `GET /cases/{caseId}`. Two ways to retrieve it:

- **`$find` operator** on the same `POST /cases/{caseId}/supplementary-data` endpoint, listing the paths to return.
- **Elasticsearch search** with a top-level `supplementary_data` array alongside `native_es_query`:

  ```json
  { "native_es_query": { "query": { "match_all": {} } },
    "supplementary_data": [ "HMCTSServiceId", "orgs_assigned_users.OrgA" ] }
  ```

  Paths don't need a `supplementary_data.` prefix; `*` returns everything; missing fields are silently ignored. Don't try to fetch via `_source` on a native query — it is not reliable.

## Access control

The access check (`DefaultEndpointAuthorisationService.java:30-34`) is deliberately coarse:

- Jurisdiction caseworkers can read and write supplementary data on cases in their own jurisdiction.
- Cross-jurisdiction roles (e.g. `caseworker-caa`, configured via `ccd.access-control.cross-jurisdiction-roles`) can access any case.
- Users with explicit case access only can read but **cannot write**.

There is no per-field CRUD configuration. **Do not store sensitive information here** — supplementary data appears in callback request bodies sent to service backends.

## Callbacks

Supplementary data is included by default in outgoing callback **requests**, but cannot be modified via callback **responses** — there is no mapped response field and `DefaultCreateCaseOperation` only reads `supplementary_data_request` from the inbound `CaseDataContent`.

<!-- CONFLUENCE-ONLY: The "CCD Configurationless Approach" page (1753715071, AM space, v4) describes a proposed extension allowing AboutToSubmit callbacks to return a `supplementary_data_updates` block, applied by CCD in the same DB transaction as the case-data update. No such handling exists in `apps/ccd/ccd-data-store-api/src/main/java/`. The LLD page (1440497258) explicitly states callbacks cannot modify supplementary data; treat this as aspirational/unbuilt. -->

## Decentralised cases

For decentralised case types, writes are routed to `POST /ccd-persistence/cases/{case-ref}/supplementary-data` on the owning service via `DelegatingSupplementaryDataUpdateOperation` (`ServicePersistenceAPI.java:52`). The wire contract is the same as the centralised endpoint.

## Indexing into Elasticsearch

Updates to the `supplementary_data` column fire a database trigger that flips the `marked_as_logstash` flag, so CCD Logstash picks up the change and reindexes the case in ES. There is no synchronous indexing path. Once ES has inferred a property's type via dynamic mapping, changing it requires manual re-indexing — so type rules matter on the first write (strings quoted, numbers unquoted, booleans `true`/`false`, objects `{...}`). For arrays of objects ES needs explicit `nested` mapping plus a Nested query; the recommended pattern is to use Object properties keyed by ID (`orgs_assigned_users.OrgA: 3`) instead of arrays.

## Common usages

- **`HMCTSServiceId`** — set via `$set` during case creation (typically by an AboutToSubmit callback writing the value back into the create payload's `supplementary_data_request`). Required for Global Search, Work Allocation, and Case Flags. Existing cases without it must be migrated by triggering an event that populates it.
- **`orgs_assigned_users.<orgId>`** — atomic counter of solicitors per organisation explicitly assigned to a case. Incremented/decremented by AAC's case-assignment operations; used by ES queries to find unassigned cases.

## Gotchas

- **One level of nesting only.** `a.b.c` is rejected by the validator (RDM-8909 tracks deeper-path support).
- **Type is fixed by first write.** Writing `"5"` then `5` later fails. Migrating types requires manual DB + ES intervention.
- **Field IDs are case-sensitive** — `HMCTSServiceId` is not `hmctsServiceId`.
- **No audit trail.** Changes are invisible in the UI and absent from case event history.
- **Updates during case-update events are not yet supported** — only at creation or via the dedicated endpoint (RDM-9152).
- **No callback-response modification.** Callbacks see supplementary data but cannot write it back.

## See also

- [`docs/ccd/explanation/case-data-model.md`](case-data-model.md) — how the main `data` column and case-type definition relate
- [`docs/ccd/reference/endpoints.md`](../reference/endpoints.md) — full endpoint reference including supplementary-data path
