---
topic: tutorial-config-generator
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CCDConfig.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/DecentralisedConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/EventTypeBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/HasRole.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/NoFaultDivorce.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CreateTestCase.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerAddNote.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/DecentralisedCaseworkerAddNote.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/SimpleCaseConfiguration.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/UserRole.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/DefaultAccess.java
  - ccd-config-generator:test-projects/e2e/build.gradle
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1632907349"
    title: "How to add a new Jurisdiction"
    last_modified: "unknown"
    space: "SPT"
  - id: "1563624268"
    title: "Approach to CCD definition generation"
    last_modified: "unknown"
    space: "ADOP"
  - id: "1675764544"
    title: "Microservice Components"
    last_modified: "unknown"
    space: "SPT"
  - id: "1875854371"
    title: "Decentralised data persistence"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1847010616"
    title: "CCD Decentralisation PoC Impact Assessment for services"
    last_modified: "unknown"
    space: "DSRDI"
---

# First Case Type (Config Generator)

## TL;DR

- `ccd-config-generator` is a Gradle plugin + Java SDK that lets you define a CCD case type in code — no spreadsheets.
- Implement `CCDConfig<CaseData, State, Role>` on one or more `@Component` classes; the SDK aggregates them all.
- `ConfigBuilder.event(id)` is the entry point for every event (centralised); chain `.name()`, `.fields()`, `.grant()`, and callback lambdas.
- For decentralised services, implement `configureDecentralised(DecentralisedConfigBuilder...)` and use `decentralisedEvent(id, submitHandler)` so events run in-process instead of via webhook.
- State and role are plain Java enums; roles implement `HasRole`; states are annotated with `@CCD`.
- Run `./gradlew :test-projects:e2e:check` to validate your config end-to-end with a live CCD stack via cftlib.

---

## Prerequisites

- Java 21, Gradle 8+.
- A Spring Boot 3.x service project (the SDK integrates as a Spring `@Component` scan).
- Basic familiarity with Spring Boot dependency injection.
- The `libs/ccd-config-generator` repo cloned locally — the `test-projects/e2e` project is the reference implementation referenced throughout this tutorial.

---

## Step 1 — Apply the Gradle plugin

In your service's `build.gradle`:

```groovy
plugins {
    id 'hmcts.ccd.sdk' version '<latest>'
}

dependencies {
    // SDK is pulled in transitively by the plugin.
    // Add the decentralised runtime if you want in-process event handling:
    implementation 'com.github.hmcts:rse-cft-lib:<version>'
}

// Optional: enable decentralised mode
ccd {
    decentralised = true
}
```

The `hmcts.ccd.sdk` plugin registers the `generateCCDConfig` Gradle task and enables component scanning of your `CCDConfig` beans (`test-projects/e2e/build.gradle:17`).

---

## Step 2 — Define your state enum

States are a plain Java enum. Annotate each constant with `@CCD` to set the label CCD displays in the UI.

```java
public enum MyState {
    @CCD(label = "Draft")
    Draft,

    @CCD(label = "Submitted")
    Submitted,

    @CCD(label = "Closed")
    Closed;
}
```

The e2e test project's `State` enum has 50+ values; most use `@CCD(label, hint, access)`. Access classes on a state control which roles can read cases in that state (`test-projects/e2e/src/main/java/.../divorcecase/model/State.java`).

---

## Step 3 — Define your role enum

Roles implement `HasRole`. Each constant's string value is the IDAM role name CCD will use.

```java
public enum UserRole implements HasRole {
    CASE_WORKER("caseworker-myservice-caseworker"),
    SOLICITOR("caseworker-myservice-solicitor"),
    CITIZEN("citizen"),
    CREATOR("[CREATOR]");

    private final String role;

    UserRole(String role) { this.role = role; }

    @Override
    public String getRole() { return role; }
}
```

`[CREATOR]` is a CCD built-in pseudo-role that resolves to the user who created the case (`test-projects/e2e/src/main/java/.../divorcecase/model/UserRole.java`).

---

## Step 4 — Define your case data class

Your case data is a plain Java class. Annotate fields with `@CCD` to set labels, hint text, and field-level access control.

```java
public class MyCaseData {

    @CCD(
        label = "Case subject name",
        access = {DefaultAccess.class}
    )
    private String subjectName;

    @CCD(
        label = "Application type",
        access = {DefaultAccess.class}
    )
    private String applicationType;
}
```

Field-level access classes implement `HasAccessControl` and return a `SetMultimap<HasRole, Permission>`. The e2e project's `DefaultAccess` grants `[CREATOR]` CRU, `SYSTEMUPDATE` CRUD, and all others READ (`test-projects/e2e/src/main/java/.../divorcecase/model/access/DefaultAccess.java:22-30`).

Mark a field `@External` if it should not be stored in the CCD case blob (the SDK's `FilterExternalFieldsInspector` strips it at persistence time).

---

## Step 5 — Implement CCDConfig

Create a `@Component` class that implements `CCDConfig<CaseData, State, Role>`. Its `configure` method is the root of your case type definition.

```java
@Component
public class MyCaseType implements CCDConfig<MyCaseData, MyState, UserRole> {

    public static final String CASE_TYPE = "MY_CASE_TYPE";
    public static final String JURISDICTION = "MYSERVICE";

    @Override
    public void configure(ConfigBuilder<MyCaseData, MyState, UserRole> builder) {
        builder.setCallbackHost("http://localhost:4013");
        builder.caseType(CASE_TYPE, "My Case Type", "My service cases");
        builder.jurisdiction(JURISDICTION, "My Service", "My Service jurisdiction");
    }
}
```

`setCallbackHost` sets the base URL prepended to all webhook paths at definition-generation time (`ConfigBuilder.java:53`). In production this is your service's hostname; locally it is typically `http://localhost:<port>`. Services frequently read it from an env var:

```java
builder.setCallbackHost(System.getenv().getOrDefault("CASE_API_URL", "http://localhost:4013"));
```

Convention is to declare both `CASE_TYPE` and `JURISDICTION` as `public static final` constants on the root config class so other classes (event handlers, integration tests, `CftLibConfig`) can refer to them without duplicating the string. The e2e project follows this convention (`NoFaultDivorce.java:18-20`).

Each event can also be its own `@Component` — the SDK aggregates all `CCDConfig` beans discovered via Spring component scanning. This is the canonical pattern in the e2e project: each of the 22 event classes under `test-projects/e2e/src/main/java/.../sow014/nfd/` is a standalone `@Component`.

---

## Step 5.5 — (Optional) Unwrapped types and field migrations

Two patterns are widely used by HMCTS service teams and reduce boilerplate significantly.

### Unwrapped complex types

Most teams avoid heavy use of CCD complex types because they affect the XUI rendering. Instead, they use Jackson's `@JsonUnwrapped` to flatten a Java object into the parent's field namespace at serialisation time:

```java
public class CaseData {
    @JsonUnwrapped(prefix = "applicant1")
    private Applicant applicant1 = new Applicant();

    @JsonUnwrapped(prefix = "applicant2")
    private Applicant applicant2 = new Applicant();
}

public class Applicant {
    @CCD(label = "First name")
    private String firstName;

    @CCD(label = "Last name")
    private String lastName;
}
```

The generator emits four flat case fields: `applicant1FirstName`, `applicant1LastName`, `applicant2FirstName`, `applicant2LastName`.
<!-- CONFLUENCE-ONLY: pattern documented on Adoption "Approach to CCD definition generation" Confluence page (id 1563624268); not directly verified in SDK source but consistent with Jackson's standard JsonUnwrapped behaviour. -->

### Retiring fields with a pre-event hook

CCD's definition store cannot remove or rename fields without manual patching, so most teams *retire* fields by moving them to a `RetiredFields` class and registering a pre-event hook that rewrites the inbound JSON before it is deserialised into `CaseData`:

```java
// In your root CCDConfig.configure():
configBuilder.addPreEventHook(RetiredFields::migrate);
```

```java
public class RetiredFields {
    private static final Map<String, Consumer<Map<String, Object>>> migrations = Map.of(
        "exampleRetiredField",
        data -> data.put("applicant1FirstName", data.get("exampleRetiredField"))
    );

    public static Map<String, Object> migrate(Map<String, Object> data) {
        migrations.forEach((field, op) -> {
            if (data.containsKey(field)) op.accept(data);
        });
        return data;
    }
}
```

`ConfigBuilder.addPreEventHook` is verified in `ConfigBuilder.java:60`. The migration data-version-field cron pattern (search for cases with old `dataVersion` and fire a `system-migrate-case` event) is widely used but service-specific — the SDK itself does not provide it.
<!-- CONFLUENCE-ONLY: the dataVersion cron pattern is described in the Adoption Confluence page (id 1563624268) and is convention rather than SDK API. -->

### Type overrides on `@CCD`

When your Java type is an enum or a complex type that you want CCD to render as a different field type:

```java
@CCD(
    label = "Application type",
    access = {DefaultAccess.class},
    typeOverride = FixedList,
    typeParameterOverride = "ApplicationType"
)
private ApplicationType applicationType;
```

`typeOverride` and `typeParameterOverride` on `@CCD` let you map a Java type to any CCD field type — see [the field-types reference](../reference/field-types.md) for the full vocabulary.

---

## Step 6 — Define a creation event

Add an event that transitions a case from no state into `Draft`. A case cannot exist in CCD until a creation event has been fired.

```java
@Component
public class CreateMyCase implements CCDConfig<MyCaseData, MyState, UserRole> {

    @Override
    public void configure(ConfigBuilder<MyCaseData, MyState, UserRole> builder) {
        builder.event("create-my-case")
            .initialState(MyState.Draft)
            .name("Create case")
            .description("Creates a new case")
            .grant(Set.of(Permission.C, Permission.R, Permission.U), UserRole.CASE_WORKER)
            .aboutToSubmitCallback(this::aboutToSubmit)
            .fields()
                .page("page1")
                .mandatory(MyCaseData::getSubjectName)
                .optional(MyCaseData::getApplicationType);
    }

    private AboutToStartOrSubmitResponse<MyCaseData, MyState> aboutToSubmit(
            CaseDetails<MyCaseData, MyState> details,
            CaseDetails<MyCaseData, MyState> beforeDetails) {
        // Enrich or validate case data before CCD persists it.
        return AboutToStartOrSubmitResponse.<MyCaseData, MyState>builder()
            .data(details.getData())
            .build();
    }
}
```

Key points:
- `.initialState(state)` marks this as a creation event — no pre-state.
- `.grant(permissions, roles...)` sets which roles can trigger this event (`Event.java:160`).
- `.fields().page("page1")` opens the first wizard page; subsequent `.mandatory()` / `.optional()` calls add fields to it (`FieldCollection.java:500`).
- The `aboutToSubmitCallback` lambda is a `AboutToSubmit<T,S>` functional interface; mutually exclusive with `submitHandler` (decentralised mode) (`Event.java:196-203`).

The e2e reference for a full three-callback creation event is `test-projects/e2e/src/main/java/.../sow014/nfd/CreateTestCase.java:85-103` (configure method; callback methods follow through line 129).

---

## Step 7 — Define a follow-up event

A follow-up event has a pre-state and a post-state. The `SimpleCaseConfiguration` in the e2e project is the clearest minimal example (`test-projects/e2e/src/main/java/.../simplecase/SimpleCaseConfiguration.java:53-66`):

```java
builder.event("update-my-case")
    .forStateTransition(MyState.Draft, MyState.Submitted)
    .name("Submit case")
    .grant(Set.of(Permission.C, Permission.R, Permission.U), UserRole.CASE_WORKER)
    .fields()
        .page("submitPage")
        .mandatory(MyCaseData::getApplicationType);
```

Use `.forAllStates()` if the event should be available in every state — this is the pattern used by `CaseworkerAddNote` (`test-projects/e2e/src/main/java/.../sow014/nfd/CaseworkerAddNote.java:44`).

`forStateTransition` accepts both single states and an `EnumSet`. The minimal creation form `.forStateTransition(EnumSet.noneOf(MyState.class), MyState.Created)` is equivalent to `.initialState(MyState.Created)` — both are used in `SimpleCaseConfiguration` (`SimpleCaseConfiguration.java:38`).

---

## Step 7.5 — (Decentralised services only) `decentralisedEvent`

If your service is decentralised (`ccd { decentralised = true }` in `build.gradle`), event creation goes through a different builder. Implement `configureDecentralised` instead of (or in addition to) `configure`, and use `decentralisedEvent` to bind the in-process submit handler:

```java
@Component
public class DecentralisedCaseworkerAddNote implements CCDConfig<MyCaseData, MyState, UserRole> {

    @Override
    public void configureDecentralised(DecentralisedConfigBuilder<MyCaseData, MyState, UserRole> builder) {
        builder.decentralisedEvent("add-note-decentralised", this::submit, this::start)
            .forAllStates()
            .name("Add note (decentralised)")
            .grant(Set.of(Permission.C, Permission.R, Permission.U), UserRole.CASE_WORKER)
            .fields()
                .page("addNote")
                .optional(MyCaseData::getNote);
    }

    private CaseData start(EventPayload<MyCaseData, MyState> payload) { /* … */ }

    private SubmitResponse<MyState> submit(EventPayload<MyCaseData, MyState> payload) {
        // Persist directly via JdbcTemplate / your repository.
        return SubmitResponse.<MyState>builder()
            .confirmationHeader("Done")
            .build();
    }
}
```

Key points:
- `CCDConfig.configureDecentralised` defaults to delegating to `configure`, so existing centralised configs are unaffected (`CCDConfig.java:37`).
- `decentralisedEvent(id, submitHandler[, startHandler])` is exposed only on `DecentralisedConfigBuilder` (`DecentralisedConfigBuilder.java:16-22`).
- The `submitHandler` runs **in-process** in your service; CCD calls a single `POST /ccd-persistence/cases` endpoint instead of the legacy `aboutToSubmit`/`submitted` callback pair. Transactional control sits with your service.
- `aboutToStart` and `midEvent` callbacks still fire on a decentralised event; only `aboutToSubmit` and `submitted` are replaced by the in-process `submitHandler`.

The full reference is `test-projects/e2e/src/main/java/.../sow014/nfd/DecentralisedCaseworkerAddNote.java`. See [the decentralisation explanation](../explanation/decentralisation.md) for the wider runtime architecture.

<!-- CONFLUENCE-ONLY: the broader rationale (case pointers, Idempotency-Key derivation, 409 Conflict semantics, GET /ccd-persistence/cases bulk endpoint) is documented on the RCCD "Decentralised data persistence" Confluence page (id 1875854371). It does not affect tutorial mechanics but explains the runtime contract your submit handler is participating in. -->

---

## Step 8 — Add search and work basket fields

CCD requires at least one field registered in the work basket for the case list to render. Register fields via the four `ConfigBuilder` methods:

```java
// In your root CCDConfig.configure():
builder.searchInputFields()
    .field(MyCaseData::getApplicationType);

builder.searchResultFields()
    .field(MyCaseData::getApplicationType);

builder.workBasketInputFields()
    .field(MyCaseData::getApplicationType);

builder.workBasketResultFields()
    .field(MyCaseData::getApplicationType);
```

The e2e `E2E_SIMPLE` case type registers all four inline in a single `configure()` method on the `subject` field (`SimpleCaseConfiguration.java:68-75`). Splitting into separate `@Component` classes (as the main `E2E` type does) keeps things manageable as field count grows.

---

## Step 9 — Generate and inspect the definition JSON

```bash
cd libs/ccd-config-generator
./gradlew :test-projects:e2e:generateCCDConfig
```

This writes JSON definition files to `test-projects/e2e/build/definitions/`. Inspect the output to confirm your case type, states, events, and fields are present before running the full e2e suite.

---

## Step 10 — Run the end-to-end check

```bash
./gradlew :test-projects:e2e:check
```

This task:
1. Compiles the project and runs unit tests.
2. Generates JSON CCD definitions from all `CCDConfig` beans.
3. Boots a live CCD stack in-process via `rse-cft-lib` (cftlib).
4. Imports the generated definitions via `CftLibConfig.generateAllCaseTypesToJSON` + `importJsonDefinition`.
5. Executes `TestWithCCD` tests against the running stack.

The `build.gradle` plugin block at `test-projects/e2e/build.gradle:17` sets `ccd { decentralised = true }`, which enables the decentralised runtime for this test project. Your own project may omit that flag if you are using legacy webhook callbacks only.

---

## Verify

After `./gradlew :test-projects:e2e:check` completes successfully:

1. Check the Gradle output for `BUILD SUCCESSFUL` — all unit and cftlib tests passed.
2. Inspect `test-projects/e2e/build/definitions/` — confirm your case type JSON files are present and contain the events and fields you defined.

---

## See also

- [`docs/ccd/explanation/case-type-model.md`](../explanation/case-type-model.md) — what case types, states, and events mean in CCD
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — CCD term definitions

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

