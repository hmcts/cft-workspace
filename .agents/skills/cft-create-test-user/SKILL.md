---
name: cft-create-test-user
description: Create IDAM test users, roles or OAuth clients in a non-production CFT environment (AAT, demo, ithc, perftest). Use when the user asks "create a test user in AAT", "how do I make a caseworker for demo", "set up test users for <service>", "I need a citizen login".
---

# Shared workflow adapter

Read [`.claude/skills/cft-create-test-user/SKILL.md`](../../../.claude/skills/cft-create-test-user/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-create-test-user` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
