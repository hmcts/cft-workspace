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
  - service-nfdiv:nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseData.java
  - service-nfdiv:nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/PartyFlags.java
  - service-nfdiv:nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/caseworker/event/CaseworkerCreateCaseFlag.java
  - service-nfdiv:nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/caseworker/event/CaseworkerManageCaseFlag.java
  - service-nfdiv:nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/caseworker/service/CaseFlagsService.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/dto/ccd/CaseData.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caseflags/AllPartyFlags.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/services/caseflags/CaseFlagsWaService.java
examples_extracted_from:
  - apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/caseworker/event/CaseworkerCreateCaseFlag.java
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/caseworker/service/CaseFlagsService.java
status: confluence-augmented
last_reviewed: "2026-04-29T00:00:00Z"
confluence_checked_at: "2026-04-29T18:00:00Z"
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
---

# Implement Case Flags

## TL;DR

- Case Flags are CCD's built-in mechanism for attaching named flags (reasonable adjustments, language needs, vulnerability markers, etc.) to a case or to individual parties.
- Three CCD base types are involved: `Flags` (the per-party / per-case container), `FlagDetail` (the individual flag — `name`, `flagCode`, `status`, `path`, `flagComment`, ...), and `FlagLauncher` — an empty marker type that tells XUI to render the multi-step Case Flags web component.
- Configure **at least one `FlagLauncher` field per tab/event**, with `DisplayContextParameter` set to `#ARGUMENT(CREATE)`, `#ARGUMENT(UPDATE)`, or `#ARGUMENT(READ)`. The `Flags` data fields themselves must be hidden with `RetainHiddenValue=Yes`.
- Flag statuses follow a four-state lifecycle: `Requested` -> `Active` / `Not approved`, and `Active` -> `Inactive`. CCD does **not** enforce these strings — services do.
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

<!-- CONFLUENCE-ONLY: XUI's behaviour of finding sibling Flags instances by walking the tab/event is documented in the EUI LLD page 1540427904. Source verification would require reading rpx-xui-webapp, which is not in the workspace. -->

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

## Step 1 - Add `Flags` fields for case-level and party-level flags

Add a `Flags caseFlags` field for case-level flags on your case-data class. Add one `Flags` field per party — either directly on the case-data class or grouped in a holder class.

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

PRL takes the same approach with a flat `AllPartyFlags` holder containing one `Flags` field per party (`AllPartyFlags.java`). Field names inside such a holder are iterated at runtime via Java reflection (`CaseFlagsWaService.java:115-117`); rename them with care.

The `Flags`, `FlagDetail`, and `FlagLauncher` types are pre-built CCD complex types — annotated `@ComplexType(name="Flags", generate=false)` etc. (`Flags.java`, `FlagDetail.java`, `FlagLauncher.java`). You do **not** need to define them in your spreadsheet; the definitions are built into CCD as base types (`FieldTypeDefinition.java:38`, `FieldTypeUtils.java:48`).

## Step 2 - Add a `FlagLauncher` field per tab/event

`FlagLauncher` is an empty CCD type. Its presence tells XUI to mount the multi-step Case Flags component. **Each tab or event that needs to render flags requires its own `FlagLauncher` instance with a unique field ID** — you cannot reuse one across multiple tabs. The `FlagLauncher` field is already shown in the Step 1 example (`internalFlagLauncher`).

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

The argument value is a literal string — CCD does not validate it; XUI inspects it at component-launch time.

<!-- CONFLUENCE-ONLY: the #ARGUMENT vocabulary is documented in the Case Flags HLD v2.1 (1700663346) and the v2.1 How-To Guide (1702505636); CCD source treats the parameter as opaque. -->

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

When a staff user raises a flag in the v2.1 flow, XUI decides which `Flags` collection to store it in based on the `availableExternally` attribute returned from Reference Data:

1. If `availableExternally == true` for the selected flag code: store in the **external** `Flags` instance for that party (the one with `visibility=External`).
2. If `availableExternally == false`: store in the **internal** `Flags` instance (the one with `visibility=Internal` or no visibility set).
3. Special case: when the "Other" flag is selected, staff see a checkbox that allows them to explicitly choose to store it in the internal collection regardless of `availableExternally`.

For external users, flags are always stored in the external collection — they cannot see or write to the internal collection.

<!-- CONFLUENCE-ONLY: Save logic flow described in Case Flags HLD Version 2.1 (1700663346) section 3.2.2.2. Not validated against rpx-xui-webapp source. -->

## Step 5 - Define the four-state status lifecycle

`FlagDetail.status` is a plain `String` (`FlagDetail.java:69`). CCD does not enforce its values; the service and XUI agree on a vocabulary. The standard vocabulary has four values:

| Status | Meaning | Set by |
|---|---|---|
| `Requested` | Awaiting decision (default for flags raised by external users / requiring review) | XUI on creation; default comes from `FlagService.DefaultStatus` in RD |
| `Active` | Approved and currently applicable | Service or XUI |
| `Inactive` | Deactivated (no longer applicable). Mandatory `flagUpdateComment` to move from `Active`. | XUI / service |
| `Not approved` | Reviewer declined the request. Mandatory `flagUpdateComment`. | Internal staff via Manage Flag |

State transitions allowed by the standard XUI component:

- `Requested` -> `Active` or `Not approved`
- `Active` -> `Inactive`
- `Inactive` is terminal for the dropdown (greyed out)
- An external user can only move `Active` -> `Inactive` and must supply a `flagUpdateComment`.

<!-- DIVERGENCE: Earlier draft TL;DR claimed `"Requested"` was the only magic string. The full vocabulary per the HLD has four values (`Requested`, `Active`, `Inactive`, `Not approved`). FlagDetail.java:69 confirms `status` is a plain `String` so CCD does not police any of them — the contract is between the service callback code and the XUI component. Source wins on the data type; Confluence supplies the vocabulary. -->

The status history is held in the audit trail of each `FlagDetail` `ListValue` (each item has a stable `id`), and `FlagDetail.dateTimeModified` is updated whenever the flag changes (`FlagDetail.java:51-57`).

## Step 6 - Add a service-specific review layer (optional)

The CCD/XUI "Manage Flag" event handles status transitions in-component. Many services need additional behaviour — Work-Allocation tasks created on `Requested`, mandatory decision-comment validation, deep-copy mutations to keep the audit trail consistent — and add a dedicated `reviewFlags` event in front of (or alongside) the standard `manageFlags` event.

PRL implements this with a `REVIEW_FLAGS` event and three callbacks:

- **`aboutToStart`**: scan all `Flags` fields for items with `status == "Requested"`, populate a wrapper so the caseworker sees only open items (`CaseFlagsWaService.java:105-142`).
- **`aboutToSubmit`**: validate the most-recently-modified flag is no longer `"Requested"`, update it in place, return errors if validation fails (`CaseFlagsController.java:125-152`).
- **`submitted`**: if no flags remain `"Requested"`, fire a WA task-close event (`CaseFlagsWaService.java:51-75`).

To trigger a WA review task when a new flag is raised, publish an internal Spring event from a `setup-wa-task` callback. Gate on `isCaseFlagsTaskCreated == YES` (`CaseFlagsWaService.java:60`).

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

The Create-Flag wizard fetches the available flags from RD-Common at runtime, filtered by `HMCTSServiceId`. Two prerequisites:

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

   <!-- CONFLUENCE-ONLY: FlagService table schema and CSV onboarding process from Case Flags HLD Version 2.1 (1700663346) section 3.2.1.1. Not verified against rd-commondata-api source. -->

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

A banner is shown at the top of every case tab if the case has any `FlagDetail` with `status == "Active"`. The banner is suppressed for external users; for internal staff, `flagUpdateComment` is shown beneath the comment with prefix "Decision Reason:" — but only for `Not approved` flags.

<!-- CONFLUENCE-ONLY: banner content rules and the JSONPath aggregation (`$..Details[?(@.status == "Active")]`) come from the HLD; not validated against rpx-xui-webapp. -->

## Gotchas

- **`FlagLauncher` is mandatory per tab/event** — without it the user sees an empty event (the `Flags` data is hidden). Each must have a unique field ID; reusing one across tabs is unsupported. A typo in `#ARGUMENT(...)` (e.g. `#ARG(CREATE)`) silently degrades to "no component" with no validation error.
- **Status strings are not validated by CCD.** The four-value vocabulary is a contract between your callbacks and XUI; a typo breaks WA logic silently.
- **Reflection on a party-flag holder**: field names like `applicant1Flags` are used as strings at runtime (`CaseFlagsWaService.java:115`). Rename fields only with a coordinated code change.
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
- `submitted`: calls `checkAllRequestedFlagsAndCloseTask()` — if no flags remain `"Requested"`, fires a WA task-close event.

<!-- source: apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java:44-161 -->

## See also

- [Case flags](../explanation/case-flags.md) — conceptual overview of the flags model and lifecycle
- [Implement reasonable adjustments](implement-reasonable-adjustments.md) — extending case flags for reasonable adjustment workflows
- [Field types reference](../reference/field-types.md) — `Flags`, `FlagDetail`, `FlagLauncher` base types
