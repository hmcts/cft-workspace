---
description: Find which HMCTS API service exposes a given HTTP path (searches local clone of hmcts/cnp-api-docs).
---

Usage:
- `/find-endpoint POST /cases/{caseId}/events` — method + path
- `/find-endpoint /hearings/{id}` — path only, any method
- `/find-endpoint noticeofchange` — bare substring

Invokes the `find-endpoint` skill. The skill greps `platops/cnp-api-docs/docs/specs/*.json` (cloned locally; refresh with `./scripts/sync platops/cnp-api-docs`) and resolves matches back to their owning workspace product via each product's `api_specs:` frontmatter.

If `platops/cnp-api-docs` isn't cloned, run: `./scripts/add-repo platops/cnp-api-docs hmcts/cnp-api-docs`.

For "which products use feature X" use `/find-feature` instead — that queries `INDEX.md` and operates at product granularity.
