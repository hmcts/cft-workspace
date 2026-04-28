---
description: Find every repo that uses a given CCD feature (e.g. notice_of_change, case_flags).
---

Usage: `/find-feature <feature_token>` — token must be one from the taxonomy (`case_flags`, `notice_of_change`, `global_search`, `hearings`, `linked_cases`, etc.).

1. Parse `INDEX.md` for repos whose `ccd_features` column contains `$ARGUMENTS`.
2. List them grouped by service area.
3. For each repo, point at the file(s) wiring the feature in (read the repo's CLAUDE.md "CCD touchpoints" section).
4. If a repo lacks CLAUDE.md (no taxonomy), warn that it may also use the feature but isn't indexed; offer to run `/generate-repo-claude-md` for it.

Stay above the line — do not exhaustively grep every clone. Use the index. If the feature token isn't recognised, list the supported tokens from `docs/reference/taxonomy.md`.
