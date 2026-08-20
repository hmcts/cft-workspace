---
topic: case-flags
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Flags.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagDetail.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagLauncher.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagVisibility.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/FieldTypeDefinition.java
  - ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/FieldTypeUtils.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseData.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/model/PartyFlags.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/caseworker/event/CaseworkerCreateCaseFlag.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/caseworker/event/CaseworkerManageCaseFlag.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/caseworker/service/CaseFlagsService.java
  - prl-cos-api:src/main/java/uk/gov/hmcts/reform/prl/models/dto/ccd/CaseData.java
  - prl-cos-api:src/main/java/uk/gov/hmcts/reform/prl/models/caseflags/AllPartyFlags.java
  - prl-cos-api:src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java
  - prl-cos-api:src/main/java/uk/gov/hmcts/reform/prl/services/caseflags/CaseFlagsWaService.java
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/write-case-flag-field.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/read-case-flag-field.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/enums/case-flag-display-context-parameter.enum.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/enums/case-flag-status.enum.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/enums/write-case-flag-field.enum.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/utils/case-flag-priority.utils.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-viewer/case-full-access-view/case-full-access-view.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/services/fields/fields.utils.ts
  - rd-commondata-api:src/main/java/uk/gov/hmcts/reform/cdapi/controllers/CaseFlagApiController.java
  - rd-commondata-api:src/main/java/uk/gov/hmcts/reform/cdapi/domain/FlagDetail.java
examples_extracted_from:
  - apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/caseworker/event/CaseworkerCreateCaseFlag.java
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/caseworker/service/CaseFlagsService.java
status: confluence-augmented
last_reviewed: "2026-08-20T00:00:00Z"
confluence_checked_at: "2026-08-20T00:00:00Z"
confluence:
  - id: "1572570790"
    title: "How To Guide - Case Flags"
    space: "RCCD"
  - id: "1702505636"
    title: "How To Guide - Case Flags v2.1"
    space: "RCCD"
  - id: "1700663346"
    title: "Case Flags HLD Version 2.1"
    space: "CF"
  - id: "1540427904"
    title: "Expert UI - Low Level Design - Case Flags Field"
    space: "EUI"
  - id: "1712753029"
    title: "Case Flags V2.1 LLD"
    space: "CRef"
  - id: "1933993678"
    title: "Case Flags"
    space: "RRFM"
    version: 3
    last_modified: "2026-06-16"
  - id: "1985056548"
    title: "Configuring Case Flags Functionality into PCS"
    space: "RRFM"
    version: 5
    last_modified: "2026-06-17"
title: Implement Case Flags
diataxis: how-to
product: ccd
sources_sha:
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Flags.java": "f87e5cbc49e4bd8c9448a8d5752e805c69d16ecf"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagDetail.java": "f87e5cbc49e4bd8c9448a8d5752e805c69d16ecf"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagLauncher.java": "f87e5cbc49e4bd8c9448a8d5752e805c69d16ecf"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagVisibility.java": "f87e5cbc49e4bd8c9448a8d5752e805c69d16ecf"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/FieldTypeDefinition.java": "5daf60c31eeb61da276722c2639fa50d279a26a8"
  "ccd-definition-store-api:repository/src/main/java/uk/gov/hmcts/ccd/definition/store/repository/FieldTypeUtils.java": "a3eb4d238899d2957cc65251aad0a455c981dc93"
  "nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseData.java": "7ecd3406d5fee931756c2bcfd72921c58085966e"
  "nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/model/PartyFlags.java": "acdc7d611fe8457205536e12e8fae907fa04282d"
  "nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/caseworker/event/CaseworkerCreateCaseFlag.java": "1c9413a213871f149b50f20eabed0669c370f758"
  "nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/caseworker/event/CaseworkerManageCaseFlag.java": "1c9413a213871f149b50f20eabed0669c370f758"
  "nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/caseworker/service/CaseFlagsService.java": "ac082843f9435e0fdd0d81a64b2317aad7d37e68"
  "prl-cos-api:src/main/java/uk/gov/hmcts/reform/prl/models/dto/ccd/CaseData.java": "544975f6b47e5ba67d6b7e85b961bee60c6e9dc3"
  "prl-cos-api:src/main/java/uk/gov/hmcts/reform/prl/models/caseflags/AllPartyFlags.java": "9f7737ceceb64587f7c2a5bd9b0616092cfe4ba2"
  "prl-cos-api:src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java": "6b347077cfc5d995740d6272751fbbd8f97c98b4"
  "prl-cos-api:src/main/java/uk/gov/hmcts/reform/prl/services/caseflags/CaseFlagsWaService.java": "6b347077cfc5d995740d6272751fbbd8f97c98b4"
  ? "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/write-case-flag-field.component.ts"
  : "1310bc10d9d1b5f6fc9c539dde0eb65a3d9b882c"
  ? "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/read-case-flag-field.component.ts"
  : "b7aba336806a0c4f577c90503070539d052bfefd"
  ? "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/enums/case-flag-display-context-parameter.enum.ts"
  : "6a082439702a917c186720a837526f8c968c29d0"
  ? "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/enums/case-flag-status.enum.ts"
  : "6a082439702a917c186720a837526f8c968c29d0"
  ? "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/enums/write-case-flag-field.enum.ts"
  : "6a082439702a917c186720a837526f8c968c29d0"
  ? "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-flag/utils/case-flag-priority.utils.ts"
  : "b7aba336806a0c4f577c90503070539d052bfefd"
  ? "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/case-viewer/case-full-access-view/case-full-access-view.component.ts"
  : "0e06e04fea8507450dc5345137d4340d0f460fa9"
  "ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/services/fields/fields.utils.ts": "f5ef7f0613973c080398c2af7eca7c297287d907"
  "rd-commondata-api:src/main/java/uk/gov/hmcts/reform/cdapi/controllers/CaseFlagApiController.java": "713a8d70241032382965f812dcb7bb71e6b3a816"
  "rd-commondata-api:src/main/java/uk/gov/hmcts/reform/cdapi/domain/FlagDetail.java": "0e7c98cc68c8b56a7814c04552449e23061c3395"
---

# Implement Case Flags

## TL;DR

- Case Flags are CCD's built-in mechanism for attaching named flags (reasonable adjustments, language needs, vulnerability markers, etc.) to a case or to individual parties.
- Three CCD base types are involved: `Flags` (the per-party / per-case container), `FlagDetail` (the individual flag — `name`, `flagCode`, `status`, `path`, `flagComment`, ...), and `FlagLauncher` — an empty marker type that tells XUI to render the multi-step Case Flags web component.
- Configure **at least one `FlagLauncher` field per tab/event**, with `DisplayContextParameter` set to `#ARGUMENT(CREATE)`, `#ARGUMENT(UPDATE)`, or `#ARGUMENT(READ)`. The `Flags` data fields themselves must be hidden with `RetainHiddenValue=Yes`.
- Flag statuses follow a four-state lifecycle: `Requested` -> `Active` / `Not approved`, and `Active` -> `Inactive`. CCD does **not** enforce these strings — services do.
- Two naming/shape rules are hard requirements of the XUI component, not conventions: the case-level container must be the CaseField ID **`caseFlags`** exactly, and every party-level `Flags` field must already hold a **non-empty value** (set by a callback) before the wizard can see it. Get either wrong and the flag data silently does not appear.
- Flag metadata (name, code, hierarchical path, hearing-relevance, default status) is mastered in HMCTS Reference Data (RD-Common) and keyed by `HMCTSServiceId` supplementary data on the case.
- Adopt a service-specific layer (a "review flags" event with `aboutToStart`/`aboutToSubmit`/`submitted` callbacks) on top of the standard model when you need WA tasks, mandatory-decision validation, or cross-flag rules.

## Prerequisites

- `ccd-config-generator` SDK on the classpath (provides `uk.gov.hmcts.ccd.sdk.type.Flags`, `FlagDetail`, `FlagLauncher`, and `FlagVisibility`).
- A `CCDConfig<T,S,R>` implementation and a case-data class `T`.
- `HMCTSServiceId` supplementary data set on every case at creation (needed by the Reference Data lookup that powers the Create-Flag wizard). See [Supplementary data](../explanation/supplementary-data.md).
- Service-specific flags negotiated with the Reference Data team and ingested into the `FlagDetails` / `FlagService` RD tables.
- If integrating with Work Allocation: `wa-task-management-api` reachable and `task-management.api.url` configured.

## How the pieces fit together

A working Case Flags screen needs three CCD field types wired up together:

| Field type | Holds | Where |
|---|---|---|
| `Flags` | A party (or case) flag container — `partyName`, `roleOnCase`, `details` collection, optional `groupId` (UUID) and `visibility` (`Internal`/`External`) | One field per party, plus a top-level `caseFlags` for case-level flags |
| `FlagDetail` | Individual flag — see [FlagDetail field reference](#flagdetail-field-reference) below | Inside `Flags.details` (`List<ListValue<FlagDetail>>`) |
| `FlagLauncher` | **Empty marker** — its CaseField has no value; its presence on a tab/event tells XUI to mount the Case Flags component | One per tab/event that needs to surface flags. Each instance must have a unique ID |

XUI traverses sibling case-fields of the `FlagLauncher` to find all `Flags` instances on the same tab/event, then aggregates their `details` lists. The `Flags` fields themselves are hidden from the form — only the `FlagLauncher` (and its launched component) is visible.

The traversal is `FieldsUtils.extractFlagsDataFromCaseField` in `ccd-case-ui-toolkit`
(`fields.utils.ts:451-521`), called once per case-field of the event trigger
(`write-case-flag-field.component.ts:136-139`) or per field of the tab
(`read-case-flag-field.component.ts:59-60`). It recurses into:

- root-level `Flags` fields;
- `Flags` sub-fields nested inside another `Complex` field;
- collections **of** `Flags`;
- collections of `Complex` types that contain a `Flags` sub-field.

Each hit is recorded with a dot-delimited `pathToFlagsFormGroup` (collection items use their
index, e.g. `witnesses.0.value.partyFlags`) which is how the component later writes the new
flag back into the right part of the case-field value.

**A `Flags` field with no value is skipped.** A root-level `Flags` field is only collected if
its value is a non-empty object (`fields.utils.ts:463`); a nested one is only collected if the
parent complex value carries a non-empty object for it (`:466`). The single exception is the
CaseField whose ID is literally `caseFlags`, which is collected even when empty because
case-level flags need no `partyName` (`fields.utils.ts:21`, `:464`). This is the source-level
reason party flags must be initialised by a callback before the wizard runs — see
[Step 3](#step-3---initialise-partyname-roleoncase-groupid-and-visibility).

### FlagDetail field reference

All fields on the `FlagDetail` CCD base type (`FlagDetail.java`):

| Field | Type | Source | Notes |
|---|---|---|---|
| `name` | `String` | RD | English flag name |
| `name_cy` | `String` | RD | Welsh translation (v2+) |
| `subTypeValue` | `String` | RD | List-of-values selection, e.g. "British Sign Language (BSL)" |
| `subTypeValue_cy` | `String` | RD | Welsh translation (v2+) |
| `subTypeKey` | `String` | RD | Key for the LoV entry, e.g. "britishSignLanguage" |
| `otherDescription` | `String` | User | Free-text when "Other" flag selected |
| `otherDescription_cy` | `String` | User | Welsh (v2+) |
| `flagComment` | `String` | User | Clarification when raising |
| `flagComment_cy` | `String` | User | Welsh (v2+) |
| `flagUpdateComment` | `String` | User | Mandatory for `Not approved` and external deactivation (v2+) |
| `dateTimeModified` | `LocalDateTime` | System | Pattern `yyyy-MM-dd'T'HH:mm:ss.SSS'Z'` |
| `dateTimeCreated` | `LocalDateTime` | System | Set on flag creation |
| `path` | `List<ListValue<String>>` | RD | Hierarchical, e.g. `["Party","Reasonable adjustment"]`. RD returns `String[]`; CCD wraps in `ListValue` |
| `hearingRelevant` | `YesOrNo` | RD | Affects hearing scheduling (HMC) |
| `flagCode` | `String` | RD | `CFnnnn` (case), `PFnnnn` (party), `RAnnnn` (RA), `OT0001` (Other) |
| `status` | `String` | Service/XUI | `Requested`/`Active`/`Inactive`/`Not approved` (not enforced by CCD) |
| `availableExternally` | `YesOrNo` | RD | Visible to external users (v2+) |

<!-- source: libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagDetail.java -->

Two things about that table are worth knowing before you design around it. First, the fields
marked "RD" are populated by XUI from the Reference Data flag type, and the RD names differ from
the CCD names — `FlagDetail.hearingRelevant` and `availableExternally` are written from RD's
`hearingRelevant` and `externallyAvailable` booleans, mapped to the strings `"Yes"`/`"No"`
(`write-case-flag-field.component.ts:642`, `:651`), and `path` is built by wrapping RD's
`List<String>` into `{id: null, value}` entries (`:640-641`,
`rd-commondata-api` `FlagDetail.java:39`). Second, the Welsh pairs are mutually exclusive at
creation: XUI writes `flagComment` **or** `flagComment_cy` — never both — depending on the UI
language at the time the flag was raised (`:632-637`), and the same applies to
`otherDescription`/`otherDescription_cy` (`:624-631`). Do not treat the English field as always
populated.

## Step 1 - Add `Flags` fields for case-level and party-level flags

Add a `Flags caseFlags` field for case-level flags on your case-data class. Add one `Flags` field per party — either directly on the case-data class or grouped in a holder class.

**The case-level field must be called `caseFlags`.** The ID is hard-coded in two places in the
XUI toolkit: `FieldsUtils.caseLevelCaseFlagsFieldId` (`fields.utils.ts:21`), which is what lets
an empty case-level container still reach the wizard, and
`ReadCaseFlagFieldComponent.caseLevelCaseFlagsFieldId` (`read-case-flag-field.component.ts:27`),
which splits the tab's flags into the case-level table (`:98-99`) and the party-level tables
(`:64-65`) purely by comparing against that string. A case-level container named anything else
is rendered as a party with a blank name.

NFDiv (`CaseData.java:419-431`) keeps the case-level `Flags` directly on the root class and uses a `@JsonUnwrapped` `PartyFlags` holder for the party-level instances:

```java
@CCD(label = "Launch the Flags screen",
     access = {InternalCaseFlagsAccess.class},
     searchable = false)
private FlagLauncher internalFlagLauncher;

@CCD(access = {InternalCaseFlagsAccess.class},
     label = "Case Flags",
     searchable = false)
private Flags caseFlags;

@JsonUnwrapped
@Builder.Default
@CCD(searchable = false)
private PartyFlags partyFlags = new PartyFlags();
```

```java
// PartyFlags.java
public class PartyFlags {
    @CCD(access = {InternalCaseFlagsAccess.class}, label = "Applicant1 Flags")
    private Flags applicant1Flags;
    @CCD(access = {InternalCaseFlagsAccess.class}, label = "Applicant2 Flags")
    private Flags applicant2Flags;
    @CCD(access = {InternalCaseFlagsAccess.class}, label = "Applicant1 Solicitor Flags")
    private Flags applicant1SolicitorFlags;
    @CCD(access = {InternalCaseFlagsAccess.class}, label = "Applicant2 Solicitor Flags")
    private Flags applicant2SolicitorFlags;

    // groupIds are kept on the holder so they survive across events
    private String applicant1GroupId;
    private String applicant2GroupId;
    private String applicant1SolicitorGroupId;
    private String applicant2SolicitorGroupId;
}
```

PRL takes the same approach with a flat `AllPartyFlags` holder containing one `Flags` field per party (`AllPartyFlags.java`). Field names inside such a holder are iterated at runtime via Java reflection (`CaseFlagsWaService.java:273-281`); rename them with care. PRL additionally skips solicitor flag fields for unrepresented parties, keyed off the field name — see [Reasonable adjustments](implement-reasonable-adjustments.md#8-align-allpartyflags-field-names).

The `Flags`, `FlagDetail`, and `FlagLauncher` types are pre-built CCD complex types — annotated `@ComplexType(name="Flags", generate=false)` etc. (`Flags.java`, `FlagDetail.java`, `FlagLauncher.java`). You do **not** need to define them in your spreadsheet; the definitions are built into CCD as base types (`FieldTypeDefinition.java:38`, `FieldTypeUtils.java:48`).

## Step 2 - Add a `FlagLauncher` field per tab/event

`FlagLauncher` is an empty CCD type (`FlagLauncher.java` — the class body is empty). Its presence tells XUI to mount the multi-step Case Flags component. **Each tab or event that needs to render flags requires its own `FlagLauncher` instance with a unique field ID** — you cannot reuse one across multiple tabs. The `FlagLauncher` field is already shown in the Step 1 example (`internalFlagLauncher`).

How the launcher is resolved differs between events and tabs, and the difference matters:

- **On an event**, `WriteCaseFlagFieldComponent` takes the **first** field of type `FlagLauncher`
  it finds and reads that one's `display_context_parameter`
  (`write-case-flag-field.component.ts:684-685` — a plain `.find()`). Put two `FlagLauncher`
  fields on the same event and the second is ignored, so the journey silently runs in the first
  one's mode.
- **On a tab**, `ReadCaseFlagFieldComponent` locates the tab by matching the `FlagLauncher`
  field's **ID** against its own case-field ID, explicitly because more than one instance may
  exist (`read-case-flag-field.component.ts:53-58`). This is what makes per-tab launchers work —
  and what makes reusing one ID across tabs unsupported.

If you also have an external (legal-rep facing) journey, define a second `flagLauncherExternal` field — Case Flags v2.1 expects a separate `FlagLauncher` for the external Request/Manage Support events.

## Step 3 - Initialise `partyName`, `roleOnCase`, `groupId`, and `visibility`

The `Flags` container has metadata that XUI reads:

| Field | Type | Set when | Source |
|---|---|---|---|
| `partyName` | `String` | Case creation / party-edit `aboutToSubmit` | service callback |
| `roleOnCase` | `String` | Case creation / party-edit `aboutToSubmit` | service callback |
| `groupId` | `UUID` | First flag-init for the party | service callback (UUID v4) |
| `visibility` | `FlagVisibility` (`INTERNAL`/`EXTERNAL`) | First flag-init for the party | service callback |
| `details` | `List<ListValue<FlagDetail>>` | Populated by the Create Flag event | XUI |

`groupId` ties together a party's *internal* and *external* `Flags` instances so XUI deduplicates the party — the same UUID must be set on both the internal and external `Flags` for the same party. `visibility` is `Internal` or `External`. If `visibility` is missing, XUI assumes `Internal`.

That last rule is not a fallback so much as the actual test: every check in the toolkit is
`visibility?.toLowerCase() === 'external'` (`write-case-flag-field.component.ts:443`, `:463`),
so the comparison is case-insensitive and *anything* that is not `External` — including `null`,
`undefined`, or a typo — counts as internal. A misspelled `Externl` therefore produces an
internal collection with no error.

Note also that `partyName` is what XUI displays as the party heading on the tab
(`read-case-flag-field.component.ts:176`); a `Flags` instance initialised with a null
`partyName`, as the case-level container is, renders without one.

<!-- DIVERGENCE: Confluence 1933993678 (v3) step 3.2 lists the sub-fields to populate as `partyName`, `roleOnCase`, `GUID` and `Visibility`. There are no such fields: the Flags complex type declares exactly partyName, roleOnCase, details, visibility and groupId, all lower-camel-case, each pinned by an explicit @JsonProperty (Flags.java:18-31). `GUID` is the concept (a UUID v4), not the field name — the field is `groupId` and it is typed `UUID`. Setting a `GUID` key in a callback response would simply be dropped. Source wins. -->

NFDiv initialises these in a `CaseFlagsService` invoked on case creation and on `Create flags` `aboutToStart` (`CaseFlagsService.java:50-120`):

```java
caseData.setCaseFlags(Flags.builder()
    .partyName(null)
    .roleOnCase(null)
    .visibility(FlagVisibility.INTERNAL)
    .build());

// One UUID per party, kept on PartyFlags so it survives events
if (caseData.getPartyFlags().getApplicant1GroupId() == null) {
    caseData.getPartyFlags().setApplicant1GroupId(UUID.randomUUID().toString());
}

caseData.getPartyFlags().setApplicant1Flags(Flags.builder()
    .partyName(caseData.getApplicant1().getFullName())
    .roleOnCase("APPLICANT_1")
    .groupId(UUID.fromString(caseData.getPartyFlags().getApplicant1GroupId()))
    .visibility(FlagVisibility.INTERNAL)
    .build());
```

<!-- source: apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/caseworker/service/CaseFlagsService.java:50-120 -->

## Step 4 - Wire the events: Create Flag and Manage Flag

The standard XUI flow needs **two events** plus a **read-only tab**, all driven by the same `FlagLauncher` field but with different `DisplayContextParameter` arguments. The `Flags` data fields are added to each event/tab and **hidden** with `RetainHiddenValue=Yes`.

| `#ARGUMENT(...)` | Mode | Audience |
|---|---|---|
| `#ARGUMENT(CREATE)` | Create flag (v1) | Internal staff |
| `#ARGUMENT(UPDATE)` | Manage flag (v1) | Internal staff |
| `#ARGUMENT(READ)` | Read-only tab (v1) | Internal staff |
| `#ARGUMENT(CREATE,VERSION2.1)` | Create flag, v2.1 grouping | Internal staff |
| `#ARGUMENT(UPDATE,VERSION2.1)` | Manage flag, v2.1 grouping | Internal staff |
| `#ARGUMENT(CREATE,EXTERNAL)` | Request support (raise external flag) | External (legal rep) |
| `#ARGUMENT(UPDATE,EXTERNAL)` | Manage support (deactivate external flag) | External (legal rep) |
| `#ARGUMENT(READ,EXTERNAL)` | External read tab | External (legal rep) |

The argument value is a literal string — CCD does not validate it; XUI inspects it at component-launch time. Seven of the eight values are declared in the toolkit as
`CaseFlagDisplayContextParameter` (`case-flag-display-context-parameter.enum.ts:5-13`), matched by
exact string equality against the launcher's `display_context_parameter`. Two consequences:

- `#ARGUMENT(READ)` is **not** in that enum. The internal read tab works because it is the
  default — the read component only tests for `#ARGUMENT(READ,EXTERNAL)` to decide it is showing
  the external view (`read-case-flag-field.component.ts:46`), and everything else falls through to
  the internal merged view. Keep setting `#ARGUMENT(READ)` for clarity, but understand that a
  typo in it degrades to the internal view rather than to nothing.
- There is no `CREATE,VERSION2.1,EXTERNAL` combination. The enum's own header comment states that
  external create/update *are* v2.1 by definition, so `#ARGUMENT(CREATE,EXTERNAL)` already
  implies the v2.1 flow (`case-flag-display-context-parameter.enum.ts:1-4`).

Because matching is exact-string, a mistyped parameter (`#ARG(CREATE)`,
`#ARGUMENT(CREATE, VERSION2.1)` with a space) does not raise an error anywhere — CCD stores it
verbatim and XUI simply fails to recognise it.

### config-generator (SDK) form

NFDiv's `CaseworkerCreateCaseFlag` (`CaseworkerCreateCaseFlag.java:36-60`):

```java
new PageBuilder(configBuilder
    .event("createFlags")
    .forStates(POST_SUBMISSION_STATES)
    .showCondition("caseFlagsSetupComplete=\"Yes\"")
    .aboutToStartCallback(this::aboutToStart)
    .name("Create flags")
    .submittedCallback(this::submitted)
    .grant(CREATE_READ_UPDATE_DELETE, SUPER_USER, CASE_WORKER, LEGAL_ADVISOR, JUDGE))
    .page("caseworkerCreateFlags")
    .pageLabel("Create flags")
    // The Flags fields must be present-but-hidden:
    .optional(CaseData::getCaseFlags, ALWAYS_HIDE, true, true)
    .complex(CaseData::getPartyFlags)
        .optional(PartyFlags::getApplicant1Flags, ALWAYS_HIDE, true, true)
        .optional(PartyFlags::getApplicant2Flags, ALWAYS_HIDE, true, true)
        .optional(PartyFlags::getApplicant1SolicitorFlags, ALWAYS_HIDE, true, true)
        .optional(PartyFlags::getApplicant2SolicitorFlags, ALWAYS_HIDE, true, true)
    .done()
    // The FlagLauncher carries the #ARGUMENT directive — this is what mounts the XUI component:
    .optional(CaseData::getInternalFlagLauncher,
        null, null, null, null, "#ARGUMENT(CREATE,VERSION2.1)");
```

The `ALWAYS_HIDE` constant is a CCD show-condition that hides a field unconditionally:

```java
private static final String ALWAYS_HIDE = "internalFlagLauncher = \"ALWAYS_HIDE\"";
```

The `Manage Flags` event is identical but uses `#ARGUMENT(UPDATE,VERSION2.1)` (`CaseworkerManageCaseFlag.java`).

The `Case Flags` tab uses `#ARGUMENT(READ)`:

```java
configBuilder.tab("caseFlags", "Case Flags")
    .field(CaseData::getInternalFlagLauncher, null, "#ARGUMENT(READ)")
    .field(CaseData::getCaseFlags, "internalFlagLauncher = \"ALWAYS_HIDE\"")
    .field("applicant1Flags", "internalFlagLauncher = \"ALWAYS_HIDE\"")
    .field("applicant2Flags", "internalFlagLauncher = \"ALWAYS_HIDE\"")
    .field("applicant1SolicitorFlags", "internalFlagLauncher = \"ALWAYS_HIDE\"")
    .field("applicant2SolicitorFlags", "internalFlagLauncher = \"ALWAYS_HIDE\"");
```

<!-- source: apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/divorcecase/tab/CaseTypeTab.java:667-674 -->

### Spreadsheet form

If you author CCD definitions as spreadsheets directly, the equivalent rows are:

`CaseField` tab: a `flagLauncherInternal` row of type `FlagLauncher`.

`CaseEventToFields` for the `createFlags` event:

| CaseFieldID | FieldShowCondition | DisplayContextParameter | RetainHiddenValue |
| --- | --- | --- | --- |
| caseFlags | `<hide>` |  | Yes |
| applicant1Flags | `<hide>` |  | Yes |
| flagLauncherInternal |  | `#ARGUMENT(CREATE)` |  |

The `manageFlags` rows are identical except for `#ARGUMENT(UPDATE)` and `DisplayContext=OPTIONAL`. The `caseFlags` tab uses `#ARGUMENT(READ)`.

### Hidden-flag fields, `RetainHiddenValue`, and Collections

The `Flags` fields **must** be present on the event and on the tab (so XUI can read them) but hidden via a `FieldShowCondition`. Set `RetainHiddenValue=Yes` on every hidden flag field; without it, the data will not survive an event submission.

If a `Flags` field is a sub-field of a complex type (e.g. a `Witness` complex with a `partyFlags` sub-field), `RetainHiddenValue=Yes` must be set on the **sub-field** in `ComplexTypes` (or `EventToComplexTypes`), not just on the parent.

If you wrap `Flags` in a Collection, set the collection's `DisplayContext=OPTIONAL` on the `CaseEventToFields` row. Additionally, add `CaseEventToComplexTypes` rows for each flag event so the collection items' data survives submission:

| ID (ComplexTypeID) | CaseEventID | ListElementCode | DisplayContext |
|---|---|---|---|
| `DQPartyFlagStructure` | `CREATE_CASE_FLAGS` | `flagsExternal` | `OPTIONAL` |
| `DQPartyFlagStructure` | `MANAGE_CASE_FLAGS` | `flagsExternal` | `OPTIONAL` |
| `DQPartyFlagStructure` | `REQUEST_SUPPORT` | `flagsExternal` | `OPTIONAL` |
| `DQPartyFlagStructure` | `MANAGE_SUPPORT` | `flagsExternal` | `OPTIONAL` |

Without these rows, flags inside collections (experts, witnesses, LR individuals) are silently dropped on event submit.

<!-- CONFLUENCE-ONLY: CaseEventToComplexTypes configuration requirement comes from Civil's Case Flags V2.1 LLD (1712753029). Not validated against ccd-data-store-api event submission logic. -->

### Save logic: internal vs external flag placement (v2.1)

When a staff user raises a flag, XUI may move it out of the collection the user picked and into
the party's other collection. `determineLocationForFlag()` implements this
(`write-case-flag-field.component.ts:436-481`):

1. **It only ever redirects when the selected `Flags` instance has a `groupId`** (`:438`). With no
   `groupId` there is nothing to pair the collection with, so the flag stays exactly where the
   user put it — regardless of the flag's external availability. This is the single most
   important precondition of the whole v2.1 arrangement.
2. Given a `groupId`, the flag goes to the **external** instance if the flag type's RD attribute
   `externallyAvailable` is true; otherwise to the **internal** instance (`:440`). Both branches
   locate the counterpart by filtering all discovered `Flags` for the same `groupId` and the
   matching visibility (`:445-447`, `:465-467`).
3. The "Other" flag (`flagCode` `OT0001`, `:45`) inverts the default: it is treated as
   **externally visible unless** the staff user ticks "only visible to HMCTS staff"
   (`flagIsVisibleInternallyOnly`, `:439`).
4. External users are never redirected — they can only reach the external instance in the first
   place (`:417-418`).

If the counterpart collection does not exist, the journey **blocks** rather than falling back:
the component pushes `"External collection for storing this case flag has not been configured for
this case type"` (or the `Internal` equivalent) and sets a form error so the user cannot reach the
summary page (`:450-458`, `:470-478`;
`write-case-flag-field.enum.ts:13-14`, `write-case-flag-field.component.ts:658-660`). A party
configured with a `groupId` but only one of the two `Flags` instances is therefore worse than one
configured with no `groupId` at all — the latter still works.

### The external (legal-rep) journey, end to end

v2.1 is an *upgrade* on a working v1 internal configuration, not an alternative to it: you should
already have internal `Flags` fields, an internal `FlagLauncher`, and internal Create/Manage Flag
events before starting. What v2.1 adds, per the checklist in Confluence 1933993678 (v3):

1. **A second `Flags` field per party**, so each party has an internal and an external instance —
   e.g. `claimantInternalFlags` / `claimantExternalFlags`. Both need `RetainHiddenValue=Yes`. Both
   must carry the same `groupId`, with `visibility` `Internal` on one and `External` on the other.
2. **A second `FlagLauncher`**, `flagLauncherExternal`, with its own unique field ID.
3. **Two external events** — conventionally `requestSupport` (raise) and `manageSupport`
   (deactivate/update). Each carries the external `Flags` fields hidden, plus
   `flagLauncherExternal` with `#ARGUMENT(CREATE,EXTERNAL)` and `#ARGUMENT(UPDATE,EXTERNAL)`
   respectively. A `submitted` callback for a custom confirmation page is optional.
4. **A `Support` tab** holding the external `Flags` fields and `flagLauncherExternal` with
   `#ARGUMENT(READ,EXTERNAL)`. This is the legal rep's view of their own requests. Do not reuse the
   internal `Case Flags` tab for it — see the banner-suppression rule under
   [The active-flags banner](#the-active-flags-banner).
5. **Access control**: an access profile for the external role (e.g. `caseworker_legal_rep`) mapped
   in `RoleToAccessProfiles`, then `CRU` on the external `Flags` fields and the external
   `FlagLauncher` in `AuthorisationCaseField`, `CRU` on `requestSupport` and `manageSupport` in
   `AuthorisationCaseEvent`, and `AuthorisationComplexType` rows where the `Flags` fields sit inside
   a complex type. Grant per party, not wholesale — see the `[CREATOR]` warning in
   [Gotchas](#gotchas).
6. **Optionally a WA task** on flag creation — update the DMN with a task such as
   "Review Flag Request".

Only then flip the internal events to `#ARGUMENT(CREATE,VERSION2.1)` /
`#ARGUMENT(UPDATE,VERSION2.1)`, which is what makes the internal journey aware of the external
collections.

<!-- CONFLUENCE-ONLY: the event/field/tab naming conventions above (requestSupport, manageSupport, Support, flagLauncherExternal, claimant*Flags) and the ordering of the upgrade steps are Confluence 1933993678's recommendations for Civil Possessions, generalised here. Nothing in CCD or the XUI toolkit requires these names — the toolkit locates everything by field *type* and by #ARGUMENT, never by ID, the sole exception being `caseFlags` (fields.utils.ts:21). Pick names that fit your case type. -->

## Step 5 - Define the four-state status lifecycle

`FlagDetail.status` is a plain `String` (`FlagDetail.java:69`). CCD does not enforce its values; the service and XUI agree on a vocabulary. The XUI half of that agreement is the
`CaseFlagStatus` enum — exactly these four strings, with that capitalisation
(`case-flag-status.enum.ts:1-6`):

| Status | Meaning | Set by |
|---|---|---|
| `Requested` | Awaiting decision (default for flags raised by external users / requiring review) | XUI on creation; default comes from `FlagService.DefaultStatus` in RD (`defaultStatus` in the API response) |
| `Active` | Approved and currently applicable | Service or XUI |
| `Inactive` | Deactivated (no longer applicable). Mandatory `flagUpdateComment` to move from `Active`. | XUI / service |
| `Not approved` | Reviewer declined the request. Mandatory `flagUpdateComment`. | Internal staff via Manage Flag |

### What status a new flag actually gets

The status of a *newly created* flag is decided entirely by XUI, and which of three rules applies
depends on the launcher's `#ARGUMENT` (`write-case-flag-field.component.ts:646-650`):

| Journey | Status written |
|---|---|
| External create (`#ARGUMENT(CREATE,EXTERNAL)`) | the flag type's RD `defaultStatus` |
| Internal create, **v1** (`#ARGUMENT(CREATE)`) | hard-coded `Active` |
| Internal create, **v2.1** (`#ARGUMENT(CREATE,VERSION2.1)`) | the status the user selected on the status step |

The middle row is easy to miss and matters if you are planning a review workflow: under plain
`#ARGUMENT(CREATE)` there is no status step at all, the RD `defaultStatus` is ignored, and every
staff-raised flag arrives `Active`. A `Requested`-then-review flow for internal users requires the
v2.1 parameter.

State transitions allowed by the standard XUI component:

- `Requested` -> `Active` or `Not approved`
- `Active` -> `Inactive`
- `Inactive` is terminal for the dropdown (greyed out)
- An external user can only move `Active` -> `Inactive` and must supply a `flagUpdateComment`.

<!-- DIVERGENCE: Earlier draft TL;DR claimed `"Requested"` was the only magic string, and a later draft credited the four-value vocabulary to the HLD alone. Both are superseded now that ccd-case-ui-toolkit is in the workspace: the vocabulary is source, at case-flag-status.enum.ts:1-6, and it is exactly Requested / Active / Inactive / Not approved. What remains true is that no *CCD* component polices it — FlagDetail.java:69 types status as a plain String — so the strings are a contract between your callbacks and the XUI enum, and drift on either side fails silently. Source wins throughout. -->

The status history is held in the audit trail of each `FlagDetail` `ListValue` (each item has a stable `id`), and `FlagDetail.dateTimeModified` is updated whenever the flag changes (`FlagDetail.java:51-57`).

## Step 6 - Add a service-specific review layer (optional)

The CCD/XUI "Manage Flag" event handles status transitions in-component. Many services need additional behaviour — Work-Allocation tasks created on `Requested`, mandatory decision-comment validation, deep-copy mutations to keep the audit trail consistent — and add a dedicated `reviewFlags` event in front of (or alongside) the standard `manageFlags` event.

PRL implements this with a `REVIEW_FLAGS` event and three callbacks:

- **`aboutToStart`**: scan all `Flags` fields for items with `status == "Requested"`, populate a wrapper so the caseworker sees only open items (`CaseFlagsWaService.java:120-171`).
- **`aboutToSubmit`**: validate the most-recently-modified flag is no longer `"Requested"`, update it in place, return errors if validation fails (`CaseFlagsController.java:125-152`).
- **`submitted`**: if no flags remain `"Requested"`, fire a WA task-close event (`CaseFlagsWaService.java:57-84`).

To trigger a WA review task when a new flag is raised, publish an internal Spring event from a `setup-wa-task` callback. Gate on `isCaseFlagsTaskCreated == YES` (`CaseFlagsWaService.java:70`).

## Step 7 - Wire up the controller endpoint

Map your callbacks to URL paths matching the CCD event definition. PRL uses `/caseflags/about-to-start`, `/caseflags/about-to-submit`, and `/caseflags/submitted` (`CaseFlagsController.java:109,125,154`).

Secure each endpoint with both JWT (`Authorization`) and S2S token checks following the `AbstractCallbackController` pattern.

In your `CCDConfig.configure()`, point the event callbacks at your service's base URL. If using the SDK's `setCallbackHost`, this happens automatically at generation time. If registering callbacks explicitly in the spreadsheet, set:

| Column | Value |
|---|---|
| `AboutToStartURL` | `https://<service>/caseflags/about-to-start` |
| `AboutToSubmitURL` | `https://<service>/caseflags/about-to-submit` |
| `SubmittedURL` | `https://<service>/caseflags/submitted` |

## Step 8 - Reference Data and `HMCTSServiceId`

The Create-Flag wizard fetches the available flags from RD-Common at runtime, filtered by
`HMCTSServiceId`. The endpoint is:

```
GET /refdata/commondata/caseflags/service-id={service-id}
      ?flag-type=CASE|PARTY
      &welsh-required=Y|N
      &available-external-flag=Y|N
```

All three query parameters are optional and validated (`flag-type` must be `PARTY` or `CASE`; the
other two `Y` or `N`); an empty service ID is rejected with a 400
(`CaseFlagApiController.java:68-102`). Any valid IDaM role can call it, with both `Authorization`
and `ServiceAuthorization` (`:37-46`).

Each returned flag detail carries `name`, `nameCy`, `flagCode`, `nativeFlagCode`, `hearingRelevant`,
`defaultStatus`, `externallyAvailable`, `flagComment`, `path`, `listOfValues`, and — for hierarchical
flags — `parent` plus a nested `childFlags` array (`rd-commondata-api` `FlagDetail.java:23-46`).
XUI uses `parent` to keep the user on the flag-type step until a leaf is chosen
(`write-case-flag-field.component.ts:276`), and `listOfValues` is what turns a flag such as
"Language interpreter" into a searchable sub-type list.

<!-- DIVERGENCE: Confluence 1985056548 (v5) gives the URL as /refdata/commondata/caseflags/serviceId=AAA3?flag-type=CASE&welsh-required=Y&available-external-flag=N. The path segment is wrong twice over: the mapping is "/caseflags/service-id={service-id}" (CaseFlagApiController.java:70), so both the segment name and its casing differ, and a request to .../caseflags/serviceId=AAA3 does not match the mapping at all. The three query parameters in that example are correct. Source wins. -->

Two prerequisites:

1. Set `HMCTSServiceId` supplementary data on every case at creation:

   ```json
   { "supplementary_data_request": { "$set": { "HMCTSServiceId": "MYSVC" } } }
   ```

2. Submit any service-specific flags to the RD team for ingestion into the `FlagDetails` and `FlagService` reference-data tables. The RD team provides a CSV template (`FlagService Template.csv`). Each row in `FlagService` has:

   | Column | Type | Description |
   |---|---|---|
   | `ServiceID` | String | Your HMCTS service ID (level 5), or `XXXX` for global RA defaults |
   | `HearingRelevant` | Boolean | Whether the flag impacts hearing scheduling |
   | `RequestReason` | Boolean | Whether a reason is mandatory when raising |
   | `FlagCode` | String | FK to `FlagDetails.flag_code` |
   | `DefaultStatus` | String | `Active` or `Requested` — what status the flag gets on creation |
   | `AvailableExternally` | Boolean | Whether external users can see/raise this flag |

   Defaults: every service inherits all reasonable-adjustment flags from the `XXXX` (global) rows. A service-specific row for the same `FlagCode` overrides the global default. If you do not submit a CSV, your service gets all RAs with `DefaultStatus=Active`, `AvailableExternally=false`.

   Four of those six columns surface directly in the API response, under slightly different
   names: `HearingRelevant` → `hearingRelevant`, `DefaultStatus` → `defaultStatus`,
   `AvailableExternally` → `externallyAvailable`, `FlagCode` → `flagCode`. `RequestReason` is
   returned as the boolean **`flagComment`** (`rd-commondata-api` `FlagDetail.java:25-32`) — worth
   knowing, because `flagComment` is also the name of the free-text field on CCD's `FlagDetail`,
   where it holds the reason itself rather than a flag saying one is required.

   <!-- CONFLUENCE-ONLY: The CSV onboarding process, the `FlagService Template.csv` artefact, and the XXXX-global-defaults inheritance rule come from Case Flags HLD Version 2.1 (1700663346) section 3.2.1.1. The response field names above are verified against rd-commondata-api, but the ingestion side — table layout, override precedence, and what a service gets when it submits nothing — is a Reference Data team process and is not visible in the API source. -->

Existing cases predating `HMCTSServiceId` need a one-off migration. You can set supplementary data post-creation via:

```
POST /cases/{caseId}/supplementary-data
{
  "supplementary_data_updates": {
    "$set": { "HMCTSServiceId": "MYSVC" }
  }
}
```

## What XUI shows for flag history

XUI reads the CCD event audit trail to display flag history. Each time a flag management event completes, CCD appends an audit entry. XUI renders these entries in the case history tab automatically — no additional tab or field configuration is needed.

The `FlagDetail` items themselves retain their individual history because the `Flags.details` collection uses `ListValue` wrappers (each item has a stable `id`). XUI surfaces the before/after diff of each `FlagDetail` per event entry.

## The active-flags banner

A notification banner appears above the case tabs whenever the case has at least one `Active`
flag. `CaseFullAccessViewComponent.hasActiveCaseFlags()` drives it
(`case-full-access-view.component.ts:413-459`):

- It finds the **first** tab containing a `FlagLauncher` field (`:415-417`), counts `Active` flags
  across every non-launcher field on that tab (`:429-433`), and only shows the banner if the count
  is greater than zero (`:435`). Flags on any other tab are not counted.
- The wording is generated from that count: *"There is 1 active flag on this case."* or
  *"There are N active flags on this case."*, under the heading "Important", with a
  "View case flags" link that switches to the flags tab (`:437-451`).
- If any active flag is the PVP flag `PF0021`, the description is prefixed
  `POTENTIALLY VIOLENT PERSON.` (`:436-441`, `case-flag-priority.utils.ts:7-8`).
- **The banner is suppressed by the launcher's `#ARGUMENT`, not by the user's roles.** It is hidden
  whenever the `FlagLauncher` on that tab is set to `#ARGUMENT(READ,EXTERNAL)`
  (`:420-423`, and the `*ngIf="activeCaseFlags && !caseFlagsExternalUser"` in the template). If you
  put the external read parameter on a tab that staff can also see, staff lose the banner.

The same PVP rule reorders the tab itself: parties with an active `PF0021` flag are listed first,
and within every party the active PVP flags come first with the rest sorted by `dateTimeCreated`
descending (`read-case-flag-field.component.ts:95`, `case-flag-priority.utils.ts:40-78`).

For internal users the tab merges each party's internal and external `Flags` into one row per
`groupId`, concatenating both `details` arrays (`read-case-flag-field.component.ts:66-92`);
instances with no `groupId` are appended as-is (`:90`). External users
(`#ARGUMENT(READ,EXTERNAL)`) get no merge — they see only what is on their own tab.

`flagUpdateComment` is shown to internal staff beneath the comment with the prefix
"Decision Reason:", for `Not approved` flags only.

<!-- CONFLUENCE-ONLY: the "Decision Reason:" label and its restriction to Not approved flags come from the HLD (1700663346); the summary-list templates render flagUpdateComment but the label wording was not traced. The JSONPath aggregation the HLD describes (`$..Details[?(@.status == "Active")]`) is not how it is implemented — see the counting logic cited above. -->

## Gotchas

- **`FlagLauncher` is mandatory per tab/event** — without it the user sees an empty event (the `Flags` data is hidden). Each must have a unique field ID; reusing one across tabs is unsupported. A typo in `#ARGUMENT(...)` (e.g. `#ARG(CREATE)`) silently degrades to "no component" with no validation error.
- **The case-level field must be named `caseFlags`** — the string is hard-coded in the toolkit (`fields.utils.ts:21`, `read-case-flag-field.component.ts:27`). Any other name is treated as a party.
- **An uninitialised `Flags` field is invisible**, not empty-but-present: the traversal skips root-level `Flags` whose value is not a non-empty object (`fields.utils.ts:463`). If a party's flags never appear in the wizard, check the `aboutToSubmit` callback that should be setting `partyName` / `roleOnCase`, not the definition.
- **Only the first `FlagLauncher` on an event is read** (`write-case-flag-field.component.ts:685`). Two launchers on one event means the second's `#ARGUMENT` is ignored.
- **A `groupId` with only one collection blocks the journey.** The user gets "External/Internal collection for storing this case flag has not been configured for this case type" and cannot submit (`write-case-flag-field.enum.ts:13-14`). Configure both instances or neither.
- **`#ARGUMENT(READ,EXTERNAL)` suppresses the active-flags banner for everyone** who can see that tab, staff included (`case-full-access-view.component.ts:420-423`).
- **Status strings are not validated by CCD.** The four-value vocabulary is a contract between your callbacks and the XUI `CaseFlagStatus` enum; a typo breaks WA logic silently.
- **Plain `#ARGUMENT(CREATE)` always writes `Active`** — the RD `defaultStatus` is ignored and there is no status step, so an internal `Requested`-then-review flow needs `#ARGUMENT(CREATE,VERSION2.1)` (`write-case-flag-field.component.ts:646-650`).
- **Reflection on a party-flag holder**: field names like `applicant1Flags` are used as strings at runtime (`CaseFlagsWaService.java:273-281`). Rename fields only with a coordinated code change.
- **Do not redefine `Flags`/`FlagDetail`/`FlagLauncher`** — the SDK's `@ComplexType(generate=false)` relies on them being CCD base types (`FieldTypeUtils.java:48`).
- **`RetainHiddenValue=Yes` is mandatory** on every hidden `Flags` field and on complex sub-fields containing `Flags`. Forgetting it wipes flag data on event submission.
- **`groupId` must match** across internal and external `Flags` for the same party (v2.1) — otherwise XUI displays the party twice.
- **Deep-copy flags before mutating** — PRL uses a Jackson round-trip to avoid corrupting the originals.
- **ComplexType authorisations for external flags**: give `[CREATOR]` only `C` access to the opposing party's `flagsExternal` sub-field. `CRU` causes cross-party data leakage in the "Request Support" screen.
- **Case-level flags are internal-only** — external users can only raise party-level flags.
- **`FlagDetail.path` type mismatch**: RD returns a plain `String[]`; CCD stores it as `List<ListValue<String>>`. Use `ListValue` wrappers in callbacks.

## Verify

1. Trigger the flag management event on a test case via XUI. Confirm the Case Flags wizard launches (means `FlagLauncher` + `#ARGUMENT(CREATE)` is wired correctly).
2. Create a flag, then check the case history tab shows the event with a before/after diff including the new `FlagDetail` item.
3. Confirm `Flags.details` survives a non-flag event (means `RetainHiddenValue=Yes` is set on every event that touches the case).
4. If you have a service-specific review event: leave a flag in `"Requested"` and confirm `about-to-submit` returns a validation error and blocks submission.

## Example

### Service-specific review event (PRL)

PRL's `CaseFlagsController` (`apps/prl/prl-cos-api/.../CaseFlagsController.java`) implements the three-callback pattern at `/caseflags/about-to-start`, `/caseflags/about-to-submit`, `/caseflags/submitted`:

- `about-to-start`: calls `caseFlagsWaService.setSelectedFlags(caseData)` to populate a wrapper with only `"Requested"` flags.
- `about-to-submit`: calls `validateAllFlags()` to find the most-recently-modified flag. If still `"Requested"`, returns `errors.add("Please select status other than Requested")`. Otherwise calls `searchAndUpdateCaseFlags()` to write the new status into the case data map.
  `validateAllFlags` returns `null` when there is nothing to review — no wrapper, an empty `selectedFlags`, or flags with no `details` — and the controller turns that into `errors.add("No case flag selected to review")` rather than dereferencing it. Worth copying if you implement the same pattern: the sort-then-take-first idiom throws on an empty list otherwise.
- `submitted`: calls `checkAllRequestedFlagsAndCloseTask()` — if no flags remain `"Requested"`, fires a WA task-close event.

<!-- source: apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java:44-161 -->

### Internal-only v1 configuration (PCS)

PCS is a useful smaller reference point: internal flags only, no external journey, two events. Its
configuration is two top-level fields on the `PCS` case type — `flagLauncherInternal`
(`FlagLauncher`) and `caseFlags` (`Flags`) — plus a `defendantFlags` field of type `Flags` declared
on the `Party` domain class rather than at the root, which is how the party-level flags are reached.
The events are `createFlags` ("Create case flags") and `amendFlags` ("Manage case flags"), both
gated on a `PENDING_CASE_ISSUED` precondition state, carrying `#ARGUMENT(CREATE)` and
`#ARGUMENT(UPDATE)` on the launcher, and a `caseFlags` tab with `#ARGUMENT(READ)`. Access is granted
`CRU` to the CTSC, hearing-centre and WLU admin profiles, and `R` to the four judicial profiles.

Two details worth borrowing. First, PCS hides the flag fields with the show-condition
`[STATE]="NEVER_SHOW"` rather than NFDiv's `internalFlagLauncher = "ALWAYS_HIDE"`; both are just
expressions that can never be true, and either works. Second, PCS mirrors the flags into its own
schema (`case_flag`, `case_party_flag`, and a `flag_ref_data` cache of the RD attributes) on event
submission, so that XUI can be served flag names and Welsh translations without a round trip to
Reference Data. Reference Data is the master, so that cache goes stale until it is refreshed —
PCS records this as known future work.

<!-- CONFLUENCE-ONLY: the PCS configuration above is from Confluence 1985056548 (v5, RRFM). Field IDs, event IDs and the access-profile grants were not cross-checked against apps/pcs/pcs-api, and the page's own tables carry typos (CTCS_ADMIN, CIRCUITE_JUDGE, amendFlag vs amendFlags) that suggest they are transcriptions rather than generated output — treat them as illustrative, not as a spec to copy. -->

<!-- DIVERGENCE: The CaseTypeTab table on Confluence 1985056548 (v5) sets DisplayContextParameter `#ARGUMENT(Flags)` on the `parties` collection field. There is no such parameter: the seven recognised values are in case-flag-display-context-parameter.enum.ts:5-13 and `#ARGUMENT(Flags)` does not appear anywhere in ccd-case-ui-toolkit. It is inert — the toolkit finds `Flags` inside collections by walking field types (fields.utils.ts:483-520), so the collection is picked up whether or not the parameter is present. Source wins. -->

## See also

- [Case flags](../explanation/case-flags.md) — conceptual overview of the flags model and lifecycle
- [Implement reasonable adjustments](implement-reasonable-adjustments.md) — extending case flags for reasonable adjustment workflows
- [Field types reference](../reference/field-types.md) — `Flags`, `FlagDetail`, `FlagLauncher` base types
