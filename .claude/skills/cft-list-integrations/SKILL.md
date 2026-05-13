---
name: cft-list-integrations
description: List every workspace product that integrates with a given platform — work_allocation, bulk_scan, bulk_print, payment, send_letter etc. Use when the user asks "who integrates with X", "which services use payment", "what consumes work allocation".
---

# List products by integration

Answer "which products integrate with platform X" by reading the workspace taxonomy index — not by grepping clones.

## When to use

- "Which services use Work Allocation?"
- "Who's integrated with the Payment API?"
- "What products consume Bulk Scan?"

## When NOT to use

- The user wants a **CCD feature** rather than a platform integration — use `/cft-ccd-find-feature` (those are tracked in a different INDEX column).
- The user wants the **API surface** of one platform — use `/cft-api-spec <service>`.
- The user wants to find **which service exposes** a path — use `/cft-find-endpoint`.

## Procedure

1. Parse `INDEX.md` for products whose `Integrations` column contains `$ARGUMENTS`.
2. Group results: service-team products first, then shared platform.
3. For each, name the file/config that wires the integration in by reading the product's `CLAUDE.md` "External integrations" section.
4. If `INDEX.md` is missing or stale, suggest running `./scripts/index` (or `/docs-generate-product-md` to also refresh the underlying taxonomy).

## Don't

- Don't grep all clones. Use the index — it's O(1).
- Don't invent integration tokens. If the input isn't recognised, list the supported tokens from `docs/reference/taxonomy.md`.
