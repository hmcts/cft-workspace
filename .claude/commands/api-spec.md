---
description: Summarise one HMCTS service's OpenAPI spec from the local clone of cnp-api-docs.
---

Usage:
- `/api-spec pcs-api` — by exact filename (minus `.json`)
- `/api-spec ccd-data-store-api.v2_internal` — by versioned variant
- `/api-spec pcs` — by substring, shows all matching specs

Invokes the `api-spec` skill. Returns title, version, OpenAPI version, server, endpoint count by tag, auth schemes, the local spec file path, and the hosted Swagger UI link.

If `platops/cnp-api-docs` isn't cloned, run: `./scripts/add-repo platops/cnp-api-docs hmcts/cnp-api-docs`. Refresh stale specs with `./scripts/sync platops/cnp-api-docs`.

For finding *which* spec exposes a given path, use `/find-endpoint` instead.
