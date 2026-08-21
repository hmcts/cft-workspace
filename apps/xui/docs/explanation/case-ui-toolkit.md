---
title: Case Ui Toolkit
topic: toolkit
diataxis: explanation
product: xui
audience: both
sources:
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/case-edit/case-edit.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/case-edit-page/case-edit-page.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/case-create/case-create.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/palette.service.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-write.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-read.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/domain/definition/field-type-enum.model.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/services/cases.service.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/services/wizard-page-field-to-case-field.mapper.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/public-api.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/ng-package.json
  - ccd-case-ui-toolkit:angular.json
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/directives/conditional-show/conditional-show-form.directive.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/directives/conditional-show/services/condition.peg.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/domain/definition/display-context-enum.model.ts
  - ccd-case-ui-toolkit:.github/workflows/npmpublish.yml
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/package.json
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-write.component.html
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-write.component.scss
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-read-label.html
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-read-label.scss
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/grey-bar.scss
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/directives/conditional-show/services/grey-bar.service.ts
  - rpx-xui-webapp:src/cases/containers/query-management-container/query-management-container.component.ts
  - rpx-xui-webapp:src/cases/query-management.routes.ts
  - rpx-xui-webapp:src/app/services/ccd-config/ccd-case.config.ts
  - rpx-xui-webapp:src/app/providers/providers.module.ts
  - rpx-xui-webapp:src/cases/cases.module.ts
  - rpx-xui-webapp:package.json
  - civil-wa-task-configuration:src/main/resources/wa-task-initiation-civil-civil.dmn
  - civil-wa-task-configuration:src/main/resources/wa-task-configuration-civil-civil.dmn
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/xui/ccd-case-ui-toolkit/projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/palette.service.ts
  - apps/xui/rpx-xui-webapp/src/app/providers/providers.module.ts
  - apps/xui/rpx-xui-webapp/src/cases/cases.module.ts
confluence:
  - id: "1682837411"
    title: "ccd-case-ui-toolkit Release Process"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1468013682"
    title: "Expert UI Low Level Design - Case UI Toolkit Field Conditional Show"
    last_modified: "unknown"
    space: "EUI"
  - id: "1296040231"
    title: "Expert UI - Case File View - High Level Design"
    last_modified: "unknown"
    space: "EUI"
  - id: "1572574739"
    title: "Expert UI - Low Level Design - Link/Unlink Cases"
    last_modified: "unknown"
    space: "EUI"
  - id: "1317863756"
    title: "Release and npm publish process for ccd-case-ui-toolkit"
    last_modified: "unknown"
    space: "EUI"
  - id: "1660295929"
    title: "Local Setup Guide"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1739301420"
    title: "Query Management Onboarding"
    last_modified: "unknown"
    space: "EXUI"
confluence_checked_at: "2026-05-13T00:00:00Z"
sources_sha:
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/case-edit/case-edit.component.ts": "82b1a9d9b5712bae54f8cdcc18ae9950870ff428"
  ? "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/case-edit-page/case-edit-page.component.ts"
  : "b436972c4d5af5a2873a96bfcfae8c5d32db7762"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/case-create/case-create.component.ts": "db39163cb7de92af326a333fe7430558a051c135"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/palette.service.ts": "b436972c4d5af5a2873a96bfcfae8c5d32db7762"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-write.component.ts": "b239d2859f3c5ec11025a5597f8e639806521c36"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-read.component.ts": "82b1a9d9b5712bae54f8cdcc18ae9950870ff428"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/domain/definition/field-type-enum.model.ts": "b436972c4d5af5a2873a96bfcfae8c5d32db7762"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/services/cases.service.ts": "82b1a9d9b5712bae54f8cdcc18ae9950870ff428"
  ? "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-editor/services/wizard-page-field-to-case-field.mapper.ts"
  : "a0696744cf3ccae9aacbb31b40f99e2e69fc2655"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/public-api.ts": "d8781265f59485c3c9545882f6019114fadf3bd0"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/ng-package.json": "28beefe025ff4a81ca74779ef804b668ab9e0907"
  "ccd-case-ui-toolkit:angular.json": "d1ab32c3066c97424724ff6690e4cc2ec1ed2c54"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/directives/conditional-show/conditional-show-form.directive.ts": "8892a7adb5f5cdeaaa74920c07eac09861779b4a"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/directives/conditional-show/services/condition.peg.ts": "82b1a9d9b5712bae54f8cdcc18ae9950870ff428"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/domain/definition/display-context-enum.model.ts": "6a082439702a917c186720a837526f8c968c29d0"
  "ccd-case-ui-toolkit:.github/workflows/npmpublish.yml": "3ea421b1e4974dd0a14a2d259ecbe3073f561896"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/package.json": "b436972c4d5af5a2873a96bfcfae8c5d32db7762"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-write.component.html": "7f1b0d12f0af5a80788e266558817af09930cd4f"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-write.component.scss": "4fda645087ccabf7c77b2902b1106efc9ed9415b"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-read-label.html": "5dbc31c8259c5f503b00b65476552b726b6dfd1c"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/field-read-label.scss": "ab6c774c2b357f90f532b560df8718e7c33329dd"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/grey-bar.scss": "c44c1c06e6248d153cc5a890dd18655da49d583f"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/directives/conditional-show/services/grey-bar.service.ts": "7f1b0d12f0af5a80788e266558817af09930cd4f"
  "rpx-xui-webapp:src/cases/containers/query-management-container/query-management-container.component.ts": "4c290566eb9e4a07cc0de81a61022daa12092814"
  "rpx-xui-webapp:src/cases/query-management.routes.ts": "0cc0e9a4686b861db394bcc009c4b6681b24badd"
  "rpx-xui-webapp:src/app/services/ccd-config/ccd-case.config.ts": "eed279a4dd5502643063241d86c2911799acac38"
  "rpx-xui-webapp:src/app/providers/providers.module.ts": "0cc0e9a4686b861db394bcc009c4b6681b24badd"
  "rpx-xui-webapp:src/cases/cases.module.ts": "496d74f0b1a66c9aae6e057558642f2f447e59d9"
  "rpx-xui-webapp:package.json": "f2114b5f76f0eed12eb4c370c65157fe4aebaecb"
  "civil-wa-task-configuration:src/main/resources/wa-task-initiation-civil-civil.dmn": "7b8e953f91f63dad2f50124a634989bd472d22b2"
  "civil-wa-task-configuration:src/main/resources/wa-task-configuration-civil-civil.dmn": "2a3ab1dec2ad1bbd323512eecf40646f4d3244cf"
---

## TL;DR

- `@hmcts/ccd-case-ui-toolkit` is the Angular component library that renders all CCD case data in the XUI platform -- wizard forms, case views, search results, workbasket filters, and the full field-type palette.
- Published to npm (major version 7.x); consumed by all three XUI apps (`rpx-xui-webapp`, `rpx-xui-manage-organisations`, `rpx-xui-approve-org`).
- Built with ng-packagr from `projects/ccd-case-ui-toolkit/`; entry point is `public-api.ts`.
- Entirely NgModule-based (no standalone components); consumers import `CaseEditorModule`, `PaletteModule`, `CaseViewerModule`, etc.
- Host apps must provide `AbstractAppConfig` via DI to supply all backend URLs at runtime.
- Field rendering is driven by a `PaletteService` switch on `FieldTypeEnum` that dynamically creates read/write components for each CCD field type.

## What the toolkit renders

The toolkit is the rendering engine for CCD case data. It does not contain any BFF or server-side logic. Its responsibilities span four major UI domains:

| Domain | Root component | Selector | Purpose |
|--------|---------------|----------|---------|
| Wizard / event flow | `CaseEditComponent` | `ccd-case-edit` | Multi-page form flow for case events |
| Case creation | `CaseCreateComponent` | `ccd-case-create` | Fetches event trigger, delegates to wizard |
| Case view | `CaseFullAccessViewComponent` | `ccd-case-full-access-view` | Tabbed detail view with event trigger selector |
| Case list / search | `CaseListComponent`, `SearchResultComponent` | `ccd-case-list`, `ccd-search-result` | Paginated table of case rows |

Additionally, `WorkbasketFiltersComponent` (`ccd-workbasket-filters`) renders the workbasket filter panel used in Manage Cases.

## Component tree: the wizard

The wizard is the most complex subsystem. The component hierarchy for a case event flow is:

```
CaseCreateComponent
  └── CaseEditComponent
        ├── CaseEditPageComponent (one per wizard page, routed)
        │     └── CaseEditFormComponent
        │           └── FieldWriteComponent (per field, dynamic)
        │                 └── <concrete palette component>
        └── CaseEditSubmitComponent (check-your-answers)
              └── FieldReadComponent (per field, dynamic)
                    └── <concrete palette component>
```

**Wizard initialisation**: `CaseCreateComponent.ngOnInit()` fetches the event trigger via `CasesService.getEventTrigger()` from `GET /internal/case-types/{ctid}/event-triggers/{etid}`, then mounts `<ccd-case-edit>` with `submit`/`validate`/`saveDraft` callbacks (`case-create.component.ts:40-86`).

**Page navigation**: `CaseEditComponent.ngOnInit()` calls `WizardFactoryService.create(eventTrigger)` which wraps `eventTrigger.wizard_pages` in a `Wizard` instance sorted by `order`, creates a root `FormGroup` with keys `data` (field values) and `event` (id, summary, description) (`case-edit.component.ts:121-138`). The `next(currentPageId)` method purges hidden fields, evaluates `canShowPredicate` to find the next visible page, and navigates via Angular router (`case-edit.component.ts:188-220`).

**Submission**: `CaseEditComponent.submitForm()` checks session storage for a Work Allocation task. If found, triggers the event-completion FSM (`EventCompletionStateMachineService` from `@edium/fsm`). Otherwise, calls `caseSubmit()` directly (`case-edit.component.ts:261-309`). Before submission, `generateCaseEventData()` runs cleanup passes: sanitise dynamic lists, remove null labels, remove empty documents/collections, strip `FlagLauncher`/`ComponentLauncher` fields, then delete fields that no page in the journey validated (`case-edit.component.ts:319-360`).

**Important DI constraint**: `CaseEditPageComponent` injects `CaseEditComponent` directly (not via `@Input`). Both must exist in the same router outlet subtree for Angular DI resolution to work.

## Field-type palette

The palette is the system that renders individual CCD fields. It supports approximately 30 field types through a dynamic component dispatch mechanism.

### Dispatch mechanism

`FieldWriteComponent` (`ccd-field-write`) and `FieldReadComponent` (`ccd-field-read`) are universal host components. On init, each asks `PaletteService.getFieldComponentClass(caseField, isWrite)`, which is a `switch` on `caseField.field_type.type`, then dynamically creates the returned component via `ComponentFactoryResolver` (`field-write.component.ts:38-61`).

### Supported field types

The `FieldTypeEnum` union defines all supported types (`field-type-enum.model.ts`):

| Category | Types |
|----------|-------|
| Simple text/number | `Text`, `TextArea`, `RichTextArea`, `Postcode`, `Number`, `Email`, `PhoneUK` |
| Date/time | `Date`, `DateTime` |
| Yes/No | `YesOrNo` |
| Money | `MoneyGBP` |
| Lists | `FixedList`, `DynamicList`, `FixedRadioList`, `DynamicRadioList`, `DynamicMultiSelectList`, `MultiSelectList` |
| Structured | `Complex`, `Collection` |
| Document | `Document` |
| Address | `AddressGlobal`, `AddressGlobalUK`, `AddressUK` |
| Display-only | `Label`, `CasePaymentHistoryViewer`, `CaseHistoryViewer` |
| Extensible | `ComponentLauncher`, `WaysToPay`, `Organisation`, `JudicialUser` |
| Case flags | `Flags`, `FlagDetail`, `FlagLauncher`, `CaseFlag` |

`RichTextArea` is the newest of these and is the only type that can reject its own content on
security grounds. It dispatches to `WriteRichTextAreaFieldComponent` /
`ReadRichTextAreaFieldComponent`, and its validator raises an `unsafeRichText` error which
`CaseEditPageComponent` surfaces as "Potentially unsafe HTML content is not allowed in this
field." Treat that message as a sanitisation rejection rather than a formatting complaint — the
markup the user pasted contained something the sanitiser would not allow through, and rewording
the text will not clear it.

### ComponentLauncher extensibility

The `ComponentLauncher` field type uses `display_context_parameter` with `#ARGUMENT(...)` to select a sub-component. The `PaletteService.getComponentLauncherComponent()` method extracts the argument value, filters out standard `DisplayContextParameter` values (`READ`, `CREATE`, `UPDATE`), and looks up the remainder in `componentLauncherRegistry` (`palette.service.ts:138-154`, registry at `:61-65`).

The registry maps:

| Argument | Write component | Read component | Notes |
|----------|----------------|----------------|-------|
| `CaseFileView` | `CaseFileViewFieldComponent` | `CaseFileViewFieldComponent` | Same component for both modes; renders document hierarchy tree with inline media viewer |
| `LinkedCases` | `WriteLinkedCasesFieldComponent` | `ReadLinkedCasesFieldComponent` | Manages its own internal multi-step flow (intro, add/remove links, custom CYA) |
| `QueryManagement` | `ReadQueryManagementFieldComponent` | `ReadQueryManagementFieldComponent` | Read component used for both modes; manages query raise/respond flow internally |

If the `#ARGUMENT(...)` value does not match any registry key, `UnsupportedFieldComponent` is returned (silent fallback). Omitting `#ARGUMENT(...)` altogether does not fall back: the extraction indexes the regex match without a null guard (`palette.service.ts:141`), so a `ComponentLauncher` field whose `display_context_parameter` is missing or carries no `#ARGUMENT(...)` throws a `TypeError` while the field is being created rather than rendering nothing.

**CCD definition pattern for ComponentLauncher**: Services define a field of type `ComponentLauncher` on a tab or event. The `display_context_parameter` in `CaseEventToFields` or `ComplexTypes` must include `#ARGUMENT(<ComponentName>)`. The argument can be combined with standard display context parameters comma-separated (e.g. `#ARGUMENT(LinkedCases,CREATE)`); the standard entries are stripped and only the custom component name is used for registry lookup.

**Linked Cases flow**: The linking component uses component validity to signal to the wizard when the user may proceed. Services configure two events ("Add Case Link", "Remove Case Link") each with their own ComponentLauncher field. Case link data is stored in a `caseLinks` collection of `CaseLink` base types on the case payload.

**Query Management flow**: Services onboard by defining a "Queries" tab with a `componentLauncher` field using `#ARGUMENT(QueryManagement)`, plus `CaseQueriesCollection` fields per party role. The qualifying questions offered when a user raises a query are held in the LaunchDarkly flag `qm-qualifying-questions` and read by the host app, not by the toolkit: `rpx-xui-webapp` treats the flag value as a map of case type ID to question list and matches the current case type with both sides upper-cased, so a service can add or reword its questions without a deploy (`rpx-xui-webapp:src/cases/containers/query-management-container/query-management-container.component.ts:45`, `:421-469`). Each question supplies a `url`, and the literal `${[CASE_REFERENCE]}` inside it is substituted with the case reference — a flag payload that hard-codes a reference instead sends every user to the same case.

Work Allocation task creation is service-side configuration rather than toolkit behaviour. The case type's `wa-task-initiation` table fires on the `queryManagementRaiseQuery` event, and its `wa-task-configuration` table builds the task description as a markdown link to `/query-management/query/<case reference>/3/<query id>` (`civil-wa-task-configuration:src/main/resources/wa-task-initiation-civil-civil.dmn:53322`, `civil-wa-task-configuration:src/main/resources/wa-task-configuration-civil-civil.dmn:3619`). The matching route is `query/:cid/:qid/:dataid` under the `query-management` path (`rpx-xui-webapp:src/cases/query-management.routes.ts:8-26`), so the `3` is not a query ID: it is the fixed `qid` value that puts the container into respond mode, alongside `1` for the qualifying-question detail page, `raiseAQuery` for a new query and `4` for a follow-up (`rpx-xui-webapp:src/cases/containers/query-management-container/query-management-container.component.ts:49-53`, `:398-408`). A task link that omits or changes that segment opens a different journey on the same case.

### Notable behaviours

- Unknown field types fall through to `UnsupportedFieldComponent` which renders nothing silently -- fields do not throw (`palette.service.ts:133-134`).
- `Complex` type has a nested switch on `field_type.id` to distinguish `AddressGlobalUK`/`AddressUK`, `OrderSummary`, `CaseLink`, `Organisation`, `JudicialUser` from generic complex rendering (`palette.service.ts:99-114`).
- `FieldReadComponent` defers dynamic component creation with `Promise.resolve(null).then(...)` to allow label interpolation to complete first; the field container is empty during the synchronous render pass (`field-read.component.ts:33-42`).
- `AddressGlobal` appears in `FieldTypeEnum` but is NOT handled in the `PaletteService` switch -- it falls through to `UnsupportedFieldComponent`. Only `AddressGlobalUK`/`AddressUK` are routed to `WriteAddressFieldComponent` via the Complex branch.

## How case-type definitions drive the UI

The toolkit does not define case types. It receives definitions from the CCD data store at runtime and uses them to build the UI dynamically.

### Key domain models

| Model | Purpose | Key fields |
|-------|---------|------------|
| `CaseEventTrigger` | Payload from event-trigger endpoint | `wizard_pages`, `case_fields`, `event_token`, `show_summary`, `can_save_draft` |
| `WizardPage` | One page of the wizard | `wizard_page_fields`, `show_condition`, `order` |
| `WizardPageField` | Links a case field to a page | `case_field_id`, `page_column_no`, `complex_field_overrides` |
| `CaseField` | Field metadata | `display_context`, `show_condition`, `retain_hidden_value`, `display_context_parameter`, `field_type` |
| `FieldType` | Type descriptor | `type`, `id`, `min`, `max`, `regular_expression`, `fixed_list_items`, `complex_fields`, `collection_field_type` |

### Trigger initialisation flow

When `CasesService.getEventTrigger()` fetches a trigger, `initialiseEventTrigger()` (`cases.service.ts:296-306`):

1. Ensures `wizard_pages` is defined.
2. Parses each page's `show_condition` into a `ShowCondition` instance.
3. Maps and orders `case_fields` on each page via `WizardPageFieldToCaseFieldMapper.mapAll()`.

The mapper looks up each `WizardPageField.case_field_id` in the trigger's flat `case_fields` array, attaches `wizardProps` (including `page_column_no` for two-column layouts), and applies `complex_field_overrides` to mutate sub-field metadata (`wizard-page-field-to-case-field.mapper.ts:11-34`).

### Show/hide conditions

Show conditions use a [Peggy](https://peggyjs.org/) grammar supporting `=`, `!=`, `CONTAINS`, `AND`, `OR`, and nested parentheses. Field references follow `[A-Za-z0-9._-]+`; metadata fields use square-bracket syntax (`[fieldName]`). Quoted string values accept `[A-Za-z0-9.,* _&()/-]*`; unquoted values are plain words or integers. The same parser handles both page-level and field-level conditions.

The grammar source is `condition.peggy`, and the parser is **generated, not hand-written**: `npm run generate:condition-parser` runs `peggy --format es` to emit `condition-parser.generated.ts` (prefixed with `// @ts-nocheck` and a do-not-edit banner). `condition.peg.ts` is now a three-line re-export of that generated module, kept so existing import paths still resolve. To change the condition syntax, edit `condition.peggy` and re-run the generator — never edit the generated file. For Complex/Collection subfields, `ShowCondition.addPathPrefixToCondition()` rewrites nested field references with the parent field path.

#### Conditional show architecture

The toolkit's conditional show system was redesigned to resolve severe performance problems with collections of complex types. The original per-field `ccdConditionalShow` directive listened to every form change and then evaluated *all* show conditions on the form from every field, causing an exponential cascade. A collection of 25 elements could take over a minute; 100 elements could take over an hour.

The current implementation uses a form-level directive `ccdConditionalShowForm` (`conditional-show-form.directive.ts`) applied to a container holding all fields. When any field changes, only the container is notified. The directive:

1. Builds the evaluation context: all current field values (including disabled fields via `getRawValue()`) merged with read-only context fields.
2. Iterates the `FormGroup` tree via `fieldsUtils.controlIterator()`, evaluating each field's `show_condition` against the context.
3. Sets `caseField.hidden = true/false` based on the `ShowCondition.match()` result.
4. Disables hidden controls (so they don't contribute to form validation state) and re-enables shown ones, both with `emitEvent: false` to avoid re-triggering.
5. Uses `debounceTime(100)` on `formGroup.valueChanges` to batch evaluations while the user is typing.

The `hidden` property keeps the element in the DOM (unlike `*ngIf`) for efficiency when toggling. It is bound to the `[hidden]` attribute of the wrapper `div` that both field hosts render (`field-write.component.html:1`, `field-read-label.html:1`), so a hidden field is `display: none` — out of the tab order and out of the accessibility tree — on top of having its control disabled by the directive.

The vertical grey bar is a class on that same wrapper: `grey-bar` indents the field and draws a 5px left border in the GOV.UK border colour, suppressed when the field is in an error state (`grey-bar.scss:24-26`), and both field stylesheets import it (`field-write.component.scss:1`, `field-read-label.scss:32`). The class is bound as `canHaveGreyBar && !caseField.hiddenCannotChange`, where `canHaveGreyBar` is set for any field carrying a `show_condition` — for write fields, any non-`Collection` field (`field-write.component.ts:60`). The bar therefore marks fields whose visibility is condition-driven, not only fields that have just appeared. It is a border with no ARIA role, label or text alternative, so it conveys nothing to a screen reader; anything the user must be told about content appearing belongs in the field's own label or hint text.

`GreyBarService` tracks which fields toggled to show and can add a `show-condition-grey-bar` class (`grey-bar.service.ts:18-52`), but no library code calls any of its methods and the published package carries no stylesheet for that class — `CaseEditComponent` provides the service (`case-edit.component.ts:36`) and the class name appears only in the service, its unit tests and the Storybook stylesheet.

Fields with `display_context === 'HIDDEN'` are unconditionally hidden regardless of show conditions. The `hiddenCannotChange` flag is computed to suppress the grey bar when the show condition depends only on `HIDDEN`/`READONLY` fields (i.e. the user cannot toggle it).

<!-- DIVERGENCE: Confluence "Expert UI Low Level Design - Case UI Toolkit Field Conditional Show" attributes the grey bar to GreyBarService and sets out accessibility requirements around it (screen-reader hiding, tab-order maintenance). In source the bar is a CSS class bound in the two field-host templates, GreyBarService has no callers in library code, and the only screen-reader and tab-order behaviour comes from the [hidden] attribute plus control disabling — there is no ARIA or tabindex handling. Source wins. -->

### Data cleanup on submit

Fields with `retain_hidden_value = true` that are currently hidden have their form value replaced with the original `formatted_value` before submit (`case-edit.component.ts:409-454`). Fields with `retain_hidden_value = false` (the default) are purged entirely.

## Publishing and versioning

### Build pipeline

The library is built with ng-packagr:

```
yarn build:library
  -> ng build ccd-case-ui-toolkit-lib
  -> ng-packagr produces dist/ccd-case-ui-toolkit/
     (bundles, type declarations and a generated package.json)
```

Configuration: `projects/ccd-case-ui-toolkit/ng-package.json` sets `entryFile: "src/public-api.ts"` and `dest: "../../dist/ccd-case-ui-toolkit"` (`ng-package.json:1-10`). Which bundle formats land there is decided by the pinned `ng-packagr`, so read them from the build output rather than assuming.

### npm package

- Package name: `@hmcts/ccd-case-ui-toolkit`
- Major version: `7.x` (exact published version: see `package.json` on master, or npm)
- `publishConfig.access: "public"` (required for scoped packages)
- Only `dist/` is published (`.npmignore` excludes `src/`, `coverage/`, `docs/`, `node_modules/`)

### CI/CD pipeline (GitHub Actions)

Publishing is automated via `.github/workflows/npmpublish.yml`:

| Trigger | Job | Action |
|---------|-----|--------|
| PR or push to `master`/`Release` | `build` | Install, audit, lint, build, test (coverage uploaded as artifact) |
| PR or push to `master`/`Release` | `sonarcloud` | SonarQube analysis on coverage report |
| GitHub Release created | `release-build` | Install, build (no test -- tests run on the prior push) |
| GitHub Release created | `publish-npm` | Publish to npm via OIDC Trusted Publishing (no token needed) |
| GitHub Release created | `publish-gpr` | Pack tarball, attach to GitHub Release as asset |

Pre-releases (GitHub Release marked "pre-release") are published to the `next` npm dist-tag; full releases use `latest`. This allows consuming apps to opt into pre-releases via `@hmcts/ccd-case-ui-toolkit@next` without affecting stable `yarn install`.

**Service Regression Testing (SRT)**: Toolkit releases that are risk-assessed as potentially impacting service journeys go through a manual SRT window. The QA team coordinates with affected services to verify their key journeys in the PR environment before the final release is merged. This process means toolkit releases are typically batched every 2-4 weeks.
<!-- CONFLUENCE-ONLY: SRT window cadence (2-4 weeks) and manual sign-off process not verified in source -->

### Versioning workflow

The `preversion` hook runs `npm run ci` (lint + test + build). The `postversion` hook pushes commits and tags. Standard workflow: bump version in `package.json` **and** in `projects/ccd-case-ui-toolkit/package.json` (both must match), then create a GitHub Release.

**Dual-team version numbering convention** (from release process documentation):
- **Feature team** releases increment the minor version: `7.3.0` -> `7.4.0` -> `7.5.0`
- **PET (production engineering) team** releases increment the patch version: `7.3.1` -> `7.3.2`
- Pre-release labels follow the pattern `<version>-<description>` (e.g. `7.39.0-fix-link-defect`)

JIRA Fix Version tags: Feature team uses `EXUI_MC_X.Y.Z`, PET team uses `EXUI_MC_PET_X.Y.Z`.
<!-- CONFLUENCE-ONLY: Dual-team versioning convention and JIRA fix version naming not verified in source -->

### Consumption contract

Consuming apps must:

1. Install `@hmcts/ccd-case-ui-toolkit` as a dependency, pinned to an exact patch version. The three apps are routinely on slightly different pins — `rpx-xui-webapp` usually leads, since toolkit changes are validated there first. Check each app's `package.json` for the version actually in use.
2. Import the needed NgModules (`CaseEditorModule`, `PaletteModule`, `CaseViewerModule`).
3. Provide `AbstractAppConfig` via Angular DI, implementing every abstract method that returns a backend URL (`getApiUrl()`, `getCaseDataUrl()`, `getDocumentManagementUrl()`, `getWorkAllocationApiUrl()`, `getCaseFlagsRefdataApiUrl()`, and the rest). In `rpx-xui-webapp` the implementation is `AppConfig` (`rpx-xui-webapp:src/app/services/ccd-config/ccd-case.config.ts:24`), which reads a config payload fetched at bootstrap and overlays LaunchDarkly values on top of it.

   The registration pattern matters: `AppConfig` itself is provided once by `ProvidersModule.forRoot()` (`rpx-xui-webapp:src/app/providers/providers.module.ts:20`), and each lazy feature module that pulls in toolkit modules then aliases the token with `{ provide: AbstractAppConfig, useExisting: AppConfig }` (`rpx-xui-webapp:src/cases/cases.module.ts:126-129`, and the same three lines in `hearings.module.ts`, `noc.module.ts` and `role-access.module.ts`). `useExisting` is what keeps every lazy chunk on the one instance; `useClass` in a lazy module would give that chunk its own `AppConfig` with its own uninitialised LaunchDarkly state.

Version pinning is exact (not caret/tilde) because SRT validates a specific version before release. Updates require a dedicated PR to bump the toolkit version in each consuming app.

### Peer dependencies

`projects/ccd-case-ui-toolkit/package.json` is the manifest ng-packagr publishes, and it declares **only** peer dependencies — no runtime `dependencies` block at all. The peers cover the Angular 20 framework packages and NgRx 20, plus `rxjs`, `moment`, `underscore`, `ngx-chips`, `ngx-editor`, `ngx-markdown`, `ngx-pagination`, the ProseMirror packages and `rpx-xui-translation`. `@angular/cdk` and `@angular/material` are peers on their own earlier major lines (17 and 16), not on 20, so a consuming app has to satisfy both generations at once (`projects/ccd-case-ui-toolkit/package.json:4-37`).

`@hmcts/media-viewer`, `@hmcts/ccpay-web-component` and `@edium/fsm` are not declared by the published package in any form, even though library code imports them. Consuming apps install them directly and choose their own versions — `rpx-xui-webapp` lists all three in its own `dependencies` (`rpx-xui-webapp:package.json:117-121`) — which means a version skew between the app and what the toolkit was built against surfaces as a runtime error, not an install-time conflict.

## Local development with the toolkit

To develop toolkit changes with live feedback in the consuming app, use the watch + link workflow:

```bash
# In the toolkit repo
yarn install
yarn build:library:watch

# In rpx-xui-webapp package.json, replace the version with a link:
#   "@hmcts/ccd-case-ui-toolkit": "link:../ccd-case-ui-toolkit/dist/ccd-case-ui-toolkit"
```

The `build:library:watch` command (`ng build ccd-case-ui-toolkit-lib --watch`) rebuilds on source changes; the npm link means the consuming app's dev server picks up changes via the Angular compiler's incremental rebuild. If dependency resolution issues arise after toggling between linked and published installs, run `yarn clean && yarn install` to reset.

## Architecture decisions and trade-offs

**NgModule-based, not standalone**: All components use `standalone: false`. This means consumers must import entire modules rather than individual components, which increases bundle size but simplifies the internal dependency graph.

**Dynamic component dispatch**: The `PaletteService` switch-based dispatch allows the toolkit to render any field type without consumers knowing the concrete components. The trade-off is that unknown types fail silently (`UnsupportedFieldComponent` renders nothing).

**Mutating mapper**: `WizardPageFieldToCaseFieldMapper` mutates `CaseField` objects in place (`caseField.wizardProps = wizardField`). These are the same instances in `eventTrigger.case_fields`, so side effects propagate across the entire trigger. This is by design for performance but makes debugging difficult.

**CCD API versioning**: `CasesService` uses versioned Accept headers (e.g. `application/vnd.uk.gov.hmcts.ccd-data-store-api.ui-case-view.v2+json`) and attaches a `clientContext` header from session storage for Work Allocation task tracking.

**Welsh language support**: `RpxTranslationModule` (from `rpx-xui-translation`) is imported in `PaletteModule` and `CaseEditorModule`; user-facing strings use the `rpxTranslate` pipe.

## Examples

### `PaletteService.getFieldComponentClass`: the field-type dispatch switch

```typescript
// Source: apps/xui/ccd-case-ui-toolkit/projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/palette.service.ts

@Injectable()
export class PaletteService {
  // ComponentLauncher registry: keyed by #ARGUMENT(...) value in display_context_parameter
  private readonly componentLauncherRegistry = {
    [DisplayContextCustomParameter.CaseFileView]:    [CaseFileViewFieldComponent,    CaseFileViewFieldComponent],
    [DisplayContextCustomParameter.LinkedCases]:     [WriteLinkedCasesFieldComponent, ReadLinkedCasesFieldComponent],
    [DisplayContextCustomParameter.QueryManagement]: [ReadQueryManagementFieldComponent, ReadQueryManagementFieldComponent],
  };

  public getFieldComponentClass(caseField: CaseField, write: boolean): Type<{}> {
    switch (caseField.field_type.type) {
      case 'Text':
      case 'Postcode':
        return write ? WriteTextFieldComponent : ReadTextFieldComponent;
      case 'YesOrNo':
        return write ? WriteYesNoFieldComponent : ReadYesNoFieldComponent;
      case 'Date':
      case 'DateTime':
        return write ? WriteDateContainerFieldComponent : ReadDateFieldComponent;
      case 'Document':
        return write ? WriteDocumentFieldComponent : ReadDocumentFieldComponent;
      case 'Complex':
        // Sub-switch on field_type.id for named complex types
        switch (caseField.field_type.id) {
          case 'AddressGlobalUK':
          case 'AddressUK':
            return write ? WriteAddressFieldComponent : ReadComplexFieldComponent;
          case 'Organisation':
            return write ? WriteOrganisationFieldComponent : ReadOrganisationFieldComponent;
          case 'JudicialUser':
            return write ? WriteJudicialUserFieldComponent : ReadJudicialUserFieldComponent;
          default:
            return write ? WriteComplexFieldComponent : ReadComplexFieldComponent;
        }
      case 'ComponentLauncher':
        return this.getComponentLauncherComponent(caseField, write);
      case 'FlagLauncher':
        return write ? WriteCaseFlagFieldComponent : ReadCaseFlagFieldComponent;
      default:
        return UnsupportedFieldComponent;  // silent fallback — renders nothing
    }
  }

  // Extracts #ARGUMENT(X) from display_context_parameter and looks up X in the registry
  private getComponentLauncherComponent(caseField: CaseField, write: boolean): any {
    const argumentValue = caseField?.display_context_parameter?.match(/#ARGUMENT\((.*?)\)/)[1];
    if (argumentValue) {
      const componentToRender = (argumentValue.includes(',') ? argumentValue.split(',') : [argumentValue])
        .filter(p => !Object.values(DisplayContextParameter).includes(p as any));
      if (componentToRender.length > 0 && this.componentLauncherRegistry.hasOwnProperty(componentToRender[0])) {
        return this.componentLauncherRegistry[componentToRender[0]][write ? 0 : 1];
      }
    }
    return UnsupportedFieldComponent;
  }
}
```

### Consuming the toolkit: `AbstractAppConfig` provider requirement

The toolkit resolves all backend URLs through Angular DI. Consuming apps must provide a concrete `AbstractAppConfig`:

```typescript
// Source: apps/xui/rpx-xui-webapp/src/app/providers/providers.module.ts
// The concrete AppConfig is provided once, at the root.

export class ProvidersModule {
  public static forRoot(): ModuleWithProviders<RouterModule> {
    return {
      ngModule: ProvidersModule,
      providers: [AuthService, AppConfigService, AppConfig, AuthService],
    };
  }
}
```

```typescript
// Source: apps/xui/rpx-xui-webapp/src/cases/cases.module.ts
// Each lazy feature module that imports toolkit modules aliases the token to that
// one instance. The same three lines appear in hearings, noc and role-access.

@NgModule({
  imports: [
    // CaseEditorModule for the wizard, PaletteModule for fields, CaseViewerModule for the
    // case view — all exported from @hmcts/ccd-case-ui-toolkit
  ],
  providers: [
    {
      provide: AbstractAppConfig,
      useExisting: AppConfig,
    },
  ],
})
export class CasesModule {}
```

## See also

- [How-to: Add a Component](../how-to/add-a-component.md) — step-by-step guide to creating a new field renderer or ComponentLauncher component and publishing a new toolkit version
- [Translation](translation.md) — how `RpxTranslationModule.forChild()` provides Welsh support inside the toolkit's modules
- [Overview](overview.md) — how the toolkit fits into the XUI platform and which apps consume it
- [Reference: Shared Libraries](../reference/shared-libraries.md) — toolkit versioning, SRT process, and the inter-library dependency graph
- [Glossary](../reference/glossary.md) — definitions of `ccd-case-ui-toolkit`, `ComponentLauncher`, `PaletteService`, `AbstractAppConfig`, and SRT
