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
status: reviewed
last_reviewed: "2026-04-29T00:00:00Z"
---

# Debug with cftlib

## TL;DR

- cftlib runs CCD data-store, definition-store, user-profile, AM role assignment, CDAM, and more in-process via a Gradle `bootWithCCD` task — no Docker for most services.
- Attach a remote debugger to the JVM started by `bootWithCCD` to step into callback handlers or CCD internals.
- Re-import a definition at any time by calling `CFTLib.importDefinition()` or `importJsonDefinition()` from your `CFTLibConfigurer` — import is idempotent (MD5-tracked) so it skips unchanged definitions.
- IDAM is stubbed in two layers: in-process AspectJ intercepts plus an `rse-idam-simulator` on port 5062; all IDAM users have password `"password"`.
- `CFTLib.getConnection(Database)` gives you a raw JDBC connection to the embedded Postgres for direct inspection.

---

## Recipe 1 — Attach a debugger to a callback

The `bootWithCCD` task is a `JavaExec` (`CftLibPlugin.java:310`). Add JVM debug args via your project's `build.gradle`:

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
5. The debugger suspends at the breakpoint. All eight embedded services share the same JVM process, so you can step across the stack.

Use `suspend=y` instead of `suspend=n` if you need to break before boot completes (e.g. to debug `CFTLibConfigurer.configure`).

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

> All IDAM users created via `CFTLib.createIdamUser(email, roles...)` have password `"password"`. JWTs are HMAC256-signed with the hardcoded secret `"secret"` (`IdamInterceptor.java`).

### Verify

A `201 Created` response with the updated case JSON confirms the event was applied. Check CCD data-store logs in the Gradle console for callback invocation details.

---

## Recipe 3 — Inspect Elasticsearch indexes

CCD data-store syncs case data to an embedded Elasticsearch instance. Query it directly while `bootWithCCD` is running:

<!-- TODO: research note does not specify the ES port cftlib binds; check CftlibExec.java or docker-compose.yml for the ES_URL env var -->

1. Identify the index name — cftlib follows the CCD convention `<jurisdiction>_cases_<case-type>` (all lowercase).
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

4. To force a re-index after a definition change, restart `bootWithCCD` or trigger a save-and-submit on any case.

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

### Verify

CCD definition-store logs (visible in the Gradle console) should print an import success message. Query `http://localhost:4451/api/data/case-type/<CaseType>` to confirm the new version is live.

---

## See also

- [`rse-cft-lib` research notes](../../../docs/ccd/.work/research/rse-cft-lib.md) — full API surface of `CFTLib` and embedded service list
- [`CFTLibConfigurer` interface](../../ccd/explanation/cftlib-overview.md) — how the configure hook fits into the boot lifecycle

## Glossary

| Term | Meaning |
|---|---|
| `bootWithCCD` | Gradle task registered by `CftLibPlugin` that launches all embedded CFT services in one JVM |
| `CFTLibConfigurer` | `@Component` interface (`configure(CFTLib)`) called after all services have booted — used to seed users, roles, and definitions |
| `localAuth` | Auth mode set by cftlib where IDAM and S2S calls are intercepted in-process; no real Keycloak needed |
| `cftlibTest` | Source set and Gradle task for JUnit integration tests that run against the in-process stack |
