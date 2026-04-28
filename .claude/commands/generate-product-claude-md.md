---
description: Generate (or regenerate) the product-level CLAUDE.md for one or more workspace products.
---

Usage:
- `/generate-product-claude-md` — fan out across every product directory currently on disk (`apps/*`, `libs/`, `platops/`).
- `/generate-product-claude-md <product>` — single product, e.g. `apps/pcs` or `libs`.

Each product groups one or more cloned HMCTS repos. The output is a single `<product>/CLAUDE.md` describing the product (purpose, repos, architecture, CCD features, integrations) — see `docs/reference/taxonomy.md` for the schema.

Behaviour:
1. Resolve the target product list:
   - With no argument → every directory matching `apps/*/`, plus `libs/` and `platops/`, that contains at least one cloned repo.
   - With an argument → just that single product directory.
2. For each product, spawn a `product-analyser` subagent with the absolute path. Run in parallel, cap concurrency at ~5.
3. After all subagents return, run `./scripts/index` to refresh `INDEX.md`.
4. Summarise: which products got new/updated CLAUDE.md, which were skipped (e.g. empty product dir), and any subagent errors. Print the resulting `INDEX.md` row count.

This command is **re-runnable**: regenerate periodically (after sync, after a new release, on demand) so the taxonomy stays fresh. Subagents always overwrite the existing CLAUDE.md — local edits will be lost. Build/test commands and per-repo conventions belong in each clone's own README/AGENTS.md and are off-topic for the generated body.
