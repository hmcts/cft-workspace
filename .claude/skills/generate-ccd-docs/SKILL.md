---
name: generate-ccd-docs
description: Generate (or refresh) the comprehensive CCD documentation under docs/ccd/. Runs in resumable phases (scaffold → research → synth → examples → link → review), fanning out specialised CCD subagents in parallel. Use when the user asks to populate, refresh, or extend CCD docs, or when a CCD source repo has changed and pages need re-verifying.
---

# Generate CCD docs

CCD is the case-data spine of most CFT services. The documentation under `docs/ccd/` is generated and maintained by this skill — a multi-phase orchestrator that fans out specialised subagents (`ccd-source-researcher`, `ccd-topic-writer`, `ccd-examples-curator`, `ccd-doc-linker`, `ccd-doc-reviewer`) over the CCD platform repos, the `ccd-config-generator` SDK, and several reference service implementations.

The static page list, per-page writing brief, and source-repo hints live in [`plan.yaml`](plan.yaml). Per-page state lives in `docs/ccd/.work/manifest.yaml`.

## Inputs

The skill accepts flags (parse from `$ARGUMENTS`):

- *(no flags)* — run the next-incomplete phase across every page in `plan.yaml`.
- `--phase <name>` — run a single phase: `scaffold | research | synth | confluence | examples | link | review`.
- `--page <path>` — restrict to one page (e.g. `docs/ccd/explanation/case-flags.md`).
- `--topic <token>` — restrict to all pages tagged with that topic in `plan.yaml`.
- `--rephase <name>` — discard the named phase's outputs and re-run from there.
- `--dry-run` — report what would happen without spawning subagents.

## State

`docs/ccd/.work/manifest.yaml` — per-page status:

```yaml
pages:
  docs/ccd/explanation/case-flags.md:
    topic: case-flags
    status: stub | drafted | confluence-augmented | examples-added | linked | reviewed | needs-fix
    sources: [<repo:path>, ...]
    last_run: <iso8601>
```

Re-running the skill skips pages already at the requested target status. Each phase advances pages by one status step.

`docs/ccd/.work/research/` — Phase-2 research notes, one file per source repo. Phase 3 reads only these (not the source repos directly).

## Phases

### 1. scaffold

Read `plan.yaml`. For each page:
- Create the parent directory if missing.
- If the page does not exist, write a stub with only frontmatter (`topic`, `audience: both`, `sources: []`, `status: stub`) and a single `# <title>` line.
- Add or update the entry in `manifest.yaml` with `status: stub`.

Also write `docs/ccd/README.md` as a minimal navigable entry point (Phase 5 fills it in further).

This phase is fast and idempotent — does not spawn subagents.

### 2. research

Read `plan.yaml` to enumerate source repos. For each source repo, spawn one `ccd-source-researcher` subagent in parallel (cap concurrency at 5). Each subagent reads its single repo and writes structured notes to `docs/ccd/.work/research/<repo-slug>.md`.

Subagents are read-only and never write to `docs/ccd/<page>.md`. This phase is the long pole.

### 3. synth

For each page in scope, spawn one `ccd-topic-writer` subagent (parallel, cap 5). Inputs to each subagent: the page path, its brief from `plan.yaml`, and the **filtered** research notes relevant to its topic (the orchestrator does the filtering — subagents don't read every research file).

The subagent rewrites the page with TL;DR + prose, sets frontmatter `status: drafted`, and populates `sources`.

### 3.5. confluence

For each page in scope (drafted or later), spawn one `ccd-confluence-augmenter` subagent (parallel, **cap 10** — Confluence rate-bound, not CPU/token-bound). Each agent:

- Searches HMCTS Confluence (via the `atlassian` MCP — see `.mcp.json` at workspace root) for pages topically relevant to the doc page.
- Fetches the most relevant 3–7, caches them under `docs/ccd/.work/confluence/<page-slug>/<conf-id>.md`.
- Reconciles every behavioural claim against source code clones — source wins where the two disagree.
- Updates the page: expands sections, adds missing ones, flags divergences inline (`<!-- DIVERGENCE: ... -->`) and Confluence-only claims (`<!-- CONFLUENCE-ONLY: ... -->`).
- Writes a per-page summary at `docs/ccd/.work/confluence/<page-slug>/_summary.md`.

Pages flip to `status: confluence-augmented`. Skips `docs/ccd/README.md` and `docs/ccd/reference/glossary.md` (linker-built).

Requires the Atlassian MCP to be reachable. The agent never writes to Confluence (`READ_ONLY_MODE=true` in `.mcp.json`).

### 4. examples

Spawn one `ccd-examples-curator` agent (single-instance — it edits many pages). The agent walks `apps/ccd/ccd-test-definitions/` and `libs/ccd-config-generator/test-projects/`, mines real examples per feature, and inlines fenced `json` and/or `java` blocks under an `## Example` heading on each page that needs one. Each block carries a leading comment with the source path.

Pages with examples added flip to `status: examples-added`.

### 5. link

Spawn one `ccd-doc-linker` agent. It reads every drafted page, builds the glossary, inserts cross-links between explanation/how-to/reference pages, and rewrites `docs/ccd/README.md` as the navigable index. Pages flip to `status: linked`.

### 6. review

For each page, spawn one `ccd-doc-reviewer` subagent (parallel, cap 5). It re-reads the cited source files, verifies claims, and either flips the page to `status: reviewed` or inserts inline `<!-- REVIEW: <issue> -->` comments and sets `status: needs-fix`.

The orchestrator collates the review summary and prints which pages need human attention.

## Procedure

1. Parse `$ARGUMENTS` into `phase`, `page`, `topic`, `rephase`, `dry_run`.
2. Load (or create) `docs/ccd/.work/manifest.yaml`.
3. Determine the **active phase**:
   - If `--phase` set: that phase.
   - If `--rephase` set: that phase (after clearing its outputs first).
   - Otherwise: the lowest phase across in-scope pages where any page is below it.
4. Determine **in-scope pages**: filter by `--page` / `--topic` if given; otherwise all pages.
5. If `--dry-run`: print the resolved phase, in-scope pages, and the subagents that would be spawned. Stop.
6. Run the phase per the rules above.
7. Update `manifest.yaml`. Print a summary: pages advanced, errors, the new global status histogram.

## Concurrency

Cap parallel subagents at 5 (matches `generate-product-claude-md`). When spawning, send all calls in a single assistant message with multiple tool uses.

**Exception**: the `confluence` phase caps at 10. The user has confirmed plenty of CPU and tokens; Confluence rate is the binding constraint, and ~10 concurrent ~5-fetch jobs stays under typical self-hosted Confluence rate limits.

## Don't

- Don't write into the cloned repos under `apps/` or `libs/` — read-only.
- Don't write outside `docs/ccd/`, `docs/ccd/.work/`, and the manifest pointer files listed in the plan.
- Don't invent topics that aren't in `plan.yaml` — add them there first.
- Don't run the review phase before pages are at least drafted; the manifest enforces this.
- Don't re-run synth on a page that's already at `linked` or `reviewed` unless `--rephase synth` is passed (otherwise reviewer fixes get clobbered).
