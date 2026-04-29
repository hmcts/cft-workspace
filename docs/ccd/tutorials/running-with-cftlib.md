---
topic: tutorial-cftlib
audience: both
sources:
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/CftLibPlugin.java
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/Service.java
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/CftlibExec.java
  - rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/api/CFTLib.java
  - rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/api/CFTLibConfigurer.java
  - rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/LibRunner.java
  - rse-cft-lib:cftlib/lib/cftlib-agent/src/main/java/uk/gov/hmcts/rse/ccd/lib/LibAgent.java
  - rse-cft-lib:cftlib/lib/runtime/src/main/java/uk/gov/hmcts/rse/ccd/lib/CFTLibApiImpl.java
  - rse-cft-lib:cftlib/lib/cftlib-agent/src/main/java/uk/gov/hmcts/rse/ccd/lib/IdamInterceptor.java
  - rse-cft-lib:cftlib/lib/runtime/compose/docker-compose.yml
  - rse-cft-lib:cftlib/lib/runtime/src/main/resources/application.yml
  - rse-cft-lib:cftlib/test-project/src/cftlib/java/uk/gov/hmcts/libconsumer/CFTLibConfig.java
  - rse-cft-lib:cftlib/lib/test-runner/src/main/java/uk/gov/hmcts/rse/ccd/lib/test/CftlibTest.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence:
  - id: "1604492994"
    title: "RSE CFT Library"
    space: "SSCS"
    last_modified: "unknown (v41)"
  - id: "1933968909"
    title: "Local development environment"
    space: "DATS"
    last_modified: "2026-01 (v24)"
  - id: "1706197099"
    title: "Debugging CFTLib internals"
    space: "RET"
    last_modified: "unknown (v1)"
  - id: "1933997228"
    title: "Development Environment Setup"
    space: "FR"
    last_modified: "unknown (v5)"
confluence_checked_at: 2026-04-29T00:00:00Z
---

# Running with cftlib

## TL;DR

- `rse-cft-lib` (cftlib) boots eight CFT services in-process via a single Gradle task: `./gradlew bootWithCCD`.
- Your service app runs alongside embedded CCD data store, definition store, user profile, AM role assignment, CDAM, AAC, docassembly, and WA task management.
- IDAM is stubbed: a Docker `rse-idam-simulator` on port 5062 plus in-process AspectJ intercepts; JWT secret is hardcoded as `"secret"`. An S2S simulator runs in-process on port 8489.
- Seed users, roles, and your CCD definition in a `CFTLibConfigurer` bean placed in the `src/cftlib/java/` source set.
- The embedded XUI (ExUI) lets you submit events end-to-end so callbacks hit your locally running service — with a debugger attached.
- Docker still runs Postgres (port 6432), Elasticsearch (9200), XUI manage-cases (3000), XUI manage-org (3001), and the IDAM simulator. Everything else is in-JVM.

---

## Prerequisites

- Docker running (cftlib's compose file starts `rse-idam-simulator` and Postgres).
- Java 17+.
- Access to HMCTS Azure Artifacts (the plugin auto-registers the repo if absent — `CftLibPlugin.java:91-103`).
- Your service's `build.gradle` already applies the cftlib Gradle plugin.

If the plugin is not yet applied, add to `build.gradle`:

```groovy
plugins {
    id 'com.github.hmcts.rse-cft-lib' version '<latest>'
}
```

---

## Step 1 — Create the cftlib source set

The plugin creates two extra source sets: `cftlib` (boot-time config) and `cftlibTest` (integration tests).
(`CftLibPlugin.java:156-170`)

Place your configurer under:

```
src/cftlib/java/<your/package>/CftlibConfig.java
```

The file must be **annotated `@Component`** so Spring picks it up without any additional wiring.

---

## Step 2 — Implement CFTLibConfigurer

```java
package uk.gov.hmcts.example;

import org.springframework.stereotype.Component;
import uk.gov.hmcts.rse.ccd.lib.api.CFTLib;
import uk.gov.hmcts.rse.ccd.lib.api.CFTLibConfigurer;

import java.io.File;

@Component
public class CftlibConfig implements CFTLibConfigurer {

    @Override
    public void configure(CFTLib lib) throws Exception {
        // 1. Create an IDAM user — password is always "password"
        lib.createIdamUser("caseworker@example.com", "caseworker", "caseworker-example");

        // 2. Register roles with CCD definition store
        lib.createRoles("caseworker", "caseworker-example");

        // 3. Create the CCD user profile
        lib.createProfile("caseworker@example.com", "EXAMPLE", "ExampleCase", "Submitted");

        // 4. Import your definition (xlsx or JSON folder)
        lib.importDefinition(new File("src/cftlib/resources/ExampleCase.xlsx"));
        // — or for JSON format:
        // lib.importJsonDefinition(new File("src/cftlib/resources/ccd-definition"));
    }
}
```

Key API methods (`CFTLib.java`, implemented in `CFTLibApiImpl.java`):

| Method | Effect |
|---|---|
| `createIdamUser(email, roles...)` | POSTs to IDAM simulator at `http://localhost:5062/testing-support/accounts`; password always `"password"`. **No-op unless `RSE_LIB_AUTH-MODE=localAuth`** (`CFTLibApiImpl.java:101-103`). |
| `createRoles(roles...)` | PUTs each role with `security_classification: PUBLIC` to `http://localhost:4451/api/user-role` (`CFTLibApiImpl.java:147-169`). |
| `createProfile(id, jurisdiction, caseType, state)` | PUTs to `http://localhost:4453/user-profile/users` (`CFTLibApiImpl.java:124-144`). |
| `importDefinition(File)` / `importDefinition(byte[])` | POSTs xlsx multipart to `http://localhost:4451/import`; MD5-idempotent — repeat calls with the same bytes are skipped (`CFTLibApiImpl.java:188-198`). |
| `importJsonDefinition(File folder)` | Imports JSON definition-processor format by POSTing the folder's absolute path bytes to `/import` (`CFTLibApiImpl.java:209-214`). |
| `configureRoleAssignments(json)` | Loads JSON into the AM database via `cftlib-populate-am.sql` (`CFTLibApiImpl.java:172-184`). |
| `createGlobalSearchIndex()` | POSTs to definition store `/elastic-support/global-search/index` to create the GlobalSearch ES index. |
| `getConnection(Database)` | Returns a JDBC `Connection` for direct inspection of the cftlib Postgres (`Database` enum: `Datastore`, `Definitionstore`, `Userprofile`, `AM`, `Camunda`, etc.). |
| `buildJwt()` / `generateDummyS2SToken(serviceName)` | Mints HS256 JWTs signed with the literal string `"secret"` — useful when scripting against the running stack (`CFTLibApiImpl.java:42-57`). |
| `dumpDefinitionSnapshots()` | Writes every loaded case-type definition as JSON to `build/cftlib/definition-snapshots/`; called automatically when `RSE_LIB_DUMP_DEFINITIONS=true`. |

`LibAgent.onReady()` calls every `CFTLibConfigurer` bean after all services have booted
(`LibAgent.java:53-65`).

---

## Step 3 — Boot the full stack

From the root of your service repo:

```bash
./gradlew bootWithCCD
```

What happens under the hood:

1. The plugin resolves eight service artifacts from HMCTS Azure Artifacts and writes per-service classpath manifests to `build/cftlib/<service-id>` (`CftLibPlugin.java:244-264`, `286`).
2. `LibRunner` (main class `uk.gov.hmcts.rse.ccd.lib.LibRunner`) loads each service in its own `URLClassLoader` (`CftLibPlugin.java:310`).
3. Docker Compose spins up `rse-idam-simulator` on port 5062.
4. Your app boots alongside the embedded services; `src/main/resources` is prepended to the classpath for live resource editing (`CftLibPlugin.java:207`).
5. `CFTLibConfigurer.configure()` runs; your definition is imported and users seeded.

Services and their default ports once running:

| Service | Port | Process |
|---|---|---|
| CCD data store | 4452 | in-JVM |
| CCD definition store | 4451 | in-JVM |
| CCD user profile | 4453 | in-JVM |
| AAC manage-case-assignment | 4454 | in-JVM |
| CDAM (`ccd-case-document-am-api`) | 4455 | in-JVM |
| AM role assignment | 4096 | in-JVM |
| WA task management API | (varies) | in-JVM |
| docassembly API | (varies) | in-JVM |
| S2S simulator | 8489 | in-JVM (set in `lib/runtime/src/main/resources/application.yml`) |
| IDAM simulator (`rse-idam-simulator`) | 5062 | Docker, profile `localAuth` |
| XUI manage-cases (ExUI) | 3000 | Docker |
| XUI manage-organisation | 3001 | Docker |
| Postgres (shared, multiple DBs) | 6432 | Docker |
| Elasticsearch | 9200 | Docker |

The Postgres container hosts every CCD-side database under `postgres/postgres` credentials. Database names: `am`, `camunda`, `cft_task_db`, `cft_task_db_replica`, `datastore`, `definitionstore`, `postgres`, `userprofile`, `wa_workflow_api`. Connect via `jdbc:postgresql://localhost:6432/<dbname>` for inspection (`CFTLibApiImpl.java:244-250` uses the same connection string for `lib.getConnection(Database.X)`).

---

## Step 4 — Attach a debugger

`bootWithCCD` extends `JavaExec`. Pass JVM args to open a debug port:

```bash
./gradlew bootWithCCD --debug-jvm
```

Or set explicitly in `build.gradle`:

```groovy
bootWithCCD {
    jvmArgs '-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005'
}
```

In IntelliJ: **Run > Attach to Process** (or **Edit Configurations > Remote JVM Debug**, port 5005). Set a breakpoint in your callback handler, then submit an event in the next step.

---

## Step 5 — Submit an event through XUI

1. Open `http://localhost:3000` in your browser.
2. Sign in with the IDAM simulator credentials you seeded (e.g. `caseworker@example.com` / `password`).
3. Navigate to your case type and create a case or trigger an event.
4. XUI calls CCD data store, which fires your callback URL. Because your service is also running on localhost, the callback hits your Spring Boot app directly.
5. If you attached a debugger, execution pauses at your breakpoint inside the callback handler.

---

## Step 6 — Dump definitions (optional)

To export the currently loaded definition back to disk (useful for inspecting what was imported):

```bash
./gradlew dumpCCDDefinitions
```

This sets `RSE_LIB_DUMP_DEFINITIONS=true`, forces `AuthMode.Local`, and re-runs the stack boot (`CftLibPlugin.java:55-58`). Output lands in `build/cftlib/definition-snapshots/<caseTypeId>.json` (`CFTLibApiImpl.java:62-95`). The JVM halts via `Runtime.getRuntime().halt(0)` once all snapshots are written, so the task exits cleanly without waiting for further activity (`LibAgent.java:61-65`).

---

## Useful environment variables

The plugin and runtime read several env vars at boot. The ones you'll touch most often:

| Variable | Effect |
|---|---|
| `RSE_LIB_CLEAN_BOOT` | Tear down docker volumes before booting — use when stale Postgres state is causing failures. <!-- CONFLUENCE-ONLY: documented on the SSCS RSE CFT Library page; not surfaced in plugin source. --> |
| `RSE_LIB_DUMP_DEFINITIONS` | Set to `true` to dump definitions then exit. The `dumpCCDDefinitions` Gradle task sets this for you. |
| `RSE_LIB_STUB_AUTH_OUTBOUND` | When `true`, in-process AspectJ intercepts outbound IDAM token requests and returns a locally-signed JWT instead of hitting any external IDAM. Set automatically for the `cftlibTest` task (`CftLibPlugin.java:236`); set manually if you need it during `bootWithCCD`. |
| `RSE_LIB_AUTH-MODE` | When set to `localAuth`, the IDAM simulator profile spins up and `lib.createIdamUser(...)` actually creates accounts. Otherwise `createIdamUser` is a no-op (`CFTLibApiImpl.java:101-103`). |
| `RSE_LIB_DB_HOST` / `RSE_LIB_DB_PORT` | Override the Postgres host (default `localhost`) and port (default `6432`). Threaded through `Service.java` for WA task management and through `CFTLibApiImpl.getConnection`. |
| `RSE_LIB_S2S_PORT` | Override the in-process S2S simulator port (default `8489`, see `lib/runtime/src/main/resources/application.yml`). |
| `LOG_CALLBACK_DETAILS` | Set to `*` to log full case-data payloads sent between callbacks. Add via `environment 'LOG_CALLBACK_DETAILS', '*'` on the `bootWithCCD` task. <!-- CONFLUENCE-ONLY: this is a CCD data store flag, surfaced via the SSCS Confluence page rather than the plugin. --> |
| `FORCE_RECREATE_ADDITIONAL_CONTAINERS` | Forces docker compose to recreate additional containers on each boot (relevant when teams supply extra compose files). <!-- CONFLUENCE-ONLY: SSCS-specific, not in plugin source. --> |
| `ADDITIONAL_COMPOSE_FILES` | **Service-team convention, not a cftlib feature.** SSCS, PRL and others run a small `cftlib`-source-set runner that takes a comma-separated list of compose files and runs `docker compose up` on each before `bootWithCCD`. Used to layer in dm-store, pdf-service, ActiveMQ, wiremock for ref-data, etc. <!-- CONFLUENCE-ONLY: implemented per-service (e.g. `AdditionalComposeServiceRunner.java` in sscs-tribunals-case-api), not by rse-cft-lib itself. --> |

---

## Inspecting cftlib internal logs

If the stack fails to start and the failure isn't visible in any container's stdout, look in `build/cftlib/logs/`. The runtime writes per-component log files there — `runtime.log` and `application.log` are the most useful starting points. <!-- CONFLUENCE-ONLY: behaviour described on the RET "Debugging CFTLib internals" Confluence page; the path matches what `LibRunner` writes but isn't documented elsewhere in source. -->

---

## Running integration tests

The plugin creates a `cftlibTest` task that runs JUnit via `org.junit.platform.console.ConsoleLauncher`, scanning the `uk.gov.hmcts` package, with `RSE_LIB_STUB_AUTH_OUTBOUND=true` (`CftLibPlugin.java:236`).

Extend `CftlibTest` in your test class:

```java
import uk.gov.hmcts.rse.ccd.lib.test.CftlibTest;

class MyIntegrationTest extends CftlibTest {
    // CftlibTest calls ControlPlane.waitForBoot() in @BeforeAll
    // All services are guaranteed ready before your @Test methods run
}
```

Run with:

```bash
./gradlew cftlibTest
```

---

## Verify

After `bootWithCCD` finishes seeding, confirm the stack is healthy:

```bash
# CCD data store health
curl -s http://localhost:4452/health | jq .status
# Expected: "UP"

# Definition store — list case types
curl -s http://localhost:4451/api/data/caseworkers/caseworker@example.com/jurisdictions/EXAMPLE/case-types \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:5062/o/token \
       -d 'grant_type=password&username=caseworker@example.com&password=password&client_id=ccd_gateway&client_secret=ccd_gateway_secret&scope=openid profile roles' \
       | jq -r .access_token)" \
  | jq '.[].id'
# Expected: your case-type ID listed
```

A successful event submission in XUI returns HTTP 201 from the data store and your callback handler logs appear in the `bootWithCCD` console output.

---

## Troubleshooting

Real-world snags collected from the SSCS, PRL, and DFR teams' Confluence pages:

| Symptom | Likely cause / fix |
|---|---|
| `Process 'command '[…]/create-xlsx.sh'' finished with non-zero exit value 126` | Docker Desktop interfering with WSL. Switch to Docker Engine inside WSL, or run the CCD definition build manually. <!-- CONFLUENCE-ONLY: SSCS RSE CFT Library page. --> |
| Stuck on `Idam not ready...` indefinitely | `docker-compose` missing or older than v1.28. Upgrade. <!-- CONFLUENCE-ONLY: SSCS page. --> |
| `java.lang.ClassNotFoundException: uk.gov.hmcts.rse.ccd.lib.Application` from `LibRunner.launchApp` | Stale per-service classpath manifests. Delete `build/cftlib/` and re-run. <!-- CONFLUENCE-ONLY: PRL Local development environment page. --> |
| Definition import fails with `TransactionTimedOutException` | Definition store's default 30s transaction timeout is too low for large definitions. Add `ccd.tx-timeout.default=600` to your `.aat-env`. <!-- CONFLUENCE-ONLY: PRL page; default of 30s referenced in ccd-definition-store-api `application.properties`. --> |
| `DB not yet available...` on a loop | Another connection (e.g. `psql` against a remote DB on the same port) is interfering. Close it. <!-- CONFLUENCE-ONLY --> |
| Containers stop unexpectedly under load | Increase Docker memory allocation. <!-- CONFLUENCE-ONLY --> |
| CCD definition changes not propagating | Delete the generated xlsx (or `build/cftlib/definition-snapshots`) and re-run; the MD5 idempotence check in `importDefinition` skips re-imports of identical bytes. |
| Containers persist between runs and pollute state | Either tear them down manually (`docker compose down -v` against `lib/runtime/compose/docker-compose.yml`) or set `RSE_LIB_CLEAN_BOOT`. |

---

## See also

- [`docs/ccd/explanation/callbacks.md`](../explanation/callbacks.md) — how CCD invokes your service during event submission
- [`docs/ccd/reference/ccd-definition-format.md`](../reference/ccd-definition-format.md) — JSON definition folder structure for `importJsonDefinition`
- [`docs/ccd/tutorials/running-with-cftlib.md`](running-with-cftlib.md) — this page
