---
name: cft-how-to
description: Find a Diátaxis how-to recipe for an action-shaped task across the workspace docs. Use when the user asks "how do I add an event in CCD", "where do I configure work allocation tasks", "how do I add a repo", "how do I publish a definition to AAT".
---

# Find a CFT how-to recipe

Route an action-shaped question to the right how-to (or tutorial) page across the workspace doc trees (`docs/` + `apps/*/docs/`), read it, and surface the steps.

## When to use

- "How do I add a complex type in CCD?"
- "How do I add a repo to the workspace?"
- "How do I publish a definition to AAT?"
- "Where's the recipe for enabling Work Basket?"

## When NOT to use

- The user wants a **conceptual explanation** ("what is X / how does Y work") — use `/cft-explain`.
- The user wants a **code example** of a feature — use `/cft-find-example`.
- The user wants a **product tour** — use `/cft-tour`.

## Procedure

1. **Look up candidate pages in `DOCS.md`** (workspace root):
   ```bash
   grep -iE '<keyword1>|<keyword2>' DOCS.md
   ```
   If `DOCS.md` is missing or stale, suggest `./scripts/docs-index` to regenerate.

2. **Rank candidates by Diátaxis level for "how-to" intent**:
   - `how-to` rows first (best fit for action-shaped questions).
   - `tutorials` rows second (when no how-to recipe exists, a tutorial may walk through the same task).
   - `reference` rows third (lookups, contracts).
   - `explanation` last — only as background, never as the answer.

3. **Disambiguate by product** as in `/cft-explain`: if hits span products, prefer the most-specific non-`workspace` product when the question names a product feature; prefer `product=workspace` for workspace/platform-shaped tasks.

4. **Fall back to grep** when `DOCS.md` gives no plausible row:
   ```bash
   ./scripts/grep -l '<term>' docs/how-to/ apps/*/docs/how-to/ docs/tutorials/ apps/*/docs/tutorials/
   ```

5. **Read the chosen page**. Pull the headline numbered steps (or the body if the page has no numbered list).

6. **Answer with the steps**. Cite the page path. Keep to ≤15 lines unless the recipe is long, in which case summarise into bullet points and link the page for full detail.

7. **Surface prerequisites and gotchas** that the page calls out — particularly anything in a "Don't" / "Caveats" section.

## Don't

- Don't paraphrase the recipe — keep the page's structure (numbered steps stay numbered).
- Don't fabricate steps not on the page. If a step is missing, say "the recipe doesn't cover X" and offer to grep source.
- Don't return the full page when a short summary will do — link to it instead.
