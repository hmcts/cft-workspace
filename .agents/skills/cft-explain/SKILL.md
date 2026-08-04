---
name: cft-explain
description: Answer a "what is X" / "how does Y work" / "explain Z" question about any CFT topic — workspace, CCD, XUI, WA, AM, bulk-scan, platform/CNP. Routes via DOCS.md to the right page in either the root docs/ tree or a product-level apps/<product>/docs/ tree.
---

# Shared workflow adapter

Read [`.claude/skills/cft-explain/SKILL.md`](../../../.claude/skills/cft-explain/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-explain` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
