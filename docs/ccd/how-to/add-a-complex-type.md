---
topic: data-types
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ComplexType.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ComplexTypeAuthorisation.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Tab.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/ConfigBuilderImpl.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Address.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/AddressUK.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseData.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerRoundTripData.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/common/ccd/PageBuilder.java
examples_extracted_from:
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/model/SimpleCaseNote.java
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/model/SimpleCaseData.java
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerRoundTripData.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1134527861"
    title: "CRUD on Complex Types"
    space: "RCCD"
  - id: "1454903954"
    title: "Configuring Complex type ordering"
    space: "RCCD"
  - id: "1384842314"
    title: "A Guide to using the DefaultValue column on the EventToComplexType tab"
    space: "RCCD"
  - id: "1457305822"
    title: "Retain Hidden Values"
    space: "RCCD"
  - id: "1457315279"
    title: "Default Field Values"
    space: "RCCD"
  - id: "205906788"
    title: "CCD Supported Field Types"
    space: "RCCD"
---

# Add a Complex Type

## TL;DR

- A ComplexType is a named group of sub-fields modelled as a Java class; the SDK generates the `ComplexTypes` and `CaseField` definition sheets from it automatically. The CCD spreadsheet equivalent is the `ComplexTypes` tab where each row carries a `(ComplexType ID, ListElementCode, FieldType, …)` triple.
- Annotate sub-fields on the class with `@CCD(label = "...")` to control labels, hints, min/max length, regex, and `typeOverride`.
- Add the complex type as a field on your case-data class; the field type in the generated definition becomes `Complex` with the class name as the type ID.
- Reference sub-fields on event pages using the SDK's `.complex(getter)…done()` builder — **not** dot-path strings on `mandatory(...)`. Use the `field("parent.subField")` overload only on **tabs** and search/work-basket inputs.
- Sub-fields are referenced externally (in show conditions, AuthorisationComplexType rows, EventToComplexTypes rows) by **dot-path** (`parent.child.grandchild`).
- Built-in complex types (`AddressUK`, `Address`, `Document`, `Organisation`, `OrganisationPolicy`, `Flags`, etc.) live under `sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/` and are pre-registered with CCD (`generate = false` on `@ComplexType`).
- Per-element CRUD permissions, `RetainHiddenValue`, `FieldShowCondition`, `FieldDisplayOrder` and `DefaultValue` can all be set per sub-field.

---

## 1. Define the complex type class

Create a Java class for your complex type. Each field becomes a sub-field (a "ListElementCode" in CCD terms) in the ComplexTypes sheet. The class name becomes the `ComplexType ID`.

```java
import lombok.Data;
import uk.gov.hmcts.ccd.sdk.api.CCD;

@Data
public class ContactAddress {

    @CCD(label = "Address line 1")
    private String addressLine1;

    @CCD(label = "Address line 2")
    private String addressLine2;

    @CCD(label = "Post town")
    private String postTown;

    @CCD(label = "Post code", regex = "^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$")
    private String postCode;

    @CCD(label = "Country")
    private String country;

    @CCD(label = "Care of name")
    private String careOf;
}
```

Sub-field types can be any CCD primitive (`String` → `Text`, `LocalDate` → `Date`, etc.) or another complex type for nesting.

### `@ComplexType` vs `@CCD`

There are two distinct annotations:

- `@CCD` annotates **fields** (sub-fields). It controls label/hint, min/max length, regex, `typeOverride`, access etc.
- `@ComplexType` annotates **classes**, and is only needed when you want to override the generated name, set a label/border, or mark a built-in (`generate = false`). For a fresh service-defined complex type you do not need it — the SDK derives the ComplexType ID from the class name.

```java
// from sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/AddressUK.java
@ComplexType(name = "AddressUK", generate = false)
public class AddressUK extends Address { … }
```

`generate = false` tells the SDK *not* to emit a ComplexTypes sheet entry — CCD already has the type built-in.

If you want to reuse an SDK built-in instead of writing your own, import it directly:

```java
import uk.gov.hmcts.ccd.sdk.type.AddressUK;
```

`AddressUK` provides the standard validated UK address fields with the canonical CCD JSON shape (note the PascalCase JSON property names, which Jackson maps via `@JsonProperty`):

```json
{
  "AddressLine1": "123",
  "AddressLine2": "New Street",
  "AddressLine3": "London",
  "PostTown": null,
  "County": null,
  "PostCode": "PP01 PPQ",
  "Country": "England"
}
```

<!-- source: libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/AddressUK.java:13-32 -->

---

## 2. Add the field to your case-data class

Reference the complex type as a field on your case-data class:

```java
@Data
public class CaseData {

    @CCD(
        label = "Contact address",
        access = {DefaultAccess.class}
    )
    private ContactAddress contactAddress;

    // ... other fields
}
```

The SDK resolves the Java type at generation time and emits:

- A `ComplexTypes` sheet with rows like `(ContactAddress, addressLine1, Text, …)`, `(ContactAddress, postCode, Text, …)`.
- A `CaseField` row with `FieldType = Complex` and `FieldTypeParameter = ContactAddress`.

The CCD spreadsheet schema for the resulting `ComplexTypes` row is:

| Column | Meaning |
|---|---|
| `ID` | The ComplexType ID — i.e. the parent class name (e.g. `ContactAddress`). |
| `ListElementCode` | The sub-field name (e.g. `postCode`). For nested complex types use **dot notation** (e.g. `applicantAddress.AddressLine1`). |
| `FieldType` | A CCD base type (`Text`, `Date`, `YesOrNo`, `FixedList`, …) or another `ComplexType` ID. |
| `FieldTypeParameter` | Used when `FieldType` is `FixedList`/`MultiSelectList`/`Collection`. |
| `ElementLabel` | Sub-field label shown in the UI. |
| `FieldShowCondition` | Optional show-condition referencing **siblings on the same level** (e.g. `furtherComments="Yes"`). |
| `RetainHiddenValue` | `Yes`/`No` — whether the value persists when hidden. Defaults to `No`. See §6. |
| `MinLength` / `MaxLength` | For text-type sub-fields. Length of a text field IN A COLLECTION cannot be defined; nest it inside a complex type instead. |
| `RegularExpression` | Server-side validation regex on the sub-field. |
| `DisplayOrder` | Default render order on tabs and pages. |

<!-- source: libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CCD.java -->

---

## 3. Reference the field on an event page

Add the whole complex field to an event page using the field accessor — CCD then renders all sub-fields in the order defined on the class.

```java
@Component
public class UpdateContactAddress implements CCDConfig<CaseData, State, UserRole> {

    @Override
    public void configure(ConfigBuilder<CaseData, State, UserRole> configBuilder) {
        new PageBuilder(configBuilder
            .event("update-contact-address")
            .forAllStates()
            .name("Update contact address")
            .grant(Permissions.CREATE_READ_UPDATE, UserRole.CASE_WORKER))
            .page("contactAddressPage")
            .pageLabel("Contact address")
            .mandatory(CaseData::getContactAddress);   // renders all sub-fields
    }
}
```

### Adding only specific sub-fields, or reordering them — use `.complex(...).…done()`

To include only specific sub-fields on a page (or reorder them) the SDK exposes a nested `complex(getter)` builder that drops you one level into the parent type. Inside, the `getter` references are typed against the **sub-field class**, and you call `.done()` to pop back out.

```java
// from libs/ccd-config-generator/test-projects/e2e/src/main/java/
//      uk/gov/hmcts/divorce/sow014/nfd/CaseworkerRoundTripData.java:49-67
.page("roundTripData", this::roundTripMidEvent)
    .pageLabel("Round-trip data set")
    .complex(CaseData::getApplicant1)
        .optional(Applicant::getFirstName)
        .optional(Applicant::getLastName)
        .optional(Applicant::getMiddleName)
        .optional(Applicant::getEmail)
    .done()
    .complex(CaseData::getApplicant2)
        .optional(Applicant::getFirstName)
        .optional(Applicant::getLastName)
    .done()
.done();
```

<!-- source: libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/CaseworkerRoundTripData.java:41-67 -->

Behind the scenes this records `DisplayContext = COMPLEX` on the `CaseEventToFields` row for the parent and emits one `EventToComplexTypes` row per chosen sub-field. The `FieldDisplayOrder` on each `EventToComplexTypes` row controls the order the sub-fields render in for **this event** (overriding the class-declared order).

<!-- DIVERGENCE: an earlier draft of this how-to suggested `.mandatory(CaseData::getContactAddress, "contactAddress.postCode")` to add an individual sub-field on a page. There is no such overload on FieldCollection.FieldCollectionBuilder — see libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java:76-262. The dot-path string overload exists on **tabs** only (Tab.java:56). Use `.complex(getter).optional(SubType::getField).done()` for event pages. Source wins. -->

> Confluence: when you switch a complex field to per-element rendering on the page, **omitting** an element from `EventToComplexTypes` causes CCD to send it to ExUI with `displayContext: HIDDEN` — the sub-field is invisible on the wizard. The SDK's `.complex(...)` builder is what generates the explicit per-element `EventToComplexTypes` rows.

### Reordering with multi-level nesting

When a complex sub-field is itself a complex type (e.g. `respondentDetails.address`), order each level on its own line. Sub-fields without an explicit order sink to the bottom of their level after ordered ones.
<!-- CONFLUENCE-ONLY: ordering of sub-fields with no explicit FieldDisplayOrder placing them last on their level — described on Configuring Complex type ordering (1454903954) but not surfaced through SDK API; depends on CCD data store rendering. -->

---

## 4. Show the field in a tab

Use `ConfigBuilder.tab()` and reference the field and its sub-fields. **On tabs** the dot-path string overload is the supported way to pick out one sub-field:

```java
configBuilder
    .tab("caseDetailsTab", "Case details")
    .field(CaseData::getContactAddress)             // show all sub-fields
    .field("contactAddress.postCode");              // show only post code
```

To conditionally show a sub-field, pass a show-condition using the same dot path:

```java
configBuilder
    .tab("caseDetailsTab", "Case details")
    .field(CaseData::getContactAddress,
           "contactAddress.country=\"United Kingdom\"");
```

The tab builder is available via `ConfigBuilder.tab(tabId, tabLabel)` — see `ConfigBuilder.java:41`. The `field(String)` and `field(String, showCondition)` overloads are at `Tab.java:56-64`.

The same dot-path syntax applies to:

- **Show conditions** anywhere in the definition (page-level, tab-level, sub-field-level) — see [`docs/ccd/reference/show-conditions.md`](../reference/show-conditions.md).
- **AuthorisationComplexType** rows for per-element CRUD (§5).
- Search and work-basket input filters.

---

## 5. Per-sub-field CRUD with `AuthorisationComplexType`

By default, every sub-field of a complex type inherits the parent CaseField's CRUD permissions. To grant different CRUD per sub-field per role, the SDK emits an `AuthorisationComplexType` (or `AuthorisationComplexTypes`) sheet — populated via `ConfigBuilder.grantComplexType(...)`:

```java
configBuilder.grantComplexType(
    CaseData::getContactAddress,                    // parent CaseField
    "postCode",                                      // ListElementCode (dot-path for nested)
    Set.of(Permission.R, Permission.U),              // CRUD subset
    UserRole.CASE_WORKER
);
```

<!-- source: libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/ConfigBuilderImpl.java:345-353 -->

Behaviour rules from the CRUD-on-Complex-Types specification:

- The `ListElementCode` column accepts **dot notation** for deeply nested elements (e.g. `applicantAddress.PostCode`).
- If you **omit** a sub-field from the `AuthorisationComplexType` sheet for a role, that sub-field has **no effective permissions** for that role and is hidden.
- If you grant CRUD at a parent level but stop defining at one nesting level, deeper children **inherit from the deepest level explicitly defined**.

Example (from Confluence) — Citizen has full CRUD; Court Staff can only update address lines:

| CaseFieldID | ListElementCode | CRUD | UserRole |
| --- | --- | --- | --- |
| `ApplicantDetails` | `Name` | `CRUD` | Citizen |
| `ApplicantDetails` | `ApplicantAddress` | `CRUD` | Citizen |
| `ApplicantDetails` | `ApplicantAddress.AddressLine1` | `CRUD` | Citizen |
| `ApplicantDetails` | `ApplicantAddress.PostCode` | `CRUD` | Citizen |
| `ApplicantDetails` | `Name` | `R` | Court Staff |
| `ApplicantDetails` | `ApplicantAddress` | `RU` | Court Staff |
| `ApplicantDetails` | `ApplicantAddress.PostCode` | `RU` | Court Staff |

<!-- source: docs/ccd/.work/confluence/how-to-add-a-complex-type/1134527861.md (Confluence "CRUD on Complex Types", RCCD) -->

---

## 6. Persistence of hidden sub-fields — `RetainHiddenValue`

A sub-field with a `FieldShowCondition` that evaluates `false` is hidden in the UI. The default behaviour is **identical for top-level fields and complex sub-fields**:

| | Top-level field | Complex sub-field |
|---|---|---|
| Hidden field value persisted on the case | No | No |
| Existing value retained on the case data | No | No |

To **retain** a hidden value across submissions, set `RetainHiddenValue = Yes` in the `ComplexTypes` row. With Yes:

- The hidden value is sent to MidEvent callbacks.
- On submit it remains in the DB; if the field becomes visible again later, the previous value is shown.

With No (the default):

- The hidden value is sent to callbacks as `null` and persisted as `null` on submit.

**Inheritance rules**:

- Sub-elements of a complex type **do not inherit** `RetainHiddenValue` from the parent CaseEventToFields row. Each sub-element must be explicitly set on the ComplexTypes tab if non-default behaviour is wanted.
- Setting `RetainHiddenValue = Yes` on a parent complex while a sub-element has `RetainHiddenValue = No` is valid; the inverse (parent No, child Yes) is **invalid and fails import**.
- `RetainHiddenValue = Yes` without an associated `FieldShowCondition` also fails import validation.

<!-- source: docs/ccd/.work/confluence/how-to-add-a-complex-type/1457305822.md (Confluence "Retain Hidden Values", RCCD) -->
<!-- CONFLUENCE-ONLY: import-validation rule that RetainHiddenValue=Yes requires a FieldShowCondition is enforced server-side in ccd-definition-store-api but not visible through the SDK at generation time. -->

The SDK exposes this via the `retainHiddenValue` boolean on `mandatory(...)`, `optional(...)`, `readonly(...)` and `complex(...)` — see [`FieldCollection.java`](https://github.com/hmcts/ccd-config-generator).

---

## 7. Default values via `EventToComplexTypes`

The `DefaultValue` column on the `EventToComplexTypes` tab pre-populates a sub-field when the event is started. Standard principles apply: callbacks may modify the value, and (if the field is editable in this event) the user may also modify it.

Rules:

- Defaulting can **only** be defined on `EventToComplexTypes` — i.e. on **sub-fields of complex types**. Defaulting a top-level non-complex field is **not** supported. <!-- CONFLUENCE-ONLY: introduced as part of "Assign Access to a Case" (ACA); future enhancement scope mentions extending to top-level fields via CaseEventToFields, but as of the page being read this is not implemented. -->
- The `DefaultValue` must be of the correct field type for the `ListElementCode` being defaulted.
- The default is applied **irrespective** of show-conditions on the sub-field.
- The user must have `C` or `U` permission on the sub-field for the default to take effect.
- There is no way to set a value to `null` via defaulting — you cannot wipe a value by defaulting it.

Example: defaulting `OrgPolicyCaseAssignedRole` on two `OrganisationPolicy` top-level fields:

| ID | CaseEventID | CaseFieldID | ListElementCode | DefaultValue | DisplayContext |
| --- | --- | --- | --- | --- | --- |
| `OrganisationPolicy` | `createCase` | `applicantOrganisationPolicy` | `OrgPolicyCaseAssignedRole` | `[ApplicantSolicitor]` | `READONLY` |
| `OrganisationPolicy` | `createCase` | `respondentOrganisationPolicy` | `OrgPolicyCaseAssignedRole` | `[RespondentSolicitor]` | `READONLY` |

When the parent is itself a service-defined complex type, the `ListElementCode` uses **dot notation** for the nested element:

| ID | CaseFieldID | ListElementCode | DefaultValue |
| --- | --- | --- | --- |
| `Litigant` | `Applicant` | `MyOrgPolicy.OrgPolicyCaseAssignedRole` | `[ApplicantSolicitor]` |

<!-- source: docs/ccd/.work/confluence/how-to-add-a-complex-type/1457315279.md (Confluence "Default Field Values", RCCD) and 1384842314.md ("DefaultValue column on EventToComplexType") -->

---

## 8. Generate and import the definition

Run the SDK definition generator. With the `ccd-config-generator` Gradle plugin applied:

```bash
./gradlew generateCCDConfig
```

Inspect the output under `build/definitions/`. Confirm:

- `ComplexTypes.json` (or the equivalent sheet) contains a `ContactAddress` entry with all sub-fields.
- `CaseField.json` contains your field with `"fieldType": { "type": "Complex", "complexFields": [...] }`.
- If you used `.complex(getter)…done()` for per-element page rendering, `EventToComplexTypes.json` carries one row per chosen sub-field with the right `FieldDisplayOrder`.
- If you called `grantComplexType(...)`, `AuthorisationComplexType.json` reflects the per-role/per-element grants.

Import the generated definition into CCD definition store via the CCD admin UI or the import API before testing in the UI.

---

## Verify

1. After importing, open the CCD case list and create or update a case with the `update-contact-address` event. The address sub-fields should render on the event wizard page.
2. Navigate to the case detail view and open the tab configured in §4. The `contactAddress` sub-fields should appear. If you added a show-condition, confirm it fires correctly by toggling the relevant field value.
3. If you set `grantComplexType(...)`, log in as a different role and confirm the restricted sub-fields are read-only or hidden as expected.
4. If you set `RetainHiddenValue = Yes` on a sub-field, populate it, hide it via its show-condition, submit the event, then unhide and confirm the value is restored.

---

## Example

### config-generator form — ComplexType class with `@CCD` sub-field annotations

```java
// from libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/model/SimpleCaseNote.java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimpleCaseNote {

    @CCD(label = "Author")
    private String author;

    @CCD(label = "Date")
    private LocalDateTime timestamp;

    @CCD(label = "Note", typeOverride = FieldType.TextArea)
    private String note;
}
```

<!-- source: libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/model/SimpleCaseNote.java:1-26 -->

The field is then referenced from the case-data class as a `Collection` of the complex type:

```java
// from libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/model/SimpleCaseData.java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimpleCaseData {

    // ...

    @CCD(access = {DefaultAccess.class})
    @Builder.Default
    private List<ListValue<SimpleCaseNote>> notes = new ArrayList<>();
}
```

<!-- source: libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/model/SimpleCaseData.java:36-39 -->

## See also

- [`docs/ccd/reference/field-types.md`](../reference/field-types.md) — full list of CCD primitive types and their Java mappings
- [`docs/ccd/how-to/add-a-collection-field.md`](../how-to/add-a-collection-field.md) — wrapping a complex type in a `Collection` using `ListValue<T>`
- [`docs/ccd/explanation/case-type-model.md`](../explanation/case-type-model.md) — how ComplexTypes fit into the overall case-type model
- [`docs/ccd/reference/show-conditions.md`](../reference/show-conditions.md) — dot-path syntax for sub-field show-conditions

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

