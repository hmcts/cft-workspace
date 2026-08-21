---
topic: overview
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Tab.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/ConfigBuilderImpl.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/CaseTypeTabGenerator.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/NoFaultDivorce.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/DefaultAccess.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/AuthorisationCaseFieldGenerator.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/model/CaseTypeTab.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/AbstractDisplayGroupParser.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/aggregated/AbstractAuthorisedCaseViewOperation.java
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-viewer/case-full-access-view/case-full-access-view.component.ts
status: confluence-augmented
last_reviewed: 2026-08-20T00:00:00Z
confluence_checked_at: 2026-08-20T00:00:00Z
confluence:
  - id: "1201997079"
    title: "How-to: Add a field to a tab in CCD"
    last_modified: "unknown"
    space: "DIV"
  - id: "1440511391"
    title: "How-to: Show or Hide a tab in CCD"
    last_modified: "unknown"
    space: "DIV"
  - id: "207804327"
    title: "CCD Definition Glossary for Setting up a Service in CCD"
    last_modified: "2026-06-23"
    space: "RCCD"
  - id: "1056801404"
    title: "Show Conditions and how they work"
    last_modified: "unknown"
    space: "RCCD"
  - id: "205750327"
    title: "CCD - Import Domain - Validation Rules"
    last_modified: "unknown"
    space: "RCCD"
  - id: "526025272"
    title: "Hide and show fields/pages/tabs"
    last_modified: "unknown"
    space: "RCCD"
title: Add a Tab
diataxis: how-to
product: ccd
sources_sha:
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java": "d9b4098e76e1f1464e3a75bb4f37020d3e266dd4"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Tab.java": "0115317280dd5794d0fbd0f1bf6cc21a4e013ee3"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/ConfigBuilderImpl.java": "d9b4098e76e1f1464e3a75bb4f37020d3e266dd4"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/CaseTypeTabGenerator.java": "e7e93f75d554917dda9b750161232701c096f1b1"
  "ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/NoFaultDivorce.java": "a000eefc369f6bfa1b17291ea3c5aebbb3ebf4f7"
  "ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/DefaultAccess.java": "38ed5f63d1bd4cf8871e1dd9c7d677e425a240b7"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/AuthorisationCaseFieldGenerator.java": "0cb5b7fbcd3031dfa32ac45d7dd191db04eec059"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/model/CaseTypeTab.java": "29f31a3f90f265880dd22227caf98d7b928fe306"
  ? "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/parser/AbstractDisplayGroupParser.java"
  : "9bc6616b1c69561a49bf23a748745c2df60217bc"
  "ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java": "77b362ce2cfeb8c11f1a2d23e9129297aa65fd7b"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/aggregated/AbstractAuthorisedCaseViewOperation.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  ? "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-viewer/case-full-access-view/case-full-access-view.component.ts"
  : "0e06e04fea8507450dc5345137d4340d0f460fa9"
---

# Add a Tab

## TL;DR

- A tab is a named panel on the case view screen, defined via `ConfigBuilder.tab(tabId, tabLabel)` in your `CCDConfig` class.
- Field display order is determined by the sequence of `.field()` calls on the `TabBuilder`; tab display order follows the order you call `.tab()` in `configure()`.
- Tab-level visibility can be restricted to specific roles with `.forRoles(...)` and/or hidden by an expression with the tab's `showCondition`.
- Field-level visibility is governed by access classes on each field (`@CCD(access = {...})`). A role that lacks `READ` on a field will not see that field in the tab, regardless of the tab's role mapping.
- The SDK generator hard-codes `Channel: "CaseWorker"` for every emitted tab row — citizen-channel views are configured separately, outside `tab()`.
- Validation: `TabID` <= 40 chars, `TabLabel` <= 30 chars, `TabShowCondition` and `FieldShowCondition` <= 1000 chars.

## Steps

### 1. Define the tab in your CCDConfig

In your `CCDConfig.configure()` implementation, call `ConfigBuilder.tab()`:

```java
@Override
public void configure(ConfigBuilder<CaseData, State, UserRole> configBuilder) {
    configBuilder
        .tab("notesTab", "Notes")
        .field(CaseData::getNotes);
}
```

`tab(tabId, tabLabel)` is declared at `ConfigBuilder.java:41` and implemented at `ConfigBuilderImpl.java:260`. `tabId` must be unique within the case type. `tabLabel` is the string shown in the UI.

Length limits enforced by the definition-store importer (`CCD - Import Domain - Validation Rules`, rules 11.1–11.6):

| Column          | Max length | Notes                                            |
| --------------- | ---------- | ------------------------------------------------ |
| `TabID`         | 40         | Alphanumeric / underscore only                   |
| `TabLabel`      | 30         |                                                  |
| `TabShowCondition` | 1000    |                                                  |
| `FieldShowCondition` | 1000  |                                                  |
| `UserRole`      | 100        | IDAM or case role; blank = applies to all roles  |

### 2. Add fields in display order

Chain `.field()` calls to add fields. The order of calls determines the order fields appear on screen:

```java
configBuilder
    .tab("summaryTab", "Summary")
    .field(CaseData::getApplicantName)
    .field(CaseData::getApplicationType)
    .field(CaseData::getDateSubmitted);
```

`.field()` accepts a method reference to a getter on your case data class. The SDK resolves the CCD field ID from the Java property name (`Tab.java:42–44`).

There are several `.field()` overloads (`Tab.java:41–64`):

```java
.field(CaseData::getApplicantName)                               // simplest form
.field(CaseData::getSolicitorReference, "applicationType=\"sole\"") // with showCondition
.field(CaseData::getFlags, null, "#ARGUMENT(READ,LARGE_FONT)")   // with displayContextParameter
.field("explicitFieldId")                                        // by string id
.field("explicitFieldId", "showCondition")
```

The third positional argument is the CCD `DisplayContextParameter` column — currently used for the Collection Table View (`#ARGUMENT(...)` for case-flag launchers and similar web components). Values are not validated by CCD; the front-end web component decides what they mean.

There's also `.label(fieldName, showCondition, label)` which adds a synthetic Label-type field to the tab, and `.collection(getter)` as a sugar form of `.field(getter, null)` for collections.

### 3. Restrict the tab to specific roles (optional)

A tab can be shown only to specific roles by calling `.forRoles(...)` on the builder. The SDK emits one CaseTypeTab JSON block **per role** with the `UserRole` column populated on the first field row only (`CaseTypeTabGenerator.java:46–49,96`):

```java
configBuilder
    .tab("internalReviewTab", "Internal review")
    .forRoles(UserRole.CASEWORKER, UserRole.CASEWORKER_ADMIN)
    .field(CaseData::getReviewNotes);
```

If `.forRoles(...)` is not called, the SDK leaves `UserRole` blank, which the data store treats as "applies to all roles that pass field-level access checks" (per `CaseTypeTab.UserRole` column in the glossary: "Blank is the default if a Role doesn't have a mapping").

When you specify multiple roles, each role gets its own record with its own `TabDisplayOrder` increment, and the role name is **appended to the tab ID**: `TabID` is written as `tabId + role`, so `internalReviewTab` under two roles emits `internalReviewTabcaseworker` and `internalReviewTabcaseworker-admin` in files named `<tabDisplayOrder>_<tabId><role>.json` (`CaseTypeTabGenerator.java:54,68`). The `TabLabel` is the same on every record, so the user still sees one tab.

That suffixing is load-bearing rather than cosmetic. The definition store groups rows into one display group per `CaseEventID` + `TabID` (`AbstractDisplayGroupParser.java:93-97`) and rejects a group in which more than one row carries an access profile — "Please provide one access profile row per tab" (`AbstractDisplayGroupParser.java:163-192`). Distinct tab IDs are what keep the per-role rows in separate groups. The `UserRole` column the SDK writes is read as `AccessProfile`, for which it is a registered alias (`ColumnName.java:9`).

The runtime model exposes the role on each tab via `CaseTypeTab.getRole()` (`CaseTypeTab.java:69–75`), and the data store discards any tab whose role is set and is not one of the caller's access profiles (`AbstractAuthorisedCaseViewOperation.java:79-82`).

### 4. Control field-level visibility via field access

Tab role mapping (step 3) is a coarse filter; finer-grained visibility is governed by `@CCD(access = {...})` on each field. A role that lacks `READ` permission on a field will not see that field in the tab, even if the tab itself is mapped to that role.

```java
@CCD(access = {DefaultAccess.class})
private String applicantName;

@CCD(access = {CaseworkerAccess.class})
private String internalCaseNote;
```

`DefaultAccess` grants `READ` to all roles including `CITIZEN`. `CaseworkerAccess` restricts to caseworker roles only. Access classes implement `HasAccessControl.getGrants()` returning a `SetMultimap<HasRole, Permission>`.

A citizen visiting the case will see fields with `DefaultAccess` but not fields with `CaseworkerAccess`.

### 5. Hide a tab with a tab-level show condition (optional)

To hide an entire tab unless a condition is met, call `.showCondition(...)` on the `TabBuilder` — the setter is generated from the `Tab.showCondition` field (`Tab.java:19`):

```java
configBuilder
    .tab("linkedCaseTab", "Linked cases")
    .showCondition("previousCaseId!=\"\"")
    .field(CaseData::getPreviousCaseId)
    .field(CaseData::getAmendedCaseId);
```

The SDK writes `TabShowCondition` onto the **first** field row of each record only (`CaseTypeTabGenerator.java:70–72`), and that single value governs the whole tab: the definition store collapses every row sharing a `TabID` into one display group and takes the group's show condition from whichever row supplies one (`AbstractDisplayGroupParser.java:194-205`). Putting `TabShowCondition` on two rows of the same `TabID` is not a way to give a tab two conditions — the import fails with "Please provide single condition in TabShowCondition column".

A tab show condition is a display rule, not an access control. The data store returns the condition alongside the tab's fields and the browser decides whether to render the tab (`case-full-access-view.component.ts:487-493`), so the field values of a hidden tab still travel to the client. Use `@CCD(access = ...)` when the data itself must not leave the data store.

The expression syntax is the standard CCD show-condition language (`text="value"`, `text!="value"`, `text CONTAINS "value"`, with `*` and blank wildcards, AND/OR with parentheses, dotted paths into ComplexTypes, and `[STATE]` / `[INJECTED_DATA.x]` metadata references). See [Show Conditions](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1056801404) on Confluence for the full grammar.

Notable rules:
- Mixing AND and OR in one expression is supported (RDM-10133); use parentheses.
- The fields referenced must exist in the case type (or be metadata); otherwise the definition import fails.
- `CONTAINS` only works on multi-select fields.
- NULL is not supported — use `Field=""` or `Field="*"` for blank/any.

### 6. Add a show condition on a single field (optional)

To show a field only when another field has a particular value, pass a `showCondition` string to `.field()`:

```java
configBuilder
    .tab("summaryTab", "Summary")
    .field(CaseData::getSolicitorReference, "applicationType=\"jointApplication\"");
```

The second argument is the CCD show-condition expression. The field remains in the definition but is hidden in the UI when the condition is false. Same syntax as step 5.

### 7. Assign tab order (optional)

Display order in the UI follows the order you call `.tab()` in `configure()`. Define high-priority tabs first:

```java
configBuilder.tab("summaryTab", "Summary")
    .field(CaseData::getApplicantName);

configBuilder.tab("notesTab", "Notes")
    .field(CaseData::getNotes);
```

The generator increments `TabDisplayOrder` starting at `1` (or `2` if it auto-injects a `CaseHistory` tab — see below) and writes one numbered file per tab into `CaseTypeTab/`.

### 8. Be aware of the auto-injected CaseHistory tab

If your `configure()` method does **not** define a tab with `tabId == "CaseHistory"`, the SDK automatically adds one as the first tab on the case view (`CaseTypeTabGenerator.java:30–32`). To relocate or relabel it, define your own `tab("CaseHistory", "...")` explicitly.

The auto-injected tab is written once, with no role, so it is not hidden per role by tab configuration. Hide it for particular roles with `ConfigBuilder.omitHistoryForRoles(...)` (`ConfigBuilder.java:50`, `ConfigBuilderImpl.java:155-157`):

```java
configBuilder.omitHistoryForRoles(UserRole.SYSTEM_UPDATE);
```

That withholds the `caseHistory` field's `CRU` grant from those roles when `AuthorisationCaseField.json` is generated (`AuthorisationCaseFieldGenerator.java:92-95`). Because the data store drops any tab left with no readable fields (`AbstractAuthorisedCaseViewOperation.java:74-78`), the History tab disappears for those roles rather than rendering empty. Every other role still gets `CRU` on `caseHistory`, so this is opt-out, not opt-in.

<!-- DIVERGENCE: Confluence asserts per-role hiding of the History tab is UI behaviour and that the SDK only auto-injects a single global tab. Source: ConfigBuilder.omitHistoryForRoles is a first-class SDK call (ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java:50) implemented by withholding the caseHistory grant per role (ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/AuthorisationCaseFieldGenerator.java:92-95), which the data store turns into a dropped tab (ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/aggregated/AbstractAuthorisedCaseViewOperation.java:74-78). Source wins. -->

### 9. Regenerate the JSON definition

Run the SDK generator to emit updated definition JSON:

```bash
./gradlew generateCCDConfig
```

The SDK writes one file per tab record into `<output>/CaseTypeTab/<tabDisplayOrder>_<tabId><role>.json` and also appends any `Label`-type fields it created into `CaseField.json` (`CaseTypeTabGenerator.java:51–60`). Exact output path is controlled by your project's `ccd { }` Gradle block. Import the updated definition into the definition store.

## Caseworker vs citizen visibility

The SDK's `tab()` builder hard-codes `Channel: "CaseWorker"` on every row it writes (`CaseTypeTabGenerator.java:93`). This means tabs declared via `tab()` are scoped to the caseworker UI. Citizen-channel tabs are configured separately by the service team (typically by hand-authored JSON or a separate generator) and are not produced by `tab()`.

Within the caseworker channel, what each role actually sees follows this hierarchy:

| Layer                                             | If unmet, the role sees…                              |
| ------------------------------------------------- | ----------------------------------------------------- |
| Tab `forRoles` mapping (if specified)             | …no row of the tab at all (data store)                |
| Field's `@CCD(access = ...)` grants `READ`        | …the tab without the field, and no tab at all once every field has been filtered out (data store) |
| Tab `TabShowCondition` evaluates true             | …no tab, but the field values still reach the browser (browser) |
| Field's `FieldShowCondition` evaluates true       | …the tab without the field, whose value still reaches the browser (browser) |

`DefaultAccess` (`test-projects/.../DefaultAccess.java:22-30`) grants `READ` to all roles including `CITIZEN`. `CaseworkerAccess` typically restricts to caseworker roles only — fields annotated this way are invisible to citizens even if they ever reach a tab where the field is listed.

## Verify

1. After importing the definition, open a case in the CCD case viewer (caseworker channel) and confirm the new tab label appears in the tab bar.
2. If `forRoles` was used, log in as a role both inside and outside the mapping and confirm visibility flips accordingly.
3. Log in as a citizen and confirm that fields restricted to caseworker access classes are absent (they will not appear at all).
4. Inspect the generated JSON under `<output>/CaseTypeTab/`. Confirm:
   - One file per `(tabId, role)` combination, named `<tabDisplayOrder>_<tabId><role>.json`.
   - `TabFieldDisplayOrder` starts at 1 and increments per field.
   - `Channel` is `CaseWorker`.
   - `TabShowCondition` (if any) is set on the row where `TabFieldDisplayOrder == 1`.
   - `UserRole` is set only on the first field row of each role's block.

## See also

- [`apps/ccd/docs/reference/glossary.md`](../reference/glossary.md) — definitions for tab, field access, show condition.
- Confluence: [Show Conditions and how they work](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1056801404) — full grammar, multi-select semantics, injected metadata.
- Confluence: [How-to: Show or Hide a tab in CCD](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1440511391) — divorce-team's spreadsheet-based equivalent.
- Confluence: [CCD Definition Glossary — CaseTypeTab section](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=207804327) — column-by-column reference for the underlying spreadsheet.
