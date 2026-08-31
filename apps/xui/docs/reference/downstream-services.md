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
  - rpx-xui-webapp:api/hearings/services.index.ts
  - rpx-xui-webapp:api/hearings/models/serviceHearingValues.model.ts
  - rpx-xui-webapp:api/noc/index.ts
  - rpx-xui-webapp:api/noc/models/noCQuestion.interface.ts
  - rpx-xui-webapp:api/noc/errorCodeConverter.ts
  - rpx-xui-webapp:src/noc/store/effects/noc.effects.ts
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/payload/RequestNoticeOfChangeResponse.java
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
sources_sha:
  "rpx-xui-webapp:config/default.json": "1fd121d96abdb6316b6d7bf7b918842b20e976db"
  "rpx-xui-webapp:api/proxy.config.ts": "92150834ffc7287a621486b07398fe147fbadad3"
  "rpx-xui-webapp:api/configuration/references.ts": "69fa77d263137c54c33a0bddfd86586ba585e63c"
  "rpx-xui-webapp:api/routes.ts": "8577c8c217f3e58ec34ce4efde89c468268befb7"
  "rpx-xui-webapp:api/application.ts": "69fa77d263137c54c33a0bddfd86586ba585e63c"
  "rpx-xui-webapp:api/lib/middleware/proxy.ts": "1bb90ae55466b4ca3bf2b1df1b0ac19b6fa8cd20"
  "rpx-xui-webapp:api/lib/proxy.ts": "ff76662ca439152d588ee2ff0e17025be3413fc7"
  "rpx-xui-webapp:api/lib/http/index.ts": "55079aab2a3d290fb54432007a9ee7c73183e447"
  "rpx-xui-webapp:api/workAllocation/routes.ts": "a8162ca6dc81cd9756fb4e18bfb33ce02a6101ed"
  "rpx-xui-webapp:api/hearings/services.index.ts": "e4f7e5a99239c9a585927332382aa87dae93b797"
  "rpx-xui-webapp:api/hearings/models/serviceHearingValues.model.ts": "e4f7e5a99239c9a585927332382aa87dae93b797"
  "rpx-xui-webapp:api/noc/index.ts": "28b9601a35fef875ae46fced731f4ce7fa73c143"
  "rpx-xui-webapp:api/noc/models/noCQuestion.interface.ts": "0cc0e9a4686b861db394bcc009c4b6681b24badd"
  "rpx-xui-webapp:api/noc/errorCodeConverter.ts": "0cc0e9a4686b861db394bcc009c4b6681b24badd"
  "rpx-xui-webapp:src/noc/store/effects/noc.effects.ts": "0cc0e9a4686b861db394bcc009c4b6681b24badd"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/payload/RequestNoticeOfChangeResponse.java": "dfa7debe58dc4710124070b6a29448dfda6fce67"
  "rpx-xui-manage-organisations:config/default.json": "557a94237a5771d5e780f70b137a5c0184a5bbd6"
  "rpx-xui-manage-organisations:api/configuration/references.ts": "60a1f791b7e62dafaf70493b60f2d548dbc6a417"
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

**Security note:** `applyProxy` finishes with `app.use(config.source, [authInterceptor, ...config.middlewares], proxyMiddleware)` (`rpx-xui-webapp:api/lib/middleware/proxy.ts:119-120`). That is a bare prefix mount: no HTTP-method restriction and no per-path allowlist. The only narrowing available is `http-proxy-middleware`'s `pathFilter`, wired to the optional `filter` config key (`rpx-xui-webapp:api/lib/middleware/proxy.ts:84`), and exactly one route sets it — the `/print` + `/data` proxy excludes `/data/internal/searchCases` so the search-specific proxy mounted before it keeps that path (`rpx-xui-webapp:api/proxy.config.ts:77`). Consequently any authenticated session can reach any path under a proxied prefix with any method, and endpoint-level authorisation is entirely the downstream service's responsibility.

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

**Known issue:** The API root router mounts `/locations` twice — `router.use('/locations', locationsRouter)` appears at both `rpx-xui-webapp:api/routes.ts:54` and `rpx-xui-webapp:api/routes.ts:63`. Express keeps both, so the second mount is dead: every `/locations` request is answered by the first, and any middleware added to the second is never reached.
<!-- DIVERGENCE: Confluence "RPX XUI Webapp Node API Quality Review and Recommendations" lists three duplicated mounts — `/am` (lines 50, 54), `/role-access` (52, 56) and `/locations` (58, 67). Source has `/am` and `/role-access` mounted once each (api/routes.ts:50, :52); only `/locations` is duplicated, at :54 and :63. Source wins. -->

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

Each hearing-enabled jurisdiction must implement two endpoints, both reached by `POST` against the jurisdiction's configured `serviceApi` base (`rpx-xui-webapp:api/hearings/services.index.ts:25`, `:74`):
- `POST /serviceHearingValues` — returns case/party/hearing data in the `ServiceHearingValuesModel` JSON shape
- `POST /serviceLinkedCases` — returns linked cases for hearing-linking operations

`ServiceHearingValuesModel` declares `caseId`, `hmctsServiceID`, `hmctsInternalCaseName`, `publicCaseName`, `caseAdditionalSecurityFlag`, `caseCategories`, `caseDeepLink`, `caserestrictedFlag`, `externalCaseReference`, `caseManagementLocationCode`, `caseSLAStartDate`, `autoListFlag`, `hearingType`, `hearingWindow`, `duration`, `hearingPriorityType`, `numberOfPhysicalAttendees`, `hearingInWelshFlag`, `hearingLocations`, `facilitiesRequired`, `listingComments`, `hearingRequester`, `privateHearingRequiredFlag`, `caseInterpreterRequiredFlag`, `panelRequirements`, `leadJudgeContractType`, `judiciary`, `hearingIsLinkedFlag`, `parties`, `caseFlags`, `screenFlow`, `vocabulary`, `hearingChannels` and `hearingLevelParticipantAttendance` (`rpx-xui-webapp:api/hearings/models/serviceHearingValues.model.ts:11-49`).

`screenFlow` controls which pages appear in the hearing request wizard. A jurisdiction can omit it: the BFF substitutes ExUI's `DEFAULT_SCREEN_FLOW` when the response has no `screenFlow`, so a service that ships a malformed or empty `screenFlow` array gets that array rather than the default (`rpx-xui-webapp:api/hearings/services.index.ts:32-37`).

Two other server-side fixups apply to every `serviceHearingValues` response. `caseId` is overwritten with the `caseReference` from the request body, so whatever the jurisdiction returns in that field is discarded. Party flags are normalised: services disagree on the casing of the party identifier, so `partyID` is copied into `partyId` when present (`rpx-xui-webapp:api/hearings/services.index.ts:46-65`).

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

The BFF's `/noc` routes drive three operations (`rpx-xui-webapp:api/noc/index.ts`):

1. **Get NoC questions** — `GET {base}/noc/noc-questions?case_id=<id>`, the case ID taken from the `caseId` query string. Returns `{questions: [...]}` where each question carries `case_type_id`, `order`, `question_text`, `answer_field_type`, `display_context_parameter`, `challenge_question_id`, `answer_field` and `question_id` (`rpx-xui-webapp:api/noc/models/noCQuestion.interface.ts`).
2. **Verify answers** — `POST {base}/noc/verify-noc-answers` with the browser's body forwarded unchanged.
3. **Submit the request** — `POST {base}/noc/noc-requests`, again forwarding the body. The response's `approval_status` is the only field the SPA reads: `PENDING` routes to the "pending" success page and anything else to the "approved" one (`rpx-xui-webapp:src/noc/store/effects/noc.effects.ts:66-71`). AAC's enum is `PENDING | APPROVED | REJECTED` (`aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/payload/RequestNoticeOfChangeResponse.java`).

`{base}` is not always AAC. Step 1 always goes to `services.ccd.caseAssignmentApi`, and the `case_type_id` from the first question is cached in the Express session under `nocCaseTypesByCaseId`. Steps 2 and 3 then look that case type up in `decentralisedCaseTypeConfig`, matching the longest configured prefix case-insensitively, and use its `nocBaseUrl` if one is set — so a decentralised case type takes verification and submission away from AAC while question-fetching stays behind (`rpx-xui-webapp:api/noc/index.ts:63-121`). The lookup depends on the session entry, so a submission that arrives without the preceding question fetch on the same session falls back to AAC regardless of configuration.

Errors come back from the downstream as free-text messages, and the BFF derives a stable code from the message before passing it on — `case-not-found`, `case-id-invalid`, `noc-in-progress`, `answers-not-identify-litigant`, `answers-not-matched-any-litigant`, `multiple-noc-requests-on-case`, `multiple-noc-requests-on-user`, `has-represented`, `no-org-policy`, `insufficient-privileges` and others, defaulting to `generic-error` (`rpx-xui-webapp:api/noc/errorCodeConverter.ts`). Because the mapping is substring matching on the message text, a wording change downstream silently degrades every affected error to `generic-error`.
<!-- DIVERGENCE: Confluence "Notice of Change - Case Access API Specification" describes the operations as taking a `caseReference` input, returning questions shaped `{questionId, label, type}`, accepting an optional `requestReason` capped at 1024 characters plus an `actionDescription`, and returning `resultType: AUTO_APPROVED | MANUAL_APPROVAL | AUTO_REJECTED`. Source uses `case_id`, the `NoCQuestion` shape above, no `requestReason`/`actionDescription` handling in the BFF, and `approval_status: PENDING | APPROVED | REJECTED`. Source wins. -->

## Known configuration quirks

- `services.prd.judicialApi` defaults to an **AAT** URL (`rd-judicial-api-aat`) in `rpx-xui-webapp:config/default.json:69` — overridden by Helm in production.
- `services.prd.commondataApi` defaults to an **AAT** URL (`rd-commondata-api-aat`) in `rpx-xui-webapp:config/default.json:70`.
- `services.prd.locationApi` defaults to a **demo** URL (`rd-location-ref-api-demo`) in `rpx-xui-webapp:config/default.json:68`. A separate `services.locationref.api` (pointing to prod) is used for the proxy route.
- Manage Organisations references `ccd-data-store-api` in config (`services.ccdDataApi`) but does not call it directly — all CCD-related queries route through the AAC proxy path.
- `services.hearings.employment.serviceApi` is configured but Employment is **not** in the default `hearingsJurisdictions` activation list (`SSCS,PRIVATELAW,CIVIL,IA`).
- The API root router mounts `/locations` twice (`rpx-xui-webapp:api/routes.ts:54`, `:63`), leaving the second mount unreachable.
- Work Allocation routes use `router.use` for action-specific endpoints instead of explicit HTTP method handlers (`get`/`post`/`put`/`delete`), allowing unintended methods to reach handlers (`rpx-xui-webapp:api/workAllocation/routes.ts:39-71`).

## See also

- [Architecture](../explanation/architecture.md) — proxy routing diagram, dual proxy pattern (transparent vs Axios), and security model
- [BFF Pattern](../explanation/bff-pattern.md) — how `applyProxy` and the Express router routes work in detail
- [How-to: Configure for New Service](../how-to/configure-for-new-service.md) — adding a new entry to this catalogue
- [Reference: Config Schema](config-schema.md) — env-var overrides, service URL keys, and feature flags for all services listed here
- [Glossary](glossary.md) — definitions of CDAM, WA, BFF, S2S, and subtree proxy
