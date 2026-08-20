---
name: repo-doctor
description: Health-check workspace authentication, tooling, manifest entries, and clone presence. Use when the user asks whether the workspace setup is healthy.
---

# Shared workflow adapter

Read [`.claude/commands/repo-doctor.md`](../../../.claude/commands/repo-doctor.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$repo-doctor` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
