---
name: cft-how-to
description: Find a Diátaxis how-to recipe for an action-shaped task across the workspace docs. Use when the user asks how to perform a CFT or workspace task.
---

# Shared workflow adapter

Read [`.claude/skills/cft-how-to/SKILL.md`](../../../.claude/skills/cft-how-to/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-how-to` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
