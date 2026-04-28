---
name: generate-product-claude-md
description: Generate (or regenerate) product-level CLAUDE.md files by fanning out the product-analyser subagent across every product directory in the workspace. Use when the user asks to populate, refresh, or re-run the workspace taxonomy — and as the first step to make /find-feature, /list-integrations, and /tour useful.
---

# Generate product CLAUDE.md

CFT documentation lives **outside** each cloned repo, at the product level — `apps/<product>/CLAUDE.md`, `libs/CLAUDE.md`, `platops/CLAUDE.md`. Each product groups one or more clones into a single coherent thing (e.g. `apps/pcs/` = PCS, comprising `pcs-api/` and `pcs-frontend/`). The cloned repos themselves are upstream code — we never touch their content; existing `AGENTS.md` / `README.md` inside them stay as-is.

The taxonomy schema is defined in `docs/reference/taxonomy.md`. The `product-analyser` subagent (at `.claude/agents/product-analyser.md`) knows how to read a product directory's clones and write the product CLAUDE.md.

## Inputs

- No argument → every product directory currently on disk: every immediate subdirectory of `apps/`, plus `libs/` and `platops/`, that contains at least one cloned repo.
- A path (`apps/pcs`, `libs`, `platops`) → that single product.

## Procedure

1. **Resolve target list**
   ```bash
   if [ -n "$ARG" ]; then
       echo "$ARG"
   else
       for d in apps/*/ libs/ platops/; do
           [ -d "$d" ] || continue
           # include if any subdirectory is a git clone
           if find "$d" -maxdepth 2 -name .git -type d 2>/dev/null | grep -q .; then
               echo "${d%/}"
           fi
       done
   fi
   ```

2. **Fan out subagents**
   For each target product, spawn one `product-analyser` Agent in parallel. Cap parallelism at ~5 — each subagent spawns its own tool calls and the layer multiplies fast. The Agent's `subagent_type` is `product-analyser`. The prompt is a single line: the absolute path to the product directory (`/workspaces/hmcts/<product>`).

   Each subagent reads its product's clones (READMEs, build files, application config, CCD definitions) and writes one `CLAUDE.md` at `<product>/CLAUDE.md`. It does **not** edit anything inside a clone, and does not commit.

3. **Refresh the index**
   After all subagents return, run `./scripts/index`. This rewrites `INDEX.md` from the new frontmatter.

4. **Summarise**
   Report:
   - Products updated (one line each, with `ccd_based`, the feature/integration count, and repo count).
   - Products skipped (empty product dir, or product not on disk).
   - Any subagent errors.
   - The new `INDEX.md` row count.

## Re-runnability

This skill is meant to be run periodically — after `./scripts/sync`, after a major service release, or whenever the taxonomy has drifted. Subagents always overwrite the existing CLAUDE.md. Custom human-written guidance should live separately (e.g. in `docs/explanation/<topic>.md`), not embedded in the generated CLAUDE.md.

## Don't

- Don't write CLAUDE.md inside cloned repos — only at the product directory root.
- Don't edit anything inside a cloned repo (READMEs, AGENTS.md, source) — they're upstream code we don't own.
- Don't run subagents serially when the host can take parallel work.
- Don't invent taxonomy tokens not listed in `docs/reference/taxonomy.md`.
- Don't include build/test commands in the body — those are repo-level concerns and live in each clone's README.
