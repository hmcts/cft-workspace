---
title: Config Schema
topic: architecture
diataxis: reference
product: xui
audience: both
sources:
  - rpx-xui-webapp:config/default.json
  - rpx-xui-webapp:config/custom-environment-variables.json
  - rpx-xui-webapp:api/configuration/references.ts
  - rpx-xui-webapp:api/configuration/index.ts
  - rpx-xui-webapp:api/configuration/uiConfigRouter.ts
  - rpx-xui-webapp:api/auth/index.ts
  - rpx-xui-webapp:api/proxy.config.ts
  - rpx-xui-webapp:api/lib/middleware/proxy.ts
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/xui/rpx-xui-webapp/config/default.json
  - apps/xui/rpx-xui-webapp/config/custom-environment-variables.json
  - apps/xui/rpx-xui-webapp/api/configuration/references.ts
confluence:
  - id: "1287784365"
    title: "Config Refactoring"
    last_modified: "unknown"
    space: "EUI"
  - id: "1933986267"
    title: "Proxy Configuration on Manage Case"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1687521311"
    title: "Work Allocation Service Onboarding Configuration"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1824129920"
    title: "Service Operations Guide"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1376716476"
    title: "Expert UI Low Level Design - Session Management Library"
    last_modified: "unknown"
    space: "EUI"
  - id: "1875844308"
    title: "Approach to moving away from Launch Darkly"
    last_modified: "unknown"
    space: "EXUI"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- `rpx-xui-webapp` uses [`node-config`](https://github.com/node-config/node-config) with two checked-in files: `config/default.json` (base values) and `config/custom-environment-variables.json` (env-var mapping).
- `NODE_ENV` is always `production` in deployed environments; overrides come from Helm values, not extra JSON files. A pod restart is required to pick up changed env vars.
- Feature flags are booleans toggled via `FEATURE_*` env vars; env vars must be JSON-formatted strings (`"true"` / `"false"`).
- Session secrets and service credentials are mounted from AKS Key Vault via `@hmcts/properties-volume` at `secrets.rpx.*`.
- `getConfigValue<T>(ref)` and `showFeature(feature)` in `api/configuration/index.ts` are the canonical accessors; the Angular SPA receives a whitelisted subset via `GET /external/config/ui`.
- Backend proxying uses `http-proxy-middleware` via `applyProxy()` (`api/proxy.config.ts`); proxy routes are prefix-based subtrees applied after `authInterceptor`.

## Top-level keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `environment` | string | _(varies)_ | Logical environment name; overridden by `NODE_CONFIG_ENV` |
| `microservice` | string | `xui_webapp` | S2S microservice name used for token lease (`config/default.json:116`) |
| `protocol` | string | `https` | Protocol for constructing callback URLs |

## Cookies

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `cookies.token` | string | `__auth__` | Cookie name for the access token |
| `cookies.userId` | string | `__userid__` | Cookie name for the user ID |
| `cookies.sessionId` | string | `__sessionId__` | Cookie name for the session identifier |

## Service URLs

All service URLs are overridden via env vars declared in `config/custom-environment-variables.json`. Default values point to production internal DNS names unless noted otherwise.

| Config path | Env var | Default target | Notes |
|-------------|---------|----------------|-------|
| `services.ccd.componentApi` | `SERVICES_CCD_COMPONENT_API_PATH` | `ccd-api-gateway-web-prod` | Browser-facing CCD calls (proxied) |
| `services.ccd.dataApi` | `SERVICES_CCD_DATA_STORE_API_PATH` | `ccd-data-store-api-prod` | Server-side direct calls |
| `services.ccd.caseAssignmentApi` | `SERVICES_CCD_CASE_ASSIGNMENT_API_PATH` | `aac-manage-case-assignment-prod` | Case assignment / NoC |
| `services.documentsv2.api` | `SERVICES_DOCUMENTS_API_PATH_V2` | `ccd-case-document-am-api-prod` | CDAM v2 endpoint |
| `services.documents.api` | `SERVICES_DOCUMENTS_API_PATH` | `dm-store-prod` | DM Store v1 (legacy) |
| `services.idam.idamApiUrl` | `SERVICES_IDAM_API_URL` | `https://idam-api.platform.hmcts.net` | IDAM API |
| `services.idam.idamLoginUrl` | `SERVICES_IDAM_LOGIN_URL` | `https://hmcts-access.service.gov.uk` | IDAM web login |
| `services.idam.idamClientID` | — | `xuiwebapp` | OIDC client ID |
| `services.s2s` | `SERVICE_S2S_PATH` | `rpe-service-auth-provider-prod` | S2S token provider |
| `services.roleAssignment.roleApi` | `SERVICES_ROLE_ASSIGNMENT_API_PATH` | `am-role-assignment-service-prod` | AM Role Assignment |
| `services.roleAssignment.mappingApi` | `SERVICES_ROLE_ASSIGNMENT_MAPPING_API_PATH` | `am-org-role-mapping-service-prod` | AM Org Role Mapping |
| `services.roleAssignment.judicialBookingApi` | `SERVICES_JUDICIAL_BOOKING_API_PATH` | `am-judicial-booking-service-prod` | AM Judicial Booking |
| `services.workAllocation.taskApi` | `SERVICES_WORK_ALLOCATION_TASK_API_PATH` | `wa-task-management-api-prod` | WA Task Management |
| `services.workAllocation.workflowApi` | `SERVICES_WA_WORKFLOW_API_URL` | `wa-workflow-api-prod` | WA Workflow |
| `services.hearings.hmcApi` | `SERVICES_HMC_HEARINGS_COMPONENT_API` | `hmc-cft-hearing-service-prod` | HMC central API |
| `services.emHrs.api` | `SERVICES_EM_HRS_API_PATH` | `em-hrs-api-prod` | EM Hearing Recordings |
| `services.emAnno.api` | `SERVICES_EM_ANNO_API_URL` | `em-anno-prod` | EM Annotation |
| `services.emDocAssembly.api` | `SERVICES_EM_DOCASSEMBLY_API_URL` | `dg-docassembly-prod` | EM Doc Assembly |
| `services.emMarkup.api` | `SERVICES_MARKUP_API_URL` | `em-npa-prod` | EM Markup / NPA |
| `services.icp.api` | `SERVICES_ICP_API_URL` | `em-icp-prod` | EM In-Court Presentation |
| `services.prd.api` | `SERVICES_PRD_API_URL` | `rd-professional-api-prod` | RD Professional |
| `services.prd.locationApi` | `SERVICES_LOCATION_REF_API_URL` | `rd-location-ref-api-demo` | RD Location Ref (note: default is demo, not prod) |
| `services.prd.judicialApi` | `SERVICES_PRD_JUDICIAL_API` | `rd-judicial-api-aat` | RD Judicial (note: default is aat, not prod) |
| `services.prd.commondataApi` | `SERVICES_PRD_COMMONDATA_API` | `rd-commondata-api-aat` | RD Commondata (note: default is aat, not prod) |
| `services.prd.caseworkerApi` | `SERVICES_CASE_CASEWORKER_REF_PATH` | `rd-caseworker-ref-api-prod` | RD Caseworker |
| `services.prd.judicialworkerApi` | `SERVICES_CASE_JUDICIALWORKER_REF_PATH` | `rd-judicialworker-ref-api-prod` | RD Judicialworker |
| `services.payments.api` | `SERVICES_PAYMENTS_URL` | `payment-api-prod` | Payments |
| `services.refunds.api` | `SERVICES_REFUNDS_API_URL` | `ccpay-refunds-api-prod` | Refunds |
| `services.notifications.api` | `SERVICES_NOTIFICATIONS_API_URL` | `ccpay-notifications-service-prod` | Pay Notifications |
| `services.translation.api` | `SERVICES_TRANSLATION_API_URL` | `ts-translation-service-prod` | Welsh Translation |
| `services.lau.api` | `SERVICES_LAU_SPECIFIC_CHALLENGED_ACCESS_API_PATH` | `lau-case-backend-prod` | LAU Challenged Access |

## Hearings jurisdiction config

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `services.hearings.hearingsJurisdictions` | string (CSV) | `SSCS,PRIVATELAW,CIVIL,IA` | Comma-separated list of jurisdictions with HMC support |
| `services.hearings.sscs.serviceApi` | string | _(per-env)_ | SSCS hearing API |
| `services.hearings.privatelaw.serviceApi` | string | _(per-env)_ | Private Law hearing API |
| `services.hearings.civil.serviceApi` | string | _(per-env)_ | Civil hearing API |
| `services.hearings.ia.serviceApi` | string | _(per-env)_ | Immigration & Asylum hearing API |
| `services.hearings.employment.serviceApi` | string | _(per-env)_ | Employment hearing API |

## Jurisdiction and service lists

These string-valued settings control which jurisdictions/services are enabled for different features. All are CSV (comma-separated values).

| Config path | Env var | Default | Description |
|-------------|---------|---------|-------------|
| `globalSearchServices` | `GLOBAL_SEARCH_SERVICES` | `IA,CIVIL,PRIVATELAW,PUBLICLAW,EMPLOYMENT,ST_CIC` | Services enabled for global search |
| `waSupportedJurisdictions` | `WA_SUPPORTED_JURISDICTIONS` | `IA,CIVIL,PRIVATELAW,PUBLICLAW,EMPLOYMENT,ST_CIC` | Jurisdictions enabled for Work Allocation |
| `staffSupportedJurisdictions` | `STAFF_SUPPORTED_JURISDICTIONS` | `ST_CIC,CIVIL,EMPLOYMENT,PRIVATELAW,PUBLICLAW,IA,SSCS,DIVORCE,FR,PROBATE` | Jurisdictions shown in Staff UI |
| `jurisdictions` | `JURISDICTIONS` | `DIVORCE,PROBATE,FR,PUBLICLAW,IA,SSCS,EMPLOYMENT,HRS,CIVIL,CMC,PRIVATELAW` | Full list of supported jurisdictions |

## Service-to-Reference-Data mapping

`serviceRefDataMapping` (`SERVICE_REF_DATA_MAPPING` env var, `__format: "json"`) maps jurisdiction service names to RD service codes. This drives which users/locations are fetched from Reference Data for Work Allocation.

| Service | Service Codes |
|---------|---------------|
| `IA` | `BFA1` |
| `CIVIL` | `AAA6`, `AAA7` |
| `PRIVATELAW` | `ABA5` |
| `PUBLICLAW` | `ABA3` |
| `SSCS` | `BBA3` |
| `ST_CIC` | `BBA2` |
| `EMPLOYMENT` | `BHA1` |
| `DIVORCE` | `ABA1` |
| `FR` | `ABA2` |
| `PROBATE` | `ABA6` |

When onboarding a new service for Work Allocation, the entry must be added here and the corresponding LaunchDarkly flags (`workallocation-service-user-roles`, `wa-service-config`, `wa-landing-page-roles`) must be updated to include the new jurisdiction's roles.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Feature flags

All feature flags live under the `feature` namespace. Env vars use `__format: "json"` in `custom-environment-variables.json`, so values must be JSON strings (`"true"` / `"false"`).

| Flag key (`feature.*`) | Default | Env var | Description |
|------------------------|---------|---------|-------------|
| `appInsightsEnabled` | `true` | `FEATURE_APP_INSIGHTS_ENABLED` | Enable Azure Application Insights |
| `proxyEnabled` | `false` | `FEATURE_PROXY_ENABLED` | Enable corporate HTTP proxy |
| `secureCookieEnabled` | `true` | `FEATURE_SECURE_COOKIE_ENABLED` | Mark session cookie as `Secure` |
| `helmetEnabled` | `true` | `FEATURE_HELMET_ENABLED` | Enable Helmet security headers + CSP |
| `termsAndConditionsEnabled` | `false` | `FEATURE_TERMS_AND_CONDITIONS_ENABLED` | Require T&C acceptance |
| `redisEnabled` | `false` | `FEATURE_REDIS_ENABLED` | Use Redis for session storage (vs file store) |
| `oidcEnabled` | `false` | `FEATURE_OIDC_ENABLED` | Use OIDC auth (vs legacy OAuth2) |
| `workAllocationEnabled` | `false` | `FEATURE_WORKALLOCATION_ENABLED` | Enable Work Allocation routes |
| `jrdELinksV2Enabled` | `true` | `FEATURE_JRD_E_LINKS_V2_ENABLED` | Use JRD eLinks v2 API |
| `lauSpecificChallengedEnabled` | `false` | `FEATURE_LAU_SPECIFIC_CHALLENGED_ENABLED` | Enable LAU specific challenged access logging |
| `docsEnabled` | `false` | `FEATURE_DOCS_ENABLED` | Enable Swagger docs UI at `/api/docs` |
| `substantiveRoleEnabled` | `true` | `FEATURE_SUBSTANTIVE_ROLE_ENABLED` | Include substantive roles in role assignment |
| `accessManagementEnabled` | `true` | `FEATURE_ACCESS_MANAGEMENT_ENABLED` | Enable access-management routes |
| `compressionEnabled` | `false` | `FEATURE_COMPRESSION_ENABLED` | Enable gzip response compression |
| `queryIdamServiceOverride` | `true` | `FEATURE_QUERY_IDAM_SERVICE_OVERRIDE` | Fetch IDAM issuer override at startup |

## Session and Redis settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `redis.host` | string | _(per-env)_ | Redis hostname |
| `redis.port` | number | `6380` | Redis port (TLS) |
| `redis.tls` | boolean | `true` | Use TLS for Redis connection |
| `redis.prefix` | string | `activity:` | Key prefix for session entries |
| `redis.ttl` | number | `86400` | Session TTL in seconds (24 hours) |

Session name is `xui-webapp`. When `feature.redisEnabled` is `false`, sessions fall back to file-based storage at `.sessions` or `/tmp/sessions`.

Session management is handled by `@hmcts/rpx-xui-node-lib`, which wraps `express-session`, `connect-redis`, and `passport.js`. The library:
- Generates S2S tokens via `rpe-service-auth-provider` and caches them (refreshing on expiry)
- Attaches `Authorization` and `ServiceAuthorization` headers to downstream requests server-side
- Handles OIDC/OAuth2 authentication flows via passport.js strategies
- Supports race conditions across load-balanced pods by initialising the Redis connection at application startup

In deployed (AKS) environments, the Redis connection string is provided via Key Vault secret `secrets.rpx.webapp-redis-connection-string`.

## Session timeouts

`sessionTimeouts` (`SESSION_TIMEOUTS` env var, `__format: "json"`) is an array of objects matched by user role suffix. The first matching pattern wins; the final entry uses `.` as a catch-all.

| Field | Type | Description |
|-------|------|-------------|
| `pattern` | string | Role suffix to match (regex) |
| `totalIdleTime` | number | Max idle time (minutes) before session expires |
| `idleModalDisplayTime` | number | Time (minutes) the idle-warning modal is shown before logout |

**Default entries** (from `config/default.json`):

| Pattern | Total Idle (min) | Modal Display (min) | Applies to |
|---------|-----------------|--------------------:|------------|
| `-dwpresponsewriter` | 30 | 3 | DWP response writers (SSCS) |
| `-homeoffice` | 240 | 3 | Home Office users (IA) |
| `-solicitor` | 50 | 10 | Solicitors |
| `.` | 480 | 10 | All other users (catch-all) |

The `rpx-xui-common-lib` Angular library provides the timeout-notification UI component that displays the idle modal and triggers logout on expiry.

## UI configuration endpoint (`/external/config/ui`)

The Angular SPA fetches configuration at bootstrap from `GET /external/config/ui` (`api/configuration/uiConfigRouter.ts`). This endpoint returns a whitelisted subset of config values — secrets are never exposed. The response is injected into Angular via the `ENVIRONMENT_CONFIG` injection token.

**Response shape** (from source):

| Field | Source | Description |
|-------|--------|-------------|
| `accessManagementEnabled` | `feature.accessManagementEnabled` | AM feature flag |
| `ccdGatewayUrl` | `services.ccd.componentApi` | CCD API Gateway URL for browser calls |
| `clientId` | `services.idam.idamClientID` | OIDC client ID (`xuiwebapp`) |
| `idamWeb` | `services.idam.idamLoginUrl` | IDAM login URL |
| `launchDarklyClientId` | `secrets.rpx.launch-darkly-client-id` | LD client-side SDK key |
| `oAuthCallback` | `services.idam.oauthCallbackUrl` | OAuth2 callback path |
| `oidcEnabled` | `feature.oidcEnabled` | OIDC feature flag |
| `protocol` | `protocol` | HTTP protocol (`https`) |
| `substantiveEnabled` | `feature.substantiveRoleEnabled` | Substantive role flag |
| `paymentReturnUrl` | `services.payment_return_url` | Payment outcome return URL |
| `waWorkflowApi` | `services.waWorkflowApi` | WA Workflow API URL |
| `judicialBookingApi` | `services.judicialBookingApi` | AM Judicial Booking URL |
| `headerConfig` | (computed) | Menu/navigation config (varies by environment) |
| `hearingJurisdictionConfig` | (computed) | Hearing jurisdiction routing config |

The environment is detected by inspecting the IDAM login URL for `.aat.`, `.demo.`, `.perftest.`, `.ithc.` substrings, or the presence of `PREVIEW_DEPLOYMENT_ID` env var.

<!-- DIVERGENCE: Confluence "Config Refactoring" says endpoint is /api/environment/config, but rpx-xui-webapp:api/configuration/uiConfigRouter.ts shows the actual route is mounted at /external/config/ui. Source wins. -->

## LaunchDarkly settings

| Key | Source | Description |
|-----|--------|-------------|
| `secrets.rpx.launch-darkly-client-id` | AKS Key Vault | LD client-side SDK key; passed to Angular via `/external/config/ui` response (`api/configuration/uiConfigRouter.ts:64`) |

The Angular SPA never embeds the LD key in its bundle. At bootstrap, `src/main.ts` fetches `/external/config/ui/` and stores the response (including `launchDarklyClientId`) in the `ENVIRONMENT_CONFIG` injection token. After user details load, `AppComponent` calls `featureService.initialize(featureUser, ldClientId)`.

**Future direction**: The team is evaluating replacing LaunchDarkly with Azure App Configuration to reduce costs and improve reliability. The migration would require rewriting `launch-darkly-service.ts` in `rpx-xui-common-lib` and building a Node-lib push/Pub Sub wrapper for App Config updates.
<!-- CONFLUENCE-ONLY: not verified in source -->

**Client-side LD flag keys used in Angular:**

| Flag key | Usage |
|----------|-------|
| `mc-cookie-banner-enabled` | Show cookie consent banner |
| `icp-enabled` / `icp-jurisdictions` | In-Court Presentation feature |
| `enable-service-specific-multi-followups` | Multi-followup task UI |
| `mc-cdam-exclusion-list` | CDAM secure-mode exclusions |
| `mc-service-messages-dates` | Service messages display |
| `feature-global-search` | Route guard for global search |
| `feature-refunds` | Route guard for refunds module |
| `wa-landing-page-roles` | Work Allocation landing page roles |
| `workallocation-service-user-roles` | Controls which user roles see WA features (role list) |
| `wa-service-config` | JSON array of `{ caseTypes, releaseVersion, serviceName }` per WA-enabled jurisdiction |

<!-- CONFLUENCE-ONLY: not verified in source -->

## Proxy routes

Backend proxying is implemented via `applyProxy()` in `api/proxy.config.ts` using `http-proxy-middleware` (`api/lib/middleware/proxy.ts`). Proxies are mounted as Express middleware with `authInterceptor` applied before each proxy, ensuring all proxied requests are authenticated. The proxy is applied **before** body parsing middleware.

| Browser path prefix | Downstream target | Rewrite behaviour | Notes |
|---------------------|-------------------|-------------------|-------|
| `/activity` | CCD Component API | Rewrite to `/activity` | Activity tracker |
| `/documents` | DM Store (v1) | No rewrite (pass-through) | Custom req/res handlers for document metadata |
| `/documentsv2` | CDAM v2 | Rewrite to `/cases/documents` | Custom req/res handlers |
| `/hearing-recordings` | EM HRS API | No rewrite | |
| `/data/internal/searchCases` | CCD Component API | No rewrite | Custom ES response handler |
| `/print`, `/data` | CCD Component API | No rewrite (subtree) | Excludes `/data/internal/searchCases` |
| `/api/addresses` | CCD Component API | Rewrite to `/addresses` | Postcode lookup |
| `/aggregated` | CCD Component API | No rewrite | Jurisdiction caching handler |
| `/icp` | EM ICP API | No rewrite | WebSocket enabled |
| `/em-anno` | EM Annotation API | Rewrite to `/api` prefix | |
| `/doc-assembly` | EM Doc Assembly API | Rewrite to `/api` prefix | |
| `/api/markups`, `/api/redaction` | EM Markup/NPA API | No rewrite | |
| `/payments` | Payments API | Rewrite (identity) | |
| `/api/refund` | Refunds API | Rewrite to `/refund` | |
| `/api/notification` | Pay Notifications API | Rewrite to `/notifications` | |
| `/api/translation` | Translation Service | Rewrite to `/translation` | |
| `/refdata/location` | RD Location Ref API | No rewrite | |
| `/refdata/commondata/lov/categories/CaseLinkingReasonCode` | RD Commondata API | No rewrite | |
| `/refdata/commondata/caseflags/service-id=:sid` | RD Commondata API | No rewrite | Path parameter (not query string) |
| `/categoriesAndDocuments` | CCD Data Store API | No rewrite | |
| `/documentData/caseref` | CCD Data Store API | No rewrite | |
| `/getLinkedCases` | CCD Data Store API | No rewrite | |
| `/icp/sessions` | EM ICP API | No rewrite | |

Routes **not** proxied (handled locally by Express routing): `/workallocation/*`, `/api/role-access/*`, `/api/wa-supported-jurisdiction/*`, and other routes under `/api/`.

**Security note**: Proxy routes use prefix-based (subtree) matching. Any path suffix under a proxied prefix is forwarded to the target. Authentication headers (`Authorization`, `ServiceAuthorization`) are generated server-side by `authInterceptor` and attached to downstream requests; client-supplied auth headers do not enable privilege escalation.

## Helmet (security headers)

Helmet configuration is stored under the `helmet` key (overridable via `HELMET_CONFIG` env var, `__format: "json"`). Only active when `feature.helmetEnabled` is `true` (default).

| Helmet directive | Default value | Effect |
|-----------------|---------------|--------|
| `referrerPolicy.policy` | `origin` | Only send origin as referrer |
| `noCache.enable` | `true` | Set `Cache-Control: no-store` |
| `frameguard.action` | `deny` | Set `X-Frame-Options: DENY` |
| `hidePoweredBy.setTo` | `XUI Server 1.0` | Replace `X-Powered-By` header |

## Secrets (Key Vault)

Secrets are mounted from AKS Key Vault via `@hmcts/properties-volume` and accessible under `secrets.rpx.*` (`api/configuration/index.ts:6-7`).

| Secret path | Purpose |
|-------------|---------|
| `secrets.rpx.mc-s2s-client-secret` | S2S client secret for `xui_webapp` microservice |
| `secrets.rpx.mc-idam-client-secret` | IDAM OAuth2 client secret for `xuiwebapp` |
| `secrets.rpx.mc-session-secret` | Express session signing secret |
| `secrets.rpx.webapp-redis-connection-string` | Redis connection string for session store |
| `secrets.rpx.launch-darkly-client-id` | LaunchDarkly client-side SDK key |

## Configuration access patterns

| Function | File | Purpose |
|----------|------|---------|
| `getConfigValue<T>(ref)` | `api/configuration/index.ts` | Type-safe config lookup by reference key |
| `showFeature(feature)` | `api/configuration/index.ts` | Boolean check for feature flags |
| Config path constants | `api/configuration/references.ts:119-136` | All `const` keys used throughout the BFF |

## Gotchas

- `NODE_ENV` is always `production` in deployed environments — the config library falls back through its file precedence with `default.json` as the only checked-in file (`config/default.json`).
- All feature flag env vars have `__format: "json"` — bare `true`/`false` without quotes will fail; they must be `"true"` or `"false"`.
- `serviceRefDataMapping` env var (`SERVICE_REF_DATA_MAPPING`) must be a JSON-encoded array string due to `__format: "json"`. Same applies to `SESSION_TIMEOUTS`, `HELMET_CONFIG`, and `LOG_4JS_CONFIG`.
- Several RD service URLs default to non-prod environments: `rd-judicial-api-aat`, `rd-commondata-api-aat`, `rd-location-ref-api-demo` — these must be overridden in production Helm values.
- `ENABLE_HEARING_DATA_SOURCE_HEADERS` (`services.hearings.enableHearingDataSourceHeaders`) gates forwarding of `Data-Store-Url`, `Role-Assignment-Url`, and `hmctsDeploymentId` headers to downstream services (`api/lib/proxy.ts:49-57`).
- Proxy routes are subtree-mounted — any path suffix under a proxied prefix is forwarded downstream. Only the downstream service enforces path-level access control. Non-proxied routes (e.g. `/workallocation/*`) are handled locally by Express routers and return the SPA `index.html` for unknown subpaths.
- The `FEATURE_SECURE_COOKIE_ENABLED` flag has historically caused inconsistent login behaviour across pods during startup if not uniformly set. Ensure this is consistently configured across all pod replicas.
- A pod restart is required to pick up new configuration values — there is no hot-reload of env vars from Key Vault or Helm values.

## Examples

### `config/default.json` — service URLs, feature flags, and session timeouts

```json
// Source: apps/xui/rpx-xui-webapp/config/default.json (excerpt)
{
  "microservice": "xui_webapp",
  "services": {
    "ccd": {
      "componentApi": "https://ccd-api-gateway-web-prod.service.core-compute-prod.internal",
      "dataApi": "http://ccd-data-store-api-prod.service.core-compute-prod.internal",
      "caseAssignmentApi": "http://aac-manage-case-assignment-prod.service.core-compute-prod.internal"
    },
    "idam": {
      "idamClientID": "xuiwebapp",
      "idamLoginUrl": "https://hmcts-access.service.gov.uk",
      "oauthCallbackUrl": "/oauth2/callback"
    },
    "hearings": {
      "hearingsJurisdictions": "SSCS,PRIVATELAW,CIVIL,IA",
      "sscs": { "serviceApi": "http://sscs-tribunals-api-prod...", "caseTypes": "Benefit" },
      "civil": { "serviceApi": "http://civil-service-prod...", "caseTypes": "CIVIL" }
    }
  },
  "feature": {
    "appInsightsEnabled": true,
    "helmetEnabled": true,
    "secureCookieEnabled": true,
    "redisEnabled": false,
    "oidcEnabled": false,
    "accessManagementEnabled": true,
    "substantiveRoleEnabled": true,
    "compressionEnabled": false
  },
  "redis": {
    "port": 6380,
    "tls": true,
    "prefix": "activity:",
    "ttl": 86400
  },
  "sessionTimeouts": [
    { "pattern": "-dwpresponsewriter", "totalIdleTime": 30,  "idleModalDisplayTime": 3  },
    { "pattern": "-homeoffice",        "totalIdleTime": 240, "idleModalDisplayTime": 3  },
    { "pattern": "-solicitor",         "totalIdleTime": 50,  "idleModalDisplayTime": 10 },
    { "pattern": ".",                  "totalIdleTime": 480, "idleModalDisplayTime": 10 }
  ]
}
```

### `config/custom-environment-variables.json` — env var mapping

```json
// Source: apps/xui/rpx-xui-webapp/config/custom-environment-variables.json (excerpt)
{
  "services": {
    "ccd": {
      "componentApi": "SERVICES_CCD_COMPONENT_API",
      "dataApi": "SERVICES_CCD_DATA_STORE_API"
    },
    "hearings": {
      "hearingsJurisdictions": "HEARINGS_JURISDICTIONS"
    }
  },
  "feature": {
    "redisEnabled":        { "__name": "FEATURE_REDIS_ENABLED",         "__format": "json" },
    "helmetEnabled":       { "__name": "FEATURE_HELMET_ENABLED",        "__format": "json" },
    "secureCookieEnabled": { "__name": "FEATURE_SECURE_COOKIE_ENABLED", "__format": "json" },
    "oidcEnabled":         { "__name": "FEATURE_OIDC_ENABLED",          "__format": "json" }
  },
  "sessionTimeouts": { "__name": "SESSION_TIMEOUTS", "__format": "json" },
  "serviceRefDataMapping": { "__name": "SERVICE_REF_DATA_MAPPING", "__format": "json" }
}
```

The `__format: "json"` directive means the env var value must be a JSON-encoded string (e.g. `"true"` or `"false"` for booleans, `'[{"service":"IA","serviceCodes":["BFA1"]}]'` for arrays).

### `api/configuration/references.ts` — typed config key constants

```typescript
// Source: apps/xui/rpx-xui-webapp/api/configuration/references.ts (excerpt)

// Secrets (from AKS Key Vault via @hmcts/properties-volume)
export const S2S_SECRET       = 'secrets.rpx.mc-s2s-client-secret';
export const IDAM_SECRET      = 'secrets.rpx.mc-idam-client-secret';
export const REDIS_CLOUD_URL  = 'secrets.rpx.webapp-redis-connection-string';
export const LAUNCH_DARKLY_CLIENT_ID = 'secrets.rpx.launch-darkly-client-id';

// Service URLs (overridden by env vars in custom-environment-variables.json)
export const SERVICES_CCD_COMPONENT_API_PATH   = 'services.ccd.componentApi';
export const SERVICES_CCD_DATA_STORE_API_PATH  = 'services.ccd.dataApi';
export const SERVICES_ROLE_ASSIGNMENT_API_PATH = 'services.role_assignment.roleApi';
export const SERVICES_WORK_ALLOCATION_TASK_API_PATH = 'services.work_allocation.taskApi';

// Feature flags (showFeature() prepends 'feature.' automatically)
export const FEATURE_HELMET_ENABLED        = 'helmetEnabled';
export const FEATURE_REDIS_ENABLED         = 'redisEnabled';
export const FEATURE_OIDC_ENABLED          = 'oidcEnabled';
export const FEATURE_SECURE_COOKIE_ENABLED = 'secureCookieEnabled';
```

Usage in BFF code:

```typescript
import { getConfigValue, showFeature } from '../configuration';
import { SERVICES_CCD_COMPONENT_API_PATH, FEATURE_HELMET_ENABLED } from '../configuration/references';

const ccdUrl = getConfigValue(SERVICES_CCD_COMPONENT_API_PATH);
if (showFeature(FEATURE_HELMET_ENABLED)) { /* ... */ }
```

## See also

- [BFF Pattern](../explanation/bff-pattern.md) — how `getConfigValue` and `showFeature` are used throughout the BFF, and how proxy routes consume config keys
- [Feature Flags](../explanation/feature-flags.md) — the two-tier flag system this schema supports (BFF config flags vs LaunchDarkly)
- [Session Management](../explanation/session-management.md) — how `sessionTimeouts`, Redis config, and OIDC settings are consumed at runtime
- [How-to: Configure for New Service](../how-to/configure-for-new-service.md) — the pattern for adding a new service URL entry to this schema
- [Reference: Downstream Services](downstream-services.md) — how each service URL key maps to a running HMCTS service
- [Glossary](glossary.md) — definitions of `node-config`, `getConfigValue`, `showFeature`, and `sessionTimeouts`
