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
  - rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/LibRunner.java
  - rse-cft-lib:cftlib/lib/runtime/compose/docker-compose.yml
  - ccd-definition-store-api:application/src/main/resources/application.properties
  - ccd-definition-store-api:application/src/main/java/uk/gov/hmcts/ccd/definition/store/TransactionConfiguration.java
  - ccd-definition-store-api:domain/src/main/java/uk/gov/hmcts/ccd/definition/store/domain/ApplicationParams.java
  - ccd-data-store-api:src/main/resources/db/migration/V0001__Base_version.sql
  - ccd-data-store-api:src/main/resources/db/migration/V20250306_0000__CCD-6936_case_pointer_marked_by_logstash.sql
status: confluence-augmented
last_reviewed: "2026-08-20T00:00:00Z"
confluence_checked_at: "2026-08-20T00:00:00Z"
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
    last_modified: "2026-06-10 (v25)"
  - id: "1602552914"
    title: "CFTLib Feeback"
    space: "RSE"
    last_modified: "unknown"
  - id: "1689789995"
    title: "Run WA test environment with CFTlib on Mac"
    space: "SPT"
    last_modified: "unknown"
title: Debug with cftlib
diataxis: how-to
product: ccd
sources_sha:
  "rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/CftLibPlugin.java": "e3587808bd1477ab4a47aa39c0b6ac5468479f7d"
  "rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/api/CFTLib.java": "71544992866ebc3f02139e17b9782c9437213a22"
  "rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/api/CFTLibConfigurer.java": "94aa0edeb0e1a4337a411ed8e6e20f170ed30bae"
  "rse-cft-lib:cftlib/lib/runtime/src/main/java/uk/gov/hmcts/rse/ccd/lib/CFTLibApiImpl.java": "e3587808bd1477ab4a47aa39c0b6ac5468479f7d"
  "rse-cft-lib:cftlib/lib/cftlib-agent/src/main/java/uk/gov/hmcts/rse/ccd/lib/LibAgent.java": "1af3bf04972042b8b6c862d4a3dbed93c7753e29"
  "rse-cft-lib:cftlib/lib/cftlib-agent/src/main/java/uk/gov/hmcts/rse/ccd/lib/definitionstore/JsonDefinitionReader.java": "94aa0edeb0e1a4337a411ed8e6e20f170ed30bae"
  "rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/CftlibExec.java": "7e12e7008bf04be9b6353b576c174eb26191b561"
  "rse-cft-lib:cftlib/lib/test-runner/src/main/java/uk/gov/hmcts/rse/ccd/lib/test/CftlibTest.java": "1b82c829cfc6fb569ee0086afbbc520b27882ec4"
  "rse-cft-lib:cftlib/lib/runtime/src/main/java/uk/gov/hmcts/rse/ccd/lib/ESIndexer.java": "cc031d19e1b4ff87cdc66c0f6609ee54241ec04b"
  "rse-cft-lib:cftlib/lib/runtime/src/main/java/uk/gov/hmcts/rse/ccd/lib/ComposeRunner.java": "9098a05a1f349631f606f4831c0c024deb6a4b5a"
  "rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/ControlPlane.java": "71544992866ebc3f02139e17b9782c9437213a22"
  "rse-cft-lib:cftlib/lib/bootstrapper/src/main/java/uk/gov/hmcts/rse/ccd/lib/LibRunner.java": "f64ba45d798a92139deb311aff036a709f8a8dd3"
  "rse-cft-lib:cftlib/lib/runtime/compose/docker-compose.yml": "d056f27d77a7efc17e08c26b11424844f46a37b5"
  "ccd-definition-store-api:application/src/main/resources/application.properties": "6d523fcfb408654266b488e56834fa3fc5f8d711"
  "ccd-definition-store-api:application/src/main/java/uk/gov/hmcts/ccd/definition/store/TransactionConfiguration.java": "bda0438d09f29d99f546185907272748a1224c49"
  "ccd-definition-store-api:domain/src/main/java/uk/gov/hmcts/ccd/definition/store/domain/ApplicationParams.java": "793bcd5000731abade5585f5dadc921ddb454fdd"
  "ccd-data-store-api:src/main/resources/db/migration/V0001__Base_version.sql": "2dc4bd32091d4f764d6ac7150265d04ed016bd1b"
  "ccd-data-store-api:src/main/resources/db/migration/V20250306_0000__CCD-6936_case_pointer_marked_by_logstash.sql": "0b3fa976dfabfb1fd06c6f37c9832b0a5cdacaf3"
---

# Debug with cftlib

## TL;DR

- cftlib runs CCD data-store, definition-store, user-profile, AM role assignment, CDAM, and more in-process via a Gradle `bootWithCCD` task — Docker is still needed for Postgres, Elasticsearch, and the XUI containers.
- Attach a remote debugger to the JVM started by `bootWithCCD` to step into callback handlers or CCD internals.
- Re-import a definition at any time by calling `CFTLib.importDefinition()` or `importJsonDefinition()` from your `CFTLibConfigurer`. `importDefinition` is MD5-idempotent and skips unchanged bytes; `importJsonDefinition` is not, so it always re-imports.
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

CCD data-store syncs case data to an Elasticsearch container that cftlib starts via Docker Compose (`docker.elastic.co/elasticsearch/elasticsearch`, single-node, `xpack.security.enabled=false`, host port `9200` — see `docker-compose.yml` for the pinned image tag). The sync is not logstash: cftlib runs its own in-process `ESIndexer` thread that "replicat[es] logstash functionality but sav[es] up to ~1GB of RAM" (`ESIndexer.java:18-19`). Query ES directly while `bootWithCCD` is running.

1. Identify the index name. The cftlib indexer writes one document per case to `<case-type>_cases` (lowercased; see `ESIndexer.java:69`). For a case type `NFD` the index is `nfd_cases`. Indexes are created on demand by `ensureCaseIndex` with `number_of_shards: 1`, `number_of_replicas: 0` and `index.mapping.total_fields.limit: 10000` (`ESIndexer.java:130-152`).
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

### Forcing a re-index

The indexer polls once a second and claims rows with a single `update … returning *` CTE that flips `marked_by_logstash` to `true` (`ESIndexer.java:44,48-53`). Nothing in the application clears it again — that is a database trigger's job. `trg_case_data_updated` fires `BEFORE INSERT OR UPDATE OF data, data_classification, last_modified, last_state_modified_date, security_classification, state, supplementary_data` (`V0001__Base_version.sql:1170`) and calls `set_case_data_marked_by_logstash()`, whose current definition resets the flag to `false` for a real case row but forces it to `true` for a pointer row — empty `data` and empty `state` (`V20250306_0000__CCD-6936_case_pointer_marked_by_logstash.sql:4-15`, superseding the unconditional version in `V0001`).

Two consequences follow. Any event on a case re-indexes it, because the write touches `data`/`last_modified` and so trips the trigger. But **restarting `bootWithCCD` re-indexes nothing** — the already-indexed rows survive in the Postgres volume with the flag still set, and a restart writes nothing. To force a re-index:

| Want | Do |
|---|---|
| Re-index one case | Trigger any event on it. |
| Re-index every case, keep the data | Clear the flag by hand (see below). |
| Start from nothing | `RSE_LIB_CLEAN_BOOT=true ./gradlew bootWithCCD` — recreates the Postgres and ES volumes, so both the rows and the indexes go. |

Clearing the flag is easiest from a test, via the JDBC connection cftlib hands you. Exclude pointer rows: the trigger does **not** fire on an update of `marked_by_logstash` alone, so nothing protects you from the `case_pointer_always_marked_by_logstash` CHECK constraint, which forbids `false` on any row with empty `data` and `state` (`V20250306_0000__CCD-6936_case_pointer_marked_by_logstash.sql:20-26`):

```java
try (var c = cftLib.getConnection(Database.Datastore);
     var s = c.prepareStatement("""
         update case_data set marked_by_logstash = false
         where not (data = '{}'::jsonb and state = '')
         """)) {
    s.execute();
}
```

> On a real environment this is done in batches per jurisdiction rather than in one statement — data-store ships the procedure at `db/useful-queries/logstash_re_indexing_query.sql`. Locally the one-shot update is fine.

> The indexer thread is registered with `ControlPlane.failFast` (`ESIndexer.java:29`) and throws on any non-2xx bulk response or any `errors: true` in the bulk body. An ES mapping conflict therefore takes down the whole `bootWithCCD` JVM rather than degrading quietly — if the stack dies seconds after a case is saved, read the bulk-error message before suspecting your callback.

### Global Search index

If your case type defines a `SearchCriteria` field, the indexer also writes a stripped-down document to a separate `global_search` index (`ESIndexer.java:93-105`). The projection keeps `caseManagementLocation`, `CaseAccessCategory`, `caseNameHmctsInternal`, `caseManagementCategory`, plus `HMCTSServiceId` from `supplementary_data`. Query `global_search` to debug cross-jurisdiction search behaviour:

```bash
curl http://localhost:9200/global_search/_search?pretty
```

### Decentralised mode

When the SDK runs in decentralised mode, the cftlib indexer is a no-op — it is annotated `@ConditionalOnProperty(value = "ccd.sdk.decentralised", havingValue = "false", matchIfMissing = true)` (`ESIndexer.java:21`), so setting `ccd.sdk.decentralised=true` removes the bean entirely. In that case ES indexing is the responsibility of your service's own logstash/indexer runtime — see [decentralised CCD](../explanation/decentralised-ccd.md).

### Verify

`_cat/indices` lists the expected index with a non-zero `docs.count`.

---

## Recipe 4 — Reset a definition without restarting

`importDefinition` is idempotent: it MD5s the bytes, compares against a `lastImportHash` field, and prints `Definition up to date, no import necessary!` on a match (`CFTLibApiImpl.java:188-199`). Two consequences worth knowing before you try to force a re-import:

- The hash is over the **file contents**, not its mtime — so `touch`ing the xlsx changes nothing and the import is still skipped. Change the definition (or a single cell) or take a different route.
- `lastImportHash` is a plain in-memory field, so it is empty again after any JVM restart. The first `importDefinition` of a fresh `bootWithCCD` always goes through.

**Option A — re-import from a test.** Works for xlsx as long as the bytes differ from the last import in this JVM:

```java
@Test
void reimportDefinition() throws Exception {
    cftLib.importDefinition(new File("src/cftlib/resources/my-definition.xlsx"));
}
```

**Option B — JSON definition folder.** `importJsonDefinition` POSTs the folder's canonical *path* and calls `postDefinition` directly, bypassing the MD5 check entirely (`CFTLibApiImpl.java:209-213`) — so it **always** re-imports. That makes it the reliable way to reload a definition mid-session. The definition-processor layout also supports `${CCD_DEF_*}` variable substitution (`JsonDefinitionReader.java`), so you can change an env var and reload without touching the JSON:

```java
cftLib.importJsonDefinition(new File("src/cftlib/definitions"));
```

### When import times out

Under cftlib the definition-store transaction timeout is **already raised to 240 s** — `LibRunner` sets both `CCD_TX-TIMEOUT_DEFAULT` and `DEFINITION_STORE_TX_TIMEOUT_DEFAULT` to `240` as system properties at boot, with the comment that imports can start before Elasticsearch is ready and will block on ES while the transaction is pending (`LibRunner.java:92-96`). The 30 s figure you may have seen quoted is the standalone service default: `application.properties:157` reads `ccd.tx-timeout.default=${DEFINITION_STORE_TX_TIMEOUT_DEFAULT:30}`, consumed by `TransactionConfiguration` as the `JpaTransactionManager` default timeout.

So a `TransactionTimedOutException` under cftlib means you have exceeded 240 s, not 30. Raise it further via the env var rather than the property — that is the placeholder the property already resolves:

```
DEFINITION_STORE_TX_TIMEOUT_DEFAULT=600
```

Note the knock-on effect: definition-store treats an import as stale after `ccd.tx-timeout.default` plus a 30 s buffer (`ApplicationParams.java:35-38,99`), so raising the timeout also lengthens how long a wedged import blocks the next one.

<!-- CONFLUENCE-ONLY: the PRL team's Local development environment page (1933968909) prescribes `ccd.tx-timeout.default=600` in `.aat-env`. That still works, but the page's premise — that you are lifting a 30 s default — does not hold under cftlib, which already sets 240. -->

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

- [`rse-cft-lib` research notes](../.work/research/rse-cft-lib.md) — full API surface of `CFTLib` and embedded service list
- [`CFTLibConfigurer` interface](../explanation/cftlib-overview.md) — how the configure hook fits into the boot lifecycle

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.
