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
every session. Tooling that only one team needs goes in a **team plugin**
instead — `teams/<team>/`, catalogued in
[`.claude-plugin/marketplace.json`](../../.claude-plugin/marketplace.json), and
installed only by the engineers who want it.

Skill names are namespaced by plugin (`/pcs:issue-claim`), so a team plugin can
use any name without checking what the workspace or another team already has.

## Create the plugin

```bash
cp -r teams/_template teams/pcs
```

Edit `teams/pcs/.claude-plugin/plugin.json` — `name` must match the catalogue
entry you are about to add:

```json
{
  "name": "pcs",
  "description": "PCS team workflows: local stack, CCD definition checks, E2E previews",
  "version": "0.1.0",
  "author": { "name": "PCS team" }
}
```

Then fill in the parts you need. All four directories are picked up by
convention — nothing to declare in `plugin.json`:

| Path | Becomes |
|---|---|
| `teams/pcs/skills/<name>/SKILL.md` | `/pcs:<name>` |
| `teams/pcs/agents/<name>.md` | subagent type `pcs:<name>` |
| `teams/pcs/commands/<name>.md` | `/pcs:<name>` |
| `teams/pcs/scripts/<name>` | `${CLAUDE_PLUGIN_ROOT}/scripts/<name>` |
| `teams/pcs/hooks/hooks.json` | hooks, active only for engineers who installed the plugin |

Two rules that are easy to get wrong:

- **Never use cwd-relative paths.** A plugin runs from an installed copy under
  `~/.claude/plugins/cache/`, not from your checkout. Address bundled files as
  `${CLAUDE_PLUGIN_ROOT}/…` and the workspace root as `$CLAUDE_PROJECT_DIR`.
- **The `description` line is the whole interface.** It is all the model sees
  until the skill runs, so write when to use it, not just what it does.

Add the entry to `.claude-plugin/marketplace.json`:

```json
{
  "name": "pcs",
  "source": "./teams/pcs",
  "description": "PCS team workflows: local stack, CCD definition checks, E2E previews"
}
```

Check both manifests before you push:

```bash
claude plugin validate .claude-plugin/marketplace.json
claude plugin validate --strict teams/pcs
```

Then raise a PR on `hmcts/cft-workspace` as usual. Reviewers are looking for the
same things as any shared change: does this belong to one team (if every team
needs it, it belongs in `.claude/skills/`), and does it route to `DOCS.md` /
`INDEX.md` rather than restating product facts the shared docs already carry.

## Test it before you push

The catalogue every engineer gets is fetched from `master`, so your working copy
isn't what gets installed. To point the marketplace at your checkout for the
length of a session:

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

## Enable a plugin (each engineer, once)

The workspace's `.claude/settings.json` makes the catalogue known to everyone
but enables nothing, so this is opt-in:

```
/plugin
```

Browse the `cft-workspace` marketplace and install the team's plugin. Or without
the UI:

```bash
claude plugin install pcs@cft-workspace
claude plugin details pcs         # what it adds, and what it costs in context
```

Then `/pcs:` in the prompt should complete to that team's skills. Two things to
know:

- **First run after a fresh clone.** Project-declared marketplaces are skipped
  until you accept the folder trust dialog. If `cft-workspace` isn't listed
  under `/plugin`, accept the dialog and run `/reload-plugins`.
- **Installing is asynchronous.** A plugin installed this session may not appear
  in the skill list until the next one — `/reload-plugins` avoids the wait.

To share the choice with the rest of the team, commit nothing: each engineer
installs what they want. If a team decides everyone in it should have the plugin
on by default, that is `"enabledPlugins": {"pcs@cft-workspace": true}` in their
own `.claude/settings.local.json`, not in the workspace's shared settings.

To turn one off:

```bash
claude plugin uninstall pcs@cft-workspace
```

## Codex

Plugins are a Claude Code mechanism; Codex has no equivalent, and the
`.agents/skills/` adapters cover the shared workspace skills only. Codex users
can still read `teams/<team>/skills/<name>/SKILL.md` directly — it is ordinary
Markdown — but there is no `$pcs:<name>` invocation.
