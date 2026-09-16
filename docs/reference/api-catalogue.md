---
title: OpenAPI catalogue
topic: api-catalogue
diataxis: reference
product: workspace
audience: both
---
# OpenAPI catalogue

HMCTS services publish their OpenAPI specs to a central registry, [`hmcts/cnp-api-docs`](https://github.com/hmcts/cnp-api-docs). This workspace clones that registry locally at `platops/cnp-api-docs/` so developers and agents can browse, grep, and link to specs without going through the hosted site for every lookup.

`reform-api-docs` resolves to the same repository via GitHub's rename redirect, so a reference to that name in an older script points at this registry rather than a separate one.

## What's in the registry

- **`platops/cnp-api-docs/docs/specs/*.json`** — ~180 OpenAPI spec files (mostly OpenAPI 3.x; a few legacy Swagger 2.0). One file per published API; some services publish several (e.g. `ccd-data-store-api` publishes four versioned variants).
- **Hosted view** — the same files rendered at <https://hmcts.github.io/cnp-api-docs/>: a per-product page (`/products/<product>/`), a Swagger UI per spec (`/api/<service>/`), an architecture/dependency explorer (`/architecture/`), and a registry-health report (`/health/`) that buckets every spec as fresh, ageing, stale, unpublished, or never-published.

The whole site is generated from `docs/specs/*.json`. There is no hand-maintained registry file, service-group metadata or Low Level Design page to edit — publishing a spec is the only step needed for a service to appear. Older bookmarks still resolve: `swagger.html?url=...` and `lld/<product>.html` redirect to the equivalent `/api/<service>/` or `/products/<product>/` page, as does `groups/<product>/`.

The local clone is kept current by `./scripts/sync platops/cnp-api-docs` and is non-destructive.

## How specs are published

Each service repo owns its own publish pipeline. Three patterns are in use across this workspace:

1. **Modern, reusable workflow** (recommended; ~20 workspace repos).
   `.github/workflows/publish-openapi.yaml` delegates to `hmcts/workflow-publish-openapi-spec`:

   ```yaml
   # apps/pcs/pcs-api/.github/workflows/publish-openapi.yaml
   jobs:
     publish-openapi:
       uses: hmcts/workflow-publish-openapi-spec/.github/workflows/publish-openapi.yml@main
       secrets:
         SWAGGER_PUBLISHER_API_TOKEN: ${{ secrets.SWAGGER_PUBLISHER_API_TOKEN }}
       with:
         test_to_run: 'uk.gov.hmcts.reform.pcs.openapi.OpenAPIPublisherTest'
         java_version: 21
         api_name: pcs-api      # → docs/specs/pcs-api.json
   ```

   The repo includes an integration-test class (commonly named `*OpenAPIPublisherTest`) that boots the Spring context and writes the spec to a fixed path consumed by the reusable workflow.

2. **Legacy, bespoke workflow** (CCD platform repos and a few others).
   `.github/workflows/swagger.yml` runs a `SwaggerGeneratorTest`, clones `cnp-api-docs`, copies the generated JSON into `docs/specs/`, and pushes a commit. Used by services that publish more than one spec from a single repo (the CCD data store publishes v1/v2 × internal/external).

   ```yaml
   # apps/ccd/ccd-data-store-api/.github/workflows/publish-swagger-specs.yml (excerpt)
   - run: ./gradlew test --tests uk.gov.hmcts.ccd.swagger.SwaggerGeneratorTest
   - run: |
       echo "$(cat /tmp/ccd-data-store-api.v1_internal.json)" > docs/specs/ccd-data-store-api.v1_internal.json
       echo "$(cat /tmp/ccd-data-store-api.v2_internal.json)" > docs/specs/ccd-data-store-api.v2_internal.json
       # …commits and pushes to hmcts/cnp-api-docs
   ```

3. **Composite action + reusable workflow** (`hmcts/cnp-githubactions-library`, `publish-openapi-spec`), for repos that would rather not hand-roll the git push. The composite action takes a path to an already-generated JSON spec and publishes it; a thin reusable workflow wraps it with checkout → optional `generate-command` → publish. It sets up no toolchain deliberately — generating the spec (Gradle, yarn, a bare `curl`) is entirely the caller's job.

   The publish token needs care because a **composite action cannot read the `secrets` context at all** — GitHub only exposes `secrets` to reusable workflows, so a composite action must receive a token as an explicit input or an ambient env var. This action reads the org-level `SWAGGER_PUBLISHER_API_TOKEN` from the environment by default (the reusable workflow sets it once as job-level `env`, so its callers pass no token), with an `api-token` input as an override for a different secret. If you call the composite action directly inside your own multi-step job instead of via the reusable workflow, keep the token on the action's input rather than job-level `env` — job-level `env` exposes it to every other step in that job, including a preceding `yarn install`/`./gradlew` that runs third-party lifecycle scripts.

The hosted Swagger UI for any spec is:

```
https://hmcts.github.io/cnp-api-docs/api/<service-name>/
```

## How the workspace links products to specs

Each per-product `CLAUDE.md` declares an `api_specs:` list in its frontmatter — see [`taxonomy.md`](taxonomy.md#api_specs):

```yaml
# apps/ccd/CLAUDE.md
api_specs:
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v1_internal.json
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v1_external.json
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v2_internal.json
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v2_external.json
  - apps/ccd/aac-manage-case-assignment:aac-manage-case-assignment.json
  - apps/ccd/ccd-definition-store-api:ccd-definition-store-api.json
```

The `product-analyser` subagent populates the field by detecting the workflow patterns above; `scripts/index` aggregates the counts into the `APIs` column of [`INDEX.md`](../../INDEX.md). The `/cft-find-endpoint` and `/cft-api-spec` skills use the mapping to resolve a spec back to its owning product.

## Skills

Two read-only skills operate over the local clone. They never hit the network; refresh stale specs with `./scripts/sync platops/cnp-api-docs`.

| Skill | What it does | Example |
|---|---|---|
| [`/cft-find-endpoint`](../../.claude/skills/cft-find-endpoint/SKILL.md) | Search every spec for a path pattern (optionally filtered by HTTP method). Returns the spec filename, methods, owning product, local file path, and hosted Swagger UI link. | `/cft-find-endpoint POST /cases/{caseId}/events` |
| [`/cft-api-spec`](../../.claude/skills/cft-api-spec/SKILL.md) | Summarise one spec: title, version, OpenAPI version, server, endpoint count by tag, auth schemes, owning product, local file path, hosted UI link. | `/cft-api-spec pcs-api` |

For workspace-wide grep across spec contents (not just paths), `./scripts/grep <pattern> platops/cnp-api-docs/` works — the script's excludes don't touch JSON.

## Adding a new spec to the workspace

There is nothing to do at the workspace level. Once a service repo pushes a spec to `hmcts/cnp-api-docs`, the next `./scripts/sync platops/cnp-api-docs` pulls it down. To wire it into the workspace's product taxonomy:

1. Re-run `/docs-generate-product-md <product>` — the analyser detects the publish workflow and updates `api_specs:`.
2. Re-run `./scripts/index` (or `/workspace-index`) to refresh `INDEX.md`.

## Caveats

- This workspace clones roughly half of the services publishing to the registry. `/cft-find-endpoint` will surface paths from specs whose source repo isn't in this workspace — they're labelled `(not in workspace)`.
- A few services have historical duplicate spec files (e.g. `pcs-api.json`, `pcsAPI.json`, `pcs-backend-api.json`). The catalogue treats them as distinct artifacts; only `pcs-api.json` corresponds to the current `apps/pcs/pcs-api` repo.
- The `docs/specs/*.json` paths and filenames are a frozen contract, not just a serving convention for the hosted site. Terraform reads spec files directly from `raw.githubusercontent.com/hmcts/cnp-api-docs/master/docs/specs/*.json` at `apply` time to register APIs in Azure API Management, bypassing GitHub Pages entirely — renaming or restructuring that directory breaks infrastructure outside this repo, not just doc links.
- Refreshing the clone (`./scripts/sync platops/cnp-api-docs`) is the only way to pick up new specs. There is no drift-detection skill yet — adding one is on the Phase-2 roadmap.
