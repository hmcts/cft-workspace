---
topic: overview
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/NoFaultDivorce.java
  - ccd-config-generator:test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/access/DefaultAccess.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Add a Tab

## TL;DR

- A tab is a named panel on the case view screen; defined via `ConfigBuilder.tab(tabId, tabLabel)` in your `CCDConfig` class.
- Fields are added in order — display order is determined by the sequence of `.field()` calls on the `TabBuilder`.
- Role-based visibility is controlled by the `access` annotation on each field in your case data class (`@CCD(access = {...})`).
- Caseworkers see fields granted to their role; citizens only see fields where their role has at least `READ` permission.
- A show condition on a field (`showCondition`) hides or reveals it within the tab without removing it from the definition.

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

`tab(tabId, tabLabel)` is defined at `ConfigBuilder.java:41`. `tabId` must be unique within the case type. `tabLabel` is the string shown in the UI.

### 2. Add fields in display order

Chain `.field()` calls to add fields. The order of calls determines the order fields appear on screen:

```java
configBuilder
    .tab("summaryTab", "Summary")
    .field(CaseData::getApplicantName)
    .field(CaseData::getApplicationType)
    .field(CaseData::getDateSubmitted);
```

Each `.field()` call accepts a method reference to a getter on your case data class. The SDK resolves the CCD field ID from the Java field name.

### 3. Control role-based visibility via field access

Tabs themselves have no role restriction. Visibility is governed by the `access` classes on each field. A role that lacks `READ` permission on a field will not see that field in the tab.

Annotate your case data fields:

```java
@CCD(access = {DefaultAccess.class})
private String applicantName;

@CCD(access = {CaseworkerAccess.class})
private String internalCaseNote;
```

`DefaultAccess` grants `READ` to all roles including `CITIZEN`. `CaseworkerAccess` restricts to caseworker roles only. Access classes implement `HasAccessControl.getGrants()` returning a `SetMultimap<HasRole, Permission>`.

A citizen visiting the case will see fields with `DefaultAccess` but not fields with `CaseworkerAccess`.

### 4. Add a show condition on a field (optional)

To show a field only when another field has a particular value, pass a `showCondition` string:

```java
configBuilder
    .tab("summaryTab", "Summary")
    .field(CaseData::getSolicitorReference, "applicationType=\"jointApplication\"");
```

The second argument is the CCD show condition expression. The field remains in the definition but is hidden in the UI when the condition is false.

### 5. Assign a tab order (optional)

If you define multiple tabs, their display order in the UI follows the order you call `.tab()` in your `configure()` method. Define high-priority tabs first:

```java
configBuilder.tab("summaryTab", "Summary")
    .field(CaseData::getApplicantName);

configBuilder.tab("notesTab", "Notes")
    .field(CaseData::getNotes);
```

### 6. Regenerate the JSON definition

Run the SDK generator to emit updated definition JSON:

```bash
./gradlew generateCCDConfig
```

The output goes to `build/definitions/` (exact path set by your project's `ccd {}` Gradle block). Import the updated definition into CCD definition store.

## Caseworker vs citizen visibility

| Role type | Sees field if... |
|---|---|
| Caseworker | Role has `R` (READ) in the field's access class |
| Citizen | Role has `R` in the field's access class and the tab's show condition (if any) is true |
| Any role | Field exists in the tab definition AND the role has at least READ on that field |

The `CITIZEN` role in the e2e test project (`UserRole.java`) maps to the IDAM role `citizen`. Fields annotated with `DefaultAccess` are visible to citizens because `DefaultAccess` grants `READ` to all roles including `CITIZEN` (`DefaultAccess.java:22-30`).

Fields annotated with access classes that only grant to caseworker roles (e.g. `CaseworkerAccess`) are invisible to citizens in the tab even though the tab itself is shared.

## Verify

1. After importing the definition, open a case in the CCD case viewer and confirm the new tab label appears in the tab bar.
2. Log in as a citizen user and confirm citizen-restricted fields are absent while caseworker-only fields are absent.
3. Inspect the generated JSON at `build/definitions/CaseTypeTab.json` and confirm your `tabId`, field IDs, and display order are present.

## See also

- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions for tab, field access, show condition
