---
name: repo-sync
description: Fast-forward all or selected cloned repositories while preserving dirty, branched, or unpushed work. Use when the user asks to update workspace clones.
---

# Shared workflow adapter

Read [`.claude/commands/repo-sync.md`](../../../.claude/commands/repo-sync.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$repo-sync` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
