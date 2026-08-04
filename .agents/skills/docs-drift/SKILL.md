---
name: docs-drift
description: Detect documentation drift across the workspace using source citations, the port manifest, and Confluence revisions. Use for documentation maintenance checks or after pulling source changes.
---

# Shared workflow adapter

Read [`.claude/skills/docs-drift/SKILL.md`](../../../.claude/skills/docs-drift/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$docs-drift` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
