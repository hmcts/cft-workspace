---
name: cft-ccd-find-feature
description: Find every product that uses a given CCD feature token (e.g. notice_of_change, case_flags). Use when the user asks "which services use X", "who has NoC enabled", "what products configure case flags".
---

# Find products by CCD feature

Answer "which products use feature X" by reading the workspace taxonomy index — not by grepping clones.

## When to use

- "Which services have Notice of Change enabled?"
- "Who's using `case_flags`?"
- "What products configure `global_search`?"

## When NOT to use

- The user wants a **code example** of the feature — use `/cft-find-example`.
- The user wants an **explanation** of the feature — use `/cft-explain`.
- The user wants to **trace a callback** for an event — use `/cft-ccd-trace-callback`.

## Procedure

1. Parse `INDEX.md` for products whose `CCD` column contains `$ARGUMENTS` in the `feat: …` segment.
2. List them in order of how the user usually thinks about CFT — service-team products first, then shared platform.
3. For each product, point at the file(s) wiring the feature in by reading the product's `CLAUDE.md` "CCD touchpoints" section.
4. If `INDEX.md` is missing or stale, suggest `/docs-generate-product-md` (it'll re-run the index too).

## Don't

- Don't exhaustively grep every clone. Use the index — it's O(1).
- Don't invent feature tokens. If the input isn't recognised, list the supported tokens from `docs/reference/taxonomy.md`.
