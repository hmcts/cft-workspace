---
name: docs-generate
description: Generate or refresh comprehensive documentation under apps/<product>/docs/ for a workspace product. Use when the user asks to populate, refresh, or extend product docs.
---

# Shared workflow adapter

Read [`.claude/skills/docs-generate/SKILL.md`](../../../.claude/skills/docs-generate/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$docs-generate` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
