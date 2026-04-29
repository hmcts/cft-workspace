---
topic: data-types
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FieldType.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/DynamicList.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/OrganisationPolicy.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/ChangeOrganisationRequest.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/AddressGlobalUK.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/CaseLink.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/ListValue.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/YesOrNo.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/FieldTypeEntity.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# CCD Field Data Types

## TL;DR

- CCD fields have a `FieldType` declared in the definition spreadsheet's `CaseField` sheet — it controls how data is stored, validated, and rendered.
- Primitives (`Text`, `Number`, `Date`, `DateTime`, `Email`, `TextArea`, `MoneyGBP`, `PhoneUK`, `YesOrNo`) store a single scalar value as a JSON string. Note: `Number`, `DateTime`, and `Postcode` are platform-level type names recognised by the definition store but are not present in the SDK's `FieldType.java` enum — use them as string literals in JSON definitions.
- Structural types — `Collection<T>`, `Complex`, `FixedList`, `MultiSelectList`, `DynamicList`, `DynamicRadioList`, `DynamicMultiSelectList` — produce nested JSON objects or arrays.
- Purpose-built complex types (`Document`, `AddressGlobalUK`, `OrganisationPolicy`, `ChangeOrganisationRequest`, `CaseLink`) are pre-defined by the platform and referenced by name in the `FieldType` column.
- `Collection<T>` items are always wrapped in `{"id": "<uuid>", "value": <T>}` via `ListValue<T>` — do not strip the wrapper when reading or writing case data.

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

Reference to a file managed by CDAM / Document Management Store. All three fields are required.

```json
"claimForm": {
  "document_url": "https://dm-store/documents/a1b2c3",
  "document_binary_url": "https://dm-store/documents/a1b2c3/binary",
  "document_filename": "claim-form.pdf",
  "document_hash": "hashvalue",
  "category_id": "claimDocuments"
}
```

`document_hash` and `category_id` are optional but required for CDAM-secured access. Modelled by `Document.java` in the SDK.

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

**AddressUK** — validated UK-only address (same fields, stricter postcode validation).

**AddressGlobal** — international address without postcode validation.

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

The callback must populate `list_items` before the page renders; CCD does not persist `list_items` between events — only `value` is stored.

---

## OrganisationPolicy

Links a case to a solicitor organisation (from PBA/Ref Data). Used for case access control via the `Organisation` and `OrgPolicyCaseAssignedRole` fields.

```json
"applicantOrganisationPolicy": {
  "Organisation": {
    "OrganisationID": "Q8TRMJK",
    "OrganisationName": "Smith & Co Solicitors"
  },
  "OrgPolicyCaseAssignedRole": "[APPLICANTSOLICITOR]",
  "OrgPolicyReference": "REF-001"
}
```

`OrgPolicyCaseAssignedRole` must match a case role defined in the `CaseRoles` sheet. Modelled by `OrganisationPolicy.java` and `Organisation.java`.

---

## ChangeOrganisationRequest

Payload type used during the Notice of Change (NoC) flow to request a change of representing organisation.

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
  "ApprovalRejectionTimestamp": null
}
```

`ApprovalStatus` maps to `ChangeOrganisationApprovalStatus` enum (`0` = pending, `1` = approved, `2` = rejected). Modelled by `ChangeOrganisationRequest.java`.

---

## CaseLink

A reference to another CCD case, used to build case relationships.

```json
"linkedCase": {
  "CaseReference": "1234567890123456",
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

`CaseReference` is the 16-digit CCD case reference. `ReasonForLink` is a `Collection` of `LinkReason`. Modelled by `CaseLink.java` and `LinkReason.java`.

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

Modelled by `TTL.java`. `SystemTTL` is set by the service; `OverrideTTL` allows caseworker override; `Suspended` (`YesOrNo`) pauses deletion.

---

## SearchCriteria and SearchParty

Used for Global Search. `SearchCriteria` is a `Collection` of `SearchParty` items that define how a party on the case maps to the global search index.

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

- [`docs/ccd/explanation/case-flags.md`](case-flags.md) — `Flags` and `FlagDetail` complex types used for case/party flags
- [`docs/ccd/explanation/notice-of-change.md`](notice-of-change.md) — how `OrganisationPolicy` and `ChangeOrganisationRequest` are used in the NoC flow
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions of CCD terms

## Glossary

| Term | Definition |
|---|---|
| `FieldType` | The CCD type identifier declared in the `CaseField` spreadsheet sheet; controls storage, validation, and rendering. |
| `ListValue<T>` | SDK wrapper for collection items; adds a platform-managed `id` UUID alongside the `value`. |
| `list_items` | The runtime options array in `DynamicList` / `DynamicRadioList` / `DynamicMultiSelectList`; populated by callbacks, not persisted. |
| `OrgPolicyCaseAssignedRole` | The case role string (e.g. `[APPLICANTSOLICITOR]`) inside `OrganisationPolicy` that controls which users gain access via that org. |
