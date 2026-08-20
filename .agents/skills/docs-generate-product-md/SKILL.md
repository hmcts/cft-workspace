---
name: docs-generate-product-md
description: Regenerate product-level CLAUDE.md taxonomy files and refresh INDEX.md. Use when the user asks to populate or refresh workspace taxonomy, or when INDEX.md looks stale.
---

# Shared workflow adapter

Read [`.claude/skills/docs-generate-product-md/SKILL.md`](../../../.claude/skills/docs-generate-product-md/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$docs-generate-product-md` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
