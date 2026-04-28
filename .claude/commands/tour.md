---
description: Guided tour of a workspace product (service team or shared platform component).
---

Usage: `/tour <product>` — e.g. `/tour nfdiv`, `/tour ccd`, `/tour wa`.

1. Read the product's CLAUDE.md at `apps/<product>/CLAUDE.md` (or `libs/CLAUDE.md` / `platops/CLAUDE.md`). If missing, say so and offer to run `/generate-product-claude-md <product>`.
2. Produce a tour:
   - One paragraph summary of what the product is and what it does for users.
   - Per-repo (from the `repos:` frontmatter): 2–3 lines covering purpose and where to start reading.
   - Cross-repo wiring: who calls whom, where shared definitions live, key integration points.
   - The 3–5 files a new contributor should read first.

Do NOT spawn subagents. Do NOT recursively grep — work from the product's CLAUDE.md (frontmatter + body). Keep the tour scannable in under 60 seconds.
