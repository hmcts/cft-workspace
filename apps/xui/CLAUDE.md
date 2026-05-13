---
service: xui
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - am
  - rd
  - payment
  - cdam
  - work_allocation
exemplar_dirs: []
repos:
  - apps/xui/rpx-xui-webapp
  - apps/xui/rpx-xui-manage-organisations
  - apps/xui/rpx-xui-approve-org
  - apps/xui/rpx-xui-common-lib
  - apps/xui/ccd-case-ui-toolkit
  - apps/xui/rpx-xui-node-lib
  - apps/xui/rpx-xui-translation
  - apps/xui/rpx-xui-dev-utils
confluence_spaces:
  - EUI
  - EXUI
---

# XUI (Expert UI)

XUI is the HMCTS caseworker and legal professional front-end platform. It delivers three distinct
deployed web applications — Manage Cases (caseworkers and judiciary), Manage Organisations
(solicitor firms), and Approve Organisation (HMCTS admin approval of legal organisations) — plus
a set of shared Angular and Node libraries. XUI does not own CCD case data; it is a UI platform
that orchestrates and proxies calls to CCD and surrounding platform services.

## Repos

- `apps/xui/rpx-xui-webapp` — Manage Cases: Angular SPA backed by an Express/Node BFF; the
  primary caseworker and judicial interface to CCD case data across all CFT jurisdictions.
- `apps/xui/rpx-xui-manage-organisations` — Manage Organisations: Angular SPA backed by an
  Express/Node BFF; allows solicitor firms to manage their organisation, users, and case access.
- `apps/xui/rpx-xui-approve-org` — Approve Organisation: Angular SPA backed by an Express/Node
  BFF; HMCTS-admin-facing portal for approving new legal organisations on the platform.
- `apps/xui/rpx-xui-common-lib` — Shared Angular library (`@hmcts/rpx-xui-common-lib`); provides
  timeout-notification service, session-dialog component, and other UI primitives consumed by
  all three web apps.
- `apps/xui/ccd-case-ui-toolkit` — Angular component library (`@hmcts/ccd-case-ui-toolkit`);
  renders CCD wizard forms, case lists, event flows, and field types; consumed by all XUI apps.
- `apps/xui/rpx-xui-node-lib` — Shared Node library (`@hmcts/rpx-xui-node-lib`); provides
  Express middleware for OIDC, S2S token exchange, Helmet, and AppInsights for all three BFFs.
- `apps/xui/rpx-xui-translation` — Angular library (`rpx-xui-translation`); provides an
  Angular pipe and service for loading translations from `ts-translation-service`; consumed by
  the web apps for Welsh-language support.
- `apps/xui/rpx-xui-dev-utils` — Developer tooling scripts (Key Vault secret helpers, PR bot
  config, repo secret management); not deployed at runtime.

## Architecture

All three deployed apps follow the same dual-layer pattern: an Angular 20 SPA (port 3000) talks
to a co-located Express/Node BFF (port 3001 for webapp), which handles OIDC session management,
S2S token exchange, and proxying of downstream service calls. Containers expose port 3000; the
Node bundle and Angular static assets are colocated in the same Docker image based on
`hmctsprod.azurecr.io/base/node:20-alpine`. Sessions are stored in Redis in deployed
environments; `@hmcts/properties-volume` mounts AKS Key Vault secrets at `/mnt/secrets/rpx`.
Feature flags are delivered via LaunchDarkly (`launchdarkly-js-client-sdk`).

`rpx-xui-webapp` integrates with CCD through `ccd-api-gateway-web` for browser-facing calls and
directly with `ccd-data-store-api` for server-side flows. It also connects to Work Allocation
(`wa-task-management-api`, `wa-workflow-api`), Access Management (`am-role-assignment-service`,
`am-org-role-mapping-service`), hearings (`hmc-cft-hearing-service` plus jurisdiction-specific
hearing APIs for SSCS, Civil, PRIVATELAW, IA, Employment), CDAM (`ccd-case-document-am-api`),
Reference Data (`rd-professional-api`, `rd-location-ref-api`, `rd-judicial-api`,
`rd-caseworker-ref-api`), and Payments (`payment-api`).

`rpx-xui-manage-organisations` and `rpx-xui-approve-org` target legal professionals and HMCTS
admin respectively. Both connect to `rd-professional-api` for organisation and user management,
`aac-manage-case-assignment` for case-sharing flows, CCD data store, and
`am-role-assignment-service`. Manage Organisations also calls `payment-api` for PBA operations.

All three apps authenticate end-users through IDAM OIDC, with OAuth2 client IDs `xuiwebapp`,
`xuimowebapp`, and `xuiapproveorgwebapp` respectively, and obtain S2S tokens from
`rpe-service-auth-provider`.

## CCD touchpoints

XUI is the CCD UI platform, not a CCD-based service — it holds no case definitions of its own.
`rpx-xui-webapp` embeds `@hmcts/ccd-case-ui-toolkit` to render CCD case-event forms, case lists,
and the full CCD wizard UI. Browser-facing CCD calls go via the CCD API Gateway (with JWT
cookies); server-side proxied calls go directly to `ccd-data-store-api`. The
`aac-manage-case-assignment` endpoint is wired in all three apps for case-sharing and NoC flows —
XUI acts as the UI orchestration layer for those flows but does not implement them.

## External integrations

- `idam`: OIDC login via `https://idam-api.platform.hmcts.net`; OAuth2 client IDs `xuiwebapp`,
  `xuimowebapp`, `xuiapproveorgwebapp`; handled by `@hmcts/rpx-xui-node-lib` middleware.
- `s2s`: S2S tokens obtained from `rpe-service-auth-provider`; microservice name `xui_webapp`;
  configured in `config/default.json` under `services.s2s` in each app.
- `am`: Calls `am-role-assignment-service` and `am-org-role-mapping-service` for case-level role
  assignments and org role mapping; wired in `api/roleAccess/` (webapp) and `api/organisation/`
  (manage-organisations).
- `rd`: Calls `rd-professional-api`, `rd-location-ref-api`, `rd-judicial-api`, and
  `rd-caseworker-ref-api`; used for org search, location lookup, and judicial staff reference.
- `payment`: Calls `payment-api` for Fees & Pay flows; PBA account management in Manage Orgs.
- `cdam`: Routes document access through `ccd-case-document-am-api` (CDAM v2 endpoint wired in
  `services.documentsv2` in `config/default.json`).
- `work_allocation`: Calls `wa-task-management-api` and `wa-workflow-api`; Task Management UI
  embedded in Manage Cases under `api/workAllocation/`.

## Notable conventions and quirks

- All three apps use `node-config`; `NODE_ENV` is always `production` in deployed environments.
  Environment-specific overrides arrive via `values.*.template.yaml` on Jenkins or `values.yaml`
  on AKS — never via extra `.json` files in `/config`.
- `rpx-xui-node-lib` is the shared auth/session backbone for all three BFFs; it is published to
  npm as `@hmcts/rpx-xui-node-lib`.
- Hearing support in Manage Cases is jurisdiction-scoped: `hearingsJurisdictions` config
  (`SSCS,PRIVATELAW,CIVIL,IA`) determines which HMC-aware service APIs are consulted.
- `rpx-xui-translation` provides Angular-layer Welsh translation support by fetching phrase bundles
  from `ts-translation-service`; it is a distinct npm library rather than an inline feature.
- `rpx-xui-dev-utils` contains standalone developer scripts (Key Vault secret helpers, PR bot
  data) and is not deployed or included in any app bundle.
- `ccd-case-ui-toolkit` is published as `@hmcts/ccd-case-ui-toolkit` on npm and versioned
  independently; all three deployed apps pin a specific patch version in their `package.json`.
