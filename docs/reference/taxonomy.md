# Product-level CLAUDE.md taxonomy

CFT documentation lives **outside** each cloned repo, at the product level — `apps/<product>/CLAUDE.md`, `libs/CLAUDE.md`, `platops/CLAUDE.md`. The cloned repos themselves are upstream code we don't own and aren't going to edit; their existing READMEs and `AGENTS.md` files are left untouched.

Each product-level CLAUDE.md starts with a YAML frontmatter encoding the workspace taxonomy. The `product-analyser` subagent populates these; `scripts/index` aggregates them into `INDEX.md`. The `/find-feature` and `/list-integrations` commands consult the index.

The CLAUDE.md describes the **product** — what it is, what repos it consists of, what it does, what it integrates with, what CCD features it uses. Build commands, test runners, etc. are repo-level concerns and stay out — they live in each repo's README.

## Schema

```yaml
---
service: <product name>                   # nfdiv | pcs | ccd | xui | idam | ...
ccd_based: true | false                   # does this product use CCD as its case store?
ccd_config: json | config-generator | hybrid | none
ccd_features: [<token>, ...]              # opt-in features enabled via CCD definition or service config
integrations: [<token>, ...]              # external platforms this product talks to
repos:                                    # constituent clones, each as workspace-relative path
  - apps/<product>/<repo>
  - apps/<product>/<repo>
---
```

Omit any field you can't determine confidently. Use `[]` for empty lists. Don't invent tokens — the controlled vocabularies below are exhaustive; if a real signal doesn't fit, mention it in the body instead.

## Field reference

### `service`

Product name — matches the `apps/<product>/` segment, or `libs` / `platops` for those collections. Service-team products (`nfdiv`, `pcs`, `civil`, etc.) and shared-platform products (`ccd`, `xui`, `idam`, etc.) both use this field uniformly.

### `ccd_based`

`true` if the product holds case data via CCD or extends CCD's domain model. False for utilities, infra, libraries, standalone services, and the CCD platform itself (which *is* CCD, doesn't *use* it).

### `ccd_config`

How this product registers its CCD case-type definitions:

| Value | Signal |
|---|---|
| `json` | JSON or YAML files under a `definitions/` or `ccd-definitions/` dir. |
| `config-generator` | Build pulls `uk.gov.hmcts.ccd.sdk` / `dtsse-ccd-config-generator`; definitions emitted from Java source. |
| `hybrid` | Both signals present. |
| `none` | The product isn't CCD-based, or holds the runtime store/UI rather than a definition. |

### `ccd_features`

Opt-in CCD platform features this product enables — usually via CCD definition fields, callbacks, or service config. Universal features (event history, supplementary data) are excluded — they apply to every CCD-based service and don't disambiguate.

| Token | Means |
|---|---|
| `decentralised_ccd` | Product registers as a decentralised service; case data is stored in the service rather than `ccd-data-store-api`. |
| `notice_of_change` | NoC callbacks implemented and wired through `aac-manage-case-assignment`. |
| `case_flags` | Case-flag fields (`Flags`, `caseFlags`) configured in CCD definition. |
| `global_search` | Global Search criteria configured (`SearchCriteria`, `SearchParty` definition fields). |
| `linked_cases` | Case-link fields (`CaseLink`) and linked-cases UI hooks. |
| `hearings` | HMC integration via case definitions / HMC case fields. |
| `case_assignment` | Uses case-assignment / supplementary-access flows. |
| `roles_access_management` | Case-level RBAC configured (RAM — role assignments per case). |
| `work_allocation_tasks` | Service emits stream events that produce Work Allocation tasks. |
| `categories` | Document categories on case fields. |
| `query_search` | Elasticsearch-backed `SearchInputs`/`SearchResults` (CCD search v2). |
| `specific_access` | Request-additional-access flows. |
| `reasonable_adjustments` | RA flag fields configured. |
| `translation` | Translation Service callbacks integrated. |
| `stitching` | Em-Stitching integration for document assembly. |

### `integrations`

External platforms or shared services this product talks to:

| Token | Means |
|---|---|
| `idam` | Authenticates via IDAM. |
| `s2s` | Service-to-service auth (`service-auth-provider`); near-universal. |
| `am` | Calls Access Management (`am-role-assignment-service`). |
| `rd` | Calls Reference Data services. |
| `payment` | Calls Fees & Pay. |
| `bulk_scan` | Receives envelopes from the bulk-scan pipeline. |
| `bulk_print` | Sends documents via Bulk Print. |
| `send_letter` | Direct `send-letter-service` integration. |
| `notify` | GOV.UK Notify. |
| `cdam` | Stores documents via CDAM (Case Document Access Management). |
| `work_allocation` | Pushes to / queries `wa-task-management-api`. |
| `cftlib` | Uses `rse-cft-lib` to embed CCD in tests. |
| `flyway` | Manages its DB schema with Flyway migrations. |

### `repos`

The workspace-relative paths to the constituent clones. The same paths appear in `workspace.yaml`. This list lets `scripts/index`, `/tour`, and `/find-feature` jump from product to clones without re-parsing the manifest.

## Worked examples

```yaml
# apps/pcs/CLAUDE.md
---
service: pcs
ccd_based: true
ccd_config: config-generator
ccd_features:
  - decentralised_ccd
  - case_flags
integrations:
  - idam
  - s2s
  - payment
  - cftlib
  - flyway
repos:
  - apps/pcs/pcs-api
  - apps/pcs/pcs-frontend
---
```

```yaml
# apps/ccd/CLAUDE.md  (the CCD platform itself)
---
service: ccd
ccd_based: false        # CCD *is* the platform; it doesn't *use* CCD
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - am
repos:
  - apps/ccd/ccd-data-store-api
  - apps/ccd/ccd-definition-store-api
  - apps/ccd/ccd-admin-web
  - apps/ccd/ccd-test-definitions
  - apps/ccd/aac-manage-case-assignment
---
```

```yaml
# libs/CLAUDE.md  (workspace's collection of shared libraries)
---
service: libs
ccd_based: false
ccd_config: none
ccd_features: []
integrations: []
repos:
  - libs/ccd-config-generator
  - libs/payments-java-client
  - libs/rse-cft-lib
  - libs/properties-volume-nodejs
  - libs/rse-idam-simulator
  - libs/service-auth-provider-java-client
---
```

The body of `libs/CLAUDE.md` then has a paragraph per library — each library is its own product but they're indexed together for navigability.
