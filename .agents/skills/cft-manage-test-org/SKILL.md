---
name: cft-manage-test-org
description: Create, approve, inspect or delete professional organisations in a non-production CFT environment, and manage their users and PUI roles. Use when the user asks "create a test organisation", "I need a solicitor with an org", "add a user to an org", "give this user pui-case-manager", "list the users in org ABC1DEF".
---

# Shared workflow adapter

Read [`.claude/skills/cft-manage-test-org/SKILL.md`](../../../.claude/skills/cft-manage-test-org/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-manage-test-org` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
