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
  - ccd-config-generator:sdk/decentralised-runtime/src/main/resources/dataruntime-db/migration/V0010__rebuild_es_queue_for_revision_based_indexing.sql
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/AuditEventService.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/DecentralisedConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/EventPayload.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPI.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPIInterceptor.java
  - ccd-data-store-api:src/main/resources/application.properties
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/PCSCaseView.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/CaseType.java
  - rpx-xui-webapp:src/cases/utils/decentralised-redirect.util.ts
  - rpx-xui-webapp:api/noc/index.ts
  - rpx-xui-webapp:config/custom-environment-variables.json
  - rpx-xui-webapp:src/cases/components/case-task/case-task.component.ts
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/payload/VerifyNoCAnswersRequest.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/payload/RequestNoticeOfChangeRequest.java
examples_extracted_from:
  - apps/pcs/pcs-api/src/main/java/uk/gov/hmcts/reform/pcs/ccd/event/TestCaseGeneration.java
status: confluence-augmented
last_reviewed: "2026-04-29T00:00:00Z"
confluence_checked_at: "2026-08-20T00:00:00Z"
confluence:
  - id: "1875854371"
    title: "Decentralised data persistence"
    space: "RCCD"
    last_modified: "2025-09-26"
  - id: "1923744323"
    title: "Decentralised professional journeys"
    space: "RRFM"
    last_modified: "2026-05-15"
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
    last_modified: "2026-06-15"
title: Decentralise a Service
diataxis: how-to
product: ccd
sources_sha:
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/ServicePersistenceController.java": "54351c2ee6faec3864a4c840e80ecfc707fb4565"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/CaseSubmissionService.java": "05e79e063aacd4ec9393d10254a9697bd37b2b50"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/DecentralisedSubmissionHandler.java": "2f14a4b0c584668faeed880627749fe0f540e95b"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/IdempotencyEnforcer.java": "9fe79e8e30e98faf96dc3411d069b09a08a2a295"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/MessagePublisher.java": "251a3705776c4f3382f9ced6212879a83c50a4e9"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/config/DecentralisedDataConfiguration.java": "9fc415b2a5a8f0d4cba457af5b223818b4ff3ee9"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/resources/dataruntime-db/migration/V0004.sql": "38ed5f63d1bd4cf8871e1dd9c7d677e425a240b7"
  ? "ccd-config-generator:sdk/decentralised-runtime/src/main/resources/dataruntime-db/migration/V0010__rebuild_es_queue_for_revision_based_indexing.sql"
  : "85f32117928bda311dd7c752f185ba9cd47c7464"
  "ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/AuditEventService.java": "2c5e11485c5e17da845232984205437ee223296a"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/DecentralisedConfigBuilder.java": "38ed5f63d1bd4cf8871e1dd9c7d677e425a240b7"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/EventPayload.java": "38ed5f63d1bd4cf8871e1dd9c7d677e425a240b7"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java": "ac7903028377c2d50c8f1db55c4150eae2fa7414"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPI.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPIInterceptor.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/resources/application.properties": "5daf60c31eeb61da276722c2639fa50d279a26a8"
  "pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/PCSCaseView.java": "a2e5c9892a3a612b44af41cd14091271de38b1c4"
  "pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/CaseType.java": "e00246fd7f6870e3e737d286b5a5725dab466681"
  "rpx-xui-webapp:src/cases/utils/decentralised-redirect.util.ts": "28b9601a35fef875ae46fced731f4ce7fa73c143"
  "rpx-xui-webapp:api/noc/index.ts": "28b9601a35fef875ae46fced731f4ce7fa73c143"
  "rpx-xui-webapp:config/custom-environment-variables.json": "69fa77d263137c54c33a0bddfd86586ba585e63c"
  "rpx-xui-webapp:src/cases/components/case-task/case-task.component.ts": "28b9601a35fef875ae46fced731f4ce7fa73c143"
  ? "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/payload/VerifyNoCAnswersRequest.java"
  : "dfa7debe58dc4710124070b6a29448dfda6fce67"
  ? "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/payload/RequestNoticeOfChangeRequest.java"
  : "dfa7debe58dc4710124070b6a29448dfda6fce67"
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
`ServicePersistenceController` automatically (`build.gradle` in pcs-api).

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
    @Transactional(readOnly = true)
    public MyCase getCase(CaseViewRequest<State> request) {
        MyCaseEntity entity = repo.findByCaseReference(request.caseRef())
            .orElseThrow(() -> new CaseNotFoundException(request.caseRef()));
        MyCase caseData = toMyCase(entity);
        caseData.setSearchCriteria(new SearchCriteria()); // Required for Global Search
        return caseData;
    }
}
```

Reference: `PCSCaseView.getCase()` (`pcs-api:src/.../PCSCaseView.java:104-105`). The two-overload
form `getCase(request, blobCase)` is for legacy blob-based services only.

Annotate `getCase` `@Transactional(readOnly = true)`, as PCS does. The SDK does not open a
transaction for you before calling the bean, so assembling the projection from a JPA entity graph
outside one leaves you either issuing a separate query per association or hitting
`LazyInitializationException` — and a read-only transaction keeps Hibernate from flushing dirty
state back out of what is meant to be a pure read.

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

`DecentralisedFlywayAutoConfiguration` (`@AutoConfiguration(before = FlywayAutoConfiguration.class)`)
registers a `FlywayMigrationStrategy` that runs SDK migrations against schema `ccd`
from `classpath:dataruntime-db/migration` before your own migrations run
(`DecentralisedFlywayAutoConfiguration.java:24-44`). The bean used to live on
`DecentralisedDataConfiguration`, which now pulls it in with `@ImportAutoConfiguration`;
the behaviour is unchanged. Giving it its own class is what lets it be named in the
Spring Boot test-slice imports files — `JdbcTest.imports`, `DataJdbcTest.imports`,
`JooqTest.imports` and `DataJpaTest.imports` each list it, so a slice test, which loads
only the auto-configurations it names, still gets the SDK schema migrated.

The SDK creates the following tables in the `ccd` schema (among others):

| Table | Purpose |
|---|---|
| `case_data` | Service-local store of case data, state, supplementary data |
| `case_event` | Audit trail of all events including `idempotency_key` (UUID) |
| `message_queue_candidates` | Transactional outbox for Work Allocation / task management messages |
| `es_queue` | Queue for Elasticsearch indexing, keyed `(reference, case_revision)`; populated by a trigger on `case_data` insert-or-update |

No explicit wiring needed unless you declare your own `FlywayMigrationStrategy` bean. The SDK's
`orderedFlywayMigrationStrategy` is `@ConditionalOnMissingBean`, so yours replaces it entirely
and the SDK migrations stop running -- in that case your strategy must load
`classpath:dataruntime-db/migration` against schema `ccd` itself, before your own migrations.
Ensure your migrations do not conflict with schema `ccd`.

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
(`CaseType.java:64-80`).

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
@Value("${caseApi.url}")
private String caseApiUrl;

@Override
public void configure(final ConfigBuilder<PCSCase, State, AccessProfile> builder) {
    builder.setCallbackHost(caseApiUrl);
    // ...
}
```

(`pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/CaseType.java:58-59,103-105`)

PCS injects the host from Spring configuration rather than reading `System.getenv()` directly, so
the value comes from `caseApi.url` in `application.yaml` and follows the usual property-override
rules. Reading `CASE_API_URL` from the environment inline, as some older services do, works too —
it just bypasses Spring's property resolution.

---

### 7. Configure message publishing (Work Allocation)

This step needs **no configuration** — the SDK wires it up automatically. `MessagePublisher`
inserts into `ccd.message_queue_candidates` from within `AuditEventService.saveAuditRecord`,
so the outbox row shares the transaction with the case event and your domain write
(Transactional Outbox Pattern).

You do need to mark each event you want published with `publish = true` in the CCD definition;
otherwise `MessagePublisher` logs "not marked for publishing" and inserts nothing
(`MessagePublisher.java:64-68`). This is the only thing you control.

CCD emits no message of its own for a decentralised event — its centralised publish call sits
inside the audit-event method that the decentralised branch skips
(`ccd-data-store-api:CreateCaseEventService.java:587`). If this outbox row isn't written,
Work Allocation never hears about the event.

CCD's existing message publisher service can be reused -- the SDK writes to the same
`message_queue_candidates` schema that the publisher reads from.

<!-- source: ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/MessagePublisher.java:47-96 -->
<!-- source: ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/AuditEventService.java:195-213 -->

---

### 8. Configure Elasticsearch indexing

Provision a **dedicated Logstash instance** that reads from the SDK's `ccd.es_queue` table
into CCD's central ES cluster. The queue is revision-driven: a trigger on `ccd.case_data`
insert-or-update enqueues `(reference, case_revision)`, deduplicating via
`on conflict do nothing` (`dataruntime-db/migration/V0010__rebuild_es_queue_for_revision_based_indexing.sql`).
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

If your service provides a **custom frontend** for certain events (e.g. high-volume judicial
workflows), prefix the CCD event ID with `ext:` (e.g. `ext:createOrder`) and add your case type
to ExUI's `DECENTRALISED_CASE_TYPE_CONFIG`. This has shipped in `rpx-xui-webapp`; it is not
something the SDK provides.

```json
DECENTRALISED_CASE_TYPE_CONFIG={
  "PCS": {
    "webUrl": "https://pcs-frontend.service.gov.uk",
    "nocBaseUrl": "https://pcs-api.service.core-compute.internal/ccd"
  }
}
```

The env var is parsed as JSON into the config key `decentralisedCaseTypeConfig`, which defaults
to `{}` — so services that do not opt in are unaffected
(`rpx-xui-webapp:config/custom-environment-variables.json:144-147`, `config/default.json:121`).

**Matching is by case-type prefix, not exact case type.** Both the browser-side redirect and the
Node BFF's NoC routing lowercase the configured keys and the incoming case type, keep every key
the case type starts with, then take the **longest** match. A `%s` in `webUrl`/`nocBaseUrl` is
replaced with whatever follows the matched prefix in the *original-cased* case type, and trailing
slashes are stripped. So a `PCS` key with `webUrl: "https://pcs%s.preview.platform.hmcts.net"`
resolves case type `PCS-PR-123` to `https://pcs-PR-123.preview.platform.hmcts.net` — one key
covers all your preview environments.

#### Event redirects

`buildDecentralisedEventUrl` returns a URL only when the event ID starts with `ext:` **and** the
case type resolves to a `webUrl`; otherwise the standard ExUI journey continues, which is what
keeps the feature backward compatible. The two shapes are:

| Entry point | Redirect target |
|---|---|
| Existing case (`case-home.component.ts`) | `:web_url/cases/:case_id/event/:event_id?expected_sub=:idam_user_id` |
| Case create (`case-create.effects.ts`) | `:web_url/cases/case-create/:jurisdiction/:case_type/:event_id?expected_sub=:idam_user_id` |

Every path segment is `encodeURIComponent`-escaped. `expected_sub` is read from the session's
`userDetails` (`id`, falling back to `uid`) and is **omitted entirely** if that lookup fails — so
treat a missing `expected_sub` as "cannot check", not as "session is fine".

For task deep links, ExUI substitutes `${[EXPECTED_SUB]}` in the task description with the
URL-encoded IDAM ID. Unlike `${[CASE_REFERENCE]}`, `${[case_id]}` and `${[id]}`, this placeholder
is **not** in the component's `VARIABLES` list — it is replaced in a separate branch guarded on a
truthy `expectedSub`, so if the session has no `userDetails` the literal `${[EXPECTED_SUB]}` is
left in the rendered link (`rpx-xui-webapp:src/cases/components/case-task/case-task.component.ts:74-84`).

#### Notice of change

If your decentralised case type owns an unbounded multiparty party/representative model, the
centralised NoC implementation does not fit it — it assumes static case-role-to-case-field
mappings and one organisation policy per case role. ExUI keeps the NoC *screens* central and
delegates the *decision* to you via `nocBaseUrl`:

| ExUI BFF route | Forwarded to | Notes |
|---|---|---|
| `GET /noc/noc-questions?case_id=` | **always** AAC | challenge questions stay in the case definition |
| `POST /noc/verify-noc-answers` | `nocBaseUrl` if configured, else AAC | request shape follows AAC's `VerifyNoCAnswersRequest` |
| `POST /noc/noc-requests` | `nocBaseUrl` if configured, else AAC | request shape follows AAC's `RequestNoticeOfChangeRequest` |

Both payloads are `{ case_id, answers[] }`, with `case_id` a 16-digit Luhn-checked string
(`aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/payload/`).

One trap: ExUI learns the case type from the `noc-questions` **response** and caches it in the
session under `nocCaseTypesByCaseId`. `verify-noc-answers` and `noc-requests` resolve `nocBaseUrl`
from that cache, so a request that arrives without the questions call having happened in the same
session falls back to AAC (`rpx-xui-webapp:api/noc/index.ts:63-80,89-113`).

Your service must make the NoC decision server-side: authenticate the user, check their
organisation membership, and trust nothing from the client beyond the case reference and the
submitted answers.

#### Your frontend's responsibilities

Verify the IDAM session on entry — redirect to IDAM if there is none, and if there is one, compare
the authenticated subject with `expected_sub` and re-authenticate on mismatch. `expected_sub` is a
session-consistency hint, **not** a credential or proof of identity. On completion, cancellation or
handled failure, redirect back to a deterministic ExUI location (usually the case details page).

<!-- CONFLUENCE-ONLY: the HLSA also prescribes a tactical logout handoff — the service frontend clears its own session then redirects to ExUI's GET /auth/logout, which ends the IDAM session via /o/endSession. XUI needs no change for this (auth.service.ts already calls /auth/logout), but nothing in pcs-frontend references expected_sub or /auth/logout at origin/master, so the receiving half is still a proposal. -->

<!-- DIVERGENCE: the ExUI Decentralisation HLSA names the config item `DECENTRALISED_EVENT_BASE_URLS or equivalent` and describes it as a case-type-to-base-URL map. What shipped is `DECENTRALISED_CASE_TYPE_CONFIG`, a case-type-prefix map to an object with `webUrl` and `nocBaseUrl`. Source wins. -->

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
