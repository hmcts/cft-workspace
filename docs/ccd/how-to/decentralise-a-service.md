---
topic: decentralisation
audience: both
sources:
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/ServicePersistenceController.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/CaseSubmissionService.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/DecentralisedSubmissionHandler.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/config/DecentralisedDataConfiguration.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/DecentralisedConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/EventPayload.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/PCSCaseView.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/CaseType.java
  - pcs-api:build.gradle
examples_extracted_from:
  - apps/pcs/pcs-api/src/main/java/uk/gov/hmcts/reform/pcs/ccd/event/TestCaseGeneration.java
status: reviewed
last_reviewed: "2026-04-29T00:00:00Z"
---

# Decentralise a Service

## TL;DR

- In decentralised mode the service owns its own database; CCD delegates all case reads and writes to the service's `/ccd-persistence` REST endpoints instead of storing data itself.
- The SDK's `decentralised-runtime` module auto-registers `ServicePersistenceController` at `/ccd-persistence` — you do not write that controller.
- Enable with `ccd { decentralised = true }` in `build.gradle`, implement `CaseView<T, S>`, and use `configureDecentralised(DecentralisedConfigBuilder)` for events with in-process handlers.
- Each decentralised event uses a typed `Submit<T, S>` handler receiving `EventPayload<T, S>` instead of legacy webhook callbacks.
- CCD must be told where to route calls via env var `CCD_DECENTRALISED_CASE-TYPE-SERVICE-URLS_<CASE_TYPE>=<service-url>`.
- PCS (`apps/pcs/pcs-api`) is the canonical production reference.

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

> `runtimeIndexing` is separate from `decentralised` — it controls whether the CCD
> definition is re-resolved at startup. Enable it when running locally or in preview.

---

### 2. Implement CaseView

`CaseView<T, S>` is the hook called by the SDK when CCD requests a case read
(`GET /ccd-persistence/cases?case-refs=...`).

```java
@Component
public class MyCaseView implements CaseView<MyCase, State> {

    private final MyCaseRepository repo;

    @Override
    public MyCase getCase(CaseViewRequest<State> request) {
        MyCaseEntity entity = repo.findByCaseReference(request.caseRef())
            .orElseThrow(() -> new CaseNotFoundException(request.caseRef()));

        MyCase caseData = toMyCase(entity);

        // Required for Global Search indexing
        caseData.setSearchCriteria(new SearchCriteria());

        return caseData;
    }
}
```

Reference: `PCSCaseView.getCase()` at `pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/PCSCaseView.java:82`.

The two-overload form `getCase(request, blobCase)` is for legacy blob-based services;
new decentralised services use the single-argument form.

---

### 3. Define decentralised events

Override `configureDecentralised(DecentralisedConfigBuilder<T, S, R> builder)` on your
`CCDConfig` implementation instead of (or alongside) `configure()`.

```java
@Override
public void configureDecentralised(DecentralisedConfigBuilder<MyCase, State, UserRole> builder) {

    // Submit-only event (no start handler)
    builder.decentralisedEvent("createClaim",
        payload -> {
            // payload.caseData()      — typed domain object
            // payload.caseReference() — Long (null on case creation)
            myService.handleCreate(payload.caseData());
            return SubmitResponse.defaultResponse();
        })
        .name("Create Claim")
        .grant(Set.of(CREATE, READ, UPDATE), UserRole.CASEWORKER);

    // Event with start handler (populates form data before the user sees it)
    builder.decentralisedEvent("resumeClaim",
        startPayload  -> myService.prepareResume(startPayload),
        submitPayload -> {
            myService.resume(submitPayload.caseData());
            return SubmitResponse.defaultResponse();
        })
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

No explicit wiring is required unless you already declare a `FlywayMigrationStrategy` bean.
If you do, the SDK migration won't auto-run (`@ConditionalOnMissingBean`) — you must invoke it
yourself:

```java
@Bean
FlywayMigrationStrategy flywayMigrationStrategy(SdkFlywayMigrationStrategy sdkStrategy) {
    return flyway -> {
        sdkStrategy.migrate(flyway);   // SDK's ccd schema first
        flyway.migrate();              // then your own
    };
}
```

Ensure your app migrations do not conflict with schema `ccd`.

---

### 5. Register the service URL with CCD data-store

Set the following environment variable so CCD routes persistence calls to your service:

```
CCD_DECENTRALISED_CASE-TYPE-SERVICE-URLS_<CASE_TYPE>=http://<your-service>:<port>
```

For PCS with case type `PCS` running locally:

```
CCD_DECENTRALISED_CASE-TYPE-SERVICE-URLS_PCS=http://localhost:3206
```

(`pcs-api:build.gradle:533`)

In preview environments, append `CASE_TYPE_SUFFIX` so case type IDs don't collide:

```
CASE_TYPE_SUFFIX=pr-123
```

This appends `-pr-123` to the case type ID and ` pr-123` to the display name
(`pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/CaseType.java:44-48`).

---

### 6. Wire the callback host

In your `CCDConfig.configure()` or `configureDecentralised()`, set the callback host so
generated webhook URLs point to your service:

```java
builder.setCallbackHost(System.getenv().getOrDefault("CASE_API_URL", "http://localhost:3206"));
```

(`pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/CaseType.java:51-97`)

---

### 7. Run the contract tests

<!-- TODO: research note insufficient for contract test invocation details — no test runner commands found in research notes. -->

The SDK ships contract tests that verify your `/ccd-persistence` endpoints behave as CCD
expects. Run them via Gradle:

```bash
./gradlew contractTest
```

Check that all four endpoint shapes pass:

| Endpoint | Method | Required headers |
|---|---|---|
| `/ccd-persistence/cases` | `GET` (`?case-refs=`) | `Authorization` |
| `/ccd-persistence/cases` | `POST` | `Authorization`, `Idempotency-Key` (UUID) |
| `/ccd-persistence/cases/{ref}/supplementary-data` | `POST` | `Authorization` |
| `/ccd-persistence/cases/{ref}/history` | `GET` | `Authorization` |

> `POST /ccd-persistence/cases` returns HTTP 401 immediately if `Authorization` is blank
> (`ServicePersistenceController.java:63-66`).

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

---

## Example

### config-generator form — decentralised event with start and submit handlers

```java
// from apps/pcs/pcs-api/src/main/java/uk/gov/hmcts/reform/pcs/ccd/event/TestCaseGeneration.java
@Component
public class TestCaseGeneration implements CCDConfig<PCSCase, State, UserRole> {

    @Override
    public void configureDecentralised(DecentralisedConfigBuilder<PCSCase, State, UserRole> configBuilder) {
        configBuilder
            .decentralisedEvent(createTestCase.name(), this::submit, this::start)
            .initialState(AWAITING_SUBMISSION_TO_HMCTS)
            .showSummary()
            .name("Test Support Case Creation")
            .grant(Permission.CRUD, UserRole.PCS_SOLICITOR);
    }

    private PCSCase start(EventPayload<PCSCase, State> eventPayload) {
        PCSCase caseData = eventPayload.caseData();
        // populate form data before the user sees the event wizard
        caseData.setTestCaseSupportFileList(testCaseSupportHelper.getFileList());
        return caseData;
    }

    SubmitResponse<State> submit(EventPayload<PCSCase, State> eventPayload) {
        Long caseReference = eventPayload.caseReference();
        PCSCase pcsCase = eventPayload.caseData();
        // persist to the service's own database inside this handler
        pcsCaseService.createCase(caseReference, pcsCase.getPropertyAddress(),
                                  pcsCase.getLegislativeCountry());
        return SubmitResponse.<State>builder().state(CASE_ISSUED).build();
    }
}
```

<!-- source: apps/pcs/pcs-api/src/main/java/uk/gov/hmcts/reform/pcs/ccd/event/TestCaseGeneration.java:54-91 -->

## See also

- [Decentralisation](../explanation/decentralisation.md) — architecture overview of decentralised vs centralised CCD
- [Decentralised callbacks reference](../reference/decentralised-callbacks.md) — full endpoint contract for `/ccd-persistence`

## Glossary

| Term | Definition |
|---|---|
| `decentralised-runtime` | SDK module that auto-provides `ServicePersistenceController` and related beans |
| `CaseView<T, S>` | Interface your service implements so the SDK can load case data for CCD reads |
| `DecentralisedConfigBuilder` | Extension of `ConfigBuilder` that exposes `decentralisedEvent()` |
| `EventPayload<T, S>` | Typed record delivered to a `submitHandler`; carries `caseData()` and `caseReference` |
| `SubmitResponse` | Return value from a `Submit` handler; `defaultResponse()` is a no-op sentinel |
| `CASE_TYPE_SUFFIX` | Env var that namespaces the case type ID in preview environments |
