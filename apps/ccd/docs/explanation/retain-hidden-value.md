---
topic: retain-hidden-value
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/ConditionalFieldRestorer.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseFieldDefinition.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseEventFieldDefinition.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseEventFieldComplexDefinition.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/WizardPageComplexFieldOverride.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseViewFieldBuilder.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/aggregated/CaseViewField.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/MidEventCallback.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/HiddenFieldsValidator.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CCD.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/FieldCollection.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/CaseEventToFieldsGenerator.java
  - ccd-test-definitions:src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_RetainHiddenValue/CaseEventToFields.json
  - ccd-config-generator:sdk/ccd-config-generator/src/test/java/uk/gov/hmcts/reform/fpl/CCDConfig.java
  - ccd-config-generator:sdk/ccd-config-generator/src/test/java/uk/gov/hmcts/reform/fpl/model/CaseData.java
examples_extracted_from:
  - ccd-test-definitions:src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_RetainHiddenValue/CaseEventToFields.json
  - ccd-config-generator:sdk/ccd-config-generator/src/test/java/uk/gov/hmcts/reform/fpl/CCDConfig.java
  - ccd-config-generator:sdk/ccd-config-generator/src/test/java/uk/gov/hmcts/reform/fpl/model/CaseData.java
status: confluence-augmented
last_reviewed: "2026-04-29T00:00:00Z"
confluence:
  - id: "1457305822"
    title: "Retain Hidden Values"
    space: "RCCD"
    last_modified: "unknown"
  - id: "1298169940"
    title: "Show conditions, submitting hidden data - outstanding issues"
    space: "RCCD"
    last_modified: "unknown"
  - id: "1518684975"
    title: '"Retain Hidden Field Values" Feature Documentation and Resources'
    space: "EUI"
    last_modified: "unknown"
  - id: "733675985"
    title: "Configuration File - Master Template"
    space: "RCCD"
    last_modified: "unknown"
  - id: "1712770473"
    title: "INC5529567 - ExUI-837 Data Loss"
    space: "EXUI"
    last_modified: "unknown"
  - id: "1739698640"
    title: "SRT Brief - Bug fixes for EXUI-1105 / 1175"
    space: "EXUI"
    last_modified: "unknown"
  - id: "1791329973"
    title: "Work Allocation Playbook"
    space: "CRef"
    last_modified: "unknown"
  - id: "1056801404"
    title: "Show Conditions and how they work"
    space: "RCCD"
    last_modified: "unknown"
  - id: "1899496658"
    title: "CCD-6361 - Restoring Confidential Fields and Enforcing Field-Level Filtering in Validation Flow"
    space: "RCCD"
    last_modified: "unknown"
  - id: "1721438589"
    title: "Data loss fixes on CYA pages / NoC event - SRT Tracker for EXUI-848, 811, 433, 942, 702"
    space: "EXUI"
    last_modified: "unknown"
confluence_checked_at: "2026-04-29T00:00:00Z"
---

# RetainHiddenValue

## TL;DR

- A per-field flag that keeps a field's value in the submit payload when its `ShowCondition` evaluates to `false` at submit time, instead of clearing it.
- The wipe is **client-side (XUI), not server-side**. `ccd-data-store-api` never evaluates `ShowCondition` on submit and never wipes hidden fields. XUI explicitly submits `null` for hidden fields with `retainHiddenValue=No` or unspecified; the data-store then merges that `null` over the existing value.
- The flag is therefore a hint to the case-viewer UI, surfaced via `CaseViewField.retainHiddenValue` on the start-event response. A non-XUI caller (direct API, S2S event) bypasses the wipe entirely — whatever it sends is what gets stored.
- Definition-store rejects `RetainHiddenValue=Y` without a paired `ShowCondition`. It also rejects parent-complex `=No` with a child `=Yes` (`HiddenFieldsValidator`).
- Carried in four independent model layers; for event forms the `CaseEventToFields` value (`CaseEventFieldDefinition.retainHiddenValue`) wins. There is no inheritance from a parent complex to its children — each sub-field needs its own flag.
- Behaviour matrix in [Acceptance criteria reference](#acceptance-criteria-reference) is the canonical contract that ExUI conforms to (RDM-8200, EUI-3666). Read that table before debugging a data-loss ticket.

## The misconception that bites

Most engineers hitting silent data loss assume the data-store wipes hidden fields on submit. It does not.

There is no `ShowCondition` evaluator anywhere in `ccd-data-store-api/src/main/java`. The submit pipeline in `CreateCaseEventService.createCaseEvent()` works as follows:

1. `fieldProcessorService.processData()` runs type coercions.
2. `mergeUpdatedFieldsToCaseDetails()` (`CreateCaseEventService.java:510-552`) sanitises the payload — document URL normalisation, type casting via `CaseSanitiser.sanitise`.
3. `ConditionalFieldRestorer.restoreConditionalFields(...)` restores values the user had Create-but-not-Read permission on. This is an access-control concern, unrelated to ShowCondition.
4. `caseData.putAll(filteredData)` merges the submitted payload into the stored case.

None of these steps inspect `retainHiddenValue` or evaluate `ShowCondition`.

`grep -r "retainHiddenValue\|RetainHiddenValue" src/main/java` in the data-store returns only model-class getters/setters and JSON properties. There is no consumer of the flag in the request-handling pipeline.

The wipe happens earlier, in the browser. The case-viewer UI inspects each `CaseViewField` returned by the start-event trigger response. For fields whose `ShowCondition` is currently `false`, XUI **explicitly submits `null`** for that field — unless `retainHiddenValue` is `true`, in which case it includes the current value (per the EXUI-837 incident report and the RDM-8200 acceptance criteria).

So the data-store sees `{"interpreterLanguage": null}`, and `caseData.putAll(filteredData)` overwrites whatever was previously stored with `null`. Net effect indistinguishable from a server-side wipe — but the mechanism matters when the caller isn't XUI.

<!-- DIVERGENCE: Confluence page 1457305822 ("Retain Hidden Values") describes the wipe as if it were CCD-side: "the hidden field is persisted with a value automatically set to null". The data-store has no code that does this — the `null` reaches the data-store from the XUI client, which is responsible for choosing between sending the existing value (retain=Y) and sending `null` (retain=N or unspecified). Source: ConditionalFieldRestorer.java + CreateCaseEventService.mergeUpdatedFieldsToCaseDetails. The observable outcome is the same; the mechanism (and therefore the behaviour for non-XUI callers) is not. -->

The implications are load-bearing:

- **Direct API callers don't get the wipe.** A back-office script POSTing to `/cases/{caseId}/events` with full case data will store every key it sends. If it omits a key, the existing value is preserved (because `caseData.putAll(filteredData)` only overwrites keys present in the payload). If it sends `null`, the value is overwritten with `null`. The data-store has no concept of "should this field be hidden right now".
- **Service-to-service event triggers don't get the wipe.** Same reason.
- **The about-to-submit callback runs after the merge,** so by the time your service-team callback sees `caseDetails`, the wipe (or retain) has already been baked in by what XUI chose to submit.

> **`null` vs missing key.** XUI sends `null` for a wiped field; the merge replaces the existing value with `null`. If a non-XUI caller simply omits the key, the existing value is preserved. The audit log and downstream callbacks see `null` after a XUI wipe — not an absent key.

## Why the flag exists at all (historical context)

Before the RDM-8200 work the platform had two different default behaviours for the same logical scenario:

| Pre-RDM-8200 | Top-level field | Complex subfield |
| --- | --- | --- |
| Hidden field value persisted on submission | N | N |
| Existing value retained when field is hidden | **Y** | **N** |

A top-level field's previous value was preserved when its show condition went false; a subfield inside a complex was wiped. This inconsistency surfaced as a series of long-running tickets from FPLA (legal direction text disappearing), FR/Divorce (stale FRC region values poisoning Docmosis templates), Ethos (claimant rep details lost when struck out), and SSCS. EUI-1783 (top-level) and RDM-7837 (complex subfield) tracked the underlying defects. <!-- CONFLUENCE-ONLY: detailed service-by-service breakdown comes from RCCD page 1298169940; not derivable from source -->

Two design options were considered: keep retain as the default (matching the old top-level behaviour) or wipe by default. CCD chose **wipe by default**, on the grounds that it matches user expectations — when a user toggles a question's gate off, they expect the dependent answer to disappear. RDM-8200 then introduced the `RetainHiddenValue` column so services that needed retention could opt in per-field. The flag therefore exists primarily to undo a *new* default, not to enable an exotic behaviour. <!-- CONFLUENCE-ONLY: design rationale from RCCD 1298169940's "CCD's view of the problem" section -->

The breaking-change disclosure in RCCD 1457305822 makes clear that services which previously relied on top-level fields persisting hidden values must now explicitly add `RetainHiddenValue=Yes` (with a `ShowCondition`) for those fields. This is a one-time migration cost.

## How the flag reaches the client

The flag lives on multiple definition layers but only one of them feeds the event form.

`CaseViewFieldBuilder.build(CaseFieldDefinition, CaseEventFieldDefinition)` at `CaseViewFieldBuilder.java:26-49` is the assembler that produces a `CaseViewField` for an event trigger. Line 40:

```java
field.setRetainHiddenValue(eventFieldDefinition.getRetainHiddenValue());
```

Only the **event-level** value (`CaseEventFieldDefinition.retainHiddenValue`, JSON key `retain_hidden_value`, declared at `CaseEventFieldDefinition.java:26`) is used. The field-level default on `CaseFieldDefinition` (`CaseFieldDefinition.java:56`) is silently ignored on this path.

If `CaseEventFieldDefinition.retainHiddenValue` is `null`, the UI receives `null` and treats it as "do not retain". There is no server-side fallback to the field-level default during event submission.

The field-level default is only consulted on the read view, by `CaseViewField.createFrom(CaseFieldDefinition, Map)` at `CaseViewField.java:224-241`, line 238 — i.e. the case-data tab, not the wizard.

## The four model layers

Each layer covers a different scope. They do **not** automatically inherit from each other.

| Layer | Class | Source | Where it applies |
|---|---|---|---|
| Field default | `CaseFieldDefinition.retainHiddenValue` | `CaseFieldDefinition.java:56` | Read view (case tabs) only |
| Per-event override | `CaseEventFieldDefinition.retainHiddenValue` | `CaseEventFieldDefinition.java:26` | Event wizard form — the one that wins |
| Per-event, per-complex-child | `CaseEventFieldComplexDefinition.retainHiddenValue` | `CaseEventFieldComplexDefinition.java:21` | Sub-field of a complex inside an event |
| Wizard-page complex override | `WizardPageComplexFieldOverride.retainHiddenValue` | `WizardPageComplexFieldOverride.java:18` | Sub-field on a specific wizard page |

In SDK terms (ccd-config-generator):

- `@CCD(retainHiddenValue = true)` on a Java model field (`CCD.java:54`) writes `RetainHiddenValue: Y` into `CaseField.json` and `ComplexTypes/<TypeName>.json` — i.e. the field-level default.
- The fluent API takes a positional `boolean` parameter on `optional(...)`, `mandatory(...)`, `readonly(...)`, `complex(...)` and friends in `FieldCollection.java:97-424`. This writes into `CaseEventToFields/<eventId>.json` and `CaseEventToComplexTypes/<eventId>/<fieldId>.json` — i.e. the event-level overrides.
- Serialisation goes through `CaseEventToFieldsGenerator.applyMetadata()` at `CaseEventToFieldsGenerator.java:118-119`, which writes the JSON key `"RetainHiddenValue"` with string value `"Y"` only when `true`. Absence is treated as `false` — the generator never emits `"N"`.

Setting it via the fluent `complex(...)` builder applies only to the root complex field's row; children need their own flag.

**Per-event independence (AC 7).** The same field can have different `RetainHiddenValue` settings on different events. If `eventA` configures `complexField` with `RetainHiddenValue=Yes` and a `ShowCondition`, but `eventB` configures the same field without either, then `eventA` retains and `eventB` does not. The UI receives whatever the event-level `CaseEventToFields` row says; there is no cross-event inheritance. Any `ComplexTypes`-level retain config for sub-fields is still returned to the UI for `eventB` but is ignored because the parent event row has no retain setting. <!-- CONFLUENCE-ONLY: AC7 spelled out in RCCD 1298169940; the data-store simply returns the per-event definition and the UI acts on it -->

## ShowCondition is mandatory

Definition import rejects a `RetainHiddenValue=Y` row without a paired `ShowCondition`. The check is in `HiddenFieldsValidator.parseHiddenFields()` at `HiddenFieldsValidator.java:206-214`, which runs as part of the structural validation pipeline (`SpreadsheetValidator.validate(...)` chain in `excel-importer`). The validator throws `MapperException` (line 208), which causes the import to fail.

The validator covers three sheets:

- `CaseEventToFields` rows (`HiddenFieldsValidator.java:206`)
- `ComplexTypes` rows (`HiddenFieldsValidator.java:19`)
- `CaseEventToComplexTypes` rows (`HiddenFieldsValidator.java:125`)

`ComplexTypes` rows enter via `parseComplexTypesHiddenFields()` (line 19), which runs both `validateCaseEventToFields(...)` (parent retain consistency) and `validateSubFieldConfiguration(...)` (subfield consistency). The composite rule the validator enforces, derived from `isSubFieldsIncorrectlyConfigured()` at lines 181-204:

- **Parent CaseEventToFields row has `RetainHiddenValue=No` and a child ComplexTypes row has `=Yes`** → import fails (`MapperException` at line 64-67). This corresponds to AC 6 in the RDM-8200 acceptance criteria.
- **Parent CaseEventToFields row has `RetainHiddenValue=Yes` and the complex's children all default to no/unset** → allowed; children just don't inherit. AC 5.

The SDK does **not** enforce this client-side. You can write `@CCD(retainHiddenValue = true)` on a model field with no show condition; the generator emits the JSON happily, and the import then fails. Catch the failure in the JCS pipeline rather than at compile time.

The companion EUI feature page (1518684975) confirms ExUI's view: "fields with the `RetainHiddenValue` flag set to `Yes`, `Y`, or `true`, must also have an associated `FieldShowCondition` (even a dummy one) for the flag to take effect". The "even a dummy one" caveat is what makes patterns like `FieldShowCondition: someField="DO NOT SHOW IN UI"` (an intentionally never-true condition) viable. <!-- CONFLUENCE-ONLY: the "dummy show condition is enough" guarantee is documented as a designed-in property in EUI 1518684975, not just a happy accident of the validator code -->

**ShowCondition syntax quick-reference** (full detail on the [Show Conditions](https://tools.hmcts.net/confluence/display/RCCD/Show+Conditions+and+how+they+work) Confluence page, RCCD 1056801404):

- Operators: `=` (equals), `!=` (not equals), `CONTAINS` (multi-select only)
- Values: string literals in double quotes, `""` for blank, `"*"` for any value, pence for MoneyGBP
- Nested complex: `CaseFieldID.ListElementCode.SubElement="value"`
- Logical: `AND`, `OR`, parentheses for grouping (since RDM-10133)
- Metadata: `[STATE]="Awaiting Review"`, `[INJECTED_DATA.key]="value"` (CaseTypeTab/ComplexTypes only)
- Constraints: `NULL` values are not supported; the referenced field must exist on the same event; `CONTAINS` only works on multi-select field types

<!-- CONFLUENCE-ONLY: show condition syntax details from RCCD 1056801404 "Show Conditions and how they work" -->

## Acceptance criteria reference

The canonical behaviour matrix lives in RDM-8200 / RCCD page 1298169940 and is what ExUI conforms to (per EUI-3666). Reproduced here for offline use; the original is the source of truth if the two diverge.

**Table 1 — `RetainHiddenValue=Yes`:**

| ID | Use case | Starting | After AboutToStart | Start state | User input | State on Next | To /validate | To MidEvent | From MidEvent | To /events | To AboutToSubmit | From AboutToSubmit | In DB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | Data unchanged | aCertainValue | aCertainValue | hidden | - | hidden |  | aCertainValue | aCertainValue | aCertainValue | aCertainValue | aCertainValue | aCertainValue |
| 02 | null unchanged | null | null | hidden | - | hidden |  | null | null | null | null | null | null |
| 03 | Changed by AboutToStart | aDiffValue | aCertainValue | hidden | - | hidden |  | aCertainValue | aCertainValue | aCertainValue | aCertainValue | aCertainValue | aCertainValue |
| 04 | Show + enter | aCertainValue | aCertainValue | hidden | iggy | shown | iggy | iggy | iggy | iggy | iggy | iggy | iggy |
| 05* | Show + enter + hide | aCertainValue | aCertainValue | hidden | iggy | hidden |  | aCertainValue | aCertainValue | aCertainValue | aCertainValue | aCertainValue | aCertainValue |
| 06 | Mid-event changes value | aCertainValue | aCertainValue | hidden | - | hidden |  | aCertainValue | lou | lou | lou | lou | lou |
| 07 | User hides — no input | aDiffValue | aCertainValue | shown | - | hidden |  | aCertainValue | aCertainValue | aCertainValue | aCertainValue | aCertainValue | aCertainValue |
| 08* | User hides — enters | aDiffValue | aCertainValue | shown | iggy | hidden |  | aCertainValue | aCertainValue | aCertainValue | aCertainValue | aCertainValue | aCertainValue |
| 09 | Mid-event changes value | aCertainValue | aCertainValue | shown | david | shown | david | david | lou | lou | lou | lou | lou |

\* Scenario 6 is **not yet implemented** in ExUI per the EUI-3666 epic — EUI-4206 is open. <!-- CONFLUENCE-ONLY: implementation gap reported in EUI 1518684975 -->

**Table 2 — `RetainHiddenValue=No` (or unspecified):**

| ID | Use case | Starting | After AboutToStart | Start state | User input | State on Next | To /validate | To MidEvent | From MidEvent | To /events | To AboutToSubmit | From AboutToSubmit | In DB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | Data unchanged | aCertainValue | aCertainValue | hidden | - | hidden |  | null | null | null | null | null | null |
| 02 | null unchanged | null | null | hidden | - | hidden |  | null | null | null | null | null | null |
| 03 | Changed by AboutToStart | aDiffValue | aCertainValue | hidden | - | hidden |  | null | null | null | null | null | null |
| 04 | Show + enter | aCertainValue | aCertainValue | hidden | iggy | shown | iggy | iggy | iggy | iggy | iggy | iggy | iggy |
| 05 | Show + enter + hide | aCertainValue | aCertainValue | hidden | iggy | hidden |  | null | null | null | null | null | null |
| 06 | Mid-event changes value | aCertainValue | aCertainValue | hidden | - | hidden |  | null | lou | null | null | null | null |
| 07 | User hides — no input | aDiffValue | aCertainValue | shown | - | hidden |  | null | null | null | null | null | null |
| 08 | User hides — enters | aDiffValue | aCertainValue | shown | iggy | hidden |  | null | null | null | null | null | null |
| 09 | Mid-event changes value | aCertainValue | aCertainValue | shown | david | shown | david | david | lou | lou | lou | lou | lou |

**Note row 06 in Table 2.** The mid-event callback returns `lou`, but the "to /events" column shows `null`. ExUI re-evaluates the show condition after the mid-event callback returns, decides the field is still hidden, and discards the callback's value before submitting. A mid-event callback **cannot** revive a value into a hidden non-retained field. An about-to-submit callback can — its return is written into `caseDetails.data` post-merge with no further show-condition logic.

## ComplexType and Collection<T> behaviour

Each sub-field carries its own flag independently for top-level complex types. The data-store has no code that copies a parent's flag onto its children, so:

- Setting `retainHiddenValue` on a parent complex field controls only the parent row in `CaseEventToFields`. If the parent's `ShowCondition` is false, XUI consults the parent's flag.
- Each sub-field of the complex carries its own row in `CaseEventToComplexTypes` (or its own `WizardPageComplexFieldOverride`) with its own flag.

For collections of complex (`Collection<MyComplex>`) the rule is **different and stronger**. Per the canonical acceptance criteria (RDM-8200, scenarios 5* and 8* in Table 1):

> If the field is a Collection of a Complex type, then the retention policy of the Collection (in this case `RetainHiddenValue=Yes`) will be applied to each instance of that Complex type **as a whole**, within the Collection. In other words, when the Collection field is hidden then, on form submission, the Collection will be replaced *in its entirety* by its value prior to any changes.
>
> If a Complex type is within a Collection where `RetainHiddenValue=Yes`, then **all sub-fields** of that Complex type will retain their existing values — regardless of each sub-field's retention policy.

So `retainHiddenValue=Yes` on the collection itself acts as a roll-back-the-whole-collection switch and overrides the per-leaf flags on the contained complex's children. This avoids the "esoteric case" where some sub-fields with `retainHiddenValue=No` would be set to `null` mid-rollback, breaking the collection's integrity. <!-- CONFLUENCE-ONLY: collection-of-complex special rule documented in 1298169940; not derivable from data-store source because the data-store has no rollback logic at all, this is XUI behaviour -->

The test fixture `nested-list-definition.json` shows `retain_hidden_value: true` set on individual complex children (`roleOnCase`, `partyName`, `hearingRelevant`) at lines 54, 92, and 657, demonstrating the per-leaf configuration for the *non-collection* complex case.

`@JsonUnwrapped` complex fields are a footnote: `CaseEventToComplexTypesGenerator.java:70-72` skips them, so retain on an unwrapped sub-field flows via `CaseEventToFields` instead.

## `displayContext: HIDDEN` is not the same as `ShowCondition: false`

There are two ways a field can be "hidden" in CCD, and they have different semantics on submit. <!-- CONFLUENCE-ONLY: distinction made explicitly in EXUI 1739698640; the data-store source uses both terms but doesn't surface the distinction to readers -->

**`ShowCondition` evaluates to false.** The field is part of the event but currently hidden by user-driven state. ExUI evaluates the show condition continuously and `retainHiddenValue` is the relevant lever.

**`displayContext: HIDDEN`.** A definition-time decision, set either explicitly by services or **automatically by CCD when there's no entry for an element in `CaseEventToComplexTypes` for the event**. ExUI never displays such a field, and importantly, **does not evaluate show conditions on fields marked `HIDDEN`**. `retainHiddenValue` is irrelevant for these fields — they're not eligible for retain logic at all.

Practical consequence: if you have a complex type and you only add `CaseEventToComplexTypes` entries for the leaves you want editable in this event, the leaves you didn't add come through as `displayContext: HIDDEN`. They are submitted as-is from existing data (no user can edit them via this event). To bring a leaf into the event's scope at all — even read-only or for show-condition control — you need an entry in `CaseEventToComplexTypes` for it.

A historical bug noted in EXUI-1175 was that when *all* members of a complex were `HIDDEN`, the parent complex itself ended up being treated as `HIDDEN`, which then suppressed the show condition on the parent. The fix records the all-children-hidden state separately so parent show conditions can still be evaluated.

## Mid-event and about-to-submit callbacks

`MidEventCallback.invoke()` (`MidEventCallback.java:54`) runs as the user moves between wizard pages. At lines 86-87 it calls `removeNextPageFieldData()` to strip data for pages with `order > current_page_order` before invoking the service-team callback. This stripping is **wizard-page based, not show-condition based** — unrelated to `retainHiddenValue`. The callback response is merged via `CallbackInvoker.invokeMidEventCallback()` (lines 195-204): if the callback returns data, `validateAndSetData(...)` sanitises and overwrites `caseDetails.data`. No `retainHiddenValue` logic is applied.

For the about-to-submit callback, the order in `CreateCaseEventService.createCaseEvent()` is:

1. `mergeUpdatedFieldsToCaseDetails(...)` at lines 224-229 — submitted form data merged on top of existing case data. By this point, XUI has already decided what to include or omit.
2. `callbackInvoker.invokeAboutToSubmitCallback(...)` at lines 235-241 — your callback sees the merged result.

If your callback returns data that revives a previously wiped field, that data is saved. The server does not re-apply any wipe logic post-callback.

**ConditionalFieldRestorer is not RetainHiddenValue.** `ConditionalFieldRestorer.restoreConditionalFields(...)` (introduced under CCD-6361) runs during the merge pipeline and addresses a different problem: when a user has **Create** permission on a field but lacks **Read** access, the field is absent from the submitted payload because the user never saw it. The restorer copies such fields from the existing case data to prevent accidental data loss. This is an access-control mechanism operating on permission grants, not on `ShowCondition` visibility. The two systems are independent: a field can be restored by `ConditionalFieldRestorer` (because the user can't read it) *and* have `RetainHiddenValue` configured (for when it is readable but hidden by a show condition in a different event). They do not interact or substitute for each other. <!-- CONFLUENCE-ONLY: CCD-6361 scope and relationship to RHV clarified in RCCD 1899496658 -->

## What audit/history records

`saveAuditEventForCaseDetails()` at `CreateCaseEventService.java:558-593` writes the audit row. Line 575:

```java
auditEvent.setData(caseDetails.getData());
```

The audit record is `caseDetails.getData()` verbatim — the full final case data, after merge and after the about-to-submit callback. The `case_event.data` JSONB column has no separate retained-vs-wiped marker. If a field was wiped at submit, the audit row simply has no key for it (or a null value, depending on the JSON shape sent). If it was retained, the value is there.

`CaseDataIssueLogger` (invoked at `CreateCaseEventService.java:495`) only logs unexpectedly empty collections — it does not flag hidden-field wipes.

## Worked example: "I changed my mind back"

A wizard has a Yes/No question `needsInterpreter` and a dependent text field `interpreterLanguage` with `ShowCondition: needsInterpreter="Yes"`.

Without `RetainHiddenValue`:

1. User selects Yes. `interpreterLanguage` becomes visible.
2. User types "Welsh" into `interpreterLanguage`.
3. User changes their mind, selects No. `interpreterLanguage` is hidden.
4. User submits. XUI sees the show condition is false and **explicitly sends `interpreterLanguage: null`** in the payload (Table 2 row 05).
5. Data-store merges what was sent. `caseData.putAll({"interpreterLanguage": null})` overwrites whatever was previously stored with `null`. If the field was absent before, it now has the JSON value `null`.
6. Net effect: the user-entered "Welsh" is gone from storage. Any previously stored value is also gone. The audit row records `null`.

With `RetainHiddenValue: Y` on `interpreterLanguage` (and a `ShowCondition` to satisfy `HiddenFieldsValidator`):

1. Same steps 1-3.
2. At submit, XUI keeps `interpreterLanguage: "Welsh"` in the payload despite the show condition being false (Table 1 row 08).
3. Data-store merges. `interpreterLanguage` is now `"Welsh"` in storage.
4. Audit row records `"Welsh"` as the value (`saveAuditEventForCaseDetails`).

The flag is only useful when the user might toggle the gate field back. If the gate is one-way, the strip behaviour is what you want.

## The "permanently hidden, always retained" pattern

A field that is intentionally never visible to the user but whose value should always be preserved across events — typically used to ship case data into outbound event messages (Work Allocation, Camunda DMNs, downstream services). The pattern in widespread use across Civil and other services:

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

The `FieldShowCondition` is intentionally impossible to satisfy (no value will ever equal `"DO NOT SHOW IN UI"`), so the field is always hidden in the UI. `RetainHiddenValue=Y` ensures XUI submits the existing value rather than `null`. `Publish=Y` ships the value into the WA event-handler message envelope.

Why does this satisfy `HiddenFieldsValidator`? Because the validator only checks for the *presence* of a `FieldShowCondition` when `RetainHiddenValue=Y`, not whether it's satisfiable. The "even a dummy one" guarantee from EUI 1518684975 is what makes the pattern legal.

This pattern is widely used in Civil's WA configuration. <!-- CONFLUENCE-ONLY: pattern documented in CRef 1791329973 (Work Allocation Playbook); not surfaced anywhere in the data-store source -->

## Failure-mode catalogue

**Silent data loss on uncovered branches.** The most common bite. A wizard branches on `caseType="A"` vs `"B"`; the user fills the A branch, then changes their mind to B before submitting. Without `retainHiddenValue`, all the A-branch answers are stripped. Discovery is usually weeks later when someone tries to navigate back. Mitigation: add `retainHiddenValue: Y` on every conditionally-shown field where toggling the gate back must not destroy answers, or design the wizard so the gate is non-reversible.

**Definition import rejected.** Setting `retainHiddenValue: Y` on a field with no `ShowCondition` is rejected by `HiddenFieldsValidator.java:206-214` at import time. The validator throws `MapperException` and the JCS pipeline run fails. Fix: add a `ShowCondition` (or remove the flag — a retain flag with no condition is meaningless anyway).

**SDK without compile-time check.** The `@CCD(retainHiddenValue = true)` annotation and the fluent API both compile happily on a field with no show condition. The error only surfaces at definition import. Add an integration test that imports the generated definition into a real definition-store rather than relying on unit tests.

**Wrong fluent overload, silently false.** Several `mandatory(...)` and `optional(...)` overloads have no `retainHiddenValue` parameter and hard-code `false`. The public surface-API overloads that omit the flag are scattered through `FieldCollection.java` (e.g. the 3-arg `optional` at line 91, the 5-arg `mandatory` at line 153); they all funnel into the private `field(...)` dispatcher at lines 294-308 which calls `retainHiddenValue(false)` at line 306. If you call the 3-arg `mandatory(getter, showCondition, label)` instead of the 4-arg `mandatory(getter, showCondition, retainHiddenValue, label)`, the flag is silently `false`. There's no compiler warning. Watch the parameter count.

**Complex parent flag does not cascade.** Setting `retainHiddenValue=true` on a `complex(...)` builder applies only to the root complex field's row in `CaseEventToFields`, not to children. Each sub-field needs its own flag if you want them retained independently.

**Sensitive field accidentally retained when permissions change.** A field with `RetainHiddenValue` and a `ShowCondition` keyed off a role-driven flag will keep its value even when the user no longer has read access at submit time. Because the wipe is client-side, a UI that hides the field by show condition will still include the retained value in the submit payload. Audit may then record a value the submitting user shouldn't have known. Pair retain with care when the gate is a permission-shaped condition; consider an about-to-submit callback that scrubs the field server-side.

**Direct API callers bypass the wipe.** Functional tests, BEFTA scenarios, S2S event triggers, and migration scripts that POST `/cases/{caseId}/events` directly are not subject to any wipe — there is no server-side stripper. Whatever the caller sends is what gets stored. If you rely on XUI's wipe to clear stale answers, that contract does not hold for non-XUI clients.

**Audit reflects the payload, not the model.** Because `saveAuditEventForCaseDetails` records the post-merge `caseDetails.getData()` verbatim, you cannot use the audit log to distinguish "field was wiped" from "field was never set". Both look the same. (More precisely: a wipe shows as `"key": null`, a never-set shows as the key being absent — but in practice many tools render both as "empty".)

**Page-show-conditions plus Previous button.** A separate class of XUI-side data loss, fixed in EXUI-837 (October 2023). When a user navigates forward past hidden pages then clicks Previous, the FormGroup may still hold "in-scope" data from pages that are now hidden by show conditions and `null`s for fields that were never properly initialised. Pre-fix XUI would submit those `null`s and the data-store would write them. Post-fix, XUI only submits data from pages the user has Continued past, and removes data from pages subsequently hidden. Service-team impact: definitions where a page-show-condition references variables on a hidden page can still trip this — FPL had to refactor their "router" field onto an always-shown page. <!-- CONFLUENCE-ONLY: incident detail from EXUI 1712770473 -->

**CYA page and show-condition evaluation on collections.** EXUI-848 and EXUI-942 (tracked in the subsequent SRT under EXUI-950) addressed a class of bugs where fields were incorrectly set to `null` on submission because the show-condition evaluator on the Check Your Answers page didn't have access to data inside collection-of-complex elements. The fix ensures the correct collection element data is available when evaluating show conditions on CYA. Symptom: fields that were visible during the wizard but not shown on CYA, leading to their values being dropped at submit. If you see this pattern, ensure show-condition references inside collections resolve to data from the same collection element. <!-- CONFLUENCE-ONLY: CYA collection bug detail from EXUI 1721438589 -->

**Mid-event callback returning a value into a hidden retain=No field.** Per Table 2 row 06, a mid-event callback that sets a hidden non-retained field's value to `lou` is ignored — XUI re-evaluates the show condition after the callback returns and decides to send `null` anyway. If you need a service-side callback to revive a hidden field's value, do it in **about-to-submit**, not mid-event. The about-to-submit callback's response is written into `caseDetails.data` post-merge with no further show-condition logic.

## Example

The two blocks below show the same pattern — a gate field (`NumberField`) that controls whether a dependent field (`TextField`) is visible, with `RetainHiddenValue` on the dependent so its value survives a hide/show cycle.

### JSON form

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
  }
]
```

`NumberField` is always visible (no `ShowCondition`). `TextField` is shown only when `NumberField` is non-zero; `RetainHiddenValue: true` means that when the user sets `NumberField` back to zero, the text they entered is preserved in the payload rather than wiped.

### config-generator form

```java
// libs/ccd-config-generator/sdk/ccd-config-generator/src/test/java/uk/gov/hmcts/reform/fpl/CCDConfig.java
builder.event("addNotes")
    .fields()
    // ...
    .optionalWithoutDefaultValue(
        HearingPreferences::getInterpreter,
        "hearingPreferencesWelsh=\"yes\"",  // ShowCondition
        "Interpreter required",              // event-level label
        true)                               // retainHiddenValue
    // ...
    .mandatoryWithoutDefaultValue(
        CaseData::getAllocatedJudge,
        "hearingPreferencesWelsh=\"yes\"",
        "Judge is bilingual",
        true);
```

The trailing `true` is the `retainHiddenValue` parameter. The serialiser writes `"RetainHiddenValue": "Y"` into `CaseEventToFields/<eventId>.json`; absence is treated as `false` — the generator never emits `"N"`.

For the field-level default (read-view only, not used during event submission), use the annotation form on the model class:

```java
// libs/ccd-config-generator/sdk/ccd-config-generator/src/test/java/uk/gov/hmcts/reform/fpl/model/CaseData.java
@CCD(retainHiddenValue = true)
private final OrganisationPolicy<UserRole> organisationPolicy;
```

## See also

- [Use RetainHiddenValue](../how-to/use-retain-hidden-value.md) — step-by-step guide: SDK fluent API, JSON sheets, scoping rules, and cftlib verification
- [JSON definition format](../reference/json-definition-format.md) — `RetainHiddenValue` column documented in the `CaseEventToFields`, `ComplexTypes`, and `CaseField` sheet tables
- [Event model](event-model.md) — wizard pages, ShowCondition evaluation, and the about-to-submit ordering that this flag interacts with
- [Callbacks](callbacks.md) — mid-event and about-to-submit callback dispatch order; about-to-submit runs after XUI has already applied the retain/wipe decision
- [Permissions](permissions.md) — `ConditionalFieldRestorer` (Create-without-Read) interaction: the restorer operates separately from RetainHiddenValue and is not a substitute for it
- [Definition import](definition-import.md) — `HiddenFieldsValidator` validation that rejects `RetainHiddenValue=Y` without a paired `ShowCondition`
- [Glossary — RetainHiddenValue](../reference/glossary.md#retainhiddenvalue)
