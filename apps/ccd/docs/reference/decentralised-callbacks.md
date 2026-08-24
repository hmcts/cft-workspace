---
topic: decentralisation
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPI.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceClient.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/PersistenceStrategyResolver.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/DelegatingCaseDetailsRepository.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPIInterceptor.java
  - ccd-data-store-api:src/main/resources/application.properties
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/dto/DecentralisedCaseEvent.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/dto/DecentralisedAuditEvent.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/dto/DecentralisedSubmitEventResponse.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/dto/DecentralisedCaseDetails.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/dto/DecentralisedEventDetails.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/service/SynchronisedCaseProcessor.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/service/DecentralisedCreateCaseEventService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/infrastructure/IdempotencyKeyHolder.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/ServicePersistenceController.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/CaseSubmissionService.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/DecentralisedSubmissionHandler.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/IdempotencyEnforcer.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/config/DecentralisedDataConfiguration.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/MessagePublisher.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/AuditEventService.java
  - ccd-config-generator:sdk/ccd-servicebus-support/src/main/java/uk/gov/hmcts/ccd/sdk/servicebus/CcdCaseEventPublisher.java
  - ccd-config-generator:sdk/ccd-servicebus-support/src/main/java/uk/gov/hmcts/ccd/sdk/servicebus/CcdCaseEventScheduler.java
  - ccd-config-generator:sdk/ccd-servicebus-support/src/main/java/uk/gov/hmcts/ccd/sdk/servicebus/CcdMessageQueueRepository.java
  - ccd-config-generator:sdk/ccd-servicebus-support/src/main/java/uk/gov/hmcts/ccd/sdk/servicebus/CcdServiceBusProperties.java
  - ccd-config-generator:sdk/ccd-servicebus-support/src/main/java/uk/gov/hmcts/ccd/sdk/servicebus/CcdServiceBusConnectionValidator.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/persistence/CasePointerRepository.java
  - rpx-xui-webapp:api/noc/index.ts
  - rpx-xui-webapp:src/models/environmentConfig.model.ts
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/NoticeOfChangeController.java
status: confluence-augmented
confluence:
  - id: "1875854371"
    title: "Decentralised data persistence"
    last_modified: "2026-04-29T00:00:00Z"
    space: "RCCD"
  - id: "1914801940"
    title: "CIC CCD Decentralisation - Solution Overview"
    last_modified: "2026-04-29T00:00:00Z"
    space: "SPT"
  - id: "1923744323"
    title: "Decentralised professional journeys"
    last_modified: "2026-05-15T00:00:00Z"
    space: "RRFM"
  - id: "1890781043"
    title: "HLD CCD - 5.0"
    last_modified: "2026-04-29T00:00:00Z"
    space: "RCCD"
  - id: "1814321107"
    title: "Decentralised Data Storage Scope Of Delivery"
    last_modified: "2026-04-29T00:00:00Z"
    space: "DSRDI"
confluence_checked_at: "2026-08-20T00:00:00Z"
last_reviewed: 2026-04-29T00:00:00Z
title: Decentralised Callbacks -- `/ccd-persistence/*` Contract
diataxis: reference
product: ccd
sources_sha:
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPI.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceClient.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/PersistenceStrategyResolver.java": "079679807d1f7becaaef398a2991ddcaf5c46235"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/DelegatingCaseDetailsRepository.java": "3f31c2b5662bbfbe8d341fb02ce3688124b5cdd6"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPIInterceptor.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/resources/application.properties": "5daf60c31eeb61da276722c2639fa50d279a26a8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/dto/DecentralisedCaseEvent.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/dto/DecentralisedAuditEvent.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/dto/DecentralisedSubmitEventResponse.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/dto/DecentralisedCaseDetails.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/dto/DecentralisedEventDetails.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/service/SynchronisedCaseProcessor.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/service/DecentralisedCreateCaseEventService.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/infrastructure/IdempotencyKeyHolder.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/ServicePersistenceController.java": "54351c2ee6faec3864a4c840e80ecfc707fb4565"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/CaseSubmissionService.java": "05e79e063aacd4ec9393d10254a9697bd37b2b50"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/DecentralisedSubmissionHandler.java": "2f14a4b0c584668faeed880627749fe0f540e95b"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/IdempotencyEnforcer.java": "9fe79e8e30e98faf96dc3411d069b09a08a2a295"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/config/DecentralisedDataConfiguration.java": "9fc415b2a5a8f0d4cba457af5b223818b4ff3ee9"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/MessagePublisher.java": "251a3705776c4f3382f9ced6212879a83c50a4e9"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/AuditEventService.java": "2c5e11485c5e17da845232984205437ee223296a"
  "ccd-config-generator:sdk/ccd-servicebus-support/src/main/java/uk/gov/hmcts/ccd/sdk/servicebus/CcdCaseEventPublisher.java": "7d89554b6041589e987b918b9811a97d9e54524b"
  "ccd-config-generator:sdk/ccd-servicebus-support/src/main/java/uk/gov/hmcts/ccd/sdk/servicebus/CcdCaseEventScheduler.java": "f6e8da81cdba5d42749e5419393a74a44a38fe7c"
  "ccd-config-generator:sdk/ccd-servicebus-support/src/main/java/uk/gov/hmcts/ccd/sdk/servicebus/CcdMessageQueueRepository.java": "c2823aeb77a6c8a7863c255953ab994b1d3e2a9d"
  "ccd-config-generator:sdk/ccd-servicebus-support/src/main/java/uk/gov/hmcts/ccd/sdk/servicebus/CcdServiceBusProperties.java": "f6e8da81cdba5d42749e5419393a74a44a38fe7c"
  ? "ccd-config-generator:sdk/ccd-servicebus-support/src/main/java/uk/gov/hmcts/ccd/sdk/servicebus/CcdServiceBusConnectionValidator.java"
  : "0fe3c2b693c558395d2e6227fe7e6062e782afff"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java": "e3fca30b92506584a590ae203811d60202129d2d"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/persistence/CasePointerRepository.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "rpx-xui-webapp:api/noc/index.ts": "28b9601a35fef875ae46fced731f4ce7fa73c143"
  "rpx-xui-webapp:src/models/environmentConfig.model.ts": "28b9601a35fef875ae46fced731f4ce7fa73c143"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/NoticeOfChangeController.java": "868a0ec2fccb8b0f66a70164b740497bbe8635ad"
---

# Decentralised Callbacks -- `/ccd-persistence/*` Contract

## TL;DR

- In decentralised mode, CCD data-store delegates case reads and writes to an external service via the `/ccd-persistence/*` HTTP contract instead of its own PostgreSQL database.
- CCD retains an immutable **case pointer** (reference, case type, jurisdiction) created in an independent transaction before delegating to the service.
- The contract has five endpoints: event submission, case retrieval, supplementary data update, full audit history, and single-event history.
- Every `POST /ccd-persistence/cases` call carries an `Idempotency-Key` header (UUID derived from the start-event token); the remote service must return the identical response on replay.
- CCD validates responses against six fields: `reference`, `caseTypeId`, `jurisdiction`, `revision`, `version`, and `securityClassification`.
- The `SynchronisedCaseProcessor` serialises updates to CCD-local derived data (resolvedTTL, Case Links) using pessimistic locking and revision comparison.

---

## Routing configuration

CCD data-store decides whether a case type is decentralised at startup via `PersistenceStrategyResolver`. It reads:

```properties
# application.properties (data-store)
ccd.decentralised.case-type-service-urls[PCS_PR_]=https://pcs-api-pr-%s.preview.platform
ccd.decentralised.case-type-service-urls[PCS]=http://pcs-api
```

Rules (`PersistenceStrategyResolver.java:60-72,108-160,171-203`):
- Keys are **lowercased** in `setCaseTypeServiceUrls`; the incoming case type ID is lowercased before matching, so matching is case-insensitive.
- **Longest-prefix wins** when several keys match. A tie between two keys of the *same* length is not resolved silently — the resolver throws `IllegalStateException("Ambiguous configuration for case type ...")`.
- A URL may contain a single `%s` placeholder, substituted with the part of the case type ID after the matched prefix. Two placeholders throw; so does a match whose suffix is blank (a `%s` template keyed on the whole case type ID).
- An unparseable resolved URL throws `IllegalStateException`, not a runtime 500 at call time.
- Absence of a URL for a case type means it is centralised (default behaviour).

> ExUI resolves the same prefix map for its own redirect and NoC routing, but its
> `getConfiguredCaseType` sorts the matches by length descending and takes the first — so where
> data-store raises `IllegalStateException` on an equal-length tie, ExUI silently picks one.
> Keep the two configurations unambiguous.

`DelegatingCaseDetailsRepository` checks `resolver.isDecentralised(caseDetails)` -- if true, writes throw `UnsupportedOperationException` (pointers are immutable); reads route through `ServicePersistenceClient.getCase()`. Event submissions go through `DecentralisedCreateCaseEventService`.

### Performance: local-first routing and caching

The resolver employs a **local-first** strategy:

1. Where only a case reference is known, `getCaseTypeByReference` resolves the case type from the
   local pointer row via `CasePointerRepository.findCaseTypeByReference`.
2. That `case_type_id` is what prefix matching then routes on.
3. An in-memory **Caffeine LRU cache** keyed `Long reference -> String caseTypeId` fronts the
   lookup, avoiding a DB round trip for frequently accessed ("hot") cases.

The cache is `Caffeine.newBuilder().maximumSize(100_000)`, which the constructor comment sizes at
"around 100 bytes per entry ... up to 10MB of memory" (`PersistenceStrategyResolver.java:49-57`).
Note it has **no** TTL or expiry — entries are only evicted by size, which is safe because a case's
case type never changes.

Overloads that already hold a `CaseDetails` (`isDecentralised(CaseDetails)`,
`resolveUriOrThrow(CaseDetails)`) skip both the cache and the DB and route straight off
`caseDetails.getCaseTypeId()`.

Expected additional latency for decentralised case retrieval:

<!-- CONFLUENCE-ONLY: the per-hop latency budget below, and the "busiest hour sees ~15k unique cases modified" sizing figure that justifies the 100k cache, are from the LLD. Neither is derivable from source — the resolver hard-codes maximumSize(100_000) without recording where the number came from. -->


| Hop | p50 latency |
|---|---|
| CCD to Service | 1 ms |
| Service to S2S | 3 ms |
| Service to IDAM | 18 ms |
| Service to DB | 1 ms (PK lookup) |
| **Total additional** | **~25 ms** |

---

## Case pointers

A case pointer is a minimal row in CCD's `case_data` table that links a case reference to a case type. It exists solely to enable routing and discovery.

### Pointer creation

When a new decentralised case is created:

1. CCD inserts a `case_data` row in a **new independent transaction** (`@Transactional(propagation = Propagation.REQUIRES_NEW)`).
2. This commits the pointer immediately, before the event submission is delegated to the remote service.
3. The pointer contains only immutable metadata and empty data blobs.

### Pointer cleanup on failure

If the subsequent `submitEvent` call to the decentralised service fails:

- **HTTP 4xx client errors** (e.g. 400, 409): CCD deletes the newly created pointer.
- **Non-empty `errors` array** in a 200/201 response: CCD also deletes the pointer.

### Dangling pointers

If CCD crashes before cleanup executes, a dangling pointer may remain. These are invisible to API consumers (not indexed, not retrievable). To ensure eventual cleanup, a **1-year `resolvedTTL`** is set on new pointers where the service has not supplied one — `DANGLING_POINTER_EXPIRY_TIMEOUT_YEARS = 1L`, applied as `LocalDate.now().plusYears(1)` only when `pointer.getResolvedTTL() == null` (`CasePointerRepository.java:28,47-51`). `updateResolvedTtl` overwrites it once the service reports its own value.

Deletion is also `REQUIRES_NEW`, so it commits regardless of the outer transaction's fate. The delete statement is guarded:

```sql
delete from case_data where reference = :caseReference and data = cast('{}' as jsonb)
```

The empty-`data` predicate means cleanup can never remove a real centralised case row by accident; if the guard matches nothing the repository logs at ERROR and moves on rather than failing the request (`CasePointerRepository.java:78-95`).

### Column usage for case pointers

| Column | Centralised | Case Pointer (decentralised) |
|---|---|---|
| `id` | Internal PK | Unchanged |
| `reference` | 16-digit case reference | Unchanged |
| `jurisdiction` | Jurisdiction | Unchanged |
| `case_type_id` | Case type ID | Unchanged -- used by resolver for routing |
| `created_date` | Creation timestamp | Unchanged |
| `last_modified` | Last modification timestamp | `NULL` (authoritative value held by service) |
| `last_state_modified_date` | Last state change | `NULL` (authoritative value held by service) |
| `state` | Current state | Fixed empty string `''` |
| `security_classification` | Classification | Hardcoded `RESTRICTED` (failsafe placeholder) |
| `data` | Full JSONB payload | Empty `{}` |
| `data_classification` | Field-level classifications | Empty `{}` |
| `supplementary_data` | Supplementary JSONB | `NULL` |
| `resolved_ttl` | Computed TTL date | Computed by CCD from decentralised data during events; defaulted to `now + 1 year` at creation if the service supplied none |
| `version` | Optimistic lock integer | `NULL` at creation; thereafter tracks the last-processed decentralised revision (written by `SynchronisedCaseProcessor`) |

Every value in that column is set explicitly in `CasePointerRepository.persistCasePointerAndInitId`, which clones the submitted `CaseDetails` and then blanks it (`data`/`data_classification` to `Map.of()`, `securityClassification` to `RESTRICTED`, `lastModified`/`lastStateModifiedDate`/`version` to `null`, `state` to `""`) before handing it to `caseDetailsRepository.set` (`CasePointerRepository.java:37-53`).

---

## Auth headers

All requests from data-store to the remote service are made via a Feign client (`ServicePersistenceAPI`) intercepted by `ServicePersistenceAPIInterceptor`. Headers added:

| Header | Value |
|---|---|
| `Authorization` | User JWT (Bearer token) forwarded from the originating request |
| `ServiceAuthorization` | S2S token identifying `ccd_data` |

The receiving service **must** validate the S2S token to confirm the request is from CCD.

---

## Endpoint reference

### `POST /ccd-persistence/cases`

Submit a create or update event. This is the primary write path -- it **replaces** the `AboutToSubmit` and `Submitted` callback phases.

**Required header**: `Idempotency-Key: <UUID>`

#### Idempotency semantics

| Scenario | Expected behaviour | HTTP status |
|---|---|---|
| First request with a new key | Process the event, persist, return result | `201 Created` |
| Repeat request with same key | Do **not** re-process; return the same response as the original | `200 OK` |

The idempotent response **must** be identical to the original success response, even if further events have occurred since. Services should retrieve it from their event history rather than returning current case state.

#### Retry policy

CCD will **not** retry on failure (unlike standard CCD callbacks). Upstream clients may retry on ambiguous responses (timeouts, 5xx) since the endpoint is idempotent.

**Request body** -- `DecentralisedCaseEvent` (snake_case on the wire):

| Field | Type | Notes |
|---|---|---|
| `case_details` | `CaseDetails` | Full case data at time of submission (after `AboutToStart` and `MidEvent` callbacks, before persistence) |
| `case_details_before` | `CaseDetails` | Case data before the event (optional, null for new cases) |
| `event_details` | `DecentralisedEventDetails` | See EventDetails table below |
| `resolved_ttl` | `LocalDate` | Authoritative TTL computed by CCD; service must persist this |
| `internal_case_id` | `Long` | CCD's `case_data.id` column (needed for ES indexing) |
| `start_revision` | `Long` | Revision when the user started the event |
| `merge_revision` | `Long` | Revision CCD merged updates into immediately before submission (null for new cases) |

The `@JsonIgnoreProperties(ignoreUnknown = true)` annotation ensures forward compatibility with future fields.

#### The EventDetails object

| Field | Type | Notes |
|---|---|---|
| `case_type` | String | Case type ID |
| `event_id` | String | Event trigger ID |
| `event_name` | String | Display name of the event |
| `description` | String | Optional user-provided description |
| `summary` | String | Optional user-provided summary |
| `proxied_by` | String | Optional IDAM ID of user performing action on behalf of another |
| `proxied_by_first_name` | String | Optional |
| `proxied_by_last_name` | String | Optional |

**Response body** -- `DecentralisedSubmitEventResponse` (snake_case):

The response uses `@JsonUnwrapped` on its `DecentralisedCaseDetails` field, so top-level JSON is:

```json
{
  "case_details": { ... },
  "revision": 6,
  "errors": [],
  "warnings": [],
  "ignore_warning": false
}
```

| Field | Type | Notes |
|---|---|---|
| `case_details` | `CaseDetails` | Must include `reference`, `case_type_id`, `jurisdiction`, `security_classification`, `version` |
| `revision` | `Long` | Monotonically increasing; must increment on every event |
| `errors` | `List<String>` | Non-empty causes 422 to caller |
| `warnings` | `List<String>` | Non-empty causes 422 unless `ignore_warning=true` |
| `ignore_warning` | `Boolean` | Echo of caller's flag |

**Validation** (`ServicePersistenceClient.java:131-163`): data-store asserts:
- `revision` is non-null
- `version` is non-null
- `securityClassification` is non-null
- `reference`, `caseTypeId`, and `jurisdiction` match the submitted values

Any failure throws `ServiceException`.

#### HTTP status codes

| Status | Meaning |
|---|---|
| `201 Created` | Event processed for the first time |
| `200 OK` | Idempotent replay (same key, no re-processing) |
| `409 Conflict` | Concurrency conflict; CCD propagates `CaseConcurrencyException` to the end user |
| `422 Unprocessable Entity` | Non-empty `errors`/`warnings` in response body |
| `400 Bad Request` | Malformed request or unrecognised case type |
| `401`/`403` | Invalid S2S token or unauthorised caller |

**Callback bypass**: decentralised cases skip `about_to_submit` and `submitted` CCD callbacks. The remote service owns all business logic.

---

### `GET /ccd-persistence/cases?case-refs=<ref>[,<ref>...]`

Fetch one or more cases by case reference.

**Query parameter**: `case-refs` -- comma-separated list of 16-digit case references (type `Long`).

**Response**: JSON array of `DecentralisedCaseDetails`:

| Field | Type | Notes |
|---|---|---|
| `case_details` | `CaseDetails` | Full authoritative case data |
| `revision` | `Long` | Always-incrementing revision |

If a requested reference is not found or the caller lacks permission, it should be **omitted** from the array. An empty array with `200 OK` is valid.

After retrieval, `ServicePersistenceClient.getCase()` injects the internal CCD `id` (auto-incremented integer) onto the returned object. The external service never receives or stores this `id`.

CCD validates `reference`, `caseTypeId`, `jurisdiction`, `revision`, `version`, and `securityClassification` on every returned object.

---

### `POST /ccd-persistence/cases/{caseRef}/supplementary-data`

Update supplementary data for a case. Follows the [CCD Supplementary Data LLD](https://tools.hmcts.net/confluence/display/RCCD/Case+Supplementary+Data+LLD) specification.

**Path parameter**: `caseRef` -- the case reference (Long).

**Request body** -- `SupplementaryDataUpdateRequest`:

| Operation key | Meaning |
|---|---|
| `$set` | Overwrite a path in the supplementary data bag |
| `$inc` | Atomically increment a numeric path |

**Response**: `DecentralisedUpdateSupplementaryDataResponse` containing the updated supplementary data JSON.

---

### `GET /ccd-persistence/cases/{caseRef}/history`

Fetch the full audit-event list for a case.

**Path parameter**: `caseRef` -- case reference (Long).

**Response**: JSON array of `DecentralisedAuditEvent` (ordered chronologically, typically most recent first):

| Field | Type | Notes |
|---|---|---|
| `id` | `Long` | Unique event identifier within the decentralised service |
| `case_reference` | `Long` | 16-digit case reference; CCD validates this matches the request |
| `event` | `AuditEvent` | Core audit event details; `id` and `case_data_id` within are overwritten by CCD |

Data-store validates that each returned event's `caseReference` matches the path parameter, and that `caseTypeId` on the inner `AuditEvent` matches the expected case type.

If the case has no history, an empty array with `200 OK` is valid. If the case does not exist, return `404 Not Found`.

---

### `GET /ccd-persistence/cases/{caseRef}/history/{eventId}`

Fetch a single audit event.

**Path parameters**:

| Parameter | Type | Meaning |
|---|---|---|
| `caseRef` | Long | Case reference |
| `eventId` | Long | Event ID within the decentralised service |

**Response**: single `DecentralisedAuditEvent` (same shape as above). The `event.data` and `event.data_classification` fields should contain the case data snapshot at that point in time.

Same cross-validation of `caseReference` / `caseTypeId` as the list endpoint. Returns `404` if the event or case is not found.

---

## Notice-of-change delegation (a separate contract)

`/ccd-persistence/*` is not the only contract a decentralised service can be asked to serve. If
the case type is listed in ExUI's `DECENTRALISED_CASE_TYPE_CONFIG` with a `nocBaseUrl`, ExUI's
Node BFF forwards two of the three NoC calls to the **service** instead of to
`aac-manage-case-assignment` (`rpx-xui-webapp:api/noc/index.ts:34-80`):

| ExUI BFF route | Forwarded to | Path appended to the base URL |
|---|---|---|
| `GET /noc/noc-questions?case_id=` | always AAC | `/noc/noc-questions?case_id=` |
| `POST /noc/verify-noc-answers` | `nocBaseUrl` when configured | `/noc/verify-noc-answers` |
| `POST /noc/noc-requests` | `nocBaseUrl` when configured | `/noc/noc-requests` |

The paths are identical to AAC's own (`NoticeOfChangeController` is `@RequestMapping("/noc")` with
`VERIFY_NOC_ANSWERS = "/verify-noc-answers"` and `REQUEST_NOTICE_OF_CHANGE_PATH = "/noc-requests"`),
so a service implements the same shape AAC does. Both request bodies are `{ case_id, answers[] }`
where `case_id` is a 16-digit `@LuhnCheck`ed string and `answers` is a non-empty list of
`SubmittedChallengeAnswer`.

Two consequences worth knowing:

- **Challenge questions stay centralised.** `noc-questions` is never delegated, so the questions
  themselves remain statically configured in the case definition and served by AAC.
- **Delegation depends on a session cache.** ExUI reads the case type from the `noc-questions`
  response and stores it in the session under `nocCaseTypesByCaseId`; the other two routes resolve
  `nocBaseUrl` from that cache. A `verify-noc-answers` or `noc-requests` call whose session has no
  cached case type falls back to AAC, whatever the config says.
- **`nocBaseUrl` is BFF-only.** The browser-side `DecentralisedCaseTypeConfig` interface declares
  just `webUrl` (`rpx-xui-webapp:src/models/environmentConfig.model.ts:6-10`); `nocBaseUrl` is typed
  locally in `api/noc/index.ts` and never reaches the Angular app.

Prefix matching and `%s` templating work exactly as for `webUrl` — see
[Decentralise a service, step 10](../how-to/decentralise-a-service.md#10-optional-exui-decentralised-journeys).

---

## Idempotency requirements

| Requirement | Detail |
|---|---|
| Header | `Idempotency-Key` must be a UUID |
| Generation | CCD derives it as `UUID.nameUUIDFromBytes(startEventTokenDigest.getBytes(UTF_8))` (`IdempotencyKeyHolder.java`) |
| Behaviour | Same key on repeat `POST /ccd-persistence/cases` must produce the identical response body |
| Response stability | The replayed response must match the original, even if further events occurred (retrieve from event history) |
| Scope | Key is request-scoped; set once per request, immutable thereafter |
| Ownership | The remote service owns the idempotency check; CCD does not record used keys |
| SDK enforcement | `IdempotencyEnforcer` acquires `FOR UPDATE` lock on the case row and checks `case_event.idempotency_key` |

---

## Concurrency control

### Delegated model

The primary responsibility for concurrency control lies with the decentralised service. CCD delegates this entirely:

- The service is the source of truth and must correctly manage or reject concurrent event submissions.
- On conflict, the service returns `409 Conflict`. CCD wraps this as `CaseConcurrencyException` with user-facing message: "Unfortunately we were unable to save your work... Please review the case and try again."
- CCD does **not** retry on 409.

A monotonically increasing **revision** number (distinct from `CaseDetails.version`) is exchanged:
- `start_revision`: the revision when the user started their event
- `merge_revision`: the revision CCD fetched immediately before submission (null for create)
- Response `revision`: the new, incremented revision after the event

### `SynchronisedCaseProcessor` -- derived data in CCD

While case data is decentralised, CCD must still maintain local derived data for **resolvedTTL** and **Case Links**. Multiple concurrent events could arrive interleaved, so a synchronisation mechanism prevents stale overwrites:

1. **Pessimistic lock**: `SELECT ... FROM case_data WHERE reference = :ref FOR UPDATE` serialises operations.
2. **Revision check**: the incoming revision must be **greater than** the stored `version` column (which tracks last-processed revision).
3. **Conditional execution**: if the revision is stale, the operation is skipped.
4. **Transaction isolation**: runs in `Propagation.REQUIRES_NEW` to minimise lock hold time.

```java
// SynchronisedCaseProcessor.java (simplified)
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void applyConditionallyWithLock(DecentralisedCaseDetails decentralisedCase,
                                       Consumer<CaseDetails> operation) {
    Integer currentRevision = em.createNativeQuery(
        "SELECT version FROM case_data WHERE reference = :ref FOR UPDATE")
        .setParameter("ref", caseDetails.getReference())
        .getSingleResult();

    if (decentralisedCase.getRevision() > currentRevision) {
        operation.accept(caseDetails);
        // Update pointer's version column to new revision
    }
}
```

### resolvedTTL handling

CCD's `resolvedTTL` computation remains authoritative. During event submission:

1. CCD computes `resolvedTTL` from the TTL field in case data (which itself derives from service config).
2. The computed value is passed to the service in `DecentralisedCaseEvent.resolvedTtl`.
3. The service must persist this value but cannot override it through direct modification.
4. Services onboarded to retain-and-dispose must implement a garbage collection cron to identify expired cases, check CCD for pointer existence, and purge if disposed.

---

## Ordering guarantees

- Data-store calls `/ccd-persistence/cases` **synchronously** via the Feign client; there is no queue or async dispatch.
- The `submitted` callback phase is skipped for decentralised cases.
- No ordering guarantee across concurrent requests; the service must use `revision` for optimistic-concurrency control.
- CCD does **not** retry failed submissions (unlike standard callback retries).

---

## Message publishing

Decentralised services are responsible for publishing event messages (consumed by task management / work allocation). CCD emits nothing for a decentralised event — its `messageService.handleMessage(...)` call lives inside the same `saveAuditEventForCaseDetails` method the decentralised branch skips (`CreateCaseEventService.java:587`).

The **Transactional Outbox Pattern**:

1. During event submission, the service performs two operations in a single atomic DB transaction:
   - Persist the updated case data
   - Insert a message record into a `ccd.message_queue_candidates` table
2. A scheduled publisher drains that table to Azure Service Bus after the transaction has committed, inside the service's own process. <!-- DIVERGENCE: Confluence 1875854371 describes decentralised services reusing and deploying CCD's existing ccd-message-publisher for this step. Source: the SDK ships its own publisher module, sdk/ccd-servicebus-support (ccd-config-generator:CcdCaseEventPublisher.java, CcdCaseEventScheduler.java), which runs in-process and needs no separate deployment. Source wins. -->

This guarantees at-least-once delivery: a message is only queued if the case data commit succeeded.

The SDK implements step 1, and it is on by default — no configuration required. `MessagePublisher.publishEvent()` does the insert (`MessagePublisher.java:84-95`), called from `AuditEventService.saveAuditRecord` (`AuditEventService.java:195-213`) inside the submission transaction.

Two conditions gate it:

| Condition | Effect if unmet |
|---|---|
| `MessagingProperties` bean present (`@ConditionalOnBean`, `MessagePublisher.java:25`) | No `MessagePublisher` bean; `AuditEventService` logs "Message publishing disabled" and skips |
| Event has `publish = true` in the CCD definition | Logs "not marked for publishing" and returns without inserting |

The first is satisfied automatically: `DecentralisedDataConfiguration` component-scans the package containing `MessagingProperties` (`@ComponentScan(basePackageClasses = {MessagingProperties.class})`, `DecentralisedDataConfiguration.java:20`), and `MessagingProperties` is an unconditional `@Component`. The practical gate is therefore the per-event `publish` flag. One edge case: the whole autoconfiguration is `@ConditionalOnProperty(prefix = "spring.flyway", name = "enabled", matchIfMissing = true)`, so disabling Flyway also silently disables message publishing.

The message body is a `MessageInformation` JSON document carrying case reference, jurisdiction, case type, event id, user id, previous and new state, plus `data` / `definition` blocks generated by CCD's own `DataBlockGenerator` and `DefinitionBlockGenerator` (`MessagePublisher.java:100-140`) — so the payload matches what centralised CCD publishes.

Step 2 is the SDK's separate `ccd-servicebus-support` module, and unlike step 1 it is off by default. Nothing in it activates unless `spring.jms.servicebus.enabled` is `true`, and the poller additionally requires `ccd.servicebus.scheduler-enabled`, which defaults to `false` (`CcdCaseEventScheduler.java:11-14`, `CcdServiceBusProperties.java:11-12`). Once enabled, `CcdCaseEventScheduler` fires on the `ccd.servicebus.schedule` cron — every ten seconds unless overridden (`CcdCaseEventScheduler.java:20-23`) — and calls `CcdCaseEventPublisher.publishPendingCaseEvents()`, which drains unpublished `CASE_EVENT` rows in batches of `ccd.servicebus.batch-size` (default 100) selected `FOR UPDATE SKIP LOCKED`, so several replicas can publish concurrently without duplicating messages (`CcdMessageQueueRepository.java:22-30`, `CcdServiceBusProperties.java:16-17`). Each row is sent to `ccd.servicebus.destination` through the module's `JmsTemplate` and only rows that sent successfully are stamped `published`, so a send failure leaves the row for the next run instead of losing the message (`CcdCaseEventPublisher.java:72-95`, `:101-111`). Every message carries `jurisdiction_id`, `case_type_id`, `case_id`, `event_id` and `JMSXGroupID` — the last set to the case id, keeping one case's events in a single Service Bus session — as JMS string properties (`CcdCaseEventPublisher.java:128-133`). Rows published longer ago than `ccd.servicebus.published-retention-days`, 90 by default, are deleted at the end of each run (`CcdCaseEventPublisher.java:57-63`, `CcdServiceBusProperties.java:19-20`, `CcdMessageQueueRepository.java:70-72`). An `ApplicationRunner` opens and immediately closes a producer on the destination during boot and throws if that fails, so a missing topic or a connection lacking `Send` rights stops the service starting (`CcdServiceBusConnectionValidator.java:26-40`). A blank destination is not an error — the validator skips and each publish run logs a warning and does nothing (`CcdServiceBusConnectionValidator.java:28-32`, `CcdCaseEventPublisher.java:31-35`).

---

## Elasticsearch indexing

<!-- CONFLUENCE-ONLY: the Logstash provisioning model and external-versioning rules below come from the Decentralised data persistence LLD. The SDK ships only the queue side — ccd.es_queue and its trigger, in dataruntime-db/migration/V0010 — and neither ccd-data-store-api nor ccd-config-generator contains any Logstash pipeline config, so the operational half cannot be verified against either repo. -->

Search remains unchanged from the client perspective (all searches go through CCD's Elasticsearch APIs). The data flow changes for decentralised cases:

- **Centralised cases**: existing Logstash indexes from CCD's Postgres.
- **Decentralised cases**: the service provisions a **dedicated Logstash instance** that reads from its own database into CCD's ES cluster.

Requirements for decentralised Logstash:
- Must use Elasticsearch **external versioning** to avoid conflicts with the centralised Logstash.
- Must start external version numbers at **> 1** so the service's first write takes precedence.
- The centralised Logstash will not re-index decentralised case pointers (pointers are never modified in a way that triggers re-indexing).

---

## SDK implementation (`ccd-config-generator` decentralised-runtime)

Service teams using `ccd-config-generator` get a ready-made implementation via `sdk/decentralised-runtime`.

`ServicePersistenceController` is a `@RestController @RequestMapping("/ccd-persistence")` that implements all five endpoints.

On `POST /ccd-persistence/cases`:

1. Validates `Authorization` header is present (returns 401 if blank).
2. Delegates to `CaseSubmissionService.submit()`:
   - `IdempotencyEnforcer.lockCaseAndGetExistingEvent()` acquires a `FOR UPDATE` lock on the case row and checks if an event with the same idempotency key already exists.
   - If the key exists, the previously persisted event is returned (idempotent replay).
   - If the event has a `submitHandler` set, routes to `DecentralisedSubmissionHandler`.
   - Otherwise, routes to `LegacyCallbackSubmissionHandler` (fires standard CCD webhooks).
3. `DecentralisedSubmissionHandler.apply()` resolves event config from `ResolvedConfigRegistry`, deserialises case data to the typed domain class, and calls `submitHandler.submit(EventPayload)`.

`DecentralisedFlywayAutoConfiguration` runs SDK Flyway migrations from `classpath:dataruntime-db/migration` in schema `ccd` before application migrations. It is `@ConditionalOnMissingBean(FlywayMigrationStrategy.class)`. `DecentralisedDataConfiguration` imports it via `@ImportAutoConfiguration`; the bean lived on that class until the split.

The `build.gradle` opt-in:

```groovy
ccd {
    decentralised = true
}
```

---

## Constraints and gotchas

| Constraint | Detail |
|---|---|
| Internal contract | `/ccd-persistence/*` is consumed by CCD data-store only; service code must not call it directly |
| Internal `id` not shared | CCD's integer `id` is injected after retrieval; the service never receives it |
| Prefix matching is case-insensitive | Config keys are lowercased; case type IDs matched after lowercasing |
| One `%s` only | Preview URL templates may contain exactly one `%s` placeholder |
| `submitHandler` is mutually exclusive | Setting both `submitHandler` and `aboutToSubmitCallback` throws `IllegalStateException` at startup |
| `about_to_submit` and `submitted` skipped | Decentralised cases bypass both CCD callback phases |
| Flyway schema conflict | SDK migrations target schema `ccd`; service app migrations must not overlap |
| No CCD retry | Unlike standard callbacks, CCD does not retry failed `/ccd-persistence/cases` calls |
| `version` vs `revision` | `CaseDetails.version` tracks legacy JSON blob version (may not increment every event); `revision` always increments |
| Response must be stable | Idempotent replay must return the original response body, not current case state |
| Pointer cleanup race | If CCD crashes between pointer creation and cleanup, a dangling pointer remains (cleaned by retain-and-dispose) |
| Security classification placeholder | Pointers use `RESTRICTED` as a failsafe; the authoritative value comes from the service |

---

## See also

- [Decentralisation](../explanation/decentralisation.md) -- architectural rationale and data-flow overview
- [Decentralise a service](../how-to/decentralise-a-service.md) -- step-by-step guide to opting a case type into decentralised persistence
- [Glossary](glossary.md) -- definitions of `submitHandler`, `Idempotency-Key`, `PersistenceStrategyResolver`

## Glossary

See [Glossary](glossary.md) for term definitions used in this page.
