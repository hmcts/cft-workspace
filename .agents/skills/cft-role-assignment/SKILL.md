---
name: cft-role-assignment
description: Create, query or delete AM role assignments in a non-production CFT environment — organisational roles for caseworkers/judiciary, case roles, and case-allocator. Use when the user asks "give this user tribunal-caseworker", "why can't this user see tasks", "what roles does this actor have", "assign a case role", "clear this user's role assignments".
---

# Shared workflow adapter

Read [`.claude/skills/cft-role-assignment/SKILL.md`](../../../.claude/skills/cft-role-assignment/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-role-assignment` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
