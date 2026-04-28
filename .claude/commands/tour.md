---
description: Guided tour of a service team or shared platform component.
---

Usage: `/tour <area>` — e.g. `/tour nfdiv`, `/tour ccd`, `/tour wa`.

1. Read `INDEX.md` and filter rows matching `apps/<area>/` to identify the relevant clones.
2. For each, read its `CLAUDE.md` (the generated one — if missing, say so and offer to run `/generate-repo-claude-md`).
3. Produce a tour:
   - One paragraph summary of what the area does and how its repos fit together.
   - Per-repo: 2-3 lines covering purpose, runtime, where to start reading.
   - Cross-repo wiring: who calls whom, where shared definitions live.
   - The 3-5 files a new contributor should read first.

Do NOT spawn subagents. Do NOT recursively grep — work from CLAUDE.md frontmatter and bodies. Keep the tour scannable in under 60 seconds.
