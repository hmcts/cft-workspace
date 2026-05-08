---
topic: permissions
audience: both
sources:
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/Authorisation.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/AuthorisationParser.java
  - ccd-definition-store-api:domain/src/main/java/uk/gov/hmcts/ccd/definition/store/domain/validation/authorization/CrudValidator.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
  - ccd-test-definitions:src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseEvent.json
  - ccd-test-definitions:src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseField.json
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/Permissions.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/model/UserRole.java
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseEvent.json
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/SimpleCaseConfiguration.java
  - libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Permission.java
  - libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/ConfigBuilderImpl.java
  - apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/domain/service/common/AccessControlService.java
  - apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/domain/service/common/CaseAccessService.java
  - apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/domain/service/createcase/AuthorisedCreateCaseOperation.java
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseEvent.json
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/SimpleCaseConfiguration.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1343292362"
    title: "CRUD Basics"
    space: "RCCD"
  - id: "1254261627"
    title: "CRUD on Collections"
    space: "RCCD"
  - id: "1134527861"
    title: "CRUD on Complex Types"
    space: "RCCD"
  - id: "1285226654"
    title: "Access Control"
    space: "RCCD"
  - id: "954990861"
    title: "RDM-4083- Authorisation for Complex Types"
    space: "RCCD"
  - id: "207804327"
    title: "CCD Definition Glossary for Setting up a Service in CCD"
    space: "RCCD"
  - id: "1343293015"
    title: "Using CRUD to hide Events triggering from UI"
    space: "RCCD"
  - id: "1042843985"
    title: "Shuttering a CaseType on CCD using CRUD"
    space: "RCCD"
  - id: "378930064"
    title: "CRUD implementation in CCD"
    space: "RCCD"
  - id: "1440501832"
    title: "CCD Access Control LLD"
    space: "RCCD"
  - id: "1496582661"
    title: "Access Control Worked Examples"
    space: "RCCD"
---

# Add Permissions

## TL;DR

- CCD permissions are four booleans — Create, Read, Update, Delete — attached to a role on a case field, event, or state via dedicated `Authorisation*` sheets (JSON) or SDK `.grant()` calls.
- The CRUD column accepts any subset string: `"CRUD"`, `"CR"`, `"R"`. Case-insensitive; validated against `^[CRUDcrud\s]{1,5}$` at import time (`CrudValidator.java:12`).
- Five ACL scopes exist: `AuthorisationCaseType`, `AuthorisationCaseField`, `AuthorisationCaseEvent`, `AuthorisationCaseState`, `AuthorisationComplexType`. <!-- CONFLUENCE-ONLY: HMCTS Confluence (CCD Definition Glossary, RCCD/207804327) states "D — delete is not yet implemented" for all five tabs. Source code does set the `delete` boolean (`AuthorisationParser.java:45`); the data-store enforcement gap is not visible from the parser alone. -->
- The semantic meaning of each letter varies by scope: on events, **C** = trigger the event, **R** = read audit-history entries, **U has no impact** (per Confluence). <!-- CONFLUENCE-ONLY: glossary RCCD/207804327, AuthorisationCaseEvent CRUD column. -->
- Definition-store stores the grants; data-store enforces them at runtime — you must reimport after every change.
- SDK teams use `.grant(permissions, roles...)` on the event builder and `@CCD(access = {MyAccess.class})` on fields. JSON teams edit the `Authorisation*.json` shards directly.

---

## Prerequisites

- You know the **access profile** (also called role) string you want to grant, e.g. `caseworker-myservice-caseworker`. It must exist in the `RoleToAccessProfiles` sheet (or equivalent SDK config) before referencing it in any `Authorisation*` sheet — missing profiles are caught at import validation.
- You can import a definition: `POST /import` on definition-store with a multipart xlsx or assembled JSON shards.

---

## Option A — JSON definition shards

Use this approach when your case type is defined as JSON files (e.g. the `ccd-test-definitions` pattern).

### 1. Grant CRUD on a case field

Add a row to `AuthorisationCaseField.json`:

```json
[
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MY_CASE_TYPE",
    "CaseFieldID": "applicantName",
    "UserRole": "caseworker-myservice-caseworker",
    "CRUD": "CRU"
  }
]
```

Required columns: `CaseTypeID`, `CaseFieldID`, `AccessProfile` (also accepted as `UserRole` in legacy sheets), `CRUD`
(`ColumnName.java:203–208`). The value maps to `case_field_acl(create, read, update, delete)` booleans
(`V0001__Base_version.sql:119–130`).

### 2. Grant CRUD on an event

Add a row to `AuthorisationCaseEvent.json`:

```json
[
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MY_CASE_TYPE",
    "CaseEventID": "submitApplication",
    "UserRole": "caseworker-myservice-caseworker",
    "CRUD": "CRU"
  }
]
```

Minimum fields: `LiveFrom`, `CaseTypeID`, `CaseEventID`, `UserRole`, `CRUD`
(pattern from `ccd-test-definitions:…/CCD_CNP_27/AAT/AuthorisationCaseEvent.json:2–7`). Maps to `event_acl` table.

### 3. Grant CRUD on a state

Add a row to `AuthorisationCaseState.json`:

```json
[
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MY_CASE_TYPE",
    "CaseStateID": "Submitted",
    "UserRole": "caseworker-myservice-caseworker",
    "CRUD": "CRU"
  }
]
```

Maps to `state_acl(create, read, update, delete)` (`V0001__Base_version.sql:1053–1064`).

### 4. Import the definition

```bash
curl -X POST "https://<definition-store-host>/import" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" \
  -F "file=@my-definition.xlsx"
```

For JSON-shard workflows the shards are usually assembled into an xlsx before import. The endpoint is
`ImportController.processUpload()` at `ImportController.java:62`.

---

## Option B — ccd-config-generator SDK

Use this approach when your case type is defined in Java using the `CCDConfig` SDK (e.g. nfdiv, pcs).

### 1. Declare the role

Add an entry to your `UserRole` enum (or equivalent `HasRole` implementation):

```java
// UserRole.java
MY_CASEWORKER("caseworker-myservice-caseworker", "CRU");
```

Each enum value carries the IDAM role name and the case-type-level CRUD string
(`nfdiv-case-api:…/model/UserRole.java:12–29`).

### 2. Grant on an event

Chain `.grant()` on the `EventBuilder` inside your `CCDConfig.configure()` implementation:

```java
configBuilder.event("submitApplication")
    .forStates(State.Submitted)
    .name("Submit Application")
    .grant(CREATE_READ_UPDATE, UserRole.MY_CASEWORKER)
    .aboutToSubmitCallback(this::aboutToSubmit);
```

`CREATE_READ_UPDATE` is a static `Set<Permission>` from `Permissions.java` (equivalent to `"CRU"`).
Event-level `.grant()` is additive — multiple calls accumulate rows
(`nfdiv-case-api:…/caseworker/event/CaseworkerConfirmService.java:57–58`).

### 3. Grant on a field

Annotate the field on your case-data class:

```java
// MyCaseData.java
@CCD(access = {CaseworkerAccess.class})
private String applicantName;
```

`CaseworkerAccess` is a POJO implementing `HasAccessControl` that returns a `SetMultimap<HasRole, Permission>`:

```java
public class CaseworkerAccess implements HasAccessControl {
    @Override
    public SetMultimap<HasRole, Permission> getGrants() {
        SetMultimap<HasRole, Permission> grants = HashMultimap.create();
        grants.putAll(UserRole.MY_CASEWORKER, Permissions.CREATE_READ_UPDATE);
        return grants;
    }
}
```

Pattern from `nfdiv-case-api:…/model/access/AosAccess.java:19–29`.

### 4. Grant on a state

State-level grants are declared on the config builder. The signature is
`void grant(S state, Set<Permission> permissions, R... role)`
(`ConfigBuilder.java:39`, implementation `ConfigBuilderImpl.java:253`):

```java
configBuilder.grant(State.Submitted, CREATE_READ_UPDATE, UserRole.MY_CASEWORKER);
```

> Note: `Permission.CRU`, `Permission.CR`, `Permission.CRUD` are the canonical SDK constants
> (`Permission.java:13–15`). `CREATE_READ_UPDATE` is an nfdiv-defined alias
> (`nfdiv-case-api:…/access/Permissions.java:17`) that maps to `Permission.CRU`. The two
> are interchangeable — use whichever your project's `Permissions.java` defines.

### 5. Generate and import

Run your SDK's definition-generation task (typically `./gradlew generateCCDConfig`) to produce the xlsx, then import as in Option A step 4.

---

## CRUD string reference

| String | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| `CRUD` | yes | yes | yes | yes |
| `CRU`  | yes | yes | yes | no  |
| `CR`   | yes | yes | no  | no  |
| `R`    | no  | yes | no  | no  |

Any subset of `C`, `R`, `U`, `D` is valid (case-insensitive). The parser reads presence of each character and sets the corresponding boolean (`AuthorisationParser.java:37–46`). Invalid strings cause a 400/422 at import time.

### Per-scope semantics

The letters mean slightly different things depending on which `Authorisation*` tab they appear on. From the CCD Definition Glossary:

| Letter | AuthorisationCaseType | AuthorisationCaseField | AuthorisationCaseEvent | AuthorisationCaseState |
|--------|-----------------------|------------------------|------------------------|------------------------|
| `C` | create cases of this type | create cases with this field populated | trigger the event | create cases with this state as final state |
| `R` | read/view cases of this type | read/view this field's data | read this event's entries in the audit history log | read/view cases in this state |
| `U` | modify cases of this type | modify this field's data | **no impact** | modify cases in this state |
| `D` | delete (not yet implemented) | delete (not yet implemented) | delete (not yet implemented) | delete (not yet implemented) |

<!-- CONFLUENCE-ONLY: per-scope CRUD semantics from CCD Definition Glossary RCCD/207804327. The "no impact" for U on events and "not yet implemented" for D on all scopes are runtime-behaviour claims that the parser-level source code does not contradict — `AuthorisationParser.java` parses all four flags identically; the differential semantics live in data-store enforcement, which we have not traced. -->

---

## CRUD on Collections

When a CaseField is a Collection, the CRUD letters apply to **collection items** (the rows inside the collection):

| Letter | Behaviour | UI signal |
|--------|-----------|-----------|
| `C` | User can add a new item to the collection | **Add** button is enabled (greyed out without `C`) |
| `R` | User can see existing items | If only `R` is set, items are read-only |
| `U` | User can edit element values inside an item | Fields become editable (requires `R` to be useful) |
| `D` | User can remove items from the collection | **Remove** button is enabled (requires `R` to be useful) |

<!-- CONFLUENCE-ONLY: UI behaviour described in RCCD/1254261627 "CRUD on Collections" — Add/Remove button enablement is XUI behaviour, not modelled in CCD source. -->

Two limitations to be aware of:

- **Top-level only.** Per-collection-item CRUD is only supported when the top-level CaseField is itself a Collection. If the Collection sits at a lower nesting level inside a Complex Type, the CRUD applies to the top-level field as a whole (no per-item enforcement). <!-- CONFLUENCE-ONLY: RCCD/1254261627. -->
- **`R` is not implied.** For `U` or `D` to be useful you must also set `R` explicitly — `R` is **not** assumed from the presence of `U` or `D`.

---

## Hiding an event from the UI

If an event should only be triggered programmatically (via a callback or system integration) and should **not** appear in the XUI actions dropdown, remove `C` from all human-user access profiles and create a dedicated system access profile with `C` only.

```json
[
  { "CaseTypeID": "MY_CASE_TYPE", "CaseEventID": "systemCreateClaim", "UserRole": "caseworker-myservice-system", "CRUD": "C", "LiveFrom": "01/01/2020" },
  { "CaseTypeID": "MY_CASE_TYPE", "CaseEventID": "systemCreateClaim", "UserRole": "caseworker-myservice-caseworker", "CRUD": "R", "LiveFrom": "01/01/2020" }
]
```

<!-- CONFLUENCE-ONLY: RCCD/1343293015 "Using CRUD to hide Events triggering from UI". The UI dropdown filtering by C is XUI behaviour not modelled in CCD source. Confirmed: AuthorisedGetEventTriggerOperation.java uses CAN_CREATE to determine which events appear. -->

The caseworker retains `R` so they can still see the event in the case history (audit log). Without `R` the event vanishes entirely from their view.

In the SDK:

```java
configBuilder.event("systemCreateClaim")
    .grant(Set.of(Permission.C), UserRole.SYSTEM)
    .grant(Set.of(Permission.R), UserRole.MY_CASEWORKER);
```

---

## Shuttering a case type

To temporarily prevent all interaction with a case type (e.g. during a release or a Sev-1 incident), set the `AuthorisationCaseType` CRUD to a value that grants no useful access. The historical guidance suggested using `D`:

```json
[
  { "CaseTypeID": "MY_CASE_TYPE", "UserRole": "caseworker-myservice-caseworker", "CRUD": "D", "LiveFrom": "01/01/2020" }
]
```

**Caveat:** If any access profile is matched via a `RoleToAccessProfiles` row with `ReadOnly=Y`, the effective CRUD is forced to `R` regardless of what `AuthorisationCaseType` says. Users with such profiles will still see the case type in their case list. A complete shutter therefore requires either:

- Disabling the `RoleToAccessProfiles` row (set `Disabled=Y`) and reimporting, or
- Removing the role assignment entirely via Access Management.

<!-- CONFLUENCE-ONLY: Shuttering caveats from RCCD/1042843985. CCD-6072 is open to redefine shuttering strategy. The readOnly override is enforced in data-store AccessControlService but the specific shuttering scenario is not directly testable from source alone. -->

To revert, reimport the definition with the original CRUD values.

---

## API enforcement behaviour

The data-store enforces CRUD at each API operation with two distinct outcomes:

- **(E) Error** — if the user lacks access, the entire request is rejected (typically 403).
- **(F) Filter** — if the user lacks access to a specific element (field, state, event), that element is silently excluded from the response.

The following table shows which CRUD flags are checked per API operation (`AccessControlService.java`, `AuthorisedCreateCaseOperation.java`, `AuthorisedGetEventTriggerOperation.java`):

| API operation | C checks | R checks | U checks |
|---------------|----------|----------|----------|
| `createCase` | caseType(E), event(E), fields(E) | caseType(F), fields(F) | -- |
| `startEvent` / `startCaseCreation` | -- | caseType(F), fields(F) | -- |
| `createEvent` (submit) | event(E), fields(E) | caseType(F), fields(F) | caseType(E), fields(E), state(E) |
| `getCase` | -- | caseType(F), fields(F), state(F) | -- |
| `getEvents` (audit history) | -- | caseType(F), events(F) | -- |
| `search` | -- | caseType(F), fields(F), state(F) | -- |
| `getEventTriggerForCaseType` | caseType(E), event(E) | caseType(E), fields(F) | -- |
| `getEventTriggerForCase` | event(E) | caseType(E), fields(F) | caseType(E), fields(F), state(E) |

Key observations:

- **Creating a case** requires `C` on the case type, the create event, and every field being submitted. Fields without `C` are rejected.
- **Submitting an event** (`createEvent`) also requires `U` on the case type, submitted fields, and the target state.
- **Reading** applies filter semantics — fields without `R` are stripped rather than causing a 403.
- **D (Delete)** is parsed and stored but **not enforced** by any current data-store API. <!-- DIVERGENCE: Confluence (RCCD/378930064, "CRUD implementation in CCD") lists AuthorisationState as "In development" and does not show D being checked on any endpoint. Source confirms: V0001__Base_version.sql creates state_acl with a delete column, AccessControlService defines CAN_DELETE predicate, but no AuthorisedOperation uses CAN_DELETE in its flow. Source wins for stating D is stored but not enforced. -->

---

## Gotchas

- `role_id` in the `*_acl` tables is a FK to `AccessProfileEntity` (the `role` table), **not** an IDAM role string directly. The IDAM-role-to-access-profile bridge is the `RoleToAccessProfiles` sheet. If the access profile is missing there, import validation will reject the row.
- `live_from` / `live_to` on ACL rows time-bound the grant. A row with a future `live_from` will be stored but silently inactive until that date — data-store enforces the date window at query time.
- For nested fields inside a complex type, use `AuthorisationComplexType.json` (not `AuthorisationCaseField.json`) and set `ListElementCode` to the dot-notation path (e.g. `applicant.address`). Every intermediate path segment must also have an explicit ACL row for the same access profile (`CaseFieldEntityComplexFieldACLValidatorImpl.java:96–111`).
- Predefined complex types (e.g. `Address`, `OrderSummary`) cannot carry `AuthorisationComplexType` rows — the validator will reject them (`CaseFieldEntityComplexFieldACLValidatorImpl.java:38–49`).
- **Omitted Complex-Type elements are hidden.** If a Complex Type has *any* element listed in `AuthorisationComplexType` for a given access profile, every other element of that Complex Type that you don't list will have **no effective permissions** and will be hidden from that access profile. Either list all elements you want exposed, or list none and rely on the parent CaseField's CRUD propagating to all children. <!-- CONFLUENCE-ONLY: RCCD/1134527861 "If you omit any of the elements of the ComplexType, it has no effective permissions so will be hidden." Behaviour confirmed by validator path traversal but the "all-or-nothing per profile" rule is not explicit in source. -->
- **Parent-level CRUD propagates down to undefined depths.** If a Complex Type has multiple nested levels and you stop defining ACLs at level *n*, all children below *n* inherit the level-*n* CRUD for that access profile. <!-- CONFLUENCE-ONLY: RCCD/1134527861. -->
- **`Authorisation` column on `RoleToAccessProfiles` is a gating filter.** If a `RoleToAccessProfiles` row has a non-empty `Authorisation` column, the user's Role Assignment must include at least one of the listed authorisations (returned by `am-role-assignment-service`) before the AccessProfile is granted. Empty means "no extra gating." <!-- CONFLUENCE-ONLY: RCCD/1285226654 "Access Control" section "Identify the AccessProfiles that apply." -->
- **READONLY characteristic forces R-only.** If the AccessProfile or the matched `RoleToAccessProfiles` row has the READONLY flag set, every CRUD permission resolved through that profile is reduced to `R` regardless of what the `Authorisation*` tab says (RDM-11457). <!-- CONFLUENCE-ONLY: RCCD/1285226654. -->
- **`AuthorisationCaseState` was historically marked "In development" on the CRUD Basics Confluence page.** That marker is stale — the `state_acl` table has been part of the base migration since `V0001__Base_version.sql:1053` and is enforced today. <!-- DIVERGENCE: Confluence (RCCD/1343292362, "CRUD Basics") lists "AuthorisationState (In development)". Source shows `state_acl` was created in V0001 (`apps/ccd/ccd-definition-store-api/repository/src/main/resources/db/migration/V0001__Base_version.sql:1050-1064`) and is fully wired through `AuthorisationCaseStateValidatorImpl` — the in-development marker is out of date. Source wins. -->
- **ReadOnly mismatch blocks access entirely.** The `ReadOnly` value in a `RoleToAccessProfiles` row must match the `ReadOnly` value on the user's Role Assignment. If the RA says `ReadOnly=Y` but the `RoleToAccessProfiles` row says `ReadOnly=N` (or vice versa), no AccessProfile is derived and the user has **zero** access through that path. <!-- CONFLUENCE-ONLY: RCCD/1496582661 "Access Control Worked Examples" - demonstrated via Solicitor-02 on J1-CT6-01 and J1-CT7-03. Not explicitly visible in a single source file but consistent with the RoleToAccessProfiles matching logic. -->
- **Case roles require explicit case_users entries.** Access profiles prefixed with `[` (e.g. `[APPELLANT]`, `[RESPONDENT]`) are case roles. The user must have an explicit Role Assignment with that `RoleName` on the specific case to gain the associated AccessProfile. Without it, none of the CRUD defined for that access profile applies. <!-- CONFLUENCE-ONLY: RCCD/1496582661 and RCCD/1440501832 (CaseAccessService). Confirmed: CaseAccessService.java uses RESTRICT_GRANTED_ROLES_PATTERN to gate solicitor/citizen access. -->
- **IdAM roles only work as pseudo-AccessProfiles when a case role exists.** If there is no `RoleToAccessProfiles` mapping for the user's IDAM role, CCD can still use it as a pseudo-AccessProfile — but only if the user already has *some* case role on that case. Without a case role, the IDAM role alone is insufficient. <!-- CONFLUENCE-ONLY: RCCD/1496582661 "Access Control Worked Examples" Solicitor-01 on J1-CT7-01 vs J1-CT7-02. -->

---

## Verify

After importing, confirm the role can or cannot access the resource using data-store's case endpoint:

```bash
# Should return the case (role has Read on the case type and fields)
curl -s \
  -H "Authorization: Bearer $TOKEN_WITH_ROLE" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" \
  "https://<data-store-host>/cases/$CASE_ID" \
  | jq '.data.applicantName'

# Should return 403 or omit the field (role missing or Read not granted)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN_WITHOUT_ROLE" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" \
  "https://<data-store-host>/cases/$CASE_ID"
```

To verify event access, attempt to start the event trigger:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN_WITH_ROLE" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" \
  "https://<data-store-host>/cases/$CASE_ID/event-triggers/submitApplication?ignore-warning=false"
# Expect 200 if granted, 403 if not
```

---

## Examples

### JSON form

```json
// apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseEvent.json
[ {
  "LiveFrom" : "1/1/17",
  "LiveTo" : "",
  "CaseTypeID" : "AAT",
  "CaseEventID" : "CREATE",
  "UserRole" : "caseworker-autotest1",
  "CRUD" : "CRU"
}, {
  "LiveFrom" : "1/1/17",
  "LiveTo" : "",
  "CaseTypeID" : "AAT",
  "CaseEventID" : "START_PROGRESS",
  "UserRole" : "caseworker-autotest1",
  "CRUD" : "CRU"
} ]
```

<!-- source: apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseEvent.json:1-14 -->

### config-generator form

```java
// from libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/SimpleCaseConfiguration.java
configBuilder
    .event(CREATE_EVENT)
    .forStateTransition(EnumSet.noneOf(SimpleCaseState.class), SimpleCaseState.CREATED)
    .name("Create simple case")
    .grant(CREATE_READ_UPDATE, UserRole.CASE_WORKER)
    .grantHistoryOnly(UserRole.SUPER_USER);
```

<!-- source: libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/SimpleCaseConfiguration.java:36-44 -->

## See also

- [Permissions](../explanation/permissions.md) — conceptual model: how CRUD booleans, access profiles, and RoleToAccessProfiles interact
- [Permissions matrix reference](../reference/permissions-matrix.md) — complete CRUD scope and inheritance rules
