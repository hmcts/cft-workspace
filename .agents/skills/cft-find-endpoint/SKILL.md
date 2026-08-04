---
name: cft-find-endpoint
description: Find which HMCTS API service exposes a given HTTP path. Searches cnp-api-docs for matching OpenAPI paths and reports the owning service, methods, local spec, hosted Swagger UI, and owning product. Use when the user asks which service has a path or endpoint.
---

# Shared workflow adapter

Read [`.claude/skills/cft-find-endpoint/SKILL.md`](../../../.claude/skills/cft-find-endpoint/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-find-endpoint` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
