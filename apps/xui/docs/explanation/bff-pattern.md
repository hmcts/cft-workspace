---
title: Bff Pattern
topic: bff
diataxis: explanation
product: xui
audience: both
sources:
  - rpx-xui-webapp:api/application.ts
  - rpx-xui-webapp:api/routes.ts
  - rpx-xui-webapp:api/openRoutes.ts
  - rpx-xui-webapp:api/proxy.config.ts
  - rpx-xui-webapp:api/lib/middleware/proxy.ts
  - rpx-xui-webapp:api/lib/middleware/auth.ts
  - rpx-xui-webapp:api/auth/index.ts
  - rpx-xui-webapp:api/configuration/references.ts
  - rpx-xui-webapp:api/configuration/index.ts
  - rpx-xui-webapp:api/lib/proxy.ts
  - rpx-xui-webapp:api/lib/http/index.ts
  - rpx-xui-webapp:config/default.json
  - rpx-xui-webapp:config/custom-environment-variables.json
  - rpx-xui-node-lib:src/common/models/xuiNode.class.ts
  - rpx-xui-node-lib:src/auth/oidc/models/openid.class.ts
  - rpx-xui-node-lib:src/auth/models/strategy.class.ts
  - rpx-xui-node-lib:src/auth/s2s/s2s.class.ts
  - rpx-xui-node-lib:src/common/util/csp.ts
  - rpx-xui-webapp:api/workAllocation/routes.ts
  - rpx-xui-webapp:api/lib/log4jui.ts
  - rpx-xui-webapp:api/health/index.ts
  - rpx-xui-node-lib:src/auth/auth.constants.ts
  - rpx-xui-node-lib:src/auth/s2s/s2s.constants.ts
  - rpx-xui-node-lib:src/session/session.constants.ts
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/xui/rpx-xui-webapp/api/application.ts
  - apps/xui/rpx-xui-webapp/api/auth/index.ts
  - apps/xui/rpx-xui-webapp/api/lib/middleware/proxy.ts
  - apps/xui/rpx-xui-webapp/api/lib/middleware/auth.ts
  - apps/xui/rpx-xui-webapp/api/proxy.config.ts
confluence:
  - id: "1933986267"
    title: "Proxy Configuration on Manage Case"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1933867411"
    title: "RPX XUI Webapp Node API Quality Review and Recommendations"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1376716476"
    title: "Expert UI Low Level Design - Session Management Library"
    last_modified: "unknown"
    space: "EUI"
  - id: "1658260199"
    title: "Architecture"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1081671843"
    title: "ExUI Low Level Design"
    last_modified: "unknown"
    space: "EUI"
confluence_checked_at: "2026-05-13T00:00:00Z"
sources_sha:
  "rpx-xui-webapp:api/application.ts": "69fa77d263137c54c33a0bddfd86586ba585e63c"
  "rpx-xui-webapp:api/routes.ts": "8577c8c217f3e58ec34ce4efde89c468268befb7"
  "rpx-xui-webapp:api/openRoutes.ts": "6c90fbc6b38434ad2f933356651b41f6ec813c64"
  "rpx-xui-webapp:api/proxy.config.ts": "92150834ffc7287a621486b07398fe147fbadad3"
  "rpx-xui-webapp:api/lib/middleware/proxy.ts": "1bb90ae55466b4ca3bf2b1df1b0ac19b6fa8cd20"
  "rpx-xui-webapp:api/lib/middleware/auth.ts": "3b6d926b78e0815e477c8938d564099e392a8c94"
  "rpx-xui-webapp:api/auth/index.ts": "a8162ca6dc81cd9756fb4e18bfb33ce02a6101ed"
  "rpx-xui-webapp:api/configuration/references.ts": "69fa77d263137c54c33a0bddfd86586ba585e63c"
  "rpx-xui-webapp:api/configuration/index.ts": "e6b48e7df696e4f542dcd45e9840f7645babd613"
  "rpx-xui-webapp:api/lib/proxy.ts": "ff76662ca439152d588ee2ff0e17025be3413fc7"
  "rpx-xui-webapp:api/lib/http/index.ts": "55079aab2a3d290fb54432007a9ee7c73183e447"
  "rpx-xui-webapp:config/default.json": "1fd121d96abdb6316b6d7bf7b918842b20e976db"
  "rpx-xui-webapp:config/custom-environment-variables.json": "69fa77d263137c54c33a0bddfd86586ba585e63c"
  "rpx-xui-node-lib:src/common/models/xuiNode.class.ts": "939bf0cd095a6489151ede36ca30f89dca92cc2b"
  "rpx-xui-node-lib:src/auth/oidc/models/openid.class.ts": "e30a86772d25ac208bf938e78ef2c7308c9cdd3a"
  "rpx-xui-node-lib:src/auth/models/strategy.class.ts": "9d255bc1078e070cf085f9999878f5da5d46e9ef"
  "rpx-xui-node-lib:src/auth/s2s/s2s.class.ts": "9d255bc1078e070cf085f9999878f5da5d46e9ef"
  "rpx-xui-node-lib:src/common/util/csp.ts": "939bf0cd095a6489151ede36ca30f89dca92cc2b"
  "rpx-xui-webapp:api/workAllocation/routes.ts": "a8162ca6dc81cd9756fb4e18bfb33ce02a6101ed"
  "rpx-xui-webapp:api/lib/log4jui.ts": "ff76662ca439152d588ee2ff0e17025be3413fc7"
  "rpx-xui-webapp:api/health/index.ts": "a8162ca6dc81cd9756fb4e18bfb33ce02a6101ed"
  "rpx-xui-node-lib:src/auth/auth.constants.ts": "2edfb4b867b395eacf338fa79f47e5a6ddf806f3"
  "rpx-xui-node-lib:src/auth/s2s/s2s.constants.ts": "0993296a3baa5b90ed461bde7d412b90cba08dd4"
  "rpx-xui-node-lib:src/session/session.constants.ts": "d97c29086eaa37ae5db5e9b14e3267cadbc8bd3e"
---

## TL;DR

- XUI's Backend-for-Frontend (BFF) is an Express/Node.js server co-located with the Angular SPA in a single container, listening on port 3000 and proxying all browser requests to downstream HMCTS services.
- Middleware ordering is critical: Helmet/CSP, cookie parser, OIDC session (`@hmcts/rpx-xui-node-lib`), `http-proxy-middleware` proxies, then `bodyParser` — proxies must register before body parsing to forward raw streams.
- All authenticated routes pass through `authInterceptor` (a thin wrapper over `xuiNode.authenticate`), which injects `Authorization` and `ServiceAuthorization` headers.
- Downstream service URLs are resolved via `node-config` from `config/default.json`, overridden per-environment by env vars mapped in `config/custom-environment-variables.json`.
- Two proxy modes coexist: `http-proxy-middleware` for transparent pass-through to CCD API Gateway, documents, payments, etc.; direct Axios calls with explicit token injection for WA, AM, and reference data services.
- Error handling uses Express error middleware plus Axios response interceptors that log timing and forward AppInsights traces.

## Express application bootstrap

The process entry point is `api/server.ts`, which calls `createApp()` from `api/application.ts` and starts listening. `createApp()` is the factory that assembles the entire middleware chain and returns the Express application.

The mount order in `api/application.ts:57–144` is:

1. **Helmet + CSP** (lines 57–93) — when `FEATURE_HELMET_ENABLED=true`. The BFF uses `@hmcts/rpx-xui-node-lib`'s `csp()` factory, which generates a `crypto.randomBytes(16)` nonce per request and exposes it on `res.locals.cspNonce`. The nonce is injected server-side into `index.html` via string replacement of `{{cspNonce}}`.
2. **Cookie parser** (line 95) — `cookieParser(SESSION_SECRET)`.
3. **OIDC/session middleware** (lines 110–111) — `getXuiNodeMiddleware()` mounts the composed router from `rpx-xui-node-lib`.
4. **Proxy middleware** (lines 113–114) — `initProxy(app)` registers all `http-proxy-middleware` rules.
5. **Body parser** (lines 116–117) — `bodyParser.json({limit:'5mb'})` and `urlencoded`. Must come *after* proxy registration so proxied requests can forward raw streams.
6. **Route mounts** — `/am`, `/api`, `/external`, `/workallocation`, CSRF middleware, static file serving, and the SPA catch-all.

## Route structure

Routes are split across several files:

| File | Mount point | Auth required |
|------|-------------|---------------|
| `api/routes.ts` | `/api/*` | Yes (via `authInterceptor` at line 46) |
| `api/openRoutes.ts` | `/external/*` | No |
| `api/workAllocation/routes.ts` | `/workallocation/*` | Yes |
| `api/application.ts` (inline) | `/am` | Yes |

Exceptions to authentication under `/api/*`: `/api/healthCheck`, `/api/monitoring-tools`, and `/api/configuration` are declared before `authInterceptor` at `api/routes.ts:26–43`.

The `/external` open routes expose only `GET /external/configuration-ui` and `GET /external/config/ui` — the Angular SPA fetches these at bootstrap to obtain runtime config (including the LaunchDarkly client ID) before any user authentication occurs.

## Proxy configuration

`api/proxy.config.ts` defines all `http-proxy-middleware` proxy rules via the `initProxy(app)` function (`proxy.config.ts:26`). The helper `applyProxy(app, config, modifyBody)` in `api/lib/middleware/proxy.ts:69` creates each proxy instance.

Key design decisions:

- **Auth injection**: `authInterceptor` is prepended to every proxied route's middleware chain (`api/lib/middleware/proxy.ts:119`), ensuring `Authorization` and `ServiceAuthorization` headers are set before forwarding.
- **Body streaming**: `selfHandleResponse` is `true` only when an `onRes` handler is provided and the source is not `/documents` (which uses stream response directly).
- **URL rewriting**: Each proxy entry specifies `rewrite:false` (preserve original path) or `rewriteUrl` (string or function) to remap paths to the downstream API's expected shape.
- **WebSocket support**: The `/icp` proxy to `SERVICES_ICP_API_URL` sets `ws:true` for in-court presentation streaming (`proxy.config.ts:99–103`).

### Proxied routes

| Source path | Target config key | Notes |
|---|---|---|
| `/activity` | `SERVICES_CCD_COMPONENT_API_PATH` | rewriteUrl `/activity` |
| `/documents` | `SERVICES_DOCUMENTS_API_PATH` | custom onReq/onRes for CDAM; stream response |
| `/hearing-recordings` | `SERVICES_EM_HRS_API_PATH` | |
| `/documentsv2` | `SERVICES_DOCUMENTS_API_PATH_V2` | rewriteUrl `/cases/documents{path}` |
| `/data/internal/searchCases` | `SERVICES_CCD_COMPONENT_API_PATH` | custom Elastic response handler |
| `/print`, `/data` (except searchCases) | `SERVICES_CCD_COMPONENT_API_PATH` | filter excludes searchCases |
| `/api/addresses` | `SERVICES_CCD_COMPONENT_API_PATH` | rewriteUrl `/addresses{path}` |
| `/aggregated` | `SERVICES_CCD_COMPONENT_API_PATH` | onReq/onRes for jurisdiction cache |
| `/icp` | `SERVICES_ICP_API_URL` | WebSocket (`ws:true`) |
| `/icp/sessions` | `SERVICES_ICP_API_URL` | separate non-WS entry for session mgmt |
| `/em-anno` | `SERVICES_EM_ANNO_API_URL` | rewriteUrl `/api{path}` |
| `/doc-assembly` | `SERVICES_EM_DOCASSEMBLY_API_URL` | rewriteUrl `/api{path}` |
| `/api/markups`, `/api/redaction` | `SERVICES_MARKUP_API_URL` | |
| `/payments` | `SERVICES_PAYMENTS_URL` | |
| `/api/refund` | `SERVICES_REFUNDS_API_URL` | rewriteUrl `/refund{path}` |
| `/api/notification` | `SERVICES_NOTIFICATIONS_API_URL` | rewriteUrl `/notifications{path}` |
| `/refdata/location` | `SERVICES_LOCATION_REF_API_URL` | |
| `/refdata/commondata/lov/categories/CaseLinkingReasonCode` | `SERVICES_PRD_COMMONDATA_API` | |
| `/refdata/commondata/caseflags/service-id=:sid` | `SERVICES_PRD_COMMONDATA_API` | |
| `/categoriesAndDocuments` | `SERVICES_CCD_DATA_STORE_API_PATH` | |
| `/documentData/caseref` | `SERVICES_CCD_DATA_STORE_API_PATH` | |
| `/getLinkedCases` | `SERVICES_CCD_DATA_STORE_API_PATH` | |
| `/api/translation` | `SERVICES_TRANSLATION_API_URL` | rewriteUrl `/translation{path}` |

## Downstream service URL resolution

All downstream URLs are resolved through `node-config` (the `config` npm package):

1. **`config/default.json`** — declares every service URL with production-internal defaults (e.g. `http://ccd-data-store-api-prod.service.core-compute-prod.internal`).
2. **`config/custom-environment-variables.json`** — maps environment variable names to config paths. Example: `SERVICES_CCD_DATA_STORE_API_PATH` overrides `services.ccd.dataApi`.
3. **`api/configuration/references.ts`** — exports typed string constants for each config path (e.g. `SERVICES_CCD_DATA_STORE_API_PATH = 'services.ccd.dataApi'`).
4. **`api/configuration/index.ts`** — exposes `getConfigValue<T>(ref)` wrapper that calls `config.get(ref)`.

In deployed environments, `NODE_ENV` is always `production` — the only checked-in config file is `default.json`. Environment-specific overrides arrive via Helm `values.*.template.yaml` which set the corresponding env vars.

AKS Key Vault secrets are mounted at runtime by `@hmcts/properties-volume` and merged into the config object at `configuration/index.ts:6–7` (`propertiesVolume.addTo(config)`). Secret paths follow `secrets.rpx.*` — for example `secrets.rpx.mc-s2s-client-secret`, `secrets.rpx.mc-idam-client-secret`.

### Feature flags via node-config

Boolean feature flags live under `feature.*` in `default.json` with env var overrides. All flag env vars require `__format: "json"` — they must be set as `"true"` or `"false"` strings:

| Flag | Config path | Default |
|------|-------------|---------|
| `FEATURE_HELMET_ENABLED` | `feature.helmetEnabled` | `true` |
| `FEATURE_REDIS_ENABLED` | `feature.redisEnabled` | `false` |
| `FEATURE_OIDC_ENABLED` | `feature.oidcEnabled` | `false` |
| `FEATURE_SECURE_COOKIE_ENABLED` | `feature.secureCookieEnabled` | `true` |
| `FEATURE_WORKALLOCATION_ENABLED` | `feature.workAllocationEnabled` | `false` |
| `FEATURE_ACCESS_MANAGEMENT_ENABLED` | `feature.accessManagementEnabled` | `true` |

## Auth-interceptor middleware chain

Authentication is handled almost entirely by `@hmcts/rpx-xui-node-lib`. The BFF's own code is minimal:

### `rpx-xui-node-lib` middleware composition

The `XuiNode` class (`rpx-xui-node-lib:src/common/models/xuiNode.class.ts:7`) orchestrates middleware in a fixed order: `['session', 'auth']` (line 15). Calling `xuiNode.configure(options)` dynamically imports each layer and calls `configure()` on its sub-keys:

```
xuiNode.configure({
  session: { redisStore: { ... } },   // or fileStore for local dev
  auth:    { oidc: { ... }, s2s: { ... } }
})
```

Each layer mounts its Router internally. If any middleware exposes an `authenticate` method, it is promoted to `xuiNode.authenticate` — the per-request guard BFFs use (`xuiNode.class.ts:88–91`).

The library's responsibilities (from its design spec) include: session creation, initiating OIDC authentication, issuing and storing session tokens in the session store, checking requests for valid tokens, session renewal, session termination (logout), and S2S token lifecycle management.

#### Session store

Sessions are stored in Azure Cache for Redis in deployed environments. The consuming application creates its own Redis instance and passes the URL, secret, and session secret into the library via `session.redisStore` configuration. For local development and test environments, a file-based store (`session.fileStore`) can be substituted.

The library handles the race condition of multiple load-balanced instances sharing a Redis backend — the connection is initialised at application startup through `configure()` so that subsequent requests from either instance resolve correctly.

#### Event callbacks

The library is an `EventEmitter`, and each middleware layer declares the events it emits via `getEvents()`. There are three sets:

- Auth (`rpx-xui-node-lib:src/auth/auth.constants.ts:2-8`) — `auth.authenticate.success`, `auth.authenticate.failure`, `auth.authenticate.accessDenied`, plus `auth.serializeUser` / `auth.deserializeUser`, which are emitted from the Passport serialisation hooks and hand the BFF the `done` callback so it can substitute what goes into the session (`strategy.class.ts:633`, `:640`).
- S2S (`rpx-xui-node-lib:src/auth/s2s/s2s.constants.ts:2-5`) — `s2s.authenticate.success`, `s2s.authenticate.failure`.
- Session store (`rpx-xui-node-lib:src/session/session.constants.ts:2-5`) — `redisStore.ClientReady`, `redisStore.ClientError`.

Manage Cases subscribes to the three auth events (`rpx-xui-webapp:api/auth/index.ts:104-106`) to set the IDAM cookies on success, log failures, and raise an AppInsights event when a user is denied for having no matching role; and to both Redis events (`rpx-xui-webapp:api/health/index.ts:80`, `:93`) to pass the client to the cache layer and add a `redis` health check.

Subscription order is load-bearing. `proxyEvents` forwards an event only if `this.listenerCount(event)` is already non-zero at the moment the middleware layer is configured (`rpx-xui-node-lib:src/common/models/xuiNode.class.ts:102-109`), and that happens inside `xuiNode.configure()`. An `xuiNode.on(...)` registered after `configure()` resolves is never wired to the emitting middleware and fires silently. Manage Cases stays on the right side of this: the auth listeners are registered at module scope, and `health.addReformHealthCheck(app)` runs at `api/application.ts:123`, both before `getXuiNodeMiddleware()` calls `configure()` at `:125`.

<!-- DIVERGENCE: Confluence "Expert UI Low Level Design - Session Management Library" describes
     lifecycle callbacks sessionCreate(sessionId), verify(sessionId), setTTL(sessionId) and
     sessionTimeout(sessionId), the last extendable by calling renewSession(). None of those event
     names, and no renewSession method, exist in rpx-xui-node-lib. Source wins. -->

### OIDC flow

The `OpenID` class (`rpx-xui-node-lib:src/auth/oidc/models/openid.class.ts:24`) wraps `openid-client` and Passport:

1. At startup, performs OIDC discovery against `${SERVICES_IDAM_LOGIN_URL}/o/.well-known/openid-configuration`.
2. Registers routes: `GET /auth/login`, `GET /oauth2/callback`, `GET /auth/logout`, `GET /auth/isAuthenticated`, `GET /auth/keepalive`.
3. On each request, `setHeaders` injects `Authorization: Bearer <accessToken>` and `user-roles: <comma-joined-roles>` (`strategy.class.ts:450–464`).
4. Token refresh is handled by `keepAliveHandler` which calls `client.refresh(refreshToken)` silently.

### S2S token exchange

The `S2SAuth` class (`rpx-xui-node-lib:src/auth/s2s/s2s.class.ts:11`) acquires service-to-service tokens:

1. On each request, checks an in-memory token cache keyed by microservice name.
2. On cache miss, generates a TOTP via `otplib.authenticator.generate(s2sSecret)` and POSTs to the S2S lease endpoint (`POST <s2sEndpointUrl>` with `{ microservice, oneTimePassword }`).
3. Sets `req.headers.ServiceAuthorization = 'Bearer <token>'` (`s2s.class.ts:52`).
4. Token is cached in-memory until its JWT `exp` claim expires.

### The `authInterceptor` in the BFF

`api/lib/middleware/auth.ts:5` exports `authInterceptor` as a thin re-export of `xuiNode.authenticate`. This is applied:

- Globally to all `/api/*` routes at `api/routes.ts:46`.
- Per-route on every proxy via `applyProxy`'s middleware array (`api/lib/middleware/proxy.ts:119`).

### Header forwarding for downstream calls

`api/lib/proxy.ts:setHeaders` attaches to direct Axios calls:

- `Authorization` — forwarded from the incoming request.
- `ServiceAuthorization` — S2S token from `rpx-xui-node-lib`.
- `user-roles` — forwarded if present.
- `content-type`, `accept` — set to `application/json`.
- Hearing data-source headers (`Data-Store-Url`, `Role-Assignment-Url`, `hmctsDeploymentId`) — forwarded only when `services.hearings.enableHearingDataSourceHeaders=true`.

Additionally, `api/lib/http/index.ts:5–8` adds `hmcts-deployment-id` globally to all Axios requests when the `PREVIEW_DEPLOYMENT_ID` env var is set.

## Error handling

Error handling operates at two levels:

### Axios response interceptors

`api/lib/interceptors.ts` attaches request/response interceptors to the shared Axios instance. Response interceptors:

- Log timing data for every downstream call.
- Forward trace data to AppInsights for custom event tracking.
- Propagate HTTP error status codes back to the Express response.

### Express error middleware

The Express error handler (registered after all routes in `application.ts`) catches unhandled errors from route handlers and proxy failures. Errors from `http-proxy-middleware` are surfaced via the proxy's `onError` callback (`api/lib/middleware/proxy.ts:115`), which calls `onProxyError`. This handler sends `res.status(500)` with a body containing `{ error: "Error when connecting to remote server", status: 504 }` — note the mismatch between the HTTP status code (500) and the body's `status` field (504). This is a known inconsistency.

### CSRF protection

CSRF uses `@dr.pogodin/csurf`:

- Cookie name: `XSRF-TOKEN` with `httpOnly: false` (so Angular's `HttpClient` can read it).
- Angular sends the token back as header `X-XSRF-TOKEN` (configured in `app.module.ts:127–130`).
- GET requests are exempt.
- Cookie attributes: `sameSite: 'strict'`, `secure: true` (set by `rpx-xui-node-lib:strategy.class.ts:559–577`).

## Dual proxy pattern

The BFF uses two distinct patterns for downstream communication:

```mermaid
flowchart LR
    Browser -->|"/data, /documents, /activity"| Proxy["http-proxy-middleware"]
    Proxy -->|raw stream| CCDGW["CCD API Gateway"]
    Proxy -->|raw stream| CDAM
    Proxy -->|raw stream| Payments

    Browser -->|"/api/workallocation, /api/role-access"| BFF["Express route handlers"]
    BFF -->|Axios + tokens| WA["WA Task Mgmt"]
    BFF -->|Axios + tokens| AM["AM Role Assignment"]
    BFF -->|Axios + tokens| RD["Reference Data"]
```

1. **Transparent proxy** (`http-proxy-middleware`) — for CCD API Gateway, documents, payments, annotation, and other services where the browser needs a direct pass-through. The BFF adds auth headers but does not parse or transform the body.

2. **Server-side Axios calls** — for work allocation, access management, reference data, and user details where the BFF needs to aggregate, transform, or cache responses before returning them to the Angular client. These use the singleton Axios instance from `api/lib/http/index.ts` with tokens set explicitly by `setHeaders`.

## Security model and hardening considerations

The proxy layer's security posture relies on a combination of server-side auth injection and downstream enforcement:

### Auth header injection

All proxied requests pass through `authInterceptor` before reaching `http-proxy-middleware`. The BFF generates `Authorization` and `ServiceAuthorization` headers server-side from the user's session and the S2S token cache. `setHeaders` is mounted on the node-lib router (`rpx-xui-node-lib:src/auth/models/strategy.class.ts:626`), which `application.ts` installs at `:126` — before `initProxy(app)` at `:129` — so it applies to proxied traffic as well as to the local `/api` routers.

Two things follow from how it is written (`rpx-xui-node-lib:src/auth/models/strategy.class.ts:471-485`):

- Nothing is stripped. `setHeaders` only assigns; it never deletes a header the browser sent. A client-supplied `Authorization` or `ServiceAuthorization` survives onto the outbound request object alongside the server-generated value.
- Header injection is conditional on the session. `Authorization` and `user-roles` are set only when `req.session.passport.user` exists (`:474-480`). There is no server-side value to shadow a forged one when the session is absent — but such a request never gets that far, because `authenticate` returns `401 Unauthorized` for any request without `req.session.passport.user.userinfo` (`:460-462`), and it guards both the `/api` tree and every proxy.

Privilege escalation therefore is not available through header forgery: a token the BFF did not mint is only ever accompanied by, not substituted for, the session-derived one.

<!-- CONFLUENCE-ONLY: the "Proxy Configuration on Manage Case" page reports that a client-supplied
     Authorization header sent together with a valid session cookie can still change the outcome of
     a call (observed as a 401 from the downstream service). That is downstream response behaviour
     and is not verified in source. -->

### Subtree proxying risk

The current proxy configuration uses **prefix-based subtree forwarding**: any path suffix under a mounted prefix (e.g. `/data/*`) is forwarded to the downstream service. This means:

- An authenticated user can reach endpoints on a downstream service that the UI never calls, by crafting a path suffix.
- HTTP methods are not restricted at the BFF boundary — a DELETE to `/data/internal/anything` will be forwarded.
- Payload validation is inconsistent: some invalid JSON payloads cause downstream 500s rather than clean 400 rejections.

The downstream services (CCD API Gateway, CDAM, Payments, etc.) enforce their own RBAC and input validation. The BFF does not duplicate that enforcement. This is by design, but it increases reliance on downstream robustness.

### Known route duplication

`api/routes.ts` mounts `locationsRouter` on `/locations` twice, at `rpx-xui-webapp:api/routes.ts:54` and again at `:63`. Express registers both layers but the first one handles every matching request, so the second mount is unreachable — middleware or route changes made only to the later registration have no effect.

## Technical debt: dual proxy abstractions

The BFF contains two coexisting proxy abstractions that serve overlapping purposes:

| Module | Purpose | Pattern |
|--------|---------|---------|
| `api/lib/middleware/proxy.ts` | Modern `http-proxy-middleware` wrapper (`applyProxy`) | Forwards raw streams, auth injected via middleware chain |
| `api/lib/proxy.ts` | Legacy Axios-based proxy helpers (`get`, `put`, `post`) | Parses request body, makes Axios call to CCD Component API, returns response |

The legacy `api/lib/proxy.ts` is marked with a `TODO: remove this entire file in favour of middleware/proxy.ts` comment (line 6), with a follow-up note that this requires investigation (EXUI-3967). The legacy helper is still actively used by some route handlers that need to modify or inspect the response before returning it.

Additionally, `api/lib/middleware/proxy.ts` contains `console.log` statements (lines 59, 63) in the `buildPathRewrite` function that bypass the structured `log4jui` logger — another known cleanup item.

### Work allocation route method specificity

The `/workallocation/*` routes (handled locally, not proxied) use `router.use` for most handlers rather than explicit HTTP method verbs (`router.get`, `router.post`, etc.). This means any HTTP method will match a defined route path:

```
router.use('/task/:taskId/:action', postTaskAction);
router.use('/task/:taskId', getTask);
router.use('/caseworker/search', searchCaseWorker);
```

While functionally this works because the handlers only process the expected method, it weakens the route contract — a `DELETE /workallocation/task/123` would match and invoke `getTask` rather than returning 404/405. This is flagged as a hardening item.

## Examples

### Express application bootstrap (`createApp`)

```typescript
// Source: apps/xui/rpx-xui-webapp/api/application.ts

export async function createApp() {
  const app = express();

  if (showFeature(FEATURE_HELMET_ENABLED)) {
    app.use(helmet(getConfigValue(HELMET)));
    app.use(helmet.noSniff());
    app.use(helmet.frameguard({ action: 'deny' }));
    // CSP nonce injected per-request; {{cspNonce}} and {{dynatraceCdn}} replaced in index.html
    const cspMiddleware = csp({ defaultCsp: SECURITY_POLICY, ...MC_CSP });
    app.use(cspMiddleware);
  }

  app.use(cookieParser(getConfigValue(SESSION_SECRET)));

  // OIDC session + S2S middleware from rpx-xui-node-lib
  const xuiNodeMiddleware = await getXuiNodeMiddleware();
  app.use(xuiNodeMiddleware);

  // Proxy rules MUST be registered before bodyParser to allow raw stream forwarding
  initProxy(app);

  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

  app.use('/am', amRoutes);
  app.use('/api', routes);
  app.use('/external', openRoutes);
  app.use('/workallocation', workAllocationRouter);

  app.use(csrf({ cookie: { key: 'XSRF-TOKEN', httpOnly: false, secure: true, path: '/' }, ignoreMethods: ['GET'] }));
  app.use(express.static(staticRoot, { index: false }));
  app.use('/{*splat}', (req, res) => {
    const html = injectTemplateValues(indexHtmlRaw, res.locals.cspNonce);
    res.type('html').set('Cache-Control', 'no-store, max-age=0').send(html);
  });

  return app;
}
```

### Auth interceptor (`authInterceptor`)

```typescript
// Source: apps/xui/rpx-xui-webapp/api/lib/middleware/auth.ts

import { xuiNode } from '@hmcts/rpx-xui-node-lib';
import { RequestHandler } from 'express';

// Thin re-export of xuiNode.authenticate; applied to every authenticated route and proxy
const authInterceptor: RequestHandler = xuiNode.authenticate as unknown as RequestHandler;

export default authInterceptor;
```

### Configuring the node-lib and registering auth event callbacks

```typescript
// Source: apps/xui/rpx-xui-webapp/api/auth/index.ts

xuiNode.on(AUTH.EVENT.AUTHENTICATE_SUCCESS, successCallback);
xuiNode.on(AUTH.EVENT.AUTHENTICATE_FAILURE, failureCallback);

export const getXuiNodeMiddleware = async () => {
  const options: AuthOptions = {
    allowRolesRegex: getConfigValue(LOGIN_ROLE_MATCHER),
    authorizationURL: `${idamWebUrl}/login`,
    callbackURL: getConfigValue(SERVICES_IDAM_OAUTH_CALLBACK_URL),
    clientID: getConfigValue(SERVICES_IDAM_CLIENT_ID),
    clientSecret: getConfigValue(IDAM_SECRET),
    discoveryEndpoint: `${idamWebUrl}/o/.well-known/openid-configuration`,
    responseTypes: ['code'],
    scope: 'profile openid roles manage-user create-user search-user',
    sessionKey: 'xui-webapp',
    tokenEndpointAuthMethod: 'client_secret_post',
    ssoLogoutURL: `${idamWebUrl}/o/endSession`,
    // ...
  };

  const nodeLibOptions = {
    auth: { oidc: options, s2s: { microservice: 'xui_webapp', s2sEndpointUrl: `${s2sPath}/lease`, s2sSecret } },
    session: showFeature(FEATURE_REDIS_ENABLED) ? redisStoreOptions : fileStoreOptions,
  };

  return xuiNode.configure(nodeLibOptions);
};
```

### Proxy rule registration (`proxy.config.ts`)

```typescript
// Source: apps/xui/rpx-xui-webapp/api/proxy.config.ts

export const initProxy = (app: Express) => {
  // Simple rewrite: /activity → CCD API Gateway /activity
  applyProxy(app, {
    rewrite: true,
    rewriteUrl: '/activity',
    source: ['/activity'],
    target: getConfigValue(SERVICES_CCD_COMPONENT_API_PATH),
  });

  // Function rewrite: /documentsv2/… → CDAM /cases/documents/…
  applyProxy(app, {
    rewrite: true,
    rewriteUrl: (path: string) => '/cases/documents' + (path === '/' ? '' : path),
    source: '/documentsv2',
    target: getConfigValue(SERVICES_DOCUMENTS_API_PATH_V2),
  }, false);

  // Filter: /data and /print, but NOT /data/internal/searchCases (handled separately)
  applyProxy(app, {
    filter: ['!/data/internal/searchCases'],
    rewrite: false,
    source: ['/print', '/data'],
    target: getConfigValue(SERVICES_CCD_COMPONENT_API_PATH),
  });

  // WebSocket proxy for In-Court Presentation
  applyProxy(app, {
    rewrite: false,
    source: '/icp',
    target: getConfigValue(SERVICES_ICP_API_URL),
    ws: true,
  });
};
```

### `ProxyConfig` interface

```typescript
// Source: apps/xui/rpx-xui-webapp/api/lib/middleware/proxy.ts

export interface ProxyConfig {
  source: string | string[];    // browser-facing path prefix(es)
  target: string;               // downstream service base URL
  rewrite?: boolean;            // false = pass original path through unchanged
  rewriteUrl?: string | ((path: string, req: any) => string);
  filter?: string | string[];   // exclusion filters (prefix with '!' to negate)
  middlewares?: any[];          // extra middleware before proxy (e.g. bodyParser.json())
  onReq?: (proxyReq: any, req: any, res: any) => void;
  onRes?: (responseBody: string | any, req: any, res: any) => any;
  ws?: boolean;                 // enable WebSocket proxying
}
```

## See also

- [Architecture](architecture.md) — deployment topology, Kubernetes configuration, and the broader security model
- [Session Management](session-management.md) — OIDC login flow, Redis session store, role-based idle timeout, and client-side keepalive
- [How-to: Configure for New Service](../how-to/configure-for-new-service.md) — step-by-step guide to adding a new proxy route
- [Reference: Config Schema](../reference/config-schema.md) — complete reference for `config/default.json`, env vars, feature flags, and Key Vault secrets
- [Reference: Shared Libraries](../reference/shared-libraries.md) — `@hmcts/rpx-xui-node-lib` API reference
- [Glossary](../reference/glossary.md) — definitions of BFF, `applyProxy`, `authInterceptor`, S2S, and subtree proxy

## Glossary

| Term | Definition |
|------|-----------|
| BFF | Backend-for-Frontend — the Express/Node.js layer co-located with the Angular SPA that handles auth, proxying, and server-side orchestration |
| S2S | Service-to-service authentication via TOTP tokens obtained from `rpe-service-auth-provider` |
| `authInterceptor` | Express middleware (`xuiNode.authenticate`) that validates session and injects `Authorization` + `ServiceAuthorization` headers |
| `node-config` | The `config` npm package used to resolve configuration from JSON files and environment variables |
| CSP nonce | A per-request `crypto.randomBytes(16)` value injected into the HTML and CSP header to allow inline scripts |
| Subtree proxy | A prefix-based proxy mount (`app.use('/path', proxy)`) that forwards all requests under that path prefix to a downstream service regardless of the specific path suffix or HTTP method |
| `applyProxy` | The wrapper function in `api/lib/middleware/proxy.ts` that creates and mounts an `http-proxy-middleware` instance with auth, path rewriting, and error handling |
