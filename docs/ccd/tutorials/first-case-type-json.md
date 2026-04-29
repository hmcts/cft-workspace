---
topic: tutorial-json
audience: both
sources:
  - ccd-test-definitions:src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseEvent.json
  - ccd-test-definitions:src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/CCD_CNP_27/AAT/AuthorisationCaseField.json
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/endpoint/ImportController.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/EventParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/AuthorisationParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/SpreadsheetValidator.java
  - ccd-definition-store-api:domain/src/main/java/uk/gov/hmcts/ccd/definition/store/domain/validation/authorization/CrudValidator.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/EventEntity.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "688685210"
    title: "CCD Case Admin Web User Guide"
    space: "RCCD"
  - id: "205750327"
    title: "CCD - Import Domain - Validation Rules"
    space: "RCCD"
  - id: "207804327"
    title: "CCD Definition Glossary for Setting up a Service in CCD"
    space: "RCCD"
  - id: "1063059491"
    title: "Definition import fails with a \"422 Unprocessible Entity\" error"
    space: "RCCD"
  - id: "203951529"
    title: "CCD - Import Case Definition Domain"
    space: "RCCD"
---

# First Case Type (JSON)

## TL;DR

- A CCD case-type definition is a folder of JSON shards — one file per sheet — imported as a `.xlsx` bundle via `POST /import` on `ccd-definition-store-api`.
- Five sheets are validated as **mandatory** at import time: `Jurisdiction`, `CaseType`, `CaseField`, `ComplexTypes`, `FixedLists` (`SpreadsheetValidator.java:43–97`). The last two may be empty stubs but the sheet itself must exist.
- A working minimal set adds: `CaseEvent.json`, `CaseEventToFields.json`, `State.json`, `AuthorisationCaseType.json`, `AuthorisationCaseEvent.json`, `AuthorisationCaseField.json`, `CaseTypeTab.json`.
- CRUD permissions are a string (`"CRU"`, `"R"`, etc.) mapped per `AccessProfile` (the canonical column name; `UserRole` is accepted as a backward-compatible alias — `ColumnName.java:9`). Missing ACL entries mean the role cannot see the resource at all.
- Import is not idempotent on field types — re-importing appends new types rather than replacing them (`ImportServiceImpl.java:182`).
- Use `ccd-admin-web` to drive the `POST /import` endpoint; it wraps the multipart file upload and renders validation errors. The importing user needs the IDAM role **`ccd-import`**.

---

## Prerequisites

- A running `ccd-definition-store-api` and `ccd-admin-web` (local or AAT).
- An IDAM service token that `ccd-definition-store-api` will accept.
- Python 3 or Node.js to bundle JSON shards into `.xlsx` — the definition store ships no bundler of its own; the BEFTA test suite uses a Gradle task, and many teams use [ccd-definition-processor](https://github.com/hmcts/ccd-definition-processor).

---

## Step 1 — Create the folder structure

The definition store expects one folder per case type, inside a jurisdiction folder. Every JSON shard filename **must** match exactly one of the 31 sheet names in `SheetName.java:7–37` — case-sensitive, no `.json` suffix on the sheet name itself.

```
my-jurisdiction/
  Jurisdiction.json           # required by SpreadsheetValidator (exactly one row)
  CaseType.json               # required (at least one row)
  my-case-type/
    CaseField.json            # required worksheet
    ComplexTypes.json         # required worksheet (may be empty array)
    FixedLists.json           # required worksheet (may be empty array)
    CaseEvent.json
    CaseEventToFields.json
    AuthorisationCaseType.json
    AuthorisationCaseEvent.json
    AuthorisationCaseField.json
    State.json
    CaseTypeTab.json
```

`SpreadsheetValidator.validate(...)` enforces five required worksheets at the start of every import: `Jurisdiction` (exactly one row), at least one `CaseType` row, and the `CaseField`, `ComplexTypes` and `FixedLists` sheets must be present (`SpreadsheetValidator.java:43–97`). The last two may be empty arrays, but the file (and corresponding `.xlsx` tab) must exist.

The folder names become the `JurisdictionID` and `CaseTypeID` values you reference inside each file. They must be consistent — a mismatch causes a `MapperException` at import time (`AuthorisationParser.java:62–73`).

CaseField IDs must be alphanumeric (`[a-z0-9_]`) — no special characters or spaces (validation rule 3.1.1, Confluence "CCD - Import Domain - Validation Rules").
<!-- CONFLUENCE-ONLY: alphanumeric ID rule documented as a validation rule but not located in source code as a regex; observed empirically -->

ComplexTypes cannot be cyclic — e.g. a `Person` complex type cannot contain a `NextOfKin` element of type `Person`. ComplexType IDs must not collide with base type names (`Date`, `Email`, etc.).
<!-- CONFLUENCE-ONLY: documented validation rule 4.2; not surfaced in the parser/validators reviewed -->


---

## Step 2 — Define fields (`CaseField.json`)

Each object in the array is one row of the `CaseField` sheet. Required columns are `ID`, `Name`, `FieldType`, and `CaseTypeID` (`ColumnName.java:159–163`).

```json
[
  {
    "LiveFrom": "01/01/2020",
    "ID": "applicantName",
    "Name": "Applicant name",
    "FieldType": "Text",
    "SecurityClassification": "Public",
    "CaseTypeID": "MyCaseType"
  },
  {
    "LiveFrom": "01/01/2020",
    "ID": "claimAmount",
    "Name": "Claim amount",
    "FieldType": "MoneyGBP",
    "SecurityClassification": "Public",
    "CaseTypeID": "MyCaseType"
  }
]
```

`FieldType` must match a base type known to the definition store or a custom complex/fixed-list type defined in a `ComplexTypes.json` or `FixedLists.json` shard in the same bundle. Common base types and notes (Confluence glossary):

| FieldType | Notes |
|---|---|
| `Text`, `TextArea`, `Number`, `Label`, `YesOrNo` | Primitive data types |
| `Date` | ISO 8601 — validated on input |
| `Email` | Validated as email |
| `MoneyGBP` | Stored as `Long` representing pennies |
| `PostCode` | Default regex: `^([A-PR-UWYZ0-9][A-HK-Y0-9][AEHMNPRTVXY0-9]?[ABEHMNPRVWXY0-9]? {1,2}[0-9][ABD-HJLN-UW-Z]{2}\|GIR 0AA)$` |
| `PhoneUK` | Default regex covers `+44` and `0` prefix forms |
| `FixedList`, `MultiSelectList` | `FieldTypeParameter` must reference an ID on the `FixedLists` sheet |
| `Collection` | `FieldTypeParameter` is the element type — e.g. `Text`, `Document`, or a complex type ID |
| `Document` | Document field; `CategoryID` (optional) must match `Categories.CategoryID` for that case type |
| Complex type ID | Use the ID from `ComplexTypes`. Set `FieldTypeParameter` to `EXPAND` to render with the expand widget |

For `RegularExpression`, supplying a value on the `CaseField` row overrides the default regex for that base type. For complex types the regex is taken from the `ComplexTypes` row.

`SecurityClassification` is required; use `Public`, `Private`, or `Restricted`. The hierarchy applied at runtime is `CaseType → CaseEvent → ComplexType (when bound to a case field) → CaseField` (Confluence glossary).

---

## Step 3 — Define events (`CaseEvent.json`)

Required columns: `ID`, `Name`, `CaseTypeID` (`ColumnName.java:156–158`).

```json
[
  {
    "LiveFrom": "01/01/2020",
    "ID": "createCase",
    "Name": "Create case",
    "Description": "Opens a new claim",
    "CaseTypeID": "MyCaseType",
    "PostConditionState": "Open",
    "SecurityClassification": "Public",
    "ShowSummary": "Y",
    "EndButtonLabel": "Submit"
  },
  {
    "LiveFrom": "01/01/2020",
    "ID": "updateCase",
    "Name": "Update case",
    "CaseTypeID": "MyCaseType",
    "PreConditionState(s)": "Open",
    "PostConditionState": "Open",
    "SecurityClassification": "Public"
  }
]
```

`PostConditionState` must reference a state ID defined in `State.json`. `PreConditionState(s)` semantics (`EventParser.java:113–126`):

- **Blank** — the event is a *create* event (no preceding state). The case is created when the event is triggered.
- **`*`** — the event applies in any state but is **not** a create event (`canCreate=false`).
- **`State1;State2`** — semicolon-separated list of state IDs. The event is allowed only when the case is currently in one of those states.

<!-- DIVERGENCE: Confluence "CCD Definition Glossary" describes PreConditionState as comma-separated. Source `EventParser.java:31` defines `PRE_STATE_SEPARATOR = ";"` — semicolon. Source wins. -->

`ShowSummary` is an optional boolean (`Y`, `N`, blank). When `Y` (or blank), the Event Summary & Comment block plus the "Check Your Answers" page render before submission. The "Check Your Answers" page only displays the fields whose `CaseEventToFields` row has `ShowSummaryChangeOption=Y`.
<!-- CONFLUENCE-ONLY: ShowSummary tri-value semantics documented in glossary; not asserted in source -->

`Publish` (event-level) gates whether *any* CaseField on this event can be published to the CCD message queue. If `Publish=No` on the event, no per-field `Publish=Yes` takes effect.
<!-- CONFLUENCE-ONLY: message-queue publishing rules from glossary, behaviour driven by downstream consumers -->


---

## Step 4 — Wire fields to events (`CaseEventToFields.json`)

Required columns: `CaseFieldID`, `CaseTypeID`, `CaseEventID`, `PageID` (`ColumnName.java:167–171`).

```json
[
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "CaseEventID": "createCase",
    "CaseFieldID": "applicantName",
    "PageID": "1",
    "PageLabel": "Applicant",
    "DisplayContext": "MANDATORY",
    "PageFieldDisplayOrder": 1,
    "FieldShowCondition": null
  },
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "CaseEventID": "createCase",
    "CaseFieldID": "claimAmount",
    "PageID": "1",
    "DisplayContext": "OPTIONAL",
    "PageFieldDisplayOrder": 2
  }
]
```

`DisplayContext` controls how the field appears on the event wizard. Allowed values (Confluence glossary, also implied by `EventCaseFieldEntity.java`):

| Value | Behaviour |
|---|---|
| `MANDATORY` | Field must be filled. If complex, all elements are mandatory and `EventToComplexTypes` is ignored. |
| `OPTIONAL` | Field optional; UI label gets "(Optional)" suffix. If complex, all elements optional. |
| `READONLY` | Field shown but not editable. If complex, all elements displayed. |
| `HIDDEN` | Field is always hidden — even if a `FieldShowCondition` evaluates to true. |
| `COMPLEX` | Per-element behaviour is controlled by the `EventToComplexTypes` sheet. There must be at least one corresponding `EventToComplexTypes` row, or import fails. Only listed elements display. |
<!-- CONFLUENCE-ONLY: HIDDEN and COMPLEX-with-EventToComplexTypes semantics from glossary; READONLY/OPTIONAL/MANDATORY also enforced in source -->


---

## Step 5 — Define a state (`State.json`)

```json
[
  {
    "LiveFrom": "01/01/2020",
    "ID": "Open",
    "Name": "Open",
    "SecurityClassification": "Public",
    "CaseTypeID": "MyCaseType"
  }
]
```

---

## Step 6 — Set permissions

The role-or-access-profile column is canonically named **`AccessProfile`**, with `UserRole` accepted as a backward-compatible alias (`ColumnName.java:9` — `ACCESS_PROFILE("AccessProfile", new String[]{"UserRole"})`). Both are required on every Authorisation* sheet. Older spreadsheets used `UserRole`; newer ones may use either. The Confluence glossary still labels these columns `UserRole` in places — the import accepts both spellings.

The role IDs themselves must already exist in IDAM **and** be replicated in the definition store before import (otherwise import fails with a missing-role error). IDAM roles are case-sensitive; convention is **all-lowercase**. A role like `Caseworker-myservice` will fail to match `caseworker-myservice` in IDAM (Confluence "Definition import fails with a 422 Unprocessible Entity").

### `AuthorisationCaseType.json`

Required fields: `CaseTypeID`, `AccessProfile` (or `UserRole`), `CRUD` (`ColumnName.java:199–202`).

```json
[
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "AccessProfile": "caseworker-myservice",
    "CRUD": "CRU"
  }
]
```

### `AuthorisationCaseEvent.json`

One row per role-per-event. Required fields: `CaseTypeID`, `CaseEventID`, `AccessProfile` (or `UserRole`), `CRUD` (`ColumnName.java:208–212`).

```json
[
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "CaseEventID": "createCase",
    "AccessProfile": "caseworker-myservice",
    "CRUD": "CRU"
  },
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "CaseEventID": "updateCase",
    "AccessProfile": "caseworker-myservice",
    "CRUD": "CRU"
  }
]
```

### `AuthorisationCaseField.json`

One row per role-per-field. Required: `CaseTypeID`, `CaseFieldID`, `AccessProfile` (or `UserRole`), `CRUD` (`ColumnName.java:203–207`).

```json
[
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "CaseFieldID": "applicantName",
    "AccessProfile": "caseworker-myservice",
    "CRUD": "CRU"
  },
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "CaseFieldID": "claimAmount",
    "AccessProfile": "caseworker-myservice",
    "CRUD": "CRU"
  }
]
```

The CRUD column is validated by the regex `^[CRUDcrud\s]{1,5}$` (`CrudValidator.java:12`) — case-insensitive, between 1 and 5 characters, may contain whitespace. Common values: `"C"`, `"R"`, `"CRU"`, `"CRUD"`. Order does not matter; `"DRC"` is equivalent to `"CRD"`. The parser sets create/read/update/delete booleans by `contains("C")`, `contains("R")`, `contains("U")`, `contains("D")` against the upper-cased string (`AuthorisationParser.java:37–46`). A role that has no row for a field cannot see that field at all.

---

## Step 7 — Configure a case view tab (`CaseTypeTab.json`)

Required columns: `CaseTypeID`, `TabID`, `CaseFieldID` (`ColumnName.java:195–198`).

```json
[
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "TabID": "claimDetails",
    "TabLabel": "Claim details",
    "TabDisplayOrder": 1,
    "CaseFieldID": "applicantName",
    "TabFieldDisplayOrder": 1
  },
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "TabID": "claimDetails",
    "TabLabel": "Claim details",
    "TabDisplayOrder": 1,
    "CaseFieldID": "claimAmount",
    "TabFieldDisplayOrder": 2
  }
]
```

`TabID` groups rows into a single tab. `TabDisplayOrder` controls left-to-right tab order. Each row is stored in `display_group_case_field`; the group header goes into `display_group` with `type=TAB`, `purpose=VIEW` (`DisplayGroupEntity.java:54–59`).

Validation rules specific to this sheet (Confluence "CCD - Import Domain - Validation Rules"):

- `(TabID, Channel, CaseTypeID)` is the compound uniqueness key — every row in a single tab must share the same `TabDisplayOrder` (rule 11.6). If you put two rows with the same `TabID` but different `TabDisplayOrder` values, import fails.
- `TabDisplayOrder` and `TabFieldDisplayOrder`, if present, must be numeric and ≥ 0 (rules 11.3, 11.4).

Optional columns:

- `UserRole` — IDAM or case role to scope the tab to a specific user. Blank means the tab applies to anyone without a more-specific mapping. Max length 100.
- `DefaultFocus` — at most one tab per case type may have this set; that tab loads in focus regardless of `TabDisplayOrder`.
- `TabShowCondition` — show-hide expression on the tab itself (similar to `FieldShowCondition`).
<!-- CONFLUENCE-ONLY: UserRole/DefaultFocus/TabShowCondition columns documented in glossary; not exhaustively cross-checked in source -->


---

## Step 8 — Bundle and import

### Bundle JSON shards into `.xlsx`

The definition store's `POST /import` endpoint accepts only `.xlsx`. Convert your JSON shards using [ccd-definition-processor](https://github.com/hmcts/ccd-definition-processor):

```bash
cd ccd-definition-processor
yarn install
node index.js generate-excel \
  --definition-dir ../my-jurisdiction \
  --output-file my-definition.xlsx
```

### Import via ccd-admin-web

The importing user must hold the IDAM role **`ccd-import`** — admin-web hides the import menu otherwise (Confluence "CCD Case Admin Web User Guide").

1. Open ccd-admin-web in your browser (e.g. `http://localhost:3100`).
2. Log on with admin credentials.
3. Choose **Import Case Definition** from the menu.
4. Click **Browse...**, select `my-definition.xlsx`, then click **Submit**.
5. On success: "Case definition data successfully imported".
6. On failure: the validation error renders inline. Note it in your ticket and return to the requestor.

If the error refers to a *missing role*, the role exists in IDAM but has not yet been registered in the definition store. Use the admin-web **Manage User Roles → Create User Role** screen to register the role under the same name (case-sensitive) before re-importing.

### Import via curl (direct)

```bash
curl -X POST \
  http://localhost:4451/import \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -F "file=@my-definition.xlsx"
```

The endpoint is `POST /import` on `ImportController.java:42`. It accepts `multipart/form-data` with a single `file` param. Optional query params: `reindex` (bool, default `false`) and `deleteOldIndex` (bool, default `false`). On success it returns **HTTP 201 Created** (`ImportController.java:45`) — not 200 — with a `DefinitionFileUploadMetadata` body and an optional `Definition-Import-Warnings` header.

Documented response codes (`ImportController.java:44–60`):

| Status | Meaning |
|---|---|
| 201 | Successfully created |
| 400 | Missing required worksheet (Jurisdiction / CaseType / CaseField / ComplexTypes / FixedLists), invalid sheet (no name in cell A1), or invalid `DisplayContextParameter` |
| 401 | Unauthorized (no/invalid bearer) |
| 403 | Forbidden |
| 404 | Not found |
| 422 | Unprocessable entity — domain validation failed (FK violations, undefined roles, undeclared FixedList/ComplexType, etc.) |
| 500 | Internal server error |

A 422 typically means the message body contains the offending row reference. Re-check field IDs, FixedList/ComplexType references, and that every IDAM role referenced on an Authorisation* sheet has a matching record in IDAM (lowercase) and in the definition store (Confluence "Definition import fails with a 422 Unprocessible Entity").

---

## Verify

1. After a successful import, call the definition store directly:

   ```bash
   curl http://localhost:4451/api/data/case-type/MyCaseType \
     -H "Authorization: Bearer $SERVICE_TOKEN"
   ```

   The response should include your fields and events in the `case_fields` and `events` arrays.

2. In ExUI (or CCD UI), log in as a user with the `caseworker-myservice` role, navigate to the jurisdiction, and confirm the **Create case** button is visible and the wizard shows `applicantName` and `claimAmount` on page 1.

---

## Common errors

| Error | Cause |
|---|---|
| `A definition must contain a CaseField sheet` | JSON shard file name does not exactly match the sheet name (`SheetName.java`) |
| `A definition must contain a Complex Types worksheet` | `ComplexTypes.json` missing — provide an empty array if you have no complex types (`SpreadsheetValidator.java:85–90`) |
| `A definition must contain a Fixed List worksheet` | `FixedLists.json` missing — provide an empty array if unused (`SpreadsheetValidator.java:92–97`) |
| `A definition must contain exactly one Jurisdiction` | `Jurisdiction.json` missing or has zero/multiple rows (`SpreadsheetValidator.java:64–69`) |
| `A definition must contain at least one Case Type` | `CaseType.json` missing or empty (`SpreadsheetValidator.java:71–76`) |
| Field not visible to role | No `AuthorisationCaseField` row for that role + field combination |
| `Invalid CRUD` | CRUD string contains characters other than `C`, `R`, `U`, `D` or whitespace (`CrudValidator.java:12`) |
| `PostConditionState` not found | State ID in `CaseEvent.json` does not match any row in `State.json` |
| Missing IDAM role | A role used on an Authorisation* sheet does not exist in CCD's user-role store. Register it via admin-web **Manage User Roles → Create User Role** (must match IDAM exactly, lowercase) |
| `Same TabId should have same TabDisplayOrder` | Two `CaseTypeTab` rows share a `TabID` but disagree on `TabDisplayOrder` (validation rule 11.6) |
| Capitalised role name fails on import | IDAM role names are case-sensitive and conventionally **lowercase** — `Caseworker-x` won't resolve `caseworker-x` (Confluence 1063059491) |
| Cyclic `ComplexTypes` | A complex type references itself directly or transitively (validation rule 4.2) |

---

## See also

- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions of CaseType, CaseField, ACL, DisplayContext
- [`docs/ccd/explanation/case-type-model.md`](../explanation/case-type-model.md) — conceptual overview of the definition model
- Confluence: "CCD Definition Glossary for Setting up a Service in CCD" (page 207804327) — column-by-column reference for every spreadsheet tab
- Confluence: "CCD - Import Domain - Validation Rules" (page 205750327) — the canonical numbered list of validation rules
- Confluence: "CCD Case Admin Web User Guide" (page 688685210) — admin-web walkthrough for the import flow
- Confluence: "Definition import fails with a 422 Unprocessible Entity error" (page 1063059491) — troubleshooting checklist

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

