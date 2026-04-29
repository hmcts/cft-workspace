---
topic: case-flags
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Flags.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagDetail.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/services/caseflags/CaseFlagsWaService.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caseflags/AllPartyFlags.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/dto/ccd/CaseData.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/citizen/ReasonableAdjustmentsController.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Case Flags

## TL;DR

- Case flags are structured annotations on a CCD case or on an individual party; they use the shared `Flags` / `FlagDetail` complex types from the CCD SDK.
- Two scopes exist: **case-level** (`caseFlags: Flags`) and **party-level** (one `Flags` field per party, often aggregated in an `AllPartyFlags` holder).
- Each `FlagDetail` carries a `status` string — the key lifecycle value is `"Requested"`, which drives WA task creation and caseworker review.
- Reasonable-adjustment (RA) flags are ordinary case flags whose status transitions trigger a dedicated WA task; there is no separate RA data type.
- The `Flags` complex type is annotated `@ComplexType(name="Flags", generate=false)` — it is a platform-provided type; service teams do not redefine it.

---

## The `Flags` complex type

The SDK ships `Flags` and `FlagDetail` in `uk.gov.hmcts.ccd.sdk.type`
(`ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Flags.java`).

```
Flags
├── partyName       String
├── roleOnCase      String
└── details         Collection<FlagDetail>

FlagDetail
├── name            String
├── name_cy         String   (Welsh)
├── flagComment     String
├── dateTimeCreated DateTime
├── dateTimeModified DateTime
├── status          String   -- lifecycle value; e.g. "Requested", "Active", "Inactive", "Deleted"
├── hearingRelevant YesOrNo
├── flagCode        String   -- HMCTS flag catalogue code
└── ...
```

Because the type is `generate=false`, the CCD definition spreadsheet entry already exists in the platform's base definition — service teams reference it by name rather than regenerating it.

---

## Case-level vs party-level flags

| Scope | Typical field name | Where it lives |
|---|---|---|
| Case-level | `caseFlags` | Top-level field on `CaseData` |
| Party-level | per-party fields (e.g. `caApplicant1ExternalFlags`) | Often inside an `AllPartyFlags` holder on `CaseData` |

**Case-level flags** annotate the case itself — e.g. "complex case", "priority".

**Party-level flags** annotate an individual participant — e.g. reasonable adjustments, vulnerable party markers. In PRL, `CaseData` carries both:

- `Flags caseFlags` at line 714 (`service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/dto/ccd/CaseData.java:714`)
- `AllPartyFlags allPartyFlags` at line 786, which holds up to 5 applicants, 5 respondents, solicitors, and barristers — each typed `Flags` (`service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caseflags/AllPartyFlags.java`).

`CaseFlagsWaService` iterates all `Flags`-typed fields on `AllPartyFlags` using Java reflection rather than typed iteration, so field names like `caApplicant1ExternalFlags` must exactly match the reflection-based lookup (`service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/services/caseflags/CaseFlagsWaService.java:115`).

---

## Flag status lifecycle

```
[created]
    │
    ▼
"Requested"  ──► WA task created (caseworker review triggered)
    │
    ├─► "Active"    (flag accepted / confirmed)
    ├─► "Inactive"  (flag withdrawn or superseded)
    └─► "Deleted"   (removed from consideration)
```

`"Requested"` is a magic-string constant in `CaseFlagsWaService` (not an enum — `CaseFlagsWaService.java:38`). The WA task lifecycle is gated on this value:

- `setUpWaTaskForCaseFlagsEventHandler` (`CaseFlagsWaService.java:43-49`) publishes a `CaseFlagsEvent` that creates the WA task and sets `isCaseFlagsTaskCreated` to `Yes`.
- `checkCaseFlagsToCreateTask` (`CaseFlagsWaService.java:84-93`) compares before/after data; when all previously-requested flags have been resolved, it resets `isCaseFlagsTaskCreated` to `No`.
- `checkAllRequestedFlagsAndCloseTask` fires `CLOSE_REVIEW_RA_REQUEST_TASK` once **all** flags are no longer `"Requested"` (`CaseFlagsWaService.java:51-75`).
- An additional gate field `isCaseFlagsTaskCreated` (`YesOrNo`) must be `Yes` before the close logic will execute (`CaseFlagsWaService.java:60`).

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

Reasonable adjustments (RA) are **not** a separate data structure — they are party-level case flags whose `flagCode` values identify RA categories. The flow is identical to any other flag:

1. Citizen submits RA request via `POST {caseId}/{eventId}/party-update-ra` (delegating to `CaseService.updateCitizenRAflags`).
2. Flag `status` is set to `"Requested"`.
3. `CaseFlagsWaService.checkCaseFlagsToCreateTask` fires, creating a WA task.
4. Caseworker reviews `ReviewRaRequestWrapper.selectedFlags`; sets status to `"Active"` or `"Inactive"`.
5. Once all flags resolved, `CLOSE_REVIEW_RA_REQUEST_TASK` closes the WA task.

The citizen-facing `ReasonableAdjustmentsController` (`service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/citizen/ReasonableAdjustmentsController.java`) also exposes:

- `GET {caseId}/retrieve-ra-flags/{partyId}` — returns the party's `Flags` object.
- `POST {caseId}/language-support-notes` — appends language support notes.

`ReasonableAdjustmentsSupport` (holding `List<ReasonableAdjustmentsEnum>`) is a **citizen response model only** — it is separate from the CCD `Flags` structure and not stored directly in CCD.

---

## See also

- [`docs/ccd/explanation/reasonable-adjustments.md`](reasonable-adjustments.md) — RA request flow end-to-end using the same flag machinery
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions of FlagDetail, Flags, status values

---

## Glossary

| Term | Definition |
|---|---|
| `Flags` | CCD platform complex type holding a list of `FlagDetail` items for one party or the case itself. `@ComplexType(name="Flags", generate=false)` — not regenerated by service teams. |
| `FlagDetail` | A single flag instance with `name`, `flagCode`, `status`, and audit timestamps. |
| `AllPartyFlags` | Service-team model (PRL example) that groups per-party `Flags` fields into one holder, enabling reflection-based iteration. |
| `"Requested"` | Magic-string flag status that gates WA task creation; transitions out of this value trigger task closure. |
