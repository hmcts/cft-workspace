---
title: How to add team-specific Claude skills, agents and scripts
topic: team-plugins
diataxis: how-to
product: workspace
audience: both
---
# How to add team-specific Claude skills, agents and scripts

The skills in `.claude/skills/` and the scripts in `scripts/` are shared: every
engineer in every team loads them, and every one of them spends context in
every session. Tooling that only one team needs goes in a **team plugin** —
`apps/<product>/.claude/`, catalogued in
[`.claude-plugin/marketplace.json`](../../.claude-plugin/marketplace.json), and
installed only by the engineers who want it.

It sits next to the product's other workspace-repo scaffolding
(`apps/<product>/CLAUDE.md`, `apps/<product>/docs/`), and like those it is
tracked here, not in any clone — `.gitignore` re-includes it. Skill names are
namespaced by plugin (`/pcs:issue-claim`), so a team plugin can use any name
without checking what the workspace or another team already has.

## Create the plugin

Three files, all under `apps/<product>/.claude/`:

```bash
mkdir -p apps/pcs/.claude/.claude-plugin apps/pcs/.claude/skills/issue-claim
```

`apps/pcs/.claude/.claude-plugin/plugin.json` — `name` must match the catalogue
entry you are about to add:

```json
{
  "name": "pcs",
  "description": "PCS team workflows: local stack, CCD definition checks, E2E previews",
  "version": "0.1.0",
  "author": { "name": "PCS team" }
}
```

`apps/pcs/.claude/skills/issue-claim/SKILL.md` — the `description` is the whole
interface. It is all the model sees until the skill runs, so write when to use
it, not just what it does:

```markdown
---
name: issue-claim
description: Issue a possession claim end-to-end against a local or AAT PCS stack. Use when asked to create test claim data, reproduce a claim-issue bug, or check a claim renders in XUI.
---

# Issue a claim

1. …
```

And the catalogue entry in `.claude-plugin/marketplace.json`:

```json
{
  "name": "pcs",
  "source": "./apps/pcs/.claude",
  "description": "PCS team workflows: local stack, CCD definition checks, E2E previews"
}
```

Everything else is optional, and picked up by convention — nothing to declare in
`plugin.json`:

| Path under `apps/pcs/.claude/` | Becomes |
|---|---|
| `skills/<name>/SKILL.md` | `/pcs:<name>` |
| `agents/<name>.md` | subagent type `pcs:<name>` |
| `commands/<name>.md` | `/pcs:<name>` |
| `scripts/<name>` | `${CLAUDE_PLUGIN_ROOT}/scripts/<name>` |
| `hooks/hooks.json` | hooks, active only for engineers who installed the plugin |

**Never use cwd-relative paths.** A plugin runs from an installed copy under
`~/.claude/plugins/cache/`, not from your checkout. Address bundled files as
`${CLAUDE_PLUGIN_ROOT}/…` and the workspace root as `$CLAUDE_PROJECT_DIR`.

Check both manifests before you push:

```bash
./scripts/validate-plugins
claude plugin validate --strict apps/pcs/.claude
```

Then raise a PR on `hmcts/cft-workspace` as usual. Reviewers are looking for the
same things as any shared change: does this belong to one team (if every team
needs it, it belongs in `.claude/skills/`), and does it route to `DOCS.md` /
`INDEX.md` rather than restating product facts the shared docs already carry.

## Test it before you push

The catalogue every engineer gets is fetched from `master`, so your working copy
isn't what gets installed. Two ways to try a plugin you haven't pushed:

```bash
claude --add-dir apps/pcs        # loads apps/pcs/.claude directly, no install
```

That is the quick one, and it is why the plugin lives at this path — Claude Code
discovers a subdirectory's `.claude/` when the directory is passed to
`--add-dir`. The skills load **unnamespaced** (`/issue-claim`, not
`/pcs:issue-claim`), so don't combine it with having the plugin installed, or
you'll see both copies.

To exercise the real thing, install path included, point the marketplace at your
checkout instead:

```bash
claude plugin marketplace add "$PWD"     # same name, so it replaces the master copy
claude plugin install pcs@cft-workspace
```

That override is written to your user settings, and the workspace's own
`.claude/settings.json` outranks it, so it lasts until you relaunch. To keep it
across restarts while developing, put it in `.claude/settings.local.json`
(gitignored, and the highest-precedence scope):

```json
{
  "extraKnownMarketplaces": {
    "cft-workspace": { "source": { "source": "directory", "path": "/absolute/path/to/cft-workspace" } }
  }
}
```

Delete that block when you're done, or you'll silently stop seeing other teams'
updates from `master`. After editing a skill, `/reload-plugins` picks it up
without restarting.

## Enable and disable

The workspace's `.claude/settings.json` makes the catalogue known to everyone
but enables nothing, so every plugin is opt-in, per engineer:

```
/plugin
```

Browse the `cft-workspace` marketplace and install the team's plugin. Or without
the UI:

```bash
claude plugin install pcs@cft-workspace
claude plugin list                 # what's installed, and from where
claude plugin details pcs          # what it adds, and what it costs in context
```

Then `/pcs:` in the prompt should complete to that team's skills. Two things to
know:

- **First run after a fresh clone.** Project-declared marketplaces are skipped
  until you accept the folder trust dialog. If `cft-workspace` isn't listed
  under `/plugin`, accept the dialog and run `/reload-plugins`.
- **Installing is asynchronous.** A plugin installed this session may not appear
  in the skill list until the next one — `/reload-plugins` avoids the wait.

Turning one off has two levels. `disable` keeps it installed but stops loading
it, which is what you want when a team's hooks or skills are getting in the way
of unrelated work:

```bash
claude plugin disable pcs@cft-workspace
claude plugin enable pcs@cft-workspace
claude plugin uninstall pcs@cft-workspace   # remove it entirely
```

A team that wants its own plugin on by default for everyone in it can commit
nothing to the shared settings — each engineer puts this in their own
`.claude/settings.local.json` (gitignored):

```json
{ "enabledPlugins": { "pcs@cft-workspace": true } }
```

Settings precedence is user < project < local, so the same key set to `false` in
`.claude/settings.local.json` is also how you opt out of anything a future
change to the shared `.claude/settings.json` turns on by default.

## Codex

Plugins are a Claude Code mechanism; Codex has no equivalent, and the
`.agents/skills/` adapters cover the shared workspace skills only. Codex users
can still read `apps/<product>/.claude/skills/<name>/SKILL.md` directly — it is
ordinary Markdown — but there is no `$pcs:<name>` invocation.
