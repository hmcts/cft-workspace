---
name: cft-cross-repo-search
description: Search across all cloned HMCTS repos using the workspace's pre-tuned ripgrep wrapper. Use when the user asks about code or text patterns spanning multiple service teams or platform components.
---

# Shared workflow adapter

Read [`.claude/skills/cft-cross-repo-search/SKILL.md`](../../../.claude/skills/cft-cross-repo-search/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-cross-repo-search` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
