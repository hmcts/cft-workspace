---
name: wip-promote
description: Promote a DTSSE work-in-progress page into the core documentation once the work is productionised — move it from apps/dtsse/docs/wip/ into the target product's Diátaxis tree, rewrite it as settled documentation, and reindex DOCS.md. Use when the user says "promote X to core docs", "this WIP has shipped", "move the decentralisation page into the CCD docs", or "graduate this page".
---

# Promote a WIP page to core documentation

Promotion is the moment a page stops being team knowledge and becomes something every engineer's
`/cft-explain` can find. The script does the mechanical move; the judgement — is it really
done, and does the prose read as settled documentation — is yours.

## Preconditions

- The work is merged to the owning repo's default branch and deployed at least to AAT.
- `status: ready` on the page. If it isn't, ask the owner rather than passing `--force`.
- The promotion criteria checklist at the foot of the page is ticked, or the user says why
  an item does not apply.

## Procedure

1. **Check readiness** and show the output:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/wip check <slug>
   ```
   Fix frontmatter problems on the WIP page first. Fill `sources:` if empty — core pages cite
   source files so `/docs-drift` can catch them going stale.

2. **Confirm the destination.** The default is `promote_to` from the frontmatter
   (`apps/<product>/docs/<quadrant>/<slug>.md`, or `docs/<quadrant>/` for `workspace`). If the
   product's docs tree has a page on the same topic, prefer merging into it: promote to a
   sibling path with `--to`, then fold the content in by hand and delete the duplicate.
   Preview with:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/wip promote <slug> --dry-run
   ```

3. **Promote:**
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/wip promote <slug> [--to apps/<product>/docs/<quadrant>/<name>.md]
   ```
   This writes the page with core frontmatter (`title`, `topic`, `diataxis`, `product`,
   `audience`, `sources`, `status: drafted`), deletes the WIP page, regenerates
   `apps/dtsse/docs/wip/README.md` and runs `./scripts/docs-index`.

4. **Rewrite the prose as settled documentation.** Read the moved page in full and:
   - delete the `> Work in progress` banner and the `Promotion criteria` section;
   - remove hedging ("may change", "not yet deployed", "planned") — state what is true now;
   - never narrate history ("previously", "used to", "has been replaced by");
   - move anything still unsettled back to a fresh WIP page rather than leaving it here;
   - match the quadrant: an `explanation` page explains, a `how-to` page is numbered steps.

5. **Link it** from the product's `docs/README.md` under the right heading, and add a
   `See also` to related core pages where a reader would expect one.

6. **Verify** and hand over:
   ```bash
   cd $CLAUDE_PROJECT_DIR && ./scripts/docs-index && git status --short
   ```
   Raise the change as a PR on `hmcts/cft-workspace`. The `doc-reviewer` agent owns `status`
   after this point; leave it at `drafted`.

## Don't

- Don't promote with `--force` on the strength of the request alone; the status gate is the
  owner's sign-off.
- Don't leave the WIP page behind as a stub or "moved to" pointer — git history is the record.
- Don't edit anything inside a clone; promotion only touches workspace-repo files.
