---
topic: retain-hidden-value
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CCD.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Field.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/CaseEventToFieldsGenerator.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/CaseEventToComplexTypesGenerator.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/JsonUtils.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseFieldDefinition.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseEventFieldDefinition.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseEventFieldComplexDefinition.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/aggregated/CaseViewFieldBuilder.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/ConditionalFieldRestorer.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/HiddenFieldsValidator.java
  - ccd-test-definitions:src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_RetainHiddenValue/CaseEventToFields.json
  - ccd-test-definitions:src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_RetainHiddenValue/CaseField.json
  - ccd-config-generator:sdk/ccd-config-generator/src/test/java/uk/gov/hmcts/reform/fpl/CCDConfig.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/model/DefinitionDataItem.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/startevent/DefaultStartEventOperation.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/CaseService.java
examples_extracted_from:
  - ccd-test-definitions:src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_RetainHiddenValue/CaseEventToFields.json
  - ccd-test-definitions:src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_RetainHiddenValue/CaseField.json
  - ccd-config-generator:sdk/ccd-config-generator/src/test/java/uk/gov/hmcts/reform/fpl/CCDConfig.java
status: confluence-augmented
last_reviewed: "2026-04-29T00:00:00Z"
confluence:
  - id: "1457305822"
    title: "Retain Hidden Values"
    space: "RCCD"
    last_modified: "unknown (page version 13, ~2020-2021)"
  - id: "1298169940"
    title: "Show conditions, submitting hidden data - outstanding issues"
    space: "RCCD"
    last_modified: "unknown (page version 105)"
  - id: "1518684975"
    title: "\"Retain Hidden Field Values\" Feature Documentation and Resources"
    space: "EUI"
    last_modified: "unknown (page version 5)"
  - id: "733675985"
    title: "Configuration File - Master Template"
    space: "RCCD"
    last_modified: "unknown (page version 71, ~2021)"
  - id: "1791329973"
    title: "Work Allocation Playbook"
    space: "CRef"
    last_modified: "2024-12 (most recent screenshot)"
  - id: "1825029253"
    title: "NullifyByDefault"
    space: "RCCD"
    last_modified: "unknown (page version 4, ~2025-01)"
  - id: "1056801404"
    title: "Show Conditions and how they work"
    space: "RCCD"
    last_modified: "unknown (page version 25)"
confluence_checked_at: "2026-04-29T00:00:00Z"
---

# Use RetainHiddenValue

## TL;DR

- `RetainHiddenValue` keeps a field's stored value when its `ShowCondition` evaluates to `false` — without it, the value is wiped on save.
- The wipe is **client-side (XUI)**, not server-side. The flag rides on `CaseViewField.retainHiddenValue` and XUI strips hidden fields from the submit payload before posting to data-store.
- It is **only meaningful when paired with a `ShowCondition`**. The definition-store importer rejects rows that set the flag without one (`HiddenFieldsValidator.java:206-214`).
- SDK form: `@CCD(retainHiddenValue = true)` on a model field, or a positional `boolean` on `optional()`/`mandatory()`/`readonly()`/`complex()` overloads in `FieldCollection.java`.
- JSON form: column `RetainHiddenValue` with value `"Y"` on `CaseEventToFields`, `CaseEventToComplexTypes`, `ComplexTypes`, or `CaseField` rows.
- Event-level `RetainHiddenValue` (on `CaseEventToFields`) wins for event forms — the field-level default on `CaseField` is only consulted on read views (`CaseViewFieldBuilder.java:40`).
- Mid-event callbacks see the **retained** value when the flag is `Y`, and `null` when it's `N` and the field is hidden — useful when a callback derives data from hidden inputs.

## SDK form (ccd-config-generator)

Two independent surfaces. Pick the one matching the scope you need.

### Annotation — applies field-wide

`@CCD(retainHiddenValue = true)` on the Java model field. Defined at `CCD.java:54`, default `false`. The serialiser writes `"RetainHiddenValue": "Y"` into `CaseField.json` (top-level fields) or `ComplexTypes/<TypeName>.json` (sub-fields of complex models) via `JsonUtils.applyCcdAnnotation()` at `JsonUtils.java:132-134`.

```java
@CCD(retainHiddenValue = true)
private final OrganisationPolicy<UserRole> organisationPolicy;
```

This sets the field-level default. Note: data-store does **not** read this back during event submission — it is only consulted when building non-event read views (`CaseViewField.createFrom`, `CaseViewField.java:238`).

### Fluent — applies per event

A trailing `boolean retainHiddenValue` parameter on a curated set of `FieldCollectionBuilder` overloads in `FieldCollection.java`. The full list:

| Overload | Line |
|---|---|
| `optional(getter, showCondition, defaultValue, retainHiddenValue)` | `FieldCollection.java:97` |
| `optional(getter, showCondition, retainHiddenValue)` | `FieldCollection.java:107` |
| `optionalWithoutDefaultValue(getter, showCondition, label, retainHiddenValue)` | `FieldCollection.java:131` |
| `mandatory(getter, showCondition, defaultValue, label, hint, retainHiddenValue)` | `FieldCollection.java:162` |
| `mandatory(getter, showCondition, retainHiddenValue)` | `FieldCollection.java:186` |
| `mandatoryWithoutDefaultValue(getter, showCondition, label, retainHiddenValue)` | `FieldCollection.java:221` |
| `readonly(getter, showCondition, retainHiddenValue)` | `FieldCollection.java:242` |
| `complex(getter, showCondition, eventFieldLabel, eventFieldHint, retainHiddenValue)` | `FieldCollection.java:398-401` |

Pair it with a `showCondition` argument on the same call. Example from the SDK test fixtures:

```java
.optionalWithoutDefaultValue(HearingPreferences::getInterpreter,
    "hearingPreferencesWelsh=\"yes\"", "Interpreter required", true)
```

The serialiser writes the row to `CaseEventToFields/<eventId>.json` via `CaseEventToFieldsGenerator.applyMetadata()` at `CaseEventToFieldsGenerator.java:118-120`:

```java
if (field.isRetainHiddenValue()) {
    target.put("RetainHiddenValue", "Y");
}
```

Absence of the key is treated as `false`. The generator never emits `"N"`.

> No standalone `.retainHiddenValue()` setter exists on `FieldBuilder`. It is only reachable through these overloads, and it is easy to confuse with the `showSummary` boolean — count the parameters carefully.

## JSON form (raw definition spreadsheet)

If you are hand-editing JSON shards or an `.xlsx` rather than using the SDK, set `RetainHiddenValue` on the relevant sheet:

| Sheet | Column | Effect | Storage |
|---|---|---|---|
| `CaseEventToFields` | `RetainHiddenValue` | Per-event override; flows into `CaseViewField` for event forms | DB: `event_case_field.retain_hidden_value` |
| `CaseEventToComplexTypes` | `RetainHiddenValue` | Per-event, per-complex-child override | DB: `event_case_field_complex_type.retain_hidden_value` |
| `ComplexTypes` | `RetainHiddenValue` | Default for the complex sub-field across all events | DB: `complex_field.retain_hidden_value` |
| `CaseField` | `RetainHiddenValue` | Field-level default (read-view only path) | In-memory model only — held on `repository/.../model/CaseField.java:28` and projected into `CaseFieldDefinition.retainHiddenValue` (`ccd-data-store-api/.../CaseFieldDefinition.java:56`); not persisted as a DB column on `case_field` |

The definition-store importer accepts any of the following case-insensitive values (`DefinitionDataItem.getBoolean()` at `DefinitionDataItem.java:131-144`):

| Truthy | Falsy |
|---|---|
| `Yes`, `Y`, `True`, `T` | `No`, `N`, `False`, `F` |

The SDK generator emits `"Y"` in JSON shards. The BEFTA test definitions use `"true"` / `"false"`. Both are valid. The importer treats blank/absent as `null` (defaulting to non-retention). Any other string produces a `MapperException` at import time.

Pair the row with a populated `ShowCondition` column.

A working fixture exists at `apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_RetainHiddenValue/` — useful as a reference shape.

## What XUI sends to mid-event and submit callbacks

The flag does not just gate persistence — it also changes what callbacks see. Per the agreed acceptance criteria for RDM-8200 (Confluence ["Show conditions, submitting hidden data — outstanding issues"](#see-also), Tables 1 & 2):

| Scenario | RetainHiddenValue=Y | RetainHiddenValue=N (or unset) |
|---|---|---|
| Field hidden, value `aCertainValue` already in DB | mid-event sees `aCertainValue`; submit sees `aCertainValue`; DB keeps `aCertainValue` | mid-event sees `null`; submit sees `null`; DB writes `null` |
| Field shown, user types `iggy` | mid-event sees `iggy` | mid-event sees `iggy` |
| User shows then re-hides without saving — value `iggy` typed in flight | mid-event sees the **previous** `aCertainValue`, not `iggy` | mid-event sees `null` (typed value discarded) |
| Mid-event callback overwrites with `lou` | submit sees `lou` | submit sees `lou` (mid-event return values are not stripped) |

<!-- CONFLUENCE-ONLY: the "mid-event sees null" / "mid-event sees previous value" behaviour is XUI conformance to RDM-8200; not encoded in the data-store source. -->

> **Known gap (EUI-4206):** Table 1 Scenario 6 (mid-event callback changes the value of a hidden field with `RetainHiddenValue=Y`) is not fully implemented in ExUI as of the EUI feature documentation page (pageId 1518684975). The spec says the callback's return value should propagate to submit and DB, but ExUI may not honour it in all cases. If your flow relies on a mid-event callback overwriting a hidden retained field, test the exact scenario end-to-end before depending on it.

<!-- CONFLUENCE-ONLY: EUI-4206 exception documented in Confluence "Retain Hidden Field Values" Feature Documentation (pageId 1518684975). Not verifiable from backend source since it is purely a UI behaviour. -->

Practical consequences:

- **Don't write a mid-event callback that fails on `null`** for a field with `RetainHiddenValue=N` and a `ShowCondition`. When the user toggles to hide, the callback receives `null` even if the case data has a value.
- A mid-event callback **can override** a retained value. Returning a different value from the callback wins on submit, regardless of the retain flag (the flag governs only what XUI strips before sending).
- Submitting `null` directly via a callback or curl will overwrite the DB; retention does not protect against later writes.

## When the spreadsheet must — and must not — set RetainHiddenValue

The validator (`HiddenFieldsValidator.java`) enforces three rules during definition import:

1. **Show condition is mandatory** if `RetainHiddenValue=Y` (`HiddenFieldsValidator.java:206-214` and the equivalent on `CaseEventToComplexTypes`, `:144-152`). The error message:
   ```
   'retainHiddenValue' can only be configured for a field that uses a showCondition.
   Field ['<id>'] on ['CaseEventToFields'] does not use a showCondition
   ```
2. **Sub-fields cannot opt-in to retention while their complex parent opts out.** If `CaseEventToFields.RetainHiddenValue=N` for a complex field but any child sub-field on `ComplexTypes` has `RetainHiddenValue=Y`, the import is rejected at `HiddenFieldsValidator.java:117-121`:
   ```
   'retainHiddenValue' has been incorrectly configured or is invalid for fieldID ['<id>'] on ['CaseEventToFields']
   ```
   The reverse (parent `Y`, child `N`) is permitted; the child wins.
3. **Sub-fields can opt out** of retention even when the complex parent opts in. The opposite direction is forbidden — see rule 2.

Together, rules 2 and 3 give the **subfield-wins** semantics: a child's explicit `Y` or `N` is final; when a child is unspecified, it defaults to `N` regardless of the parent's setting (Confluence "Retain Hidden Values" Example 5 phrases this as "sub-elements do not inherit").

## Service-team idiom: publishing hidden fields downstream

Several services use `RetainHiddenValue=Y` not for branching wizards but to **carry data through to downstream systems** without exposing it in the UI. Civil's Work Allocation playbook documents the canonical pattern:

```json
{
  "CaseTypeID": "CIVIL",
  "CaseEventID": "CLAIMANT_RESPONSE_SPEC",
  "CaseFieldID": "responseClaimTrack",
  "DisplayContext": "READONLY",
  "FieldShowCondition": "respondent1ClaimResponseTypeForSpec=\"DO NOT SHOW IN UI\"",
  "RetainHiddenValue": "Y",
  "Publish": "Y"
}
```

The `FieldShowCondition` is deliberately impossible — the field never shows. Combined with `RetainHiddenValue=Y` it survives the XUI strip step and, with `Publish=Y`, lands on the case-event message that data-store puts on the Azure service bus for Work Allocation / Camunda to consume.

<!-- CONFLUENCE-ONLY: this idiom is described in the Civil Work Allocation Playbook (Confluence pageId 1791329973) and is a service-team pattern, not a CCD platform feature. The mechanism (impossible show condition + retain) is just a composition of two CCD features that source confirms work as described. -->

Use sparingly: it abuses `ShowCondition` for a non-UI purpose and makes the definition harder to read. Prefer it only when you cannot place the field in the event payload directly (e.g. the field already exists, you don't want to surface it, but you need it on the published message).

## Scoping: per-event vs field-level default

When the UI requests an event trigger, `CaseUpdateViewEventBuilder.build()` constructs the form definition by calling `CaseViewFieldBuilder.build(caseFieldDefinition, eventFieldDefinition)`. At `CaseViewFieldBuilder.java:40` only the **event-level** value is copied onto the returned `CaseViewField`:

```java
field.setRetainHiddenValue(eventFieldDefinition.getRetainHiddenValue());
```

Consequences:

- `CaseEventToFields.RetainHiddenValue` is the effective value during events. If it is null, the UI receives null and **wipes the field** — there is no server-side fallback to `CaseField.RetainHiddenValue`.
- `CaseField.RetainHiddenValue` is consulted only for read-only tab views via `CaseViewField.createFrom(CaseFieldDefinition, Map)` (`CaseViewField.java:238`).
- To retain across every event that touches the field, you must set the flag on each `CaseEventToFields` row — or, in SDK form, repeat the `true` argument on every event's `mandatory()`/`optional()` call.
- For a complex field with `RetainHiddenValue=Y` on event A but unspecified on event B: the import succeeds, event A retains, event B does not — and any sub-field `ComplexTypes` configuration is returned to the UI for event B but **ignored by XUI** (AC 7 from RDM-8200).

## Inside a ComplexType

Setting `retainHiddenValue` on a `complex(...)` call flags only the **root complex row** in `CaseEventToFields` (`FieldCollection.java:416-425`). Children are not inherited — each sub-field needs its own flag. The same is true server-side: data-store does not propagate retain from parent to child (`CaseEventFieldComplexDefinition.java:21`).

For a child sub-field, set the flag on the child's own builder method:

```java
.complex(CaseData::getOrganisationPolicy, null, "Event label", "Event hint", true) // root
  .complex(OrganisationPolicy::getOrganisation)
    .mandatory(Organisation::getOrganisationId, "allocatedJudge=\"*\"", true)        // child
```

The serialiser routes child entries through `CaseEventToComplexTypesGenerator.expand()` (`CaseEventToComplexTypesGenerator.java:50-98`), which calls the same `applyMetadata` helper at line 81 — so the column name and `"Y"` value are identical to `CaseEventToFields`.

Unwrapped fields (`@JsonUnwrapped`) skip the `CaseEventToComplexTypes` path entirely (`CaseEventToComplexTypesGenerator.java:70-72`); the flag instead lands on the flattened parent in `CaseEventToFields`.

### Collections of complex types

For a Collection of a Complex type with `RetainHiddenValue=Y` on the Collection field, retention is applied to **each instance of the Complex type as a whole** within the Collection. When the Collection is hidden, the **entire Collection** is replaced on form submission with its value prior to any changes. Sub-fields of the Complex type retain regardless of their own retention policy — the granular per-sub-field setting is overridden inside a Collection.

<!-- CONFLUENCE-ONLY: documented in the Confluence "Show conditions, submitting hidden data" page (pageId 1298169940) under Table 1, Scenarios 5 and 8. EUI conforms to this; the data-store source has no Collection-specific retention logic, so the entirety of this behaviour is XUI-side. -->

This means you cannot mix `RetainHiddenValue=N` on a sub-field with `RetainHiddenValue=Y` on a containing Collection and expect the sub-field to be wiped on hide; the Collection-level rollback wins.

## Verifying with cftlib

The wipe is in XUI, so verification must go through the UI (a raw curl to data-store always appears to retain — see troubleshooting below).

1. Boot a cftlib stack with embedded XUI (`bootWithCCD` task).
2. Create or open a case and trigger the event.
3. Set the toggle to **Yes**, fill in the dependent field, save. Confirm the value appears on the case tab.
4. Trigger the event again, flip to **No** (field disappears), save.
5. Fetch the case: `GET http://localhost:4452/cases/{caseId}`. The dependent field should still be in `case_data`. If missing, the flag is not flowing.
6. Trigger again, flip back to **Yes** — the previously-entered value should reappear.

## Troubleshooting

### "The validator rejects my definition"

`HiddenFieldsValidator.parseHiddenFields()` at `HiddenFieldsValidator.java:206-214` rejects any `RetainHiddenValue=Y` row that is missing a `ShowCondition`. The rejection surfaces as a 400/422 from `POST /import` with the offending field id in the message. Add a `ShowCondition` (even a tautology) or remove the `RetainHiddenValue` flag.

The same validator covers `ComplexTypes` (`HiddenFieldsValidator.java:19-46`) and `CaseEventToComplexTypes` (`HiddenFieldsValidator.java:125`) sheets.

There is a second rejection path: a complex parent with `RetainHiddenValue=N` (or unset) on `CaseEventToFields` whose children on `ComplexTypes` opt back in with `=Y`. The error message is the same — `'retainHiddenValue' has been incorrectly configured or is invalid for fieldID …` — but the offending row is the **child**, not the parent (`HiddenFieldsValidator.java:117-121`). The reverse (parent `Y`, child `N`) is permitted.

### "Callbacks are seeing `null` for a hidden field that has retain=Y on it"

The retain flag governs what XUI sends — it doesn't apply retroactively to fields that were `null` in the DB. If the field was never populated, both retain modes send `null` to mid-event. Inspect what `case_data` already contains via `GET /cases/{caseId}` before debugging the flag.

If the field *was* populated and you're still seeing `null`:

- The retain flag is set on the wrong scope (see the scoping section above).
- The case-event ID isn't `CaseEventToFields` — e.g. a sub-field's flag is on `ComplexTypes` but the parent on `CaseEventToFields` is `N`. The validator catches the inverse but happily accepts an unconfigured/N parent with no child opt-ins.
- A previous mid-event callback in the same event chain returned `null`, replacing the retained value — mid-event return values overwrite retained values.

### "The value still gets wiped"

Almost always a scoping bug. Things to check, in order:

1. **The flag is on the wrong sheet.** The annotation/`CaseField.RetainHiddenValue` is **not** read during event submission — only `CaseEventToFields.RetainHiddenValue` is (`CaseViewFieldBuilder.java:40`). If you set `@CCD(retainHiddenValue = true)` and stopped there, you need the fluent overload too (or the JSON equivalent on the event row).
2. **Wrong event.** The flag is per-event. If the wipe happens on event B but you only set it on event A, B will still wipe. Set it on every event whose `CaseEventToFields` row references the field.
3. **Complex child not flagged.** Setting it on a `complex(...)` call only flags the root row. Each child sub-field needs its own flag.
4. **`null` is not `false` for fallback purposes.** When `CaseEventFieldDefinition.retainHiddenValue` is null, the UI receives null and wipes — there is no server-side fallback to the field-level `CaseField.retainHiddenValue` value.

### "The value is retained but appears stale on display"

Retention only preserves the stored value; it does not refresh how the field renders elsewhere. If a tab or callback derives a label or summary from the hidden field, that derivation will still see the old value. Either evaluate the same `ShowCondition` in the consuming code, or move the derivation behind a callback that runs on the toggling event.

### "I tested it with curl and it 'worked' without the flag"

Data-store has no server-side wipe — `CreateCaseEventService.mergeUpdatedFieldsToCaseDetails()` (`CreateCaseEventService.java:520-531`) takes whatever the client sends and merges it. `ConditionalFieldRestorer.restoreConditionalFields(...)` only restores fields the caller lacks read access to (`ConditionalFieldRestorer.java:42-85`); it does not consult `ShowCondition` or `RetainHiddenValue`. A direct curl bypasses XUI's strip step and always appears to retain. Test through XUI / cftlib only.

### "An old codebase used to retain top-level hidden values automatically"

Pre-RDM-8200 (~2020), top-level fields **retained** hidden values by default; only complex sub-fields wiped. Both now wipe by default (RDM-8200 / EUI-1783). If you are migrating an old service, every top-level field with a `ShowCondition` whose value previously persisted needs explicit `RetainHiddenValue=Y`. Audit the definition before upgrading.

<!-- CONFLUENCE-ONLY: this historical context is from Confluence "Retain Hidden Values" (pageId 1457305822) and "Show conditions, submitting hidden data" (pageId 1298169940). The change predates the source code in the workspace; not directly verifiable from current `git log`. -->


## Example

The complete Yes/No-toggle pattern: a gate field controls whether a dependent field is visible, and `RetainHiddenValue` preserves the dependent field's value if the user toggles the gate back.

### JSON form

From the BEFTA test fixture (`FT_RetainHiddenValue/CaseEventToFields.json`). `TextField` has `RetainHiddenValue: "true"` paired with a `FieldShowCondition` referencing `NumberField`. `TextAreaField` has `RetainHiddenValue: "false"` to show the wipe-on-hide behaviour for contrast:

```json
// apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_RetainHiddenValue/CaseEventToFields.json
[
  {
    "CaseTypeID": "FT_RetainHiddenValue",
    "CaseEventID": "CREATE1",
    "CaseFieldID": "NumberField",
    "DisplayContext": "OPTIONAL",
    "FieldShowCondition": "",
    "RetainHiddenValue": ""
  },
  {
    "CaseTypeID": "FT_RetainHiddenValue",
    "CaseEventID": "CREATE1",
    "CaseFieldID": "TextField",
    "DisplayContext": "OPTIONAL",
    "FieldShowCondition": "NumberField!=\"0\"",
    "RetainHiddenValue": "true"
  },
  {
    "CaseTypeID": "FT_RetainHiddenValue",
    "CaseEventID": "CREATE1",
    "CaseFieldID": "TextAreaField",
    "DisplayContext": "OPTIONAL",
    "FieldShowCondition": "NumberField!=\"0\"",
    "RetainHiddenValue": "false"
  }
]
```

`TextField` retains its value when hidden (user sets `NumberField` back to zero); `TextAreaField` is wiped to `null`. Both require a non-empty `FieldShowCondition` — omitting it produces a 400/422 from `POST /import`.

### config-generator form

Equivalent configuration using the SDK fluent API. The trailing `true` on `optionalWithoutDefaultValue` and `mandatoryWithoutDefaultValue` is the `retainHiddenValue` parameter:

```java
// libs/ccd-config-generator/sdk/ccd-config-generator/src/test/java/uk/gov/hmcts/reform/fpl/CCDConfig.java
builder.event("addNotes")
    .forStates(Gatekeeping, Submitted)
    .name("Add case notes")
    .fields()
    .optional(CaseData::getCaseNotes)
    .complex(CaseData::getHearingPreferences)
      .optional(HearingPreferences::getWelsh)
      // retainHiddenValue = true (last arg): value is kept when ShowCondition is false
      .optionalWithoutDefaultValue(
          HearingPreferences::getInterpreter,
          "hearingPreferencesWelsh=\"yes\"",
          "Interpreter required",
          true)
      .done()
    // retainHiddenValue = true: allocatedJudge value survives a toggle back to No
    .mandatoryWithoutDefaultValue(
        CaseData::getAllocatedJudge,
        "hearingPreferencesWelsh=\"yes\"",
        "Judge is bilingual",
        true);
```

The generator writes `"RetainHiddenValue": "Y"` into `CaseEventToFields/<eventId>.json` for each call with `true`. The value is absent when `false` — the generator never emits `"N"`.

For the field-level default (only consulted on read-only tab views, not during event submission), annotate the model field instead:

```java
// libs/ccd-config-generator/sdk/ccd-config-generator/src/test/java/uk/gov/hmcts/reform/fpl/model/CaseData.java
@CCD(retainHiddenValue = true)
private final OrganisationPolicy<UserRole> organisationPolicy;
```

This writes `"RetainHiddenValue": "Y"` into `CaseField.json`. It does **not** flow into `CaseEventToFields` rows — you still need the fluent overload on each event that must retain the value during submission.

## ShowCondition syntax quick reference

Since `RetainHiddenValue` requires a `ShowCondition`, a brief syntax reminder: `Field="value"` (equals), `Field!="value"` (not equals), `FieldCONTAINS"value"` (multi-select only). Use `"*"` for any value, `""` for blank. Combine with `AND`/`OR` and parentheses (RDM-10133). Nested paths: `CaseFieldID.ListElementCode.Sub="value"`. The field referenced **must** appear in `CaseEventToFields` for the same event; otherwise the importer rejects the definition.

## Related: NullifyByDefault

`NullifyByDefault` is a separate `CaseEventToFields` column that nullifies a field at **event start** (server-side, `DefaultStartEventOperation.java:152-164`), before the user sees the form. It operates irrespective of show conditions and requires no `ShowCondition`. The two features coexist: use `NullifyByDefault=Y` + `RetainHiddenValue=Y` to clear on entry but preserve if the user later toggles the field to hidden.

<!-- CONFLUENCE-ONLY: NullifyByDefault details from Confluence pageId 1825029253. The server-side implementation at DefaultStartEventOperation.java is verified in source. -->

## See also

- [RetainHiddenValue explanation](../explanation/retain-hidden-value.md) — in-depth explanation: the XUI-side wipe mechanism, the four model layers, the acceptance-criteria matrix, and failure-mode catalogue
- [JSON definition format](../reference/json-definition-format.md) — `RetainHiddenValue` column documented in the `CaseEventToFields`, `ComplexTypes`, `CaseEventToComplexTypes`, and `CaseField` sheet tables
- [Add an event](add-an-event.md) — canonical event-authoring how-to; the cftlib verification recipe in this guide builds on the same setup
- [Debug with cftlib](debug-with-cftlib.md) — general cftlib recipes for inspecting case data and service logs during verification
- [First case type (config-generator)](../tutorials/first-case-type-config-generator.md) — SDK starter context: how the fluent builder and `@CCD` annotation fit into the overall case-type configuration
