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
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Organisation.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/ListValue.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/FieldTypeEntity.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/entity/CaseFieldEntity.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/DisplayContextParameterValidator.java
  - ccd-definition-store-api:elastic-search-support/src/main/java/uk/gov/hmcts/ccd/definition/store/elastic/mapping/CaseMappingGenerator.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Field Types

CCD field types are declared in the `FieldType` column of the `CaseField` spreadsheet sheet (or the `fieldType` attribute in JSON definitions). The definition-store stores them in the `field_type` table (`FieldTypeEntity`) and pushes ES type mappings for each on import. The ccd-config-generator SDK mirrors every built-in type as a Java class under `uk.gov.hmcts.ccd.sdk.type`.

## TL;DR

- Every case field has a `FieldType` which controls rendering, validation, and Elasticsearch mapping.
- Primitive types (`Text`, `Number`, `Date`, etc.) map directly to scalar JSON values; complex types (`Complex`, `Collection`) nest sub-fields.
- `FixedList`, `MultiSelectList`, and `FixedRadioList` require a companion `FixedLists` sheet defining the allowed codes.
- `Collection` items are always wrapped in `ListValue<T>` (fields `id` + `value`) in the JSON representation.
- `DynamicList` and `DynamicMultiSelectList` are populated at runtime via a callback, not from the definition.
- Predefined platform complex types (`Address`, `Document`, `Organisation`, etc.) cannot have `AuthorisationComplexType` ACL rows — the import validator blocks it (`CaseFieldEntityComplexFieldACLValidatorImpl.java:38–49`).

## Primitive field types

| Type name | JSON discriminator | Semantics | Elasticsearch mapping | Common pitfalls |
|---|---|---|---|---|
| `Text` | `"Text"` | Unconstrained Unicode string | `{"type":"text","fields":{"keyword":{"type":"keyword"}}}` | No max-length validation at data-store level; add a `RegularExpression` type if pattern enforcement is needed |
| `TextArea` | `"TextArea"` | Multi-line text; rendered as `<textarea>` | Same as `Text` | Newlines preserved in storage; strip them if downstream systems cannot handle `\n` |
| `Number` | `"Number"` | Integer or decimal numeric string | `{"type":"double"}` | Stored as a string in the JSON; comparison in show-conditions uses numeric operators |
| `Money GBP` | `"Money GBP"` | Pence-precision currency; stored as integer pence | `{"type":"long"}` | Value is in **pence**, not pounds. Display formatting (`£`) is UI-only |
| `Date` | `"Date"` | ISO 8601 date (`YYYY-MM-DD`) | `{"type":"date","format":"yyyy-MM-dd"}` | Time component is truncated — use `DateTime` if time matters |
| `DateTime` | `"DateTime"` | ISO 8601 date-time (`YYYY-MM-DD'T'HH:mm:ss.SSS`) | `{"type":"date"}` | Time zone is not stored; treated as UTC |
| `Email` | `"Email"` | Email address; RFC 5322 format validated by UI | `{"type":"keyword"}` | Data-store does not re-validate format; only the UI enforces it |
| `PhoneUK` | `"PhoneUK"` | UK telephone number string | `{"type":"keyword"}` | No server-side normalisation; `+44` and `07xxx` formats both accepted |
| `YesOrNo` | `"YesOrNo"` | Enum: `"Yes"` or `"No"` | `{"type":"keyword"}` | SDK class: `YesOrNo` (`YesOrNo.java`). Show-conditions use string literals `"Yes"`/`"No"`, not booleans |
| `PostCode` | `"PostCode"` | UK postcode; formatted by UI | `{"type":"keyword"}` | Stored as entered — no normalisation to uppercase or removal of spaces |
| `Label` | `"Label"` | Display-only text; no stored value | Not indexed | Value is never persisted to case data. Set `DisplayContext = READONLY` |
| `OrderSummary` | `"OrderSummary"` | Payment order summary (predefined complex type) | Object mapping | SDK class: `OrderSummary.java`. Sub-fields: `paymentReference`, `paymentTotal`, `fees` (collection) |

## Collection and complex types

| Type name | JSON discriminator | Semantics | SDK class | Common pitfalls |
|---|---|---|---|---|
| `Collection` | `"Collection"` | Ordered list of sub-type items. Each item serialises as `{"id":"<uuid>","value":<item>}` | `ListValue<T>` (`ListValue.java`) | Always use `List<ListValue<T>>` in Java model classes. Omitting the `id`/`value` wrapper causes deserialisation failures |
| `Complex` | `"Complex"` | Structured group of named sub-fields; defined in `ComplexTypes` sheet | Varies — e.g. `Address`, `Document`, `Organisation` | Sub-fields inherit ACL from parent by default; override via `AuthorisationComplexType` sheet (dot-notation path) |
| `MultiSelectList` | `"MultiSelectList"` | Multiple-choice fixed-list; stored as JSON array of codes | None (array of strings) | Requires a `FixedLists` companion sheet. Empty selection stores `[]`, not `null` |

## Fixed-list types

All three require a companion `FixedLists` sheet row per list code (`ListElementCode` + `ListElement` columns are required — `ColumnName.java:172–173`). The `field_type` table stores the parent type with `base_field_type_id` referencing the appropriate base type (`FieldTypeEntity.java:87–89`).

| Type name | JSON discriminator | Semantics | Common pitfalls |
|---|---|---|---|
| `FixedList` | `"FixedList"` | Single-select dropdown; value stored as the `ListElementCode` string | Changing a code after data exists orphans existing values — plan code stability from the start |
| `FixedRadioList` | `"FixedRadioList"` | Radio-button variant of `FixedList`; same storage format | UI renders all options simultaneously — keep lists short (≤5 items) |
| `MultiSelectList` | `"MultiSelectList"` | (See above) | — |

## Dynamic list types

Dynamic lists are populated at runtime via an `aboutToStart` or mid-event callback, not from the definition. The callback must return a `DynamicList` or `DynamicMultiSelectList` value in the case data.

| Type name | JSON discriminator | Semantics | SDK class | Common pitfalls |
|---|---|---|---|---|
| `DynamicList` | `"DynamicList"` | Single-select list whose options arrive at event-open time | `DynamicList` / `DynamicListElement` (`DynamicList.java`); note: not in `FieldType.java` enum but exists as a platform type and SDK class | The callback must set both `list_items` (available options) and `value` (selected item). Omitting `list_items` renders an empty dropdown |
| `DynamicMultiSelectList` | `"DynamicMultiSelectList"` | Multi-select variant | `DynamicMultiSelectList.java` | Same callback contract as `DynamicList`; selected items arrive as an array in `value` |
| `DynamicRadioList` | `"DynamicRadioList"` | Radio-button variant populated at runtime | None (platform type) | Same callback contract; use when option count is small and all should be visible simultaneously |

## Document type

| Type name | JSON discriminator | Semantics | Sub-fields | Common pitfalls |
|---|---|---|---|---|
| `Document` | `"Document"` | Binary document managed by CDAM / Document Management | `document_url`, `document_binary_url`, `document_filename`, `document_hash` | SDK class: `Document.java`. Always store the URL returned by CDAM — never a locally constructed URL. `document_hash` is required for secure document access |

## Address types

All address types are predefined complex types. They cannot carry `AuthorisationComplexType` ACL rows.

| Type name | SDK class | Semantics |
|---|---|---|
| `Address` | `Address.java` | Unvalidated UK address (free-text sub-fields) |
| `AddressUK` | `AddressUK.java` | Validated UK address; sub-fields: `AddressLine1–3`, `PostTown`, `County`, `PostCode`, `Country` |
| `AddressGlobal` | `AddressGlobal.java` | International address |
| `AddressGlobalUK` | `AddressGlobalUK.java` | International address with UK-biased postcode field |

## Platform / integration complex types

These are provided by the platform and consumed by services that need the corresponding feature. All are predefined; service teams annotate Java model fields with the relevant class from `uk.gov.hmcts.ccd.sdk.type`.

| Type name | SDK class | Semantics | Notes |
|---|---|---|---|
| `CaseLink` | `CaseLink.java` | Reference to another CCD case by case reference | `LinkReason.java` carries the optional reason code |
| `CaseLocation` | `CaseLocation.java` | HMCTS court/region location identifier | Used by hearing/listing integrations |
| `Organisation` | `Organisation.java` | Reference to a PBA organisation | Sub-fields: `OrganisationID`, `OrganisationName` |
| `OrganisationPolicy` | `OrganisationPolicy.java` | Organisation + case role assignment for NoC | Sub-fields: `Organisation`, `OrgPolicyCaseAssignedRole`, `OrgPolicyReference` |
| `ChangeOrganisationRequest` | `ChangeOrganisationRequest.java` | Payload for a Notice of Change organisation-change request | `ChangeOrganisationApprovalStatus` enum tracks approval state |
| `Flags` | `Flags.java` | Case Flags complex type (`@ComplexType(name="Flags", generate=false)`) | Sub-types: `FlagDetail`, `FlagType`, `FlagVisibility` |
| `SearchCriteria` | `SearchCriteria.java` | Global Search party/criteria config | `SearchParty.java` is the item type |
| `TTL` | `TTL.java` | Time-to-live / case retention window | `ttlIncrement` on the event controls automatic extension |
| `ScannedDocument` | `ScannedDocument.java` | Bulk-scan document reference | Related: `ExceptionRecord`, `BulkScanEnvelope` |
| `OrderSummary` | `OrderSummary.java` | Payments order summary | Sub-fields: `paymentReference`, `paymentTotal`, `fees` collection of `Fee` |
| `KeyValue` | `KeyValue.java` | Generic string key-value pair | Useful for metadata maps in collections |

## Elasticsearch type mappings

The definition-store pushes an ES mapping for every field on import. `CaseMappingGenerator` generates the `data` object mapping by looking up each field's base type string in `CcdElasticSearchProperties.typeMappings` (`BaseTypeMappingGenerator.java:22–25`). Text fields automatically get a `.keyword` sub-field for sort support; `SearchAliasField` entries get an additional `<name>_keyword` alias (`CaseMappingGenerator.java:118–131`).

Fields with `searchable = false` on `CaseFieldEntity` are excluded from the ES mapping entirely. The default is `searchable = true` (`CaseFieldEntity.java:32–88`).

## DisplayContextParameter formats

`DisplayContextParameter` applies to fields in `CaseField`, `ComplexTypes`, `CaseEventToFields`, and all layout sheets. `DisplayContextParameterValidator` validates the format at import time. Common patterns:

| Format | Applies to | Effect |
|---|---|---|
| `#TABLE(col1, col2)` | `Collection` fields | Renders collection as a table with named columns |
| `#DATETIMEDISPLAY(DD/MM/YYYY)` | `Date` / `DateTime` fields | Overrides display format string |
| `#DATETIMEENTRY(DD/MM/YYYY)` | `Date` / `DateTime` fields | Overrides entry format string |

## See also

- [Data types](../explanation/data-types.md) — conceptual explanation of how CCD's type system works
- [Add a complex type](../how-to/add-a-complex-type.md) — how to define and use a custom complex type in your case definition
- [Glossary](glossary.md) — definitions for ListElementCode, DisplayContext, etc.

## Glossary

| Term | Definition |
|---|---|
| `FieldType` | The type discriminator string stored in the `FieldType` column of the `CaseField` sheet and in `field_type.reference` in the DB |
| `ListValue<T>` | SDK wrapper class that adds an `id` UUID and a `value` sub-object around every item in a `Collection` field |
| `base_field_type_id` | Foreign key on `FieldTypeEntity` pointing to the built-in primitive type that a user-defined `FixedList` or `Complex` type extends |
| `DisplayContextParameter` | Annotation string on a field row (e.g. `#TABLE(...)`) that modifies rendering behaviour without changing stored type |
