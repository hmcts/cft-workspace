---
name: cft-ccd-trace-callback
description: Trace a CCD callback for a given event-id and service from definition through to controller. Returns the chain of file:line locations. Use when the user wants to know what runs when an event is submitted in a specific service.
---

# Shared workflow adapter

Read [`.claude/skills/cft-ccd-trace-callback/SKILL.md`](../../../.claude/skills/cft-ccd-trace-callback/SKILL.md) completely and follow it as the canonical workflow for this skill.

When applying the canonical instructions in Codex:

- Treat the text supplied with `$cft-ccd-trace-callback` as `$ARGUMENTS`.
- Translate references to Claude Code `/skill-name` invocations into Codex `$skill-name` invocations.
- When the workflow requests a named specialist, use the matching project role under `.codex/agents/`. If it is unavailable, read the corresponding prompt under `.claude/agents/` before delegating or doing that work locally.
