---
name: docs-generate
description: Generate (or refresh) comprehensive documentation under apps/<product>/docs/ for any workspace product (ccd, am, xui, wa, bulk-scan, send-letter, em, payment, rd, …). Use when the user asks to populate, refresh, or extend a product's docs, or when a source repo has changed and pages need re-verifying.
---

# Generate product docs

This skill is a multi-phase pipeline that scaffolds a product's documentation tree, researches its source repos, drafts pages, augments them with HMCTS Confluence, inlines real code examples, cross-links the set, and reviews each page against its cited sources.

CCD is the original consumer (see `apps/ccd/docs/`) — it's now just one product among several. The pipeline takes a `<product>` argument and reads its per-product plan from `apps/<product>/docs/.plan.yaml`.

The static page list, per-page writing brief, and source-repo hints live in `apps/<product>/docs/.plan.yaml`. Per-page state lives in `apps/<product>/docs/.work/manifest.yaml`.

## Inputs

The skill accepts a product slug and optional flags (parse from `$ARGUMENTS`):

- `<product>` — required first positional argument. Resolves to `apps/<product>/docs/` as the docs root.
- *(no flags after product)* — run the next-incomplete phase across every page in the product's plan.
- `--phase <name>` — run a single phase: `scaffold | research | synth | confluence | examples | link | review`.
- `--page <path>` — restrict to one page (e.g. `apps/wa/docs/explanation/task-lifecycle.md`).
- `--topic <token>` — restrict to all pages tagged with that topic in `.plan.yaml`.
- `--rephase <name>` — discard the named phase's outputs and re-run from there.
- `--dry-run` — report what would happen without spawning subagents.

If the product has no `.plan.yaml`, the scaffold phase will bootstrap a starter plan from `apps/<product>/CLAUDE.md` (the product's repos and integrations seed the page list).

## State

`apps/<product>/docs/.work/manifest.yaml` — per-page status:

```yaml
pages:
  apps/<product>/docs/explanation/case-flags.md:
    topic: case-flags
    status: stub | drafted | confluence-augmented | examples-added | linked | reviewed | needs-fix
    sources: [<repo:path>, ...]
    last_run: <iso8601>
```

Re-running the skill skips pages already at the requested target status. Each phase advances pages by one status step.

`apps/<product>/docs/.work/research/` — Phase-2 research notes, one file per source repo. Phase 3 reads only these (not the source repos directly).

`apps/<product>/docs/.work/confluence/` — Phase-3.5 Confluence cache, one directory per page.

## Phases

### 1. scaffold

Read `apps/<product>/docs/.plan.yaml`. For each page:
- Create the parent directory if missing.
- If the page does not exist, write a stub with only frontmatter (`title`, `topic`, `diataxis`, `product`, `audience: both`, `sources: []`, `status: stub`) and a single `# <title>` line.
- Add or update the entry in `manifest.yaml` with `status: stub`.

Also write `apps/<product>/docs/README.md` as a minimal navigable entry point (Phase 5 fills it in further) — only if no README exists.

This phase is fast and idempotent — does not spawn subagents.

### 2. research

Read `.plan.yaml` to enumerate source repos (the `research_sources:` section). For each source repo, spawn one `source-researcher` subagent in parallel. Each subagent gets `<product>`, `<repo-slug>`, the repo's absolute path, and a focus brief; it reads its single repo and writes structured notes to `apps/<product>/docs/.work/research/<repo-slug>.md`.

Subagents are read-only and never write to `apps/<product>/docs/<page>.md`. This phase is the long pole.

### 3. synth

For each page in scope, spawn one `topic-writer` subagent (parallel). Inputs to each subagent: the page path, its brief from `.plan.yaml`, and the **filtered** research notes relevant to its topic (the orchestrator does the filtering — subagents don't read every research file).

The subagent rewrites the page with TL;DR + prose, sets frontmatter `status: drafted`, and populates `sources`.

### 3.5. confluence

For each page in scope (drafted or later), spawn one `confluence-augmenter` subagent (parallel). Each agent:

- Reads the product's optional `confluence_spaces:` hint from `apps/<product>/CLAUDE.md` to bias the search toward the right Confluence spaces.
- Searches HMCTS Confluence (via the `atlassian` MCP — see `.mcp.json` at workspace root) for pages topically relevant to the doc page.
- Fetches the most relevant 3–7, caches them under `apps/<product>/docs/.work/confluence/<page-slug>/<conf-id>.md`.
- Reconciles every behavioural claim against source code clones — source wins where the two disagree. Source roots are resolved from the product's `repos:` and `exemplar_dirs:` in CLAUDE.md.
- Updates the page: expands sections, adds missing ones, flags divergences inline (`<!-- DIVERGENCE: ... -->`) and Confluence-only claims (`<!-- CONFLUENCE-ONLY: ... -->`).
- Writes a per-page summary at `apps/<product>/docs/.work/confluence/<page-slug>/_summary.md`.

Pages flip to `status: confluence-augmented`. Skips `apps/<product>/docs/README.md` and `apps/<product>/docs/reference/glossary.md` (linker-built).

Requires the Atlassian MCP to be reachable. The agent never writes to Confluence (`READ_ONLY_MODE=true` in `.mcp.json`).

### 4. examples

Spawn one `examples-curator` agent (single-instance per product — it edits many pages). The agent reads `exemplar_dirs:` from `apps/<product>/CLAUDE.md`, walks those directories, mines real examples per feature, and inlines fenced code blocks under an `## Example` heading on each page that needs one. Each block carries a leading comment with the source path.

Pages with examples added flip to `status: examples-added`.

### 5. link

Spawn one `doc-linker` agent. It reads every drafted page, builds the glossary (if the product has enough reference content to warrant one), inserts cross-links between explanation/how-to/reference pages, and rewrites `apps/<product>/docs/README.md` as the navigable index. Pages flip to `status: linked`.

### 6. review

For each page, spawn one `doc-reviewer` subagent (parallel). It re-reads the cited source files, verifies claims, and either flips the page to `status: reviewed` or inserts inline `<!-- REVIEW: <issue> -->` comments and sets `status: needs-fix`.

The orchestrator collates the review summary and prints which pages need human attention.

## Procedure

1. Parse `$ARGUMENTS` into `product`, `phase`, `page`, `topic`, `rephase`, `dry_run`. Refuse to run if `product` is missing.
2. Verify `apps/<product>/docs/` exists (or run `_scaffold.sh <product>` to create the skeleton).
3. If `apps/<product>/docs/.plan.yaml` is missing, bootstrap one from `apps/<product>/CLAUDE.md` (repos → research_sources; integrations → suggested topics; audience defaults to `both`). Print the bootstrapped plan path and ask the user to review it before running further phases.
4. Load (or create) `apps/<product>/docs/.work/manifest.yaml`.
5. Determine the **active phase**:
   - If `--phase` set: that phase.
   - If `--rephase` set: that phase (after clearing its outputs first).
   - Otherwise: the lowest phase across in-scope pages where any page is below it.
6. Determine **in-scope pages**: filter by `--page` / `--topic` if given; otherwise all pages.
7. If `--dry-run`: print the resolved product, phase, in-scope pages, and the subagents that would be spawned. Stop.
8. Run the phase per the rules above.
9. Update `manifest.yaml`. Print a summary: pages advanced, errors, the new global status histogram.

## Concurrency

The CCD pipeline originally capped fan-out at 5; this skill removes that cap when the user has spare capacity. Send all subagent calls in a single assistant message with multiple tool uses so the harness parallelises them. Phase-3.5 (Confluence) should self-throttle if the Atlassian MCP returns HTTP 429 — back off and retry that page rather than failing the whole run.

Multiple products can run concurrently — each writes to its own `apps/<product>/docs/.work/` so there are no cross-product write conflicts.

## Don't

- Don't write into the cloned repos under `apps/` or `libs/` — read-only.
- Don't write outside `apps/<product>/docs/`, `apps/<product>/docs/.work/`, and the manifest pointer files listed in the plan.
- Don't invent topics that aren't in `.plan.yaml` — add them there first.
- Don't run the review phase before pages are at least drafted; the manifest enforces this.
- Don't re-run synth on a page that's already at `linked` or `reviewed` unless `--rephase synth` is passed (otherwise reviewer fixes get clobbered).
