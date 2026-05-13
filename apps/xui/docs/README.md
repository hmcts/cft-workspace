# XUI (Expert UI) documentation

Expert UI (ExUI, publicly branded as **MyHMCTS**) is the HMCTS caseworker and legal-professional front-end platform. It delivers three deployed web applications — Manage Cases (`rpx-xui-webapp`), Manage Organisations (`rpx-xui-manage-organisations`), and Approve Organisation (`rpx-xui-approve-org`) — plus a set of shared Angular and Node libraries. XUI does not own CCD case data; it is a UI platform that renders CCD definitions, orchestrates cross-platform flows, and proxies browser requests to CCD and the surrounding platform services.

This `docs/` tree covers the XUI front-end architecture, its BFF (Backend-for-Frontend) pattern, shared libraries, feature flag system, session management, Welsh translation, and the `ccd-case-ui-toolkit` Angular component library. Pages follow the [Diátaxis](https://diataxis.fr/) framework: explanation, how-to guides, and reference. Workspace-wide and platform topics live in the root [`docs/`](../../../docs/) tree.

## Reading order

For someone new to XUI:

1. [Overview](explanation/overview.md) — the three apps, their user populations, and how XUI relates to CCD
2. [Architecture](explanation/architecture.md) — the dual-layer SPA + BFF pattern, IDAM OIDC auth flow, Redis sessions, and deployment on AKS
3. [BFF Pattern](explanation/bff-pattern.md) — Express middleware ordering, proxy configuration, auth injection, and the dual proxy abstraction
4. [Session Management](explanation/session-management.md) — OIDC lifecycle, S2S tokens, role-based timeouts, and client-side idle detection
5. [Feature Flags](explanation/feature-flags.md) — how LaunchDarkly and BFF config flags work together

## By topic

### Core concepts

- [Overview](explanation/overview.md) — what XUI is, the three apps, user types, and service onboarding
- [Architecture](explanation/architecture.md) — dual-layer pattern, auth, sessions, proxy routing, and AKS deployment
- [BFF Pattern](explanation/bff-pattern.md) — Express app bootstrap, proxy configuration, auth middleware, and error handling

### Authentication and session

- [Session Management](explanation/session-management.md) — OIDC login, Redis session store, role-based timeouts, keepalive, and CSRF
- [BFF Pattern](explanation/bff-pattern.md) — S2S token exchange, `authInterceptor`, and how `@hmcts/rpx-xui-node-lib` integrates

### Feature flags

- [Feature Flags](explanation/feature-flags.md) — two-tier flag system, LaunchDarkly bootstrap, service messages, and LD deprecation plan
- [How-to: Add a Feature Flag](how-to/add-feature-flag.md) — adding LaunchDarkly or BFF config flags step by step

### CCD rendering and the toolkit

- [Case UI Toolkit](explanation/case-ui-toolkit.md) — wizard, field-type palette, ComponentLauncher, conditional show, and publishing
- [How-to: Add a Component](how-to/add-a-component.md) — creating a new field renderer or ComponentLauncher component

### Welsh translation

- [Translation](explanation/translation.md) — `rpxTranslate` pipe, IndexedDB caching, batch HTTP, and language cookie
- [Reference: Shared Libraries](reference/shared-libraries.md) — `rpx-xui-translation` public API and versioning

### Shared libraries

- [Reference: Shared Libraries](reference/shared-libraries.md) — `@hmcts/rpx-xui-common-lib`, `@hmcts/rpx-xui-node-lib`, and `rpx-xui-translation`

## How-to recipes

- [Set up local development](how-to/local-development.md) — install, fetch Key Vault secrets, start BFF + Angular dev server, troubleshoot
- [Add a feature flag](how-to/add-feature-flag.md) — LaunchDarkly (Option A), BFF config flag (Option B), route guard wiring
- [Configure for a new service](how-to/configure-for-new-service.md) — add a downstream proxy, jurisdiction lists, Work Allocation flags, and Manage Organisation roles
- [Add a component to the toolkit](how-to/add-a-component.md) — create, register in `PaletteService`, export, test, and publish

## Reference

- [Downstream Services](reference/downstream-services.md) — complete catalogue of all services Manage Cases and Manage Organisations connect to, grouped by domain
- [Config Schema](reference/config-schema.md) — every `config/default.json` key, feature flag env var, session setting, and Key Vault secret path
- [Shared Libraries](reference/shared-libraries.md) — npm packages, versions, public APIs, event system, and release workflow for `rpx-xui-common-lib`, `rpx-xui-node-lib`, and `rpx-xui-translation`
- [Glossary](reference/glossary.md) — alphabetised definitions of XUI-specific terms: BFF, CDAM, `ComponentLauncher`, `FeatureToggleService`, LaunchDarkly, `PaletteService`, S2S, SRT, `XuiNode`, and more
