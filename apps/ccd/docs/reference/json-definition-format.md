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
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/StateEntity.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/ShellMappingParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/SpreadSheetValidationMappingEnum.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/ShellMappingEntity.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/ShellMappingController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/types/MoneyGBPValidator.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/aggregated/CompoundFieldOrderService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/aggregated/CaseViewFieldBuilder.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/CategoryValidator.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/RoleToAccessProfilesValidator.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/UserRoleController.java
status: confluence-augmented
confluence:
  - id: "207804327"
    title: "CCD Definition Glossary for Setting up a Service in CCD"
    last_modified: "2026-06-23"
    space: "RCCD"
  - id: "205750327"
    title: "CCD - Import Domain - Validation Rules"
    last_modified: "2020-01-01T00:00:00Z"
    space: "RCCD"
  - id: "1116308370"
    title: "How to manage CCD definition files"
    last_modified: "2019-07-24T00:00:00Z"
    space: "RDM"
  - id: "1446904663"
    title: "Resources for CCD Definition Files"
    last_modified: "2024-02-07T00:00:00Z"
    space: "EUI"
confluence_checked_at: "2026-08-20T00:00:00Z"
last_reviewed: 2026-08-20T00:00:00Z
title: JSON Definition Format
diataxis: reference
product: ccd
sources_sha:
  "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java": "77b362ce2cfeb8c11f1a2d23e9129297aa65fd7b"
  "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java": "77b362ce2cfeb8c11f1a2d23e9129297aa65fd7b"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseFieldEntity.java": "6ad5468e76b9ce8c56d74d619b2b5c79cdee63e9"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/EventEntity.java": "6ad5468e76b9ce8c56d74d619b2b5c79cdee63e9"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/EventCaseFieldEntity.java": "6ad5468e76b9ce8c56d74d619b2b5c79cdee63e9"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/DisplayGroupEntity.java": "bda0438d09f29d99f546185907272748a1224c49"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/GenericLayoutEntity.java": "bda0438d09f29d99f546185907272748a1224c49"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/ComplexFieldEntity.java": "6ad5468e76b9ce8c56d74d619b2b5c79cdee63e9"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/StateEntity.java": "bda0438d09f29d99f546185907272748a1224c49"
  "ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql": "42e4acfedce25f90d5d368e4cf963e3f71f9bb4c"
  "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/ShellMappingParser.java": "77b362ce2cfeb8c11f1a2d23e9129297aa65fd7b"
  ? "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/SpreadSheetValidationMappingEnum.java"
  : "77b362ce2cfeb8c11f1a2d23e9129297aa65fd7b"
  "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java": "77b362ce2cfeb8c11f1a2d23e9129297aa65fd7b"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/ShellMappingEntity.java": "77b362ce2cfeb8c11f1a2d23e9129297aa65fd7b"
  "ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/ShellMappingController.java": "77b362ce2cfeb8c11f1a2d23e9129297aa65fd7b"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/types/MoneyGBPValidator.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/aggregated/CompoundFieldOrderService.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/aggregated/CaseViewFieldBuilder.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/CategoryValidator.java": "e133f2d8f9c04adfe8f167dca0128fe9fe9da093"
  ? "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/RoleToAccessProfilesValidator.java"
  : "4258cd8b230205318b56fe8018880751d9c030c9"
  "ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/UserRoleController.java": "bda0438d09f29d99f546185907272748a1224c49"
---

# JSON Definition Format

## TL;DR

- CCD definitions are authored as Excel spreadsheets (or JSON equivalents); each tab maps to a named sheet parsed by `SpreadsheetParser` into `Map<String, DefinitionSheet>`.
- The `SheetName` enum defines 32 canonical sheet names; the `ColumnName` enum defines ~130 columns with `isRequired(SheetName, ColumnName)` encoding mandatory columns per sheet.
- `DisplayContext` supports five values: `MANDATORY`, `OPTIONAL`, `READONLY`, `HIDDEN`, and `COMPLEX` (the last delegates display rules to `EventToComplexTypes`).
- `CRUD` column values are parsed into four boolean DB columns; `AccessProfile` (column alias: `UserRole`) references the `role` table.
- Callback retries are comma-separated timeout values in seconds (e.g. `5,10,15` = three retries with increasing delay).
- Validation on import enforces: compound-key uniqueness per sheet, FK integrity across sheets, alphanumeric-only IDs (`a-z`, `0-9`, `_`), and max-length constraints.

## CaseField

Sheet name: `CaseField` | DB table: `case_field`

| Column | Required | Notes |
|---|---|---|
| `ID` | Yes | Stored as `reference varchar(70)`. Must be alphanumeric + underscore only. |
| `Name` | Yes | Display label (`varchar(30)`) |
| `FieldType` | Yes | Base type, custom complex type, or list reference. Case-sensitive. |
| `CaseTypeID` | Yes | FK to parent case type |
| `FieldTypeParameter` | No | For `FixedList`/`MultiSelectList`: the list ID. For `Collection`: the element type. For complex types: `EXPAND` to enable expand UI. |
| `RegularExpression` | No | Custom regex overriding any built-in type regex |
| `Min` | No | Minimum length for the field value |
| `Max` | No | Maximum length for the field value |
| `SecurityClassification` | No | `PUBLIC`, `PRIVATE`, or `RESTRICTED` (mandatory in practice; hierarchy: CaseType > CaseEvent > ComplexType > CaseField) |
| `Label` | No | Overrides Name for display. Supports limited Markdown and field interpolation. |
| `HintText` | No | Helper text shown in UI as grey text |
| `Hidden` | No | Boolean; hides field from UI |
| `Searchable` | No | Boolean (default `true`); controls ES indexing |
| `DataFieldType` | No | `CASE_DATA` (default) or `METADATA` |
| `CategoryID` | No | Document category reference; must match a CategoryID in the Categories tab for the given CaseTypeID |
| `LiveFrom` / `LiveTo` | No | Time-bounding the field |

Source: `ColumnName.java:159–163`, `CaseFieldEntity.java:32–88`, `V0001__Base_version.sql:99–112`.

## CaseEvent

Sheet name: `CaseEvent` | DB table: `event`

| Column | Required | Notes |
|---|---|---|
| `ID` | Yes | Stored as `reference varchar(70)` |
| `Name` | Yes | `varchar(30)` |
| `CaseTypeID` | Yes | FK to parent case type |
| `Description` | No | `varchar(100)` |
| `DisplayOrder` | No | Numeric; display ordering for event list |
| `PreConditionState(s)` | No | Comma-separated state IDs; `*` means any state. Empty means event creates a case. |
| `PostConditionState` | No | Target state after event; `*` keeps current state |
| `SecurityClassification` | No | |
| `Publish` | No | Boolean; if `Yes`/`True`, event is published to CCD message queue |
| `ShowSummary` | No | Boolean (`Y`/`N`/empty). `Y` shows Check Your Answers page. |
| `ShowEventNotes` | No | Boolean (`Y`/`N`); shows Summary and Comment fields on additional page |
| `EndButtonLabel` | No | Label for submit button (max 200; default "Submit") |
| `CanSaveDraft` | No | Boolean; allows saving draft of create events |
| `TTLIncrement` | No | Integer; days after today to set SystemTTL when event fires |
| `EventEnablingCondition` | No | Expression controlling event availability |
| `CallBackURLAboutToStartEvent` | No | Webhook URL: invoked before starting event |
| `RetriesTimeoutAboutToStartEvent` | No | Comma-separated seconds (e.g. `5,10,15`) |
| `CallBackURLAboutToSubmitEvent` | No | Webhook URL: invoked before submitting |
| `RetriesTimeoutURLAboutToSubmitEvent` | No | Comma-separated seconds |
| `CallBackURLSubmittedEvent` | No | Webhook URL: invoked after submission |
| `RetriesTimeoutURLSubmittedEvent` | No | Comma-separated seconds |
| `LiveFrom` / `LiveTo` | No | |

Source: `ColumnName.java:156–158`, `EventEntity.java:41–123`, `V0001__Base_version.sql:479–494`.

## CaseEventToFields

Sheet name: `CaseEventToFields` | DB table: `event_case_field`

| Column | Required | Notes |
|---|---|---|
| `CaseFieldID` | Yes | FK to CaseField |
| `CaseTypeID` | Yes | |
| `CaseEventID` | Yes | FK to CaseEvent |
| `PageID` | Yes | Alphanumeric; groups fields onto wizard pages |
| `DisplayContext` | No | One of: `MANDATORY`, `OPTIONAL`, `READONLY`, `HIDDEN`, `COMPLEX`. See below. |
| `PageFieldDisplayOrder` | No | Numeric ordering of fields on a page |
| `FieldShowCondition` | No | Expression; field visible when true |
| `PageShowCondition` | No | Expression; page visible when true (max 1000 chars) |
| `RetainHiddenValue` | No | `Yes`/`True` retains data when field hidden; `No`/`False`/blank clears it |
| `NullifyByDefault` | No | Boolean; if True, field set to null on event (DefaultValue must be empty) |
| `ShowSummaryChangeOption` | No | Boolean; shows field on Check Your Answers page |
| `ShowSummaryContentOption` | No | Positive integer; states field appears on Check Your Answers |
| `Label` | No | Overrides field label on this event |
| `HintText` | No | Overrides field hint on this event |
| `DefaultValue` | No | Pre-populated value (max 70; must match field type) |
| `Publish` | No | Boolean; include field in published message |
| `PublishAs` | No | Alias for published field name (max 70) |
| `PageLabel` | No | Optional label displayed at top of page |
| `PageDisplayOrder` | No | Ordering of pages in the wizard |
| `PageColumnNumber` | No | `1` (left) or `2` (right) column layout |
| `CallBackURLMidEvent` | No | Mid-event callback URL (stored on the page's `DisplayGroupEntity.webhookMidEvent`) |
| `RetriesTimeoutURLMidEvent` | No | Comma-separated seconds; default 15s, 3 retries, 0/1/3s pause |

**DisplayContext values:**

| Value | Behaviour |
|---|---|
| `MANDATORY` | Field required; complex type elements all treated as mandatory |
| `OPTIONAL` | Field optional; label appended with "(Optional)" |
| `READONLY` | Field displayed with value but not editable |
| `HIDDEN` | Field always hidden, even if ShowCondition evaluates to true |
| `COMPLEX` | Display rules defined in `EventToComplexTypes` tab; at least one element must exist there |

Source: `ColumnName.java:167–171`, `EventCaseFieldEntity.java:48–83`, `DisplayGroupEntity.java:78–81`.

## EventToComplexTypes

Sheet name: `EventToComplexTypes` | DB table: `event_case_field_complex_type`

Controls per-element display within complex-type fields when `DisplayContext=COMPLEX` is set on the parent field in `CaseEventToFields`.

| Column | Required | Notes |
|---|---|---|
| `ID` | Yes | Complex type ID (from ComplexTypes tab or base type) |
| `CaseEventID` | No | FK to CaseEvent; omit to apply to all events |
| `CaseFieldID` | Yes | The complex-type field being configured |
| `ListElement` | Yes | Dot-notation path to element (e.g. `field_a.subfield_b`; max 70) |
| `DisplayContext` | No | `MANDATORY`, `READONLY`, or `OPTIONAL` |
| `FieldDisplayOrder` | No | Positive integer |
| `FieldShowCondition` | No | Expression (max 1000 chars) |
| `EventElementLabel` | No | Override label (max 200) |
| `EventHintText` | No | Override hint (max 300) |
| `DefaultValue` | No | Default value (max 70); applied irrespective of current value |
| `Publish` | No | Boolean; publish element to message queue |
| `PublishAs` | No | Alias (max 70) |
| `LiveFrom` / `LiveTo` | No | |

Rows on this sheet override display metadata and ordering for elements that already belong to the complex type; they do not select which elements appear. Data store hands the rows to `CompoundFieldOrderService.sortNestedFieldsFromCaseEventComplexFields()`, which promotes the children that carry a `FieldDisplayOrder` and appends every remaining child in definition order (`CompoundFieldOrderService.java:32-48`, `:77-80`, `:100-105`), reached from `CaseViewFieldBuilder.java:74-80`. Leaving an element off the sheet leaves it on the form in its definition position; hiding it takes a `FieldShowCondition` or withholding read access on the sub-field via `AuthorisationComplexType`.

<!-- DIVERGENCE: The Confluence glossary states that an element not listed on EventToComplexTypes is not displayed at all under a COMPLEX display context. Source: CompoundFieldOrderService appends unlisted children in encounter order rather than dropping them (ccd-data-store-api:CompoundFieldOrderService.java:20-25, :104). Source wins. -->

Source: `SheetName.java:10 (CASE_EVENT_TO_COMPLEX_TYPES)`, `ColumnName.java`.

## State

Sheet name: `State` | DB table: `state`

| Column | Required | Notes |
|---|---|---|
| `ID` | Yes | Stored as `reference varchar(70)` |
| `CaseTypeID` | Yes | FK to CaseType (enforced by `isRequired` returning false, but FK validated on import) |
| `Name` | No | Display name (max 100) |
| `Description` | No | max 100 |
| `DisplayOrder` | No | Numeric; must be >= 0 |
| `TitleDisplay` | No | Text displayed on Case View title line for cases in this state (max 100) |
| `LiveFrom` / `LiveTo` | No | |

<!-- DIVERGENCE: Confluence says CaseTypeID is in the isRequired list for State, but ColumnName.java:165-166 shows only ID is required for State. Source wins. -->

Source: `SheetName.java:15`, `StateEntity.java:28–63`, `ColumnName.java:165`.

## Categories

Sheet name: `Categories` | DB table: `category`

Defines a hierarchy of document categories for organising case documents.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | FK to CaseType |
| `CategoryID` | Yes | Unique ID (max 70) for the category within the case type |
| `CategoryLabel` | Yes | Display label (max 70) |
| `DisplayOrder` | Yes | Must be unique per category at the same hierarchy level |
| `ParentCategoryID` | No | FK to another CategoryID for sub-categories |
| `LiveFrom` / `LiveTo` | No | |

`CategoryValidator` runs the sheet through five checks on import (`CategoryValidator.java:34-39`): the `(CaseTypeID, CategoryID)` pair must be unique (`:71-88`), `CategoryID`, `CategoryLabel` and a non-negative integer `DisplayOrder` are all mandatory (`:142-152`), the `CaseTypeID` must resolve to a case type defined in the same spreadsheet (`:154-163`), and a non-empty `ParentCategoryID` must name a `CategoryID` listed under that same case type (`:52-69`) — a cross-case-type parent fails the import with "ParentCategoryID: … belongs to a different case type."

`DisplayOrder` uniqueness is enforced by grouping on `(CaseTypeID, CategoryID, DisplayOrder)` and on `(CaseTypeID, ParentCategoryID, DisplayOrder)` (`:102-130`). The first grouping already includes the unique `CategoryID`, so in practice only the second bites: two categories may share a `DisplayOrder` provided they sit under different parents, and top-level categories (empty `ParentCategoryID`) compete with each other for a distinct order.

Source: `SheetName.java:37`, `ColumnName.java:113–115`, `CategoryValidator.java`.

## AuthorisationCaseField

Sheet name: `AuthorisationCaseField` | DB table: `case_field_acl`

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseFieldID` | Yes | FK to CaseField |
| `AccessProfile` | Yes | Column alias: `UserRole`. References `role.reference` in the `role` table. |
| `CRUD` | Yes | Any combination of `C`, `R`, `U`, `D`; case-insensitive |
| `LiveFrom` / `LiveTo` | No | Time-bounding the ACL grant |

CRUD semantics for fields: `C` = create cases with this field; `R` = read/view field data; `U` = modify field data; `D` = delete (not yet implemented).

The CRUD string is parsed by `AuthorisationParser.parseCrud()` into four boolean columns (`create`, `read`, `update`, `delete`). Note: `role_id` FK points to `AccessProfileEntity` in the `role` table, not directly to an IDAM role string (`AuthorisationParser.java:22–46`, `V0001__Base_version.sql:119–130`).

## AuthorisationCaseEvent

Sheet name: `AuthorisationCaseEvent` | DB table: `event_acl`

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseEventID` | Yes | FK to CaseEvent |
| `AccessProfile` | Yes | Column alias: `UserRole` |
| `CRUD` | Yes | Parsed identically to AuthorisationCaseField |
| `LiveFrom` / `LiveTo` | No | |

CRUD semantics for events: `C` = trigger the event; `R` = view event in audit history; `U` = no impact; `D` = not yet implemented.

Source: `V0001__Base_version.sql:501–512`, `ColumnName.java:208–212`.

## AuthorisationCaseType

Sheet name: `AuthorisationCaseType` | DB table: `case_type_acl`

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `AccessProfile` | Yes | Column alias: `UserRole` |
| `CRUD` | Yes | |
| `LiveFrom` / `LiveTo` | No | |

CRUD semantics for case types: `C` = create cases of this type; `R` = read/view cases; `U` = modify cases; `D` = not yet implemented.

Source: `ColumnName.java:199–202`.

## AuthorisationCaseState

Sheet name: `AuthorisationCaseState` | DB table: `state_acl`

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseStateID` | Yes | FK to State |
| `AccessProfile` | Yes | Column alias: `UserRole` |
| `CRUD` | Yes | |
| `LiveFrom` / `LiveTo` | No | |

CRUD semantics for states: `C` = create cases that end in this state; `R` = read/view cases in this state; `U` = modify cases in this state; `D` = not yet implemented.

Source: `ColumnName.java:213–217`.

## AuthorisationComplexType

Sheet name: `AuthorisationComplexType` | DB table: `complex_field_acl`

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseFieldID` | Yes | Top-level field reference |
| `ListElementCode` | Yes | Dot-notation path to nested sub-field, e.g. `applicant.address` |
| `AccessProfile` | Yes | Column alias: `UserRole` |
| `CRUD` | Yes | |
| `LiveFrom` / `LiveTo` | No | |

Every intermediate path segment must have its own ACL row for the same access profile. Predefined complex types (e.g. `Address`) cannot have rows here (`CaseFieldEntityComplexFieldACLValidatorImpl.java:38–49`, `V0001__Base_version.sql:307–319`).

## CaseTypeTab

Sheet name: `CaseTypeTab` | DB tables: `display_group` + `display_group_case_field`

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `TabID` | Yes | Stored as `display_group.reference` |
| `CaseFieldID` | Yes | FK to CaseField or a metadata field name |
| `TabLabel` | No | Display label for the tab (max 30) |
| `TabDisplayOrder` | No | Ordering of tabs; must be consistent for same TabID |
| `TabFieldDisplayOrder` | No | Ordering of fields within the tab |
| `TabShowCondition` | No | Tab-level visibility condition (max 1000) |
| `FieldShowCondition` | No | Field-level visibility within the tab (max 1000) |
| `AccessProfile` | No | Restricts tab visibility to an access profile |
| `DisplayContextParameter` | No | `#TABLE(...)`, `#DATETIMEDISPLAY(...)`, `#ARGUMENT(...)` |
| `Channel` | No | Uniqueness constraint includes Channel |
| `DefaultFocus` | No | Boolean; identifies which field gets default focus (one per case type) |

`DisplayGroupEntity` has `type=TAB` and `purpose=VIEW`. Wizard pages use the same table with `type=PAGE`, `purpose=EDIT` (`DisplayGroupEntity.java:54–59`).

Source: `ColumnName.java:195–198`, `DisplayGroupEntity.java:39–81`.

## WorkBasketInputFields

Sheet name: `WorkBasketInputFields` | DB table: `workbasket_input_case_field`

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseFieldID` | Yes | |
| `ListElementCode` | No | Complex type element path (max 70) |
| `Label` | No | max 30 |
| `DisplayOrder` | No | |
| `AccessProfile` | No | Role restriction (column alias: `UserRole`) |
| `ShowCondition` | No | Input-variant only |
| `DisplayContextParameter` | No | |

Source: `GenericLayoutEntity.java:37–58`, `InputCaseFieldEntity.java:13`, `WorkBasketInputCaseFieldEntity.java:7,12`.

## SearchInputFields

Sheet name: `SearchInputFields` | DB table: `search_input_case_field`

Identical columns to `WorkBasketInputFields`. Both are input variants that extend `InputCaseFieldEntity` and include `ShowCondition`.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseFieldID` | Yes | |
| `ListElementCode` | No | Complex type element path (max 70) |
| `Label` | No | max 200 |
| `DisplayOrder` | No | |
| `AccessProfile` | No | Column alias: `UserRole` |
| `ShowCondition` | No | |
| `DisplayContextParameter` | No | |

Source: `SearchInputCaseFieldEntity.java:7,13`, `GenericLayoutEntity.java:37–58`.

## SearchResultFields / WorkBasketResultFields

Sheet names: `SearchResultFields`, `WorkBasketResultFields` | DB tables: `search_result_case_field`, `workbasket_case_field`

Both are result-display variants sharing the same column set:

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseFieldID` | Yes | |
| `ListElementCode` | No | Complex type element path (max 70) |
| `Label` | No | max 200 |
| `DisplayOrder` | No | |
| `AccessProfile` | No | Column alias: `UserRole` |
| `DisplayContextParameter` | No | |

Source: `SheetName.java:17,20`, `GenericLayoutEntity.java:37–58`.

## SearchCasesResultFields

Sheet name: `SearchCasesResultFields` | DB table: `search_cases_result_field`

Used for the internal SearchCases endpoint; adds `UseCase` and `ResultsOrdering` columns to control result presentation per search use-case.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `CaseFieldID` | Yes | Supports dot-notation into complex fields |
| `UseCase` | Yes | Identifies the search use case |
| `Label` | No | max 200 |
| `DisplayOrder` | No | |
| `AccessProfile` | No | Column alias: `UserRole` |
| `ResultsOrdering` | No | Field for ordering results |
| `DisplayContextParameter` | No | |

Source: `SheetName.java:18`, `ColumnName.java:189–192`.

## ComplexTypes

Sheet name: `ComplexTypes` | DB table: `complex_field`

| Column | Required | Notes |
|---|---|---|
| `ID` | Yes | Complex type name (referred to in CaseField.FieldType) |
| `FieldType` | Yes | Type of the sub-field |
| `ListElementCode` | No | Sub-field identifier within the complex type (max 70) |
| `FieldTypeParameter` | No | List ID if element is FixedList/MultiSelectList |
| `Label` | No | max 200 |
| `HintText` | No | |
| `Hidden` | No | Boolean |
| `SecurityClassification` | No | |
| `Searchable` | No | Boolean (default `true`) |
| `FieldShowCondition` | No | Condition based on sibling fields within the same complex type |
| `DisplayOrder` | No | |
| `DisplayContextParameter` | No | |
| `RetainHiddenValue` | No | `Yes`/`True` retains value when hidden; default is `No`/`False` |
| `RegularExpression` | No | Overrides built-in type regex |
| `Min` / `Max` | No | Value length constraints |
| `CategoryID` | No | Document category (for Document/Collection of Document fields only) |

Validation: no cyclic references allowed; complex type IDs must not clash with base type names (e.g. cannot create a ComplexType named `Date` or `Email`).

Source: `ColumnName.java:174–176`, `ComplexFieldEntity.java:32–70`.

## FixedLists

Sheet name: `FixedLists` | DB table: `field_type_list_item` (parent type stored in `field_type`)

| Column | Required | Notes |
|---|---|---|
| `ID` | Yes (parent) | The type name (e.g. `MyStatus`; max 40) |
| `ListElementCode` | Yes | Stored value (max 150) |
| `ListElement` | Yes | Display label (max 250) |
| `DisplayOrder` | No | Sort order for list items |
| `LiveFrom` / `LiveTo` | No | |

The parent `field_type` row has `base_field_type_id` referencing `FixedList`, `MultiSelectList`, or `FixedRadioList` (`FieldTypeEntity.java:87–89`, `ColumnName.java:172–173`).

Validation: `ID` + `ListElementCode` must be universally unique in the definition store.

## CaseRoles

Sheet name: `CaseRoles` | DB table: `case_role`

Allows multiple users with the same IDAM role to have different field permissions per case.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `ID` | No | Case role identifier (max 70); must be pre-registered in definition store |
| `Name` | No | Title (max 70) |
| `Description` | No | max 128 |
| `LiveFrom` / `LiveTo` | No | |

Source: `SheetName.java:12`, `ColumnName.java:197–198`.

## RoleToAccessProfiles

Sheet name: `RoleToAccessProfiles`

Maps Role Assignment service roles to CCD AccessProfiles.

| Column | Required | Notes |
|---|---|---|
| `CaseTypeID` | Yes | |
| `RoleName` | Yes | Name of role from Role Assignment service. Not in `ColumnName.isRequired`, so the blank check comes from `RoleToAccessProfilesValidator` instead |
| `ReadOnly` | No | `True`/`Yes`/`T`/`Y` matches readonly roles; else `False`/`No`/`N`/`F`/`NULL` |
| `AccessProfiles` | Yes | Comma-separated list of AccessProfiles to assign. Blank check as for `RoleName` |
| `Authorisation` | No | Comma-separated authorisation identifiers required |
| `CaseAccessCategories` | No | Comma-separated category patterns (max 1000) |
| `Disabled` | No | `True`/`Yes`/`T`/`Y` disables the mapping |
| `LiveFrom` / `LiveTo` | No | |

Every value in `AccessProfiles` must already exist as a registered access profile, or the whole import is rejected with `Access Profile '<name>' not found in column 'AccessProfiles' in the sheet 'RoleToAccessProfiles'` (`RoleToAccessProfilesValidator.java:53-64`). The candidate set is loaded once from the `role` table at the start of the import (`ImportServiceImpl.java:183`), so a profile created mid-import is not visible; register it beforehand through `POST /api/user-role` (`UserRoleController.java:35,:39,:64-78`), which Admin Web calls on the operator's behalf. `RoleName` and `AccessProfiles` are both rejected when blank, and `(RoleName, CaseTypeID, CaseAccessCategories)` must be unique across the sheet (`:26-43`, `:67-80`).

Source: `SheetName.java:32`, `ColumnName.java:99–103`, `RoleToAccessProfilesValidator.java`, `UserRoleController.java`.

## Validation behaviour

### Structural validation

- `SpreadsheetValidator.validate()` runs structural checks before any DB writes: exactly one Jurisdiction row; at least one CaseType row; `CaseField`, `ComplexTypes`, and `FixedList` sheets must be present (`SpreadsheetValidator.java:43–96`).
- Column max-lengths are checked per-cell against `SpreadSheetValidationMappingEnum`.
- Import fails with HTTP 400/422 on any validation error via `InvalidImportException` or `MapperException`.

### Uniqueness rules

| Sheet | Compound key (must be unique per jurisdiction version) |
|---|---|
| Jurisdiction | `ID` (universally unique) |
| CaseType | `ID` (universally unique across all jurisdictions) |
| CaseField | `ID` + `CaseTypeID` |
| State | `ID` + `CaseTypeID` |
| CaseEvent | `ID` + `CaseTypeID` |
| CaseEventToFields | `CaseEventID` + `CaseFieldID` + `CaseTypeID` |
| SearchInputFields | `CaseFieldID` + `CaseTypeID` |
| SearchResultFields | `CaseFieldID` + `CaseTypeID` |
| WorkBasketInputFields | `CaseFieldID` + `CaseTypeID` |
| CaseTypeTab | `TabID` + `Channel` + `CaseTypeID` |
| FixedLists | `ID` + `ListElementCode` |
| ComplexTypes | `ID` (universally unique; must not match base type names) |

### ID format rules

- All IDs: alphanumeric plus underscore only (`a-z`, `A-Z`, `0-9`, `_`)
- Maximum length: typically 70 characters for most IDs (40 for some legacy FKs)

### Cross-sheet FK validation

- `CaseField.CaseTypeID` must match a CaseType `ID`
- `CaseField.FieldType` must be a known base type, or match a ComplexTypes `ID`, or match a FixedLists `ID`
- `CaseEvent.PreConditionState(s)` values must match State `ID` values (or be empty/`*`)
- `CaseEvent.PostConditionState` must match a State `ID` (or `*`)
- `CaseEventToFields.CaseFieldID` must match CaseField `ID` for the same CaseTypeID
- `CaseTypeTab.CaseFieldID` must match CaseField `ID` or be a metadata field name

### Other validation rules

- `DisplayContextParameter` values (`#TABLE(...)`, `#DATETIMEDISPLAY(...)`) validated by `DisplayContextParameterValidator`.
- A field with `RetainHiddenValue=Yes` must also have a `ShowCondition` (`HiddenFieldsValidator.java:206–213`).
- `LiveFrom` must be less than `LiveTo` when both are present.
- `DisplayOrder` must be numeric and >= 0 where present.
- Same `TabID` entries must have the same `TabDisplayOrder` value.
- ComplexTypes must not form cyclic references.
- Changing a field's `FieldType` after a previous import will fail with an Elasticsearch indexing error; requires CCD team intervention to reset the field index.

<!-- DIVERGENCE: Confluence (page 205750327) states Global_4 "All ID and ID Foreign Keys are maximum 40 in length" but source code (CaseFieldEntity, EventEntity) stores references as varchar(70) and the Confluence glossary (207804327) itself says "Max. length 70" for most IDs. The 40-char rule appears outdated. Source wins: 70 is the current limit for most IDs. -->

## Field type regex defaults

Exactly **two** base types carry a built-in regex. They are seeded into the `regular_expression` column of `field_type` by the base migration — every other base type inserts with that column left null (`V0001__Base_version.sql:2522–2722`):

| Field type | Default regex | Source |
|---|---|---|
| `Postcode` | `^([A-PR-UWYZ0-9][A-HK-Y0-9][AEHMNPRTVXY0-9]?[ABEHMNPRVWXY0-9]? {1,2}[0-9][ABD-HJLN-UW-Z]{2}\|GIR 0AA)$` | `V0001__Base_version.sql:2540–2542` |
| `PhoneUK` | `^(((\+44\s?\d{4}\|\(?0\d{4}\)?)\s?\d{3}\s?\d{3})\|((\+44\s?\d{3}\|\(?0\d{3}\)?)\s?\d{3}\s?\d{4})\|((\+44\s?\d{2}\|\(?0\d{2}\)?)\s?\d{4}\s?\d{4}))(\s?\#(\d{4}\|\d{3}))?$` | `V0001__Base_version.sql:2547–2549` |

The type is spelled `Postcode`, lowercase `c` — `PostCode` is not a registered base type. See [Field types](field-types.md) for the full base-type list.

`Email`, `Date`, `DateTime` and `MoneyGBP` insert with **no** `regular_expression` (`:2529`, `:2535`, `:2545`). Their validation is not regex-based — it lives in the data-store's per-type `BaseTypeValidator` implementations (`uk.gov.hmcts.ccd.domain.types.*Validator`). `MoneyGBP` in particular is a **JSON string of whole pence** parsed with `Long.valueOf`; a non-integer value fails with "Money GBP needs to be expressed in pence", and `Min`/`Max` are compared in pence but reported back to the user formatted as sterling (`MoneyGBPValidator.java:33-72`). Do not expect a pattern on these rows in `field_type`.

A `RegularExpression` value on `CaseField` or `ComplexTypes` overrides the built-in regex for that instance.

## All sheet names (canonical)

The `SheetName` enum defines 32 valid sheets:

| Enum constant | Sheet name |
|---|---|
| `JURISDICTION` | `Jurisdiction` |
| `CASE_TYPE` | `CaseType` |
| `CASE_FIELD` | `CaseField` |
| `COMPLEX_TYPES` | `ComplexTypes` |
| `FIXED_LISTS` | `FixedLists` |
| `STATE` | `State` |
| `CASE_EVENT` | `CaseEvent` |
| `CASE_EVENT_TO_FIELDS` | `CaseEventToFields` |
| `CASE_EVENT_TO_COMPLEX_TYPES` | `EventToComplexTypes` |
| `CASE_TYPE_TAB` | `CaseTypeTab` |
| `CASE_ROLE` | `CaseRoles` |
| `WORK_BASKET_INPUT_FIELD` | `WorkBasketInputFields` |
| `WORK_BASKET_RESULT_FIELDS` | `WorkBasketResultFields` |
| `SEARCH_INPUT_FIELD` | `SearchInputFields` |
| `SEARCH_RESULT_FIELD` | `SearchResultFields` |
| `SEARCH_CASES_RESULT_FIELDS` | `SearchCasesResultFields` |
| `USER_PROFILE` | `UserProfile` |
| `AUTHORISATION_CASE_TYPE` | `AuthorisationCaseType` |
| `AUTHORISATION_CASE_FIELD` | `AuthorisationCaseField` |
| `AUTHORISATION_CASE_EVENT` | `AuthorisationCaseEvent` |
| `AUTHORISATION_CASE_STATE` | `AuthorisationCaseState` |
| `AUTHORISATION_COMPLEX_TYPE` | `AuthorisationComplexType` |
| `SEARCH_ALIAS` | `SearchAlias` |
| `BANNER` | `Banner` |
| `CHALLENGE_QUESTION_TAB` | `ChallengeQuestion` |
| `ROLE_TO_ACCESS_PROFILES` | `RoleToAccessProfiles` |
| `ACCESS_TYPE` | `AccessType` |
| `ACCESS_TYPE_ROLE` | `AccessTypeRole` |
| `SEARCH_PARTY` | `SearchParty` |
| `SEARCH_CRITERIA` | `SearchCriteria` |
| `CATEGORY` | `Categories` |
| `SHELL_MAPPING` | `ShellMapping` |

Source: `SheetName.java:7–38`.

### `ShellMapping`

Added 2026-07-29 (`SheetName.java:38`, commit `77b362ce` "CCD-6807: Create a new table shell_mapping"). The sheet declares, per case type, which fields survive onto a *shell* case when the originating case is disposed — the retain-and-dispose counterpart to `ccd-case-disposer`.

The sheet is **optional**: `ImportServiceImpl.parseShellMapping()` no-ops when the sheet is absent (`ImportServiceImpl.java:470-480`).

| Column | Meaning | Validation |
| --- | --- | --- |
| `LiveFrom` / `LiveTo` | Validity window | Parsed but not validated |
| `ShellCaseTypeID` | Case type of the shell case | Required; must be a `CaseType` ID in the same import; max 70 (`SpreadSheetValidationMappingEnum.java:65`) |
| `ShellCaseFieldName` | Target field on the shell case type | Required; must be a `CaseField` of `ShellCaseTypeID`; max 70 (`:66`) |
| `OriginatingCaseTypeID` | Case type the shell case is defined for | Required; must be a `CaseType` ID; max 70 (`:67`) |
| `OriginatingCaseFieldName` | Source field on the originating case type | Required; must be a `CaseField` of `OriginatingCaseTypeID`; max 70 (`:68`) |

Two import-time rules beyond the reference checks (`ShellMappingParser.java`):

- **Shell and originating case type must differ** — compared case-insensitively; a match fails with "Originating Case Type: '…' and Shell Case Type: '…' are same in the sheet 'ShellMapping'".
- **`(ShellCaseTypeID, ShellCaseFieldName)` must be unique** across the sheet — a repeat fails with "Duplicate combination of ShellCaseTypeID '…' and ShellCaseFieldName '…' found in the sheet 'ShellMapping'". Note the pair does *not* include the originating side, so two originating case types cannot both map into the same shell field.

Rows land in the `shell_mapping` table (`ShellMappingEntity.java:19`) and are readable through `GET /api/retrieve-shell-mappings/{originalCaseTypeId}` — keyed on the **originating** case type, not the shell one (`ShellMappingController.java:27`, `:34-46`).

## See also

- [First case type (JSON form)](../tutorials/first-case-type-json.md) — tutorial that walks through authoring a definition using these sheets
- [Definition import](../explanation/definition-import.md) — how the import pipeline processes these sheets end-to-end
- [Permissions matrix](permissions-matrix.md) — ACL model detail and CRUD string semantics
- [Field types](field-types.md) — base field type reference
- [RetainHiddenValue explanation](../explanation/retain-hidden-value.md) — in-depth explanation of the `RetainHiddenValue` column used in `CaseEventToFields`, `ComplexTypes`, and `CaseField` sheets
- [Use RetainHiddenValue](../how-to/use-retain-hidden-value.md) — how-to guide for setting the flag in both JSON and SDK form

## Glossary

See [Glossary](glossary.md) for term definitions used in this page.
