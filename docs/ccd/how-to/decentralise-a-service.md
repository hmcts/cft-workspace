---
topic: decentralisation
audience: both
sources:
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/ServicePersistenceController.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/CaseSubmissionService.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/DecentralisedSubmissionHandler.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/IdempotencyEnforcer.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/MessagePublisher.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/config/DecentralisedDataConfiguration.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/resources/dataruntime-db/migration/V0004.sql
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/DecentralisedConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/EventPayload.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPI.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPIInterceptor.java
  - ccd-data-store-api:src/main/resources/application.properties
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/PCSCaseView.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/CaseType.java
  - pcs-api:build.gradle
examples_extracted_from:
  - apps/pcs/pcs-api/src/main/java/uk/gov/hmcts/reform/pcs/ccd/event/TestCaseGeneration.java
status: confluence-augmented
last_reviewed: "2026-04-29T00:00:00Z"
confluence_checked_at: "2026-04-29T00:00:00Z"
confluence:
  - id: "1875854371"
    title: "Decentralised data persistence"
    space: "RCCD"
    last_modified: "2025-09-26"
  - id: "1923744323"
    title: "Decentralised professional journeys"
    space: "RRFM"
    last_modified: "2026-02-05"
  - id: "1915164147"
    title: "Decentralising Data HLSA"
    space: "RCCD"
    last_modified: "2025-12-02"
  - id: "1914801940"
    title: "CIC CCD Decentralisation - Solution Overview"
    space: "SPT"
    last_modified: "2025-12-02"
  - id: "1945640575"
    title: "ExUI Decentralisation (Platform Enablement) HLSA"
    space: "POFCC"
    last_modified: "2026-02-23"
---

# Decentralise a Service

## TL;DR

- In decentralised mode the service owns its own database; CCD stores only an immutable case-pointer (`reference`, `case_type_id`, `jurisdiction`) and delegates all case reads and writes to the service's `/ccd-persistence/*` REST endpoints.
- The SDK's `decentralised-runtime` module auto-registers `ServicePersistenceController` at `/ccd-persistence` -- you do not write that controller.
- Enable with `ccd { decentralised = true }` in `build.gradle`, implement `CaseView<T, S>`, and use `configureDecentralised(DecentralisedConfigBuilder)` for events with in-process handlers.
- Each decentralised event uses a typed `Submit<T, S>` handler receiving `EventPayload<T, S>` and replaces the `AboutToSubmit` and `Submitted` webhook callbacks (they are suppressed by `CallbackInvoker` for decentralised case types).
- The SDK also handles event message publishing via the Transactional Outbox Pattern (`message_queue_candidates` table) and Elasticsearch indexing via `es_queue`.
- PCS (`apps/pcs/pcs-api`) is the canonical production reference; CIC (Criminal Injuries Compensation) is the second live adopter. See [Decentralisation explanation](../explanation/decentralisation.md) for architecture.

---

## Prerequisites

- Spring Boot 3 service using `ccd-config-generator` SDK.
- Service has its own PostgreSQL schema; SDK Flyway migrations will create a `ccd` schema alongside it.
- `CCDConfig<T, S, R>` entry point already exists (see `CaseType.java` in PCS).
- S2S secret configured (`idam.s2s-auth.secret`, `idam.s2s-auth.microservice`).

---

## Steps

### 1. Enable decentralised mode in Gradle

In `build.gradle`, set `decentralised = true` inside the `ccd { }` block:

```groovy
ccd {
    decentralised   = true
    runtimeIndexing = true   // re-index CCD config on startup
}
```

This causes the plugin to pull in the `decentralised-runtime` dependency and wire
`ServicePersistenceController` automatically (`build.gradle:98-102` in pcs-api).

> `runtimeIndexing` is separate from `decentralised` -- it controls whether the CCD
> definition is re-resolved at startup. Enable it when running locally or in preview.

---

### 2. Implement CaseView

`CaseView<T, S>` is the hook called by the SDK when CCD requests a case read
(`GET /ccd-persistence/cases?case-refs=...`).

```java
@Component
public class MyCaseView implements CaseView<MyCase, State> {
    @Override
    public MyCase getCase(CaseViewRequest<State> request) {
        MyCaseEntity entity = repo.findByCaseReference(request.caseRef())
            .orElseThrow(() -> new CaseNotFoundException(request.caseRef()));
        MyCase caseData = toMyCase(entity);
        caseData.setSearchCriteria(new SearchCriteria()); // Required for Global Search
        return caseData;
    }
}
```

Reference: `PCSCaseView.getCase()` (`pcs-api:src/.../PCSCaseView.java:82`). The two-overload
form `getCase(request, blobCase)` is for legacy blob-based services only.

---

### 3. Define decentralised events

Override `configureDecentralised(DecentralisedConfigBuilder<T, S, R> builder)` on your
`CCDConfig` implementation instead of (or alongside) `configure()`.

```java
@Override
public void configureDecentralised(DecentralisedConfigBuilder<MyCase, State, UserRole> builder) {
    // Submit-only event
    builder.decentralisedEvent("createClaim", payload -> {
            myService.handleCreate(payload.caseData());
            return SubmitResponse.defaultResponse();
        })
        .name("Create Claim")
        .grant(Set.of(CREATE, READ, UPDATE), UserRole.CASEWORKER);

    // Event with start handler (pre-populates form data)
    builder.decentralisedEvent("resumeClaim",
        startPayload  -> myService.prepareResume(startPayload),
        submitPayload -> { myService.resume(submitPayload.caseData()); return SubmitResponse.defaultResponse(); })
        .name("Resume Claim");
}
```

Key types (`ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/`):

| Symbol | Notes |
|---|---|
| `DecentralisedConfigBuilder.decentralisedEvent(id, submitHandler)` | Submit-only variant |
| `DecentralisedConfigBuilder.decentralisedEvent(id, submitHandler, startHandler)` | With pre-population |
| `EventPayload<T, S>` record | `caseReference`, `caseData()`, `urlParams` |
| `SubmitResponse.defaultResponse()` | No-op response; service has handled everything |

> `decentralisedEvent` is only available on `DecentralisedConfigBuilder`, not the base
> `ConfigBuilder`. Setting `aboutToSubmitCallback` and a `submitHandler` on the same event
> throws `IllegalStateException` at startup (`Event.java:188-199`).

---

### 4. Configure SDK Flyway migrations

`DecentralisedDataConfiguration` (`@AutoConfiguration(before = FlywayAutoConfiguration.class)`)
registers a `FlywayMigrationStrategy` that runs SDK migrations against schema `ccd`
from `classpath:dataruntime-db/migration` before your own migrations run
(`DecentralisedDataConfiguration.java:17-50`).

The SDK creates the following tables in the `ccd` schema (among others):

| Table | Purpose |
|---|---|
| `case_data` | Service-local store of case data, state, supplementary data |
| `case_event` | Audit trail of all events including `idempotency_key` (UUID) |
| `message_queue_candidates` | Transactional outbox for Work Allocation / task management messages |
| `es_queue` | Queue for Elasticsearch indexing (populated by trigger on `case_event` insert) |

No explicit wiring needed unless you declare your own `FlywayMigrationStrategy` bean (the
SDK's won't auto-run due to `@ConditionalOnMissingBean` -- invoke `SdkFlywayMigrationStrategy`
manually in that case). Ensure your migrations do not conflict with schema `ccd`.

---

### 5. Register the service URL with CCD data-store

CCD's `PersistenceStrategyResolver` consults the property
`ccd.decentralised.case-type-service-urls[<CASE_TYPE>]` to decide whether a case type is
decentralised (URL present) or centralised (default). The presence of a URL **is** what marks
the case type as decentralised -- there is no separate flag in the case-type definition
(`apps/ccd/ccd-data-store-api:src/main/resources/application.properties:205-206`).

As a service team, raise a PR against `ccd-data-store-api` (or its Helm chart) to add:

```properties
ccd.decentralised.case-type-service-urls[PCS]=http://localhost:4013
```

Env-var form: `CCD_DECENTRALISED_CASE-TYPE-SERVICE-URLS_PCS=http://localhost:3206`. In preview
environments set `CASE_TYPE_SUFFIX=pr-123` to namespace the case type ID
(`CaseType.java:44-48`).

> **Performance:** the resolver uses a Caffeine LRU cache (100k entries, ~10MB) for routing.
> Expect ~25ms extra latency per decentralised hop.
> <!-- CONFLUENCE-ONLY: Caffeine cache size and 25ms latency budget come from the LLD; not directly grepped from source -->

#### What CCD writes for a decentralised case pointer

CCD persists an **immutable pointer** (`reference`, `jurisdiction`, `case_type_id`,
`created_date`) in its `case_data` table. All mutable columns are zeroed: `state=''`,
`security_classification=RESTRICTED`, `data={}`, `supplementary_data=NULL`. The `resolved_ttl`
column remains CCD-authoritative. See [decentralisation explanation](../explanation/decentralisation.md)
for the full column mapping.

<!-- CONFLUENCE-ONLY: column-by-column zeroing rules described in the LLD; not verified by direct grep of CCD repo Flyway migrations in this pass -->

The pointer is written in a **new, independent transaction** (`REQUIRES_NEW`) so it commits
even if `submitEvent` subsequently fails. On failure (4xx, or 2xx with non-empty `errors`)
CCD cleans up the pointer. Orphans left by CCD crashes are invisible to API consumers and
reaped via a 1-year default `resolvedTTL`.

---

### 6. Wire the callback host

In your `CCDConfig.configure()` or `configureDecentralised()`, set the callback host so
generated webhook URLs point to your service:

```java
builder.setCallbackHost(System.getenv().getOrDefault("CASE_API_URL", "http://localhost:3206"));
```

(`pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/CaseType.java:51-97`)

---

### 7. Configure message publishing (Work Allocation)

The SDK's `MessagePublisher` inserts messages into `ccd.message_queue_candidates` within the
same transaction as the case event (Transactional Outbox Pattern). Only events with
`publish = true` in the CCD definition emit messages. Enable with:

```yaml
ccd.messaging.enabled: true
ccd.messaging.topicName: ${CCD_MESSAGES_TOPIC_NAME:ccd-case-events}
```

CCD's existing message publisher service can be reused -- the SDK writes to the same
`message_queue_candidates` schema that the publisher reads from.

<!-- source: ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/MessagePublisher.java:48-96 -->

---

### 8. Configure Elasticsearch indexing

Provision a **dedicated Logstash instance** that reads from the SDK's `ccd.es_queue` table
(populated by a PostgreSQL trigger on `case_event` insert) into CCD's central ES cluster.
Use ES **external versioning** and start version numbers at **v > 1** so your writes take
precedence over any stale centralised Logstash indexing.

<!-- CONFLUENCE-ONLY: Logstash provisioning and external-versioning requirements from the LLD; the SDK provides the es_queue table but the Logstash pipeline configuration is operational -->

---

### 9. Implement retain-and-dispose cleanup

CCD's `resolvedTTL` is **authoritative** -- computed during event submission and passed in the
request body. Your service must persist it and run a **garbage-collection cron** that:

1. Finds cases where `resolved_ttl` is in the past.
2. Issues `GET /cases/{ref}` (system user) against CCD.
3. If CCD returns **404** (pointer disposed), deletes all local data for that case.

TTL changes must be synchronised back to CCD via dedicated system events.

<!-- CONFLUENCE-ONLY: garbage-collection cron pattern described in the LLD and Scope of Delivery page; not present in SDK source code -->

---

### 10. (Optional) ExUI decentralised journeys

If your service provides a **custom frontend** for certain events (e.g., high-volume judicial
workflows), prefix the CCD event ID with `ext:` (e.g., `ext:createOrder`) and configure ExUI
with `DECENTRALISED_EVENT_BASE_URLS` mapping your case type to your frontend's base URL.
ExUI then redirects the browser to
`:base_url/cases/:case_ref/event/:event_id?expected_sub=:idam_user_id` (or the case-create
variant). Your frontend must verify the IDAM session and redirect back to ExUI on completion.

<!-- CONFLUENCE-ONLY: ext: prefix convention and ExUI delegation model from the ExUI Decentralisation HLSA; not in SDK source -->

---

### 11. Verify the endpoint contract

No generic contract-test suite ships with the SDK. Mirror PCS's Pact tests
(`pcs-api:src/contractTest/java/`) as a starting point. The authoritative client-side
contract is `ServicePersistenceAPI.java` in `ccd-data-store-api`.

The five SDK-provided endpoints (`ServicePersistenceController.java:35-107`):

| Endpoint | Method | Required headers (sent by CCD) |
|---|---|---|
| `/ccd-persistence/cases` | `GET` (`?case-refs=`) | `Authorization`, `ServiceAuthorization` |
| `/ccd-persistence/cases` | `POST` | `Authorization`, `ServiceAuthorization`, `Idempotency-Key` (UUID) |
| `/ccd-persistence/cases/{ref}/supplementary-data` | `POST` | `Authorization`, `ServiceAuthorization` |
| `/ccd-persistence/cases/{ref}/history` | `GET` | `Authorization`, `ServiceAuthorization` |
| `/ccd-persistence/cases/{ref}/history/{event-id}` | `GET` | `Authorization`, `ServiceAuthorization` |

> The SDK controller only enforces non-blank `Authorization` (returns 401 if blank). The LLD
> states services **MUST** also validate `ServiceAuthorization` (S2S). Wire in
> `ServiceAuthFilter` yourself if you need S2S enforcement on these paths.
> <!-- DIVERGENCE: Confluence LLD says both headers are required and services MUST validate S2S; the SDK-provided controller only validates Authorization. Source wins on what the SDK enforces; Confluence wins on what services SHOULD enforce. -->

#### Idempotency

Every `POST /ccd-persistence/cases` carries an `Idempotency-Key` UUID header. The SDK
enforces this via `SELECT ... FOR UPDATE` on `ccd.case_data` joined to `ccd.case_event` on
`idempotency_key` (`IdempotencyEnforcer.java:23-59`). On duplicate keys it replays the
historical response (`CaseSubmissionService.java:113-118`). CCD will **not** retry on failure
(unlike legacy callbacks); upstream clients may retry on ambiguous responses.
<!-- CONFLUENCE-ONLY: "CCD will not retry" comes from the LLD; the retry policy lives on the CCD data-store side, not in the SDK source. -->

#### HTTP status codes

The LLD contract specifies `201 Created` (new), `200 OK` (idempotent replay), `409 Conflict`,
`422 Unprocessable Entity` (validation failure), and `400 Bad Request`. The SDK currently
returns `200 OK` for both new events and replays, and `200 OK` with errors in body instead of
`422`. The SDK does emit `409` (concurrency) and `400` (bad event/type) correctly.

<!-- DIVERGENCE: Confluence LLD prescribes 201/422 for the contract; the SDK-provided controller in ccd-config-generator currently returns 200 with errors in body for both. Source wins for what the SDK does today. Services that implement /ccd-persistence themselves (without the SDK controller) should follow the LLD. -->

If you implement `/ccd-persistence` yourself (e.g. non-Java service), follow the LLD status
codes -- that is the contract CCD's data-store side expects long-term.

#### Request body (`DecentralisedCaseEvent`)

Key fields: `case_details` (required, state after AboutToStart/MidEvent), `case_details_before`
(optional), `event_details` (required: `case_type`, `event_id`, `event_name`, `summary`,
`description`, `proxied_by*`), `internal_case_id` (ES index PK), `resolved_ttl` (authoritative
TTL), `start_revision`, `merge_revision` (null for new cases). See the
[decentralised callbacks reference](../reference/decentralised-callbacks.md) for full schema.

<!-- CONFLUENCE-ONLY: internal_case_id, start_revision, merge_revision fields documented in the LLD; present in ccd-data-store-api DTOs but detailed usage is LLD-specified -->

---

## Verify

1. Start the service locally and confirm the `/ccd-persistence` endpoints are reachable:

   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     -H "Authorization: Bearer <s2s-token>" \
     "http://localhost:3206/ccd-persistence/cases?case-refs=1234567890123456"
   # Expect 200 or 404 (not 401 or 500)
   ```

2. In CCD UI (or via API), trigger a decentralised event and confirm the case data appears
   correctly from your service's database, not from CCD's data store. Query your DB directly
   to confirm the row was created or updated by the `submitHandler`.

3. Verify message publishing by checking `ccd.message_queue_candidates` has a row after
   the event (if the event has `publish = true` in its CCD definition).

---

## Example

Full working example at
`apps/pcs/pcs-api/src/main/java/uk/gov/hmcts/reform/pcs/ccd/event/TestCaseGeneration.java`.
Key pattern:

```java
configBuilder
    .decentralisedEvent(createTestCase.name(), this::submit, this::start)
    .initialState(AWAITING_SUBMISSION_TO_HMCTS)
    .showSummary()
    .name("Test Support Case Creation")
    .grant(Permission.CRUD, UserRole.PCS_SOLICITOR);
```

The `start` handler populates form data; the `submit` handler persists to the service's own
DB and returns `SubmitResponse.<State>builder().state(CASE_ISSUED).build()`.

## See also

- [Decentralisation](../explanation/decentralisation.md) -- architecture overview of decentralised vs centralised CCD
- [Decentralised callbacks reference](../reference/decentralised-callbacks.md) -- full endpoint contract for `/ccd-persistence`

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

