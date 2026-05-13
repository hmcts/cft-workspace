---
title: Overview
topic: overview
diataxis: explanation
product: rd
audience: both
sources:
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/external/OrganisationExternalController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/internal/OrganisationInternalController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/service/impl/OrganisationServiceImpl.java
  - rd-professional-api:src/main/resources/application.yaml
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/controller/JrdElinkController.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/service/impl/ELinksServiceImpl.java
  - rd-judicial-api:src/main/resources/application.yaml
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/controller/request/UserSearchRequest.java
  - rd-caseworker-ref-api:src/main/resources/application.yaml
  - rd-location-ref-api:src/main/resources/application.yaml
  - rd-commondata-api:src/main/resources/application.yaml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1478697187"
    title: "New Service Integration with existing PRD APIs - Operational Model"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1228834096"
    title: "PRD Endpoints - Roles and Pre-Requisites for Access"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1710000816"
    title: "Introduction - JRD elinks release"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1391526853"
    title: "Caseworker Reference Data - High Level Design"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1973487027"
    title: "Location Reference Data - Court Venue Changes V2"
    last_modified: "2026-05-11"
    space: "RTRD"
  - id: "1457299643"
    title: "Integration of new services with PRD (Professional Reference Data)"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1904127333"
    title: "Location Reference Data API Usage Report"
    last_modified: "unknown"
    space: "DTSRD"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Reference Data (RD) is a suite of six independent Spring Boot REST APIs that supply shared lookup data to the CFT platform — professional organisations, judicial profiles, caseworker profiles, court locations, common categories/flags, and user profile preferences.
- None of the services hold CCD case data; they are standalone PostgreSQL-backed stores queried over HTTP by service teams and platform components (XUI, AM, AAC, hearings, payments).
- Each service secures endpoints with S2S token validation and IDAM OAuth2/OIDC; each declares its own `s2s-authorised.services` allowlist. New services must follow a formal integration onboarding process (JIRA ticket, NFR sign-off, S2S whitelisting, integration testing).
- Two additional batch-loader jobs (`rd-commondata-dataload`, `rd-location-ref-data-load`) run as Kubernetes CronJobs to ingest CSV reference data from Azure Blob Storage.
- `rd-judicial-api` is the only service with an external third-party data feed (the eLinks judiciary middleware API).
- LRD is actively developing V2 court venue endpoints that normalise the flat `court_venue` table into separate name, address, and contact entities (in progress, May 2026).

## The RD service suite

| Service | Port | Schema | Primary responsibility |
|---------|------|--------|----------------------|
| `rd-professional-api` (PRD) | 8090 | `dbrefdata` | Solicitor organisations, their users, PBA accounts, and professional relationships |
| `rd-user-profile-api` | 8091 | — | HMCTS user profile preferences and activation state |
| `rd-judicial-api` (JRD) | 8093 | `dbjudicialdata` | Judicial office holder profiles, appointments, authorisations, and roles |
| `rd-caseworker-ref-api` (CRD) | 8095 | — | Caseworker user profiles, skills, and location assignments |
| `rd-location-ref-api` (LRD) | 8099 | — | Court building locations, service codes, and region/area hierarchies |
| `rd-commondata-api` | 4550 | `dbcommondata` | Shared lookup tables: case flags, panel member types, list-of-values, categories |

All six are Java 21 / Spring Boot 3 applications. Flyway manages schema migrations for each (`src/main/resources/db/migration/`), and all Jenkinsfiles call `enableDbMigration('rd')` at deploy time.

## Professional Reference Data (PRD)

PRD manages the lifecycle of solicitor organisations within HMCTS digital services. An organisation self-registers via the external API, enters a `PENDING` state, and must be manually activated by a PRD admin before its users can operate.

### API surface

PRD exposes two parallel controller hierarchies:

- **Internal** (`/refdata/internal/v1/organisations`) — admin-facing, secured with `prd-admin` role.
- **External** (`/refdata/external/v1/organisations`) — solicitor-facing, secured with `pui-*` roles. The caller's organisation is resolved from the IDAM JWT via an `@OrgId` argument resolver, so no explicit org ID is needed in the path.

V2 controllers add support for `OrgAttributes` key-value extension fields and `orgType`.

### Organisation lifecycle

1. Created as `PENDING` (`OrganisationServiceImpl.java:169`).
2. Admin activates (`PENDING`/`REVIEW` to `ACTIVE`) via internal PUT — triggers IDAM registration of the super user and auto-accepts all pending PBAs with `statusMessage = "Auto approved by Admin"` (`OrganisationServiceImpl.java:657-660`).
3. `ACTIVE` to `BLOCKED` is permitted; reverse transitions to `PENDING`/`REVIEW` from `ACTIVE` are blocked.
4. Deletion is a hard delete, gated by the `DELETE_ORG` feature flag (off by default).

The `organisationIdentifier` is a 7-character alphanumeric string (`^[A-Z0-9]{7}$`), not a UUID.

### User management

User invitations are delegated to `rd-user-profile-api` via a Feign client (`UserProfileFeignClient`). PRD stores the returned `idamId` as `userIdentifier`. User "status" is not a DB column (dropped in the V6 migration); instead, the `deleted` timestamp column and the transient IDAM status (`ACTIVE`/`PENDING`/`SUSPENDED`) together represent user state.

### PBA (Payment by Account)

PBA numbers follow the pattern `PBA[0-9A-Z]{7}` (10 characters). New PBAs start as `PENDING` and are globally unique across all organisations. Admin review endpoint: `PUT /refdata/internal/v1/organisations/{orgId}/pba/status`.

### Consumers

PRD's default S2S allowlist (from `application.yaml`) is: `rd_professional_api`, `rd_user_profile_api`, `xui_webapp`, `finrem_payment_service`, `fpl_case_service`, `iac`, `aac_manage_case_assignment`, `divorce_frontend`. The actual production list is extended at deploy time via the `PRD_S2S_AUTHORISED_SERVICES` environment variable in Flux config.

### Role-based endpoint access

PRD endpoints enforce IDAM role checks in addition to S2S. The key role groupings:

| Role | Scope |
|------|-------|
| `prd-admin` | All internal admin endpoints (approve orgs, edit PBAs, delete orgs, retrieve all users) |
| `prd-aac-system` | Internal users-of-org endpoint (returns only `ACTIVE` users); used by AAC |
| `pui-user-manager` | External user-management endpoints (invite, modify roles, view all users in own org) |
| `pui-organisation-manager` | External organisation retrieval, view active users |
| `pui-finance-manager` | External PBA retrieval, view active users |
| `pui-case-manager` | External PBA retrieval, view active users |
| `pui-caa` | External org retrieval, view active users; used by case-access admin |

The `POST /refdata/external/v1/organisations` (self-registration) endpoint requires only S2S authentication (no IDAM role), since the caller is an unauthenticated user registering a new organisation.
<!-- CONFLUENCE-ONLY: role/endpoint matrix detail from "PRD Endpoints - Roles and Pre-Requisites for Access" page (id 1228834096) -- not all consumer details verified in source -->

## Judicial Reference Data (JRD)

JRD stores judicial office holder profiles — their appointments to courts/tribunals, authorisations (jurisdictions they may sit in), and additional judicial roles. Consumers include AM (`am_org_role_mapping_service`), IAC, and XUI.

JRD's S2S allowlist defaults to: `rd_judicial_api`, `am_org_role_mapping_service`, `iac`, `xui_webapp`. The search endpoint filters results by a configured set of service codes: `bfa1`, `bba3`, `aaa6`, `aaa7`, `aba5`, `aba3` (configurable via `JRD_SEARCH_SERVICE_CODE`).

### Data model

The root entity is `judicial_user_profile` (PK: `personal_code`). Each profile has one-to-many relationships with:

- **Appointments** (`judicial_office_appointment`) — which court/tribunal, principal or secondary, EPIMMS ID, region, contract type.
- **Authorisations** (`judicial_office_authorisation`) — jurisdiction, ticket code, start/end dates.
- **Additional roles** (`judicial_additional_roles`) — extra judicial role assignments.

### Query APIs

| Endpoint | Security | Purpose |
|----------|----------|---------|
| `POST /refdata/judicial/users/search` | Any valid IDAM token | Free-text search by name (min 3 chars, pattern `^[(a-zA-Z0-9 )\p{L}\p{N}''-]{3,}`), optionally filtered by `serviceCode` or `location`. Searches across `knownAs`, `surname`, and `fullName`. |
| `POST /refdata/judicial/users` | `jrd-system-user` or `jrd-admin` | Paginated profile refresh by `ccdServiceName`, `object_ids`, `sidam_ids`, or `personal_code` (exactly one must be set) |

The refresh endpoint returns `UserProfileRefreshResponse` with nested `appointments[]`, `authorisations[]`, and `roles[]`. A `total_records` header accompanies paginated responses (default page size 200).

### eLinks data pipeline

JRD integrates with the Judicial Office eLinks API (eHR system) to provide an automated daily upload of judicial reference data. This replaced an earlier interim solution where the Judicial Office sent data via CSV for manual upload into CFT Reference Data. The eLinks integration ensures that judicial reference data — used in Work Allocation and Hearing Management — is authoritative and current.

JRD pulls judicial data from the external eLinks judiciary middleware API on a daily schedule (`${CRON_EXPRESSION:* 55 15 * * *}`). The pipeline sequence:

1. **Locations** — fetches base location reference data.
2. **People** — fetches/updates judicial profiles (paginated, 50 per page).
3. **Leavers** — marks departed judges (`deleted_flag=true`, `active_flag=false`).
4. **Deleted** — handles profiles deleted at source.
5. **IDAM sync** — back-fills `sidam_id` from IDAM elastic search.
6. **ASB publish** — publishes updated SIDAM IDs to the `rd-judicial-topic` Azure Service Bus topic in batches of 50 (`{"userIds": ["<sidamId>", ...]}`).
7. **Cleanup** — removes raw eLinks responses older than 30 days; physically deletes soft-deleted profiles older than 7 years.

The scheduler uses ShedLock to prevent concurrent runs and calls its own internal HTTP endpoints over localhost (these paths bypass security and are hidden from Swagger).

### LRD dependency

When the refresh endpoint is called with `ccdServiceName`, JRD calls `rd-location-ref-api` at `/refdata/location/orgServices` to map service codes to base locations before querying profiles.

## Other RD services

### Caseworker Reference Data (CRD)

Manages caseworker user profiles and their skill/location assignments. Publishes domain events to the `rd-caseworker-topic` Azure Service Bus topic (batch size 50 per message). Like JRD, it calls `rd-location-ref-api` internally to enrich records with location details.

CRD serves three main user communities:

- **CTRT users** — court staff working in regional units supporting judiciary.
- **CTSC users** — contact centre staff using customer care platforms for citizen queries via telephone/email.
- **Legal Advisors** — users with delegated judicial responsibilities, managed by Legal Office (not Judicial Office).

The system supports approximately 17,000 staff across England, Wales, Scotland, and Northern Ireland.
<!-- CONFLUENCE-ONLY: user community categories and staff count from "Caseworker Reference Data - High Level Design" (id 1391526853) -->

CRD's S2S allowlist defaults to: `rd_caseworker_ref_api`, `am_org_role_mapping_service`, `iac`, `xui_webapp`, `rd_profile_sync`. A mandatory IDAM role `crd_caseworker` is added to every user provisioned through CRD, enabling downstream systems to identify users on-boarded via the caseworker pipeline.

When a profile is created or updated, CRD:
1. Validates the email domain is within allowed domains (`hmcts.net`, `justice.gov.uk`, etc.)
2. Searches IDAM to find existing user record by email
3. Derives IDAM roles from a `CRD_IDAM_ROLE_MAPPING` table based on user attributes
4. Calls IDAM to update roles (additive only; no roles removed)
5. Publishes a message to Access Management for role-assignment rebuild
<!-- CONFLUENCE-ONLY: IDAM role mapping flow detail from CRD HLD (id 1391526853) -->

### Location Reference Data (LRD)

Provides court building locations, EPIMMS IDs, service codes, and region/area hierarchies. Data is bulk-loaded by the `rd-location-ref-data-load` Kubernetes CronJob from Azure Blob Storage (`lrd-ref-data` container).

LRD's default S2S allowlist is: `rd_location_ref_api`, `payment_app`, `rd_caseworker_ref_api`, `rd_judicial_api`. Production Flux config extends this to include: `ccd_data`, `xui_webapp`, `prl_cos_api`, `sscs`, `sscs_bulkscan`, `adoption_web`, `civil_service`, `civil_general_applications`, `sptribs_case_api`, `fis_hmc_api`, `et_cos`, `iac`, `probate_backend`.

Key LRD endpoints and their primary consumers (from production API usage data, April 2026):

| Endpoint | Heaviest consumers |
|----------|-------------------|
| `GET /refdata/location/court-venues/services?service_code=` | `xui_webapp` (80k/month), `iac` (31k/week), `civil_service` |
| `GET /refdata/location/court-venues?epimms_id=` | `xui_webapp`, `sscs`, `fis_hmc_api` |
| `GET /refdata/location/orgServices` | `xui_webapp` (28k/week), `rd_caseworker_ref_api` (55k/week), `payment_app` |
| `GET /refdata/location/court-venues/venue-search` | `xui_webapp` (5k/week) |
| `GET /refdata/location/regions` | `xui_webapp`, `sptribs_case_api` |

#### LRD V2 — Court Venue normalisation (in development)

A V2 API is being designed (May 2026) that normalises the flat `court_venue` table into separate entities: Court Venue Name (multilingual, typed), Address, and Contact Details. New fields include district registry / appeal centre flags, external short names with Welsh variants, MRD identifiers, and breathing-space emails. V2 endpoints will run side-by-side with V1 under feature toggles until consumers migrate. The V2 implementation has not yet landed in source code.
<!-- CONFLUENCE-ONLY: LRD V2 design from "Location Reference Data - Court Venue Changes V2" (id 1973487027), dated May 2026, not yet in source -->

### Common Data API

Serves shared lookup tables — case flags, panel member types, list-of-values, and categories. Uses the `dbcommondata` schema. Data is ingested by the `rd-commondata-dataload` CronJob from GPG-encrypted CSVs in Azure Blob Storage (`rd-common-data` container).

The Common Data API's default S2S allowlist contains only `rd_commondata_api` itself; the production allowlist is extended via `CRD_S2S_AUTHORISED_SERVICES` in Flux config to include consuming services.

### User Profile API

Stores HMCTS user profile preferences and activation state. Acts as a delegate for PRD's user creation flow — PRD calls it via `UserProfileFeignClient` to register users in IDAM.

## Integrating with RD services

New service teams wishing to consume RD APIs must follow a formal onboarding process:

1. **Raise a JIRA** in the Reference Data Agile Board, specifying the service name (used for S2S whitelisting) and the NFRs for each API endpoint to be consumed.
2. **Notify the team** via the `#ref-data-support` Slack channel with the JIRA ticket number.
3. **Performance sign-off** — the Performance team assesses volumetric impact (may require load testing depending on the endpoint).
4. **Whitelisting in lower environments** — Ref Data team adds the service to the S2S allowlist in Demo/AAT for integration testing.
5. **Integration testing** — consuming service validates against AAT or Demo.
6. **Production whitelisting** — requires confirmation email from the release team; Ref Data team then adds the service in Prod Flux config.

Pre-requisites for calling any RD API:
- A valid S2S token (the service must be registered in `service-auth-provider` and whitelisted in the target RD service's `s2s-authorised.services`).
- A valid IDAM Bearer token for role-protected endpoints (the user must hold the required IDAM role, e.g. `prd-admin`, `pui-*`, `jrd-system-user`).
<!-- CONFLUENCE-ONLY: onboarding process from "Integration of new services with PRD" (id 1457299643) and "New Service Integration with existing PRD APIs - Operational Model" (id 1478697187) -->

## Common patterns across RD services

- **Security**: S2S filter validates the `ServiceAuthorization` header before IDAM bearer-token checks. Each service declares its allowlist in `application.yaml` under `idam.s2s-authorised.services`.
- **Secrets**: read from Azure Key Vault mounted at `/mnt/secrets/rd/`.
- **Feature flags**: all services configure LaunchDarkly (`${LD_SDK_KEY}`).
- **Database**: each service owns its own PostgreSQL database with Flyway migrations applied on startup (`out-of-order: true`).
- **Pact contracts**: all six register provider contract tests against the HMCTS Pact Broker.
- **Batch loaders**: the two data-load repos are Apache Camel / Kubernetes CronJobs (not persistent HTTP services). They use `data-ingestion-lib` and ShedLock.

## See also

- [Architecture](architecture.md) — deep-dive into the service inventory, consumer topology diagram, inter-service dependencies, ASB topics, and batch loaders
- [Register as S2S Caller](../how-to/register-as-s2s-caller.md) — step-by-step guide to the integration onboarding process described here
- [Query Reference Data](../how-to/query-reference-data.md) — practical HTTP examples for calling every RD API with the correct tokens
- [Glossary](../reference/glossary.md) — definitions of PRD, JRD, CRD, LRD, eLinks, MRD, S2S, PBA, and other key terms
