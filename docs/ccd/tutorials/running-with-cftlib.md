---
topic: tutorial-cftlib
audience: both
sources:
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/CftLibPlugin.java
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/Service.java
  - rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/api/CFTLib.java
  - rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/api/CFTLibConfigurer.java
  - rse-cft-lib:cftlib/lib/cftlib-agent/src/main/java/uk/gov/hmcts/rse/ccd/lib/LibAgent.java
  - rse-cft-lib:cftlib/lib/runtime/src/main/java/uk/gov/hmcts/rse/ccd/lib/CFTLibApiImpl.java
  - rse-cft-lib:cftlib/lib/cftlib-agent/src/main/java/uk/gov/hmcts/rse/ccd/lib/IdamInterceptor.java
  - rse-cft-lib:cftlib/lib/runtime/compose/docker-compose.yml
  - rse-cft-lib:cftlib/test-project/src/cftlib/java/uk/gov/hmcts/libconsumer/CFTLibConfig.java
  - rse-cft-lib:cftlib/lib/test-runner/src/main/java/uk/gov/hmcts/rse/ccd/lib/test/CftlibTest.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Running with cftlib

## TL;DR

- `rse-cft-lib` (cftlib) boots eight CFT services in-process via a single Gradle task: `./gradlew bootWithCCD`.
- Your service app runs alongside embedded CCD data store, definition store, user profile, AM role assignment, CDAM, AAC, docassembly, and WA task management.
- IDAM is stubbed: a Docker `rse-idam-simulator` on port 5062 plus in-process AspectJ intercepts; JWT secret is hardcoded as `"secret"`.
- Seed users, roles, and your CCD definition in a `CFTLibConfigurer` bean placed in the `src/cftlib/java/` source set.
- The embedded XUI (ExUI) lets you submit events end-to-end so callbacks hit your locally running service — with a debugger attached.

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

Key API methods (`CFTLib.java`):

| Method | Effect |
|---|---|
| `createIdamUser(email, roles...)` | POSTs to IDAM simulator on port 5062; password always `"password"` |
| `createRoles(roles...)` | Registers roles in definition store |
| `createProfile(id, jurisdiction, caseType, state)` | Creates CCD user profile |
| `importDefinition(File)` | POSTs xlsx to definition store at `localhost:4451/import`; MD5-idempotent |
| `importJsonDefinition(File folder)` | Imports JSON definition-processor format; supports `${CCD_DEF_*}` substitution |
| `configureRoleAssignments(json)` | Sends AM role-assignment JSON |

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

| Service | Port |
|---|---|
| CCD data store | 4452 |
| CCD definition store | 4451 |
| CCD user profile | 4453 |
| CDAM (`ccd-case-document-am-api`) | 4455 |
| IDAM simulator | 5062 |
| ExUI (XUI) | 3000 |

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

This sets `RSE_LIB_DUMP_DEFINITIONS=true` and re-runs the stack boot
(`CftLibPlugin.java:55`).

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

## See also

- [`docs/ccd/explanation/callbacks.md`](../explanation/callbacks.md) — how CCD invokes your service during event submission
- [`docs/ccd/reference/ccd-definition-format.md`](../reference/ccd-definition-format.md) — JSON definition folder structure for `importJsonDefinition`
- [`docs/ccd/tutorials/running-with-cftlib.md`](running-with-cftlib.md) — this page
