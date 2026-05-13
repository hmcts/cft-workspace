---
title: Configure For New Service
topic: architecture
diataxis: how-to
product: xui
audience: both
sources:
  - rpx-xui-webapp:config/default.json
  - rpx-xui-webapp:config/custom-environment-variables.json
  - rpx-xui-webapp:api/proxy.config.ts
  - rpx-xui-webapp:api/lib/middleware/proxy.ts
  - rpx-xui-webapp:api/configuration/references.ts
  - rpx-xui-webapp:api/application.ts
  - rpx-xui-webapp:src/app/services/ccd-config/launch-darkly-defaults.constants.ts
  - rpx-xui-webapp:src/app/app.constants.ts
  - rpx-xui-manage-organisations:src/app/app.constants.ts
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/xui/rpx-xui-webapp/api/proxy.config.ts
  - apps/xui/rpx-xui-webapp/api/lib/middleware/proxy.ts
  - apps/xui/rpx-xui-webapp/api/configuration/references.ts
  - apps/xui/rpx-xui-webapp/config/default.json
  - apps/xui/rpx-xui-webapp/config/custom-environment-variables.json
confluence:
  - id: "1933986267"
    title: "Proxy Configuration on Manage Case"
    space: "EXUI"
  - id: "1091503154"
    title: "Expert UI Service Onboarding FAQ"
    space: "EUI"
  - id: "1687521311"
    title: "Work Allocation Service Onboarding Configuration"
    space: "EXUI"
  - id: "1803651656"
    title: "Manage Organisation - Service Onboarding"
    space: "EXUI"
  - id: "1739301420"
    title: "Query Management Onboarding"
    space: "EXUI"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Adding a new downstream service to `rpx-xui-webapp` requires a config entry, a config reference constant, a proxy route, and (optionally) a Helm values override.
- The proxy rule must be registered in `api/proxy.config.ts` and called via `initProxy` before `bodyParser` (`api/application.ts:113-114`).
- The BFF automatically attaches `Authorization` and `ServiceAuthorization` headers to proxied requests via `authInterceptor` (`api/lib/middleware/proxy.ts:119`).
- The S2S microservice name for all XUI webapp calls is `xui_webapp` (`config/default.json:116`).
- Proxy routes use prefix-based subtree forwarding; all path suffixes under the prefix are forwarded to the downstream service.
- Beyond adding a proxy route, full service onboarding may also require LaunchDarkly flag updates, `serviceRefDataMapping` entries, jurisdiction list updates, and Manage Organisation role configuration.

## Business prerequisites

Before beginning the technical configuration, ensure these prerequisites are met:

- **CCD onboarding is complete** -- your service must have its CCD definition file loaded into AAT/Production CCD. Expert UI does not impose specific requirements on the content of the CCD definition.
<!-- CONFLUENCE-ONLY: not verified in source -->
- **Intended users are in scope** -- Solicitors, caseworkers, CTSC staff, and judicial decision makers are in scope. Citizens cannot access Expert UI.
<!-- CONFLUENCE-ONLY: not verified in source -->
- **Privacy policy is agreed** -- your BA/product owner has confirmed details of data retention with the Expert UI content design team.
<!-- CONFLUENCE-ONLY: not verified in source -->
- **IDAM roles are identified** -- inform the Expert UI team of the IDAM roles to be allocated to new users (e.g. `caseworker-divorce-solicitor`) and the CCD jurisdiction identifier (e.g. `DIVORCE`).
<!-- CONFLUENCE-ONLY: not verified in source -->
- The downstream service is registered in `rpe-service-auth-provider` so that `xui_webapp` S2S tokens are accepted.
- You know the service's base URL and the browser-facing path prefix you want to expose.

## Steps

### 1. Add the service URL to node-config

In `config/default.json`, add a new entry under the `services` object. Follow the existing naming convention:

```json
{
  "services": {
    "myNewService": {
      "api": "http://my-new-service-prod.service.core-compute-prod.internal"
    }
  }
}
```

### 2. Add the environment variable override

In `config/custom-environment-variables.json`, map an environment variable to your new config path:

```json
{
  "services": {
    "myNewService": {
      "api": "SERVICES_MY_NEW_SERVICE_API_URL"
    }
  }
}
```

This allows Helm charts (and local `.env` files) to override the URL per environment.

### 3. Add a config reference constant

In `api/configuration/references.ts`, add a constant that references the config path:

```typescript
export const SERVICES_MY_NEW_SERVICE_API_URL = 'services.myNewService.api';
```

All config lookups in the BFF use `getConfigValue(ref)` with these constants rather than raw string paths.

### 4. Add the proxy route

In `api/proxy.config.ts`, inside the `initProxy(app)` function, add a call to `applyProxy`:

```typescript
import { SERVICES_MY_NEW_SERVICE_API_URL } from '../configuration/references';

applyProxy(app, {
  source: '/my-new-service',
  target: getConfigValue(SERVICES_MY_NEW_SERVICE_API_URL),
  rewrite: true,
  rewriteUrl: '/my-new-service',
});
```

The `ProxyConfig` interface (`api/lib/middleware/proxy.ts:25-35`) defines all available fields:

| Field | Purpose |
|---|---|
| `source` | Browser-facing path prefix that triggers the proxy (string or string array) |
| `target` | Downstream service base URL (from config) |
| `rewrite` | Whether to rewrite the URL path. When `false`, the original path (including the prefix) is forwarded |
| `rewriteUrl` | Target path template (string) or rewrite function `(path, req) => string` |
| `filter` | Optional path filter array for excluding sub-paths (e.g. `['!/data/internal/searchCases']`) |
| `middlewares` | Additional middleware to apply before proxying (e.g. `bodyParser.json()`) |
| `onReq` | Custom request interceptor `(proxyReq, req, res) => void` |
| `onRes` | Custom response interceptor `(responseBody, req, res) => any` |
| `ws` | Enable WebSocket proxying |

Key constraint: `initProxy(app)` is called at `api/application.ts:114`, before `bodyParser` is registered at line 116. This is required because `http-proxy-middleware` needs access to the raw request stream. Your new proxy route is automatically included because it is called within `initProxy`.

The `authInterceptor` (which attaches `Authorization` and `ServiceAuthorization` headers) is prepended to the middleware chain for every proxied route automatically (`api/lib/middleware/proxy.ts:119`). The interceptor is the `xuiNode.authenticate` function from `@hmcts/rpx-xui-node-lib`.

#### Security considerations for proxy routes

Proxy routes use prefix-based subtree forwarding. This means all path suffixes under the registered prefix are forwarded to the downstream target. For example, registering `/my-new-service` will forward `/my-new-service/any/subpath` to the target. HTTP methods are not constrained at the proxy boundary.

If your downstream service exposes endpoints that should not be reachable from the browser:
- Consider using the `filter` option to restrict which sub-paths are proxied
- Consider adding method-level restrictions via a custom middleware in the `middlewares` array
- Rely on downstream S2S and role-based authorization as the ultimate enforcement layer

### 5. Set the environment variable for local development

For local runs, set the environment variable to point at your service. If using a `.env` file or shell export:

```bash
export SERVICES_MY_NEW_SERVICE_API_URL=http://localhost:4550
```

If the downstream service is running in AAT and you are using the F5 VPN:

```bash
export SERVICES_MY_NEW_SERVICE_API_URL=http://my-new-service-aat.service.core-compute-aat.internal
```

### 6. Add the Helm values override (for deployed environments)

In the service's Helm chart (typically `charts/rpx-xui-webapp/values.yaml` or `values.*.template.yaml`), add:

```yaml
SERVICES_MY_NEW_SERVICE_API_URL: http://my-new-service-{{ .Values.global.environment }}.service.core-compute-{{ .Values.global.environment }}.internal
```

### 7. Ensure S2S trust is configured

The downstream service must accept S2S tokens from `xui_webapp`. Confirm that the downstream service's S2S configuration includes `xui_webapp` in its list of allowed microservices. The S2S microservice name is set at `config/default.json:116`:

```json
{
  "microservice": "xui_webapp"
}
```

## Additional onboarding: jurisdiction and feature lists

If your service introduces a new CCD jurisdiction (not just a new downstream API), you may need to update several configuration lists in `config/default.json`:

| Config key | Purpose | Env var override |
|---|---|---|
| `jurisdictions` | Comma-separated list of jurisdictions available in Manage Cases | `JURISDICTIONS` |
| `waSupportedJurisdictions` | Jurisdictions enabled for Work Allocation tabs | `WA_SUPPORTED_JURISDICTIONS` |
| `globalSearchServices` | Jurisdictions included in global search results | `GLOBAL_SEARCH_SERVICES` |
| `staffSupportedJurisdictions` | Jurisdictions visible in staff admin UI | `STAFF_SUPPORTED_JURISDICTIONS` |

Current values (from `config/default.json`):

```json
{
  "jurisdictions": "DIVORCE,PROBATE,FR,PUBLICLAW,IA,SSCS,EMPLOYMENT,HRS,CIVIL,CMC,PRIVATELAW",
  "waSupportedJurisdictions": "IA,CIVIL,PRIVATELAW,PUBLICLAW,EMPLOYMENT,ST_CIC",
  "globalSearchServices": "IA,CIVIL,PRIVATELAW,PUBLICLAW,EMPLOYMENT,ST_CIC",
  "staffSupportedJurisdictions": "ST_CIC,CIVIL,EMPLOYMENT,PRIVATELAW,PUBLICLAW,IA,SSCS,DIVORCE,FR,PROBATE"
}
```

## Additional onboarding: Work Allocation

To enable a service for Work Allocation in Expert UI, additional configuration is required beyond the proxy route. These steps are typically performed by the ExUI team:

1. **LaunchDarkly flag `wa-service-config`** -- add an entry for the new service's case types and jurisdiction. The shape of each entry is:
   ```json
   {
     "caseTypes": ["Benefit", "SSCS_ExceptionRecord"],
     "releaseVersion": "4",
     "serviceName": "SSCS"
   }
   ```
   Hardcoded defaults for this flag exist in `src/app/services/ccd-config/launch-darkly-defaults.constants.ts`.

2. **LaunchDarkly flag `wa-landing-page-roles`** -- add the top-level caseworker role for the service (e.g. `caseworker-sscs`). This controls which users see the Work Allocation page as their home page. Referenced in `src/app/app.constants.ts:6`.

3. **`serviceRefDataMapping` in `config/default.json`** -- add the service's HMCTS service codes so that user and location reference data is fetched for Work Allocation. The service codes are those defined in the HMCTS reference data service:
   ```json
   { "service": "SSCS", "serviceCodes": ["BBA3"] }
   ```

4. **`waSupportedJurisdictions` in `config/default.json`** -- add the jurisdiction identifier to the comma-separated list (or set via `WA_SUPPORTED_JURISDICTIONS` env var).

<!-- CONFLUENCE-ONLY: not verified in source -->
Note: Before a service can make use of Work Allocation they also need to perform upstream configuration steps including enabling global search and setting up task management via Camunda DMNs. These are not ExUI config tasks.

## Additional onboarding: Manage Organisation

To ensure Manage Organisation works correctly for professional users of a new service, two onboarding tasks are required:

1. **Professional user roles** -- when a professional user account is created, the roles assigned are controlled by the `DEFAULT_USER_ROLES` constant in `rpx-xui-manage-organisations/src/app/app.constants.ts` (currently line 232+). If the service needs additional roles granted to new professionals, raise a ticket via the `#exui-support` Slack channel.

2. **Case Access Administrator (CAA) setup** -- if the service needs case assignment management in Manage Organisation:
   - In the CCD definition, add fields to the `SearchCaseResultFields` tab with `usecase` set to `Orgcases`
   - Grant read access to `caseworker-caa` for all fields in the Orgcases view
<!-- CONFLUENCE-ONLY: not verified in source -->

## Verify

1. Start `rpx-xui-webapp` locally with the new environment variable set:
   ```bash
   SERVICES_MY_NEW_SERVICE_API_URL=http://localhost:4550 yarn start:node
   ```

2. Open browser DevTools (Network tab) and trigger a request from the Angular SPA that hits your new path prefix (e.g. `GET /my-new-service/health`).

3. Confirm that:
   - The request reaches your downstream service (check its access logs).
   - The response returns successfully (no 401/403 -- confirming S2S and auth headers are forwarded).
   - The `ServiceAuthorization` header is present on the proxied request (visible in downstream service logs or a local proxy inspector).

## Existing proxy routes (reference)

The current proxy routes registered in `api/proxy.config.ts` are:

| Source prefix | Target service | Notes |
|---|---|---|
| `/activity` | CCD API Gateway | Activity tracker |
| `/documents` | DM Store | Custom req/res handlers for document upload |
| `/hearing-recordings` | EM HRS API | |
| `/documentsv2` | CDAM (Case Document AM API) | Rewrites to `/cases/documents` |
| `/data/internal/searchCases` | CCD API Gateway | Custom Elasticsearch response handler |
| `/print`, `/data` | CCD API Gateway | Excludes `/data/internal/searchCases` |
| `/api/addresses` | CCD API Gateway | Rewrites to `/addresses` |
| `/aggregated` | CCD API Gateway | Jurisdiction caching |
| `/icp` | ICP API | WebSocket enabled |
| `/em-anno` | EM Annotation API | Rewrites to `/api` prefix |
| `/doc-assembly` | Doc Assembly API | Rewrites to `/api` prefix |
| `/api/markups`, `/api/redaction` | NPA (Markup) API | |
| `/payments` | Payment API | |
| `/api/refund` | Refunds API | Rewrites to `/refund` |
| `/api/notification` | Notifications API | Rewrites to `/notifications` |
| `/refdata/location` | Location Ref API | |
| `/refdata/commondata/lov/categories/CaseLinkingReasonCode` | Common Data API | |
| `/categoriesAndDocuments` | CCD Data Store | |
| `/documentData/caseref` | CCD Data Store | |
| `/getLinkedCases` | CCD Data Store | |
| `/api/translation` | Translation Service | Rewrites to `/translation` |
| `/refdata/commondata/caseflags/service-id=:sid` | Common Data API | Case flags by service |
| `/icp/sessions` | ICP API | |

## Examples

### Real production proxy entries from `proxy.config.ts`

The following shows patterns used by existing proxy routes, illustrating the three main rewrite modes:

```typescript
// Source: apps/xui/rpx-xui-webapp/api/proxy.config.ts (selected entries)

export const initProxy = (app: Express) => {
  // Pattern 1: Simple path rewrite — /activity → /activity on CCD API Gateway
  applyProxy(app, {
    rewrite: true,
    rewriteUrl: '/activity',
    source: ['/activity'],
    target: getConfigValue(SERVICES_CCD_COMPONENT_API_PATH),
  });

  // Pattern 2: Pass-through subtree — /data/** and /print/** forwarded unchanged
  // (excludes /data/internal/searchCases which is handled separately)
  applyProxy(app, {
    filter: ['!/data/internal/searchCases'],
    rewrite: false,
    source: ['/print', '/data'],
    target: getConfigValue(SERVICES_CCD_COMPONENT_API_PATH),
  });

  // Pattern 3: Function rewrite — /documentsv2/path → CDAM /cases/documents/path
  applyProxy(app, {
    rewrite: true,
    rewriteUrl: (path: string) => '/cases/documents' + (path === '/' ? '' : path),
    source: '/documentsv2',
    target: getConfigValue(SERVICES_DOCUMENTS_API_PATH_V2),
  }, false);

  // Pattern 4: WebSocket proxy — /icp with ws:true for In-Court Presentation
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
  source: string | string[];
  target: string;
  rewrite?: boolean;
  rewriteUrl?: string | ((path: string, req: any) => string);
  filter?: string | string[];
  middlewares?: any[];
  onReq?: (proxyReq: any, req: any, res: any) => void;
  onRes?: (responseBody: string | any, req: any, res: any) => any;
  ws?: boolean;
}
```

### Config reference constants (the typed layer over `node-config`)

```typescript
// Source: apps/xui/rpx-xui-webapp/api/configuration/references.ts (excerpt)

// These constants are the keys passed to getConfigValue() and showFeature()
export const SERVICES_CCD_COMPONENT_API_PATH  = 'services.ccd.componentApi';
export const SERVICES_CCD_DATA_STORE_API_PATH = 'services.ccd.dataApi';
export const SERVICES_DOCUMENTS_API_PATH_V2   = 'services.documentsv2.api';
export const SERVICES_ROLE_ASSIGNMENT_API_PATH = 'services.role_assignment.roleApi';
export const SERVICES_WORK_ALLOCATION_TASK_API_PATH = 'services.work_allocation.taskApi';
export const SERVICES_TRANSLATION_API_URL     = 'services.translation';
// ...
```

### `config/default.json` and `custom-environment-variables.json` pairing

```json
// Source: apps/xui/rpx-xui-webapp/config/default.json (excerpt — hearings jurisdiction config)
{
  "services": {
    "hearings": {
      "hearingsJurisdictions": "SSCS,PRIVATELAW,CIVIL,IA",
      "sscs": {
        "serviceApi": "http://sscs-tribunals-api-prod.service.core-compute-prod.internal",
        "caseTypes": "Benefit"
      },
      "civil": {
        "serviceApi": "http://civil-service-prod.service.core-compute-prod.internal",
        "caseTypes": "CIVIL"
      }
    }
  }
}
```

```json
// Source: apps/xui/rpx-xui-webapp/config/custom-environment-variables.json (excerpt)
{
  "services": {
    "hearings": {
      "hearingsJurisdictions": "HEARINGS_JURISDICTIONS",
      "sscs": {
        "serviceApi": "SERVICES_HEARINGS_COMPONENT_API_SSCS",
        "caseTypes": "SERVICES_HEARINGS_CASETYPES_SSCS"
      }
    }
  },
  "feature": {
    "redisEnabled": { "__name": "FEATURE_REDIS_ENABLED", "__format": "json" }
  }
}
```

Note the `__format: "json"` on feature flags — env var values must be the JSON strings `"true"` or `"false"`, not bare booleans.

## See also

- [BFF Pattern](../explanation/bff-pattern.md) — explains proxy configuration, middleware ordering, and auth header injection in depth
- [Architecture](../explanation/architecture.md) — the proxy security model and dual proxy pattern (transparent proxy vs Axios)
- [How-to: Add a Feature Flag](add-feature-flag.md) — adding the LaunchDarkly and config flags required for Work Allocation onboarding
- [Reference: Config Schema](../reference/config-schema.md) — complete reference for service URL keys, jurisdiction lists, and `serviceRefDataMapping`
- [Reference: Downstream Services](../reference/downstream-services.md) — existing proxy and router routes for all services
- [Glossary](../reference/glossary.md) — definitions of `applyProxy`, `ProxyConfig`, `node-config`, and subtree proxy
