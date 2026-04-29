---
topic: data-types
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FieldType.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/DynamicList.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/OrganisationPolicy.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/ChangeOrganisationRequest.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/ChangeOrganisationApprovalStatus.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Organisation.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/AddressGlobalUK.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Address.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/AddressUK.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/CaseLink.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/ListValue.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/YesOrNo.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/PreviousOrganisation.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/TTL.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/FieldTypeEntity.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "205906788"
    title: "CCD Supported Field Types"
    space: "RCCD"
    last_modified: "2026-04-29"
  - id: "1278641313"
    title: "A Guide to DynamicRadioList and DynamicMultiSelectList Field Types - DRAFT"
    space: "RCCD"
    last_modified: "2026-04-29"
  - id: "1460552629"
    title: "Using DynamicList in CCD callbacks"
    space: "RIA"
    last_modified: "2026-04-29"
  - id: "526025284"
    title: "Address global complex type"
    space: "RCCD"
    last_modified: "2026-04-29"
  - id: "554959334"
    title: "RDM ?? - New Type CaseLink"
    space: "RCCD"
    last_modified: "2026-04-29"
---

# CCD Field Data Types

## TL;DR

- CCD fields have a `FieldType` declared in the definition spreadsheet's `CaseField` sheet — it controls how data is stored, validated, and rendered.
- Primitives (`Text`, `Number`, `Date`, `DateTime`, `Email`, `TextArea`, `MoneyGBP`, `PhoneUK`, `YesOrNo`) store a single scalar value as a JSON string. Note: `Number`, `DateTime`, and `Postcode` are platform-level type names recognised by the definition store but are not present in the SDK's `FieldType.java` enum — use them as string literals in JSON definitions.
- Structural types — `Collection<T>`, `Complex`, `FixedList`, `MultiSelectList`, `DynamicList`, `DynamicRadioList`, `DynamicMultiSelectList` — produce nested JSON objects or arrays.
- Purpose-built complex types (`Document`, `AddressGlobalUK`, `OrganisationPolicy`, `ChangeOrganisationRequest`, `CaseLink`) are pre-defined by the platform and referenced by name in the `FieldType` column.
- `Collection<T>` items are always wrapped in `{"id": "<uuid>", "value": <T>}` via `ListValue<T>` — do not strip the wrapper when reading or writing case data.
- Each `FieldType` has its own search semantics (Fuzzy, EXACT, CONTAINS, etc.) and validation profile — see [`docs/ccd/reference/field-types.md`](../reference/field-types.md) for the full per-type matrix.

---

## Primitive types

Each primitive stores a single value. In the CCD JSON payload the field is a top-level key whose value is always a **string** (even numbers and dates are serialised as strings).

| FieldType | Description | Example JSON value |
|---|---|---|
| `Text` | Free text, single line | `"John Smith"` |
| `TextArea` | Free text, multi-line | `"Line one\nLine two"` |
| `Number` | Integer or decimal | `"42"` |
| `MoneyGBP` | Pence as integer string | `"1099"` (= £10.99) |
| `Date` | ISO-8601 date | `"2024-03-15"` |
| `DateTime` | ISO-8601 date-time | `"2024-03-15T10:30:00.000"` |
| `Email` | RFC 5322 email address | `"applicant@example.com"` |
| `PhoneUK` | UK phone number | `"07700900000"` |
| `YesOrNo` | Enum — `YES` or `NO` | `"Yes"` |
| `Label` | Display-only, no data stored | _(no value in payload)_ |
| `Postcode` | UK postcode | `"SW1A 1AA"` |

`YesOrNo` is modelled as an enum in the SDK (`YesOrNo.java`) with values `YES` / `NO`; the wire format is the capitalised string `"Yes"` / `"No"`.

### Validation and search profile

A few details that bite repeatedly when modelling primitives:

- **`Text` min/max length** is definable on `CaseField` and on element rows of
  `ComplexTypes`, but **the min/max length of a `Text` field _inside a
  Collection_ cannot be defined**. Workaround: wrap it in a `Complex`.
- **`Number`** — min/max value (not length); search is EXACT.
- **`MoneyGBP`** — stored in pennies; min/max also in pennies. Search EXACT.
- **`Date` / `DateTime`** — min/max accept `dd/mm/yyyy` (and `hh/mm/ss` for
  `DateTime`). Date search is EXACT but tolerant of missing day or day+month.
- **`DateTime`** supports DisplayContextParameter (DCP) overrides
  `#DATETIMEENTRY(format)` (date picker) and `#DATETIMEDISPLAY(format)` (read
  view). They can combine: `#DATETIMEDISPLAY(YY-MM-DD),#DATETIMEENTRY(DD-MM-YY)`.
  Format strings follow Java's `DateTimeFormatter` syntax — see
  [`docs/ccd/reference/field-types.md`](../reference/field-types.md) for the
  full pattern-letter vocabulary.
- **`PhoneUK`** is validated server-side against a regex covering `+44 …` and
  `0…` formats and several digit groupings; **`Postcode`** has a regex matching
  standard UK postcodes plus `GIR 0AA`. Both regexes are listed verbatim on the
  reference page.
- **`Email`** — RFC 5322 (Spring Boot 3 onwards uses `jakarta.mail`). EXACT.
- **`min` / `max` are validation, not mandatory-ness.** Putting `min: 1` on a
  Text field does **not** make the field required — if no value is provided,
  the validator never runs. Required-ness is configured separately.

<!-- CONFLUENCE-ONLY: validation regex strings, DCP format-string vocabulary, and the "min length doesn't enforce mandatory" rule are documented on Confluence "CCD Supported Field Types" (page 205906788) but not surfaced in the SDK source — these are platform behaviours in ccd-data-store-api / ccd-definition-store-api validators. -->

---

## FixedList, FixedRadioList, MultiSelectList

These types are backed by a list of `(code, label)` pairs defined in the `FixedLists` sheet of the definition spreadsheet. The `FieldType` column references the list name.

**FixedList / FixedRadioList** — single selection; stores the selected `ListElementCode` as a string:

```json
"hearingType": "ORAL"
```

**MultiSelectList** — multiple selections; stores an array of selected codes:

```json
"hearingChannels": ["VIDEO", "TELEPHONE"]
```

In the definition store, these types are stored in the `field_type` table with `base_field_type_id` referencing `FixedList`, `MultiSelectList`, or `FixedRadioList`, and their items in `field_type_list_item` (`FieldTypeEntity.java:87–89`).

`FixedList` renders as a dropdown; `FixedRadioList` renders as radio buttons.
`MultiSelectList` allows selecting multiple items and supports configurable
min/max selection counts. Search on `MultiSelectList` is CONTAINS-style — a
search term matches if **any** of the selected items match.

**Note on `FixedListEdit`** — you may see references to a `FixedListEdit` type
(combo-box / "select or enter") in older definition material. **It is not a
supported type** despite the documentation hinting at it.
<!-- CONFLUENCE-ONLY: the "FixedListEdit is NOT a supported type" caveat comes from the Confluence canonical page (205906788) and is not represented in the SDK FieldType enum. -->

---

## Collection\<T\>

A repeating list of values of type `T`. The wire format wraps each element with a platform-generated UUID:

```json
"applicantDocuments": [
  {
    "id": "b3f1e2a0-1234-4abc-8def-000000000001",
    "value": {
      "documentUrl": "https://dm-store/documents/abc",
      "documentBinaryUrl": "https://dm-store/documents/abc/binary",
      "documentFilename": "evidence.pdf"
    }
  }
]
```

In the SDK, collection items are modelled as `ListValue<T>` — a wrapper with `id` (String) and `value` (T) fields (`ListValue.java`). Never omit the `id` field when submitting data; CCD uses it to identify which items were added, modified, or removed.

`T` can be any type — a primitive, a `Complex`, or a platform type like `Document`. In the definition spreadsheet the `FieldType` is `Collection` and `FieldTypeParameter` names the element type.

The `id` value is a UUID assigned by the platform (or `null` for items being
inserted). Min/max number of items can be defined on the `CaseField` row.
Search behaviour is determined by the element type rather than `Collection`
itself (e.g. a `Collection<Text>` searches like Text — fuzzy on each element).

---

## Complex types (user-defined)

A `Complex` field groups sub-fields defined in the `ComplexTypes` sheet. Each sub-field has its own `FieldType`. The wire format is a JSON object keyed by sub-field `ID`:

```json
"applicant": {
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1985-06-20"
}
```

Sub-fields can themselves be `Complex` or `Collection`, enabling arbitrary nesting. ACLs on nested fields use dot-notation paths (e.g. `applicant.address.postCode`) in the `AuthorisationComplexType` sheet (`ComplexFieldACLEntity.java:18`).

---

## Document

Reference to a file managed by CDAM / Document Management Store.

```json
"claimForm": {
  "document_url": "https://dm-store/documents/a1b2c3",
  "document_binary_url": "https://dm-store/documents/a1b2c3/binary",
  "document_filename": "claim-form.pdf",
  "category_id": "claimDocuments",
  "upload_timestamp": "2024-03-15T10:30:00.000"
}
```

The full set of sub-fields (per `Document.java`):

| Sub-field | Required | Notes |
|---|---|---|
| `document_url` | yes | DM-store URL |
| `document_binary_url` | yes | binary download URL |
| `document_filename` | yes | display name; backend search uses this (excluding extension) |
| `category_id` | no | CDAM category; if set, must match a `categoryId` for the case type or be NULL. Overrides any default category set on the field via `CaseField` / `ComplexTypes`. |
| `upload_timestamp` | no | ISO-8601 timestamp added at upload time |

<!-- DIVERGENCE: The previous draft listed a `document_hash` field. The SDK Document.java (libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java:17-32) does not include a `document_hash` field — it has `document_url`, `document_filename`, `document_binary_url`, `category_id`, and `upload_timestamp`. The hash field appears to be a CDAM-side concept, not a CCD case-data field. Source wins; removed. -->

The browser file-extension whitelist is configured per service (e.g.
`.pdf, .docx, .png, .jpg`). Search is EXACT match on the filename, **excluding
the extension**.
<!-- CONFLUENCE-ONLY: the per-service file-extension whitelist and EXACT-on-filename-minus-extension search semantics are documented on Confluence (205906788) but the whitelist is configured outside this codebase. -->

Modelled by `Document.java` in the SDK.

---

## AddressGlobalUK / AddressUK / AddressGlobal

Three platform address types, each a pre-defined `Complex`.

**AddressGlobalUK** — the most commonly used; supports both UK and international addresses:

```json
"applicantAddress": {
  "AddressLine1": "102 Petty France",
  "AddressLine2": "",
  "AddressLine3": "",
  "PostTown": "London",
  "County": "",
  "PostCode": "SW1H 9AJ",
  "Country": "United Kingdom"
}
```

**AddressUK** — UK-only address with postcode lookup (same fields, stricter postcode validation).

**AddressGlobal** — international address without postcode lookup.

All three extend `Address.java` and ship the same seven sub-fields. Confluence
documents per-sub-field max lengths enforced server-side:

| Sub-field | Max length |
|---|---|
| `AddressLine1` | 150 |
| `AddressLine2` | 50 |
| `AddressLine3` | 50 |
| `PostTown` | 50 |
| `County` | 50 |
| `PostCode` | 14 |
| `Country` | 50 |

Search is fuzzy on all sub-fields except `PostCode`, which is EXACT but
tolerant of presence/absence of the inner space.

<!-- DIVERGENCE: Confluence "CCD Supported Field Types" (205906788) claims AddressUK and AddressGlobalUK additionally include a `UPRN` (Unique Property Reference Number) sub-field with maxLength: 12. The SDK `Address.java`, `AddressUK.java`, and `AddressGlobalUK.java` (libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/) define no `UPRN` field — only the seven fields above. UPRN may be a platform-side definition not modelled in the SDK; treat with caution. Source wins. -->

All three are modelled under `sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/`.

---

## DynamicList, DynamicRadioList, DynamicMultiSelectList

Unlike `FixedList`, the options are **populated at runtime** by a mid-event or about-to-start callback. The full list plus the selected value are round-tripped in the case data.

**DynamicList / DynamicRadioList** — single selection:

```json
"hearingVenue": {
  "value": {
    "code": "COURT_001",
    "label": "Birmingham Civil Justice Centre"
  },
  "list_items": [
    { "code": "COURT_001", "label": "Birmingham Civil Justice Centre" },
    { "code": "COURT_002", "label": "Manchester Civil Justice Centre" }
  ]
}
```

**DynamicMultiSelectList** — multiple selections; `value` becomes an array:

```json
"selectedJudges": {
  "value": [
    { "code": "J001", "label": "Judge Adams" }
  ],
  "list_items": [
    { "code": "J001", "label": "Judge Adams" },
    { "code": "J002", "label": "Judge Brown" }
  ]
}
```

SDK classes: `DynamicList.java`, `DynamicListElement.java`, `DynamicMultiSelectList.java`.

### Where the list is populated

Options are populated by an `AboutToStart` (event start) or `MidEvent` (page
boundary) callback. Callback URLs in `CaseEventToFields` are only permitted on
the **first field of a page** and **never** on field one of page one (that
slot belongs to `AboutToStart`). Callback URLs in event configuration are only
permitted for the three `Dynamic*` field types.

CCD re-fires the callback on every page-boundary crossing, including
back-and-forward navigation. Services decide whether to preserve a previous
selection or rebuild the options list.

### What's persisted

CCD saves **both** the selected `value` **and** the `list_items` snapshot at
the time of selection, so the case carries the full menu the user saw. This
differs from `FixedList`, which only stores the selected code.

### MidEvent caveat

When CCD calls the MidEvent callback, the selected DynamicList arrives in the
payload as a plain **String** (the code), not a full DynamicList. The callback
must rebuild the field with both `value` and `list_items` set before returning,
otherwise CCD's validation will reject the response. See
[`docs/ccd/.work/confluence/explanation-data-types/1460552629.md`](../.work/confluence/explanation-data-types/1460552629.md)
for a walkthrough.

DynamicLists can be top-level, inside a Complex, or inside a `Collection<Complex>`
— the callback wiring is the same.

---

## OrganisationPolicy

Links a case to a solicitor organisation (from PRD / Ref Data). Used for case
access control: the assigned case role drives which users from the organisation
gain access.

```json
"applicantOrganisationPolicy": {
  "Organisation": {
    "OrganisationID": "Q8TRMJK",
    "OrganisationName": "Smith & Co Solicitors"
  },
  "OrgPolicyCaseAssignedRole": "[APPLICANTSOLICITOR]",
  "OrgPolicyReference": "REF-001",
  "PrepopulateToUsersOrganisation": "No"
}
```

Sub-fields per `OrganisationPolicy.java`:

| Sub-field | Type | Notes |
|---|---|---|
| `Organisation` | `Organisation` | Representing org. `null` if unrepresented. |
| `OrgPolicyCaseAssignedRole` | `R extends HasRole` | **Required.** Case role assigned to any solicitor representing this litigant. Service- and case-type-specific. Must match a case role defined on the `CaseRoles` tab; conventionally surrounded with square brackets, e.g. `[Claimant]`. |
| `OrgPolicyReference` | `String` | Free text meaningful to the organisation. |
| `PrepopulateToUsersOrganisation` | `YesOrNo` | If `Yes`, ExUI pre-populates the policy with the current user's own org on case creation. |
| `PreviousOrganisations` | `Set<PreviousOrganisationCollectionItem>` | History of representation — populated by NoC flow. |

The `Organisation` sub-field has only `OrganisationID` and `OrganisationName`
in the SDK.

<!-- DIVERGENCE: Confluence (205906788) claims `Organisation` has an `OrganisationAddress` (AddressGlobalUK) sub-field and that `OrganisationName` is deprecated; calls the reference field `Reference` on OrganisationPolicy; and lists a `LastNoCRequestedBy` field. None of these match the SDK — `Organisation.java` has only `OrganisationID`+`OrganisationName` (both first-class), `OrganisationPolicy.java` uses `OrgPolicyReference`, and `LastNoCRequestedBy` is not modelled. The org address likely lives in PRD, not in case data. Source wins. -->

Modelled by `OrganisationPolicy.java` and `Organisation.java`.

---

## ChangeOrganisationRequest

Payload type used during the Notice of Change (NoC) flow to capture a request
to change the organisation representing a litigant. Caseworkers (or the
auto-approval pathway) then review and apply or reject.

```json
"changeOrganisationRequestField": {
  "OrganisationToAdd": {
    "OrganisationID": "NEW_ORG",
    "OrganisationName": "New Firm LLP"
  },
  "OrganisationToRemove": {
    "OrganisationID": "OLD_ORG",
    "OrganisationName": "Old Firm Ltd"
  },
  "CaseRoleId": {
    "value": { "code": "[APPLICANTSOLICITOR]", "label": "[APPLICANTSOLICITOR]" },
    "list_items": []
  },
  "Reason": null,
  "NotesReason": "Solicitor change requested",
  "ApprovalStatus": "0",
  "RequestTimestamp": "2024-03-15T10:30:00.000",
  "ApprovalRejectionTimestamp": null,
  "CreatedBy": "user@example.com"
}
```

Sub-fields per `ChangeOrganisationRequest.java`:

| Sub-field | Type | Notes |
|---|---|---|
| `OrganisationToAdd` | `Organisation` | New representing org. |
| `OrganisationToRemove` | `Organisation` | Outgoing org (if any). |
| `CaseRoleId` | `DynamicList`-like (`R extends HasRole`) | The case role being moved. |
| `Reason` | `String` | Optional structured reason. |
| `NotesReason` | `String` | Free text rationale. |
| `ApprovalStatus` | `ChangeOrganisationApprovalStatus` | See enum below. |
| `RequestTimestamp` | `LocalDateTime` | When the request was raised. |
| `ApprovalRejectionTimestamp` | `LocalDateTime` | When the request was approved or rejected. |
| `CreatedBy` | `String` | Identity that submitted the request. |

`ApprovalStatus` is the wire string of the `ChangeOrganisationApprovalStatus`
enum:

| Wire value | Enum constant |
|---|---|
| `"0"` | `NOT_CONSIDERED` |
| `"1"` | `APPROVED` |
| `"2"` | `REJECTED` |

<!-- DIVERGENCE: Earlier draft labelled `0` as "pending". The SDK enum `ChangeOrganisationApprovalStatus.java` (libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/ChangeOrganisationApprovalStatus.java:11-17) names it `NOT_CONSIDERED`. The states are functionally equivalent — the request hasn't been actioned — but the constant name is `NOT_CONSIDERED`, not `PENDING`. Source wins. -->

<!-- DIVERGENCE: Confluence "CCD Supported Field Types" lists the timestamp field as `ApprovalRejectionTimeStamp` (capital S in "Stamp"). The SDK serialises it as `ApprovalRejectionTimestamp` (lowercase s) (ChangeOrganisationRequest.java:52). Source wins; the JSON key is `ApprovalRejectionTimestamp`. -->

Modelled by `ChangeOrganisationRequest.java`.

---

## CaseLink

A reference to another CCD case, used to build case relationships (e.g. consolidated claims, related family proceedings).

```json
"linkedCase": {
  "CaseReference": "1234567890123456",
  "CaseType": "CIVIL",
  "CreatedDateTime": "2024-03-15T10:30:00.000",
  "ReasonForLink": [
    {
      "id": "uuid-001",
      "value": {
        "Reason": "RELATED_CASE",
        "OtherDescription": null
      }
    }
  ]
}
```

Sub-fields per `CaseLink.java`:

| Sub-field | Type | Notes |
|---|---|---|
| `CaseReference` | `Text`, required | 16-digit CCD case reference |
| `ReasonForLink` | `Collection<LinkReason>` | Why the cases are linked |
| `CreatedDateTime` | `DateTime` | When the link was created |
| `CaseType` | `Text` | Case type of the linked case |

The reference passes a backend regex check against either the 16-digit form
or a hyphenated form:

```
(?:^[0-9]{16}$|^\d{4}-\d{4}-\d{4}-\d{4}$)
```

The front-end additionally runs a check-digit validation on input blur, and
the backend validates that the referenced case actually exists before save.
Search on `CaseReference` is EXACT — i.e. the linked case must exist for
search-style references to match.

`LinkReason` itself has two sub-fields: `Reason` (Text, sourced from RefData by
ExUI; supports `Other`) and `OtherDescription` (Text — used when `Reason ==
"Other"`).

Because only the case reference is stored, retrieving a linked case is via a
new API version that doesn't require jurisdiction / case type in the URL.

Modelled by `CaseLink.java` and `LinkReason.java`.

---

## TTL (Time-to-live)

Controls case retention / deletion scheduling.

```json
"TTL": {
  "SystemTTL": "2027-01-01",
  "OverrideTTL": null,
  "Suspended": "No"
}
```

Modelled by `TTL.java`. `SystemTTL` is set by the service; if it is absent the
case **cannot** be deleted by the retention job. `OverrideTTL` allows
caseworker override and takes precedence over `SystemTTL`. `Suspended`
(`YesOrNo`) pauses deletion — an empty value is treated as `No`.

`TTL` is implemented natively by the platform; services use the type by name
without redefining its sub-fields in their own `ComplexTypes` tab.

---

## Other platform-defined types (brief)

A handful more pre-defined types — exhaustive detail in
[`docs/ccd/reference/field-types.md`](../reference/field-types.md):

- **`Organisation`** — `OrganisationID` (required), `OrganisationName`. Used
  inside `OrganisationPolicy` and `ChangeOrganisationRequest`.
- **`PreviousOrganisation`** — history element on `OrganisationPolicy`
  (`FromTimestamp`, `ToTimestamp`, `OrganisationName`, `OrganisationAddress`).
- **`OrderSummary`** / **`Fee`** — fee summary populated by AboutToStart for
  payment events. Not searchable in CCD.
- **`JudicialUser`** — `idamId` + `personalCode` reference.
- **`CaseLocation`** / **`BaseLocation`** / **`Region`** — String-backed
  location identifiers, marked "in development".
  <!-- CONFLUENCE-ONLY: the "in development" status of CaseLocation/BaseLocation/Region per Confluence 205906788 — the SDK ships `CaseLocation.java` so the type exists, but production-readiness is Confluence's claim. -->
- **`CaseAccessGroup`** / **`CaseAccessGroups`** — `caseAccessGroupType` +
  `caseAccessGroupId` pair; services only set groups whose type they own.
- **`CaseQueriesCollection`** / **`CaseMessage`** — case-message threads
  with attachments, hearing flags, parent/reply linkage.
- **Marker types** — `FlagLauncher`, `ComponentLauncher`, `WaysToPay`,
  `CaseHistoryViewer`, `CasePaymentHistoryViewer`: empty base types whose only
  purpose is to tell ExUI to render a particular component. Only the `C` of
  CRUD applies. `CasePaymentHistoryViewer` requires the IDAM `payments` role.
- **`Flags`** / **`FlagDetail`** — case / party flags; see
  [`docs/ccd/explanation/case-flags.md`](case-flags.md).

---

## Metadata fields (`[CASE_REFERENCE]` and friends)

Some "fields" in CCD are not stored on case data but are read from the case
record itself (state, jurisdiction, timestamps, …). They're addressed using
square brackets in `CaseField` cells and curly-brace interpolation in markdown
labels:

```text
Hey, ${ApplicantFullName}, your CCD reference is ${[CASE_REFERENCE]}
```

Common metadata identifiers:

| ID | Description | Search? | Display type |
|---|---|---|---|
| `JURISDICTION` | Current jurisdiction | yes | Dropdown |
| `CASE_TYPE` | Current case type | yes | Dropdown |
| `STATE` | Current state | yes | Dropdown |
| `CASE_REFERENCE` | 16-digit case ID | yes | Text |
| `CREATED_DATE` | Case creation date | yes | Date |
| `LAST_MODIFIED_DATE` | Last modification date | yes | Date |
| `LAST_STATE_MODIFIED_DATE` | Last state-change time | yes | Date |
| `SECURITY_CLASSIFICATION` | Public / Private / Restricted | yes | Dropdown |

Several `_DESC` and `_DATETIME` siblings exist on Confluence (e.g.
`CASE_TYPE_DESC`, `CREATED_DATETIME`) but are **not yet implemented** —
expressions referencing them silently render empty.
<!-- CONFLUENCE-ONLY: the "Currently Implemented" column on Confluence (205906788) marks several metadata IDs as not yet implemented. This isn't represented in the SDK; treat the listing as a snapshot — verify before using `_DESC`/`_DATETIME` variants in production. -->

---

## SearchCriteria and SearchParty

Used for Global Search. `SearchCriteria` is a `Collection` of `SearchParty`
items mapping each party on the case to the global search index.

```json
"SearchCriteria": [
  {
    "id": "uuid-001",
    "value": {
      "SearchPartyName": "John Doe",
      "SearchPartyAddressLine1": "1 Example Street",
      "SearchPartyPostCode": "SW1A 1AA",
      "SearchPartyDob": "1970-01-01",
      "SearchPartyEmailAddress": "john@example.com"
    }
  }
]
```

Modelled by `SearchCriteria.java` and `SearchParty.java`.

---

## See also

- [`docs/ccd/reference/field-types.md`](../reference/field-types.md) — exhaustive
  per-type matrix (validation regex, search semantics, JSON shape, sub-fields).
  This page is the prose-flavoured companion; the reference is the lookup.
- [`docs/ccd/explanation/case-flags.md`](case-flags.md) — `Flags` and
  `FlagDetail` complex types used for case/party flags.
- [`docs/ccd/explanation/notice-of-change.md`](notice-of-change.md) — how
  `OrganisationPolicy` and `ChangeOrganisationRequest` are used in the NoC flow.
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions of
  CCD terms.
- [RetainHiddenValue](retain-hidden-value.md) — how complex types and collections interact with the field-retention flag on event wizard forms

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

