---
title: Downstream Services
topic: architecture
diataxis: reference
product: xui
audience: both
sources:
  - rpx-xui-webapp:config/default.json
  - rpx-xui-webapp:api/proxy.config.ts
  - rpx-xui-webapp:api/configuration/references.ts
  - rpx-xui-webapp:api/routes.ts
  - rpx-xui-webapp:api/application.ts
  - rpx-xui-webapp:api/lib/middleware/proxy.ts
  - rpx-xui-webapp:api/lib/proxy.ts
  - rpx-xui-webapp:api/lib/http/index.ts
  - rpx-xui-webapp:api/workAllocation/routes.ts
  - rpx-xui-manage-organisations:config/default.json
  - rpx-xui-manage-organisations:api/configuration/references.ts
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1933986267"
    title: "Proxy Configuration on Manage Case"
    last_modified: "2025-01-01T00:00:00Z"
    space: "EXUI"
  - id: "1933867411"
    title: "RPX XUI Webapp Node API Quality Review and Recommendations"
    last_modified: "2025-01-01T00:00:00Z"
    space: "EXUI"
  - id: "1460554771"
    title: "Services"
    last_modified: "2020-11-02T00:00:00Z"
    space: "EUI"
  - id: "1515362177"
    title: "Expert UI - Low Level Design - Hearings Management"
    last_modified: "2023-02-01T00:00:00Z"
    space: "EUI"
  - id: "1444741232"
    title: "Notice of Change - Case Access API Specification"
    last_modified: "2021-01-01T00:00:00Z"
    space: "EUI"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- XUI apps (Manage Cases and Manage Organisations) connect to 30+ downstream HMCTS platform services via their Express BFF layer.
- Each downstream is identified by a `node-config` key (overridden by env var in Helm) and accessed with server-generated `Authorization` + `ServiceAuthorization` headers.
- The BFF uses two routing patterns: **prefix-based proxy** (http-proxy-middleware subtree forwarding) and **Express router handlers** (local controllers that make Axios calls).
- Manage Cases (`rpx-xui-webapp`) has the broadest footprint: CCD, Work Allocation, Hearings, Access Management, Evidence Management, Reference Data, Payments, and CDAM.
- Manage Organisations (`rpx-xui-manage-organisations`) is narrower: Reference Data (Professional), AAC case-sharing, Payments, and AM role-assignment queries.
- Proxy routes forward requests transparently; Express-router routes (Work Allocation, Hearings, NOC, Global Search, Access Management) use server-side Axios calls with custom orchestration logic.

## Routing architecture

The BFF exposes two distinct patterns for downstream communication (`rpx-xui-webapp:api/proxy.config.ts`, `rpx-xui-webapp:api/application.ts`):

### Prefix-based proxy routes

Implemented via `applyProxy()` using `http-proxy-middleware`. These mount on a URL prefix and forward all matching requests (any path suffix, any HTTP method) to the configured downstream target. Authentication middleware runs first and attaches server-generated auth headers.

**Security note:** The proxy configuration is permissive by design — it relies on downstream services for endpoint-level enforcement. An authenticated user can technically reach any endpoint on the proxied backend by manipulating the path suffix. Non-GET methods are also forwarded unless blocked downstream.
<!-- CONFLUENCE-ONLY: not verified in source -->

| Proxy source | Downstream target | Risk level |
|---|---|---|
| `/data/**`, `/print/**` | CCD Component API | High (broad subtree) |
| `/activity/**`, `/aggregated/**` | CCD Component API | High (broad subtree) |
| `/documents/*` | DM Store | High |
| `/documentsv2/*` | Case Document AM API | High |
| `/payments/*` | Payments API | High |
| `/icp/*`, `/icp/sessions` | ICP (WebSockets) | High |
| `/hearing-recordings` | EM HRS API | Medium |
| `/em-anno` | EM Annotation API | Medium |
| `/doc-assembly` | EM Doc Assembly API | Medium |
| `/api/markups`, `/api/redaction` | EM Markup/NPA | Medium |
| `/api/refund` | Refunds API | Medium |
| `/api/notification` | Notifications API | Medium |
| `/api/translation` | Translation API | Medium |
| `/refdata/location` | RD Location Ref API | Medium |
| `/refdata/commondata/lov/categories/CaseLinkingReasonCode` | RD Commondata API | Medium |
| `/refdata/commondata/caseflags/service-id=:sid` | RD Commondata API | Medium |
| `/categoriesAndDocuments`, `/documentData/caseref`, `/getLinkedCases` | CCD Data Store API | Medium |
| `/api/addresses` | CCD Component API (rewritten to `/addresses`) | Low |
| `/data/internal/searchCases` | CCD Component API (with custom request/response handlers) | Medium |

### Express router routes (not proxied)

These routes are handled locally by Express controllers that make targeted Axios calls. They are **not** subject to path-pivoting risk — unknown subpaths return the SPA index.html (HTML 200).

| Route prefix | Module | Downstream targets |
|---|---|---|
| `/workallocation` | `api/workAllocation/` | WA Task Management, RD APIs |
| `/hearings` | `api/hearings/` | HMC Hearings, jurisdiction service APIs |
| `/noc` | `api/noc/` | AAC Case Assignment |
| `/caseshare` | `api/caseshare/` | AAC Case Assignment |
| `/am`, `/role-access` | `api/accessManagement/`, `api/roleAccess/` | AM Role Assignment |
| `/globalSearch` | `api/globalSearch/` | CCD Data Store (`/globalSearch` endpoint) |
| `/specific-access-request` | `api/specificAccessOrchastrator/` | AM Role Assignment, WA Task Management |
| `/challenged-access-request` | `api/challengedAccess/` | LAU Case Backend, AM Role Assignment |
| `/locations` | `api/locations/` | RD Location API |
| `/ref-data` | `api/ref-data/` | RD Commondata |
| `/prd` | `api/prd/` | RD Professional |
| `/organisation` | `api/organisations/` | RD Professional |
| `/staff-ref-data` | `api/staff-ref-data/` | RD Caseworker |
| `/staff-supported-jurisdiction` | `api/staffSupportedJurisdictions/` | Config-driven |
| `/wa-supported-jurisdiction` | `api/waSupportedJurisdictions/` | Config-driven |
| `/user` | `api/user/` | IDAM API |

**Known issue:** The API root router (`api/routes.ts`) has duplicate route mounts: `/am` is mounted twice (lines 50, 54), `/role-access` twice (lines 52, 56), and `/locations` twice (lines 58, 67). This can cause duplicate middleware execution.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Manage Cases (rpx-xui-webapp)

### Core Case Data

| Service | Config key (env var) | Purpose |
|---|---|---|
| CCD API Gateway | `services.ccd.componentApi` (`SERVICES_CCD_COMPONENT_API_PATH`) | Browser-facing CCD proxy: case events, case lists, activity, address lookup, aggregated data |
| CCD Data Store | `services.ccd.dataApi` (`SERVICES_CCD_DATA_STORE_API_PATH`) | Server-side direct calls: linked cases, categories/documents, document data, global search |
| AAC Case Assignment | `services.ccd.caseAssignmentApi` (`SERVICES_CCD_CASE_ASSIGNMENT_API_PATH`) | Notice of Change, case-assignment flows |

### Access Management

| Service | Config key (env var) | Purpose |
|---|---|---|
| AM Role Assignment | `services.role_assignment.roleApi` (`SERVICES_ROLE_ASSIGNMENT_API_PATH`) | Role-assignment queries for user details, case-level RBAC |
| AM Org Role Mapping | `services.role_assignment.roleMappingApi` (`SERVICES_ROLE_ASSIGNMENT_MAPPING_API_PATH`) | Organisational role mapping lookups |
| AM Judicial Booking | `services.judicialBookingApi` (`SERVICES_JUDICIAL_BOOKING_API_PATH`) | Judicial booking queries |

### Work Allocation

| Service | Config key (env var) | Purpose |
|---|---|---|
| WA Task Management | `services.work_allocation.taskApi` (`SERVICES_WORK_ALLOCATION_TASK_API_PATH`) | Task list, task actions, task completion |
| WA Workflow | `services.waWorkflowApi` (`SERVICES_WA_WORKFLOW_API_URL`) | Workflow state queries |

Work Allocation routes are handled locally by Express routing (`api/workAllocation/routes.ts`), not via prefix-based proxying. The controller makes Axios calls to the downstream WA Task Management API.

**Supported WA jurisdictions** are configured via `waSupportedJurisdictions` (default: `IA,CIVIL,PRIVATELAW,PUBLICLAW,EMPLOYMENT,ST_CIC`).

### Hearings (HMC)

| Service | Config key (env var) | Purpose |
|---|---|---|
| HMC Hearings | `services.hearings.hmcApi` (`SERVICES_HMC_HEARINGS_COMPONENT_API`) | Central hearing service integration |
| SSCS Hearings | `services.hearings.sscs.serviceApi` | SSCS jurisdiction hearing API (`sscs-tribunals-api`) |
| PRIVATELAW Hearings | `services.hearings.privatelaw.serviceApi` | Private Law jurisdiction hearing API (`fis-hmc-api`) |
| CIVIL Hearings | `services.hearings.civil.serviceApi` | Civil jurisdiction hearing API (`civil-service`) |
| IA Hearings | `services.hearings.ia.serviceApi` | Immigration & Asylum hearing API (`ia-hearings-api`) |
| Employment Hearings | `services.hearings.employment.serviceApi` | Employment jurisdiction hearing API (`et-hearings-api`) |

Hearing jurisdiction activation is controlled by `services.hearings.hearingsJurisdictions` (default: `SSCS,PRIVATELAW,CIVIL,IA`). Employment is configured but **not** in the default activation list. When `services.hearings.enableHearingDataSourceHeaders` is `true`, the BFF forwards `Data-Store-Url`, `Role-Assignment-Url`, and `hmctsDeploymentId` headers to hearing APIs (`rpx-xui-webapp:api/lib/proxy.ts:49-57`).

Each hearing-enabled jurisdiction must implement two endpoints consumed by ExUI:
- `POST /serviceHearingValues` — returns case/party/hearing data in a standard `ServiceHearingValuesModel` JSON shape
- `POST /serviceLinkedCases` — returns linked cases for hearing-linking operations

The `ServiceHearingValuesModel` includes: `hmctsServiceID`, `hmctsInternalCaseName`, `publicCaseName`, `caseCategories`, `autoListFlag`, `hearingType`, `duration`, `parties`, `caseFlags`, `screenFlow`, `hearingChannels`, and more. The `screenFlow` property controls which pages appear in the hearing request wizard (services can omit screens or add conditional navigation).
<!-- CONFLUENCE-ONLY: not verified in source -->

Each jurisdiction also specifies `caseTypes` in config — used to match which service API to call for a given case:
- SSCS: `Benefit`
- PRIVATELAW: `PRLAPPS`
- CIVIL: `CIVIL`
- IA: `Asylum,Bail`
- Employment: `ET_EnglandWales,ET_Scotland,ET_EnglandWales_Multiple,ET_Scotland_Multiple`

### Documents & Evidence Management

| Service | Config key (env var) | Proxy path | Purpose |
|---|---|---|---|
| CDAM (v2) | `services.documentsv2.api` (`SERVICES_DOCUMENTS_API_PATH_V2`) | `/documentsv2` | Case document upload/download (rewritten to `/cases/documents`) |
| DM Store (v1) | `services.documents.api` (`SERVICES_DOCUMENTS_API_PATH`) | `/documents` | Legacy document access |
| EM HRS | `services.em_hrs_api` (`SERVICES_EM_HRS_API_PATH`) | `/hearing-recordings` | Hearing recordings |
| EM Annotation | `services.em_anno_api` (`SERVICES_EM_ANNO_API_URL`) | `/em-anno` | Document annotations (rewritten to `/api/*`) |
| EM Doc Assembly | `services.em_docassembly_api` (`SERVICES_EM_DOCASSEMBLY_API_URL`) | `/doc-assembly` | Document generation/assembly (rewritten to `/api/*`) |
| EM Markup/NPA | `services.markup_api` (`SERVICES_MARKUP_API_URL`) | `/api/markups`, `/api/redaction` | Redaction and markup |
| EM ICP | `services.icp_api` (`SERVICES_ICP_API_URL`) | `/icp` | In-court presentation; WebSocket proxy (`ws:true`) |

### Reference Data

| Service | Config key (env var) | Purpose |
|---|---|---|
| RD Professional | `services.prd.api` (`SERVICES_PRD_API_URL`) | Organisation and solicitor reference data |
| RD Location Ref (proxy) | `services.locationref.api` (`SERVICES_LOCATION_REF_API_URL`) | Court/location lookup via `/refdata/location` proxy |
| RD Location Ref (direct) | `services.prd.locationApi` (`SERVICES_PRD_LOCATION_API`) | Location API for non-proxy routes |
| RD Judicial | `services.prd.judicialApi` (`SERVICES_PRD_JUDICIAL_API`) | Judicial user reference data |
| RD Commondata | `services.prd.commondataApi` (`SERVICES_PRD_COMMONDATA_API`) | Case flags, case-linking reason codes via `/refdata/commondata` proxy |
| RD Caseworker | `services.case.caseworkerApi` (`SERVICES_CASE_CASEWORKER_REF_PATH`) | Caseworker reference data |
| RD Judicialworker | `services.case.judicialworkerApi` (`SERVICES_CASE_JUDICIALWORKER_REF_PATH`) | Judicial-worker reference data |

### Payments & Fees

| Service | Config key (env var) | Proxy path | Purpose |
|---|---|---|---|
| Payments | `services.payments` (`SERVICES_PAYMENTS_URL`) | `/payments` | Fee/payment flows |
| Refunds | `services.refunds` (`SERVICES_REFUNDS_API_URL`) | `/api/refund` | Refund requests (rewritten to `/refund/*`) |
| Notifications | `services.notifications` (`SERVICES_NOTIFICATIONS_API_URL`) | `/api/notification` | Payment notification service (rewritten to `/notifications/*`) |

### Other Services

| Service | Config key (env var) | Purpose |
|---|---|---|
| Translation | `services.translation` (`SERVICES_TRANSLATION_API_URL`) | Welsh translation via `/api/translation` proxy (rewritten to `/translation/*`) |
| LAU (Challenged Access) | `services.lau.specificChallengedAccessApi` (`SERVICES_LAU_SPECIFIC_CHALLENGED_ACCESS_API_PATH`) | Log and Audit challenged-access records |
| Global Search | `services.ccd.dataApi` (same as CCD Data Store) | Cross-jurisdiction case search via CCD Data Store `/globalSearch` endpoint |

**Global Search supported services:** configured via `globalSearchServices` (default: `IA,CIVIL,PRIVATELAW,PUBLICLAW,EMPLOYMENT,ST_CIC`).

### Authentication & Infrastructure

| Service | Config key (env var) | Purpose |
|---|---|---|
| IDAM API | `services.idam.idamApiUrl` (`SERVICES_IDAM_API_URL`) | User identity; token validation |
| IDAM Login (web) | `services.idam.idamLoginUrl` (`SERVICES_IDAM_LOGIN_URL`) | OIDC login redirect |
| S2S Provider | `services.s2s` (`SERVICE_S2S_PATH`) | Service-to-service token lease |

IDAM client ID: `xuiwebapp`. S2S microservice name: `xui_webapp` (`rpx-xui-webapp:config/default.json:116`).

## Manage Organisations (rpx-xui-manage-organisations)

| Service | Config key (env var) | Purpose |
|---|---|---|
| RD Professional | `services.rdProfessionalApi` (`SERVICES_RD_PROFESSIONAL_API_URL`) | Org details, user invite/suspend/edit, PBA management |
| AAC Case Assignment | `services.caseAssignmentApi` (`SERVICES_MCA_PROXY_API_PATH`) | Case-sharing (assign/unassign), org-based case search via ES |
| AM Role Assignment | `services.role_assignment.roleApi` (`SERVICES_ROLE_ASSIGNMENT_API_PATH`) | Assignee-name filter in CAA case search |
| Payment API | `services.feeAndPayApi` (`SERVICES_FEE_AND_PAY_API_PATH`) | PBA transaction history, fee account details |
| RD Commondata | `services.prd.commondataApi` (`SERVICES_PRD_COMMONDATA_API`) | LOV reference data for registration wizard |
| CCD API Gateway | `services.ccd.componentApi` (`SERVICES_CCD_COMPONENT_API_PATH`) | Postcode/address lookup only |
| IDAM API | `services.idamApi` | User identity |
| IDAM Login (web) | `services.idamWeb` | OIDC login redirect |
| S2S Provider | `services.s2s` (`SERVICE_S2S_PATH`) | Service-to-service token lease |

IDAM client ID: `xuimowebapp`. S2S microservice name: `xui_webapp` (`rpx-xui-manage-organisations:config/default.json:22`).

## Header forwarding

All authenticated BFF-to-downstream calls attach the following headers:

### Proxy middleware headers (`rpx-xui-webapp:api/lib/middleware/proxy.ts`)

The proxy middleware (`applyProxy`) uses `authInterceptor` which attaches server-generated `Authorization` (IDAM Bearer) and `ServiceAuthorization` (S2S) headers before forwarding. Client-supplied auth headers are **not stripped** — they get overwritten by the middleware-generated values for proxy routes.

### Legacy proxy helper headers (`rpx-xui-webapp:api/lib/proxy.ts`)

The legacy Axios-based helper (used by some router handlers) forwards:

| Header | Source | Notes |
|---|---|---|
| `Authorization` | Inbound request header | Forwarded if present |
| `ServiceAuthorization` | Inbound request header | Forwarded if present |
| `user-roles` | Inbound request header | Forwarded if present and non-empty |
| `Data-Store-Url` | Inbound request header | Hearing routes only, gated by `enableHearingDataSourceHeaders` |
| `Role-Assignment-Url` | Inbound request header | Hearing routes only |
| `hmctsDeploymentId` | Inbound `Hmcts-Deployment-Id` header | Hearing routes only |

### Preview environment header (`rpx-xui-webapp:api/lib/http/index.ts`)

When `PREVIEW_DEPLOYMENT_ID` env var is set, **all** Axios calls (via the shared `http` instance) include:

| Header | Source | Notes |
|---|---|---|
| `hmcts-deployment-id` | `PREVIEW_DEPLOYMENT_ID` env var | Applied globally on `axios.defaults.headers.common` |

## Notice of Change integration

The BFF's `/noc` routes (`api/noc/index.ts`) call the AAC Case Assignment service for three operations:
<!-- CONFLUENCE-ONLY: not verified in source -->

1. **Get NocQuestions** — input: `caseReference`; returns `[{questionId, label, type}]`
2. **ValidateNoCQuestion** — input: `caseReference`, `answers: [{questionId, answer}]`; returns matched events with `actionDescription`
3. **Put NocEvent** — input: `caseReference`, `answers`, optional `requestReason` (<=1024 chars), `actionDescription`; returns `resultType: AUTO_APPROVED | MANUAL_APPROVAL | AUTO_REJECTED`

Error responses include: "Not a valid case reference", "NoC in progress", "You already have access to the case", "Answers match more than one party on the case", "Another NoC request has been actioned" (race condition handling).

## Known configuration quirks

- `services.prd.judicialApi` defaults to an **AAT** URL (`rd-judicial-api-aat`) in `rpx-xui-webapp:config/default.json:69` — overridden by Helm in production.
- `services.prd.commondataApi` defaults to an **AAT** URL (`rd-commondata-api-aat`) in `rpx-xui-webapp:config/default.json:70`.
- `services.prd.locationApi` defaults to a **demo** URL (`rd-location-ref-api-demo`) in `rpx-xui-webapp:config/default.json:68`. A separate `services.locationref.api` (pointing to prod) is used for the proxy route.
- Manage Organisations references `ccd-data-store-api` in config (`services.ccdDataApi`) but does not call it directly — all CCD-related queries route through the AAC proxy path.
- `services.hearings.employment.serviceApi` is configured but Employment is **not** in the default `hearingsJurisdictions` activation list (`SSCS,PRIVATELAW,CIVIL,IA`).
- The API root router has duplicate route mounts (`/am`, `/role-access`, `/locations` each mounted twice) which can cause duplicate middleware execution in certain edge cases.
- Work Allocation routes use `router.use` for action-specific endpoints instead of explicit HTTP method handlers (`get`/`post`/`put`/`delete`), allowing unintended methods to reach handlers.

## See also

- [Architecture](../explanation/architecture.md) — proxy routing diagram, dual proxy pattern (transparent vs Axios), and security model
- [BFF Pattern](../explanation/bff-pattern.md) — how `applyProxy` and the Express router routes work in detail
- [How-to: Configure for New Service](../how-to/configure-for-new-service.md) — adding a new entry to this catalogue
- [Reference: Config Schema](config-schema.md) — env-var overrides, service URL keys, and feature flags for all services listed here
- [Glossary](glossary.md) — definitions of CDAM, WA, BFF, S2S, and subtree proxy
