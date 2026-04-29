---
description: Generate or refresh the comprehensive CCD documentation under docs/ccd/. Phased, resumable, fans out specialised subagents in parallel.
---

Run the `generate-ccd-docs` skill with `$ARGUMENTS`.

Usage:
- `/generate-ccd-docs` — run the next-incomplete phase across every page in `plan.yaml`.
- `/generate-ccd-docs --phase scaffold` — create the `docs/ccd/` skeleton (stub pages with frontmatter only).
- `/generate-ccd-docs --phase research` — fan out `ccd-source-researcher` subagents to populate `docs/ccd/.work/research/`.
- `/generate-ccd-docs --phase synth` — fan out `ccd-topic-writer` subagents to draft each page from research notes.
- `/generate-ccd-docs --phase confluence` — fan out `ccd-confluence-augmenter` subagents to verify and enrich each drafted page against HMCTS Confluence (parallel cap 10). Requires the `atlassian` MCP from `.mcp.json`.
- `/generate-ccd-docs --phase examples` — extract real examples from test-projects and inline them into pages.
- `/generate-ccd-docs --phase link` — build glossary, cross-link pages, write `docs/ccd/README.md`.
- `/generate-ccd-docs --phase review` — fan out `ccd-doc-reviewer` subagents to verify claims against source.
- `/generate-ccd-docs --page <path>` — restrict to one page.
- `/generate-ccd-docs --topic <token>` — restrict to all pages tagged with a topic in `plan.yaml`.
- `/generate-ccd-docs --rephase <name>` — discard a phase's outputs and re-run from there.
- `/generate-ccd-docs --dry-run` — print what would happen.

The skill is **resumable** — re-running picks up where it left off, using `docs/ccd/.work/manifest.yaml` as the source of truth. Subagents always overwrite the page they're assigned to; if you have hand-edits on a drafted page, run with `--rephase synth --page <path>` deliberately.

Per-page state progresses: `stub → drafted → confluence-augmented → examples-added → linked → reviewed`. The orchestrator skips pages already at the requested target.
