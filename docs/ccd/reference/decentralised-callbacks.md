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
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/ServicePersistenceController.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/CaseSubmissionService.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/DecentralisedSubmissionHandler.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/config/DecentralisedDataConfiguration.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Decentralised Callbacks — `/ccd-persistence/*` Contract

## TL;DR

- In decentralised mode, CCD data-store delegates case reads and writes to an external service via the `/ccd-persistence/*` HTTP contract instead of its own PostgreSQL database.
- The contract has five endpoints: one for submitting events, one for reading cases, one for supplementary data, and two for audit history.
- Every `POST /ccd-persistence/cases` call **must** carry an `Idempotency-Key` UUID header; the remote service must return the same response on replay.
- CCD validates the response: `reference`, `caseTypeId`, and `jurisdiction` in the reply must match what was sent, or a `ServiceException` is thrown.
- The `ccd-config-generator` decentralised-runtime module ships `ServicePersistenceController`, a ready-made Spring MVC implementation of this contract that service teams can include.
- Routing is config-driven: `ccd.decentralised.case-type-service-urls` maps case-type ID prefixes to base URLs.

---

## Routing configuration

CCD data-store decides whether a case type is decentralised at startup via `PersistenceStrategyResolver` (`PersistenceStrategyResolver.java:27`). It reads the property:

```properties
# application.properties (data-store)
ccd.decentralised.case-type-service-urls[PCS_PR_]=https://pcs-api-pr-%s.preview.platform
ccd.decentralised.case-type-service-urls[PCS]=http://pcs-api
```

Rules:
- Keys are **lowercased** at load time; matching is case-insensitive (`PersistenceStrategyResolver.java:63-75`).
- **Longest-prefix wins** when multiple keys could match.
- A URL may contain a single `%s` placeholder. In preview environments this is substituted with the PR-number suffix of the case type ID (`PersistenceStrategyResolver.java:171,175`). Only one placeholder is allowed.

`DelegatingCaseDetailsRepository.set()` (`DelegatingCaseDetailsRepository.java:46`) checks `resolver.isDecentralised(caseDetails)` — if true, it throws `UnsupportedOperationException` because decentralised case pointers are immutable. Reads route through `findAndDelegate()` to `ServicePersistenceClient.getCase()`. Event submissions go directly through `ServicePersistenceClient.createEvent()`.

---

## Auth headers

All requests from data-store to the remote service are made via a Feign client (`ServicePersistenceAPI`) intercepted by `ServicePersistenceAPIInterceptor`. Headers added to every request:

| Header | Value |
|---|---|
| `Authorization` | User JWT (Bearer token) |
| `ServiceAuthorization` | S2S token identifying `ccd_data` |

The PCS service is registered as microservice `pcs_api` on the S2S side.

---

## Endpoint reference

### `POST /ccd-persistence/cases`

Submit a create or update event.

**Required header**: `Idempotency-Key: <UUID>`

The remote service **must** honour idempotency: a second call with the same key must return the same response as the first (`ServicePersistenceAPI.java:46` javadoc).

**Request body** — `DecentralisedCaseEvent` (snake_case on the wire):

| Field | Type | Notes |
|---|---|---|
| `case_details` | `CaseDetails` | Full case data at time of submission |
| `case_details_before` | `CaseDetails` | Case data before the event |
| `event_details` | `DecentralisedEventDetails` | Nested object with `event_id`, `event_name`, `description`, `summary`, `proxied_by`, etc. |
| `resolved_ttl` | `LocalDate` | Resolved TTL date (if applicable) |
| `internal_case_id` | `Long` | CCD's internal `case_data.id` (needed for ES indexing) |
| `start_revision` | `Long` | Revision when the user started the event |
| `merge_revision` | `Long` | Revision CCD merged updates into before submission |

**Response body** — `DecentralisedSubmitEventResponse` (snake_case on the wire):

The response uses `@JsonUnwrapped` on its `DecentralisedCaseDetails` field, so the top-level JSON looks like:

| Field | Type | Notes |
|---|---|---|
| `case_details` | `CaseDetails` | Unwrapped from `DecentralisedCaseDetails`; must include `reference`, `case_type_id`, `jurisdiction` |
| `revision` | `Long` | Unwrapped from `DecentralisedCaseDetails`; optimistic-concurrency token |
| `errors` | `List<String>` | Non-empty causes data-store to surface a 422 |
| `warnings` | `List<String>` | Non-empty causes 422 unless `ignore_warning=true` |
| `ignore_warning` | `Boolean` | Echo of caller's ignore-warning flag |

**Validation** (`ServicePersistenceClient.java:131-163`): data-store asserts that the response `reference`, `caseTypeId`, and `jurisdiction` match the submitted values. Any mismatch throws `ServiceException`.

**Callback bypass**: decentralised cases skip the standard `about_to_submit` and `submitted` CCD callbacks — the remote service is expected to handle its own business logic inline (`CallbackInvoker.java:98-99,123-125`).

---

### `GET /ccd-persistence/cases?case-refs=<ref>[,<ref>...]`

Fetch one or more cases by case reference.

**Query parameter**: `case-refs` — comma-separated list of case references.

**Response**: list of `DecentralisedCaseDetails`:

| Field | Type | Notes |
|---|---|---|
| `case_details` | `CaseDetails` | Case data |
| `revision` | `Long` | Optimistic-concurrency token |

After retrieval, `ServicePersistenceClient.getCase()` (`ServicePersistenceClient.java:38`) injects the internal CCD `id` (auto-incremented integer from the data-store's own DB) onto the returned object (`ServicePersistenceClient.java:54`). The external service never receives or stores this `id`.

---

### `POST /ccd-persistence/cases/{caseRef}/supplementary-data`

Update supplementary data for a case. Supplementary data is a separate JSONB bag stored alongside case data and is not returned in regular case GET responses.

**Path parameter**: `caseRef` — the case reference string.

**Request body** — `SupplementaryDataUpdateRequest`:

| Operation key | Meaning |
|---|---|
| `$set` | Overwrite a path in the supplementary data bag |
| `$inc` | Atomically increment a numeric path |

**Response**: HTTP 200 with updated `SupplementaryData`.

---

### `GET /ccd-persistence/cases/{caseRef}/history`

Fetch the full audit-event list for a case.

**Path parameter**: `caseRef` — case reference.

**Response**: list of `AuditEvent` objects.

Data-store validates that each returned event's `caseReference` and `caseTypeId` match the requested case before returning results (`ServicePersistenceClient.extractValidatedAuditEvent()` at `ServicePersistenceClient.java:165-183`).

---

### `GET /ccd-persistence/cases/{caseRef}/history/{eventId}`

Fetch a single audit event.

**Path parameters**:

| Parameter | Meaning |
|---|---|
| `caseRef` | Case reference |
| `eventId` | The specific event record ID |

**Response**: single `AuditEvent`.

Same cross-validation of `caseReference` / `caseTypeId` as the list endpoint.

---

## Idempotency requirements

| Requirement | Detail |
|---|---|
| Header | `Idempotency-Key` must be a UUID; enforced by `IdempotencyEnforcer` in the SDK runtime |
| Behaviour | Identical key on repeat `POST /ccd-persistence/cases` must produce the same response |
| Scope | Key is scoped to the event submission; data-store retrieves it via `idempotencyKeyHolder.getKey()` at `ServicePersistenceClient.java:73` |
| No shared store | Data-store does not record used keys; the remote service owns the idempotency check |

---

## Ordering guarantees

- Data-store calls `/ccd-persistence/cases` **synchronously** inside the Feign client; there is no queue or async dispatch.
- The `submitted` callback phase is skipped for decentralised cases, so there is no post-transaction fire-and-forget (`CallbackInvoker.java:123-125`).
- No ordering guarantee is provided across concurrent requests; the remote service must use `revision` for optimistic-concurrency control.

---

## SDK implementation (`ccd-config-generator` decentralised-runtime)

Service teams using `ccd-config-generator` get a ready-made implementation via the `sdk/decentralised-runtime` module.

`ServicePersistenceController` (`ServicePersistenceController.java:25-28`) is a `@RestController @RequestMapping("/ccd-persistence")` that implements all five endpoints above.

On `POST /ccd-persistence/cases` (`ServicePersistenceController.java:57-74`):

1. `IdempotencyEnforcer` validates the `Idempotency-Key` header.
2. `CaseSubmissionService.submit()` inspects the event definition (`CaseSubmissionService.java:41`):
   - If the event has `submitHandler` set → routes to `DecentralisedSubmissionHandler`.
   - Otherwise → routes to `LegacyCallbackSubmissionHandler` (fires standard CCD webhooks).
3. `DecentralisedSubmissionHandler.apply()` (`DecentralisedSubmissionHandler.java:27-65`) resolves event config from `ResolvedConfigRegistry`, deserialises case data to the typed domain class, and calls `submitHandler.submit(EventPayload)`.

`DecentralisedDataConfiguration` (`DecentralisedDataConfiguration.java:17-50`) runs SDK Flyway migrations from `classpath:dataruntime-db/migration` in schema `ccd` before application migrations. It is `@ConditionalOnMissingBean(FlywayMigrationStrategy.class)` — if the service registers its own `FlywayMigrationStrategy`, SDK migrations will not run automatically.

The `build.gradle` opt-in for a service team:

```groovy
// pcs-api/build.gradle
ccd {
    decentralised = true
}
```

---

## Constraints and gotchas

| Constraint | Detail |
|---|---|
| Internal contract | `/ccd-persistence/*` is consumed by CCD data-store only; service-team code must not call it directly |
| Internal `id` not shared | CCD's integer `id` is injected after retrieval; the remote service never receives it (`ServicePersistenceClient.java:54,108`) |
| Prefix matching is case-insensitive | Config keys are lowercased at load; case type IDs are matched after lowercasing (`PersistenceStrategyResolver.java:63-75`) |
| One `%s` only | Preview URL templates may contain exactly one `%s`; more than one causes a format error (`PersistenceStrategyResolver.java:175`) |
| `submitHandler` is mutually exclusive | Setting both `submitHandler` and `aboutToSubmitCallback` on an event throws `IllegalStateException` at startup (`Event.java:196-203`) |
| `about_to_submit` and `submitted` skipped | Decentralised cases bypass both CCD callback phases; the service owns all business logic in the `submitHandler` |
| Flyway schema conflict | SDK migrations target schema `ccd`; service app migrations must not overlap (`DecentralisedDataConfiguration.java:17-50`) |

---

## See also

- [Decentralisation](../explanation/decentralisation.md) — architectural rationale and data-flow overview
- [Decentralise a service](../how-to/decentralise-a-service.md) — step-by-step guide to opting a case type into decentralised persistence
- [Glossary](glossary.md) — definitions of `submitHandler`, `Idempotency-Key`, `PersistenceStrategyResolver`

## Glossary

| Term | Definition |
|---|---|
| `submitHandler` | Lambda set on a CCD event definition (via SDK) that replaces `aboutToSubmitCallback` in decentralised mode; invoked by `DecentralisedSubmissionHandler` inside the service process |
| `Idempotency-Key` | UUID HTTP header required on `POST /ccd-persistence/cases`; the remote service uses it to detect and replay duplicate submissions |
| `PersistenceStrategyResolver` | Data-store component that reads `ccd.decentralised.case-type-service-urls` and determines, by case-type prefix, whether a given case type is stored locally or externally |
| `DecentralisedCaseEvent` | Request payload sent to `POST /ccd-persistence/cases`; wraps `CaseDetails` plus `eventId` and `ignoreWarning` |
| `revision` | Opaque token returned in every `DecentralisedCaseDetails` response; used by data-store for optimistic-concurrency validation |
