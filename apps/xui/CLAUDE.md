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
  - work_allocation
  - cdam
repos:
  - apps/xui/rpx-xui-webapp
  - apps/xui/rpx-xui-manage-organisations
  - apps/xui/rpx-xui-common-lib
---

# XUI (Expert UI)

XUI is the HMCTS caseworker and legal professional front-end platform. It provides two distinct
web applications — Manage Cases (for caseworkers and judiciary) and Manage Organisations (for
solicitors and legal professionals) — together with a shared Angular component library. XUI does
not own CCD case data; it is a UI platform that proxies and orchestrates calls to CCD and
surrounding platform services.

## Repos

- `apps/xui/rpx-xui-webapp` — Manage Cases: Angular SPA backed by an Express/Node API; the
  primary caseworker/judicial interface to CCD case data across all CFT jurisdictions.
- `apps/xui/rpx-xui-manage-organisations` — Manage Organisations: Angular SPA backed by an
  Express/Node API; allows solicitor firms to manage their organisation, users, and case
  access via the professional registration portal.
- `apps/xui/rpx-xui-common-lib` — Shared Angular library (`@hmcts/rpx-xui-common-lib`); provides
  timeout-notification service, session-dialog component, and other shared UI primitives consumed
  by both web apps.

## Architecture

Both `rpx-xui-webapp` and `rpx-xui-manage-organisations` follow the same dual-layer pattern: an
Angular 20 SPA (served on port 3000) communicates with an Express/Node BFF API (port 3001 for
webapp) which proxies all downstream service calls. The Node layer handles OIDC session management
(via `@hmcts/rpx-xui-node-lib`), S2S token exchange, and request forwarding; the Angular layer
uses `@hmcts/ccd-case-ui-toolkit` to render CCD wizard forms, case lists, and event flows.
Both apps use Redis for session storage in deployed environments and `@hmcts/properties-volume`
to mount AKS key-vault secrets at `/mnt/secrets/rpx`.

Manage Cases (`rpx-xui-webapp`) integrates with CCD through the CCD API Gateway
(`ccd-api-gateway-web`) for browser-facing calls and directly with `ccd-data-store-api` for
server-side API flows. It also connects to Work Allocation (`wa-task-management-api`,
`wa-workflow-api`), Access Management (`am-role-assignment-service`,
`am-org-role-mapping-service`), hearings (`hmc-cft-hearing-service` plus jurisdiction-specific
hearing APIs for SSCS, Civil, PRIVATELAW, IA, Employment), CDAM (`ccd-case-document-am-api`),
Reference Data (`rd-professional-api`, `rd-location-ref-api`, `rd-judicial-api`), and Payments
(`payment-api`). Feature flags are delivered via LaunchDarkly (`launchdarkly-js-client-sdk`).

Manage Organisations (`rpx-xui-manage-organisations`) targets the professional portal audience.
Its Node API connects to `rd-professional-api` for organisation and user management, `payment-api`
for payment account (PBA) operations, `aac-manage-case-assignment` for case-sharing flows, CCD
data store, and `am-role-assignment-service`. Both apps authenticate end-users through IDAM OIDC
(`https://idam-api.platform.hmcts.net`) using the `xuiwebapp` / `xuimowebapp` OAuth2 clients and
obtain S2S tokens for downstream calls from `rpe-service-auth-provider`.

`rpx-xui-common-lib` is an npm library (published as `@hmcts/rpx-xui-common-lib`) consumed as a
dependency by both web apps. It is not deployed independently.

## CCD touchpoints

XUI is the CCD UI platform, not a CCD-based service — it holds no case definitions of its own.
`rpx-xui-webapp` embeds `@hmcts/ccd-case-ui-toolkit` to render CCD case-event forms, case lists,
and the full CCD wizard UI. All CCD interactions go via the CCD API Gateway (for browser requests
with JWT cookies) or directly to `ccd-data-store-api` (for server-side proxied calls from Node).
The `aac-manage-case-assignment` endpoint is wired in both web apps for case-sharing and NoC
flows — XUI acts as the UI layer for those flows, but does not implement them.

## External integrations

- `idam`: OIDC login via `https://idam-api.platform.hmcts.net`; OAuth2 client IDs `xuiwebapp`
  (Manage Cases) and `xuimowebapp` (Manage Organisations); handled by `@hmcts/rpx-xui-node-lib`.
- `s2s`: S2S tokens obtained from `rpe-service-auth-provider`; microservice name `xui_webapp`;
  configured in `config/default.json` under `services.s2s`.
- `am`: Calls `am-role-assignment-service` and `am-org-role-mapping-service` for case-level
  role assignments and org role mapping; wired in `api/roleAccess/` (webapp) and
  `api/organisation/` (manage-organisations).
- `rd`: Calls `rd-professional-api`, `rd-location-ref-api`, `rd-judicial-api`, and
  `rd-caseworker-ref-api`; used for org search, location lookup, and staff reference data.
- `payment`: Calls `payment-api` for Fees & Pay flows and PBA account management in Manage Orgs.
- `cdam`: Routes document access through `ccd-case-document-am-api` (CDAM v2 endpoint wired in
  `services.documentsv2` in `config/default.json`).
- `work_allocation`: Calls `wa-task-management-api` and `wa-workflow-api`; Task Management UI is
  embedded in Manage Cases under `api/workAllocation/`.

## Notable conventions and quirks

- Both apps use `node-config` for configuration; `NODE_ENV` is always `production` in deployed
  environments. Environment-specific overrides arrive via `values.*.template.yaml` on Jenkins or
  `values.yaml` on AKS — never via extra `.json` files in `/config`.
- `rpx-xui-node-lib` (`@hmcts/rpx-xui-node-lib`) is a private HMCTS package providing Express
  middleware for OIDC, S2S, Helmet, and AppInsights; it is the shared auth/session backbone for
  both apps.
- Hearing support in Manage Cases is jurisdiction-scoped: `hearingsJurisdictions` config
  (`SSCS,PRIVATELAW,CIVIL,IA`) determines which HMC-aware service APIs are consulted.
- Both apps expose port 3000 in Docker, with the Node BFF and Angular bundles colocated in the
  same container.
- Translation service (`ts-translation-service`) is referenced in `config/default.json` as
  `services.translation` in Manage Cases, indicating UI-layer translation callback support.
- `rpx-xui-common-lib` is versioned and published to npm as `@hmcts/rpx-xui-common-lib`; the two
  web apps pin specific patch versions in their `package.json`.
