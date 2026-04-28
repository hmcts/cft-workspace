# Per-repo CLAUDE.md taxonomy

Every cloned repo in the workspace should carry a `CLAUDE.md` whose first block is a YAML frontmatter encoding the workspace taxonomy. The `repo-analyser` subagent populates these; `scripts/index` aggregates them into `INDEX.md`. The `/find-feature` and `/list-integrations` commands consult the index.

## Schema

```yaml
---
service: <area or service team>
type: java-api | node-frontend | terraform | ccd-definitions | library | infra
ccd_based: true | false
ccd_config: json | config-generator | hybrid | none
decentralised: true | false
ccd_features: [<token>, ...]
integrations: [<token>, ...]
runtime: <runtime token>
build: gradle | yarn | npm | terraform
---
```

Omit fields you can't determine confidently. Use `[]` for empty lists. Don't invent tokens — the controlled vocabulary is below.

## Field reference

### `service`

The area or service team this repo belongs to. Match the `apps/<area>/` segment of its workspace path. Special values:
- `shared` — the repo isn't owned by a single service team (true for most platform components, e.g. ccd, xui, idam).
- `platops` — repos under `platops/`.

### `type`

| Value | When to use |
|---|---|
| `java-api` | Spring Boot REST API (any flavour). |
| `node-frontend` | Express/Hapi/Next user-facing web app. |
| `terraform` | Infrastructure-as-code (`*.tf` files at root). |
| `ccd-definitions` | Holds CCD case-type JSON/YAML definitions and little else. |
| `library` | Java/Node library published as an artefact, not run as a service. |
| `infra` | Other ops-y repos (Helm charts, build tools). |

### `ccd_based`

`true` if the service holds case data via CCD or extends CCD's domain model. False for utilities, infra, libraries, and standalone services.

### `ccd_config`

How this service registers its CCD case-type definitions:

| Value | Signal |
|---|---|
| `json` | JSON or YAML files under a `definitions/<service>/` or `ccd-definitions/` dir. |
| `config-generator` | Build pulls `uk.gov.hmcts.ccd.sdk` (the `ccd-config-generator` library); definitions are emitted from Java source. |
| `hybrid` | Both signals present. |
| `none` | The repo isn't CCD-based, or holds the runtime store (CCD itself), not a definition. |

### `decentralised`

`true` if the service uses the decentralised CCD model — definitions live in the service repo and are registered per-service rather than centrally in `ccd-definition-store-api`.

### `ccd_features`

CCD platform features this repo uses. Controlled vocabulary:

- `case_flags`
- `notice_of_change`
- `global_search`
- `hearings`
- `linked_cases`
- `case_assignment`
- `roles_access_management`
- `event_history`
- `supplementary_data`

If you spot a feature not in this list, mention it in the body — don't invent a new token.

### `integrations`

External platforms this service talks to. Controlled vocabulary:

| Token | Means |
|---|---|
| `work_allocation` | Pushes/consumes WA tasks (`wa-task-management-api`). |
| `bulk_scan` | Receives envelopes from the bulk-scan pipeline. |
| `bulk_print` | Sends documents via Bulk Print / Send Letter. |
| `payment` | Calls Fees & Pay. |
| `send_letter` | Direct `send-letter-service` integration. |
| `notify` | GOV.UK Notify. |
| `idam` | Authenticates via IDAM. |
| `cdam` | Stores documents via CDAM (Case Document Access Management). |
| `am` | Calls Access Management (`am-role-assignment-service`). |
| `rd` | Calls Reference Data services. |

### `runtime`

The major runtime+framework. Examples: `java-21-spring-boot`, `java-17-spring-boot`, `node-22-express`, `node-20-nestjs`, `terraform-1.6`. Use the version actually present in `Dockerfile`/`build.gradle`/`package.json` — don't normalise.

### `build`

The build system: `gradle`, `yarn`, `npm`, `terraform`. Pick one — repos with multiple are rare and the dominant one wins.

## Worked examples

```yaml
# apps/nfdiv/nfdiv-case-api
service: nfdiv
type: java-api
ccd_based: true
ccd_config: config-generator
decentralised: false
ccd_features: [case_flags, notice_of_change, global_search]
integrations: [work_allocation, payment, notify, idam, cdam, am]
runtime: java-21-spring-boot
build: gradle
```

```yaml
# apps/ccd/ccd-data-store-api
service: ccd
type: java-api
ccd_based: true
ccd_config: none      # holds the runtime store, not a definition
decentralised: false
ccd_features: []
integrations: [idam, am]
runtime: java-21-spring-boot
build: gradle
```

```yaml
# libs/ccd-config-generator
service: shared
type: library
ccd_based: false      # generates definitions, doesn't hold case data
ccd_config: none
decentralised: false
ccd_features: []
integrations: []
runtime: java-21
build: gradle
```
