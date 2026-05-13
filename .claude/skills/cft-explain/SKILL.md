---
name: cft-explain
description: Answer a "what is X" / "how does Y work" / "explain Z" question about any CFT topic — workspace, CCD, XUI, WA, AM, bulk-scan, platform/CNP. Routes via DOCS.md to the right page in either the root docs/ tree or a product-level apps/<product>/docs/ tree.
---

# Explain a CFT topic

Route the user's question to the right page across the workspace doc trees (`docs/` + `apps/*/docs/`), read it, and answer concisely with a citation.

## When to use

- "What is Notice of Change?"
- "How do callbacks work?"
- "What's the difference between `decentralised_ccd` and centralised CCD?"
- "Explain the path-to-live process."
- "What's in the workspace manifest?"

## When NOT to use

- The user wants to **find an example** of a feature in source — use `/cft-find-example <feature>`.
- The user wants a **how-to recipe** for a task ("how do I add an event") — use `/cft-how-to <task>`.
- The user wants to **trace a specific CCD callback** through to a controller — use `/cft-ccd-trace-callback`.
- The user wants to **find which products use a CCD feature** — use `/cft-ccd-find-feature`.
- The user wants a **product tour** — use `/cft-tour <product>`.

## Procedure

1. **Look up candidate pages in `DOCS.md`** (workspace root). Each row is `| Product | Diátaxis | Title | Topic | Path |`.
   ```bash
   grep -iE '<keyword1>|<keyword2>' DOCS.md
   ```
   If `DOCS.md` is missing or stale, suggest `./scripts/docs-index` to regenerate.

2. **Rank candidates by Diátaxis level for "explain" intent**:
   - `explanation` rows first (best fit for "what is" / "how does X work").
   - `reference` rows second (best fit for "what fields does X have" / "what are the values of Y").
   - `how-to` and `tutorials` last — only if no explanation/reference row matches.

3. **Disambiguate by product**:
   - If all top hits share one product, answer from there.
   - If hits span products, prefer the most-specific non-`workspace` product when the question names a feature (e.g. `case_flags` → `ccd`, `work_allocation` → `wa`, `bulk_scan` → `bulk-scan`).
   - If the question is platform-shaped ("path to live", "cnp", "external IP"), prefer `product=workspace` (root docs).
   - User can disambiguate by naming the product in the query.

4. **Fall back to grep** when `DOCS.md` gives no plausible row:
   ```bash
   ./scripts/grep -l '<term>' docs/ apps/*/docs/
   ```

5. **Read the chosen page**. Pull the TL;DR / first section for the answer and any relevant deeper section.

6. **Answer in ≤10 lines**. Cite the page path. If a code example on the page is the best answer, quote it.

7. **Offer follow-ups**. Cite the See also section so the user can drill in.

## Don't

- Don't read source repos unless `DOCS.md` and the doc trees are silent on the question. If you do, surface the gap as "this isn't covered in the docs yet".
- Don't return the full page — answer the question that was asked.
- Don't invoke the `ccd-expert` subagent — that's for parent agents that need CCD context. Direct user questions go through this skill, which lives in the main conversation context.
