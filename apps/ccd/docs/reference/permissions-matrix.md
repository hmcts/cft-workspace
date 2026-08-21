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
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/AuthorisationMapper.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/AccessControl.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/AttributeBasedAccessControlService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/PseudoRoleToAccessProfileGenerator.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/RoleAssignmentCategoryService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/DefaultCaseDataAccessControl.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/CaseAccessMetadata.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/user/DefaultUserRepository.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/RoleToAccessProfilesParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/model/DefinitionDataItem.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V20220209_13110__RDM-13110_CaseAccessCategories.sql
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/AccessControlServiceImpl.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/CompoundAccessControlService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/AuthorisedCreateEventOperation.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseFieldDefinition.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcase/AuthorisedGetCaseOperation.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/aggregated/AuthorisedGetCaseViewOperation.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/aggregated/AuthorisedGetEventTriggerOperation.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getevents/AuthorisedGetEventsOperation.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/search/AuthorisedSearchOperation.java
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseField.json
status: confluence-augmented
last_reviewed: 2026-08-20T00:00:00Z
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
    last_modified: "2026-05-16"
    space: "RCCD"
  - id: "1042843985"
    title: "Shuttering a CaseType on CCD using CRUD"
    last_modified: "unknown"
    space: "RCCD"
  - id: "207804327"
    title: "CCD Definition Glossary for Setting up a Service in CCD"
    last_modified: "2026-06-23"
    space: "RCCD"
confluence_checked_at: "2026-08-20T00:00:00Z"
title: Permissions Matrix
diataxis: reference
product: ccd
sources_sha:
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/Authorisation.java": "bda0438d09f29d99f546185907272748a1224c49"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseTypeACLEntity.java": "bda0438d09f29d99f546185907272748a1224c49"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseFieldACLEntity.java": "bda0438d09f29d99f546185907272748a1224c49"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/EventACLEntity.java": "bda0438d09f29d99f546185907272748a1224c49"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/StateACLEntity.java": "bda0438d09f29d99f546185907272748a1224c49"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/ComplexFieldACLEntity.java": "bda0438d09f29d99f546185907272748a1224c49"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/AccessProfileEntity.java": "4a61be5e99ee7960b1211b6be01e31c5f8e98b11"
  ? "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/RoleToAccessProfilesEntity.java"
  : "bda0438d09f29d99f546185907272748a1224c49"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/model/AccessControlList.java": "757f2f9b17ca633b1c5349cc746cedd46e82f74f"
  "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/AuthorisationParser.java": "8afc4a0f8bb4856b4044542fcb140ed668c11990"
  ? "ccd-definition-store-api:domain/src/main/java/uk/gov/hmcts/ccd/definition/store/domain/validation/authorization/CrudValidator.java"
  : "704943e3529d5bba87cd6c005b445b773ff8fc8a"
  ? "ccd-definition-store-api:domain/src/main/java/uk/gov/hmcts/ccd/definition/store/domain/validation/casefield/CaseFieldEntityComplexFieldACLValidatorImpl.java"
  : "43e27ff88c4b3dd93230cf988f05e8fe7e04f741"
  "ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql": "42e4acfedce25f90d5d368e4cf963e3f71f9bb4c"
  ? "apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseField.json"
  : "980ad379b2aa2e5713cdc8745e9d65542fb06280"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/AccessControlService.java": "20b95a21e98b143b1c833f84f28ee6ef8664ed66"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/CaseAccessService.java": "b509326d3eefbb50e825485237675ec4117beebe"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createcase/AuthorisedCreateCaseOperation.java": "593ffa40e6cc3beac85f5afb320d0a48b8fc2ccf"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/AuthorisationMapper.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/AccessControl.java": "e6d5579f206077c006f9ca7999ffbecca9bc89f9"
  ? "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/AttributeBasedAccessControlService.java"
  : "489236c1af684a67a9157f71e86ff52de7a026c0"
  ? "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/PseudoRoleToAccessProfileGenerator.java"
  : "2bb394ef1fd4bd83ecfc40ff246a854ac33b4849"
  ? "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/RoleAssignmentCategoryService.java"
  : "e6d5579f206077c006f9ca7999ffbecca9bc89f9"
  ? "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/DefaultCaseDataAccessControl.java"
  : "da6f87b5a52f0e3c7afe6a76777ddf098bd5fe90"
  ? "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/CaseAccessMetadata.java"
  : "c33eaf088b6c7947a041d91aee4f70070099cceb"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/user/DefaultUserRepository.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  ? "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/RoleToAccessProfilesParser.java"
  : "5d6de5ab72360938dd42a888469bfdaef23c4612"
  ? "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/model/DefinitionDataItem.java"
  : "8afc4a0f8bb4856b4044542fcb140ed668c11990"
  ? "ccd-definition-store-api:repository/src/main/resources/db/migration/V20220209_13110__RDM-13110_CaseAccessCategories.sql"
  : "4258cd8b230205318b56fe8018880751d9c030c9"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/AccessControlServiceImpl.java": "a66e2e926b41eaf32c730953a31f8d6f2e90919f"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/CompoundAccessControlService.java": "e6d5579f206077c006f9ca7999ffbecca9bc89f9"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/AuthorisedCreateEventOperation.java": "20b95a21e98b143b1c833f84f28ee6ef8664ed66"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseFieldDefinition.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcase/AuthorisedGetCaseOperation.java": "e6d5579f206077c006f9ca7999ffbecca9bc89f9"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/aggregated/AuthorisedGetCaseViewOperation.java": "5a3784952c770de7096124db8c1b4cd81f6aba78"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/aggregated/AuthorisedGetEventTriggerOperation.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getevents/AuthorisedGetEventsOperation.java": "e6d5579f206077c006f9ca7999ffbecca9bc89f9"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/search/AuthorisedSearchOperation.java": "a15443393cabe95329a00e7ace1e4be18a555703"
---

# Permissions Matrix

## TL;DR

- CCD permissions are CRUD booleans per access-profile on five scopes: case type, event, state, case field, and complex (nested) field.
- At runtime, data-store applies a three-layer composition: **AuthorisedOperation** (CRUD check) wraps **ClassifiedOperation** (security classification) wraps **DefaultOperation** (business logic).
- When multiple access profiles match, the caller receives the **union** of all grants — `anyMatch` semantics (if any profile has the permission, it passes).
- Enforcement is either **error** (reject the request with 403/404) or **filter** (silently omit the object from the response), depending on the API operation and CRUD scope.
- A child complex-field ACL can never grant more access than its parent field's ACL for the same access profile.
- `D` is only ever consulted on collection fields; `U` on an event is never consulted. Only assign `C` when a role genuinely needs to create/trigger.

---

## CRUD Bits

Each Authorisation sheet row carries a `CRUD` column whose characters map directly to four boolean DB columns. `AuthorisationParser.parseCrud()` uppercases the string and tests for the presence of each character (`AuthorisationParser.java:37-46`). `CrudValidator` enforces the string matches `^[CRUDcrud\s]{1,5}$` (`CrudValidator.java:12-17`).

| Character | DB column | Meaning on a case type | Meaning on an event | Meaning on a state | Meaning on a field |
|-----------|-----------|----------------------|--------------------|--------------------|-------------------|
| `C`       | `create`  | Role can initiate a new case | Role can trigger this event | -- (unused) | Role can supply a value for this field during creation |
| `R`       | `read`    | Role can retrieve the case | Role can see the event in history | Role can see cases in this state | Role can see this field's value |
| `U`       | `update`  | Role can update case data | -- (not consulted) | Role can trigger events on cases in this state | Role can change this field's value |
| `D`       | `delete`  | -- (not consulted) | -- (not consulted) | -- (not consulted) | Role can remove items from a collection field |

> `create` is a reserved SQL keyword; the DDL quotes it as `"create"` (`V0001__Base_version.sql:122`, `Authorisation.java:31`).

Valid CRUD string examples: `"CRUD"`, `"CR"`, `"R"`, `"CRU"`. Characters are case-insensitive; whitespace is tolerated. An empty or null string fails `CrudValidator`.

### Practical guidelines

- **`D` reaches only collection items.** `CAN_DELETE` is consulted in exactly three places in data-store: the collection display-context parameter (`AccessControlService.java:255`) and the two collection-item checks in `CompoundAccessControlService.java:114-115` and `:188`. Nothing tests `delete` on a case type, event or state, and clearing a simple field's value is an update, so `D` outside a collection row changes no behaviour.
- **Only assign `C` when you want a role to create something.** Without `C` on the case type a caller cannot open a case (`AuthorisedCreateCaseOperation.java:104-109`), and without `C` on the event it cannot trigger it (`:111-117`, `AuthorisedCreateEventOperation.java:224-229`). Both raise `ResourceNotFoundException`, so the caller sees a 404 rather than a 403 — a missing `C` is indistinguishable from a case type or event that does not exist.
- **`U` and `D` on events have no effect.** The update leg of an event checks `U` on the *case type* and on the case's *current state* instead (`AuthorisedCreateEventOperation.java:246-252`), so a state with no `U` row for a profile silently blocks every event on cases sitting in it.

<!-- CONFLUENCE-ONLY: the claim that most services never in practice need field or case deletion is a usage observation, not verifiable in source -->


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

The following table shows which CRUD checks apply to each Standard API operation, taken from the `Authorised*Operation` decorator for each:

| API Operation | C (case type) | C (event) | C (fields) | R (case type) | R (event) | R (state) | R (fields) | U (case type) | U (state) | U (fields) |
|---------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `createCase`                    | E | E | E | F | - | - | F | - | - | - |
| `createEvent`                   | - | E | E | F | - | - | F | E | E | E |
| `getCase`                       | - | - | - | F | - | F | F | F | F | - |
| `startEvent` (for a case type)  | E | E | F | E | - | - | - | - | - | - |
| `startEvent` (for a case)       | - | E | - | E | - | - | - | E | E | F |
| `getEvents`                     | - | - | - | F | F | - | - | - | - | - |
| `search`                        | - | - | - | F | - | F | F | - | - | - |

**Legend**: E = check, reject on failure; F = check, filter on failure; `-` = not checked. There is no `U (event)` or `D` column because no operation consults either.

Reading the rows:

- `createCase` — `verifyCreateAccess` rejects on `C` for case type, event and fields, then `verifyReadAccess` returns `null` without `R` on the case type and strips unreadable fields from the response (`AuthorisedCreateCaseOperation.java:73-126`).
- `createEvent` — `C` on the event, `U` on the case type and on the case's current state, and a per-field upsert check (`AuthorisedCreateEventOperation.java:215-263`).
- `getCase` — `R` on case type and state gate the whole case (`AuthorisedGetCaseOperation.java:71-75`); the case *view* additionally empties the actionable-events list when `U` on the case type or state is missing, which is why a case can be readable with no available events (`AuthorisedGetCaseViewOperation.java:113-131`).
- `startEvent` — the case-type form (opening a new case) requires `R` and `C` on the case type plus `C` on the event, then filters fields by `C` (`AuthorisedGetEventTriggerOperation.java:81-90`, `:165-181`, `:210-218`). The per-case form requires `R` and `U` on the case type, `C` on the event and `U` on the state, then marks fields the profile cannot update as read-only rather than removing them (`:109-116`, `:183-207`, `:220-232`).
- `getEvents` — `R` on the case type empties the list, then each audit event is filtered by `R` on its `event_acl` row (`AuthorisedGetEventsOperation.java:98-106`).
- `search` — `R` on the case type empties the result set, then results are filtered by `R` on the case's state and by field-level `R` (`AuthorisedSearchOperation.java:70-98`).

Within `createEvent`, the field check is per-field and direction-sensitive: a field name present in the new data but absent from the existing data needs `C`, a field whose value differs from the stored value needs `U`, and an unchanged field needs neither (`AccessControlServiceImpl.java:138-169`, `:407-430`). A profile with `U` but no `C` can therefore edit a field that already holds a value and fails the same event outright once that field is populated for the first time.

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

Collections nested inside a complex type get the same treatment, not the top-level field's parameter: `updateCollectionDisplayContextParameterByAccess` walks the whole field tree and calls `generateDisplayContextParameter` against each collection's own ACL list (`AccessControlServiceImpl.java:261-274`, `AccessControlService.java:239-248`, `:250-264`). Those nested ACLs are copies of the top-level field's, cloned down the tree by `CaseFieldDefinition.propagateACLsToNestedFields` (`CaseFieldDefinition.java:230-239`), so a nested collection behaves like its ancestor until an `AuthorisationComplexType` row overrides its path.

Enforcement of the write follows the same per-depth ACL. `CompoundAccessControlService` recurses through the submitted value: adding an item needs `C` (`CompoundAccessControlService.java:61-103`) and removing one needs `D` (`:105-144`) on the ACL of whichever collection the item belongs to, at whatever depth.

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
| `Authorisation`      | Comma-separated identifiers; the Role Assignment must carry at least one for the mapping to apply |
| `ReadOnly`           | Marks the granted profiles READONLY (not a filter -- see below) |
| `Disabled`           | Excludes this mapping from resolution |
| `CaseAccessCategories` | Applies the mapping only when the case's `CaseAccessCategory` starts with one of the listed values |

`RoleToAccessProfilesEntity` fields: `roleName`, `accessProfiles`, `authorisation`, `readOnly`, `disabled`, `caseAccessCategories` (`RoleToAccessProfilesEntity.java:35-51`). The unique constraint is `(role_name, case_type_id, case_access_categories)` (`V20220209_13110__RDM-13110_CaseAccessCategories.sql:4`), so one role may hold several rows for a case type provided the category column differs.

`ReadOnly` and `Disabled` are parsed via `getBooleanOrDefault(…, false)` (`RoleToAccessProfilesParser.java:57-67`). Accepted values are `y`/`yes`/`t`/`true` and `n`/`no`/`f`/`false`, case-insensitive; any other value raises `MapperException(INVALID_VALUE_COLUMN)` and fails the import (`DefinitionDataItem.java:126-147`).

### ReadOnly behaviour

`ReadOnly` is a **modifier, not a filter**. `AuthorisationMapper.readOnly()` returns `roleAssignment.getReadOnly() || roleToAccessProfileDefinition.getReadOnly()` (`AuthorisationMapper.java:79-83`), evaluated after the mapping has already been selected — so it never affects *whether* a mapping applies, only the characteristic of the profiles it yields. A mismatch between the two flags blocks nothing.

<!-- DIVERGENCE: "CCD Definition Glossary for Setting up a Service in CCD" (RCCD/207804327, v157) documents ReadOnly as a value the Role Assignment's own readonly flag "must match ... in order to map to the access profile". Source AuthorisationMapper.java:79-83 ORs the two flags rather than matching them. Source wins. -->

Once a profile is READONLY, `AttributeBasedAccessControlService.updateAccessControlCRUD()` rewrites its ACL to `create=false, update=false, delete=false, read=true` (`AttributeBasedAccessControlService.java:45-62`). Note `read=true` is set unconditionally: READONLY *grants* read as well as removing CUD, so such a profile can read a field its ACL row denied.

This means shuttering a case type by setting CRUD to `"D"` will not fully work for `readOnly=true` roles -- they will still have `R` access.

### Fake role-name-to-access-profile mappings

For services that have not adopted organisational Role Assignment based access control, data-store auto-generates "fake" mappings in `PseudoRoleToAccessProfileGenerator`, cached per case-type version (`@Cacheable("caseTypePseudoRoleToAccessProfileCache")`, keyed on version number + case-type id, `PseudoRoleToAccessProfileGenerator.java:23-24`). Both sets are derived from the access-profile references found in the case type's own ACL rows — case type, events, states, fields and complex fields (`:40-57`):

1. Each reference matching `^\[[a-zA-Z]([a-zA-Z0-9-_]*)\]$` is a case role: `RoleName=<case_role>`, `AccessProfiles=<case_role>`. `[CREATOR]` is added whether or not any ACL names it (`:21`, `:52`).
2. Every other reference is treated as an IDAM role: `RoleName=idam:<user_role>`, `AccessProfiles=<user_role>` (`:108-114`; `IDAM_PREFIX` at `AccessControl.java:5`).

<!-- DIVERGENCE: Access Control (1285226654) derives set 1 from "each <case_role> in the CaseRoles definition" and set 2 from user roles. Source PseudoRoleToAccessProfileGenerator.java:40-57 walks the case type's ACL rows for both, so a case role declared in CaseRoles but unused in any ACL yields no pseudo-mapping. Source wins. -->

---

## Complex-Field ACL Inheritance Rules

`complex_field_acl` rows carry a `list_element_code` dot-path (e.g. `applicant.address.postCode`) targeting a sub-field within a complex type.

Rules enforced by `CaseFieldEntityComplexFieldACLValidatorImpl`:

1. A `complex_field_acl` row requires a parent `case_field_acl` row for the same access profile on the same top-level field (`CaseFieldEntityComplexFieldACLValidatorImpl.java:96-111`).
2. Every intermediate path segment must also have an explicit ACL row (e.g. `applicant.address` must exist if `applicant.address.postCode` is declared).
3. A child path cannot have **higher** access than its parent for the same profile -- checked via `Authorisation.hasLowerAccessThan()` (`Authorisation.java:154-172`, `CaseFieldEntityComplexFieldACLValidatorImpl.java:127-150`).
4. Predefined complex types (e.g. `Address`, `OrderSummary`) cannot have `complex_field_acl` rows at all (`CaseFieldEntityComplexFieldACLValidatorImpl.java:38-49`).

At runtime `CaseFieldDefinition.propagateACLsToNestedFields()` resolves these rows in three passes (`CaseFieldDefinition.java:223-228`):

1. **Inheritance** — every nested field, at every depth, is given a copy of the top-level field's ACLs (`:230-239`).
2. **Override** — each `complex_field_acl` row replaces the same profile's entry on its target path, and that path's resolved ACLs are re-propagated to everything below it (`:241-254`). A profile therefore inherits from the deepest ancestor that has an explicit row.
3. **Omission equals hidden** — for each explicit row, the siblings sharing its parent path that have no row of their own lose that profile's ACL entirely, recursively (`:256-290`). With no `read` entry left, the sub-field is filtered out of the response.

Pass 3 only fires for siblings of a path that *is* named. A complex field with no `AuthorisationComplexType` rows at all keeps the inherited top-level access on every sub-field — declaring one sibling is what starts excluding the others, so adding a single row to grant one sub-field silently revokes access to the rest of that level for that profile.

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
  .+-solicitor$|.+-panelmember$|^citizen(-.*)?$|^letter-holder$|^caseworker-.+-localAuthority$
```

- Matched with `Matcher.matches()`, so the whole role name must match one alternative (`DefaultUserRepository.java:206-208`). The pattern carries **no** `CASE_INSENSITIVE` flag.
- Roles matching this pattern get `AccessLevel.GRANTED` (`CaseAccessService.java:82`) -- they need an explicit entry in the `case_users` table (or a SPECIFIC/CASE role assignment from AM) to access any case.
- All other roles get `AccessLevel.ALL` -- they can access any case (subject to CRUD and classification).

On case creation, if the creating user matches `RESTRICT_GRANTED_ROLES_PATTERN`, they are assigned a `[CREATOR]` case role (`DefaultCaseDataAccessControl.java:222`). Its role category is resolved **independently** of which alternative matched: `RoleAssignmentCategoryService` re-reads the user's IDAM roles and tests three separate `CASE_INSENSITIVE` patterns in priority order, returning the first hit (`RoleAssignmentCategoryService.java:18-42`):

| Order | IDAM role pattern | Role category |
|-------|-------------------|---------------|
| 1 | `.+-solicitor$` or `^caseworker-.+-localAuthority$` | `PROFESSIONAL` |
| 2 | `^citizen(-.*)?$` or `^letter-holder$` | `CITIZEN` |
| 3 | `.+-panelmember$` | `JUDICIAL` |
| -- | No match | `LEGAL_OPERATIONS` |

Because the order is fixed, a user holding both a solicitor and a panel-member role is categorised `PROFESSIONAL`. And because these three patterns are case-insensitive while `RESTRICT_GRANTED_ROLES_PATTERN` is not, role names differing only in case can be categorised without being restricted.

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

If the `RoleToAccessProfiles` mapping includes `CaseAccessCategories`, the case's `CaseAccessCategory` field must **start with** one of the listed category values for the mapping to apply. This enables hierarchical category-based access (e.g. category `Civil/Standard` matches a mapping for `Civil`). The listed values are split on `,` and trimmed, then tested with `caseAccessCategory::startsWith`; a mapping with a null `caseAccessCategories` always applies, and one with categories set never applies to a case whose `CaseAccessCategory` is empty (`DefaultCaseDataAccessControl.java:170-179`).

---

## Time-Bounded ACL Grants

Every `*_acl` row carries `live_from` and `live_to` date columns inherited from `Authorisation`. These allow temporary or future-dated grants without re-importing the definition. Enforcement is at data-store query time, not definition-store.

---

## Access Metadata (ExUI)

Data-store returns two transient metadata fields in internal V2 API responses for ExUI to display access status:

| Field | Values | Purpose |
|-------|--------|---------|
| `[ACCESS_GRANTED]` | CSV of grant types, de-duplicated and sorted alphabetically (e.g. `"SPECIFIC,STANDARD"`) | Shows which grants passed filtering |
| `[ACCESS_PROCESS]` | `"NONE"`, `"CHALLENGED"`, or `"SPECIFIC"` | Indicates what process the user should follow to gain access |

Field IDs and labels are `CaseAccessMetadata.java:13-16`; the sorted-CSV rendering is `getAccessGrantsString()` at `:29-38`. The two fields draw on different grant-type sets: `[ACCESS_GRANTED]` counts `BASIC`, `STANDARD`, `SPECIFIC`, `CHALLENGED` (`DefaultCaseDataAccessControl.java:468`), while `[ACCESS_PROCESS]` ignores `BASIC` (`:462`) -- which is why a BASIC-only user sees a grant recorded and still gets a process to follow.

`access_process` logic (`DefaultCaseDataAccessControl.java:402-424`):
- `NONE`: a STANDARD, SPECIFIC or CHALLENGED role assignment passed filtering **and** resolved to at least one access profile holding `R` on the case type **and** `R` on the case's current state (`:446`) -- user has access.
- `CHALLENGED`: re-running that check against only the assignments that failed on the region or base-location matcher would have granted access -- user can request challenged access.
- `SPECIFIC`: neither held -- user must request specific access through the AM workflow.

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
