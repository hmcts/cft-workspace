---
name: wip-add
description: Write up unreleased or exploratory DTSSE / Decentralisation platform work as a work-in-progress page under apps/dtsse/docs/wip/, outside the core docs, so service teams can see what is coming and start integrating early. Use when the user says "document this WIP", "add a WIP page for X", "write up the decentralisation spike", "teams need to know about this before it ships", or wants to record an unreleased contract, endpoint or library change.
---

# Add a work-in-progress page

WIP pages are ordinary Markdown under `apps/dtsse/docs/wip/`. That directory is deliberately not
a Diátaxis quadrant, so `scripts/docs-index` skips it: nothing here reaches `DOCS.md`,
`/cft-explain` or `/cft-how-to` until it is promoted with `/dtsse:wip-promote`. The full
convention, status vocabulary and frontmatter are in `apps/dtsse/docs/wip/README.md` — read it
first if you have not this session.

## When NOT to use

- **The work is already merged, deployed and stable** — write a core page instead
  (`apps/<product>/docs/<quadrant>/`), or promote an existing WIP page.
- **It is a session note, a ticket update or a to-do** — that is Jira, not documentation.
- **It belongs to another team's product and is not DTSSE work** — this plugin only owns
  `apps/dtsse/docs/wip/`.

## Procedure

1. **Establish the facts** from the user and, where they exist locally, from the clones. You
   need: a title, a kebab-case slug, the owning GitHub login, the tracking link (Jira or GitHub
   issue), where the page should eventually land (`<product>/<quadrant>`, e.g.
   `ccd/explanation`), and whether service teams may build against it today
   (`integrate_now`). Known owners are `ed14537` and `jasonpaige` (see the Owners table in
   `apps/dtsse/docs/wip/README.md`); pass the right one with `--owner` rather than relying on
   the default. Ask for anything you cannot infer; do not invent a tracking link.

2. **Scaffold** the page:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/wip new <slug> --title "<title>" --topic <topic> \
       --owner <login> --promote-to <product>/<quadrant> --tracking <url> [--status in-progress]
   ```
   It writes the page from `${CLAUDE_PLUGIN_ROOT}/templates/wip-page.md` and regenerates the
   index at `apps/dtsse/docs/wip/README.md`.

3. **Fill the sections** in the template order: what this is, current state (repo, branch,
   environments), how a service team would integrate, open questions, promotion criteria.
   Write present-tense facts about the current contract and mark what is still expected to
   change. Point `sources:` at the authoritative files as `<repo>:<path>` — that is what lets
   the page be promoted without a rewrite later.

4. **Set `integrate_now`** honestly. `true` is the owner's statement that a team can build
   against the contract as written; leave it `false` for anything exploratory.

5. **Check it** and show the user the result:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/wip check <slug>
   ```

6. **Hand over.** The page lives in the workspace repo, not a clone, so it goes to
   `hmcts/cft-workspace` on a branch and PR like any docs change. Don't commit or push unless
   asked.

## Don't

- Don't put the page anywhere but `apps/dtsse/docs/wip/`. A WIP page inside a Diátaxis
  quadrant is indexed as if it were core documentation.
- Don't narrate history ("this replaces the old…"). State what is true of the WIP now.
- Don't paste credentials, hostnames with tokens, or case data — the workspace repo is public.
