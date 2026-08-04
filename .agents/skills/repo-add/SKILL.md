---
name: repo-add
description: Add a new HMCTS repository to workspace.yaml and clone it. Use when the user asks to add or onboard a repository to this workspace.
---

# Shared workflow adapter

Read [`.claude/commands/repo-add.md`](../../../.claude/commands/repo-add.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$repo-add` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
