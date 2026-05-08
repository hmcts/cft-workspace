---
topic: overview
audience: both
sources:
  - docs/reference/taxonomy.md
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence:
  - id: "1450380740"
    title: "CCD features currently in Production"
    last_modified: "unknown"
    space: "RCCD"
  - id: "294257637"
    title: "CCD Capability Map(Draft)"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1792870568"
    title: "Reform CFT CCD architecture and design overview"
    last_modified: "unknown"
    space: "RTA"
  - id: "1440500221"
    title: "Use Feature Toggles in CCD Config"
    last_modified: "unknown"
    space: "FR"
confluence_checked_at: "2026-04-29T00:00:00Z"
---

# CCD Feature Tokens

## TL;DR

- Each `ccd_features` token in a product's `CLAUDE.md` frontmatter names an opt-in CCD capability that product enables.
- Tokens drive the `/find-feature` command and `INDEX.md` aggregation — use exact spellings.
- Universal capabilities (event processing, history, audit, CRUD, callbacks, security classifications) are excluded; tokens only appear where a product has explicitly opted in to a differentiating feature.
- CCD offers 40+ out-of-the-box capabilities (see [Platform capabilities](#platform-capabilities-vs-taxonomy-tokens) below) — only the subset that disambiguates products is tracked as tokens.
- The `-nonprod` / `-prod` file convention for toggling CCD definitions per environment is unrelated to these tokens; see [Definition-level feature toggling](#definition-level-feature-toggling).

## Token reference

| Token | What it means | See also |
|---|---|---|
| `decentralised_ccd` | Product registers as a decentralised CCD service; case data stored in the service, not `ccd-data-store-api`. | [Decentralised CCD](../explanation/decentralisation.md) |
| `notice_of_change` | NoC callbacks implemented and wired through `aac-manage-case-assignment`. | [Notice of Change](../explanation/notice-of-change.md) |
| `case_flags` | Case-flag fields (`Flags`, `caseFlags`) configured in CCD definition; surfaced in XUI flag UI. | [Case flags](../explanation/case-flags.md) |
| `reasonable_adjustments` | Reasonable Adjustment (`RA`) flag fields configured; subset of the case-flags model. | [Case flags](../explanation/case-flags.md) |
| `global_search` | `SearchCriteria` / `SearchParty` definition fields configured; cases surfaced in Global Search. | [Global search](../explanation/search-architecture.md) |
| `query_search` | Elasticsearch-backed `SearchInputs` / `SearchResults` configured (CCD search v2). | [Search](../explanation/search-architecture.md) |
| `linked_cases` | `CaseLink` complex-type fields and linked-cases UI hooks present in the definition. | [Linked cases](../explanation/linked-cases.md) |
| `hearings` | HMC integration via HMC case fields or hearing-related callbacks. | [Hearings](../explanation/hearings-integration.md) |
| `roles_access_management` | Case-level RBAC configured via AM (`am-role-assignment-service`). | [Role assignment](../explanation/role-assignment.md) |
| `work_allocation_tasks` | Service emits stream events that produce Work Allocation tasks via `wa-task-management-api` (the `integrations` token `work_allocation` means pushing to/querying WA — this `ccd_features` token means the CCD events are instrumented). | [Work allocation](../explanation/work-allocation-integration.md) |
| `stitching` | Em-Stitching integration for document assembly / bundling. | [Stitching](../explanation/stitching.md) |
| `translation` | Translation Service callbacks integrated for bilingual case content. | [Translation](../explanation/translation.md) |
| `categories` | Document categories configured on case fields. | [Documents & CDAM](../explanation/documents-and-cdam.md) |
| `specific_access` | Request-additional-access flows (Specific Access) configured. | [Role assignment](../explanation/role-assignment.md) |
| `case_assignment` | Uses case-assignment / supplementary-access flows via `aac-manage-case-assignment`. | [Notice of Change](../explanation/notice-of-change.md) |

## Usage in CLAUDE.md frontmatter

```yaml
ccd_features:
  - case_flags
  - global_search
  - work_allocation_tasks
```

List only tokens the product has actively configured. Omit universal features. Spell tokens exactly as above — `scripts/index` and `/find-feature` match on exact strings.

## Platform capabilities vs taxonomy tokens

CCD provides over 40 out-of-the-box platform capabilities that any service can use. The taxonomy tokens above are a deliberately small subset — only features that **differentiate** products and represent an explicit opt-in configuration step.

<!-- CONFLUENCE-ONLY: not verified in source -->
The following capabilities are considered **universal** (available to all CCD-based services without explicit opt-in) and are therefore excluded from the token vocabulary:

| Universal capability | Notes |
|---|---|
| Event processing & state transitions | Every CCD case type has events |
| Callbacks (about-to-start, about-to-submit, submitted) | Opt-in per event, but near-universal in practice |
| CRUD authorisation (field/event-level ACLs) | Configured in every definition |
| Security classifications (Public / Private / Restricted) | Mandatory part of every definition |
| Case history & audit log | Built-in, no configuration needed |
| Case creation (API and UI) | Baseline capability |
| Workbasket & search result configuration | Near-universal; every service configures these |
| Document upload & viewing | Standard field type; `documents` removed as token because near-universal |
| Supplementary data map | Available to all services; used broadly for WA metadata |
| Show conditions | Configuration-based field/page visibility |
| Check your answers / summary page | Configurable per event |
| Optimistic locking | Built-in |
| Save & Resume (drafts) | Platform feature, no per-service opt-in |
| Dynamic lists | Standard field type |
| Field interpolation | Configuration feature available to all |
| Conditional post-event states | Configuration feature |
| Regular expressions on fields | Configuration feature |
| Retain Hidden Value | Configuration feature |
| Collection Table View | UI rendering option |

This list is derived from the "CCD features currently in Production" Confluence page (RCCD space) which catalogues the full feature set.

## Definition-level feature toggling

The workspace taxonomy tokens should not be confused with CCD **definition-level feature toggling** — a pattern used by service teams to gate definition changes per environment.

The convention (originated by FPLA, widely adopted):

1. Create a directory named after the definition sheet (e.g. `AuthorisationCaseEvent/`).
2. Place the base `.json` file inside it.
3. Add a `-nonprod.json` variant for changes that should only apply in AAT/Demo (excluded from Production config generation).
4. Optionally add a `-prod.json` variant for Production-only overrides.

This is a build-time file-inclusion mechanism controlled by the definition generation script (e.g. `build-release-ccd-definition.sh`). It has no relation to the `ccd_features` taxonomy tokens — those describe *what* capabilities a service uses, not *where* they are deployed.

## See also

- [`docs/reference/taxonomy.md`](../../reference/taxonomy.md) — full schema for product CLAUDE.md frontmatter including `integrations` and `ccd_config` fields
- [`INDEX.md`](../../../INDEX.md) — aggregated view of which products use which tokens
