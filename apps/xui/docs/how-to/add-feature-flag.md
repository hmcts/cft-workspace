---
title: Add Feature Flag
topic: feature-flags
diataxis: how-to
product: xui
audience: both
sources:
  - rpx-xui-webapp:config/default.json
  - rpx-xui-webapp:config/custom-environment-variables.json
  - rpx-xui-webapp:api/configuration/references.ts
  - rpx-xui-webapp:api/configuration/index.ts
  - rpx-xui-webapp:api/configuration/uiConfigRouter.ts
  - rpx-xui-webapp:src/app/app.module.ts
  - rpx-xui-webapp:src/app/app.routes.ts
  - rpx-xui-webapp:src/app/containers/app/app.component.ts
  - rpx-xui-webapp:src/app/services/ccd-config/ccd-case.config.ts
  - rpx-xui-webapp:src/main.ts
  - rpx-xui-webapp:src/app/shared/services/mc-launch-darkly-service.ts
  - rpx-xui-webapp:src/app/directives/feature-toggle/feature-toggle.directive.ts
  - rpx-xui-webapp:src/app/services/ccd-config/launch-darkly-defaults.constants.ts
  - rpx-xui-webapp:src/app/services/ccd-config/initialisation-sync-service.ts
  - rpx-xui-common-lib:projects/exui-common-lib/src/lib/services/feature-toggle/launch-darkly.service.ts
  - rpx-xui-common-lib:projects/exui-common-lib/src/lib/services/feature-toggle/feature-toggle.service.ts
  - rpx-xui-common-lib:projects/exui-common-lib/src/lib/services/feature-toggle/feature-toggle.guard.ts
  - rpx-xui-common-lib:projects/exui-common-lib/src/lib/directives/feature-toggle/feature-toggle.directive.ts
  - rpx-xui-common-lib:projects/exui-common-lib/src/lib/models/feature-user.ts
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/xui/rpx-xui-common-lib/projects/exui-common-lib/src/lib/services/feature-toggle/launch-darkly.service.ts
  - apps/xui/rpx-xui-common-lib/projects/exui-common-lib/src/lib/services/feature-toggle/feature-toggle.guard.ts
  - apps/xui/rpx-xui-common-lib/projects/exui-common-lib/src/lib/directives/feature-toggle/feature-toggle.directive.ts
  - apps/xui/rpx-xui-webapp/src/app/app.routes.ts
  - apps/xui/rpx-xui-webapp/src/app/app.module.ts
confluence:
  - id: "1191576311"
    title: "Launch Darkly Implementation"
    last_modified: "2019-10-14T00:00:00Z"
    space: "EUI"
  - id: "1875863853"
    title: "Summary for KT session 12th August 2025"
    last_modified: "2025-08-12T00:00:00Z"
    space: "EXUI"
  - id: "1875844308"
    title: "Approach to moving away from Launch Darkly"
    last_modified: "2025-08-12T00:00:00Z"
    space: "EXUI"
  - id: "1753684013"
    title: "How to Create / Edit / Remove Service Message Banners in LaunchDarkly"
    last_modified: "2024-06-20T00:00:00Z"
    space: "EXUI"
  - id: "1504247258"
    title: "Test users with LaunchDarkly user variation"
    last_modified: "2023-01-01T00:00:00Z"
    space: "EUI"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- XUI feature flags are delivered via LaunchDarkly (client-side JS SDK `3.8.1`); the LD client ID is injected at runtime from an AKS Key Vault secret (`secrets.rpx.launch-darkly-client-id`), never baked into the Angular bundle.
- Server-side (Express BFF) flags use `node-config` booleans under `feature.*`, toggled by environment variables (`FEATURE_*`).
- Client-side (Angular) flags are evaluated by `FeatureToggleService` (backed by `LaunchDarklyService` from `@hmcts/rpx-xui-common-lib`); consume via `isEnabled(key)` or `getValue(key, default)` observables.
- Route-level gating uses `FeatureToggleGuard` with `data.needsFeaturesEnabled` on the route definition.
- Two distinct mechanisms exist: LD flags (dynamic, per-user targeting via roles/segments) and BFF config flags (static per-deployment, env-var driven).
- The team is actively migrating complex JSON-based LD flags to static config; LD will be retained for high-value dynamic use cases only.

## Prerequisites

- Access to the HMCTS LaunchDarkly project for the target environment (AAT, Demo, Prod). Access is via the Microsoft MyApplications portal -- click the LaunchDarkly application and select the "Expert UI" project.
- Merge rights on `rpx-xui-webapp`.
- Understanding of whether your flag needs **client-side evaluation** (Angular, per-user targeting), **server-side config** (Express BFF, per-deployment), or both.

## Option A: Add a LaunchDarkly flag (client-side, Angular)

Use this path when you need per-user targeting, percentage rollouts, segment-based toggling (e.g. judicial vs solicitors), or dynamic toggling without redeployment.

### 1. Create the flag in LaunchDarkly

1. Open the HMCTS LaunchDarkly project dashboard at `https://app.launchdarkly.com/`.
2. Select an environment (e.g. "Expert UI - AAT"). The environment dropdown is top-left under the LD logo.
3. Create a new flag via **Feature Flags => New +**.
4. Flag key naming convention: kebab-case prefixed with a domain hint (e.g. `mc-my-feature-enabled`, `feature-my-feature`).
5. Choose the flag type:
   - **Boolean** -- simple on/off. Preferred for feature gates.
   - **String** -- multiple named variations (e.g. release versions).
   - **JSON** -- complex structured config. **Discouraged** for new flags; JSON configs proved hard to maintain and are not version-controlled. Prefer static config for structured data.
6. Configure targeting rules per environment. LD supports **segments** (groups of users matched by role) -- user roles are sent to LD during login as part of the LD context.

<!-- CONFLUENCE-ONLY: JSON flag values proved too complex and are being phased out in favour of static config (source: KT session 12 Aug 2025). No code-level enforcement of this preference exists yet. -->

### 2. Understand the LD initialisation flow

The LD SDK is initialised when the user logs in (`app.component.ts:167`). The context passed to LD includes:

```typescript
const featureUser: FeatureUser = {
  key: userInfo.id || userInfo.uid,   // IDAM user ID
  roles: userInfo?.roles,             // all IDAM roles (enables segment targeting)
  orgId: '-1',                        // hardcoded; not used for targeting currently
};
this.featureService.initialize(featureUser, ldClientId);
```

The SDK is configured with `{ useReport: true }`, which sends the user context via POST rather than embedding it in the URL -- a security measure for sensitive role data.

**Error resilience**: If the LD network connection fails (e.g. Zscaler blocking, poor connectivity), the SDK emits `ready` with default values so the app is not blocked. However, all flags will return their coded defaults until connectivity is restored.

<!-- CONFLUENCE-ONLY: DWP Zscaler misconfiguration has historically blocked LaunchDarkly calls affecting thousands of users. Work is planned to further improve failover. -->

### 3. Consume the flag in an Angular component or service

Inject `FeatureToggleService` and call `isEnabled` or `getValue`:

```typescript
import { FeatureToggleService } from '@hmcts/rpx-xui-common-lib';

@Component({ /* ... */ })
export class MyComponent implements OnInit {
  myFeatureEnabled$: Observable<boolean>;

  constructor(private featureToggleService: FeatureToggleService) {}

  ngOnInit(): void {
    this.myFeatureEnabled$ = this.featureToggleService.isEnabled('mc-my-feature-enabled');
  }
}
```

For non-boolean values (e.g. a string variation):

```typescript
this.configValue$ = this.featureToggleService.getValue<string>(
  'mc-my-feature-config',
  'default-value'
);
```

**Key API methods** (from `LaunchDarklyService`):

| Method | Behaviour | Use case |
|--------|-----------|----------|
| `isEnabled(key, default?)` | Returns `Observable<boolean>`, re-emits on LD change events | Components, templates |
| `getValue<T>(key, default)` | Returns `Observable<T>`, re-emits on change. **Always emits the default first** before LD value arrives | Components needing non-boolean values |
| `getValueOnce<T>(key, default)` | Emits only once after LD is ready, does not listen for changes | Guards, one-shot reads |
| `getValueSync<T>(key, default)` | Synchronous read from LD client; requires LD to be ready | Rare; avoid in async contexts |

The `FeatureToggleService` provider is wired in `app.module.ts:114` as `{ provide: FeatureToggleService, useClass: LaunchDarklyService }`.

The `McLaunchDarklyService` in `src/app/shared/services/mc-launch-darkly-service.ts` extends `LaunchDarklyService` with a singleton guard to prevent multiple instances.

### 4. Use structural directives for template-level toggling

Two structural directives are available:

**`*xuilibFeatureToggle`** (from `@hmcts/rpx-xui-common-lib`) -- subscribes to the LD-backed `FeatureToggleService` reactively. The element appears/disappears as the flag value changes in real time:

```html
<div *xuilibFeatureToggle="'mc-my-feature-enabled'">
  Feature content shown when flag is true
</div>
```

**`*exuiFeatureToggle`** (webapp-local, from `src/app/directives/feature-toggle/`) -- reads from `AppConfigService` (BFF config-based flags), evaluated once on init. Does NOT react to LD changes:

```html
<div *exuiFeatureToggle="'myBffFeature'">
  Content shown if BFF config enables this feature
</div>
```

Use `*xuilibFeatureToggle` for LD flags; use `*exuiFeatureToggle` only for BFF config-based flags.

### 5. Gate a lazy-loaded route with FeatureToggleGuard

To prevent navigation to an entire module when a flag is off, add `FeatureToggleGuard` to the route in `src/app/app.routes.ts`:

```typescript
{
  path: 'my-feature',
  canActivate: [AuthGuard, AcceptTermsGuard, FeatureToggleGuard],
  loadChildren: () => import('./my-feature/my-feature.module').then(m => m.MyFeatureModule),
  data: {
    needsFeaturesEnabled: ['mc-my-feature-enabled'],
    featureDisabledRedirect: '/cases'
  }
}
```

The guard uses `getValueOnce` (single emission) to avoid subscription leaks in navigation.

**Inverse guard** -- to show a route only when a flag is **off** (e.g. a legacy route that should disappear when a replacement is enabled), set `expectFeatureEnabled: false`:

```typescript
data: {
  needsFeaturesEnabled: ['mc-new-feature-replaces-legacy'],
  expectFeatureEnabled: false,
  featureDisabledRedirect: '/new-feature'
}
```

Existing examples: `feature-global-search` guards the `search` route (`app.routes.ts:197`), and `feature-refunds` guards `refunds` (`app.routes.ts:207`).

### 6. Use the flag in AppConfig (CCD toolkit integration)

If the flag configures CCD case-ui-toolkit behaviour, subscribe inside `AppConfig` (`src/app/services/ccd-config/ccd-case.config.ts`) after `initialisationSyncService.waitForInitialisation()` resolves:

```typescript
this.featureToggleService.getValue<string>('mc-my-feature-config', '').subscribe(value => {
  this.myFeatureConfig = value;
});
```

**LD initialisation race condition**: CCD toolkit setup may start before LD is ready. `InitialisationSyncService` coordinates this by gating CCD-toolkit configuration behind `waitForInitialisation(callback)`. The callback fires only after `initialisationComplete()` is called in `app.component.ts` (which happens after LD identify succeeds or errors out).

For critical Work Allocation config, `LaunchDarklyDefaultsConstants` provides hardcoded fallback JSON payloads per environment (`launch-darkly-defaults.constants.ts`), ensuring WA routing works even if LD has not responded.

## Option B: Add a BFF config flag (server-side, Express)

Use this path for flags that gate Express middleware or BFF API behaviour and do not need per-user targeting.

### 1. Add the flag to node-config

In `config/default.json`, add a key under the `feature` object:

```json
{
  "feature": {
    "myFeatureEnabled": false
  }
}
```

### 2. Map an environment variable

In `config/custom-environment-variables.json`, map the flag to an env var:

```json
{
  "feature": {
    "myFeatureEnabled": {
      "__name": "FEATURE_MY_FEATURE_ENABLED",
      "__format": "json"
    }
  }
}
```

The `__format: "json"` is required because `node-config` otherwise treats env var values as strings; the env var must be set as `true` or `false` (JSON literal) in the Helm values.

### 3. Add a reference constant

In `api/configuration/references.ts`, add a constant for the short config path (without the `feature.` prefix -- `showFeature` prepends it automatically):

```typescript
export const FEATURE_MY_FEATURE_ENABLED = 'myFeatureEnabled';
```

<!-- DIVERGENCE: Confluence "Launch Darkly Implementation" page (1191576311) implies reference constants include the full dotted path, but rpx-xui-webapp:api/configuration/references.ts:119-136 shows they use only the short name (e.g. 'secureCookieEnabled', 'docsEnabled'). The showFeature() function in api/configuration/index.ts:30 prepends 'feature.' internally. Source wins. -->

### 4. Read the flag in BFF code

Use `showFeature` from `api/configuration/index.ts`:

```typescript
import { showFeature } from '../configuration';
import { FEATURE_MY_FEATURE_ENABLED } from '../configuration/references';

if (showFeature(FEATURE_MY_FEATURE_ENABLED)) {
  // feature-gated logic
}
```

`showFeature(feature)` calls `config.get<boolean>('feature.${feature}')`, resolving the full path. The `config` object is hydrated by `@hmcts/properties-volume` which mounts AKS Key Vault secrets.

### 5. Set the env var in Helm values

Add `FEATURE_MY_FEATURE_ENABLED` to the service's `values.*.template.yaml` (Jenkins pipeline) or `values.yaml` (AKS/Flux) for each target environment.

## Option C: Combine both (LD flag evaluated server-side)

The XUI BFF does **not** use the LaunchDarkly Node SDK. Server-side LD evaluation is not currently supported in `rpx-xui-webapp`. If you need LD targeting on the server, the pattern is:

1. The Angular client evaluates the LD flag.
2. The client passes the feature state as a request parameter or header to the BFF.
3. The BFF acts on the passed value.

Alternatively, use a BFF config flag (Option B) and accept that toggling requires redeployment or env-var change.

## Flag naming conventions

Based on existing flags in the codebase and LD project:

| Prefix | Meaning | Examples |
|--------|---------|----------|
| `mc-` | Manage Cases specific | `mc-work-allocation-active-feature`, `mc-application-themes` |
| `feature-` | Cross-cutting platform feature | `feature-global-search`, `feature-refunds` |
| Domain-specific | Jurisdiction or module scoped | `wa-service-config`, `hearings-enabled` |

Boolean flags should end with `-enabled` or describe what they activate. Avoid putting complex JSON in a flag value -- use static config instead.

## CSP considerations

LaunchDarkly streaming connections require `*.launchdarkly.com` in the CSP `connect-src` directive. This is already configured (`api/interfaces/csp-config.ts:29`). If you add a new third-party feature-flag or analytics domain, update the CSP config accordingly.

## Service message banners (LD JSON flag example)

Service message banners are a notable example of LD JSON flags in production. The flag value is a JSON object containing keyed entries where:
- The **key** stores an index and target roles separated by a pipe (`|`) character
- The **value** stores English and Welsh text separated by `<br><br>`

Banners can be targeted to specific environments via LD variations (Variation 1 = AAT + Prod, Variation 3 = Demo only for testing). Requests for banner changes come via the `#exui-support` Slack channel and must specify: affected roles, English text, Welsh translation, start/end dates.

<!-- CONFLUENCE-ONLY: Service banner start/end date automation is not yet implemented; banners are manually activated/deactivated via LD. Work tracked under EXUI-1079. -->

## Future direction

The XUI team is actively working to reduce reliance on LaunchDarkly due to:
- **Reliability concerns**: LD outages and network-blocking appliances (e.g. Zscaler) have caused production incidents.
- **Cost**: LD has a substantial annual license cost shared across HMCTS.
- **Maintainability**: Complex JSON configs stored in LD are not version-controlled.

The planned migration path:
1. Move most flags to **static config** in code (BFF config flags, Option B).
2. Evaluate **Azure App Configuration** as a runtime-updatable alternative for flags that need dynamic toggling.
3. Retain the `FeatureToggleService` abstraction in common-lib, enabling a backend swap without changing consuming code.

<!-- CONFLUENCE-ONLY: Azure App Configuration evaluation is in progress. Cost estimated at ~$1800/year. Security concern: connection string exposure on client-side requires a Node lib WebSocket/Azure Pub Sub intermediary. -->

## Verify

1. **LD flag (client-side)**: Deploy to AAT. Open browser DevTools Network tab, filter for `clientstream.launchdarkly.com`. Confirm your flag key appears in the LD event stream. Toggle the flag in the LD dashboard and confirm the UI responds without redeployment.

2. **BFF config flag**: SSH into the AAT pod or check the environment variable via `kubectl`. Hit the gated API route and confirm it returns the expected behaviour. Toggle `FEATURE_MY_FEATURE_ENABLED` and restart the pod to verify the change.

3. **Route guard**: Navigate to the guarded path with the flag off -- confirm redirect to `featureDisabledRedirect`. Enable the flag -- confirm the route loads.

4. **LD segment targeting**: To test user-specific targeting, configure an LD segment matching your test user's roles. Verify the flag resolves differently for users in and out of the segment. Test user accounts with pre-configured LD variations are documented in Confluence ("Test users with LaunchDarkly user variation", EUI space).

## Examples

### `LaunchDarklyService.getValue` — reactive observable (always emits default first)

```typescript
// Source: apps/xui/rpx-xui-common-lib/projects/exui-common-lib/src/lib/services/feature-toggle/launch-darkly.service.ts

public getValue<R>(feature: string, defaultValue: R): Observable<R> {
  if (!this.features.hasOwnProperty(feature)) {
    this.features[feature] = new BehaviorSubject<R>(defaultValue);
    this.ready.pipe(
      filter((ready) => ready),
      map(() => this.client.variation(feature, defaultValue))
    ).subscribe((value) => {
      this.features[feature].next(value);
      // re-emits whenever the flag changes in the LD dashboard
      this.client.on(`change:${feature}`, (val: R) => this.features[feature].next(val));
    });
  }
  return this.features[feature].pipe(distinctUntilChanged());
}
```

### `*xuilibFeatureToggle` directive — subscribes reactively

```typescript
// Source: apps/xui/rpx-xui-common-lib/projects/exui-common-lib/src/lib/directives/feature-toggle/feature-toggle.directive.ts

@Directive({ selector: '[xuilibFeatureToggle]', standalone: false })
export class FeatureToggleDirective implements OnDestroy {
  @Input() public set xuilibFeatureToggle(feature: string) {
    this.subscription = this.service.isEnabled(feature).subscribe(enabled => {
      if (enabled) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      } else {
        this.viewContainer.clear();
      }
    });
  }
}
```

### `FeatureToggleGuard.canActivate` — single-emission guard

```typescript
// Source: apps/xui/rpx-xui-common-lib/projects/exui-common-lib/src/lib/services/feature-toggle/feature-toggle.guard.ts

public canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
  return combineLatest([
    ...(route.data.needsFeaturesEnabled as string[]).map(
      feature => this.featureToggleService.getValueOnce<boolean>(feature, true)
    )
  ]).pipe(
    map(statuses => statuses.every(s => s)),
    map(status =>
      (route.data.expectFeatureEnabled !== false && status) ||
      (route.data.expectFeatureEnabled === false && !status) ||
      this.router.parseUrl(route.data.featureDisabledRedirect as string)
    )
  );
}
```

### Production example: `feature-global-search` and `feature-refunds` route guards

```typescript
// Source: apps/xui/rpx-xui-webapp/src/app/app.routes.ts (excerpt)

{
  path: 'search',
  canActivate: [AuthGuard, AcceptTermsGuard, FeatureToggleGuard],
  loadChildren: () => import('../search/search.module').then((m) => m.SearchModule),
  data: {
    needsFeaturesEnabled: ['feature-global-search'],
    featureDisabledRedirect: '/',
  },
},
{
  path: 'refunds',
  canActivate: [AuthGuard, AcceptTermsGuard, FeatureToggleGuard],
  loadChildren: () => import('../refunds/refunds.module').then((m) => m.RefundsModule),
  data: {
    needsFeaturesEnabled: ['feature-refunds'],
    featureDisabledRedirect: '/',
  },
},
```

### `FeatureToggleService` provider registration

```typescript
// Source: apps/xui/rpx-xui-webapp/src/app/app.module.ts (excerpt)

providers: [
  // LaunchDarklyService is the concrete implementation; swap here to replace LD
  { provide: FeatureToggleService, useClass: LaunchDarklyService },
  // ...
]
```

## See also

- [Explanation: Feature Flags](../explanation/feature-flags.md) — how the two-tier flag system works, LaunchDarkly bootstrap flow, and the future LD deprecation plan
- [Reference: Config Schema](../reference/config-schema.md) — complete BFF feature flag reference, env-var format requirements, and LD flag catalogue
- [Reference: Shared Libraries](../reference/shared-libraries.md) — `LaunchDarklyService`, `FeatureToggleGuard`, and `*xuilibFeatureToggle` API reference
- [How-to: Configure for New Service](configure-for-new-service.md) — adding Work Allocation LD flags and `serviceRefDataMapping` when onboarding a new jurisdiction
- [Glossary](../reference/glossary.md) — definitions of LaunchDarkly, `FeatureToggleService`, `FeatureUser`, `FeatureToggleGuard`, and `*xuilibFeatureToggle`
