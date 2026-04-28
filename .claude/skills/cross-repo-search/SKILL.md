---
name: cross-repo-search
description: Search across all cloned HMCTS repos using the workspace's pre-tuned ripgrep wrapper. Use when the user asks about code or text patterns spanning multiple service teams or platform components — never grep individual clones one-by-one when the question is workspace-wide.
---

# Cross-repo search

The workspace has a tuned ripgrep wrapper at `./scripts/grep` that excludes the noisy directories CFT projects accumulate (`node_modules`, `build`, `.gradle`, `target`, `dist`, `.terraform`, lock files, large generated jars). Always use it for workspace-spanning searches.

## When to use

Use this skill when the user asks any of:
- "Where is X used across the platform?"
- "Which services do Y?"
- "Find all references to <symbol> / <config key> / <dependency>."
- "Compare how <area> and <area> handle <thing>."

## When NOT to use

- Single-repo questions — `cd` into the repo and use `rg` or Grep directly.
- Taxonomy-keyed questions ("all services using Notice of Change") — use `INDEX.md` via `/find-feature` or `/list-integrations`. Those are O(1); ripgrep is O(many GB).

## How to invoke

```bash
./scripts/grep '<pattern>'
./scripts/grep -t java '<pattern>'      # ripgrep type filters work
./scripts/grep -l '<pattern>'           # files only
./scripts/grep --glob '!**/test/**' '<pattern>'   # additional excludes
```

The wrapper passes every flag through to `rg` and only adds the workspace's standard excludes plus the right search roots (`apps libs platops`).

## Reading the output

Results are shown as `path:line:match`. Group by repo (the second segment after `apps/<area>/`) when summarising — the user usually cares about which services hit, not raw line counts.

For large result sets, prefer `-l` (file list) plus a follow-up read of the most relevant files over showing 100 raw match lines.
