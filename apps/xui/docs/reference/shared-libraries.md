---
title: Shared Libraries
topic: overview
diataxis: reference
product: xui
audience: both
sources:
  - rpx-xui-common-lib:projects/exui-common-lib/package.json
  - rpx-xui-common-lib:projects/exui-common-lib/src/lib/exui-common-lib.module.ts
  - rpx-xui-common-lib:projects/exui-common-lib/src/public-api.ts
  - rpx-xui-node-lib:src/index.ts
  - rpx-xui-node-lib:src/common/models/xuiNode.class.ts
  - rpx-xui-node-lib:src/auth/oidc/models/openid.class.ts
  - rpx-xui-node-lib:src/auth/s2s/s2s.class.ts
  - rpx-xui-node-lib:src/session/models/redisSessionStore.class.ts
  - rpx-xui-node-lib:src/auth/models/authOptions.interface.ts
  - rpx-xui-node-lib:src/auth/auth.constants.ts
  - rpx-xui-node-lib:src/session/session.constants.ts
  - rpx-xui-node-lib:src/auth/s2s/s2s.constants.ts
  - rpx-xui-node-lib:.github/workflows/npmpublish.yml
  - rpx-xui-common-lib:.github/workflows/npmpublish.yml
  - rpx-xui-translation:projects/rpx-xui-translation/src/lib/rpx-translation.module.ts
  - rpx-xui-translation:projects/rpx-xui-translation/src/lib/rpx-translation.service.ts
  - rpx-xui-translation:projects/rpx-xui-translation/src/public-api.ts
  - rpx-xui-webapp:api/auth/index.ts
  - rpx-xui-webapp:api/health/index.ts
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/xui/rpx-xui-webapp/api/auth/index.ts
  - apps/xui/rpx-xui-webapp/src/app/app.module.ts
  - apps/xui/rpx-xui-common-lib/projects/exui-common-lib/src/lib/services/feature-toggle/launch-darkly.service.ts
  - apps/xui/rpx-xui-translation/projects/rpx-xui-translation/src/lib/rpx-translation.module.ts
confluence:
  - id: "1428029544"
    title: "Open ID Connect Library: Developer Guide"
    last_modified: "unknown"
    space: "EUI"
  - id: "1478696111"
    title: "Library development flow and automation"
    last_modified: "unknown"
    space: "EUI"
  - id: "1582273163"
    title: "Welsh Language - LLD"
    last_modified: "unknown"
    space: "EUI"
  - id: "1214448545"
    title: "Setting up Common Library with Github Actions"
    last_modified: "unknown"
    space: "EUI"
  - id: "1682837411"
    title: "ccd-case-ui-toolkit Release Process"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1875861620"
    title: "Angular v20 upgrade"
    last_modified: "unknown"
    space: "EXUI"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

# Shared Libraries

## TL;DR

- XUI ships three shared npm libraries consumed by all deployed applications (Manage Cases, Manage Organisations, Approve Organisation).
- `@hmcts/rpx-xui-common-lib` (Angular) provides UI components, services (session timeout, LaunchDarkly feature toggles, analytics), and GOV.UK Design System wrappers.
- `@hmcts/rpx-xui-node-lib` (Node/Express) provides OIDC/OAuth2 authentication, S2S token exchange, session management (Redis/file), CSP/Helmet, and CSRF middleware. It exposes an event-driven API (`xuiNode.on(EVENT, callback)`) for lifecycle hooks.
- `rpx-xui-translation` (Angular) provides Welsh-language translation via an `rpxTranslate` pipe backed by `ts-translation-service` with IndexedDB caching.
- All libraries are published to npm via GitHub Actions using OIDC Trusted Publishing (triggered by GitHub Releases). Pre-releases use the `next` dist-tag; stable releases use `latest`.
- The inter-library dependency chain is: apps depend on `rpx-xui-common-lib` and `ccd-case-ui-toolkit`, which both depend on `rpx-xui-translation`.

## Library summary

| Library | npm package | Current version | Runtime | Primary purpose |
|---------|-------------|-----------------|---------|-----------------|
| rpx-xui-common-lib | `@hmcts/rpx-xui-common-lib` | 3.2.9 | Angular (browser) | Shared UI components, services, directives |
| rpx-xui-node-lib | `@hmcts/rpx-xui-node-lib` | 2.30.13 | Node/Express (BFF) | Auth, session, security middleware |
| rpx-xui-translation | `rpx-xui-translation` | 1.2.3 | Angular (browser) | Welsh-language translation pipe and service |

## Consuming applications

| Library | rpx-xui-webapp | rpx-xui-manage-organisations | rpx-xui-approve-org |
|---------|:-:|:-:|:-:|
| `@hmcts/rpx-xui-common-lib` | Yes | Yes | Yes |
| `@hmcts/rpx-xui-node-lib` | Yes | Yes | Yes |
| `rpx-xui-translation` | Yes | Yes | Yes |

All three deployed XUI applications consume all three shared libraries.

## Inter-library dependency graph

The libraries have internal dependencies that must be respected during upgrades:

```
rpx-xui-webapp ─────────┬──> @hmcts/rpx-xui-common-lib ──> rpx-xui-translation
                         ├──> @hmcts/ccd-case-ui-toolkit ──> rpx-xui-translation
                         ├──> rpx-xui-translation
                         └──> @hmcts/rpx-xui-node-lib (BFF only)

rpx-xui-manage-organisations ─┬──> @hmcts/rpx-xui-common-lib
                               ├──> @hmcts/ccd-case-ui-toolkit
                               ├──> rpx-xui-translation
                               └──> @hmcts/rpx-xui-node-lib (BFF only)

rpx-xui-approve-org ──────────┬──> @hmcts/rpx-xui-common-lib
                               ├──> @hmcts/ccd-case-ui-toolkit
                               └──> @hmcts/rpx-xui-node-lib (BFF only)
```

When upgrading Angular (e.g. the v20 upgrade), the bottom-up order is:

1. `rpx-xui-translation` (no library dependencies)
2. `rpx-xui-common-lib` (depends on `rpx-xui-translation`)
3. `ccd-case-ui-toolkit` (depends on `rpx-xui-translation`, `media-viewer`, `ccpay-web-component`)
4. Deployed applications (depend on all of the above)

## rpx-xui-common-lib

| Attribute | Value |
|-----------|-------|
| npm package | `@hmcts/rpx-xui-common-lib` |
| Version | 3.2.9 |
| Repo path | `apps/xui/rpx-xui-common-lib` |
| Library source | `projects/exui-common-lib/` |
| Build tool | `ng-packagr` v20.3.0 |
| Angular module | `ExuiCommonLibModule` |
| Component prefix | `xuilib-` |
| Publish scope | `@hmcts` (public) |

### Key exports

| Category | Exports |
|----------|---------|
| UI components | `xuilib-session-dialog`, `xuilib-cookie-banner`, `xuilib-loading-spinner`, `xuilib-find-person`, GOV.UK wrappers (`gov-uk-input`, `gov-uk-checkbox`, `gov-uk-radios`, `gov-uk-select`, `gov-uk-table`, etc.), HMCTS wrappers (`hmcts-banner`, `hmcts-identity-bar`, `hmcts-pagination`, `hmcts-primary-navigation`, `hmcts-sub-navigation`) |
| Services | `TimeoutNotificationsService`, `ManageSessionServices`, `LaunchDarklyService`, `FeatureToggleService` (abstract), `LoadingService`, `RoleService`, `CookieService`, `FilterService`, `FindAPersonService`, `GoogleAnalyticsService`, `GoogleTagManagerService`, `SessionStorageService` |
| Guards | `RoleGuard`, `FeatureToggleGuard` |
| Directives | `[xuilibFeatureToggle]`, `[xuilibLet]` |
| Pipes | Re-exports `rpxTranslate` via `RpxTranslationModule.forChild()` |

### Peer dependencies

| Dependency | Notes |
|------------|-------|
| `launchdarkly-js-client-sdk` | Required for `LaunchDarklyService` |
| `ngx-pagination` | Pagination component support |
| `rpx-xui-translation` | Pinned to pre-release `1.1.2-CME-780-9` in peer deps |
| `@ng-idle/core`, `@ng-idle/keepalive` | Session idle detection |

### Versioning notes

- Published as a public scoped package (`publishConfig.access: "public"`) at `rpx-xui-common-lib:projects/exui-common-lib/package.json:9`.
- All services use `providedIn: 'root'` -- no lazy-loaded module scoping.
- All components are `standalone: false`; must be imported via `ExuiCommonLibModule`.
- Angular Material dependencies are pinned at v16 (legacy modules: `MatLegacyAutocompleteModule`, `MatLegacyInputModule`, `MatLegacyTabsModule`) despite Angular 20 core deps (`rpx-xui-common-lib:projects/exui-common-lib/package.json`).

## rpx-xui-node-lib

| Attribute | Value |
|-----------|-------|
| npm package | `@hmcts/rpx-xui-node-lib` |
| Version | 2.30.13 |
| Repo path | `apps/xui/rpx-xui-node-lib` |
| Entry point | `src/index.ts` |
| Sub-modules | `src/auth/`, `src/session/`, `src/common/` |
| Peer deps | `helmet ^7.0.0` |

### Middleware layers

The `XuiNode` class (`rpx-xui-node-lib:src/common/models/xuiNode.class.ts:7`) orchestrates middleware in a fixed order: `['session', 'auth']`. BFFs call `xuiNode.configure(options)` and mount the returned Express Router.

| Layer | Key | Class | Purpose |
|-------|-----|-------|---------|
| Session | `redisStore` | `RedisSessionStore` | Redis-backed Express sessions (`connect-redis` v4 + `redis` v3) |
| Session | `fileStore` | `FileSessionStore` | File-backed sessions (local dev only) |
| Auth | `oidc` | `OpenID` | OIDC authentication via `openid-client` + Passport |
| Auth | `oauth2` | `OAuth2` | OAuth2 authentication via `passport-oauth2` |
| Auth | `s2s` | `S2SAuth` | S2S token exchange via TOTP + `rpe-service-auth-provider` |

### Routes registered (OIDC/OAuth2)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/auth/login` | Initiate OIDC/OAuth2 login |
| GET | `/oauth2/callback` | Handle IdP callback |
| GET | `/auth/logout` | Logout and session destruction |
| GET | `/auth/isAuthenticated` | Check authentication status |
| GET | `/auth/keepalive` | Token refresh / session keepalive |

### Security features

| Feature | Implementation |
|---------|---------------|
| CSRF | `@dr.pogodin/csurf`; `XSRF-TOKEN` cookie with `sameSite: 'strict', secure: true` (`rpx-xui-node-lib:src/auth/models/strategy.class.ts:559-577`) |
| CSP (static) | `getContentSecurityPolicy(helmet)` -- pre-defined allowlist including `*.hmcts.net`, LaunchDarkly, GA/GTM, Azure App Insights |
| CSP (nonce) | `csp(options)` -- per-request `crypto.randomBytes(16)` nonce, env-var extensible (`CSP_SCRIPT_EXTRA`, etc.) |
| Header injection | `Authorization: Bearer <accessToken>` + `user-roles` on downstream requests |
| Sensitive redaction | `clientSecret`, `password`, `token`, `authorization` keys stripped from logs |

### Session timeout utility

`getUserSessionTimeout(userRoles, sessionTimeouts)` (`rpx-xui-node-lib:src/common/util/userTimeout.ts:140`) matches user roles against an ordered list of `RoleGroupSessionTimeout` patterns (regex). Falls back to `DEFAULT_SESSION_TIMEOUT` (`totalIdleTime: 480`, `idleModalDisplayTime: 10` -- values in minutes at the BFF layer).

### Integration pattern

BFF applications integrate the library in three steps (`rpx-xui-webapp:api/auth/index.ts`):

```typescript
import { xuiNode, AUTH, SESSION } from '@hmcts/rpx-xui-node-lib'

// 1. Register event listeners before configure()
xuiNode.on(AUTH.EVENT.AUTHENTICATE_SUCCESS, successCallback)
xuiNode.on(AUTH.EVENT.AUTHENTICATE_FAILURE, failureCallback)
xuiNode.on(SESSION.EVENT.REDIS_CLIENT_READY, (client) => { /* health check */ })

// 2. Configure and mount the middleware router
app.use(xuiNode.configure(nodeLibOptions))

// 3. Mount unauthenticated routes BEFORE the authenticate guard
app.use('/health', healthCheckRouter)
app.use(xuiNode.authenticate)
```

The `configure()` call returns an Express `Router` synchronously, but internally uses dynamic `import()` to resolve session and auth layers asynchronously (`rpx-xui-node-lib:src/common/models/xuiNode.class.ts:53-56`). The `authenticate` property is an Express middleware that returns 401 for unauthenticated requests or calls `next()` for authenticated ones.

### Event system

All middleware objects extend `EventEmitter`. Events propagate upward to the `XuiNode` singleton via `proxyEvents` (`rpx-xui-node-lib:src/common/models/xuiNode.class.ts:102-110`). Consumers listen via `xuiNode.on(eventName, handler)`.

| Constant | Event string | Callback parameters | Purpose |
|----------|-------------|---------------------|---------|
| `SESSION.EVENT.REDIS_CLIENT_READY` | `redisStore.ClientReady` | `redisClient` | Redis connection established; used for health checks |
| `SESSION.EVENT.REDIS_CLIENT_ERROR` | `redisStore.ClientError` | `error` | Redis connection error |
| `AUTH.EVENT.AUTHENTICATE_SUCCESS` | `auth.authenticate.success` | `request, response` | User authenticated successfully |
| `AUTH.EVENT.SERIALIZE_USER` | `auth.serializeUser` | user | User object stored into session |
| `AUTH.EVENT.DESERIALIZE_USER` | `auth.deserializeUser` | user | Session ID resolved back to User object |
| `AUTH.EVENT.AUTHENTICATE_FAILURE` | `auth.authenticate.failure` | error info | User authentication failed |
| `S2S.EVENT.AUTHENTICATE_SUCCESS` | `s2s.authenticate.success` | `s2sToken, request, response` | S2S token obtained successfully |
| `S2S.EVENT.AUTHENTICATE_FAILURE` | `s2s.authenticate.failure` | error info | S2S authentication failed |

### OIDC configuration options

The full `AuthOptions` interface (`rpx-xui-node-lib:src/auth/models/authOptions.interface.ts`) supports:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `authorizationURL` | `string` | Yes | IDAM login page URL |
| `tokenURL` | `string` | Yes | IDAM token endpoint |
| `clientID` | `string` | Yes | OAuth2 client ID (e.g. `xuiwebapp`) |
| `clientSecret` | `string` | Yes | From Azure Key Vault |
| `callbackURL` | `string` | Yes | Callback path (e.g. `/oauth2/callback`) |
| `scope` | `string` | Yes | Space-separated scopes (e.g. `profile openid roles manage-user create-user`) |
| `discoveryEndpoint` | `string` | Yes | OIDC discovery URL |
| `issuerURL` | `string` | Yes | Token issuer URL |
| `responseTypes` | `string[]` | Yes | Typically `['code']` |
| `tokenEndpointAuthMethod` | `string` | Yes | e.g. `client_secret_post` |
| `logoutURL` | `string` | No | IDAM logout endpoint |
| `useRoutes` | `boolean` | No | Whether to register login/callback/logout routes |
| `sessionKey` | `string` | No | Key for session storage |
| `allowRolesRegex` | `string` | No | Regex to match allowed user roles; unmatched users are rejected with "no application access" (default: `.` -- allows all) |
| `useCSRF` | `boolean` | No | Enable CSRF protection |
| `routeCredential` | `RouteCredential` | No | Client-credentials token for specific route paths (e.g. system-user calls) |
| `ssoLogoutURL` | `string` | No | Single sign-out URL |

### Additional routes

Beyond the five standard auth routes, the library registers an error-handling redirect:

| Method | Path | Purpose |
|--------|------|---------|
| (redirect) | `/expired-login-link` | Destination when OIDC callback fails (invalid state, expired link) |

### Versioning notes

- All middleware objects are `EventEmitter` subclasses; events propagate up to `XuiNode` via `proxyEvents`.
- `redis` v3 and `connect-redis` v4 are locked (older major versions).
- `configure()` is async internally but returns the router synchronously -- dynamic imports resolve in background Promises (`rpx-xui-node-lib:src/common/models/xuiNode.class.ts:53-56`).

## rpx-xui-translation

| Attribute | Value |
|-----------|-------|
| npm package | `rpx-xui-translation` |
| Version | 1.2.3 |
| Repo path | `apps/xui/rpx-xui-translation` |
| Library source | `projects/rpx-xui-translation/` |
| Build tool | `ng-packagr` |
| Angular module | `RpxTranslationModule` |
| Backend dependency | `ts-translation-service` |
| Caching | IndexedDB via Dexie |

### Public API

| Export | Type | Purpose |
|--------|------|---------|
| `RpxTranslationModule.forRoot(config)` | NgModule | Root import; provides config + singleton service |
| `RpxTranslationModule.forChild()` | NgModule | Lazy-module import; re-exports pipe without re-providing service |
| `RpxTranslationService` | Injectable | Phrase translation, language switching, batch HTTP fetch, IndexedDB caching |
| `RpxTranslatePipe` | Pipe (`rpxTranslate`) | Template pipe; delegates to service observables |
| `RpxLanguage` | Type | `'en' \| 'cy'` |
| `RpxTranslationConfig` | Interface | `{ baseUrl, validity, debounceTimeMs?, testMode? }` |

### Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `baseUrl` | `string` | (required) | URL prefix for `ts-translation-service`; POST sent to `{baseUrl}/{lang}` |
| `validity` | `ValidityDurationSpec` | (required) | Luxon Duration spec for IndexedDB cache TTL |
| `debounceTimeMs` | `number` | 300 | Debounce window for batching phrase requests |
| `testMode` | `boolean` | false | If true, returns `[Test translation for ...]` on HTTP error |

### Translation flow

1. Pipe calls `service.getTranslation$(phrase)`.
2. If language is `'en'`, returns phrase unchanged immediately (`rpx-xui-translation:projects/rpx-xui-translation/src/lib/rpx-translation.service.ts:105-106`).
3. Checks IndexedDB (Dexie `liveQuery`) for cached, non-expired translation.
4. On cache miss, queues phrase into a debounced batch.
5. After `debounceTimeMs`, POSTs `{ phrases: string[] }` to `{baseUrl}/{lang}`.
6. Caches response in IndexedDB with computed expiry.
7. Emits translation to all subscribers via `BehaviorSubject`.

### Language persistence

Language preference is stored in cookie `exui-preferred-language` with `SameSite=Strict` (`rpx-xui-translation:projects/rpx-xui-translation/src/lib/rpx-translation.service.ts:221-228`). Switching language re-translates all known phrases.

### Node-layer proxy

The translation library makes HTTP calls to `ts-translation-service`, but these are proxied through the BFF's Node layer rather than called directly from the browser. In `rpx-xui-webapp`, the proxy is configured at `/api/translation` and rewrites to the `/translation` path on the upstream microservice (`rpx-xui-webapp:api/proxy.config.ts:177-178`). The service URL is configured via `services.translation` in the app's `node-config` setup.

<!-- CONFLUENCE-ONLY: The Welsh Language LLD states that rpx-xui-translation was also designed for use by Fee and Pay and Evidence Management Angular apps. Not verified in source whether those teams adopted it. -->

### Versioning notes

- Pipe is `pure: false` (fires on every change detection cycle); stable observable references keep cost low.
- `RpxTranslationService` is a singleton when `forRoot()` is called once at the app root. Calling `forRoot()` in multiple lazy modules creates separate instances with independent caches.
- Angular 20 peer dependency; uses NgModule declarations (not standalone).

## Release and publish workflow

All three libraries use the same GitHub Actions release pattern (`npmpublish.yml`):

### Trigger

Publishing is triggered by **creating a GitHub Release** (via the GitHub UI or CLI). The workflow fires on `release: types: [created]`.

### Build and publish steps

1. **Build job** -- checks out code, installs dependencies (`yarn install`), runs lint (common-lib only), builds the library, runs tests.
2. **publish-npm job** -- uses npm OIDC Trusted Publishing (no `NPM_TOKEN` secret required). Publishes to `https://registry.npmjs.org/` with `--access public`.
3. **publish-gpr job** -- packs a tarball and attaches it to the GitHub Release as a downloadable artifact.

<!-- DIVERGENCE: Confluence "Setting up Common Library with Github Actions" (page 1214448545) says "Ask #RPE to add NPM_TOKEN for your project github setting", but rpx-xui-common-lib:.github/workflows/npmpublish.yml shows OIDC Trusted Publishing is now used (no token). Source wins. -->

### Dist-tag logic

```yaml
if [ "${{ github.event.release.prerelease }}" = "true" ]; then
  echo "NPM_TAG=next" >> "$GITHUB_ENV"
else
  echo "NPM_TAG=latest" >> "$GITHUB_ENV"
fi
```

- **Pre-release** (checkbox ticked on GitHub) publishes under the `next` tag.
- **Full release** publishes under the `latest` tag.

### Pre-release versioning convention

Pre-release versions follow the pattern `<base-version>-<descriptor>`:
- `7.3.7-angular-20` (toolkit Angular 20 candidate)
- `3.1.5-cme-778-prerelease` (common-lib pre-release)
- `1.1.2-CME-780-9` (translation pre-release)

### ccd-case-ui-toolkit release process

The toolkit uses a more controlled release workflow due to its broader impact:

1. **Pre-release version created** from master with version format `<live>-<description>` (e.g. `7.39.0-fix-link-defect`)
2. **Manage Cases release candidate PR** created pointing to the pre-release toolkit version
3. **Risk assessment** determines whether a CI/CD release or SRT (Service Regression Testing) window is required
4. **SRT window** (if needed): service teams test their journeys against the PR environment and provide sign-off
5. **Final release**: version bumped (typically minor increment), label removed, MC PR updated to final version

Version coordination between Feature Team and PET Team:
- Feature Team increments minor version (6.17.0, 6.18.0, ...)
- PET Team uses patch version from the current minor (6.16.1, 6.16.2, ...)

## Examples

### `rpx-xui-node-lib`: BFF integration pattern

```typescript
// Source: apps/xui/rpx-xui-webapp/api/auth/index.ts

import { AUTH, AuthOptions, xuiNode } from '@hmcts/rpx-xui-node-lib';

// 1. Register lifecycle event listeners BEFORE configure()
xuiNode.on(AUTH.EVENT.AUTHENTICATE_SUCCESS, (req, res, next) => {
  // Set auth cookies and redirect on successful OIDC login
  res.cookie('__userid__', req.session.passport.user.userinfo.uid, { sameSite: 'strict' });
  res.cookie('__auth__',   req.session.passport.user.tokenset.accessToken, { sameSite: 'strict' });
  if (!req.isRefresh) return res.redirect('/');
  next();
});
xuiNode.on(AUTH.EVENT.AUTHENTICATE_FAILURE, (req, res) => {
  console.warn(`Auth Error: ${res.locals.message}`);
});

// 2. Configure with session store + auth options and mount the returned Router
const nodeLibOptions = {
  auth: {
    oidc: {
      clientID: 'xuiwebapp',
      discoveryEndpoint: 'https://hmcts-access.service.gov.uk/o/.well-known/openid-configuration',
      callbackURL: '/oauth2/callback',
      scope: 'profile openid roles manage-user create-user search-user',
      tokenEndpointAuthMethod: 'client_secret_post',
      allowRolesRegex: 'caseworker',
      ssoLogoutURL: 'https://hmcts-access.service.gov.uk/o/endSession',
      // clientSecret from AKS Key Vault: secrets.rpx.mc-idam-client-secret
    },
    s2s: {
      microservice: 'xui_webapp',
      s2sEndpointUrl: 'http://rpe-service-auth-provider.../lease',
      // s2sSecret from AKS Key Vault: secrets.rpx.mc-s2s-client-secret
    },
  },
  session: {
    redisStore: {
      name: 'xui-webapp',
      secret: '<session-secret>',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'Lax', secure: true },
      redisStoreOptions: {
        redisCloudUrl: '<from AKS Key Vault>',
        redisKeyPrefix: 'activity:',
        redisTtl: 86400,
      },
    },
  },
};

// xuiNode.configure() returns an Express Router synchronously
// (session/auth layers load asynchronously via dynamic import internally)
const xuiNodeMiddleware = await xuiNode.configure(nodeLibOptions);
app.use(xuiNodeMiddleware);

// 3. The authenticate guard is used on every protected route
app.use('/api', xuiNode.authenticate, apiRoutes);
```

### `@hmcts/rpx-xui-common-lib`: Angular app module wiring

```typescript
// Source: apps/xui/rpx-xui-webapp/src/app/app.module.ts (excerpt)

import {
  ExuiCommonLibModule,
  FeatureToggleService,
  LaunchDarklyService,
  TimeoutNotificationsService,
  FeatureToggleGuard,
} from '@hmcts/rpx-xui-common-lib';
import { NgIdleKeepaliveModule } from '@ng-idle/keepalive';

@NgModule({
  imports: [
    ExuiCommonLibModule,
    NgIdleKeepaliveModule.forRoot(),  // required for TimeoutNotificationsService
    // ...
  ],
  providers: [
    // Swap LaunchDarklyService for a different implementation here to replace LD
    { provide: FeatureToggleService, useClass: LaunchDarklyService },
    TimeoutNotificationsService,
    FeatureToggleGuard,
  ],
})
export class AppModule {}
```

### `rpx-xui-translation`: module wiring

```typescript
// Source: apps/xui/rpx-xui-translation/projects/rpx-xui-translation/src/lib/rpx-translation.module.ts

// In app root (called once):
RpxTranslationModule.forRoot({
  baseUrl: '/api/translation',   // BFF proxy path → ts-translation-service
  debounceTimeMs: 300,
  validity: { days: 1 },         // IndexedDB cache TTL
  testMode: false,
})

// In lazy-loaded feature modules (re-exports pipe without re-providing service):
RpxTranslationModule.forChild()
```

## See also

- [Explanation: Case UI Toolkit](../explanation/case-ui-toolkit.md) — `@hmcts/ccd-case-ui-toolkit`, the fourth shared library, explained separately due to its complexity
- [BFF Pattern](../explanation/bff-pattern.md) — how `@hmcts/rpx-xui-node-lib` integrates into the Express middleware chain
- [Session Management](../explanation/session-management.md) — `TimeoutNotificationsService` and `xuilib-session-dialog` from `@hmcts/rpx-xui-common-lib`
- [Feature Flags](../explanation/feature-flags.md) — `LaunchDarklyService` and `FeatureToggleService` from `@hmcts/rpx-xui-common-lib`
- [Translation](../explanation/translation.md) — `rpx-xui-translation` library in depth
- [Glossary](glossary.md) — definitions of `XuiNode`, `LaunchDarklyService`, `RpxTranslatePipe`, S2S, SRT, and other key terms
