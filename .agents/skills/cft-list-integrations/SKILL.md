---
name: cft-list-integrations
description: List every workspace product that integrates with a given platform such as work allocation, bulk scan, payments, or send letter. Use when the user asks which products integrate with a platform.
---

# Shared workflow adapter

Read [`.claude/skills/cft-list-integrations/SKILL.md`](../../../.claude/skills/cft-list-integrations/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-list-integrations` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
