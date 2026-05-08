---
topic: permissions
audience: both
sources:
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/Authorisation.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseTypeACLEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseFieldACLEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/EventACLEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/StateACLEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/ComplexFieldACLEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/AccessProfileEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/RoleToAccessProfilesEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/model/AccessControlList.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/AuthorisationParser.java
  - ccd-definition-store-api:domain/src/main/java/uk/gov/hmcts/ccd/definition/store/domain/validation/authorization/CrudValidator.java
  - ccd-definition-store-api:domain/src/main/java/uk/gov/hmcts/ccd/definition/store/domain/validation/casefield/CaseFieldEntityComplexFieldACLValidatorImpl.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseField.json
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/AccessControlService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/CaseAccessService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createcase/AuthorisedCreateCaseOperation.java
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseField.json
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence:
  - id: "378930064"
    title: "CRUD implementation in CCD"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1343292362"
    title: "CRUD Basics"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1254261627"
    title: "CRUD on Collections"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1134527861"
    title: "CRUD on Complex Types"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1440501832"
    title: "CCD Access Control LLD"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1285226654"
    title: "Access Control"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1042843985"
    title: "Shuttering a CaseType on CCD using CRUD"
    last_modified: "unknown"
    space: "RCCD"
confluence_checked_at: "2026-04-29T00:00:00Z"
---

# Permissions Matrix

## TL;DR

- CCD permissions are CRUD booleans per access-profile on five scopes: case type, event, state, case field, and complex (nested) field.
- At runtime, data-store applies a three-layer composition: **AuthorisedOperation** (CRUD check) wraps **ClassifiedOperation** (security classification) wraps **DefaultOperation** (business logic).
- When multiple access profiles match, the caller receives the **union** of all grants — `anyMatch` semantics (if any profile has the permission, it passes).
- Enforcement is either **error** (reject the request with 403/404) or **filter** (silently omit the object from the response), depending on the API operation and CRUD scope.
- A child complex-field ACL can never grant more access than its parent field's ACL for the same access profile.
- The `D` permission is rarely appropriate; `U` on events is unused. Only assign `C` when a role genuinely needs to create/trigger.

---

## CRUD Bits

Each Authorisation sheet row carries a `CRUD` column whose characters map directly to four boolean DB columns. `AuthorisationParser.parseCrud()` uppercases the string and tests for the presence of each character (`AuthorisationParser.java:37-46`). `CrudValidator` enforces the string matches `^[CRUDcrud\s]{1,5}$` (`CrudValidator.java:12-17`).

| Character | DB column | Meaning on a case type | Meaning on an event | Meaning on a state | Meaning on a field |
|-----------|-----------|----------------------|--------------------|--------------------|-------------------|
| `C`       | `create`  | Role can initiate a new case | Role can trigger this event | -- (unused) | Role can supply a value for this field during creation |
| `R`       | `read`    | Role can retrieve the case | Role can see the event in history | Role can see cases in this state | Role can see this field's value |
| `U`       | `update`  | Role can update case data | -- (unused) | -- (unused) | Role can change this field's value |
| `D`       | `delete`  | Role can delete the case | -- (unused) | -- (unused) | Role can clear/remove this field's value |

> `create` is a reserved SQL keyword; the DDL quotes it as `"create"` (`V0001__Base_version.sql:122`, `Authorisation.java:31`).

Valid CRUD string examples: `"CRUD"`, `"CR"`, `"R"`, `"CRU"`. Characters are case-insensitive; whitespace is tolerated. An empty or null string fails `CrudValidator`.

### Practical guidelines

<!-- CONFLUENCE-ONLY: not verified in source -->

- **`D` is rarely ever used** in practice. Most services never need to allow deletion of fields or cases.
- **Only assign `C` when you want a role to create something**; omitting `C` prevents the role from initiating new cases or triggering events.
- **`U` and `D` on events have no meaningful effect** -- events cannot be updated or deleted.

---

## ACL Scopes

Five separate `*_acl` tables each cover a different scope. All share the `Authorisation` `@MappedSuperclass` with the same four boolean columns plus `role_id` FK and `live_from`/`live_to` date bounds.

| Spreadsheet sheet          | DB table             | Scope                                     | Extra column |
|----------------------------|----------------------|-------------------------------------------|--------------|
| `AuthorisationCaseType`    | `case_type_acl`      | Whole case type                           | -- |
| `AuthorisationCaseEvent`   | `event_acl`          | Individual event trigger                  | -- |
| `AuthorisationCaseState`   | `state_acl`          | Individual case state                     | -- |
| `AuthorisationCaseField`   | `case_field_acl`     | Top-level case field                      | -- |
| `AuthorisationComplexType` | `complex_field_acl`  | Nested sub-field within a complex type    | `list_element_code varchar(1000)` -- dot-path to sub-field |

Required columns on every Authorisation sheet: `CaseTypeID`, the scope identifier (e.g. `CaseFieldID`, `CaseEventID`), `AccessProfile`, `CRUD` (`ColumnName.java:203-208`).

---

## Runtime Enforcement: Error vs Filter

At runtime, `ccd-data-store-api` checks CRUD grants in two ways depending on the API operation and scope (`AccessControlService.java`, `AuthorisedCreateCaseOperation.java`):

- **Error (E)**: If the user lacks the required permission, the request is rejected with a `ResourceNotFoundException` or equivalent. Used when the operation cannot proceed without the grant (e.g. creating a case requires `C` on case type, event, and fields).
- **Filter (F)**: If the user lacks the permission, the object is silently removed from the response. Used when partial results are acceptable (e.g. fields without `R` are stripped from the returned case data).

### API Enforcement Matrix

The following table shows which CRUD checks apply to each Standard API operation, based on data-store source (`AuthorisedCreateCaseOperation`, `AuthorisedGetCaseViewOperation`, `AuthorisedSearchOperation`):

| API Operation | C (case type) | C (event) | C (fields) | R (case type) | R (event) | R (fields) | R (state) | U (event) | U (fields) | U (state) |
|---------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `createCase`      | E | E | E | F | - | F | - | - | - | - |
| `createEvent`     | - | E | E | F | - | F | - | E | E | E |
| `getCase`         | - | - | - | F | - | F | F | - | - | - |
| `startEvent`      | - | - | - | F | - | F | - | - | - | - |
| `getEvents`       | - | - | - | F | F | - | - | - | - | - |
| `search`          | - | - | - | F | - | F | F | - | - | - |

**Legend**: E = check, reject on failure; F = check, filter on failure; `-` = not checked.

<!-- CONFLUENCE-ONLY: not verified in source -->

When an event creates a **new** field value, `C` on that field is checked (E). When it updates an **existing** field, `U` on that field is checked (E).

---

## CRUD on Collections

When CRUD is applied to a Collection field (via `AuthorisationCaseField`), the permissions control **collection item** operations. The data-store generates `DisplayContextParameter` values that drive the UI (`AccessControlService.generateDisplayContextParameter`):

| CRUD | Collection meaning | UI effect | Display context parameter |
|------|-------------------|-----------|---------------------------|
| `C`  | Can **add** items to the collection | "Add new" button enabled | `#COLLECTION(allowInsert)` |
| `R`  | Can **see** existing items | Items displayed (read-only if only `R`) | -- |
| `U`  | Can **edit** elements of existing items | Fields within items are editable | `#COLLECTION(allowUpdate)` |
| `D`  | Can **remove** items from the collection | "Remove" button enabled | `#COLLECTION(allowDelete)` |

**Important**: `R` must be explicitly granted for `U` or `D` to be meaningful -- a user cannot update or delete what they cannot see. `R` is not assumed.

<!-- CONFLUENCE-ONLY: not verified in source -->

Collection-level CRUD only applies when the **top-level** case field is a Collection. If a Collection appears at a lower nesting level within a complex type, CRUD applies to the top-level field as normal.

---

## CRUD on Events: Hiding Events from the UI

The `C` permission on `AuthorisationCaseEvent` controls whether a role can **trigger** an event. The `R` permission controls whether the role can **see** the event in case history.

To hide a system/callback event from the UI while still allowing programmatic triggering:

1. Remove `C` from all human-facing roles for that event.
2. Create a system user (access profile) with `C` to trigger the event from callbacks.
3. Grant `R` to human roles so they can still see the event in history.

```
| CaseTypeID     | CaseEventID | AccessProfiles    | CRUD |
|----------------|-------------|-------------------|------|
| MoneyClaimCase | CreateClaim | system-user       | C    |
| MoneyClaimCase | CreateClaim | caseworker-cmc    | R    |
| MoneyClaimCase | CreateClaim | citizen           | R    |
```

---

## Access Profile Naming

An access profile is a named string stored in the `role` table (`AccessProfileEntity`, discriminator `USERROLE` at `AccessProfileEntity.java:28`). The `role_id` FK on every `*_acl` row points here -- **not** to a raw IDAM role string.

### Conventions

Access profile names follow a kebab-case convention reflecting jurisdiction and role type:

```
<jurisdiction>-<service>-<role-type>
```

Examples:

| Access profile name               | Typical usage |
|-----------------------------------|---------------|
| `caseworker`                      | Any HMCTS caseworker |
| `caseworker-divorce`              | Divorce jurisdiction caseworker |
| `caseworker-divorce-solicitor`    | Solicitor acting in a divorce case |
| `caseworker-divorce-judge`        | Judge in divorce jurisdiction |
| `citizen`                         | Self-represented party |

Access profile names must be declared in the definition before any `Authorisation*` sheet can reference them. If an `AuthorisationParser` call to `ParseContext.getAccessProfile()` finds no match, the missing name is accumulated and reported as a validation error at import time (`AuthorisationParser.java:22-35`).

---

## RoleToAccessProfiles -- IDAM Bridge

IDAM JWT tokens carry IDAM role strings (e.g. `caseworker-divorce-solicitor`). These are not used directly in `*_acl` tables. The `RoleToAccessProfiles` sheet (-> `role_to_access_profiles` table) maps each IDAM role to one or more named access profiles.

| Column               | Purpose |
|----------------------|---------|
| `RoleName`           | IDAM role string from the JWT |
| `AccessProfiles`     | Comma-separated list of access profile names to grant |
| `Authorisation`      | Optional condition expression evaluated at runtime |
| `ReadOnly`           | When true, restricts the granted profiles to read-only |
| `Disabled`           | Excludes this mapping from resolution |
| `CaseAccessCategories` | Filters mapping to specific case access categories |

`RoleToAccessProfilesEntity` fields: `roleName`, `accessProfiles`, `authorisation`, `readOnly`, `disabled`, `caseAccessCategories` (`RoleToAccessProfilesEntity.java:35-51`).

### ReadOnly behaviour

When a `RoleToAccessProfiles` mapping has `ReadOnly=Y`, or when the Role Assignment from AM carries a `readOnly` characteristic, the resulting access profile is restricted to `R` only -- regardless of what CRUD the Authorisation sheets declare for that profile (`AccessProfile.readOnly`, enforced in data-store at mapping time).

<!-- CONFLUENCE-ONLY: not verified in source -->

This means shuttering a case type by setting CRUD to `"D"` will not fully work for `readOnly=true` roles -- they will still have `R` access.

### Fake role-name-to-access-profile mappings

For services that have not adopted organisational Role Assignment based access control, data-store auto-generates "fake" mappings at the start of every access-control evaluation (`CaseAccessService`, `Access Control` spec):

1. For each `<case_role>` in the CaseRoles definition (plus `[CREATOR]` if not already present): `RoleName=<case_role>`, `AccessProfiles=<case_role>`
2. For each `<user_role>` referenced in any configuration tab that is not a CaseRole: `RoleName=idam:<user_role>`, `AccessProfiles=<user_role>`

---

## Complex-Field ACL Inheritance Rules

`complex_field_acl` rows carry a `list_element_code` dot-path (e.g. `applicant.address.postCode`) targeting a sub-field within a complex type.

Rules enforced by `CaseFieldEntityComplexFieldACLValidatorImpl`:

1. A `complex_field_acl` row requires a parent `case_field_acl` row for the same access profile on the same top-level field (`CaseFieldEntityComplexFieldACLValidatorImpl.java:96-111`).
2. Every intermediate path segment must also have an explicit ACL row (e.g. `applicant.address` must exist if `applicant.address.postCode` is declared).
3. A child path cannot have **higher** access than its parent for the same profile -- checked via `Authorisation.hasLowerAccessThan()` (`Authorisation.java:154-172`, `CaseFieldEntityComplexFieldACLValidatorImpl.java:127-150`).
4. Predefined complex types (e.g. `Address`, `OrderSummary`) cannot have `complex_field_acl` rows at all (`CaseFieldEntityComplexFieldACLValidatorImpl.java:38-49`).

<!-- CONFLUENCE-ONLY: not verified in source -->

**Omission equals hidden**: If you omit any element of a ComplexType from `AuthorisationComplexType`, it has no effective permissions and will be hidden from the user.

**Inheritance propagation**: Parent-level CRUD propagates to child fields. If you have multiple levels of children and stop defining ACL at a certain level, children below that level inherit from the last explicitly defined level.

---

## Precedence When Multiple Roles Match

Data-store resolves permissions using **union** (OR) semantics across all access profiles that apply to a user. The core logic in `AccessControlService.hasAccessControlList()` (`AccessControlService.java:614-622`):

```java
static boolean hasAccessControlList(Set<AccessProfile> accessProfiles,
                                    List<AccessControlList> accessControlLists,
                                    Predicate<AccessControlList> criteria) {
    Set<String> accessProfileNames = extractAccessProfileNames(accessProfiles);
    return accessControlLists != null && accessControlLists
        .stream()
        .filter(acls -> accessProfileNames.contains(acls.getAccessProfile()))
        .anyMatch(criteria);
}
```

This means:

- A field is visible if **any** matching access profile has `read = true` on that field's ACL row.
- An event is triggerable if **any** matching profile has `create = true` on the `event_acl` row.
- A case state is accessible if **any** matching profile has `read = true` on the `state_acl` row.

### EXCLUDED grant type

When the Role Assignment Service returns a role with grant type `EXCLUDED` for a user on a specific case, data-store removes all role assignments except those with `BASIC` or `SPECIFIC` grant types. This effectively blocks access for that user to that case even if their organisational roles would normally grant it.

---

## Access Control Evaluation Order

The data-store's three-layer composition pattern (`CCD Access Control LLD`):

| Layer | Component | Responsibility |
|-------|-----------|---------------|
| 1 (outer) | `AuthorisedOperation` | Delegates to `CaseAccessService` (case-level access) and `AccessControlService` (CRUD checks) |
| 2 | `ClassifiedOperation` | Applies security classification filtering (PUBLIC / PRIVATE / RESTRICTED) |
| 3 (inner) | `DefaultOperation` | Business logic -- actual data read/write with no access control |

Execution flows inward: `AuthorisedOperation` calls `ClassifiedOperation`, which calls `DefaultOperation`. Results flow outward with filtering applied at each layer.

### Case-level access (CaseAccessService)

Before CRUD is evaluated, the data-store determines whether the user has case-level access at all (`CaseAccessService.java:52-54`):

```
RESTRICT_GRANTED_ROLES_PATTERN =
  .+-solicitor$|.+-panelmember$|^citizen(-.\\*)?$|^letter-holder$|^caseworker-.+-localAuthority$
```

- Roles matching this pattern get `AccessLevel.GRANTED` -- they need an explicit entry in the `case_users` table (or a SPECIFIC/CASE role assignment from AM) to access any case.
- All other roles get `AccessLevel.ALL` -- they can access any case (subject to CRUD and classification).

On case creation, if the creating user matches `RESTRICT_GRANTED_ROLES_PATTERN`, they are assigned a `[CREATOR]` case role with a role category derived from their IDAM role:

| IDAM role pattern | Role category |
|-------------------|---------------|
| `.+-solicitor$` or `^caseworker-.+-localAuthority$` | `PROFESSIONAL` |
| `^citizen(-.\\*)?$` or `^letter-holder$` | `CITIZEN` |
| `.+-panelmember$` | `JUDICIAL` |
| No match | `LEGAL_OPERATIONS` |

---

## Role Assignment Filtering

Before mapping to access profiles, data-store filters Role Assignments from AM. A role assignment is excluded if:

- `beginTime` is in the future
- `endTime` is in the past
- `classification` is lower than the case/case-type classification
- `jurisdiction` attribute doesn't match the case's jurisdiction
- `caseType` attribute doesn't match the case's type
- `caseId` attribute doesn't match the case reference (for read/update/delete operations)
- `caseAccessGroupId` attribute isn't included in the case's `CaseAccessGroups` field
- `region` attribute doesn't match `caseManagementLocation.region`
- `location` attribute doesn't match `caseManagementLocation.baseLocation`

After filtering, if any remaining role assignment has an `EXCLUDED` grant type, all assignments other than `BASIC` and `SPECIFIC` are removed.

### CaseAccessCategories matching

If the `RoleToAccessProfiles` mapping includes `CaseAccessCategories`, the case's `CaseAccessCategory` field must **start with** one of the listed category values for the mapping to apply. This enables hierarchical category-based access (e.g. category `Civil/Standard` matches a mapping for `Civil`).

---

## Time-Bounded ACL Grants

Every `*_acl` row carries `live_from` and `live_to` date columns inherited from `Authorisation`. These allow temporary or future-dated grants without re-importing the definition. Enforcement is at data-store query time, not definition-store.

---

## Access Metadata (ExUI)

Data-store returns two transient metadata fields in internal V2 API responses for ExUI to display access status:

| Field | Values | Purpose |
|-------|--------|---------|
| `[ACCESS_GRANTED]` | CSV of grant types (e.g. `"STANDARD,SPECIFIC"`) | Shows which grants passed filtering |
| `[ACCESS_PROCESS]` | `"NONE"`, `"CHALLENGED"`, or `"SPECIFIC"` | Indicates what process the user should follow to gain access |

<!-- CONFLUENCE-ONLY: not verified in source -->

`access_process` logic:
- `NONE`: A STANDARD, SPECIFIC, or CHALLENGED role assignment fully passed filtering -- user has access.
- `CHALLENGED`: A STANDARD role passed all checks except region/location -- user can request challenged access.
- `SPECIFIC`: No sufficient role passed -- user must request specific access through the AM workflow.

---

## JSON Response Shape

Definition-store surfaces ACL data in the `/api/data/case-type/{id}` response. Each entity's `acls` field is a `List<AccessControlList>`:

```json
{
  "role": "caseworker-divorce-solicitor",
  "create": true,
  "read": true,
  "update": true,
  "delete": false
}
```

`ComplexACL` additionally carries `"listElementCode": "applicant.address.postCode"`.

`AccessControlList` model fields: `role String`, `create Boolean`, `read Boolean`, `update Boolean`, `delete Boolean` (`AccessControlList.java:5-9`).

---

## Example

```json
// apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseField.json
[ {
  "LiveFrom" : "1/1/17",
  "LiveTo" : "",
  "CaseTypeID" : "AAT",
  "CaseFieldID" : "TextField",
  "UserRole" : "caseworker-autotest1",
  "CRUD" : "CRU"
}, {
  "LiveFrom" : "1/1/17",
  "LiveTo" : "",
  "CaseTypeID" : "AAT",
  "CaseFieldID" : "NumberField",
  "UserRole" : "caseworker-autotest1",
  "CRUD" : "CRU"
}, {
  "LiveFrom" : "1/1/17",
  "LiveTo" : "",
  "CaseTypeID" : "AAT",
  "CaseFieldID" : "YesOrNoField",
  "UserRole" : "caseworker-autotest1",
  "CRUD" : "CRU"
} ]
```

<!-- source: apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseField.json:1-22 -->

## See also

- [Permissions](../explanation/permissions.md) -- conceptual explanation of CCD's RBAC model
- [Add permissions](../how-to/add-permissions.md) -- how to grant CRUD access to roles in your definition
- [Glossary](glossary.md) -- definitions of access profile, CRUD, ACL

## Glossary

See [Glossary](glossary.md) for term definitions used in this page.

