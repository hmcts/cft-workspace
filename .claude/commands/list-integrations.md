---
description: List every service that integrates with a given platform (e.g. work_allocation, bulk_scan, payment).
---

Usage: `/list-integrations <integration>` — e.g. `work_allocation`, `bulk_scan`, `bulk_print`, `payment`, `send_letter`, `notify`, `idam`, `cdam`, `am`, `rd`.

1. Parse `INDEX.md` for repos whose `integrations` column contains `$ARGUMENTS`.
2. Group results by service team (`apps/<area>/`).
3. For each, name the file/config that wires the integration (from the repo's CLAUDE.md "Integrations" section).
4. If `INDEX.md` is missing or stale, suggest running `./scripts/index`. If the integration token isn't recognised, list supported tokens.

Use the index — do not grep all clones.
