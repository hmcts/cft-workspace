---
name: cft-whois
description: Identify the human behind an HMCTS GitHub login, or find the login for a person. Reports their real name, work emails, employer, org and team membership, and which repos they land changes in. Use when the user asks "who is github.com/xyz", "who is this GitHub user", "which HMCTS user is abc123", "what team is this person on", "what's the GitHub handle for Jane Smith".
---

# Shared workflow adapter

Read [`.claude/skills/cft-whois/SKILL.md`](../../../.claude/skills/cft-whois/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-whois` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
