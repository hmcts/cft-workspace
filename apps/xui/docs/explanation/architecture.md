---
title: Architecture
topic: architecture
diataxis: explanation
product: xui
audience: both
sources:
  - rpx-xui-webapp:api/application.ts
  - rpx-xui-webapp:api/proxy.config.ts
  - rpx-xui-webapp:api/auth/index.ts
  - rpx-xui-webapp:api/lib/middleware/proxy.ts
  - rpx-xui-webapp:api/lib/middleware/auth.ts
  - rpx-xui-webapp:config/default.json
  - rpx-xui-webapp:charts/xui-webapp/values.yaml
  - rpx-xui-webapp:charts/xui-webapp/Chart.yaml
  - rpx-xui-webapp:Dockerfile
  - rpx-xui-webapp:infrastructure/main.tf
  - rpx-xui-node-lib:src/common/models/xuiNode.class.ts
  - rpx-xui-node-lib:src/auth/oidc/models/openid.class.ts
  - rpx-xui-node-lib:src/auth/s2s/s2s.class.ts
  - rpx-xui-node-lib:src/session/models/redisSessionStore.class.ts
  - rpx-xui-webapp:api/health/index.ts
  - rpx-xui-webapp:api/lib/proxy.ts
  - rpx-xui-node-lib:src/auth/models/strategy.class.ts
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/xui/rpx-xui-webapp/api/application.ts
  - apps/xui/rpx-xui-webapp/api/auth/index.ts
  - apps/xui/rpx-xui-webapp/config/default.json
confluence:
  - id: "1658260199"
    title: "Architecture"
    last_modified: "2025-06-18T12:43:42Z"
    space: "EXUI"
  - id: "1933986267"
    title: "Proxy Configuration on Manage Case"
    last_modified: "2025-01-01T00:00:00Z"
    space: "EXUI"
  - id: "1376716476"
    title: "Expert UI Low Level Design - Session Management Library"
    last_modified: "2020-05-20T00:00:00Z"
    space: "EUI"
  - id: "1452902080"
    title: "Principles, Deployment and Infrastructure"
    last_modified: "2024-01-01T00:00:00Z"
    space: "EUI"
  - id: "1824129920"
    title: "Service Operations Guide"
    last_modified: "2024-01-01T00:00:00Z"
    space: "EXUI"
confluence_checked_at: "2026-05-13T00:00:00Z"
sources_sha:
  "rpx-xui-webapp:api/application.ts": "69fa77d263137c54c33a0bddfd86586ba585e63c"
  "rpx-xui-webapp:api/proxy.config.ts": "92150834ffc7287a621486b07398fe147fbadad3"
  "rpx-xui-webapp:api/auth/index.ts": "a8162ca6dc81cd9756fb4e18bfb33ce02a6101ed"
  "rpx-xui-webapp:api/lib/middleware/proxy.ts": "1bb90ae55466b4ca3bf2b1df1b0ac19b6fa8cd20"
  "rpx-xui-webapp:api/lib/middleware/auth.ts": "3b6d926b78e0815e477c8938d564099e392a8c94"
  "rpx-xui-webapp:config/default.json": "1fd121d96abdb6316b6d7bf7b918842b20e976db"
  "rpx-xui-webapp:charts/xui-webapp/values.yaml": "69fa77d263137c54c33a0bddfd86586ba585e63c"
  "rpx-xui-webapp:charts/xui-webapp/Chart.yaml": "69fa77d263137c54c33a0bddfd86586ba585e63c"
  "rpx-xui-webapp:Dockerfile": "f5bb097efe787ff7db6d9889ae7f62ee3d48ba16"
  "rpx-xui-webapp:infrastructure/main.tf": "5376993d7f1f693f22ab014158974ad412abc4cc"
  "rpx-xui-node-lib:src/common/models/xuiNode.class.ts": "939bf0cd095a6489151ede36ca30f89dca92cc2b"
  "rpx-xui-node-lib:src/auth/oidc/models/openid.class.ts": "e30a86772d25ac208bf938e78ef2c7308c9cdd3a"
  "rpx-xui-node-lib:src/auth/s2s/s2s.class.ts": "9d255bc1078e070cf085f9999878f5da5d46e9ef"
  "rpx-xui-node-lib:src/session/models/redisSessionStore.class.ts": "9d255bc1078e070cf085f9999878f5da5d46e9ef"
  "rpx-xui-webapp:api/health/index.ts": "a8162ca6dc81cd9756fb4e18bfb33ce02a6101ed"
  "rpx-xui-webapp:api/lib/proxy.ts": "ff76662ca439152d588ee2ff0e17025be3413fc7"
  "rpx-xui-node-lib:src/auth/models/strategy.class.ts": "9d255bc1078e070cf085f9999878f5da5d46e9ef"
---

## TL;DR

- XUI apps follow a dual-layer pattern: an Angular SPA served by, and communicating exclusively through, a co-located Express/Node BFF running in the same container.
- Authentication is IDAM OIDC, handled entirely by `@hmcts/rpx-xui-node-lib` middleware which also manages S2S token exchange and session storage.
- Sessions are stored in Redis (Azure Cache for Redis, port 6380, TLS) in deployed environments; file-backed locally.
- The BFF proxies browser requests to downstream services (CCD, AM, WA, RD, Payments, CDAM, HMC) via `http-proxy-middleware`, injecting `Authorization` and `ServiceAuthorization` headers on every call. Proxy routes use prefix-based subtree forwarding and rely on downstream services for fine-grained access control.
- All three apps deploy to AKS (namespace `xui`) via Jenkins (preview/staging) and Flux (higher environments), using the `chart-nodejs` Helm base chart with Azure Cache for Redis and Terraform-provisioned shared infrastructure.
- The Angular SPA is a pure orchestration UI — it holds no case definitions, no business logic, and no direct service-to-service credentials. ExUI holds no persistent data of its own.

## The dual-layer pattern

Every XUI deployed application (Manage Cases, Manage Organisations, Approve Organisation) ships as a single Docker image containing:

1. **Angular SPA** — the static bundle served from the Express process at the root path.
2. **Express BFF** — the Node process listening on port 3000 (env `PORT`), which serves the SPA assets, handles authentication, and proxies all API calls to downstream platform services.

The BFF is built via `createApp()` (`api/application.ts:70`). Middleware is registered in a strict order:

1. Helmet + CSP, `X-Robots-Tag`, `Cache-Control` and `Permissions-Policy` headers (when `FEATURE_HELMET_ENABLED=true`) — `api/application.ts:74-108`
2. `cookieParser(SESSION_SECRET)` — `api/application.ts:110-111`
3. `compression()` (when `FEATURE_COMPRESSION_ENABLED=true`) — `api/application.ts:113-115`
4. `health.addReformHealthCheck(app)` — `api/application.ts:123`
5. `getXuiNodeMiddleware()` (OIDC session + S2S) — `api/application.ts:125-126`
6. `initProxy(app)` (http-proxy-middleware rules) — `api/application.ts:129`, **before** body-parser to allow raw stream proxying
7. `bodyParser.json({limit:'5mb'})` + URL-encoded — `api/application.ts:131-132`
8. API routers: `/am`, `/api`, `/external`, `/workallocation` — `api/application.ts:134-137`
9. CSRF middleware — `api/application.ts:138-142`
10. Static file serving + SPA catch-all — `api/application.ts:150`

Steps 4 and 5 are in that order for a reason: the Redis health check is registered from a `redisStore.ClientReady` listener, and node-lib only forwards events that already have a listener when `configure()` runs.

The SPA bootstraps by fetching `GET /external/config/ui` (unauthenticated) to obtain runtime configuration including the LaunchDarkly client ID, then loads user details from `GET /api/user/details` after authentication.

## Authentication flow: IDAM OIDC

Authentication is delegated to `@hmcts/rpx-xui-node-lib`, which exposes a singleton `xuiNode` that mounts session and auth middleware onto the Express router in a fixed order: session first, then auth (`xuiNode.class.ts:15`).

```mermaid
sequenceDiagram
    participant Browser
    participant BFF as Express BFF
    participant IDAM as IDAM OIDC
    participant S2S as rpe-service-auth-provider

    Browser->>BFF: GET /cases (unauthenticated)
    BFF->>Browser: 302 → /auth/login
    Browser->>BFF: GET /auth/login
    BFF->>IDAM: 302 → authorize endpoint (clientId=xuiwebapp, scope=openid profile roles)
    IDAM->>Browser: Login page
    Browser->>IDAM: Credentials
    IDAM->>Browser: 302 → /oauth2/callback?code=...&state=...
    Browser->>BFF: GET /oauth2/callback?code=...&state=...
    BFF->>IDAM: POST /o/token (code exchange, client_secret_post)
    IDAM-->>BFF: access_token + refresh_token + id_token
    BFF->>BFF: Store tokens in session (Redis)
    BFF->>BFF: Set cookies (__auth__, __userid__)
    BFF->>Browser: 302 → /
    Note over BFF,S2S: On subsequent requests
    Browser->>BFF: GET /api/... (with session cookie)
    BFF->>S2S: POST /lease (TOTP for xui_webapp)
    S2S-->>BFF: ServiceAuthorization JWT (cached in memory)
    BFF->>BFF: Attach Authorization + ServiceAuthorization headers
    BFF->>BFF: Proxy to downstream service
```

### Key configuration

| Setting | Value | Source |
|---------|-------|--------|
| IDAM client ID | `xuiwebapp` | `config/default.json:81` |
| S2S microservice name | `xui_webapp` | `config/default.json:116` |
| Discovery endpoint | `${SERVICES_IDAM_LOGIN_URL}/o/.well-known/openid-configuration` | `api/auth/index.ts:144` |
| Token auth method | `client_secret_post` | `api/auth/index.ts:151` |
| OAuth2 scopes requested | `openid profile roles manage-user create-user search-user` | `api/auth/index.ts:132`, `:149` |
| OAuth2 callback path | `/oauth2/callback` | `config/default.json:84` |
| SSO logout URL | `${idamWebUrl}/o/endSession` | `api/auth/index.ts:154` |

The `xuiwebapp` client requests the IDAM user-administration scopes (`manage-user`, `create-user`, `search-user`) alongside the sign-in scopes, so the access token minted for an ExUI session carries them too.

The node-lib's OIDC middleware (`openid.class.ts:138-143`) performs discovery at startup via `openid-client`'s `Issuer.discover()`. A separate `idamCheck` promise runs at startup (`api/application.ts:159`).

### S2S token caching

The S2S middleware (`s2s.class.ts:47-66`) generates a TOTP from the app secret using `otplib`, POSTs it to `rpe-service-auth-provider/lease`, and caches the returned JWT in memory keyed by microservice name. The token's `exp` claim is checked on each request; a new token is obtained only on expiry (`s2s.class.ts:68-74`).

## Session management (Redis)

In deployed environments, sessions are stored in Azure Cache for Redis:

| Parameter | Value |
|-----------|-------|
| Port | 6380 (TLS) |
| Key prefix | `activity:` |
| TTL (default) | 86400 seconds (24 hours) — `config/default.json` |
| TTL (preview override) | 6000 seconds — `values.yaml` |
| Connection secret | `secrets.rpx.webapp-redis6-connection-string` (aliased to `webapp-redis-connection-string`) |
| Feature gate | `FEATURE_REDIS_ENABLED=true` |

The node-lib's `RedisSessionStore` uses the `redis` v6 client with `connect-redis` v9, normalising legacy Azure-style and `?tls=true` connection strings into `rediss://` URLs first. It emits `redisStore.ClientReady` and `redisStore.ClientError` events propagated to `xuiNode` for BFF-level health checks.

For local development, a file-backed session store writes to `.sessions` or `/tmp/sessions`.

Session cookies:

- `__auth__` — the IDAM access token (set on successful auth callback)
- `__userid__` — the user's IDAM UID
- Session cookie name — `xui-webapp` (set by node-lib)

Session timeout is role-based: `getUserSessionTimeout` in the node-lib matches user roles against a `sessionTimeouts` array (regex patterns) configured in `config/default.json`. Default idle time is 480 minutes (8 hours); specific role patterns can override this.

## Proxy routing to downstream services

The BFF acts as a gateway, proxying browser requests to platform services. Proxy rules are registered in `api/proxy.config.ts:26` via `http-proxy-middleware` **before** `bodyParser` to preserve raw request streams (important for document uploads).

Every proxied route has `authInterceptor` prepended to its middleware chain (`api/lib/middleware/proxy.ts:119`), ensuring `Authorization` and `ServiceAuthorization` headers are attached.

```mermaid
graph LR
    SPA[Angular SPA<br/>Browser]
    BFF[Express BFF<br/>Port 3000]

    SPA -->|session cookie| BFF

    subgraph "Downstream Platform Services"
        CCD[CCD API Gateway<br/>/data, /print, /aggregated]
        CCDDS[CCD Data Store<br/>/categoriesAndDocuments, /getLinkedCases]
        AM[AM Role Assignment<br/>/am/role-assignments]
        WA[WA Task Management<br/>/workallocation]
        RD[Reference Data<br/>/refdata/location, /refdata/commondata]
        CDAM[CDAM<br/>/documents, /documentsv2]
        HMC[HMC Hearings<br/>via /api/hearings]
        PAY[Payments<br/>/payments]
    end

    BFF -->|Bearer + S2S| CCD
    BFF -->|Bearer + S2S| CCDDS
    BFF -->|Bearer + S2S| AM
    BFF -->|Bearer + S2S| WA
    BFF -->|Bearer + S2S| RD
    BFF -->|Bearer + S2S| CDAM
    BFF -->|Bearer + S2S| HMC
    BFF -->|Bearer + S2S| PAY
```

### Key proxy routes

All proxy routes are prefix-based subtree proxies — any path suffix under the prefix is forwarded to the target service. The BFF does not constrain HTTP methods or validate payloads at the proxy boundary; downstream services are responsible for access control and request validation.

| Browser path | Target service | Config key | Notes |
|---|---|---|---|
| `/activity` | CCD API Gateway | `SERVICES_CCD_COMPONENT_API_PATH` | Rewritten to `/activity` |
| `/data`, `/print` | CCD API Gateway | `SERVICES_CCD_COMPONENT_API_PATH` | Subtree forwarded unchanged |
| `/data/internal/searchCases` | CCD API Gateway | `SERVICES_CCD_COMPONENT_API_PATH` | Intercepts ES response for jurisdiction filtering |
| `/aggregated` | CCD API Gateway | `SERVICES_CCD_COMPONENT_API_PATH` | Caches jurisdiction metadata |
| `/api/addresses` | CCD API Gateway | `SERVICES_CCD_COMPONENT_API_PATH` | Rewritten to `/addresses` |
| `/categoriesAndDocuments` | CCD Data Store | `SERVICES_CCD_DATA_STORE_API_PATH` | |
| `/documentData/caseref` | CCD Data Store | `SERVICES_CCD_DATA_STORE_API_PATH` | |
| `/getLinkedCases` | CCD Data Store | `SERVICES_CCD_DATA_STORE_API_PATH` | |
| `/documents` | DM Store | `SERVICES_DOCUMENTS_API_PATH` | Stream proxy (no body parsing) |
| `/documentsv2` | CDAM v2 | `SERVICES_DOCUMENTS_API_PATH_V2` | Rewritten to `/cases/documents`; stream proxy |
| `/hearing-recordings` | EM HRS | `SERVICES_EM_HRS_API_PATH` | |
| `/em-anno` | EM Annotation | `SERVICES_EM_ANNO_API_URL` | Rewritten to `/api` prefix |
| `/doc-assembly` | EM Doc Assembly | `SERVICES_EM_DOCASSEMBLY_API_URL` | Rewritten to `/api` prefix |
| `/api/markups`, `/api/redaction` | EM NPA (Markup) | `SERVICES_MARKUP_API_URL` | |
| `/icp` | EM ICP | `SERVICES_ICP_API_URL` | **WebSocket** (`ws: true`) |
| `/icp/sessions` | EM ICP | `SERVICES_ICP_API_URL` | Non-WS duplicate for REST calls |
| `/payments` | Payment API | `SERVICES_PAYMENTS_URL` | |
| `/api/refund` | Refunds API | `SERVICES_REFUNDS_API_URL` | Rewritten to `/refund` |
| `/api/notification` | Notifications API | `SERVICES_NOTIFICATIONS_API_URL` | Rewritten to `/notifications` |
| `/api/translation` | Translation Service | `SERVICES_TRANSLATION_API_URL` | Rewritten to `/translation` |
| `/refdata/location` | RD Location Ref | `SERVICES_LOCATION_REF_API_URL` | |
| `/refdata/commondata/lov/categories/CaseLinkingReasonCode` | RD Common Data | `SERVICES_PRD_COMMONDATA_API` | Specific path only |
| `/refdata/commondata/caseflags/service-id=:sid` | RD Common Data | `SERVICES_PRD_COMMONDATA_API` | Path param (not query string) |

<!-- Verified: Confluence "Proxy Configuration on Manage Case" notes /workallocation is NOT a proxy subtree. Confirmed in source: workAllocationRouter is mounted via app.use('/workallocation', workAllocationRouter) in api/application.ts:122, not via applyProxy(). -->

**Note:** The `/workallocation` path is *not* a transparent proxy. It is handled by a local Express router (`workAllocationRouter`) that makes server-side Axios calls to WA APIs and returns composed responses. Invalid subpaths under `/workallocation` fall through to the SPA catch-all.

### Header injection

Two different pieces of code go by the name `setHeaders`.

`rpx-xui-node-lib:src/auth/models/strategy.class.ts:471-485` mutates the incoming request. It is mounted on the node-lib router (`:626`), which `application.ts` installs before `initProxy`, so it applies to proxied and locally-handled traffic alike. When the session holds a passport user it sets `user-roles` from the session's IDAM roles and `Authorization` to `Bearer <session access token>` (`:478-479`).

`rpx-xui-webapp:api/lib/proxy.ts:19-63` is a pure function that builds an allowlisted header object for the CCD-Gateway Axios helpers defined alongside it (`:65`, `:80`, `:95`). It copies through only:

- `Authorization` — read from the capitalised key, which is the one node-lib set (`:37-39`)
- `ServiceAuthorization` (`:45-47`)
- `user-roles`, `content-type`, `accept`, `experimental`
- `Data-Store-Url`, `Role-Assignment-Url` and `hmctsDeploymentId`, only when `services.hearings.enableHearingDataSourceHeaders` is the string `"true"` (`:17`, `:49-59`)

The last of those has a wiring quirk worth knowing when debugging preview deployments: `hmctsDeploymentId` is guarded on `Role-Assignment-Url` being present and is read from `Hmcts-Deployment-Id` (`:57-58`), so a request that supplies a deployment id without a role-assignment override loses it.

### Dual proxy pattern

XUI uses two different mechanisms for downstream calls:

1. **`http-proxy-middleware`** — transparent stream proxy for browser-initiated calls (documents, CCD Gateway calls, etc.). The BFF does not parse request/response bodies.
2. **Axios (`api/lib/http`)** — used for server-side orchestration calls (role assignment lookups, user details enrichment, WA task operations). These calls are made by BFF route handlers that parse, transform, and compose responses before returning to the browser.

## Proxy security model

The proxy layer is permissive by design: it uses prefix-based subtree forwarding, meaning any path suffix, HTTP method, or payload under a proxied prefix is forwarded to the fixed downstream target. This architectural choice means:

- **Path pivoting** — an authenticated user can reach any endpoint on a proxied service by altering the URL suffix (the downstream service must enforce its own access control).
- **HTTP method freedom** — the proxy does not restrict methods. A DELETE to `/data/internal/anything` is forwarded to CCD API Gateway; the downstream returns 404/405/500 as appropriate.
- **No payload validation at proxy boundary** — structurally invalid JSON payloads are forwarded; downstream services handle validation.
- **Inbound auth headers** — client-supplied `Authorization`/`ServiceAuthorization` headers are *not* stripped anywhere in the chain. `setHeaders` assigns a session-derived `Authorization` on top of whatever arrived (`rpx-xui-node-lib:src/auth/models/strategy.class.ts:471-485`) but deletes nothing, and it assigns only when the session holds a passport user. A request without one never reaches a proxy: `authenticate` answers `401 Unauthorized` whenever `req.session.passport.user.userinfo` is missing (`:460-462`). Privilege escalation through header forgery is therefore not available — a forged token is accompanied by, never substituted for, the session-derived one.

None of the three obvious mitigations is present. There is no per-prefix path allowlist: `applyProxy` ends in a bare `app.use(config.source, ...)` (`rpx-xui-webapp:api/lib/middleware/proxy.ts:119-120`), and the one narrowing mechanism available — `http-proxy-middleware`'s `pathFilter`, wired to the optional `filter` config key at `:84` — is used by a single route, where the `/print` + `/data` proxy excludes `/data/internal/searchCases` so the search-specific proxy mounted ahead of it keeps that path (`rpx-xui-webapp:api/proxy.config.ts:77`). No entry restricts HTTP methods, and no middleware removes an inbound auth header.

<!-- CONFLUENCE-ONLY: the "Proxy Configuration on Manage Case" page puts per-prefix path allowlists,
     HTTP method restrictions and stripping of inbound auth headers forward as hardening work.
     Their status as planned work is not verified in source. -->

**Locally-handled routes** (not proxy surfaces): `/workallocation/*`, `/am/*`, `/api/*`, `/external/*` — these are served by Express routers that make server-side Axios calls with full request parsing.

## Security: CSP and CSRF

**Content Security Policy** — the node-lib's `csp()` middleware generates a `crypto.randomBytes(16)` nonce per request, sets it on `res.locals.cspNonce`, and injects it into `index.html` via template string replacement of `{{cspNonce}}` (`api/application.ts:50`). The Angular SPA reads the nonce from `<meta name="csp-nonce">` at bootstrap.

**CSRF** — `@dr.pogodin/csurf` sets an `XSRF-TOKEN` cookie with `httpOnly: false` so Angular can read it. Angular is configured (`app.module.ts:127-130`) to send the value back as the `X-XSRF-TOKEN` header on mutating requests. GET requests are excluded.

**Additional security headers** (when `FEATURE_HELMET_ENABLED=true`):

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: origin`
- `Cross-Origin-Resource-Policy: same-site`
- `X-Powered-By` removed
- `Strict-Transport-Security: max-age=28800000`
- `X-Robots-Tag: noindex`
- `Cache-Control: no-cache, no-store, max-age=0, must-revalidate, proxy-revalidate`

## Deployment and infrastructure

### Container image

All three apps use multi-stage Docker builds based on `hmctsprod.azurecr.io/base/node:20-alpine`. The final runtime stage contains only production node_modules for the API workspace, the compiled Angular bundle (`dist/browser/`), and the `config/` directory for `node-config`.

### Kubernetes deployment

| Parameter | Value |
|-----------|-------|
| Namespace | `xui` |
| Helm base chart | `chart-nodejs` (3.2.0) from `oci://hmctsprod.azurecr.io/helm` |
| Application port | 3000 |
| CPU requests / limits | 250m / 2000m |
| Memory requests / limits | 512Mi / 2048Mi |
| Autoscaling | Up to 16 replicas (target 80% CPU) |
| `NODE_OPTIONS` | `--max-old-space-size=8192` |
| `UV_THREADPOOL_SIZE` | 64 |

### Environments

All environments run on AKS (dual-cluster active/active or single-cluster depending on tier):

| Environment | Deployment mechanism | Image tags |
|---|---|---|
| Preview | Jenkins pipeline (PR builds) | `pr-*` |
| Demo | Flux | `pr-*` or `prod-*` |
| Perftest / ITHC | Flux | `pr-*` or `prod-*` |
| AAT (staging) | Jenkins (staging) + Flux | `prod-*` only |
| Production | Flux | `prod-*` only |

All environments use the `xui` namespace with app names: `xui-webapp`, `xui-mo-webapp`, `xui-ao-webapp`.

### Infrastructure-as-code

Terraform modules in each repo's `infrastructure/` directory provision Azure resources (Key Vaults, Application Insights, Azure Cache for Redis, networking). Shared infrastructure is in `rpx-shared-infrastructure`.

### Key Vault integration

Secrets are mounted from the `rpx` Key Vault at `/mnt/secrets/rpx` via `@hmcts/properties-volume`. Key secrets include:

| Secret name | Purpose |
|---|---|
| `mc-s2s-client-secret` | S2S TOTP secret for `xui_webapp` |
| `mc-idam-client-secret` | IDAM OAuth2 client secret |
| `webapp-redis6-connection-string` | Redis connection (aliased to `webapp-redis-connection-string`) |
| `launch-darkly-client-id` | LaunchDarkly SDK key |
| `system-user-name` / `system-user-password` | System user for background operations |
| `mc-session-secret` | Express session signing secret |
| `appinsights-instrumentationkey-mc` | App Insights instrumentation key |

### Monitoring and health checks

The BFF exposes health endpoints of its own via `@hmcts/nodejs-healthcheck` (`rpx-xui-webapp:api/health/index.ts:98`), but what they report is almost entirely downstream state: `checkServiceHealth` appends `/health` to a configured service URL with a 6-second deadline (`:27-31`), and the unconditional set covers CCD Gateway, CCD Data Store, DocAssembly, both document APIs, IDAM web and API, and S2S (`:50-61`).

The rest are conditional. Work Allocation task management, caseworker reference data, role assignment and judicial reference data are only registered when `FEATURE_WORKALLOCATION_ENABLED` is on (`:63-68`); Terms and Conditions only when `FEATURE_TERMS_AND_CONDITIONS_ENABLED` is on (`:71-78`); and the `redis` check is added from inside the `redisStore.ClientReady` handler, so it exists only once Redis has connected at least once (`:79-92`). A pod can therefore report healthy while a service it genuinely depends on is down, whenever that service's feature flag is off.

Application monitoring uses App Insights and Dynatrace.

ExUI persists nothing of its own. `infrastructure/main.tf` provisions an Azure Cache for Redis instance (`rpx-xui-webapp:infrastructure/main.tf:36-51`), Application Insights, a resource group and Key Vault secrets — there is no database module in the stack. Session state lives in that Redis cache, case data in CCD, and documents in DM Store behind CDAM, so nothing but the session survives a pod restart.

### Shuttering

Individual jurisdictions can be shuttered (hidden from users) via the CCD UI Shuttering feature (LaunchDarkly flags). This only restricts the ExUI front end; it does not prevent programmatic access via APIs or citizen UIs.

## Examples

### Express middleware chain (`createApp`)

The following shows the exact middleware registration order from the BFF factory function. Proxy registration at step 4 must precede `bodyParser` at step 5 so that raw request streams are forwarded without being consumed.

```typescript
// Source: apps/xui/rpx-xui-webapp/api/application.ts

export async function createApp() {
  const app = express();

  // 1. Helmet + CSP (when FEATURE_HELMET_ENABLED=true)
  if (showFeature(FEATURE_HELMET_ENABLED)) {
    app.use(helmet(getConfigValue(HELMET)));
    const cspMiddleware = csp({ defaultCsp: SECURITY_POLICY, ...MC_CSP });
    app.use(cspMiddleware);
  }

  // 2. Cookie parser
  app.use(cookieParser(getConfigValue(SESSION_SECRET)));

  // 3. OIDC session + S2S middleware from @hmcts/rpx-xui-node-lib
  const xuiNodeMiddleware = await getXuiNodeMiddleware();
  app.use(xuiNodeMiddleware);

  // 4. http-proxy-middleware rules — BEFORE bodyParser to preserve raw streams
  initProxy(app);

  // 5. Body parser
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

  // 6. Route mounts
  app.use('/am', amRoutes);
  app.use('/api', routes);
  app.use('/external', openRoutes);
  app.use('/workallocation', workAllocationRouter);

  // 7. CSRF — cookie name XSRF-TOKEN, httpOnly:false so Angular can read it
  app.use(csrf({ cookie: { key: 'XSRF-TOKEN', httpOnly: false, secure: true, path: '/' }, ignoreMethods: ['GET'] }));

  // 8. Static assets + SPA catch-all; injects {{cspNonce}} and {{dynatraceCdn}}
  app.use(express.static(staticRoot, { index: false }));
  app.use('/{*splat}', (req, res) => {
    const html = injectTemplateValues(indexHtmlRaw, res.locals.cspNonce);
    res.type('html').set('Cache-Control', 'no-store, max-age=0').send(html);
  });

  return app;
}
```

### Auth bootstrap: registering event callbacks and configuring the node-lib

```typescript
// Source: apps/xui/rpx-xui-webapp/api/auth/index.ts

// Called on successful login: sets __auth__ and __userid__ cookies, then redirects to /
xuiNode.on(AUTH.EVENT.AUTHENTICATE_SUCCESS, (req, res, next) => {
  const { user } = req.session.passport;
  res.cookie(getConfigValue(COOKIES_USER_ID), user.userinfo.uid, { sameSite: 'strict' });
  res.cookie(getConfigValue(COOKIES_TOKEN), user.tokenset.accessToken, { sameSite: 'strict' });
  if (!req.isRefresh) return res.redirect('/');
  next();
});

// node-lib options: session store (Redis in prod, file-store locally) + OIDC + S2S
const nodeLibOptions = {
  auth: {
    oidc: {
      clientID: 'xuiwebapp',
      discoveryEndpoint: 'https://idam.../o/.well-known/openid-configuration',
      callbackURL: '/oauth2/callback',
      scope: 'profile openid roles manage-user create-user search-user',
      tokenEndpointAuthMethod: 'client_secret_post',
      allowRolesRegex: 'caseworker',   // reject users without a matching role
      ssoLogoutURL: 'https://idam.../o/endSession',
      // ...
    },
    s2s: {
      microservice: 'xui_webapp',
      s2sEndpointUrl: 'http://rpe-service-auth-provider.../lease',
      s2sSecret: '<from AKS Key Vault>',
    },
  },
  session: showFeature(FEATURE_REDIS_ENABLED) ? redisStoreOptions : fileStoreOptions,
};

return xuiNode.configure(nodeLibOptions);
```

### Service URL resolution: config defaults

```json
// Source: apps/xui/rpx-xui-webapp/config/default.json (excerpt)
{
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
    }
  },
  "microservice": "xui_webapp",
  "feature": {
    "helmetEnabled": true,
    "redisEnabled": false,
    "oidcEnabled": false,
    "secureCookieEnabled": true
  }
}
```

## See also

- [BFF Pattern](bff-pattern.md) — detailed walkthrough of Express middleware ordering, proxy configuration, auth injection, and error handling
- [Session Management](session-management.md) — OIDC login flow, Redis session store, role-based timeout durations, and client-side idle detection
- [Feature Flags](feature-flags.md) — how BFF config flags and LaunchDarkly client-side flags complement the architecture
- [How-to: Configure for New Service](../how-to/configure-for-new-service.md) — step-by-step guide to adding a downstream service proxy
- [Reference: Config Schema](../reference/config-schema.md) — full reference for `config/default.json` keys, feature flags, and env-var mappings
- [Reference: Downstream Services](../reference/downstream-services.md) — complete catalogue of downstream services by domain
- [Glossary](../reference/glossary.md) — definitions of BFF, CDAM, S2S, subtree proxy, and other key terms
