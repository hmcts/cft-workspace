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
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseField.json
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Permissions Matrix

## TL;DR

- CCD permissions are defined as CRUD booleans per access-profile on five distinct scopes: case type, event, state, case field, and complex (nested) field.
- The spreadsheet `CRUD` column holds a string like `"CRUD"` or `"R"` — each character maps to a boolean column in the corresponding `*_acl` DB table.
- Access profiles are named strings (e.g. `caseworker-divorce-solicitor`) resolved via the `role` table; IDAM JWT roles are bridged to access-profile names through the `RoleToAccessProfiles` sheet.
- A child complex-field ACL can never grant more access than its parent field's ACL for the same access profile.
- Definition-store stores ACL metadata only; runtime enforcement is done by `ccd-data-store-api`.

---

## CRUD Bits

Each Authorisation sheet row carries a `CRUD` column whose characters map directly to four boolean DB columns. `AuthorisationParser.parseCrud()` uppercases the string and tests for the presence of each character (`AuthorisationParser.java:37–46`). `CrudValidator` enforces the string matches `^[CRUDcrud\s]{1,5}$` (`CrudValidator.java:12–17`).

| Character | DB column | Meaning on a case type | Meaning on an event | Meaning on a state | Meaning on a field |
|-----------|-----------|----------------------|--------------------|--------------------|-------------------|
| `C`       | `create`  | Role can initiate a new case | Role can trigger this event | — (unused) | Role can supply a value for this field during creation |
| `R`       | `read`    | Role can retrieve the case | Role can see the event in history | Role can see cases in this state | Role can see this field's value |
| `U`       | `update`  | Role can update case data | — (unused) | — (unused) | Role can change this field's value |
| `D`       | `delete`  | Role can delete the case | — (unused) | — (unused) | Role can clear/remove this field's value |

> `create` is a reserved SQL keyword; the DDL quotes it as `"create"` (`V0001__Base_version.sql:122`, `Authorisation.java:31`).

Valid CRUD string examples: `"CRUD"`, `"CR"`, `"R"`, `"CRU"`. Characters are case-insensitive; whitespace is tolerated. An empty or null string fails `CrudValidator`.

---

## ACL Scopes

Five separate `*_acl` tables each cover a different scope. All share the `Authorisation` `@MappedSuperclass` with the same four boolean columns plus `role_id` FK and `live_from`/`live_to` date bounds.

| Spreadsheet sheet          | DB table             | Scope                                     | Extra column |
|----------------------------|----------------------|-------------------------------------------|--------------|
| `AuthorisationCaseType`    | `case_type_acl`      | Whole case type                           | —            |
| `AuthorisationCaseEvent`   | `event_acl`          | Individual event trigger                  | —            |
| `AuthorisationCaseState`   | `state_acl`          | Individual case state                     | —            |
| `AuthorisationCaseField`   | `case_field_acl`     | Top-level case field                      | —            |
| `AuthorisationComplexType` | `complex_field_acl`  | Nested sub-field within a complex type    | `list_element_code varchar(1000)` — dot-path to sub-field |

Required columns on every Authorisation sheet: `CaseTypeID`, the scope identifier (e.g. `CaseFieldID`, `CaseEventID`), `AccessProfile`, `CRUD` (`ColumnName.java:203–208`).

---

## Access Profile Naming

An access profile is a named string stored in the `role` table (`AccessProfileEntity`, discriminator `USERROLE` at `AccessProfileEntity.java:28`). The `role_id` FK on every `*_acl` row points here — **not** to a raw IDAM role string.

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

Access profile names must be declared in the definition before any `Authorisation*` sheet can reference them. If an `AuthorisationParser` call to `ParseContext.getAccessProfile()` finds no match, the missing name is accumulated and reported as a validation error at import time (`AuthorisationParser.java:22–35`).

---

## RoleToAccessProfiles — IDAM Bridge

IDAM JWT tokens carry IDAM role strings (e.g. `caseworker-divorce-solicitor`). These are not used directly in `*_acl` tables. The `RoleToAccessProfiles` sheet (→ `role_to_access_profiles` table) maps each IDAM role to one or more named access profiles.

| Column               | Purpose |
|----------------------|---------|
| `RoleName`           | IDAM role string from the JWT |
| `AccessProfiles`     | Comma-separated list of access profile names to grant |
| `Authorisation`      | Optional condition expression evaluated at runtime |
| `ReadOnly`           | When true, restricts the granted profiles to read-only |
| `Disabled`           | Excludes this mapping from resolution |
| `CaseAccessCategories` | Filters mapping to specific case access categories |

`RoleToAccessProfilesEntity` fields: `roleName`, `accessProfiles`, `authorisation`, `readOnly`, `disabled`, `caseAccessCategories` (`RoleToAccessProfilesEntity.java:35–51`).

At runtime, `ccd-data-store-api` expands the caller's IDAM roles through this table to determine which access profiles apply, then intersects those profiles against the relevant `*_acl` rows.

---

## Complex-Field ACL Inheritance Rules

`complex_field_acl` rows carry a `list_element_code` dot-path (e.g. `applicant.address.postCode`) targeting a sub-field within a complex type.

Rules enforced by `CaseFieldEntityComplexFieldACLValidatorImpl`:

1. A `complex_field_acl` row requires a parent `case_field_acl` row for the same access profile on the same top-level field (`CaseFieldEntityComplexFieldACLValidatorImpl.java:96–111`).
2. Every intermediate path segment must also have an explicit ACL row (e.g. `applicant.address` must exist if `applicant.address.postCode` is declared).
3. A child path cannot have **higher** access than its parent for the same profile — checked via `Authorisation.hasLowerAccessThan()` (`Authorisation.java:154–172`, `CaseFieldEntityComplexFieldACLValidatorImpl.java:127–150`).
4. Predefined complex types (e.g. `Address`, `OrderSummary`) cannot have `complex_field_acl` rows at all (`CaseFieldEntityComplexFieldACLValidatorImpl.java:38–49`).

---

## Precedence When Multiple Roles Match

Definition-store stores ACL rows independently per access profile — there is no merging logic in definition-store itself. Precedence and union/intersection logic is applied at runtime by `ccd-data-store-api`:

- A caller whose IDAM roles map to **multiple** access profiles receives the **union** of all permissions those profiles carry.
- A field is visible if **any** matching access profile has `read = true` on that field's `case_field_acl` row.
- An event is triggerable if **any** matching profile has `create = true` on the `event_acl` row.
- `live_from` / `live_to` on individual ACL rows time-bound those grants; expired rows are excluded at query time by data-store.

<!-- TODO: research note insufficient for exact data-store union/precedence algorithm — confirm against ccd-data-store-api sources -->

---

## Time-Bounded ACL Grants

Every `*_acl` row carries `live_from` and `live_to` date columns inherited from `Authorisation`. These allow temporary or future-dated grants without re-importing the definition. Enforcement is at data-store query time, not definition-store.

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

`AccessControlList` model fields: `role String`, `create Boolean`, `read Boolean`, `update Boolean`, `delete Boolean` (`AccessControlList.java:5–9`).

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

- [Permissions](../explanation/permissions.md) — conceptual explanation of CCD's RBAC model
- [Add permissions](../how-to/add-permissions.md) — how to grant CRUD access to roles in your definition
- [Glossary](glossary.md) — definitions of access profile, CRUD, ACL

## Glossary

| Term | Definition |
|------|-----------|
| **Access profile** | A named string stored in the `role` table that groups permissions; referenced by all `*_acl` rows. Not the same as an IDAM role. |
| **CRUD string** | A 1–5 character string (`C`, `R`, `U`, `D` in any combination) in the `CRUD` spreadsheet column, parsed to four boolean columns. |
| **ACL scope** | One of five levels at which CRUD permissions are defined: case type, event, state, field, or complex sub-field. |
| **`list_element_code`** | Dot-notation path (e.g. `applicant.address.postCode`) identifying a nested sub-field within a complex type for `complex_field_acl` rows. |
