---
name: cft-api-spec
description: Summarise one HMCTS service's OpenAPI spec from cnp-api-docs. Reports title, version, auth, endpoint count by tag, owning product, hosted Swagger UI link, and local file path. Use when the user asks "what does pcs-api expose", "summarise ccd-data-store-api", "what auth does X use", "show me the endpoints of Y".
---

# Shared workflow adapter

Read [`.claude/skills/cft-api-spec/SKILL.md`](../../../.claude/skills/cft-api-spec/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-api-spec` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
