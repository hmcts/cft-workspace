---
description: Find every product that uses a given CCD feature (e.g. notice_of_change, case_flags).
---

Usage: `/find-feature <feature_token>` — token must be one from the taxonomy (`case_flags`, `notice_of_change`, `global_search`, `hearings`, `linked_cases`, etc. — full list in `docs/reference/taxonomy.md`).

1. Parse `INDEX.md` for products whose `CCD` column contains `$ARGUMENTS` in the `feat: …` segment.
2. List them in order of how the user usually thinks about CFT (service-team products first, then shared platform).
3. For each product, point at the file(s) wiring the feature in — read the product's `CLAUDE.md` "CCD touchpoints" section.
4. If `INDEX.md` is missing or stale, suggest `/generate-product-claude-md` (it'll re-run the index too).

Stay above the line — do not exhaustively grep every clone. Use the index. If the feature token isn't recognised, list the supported tokens from `docs/reference/taxonomy.md`.
