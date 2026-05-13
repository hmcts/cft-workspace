---
title: Product-level CLAUDE.md taxonomy
topic: taxonomy
diataxis: reference
product: workspace
audience: both
---
# Product-level CLAUDE.md taxonomy

CFT documentation lives **outside** each cloned repo, at the product level — `apps/<product>/CLAUDE.md`, `libs/CLAUDE.md`, `platops/CLAUDE.md`. The cloned repos themselves are upstream code we don't own and aren't going to edit; their existing READMEs and `AGENTS.md` files are left untouched.

Each product-level CLAUDE.md starts with a YAML frontmatter encoding the workspace taxonomy. The `product-analyser` subagent populates these; `scripts/index` aggregates them into `INDEX.md`. The `/cft-ccd-find-feature` and `/cft-list-integrations` commands consult the index.

In parallel, every doc page under `docs/` and `apps/*/docs/` carries its own (smaller) frontmatter — `title`, `topic`, `diataxis`, `product`, `audience`. `scripts/docs-index` aggregates those into `DOCS.md` (workspace root). `/cft-explain` and `/cft-how-to` consult that index. See "Doc-page frontmatter" below for the full schema.

The CLAUDE.md describes the **product** — what it is, what repos it consists of, what it does, what it integrates with, what CCD features it uses. Build commands, test runners, etc. are repo-level concerns and stay out — they live in each repo's README.

## Schema

```yaml
---
service: <product name>                   # nfdiv | pcs | ccd | xui | idam | ...
ccd_based: true | false                   # does this product use CCD as its case store?
ccd_config: json | config-generator | hybrid | none
ccd_features: [<token>, ...]              # opt-in features enabled via CCD definition or service config
integrations: [<token>, ...]              # external platforms this product talks to
api_specs:                                # OpenAPI specs this product publishes to hmcts/cnp-api-docs
  - <repo>:<spec-filename>.json           # workspace-relative repo path + spec filename
exemplar_dirs: [<path>, ...]              # workspace-relative dirs that hold canonical examples
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

> See [`apps/ccd/docs/reference/ccd-feature-tokens.md`](../../apps/ccd/docs/reference/ccd-feature-tokens.md) for prose explaining each token, and the wider [`apps/ccd/docs/`](../../apps/ccd/docs/) tree for full CCD documentation.

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

### `api_specs`

OpenAPI specs the product's clones publish to [`hmcts/cnp-api-docs`](https://github.com/hmcts/cnp-api-docs) (cloned locally at `platops/cnp-api-docs/`). Each entry is `<repo>:<spec-filename>.json` — a workspace-relative repo path joined to the bare filename of the spec under `platops/cnp-api-docs/docs/specs/`. Omit the field for products that don't publish a spec.

Detection signals (in priority order):

1. **`.github/workflows/publish-openapi*.yml`** using `hmcts/workflow-publish-openapi-spec` — the spec filename is `<api_name>.json` where `api_name:` is the workflow input. Modern convention; one spec per repo.
2. **`.github/workflows/swagger.yml`** (legacy) — read the workflow's `git add docs/specs/<filename>.json` line(s) to discover the published filename(s). Some services (CCD data-store and definition-store) publish multiple versioned specs from one repo.
3. **A class named `*OpenAPIPublisherTest` or `SwaggerPublisherTest`** under `src/integrationTest/` — corroborates that publishing is wired even when the workflow filename varies.

If a repo's workflow declares a filename that doesn't yet appear in `platops/cnp-api-docs/docs/specs/`, list it anyway — the spec is published on `master` push and the local clone may be stale.

Example for CCD (multiple versioned specs from one repo):

```yaml
api_specs:
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v1_internal.json
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v1_external.json
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v2_internal.json
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v2_external.json
  - apps/ccd/aac-manage-case-assignment:aac-manage-case-assignment.json
  - apps/ccd/ccd-definition-store-api:ccd-definition-store-api.json
```

### `exemplar_dirs`

Workspace-relative paths to the directories that hold this product's canonical, well-curated examples of its features — usually test fixtures or SDK example projects. `/cft-find-example` greps these first before falling through to the wider product tree. Use `[]` if the product has no such curated tree yet.

| Product | Typical `exemplar_dirs` |
|---|---|
| `ccd` | `libs/ccd-config-generator/test-projects`, `apps/ccd/ccd-test-definitions` |
| `wa` | (none seeded — populate when a canonical tree is identified) |
| `xui` | (none seeded) |

### `confluence_spaces`

Optional. HMCTS Confluence space keys that hold content most relevant to this product. Consumed by the `confluence-augmenter` agent during `/docs-generate`'s Phase 3.5 to bias Confluence search via CQL `space = "<KEY>"` clauses. Empty / missing → search all accessible spaces.

| Product | Typical `confluence_spaces` |
|---|---|
| `ccd` | `[RCCD, EUI, CF]` (Reform CCD, Expert UI, Case Flags) |
| `wa` | `[WA]` |
| `am` | `[AM, RBAC]` |
| `xui` | `[EUI, EXUI]` |
| `bulk-scan` | `[BS]` |

These are hints, not constraints — the augmenter expands beyond them if hits are sparse.

### `repos`

The workspace-relative paths to the constituent clones. The same paths appear in `workspace.yaml`. This list lets `scripts/index`, `/cft-tour`, and `/cft-ccd-find-feature` jump from product to clones without re-parsing the manifest.

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
api_specs:
  - apps/pcs/pcs-api:pcs-api.json
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
exemplar_dirs:
  - libs/ccd-config-generator/test-projects
  - apps/ccd/ccd-test-definitions
repos:
  - apps/ccd/ccd-data-store-api
  - apps/ccd/ccd-definition-store-api
  - apps/ccd/ccd-admin-web
  - apps/ccd/ccd-test-definitions
  - apps/ccd/aac-manage-case-assignment
---
```

## Per-product generation plan

Each product with generated docs has an `apps/<product>/docs/.plan.yaml` describing the pages to generate, their writing briefs, and which source repos feed each page. `/docs-generate <product>` reads this plan; `_scaffold.sh <product>` walks its `pages:` keys to create stubs.

```yaml
research_sources:
  ccd-data-store-api:
    path: apps/ccd/ccd-data-store-api
    focus: "case storage, callback engine, event submission, Elasticsearch indexing"
  …

pages:
  apps/ccd/docs/explanation/callbacks.md:
    topic: callbacks
    brief: "Explain the callback contract — about-to-start, about-to-submit, mid-event, submitted. Cover request/response shape, error semantics, timeouts, S2S auth."
    sources_hint:
      - ccd-data-store-api
      - ccd-config-generator
  …
```

The plan is co-located with the docs (not in the skill directory) so each product owns its own plan independently. CCD's plan is at `apps/ccd/docs/.plan.yaml`.

## Doc-page frontmatter

Every Diátaxis page under `docs/{tutorials,how-to,reference,explanation}/` and `apps/<product>/docs/{tutorials,how-to,reference,explanation}/` carries mandatory frontmatter:

```yaml
---
title: <human-readable title>        # also used as the H1 of the page
topic: <slug>                        # kebab-case; pages on the same topic share a slug
diataxis: tutorials | how-to | reference | explanation
product: workspace | ccd | xui | wa | am | bulk-scan
audience: service-team | platform | both
---
```

`scripts/_backfill-frontmatter` populates these on existing pages and is safe to re-run (idempotent). `scripts/docs-index` aggregates them into the workspace-root `DOCS.md` and errors if any Diátaxis page is missing required fields.

`README.md` files (per Diátaxis level and at each product `docs/README.md`) are exempt from this convention — they're navigation aids, not indexed pages.

Optional fields kept where already present on CCD pages: `sources` (list of `<repo>:<path>` pointers to authoritative source code, used by `/docs-drift --mode=source`), `status` (`stub | drafted | reviewed | confluence-augmented`), `last_reviewed` (ISO 8601), `confluence` (cached Confluence metadata, used by `/docs-drift --mode=confluence`).

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
