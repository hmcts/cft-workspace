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
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseEvent.json
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/SimpleCaseConfiguration.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Add Permissions

## TL;DR

- CCD permissions are four booleans — Create, Read, Update, Delete — attached to a role on a case field, event, or state via dedicated `Authorisation*` sheets (JSON) or SDK `.grant()` calls.
- The CRUD column accepts any subset string: `"CRUD"`, `"CR"`, `"R"`. Case-insensitive; validated against `^[CRUDcrud\s]{1,5}$` at import time (`CrudValidator.java:12`).
- Five ACL scopes exist: `AuthorisationCaseType`, `AuthorisationCaseField`, `AuthorisationCaseEvent`, `AuthorisationCaseState`, `AuthorisationComplexType`.
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

State-level grants are declared when registering states with the config builder:

```java
configBuilder.grant(State.Submitted, CREATE_READ_UPDATE, UserRole.MY_CASEWORKER);
```

<!-- TODO: research note insufficient for exact SDK method signature on state grants; pattern inferred from event builder analogy -->

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

---

## Gotchas

- `role_id` in the `*_acl` tables is a FK to `AccessProfileEntity` (the `role` table), **not** an IDAM role string directly. The IDAM-role-to-access-profile bridge is the `RoleToAccessProfiles` sheet. If the access profile is missing there, import validation will reject the row.
- `live_from` / `live_to` on ACL rows time-bound the grant. A row with a future `live_from` will be stored but silently inactive until that date — data-store enforces the date window at query time.
- For nested fields inside a complex type, use `AuthorisationComplexType.json` (not `AuthorisationCaseField.json`) and set `ListElementCode` to the dot-notation path (e.g. `applicant.address`). Every intermediate path segment must also have an explicit ACL row for the same access profile (`CaseFieldEntityComplexFieldACLValidatorImpl.java:96–111`).
- Predefined complex types (e.g. `Address`, `OrderSummary`) cannot carry `AuthorisationComplexType` rows — the validator will reject them (`CaseFieldEntityComplexFieldACLValidatorImpl.java:38–49`).

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
