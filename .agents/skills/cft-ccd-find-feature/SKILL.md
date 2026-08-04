---
name: cft-ccd-find-feature
description: Find every product that uses a given CCD feature token (e.g. notice_of_change, case_flags). Use when the user asks "which services use X", "who has NoC enabled", "what products configure case flags".
---

# Shared workflow adapter

Read [`.claude/skills/cft-ccd-find-feature/SKILL.md`](../../../.claude/skills/cft-ccd-find-feature/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-ccd-find-feature` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
