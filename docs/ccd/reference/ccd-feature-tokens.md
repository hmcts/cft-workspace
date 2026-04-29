---
topic: overview
audience: both
sources:
  - docs/reference/taxonomy.md
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# CCD Feature Tokens

## TL;DR

- Each `ccd_features` token in a product's `CLAUDE.md` frontmatter names an opt-in CCD capability that product enables.
- Tokens drive the `/find-feature` command and `INDEX.md` aggregation — use exact spellings.
- Universal capabilities (event history, audit) are excluded; tokens only appear where a product has explicitly opted in.

## Token reference

| Token | What it means | See also |
|---|---|---|
| `events` | Case-type defines custom events that drive state transitions. | [Events & callbacks](../explanation/events-and-callbacks.md) |
| `callbacks` | Service exposes `about-to-start`, `about-to-submit`, or `submitted` callback endpoints wired in the case definition. | [Events & callbacks](../explanation/events-and-callbacks.md) |
| `permissions` | Fine-grained field- or event-level ACLs configured in the CCD definition beyond the defaults. | [Permissions](../explanation/permissions.md) |
| `roles_access_management` | Case-level RBAC configured via AM (`am-role-assignment-service`). | [Role assignment](../explanation/role-assignment.md) |
| `notice_of_change` | NoC callbacks implemented and wired through `aac-manage-case-assignment`. | [Notice of Change](../explanation/notice-of-change.md) |
| `case_flags` | Case-flag fields (`Flags`, `caseFlags`) configured in CCD definition; surfaced in XUI flag UI. | [Case flags](../explanation/case-flags.md) |
| `reasonable_adjustments` | Reasonable Adjustment (`RA`) flag fields configured; subset of the case-flags model. | [Case flags](../explanation/case-flags.md) |
| `work_basket` | `WorkBasketInputFields` and `WorkBasketResultFields` configured so cases appear in the CCD work-basket. | [Work basket](../explanation/work-basket.md) |
| `global_search` | `SearchCriteria` / `SearchParty` definition fields configured; cases surfaced in Global Search. | [Global search](../explanation/global-search.md) |
| `query_search` | Elasticsearch-backed `SearchInputs` / `SearchResults` configured (CCD search v2). | [Search](../explanation/global-search.md) |
| `linked_cases` | `CaseLink` complex-type fields and linked-cases UI hooks present in the definition. | [Linked cases](../explanation/linked-cases.md) |
| `documents` | Case fields of type `Document` or `Collection<Document>`; CDAM integration for access control. | [Documents & CDAM](../explanation/documents.md) |
| `supplementary_data` | Supplementary-data fields (`supplementaryData` map) used — e.g. for Work Allocation metadata. | [Supplementary data](../explanation/supplementary-data.md) |
| `decentralised_ccd` | Product registers as a decentralised CCD service; case data stored in the service, not `ccd-data-store-api`. | [Decentralised CCD](../explanation/decentralisation.md) |
| `hearings` | HMC integration via HMC case fields or hearing-related callbacks. | [Hearings](../explanation/hearings.md) |
| `work_allocation_tasks` | Service emits stream events that produce Work Allocation tasks via `wa-task-management-api` (the `integrations` token `work_allocation` means pushing to/querying WA — this `ccd_features` token means the CCD events are instrumented). | [Work allocation](../explanation/work-allocation-integration.md) |
| `stitching` | Em-Stitching integration for document assembly / bundling. | [Stitching](../explanation/stitching.md) |
| `translation` | Translation Service callbacks integrated for bilingual case content. | [Translation](../explanation/translation.md) |

## Usage in CLAUDE.md frontmatter

```yaml
ccd_features:
  - case_flags
  - global_search
  - work_allocation
```

List only tokens the product has actively configured. Omit universal features. Spell tokens exactly as above — `scripts/index` and `/find-feature` match on exact strings.

## See also

- [`docs/reference/taxonomy.md`](../../reference/taxonomy.md) — full schema for product CLAUDE.md frontmatter including `integrations` and `ccd_config` fields
- [`INDEX.md`](../../../INDEX.md) — aggregated view of which products use which tokens
