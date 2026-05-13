---
title: Overview
topic: overview
diataxis: explanation
product: xui
audience: both
sources:
  - rpx-xui-webapp:api/application.ts
  - rpx-xui-webapp:api/proxy.config.ts
  - rpx-xui-webapp:config/default.json
  - rpx-xui-webapp:src/app/app.module.ts
  - rpx-xui-webapp:src/app/app.routes.ts
  - rpx-xui-webapp:api/activityTracker/index.ts
  - rpx-xui-webapp:config/custom-environment-variables.json
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1624180314"
    title: "Expert UI System Context"
    last_modified: "2023-12-01T00:00:00Z"
    space: "EUI"
  - id: "1658260199"
    title: "Architecture"
    last_modified: "2025-06-18T00:00:00Z"
    space: "EXUI"
  - id: "1091503154"
    title: "Expert UI Service Onboarding FAQ"
    last_modified: "2024-01-01T00:00:00Z"
    space: "EUI"
  - id: "1933986267"
    title: "Proxy Configuration on Manage Case"
    last_modified: "2025-01-01T00:00:00Z"
    space: "EXUI"
  - id: "1496583492"
    title: "Expert UI - Low Level Design - Activity Tracker"
    last_modified: "2021-06-18T00:00:00Z"
    space: "EUI"
  - id: "1923490375"
    title: "Dates and Times on Expert UI"
    last_modified: "2025-01-01T00:00:00Z"
    space: "EXUI"
  - id: "1118404655"
    title: "Expert UI Browser Support"
    last_modified: "2020-07-01T00:00:00Z"
    space: "EUI"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- XUI (Expert UI, also known as "ExUI") is the HMCTS caseworker and legal professional front-end platform -- it is the UI layer over CCD, not a CCD-based service. Publicly branded as **MyHMCTS**.
- Three deployed web applications: **Manage Cases** (caseworkers/judiciary), **Manage Organisations** (solicitor firms), and **Approve Organisation** (HMCTS admin).
- All three follow the same architecture: an Angular SPA backed by a co-located Express/Node BFF in a single Docker container.
- Shared libraries: `@hmcts/ccd-case-ui-toolkit` (CCD form/event rendering), `@hmcts/rpx-xui-common-lib` (shared Angular components), `@hmcts/rpx-xui-node-lib` (OIDC/S2S/session middleware).
- XUI holds no CCD case definitions of its own -- it orchestrates and proxies calls to CCD Data Store, Work Allocation, Access Management, Hearings, Payments, Reference Data, and CDAM.
- Any CFT service with a live CCD definition automatically gets a working UI in Manage Cases -- service teams onboard without writing front-end code.

## The three deployed applications

### Manage Cases (`rpx-xui-webapp`)

The primary caseworker and judicial interface across all CFT jurisdictions. Handles case viewing, case-event execution, task management (Work Allocation), hearings, role access, Notice of Change, global search, payments, and refunds.

- IDAM OAuth2 client ID: `xuiwebapp`
- S2S microservice name: `xui_webapp`
- Angular lazy-loaded route modules: `cases`, `work`, `hearings`, `booking`, `role-access`, `noc`, `search`, `refunds`, `staff`, `query-management` (`app.routes.ts`)

### Manage Organisations (`rpx-xui-manage-organisations`)

Allows solicitor firms to manage their organisation, users, PBA accounts, and case access. Connects to `rd-professional-api` for organisation management and `aac-manage-case-assignment` for case-sharing flows.

- IDAM OAuth2 client ID: `xuimowebapp`

### Approve Organisation (`rpx-xui-approve-org`)

An HMCTS-admin-facing portal for approving new legal organisations registering on the platform. Connects to `rd-professional-api`.

- IDAM OAuth2 client ID: `xuiapproveorgwebapp`

## Architecture: the dual-layer pattern

All three apps share an identical structural pattern:

```
Browser --> Angular SPA (port 3000) --> Express BFF (same process) --> Downstream services
```

A single Node process (`api/server.ts` calling `createApp()` in `api/application.ts:53`) serves both the Angular static bundle and the BFF API. The BFF handles:

1. **OIDC session management** -- delegated to `@hmcts/rpx-xui-node-lib`, which acts as the OAuth2 relying party.
2. **S2S token exchange** -- the BFF obtains service-to-service tokens from `rpe-service-auth-provider` and attaches them as `ServiceAuthorization` headers.
3. **Reverse proxying** -- browser calls to CCD, documents, payments, annotations, and other services are proxied via `http-proxy-middleware` (registered before `bodyParser` at `api/application.ts:113-114`).
4. **Server-side API orchestration** -- routes under `/api/*` perform composed calls (e.g. merging IDAM roles with AM role assignments at `/api/user/details`).

Sessions are stored in Redis in deployed environments (`FEATURE_REDIS_ENABLED=true`); locally they fall back to a file store. Feature flags are delivered client-side via LaunchDarkly (`launchdarkly-js-client-sdk 3.8.1`), with the client ID injected from server-side Key Vault secrets through the `/external/config/ui` endpoint.

## Shared libraries

| Library | npm package | Role |
|---------|-------------|------|
| `ccd-case-ui-toolkit` | `@hmcts/ccd-case-ui-toolkit` | Angular component library rendering CCD wizard forms, case lists, event flows, and field types |
| `rpx-xui-common-lib` | `@hmcts/rpx-xui-common-lib` | Shared Angular primitives: timeout notification, session dialog, `LaunchDarklyService`, `FeatureToggleService` |
| `rpx-xui-node-lib` | `@hmcts/rpx-xui-node-lib` | Express middleware: OIDC/OAuth2 sessions, S2S token acquisition, Helmet CSP, health-check hooks |
| `rpx-xui-translation` | `rpx-xui-translation` | Angular pipe and service for Welsh-language translation via `ts-translation-service` |

The CCD case UI toolkit is the critical rendering layer -- without it, XUI cannot display case-event forms or execute CCD wizard flows. It is published independently and pinned by version in each app's `package.json`.

## XUI's role as the CCD UI platform

XUI does not define case types, events, or field schemas. Those belong to service teams' CCD definition files, loaded into `ccd-definition-store-api`. XUI's job is to:

- **Render** whatever case structure the definition store returns, via `@hmcts/ccd-case-ui-toolkit`.
- **Proxy** browser-facing CCD calls through the CCD API Gateway (`ccd-api-gateway-web`) and make server-side calls directly to `ccd-data-store-api`.
- **Orchestrate** cross-platform flows -- case assignment (via `aac-manage-case-assignment`), task management (via `wa-task-management-api`), hearings (via `hmc-cft-hearing-service`), and document access (via CDAM).

This means that any CFT service team whose case type is loaded into CCD automatically gets a working UI in Manage Cases without writing front-end code.

## Downstream service integration

The Manage Cases BFF connects to over 25 downstream services. Key integrations (`api/proxy.config.ts`):

| Domain | Services | Integration style |
|--------|----------|-------------------|
| CCD | `ccd-api-gateway-web`, `ccd-data-store-api`, `aac-manage-case-assignment` | HTTP proxy (browser-facing) + direct Axios (server-side) |
| Work Allocation | `wa-task-management-api`, `wa-workflow-api` | Direct Axios via `/workallocation/*` routes |
| Access Management | `am-role-assignment-service`, `am-org-role-mapping-service`, `am-judicial-booking-service` | Direct Axios via `/api/role-access/*` and `/am/*` |
| Hearings | `hmc-cft-hearing-service` + jurisdiction APIs (SSCS, Civil, PRIVATELAW, IA, Employment) | Direct Axios; jurisdiction-scoped via `hearingsJurisdictions` config |
| Documents | `ccd-case-document-am-api` (CDAM), `dm-store`, `em-hrs-api`, `em-annotation-api` | HTTP proxy (`/documents`, `/documentsv2`, `/hearing-recordings`, `/em-anno`) |
| Reference Data | `rd-professional-api`, `rd-location-ref-api`, `rd-judicial-api`, `rd-caseworker-ref-api`, `rd-commondata-api` | Mixed proxy and direct |
| Payments | `payment-api`, `ccpay-refunds-api`, `ccpay-notifications-service` | HTTP proxy (`/payments`, `/api/refund`, `/api/notification`) |
| Auth | `idam-api`, `rpe-service-auth-provider` | OIDC discovery + S2S lease (handled by node-lib) |

All downstream calls carry `Authorization` (user bearer token) and `ServiceAuthorization` (S2S token) headers, set by the node-lib middleware (`api/lib/proxy.ts`).

### Proxy security model

The BFF uses **prefix-based subtree proxying** via `http-proxy-middleware` (the `applyProxy()` function in `api/lib/middleware/proxy.ts`). Key characteristics:

- Proxies are registered **before** `bodyParser` middleware (line 114 of `api/application.ts`), so request bodies pass through unmodified.
- Authentication middleware (`@hmcts/rpx-xui-node-lib`) runs before the proxy layer and **generates** the `Authorization` and `ServiceAuthorization` headers server-side. Client-supplied auth headers cannot escalate privileges -- if a client sends conflicting headers, the downstream service rejects them with 401.
- Routes under `/workallocation`, `/api`, `/am`, and `/external` are **not** proxy subtrees -- they are handled by local Express routers with explicit route definitions. Unknown sub-paths under these prefixes fall through to the SPA catch-all (serving `index.html`).
- CSRF protection is applied via `@dr.pogodin/csurf` middleware with a cookie-based double-submit token (`XSRF-TOKEN`), applied after the proxy registration but before the SPA catch-all.

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- The Confluence "Proxy Configuration on Manage Case" page notes that HTTP methods are not
     constrained at the proxy boundary and payload validation is inconsistent, relying on
     downstream services for enforcement. This is a known hardening area (EXUI backlog). -->

## User types and access

XUI serves three distinct user populations, each with different capabilities:

| User type | Application | Access method | Key capabilities |
|-----------|-------------|---------------|------------------|
| **Solicitors / Legal representatives** | Manage Cases, Manage Organisations | Self-service registration via Manage Organisations; org admin invites colleagues | Create/progress cases, case sharing within organisation, Notice of Change |
| **Caseworkers / CTSC staff** | Manage Cases | Onboarded via staff admin functionality in Manage Cases | Case processing, Work Allocation task management, case sharing |
| **Judiciary / Panel members** | Manage Cases | Single sign-on access | Case viewing, judicial booking, role-based case access |
| **MoJ admin** | Approve Organisation | Direct IDAM account | Approve/reject new organisation registrations |

Citizens **cannot** access Expert UI. Citizen-facing journeys are served by separate citizen frontend applications (e.g. `nfdiv-frontend`, `civil-citizen-ui`).

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- The "Expert UI Service Onboarding FAQ" states that Expert UI is currently focussing on
     meeting the needs of solicitors and other legal representatives, and that user journeys
     for caseworkers and judicial decision makers "may not work as expected" -- this appears
     to be an outdated claim from the MVP era, as Work Allocation and Judicial Booking are
     now mature features in Manage Cases. -->

## Service onboarding

Any CFT service with a live CCD definition loaded into `ccd-definition-store-api` can use Expert UI without writing frontend code. The onboarding process:

1. **Prerequisites**: Service must have a CCD definition loaded into AAT/Production. XUI imposes no specific requirements on definition content or structure.
2. **Configuration**: Inform the ExUI team of (a) the IDAM roles to allocate to new users (e.g. `caseworker-divorce-solicitor`) and (b) the CCD jurisdiction identifier (e.g. `DIVORCE`).
3. **Testing**: Deploy the CCD definition to AAT and run functional/regression tests against the AAT ExUI instance.
4. **Roll-out**: Onboard users -- solicitors via self-registration in Manage Organisations, staff via staff admin in Manage Cases, judges via SSO.

For services wanting **Work Allocation** in ExUI, additional configuration is needed: the LaunchDarkly flag `workallocation-service-user-roles` must include the service's top-level role, and Work Allocation-specific CCD config must be in place.

For services wanting **Hearings Management**, onboarding requires a jurisdiction-specific hearing API and inclusion in the `HEARINGS_JURISDICTIONS` env var (default: `SSCS,PRIVATELAW,CIVIL,IA`; overrideable per environment).

## Configuration and deployment

- Config is managed via `node-config`: a single `config/default.json` plus `config/custom-environment-variables.json` for env-var overrides.
- `NODE_ENV` is always `production` in deployed environments. Environment-specific values arrive through Helm `values.*.template.yaml` on Jenkins -- there are no per-environment JSON files.
- AKS Key Vault secrets are mounted via `@hmcts/properties-volume` at `/mnt/secrets/rpx` and accessed as `secrets.rpx.*` in config (e.g. `mc-s2s-client-secret`, `mc-idam-client-secret`, `launch-darkly-client-id`).
- Feature flags use a dual mechanism: server-side flags in `config/default.json` (toggled by env vars like `FEATURE_REDIS_ENABLED`), and client-side flags from LaunchDarkly (evaluated per-user in the Angular SPA).

## Activity tracking

XUI includes an activity tracking subsystem that shows which users are currently viewing or editing a case. The activity is proxied through the BFF at `/activity` to `ccd-case-activity-api` (configured at `services.activityApi` in `config/default.json`).

The current implementation uses **REST-based polling**: each client sends GET/POST requests every 5-10 seconds to report and query activity state. At scale this generates a very high message volume -- historical data (2021) showed activity tracking accounted for ~86% of all CCD API gateway traffic.

<!-- DIVERGENCE: Confluence "Expert UI - Low Level Design - Activity Tracker" (1496583492) describes a
     proposed WebSocket-based redesign using Socket.io with CASEVIEW/CASEUPDATE/CASEWATCH/CASEUNSUB
     messages and Redis pub-sub for horizontal scaling. However, the source code
     (rpx-xui-webapp:api/activityTracker/index.ts and api/proxy.config.ts) shows the current
     implementation still uses the REST proxy approach via /activity -> ccd-case-activity-api.
     The WebSocket redesign was proposed but not yet implemented in the webapp. Source wins. -->

Activity tracking is enabled for caseworkers and judiciary but typically **not** for solicitors (controlled via feature flags and role-based configuration).

## Date and time handling

XUI's target state for date/time handling is:

- **Display** dates/times in **local time** (Europe/London) to users
- **Send** dates/times to backend services in **UTC**

This is being addressed under epic EXUI-3864. Historically, the frontend handled dates inconsistently -- some in UTC, some in local time -- and many downstream services store user-entered dates as local time without timezone indicators. The `moment-timezone` library is used for date manipulation in the BFF.

Key considerations for service teams:

- CCD persists system-generated timestamps in UTC
- User-entered `Date`/`DateTime` field values are frequently treated as local time by downstream services (most jurisdictions confirmed this in the cross-service survey)
- The inconsistency means there may be existing case data that is technically stored in UTC but semantically represents local time
- Services should confirm their expectations via the ExUI team's date/time questionnaire before onboarding

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- The "Dates and Times on Expert UI" page (1923490375) documents responses from 15 jurisdiction
     services confirming that most treat user-entered dates as local time. The full target-state
     migration has large impact for services with existing case data (potential 1-hour BST shift). -->

## Naming conventions

The product uses several names across different contexts:

| Context | Name |
|---------|------|
| Full team name | DTS Expert UI |
| Product name | Expert UI |
| Acronym | ExUI (pronounced "echs yoo eye") |
| Public-facing brand | MyHMCTS |
| Repository prefix | `rpx-xui-` |
| npm scope | `@hmcts/rpx-xui-*` and `@hmcts/ccd-case-ui-toolkit` |

## See also

- [Architecture](architecture.md) — deep dive into the dual-layer SPA + BFF pattern, deployment, and security model
- [BFF Pattern](bff-pattern.md) — how the Express backend-for-frontend proxies requests and handles auth
- [Feature Flags](feature-flags.md) — how LaunchDarkly and BFF config flags control UI behaviour
- [Reference: Downstream Services](../reference/downstream-services.md) — full list of services Manage Cases and Manage Organisations connect to
- [Reference: Shared Libraries](../reference/shared-libraries.md) — `rpx-xui-node-lib`, `rpx-xui-common-lib`, and `rpx-xui-translation` at a glance
- [Glossary](../reference/glossary.md) — definitions of XUI-specific terms
