---
topic: data-types
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Address.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/AddressUK.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseData.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/common/ccd/PageBuilder.java
examples_extracted_from:
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/model/SimpleCaseNote.java
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/simplecase/model/SimpleCaseData.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Add a Complex Type

## TL;DR

- A ComplexType is a named group of sub-fields modelled as a Java class annotated with `@CCD`; the SDK generates the `ComplexTypes` and `CaseField` definition sheets from it automatically.
- Define sub-fields as Java fields on the class; annotate each with `@CCD(label = "...")` to control the CCD label.
- Add the complex type as a field on your case-data class; the field type in the generated definition becomes `Complex` with the class name as the type ID.
- Reference sub-fields on event pages using dot notation — e.g. `.field(CaseData::getAddress, DisplayContext.MANDATORY)` then `.field("address.postCode")` for an individual sub-field.
- Show/hide individual sub-fields in tabs and pages using the same dot-path syntax in show-condition expressions.
- Built-in complex types (`AddressUK`, `Address`, `Document`, `Organisation`, etc.) live under `sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/` and can be used directly as field types.

---

## 1. Define the complex type class

Create a Java class for your complex type. Annotate it with `@CCD` if you need to override the generated type ID or label. Each field becomes a sub-field in the CCD complex type.

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

    @CCD(label = "Post code")
    private String postCode;

    @CCD(label = "Country")
    private String country;

    @CCD(label = "Care of name")
    private String careOf;
}
```

Sub-field types can be any CCD primitive (`String` → `Text`, `LocalDate` → `Date`, etc.) or another complex type for nesting.

If you want to reuse an SDK built-in instead of writing your own, import it directly:

```java
import uk.gov.hmcts.ccd.sdk.type.AddressUK;
```

`AddressUK` provides the standard validated UK address fields and is already registered in the SDK type system (`sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/AddressUK.java`).

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
- A `ComplexTypes` sheet row with ID `ContactAddress` and each sub-field as a child row.
- A `CaseField` row with `FieldType = Complex` and `FieldTypeParameter = ContactAddress`.

---

## 3. Reference the field on an event page

Add the whole complex field to an event page using the field accessor. The `FieldCollectionBuilder` (accessed via `EventBuilder.fields()`) accepts the parent field; CCD renders all sub-fields in order.

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
            .mandatory(CaseData::getContactAddress);
    }
}
```

To include only specific sub-fields on a page — for example to split address entry across two wizard pages — add the parent field first then add individual sub-fields by dot-path string:

```java
.page("addressBasicPage")
.mandatory(CaseData::getContactAddress)          // renders all sub-fields
// OR add sub-fields individually:
.page("addressBasicPage")
.mandatory(CaseData::getContactAddress, "contactAddress.addressLine1")
.mandatory(CaseData::getContactAddress, "contactAddress.postCode")
```

<!-- TODO: research note insufficient for exact FieldCollectionBuilder sub-field dot-path API signature; verify against FieldCollection.java before release -->

---

## 4. Show the field in a tab

Use `ConfigBuilder.tab()` and reference the field and its sub-fields. Dot-path notation selects a specific sub-field for display.

```java
configBuilder
    .tab("caseDetailsTab", "Case details")
    .field(CaseData::getContactAddress)           // show all sub-fields
    .field("contactAddress.postCode");            // show only post code
```

To conditionally show a sub-field, pass a show-condition using the same dot path:

```java
configBuilder
    .tab("caseDetailsTab", "Case details")
    .field(CaseData::getContactAddress,
           "contactAddress.country=\"United Kingdom\"");
```

The tab builder is available via `ConfigBuilder.tab(tabId, tabLabel)` — see `ConfigBuilder.java:41`.

---

## 5. Generate and import the definition

Run the SDK definition generator. With the `ccd-config-generator` Gradle plugin applied:

```bash
./gradlew generateCCDConfig
```

Inspect the output under `build/definitions/`. Confirm:
- `ComplexTypes.json` (or the equivalent sheet) contains a `ContactAddress` entry with all sub-fields.
- `CaseField.json` contains your field with `"fieldType": { "type": "Complex", "complexFields": [...] }`.

Import the generated definition into CCD definition store via the CCD admin UI or the import API before testing in the UI.

---

## Verify

1. After importing, open the CCD case list and create or update a case with the `update-contact-address` event. The address sub-fields should render on the event wizard page.
2. Navigate to the case detail view and open the tab configured in step 4. The `contactAddress` sub-fields should appear. If you added a show-condition, confirm it fires correctly by toggling the relevant field value.

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

## Glossary

| Term | Meaning |
|---|---|
| ComplexType | A named, reusable group of sub-fields in CCD; maps to a Java class annotated with `@CCD`. |
| Sub-field | A single field within a ComplexType; referenced externally via dot-path (e.g. `address.postCode`). |
| `ListValue<T>` | SDK wrapper for CCD collection items; use it to make a `Collection` of a complex type. |
| `FieldCollectionBuilder` | SDK builder returned by `EventBuilder.fields()`; used to add fields and pages to an event wizard. |
