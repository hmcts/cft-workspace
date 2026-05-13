---
name: docs-drift
description: Detect documentation drift across the workspace. Three modes — source-citation (sources: frontmatter vs cited file SHAs), port-manifest (docs/ vs upstream platops/hmcts.github.io), Confluence-revision (cached Confluence pages vs current revisions). Use when the user asks "what docs need updating?", periodically as a maintenance check, or after pulling new commits into a source repo.
---

# Doc drift

Reports drift between the workspace's documentation and its authoritative sources. Replaces the old `/docs-ccd-drift` (source-citation only) and `/docs-hmcts-way-drift` (port-manifest only) skills with a single dispatcher.

A page can declare its authoritative source in three ways. The skill checks each that applies:

| Signal on the page | Mode | Check |
|---|---|---|
| `sources:` list in frontmatter | source-citation | git SHA of each cited source file vs `sources_sha:` map (or fresh if no recorded SHA) |
| Listed in `docs/.port-manifest.yaml` | port-manifest | `git log <synced_sha>..HEAD -- <upstream-source>` against `platops/hmcts.github.io` |
| `confluence:` array in frontmatter | Confluence-revision | Current Confluence page revision via MCP vs `confluence_checked_at:` |

## How to invoke

```
/docs-drift                       # all three modes, all pages
/docs-drift <product>             # restrict to apps/<product>/docs/, or `workspace` for root docs
/docs-drift --mode=source         # source-citation only
/docs-drift --mode=port           # port-manifest only (workspace docs only)
/docs-drift --mode=confluence     # Confluence-revision only
/docs-drift --pull                # port mode: ff-pull upstream first, then check
```

The first three modes are run by `scripts/doc-drift`. The Confluence mode is split: the script lists the candidate pages (with their `confluence_checked_at:` timestamps), and this skill iterates them, calling `mcp__atlassian__confluence_get_page_history` per cached page ID to compare revisions.

## Procedure

### 1. Run the script for port + source + confluence-listing

```bash
./scripts/doc-drift --mode=auto [--product=<slug>] [--pull]
```

Capture stdout. The script prints sectioned output:
- `=== port mode (...) ===` — counts and per-page lines for in-sync / needs-update / removed-upstream / new-upstream
- `=== source mode ===` — counts and per-page lines for fresh / stale / broken / untracked
- `=== confluence mode ===` — list of pages with `confluence:` frontmatter and their last-check timestamps

### 2. For each page listed in the confluence section, check revisions

If the user requested `--mode=confluence` (or no `--mode` was set), iterate the pages and for each:

1. Read the page's frontmatter `confluence:` array (each entry has `id`, `title`, `space`, `last_modified`).
2. For each entry, call `mcp__atlassian__confluence_get_page_history` with the `id` to get the current `latest.created` timestamp.
3. Compare against the cached `last_modified` (or the page's `confluence_checked_at:` if `last_modified` isn't on the entry).
4. Bucket each cached page reference:
   - `current` — Confluence revision unchanged since cached.
   - `confluence-changed` — Confluence has a newer revision; the doc page may need re-augmenting via `/docs-generate <product> --rephase confluence --page <path>`.
   - `confluence-removed` — page deleted or inaccessible; flag for human review.
5. If the Atlassian MCP is unavailable, report `unknown` for every Confluence-mode page and continue — don't fail the whole run.

### 3. Produce a unified report

After all three modes finish, print one summary table:

```
docs-drift report (<N> pages scanned)

| Page | Mode | Status | Detail |
|---|---|---|---|
| apps/ccd/docs/explanation/callbacks.md | source-citation | stale | 3/15 sources changed |
| docs/how-to/add-a-repo.md | port-manifest | in-sync | upstream HEAD = synced_sha |
| apps/ccd/docs/explanation/case-flags.md | confluence-revision | confluence-changed | 1700663346 has new revision |
| ... |
```

Pages can appear multiple times (once per applicable mode). Suppress `fresh` / `in-sync` / `current` rows unless the user explicitly asked for a full listing.

End with one of:
- `no drift detected` if every applicable mode returned only fresh/in-sync/current rows.
- A bulleted suggestion for next action per non-clean bucket (e.g. "Run `/docs-generate ccd --rephase synth --page <stale-path>` to re-draft a stale page").

## Exit code

The script exits non-zero when there's actionable drift in port or source modes. The skill should pass that through — if the user is calling `/docs-drift` in CI or a hook, a non-zero exit means "something to do".

## When to use

- The user asks about doc freshness, refresh, or sync.
- After a `./scripts/sync` pulls new commits into source repos.
- After a deliberate `git -C platops/hmcts.github.io pull`.
- Periodically as maintenance.

## When NOT to use

- Single-page edits that don't touch ported content or `sources:`. The drift modes only catch upstream changes.
- The upstream / source clones aren't present (clean workspace before bootstrap). Port mode bails early; source mode reports `broken` for unresolvable repos.

## Don't

- Don't fix drift here — only report it. Fixes go through `/docs-generate` (e.g. `--rephase synth` or `--rephase confluence`).
- Don't write to Confluence. The Atlassian MCP is read-only in this workspace (`READ_ONLY_MODE=true`).
- Don't follow links to non-cited sources. The contract is that `sources:` is the page's verifiable surface.
- Don't try to refresh ported pages automatically — they need hand-fixing for link/image churn (see `scripts/port-page` and the manual-fixes notes that used to live in `/docs-hmcts-way-drift`'s "How to act on the report" section).
