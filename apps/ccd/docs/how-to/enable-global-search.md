---
topic: search
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/search/global/GlobalSearchServiceImpl.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/search/global/GlobalSearchFields.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/processor/GlobalSearchProcessorService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/std/GlobalSearchEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/globalsearch/SearchCriteria.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/globalsearch/SearchParty.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/search/global/GlobalSearchRequestPayload.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/search/global/GlobalSearchResponsePayload.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/search/global/GlobalSearchSortByCategory.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/search/global/Party.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/search/global/SearchCriteria.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/std/validator/globalsearch/SearchCriteriaValidator.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/SearchCriteriaValidator.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/SearchCasesResultFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/SearchPartyEntity.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/ElasticGlobalSearchListener.java
  - ccd-definition-store-api:elastic-search-support/src/main/resources/globalSearchCasesMapping.json
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/DisplayApiController.java
status: confluence-augmented
last_reviewed: "2026-04-29T00:00:00Z"
confluence_checked_at: "2026-04-29T00:00:00Z"
confluence:
  - id: "1525465594"
    title: "How To Guide - Global Search"
    space: "RCCD"
    last_modified: "unknown"
  - id: "1525481062"
    title: "API Operation: Global Search"
    space: "RCCD"
    last_modified: "unknown"
  - id: "1487512777"
    title: "HLD For Global Search Version 1"
    space: "GLCS"
    last_modified: "unknown"
  - id: "1504221464"
    title: "Global Search"
    space: "RCCD"
    last_modified: "unknown"
  - id: "1586829136"
    title: "Global Search Integration"
    space: "CRef"
    last_modified: "unknown"
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_GlobalSearch_AC_1/CaseField.json
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/common/SearchParty.json
---

# Enable Global Search

## TL;DR

- Global Search lets caseworkers find cases across jurisdictions from a single XUI screen via `POST /globalSearch`. Results include a `processForAccess` field (`"CHALLENGED"`, `"SPECIFIC"`, or `null`) indicating the access process the user must follow.
- To opt in, add a `SearchCriteria` complex field (and `caseNameHmctsInternal`, `caseManagementLocation`, `caseManagementCategory`), wire `SearchParty` mappings, and ensure `HMCTSServiceId` supplementary data is set on every case.
- `GlobalSearchProcessorService.populateGlobalSearchData` runs at case-save time: it **clears and repopulates** `SearchCriteria` from the configured `SearchParty` / `OtherCaseReference` mappings — direct writes to `SearchCriteria` (from callbacks or payloads) are discarded. Mapping errors are logged but **never block case save**.
- Standard access pattern: BASIC org roles `hmcts-staff` / `hmcts-judiciary` map via `RoleToAccessProfiles` to a `GS_profile` access profile that has `R` on the case type, every relevant case state, and the GS-related fields. Cases with `RESTRICTED` security classification are excluded unless the user has specific access.
- Column sets for the XUI results panel are configured in `SearchCasesResultFields` with `UseCase = GLOBAL_SEARCH`. Elasticsearch must be enabled (`ELASTIC_SEARCH_ENABLED=true`); the dedicated cross-jurisdiction index is seeded by definition-store on definition import via `globalSearchCasesMapping.json`.
- Existing cases are not globally searchable until the next event runs against them — plan a migration event.

## Prerequisites

Before configuring Global Search, the case type needs the **Work Allocation** baseline data items:

- `caseNameHmctsInternal` — top-level Text field. Returned in results; not searchable.
- `caseManagementLocation` — top-level `CaseLocation` complex field. Both `region` and `baseLocation` (epims id) are searchable and returned with reference-data descriptions.
- `caseManagementCategory` — top-level `DynamicList`. Returned in results (code + label); not searchable.
- `HMCTSServiceId` — supplementary data on every case. Returned in results; not directly searchable as a field, but used to filter by service.

If these are not set the case will still be indexed (Global Search tolerates them as `NULL`) but the results panel will be sparse and service-filtering will not work.

## Steps

### 1. Add the `SearchCriteria` complex field to your case type

In the **CaseField** sheet, add a row for the built-in complex type `SearchCriteria`:

| CaseTypeID    | ID             | Name           | FieldType      | SecurityClassification |
|---------------|----------------|----------------|----------------|------------------------|
| `MY_CASE_TYPE` | `SearchCriteria` | Search Criteria | `SearchCriteria` | Public                 |

The `SearchCriteria` complex type is predefined by the platform. You do not define its sub-fields — reference it by name only.

The presence of this case field is the trigger for two things:
1. `GlobalSearchProcessorService` will run on every case create/update event and (re)populate the field's contents.
2. Logstash will route a subset of the case data to the dedicated cross-jurisdiction Global Search index in addition to the case-type-specific index.

### 2. Grant ACLs

The `SearchCriteria` field is written by the data-store processor itself, irrespective of the user triggering the event — `GlobalSearchProcessorService` deliberately bypasses fine-grained access control on writes (`GlobalSearchProcessorService.java:47`). You still need read access for users who'll consume Global Search results.

The recommended pattern uses the BASIC organisational role assignments (`hmcts-staff`, `hmcts-judiciary`) mapped through `RoleToAccessProfiles` to a dedicated access profile (commonly named `GS_profile`).

**RoleToAccessProfiles**:

| CaseTypeID     | RoleName                           | ReadOnly | AccessProfiles |
|----------------|------------------------------------|----------|----------------|
| `MY_CASE_TYPE` | `hmcts-admin`                      | Y        | `GS_profile`   |
| `MY_CASE_TYPE` | `hmcts-judiciary`                  | Y        | `GS_profile`   |
| `MY_CASE_TYPE` | `hmcts-legal-operations`           | Y        | `GS_profile`   |
| `MY_CASE_TYPE` | `hmcts-ctsc`                       | Y        | `GS_profile`   |
| `MY_CASE_TYPE` | `specific-access-legal-operations` | Y        | `SA_profile`   |
| `MY_CASE_TYPE` | `specific-access-admin`            | Y        | `SA_profile`   |
| `MY_CASE_TYPE` | `specific-access-ctsc`             | Y        | `SA_profile`   |
| `MY_CASE_TYPE` | `specific-access-judiciary`        | Y        | `SA_profile`   |

The `specific-access-*` roles support the Specific Access flow: when a Global Search result shows `processForAccess = "SPECIFIC"`, the user can request access through the Case Access Management UI, and the `SA_profile` grants them read once approved.

<!-- CONFLUENCE-ONLY: specific-access roles and SA_profile are documented in the RCCD How-To Guide; the SA_profile convention is not enforced by CCD source. -->

**AuthorisationCaseType** — read access at the case-type level:

| CaseTypeID     | AccessProfile | CRUD |
|----------------|---------------|------|
| `MY_CASE_TYPE` | `GS_profile`  | R    |

**AuthorisationCaseState** — read access for every state in which Global Search should surface the case:

| CaseTypeID     | CaseStateID | AccessProfile | CRUD |
|----------------|-------------|---------------|------|
| `MY_CASE_TYPE` | `Created`   | `GS_profile`  | R    |
| `MY_CASE_TYPE` | `Issued`    | `GS_profile`  | R    |

**AuthorisationCaseField** — read access on the GS-relevant top-level fields:

| CaseTypeID     | CaseFieldID            | AccessProfile | CRUD |
|----------------|------------------------|---------------|------|
| `MY_CASE_TYPE` | `SearchCriteria`       | `GS_profile`  | R    |
| `MY_CASE_TYPE` | `caseNameHmctsInternal`| `GS_profile`  | R    |
| `MY_CASE_TYPE` | `caseManagementLocation`| `GS_profile` | R    |
| `MY_CASE_TYPE` | `caseManagementCategory`| `GS_profile` | R    |

**Security classification exception**: cases with a security classification of `RESTRICTED` are excluded from Global Search results for users who have no specific access to the case. The `AuthorisedCaseSearchOperation` service applies this filtering at ES query time.

<!-- CONFLUENCE-ONLY: the GS_profile / hmcts-staff / hmcts-judiciary access pattern is the documented HMCTS convention; not enforced by source. -->

### 3. Define `SearchParty` entries in the `SearchParty` sheet

Each row maps a named party in your case data to the platform's indexed party fields. The sheet columns are:

| Column | Description | Validation |
|--------|-------------|-----------|
| `CaseTypeID` | Your case type reference | Required |
| `SearchPartyName` | **Comma-separated** list of dot-notation paths whose values are concatenated with single spaces (e.g. `applicant.title, applicant.firstName, applicant.lastName`). The only field where comma-separation is meaningful — all others are single paths. | Optional, max 2000 chars |
| `SearchPartyEmailAddress` | Single dot-notation path to email | Optional, max 2000 chars |
| `SearchPartyAddressLine1` | Single dot-notation path to first address line | Optional, max 2000 chars |
| `SearchPartyPostCode` | Single dot-notation path to postcode | Optional, max 2000 chars |
| `SearchPartyDOB` | Single dot-notation path to date-of-birth | Optional, max 2000 chars |
| `SearchPartyDOD` | Single dot-notation path to date-of-death | Optional, max 2000 chars |
| `SearchPartyCollectionFieldName` | Top-level collection field whose items contain the paths above | Optional |
| `LiveFrom` | When this configuration becomes valid | Required |
| `LiveTo` | Not used; retained for CCD config consistency | Optional |

<!-- DIVERGENCE: Confluence "How To Guide - Global Search" and HLD render the date columns as `SearchPartyDoB` / `SearchPartyDoD`. Source code uses uppercase `SearchPartyDOB` / `SearchPartyDOD` (`apps/ccd/ccd-definition-store-api/excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java:108` — `SEARCH_PARTY_DOB("SearchPartyDOB")`; test fixtures in `apps/ccd/ccd-test-definitions/.../SearchParty.json` use `SearchPartyDOB` consistently). Source wins. -->

`SearchCriteriaValidator` enforces that every dot-notation path resolves to a real field at import time (`SearchCriteriaValidator.java:24`).

**Example 1 — top-level fields, no collection wrapping**:

| CaseTypeID     | SearchPartyName                                       | SearchPartyEmailAddress | SearchPartyAddressLine1       | SearchPartyPostCode      | SearchPartyDOB         | SearchPartyDOD         |
|----------------|-------------------------------------------------------|-------------------------|-------------------------------|--------------------------|------------------------|------------------------|
| `MY_CASE_TYPE` | `appellantTitle, appellantFirstName, appellantLastName` | `appellantEmail`      | `appellantAddress.AddressLine1` | `appellantAddress.PostCode` | `appellantDateOfBirth` |                        |
| `MY_CASE_TYPE` | `deceasedTitle, deceasedFirstName, deceasedLastName`    | `deceasedEmail`       | `deceasedAddress.AddressLine1`  | `deceasedAddress.PostCode`  | `deceasedDateOfBirth`  | `deceasedDateOfDeath`  |

**Example 2 — complex parent**:

| CaseTypeID     | SearchPartyName                                          | SearchPartyEmailAddress | SearchPartyAddressLine1       | SearchPartyPostCode        | SearchPartyDOB | SearchPartyDOD |
|----------------|----------------------------------------------------------|-------------------------|-------------------------------|----------------------------|----------------|----------------|
| `MY_CASE_TYPE` | `appellant.title, appellant.firstName, appellant.lastName` | `appellant.email`     | `appellant.address.AddressLine1`| `appellant.address.PostCode` | `appellant.DoB` |                |

**Example 3 — collection of parties**: set `SearchPartyCollectionFieldName` to the collection field ID and use paths *relative to the collection item*.

| CaseTypeID     | SearchPartyCollectionFieldName | SearchPartyName                                          | SearchPartyEmailAddress | SearchPartyAddressLine1        | SearchPartyPostCode         | SearchPartyDOB | SearchPartyDOD |
|----------------|--------------------------------|----------------------------------------------------------|-------------------------|---------------------------------|-----------------------------|----------------|----------------|
| `MY_CASE_TYPE` | `parties`                      | `appellant.title, appellant.firstName, appellant.lastName` | `appellant.email`     | `appellant.address.AddressLine1` | `appellant.address.PostCode` | `appellant.DoB` | `deceased.DoD` |

When the collection field name is supplied, the processor walks the collection items and emits one indexed `SearchParty` entry per non-empty item (`GlobalSearchProcessorService.populateSearchPartyValuesFromCollection:165`).

### 4. Configure `OtherCaseReference` (optional)

If your case links to an external case reference (e.g. a family case number, a probate registry number), add a row to the **SearchCriteria** sheet:

| CaseTypeID     | OtherCaseReference                       |
|----------------|------------------------------------------|
| `MY_CASE_TYPE` | `linkedCaseReference`                    |
| `MY_CASE_TYPE` | `complexField.externalRef2`              |

Multiple rows are allowed per case type — each generates an entry in `SearchCriteria.OtherCaseReferences[]`. `OtherCaseReference` must be a valid dot-notation path; depth is unlimited (`SearchCriteriaValidator.java:24-49`).

### 5. Set `HMCTSServiceId` on every case

`HMCTSServiceId` is **supplementary data**, not a case data field. Set it on case creation by including a `supplementary_data_request` block in the create payload:

```json
{
  "data": { ... },
  "event": { ... },
  "supplementary_data_request": {
    "$set": { "HMCTSServiceId": "PROBATE" }
  }
}
```

Or update post-creation:

```http
POST /cases/{caseId}/supplementary-data
Content-Type: application/json

{
  "supplementary_data_updates": {
    "$set": { "HMCTSServiceId": "PROBATE" }
  }
}
```

The `HMCTSServiceId` corresponds to the `serviceCode` returned by `GET /refdata/location/orgServices` and is the value used by XUI's service filter dropdown.

### 6. Add a `SearchCasesResultFields` column set

Define the columns XUI shows in Global Search results in the **SearchCasesResultFields** sheet. Each row requires a `UseCase` value; use `GLOBAL_SEARCH` for the Global Search panel:

| CaseTypeID     | CaseFieldID          | Label            | DisplayOrder | UseCase       |
|----------------|----------------------|------------------|--------------|---------------|
| `MY_CASE_TYPE` | `[CASE_REFERENCE]`   | Case reference   | 1            | GLOBAL_SEARCH |
| `MY_CASE_TYPE` | `caseNameHmctsInternal` | Case name     | 2            | GLOBAL_SEARCH |
| `MY_CASE_TYPE` | `[LAST_STATE_MODIFIED_DATE]` | Last modified | 3       | GLOBAL_SEARCH |

The `use_case` param is served by `GET /api/display/search-cases-result-fields/{id}?use_case=GLOBAL_SEARCH` (`DisplayApiController.java:131-144`). `SearchCasesResultFieldEntity.useCase` stores the value (`SearchCasesResultFieldEntity.java:27`).

### 7. Import the definition

Upload the updated spreadsheet to definition-store:

```
POST /import   (multipart/form-data, file=<your-xlsx>)
```

On import, definition-store publishes `DefinitionImportedEvent`, which `ElasticGlobalSearchListener` consumes to upsert the **dedicated Global Search index mapping** from `elastic-search-support/src/main/resources/globalSearchCasesMapping.json` (`ElasticGlobalSearchListener.java:37`). The `SearchParty` and `SearchCriteria` sheets are parsed as optional sheets after the core pipeline (`ImportServiceImpl.java:192-346`).

To force a full reindex of existing data:

```
POST /import?reindex=true
```

The Global Search index is cross-jurisdiction (one index for all case types), separate from the per-case-type indexes used by query search. There is also a dedicated **GS Index Creation Endpoint** on definition-store that the Admin UI uses to (re)create just the GS index without a full re-import.

### 8. Verify Elasticsearch indexing is on

Ensure the data-store environment variable is set:

```
ELASTIC_SEARCH_ENABLED=true
```

When `false`, `GlobalSearchEndpoint` will not be reachable and `GlobalSearchProcessorService` will not populate `SearchCriteria` fields on save (`application.properties:209`).

### 9. Migrate existing cases

Cases that existed before GS configuration was imported carry no index entries until the next event. To backfill, trigger a migration event on each case. The event must be valid in every state and must populate (directly or via callbacks): `caseNameHmctsInternal`, `caseManagementLocation`, `caseManagementCategory`, `HMCTSServiceId` supplementary data, and all fields referenced in the `SearchParty` / `SearchCriteria` mappings.

A common heuristic for identifying cases: `SearchCriteria` field is null or has empty collections.

<!-- CONFLUENCE-ONLY: the migration approach is documented in the HMCTS How-To Guide; coordinate execution with PlatOps. -->

## How the data flows at runtime

**On event submission** (case create/update):

1. `GlobalSearchProcessorService.populateGlobalSearchData` reads `SearchParty` and `SearchCriteria` config for the case type.
2. The existing `SearchCriteria` field is **discarded** — collection IDs are regenerated using `UUID.randomUUID()`. Any callback/payload writes to `SearchCriteria` are silently dropped. Exclude this field from case-history diffs (false positives).
3. For each `SearchParty` mapping: if `SearchPartyCollectionFieldName` is set, the processor walks the collection and emits one entry per non-empty item; otherwise a single entry from top-level/complex fields. Name values are space-concatenated.
4. **Error resilience**: mapping resolution failures are logged (alert triggered) but never block the case save.
5. Logstash routes a subset of the case data to the dedicated GS ES index.

**On search**:

1. XUI calls `POST /globalSearch`. `GlobalSearchServiceImpl` assembles an ES query (stripping hyphens from `caseReferences`).
2. `AuthorisedCaseSearchOperation` applies role-based access filters.
3. `GlobalSearchParser.filterCases` post-filters to enforce nested-party matching (all party fields must match a **single** `SearchParty` entry).
4. `GlobalSearchResponseTransformer` enriches results with reference-data descriptions; XUI renders using `SearchCasesResultFields` for `use_case=GLOBAL_SEARCH`.

For the wider architectural picture, see [search-architecture.md](../explanation/search-architecture.md).

## Verify

1. After import, confirm the cross-jurisdiction GS alias exists in Elasticsearch (separate from the per-case-type aliases).
2. Submit a test event, then query Global Search. A minimal request (searching by party name):

```http
POST /globalSearch
Content-Type: application/json
Authorization: Bearer <token>
ServiceAuthorization: <s2s>

{
  "searchCriteria": {
    "CCDCaseTypeIds": ["MY_CASE_TYPE"],
    "parties": [
      { "partyName": "Smith*" }
    ]
  },
  "maxReturnRecordCount": 10,
  "startRecordNumber": 1
}
```

Additional optional search criteria fields include `CCDJurisdictionIds`, `stateIds`, `caseManagementRegionIds`, `caseManagementBaseLocationIds`, and `otherReferences`. For each party entry, **all** specified properties must match against a **single** `SearchParty` stored in the case data for that case to be returned (nested-object semantics).

A `200` response containing your case in `results[]` confirms indexing and retrieval are working. Note:
- `caseReference` supports the wildcard pattern `^[\d\*?-]*$` (digits, hyphens, `*`, `?`).
- `partyName` and `addressLine1` accept wildcards (no regex constraint).
- `postCode` has **no** server-side regex validation (plain `String` in `Party.java`).
- `dateOfBirth` / `dateOfDeath` validated against `^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$` (`Party.java:21-27`).
- `maxReturnRecordCount` defaults to 25, max 10000 (`GlobalSearchRequestPayload.java:18`). XUI paginates 25 per page.
- `sortBy` accepts `caseName`, `caseManagementCategoryName`, or `createdDate`; default is `createdDate` (`GlobalSearchSortByCategory.java:17-20`). `sortDirection` defaults `ASCENDING` (`GlobalSearchRequestPayload.java:44`).
- **Minimum search criteria**: at least one `CCDJurisdictionId` or `CCDCaseTypeId` must be supplied (`SearchCriteriaValidator.java:15-16`). XUI additionally enforces 2 parameters minimum in its UI layer.

<!-- DIVERGENCE: Confluence HLD says "Need to apply the std Postcode Regex" for postCode, but ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/search/global/Party.java:19 shows no @Pattern annotation on postCode. Source wins. -->
<!-- CONFLUENCE-ONLY: XUI 2-parameter minimum, ExUI-layer pagination of 25 per page, and Launch Darkly service-filter toggle are documented in HLD/API-Operation pages; not verified in backend source. -->

## Response payload structure

A successful `200` response from `POST /globalSearch` returns `resultInfo` (pagination) and `results[]`. Each result contains (`GlobalSearchResponsePayload.java`):

| Field | Source | Notes |
|-------|--------|-------|
| `stateId` | Case record | Current state |
| `processForAccess` | Calculated | `"CHALLENGED"`, `"SPECIFIC"`, or `null` — indicates access flow needed |
| `caseReference` | Case record | 16-digit, no hyphens |
| `otherReferences[]` | `SearchCriteria.OtherCaseReferences` | |
| `CCDJurisdictionId` / `Name` | Case record + definition cache | |
| `HMCTSServiceId` / `ShortDescription` | Supplementary data + Reference Data Cache | |
| `CCDCaseTypeId` / `Name` | Case record + definition cache | |
| `caseNameHmctsInternal` | Case data | |
| `baseLocationId` / `Name` | `caseManagementLocation.baseLocation` + Reference Data Cache | |
| `caseManagementCategoryId` / `Name` | `caseManagementCategory` DynamicList code/label | |
| `regionId` / `Name` | `caseManagementLocation.region` + Reference Data Cache | |

The Reference Data Cache refreshes daily at 04:00 with a 5-day TTL (`reference.data.cache.ttl.in.days=5`, `reference.data.cache.refresh.rate.cron=0 4 * * * ?`). The `SearchCriteria` field contents are **not** returned in the response.

## Error responses

| HTTP Status | Cause |
|-------------|-------|
| `400` | Validation failure (missing search criteria, invalid format, out-of-range values) — response includes `details[]` array |
| `401` | Invalid or missing `Authorization` header |
| `403` | Invalid or missing `ServiceAuthorization` S2S token |

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

- [Search architecture](../explanation/search-architecture.md) — how CCD search (Elasticsearch vs legacy) works end-to-end, the two `SearchCriteria` Java types, the `nested` index decision
- [Enable query search](enable-query-search.md) — configuring query-based search alongside global search
