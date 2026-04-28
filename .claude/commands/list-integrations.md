---
description: List every product that integrates with a given platform (e.g. work_allocation, bulk_scan, payment).
---

Usage: `/list-integrations <integration>` — e.g. `work_allocation`, `bulk_scan`, `bulk_print`, `payment`, `send_letter`, `notify`, `idam`, `s2s`, `cdam`, `am`, `rd`, `cftlib`, `flyway`. Full list in `docs/reference/taxonomy.md`.

1. Parse `INDEX.md` for products whose `Integrations` column contains `$ARGUMENTS`.
2. Group by service-team products first, then shared platform.
3. For each, name the file/config that wires the integration in (from the product's CLAUDE.md "External integrations" section).
4. If `INDEX.md` is missing or stale, suggest running `./scripts/index`. If the integration token isn't recognised, list supported tokens.

Use the index — do not grep all clones.
