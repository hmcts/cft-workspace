---
topic: data-types
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FieldType.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Address.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/AddressUK.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/DynamicList.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/YesOrNo.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/CaseLink.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/CaseLocation.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Organisation.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/OrganisationPolicy.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/PreviousOrganisation.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/ChangeOrganisationRequest.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Flags.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagDetail.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagLauncher.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/ComponentLauncher.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/WaysToPay.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/SearchCriteria.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/SearchParty.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/TTL.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/OrderSummary.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/ListValue.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/FieldTypeEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseFieldEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/FieldTypeUtils.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V20230723_4590__CCD-4590_CreateCaseMessage.sql
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V20230724_4590__CCD-4590_CreateCaseQueriesCollection.sql
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V20220923_3686__CCD-3686__JudicialUser.sql
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V20231114_2__GA2_CaseAccessGroup.sql
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V20231114_4__GA4_CaseAccessGroups_collection.sql
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/DisplayContextParameterValidator.java
  - ccd-definition-store-api:elastic-search-support/src/main/resources/application.yml
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/mapping/CaseMappingGenerator.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/search/MetaData.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence:
  - id: "205906788"
    title: "CCD Supported Field Types"
    last_modified: "2026-02-17T00:00:00Z"
    space: "RCCD"
  - id: "1275332156"
    title: "Customised Date(Time) Display and Entry"
    last_modified: "2020-02-13T00:00:00Z"
    space: "RCCD"
  - id: "1166442774"
    title: "Collection Table View"
    last_modified: "2020-02-24T00:00:00Z"
    space: "RCCD"
  - id: "221085798"
    title: "RDM - Display/Referencing metadata, SubComplex, Collection item fields"
    last_modified: "2018-01-01T00:00:00Z"
    space: "RCCD"
confluence_checked_at: "2026-04-29T00:00:00Z"
---

# Field Types

CCD field types are declared in the `FieldType` column of the `CaseField` spreadsheet sheet (or the `fieldType` attribute in JSON definitions). The definition-store stores them in the `field_type` table (`FieldTypeEntity`), seeded with the platform's built-ins by `V0001__Base_version.sql` and per-feature migrations (`FieldTypeUtils.java:1–64`). Each base type also gets an Elasticsearch mapping at import time, configured in `elastic-search-support/src/main/resources/application.yml`. The ccd-config-generator SDK mirrors most built-in types as Java classes under `uk.gov.hmcts.ccd.sdk.type`.

## TL;DR

- Every case field has a `FieldType` controlling rendering, validation, and Elasticsearch mapping.
- Primitives (`Text`, `Number`, `Date`, …) map to scalar JSON; complex types (`Complex`, `Collection`) nest sub-fields; markers (`FlagLauncher`, `ComponentLauncher`, `WaysToPay`, `CaseHistoryViewer`, `CasePaymentHistoryViewer`) carry no data.
- `Min`/`Max` columns on `CaseField` and `ComplexTypes` apply to length (`Text`/`TextArea`/`Email`/`PhoneUK`/`Postcode`), value (`Number`/`MoneyGBP`), date bounds (`Date`/`DateTime`), or item count (`Collection`/`MultiSelectList`). Validation is **only** applied if a value is provided — `Min` does not enforce required.
- `FixedList`, `MultiSelectList`, `FixedRadioList` need a `FixedLists` companion sheet; `DynamicList`, `DynamicMultiSelectList`, `DynamicRadioList` are populated at runtime via callbacks.
- `Collection` items are wrapped in `ListValue<T>` (`{"id": "<uuid>", "value": <item>}`).
- Several launcher / viewer types (`FlagLauncher`, `ComponentLauncher`, `WaysToPay`, `CaseHistoryViewer`, `CasePaymentHistoryViewer`, `Label`) are excluded from Elasticsearch indexing (`application.yml: ccdIgnoredTypes`).
- Predefined platform complex types (`AddressUK`, `Document`, `Organisation`, …) cannot have `AuthorisationComplexType` ACL rows — the import validator blocks it.

## Primitive field types

| Type | JSON shape | Min / Max applies to | Backend regex | Elasticsearch mapping |
|---|---|---|---|---|
| `Text` | `{"type": "string"}` | length (chars) — definable on `CaseField` and on element rows in `ComplexTypes`. **Min/max length cannot be set on a `Text` inside a `Collection`** — wrap it in a Complex type instead. <!-- CONFLUENCE-ONLY: not verified in source --> | none | `text` + `.keyword` sub-field (lowercase normalizer) |
| `TextArea` | `{"type": "string"}` | length | none | same as `Text` |
| `Number` | `{"type": "number"}` (stored as string) | numeric value (min ≤ value ≤ max) | none | `double` |
| `MoneyGBP` | string of pennies, e.g. `"1200"` for £12.00 | value in **pennies** | none | `double` <!-- DIVERGENCE: previous draft claimed `long`, but `application.yml:77` maps `MoneyGBP: defaultDouble`. Source wins. --> |
| `Date` | `{"type": "string", "format": "date"}` — `YYYY-MM-DD` | earliest / latest date (`dd/mm/yyyy` in `Min`/`Max`) | none | `date` (with `ignore_malformed: true`; no `format` constraint at index level) |
| `DateTime` | `{"type": "string", "format": "date-time"}` — e.g. `"2020-05-05T15:00:00.000"` | earliest / latest date+time | none | `date` (with `ignore_malformed: true`) |
| `Email` | `{"type": "string"}` | length | RFC 5322 (Spring Boot 3 onwards uses `jakarta.mail` for validation) <!-- CONFLUENCE-ONLY: not verified in source --> | `keyword` (lowercase normalizer) |
| `PhoneUK` | `{"type": "string"}` | length | `^(((\+44\s?\d{4}|\(?0\d{4}\)?)\s?\d{3}\s?\d{3})|((\+44\s?\d{3}|\(?0\d{3}\)?)\s?\d{3}\s?\d{4})|((\+44\s?\d{2}|\(?0\d{2}\)?)\s?\d{4}\s?\d{4}))(\s?\#(\d{4}|\d{3}))?$` (`V0001__Base_version.sql:2547–2549`) | `text` + `.keyword` + `phone_number_analyzer` <!-- DIVERGENCE: previous draft claimed plain `keyword`, but `application.yml:19,76` defines `ccdPhoneUK` with `text`+keyword sub-field+phone_number_analyzer. Source wins. --> |
| `Postcode` | `{"type": "string"}` | length | `^([A-PR-UWYZ0-9][A-HK-Y0-9][AEHMNPRTVXY0-9]?[ABEHMNPRVWXY0-9]? {1,2}[0-9][ABD-HJLN-UW-Z]{2}|GIR 0AA)$` (`V0001__Base_version.sql:2540–2542`) | `keyword` <!-- DIVERGENCE: the type is registered as `Postcode` (lowercase 'c') in `field_type` and `application.yml`, not `PostCode`. Source wins. --> |
| `YesOrNo` | `{"type": "string", "enum": ["Yes", "No"]}` | n/a | none | `keyword` |
| `Label` | not persisted | n/a — display only | n/a | **not indexed** (`application.yml: ccdIgnoredTypes`) |

Notes that apply to most primitives:
- `Min`/`Max` on `CaseField` set bounds at the top level; for the same primitive used as a sub-field of a Complex type, set them on the element row in `ComplexTypes`.
- Min/max length validation is **opt-in** — providing a value of length 0 / null does not trigger min-length validation. <!-- CONFLUENCE-ONLY: not verified in source -->

### Default search behaviour per type

The **Search Default Behaviour** column on the canonical Confluence index distinguishes how each primitive matches a search query (independent of any `SearchAlias` keyword variant — see [ES type mappings](#elasticsearch-type-mappings)). Summarised:

| Type | Default match |
|---|---|
| `Text` | Fuzzy |
| `TextArea` | CONTAINS |
| `Number` | EXACT |
| `MoneyGBP` | EXACT — pounds-only (any pence) or full pounds + pence |
| `Date` | EXACT, tolerant of missing day or day+month |
| `DateTime` | EXACT (subject to entry-format defaulting — see [DisplayContextParameter formats](#displaycontextparameter-formats)) |
| `PhoneUK` | EXACT |
| `Email` | EXACT |
| `Postcode` | EXACT, tolerant with/without spaces |
| `YesOrNo` | EXACT |
| `FixedList` / `FixedRadioList` | EXACT |
| `MultiSelectList` | CONTAINS — matches any selected item |
| `Document` | EXACT match on `document_filename`, excluding extension |
| `Label` | n/a — labels not searchable |

<!-- CONFLUENCE-ONLY: the "Default Behaviour" column is a Confluence summary; the data store implements per-type matching via the analyzers configured in `application.yml` and the `keyword` sub-fields used by `SearchAlias`. The column captures the **observed** behaviour at the API surface but is not a single named source-code construct. -->

## Collection and complex types

| Type name | JSON shape | Semantics | SDK class | Common pitfalls |
|---|---|---|---|---|
| `Collection` | array of `{"id": "<uuid-or-null>", "value": <item>}` | Ordered list. Item type is set on `ListElementCode` for primitives, or via `complex_field_type_id` for complex items. Min/max collection size definable in `Min`/`Max` on `CaseField`/`ComplexTypes`. | `List<ListValue<T>>` (`ListValue.java`) | Always wrap items in `ListValue`. ES search behaves as on the child type. |
| `Complex` | object with named sub-fields | Defined in `ComplexTypes` sheet. | varies (e.g. `Address`, `Document`) | Sub-fields inherit ACL from parent; override via `AuthorisationComplexType` (dot-notation path). |
| `MultiSelectList` | `["CODE_A", "CODE_B"]` | Multi-select fixed list. Min/max number of selections definable. | none (array of strings) | Empty selection stores `[]`, not `null`. |

## Fixed-list types

All three require a companion `FixedLists` sheet row per list code (`ListElementCode` + `ListElement` columns are required). The `field_type` table stores the parent type with `base_field_type_id` referencing the appropriate base type (`FieldTypeEntity.java:87–89`). Min/max on items is **not** enforced.

| Type | JSON shape | Semantics | Notes |
|---|---|---|---|
| `FixedList` | `"<ListElementCode>"` | Single-select dropdown | Changing a code after data exists orphans existing values — plan code stability from the start. |
| `FixedRadioList` | same as `FixedList` | Radio-button variant | Renders all options simultaneously — keep lists short (≤5 items). |
| `MultiSelectList` | array of codes | (See above) | — |

`FixedListEdit` ("Either select / enter / select and edit. True Combo box of drop-down list and text field") is documented on Confluence as **not a supported type**; it is not registered in `field_type`. <!-- CONFLUENCE-ONLY: not verified in source -->

## Dynamic list types

Dynamic lists are populated at runtime via an `aboutToStart` or mid-event callback. The callback response sets both `value` (selected) and `list_items` (available options); both are persisted with the case data:

```json
"data": {
  "ListOfJudges": {
    "value": { "code": "JUDGESMITH", "label": "Judge Smith" },
    "list_items": [
      { "code": "JUDGEJUDY", "label": "Judge Judy" },
      { "code": "JUDGESMITH", "label": "Judge Smith" }
    ]
  }
}
```

| Type | SDK class | Variant |
|---|---|---|
| `DynamicList` | `DynamicList`, `DynamicListElement` (`DynamicList.java`) | single-select dropdown |
| `DynamicMultiSelectList` | `DynamicMultiSelectList.java` | multi-select; `value` is an array |
| `DynamicRadioList` | none (platform type) | radio-button single-select; same callback contract |

ES mapping `ccdDynamicList` indexes `value.code` and `value.label` as `text` + `.keyword`; `list_items` is stored but `enabled: false` (not indexed) (`application.yml:43–60`).

Omitting `list_items` in the callback response renders an empty dropdown.

## Document type

| Sub-field | Type | Notes |
|---|---|---|
| `document_url` | string | URL of CDAM document metadata; access via `/cases/documents/{documentId}` |
| `document_filename` | string | filename |
| `document_binary_url` | string | URL of the binary; access via `/cases/documents/{documentId}/binary` |
| `category_id` | string | Category id when the default (defined via `CaseField`/`ComplexTypes`) is overridden by a user. Must match a categoryId defined for the case type or be `NULL`. |
| `upload_timestamp` | date-time | When the document was uploaded |
| `document_hash` | string (hash token) | Required by the data store on save when CDAM secure access is enabled (`CaseDocumentService.java`, `DocumentSanitiser.java: DOCUMENT_HASH = "document_hash"`); not modelled in the SDK `Document` POJO. |

The browser file-extension allow-list per service controls which extensions can be uploaded/viewed (e.g. `.pdf, .docx, .png, .jpg`). <!-- CONFLUENCE-ONLY: configured outside SDK/data-store source -->

`required` (per Confluence): `document_url`, `document_binary_url`, `upload_timestamp`. ES mapping (`ccdDocument`) indexes `document_filename` as `text` and stores `document_url`/`document_binary_url`/`category_id`/`upload_timestamp` (the URL fields with `index: false`) (`application.yml:20–40`).

Search: EXACT match on document filename, excluding extension.

## Address types

All address types are predefined complex types and cannot carry `AuthorisationComplexType` ACL rows. Sub-field max lengths (per Confluence) are: `AddressLine1` 150, `AddressLine2/3` 50 each, `PostTown` 50, `County` 50, `PostCode` 14, `Country` 50.

| Type | JSON discriminator registered? | SDK class | Notes |
|---|---|---|---|
| `AddressUK` | yes (`field_type.reference = 'AddressUK'`) | `AddressUK.java` extends `Address` | UK-only with postcode lookup. Sub-fields: `AddressLine1`–`3`, `PostTown`, `County`, `PostCode`, `Country`. |
| `AddressGlobal` | yes | `AddressGlobal.java` | International. Same sub-fields as `AddressUK`. |
| `AddressGlobalUK` | yes | `AddressGlobalUK.java` | International with UK-biased postcode lookup. |
| `Address` | **no** — only the SDK base class | `Address.java` (`@ComplexType(name = "Address", generate = false)`) | <!-- DIVERGENCE: previous draft listed `Address` as a usable type with discriminator `"Address"` and called it "free-text". The platform does **not** register a base type called `Address` in `V0001__Base_version.sql` — only `AddressUK`/`AddressGlobal`/`AddressGlobalUK`. The Java `Address` class exists as a shared superclass for the three. Source wins. --> |

Confluence's `AddressUK` and `AddressGlobalUK` JSON shapes include a `UPRN` (Unique Property Reference Number) sub-field with `maxLength: 12`. <!-- CONFLUENCE-ONLY: no `UPRN` registered in the seed migration `V0001__Base_version.sql` and no field on the SDK `Address`/`AddressUK`/`AddressGlobalUK` classes. May be set by the front-end postcode-lookup component without round-tripping into the type schema. -->

## Platform / integration complex types

These are seeded by `V0001__Base_version.sql` (and per-feature migrations under `db/migration/`) and exposed by the SDK in `uk.gov.hmcts.ccd.sdk.type`. All are predefined complex types — services use them by annotating Java fields with the corresponding class.

### `CaseLink`

Reference to another CCD case by 16-digit case reference. The `CaseReference` sub-field is constrained by the `TextCaseReference` base regex `(?:^[0-9]{16}$|^\d{4}-\d{4}-\d{4}-\d{4}$)` (`V0001__Base_version.sql:2682–2692`).

Sub-fields: `CaseReference` (Text, required), `ReasonForLink` (collection of `LinkReason`), `CreatedDateTime` (DateTime), `CaseType` (Text — case type id of the linked case). Search: EXACT match — the linked case must exist.

### `CaseLocation`

Sub-fields: `Region`, `BaseLocation` (both Text). Used by hearing/listing integrations.

### `Region` / `BaseLocation`

Registered as base types (`FieldTypeUtils.java:43–44`) and ES-mapped as `defaultText` (`application.yml:87–88`). Confluence marks both as **in development** — temporarily backed by `String` rather than a fixed list, as an interim solution because the standard `FixedList` baseType cannot have service-customised values. <!-- CONFLUENCE-ONLY: "in development" framing not verified in source — types are seeded and indexed today. -->

### `Organisation`

Sub-fields:
- `OrganisationID` — required, Id from PRD.
- `OrganisationName` — **deprecated, do not use**. <!-- CONFLUENCE-ONLY: not flagged as deprecated in source `Organisation.java`. -->
- `OrganisationAddress` — `AddressGlobalUK`. <!-- CONFLUENCE-ONLY: not modelled on the SDK `Organisation.java` POJO. -->

### `OrganisationPolicy`

Carries the representation of a litigant on a case. Sub-fields (per `OrganisationPolicy.java`):
- `Organisation` — the representing organisation; `null` if self-represented or no representation.
- `OrgPolicyCaseAssignedRole` — case role assigned to any solicitor representing this litigant. Service- and case-type-specific; valid values defined on the `CaseRoles` tab of the service's definition file. Should be in square brackets, e.g. `[Claimant]`.
- `OrgPolicyReference` — text meaningful to the organisation (referred to as "Reference" in some Confluence prose).
- `PreviousOrganisations` — `Set<PreviousOrganisationCollectionItem>` — history of previous representations.
- `PrepopulateToUsersOrganisation` — `YesOrNo`.
- `LastNoCRequestedBy` — email of who requested the most recent NoC. <!-- CONFLUENCE-ONLY: not modelled on the SDK `OrganisationPolicy.java` POJO. -->

Confluence marks `OrgPolicyCaseAssignedRole` as `required`.

### `ChangeOrganisationRequest`

Payload for a Notice of Change request. Sub-fields (per `ChangeOrganisationRequest.java`): `OrganisationToAdd`, `OrganisationToRemove`, `CaseRoleId`, `Reason`, `NotesReason`, `ApprovalStatus` (`ChangeOrganisationApprovalStatus` enum), `RequestTimestamp`, `ApprovalRejectionTimestamp`, `CreatedBy`.

### `PreviousOrganisation`

Used inside `OrganisationPolicy.PreviousOrganisations`. Sub-fields: `FromTimestamp` (DateTime), `ToTimestamp` (DateTime), `OrganisationName` (Text), `OrganisationAddress` (`AddressUK`). Confluence marks this as **in development**. <!-- CONFLUENCE-ONLY: type is registered (`FieldTypeUtils.java:33`) and modelled in the SDK; "in development" framing is dated. -->

### `Flags`

Top-level case-flags container — carries the collection of `FlagDetail`. Services typically configure one `Flags` field per party (set `partyName`/`roleOnCase` in `aboutToSubmit` when the party is added) plus a single case-level `Flags` location.

Sub-fields (per `Flags.java`):
- `partyName` (Text), `roleOnCase` (Text)
- `details` — `List<ListValue<FlagDetail>>`
- `groupId` — UUID; set by the service when creating party/case-level collections that should be linked.
- `visibility` — `FlagVisibility` enum (`Internal` / `External`).

### `FlagDetail`

Item type for `Flags.details`. Sub-fields (per `FlagDetail.java`):

| Field | Type | Confluence-claimed required | Notes |
|---|---|---|---|
| `name` / `name_cy` | Text | yes | English / Welsh display name |
| `subTypeValue` / `subTypeValue_cy` | Text | no | selected value from a flag's value-list |
| `subTypeKey` | Text | no | key for the value-list |
| `otherDescription` / `otherDescription_cy` | Text | no | free-text when 'other' selected |
| `flagComment` / `flagComment_cy` | Text | no | qualifying info |
| `flagUpdateComment` | Text | no | provided when approving / rejecting / changing |
| `dateTimeModified` | DateTime (`yyyy-MM-dd'T'HH:mm:ss.SSS'Z'`) | no | last status / requestReason change |
| `dateTimeCreated` | DateTime (`yyyy-MM-dd'T'HH:mm:ss.SSS'Z'`) | yes | created timestamp |
| `path` | `List<ListValue<String>>` | yes | path taken to reach the flag, e.g. `["Reasonable adjustment", "Mobility support"]` |
| `hearingRelevant` | YesOrNo | yes | configured per case type in RefData |
| `flagCode` | Text | yes | unique RefData identifier |
| `status` | Text | yes | Active / Inactive |
| `availableExternally` | YesOrNo | no | externally presentable (e.g. Citizen UI). Absent ⇒ No. |

<!-- CONFLUENCE-ONLY: the "required" column comes from Confluence; `FlagDetail.java` does not annotate any field with `@NotNull` — required-ness is enforced server-side / by ExUI rather than at the POJO level. -->

### `FlagLauncher`

Empty marker type (`FlagLauncher.java`: no fields). Tells ExUI to launch the Flag component. Not indexed in ES (`application.yml: ccdIgnoredTypes`).

### `ComponentLauncher`

Empty marker type (`ComponentLauncher.java`: no fields). Tells ExUI a web component needs to be launched; the specific component is configured per-instance via `DisplayContextParameter` in `CaseEventToFields`, `ComplexTypes`, or `CaseTypeTab`. Not indexed in ES.

### `WaysToPay`

Empty marker (`WaysToPay.java`: `@JsonIgnoreType`, no fields). Triggers ExUI's "ways to pay" component. No case data; not indexed.

### `JudicialUser`

Sub-fields (per migration `V20220923_3686__CCD-3686__JudicialUser.sql`): `idamId` (Text), `personalCode` (Text). No SDK class — annotate a Java field with the predefined complex type name `JudicialUser`. <!-- CONFLUENCE-ONLY: SDK does not currently ship a `JudicialUser` POJO. -->

### `CaseAccessGroup` / `CaseAccessGroups`

`CaseAccessGroup` sub-fields (per `V20231114_2__GA2_CaseAccessGroup.sql`): `caseAccessGroupType` (Text, required) — service identifier; `caseAccessGroupId` (Text, required) — id used by CCD when comparing with role assignments. By convention services should only set caseAccessGroups associated with their own type. <!-- CONFLUENCE-ONLY: SDK does not currently ship POJOs for either type. -->

`CaseAccessGroups` is a collection of `CaseAccessGroup` (`V20231114_4__GA4_CaseAccessGroups_collection.sql`).

### `CaseQueriesCollection` / `CaseMessage` / `caseMessageCollection` / `caseMessages`

Standard base types for storing messages between HMCTS and parties (registered in `V20230723_4590__CCD-4590_CreateCaseMessage.sql` and `V20230724_4590__CCD-4590_CreateCaseQueriesCollection.sql`).

`CaseMessage` sub-fields:

| Field | Type | Confluence required | Notes |
|---|---|---|---|
| `id` | Text | yes | a GUID |
| `subject` | Text | yes (≤255 chars) | |
| `name` | Text | yes (≤255 chars) | submitter |
| `body` | Text | yes | message content |
| `attachments` | Collection of `Document` | no | |
| `isHearingRelated` | YesOrNo | yes | |
| `hearingDate` | Date | required iff `isHearingRelated == "Yes"` | |
| `createdOn` | DateTime | yes | |
| `createdBy` | Text | yes | IDAM id |
| `parentId` | Text | no | id of message this replies to; empty for thread-initial |

`CaseQueriesCollection` is a complex type whose `caseMessages` sub-field is a `caseMessageCollection` — i.e. `List<ListValue<CaseMessage>>`.

<!-- CONFLUENCE-ONLY: SDK does not currently ship POJOs for `CaseMessage`/`CaseQueriesCollection`; constraints (max-length 255, conditional-required `hearingDate`) are not modelled in source. -->

### `OrderSummary`

Used to store fees on a payment-event. Retrieved on the payment event's `aboutToStart` callback and persisted with case data.

Sub-fields (per `OrderSummary.java`): `PaymentReference` (Text, optional), `PaymentTotal` (Text, required per Confluence), `Fees` (collection of `Fee`, required per Confluence). <!-- DIVERGENCE: the previous draft used lowercased `paymentReference`/`paymentTotal`. Source uses `@JsonProperty("PaymentReference")` and `@JsonProperty("PaymentTotal")`. Source wins. -->

`Fee` (per `Fee.java`) carries `FeeCode`, `FeeAmount`, `FeeVersion` (all required per Confluence) and `FeeDescription` (optional).

```json
{
  "PaymentReference": "RC-1521-1095-0964-3143",
  "Fees": [
    { "value": { "FeeAmount": "4545", "FeeCode": "FEE0001", "FeeDescription": "First fee", "FeeVersion": "1" } }
  ],
  "PaymentTotal": "5000"
}
```

Not searchable in CCD (held in an external system).

### `TTL`

Time-to-live / case retention window. Sub-fields (per `TTL.java`):
- `SystemTTL` — `LocalDate` (`yyyy-MM-dd`). If absent, the case cannot be deleted.
- `Suspended` — `YesOrNo`. Empty is treated as `No`.
- `OverrideTTL` — `LocalDate`. Takes precedence over `SystemTTL` when present.

Implemented natively by CCD; services use the type directly without defining it in `ComplexTypes`. The `ttlIncrement` event property automatically extends `SystemTTL`.

### `SearchCriteria` / `SearchParty`

Global Search configuration. `SearchCriteria` (per `SearchCriteria.java`) sub-fields:
- `OtherCaseReferences` — `List<ListValue<String>>`.
- `SearchParties` — `List<ListValue<SearchParty>>`.

`SearchParty` (per `SearchParty.java`) sub-fields: `CollectionFieldName`, `Name`, `EmailAddress`, `AddressLine1`, `PostCode`, `DateOfBirth` (`yyyy-MM-dd`), `DateOfDeath` (`yyyy-MM-dd`).

### `LinkReason`

Single reason for a case link. Sub-fields (per `LinkReason.java`): `Reason` (Text, sourced from RefData via ExUI; supports `Other`); `OtherDescription` (Text, free text when `Other` selected).

### `KeyValue`

Generic string key-value pair (`KeyValue.java`). Useful for metadata maps in collections.

### `ScannedDocument` / `ExceptionRecord` / `BulkScanEnvelope`

Bulk-scan integration types (`ScannedDocument.java`, `ExceptionRecord.java`, `BulkScanEnvelope.java`).

### `CaseHistoryViewer` / `CasePaymentHistoryViewer`

Marker types — placeholders that ExUI replaces with a dedicated component:

| Type | Component |
|---|---|
| `CaseHistoryViewer` | Renders the case event history. Only **C** of CRUD applies; no configuration options; field label/hint are ignored (built into the component). |
| `CasePaymentHistoryViewer` | Renders the case's payment history (calls the Payments API behind the scenes). Viewer requires the IDAM role `payments`. |

Both are excluded from Elasticsearch indexing (`application.yml: ccdIgnoredTypes`).

## Elasticsearch type mappings

The definition-store pushes an ES mapping per field on import. `CaseMappingGenerator` produces the `data` object mapping by looking up each field's base-type string in the `typeMappings` map (`application.yml:69–90`), with named templates in `elasticMappings` (`application.yml:10–60`):

| Mapping template | Definition |
|---|---|
| `defaultText` | `text` + `.keyword` (lowercase normalizer, `ignore_above: 256`) |
| `defaultKeyword` | `keyword` (lowercase normalizer) |
| `defaultDouble` | `double` |
| `defaultLong` | `long` |
| `defaultDate` | `date` (`ignore_malformed: true`) |
| `ccdPhoneUK` | `text` + `.keyword` + `phone_number_analyzer` |
| `ccdDocument` | object with the Document sub-field shape (URLs `index: false`) |
| `ccdDynamicList` | object with `value.code`/`value.label` indexed; `list_items` `enabled: false` |

Fields with `searchable = false` on `CaseFieldEntity` are excluded from the ES mapping entirely (default is `searchable = true`, `CaseFieldEntity.java:32–88`). `SearchAliasField` entries get an additional `<name>_keyword` alias (`CaseMappingGenerator.java:118–131`). Types in `ccdIgnoredTypes` (`Label`, `CasePaymentHistoryViewer`, `CaseHistoryViewer`, `WaysToPay`, `FlagLauncher`, `ComponentLauncher`) are not indexed at all.

## DisplayContextParameter formats

`DisplayContextParameter` applies to fields in `CaseField`, `ComplexTypes`, `CaseEventToFields`, and all layout sheets. `DisplayContextParameterValidator` validates the format at import time. Common patterns:

| Format | Applies to | Effect |
|---|---|---|
| `#TABLE(col1, col2)` | `Collection` fields | Renders collection as a table with named columns. <!-- CONFLUENCE-ONLY: only available in `CaseTypeTab` — not `CaseEventToFields`, `ComplexTypes`, `WorkbasketInputFields`, `WorkbasketResults`, `SearchInputFields`, `SearchResults`. The collapsed view also drives column-based sorting; non-listed sub-fields are only available in the expanded view (`Collection Table View`, Confluence id 1166442774). --> |
| `#DATETIMEDISPLAY(formatstring)` | `Date` / `DateTime` fields, plus the date-typed metadata fields `[CREATED_DATE]`, `[LAST_MODIFIED_DATE]`, `[LAST_STATE_MODIFIED_DATE]` | Overrides display format string in read mode. Metadata fields are read-only, so only `#DATETIMEDISPLAY` is accepted on them. <!-- CONFLUENCE-ONLY: metadata applicability per `Customised Date(Time) Display and Entry` (Confluence id 1275332156); not modelled in source. --> |
| `#DATETIMEENTRY(formatstring)` | `Date` / `DateTime` fields | Overrides entry format string; also triggers a date-picker component for `DateTime` fields. The visible elements of the picker depend on the format string. |

A field can be either entered or displayed in association with a single event, not both, so a given DCP cell carries at most one of `#DATETIMEDISPLAY` / `#DATETIMEENTRY`. Across distinct DCP locations they can be combined, e.g.

```
display_context_parameter=#DATETIMEDISPLAY(YY-MM-DD),#DATETIMEENTRY(DD-MM-YY)
```

For complex types the format must be defined in advance on the `ComplexTypes` row; the `DisplayContext` of the parent `CaseEventToComplexTypes`/`CaseEventToFields` row chooses which format applies (`Mandatory`/`Optional` ⇒ entry format; `Readonly` ⇒ display format). With no DCP for the chosen mode the default format is used. <!-- CONFLUENCE-ONLY: behaviour documented on Confluence id 1275332156, not directly modelled in the SDK. -->

The format string follows Java [`DateTimeFormatter`](https://docs.oracle.com/javase/8/docs/api/java/time/format/DateTimeFormatter.html) patterns. Common letters:

| Letter(s) | Meaning |
|---|---|
| `G` / `u` / `y` | era / year / year-of-era |
| `M` / `L` / `d` / `D` | month-of-year (number/text) / day-of-month / day-of-year |
| `Q` / `q` / `Y` / `w` / `W` | quarter / week-based-year / week-of-week-based-year / week-of-month |
| `E` / `e` / `c` / `F` | day-of-week (text/number/localized) / week-of-month |
| `a` / `h` / `K` / `k` | am-pm / clock-hour-of-am-pm 1-12 / hour-of-am-pm 0-11 / clock-hour 1-24 |
| `H` / `m` / `s` / `S` | hour 0-23 / minute / second / fraction-of-second |
| `A` / `n` / `N` | milli-of-day / nano-of-second / nano-of-day |
| `V` / `z` / `O` / `X` / `x` / `Z` | time-zone ID / name / localized offset / offset variants |
| `p` | pad next |
| `'…'` / `''` | escape literal text / single quote |
| `[…]` | optional section |

`#` `{` `}` are reserved for future use.

When used as an **entry** formatter, `D` (day-of-year) and `Y` (week-based-year) are rejected at definition import — both clash with the platform's "missing element ⇒ defaults" rule (a missing year defaults to `1970`, a missing day to `01`) and would silently corrupt stored data. Both remain valid as **display** formatters. Time-zone characters are likewise rejected on entry, and `Date` fields additionally reject any time character on entry. <!-- CONFLUENCE-ONLY: rule lives on Confluence id 1275332156 ("Customised Date(Time) Display and Entry"), not modelled directly in the SDK or definition-store source as a single dedicated validator. -->

Search consequences (entry formatter): CCD search uses exact match. The entry format applied on `Workbasket`/`Search` input tabs must be the **same** as the format used on every `CaseEventToFields` row for the same `CaseFieldID`, and must not be changed after data has been written, otherwise users will fail to find existing cases. Apply entry formatters only to **new** Date/DateTime fields. <!-- CONFLUENCE-ONLY: search-format consistency rule documented on Confluence id 1275332156. -->

## Metadata fields

Metadata fields are case-level attributes the platform exposes alongside user-defined data. They are referenced in the spreadsheet using square brackets, e.g. `[CASE_REFERENCE]` (used as-is in an Excel cell). With Markdown interpolation:

```
Hey, ${ApplicantFullName}, your CCD reference is ${[CASE_REFERENCE]}
```

The data store models metadata in `MetaData.java` (`uk.gov.hmcts.ccd.data.casedetails.search.MetaData`), where the `CaseField` enum lists every supported metadata field and its DB column. The reference form is `[<NAME>]`.

| Metadata field | Meaning | Source |
|---|---|---|
| `[JURISDICTION]` | Current case's jurisdiction | `MetaData.CaseField.JURISDICTION` |
| `[CASE_TYPE]` | Current case's case type id | `MetaData.CaseField.CASE_TYPE` |
| `[STATE]` | Current case's state | `MetaData.CaseField.STATE` |
| `[CASE_REFERENCE]` | 16-digit universal case ID | `MetaData.CaseField.CASE_REFERENCE` |
| `[CREATED_DATE]` | Case creation date | `MetaData.CaseField.CREATED_DATE` |
| `[LAST_MODIFIED_DATE]` | Last modification date | `MetaData.CaseField.LAST_MODIFIED_DATE` |
| `[LAST_STATE_MODIFIED_DATE]` | Last state-change date | `MetaData.CaseField.LAST_STATE_MODIFIED_DATE` |
| `[SECURITY_CLASSIFICATION]` | Case security classification | `MetaData.CaseField.SECURITY_CLASSIFICATION` |

Confluence additionally lists `[JURISDICTION_DESC]`, `[CASE_TYPE_DESC]`, `[STATE_DESC]`, `[CREATED_DATETIME]`, and `[LAST_MODIFIED_DATETIME]` and notes them as "not currently implemented". <!-- CONFLUENCE-ONLY: these references are not in `MetaData.CaseField`; they may be resolved by the display layer (e.g. label markdown) or be planned future work. -->

### Referencing sub-fields and collection items

Beyond bare `[METADATA]` references, layout/result sheets accept two further reference forms (per Confluence id 221085798):

| Form | Example | Usable in |
|---|---|---|
| `Complex.SubField` (dot path) | `PersonAddress.Postcode`, `applicant.primaryAddress.AddressLine1` | `SearchResultFields`, `WorkBasketResultFields`, `AuthorisationCaseField`, `CaseTypeTab`, `CaseEventToField` (readonly only); editable form only on `CaseEventToField` |
| `Collection(<index>).…` | `AliasNames(1).FirstName`, `defendants(1).Address.AddressLine1` | Same set; readonly variants for display, editable variant in `CaseEventToField` |
| `Collection.…` (no index) | `defendants.Address.AddressLine1` | Result/search tabs — renders the named element across all items |
| `CaseLink-rooted path` | `financialSettlement.outcomeDate` | Cross-case lookup — must start with a `CaseLink` field; resolves the linked case and returns the named element |

<!-- CONFLUENCE-ONLY: dot/index/cross-link reference forms are documented on Confluence id 221085798 and are not directly modelled in any single SDK class — they are resolved by the data store / front-end layout pipeline at render time. -->

## See also

- [Data types](../explanation/data-types.md) — conceptual explanation of how CCD's type system works
- [Add a complex type](../how-to/add-a-complex-type.md) — define and use a custom complex type in your case definition
- [Glossary](glossary.md) — definitions for ListElementCode, DisplayContext, etc.

## Glossary

See [Glossary](glossary.md) for term definitions used in this page.

