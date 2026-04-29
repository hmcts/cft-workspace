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
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/EventEntity.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# First Case Type (JSON)

## TL;DR

- A CCD case-type definition is a folder of JSON shards — one file per sheet — imported as a `.xlsx` bundle via `POST /import` on `ccd-definition-store-api`.
- The minimum viable set is: `CaseField.json`, `CaseEvent.json`, `CaseEventToFields.json`, `AuthorisationCaseEvent.json`, `AuthorisationCaseField.json`, `AuthorisationCaseType.json`, `CaseTypeTab.json`, and `State.json`.
- CRUD permissions are a string (`"CRU"`, `"R"`, etc.) mapped per `UserRole` in the `Authorisation*` files; missing ACL entries mean the role cannot see the resource at all.
- Import is not idempotent on field types — re-importing appends new types rather than replacing them (`ImportServiceImpl.java:182`).
- Use ccd-admin-web to drive the `POST /import` endpoint; it wraps the multipart file upload and renders validation errors.

---

## Prerequisites

- A running `ccd-definition-store-api` and `ccd-admin-web` (local or AAT).
- An IDAM service token that `ccd-definition-store-api` will accept.
- Python 3 or Node.js to bundle JSON shards into `.xlsx` — the definition store ships no bundler of its own; the BEFTA test suite uses a Gradle task, and many teams use [ccd-definition-processor](https://github.com/hmcts/ccd-definition-processor).

---

## Step 1 — Create the folder structure

The definition store expects one folder per case type, inside a jurisdiction folder:

```
my-jurisdiction/
  my-case-type/
    CaseField.json
    CaseEvent.json
    CaseEventToFields.json
    AuthorisationCaseType.json
    AuthorisationCaseEvent.json
    AuthorisationCaseField.json
    State.json
    CaseTypeTab.json
```

The folder names become the `JurisdictionID` and `CaseTypeID` values you reference inside each file. They must be consistent — a mismatch causes a `MapperException` at import time (`AuthorisationParser.java:67–73`).

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

`FieldType` must match a base type known to the definition store (`Text`, `Number`, `MoneyGBP`, `Date`, `DateTime`, `YesOrNo`, `Document`, `Email`, `TextArea`, etc.) or a custom complex/fixed-list type defined in a `ComplexTypes.json` or `FixedLists.json` shard in the same bundle.

`SecurityClassification` is required; use `Public`, `Private`, or `Restricted`.

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

`PostConditionState` must reference a state ID defined in `State.json`. `PreConditionState(s)` accepts `*` (any state) or a comma-separated list of state IDs.

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

`DisplayContext` must be one of `READONLY`, `OPTIONAL`, `MANDATORY`, or `COMPLEX` (`EventCaseFieldEntity.java:48`).

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

### `AuthorisationCaseType.json`

Minimum fields: `LiveFrom`, `CaseTypeID`, `UserRole`, `CRUD` (`ColumnName.java`).

```json
[
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "UserRole": "caseworker-myservice",
    "CRUD": "CRU"
  }
]
```

### `AuthorisationCaseEvent.json`

One row per role-per-event. Minimum fields: `LiveFrom`, `CaseTypeID`, `CaseEventID`, `UserRole`, `CRUD` (`AuthorisationCaseEvent.json:2–7` in `CCD_CNP_27/AAT`).

```json
[
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "CaseEventID": "createCase",
    "UserRole": "caseworker-myservice",
    "CRUD": "CRU"
  },
  {
    "LiveFrom": "01/01/2020",
    "CaseTypeID": "MyCaseType",
    "CaseEventID": "updateCase",
    "UserRole": "caseworker-myservice",
    "CRUD": "CRU"
  }
]
```

### `AuthorisationCaseField.json`

One row per role-per-field. Required: `CaseTypeID`, `CaseFieldID`, `AccessProfile`, `CRUD` (`ColumnName.java:203–208`).

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
    "UserRole": "caseworker-myservice",
    "CRUD": "CRU"
  }
]
```

CRUD values seen in test definitions: `"CRU"`, `"R"`, `"CRUD"`. The parser accepts any subset of those four characters, case-insensitive (`AuthorisationParser.java:37–46`). A role that has no row for a field cannot see that field at all.

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

1. Open ccd-admin-web in your browser (e.g. `http://localhost:3100`).
2. Navigate to **Import definition**.
3. Choose `my-definition.xlsx` and click **Upload**.
4. On success the UI shows the jurisdiction and case types from `DefinitionFileUploadMetadata` returned by the API.

### Import via curl (direct)

```bash
curl -X POST \
  http://localhost:4451/import \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -F "file=@my-definition.xlsx"
```

The endpoint is `POST /import` on `ImportController.java:62`. It accepts `multipart/form-data` with a single `file` param. Optional query params: `reindex` (bool, default `false`) and `deleteOldIndex` (bool, default `false`).

A `400` or `422` response means validation failed — `SpreadsheetValidator` or a domain validator rejected the definition (`ImportServiceImpl.java:184`). The response body contains the validation message.

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
| `exactly one Jurisdiction row` | `Jurisdiction.json` missing or has zero/multiple rows (`SpreadsheetValidator.java:43`) |
| Field not visible to role | No `AuthorisationCaseField` row for that role + field combination |
| `Invalid CRUD` | CRUD string contains characters other than `C`, `R`, `U`, `D` (`CrudValidator.java:12`) |
| `PostConditionState` not found | State ID in `CaseEvent.json` does not match any row in `State.json` |

---

## See also

- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions of CaseType, CaseField, ACL, DisplayContext
- [`docs/ccd/explanation/case-type-model.md`](../explanation/case-type-model.md) — conceptual overview of the definition model

## Glossary

| Term | Meaning |
|---|---|
| `CRUD` string | Permission mask; each character grants Create, Read, Update, or Delete access for a given role on a given resource |
| `DisplayContext` | How a field appears on an event wizard: `READONLY`, `OPTIONAL`, `MANDATORY`, or `COMPLEX` |
| `SheetName` | Enum in `ccd-definition-store-api` listing the 31 recognised `.xlsx` tab names (`SheetName.java:7-37`); JSON shard filenames must match exactly |
