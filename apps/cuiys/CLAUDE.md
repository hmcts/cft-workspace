---
service: cuiys
ccd_based: false
ccd_config: none
ccd_features:
  - case_flags
integrations:
  - idam
  - s2s
  - rd
  - redis
api_specs: []
exemplar_dirs:
  - apps/cuiys/cui-ra/src/main/controllers
  - apps/cuiys/cui-ra/src/main/schemas
repos:
  - apps/cuiys/cui-ra
---

# CUI Your Support (CUIYS)

CUIYS ("CUI Your Support") is a shared HMCTS microsite that lets citizens request,
view and update the support they need for their case — currently **Reasonable
Adjustments** (RAs), recorded as CCD **Case Flags v2.1**. Service citizen UIs hand
off to it via a redirect-and-callback API rather than building the RA journey
themselves.

The repo and S2S microservice are named `cui-ra` / `cui_ra` after the service's
original name, **CUIRA** (Citizen UI Reasonable Adjustments). Older Confluence
pages in the `CUIRA` space use that name for what is now CUIYS.

## Repos

- `apps/cuiys/cui-ra` — Express 5 / TypeScript microsite. Awilix DI, Nunjucks
  templating, Redis for sessions and a 1-hour payload cache. Two-endpoint payload
  API (`/api/payload`) plus the citizen journey. Fronted by an nginx HTTPS proxy
  locally.

## How it fits together

CUIYS is not embedded — a service `POST`s the flags it already holds, redirects the
citizen's browser into CUIYS, and gets the completed flags back via a callback +
`GET`. The service then writes the flags to the case using CCD manage-flag /
create-flag events. CUIYS reads available flags from `rd-commondata-api` reference
data using the citizen's IDAM token, and validates callers via S2S (allowlist
includes `prl_citizen_frontend`, `pcs_frontend`).

## Docs

Product docs live in [`apps/cuiys/docs/`](docs/):
- [Overview](docs/explanation/overview.md) — what CUIYS is and the citizen journey.
- [Onboard a Service to CUIYS](docs/how-to/onboard-a-service.md) — the service-team recipe.
- [Payload API](docs/reference/payload-api.md) — endpoints, headers, payload schema, environments.
