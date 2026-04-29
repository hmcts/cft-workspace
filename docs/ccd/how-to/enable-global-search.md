---
topic: search
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/search/global/GlobalSearchServiceImpl.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/processor/GlobalSearchProcessorService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/std/GlobalSearchEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/globalsearch/SearchCriteria.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/globalsearch/SearchParty.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/SearchCriteriaValidator.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/SearchCasesResultFieldEntity.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/DisplayApiController.java
status: reviewed
last_reviewed: "2026-04-29T00:00:00Z"
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_GlobalSearch_AC_1/CaseField.json
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/common/SearchParty.json
---

# Enable Global Search

## TL;DR

- Global Search lets caseworkers find cases across jurisdictions from a single XUI screen via `POST /globalSearch`.
- To opt in, add a `SearchCriteria` complex field and one or more `SearchParty` entries to your case type definition.
- `GlobalSearchProcessorService.populateGlobalSearchData` runs at case-save time: it reads `SearchParty` / `OtherCaseReference` values from case data and writes structured `SearchCriteria` collection entries that Elasticsearch indexes.
- Column sets for the XUI results panel are configured in the `SearchCasesResultFields` definition sheet with a `UseCase` value (e.g. `GLOBAL_SEARCH`).
- Elasticsearch must be enabled (`ELASTIC_SEARCH_ENABLED=true`); the index is seeded by definition-store on definition import.

## Steps

### 1. Add the `SearchCriteria` complex field to your case type

In the **CaseField** sheet, add a row for the built-in complex type `SearchCriteria`:

| CaseTypeID    | ID             | Name           | FieldType      | SecurityClassification |
|---------------|----------------|----------------|----------------|------------------------|
| `MY_CASE_TYPE` | `SearchCriteria` | Search Criteria | `SearchCriteria` | Public                 |

The `SearchCriteria` complex type is predefined by the platform. You do not define its sub-fields — reference it by name only.

### 2. Grant ACLs on `SearchCriteria`

In the **AuthorisationCaseField** sheet, grant at minimum `R` (read) access to every access profile that will use Global Search. The data-store processor writes this field on save, so service accounts that submit events also need `CRU`:

| CaseTypeID     | CaseFieldID      | AccessProfile    | CRUD |
|----------------|------------------|------------------|------|
| `MY_CASE_TYPE` | `SearchCriteria` | caseworker-myservice | CRUD |
| `MY_CASE_TYPE` | `SearchCriteria` | caseworker-myservice-solicitor | R |

### 3. Define `SearchParty` entries in the `SearchParty` sheet

Each row maps a named party in your case data to the platform's indexed party fields. The sheet columns are:

| Column             | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `CaseTypeID`       | Your case type reference                                                    |
| `SearchPartyName`  | Dot-notation path to the party's name field (e.g. `applicant.fullName`)    |
| `SearchPartyEmailAddress` | Dot-notation path to email                                           |
| `SearchPartyAddressLine1` | Dot-notation path to first address line                               |
| `SearchPartyPostCode`     | Dot-notation path to postcode                                         |
| `SearchPartyDOB`          | Dot-notation path to date-of-birth                                    |
| `SearchPartyCollectionFieldName` | Top-level collection field whose items contain the paths above   |

Example — a case type with an `applicant` complex field:

| CaseTypeID     | SearchPartyName       | SearchPartyEmailAddress       | SearchPartyPostCode            | SearchPartyCollectionFieldName |
|----------------|-----------------------|-------------------------------|--------------------------------|-------------------------------|
| `MY_CASE_TYPE` | `applicant.firstName` | `applicant.emailAddress`      | `applicant.address.postCode`  |                               |

If your parties live inside a collection, set `SearchPartyCollectionFieldName` to the collection field ID and use paths relative to the collection item.

`SearchCriteriaValidator` enforces that every dot-notation path resolves to a real field at import time (`SearchCriteriaValidator.java:24`).

### 4. Configure `OtherCaseReference` (optional)

If your case links to another case reference (e.g. a family case number), add a row to the **SearchCriteria** sheet:

| CaseTypeID     | OtherCaseReference              |
|----------------|---------------------------------|
| `MY_CASE_TYPE` | `linkedCaseReference`           |

`OtherCaseReference` must be a valid dot-notation path (`SearchCriteriaValidator.java:24–49`).

### 5. Add a `SearchCasesResultFields` column set

Define the columns XUI shows in Global Search results in the **SearchCasesResultFields** sheet. Each row requires a `UseCase` value; use `GLOBAL_SEARCH` for the Global Search panel:

| CaseTypeID     | CaseFieldID          | Label            | DisplayOrder | UseCase       |
|----------------|----------------------|------------------|--------------|---------------|
| `MY_CASE_TYPE` | `[CASE_REFERENCE]`   | Case reference   | 1            | GLOBAL_SEARCH |
| `MY_CASE_TYPE` | `applicantName`      | Applicant        | 2            | GLOBAL_SEARCH |
| `MY_CASE_TYPE` | `[LAST_STATE_MODIFIED_DATE]` | Last modified | 3       | GLOBAL_SEARCH |

The `use_case` param is served by `GET /api/display/search-cases-result-fields/{id}?use_case=GLOBAL_SEARCH` (`DisplayApiController.java:131–144`). `SearchCasesResultFieldEntity.useCase` stores the value (`SearchCasesResultFieldEntity.java:27`).

### 6. Import the definition

Upload the updated spreadsheet to definition-store:

```
POST /import   (multipart/form-data, file=<your-xlsx>)
```

On import, definition-store publishes `DefinitionImportedEvent`, which triggers the ES listener to upsert the index mapping for your case type. The `SearchParty` and `SearchCriteria` sheets are parsed as optional sheets after the core pipeline (`ImportServiceImpl.java:192–346`).

To force a full reindex of existing data pass `?reindex=true`:

```
POST /import?reindex=true
```

### 7. Verify Elasticsearch indexing is on

Ensure the data-store environment variable is set:

```
ELASTIC_SEARCH_ENABLED=true
```

When `false`, `GlobalSearchEndpoint` will not be reachable and `GlobalSearchProcessorService` will not populate `SearchCriteria` fields on save (`application.properties:209`).

## How the data flows at runtime

When a caseworker submits an event:

1. `CreateCaseEventService` persists the case.
2. `GlobalSearchProcessorService.populateGlobalSearchData` reads `SearchParty` config for the case type, extracts party-field values from case data, and writes them back as structured `SearchCriteria` collection entries (`GlobalSearchProcessorService:47`).
3. The updated case data is indexed by Elasticsearch.

When a caseworker uses Global Search in XUI:

1. XUI calls `POST /globalSearch` with a `GlobalSearchRequestPayload`.
2. `GlobalSearchServiceImpl` assembles an ES query and `GlobalSearchParser.filterCases` post-filters in memory (`GlobalSearchEndpoint:97`).
3. XUI renders the response columns defined in `SearchCasesResultFields` for `use_case=GLOBAL_SEARCH`.

## Verify

1. After import, confirm the ES alias exists for your case type index (typically `<caseTypeId_lowercase>_cases`).
2. Submit a test event, then query Global Search:

```http
POST /globalSearch
Content-Type: application/json
Authorization: Bearer <token>

{
  "searchCriteria": {
    "caseReferences": [],
    "parties": [
      { "partyName": "Smith" }
    ]
  },
  "searchByParty": true,
  "maxReturnRecordCount": 10,
  "startRecordNumber": 1
}
```

A `200` response containing your case in `cases[]` confirms indexing and retrieval are working.

## Example

### CaseField.json — declaring the SearchCriteria field

```json
// apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_GlobalSearch_AC_1/CaseField.json
[ {
  "LiveFrom" : "01/01/2017",
  "CaseTypeID" : "FT_GlobalSearch_AC_1",
  "ID" : "SearchCriteria",
  "Label" : "SearchCriteria",
  "FieldType" : "SearchCriteria",
  "SecurityClassification" : "Public"
} ]
```

<!-- source: apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_GlobalSearch_AC_1/CaseField.json:1-19 -->

### SearchParty.json — mapping parties to indexed fields

```json
// apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/common/SearchParty.json
[ {
  "CaseTypeId" : "FT_GlobalSearch",
  "SearchPartyCollectionFieldName" : "",
  "SearchPartyName" : "FirstName,LastName",
  "SearchPartyEmailAddress" : "Email",
  "SearchPartyAddressLine1" : "Address.AddressLine1",
  "SearchPartyPostCode" : "PostCode",
  "SearchPartyDOB" : "dateOfBirth",
  "SearchPartyDOD" : "dateOfDeath"
}, {
  "CaseTypeId" : "FT_GlobalSearch",
  "SearchPartyCollectionFieldName" : "ListOfPeople",
  "SearchPartyName" : "IndividualFirstName,IndividualLastName",
  "SearchPartyEmailAddress" : "IndividualEmail",
  "SearchPartyAddressLine1" : "IndividualAddress.AddressLine1",
  "SearchPartyPostCode" : "IndividualAddress.PostCode",
  "SearchPartyDOB" : "IndividualDateOfBirth",
  "SearchPartyDOD" : "IndividualDateOfDeath"
} ]
```

<!-- source: apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/common/SearchParty.json:166-210 -->

## See also

- [Search architecture](../explanation/search-architecture.md) — how CCD search (Elasticsearch vs legacy) works end-to-end
- [Enable query search](enable-query-search.md) — configuring query-based search alongside global search
