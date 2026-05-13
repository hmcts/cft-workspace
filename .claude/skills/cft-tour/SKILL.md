---
name: cft-tour
description: Give a guided tour of a workspace product — purpose, constituent repos, cross-repo wiring, and the first files a new contributor should read. Use when the user asks "tour me through nfdiv", "introduce me to ccd", "what is wa", "give me a walkthrough of pcs".
---

# Tour a workspace product

Produce a scannable, <60-second orientation for one product, working entirely from its product-level CLAUDE.md.

## When to use

- "Tour me through `nfdiv`."
- "What's in `apps/ccd`?"
- "Introduce me to Work Allocation."

## When NOT to use

- The user wants a **topic explained** (not a product) — use `/cft-explain`.
- The user wants to **find a feature** across products — use `/cft-ccd-find-feature` or `/cft-list-integrations`.
- The user wants to **drill into a callback chain** — use `/cft-ccd-trace-callback`.

## Procedure

1. Read the product's CLAUDE.md at `apps/<product>/CLAUDE.md` (or `libs/CLAUDE.md` / `platops/CLAUDE.md`).
   - If it's missing, say so and offer to run `/docs-generate-product-md <product>`.
2. Produce a tour with these sections:
   - **Summary** — one paragraph covering what the product is and what it does for users.
   - **Per-repo** (from `repos:` frontmatter) — 2–3 lines per repo covering purpose and where to start reading.
   - **Cross-repo wiring** — who calls whom, where shared definitions live, key integration points.
   - **Read these first** — the 3–5 files a new contributor should open before anything else.

## Don't

- Don't spawn subagents.
- Don't recursively grep — work from the product's CLAUDE.md (frontmatter + body) only.
- Don't pad. Keep the whole tour scannable in under 60 seconds.
