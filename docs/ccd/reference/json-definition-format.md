---
topic: tutorial-json
audience: both
sources:
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/EventEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/EventCaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/DisplayGroupEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/GenericLayoutEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/ComplexFieldEntity.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# JSON Definition Format

## TL;DR

- CCD definitions are authored as Excel spreadsheets; each tab maps to a named sheet that `SpreadsheetParser` reads into a `Map<String, DefinitionSheet>`.
- Sheet names must match exactly the values in the `SheetName` enum — any mismatch throws `MapperException`.
- Each sheet has a fixed set of column names; required columns per sheet are encoded in `ColumnName.isRequired(SheetName, ColumnName)`.
- `CRUD` column values are free-form strings (`"CR"`, `"CRUD"`, etc.) mapped to four boolean DB columns by `AuthorisationParser.parseCrud()`.
- `case_field_element_path` uses dot-notation (e.g. `applicant.address.postCode`) to reference nested fields in complex types across layout and ACL sheets.

## CaseField

Sheet name: `CaseField` → DB table `case_field`.

| Column | Required | Notes |
|---|---|---|
| `ID` | Yes | Stored as `reference varchar(70)` |
| `Name` | Yes | Display label |
| `FieldType` | Yes | Base or custom type reference |
| `CaseTypeID` | Yes | FK to parent case type |
| `SecurityClassification` | No | `PUBLIC`, `PRIVATE`, or `RESTRICTED` |
| `Label` | No | Overrides Name for display |
| `HintText` | No | Helper text shown in UI |
| `Hidden` | No | Boolean; hides field from UI |
| `Searchable` | No | Boolean (default `true`); controls ES indexing |
| `DataFieldType` | No | `CASE_DATA` (default) or `METADATA` |
| `CategoryID` | No | Document category reference |
| `LiveFrom` / `LiveTo` | No | Time-bounding the field |

Source: `ColumnName.java:159–163`, `CaseFieldEntity.java:32–88`, `V0001__Base_version.sql:99–112`.

## CaseEvent

Sheet name: `CaseEvent` → DB table `event`.

| Column | Required | Notes |
|---|---|---|
| `ID` | Yes | Stored as `reference varchar(70)` |
| `Name` | Yes | `varchar(30)` |
| `CaseTypeID` | Yes | FK to parent case type |
| `Description` | No | `varchar(100)` |
| `PreStates` | No | Comma-separated state IDs; empty means any state |
| `PostState` | No | Target state after event |
| `SecurityClassification` | No | |
| `ShowSummary` | No | Boolean |
| `EndButtonLabel` | No | Label for submit button |
| `ShowEventNotes` | No | Boolean |
| `CanSaveDraft` | No | Boolean |
| `EventEnablingCondition` | No | Expression controlling event availability |
| `CallBackURLAboutToStartEvent` | No | Webhook URL: START |
| `CallBackURLAboutToSubmitEvent` | No | Webhook URL: PRE_SUBMIT |
| `CallBackURLSubmittedEvent` | No | Webhook URL: POST_SUBMIT |
| `LiveFrom` / `LiveTo` | No | |

Source: `ColumnName.java:156–158`, `EventEntity.java:41–120`, `V0001__Base_version.sql:479–494`.

## CaseEventToFields

Sheet name: `CaseEventToFields` → DB table `event_case_field`.

| Column | Required | Notes |
|---|---|---|
| `CaseFieldID` | Yes | FK to CaseField |
| `CaseTypeID` | Yes | |
| `CaseEventID` | Yes | FK to CaseEvent |
| `PageID` | Yes | Groups fields onto wizard pages |
| `DisplayContext` | No | `READONLY`, `OPTIONAL`, `MANDATORY`, or `COMPLEX` |
| `ShowCondition` | No | Expression; field visible when true |
| `RetainHiddenValue` | No | Boolean; preserves data when field hidden |
| `ShowSummaryChangeOption` | No | Boolean |
| `Label` | No | Overrides field label on this event |
| `HintText` | No | Overrides field hint on this event |
| `DefaultValue` | No | Pre-populated value |
| `Publish` | No | Boolean; include field in publish event |
| `PublishAs` | No | Alias for published field name |

Source: `ColumnName.java:167–171`, `EventCaseFieldEntity.java:48–83`.

## AuthorisationCaseField

Sheet name: `AuthorisationCaseField` → DB table `case_field_acl`.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseFieldID` | Yes | FK to CaseField |
| `AccessProfile` | Yes | References `role.reference` in the `role` table |
| `CRUD` | Yes | Any combination of `C`, `R`, `U`, `D`; case-insensitive |
| `LiveFrom` / `LiveTo` | No | Time-bounding the ACL grant |

The CRUD string is parsed by `AuthorisationParser.parseCrud()` into four boolean columns (`create`, `read`, `update`, `delete`). Note: `role_id` FK points to `AccessProfileEntity` in the `role` table, not directly to an IDAM role string (`AuthorisationParser.java:22–46`, `V0001__Base_version.sql:119–130`).

## AuthorisationCaseEvent

Sheet name: `AuthorisationCaseEvent` → DB table `event_acl`.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseEventID` | Yes | FK to CaseEvent |
| `AccessProfile` | Yes | |
| `CRUD` | Yes | Parsed identically to AuthorisationCaseField |
| `LiveFrom` / `LiveTo` | No | |

Source: `V0001__Base_version.sql:501–512`.

## AuthorisationComplexType

Sheet name: `AuthorisationComplexType` → DB table `complex_field_acl`.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseFieldID` | Yes | Top-level field reference |
| `ListElementCode` | Yes | Dot-notation path to nested sub-field, e.g. `applicant.address` |
| `AccessProfile` | Yes | |
| `CRUD` | Yes | |
| `LiveFrom` / `LiveTo` | No | |

Every intermediate path segment must have its own ACL row for the same access profile. Predefined complex types (e.g. `Address`) cannot have rows here (`CaseFieldEntityComplexFieldACLValidatorImpl.java:38–49`, `V0001__Base_version.sql:307–319`).

## CaseTypeTab

Sheet name: `CaseTypeTab` → DB tables `display_group` + `display_group_case_field`.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `TabID` | Yes | Stored as `display_group.reference` |
| `CaseFieldID` | Yes | FK to CaseField |
| `TabLabel` | No | Display label for the tab |
| `TabDisplayOrder` | No | Ordering of tabs |
| `TabFieldDisplayOrder` | No | Ordering of fields within the tab |
| `ShowCondition` | No | Tab-level visibility condition |
| `AccessProfile` | No | Restricts tab visibility to an access profile |
| `DisplayContextParameter` | No | `#TABLE(...)`, `#DATETIMEDISPLAY(...)`, etc. |

`DisplayGroupEntity` has `type=TAB` and `purpose=VIEW`. Wizard pages use the same table with `type=PAGE`, `purpose=EDIT` (`DisplayGroupEntity.java:54–59`).

Source: `ColumnName.java:195–198`, `DisplayGroupEntity.java:39–76`.

## WorkBasketInputFields

Sheet name: `WorkBasketInputFields` → DB table `workbasket_input_case_field`.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseFieldID` | Yes | |
| `Label` | No | |
| `DisplayOrder` | No | |
| `AccessProfile` | No | Role restriction |
| `ShowCondition` | No | Input-variant only |
| `DisplayContextParameter` | No | |
| `CaseFieldElementPath` | No | Dot-notation into complex type, e.g. `applicant.firstName` |

Source: `GenericLayoutEntity.java:37–58`, `InputCaseFieldEntity.java:13`, `WorkBasketInputCaseFieldEntity.java:7,12`.

## SearchInputFields

Sheet name: `SearchInputFields` → DB table `search_input_case_field`.

Identical columns to `WorkBasketInputFields`. Both are input variants that extend `InputCaseFieldEntity` and include `ShowCondition`.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseFieldID` | Yes | |
| `Label` | No | |
| `DisplayOrder` | No | |
| `AccessProfile` | No | |
| `ShowCondition` | No | |
| `DisplayContextParameter` | No | |
| `CaseFieldElementPath` | No | |

Source: `SearchInputCaseFieldEntity.java:7,13`, `GenericLayoutEntity.java:37–58`.

## ComplexTypes

Sheet name: `ComplexTypes` → DB table `complex_field`.

| Column | Required | Notes |
|---|---|---|
| `ID` | Yes | Sub-field reference within the complex type |
| `FieldType` | Yes | Type of the sub-field |
| `ListElementCode` | No | Used when the parent complex type is a collection |
| `Label` | No | |
| `HintText` | No | |
| `Hidden` | No | Boolean |
| `SecurityClassification` | No | |
| `Searchable` | No | Boolean (default `true`) |
| `ShowCondition` | No | |
| `DisplayOrder` | No | |
| `DisplayContextParameter` | No | |
| `RetainHiddenValue` | No | |
| `CategoryID` | No | |

Source: `ColumnName.java:174–176`, `ComplexFieldEntity.java:32–70`.

## FixedLists

Sheet name: `FixedLists` → DB table `field_type_list_item` (parent type stored in `field_type`).

| Column | Required | Notes |
|---|---|---|
| `ID` | Yes (parent) | The type name (e.g. `MyStatus`) |
| `ListElementCode` | Yes | Stored value |
| `ListElement` | Yes | Display label |
| `DisplayOrder` | No | Sort order for list items |
| `LiveFrom` / `LiveTo` | No | |

The parent `field_type` row has `base_field_type_id` referencing `FixedList`, `MultiSelectList`, or `FixedRadioList` (`FieldTypeEntity.java:87–89`, `ColumnName.java:172–173`).

## Validation behaviour

- `SpreadsheetValidator.validate()` runs structural checks before any DB writes: exactly one Jurisdiction row; at least one CaseType row; `CaseField`, `ComplexTypes`, and `FixedList` sheets must be present (`SpreadsheetValidator.java:43–96`).
- Column max-lengths are checked per-cell against `SpreadSheetValidationMappingEnum`.
- `DisplayContextParameter` values (`#TABLE(...)`, `#DATETIMEDISPLAY(...)`) are validated by `DisplayContextParameterValidator`.
- A field with `RetainHiddenValue=true` must also have a `ShowCondition` (`HiddenFieldsValidator.java:206–213`).
- Import fails with HTTP 400/422 on any validation error via `InvalidImportException` or `MapperException`.

## See also

- [First case type (JSON form)](../tutorials/first-case-type-json.md) — tutorial that walks through authoring a definition using these sheets
- [Definition import](../explanation/definition-import.md) — how the import pipeline processes these sheets end-to-end
- [Permissions matrix](permissions-matrix.md) — ACL model detail and CRUD string semantics

## Glossary

| Term | Definition |
|---|---|
| `SheetName` | Enum of 31 canonical spreadsheet tab names; must match exactly (`SheetName.java:7–37`) |
| `ColumnName` | Enum of ~120 column names; `isRequired(SheetName, ColumnName)` defines mandatory columns per sheet |
| `DisplayContextParameter` | String value controlling advanced UI rendering: `#TABLE(...)`, `#DATETIMEDISPLAY(...)`, etc. |
| `case_field_element_path` | Dot-notation path into a complex type, e.g. `applicant.address.postCode`; used in layout and ACL sheets |
| `CRUD string` | Free-form string of permission characters (`C`, `R`, `U`, `D`) parsed into four boolean DB columns at import time |
