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
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/AuthorisationParser.java
  - ccd-definition-store-api:domain/src/main/java/uk/gov/hmcts/ccd/definition/store/domain/validation/authorization/CrudValidator.java
  - ccd-definition-store-api:domain/src/main/java/uk/gov/hmcts/ccd/definition/store/domain/validation/casefield/CaseFieldEntityComplexFieldACLValidatorImpl.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/HasRole.java
  - nfdiv-case-api:apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/UserRole.java
  - nfdiv-case-api:apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/Permissions.java
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/CaseworkerAccess.java
examples_extracted_from:
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/CaseworkerAccess.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# CCD Permissions

## TL;DR

- CCD permissions are CRUD grants on four scopes: case type, event, state, and field — defined in the case-type definition spreadsheet or via the config-generator SDK.
- Each grant maps an **access profile** name (a string like `caseworker-divorce` or `[APPONESOLICITOR]`) to a subset of `C`, `R`, `U`, `D` characters.
- The four Authorisation sheets are `AuthorisationCaseType`, `AuthorisationCaseEvent`, `AuthorisationCaseState`, and `AuthorisationCaseField`; a fifth sheet `AuthorisationComplexType` handles nested fields.
- Access profiles are **not** IDAM roles directly — the `RoleToAccessProfiles` sheet maps IDAM JWT roles to named access profiles at runtime.
- Definition-store stores and validates the grants; `ccd-data-store-api` enforces them at case create/read/update/delete time.
- This page covers **definition-time** permissions. Role Assignment / AM (runtime case-level grants) is a separate mechanism.

---

## Overview

Every CCD case type carries a permission matrix that answers the question: *which principals can do what, on which part of a case?* The matrix is expressed as ACL rows in the case-type definition, stored in five database tables, and served to `ccd-data-store-api` as part of the case-type metadata response.

Permissions are purely **additive** — there is no deny rule. A principal receives the union of all grants that match any of its current access profiles.

---

## The Five ACL Scopes

| Spreadsheet sheet | DB table | Controls |
|---|---|---|
| `AuthorisationCaseType` | `case_type_acl` | Whether the role can see or create cases of this type at all |
| `AuthorisationCaseEvent` | `event_acl` | Whether the role can trigger a specific event |
| `AuthorisationCaseState` | `state_acl` | Whether the role can see cases in a specific state |
| `AuthorisationCaseField` | `case_field_acl` | Whether the role can read/write a top-level case field |
| `AuthorisationComplexType` | `complex_field_acl` | Whether the role can read/write a nested field within a complex type |

All five tables share the same four boolean columns — `create`, `read`, `update`, `delete` — and a `role_id` FK pointing to the `AccessProfileEntity` in the `role` table.
(`Authorisation.java:31–46`, `V0001__Base_version.sql:119–130`, `501–512`, `1053–1064`, `194–205`)

---

## CRUD String Format

In the spreadsheet, the `CRUD` column holds a string composed of the letters `C`, `R`, `U`, `D` in any order and any case. Examples: `"CRUD"`, `"CRU"`, `"R"`.

`AuthorisationParser.parseCrud()` uppercases the string and maps the presence of each character to its corresponding boolean column (`AuthorisationParser.java:37–46`). Import-time validation rejects any string that does not match `^[CRUDcrud\s]{1,5}$` (`CrudValidator.java:12–17`).

---

## Access Profiles vs IDAM Roles

The `AccessProfile` column in all Authorisation sheets holds an **access profile name**, not an IDAM role name directly. Examples:

| Access profile name | Type | Meaning |
|---|---|---|
| `caseworker-divorce` | IDAM role (direct mapping) | Any user holding this IDAM role |
| `caseworker-divorce-solicitor` | IDAM role (direct mapping) | Solicitors in the divorce jurisdiction |
| `citizen` | IDAM role (direct mapping) | Self-represented applicants |
| `[APPONESOLICITOR]` | CCD case role (in brackets) | Solicitor assigned to applicant one on this specific case |
| `[APPTWOSOLICITOR]` | CCD case role (in brackets) | Solicitor assigned to applicant two on this specific case |

The mapping from IDAM JWT roles to access profile names is declared in the `RoleToAccessProfiles` sheet. `RoleToAccessProfilesEntity` carries the fields `roleName`, `accessProfiles`, `authorisation`, `readOnly`, `disabled`, and `caseAccessCategories` (`RoleToAccessProfilesEntity.java:35–51`).

**Important**: the `role_id` FK in all `*_acl` tables points to `AccessProfileEntity` (stored in the `role` table), not to an IDAM role string. The string `reference` column on `AccessProfileEntity` holds the access profile name (`AccessProfileEntity.java:35`).

### Common role name patterns

| Pattern | Example | Who it identifies |
|---|---|---|
| `caseworker-<jurisdiction>` | `caseworker-divorce` | Caseworkers in a jurisdiction |
| `caseworker-<jurisdiction>-<team>` | `caseworker-divorce-solicitor` | Solicitors within a jurisdiction |
| `citizen` | `citizen` | Self-represented users authenticated via GOV.UK |
| `[<CASE_ROLE>]` | `[APPONESOLICITOR]` | Dynamic per-case role assigned via ACA/NoC; always in brackets |

---

## AuthorisationCaseField in Detail

Required columns: `CaseTypeID`, `CaseFieldID`, `AccessProfile`, `CRUD` (`ColumnName.java:203–208`).

DB schema: `case_field_acl(id, case_field_id, create bool, read bool, update bool, delete bool, live_from, live_to, created_at, role_id)` (`V0001__Base_version.sql:119–130`).

Semantics of each bit on a field:

| Bit | Meaning |
|---|---|
| `C` | Role may set this field's value when creating a case |
| `R` | Role may read this field's value |
| `U` | Role may update this field's value on an existing case |
| `D` | Role may delete (clear) this field's value |

If a field has no ACL row for the caller's access profile, the caller cannot see or write the field.

### AuthorisationComplexType (nested fields)

The `AuthorisationComplexType` sheet adds `list_element_code varchar(1000)` — a dot-notation path to the sub-field, e.g. `applicant.address.postCode` (`V0001__Base_version.sql:307–319`).

Two additional constraints enforced at import time (`CaseFieldEntityComplexFieldACLValidatorImpl.java`):

1. A nested path cannot have **higher** access than its parent for the same access profile (`hasLowerAccessThan()`, `Authorisation.java:154–172`).
2. Every intermediate path segment must also have an explicit ACL row for the same access profile (`CaseFieldEntityComplexFieldACLValidatorImpl.java:96–111`).
3. Predefined system complex types (e.g. `Address`, `OrderSummary`) cannot have `complex_field_acl` rows at all (`CaseFieldEntityComplexFieldACLValidatorImpl.java:38–49`).

---

## Time-bounding Grants

Every `*_acl` row carries `live_from` and `live_to` date columns. Grants outside this range are ignored at query time by `ccd-data-store-api`. This allows temporary access windows to be encoded directly in the definition.

---

## Defining Permissions via the Config-Generator SDK

Teams using the `ccd-config-generator` SDK declare permissions in Java rather than in the spreadsheet. The key abstractions are:

- **`HasRole`** — a role enum the service team implements; each entry carries the IDAM role string and default case-type permission string.
- **`ConfigBuilder.grant(state, permissions, roles...)`** — state-level permission (`ConfigBuilder.java:39`).
- **`EventBuilder.grant(permissions, roles...)`** — event-level permission (`Event.java:160`).
- **`@CCD(access = {SomeAccess.class})`** — field-level permission declared as an annotation on the case-data class field.

### NFD example: `UserRole` enum

The No Fault Divorce service defines its roles as an enum:

```java
// apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/UserRole.java
public enum UserRole implements HasRole {
    APPLICANT_1_SOLICITOR("[APPONESOLICITOR]", "CRU"),
    APPLICANT_2_SOLICITOR("[APPTWOSOLICITOR]", "CRU"),
    APPLICANT_2("[APPLICANTTWO]", "CRU"),
    ORGANISATION_CASE_ACCESS_ADMINISTRATOR("caseworker-caa", "CRU");
    // ...
}
```

Each entry's second argument is the default CRUD string for `AuthorisationCaseType`.

### NFD example: field-level access class

```java
// apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/AosAccess.java
public class AosAccess implements HasAccessControl {
    @Override
    public SetMultimap<HasRole, Permission> getGrants() {
        SetMultimap<HasRole, Permission> grants = HashMultimap.create();
        grants.putAll(CASE_WORKER, Permissions.CREATE_READ_UPDATE);
        grants.putAll(SOLICITOR, Permissions.READ);
        return grants;
    }
}
```

Access classes are referenced via `@CCD(access = {AosAccess.class})` on `CaseData` fields.

---

## Enforcement Model

Definition-store holds and validates the ACL metadata, but does **not** enforce it at runtime. Enforcement happens in `ccd-data-store-api`, which:

1. Reads the case-type definition (including all `acls` arrays) from definition-store's `/api/data/case-type/{id}` response.
2. Resolves the caller's access profiles from their IDAM JWT and the `RoleToAccessProfiles` mapping.
3. Filters case fields, events, and states to only those where the resolved profiles have the required CRUD bits.

This means a definition-store import succeeding does not guarantee any runtime access — the data-store enforcement layer applies independently.

---

## This is Not Role Assignment (RAM)

CCD definition-time permissions answer: "a user holding access profile X can do Y on field/event/state Z of case type T."

**Role Assignment / Access Management (AM/RAM)** answers: "user U is assigned access profile X on case C." That is a runtime, per-case grant managed by the Role Assignment Service, not by the case-type definition. See the Role Assignment explanation page for details.

The two layers compose: a user must have both the definition-time permission (encoded in the Authorisation sheets) **and** a matching role assignment (from RAM) to perform an action on a specific case.

---

## Example

```java
// from libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/CaseworkerAccess.java
public class CaseworkerAccess implements HasAccessControl {

    @Override
    public SetMultimap<HasRole, Permission> getGrants() {
        SetMultimap<HasRole, Permission> grants = HashMultimap.create();
        grants.putAll(CITIZEN, Permissions.READ);
        grants.putAll(SOLICITOR, Permissions.READ);
        grants.putAll(SUPER_USER, Permissions.READ);

        grants.putAll(CASE_WORKER, Permissions.CREATE_READ_UPDATE);
        grants.putAll(LEGAL_ADVISOR, Permissions.CREATE_READ_UPDATE);
        grants.putAll(JUDGE, Permissions.CREATE_READ_UPDATE);
        grants.putAll(SYSTEMUPDATE, Permissions.CREATE_READ_UPDATE_DELETE);
        return grants;
    }
}
```

<!-- source: libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/CaseworkerAccess.java:17-32 -->

## See also

- [Role assignment](role-assignment.md) — runtime per-case grants that compose with definition-time CRUD ACLs
- [Add permissions](../how-to/add-permissions.md) — how to add or adjust CRUD grants for an access profile
- [Permissions matrix reference](../reference/permissions-matrix.md) — full reference of scopes, columns, and enforcement rules

## Glossary

| Term | Definition |
|---|---|
| Access profile | A string name (e.g. `caseworker-divorce`) used in `*_acl` tables; may be an IDAM role name or a CCD case role like `[APPONESOLICITOR]` |
| CRUD string | A 1–4 character string (`C`, `R`, `U`, `D` in any order) encoding which operations are permitted |
| Case role | A dynamic per-case access profile whose name is enclosed in brackets (e.g. `[APPONESOLICITOR]`); assigned via ACA/NoC |
| `RoleToAccessProfiles` | Definition sheet mapping IDAM JWT role names to the access profile names used in the ACL tables |
| ACL scope | One of the five granularity levels at which CRUD grants can be set: case type, event, state, field, complex sub-field |
