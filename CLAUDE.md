# cft-workspace

Workspace-level guidance for Claude Code. The user is an HMCTS engineer using this workspace to navigate, search, and modify across many CFT repos at once.

## What this repo is

This repo (`hmcts/cft-workspace`) tracks **scaffolding only** — devcontainer, scripts, Claude assets, docs, and the manifest. The actual HMCTS source lives in independently-cloned repos under `apps/`, `libs/`, `platops/`. Those clones are gitignored at this level — never `git add` their contents, never assume the workspace repo is a monorepo.

```
apps/<product>/<repo>      # CFT apps — both shared platform (ccd/, xui/, idam/, …)
                        # and service-team (nfdiv/, pcs/, …)
libs/<repo>             # Java/Node clients & shared starters
platops/<repo>          # flux, dns, jenkins, AKS, plumbing
workspace.yaml          # manifest of every repo this workspace pulls in
INDEX.md                # generated taxonomy matrix (scripts/index)
scripts/                # bootstrap, sync, doctor, add-repo, grep, index
docs/                   # tutorials / how-to / reference / explanation (Diátaxis)
```

Every clone is its own git repo with its own VCS history, build system, README, and conventions. Treat each as standalone. There is **no** top-level build, dependency graph, or cross-repo tooling beyond what's in `scripts/`.

## Working inside a clone

`cd` into the specific clone before running build/test commands. Each has its own `gradlew` or `package.json`. Consult its `README.md` and any `AGENTS.md`/`CLAUDE.md` for project-specific conventions.

General patterns:
- **Java/Gradle**: use the project's `./gradlew` wrapper. Common targets: `./gradlew build`, `./gradlew test`, `./gradlew test --tests <FQTN>`, `./gradlew bootRun`. Many ship `integration-tests/`, `aat/`, or `functional-tests` source sets — check `build.gradle` for the exact task names.
- **Node/Yarn frontends**: `yarn install`, `yarn start`, `yarn test`, `yarn lint`.
- Several clones ship `docker-compose.yml` for local dependencies.

## CCD documentation

CCD is the case-data spine of most service-team products in this workspace, and has its own dedicated documentation tree at [`docs/ccd/`](docs/ccd/) covering case-type model, events/callbacks, permissions, decentralisation, documents/CDAM, search, NoC, case flags, work-basket, and more. Maintained by `/generate-ccd-docs`. Companion skills: `/ccd-explain`, `/ccd-find-example`, `/ccd-trace-callback`, `/ccd-doc-drift`.

## Cross-repo relationships

These projects build independently but are tightly related at runtime / by domain:

- **CCD** (`apps/ccd/*`) is the Core Case Data platform. `ccd-definition-store-api` holds case-type definitions; `ccd-data-store-api` holds case data.
- **`apps/ccd/aac-manage-case-assignment`** powers Notice of Change and case-assignment flows that complement CCD.
- **`libs/ccd-config-generator`** is the Java SDK service teams use to generate CCD definition spreadsheets/JSON consumed by `ccd-definition-store-api`. See its `AGENTS.md`.
- **`libs/rse-cft-lib`** (cftlib) bundles CCD + dependencies so service teams can run the CFT stack in-process for tests.
- **PCS** (`apps/pcs/*`): possession claims service. `pcs-api` is the Spring Boot backend; `pcs-frontend` the Express/TS user-facing app.
- **`libs/payments-java-client`** is consumed by services that integrate with HMCTS Payments.

When making a change in one repo that another consumes, the dependency is via published artifacts (Jenkins / JitPack) — there is no source-level wiring across these directories.

## Per-product taxonomy

Each product (`apps/<product>/`, `libs/`, `platops/`) carries a generated `CLAUDE.md` whose frontmatter encodes the workspace taxonomy — `service`, `ccd_based`, `ccd_config`, `ccd_features`, `integrations`, `repos`. See [`docs/reference/taxonomy.md`](docs/reference/taxonomy.md) for the schema.

The body of each product CLAUDE.md describes the **product** (what it does, how its repos fit together, key integration points) — not per-repo build commands, which stay in each clone's own README/AGENTS.md.

The `/generate-product-claude-md` command (re-runnable) populates these. `scripts/index` aggregates them into `INDEX.md`. Use `INDEX.md` first when answering "which products use X?" — it's much cheaper than searching every clone.

## Workspace conventions

- **Workspace repo never tracks clone contents.** If you find yourself about to `git add apps/<product>/<repo>/<file>`, stop — that's a clone-local change and belongs in that repo's commit history, not the workspace's.
- **`scripts/sync` is non-destructive** — it skips dirty / branched / unpushed clones. Treat clone-local WIP as the user's working state.
- **Add a repo** via `scripts/add-repo <path> <org/repo>`, not by hand-editing `workspace.yaml` and re-running bootstrap (the script keeps the two in sync).

## Cross-repo searches

Prefer `./scripts/grep <pattern>` over raw `rg` — it has the right excludes (`node_modules`, `build`, `.gradle`, `target`, `dist`, `.terraform`, lock files, etc.) baked in. For taxonomy-keyed queries ("all repos using Notice of Change"), use the `/find-feature` and `/list-integrations` commands; they consult `INDEX.md` rather than blindly grepping.
