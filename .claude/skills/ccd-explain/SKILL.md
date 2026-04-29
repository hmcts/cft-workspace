---
name: ccd-explain
description: Answer a question about CCD by routing to the relevant docs/ccd/ page. Use when the user asks "what is X in CCD", "how does Y work", "explain Z" for any CCD topic — case-type model, events, states, callbacks, permissions, role assignment, decentralisation, documents/CDAM, search, NoC, case flags, work-basket, hearings, work allocation.
---

# Explain a CCD topic

Route the user's question to the right page in `docs/ccd/`, read it, and answer concisely with a citation.

## When to use

- "What is Notice of Change?"
- "How do callbacks work?"
- "What's the difference between `decentralised_ccd` and centralised CCD?"
- "What does the `Flags` field type look like?"

## When NOT to use

- The user wants to **find an example** of a feature in source — use `/ccd-find-example <feature>`.
- The user wants to **trace a specific callback** through to a Spring controller — use `/ccd-trace-callback`.
- The user wants to **find which products use a feature** — use `/find-feature`.

## Procedure

1. **Identify the topic.** Map the user's question to a topic slug from `docs/ccd/`:
   - Try a glob match first: `Glob` for `docs/ccd/**/*.md` against the keywords.
   - If that's ambiguous, `Grep` `docs/ccd/` for the keyword and pick the best-ranked page (prefer `explanation/` over `how-to/` over `reference/` for "what is" questions; reverse for "how do I" questions).
   - If the keyword resolves to the glossary (`docs/ccd/reference/glossary.md`), follow the glossary entry's link to the canonical page.
2. **Read the page**. Pull the TL;DR for the answer and the relevant body section if more depth is needed.
3. **Answer in ≤10 lines**. Cite the page path. If a code example on the page is the best answer, quote it.
4. **Offer follow-ups**. Cite the See also section so the user can drill in.

## Don't

- Don't read source repos unless `docs/ccd/` is silent on the question. If you do, surface the gap as "this isn't covered in the docs yet".
- Don't return the full page — answer the question that was asked.
- Don't invoke `ccd-expert` — that subagent is for parent agents that need CCD context. Direct user questions go through this skill, which lives in the main conversation context.
