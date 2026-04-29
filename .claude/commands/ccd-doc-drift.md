---
description: Report which docs/ccd/ pages need re-verifying because their cited source files have changed.
---

Run the `ccd-doc-drift` skill.

Usage: `/ccd-doc-drift` — no arguments.

For each page in `docs/ccd/`, the skill reads the frontmatter `sources:` list, checks the git HEAD of each cited file, and compares against the SHA recorded when the page was last regenerated. Pages are bucketed as fresh, stale, broken, or untracked.

This is read-only and fast (~5 sec). To fix drift, run `/generate-ccd-docs --phase review --page <path>` per stale page, or `--topic <token>` to batch.

Distinct from `/check-doc-drift`, which detects drift between `docs/` and the upstream `platops/hmcts.github.io` site.
