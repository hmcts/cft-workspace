# Team-specific Claude Code tooling

Everything in `.claude/` at the workspace root is shared: every engineer in
every team loads it. This directory is the other half — skills, agents,
commands and scripts that only one team needs, packaged as a Claude Code
plugin so that only that team's engineers install it.

```
.claude-plugin/marketplace.json   the catalogue — one entry per team
teams/<team>/
  .claude-plugin/plugin.json      plugin manifest; "name" must match the catalogue entry
  skills/<name>/SKILL.md          invoked as /<team>:<name>
  agents/<name>.md                spawned as <team>:<name>
  commands/<name>.md              slash commands
  scripts/<name>                  helpers, addressed as ${CLAUDE_PLUGIN_ROOT}/scripts/<name>
  hooks/hooks.json                team-scoped hooks (optional)
```

`skills/`, `agents/`, `commands/` and `hooks/` are picked up by convention —
don't list them in `plugin.json` unless you want to override the defaults.

## Why plugins rather than more shared skills

- **Names are namespaced.** A `deploy` skill in `teams/pcs` is
  `/pcs:deploy`, so it can't collide with a shared skill or another team's.
- **Nobody pays for tooling they don't use.** Every skill in `.claude/skills/`
  spends context in every session, for everyone. A plugin costs nothing to the
  teams that haven't installed it.
- **Opt-in, and opt-out-able.** Nothing here is enabled by default. Engineers
  install what they need and can disable it again without a PR.

## Adding a team

```bash
cp -r teams/_template teams/<team>          # then edit plugin.json: name = <team>
claude plugin validate teams/<team>         # check the manifest before pushing
```

Add the entry to [`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json):

```json
{ "name": "<team>", "source": "./teams/<team>", "description": "…" }
```

Full recipe, including how to test a plugin against your working copy before
you push, in
[docs/how-to/add-team-claude-tooling.md](../docs/how-to/add-team-claude-tooling.md).

`teams/_template/` is a scaffold to copy, not a plugin — it is deliberately
absent from the catalogue, so it is never installable.
