---
topic: linked-cases
audience: both
sources:
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/CaseLink.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/LinkReason.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/dto/ccd/CaseData.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/CaseLink.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/LinkReason.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/caselinking/CaseLinkExtractor.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/caselinking/CaseLinkEntity.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseController.java
examples_extracted_from:
  - apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/CaseLink.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1576339712"
    title: "How To Guide - Case Linking"
    space: "RCCD"
  - id: "1558272584"
    title: "Case Linking HLD Version 1.0"
    space: "RCCD"
  - id: "1558265834"
    title: "Case Linking Scope of Delivery"
    space: "RCCD"
  - id: "1558279400"
    title: "API Operation: Get Linked Cases"
    space: "RCCD"
  - id: "554959334"
    title: "RDM ?? - New Type CaseLink"
    space: "RCCD"
---

# Linked Cases

## TL;DR

- Linked cases let a CCD case reference one or more other cases; storage is a `Collection(CaseLink)` field that **must be named `caseLinks`** at the top level of the case data — the Data Store hard-codes that name.
- `CaseLink` is a built-in CCD complex type with `CaseReference`, `ReasonForLink` (a **collection** of `LinkReason`), `CreatedDateTime`, and `CaseType`.
- The standard linked-cases UI also requires a `LinkedCasesComponentLauncher` field (type `ComponentLauncher`) plus two events ("Create Case Link" and "Maintain Case Links") and a "Linked cases" tab.
- Reasons are sourced from a Reference Data LoV (`CaseLinkReason`); standard set is *Other*, *Case consolidated*, *Progressed as part of this lead case*, *Linked for a hearing*.
- The Data Store exposes `GET /getLinkedCases/{caseReference}` for the reverse lookup; it filters on a `standard_link` column populated only for links projected from the `caseLinks` collection.

## The CaseLink type

`CaseLink` is a standard CCD complex type. The canonical sub-fields:

| Sub-field | Type | Max length | Mandatory | Notes |
|---|---|---|---|---|
| `CaseReference` | `Text` | 16 | Yes | The 16-digit reference of the linked case |
| `ReasonForLink` | Collection of `LinkReason` | — | No | One or more reasons |
| `CreatedDateTime` | `DateTime` | — | No | Set automatically by the UI |
| `CaseType` | `Text` | 70 | No | Case-type ID of the linked case |

`LinkReason` sub-fields:

| Sub-field | Type | Max length | Mandatory | Notes |
|---|---|---|---|---|
| `Reason` | `Text` | 70 | Yes | Reason code from the `CaseLinkReason` LoV |
| `OtherDescription` | `Text` | 255 (def) / 50 (UI) | No | Free text when `Reason == "Other"` |

<!-- DIVERGENCE: Confluence (HLD / Scope of Delivery) describes ReasonForLink as an array of LinkReason. The SDK at libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/CaseLink.java:23 confirms — `List<ListValue<LinkReason>>`. The PRL POJO at apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/CaseLink.java:15 declares `private final LinkReason reasonForLink` (single value) — contradicting both Confluence and the SDK. SDK wins; the PRL form is a service-local quirk. -->

<!-- CONFLUENCE-ONLY: Max-length values (Reason 70, OtherDescription 255) come from "Case Linking Scope of Delivery"; not enforced in the Data Store source. The HLD also notes the ExUI "Other" text box is capped at 50 chars in the UI — divergent from the 255-char definition. -->

## Why the field MUST be named `caseLinks`

The Data Store hard-codes it in `CaseLinkExtractor`:

```java
// apps/ccd/ccd-data-store-api/.../caselinking/CaseLinkExtractor.java:23
protected static final String STANDARD_CASE_LINK_FIELD = "caseLinks";
```

Links are only projected into the `case_link` table with `standard_link = true` if they live in a top-level field whose ID is exactly `caseLinks`. A differently named (or nested) collection still persists, but won't appear in `getLinkedCases` or the standard tab. Confluence's how-to treats this as a configuration choice; in source it is a constant.

## Enabling linked cases in a case-type definition

Distilled from "How To Guide - Case Linking" and the HLD:

1. **Two top-level fields**: `LinkedCasesComponentLauncher` of type `ComponentLauncher` (case-sensitive ID — must match exactly) and `caseLinks` of type `Collection(CaseLink)`.
2. **Two events**: `createCaseLink` ("Link cases", CREATE mode) and `maintainCaseLink` ("Manage case links", UPDATE mode). `DisplayContextParameter` selects the web-component mode.
3. **A tab** "Linked cases" containing both fields with `DisplayContextParameter` `#ARGUMENT(LinkedCases)` (READ mode).
4. **Authorisation**: BASIC `hmcts-staff` / `hmcts-judiciary` org roles need R on the case type and field; an admin role needs CRU on fields and events. Wired via `RoleToAccessProfiles`, `AuthorisationCaseType`, `AuthorisationCaseField`, `AuthorisationCaseEvent`.
5. **Reference Data**: load reason codes into the LoV table keyed `CaseLinkReason`, scoped per service ID.
6. **Initialisation**: on the case-creation `aboutToSubmit`, set `caseLinks` to an empty collection so ExUI can mutate it.

<!-- CONFLUENCE-ONLY: The LinkedCasesComponentLauncher requirement, DisplayContextParameter CREATE/UPDATE/READ wiring, the `#ARGUMENT(LinkedCases)` tab parameter, and the LoV reference-data integration are ExUI / definition-store conventions documented in the Case Linking HLD; the Data Store code is agnostic to them. -->

## UI flow (ExUI web component)

The LinkedCasesComponent runs in three modes — CREATE (Link cases event), UPDATE (Manage case links event), READ (the tab). On launch it maps the case type to a service ID, calls the LoV API (`GET /refdata/lov/caseLinkReason/<serviceId>`) for reason codes, and verifies the user has at least basic access to the target case before adding a link. If "Other" is selected the UI shows a text box capped at 50 chars which populates `OtherDescription`. CCD records `CreatedDateTime` automatically. The READ tab shows two tables: cases this one links *to* (from local `caseLinks`) and cases linked *from* elsewhere (via `getLinkedCases`).

<!-- CONFLUENCE-ONLY: CREATE/UPDATE/READ web-component modes, LoV reasoning, and the tab's two-table layout are documented in the HLD; not modelled in source. -->

## The `getLinkedCases` endpoint (reverse direction)

```
GET /getLinkedCases/{caseReference}
    ?startRecordNumber={n}     (default 1)
    &maxReturnRecordCount={n}  (omit for all)
```

<!-- DIVERGENCE: Confluence ("API Operation: Get Linked Cases" and "Scope of Delivery") documents the path as `/getLinkedCases/{caseReference}/startRecordNumber/{n}/maxReturnRecordCount/{n}` (path-parameter form). The implementation at apps/ccd/ccd-data-store-api/.../v2/external/controller/CaseController.java:448-472 uses path `getLinkedCases/{caseReference}` with `@RequestParam` for the pagination args (query string). Source wins. -->

Response (abbreviated):

```json
{
  "linkedCases": [{
    "caseNameHmctsInternal": "Smith vs Peterson",
    "caseReference": "1234123412341234",
    "ccdCaseType": "benefit", "ccdJurisdiction": "SSCS", "state": "withDwp",
    "linkDetails": [{
      "createdDateTime": "2022-02-04T15:00:00.000",
      "reasons": [{ "reasonCode": "FAMILIAL", "OtherDescription": "" }]
    }]
  }],
  "hasMoreRecords": false
}
```

Verified in source:

- `CaseLinkEntity` (`case_link` table) has columns `case_id`, `linked_case_id`, `case_type_id`, `standard_link` (boolean). Only links projected from the top-level `caseLinks` field have `standard_link = true`; the endpoint filters on this so legacy CaseLink fields are ignored.
- `caseReference` is validated as a 16-digit Luhn number via `UIDService`; invalid → 400.
- Access control runs through `CreatorGetCaseOperation`; no access → 404 (avoids leaking case existence).
- Pagination applies a 20% buffer to `maxReturnRecordCount` so the service can detect more records after access-control filtering; `hasMoreRecords` flips to `true` when more would have matched.

<!-- source: apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseController.java:448-489 -->
<!-- source: apps/ccd/ccd-data-store-api/src/main/java/uk/gov/hmcts/ccd/data/caselinking/CaseLinkEntity.java:14-63 -->

## Gotchas

- The collection field **MUST** be named `caseLinks` — `STANDARD_CASE_LINK_FIELD` is hard-coded. A different name silently breaks `getLinkedCases` and the standard tab.
- Links written directly to `case_link` rows from elsewhere are not visible to `getLinkedCases` — only standard-field-projected rows have `standard_link = true`. Migrating existing CaseLink fields means moving them to the top-level `caseLinks` collection.
- If you define your own `CaseLink` POJO (as PRL does), `ReasonForLink` should be a **collection** of `LinkReason`, not a single value — see the divergence note above.
- `OtherDescription` is **not validated** server-side when `Reason == "Other"` — the HLD defers this to the UI. Consumers should not assume the field is populated.
- Cross-service linking fails for users who lack at least basic access to the target case (HMCTS_Staff org role, etc).
- PRL also defines `AutomatedHearingCaseLink` for the HMC integration; do not conflate it with the CCD linked-cases feature — different DTO, different consumer (hearing scheduling API).

## Example — SDK form (preferred)

```java
// libs/ccd-config-generator/.../sdk/type/CaseLink.java
@ComplexType(name = "CaseLink", generate = false)
public class CaseLink {
  @JsonProperty("CaseReference")  private String caseReference;
  @JsonProperty("ReasonForLink")  private List<ListValue<LinkReason>> reasonForLink;
  @JsonProperty("CreatedDateTime")
  @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
  private LocalDateTime createdDateTime;
  @JsonProperty("CaseType")       private String caseType;
}
```

<!-- source: libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/CaseLink.java:1-45 -->
<!-- source: apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/CaseLink.java:1-18 (service-local variant; uses single LinkReason — divergence noted above) -->

## See also

- [`docs/ccd/explanation/case-flags.md`](case-flags.md) — case flags feature, also built on standard CCD complex types
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — CCD terminology including CaseLink, ListValue, ComplexType
