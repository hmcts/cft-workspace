---
topic: tutorial-cftlib
audience: both
sources:
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/CftLibPlugin.java
  - rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/api/CFTLib.java
  - rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/api/CFTLibConfigurer.java
  - rse-cft-lib:cftlib/lib/runtime/src/main/java/uk/gov/hmcts/rse/ccd/lib/CFTLibApiImpl.java
  - rse-cft-lib:cftlib/lib/cftlib-agent/src/main/java/uk/gov/hmcts/rse/ccd/lib/LibAgent.java
  - rse-cft-lib:cftlib/lib/cftlib-agent/src/main/java/uk/gov/hmcts/rse/ccd/lib/definitionstore/JsonDefinitionReader.java
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/CftlibExec.java
  - rse-cft-lib:cftlib/lib/test-runner/src/main/java/uk/gov/hmcts/rse/ccd/lib/test/CftlibTest.java
  - rse-cft-lib:cftlib/lib/runtime/src/main/java/uk/gov/hmcts/rse/ccd/lib/ESIndexer.java
  - rse-cft-lib:cftlib/lib/runtime/src/main/java/uk/gov/hmcts/rse/ccd/lib/ComposeRunner.java
  - rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/ControlPlane.java
  - rse-cft-lib:cftlib/lib/runtime/compose/docker-compose.yml
status: confluence-augmented
last_reviewed: "2026-04-29T00:00:00Z"
confluence_checked_at: "2026-04-29T00:00:00Z"
confluence:
  - id: "1706197099"
    title: "Debugging CFTLib internals"
    space: "RET"
    last_modified: "unknown"
  - id: "1604492994"
    title: "RSE CFT Library"
    space: "SSCS"
    last_modified: "unknown"
  - id: "1933968909"
    title: "Local development environment"
    space: "DATS"
    last_modified: "unknown"
  - id: "1602552914"
    title: "CFTLib Feeback"
    space: "RSE"
    last_modified: "unknown"
  - id: "1689789995"
    title: "Run WA test environment with CFTlib on Mac"
    space: "SPT"
    last_modified: "unknown"
---

# Debug with cftlib

## TL;DR

- cftlib runs CCD data-store, definition-store, user-profile, AM role assignment, CDAM, and more in-process via a Gradle `bootWithCCD` task — Docker is still needed for Postgres, Elasticsearch, and the XUI containers.
- Attach a remote debugger to the JVM started by `bootWithCCD` to step into callback handlers or CCD internals.
- Re-import a definition at any time by calling `CFTLib.importDefinition()` or `importJsonDefinition()` from your `CFTLibConfigurer` — import is idempotent (MD5-tracked) so it skips unchanged definitions.
- IDAM is stubbed in two layers: in-process AspectJ intercepts plus an `rse-idam-simulator` on port 5062; all IDAM users have password `"password"`.
- `CFTLib.getConnection(Database)` gives you a raw JDBC connection to the embedded Postgres for direct inspection.
- When a service fails inside the JVM, the per-service logs in `build/cftlib/logs/` are the first place to look — runtime errors that don't show in the Gradle console land there.

---

## Recipe 1 — Attach a debugger to a callback

The `bootWithCCD` task is a `JavaExec` (`CftLibPlugin.java`). Add JVM debug args via your project's `build.gradle`:

```groovy
// build.gradle
tasks.named("bootWithCCD") {
    jvmArgs "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
}
```

1. Run `./gradlew bootWithCCD` — the JVM advertises port 5005.
2. In IntelliJ: **Run > Edit Configurations > + > Remote JVM Debug**. Set host `localhost`, port `5005`.
3. Set a breakpoint in your callback controller or in `CallbackHandler`.
4. Trigger the event through ExUI or via the REST API.
5. The debugger suspends at the breakpoint. All embedded services share the same JVM process, so you can step across the stack.

Use `suspend=y` instead of `suspend=n` if you need to break before boot completes (e.g. to debug `CFTLibConfigurer.configure`). The SSCS team's convention is port `5006` with `suspend=y` so the task waits for the IDE to attach before booting.

### Verify

The Gradle output should include:

```
Listening for transport dt_socket at address: 5005
```

---

## Recipe 2 — Replay an event from saved JSON

cftlib exposes CCD data-store at `http://localhost:4452`. You can POST a saved case-event payload directly using a locally-generated S2S token.

1. Save the event request body from a previous run (e.g. from browser DevTools or a Wiremock recording) to `replay-payload.json`.
2. Generate a stub S2S token in a `@Test` or a Groovy script:

```java
String s2sToken = CFTLib.generateDummyS2SToken("your_service_name");
```

3. POST to the event-trigger endpoint:

```bash
curl -X POST http://localhost:4452/cases/{caseId}/events \
  -H "Authorization: Bearer <idam-jwt>" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" \
  -H "Content-Type: application/json" \
  -d @replay-payload.json
```

4. Inspect the response or step through with the debugger from Recipe 1.

> All IDAM users created via `CFTLib.createIdamUser(email, roles...)` have password `"password"`. JWTs are HMAC256-signed with the hardcoded secret `"secret"` (`IdamInterceptor.java:46`).

> To get full payload logging across every callback, add `environment 'LOG_CALLBACK_DETAILS', '*'` to the `bootWithCCD` task in `build.gradle`. This dumps the case data sent between callbacks into the Gradle console — invaluable when reproducing a payload-shape bug. <!-- CONFLUENCE-ONLY: documented by SSCS team page (1604492994); the env var is read by ccd-data-store-api but the cftlib SDK doesn't model it explicitly. -->

### Verify

A `201 Created` response with the updated case JSON confirms the event was applied. Check CCD data-store logs in the Gradle console (or `build/cftlib/logs/ccdDataStoreApi.log`) for callback invocation details.

---

## Recipe 3 — Inspect Elasticsearch indexes

CCD data-store syncs case data to an Elasticsearch container that cftlib starts via Docker Compose (`docker.elastic.co/elasticsearch/elasticsearch:7.11.1`, host port `9200` — see `docker-compose.yml` and `ESIndexer.java:41`). Query it directly while `bootWithCCD` is running.

1. Identify the index name. The cftlib indexer writes one document per case to `<case-type>_cases` (lowercased; see `ESIndexer.java:70`). For a case type `NFD` the index is `nfd_cases`.
2. List all indexes:

```bash
curl http://localhost:9200/_cat/indices?v
```

3. Run an ad-hoc query:

```bash
curl -X GET "http://localhost:9200/<index-name>/_search?pretty" \
  -H "Content-Type: application/json" \
  -d '{"query": {"match_all": {}}}'
```

4. To force a re-index after a definition change, restart `bootWithCCD` — the Postgres `marked_by_logstash` flag is reset on a clean boot — or trigger a save-and-submit on any case so the indexer picks the row up again.

### Global Search index

If your case type defines a `SearchCriteria` field, the indexer also writes a stripped-down document to a separate `global_search` index (`ESIndexer.java:100-104`). The projection keeps `caseManagementLocation`, `CaseAccessCategory`, `caseNameHmctsInternal`, `caseManagementCategory`, plus `HMCTSServiceId` from `supplementary_data`. Query `global_search` to debug cross-jurisdiction search behaviour:

```bash
curl http://localhost:9200/global_search/_search?pretty
```

### Decentralised mode

When the SDK runs in decentralised mode (`ccd { decentralised = true }` in your `build.gradle`), the cftlib indexer is a no-op (`ESIndexer.java:23` `@ConditionalOnProperty`). In that case ES indexing is the responsibility of your service's own logstash/indexer runtime — see [decentralised CCD](../explanation/decentralised-ccd.md).

### Verify

`_cat/indices` lists the expected index with a non-zero `docs.count`.

---

## Recipe 4 — Reset a definition without restarting

Definition import in cftlib is idempotent: `CFTLibApiImpl.java:188-239` tracks an MD5 hash and skips unchanged definitions. To force a re-import during a live session:

**Option A — touch the definition file.**

```bash
touch src/cftlib/resources/my-definition.xlsx
```

Then call `importDefinition` again from a test or a custom Gradle task.

**Option B — call the API directly from a test.**

```java
@Test
void reimportDefinition() throws Exception {
    cftLib.importDefinition(new File("src/cftlib/resources/my-definition.xlsx"));
}
```

**Option C — JSON definition folder with env-var substitution.**

If your definition is in JSON format (definition-processor layout), `importJsonDefinition` supports `${CCD_DEF_*}` variable substitution (`JsonDefinitionReader.java`). Update the env var and call:

```java
cftLib.importJsonDefinition(new File("src/cftlib/definitions"));
```

Import timeout is 240 s to allow Elasticsearch index creation (`CFTLibApiImpl.java`).

### When import times out anyway

Service teams have hit a definition-store transaction-timeout on large case types. The default `ccd.tx-timeout.default` is 30 s in `ccd-definition-store-api`; raise it by adding to your `.aat-env` (or whichever env file you load):

```
ccd.tx-timeout.default=600
```

<!-- CONFLUENCE-ONLY: documented by PRL team troubleshooting (1933968909); the property name is verifiable in ccd-definition-store-api's application.properties but has not been verified inside this workspace. -->

### Verify

CCD definition-store logs (visible in the Gradle console, or `build/cftlib/logs/ccdDefinitionStoreApi.log`) should print an import success message. Query `http://localhost:4451/api/data/case-type/<CaseType>` to confirm the new version is live.

---

## Recipe 5 — Read the per-service logs

Each embedded service writes its own log file under `build/cftlib/logs/` — the runtime prints the path to stdout when a thread terminates with an uncaught exception (`ControlPlane.java:105`). When the Gradle console shows only an opaque "Application failed to start" message, those files are usually where the actual stack trace is.

Typical contents:

| File | Source |
|---|---|
| `runtime.log`, `application.log` | cftlib runtime + bootstrapper — startup ordering, classloader issues, ES wait loop |
| `ccdDataStoreApi.log` | `ccd-data-store-api` |
| `ccdDefinitionStoreApi.log` | `ccd-definition-store-api` |
| `ccdUserProfileApi.log` | `ccd-user-profile-api` |
| `aacManageCaseAssignment.log` | `aac-manage-case-assignment` |

<!-- CONFLUENCE-ONLY: the exact filenames per embedded service are inferred from the SSCS RET team page (1706197099) and the cftlib `Service` enum; the tail of `build/cftlib/logs/` will tell you what your service actually emits. -->

```bash
tail -f build/cftlib/logs/ccdDataStoreApi.log
```

### Cleaning state between runs

The Postgres + ES Docker volumes persist between `bootWithCCD` runs — useful for keeping cases between sessions, but a leading cause of "works on my machine" drift. Force a clean container/volume rebuild by setting `RSE_LIB_CLEAN_BOOT` (`ComposeRunner.java:38,71`):

```bash
RSE_LIB_CLEAN_BOOT=true ./gradlew bootWithCCD
```

The same flag is set automatically when running on CI (`if (null != System.getenv("CI") || null != System.getenv("RSE_LIB_CLEAN_BOOT"))`).

If `bootWithCCD` fails immediately with `java.lang.ClassNotFoundException: uk.gov.hmcts.rse.ccd.lib.Application`, delete the `build/cftlib` directory and retry — a stale jar layout from a previous SDK upgrade is the usual cause.

---

## See also

- [`rse-cft-lib` research notes](../../../docs/ccd/.work/research/rse-cft-lib.md) — full API surface of `CFTLib` and embedded service list
- [`CFTLibConfigurer` interface](../../ccd/explanation/cftlib-overview.md) — how the configure hook fits into the boot lifecycle

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

