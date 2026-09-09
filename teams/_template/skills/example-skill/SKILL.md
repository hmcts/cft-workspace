---
name: example-skill
description: Replace this with a description that says when to invoke the skill, not just what it does — this one line is what the model matches against, and it is the only part loaded until the skill runs.
---

# Example skill

Delete this file and write your own. Notes that apply to any skill in a team
plugin:

- The skill is invoked as `/example-team:example-skill`. The `example-team`
  prefix is the plugin name, so skill names never collide with the shared
  workspace skills in `.claude/skills/` or with another team's.
- Paths in the body must not assume the workspace root is the cwd. Use
  `${CLAUDE_PLUGIN_ROOT}` for files inside the plugin — it expands to the
  installed plugin directory, which is a cache copy, not your checkout.
- Anything the workspace already knows belongs in the shared docs, not here.
  Route to `DOCS.md` / `INDEX.md` instead of restating product facts that
  `/cft-explain` already answers.

## Steps

1. Do the first thing.
2. Run the bundled helper: `${CLAUDE_PLUGIN_ROOT}/scripts/example-script`.
3. Report what changed.
