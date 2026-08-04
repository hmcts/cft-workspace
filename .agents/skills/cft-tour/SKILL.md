---
name: cft-tour
description: Give a guided tour of a workspace product, including its purpose, constituent repos, cross-repo wiring, and the first files a contributor should read. Use for product walkthroughs.
---

# Shared workflow adapter

Read [`.claude/skills/cft-tour/SKILL.md`](../../../.claude/skills/cft-tour/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-tour` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
