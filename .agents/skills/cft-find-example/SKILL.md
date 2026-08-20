---
name: cft-find-example
description: Find real, in-repo examples of how a feature is implemented in any HMCTS CFT product. Use when the user wants concrete code references.
---

# Shared workflow adapter

Read [`.claude/skills/cft-find-example/SKILL.md`](../../../.claude/skills/cft-find-example/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-find-example` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
