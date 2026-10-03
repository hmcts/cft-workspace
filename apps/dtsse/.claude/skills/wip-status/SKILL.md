---
name: wip-status
description: List, find or summarise the DTSSE / Decentralisation team's work-in-progress documentation, and flag pages that have gone stale. Use when the user asks "what WIPs do we have", "is there unreleased work on X", "can service teams integrate with Y yet", "what's the status of the decentralisation work", "which WIP pages are stale", or "what's ready to promote".
---

# Query work-in-progress pages

WIP pages under `apps/dtsse/docs/wip/` are not in `DOCS.md`, so `/cft-explain` cannot see
them. This skill is the lookup for unreleased work. The index at
`apps/dtsse/docs/wip/README.md` explains the status vocabulary.

## Procedure

1. **List** the pages, with status, owner, last update and promotion target:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/wip list            # add --status ready | in-progress | exploratory
   ```
   If the user asked about a topic rather than the set, grep the pages:
   ```bash
   grep -il '<term>' $CLAUDE_PROJECT_DIR/apps/dtsse/docs/wip/*.md
   ```

2. **Answer "can we integrate yet?" from frontmatter, not prose.** `integrate_now: true` is the
   owner's explicit yes; `status: ready` means it is merged and deployed and only the docs are
   pending. Anything `exploratory` is a no — name the `owner` so the user can ask them.

3. **For a specific page**, read it and answer in a few lines: what it is, current state,
   integration contract, open questions. Cite the path and the `tracking` link.

4. **Stale pages** — when asked, or when reviewing the set:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/wip stale --days 30
   ```
   Exit status 3 means something is stale. Suggest the owner either `wip touch <slug>` (still
   live), set `status: ready` and promote, or delete the page if the work was abandoned. A page
   that is quiet for months misleads the teams it was written for.

5. **If a core page already covers the topic**, say so — check `DOCS.md` — and prefer it. A WIP
   page is only the answer for what the core docs do not yet describe.

## Don't

- Don't present WIP content as settled behaviour. Always lead with the status.
- Don't read the clones to fill gaps in a WIP page — the gap is the finding; tell the user and
  offer `/dtsse:wip-add`-style edits.
