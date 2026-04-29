---
description: Find real, in-repo examples of a CCD feature across SDK test-projects, ccd-test-definitions, and service-team repos.
---

Run the `ccd-find-example` skill with `$ARGUMENTS`.

Usage: `/ccd-find-example <feature>` — e.g. `/ccd-find-example notice_of_change`, `/ccd-find-example case_flags`, `/ccd-find-example mid_event`.

The skill searches in priority order:
1. `libs/ccd-config-generator/test-projects/{e2e, nfdiv-case-api, pcs-api, sptribs-case-api, adoption-cos-api}` — preferred for SDK examples.
2. `apps/ccd/ccd-test-definitions/src/main/resources` — preferred for JSON examples.
3. `apps/<service>/` — fall through when 1 + 2 don't cover the feature.

Returns up to 5 file paths with short excerpts. For *which products* use a feature, use `/find-feature`. For an explanation of the feature, use `/ccd-explain`.
