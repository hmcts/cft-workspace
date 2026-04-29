---
description: Explain a CCD topic by routing to the relevant docs/ccd/ page.
---

Run the `ccd-explain` skill with `$ARGUMENTS`.

Usage: `/ccd-explain <topic>` — e.g. `/ccd-explain notice of change`, `/ccd-explain mid-event callbacks`, `/ccd-explain decentralisation`.

The skill resolves the question to a page in `docs/ccd/` (preferring `explanation/` for "what is" questions and `how-to/` for "how do I" questions), reads it, and answers concisely with a citation. If the docs don't cover the question, it falls back to source repos and surfaces the gap.

For *finding implementations* of a feature in source, use `/ccd-find-example` instead.
For *which products* use a feature, use `/find-feature`.
