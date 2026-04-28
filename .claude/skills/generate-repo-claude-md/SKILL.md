---
name: generate-repo-claude-md
description: Generate (or regenerate) per-repo CLAUDE.md files with structured taxonomy frontmatter, by fanning out the repo-analyser subagent across all cloned repos in the workspace. Use when the user asks to populate, refresh, or re-run the workspace taxonomy — and as the first step to make /find-feature, /list-integrations, and /tour useful.
---

# Generate repo CLAUDE.md

Each cloned repo under `apps/`, `libs/`, `platops/` should have a `CLAUDE.md` whose first block is YAML frontmatter encoding the workspace taxonomy (service, type, ccd_based, ccd_config, ccd_features, integrations, runtime, build). This skill produces those CLAUDE.md files.

The taxonomy schema is defined in `docs/reference/taxonomy.md`. The `repo-analyser` subagent (at `.claude/agents/repo-analyser.md`) knows how to extract each field from a single repo and write the output.

## Inputs

- No argument → every clone under `workspace.yaml` that's currently on disk.
- A path (`apps/nfdiv/nfdiv-case-api`) → that single repo.
- A prefix (`apps/nfdiv`) → every clone under that prefix.

## Procedure

1. **Resolve target list**
   ```bash
   source ./scripts/lib/_common.sh
   manifest_tsv "$PREFIX" | cut -f1 | while read -r path; do
       [ -d "$path/.git" ] && echo "$path"
   done
   ```
   Skip entries that aren't yet cloned — note them in the summary.

2. **Fan out subagents**
   For each target path, spawn one `repo-analyser` Agent in parallel. Cap parallelism at ~5 — they each spawn their own tool calls, and the subagent layer multiplies fast. The Agent's `subagent_type` is `repo-analyser`. The prompt should be a single line: the absolute path to the repo (`/workspaces/hmcts/<path>`).

   Each subagent reads the repo's surface metadata (README, build files, application config, Terraform, Jenkinsfile) and writes a `CLAUDE.md` at the repo root. It does NOT commit.

3. **Refresh the index**
   After every subagent returns, run `./scripts/index`. This rewrites `INDEX.md` from the new frontmatter.

4. **Summarise**
   Report:
   - Repos updated (one line each, with their resolved type and integrations).
   - Repos skipped (not cloned).
   - Any subagent errors.
   - The new `INDEX.md` row count.

## Re-runnability

This skill is meant to be run periodically — after `./scripts/sync`, after a major service release, or whenever the user thinks the taxonomy has drifted. Subagents always overwrite the existing `CLAUDE.md`. Local edits to a generated CLAUDE.md will be lost — surface this caveat the first time you run, so the user knows to add custom guidance below the generated body or in a separate `AGENTS.md`.

## Don't

- Don't run subagents serially when the host can take parallel work.
- Don't try to consolidate frontmatter across repos — each subagent works on one repo.
- Don't commit anything. The user reviews and commits CLAUDE.md changes per-clone if they want.
- Don't invent taxonomy tokens not listed in `docs/reference/taxonomy.md`.
