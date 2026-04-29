---
topic: case-flags
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Flags.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagDetail.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagLauncher.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagVisibility.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/FieldTypeDefinition.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V20220113_12977__RDM-12977_FlagLauncher_base_type.sql
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V20230510_4515__CCD-4515__AmendFlagDetails.sql
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V20230920_4820__CCD-4820_Updating_Flags.sql
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/services/caseflags/CaseFlagsWaService.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caseflags/AllPartyFlags.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/dto/ccd/CaseData.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/citizen/ReasonableAdjustmentsController.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1700663346"
    title: "Case Flags HLD Version 2.1"
    space: "CF"
  - id: "1572570790"
    title: "How To Guide - Case Flags"
    space: "RCCD"
  - id: "1702505636"
    title: "How To Guide - Case Flags v2.1"
    space: "RCCD"
  - id: "1540427904"
    title: "Expert UI - Low Level Design - Case Flags Field"
    space: "EUI"
---

# Case Flags

## TL;DR

- Case flags are structured annotations on a case or on an individual party, built from three platform-provided base types: `Flags`, `FlagDetail`, and `FlagLauncher`.
- Two scopes exist: **case-level** (typically `caseFlags: Flags` at the top of case data) and **party-level** (one or two `Flags` fields per party).
- A separate empty `FlagLauncher` field (one per tab/event) triggers the ExUI Case Flags web component; mode is selected via `DisplayContextParameter` (`#ARGUMENT(CREATE|UPDATE|READ[,VERSION2.1|EXTERNAL])`).
- `FlagDetail.status` is the lifecycle string. CCD does not enforce values; the canonical set is `"Requested" | "Active" | "Inactive" | "Not approved"`. `"Requested"` drives WA task creation in services that opt in.
- Flags v2.1 splits party-level flags into **internal** and **external** collections paired by a service-set `groupId` UUID and a `visibility` marker (`"Internal"` or `"External"`).
- Reasonable-adjustment (RA) flags are ordinary case flags whose `flagCode` starts with `RA`; they share the same machinery as any other flag.

---

## The three base types

CCD ships three flag-related base types in the platform (registered in `ccd-definition-store-api` migrations and re-declared in the SDK with `@ComplexType(generate = false)` so service teams don't redefine them):

| Base type | Purpose | Has fields? |
|---|---|---|
| `Flags` | Wraps a per-party (or per-case) collection of `FlagDetail` plus party metadata | Yes |
| `FlagDetail` | A single flag instance | Yes (17 sub-fields) |
| `FlagLauncher` | Empty trigger field that tells ExUI to launch the Case Flags web component | **No** — empty by design |

Source: `ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/FieldTypeDefinition.java:38` defines `FLAG_LAUNCHER = "FlagLauncher"`. The SDK ships `Flags`, `FlagDetail`, `FlagLauncher`, and the `FlagVisibility` enum in `uk.gov.hmcts.ccd.sdk.type`.

---

## `Flags`

```
Flags
├── partyName       String       -- name of the party this collection belongs to
├── roleOnCase      String       -- service-specific role identifier on this case
├── details         Collection<FlagDetail>
├── visibility      String       -- "Internal" or "External" (v2.1)
└── groupId         String       -- UUID linking the internal/external pair (v2.1)
```

(`ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Flags.java`)

The `visibility` and `groupId` fields were added in Case Flags v2.1 (DB migration `V20230920_4820__CCD-4820_Updating_Flags.sql`).

<!-- DIVERGENCE: The SDK models visibility as a `FlagVisibility` enum (Internal|External) and groupId as `java.util.UUID`. The CCD definition store stores both as plain `Text` fields and the HLD says "CCD will not enforce these values" — services may use any string. Source (CCD platform) wins on enforcement; SDK consumers will get strict typing on their side. -->

Important platform notes:
- `Flags` instances do **not** have to be co-located in a single collection. Services place them anywhere in their case data — inside complex types, alongside party fields, etc.
- They are *hidden* on tabs and events; the actual rendering is done by the ExUI Case Flags web component, launched by a separate `FlagLauncher` field.
- They apply only to **party-level** flags. Case-level flags are a (hidden) `Flags` field at the top of case data, conventionally named `caseFlags`.

---

## `FlagDetail`

A single flag instance carries 17 sub-fields. Source order from `ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagDetail.java` and `ccd-definition-store-api` migration `V20230510_4515__CCD-4515__AmendFlagDetails.sql`:

| Field | Type | Source | Notes |
|---|---|---|---|
| `name` | Text | Reference Data | Name of the flag (English) |
| `name_cy` | Text | Reference Data | Welsh translation (added v2) |
| `subTypeValue` | Text | Reference Data | Selected sub-value, e.g. `"British Sign Language (BSL)"` |
| `subTypeValue_cy` | Text | Reference Data | Welsh sub-value (v2) |
| `subTypeKey` | Text | Reference Data | Key for the sub-value, e.g. `"britishSignLanguage"`. <!-- CONFLUENCE-ONLY: Confluence notes that user-entered (non-Reference-Data) languages have no key. Not modelled in source. --> |
| `otherDescription` | Text | User | Free-text description if "Other" flag selected |
| `otherDescription_cy` | Text | User | Welsh "Other" description (v2) |
| `flagComment` | Text | User | Clarifying comment when raising |
| `flagComment_cy` | Text | User | Welsh comment (v2) |
| `flagUpdateComment` | Text | User | Set when approving/rejecting/changing. <!-- CONFLUENCE-ONLY: HLD says "Can only be viewed by Staff but can be set as part of the deactivating flag journey by an external user." Not enforced in CCD source. --> |
| `dateTimeModified` | DateTime | System | ISO 8601 with milliseconds (`yyyy-MM-dd'T'HH:mm:ss.SSS'Z'` per SDK `@JsonFormat`) |
| `dateTimeCreated` | DateTime | System | Same format |
| `path` | Text[] | Reference Data | Tree path, e.g. `["Reasonable adjustment", "Mobility support"]` |
| `hearingRelevant` | YesOrNo | Reference Data | Per-service flag from `FlagService` table |
| `flagCode` | Text | Reference Data | Universally-unique flag code (see prefix convention below) |
| `status` | Text | Service | Lifecycle string — see [Status lifecycle](#flag-status-lifecycle) |
| `availableExternally` | YesOrNo | Reference Data | Whether external parties can see/set (v2). If null, treat as `No`. |

---

## `FlagLauncher`

`FlagLauncher` is an **empty** base type — its sole purpose is to tell ExUI to render the Case Flags web component on the current tab or event:

```java
@ComplexType(generate = false)
public class FlagLauncher {
}
```

(`ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagLauncher.java`)

Key configuration rules:

- A `FlagLauncher` field has **no inherent value**. The web component traverses the tab's or event's other `case_fields` to find sibling `Flags` instances and extracts their data.
- **Each `FlagLauncher` instance must have a unique ID per tab.** A given `FlagLauncher` ID must NOT be assigned to multiple tabs in `CaseTypeTab` configuration. Use one per tab (e.g. `flagLauncherInternal`, `flagLauncherExternal`).
- `FlagLauncher` triggers the component via the `DisplayContextParameter` argument on its row.

### `DisplayContextParameter` modes

| Argument | Used on | Behaviour |
|---|---|---|
| `#ARGUMENT(CREATE)` | `CaseEventToFields` | v1 internal Create Flag event |
| `#ARGUMENT(UPDATE)` | `CaseEventToFields` | v1 internal Manage Flags event |
| `#ARGUMENT(READ)` | `CaseTypeTab` | Read-only view of all flags on a tab |
| `#ARGUMENT(CREATE,VERSION2.1)` | `CaseEventToFields` | v2.1 internal Create Flag event |
| `#ARGUMENT(UPDATE,VERSION2.1)` | `CaseEventToFields` | v2.1 internal Manage Flags event |
| `#ARGUMENT(CREATE,EXTERNAL)` | `CaseEventToFields` | v2.1 external "Request support" event |
| `#ARGUMENT(UPDATE,EXTERNAL)` | `CaseEventToFields` | v2.1 external "Manage support" event |
| `#ARGUMENT(READ,EXTERNAL)` | `CaseTypeTab` | External-facing "Support" tab |

In External mode, only flags with `availableExternally = true` are shown.

<!-- CONFLUENCE-ONLY: The `DisplayContextParameter = #ARGUMENT(...)` extension was introduced specifically for FlagLauncher; values are literal strings the web component looks for, and CCD does not validate them. -->

---

## Case-level vs party-level flags

| Scope | Typical field name | Where it lives |
|---|---|---|
| Case-level | `caseFlags` | Top-level `Flags` field on `CaseData` |
| Party-level (v1) | per-party `Flags` field | Anywhere in case data — service decides |
| Party-level (v2.1) | **two** `Flags` fields per party (internal + external) | Linked by a shared `groupId` UUID; `visibility` set on each |

**Case-level flags are not supported for external users in v2.1.** Internal case-level flags continue to work via the v1 path.

In PRL, `CaseData` carries both:

- `Flags caseFlags` at line 714 (`service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/dto/ccd/CaseData.java:714`)
- `AllPartyFlags allPartyFlags` at line 786, which holds up to 5 applicants, 5 respondents, solicitors, and barristers — each typed `Flags` (`service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caseflags/AllPartyFlags.java`).

`CaseFlagsWaService` iterates all `Flags`-typed fields on `AllPartyFlags` using Java reflection rather than typed iteration, so field names like `caApplicant1ExternalFlags` must exactly match the reflection-based lookup (`service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/services/caseflags/CaseFlagsWaService.java:115`).

### Setting `visibility` and `groupId` (v2.1)

For v2.1, the aboutToSubmit callback that creates or updates parties must:

- Set the same `groupId` UUID on both the internal and external `Flags` fields for the same party.
- Set `visibility = "Internal"` on the internal collection, `visibility = "External"` on the external one.

CCD does not enforce the values; mis-population is a service bug.

---

## Flag code conventions

`flagCode` is a 6-character code mastered in CFT Reference Data (`FlagDetails` table). The prefix encodes the top-level ancestor:

| Prefix | Meaning |
|---|---|
| `CFnnnn` | Case-level flag, or descendent of the Case category |
| `PFnnnn` | Party-level flag (excluding Reasonable Adjustment subtree) |
| `RAnnnn` | Reasonable Adjustment flag, or descendent of RA |
| `OT0001` | Special "Other" flag — added to every populated `childFlags` collection |

Top-level category codes: `CF0001` (Case), `PF0001` (Party), `RA0001` (Reasonable adjustment).

Examples:
- `PF0015` — Language interpreter (party-level, has a `listOfValues[]` of dialects)
- `RA0042` — Sign Language interpreter (party-level RA, also has `listOfValues[]`)
- `RA0011` — Coloured paper
- `CF0007` — Urgent flag

<!-- CONFLUENCE-ONLY: Reference Data flag list, FlagService table (per-service overrides), and the recursive Get Flags API are external to the CCD source code. -->

### Reference data tables

Two tables in CFT Reference Data drive the catalogue:

- **`FlagDetails`** — master list of flags per category. Hierarchical via `category_id`.
- **`FlagService`** — per-service overrides. Columns include `HearingRelevant`, `RequestReason`, `DefaultStatus` (`Active` or `Requested`), `AvailableExternally`. The default `ServiceID = "XXXX"` represents Reasonable Adjustment defaults; service-specific rows override.

The Reference Data Get Flags API (`GET /flags`) is filtered by:
- `ServiceID` (mandatory) — HMCTS Service ID, e.g. `BBA3` for SSCS. **Note:** this is not the jurisdiction or service name.
- `FlagType` (`PARTY` or `CASE`).
- `WelshRequired` (default `true` in v2).
- `ExternalFlagsOnly` (default `false`; v2).

### `HMCTSServiceId` supplementary data prerequisite

Every case must carry the `HMCTSServiceId` supplementary data — it's how the ExUI component asks Reference Data which flags apply. Set during case creation:

```js
{ "supplementary_data_request": { "$set": { "HMCTSServiceId": "BBA3" } } }
```

Or post-creation via `POST /cases/{caseId}/supplementary-data`.

---

## Flag status lifecycle

```
[created]
    │
    ▼
"Requested"  ──► WA task created (caseworker review triggered)
    │
    ├─► "Active"        (flag accepted / confirmed)
    ├─► "Inactive"      (flag withdrawn or superseded)
    └─► "Not approved"  (caseworker rejected the request)
```

Per the Case Flags HLD, the canonical set is `"Requested" | "Active" | "Inactive" | "Not approved"`, with `"Requested"` being the initial value when a flag is captured via the ExUI component. **CCD does not enforce these values** — they're plain `Text` in the platform; the SDK declares `status` as `String`. Services may add their own values, but doing so breaks compatibility with the standard ExUI flows and Reference Data expectations.

<!-- DIVERGENCE: An older draft of this page listed only "Active", "Inactive", "Deleted" alongside "Requested". The HLD canonical set replaces "Deleted" with "Not approved" — flags cannot be deleted (per HLD architectural decision: "After a flag is set on a case it cannot be removed, but may be deactivated"). Source SDK does not enforce values either way; HLD wins as the documented standard. -->

`"Requested"` is a magic-string constant in PRL's `CaseFlagsWaService` (not an enum — `CaseFlagsWaService.java:38`). The WA task lifecycle is gated on this value:

- `setUpWaTaskForCaseFlagsEventHandler` (`CaseFlagsWaService.java:43-49`) publishes a `CaseFlagsEvent` that creates the WA task and sets `isCaseFlagsTaskCreated` to `Yes`.
- `checkCaseFlagsToCreateTask` (`CaseFlagsWaService.java:84-93`) compares before/after data; when all previously-requested flags have been resolved, it resets `isCaseFlagsTaskCreated` to `No`.
- `checkAllRequestedFlagsAndCloseTask` fires `CLOSE_REVIEW_RA_REQUEST_TASK` once **all** flags are no longer `"Requested"` (`CaseFlagsWaService.java:51-75`).
- An additional gate field `isCaseFlagsTaskCreated` (`YesOrNo`) must be `Yes` before the close logic will execute (`CaseFlagsWaService.java:60`).

The HLD architectural decision is that "the raising or deactivating of a flag should be able to trigger a Work Allocation task and/or any service-specific logic. That is up to the service to define and manage." PRL's `CaseFlagsWaService` is one such service-side implementation.

---

## Configuration prerequisites for service teams

The standard CCD configuration shape (per `How To Guide - Case Flags` and `v2.1`):

1. **Top-level `caseFlags: Flags`** for case-level flags (omit if no case-level support is needed).
2. **One or two `Flags` fields per party** — v1 single, v2.1 internal + external pair.
3. **One or two `FlagLauncher` fields** — internal, optionally external; each with a unique ID.
4. Events:
   - `Create Flag` / `Manage Flags` (internal)
   - v2.1: `Request Support` / `Manage Support` (external, party-level only)
5. `Case Flags` tab (and v2.1 `Support` tab) showing the `FlagLauncher` plus all hidden `Flags` fields.
6. `RoleToAccessProfiles`, `AuthorisationCaseField`, `AuthorisationCaseType`, `AuthorisationCaseEvent`, and `AuthorisationComplexType` rows granting CRU as appropriate.
7. aboutToSubmit callback on Add/Edit Party events that populates `partyName`, `roleOnCase` (and v2.1: `groupId`, `visibility`).
8. Reference Data CSV submitted to the Reference Data team with the flags the service uses, plus per-flag `RequestReason`, `HearingRelevant`, `DefaultStatus`, `AvailableExternally` overrides.

### Hidden-field rules

All flag fields **except `FlagLauncher`** must be hidden on the relevant `CaseEventToFields` and `CaseTypeTab` rows, with:

- A `FieldShowCondition` that resolves false (e.g. `"someField=\"NEVER\""`).
- `RetainHiddenValue = "Yes"` so values aren't stripped on submit.

If a `Flags` field lives inside a `Complex` type, `RetainHiddenValue = "Yes"` must be set on the `Flags` sub-field itself in the `ComplexTypes` tab — setting it only on the parent complex field is not enough. <!-- CONFLUENCE-ONLY: This is per the "Retain Hidden Fields" CCD specification and is not unique to Case Flags; documented in the v1/v2.1 how-to guides. -->

If `Flags` is held inside a `Collection`, set `DisplayContext = OPTIONAL` on the `CaseEventToFields` row.

---

## Callback endpoints (PRL example)

PRL's `CaseFlagsController` at `/caseflags/*` handles four stages:

| Path | Stage | Purpose |
|---|---|---|
| `/caseflags/check-wa-task-status` | Pre-event | Compare before/after; decide if new WA task needed |
| `/caseflags/setup-wa-task` | `submitted` | Publish `CaseFlagsEvent` to create WA task |
| `/caseflags/about-to-start` | `about-to-start` | Collect all `"Requested"` flags into `selectedFlags` on `ReviewRaRequestWrapper` |
| `/caseflags/about-to-submit` | `about-to-submit` | Validate that the reviewed flag is no longer `"Requested"`; update in place |

A separate pair of endpoints (`/review-lang-sm/about-to-start`, `/review-lang-sm/about-to-submit`) handles language and sign/spoken-language flags via `FlagsService.prepareSelectedReviewLangAndSmReq` and `FlagsService.validateNewFlagStatus` (`CaseFlagsController.java:171-216`).

Deep-copying flags during `setSelectedFlags` is done via a Jackson round-trip to avoid mutating originals (`CaseFlagsWaService.java:242-248`).

---

## Reasonable adjustments

Reasonable adjustments (RA) are **not** a separate data structure — they are party-level case flags whose `flagCode` starts with `RA`. The flow is identical to any other flag:

1. Citizen submits RA request via `POST {caseId}/{eventId}/party-update-ra` (delegating to `CaseService.updateCitizenRAflags`).
2. Flag `status` is set to `"Requested"`.
3. `CaseFlagsWaService.checkCaseFlagsToCreateTask` fires, creating a WA task.
4. Caseworker reviews `ReviewRaRequestWrapper.selectedFlags`; sets status to `"Active"` or `"Inactive"` (or `"Not approved"`).
5. Once all flags resolved, `CLOSE_REVIEW_RA_REQUEST_TASK` closes the WA task.

The citizen-facing `ReasonableAdjustmentsController` (`service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/citizen/ReasonableAdjustmentsController.java`) also exposes:

- `GET {caseId}/retrieve-ra-flags/{partyId}` — returns the party's `Flags` object.
- `POST {caseId}/language-support-notes` — appends language support notes.

`ReasonableAdjustmentsSupport` (holding `List<ReasonableAdjustmentsEnum>`) is a **citizen response model only** — it is separate from the CCD `Flags` structure and not stored directly in CCD.

### Special handling: language interpreter / sign language

Two flag codes carry an extra `listOfValues[]` (a list of selectable dialects):

- `PF0015` — Language interpreter
- `RA0042` — Sign Language interpreter

The ExUI component shows a Flag Refinement L2 step for these specifically, populated from a Reference Data languages table. Earlier designs included an L3 dialect step; the platform now treats each dialect as its own language entry (`subTypeKey` / `subTypeValue` capture the choice).

---

## See also

- [`docs/ccd/explanation/reasonable-adjustments.md`](reasonable-adjustments.md) — RA request flow end-to-end using the same flag machinery
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions of FlagDetail, Flags, status values
- [`docs/ccd/reference/field-types.md`](../reference/field-types.md) — `Flags`, `FlagDetail`, `FlagLauncher` in the CCD field-type catalogue

---

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

