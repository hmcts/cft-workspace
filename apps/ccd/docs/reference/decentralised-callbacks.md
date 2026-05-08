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
    last_modified: "2026-04-29T00:00:00Z"
    space: "RRFM"
  - id: "1890781043"
    title: "HLD CCD - 5.0"
    last_modified: "2026-04-29T00:00:00Z"
    space: "RCCD"
  - id: "1814321107"
    title: "Decentralised Data Storage Scope Of Delivery"
    last_modified: "2026-04-29T00:00:00Z"
    space: "DSRDI"
confluence_checked_at: "2026-04-29T00:00:00Z"
last_reviewed: 2026-04-29T00:00:00Z
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

Rules:
- Keys are **lowercased** at load time; matching is case-insensitive.
- **Longest-prefix wins** when multiple keys could match.
- A URL may contain a single `%s` placeholder for PR-number substitution in preview environments. Only one placeholder is allowed.
- Absence of a URL for a case type means it is centralised (default behaviour).

`DelegatingCaseDetailsRepository` checks `resolver.isDecentralised(caseDetails)` -- if true, writes throw `UnsupportedOperationException` (pointers are immutable); reads route through `ServicePersistenceClient.getCase()`. Event submissions go through `DecentralisedCreateCaseEventService`.

### Performance: local-first routing and caching

<!-- CONFLUENCE-ONLY: not verified in source -->

The resolver employs a **local-first** strategy:

1. Always queries the local Postgres database first to fetch the `case_data` row.
2. Uses the `case_type_id` from that row to determine routing.
3. An in-memory **Caffeine LRU cache** maps case reference to case type ID, avoiding a DB round trip for frequently accessed ("hot") cases.

The cache is sized to ~100k entries (~10 MB). In production, the busiest hour sees approximately 15k unique cases modified.

Expected additional latency for decentralised case retrieval (source: Confluence LLD):

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

If CCD crashes before cleanup executes, a dangling pointer may remain. These are invisible to API consumers (not indexed, not retrievable). To ensure eventual cleanup, a **1-year `resolvedTTL`** is set on new pointers where the service has not configured one. On the first successful event the TTL is either removed or set to the service-configured value.

<!-- CONFLUENCE-ONLY: not verified in source -->

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
| `resolved_ttl` | Computed TTL date | Computed by CCD from decentralised data during events |
| `version` | Optimistic lock integer | Tracks last-processed decentralised revision |

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

<!-- CONFLUENCE-ONLY: not verified in source -->

Decentralised services are responsible for publishing event messages (consumed by task management / work allocation). The LLD specifies a **Transactional Outbox Pattern**:

1. During event submission, the service performs two operations in a single atomic DB transaction:
   - Persist the updated case data
   - Insert a message record into a `message_queue_candidates` table
2. CCD's existing message publisher service can be reused and deployed by decentralised services for the actual publishing step.

This guarantees at-least-once delivery: a message is only queued if the case data commit succeeded.

---

## Elasticsearch indexing

<!-- CONFLUENCE-ONLY: not verified in source -->

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

`DecentralisedDataConfiguration` runs SDK Flyway migrations from `classpath:dataruntime-db/migration` in schema `ccd` before application migrations. It is `@ConditionalOnMissingBean(FlywayMigrationStrategy.class)`.

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

