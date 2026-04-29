---
topic: linked-cases
audience: both
sources:
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/CaseLink.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/CaseLinksElement.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/LinkReason.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/dto/ccd/CaseData.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/CaseLink.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/LinkReason.java
examples_extracted_from:
  - apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/CaseLink.java
  - apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/LinkReason.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Linked Cases

## TL;DR

- Linked cases let a CCD case reference one or more other cases; the relationship is stored in a `Collection(CaseLink)` field named `caseLinks` on the case data.
- `CaseLink` is a built-in CCD complex type with fields `caseReference`, `reasonForLink` (`LinkReason`), `createdDateTime`, and `caseType`.
- `LinkReason` carries a `reason` string and an optional `otherDescription` for free-text elaboration.
- No custom callback is required — the link management UI is definition-driven; add the `caseLinks` field to an event's field list to expose it.
- The ccd-config-generator SDK ships `CaseLink` and `LinkReason` as ready-made Java types under `uk.gov.hmcts.ccd.sdk.type`.

## The CaseLink type

`CaseLink` is a standard CCD complex type. The canonical fields are:

| Field | Type | Notes |
|---|---|---|
| `caseReference` | `Text` | The 16-digit CCD case reference of the linked case |
| `reasonForLink` | `LinkReason` | Structured reason; see below |
| `createdDateTime` | `DateTime` | Populated automatically by the UI at link creation |
| `caseType` | `Text` | Case-type ID of the linked case |

`LinkReason` has two fields:

| Field | Type | Notes |
|---|---|---|
| `reason` | `Text` | Short reason code or label |
| `otherDescription` | `Text` | Free-text override when `reason` is "Other" |

In PRL the field is declared on `CaseData` as:

```java
// prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/dto/ccd/CaseData.java:712
List<CaseLinksElement<CaseLink>> caseLinks;
```

where `CaseLinksElement<T>` is a generic wrapper supplying `id` + `value` — the standard CCD collection element shape.

## Enabling linked cases in a case-type definition

1. Add a `Collection(CaseLink)` field called `caseLinks` to your case data class. With ccd-config-generator, use the SDK type `uk.gov.hmcts.ccd.sdk.type.CaseLink` as the element type and `ListValue<CaseLink>` (or a project-local `CaseLinksElement<CaseLink>`) as the collection wrapper.

2. Include `caseLinks` in the field list of the event(s) through which users will manage links. No `aboutToSubmit` or `submitted` callback is needed for the core link-storage behaviour — CCD handles persistence natively.

3. Optionally add `caseLinks` to a case tab so the linked cases panel is visible outside of events.

```java
// Example using ccd-config-generator
cfg.event("manageLinks")
   .name("Manage linked cases")
   .fields()
     .page("links")
       .field(CaseData::getCaseLinks);
```

## UI flow

When a caseworker opens an event that includes `caseLinks`:

1. CCD renders the standard **Linked cases** component.
2. The user enters a case reference and selects a reason from the `LinkReason` options.
3. On submit, CCD appends a new `CaseLinksElement` to the collection and records `createdDateTime`.
4. The linked case panel on the target case is updated automatically — no callback coordination is required on the target case type.

## Relationship to hearing-link types

PRL also defines `AutomatedHearingCaseLink`, which is used for the HMC (Hearing Management Component) integration and carries a `List<Element<AutomatedHearingCaseLinkReason>>`. This is **not** the same as the CCD linked-cases feature. Do not conflate the two:

- `CaseLink` / `caseLinks` — CCD native, drives the linked-cases UI panel.
- `AutomatedHearingCaseLink` — HMC-specific DTO, consumed by the hearing scheduling API.

## Gotchas

- If you define your own `CaseLink` POJO (as PRL does) rather than importing the SDK type, field names must exactly match CCD's `CaseLink` complex type definition. The SDK type is the safer default.
- The collection field **must** be named `caseLinks` — CCD's linked-cases UI panel keyed on that field name. A differently named collection will not render the linked-cases panel.
- `caseReference` stores the raw 16-digit reference as a string; CCD does not validate that the referenced case exists at definition time.

## Example

### Java form — `CaseLink` POJO (prl)

```java
// from apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/CaseLink.java
@Data
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@Builder(toBuilder = true)
public class CaseLink {
    private final String caseReference;
    private final LinkReason reasonForLink;
    private final DateTime createdDateTime;
    private final String caseType;
}
```

### Java form — `LinkReason` POJO (prl)

```java
// from apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/LinkReason.java
@Data
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@Builder(toBuilder = true)
public class LinkReason {
    private final String reason;
    private final String otherDescription;
}
```

<!-- source: apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/CaseLink.java:1-18 -->
<!-- source: apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caselink/LinkReason.java:1-15 -->

## See also

- [`docs/ccd/explanation/case-flags.md`](case-flags.md) — case flags feature, also built on standard CCD complex types
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — CCD terminology including CaseLink, ListValue, ComplexType
