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
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1285226654"
    title: "Access Control"
    space: "RCCD"
  - id: "207804327"
    title: "CCD Definition Glossary for Setting up a Service in CCD"
    space: "RCCD"
  - id: "1343292362"
    title: "CRUD Basics"
    space: "RCCD"
  - id: "1134527861"
    title: "CRUD on Complex Types"
    space: "RCCD"
  - id: "1254261627"
    title: "CRUD on Collections"
    space: "RCCD"
  - id: "1235783068"
    title: "Case Roles"
    space: "RCCD"
---

# CCD Permissions

## TL;DR

- CCD permissions are CRUD grants on five scopes: case type, event, state, field, and complex sub-field — defined in the case-type definition spreadsheet (or via the config-generator SDK), validated at import, enforced at runtime by `ccd-data-store-api`.
- Each grant maps an **access profile** name (e.g. `caseworker-divorce` or a case-role like `[APPONESOLICITOR]`) to a subset of `C`, `R`, `U`, `D` characters; permissions are purely additive across all matching profiles.
- CRUD letters mean different things per scope: `U` on `AuthorisationCaseEvent` is a no-op, `C` on `AuthorisationCaseState` means "this state may be a final state of a create", and `D` is only enforced at the field-level for collection/complex children.
- Access profiles are **not** IDAM roles directly — the `RoleToAccessProfiles` sheet maps role-assignment role names (or, via a legacy `idam:<role>` bridge, IDAM JWT roles) to access-profile names; `Authorisation`, `ReadOnly`, and `CaseAccessCategories` columns further filter the mapping.
- Per source `ColumnName.java:9`, the canonical column is `AccessProfile`; the Confluence Glossary still calls it `UserRole` (accepted as a legacy alias).
- This page covers **definition-time** permissions. Role Assignment / AM (runtime per-case grants, exclusions, regions, locations) is covered in [Role Assignment](role-assignment.md).

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

`AuthorisationParser.parseCrud()` uppercases the string and maps the presence of each character to its corresponding boolean column (`AuthorisationParser.java:37–46`). Import-time validation rejects any string that does not match `^[CRUDcrud\s]{1,5}$` (`CrudValidator.java:12–17`). The regex permits embedded whitespace and a length of 1–5 characters; out-of-range strings (e.g. `""`, `"CRUDX"`) are rejected.

### What each bit means per scope

CRUD letters mean different things on different scopes. Most subtle case is `U` on events — it has no effect.

| Scope | C | R | U | D |
|---|---|---|---|---|
| `AuthorisationCaseType` | Create cases of this type | Read cases of this type | Modify cases of this type | Not enforced for whole-case delete <!-- CONFLUENCE-ONLY: "D is not yet implemented" at case-type scope per Glossary; verified in source — `CAN_DELETE` is only checked by `CompoundAccessControlService` for compound/collection field-level deletes, not for whole-case deletes --> |
| `AuthorisationCaseEvent` | Trigger the event | Read the event in the audit history log | **No effect** | Not implemented |
| `AuthorisationCaseState` | Allow this state to be the *final* state of a create | Read cases in this state | Modify cases in this state | Not implemented |
| `AuthorisationCaseField` | Set the field's value at create-time | Read the field | Modify the field on an existing case | Clear the field's value (only enforced for collection/complex children — see below) |
| `AuthorisationComplexType` | Create the sub-field | Read the sub-field | Modify the sub-field | Remove a child / collection item (`CompoundAccessControlService:115,188`) |

Two surprising specifics confirmed by the Confluence Glossary:

- **`U` on `AuthorisationCaseEvent` is meaningless** — the event is either triggerable (`C`) or just visible in audit history (`R`). Setting `U` does nothing.
- **`C` on `AuthorisationCaseState`** is interpreted as: this state may be set as the *final* state of a create (i.e. a case may end up in this state on creation), not "create cases" generically.

`D` is parsed and persisted into a `delete` boolean on every `*_acl` row, but at runtime only `CompoundAccessControlService` checks `CAN_DELETE`, and only for collection-item / complex-child removal. There is no whole-record delete enforcement on `case_type_acl`, `event_acl`, or `state_acl`.

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

The mapping from IDAM JWT roles (or, more correctly, from Role-Assignment role names) to access profile names is declared in the `RoleToAccessProfiles` sheet. `RoleToAccessProfilesEntity` carries the fields `roleName`, `accessProfiles`, `authorisation`, `readOnly`, `disabled`, and `caseAccessCategories` (`RoleToAccessProfilesEntity.java:35–51`).

| Column | Purpose | Notes |
|---|---|---|
| `RoleName` | Role name as returned by Role Assignment Service | Required |
| `AccessProfiles` | Comma-separated list of AccessProfile names to assign if the row matches | At least one required; each profile must be pre-registered as a user-role in definition store |
| `Authorisation` | Comma-separated authorisation identifiers | Optional; if present, the user's role assignment must include at least one of them for the mapping to apply |
| `ReadOnly` | Filters by the role assignment's `readonly` flag | Truthy values: T, True, Y, Yes; falsy: NULL, N, No, F, False. If the mapping's ReadOnly is set, the resulting AccessProfile is treated as READONLY (CRUD is constrained to R only) |
| `CaseAccessCategories` | Comma-separated case-access-category prefixes | Optional, max 1000 chars. For the mapping to apply, the case's `CaseAccessCategory` field must **start with** one of the listed prefixes |
| `Disabled` | Disables the row | Truthy: T, True, Y, Yes — the mapping is not applied |

<!-- CONFLUENCE-ONLY: ReadOnly truthy-value table and CaseAccessCategories prefix matching not directly verified line-by-line in source for this pass; Glossary is canonical reference. -->

**Important**: the `role_id` FK in all `*_acl` tables points to `AccessProfileEntity` (stored in the `role` table), not to an IDAM role string. The string `reference` column on `AccessProfileEntity` holds the access profile name (`AccessProfileEntity.java:35`).

### Legacy IDAM-as-AccessProfile bridge

Some services still rely on IDAM roles as AccessProfile names directly. To support them, `ccd-data-store-api` synthesises "fake" `RoleToAccessProfiles` entries at runtime — for every IDAM role on the user's JWT it adds an implicit mapping `RoleName=idam:<user_role>` → `AccessProfiles=<user_role>`. Equivalent fake mappings are also generated for every `[CASE_ROLE]` declared in the `CaseRoles` sheet. This means a case-type can use `caseworker-divorce` directly as an access-profile string in `AuthorisationCaseType` without an explicit `RoleToAccessProfiles` row, and it still resolves at runtime — although new services should prefer explicit `RoleToAccessProfiles` rows.

The data-store also uses a regex to identify users that need a *case role* on a specific case to access it (i.e. they don't get organisational/jurisdictional access by default):

```
.+-solicitor$|^caseworker-.+-localAuthority$|^citizen(-.*)?$|^letter-holder$|.+-panelmember$
```

Users whose IDAM roles match this regex are implicitly assigned a `[CREATOR]` Case Role on cases they create, with a derived `roleCategory` based on which branch of the regex matched: solicitor / localAuthority → `PROFESSIONAL`; citizen / letter-holder → `CITIZEN`; panelmember → `JUDICIAL`; otherwise `LEGAL_OPERATIONS`.

<!-- CONFLUENCE-ONLY: idam: prefix and CREATOR auto-assignment regex not verified in source on this pass; documented in the canonical Access Control Confluence page (id 1285226654). -->

### Spreadsheet column name caveat

The Confluence Glossary still calls the access-profile column `UserRole` in the four Authorisation tabs. The canonical name is `AccessProfile`; importer source `ColumnName.java:9` declares `ACCESS_PROFILE("AccessProfile", new String[]{"UserRole"})` — so `UserRole` is accepted as a legacy alias but new spreadsheets should use `AccessProfile`.

<!-- DIVERGENCE: Confluence Glossary (id 207804327) labels the column "UserRole" in AuthorisationCaseType / AuthorisationCaseField / AuthorisationCaseEvent / AuthorisationCaseState / AuthorisationComplexType. Source `ColumnName.java:9` shows `AccessProfile` is canonical with `UserRole` as a legacy alias. Source wins. -->

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

### CRUD on collection fields

When the `CaseFieldID` refers to a collection field (top-level), the bits apply to **collection items**, not the collection container itself:

| Bit | Behaviour | UI |
|---|---|---|
| `C` | User may **add** items to the collection | "Add" button greyed out without `C` |
| `R` | User can see existing items | If only `R` is set, items render read-only |
| `U` | User can edit elements within items | User must also have `R` to see items to update them |
| `D` | User can **remove** items | "Remove" button greyed out without `D`; user must also have `R` |

Two important details:

- **Collection-level CRUD is only honoured when the top-level field is a collection.** If a collection appears at a deeper nesting level, CRUD applies to the *top-level* field as normal, not to the deep collection's items.
- **`R` must be explicit when granting `U` or `D`** — `R` is not implied. A row of `UD` without `R` prevents the user from seeing the items they would otherwise be allowed to update or delete.

<!-- CONFLUENCE-ONLY: collection-item C/R/U/D semantics and "R must be explicit for U/D" rule documented in CRUD on Collections (id 1254261627); behaviour is enforced via CompoundAccessControlService for compound fields. -->

### AuthorisationComplexType (nested fields)

The `AuthorisationComplexType` sheet adds `list_element_code varchar(1000)` — a dot-notation path to the sub-field, e.g. `applicant.address.postCode` (`V0001__Base_version.sql:307–319`).

Two additional constraints enforced at import time (`CaseFieldEntityComplexFieldACLValidatorImpl.java`):

1. A nested path cannot have **higher** access than its parent for the same access profile (`hasLowerAccessThan()`, `Authorisation.java:154–172`).
2. Every intermediate path segment must also have an explicit ACL row for the same access profile (`CaseFieldEntityComplexFieldACLValidatorImpl.java:96–111`).
3. Predefined system complex types (e.g. `Address`, `OrderSummary`) cannot have `complex_field_acl` rows at all (`CaseFieldEntityComplexFieldACLValidatorImpl.java:38–49`).

**Runtime quirks**:

- **Omitted children are hidden.** If you don't supply a row for an element of a complex type for a given access profile, that element has *no effective permissions* — it is hidden, even if its parent has full CRUD.
- **Parent CRUD propagates to undeclared deeper levels.** If you stop declaring at level N for a deeply nested complex type, the children below level N inherit from the deepest declared level for that access profile.

<!-- CONFLUENCE-ONLY: hide-on-omit and parent-propagation behaviours documented in CRUD on Complex Types (id 1134527861). -->

### Markers in Confluence

The Confluence Glossary marks some access-control areas as "in development" or stale. Notable points to be aware of when reading older Confluence:

- **"AuthorisationState (In development)"** in CRUD Basics is stale — the live sheet name is `AuthorisationCaseState` and is fully implemented (`StateACLEntity.java`).
- **"D (delete) is not yet implemented"** is broadly accurate at case-type, case-event and case-state scopes (no runtime enforcement of whole-record delete via ACL), but **is** enforced at field-level for compound fields (collection-item / complex-child removal) via `CompoundAccessControlService:115,188`.
- The `RoleToAccessProfiles` tab's `Authorisation` and `CaseAccessCategories` filter columns are recent additions; older spreadsheets may not contain them and the importer treats them as optional.

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

Definition-store holds and validates the ACL metadata, but does **not** enforce it at runtime. Enforcement happens in `ccd-data-store-api`, which (per the canonical Confluence Access Control specification):

1. Calls `GET /am/role-assignments/actors/{actorId}` against `am-role-assignment-service` (cached) to retrieve the user's role assignments.
2. Filters the role assignments by case attributes — `jurisdiction`, `casetype`, `caseId`, `caseAccessGroupId`, `region`, `location` (in that order), as well as begin/end times and security classification.
3. Adds synthesised `idam:<role>` pseudo-assignments for any IDAM roles on the JWT that aren't already represented as RAS role assignments — this is the legacy IDAM bridge.
4. If any remaining role assignment is `EXCLUDED`, drops everything except `BASIC` and `SPECIFIC` grants (so an EXCLUSION reliably blocks access).
5. Matches the surviving role assignments against `RoleToAccessProfiles` rows (taking `Authorisation`, `ReadOnly`, `CaseAccessCategories` into account) to produce the user's effective AccessProfiles.
6. Filters case fields, events, and states to only those where the resolved AccessProfiles have the required CRUD bits in the corresponding `*_acl` table. If `READONLY` characteristic is present on the AccessProfile, CRUD is constrained to `R` only.

A definition-store import succeeding does not guarantee any runtime access — the data-store enforcement layer applies independently, and a user must hold a matching role assignment with sufficient classification.

### Access metadata returned to ExUI

For internal V2 endpoints used by ExUI Manage Case, `ccd-data-store-api` attaches transient (not persisted) metadata fields to each case so the UI can drive its access-request flows:

- `[ACCESS_GRANTED]` — CSV of grant types that passed filtering (e.g. `STANDARD,SPECIFIC`).
- `[ACCESS_PROCESS]` — one of `NONE` (user already has access), `CHALLENGED` (a STANDARD role would have matched if region / base location matched the case), or `SPECIFIC` (user must request specific access via case-share/NoC).

For users to ever see `CHALLENGED`, services need a `BASIC` role assignment that returns the case in searches with minimal fields (e.g. case title) — otherwise the case wouldn't appear in the result set at all.

<!-- CONFLUENCE-ONLY: access-metadata fields and CHALLENGED-via-region-mismatch logic per Access Control Confluence page (id 1285226654); not directly grepped in source on this pass. -->

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

See [Glossary](../reference/glossary.md) for term definitions used in this page.

