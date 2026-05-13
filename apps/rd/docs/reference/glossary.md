---
title: Glossary
topic: overview
diataxis: reference
product: rd
audience: both
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
---

# Reference Data glossary

Alphabetical definitions of terms used across the RD documentation. Each entry links to the page where the term is explained in most detail.

---

**A&P** — Analysis and Policy team; the business team that provides new CaseFlags and ListOfValues CSV file versions to the RD batch loader. See [Batch Loading](../explanation/batch-loading.md).

**AAC** — Assign Access to a Case (`aac_manage_case_assignment`); a platform service that calls PRD using the `prd-aac-system` IDAM role to retrieve active organisation users for case-assignment and Notice of Change flows. See [Professional Organisations](../explanation/professional-organisations.md).

**AM-ORM** — Access Management Org Role Mapping service (`am_org_role_mapping_service`); subscribes to the `rd-caseworker-topic` and `rd-judicial-topic` Azure Service Bus topics and recalculates organisational role assignments when CRD or JRD data changes. See [Caseworker Profiles](../explanation/caseworker-profiles.md).

**Apache Camel** — Integration framework used by both batch-load CronJobs (`rd-commondata-dataload`, `rd-location-ref-data-load`) to read CSVs from Azure Blob Storage, validate records, and write to PostgreSQL. See [Batch Loading](../explanation/batch-loading.md).

**ASB** — Azure Service Bus; Microsoft's managed message broker used by CRD and JRD to publish domain events to downstream consumers. See [Architecture](../explanation/architecture.md).

**Camel Bindy** — Apache Camel CSV data format that maps CSV columns to Java POJO fields via `@DataField` annotations; used by both batch loaders. See [Batch Loading](../explanation/batch-loading.md).

**CCBC** — County Court Business Centre; a `locationType` value on `CourtVenue` records in LRD. See [Locations](../explanation/locations.md).

**CCMCC** — County Court Money Claims Centre; a processing centre for money claims, referenced in LRD location types. See [Locations](../explanation/locations.md).

**CIPHR e-HR** — The upstream Judicial HR system from which eLinks is populated via nightly batch; the root source of truth for judicial office holder data. See [Judicial Users](../explanation/judicial-users.md).

**cnp-flux-config** — The Flux GitOps repository (`hmcts/cnp-flux-config`) that manages Kubernetes CronJob schedules and per-environment S2S allowlist overrides under `apps/rd`. See [Register as S2S Caller](../how-to/register-as-s2s-caller.md).

**CRD** — Caseworker Reference Data; the `rd-caseworker-ref-api` service (also called SRD / Staff Reference Data). Stores profiles for approximately 17,000 HMCTS caseworkers and publishes change events to the `rd-caseworker-topic` ASB topic. See [Caseworker Profiles](../explanation/caseworker-profiles.md) and [API reference](api-location.md).

**CTSC** — Courts and Tribunals Service Centre; one of the caseworker user categories in CRD (contact centre users who handle citizen queries via phone/email). Also a `locationType` value in LRD. See [Caseworker Profiles](../explanation/caseworker-profiles.md).

<!-- REVIEW: The mandatory IDAM role is "cwd-user" (hyphenated, lowercase), not "CWD_user". See rd-caseworker-ref-api:src/main/java/uk/gov/hmcts/reform/cwrdapi/util/CaseWorkerConstants.java:128. -->
**CWD_user** — Mandatory IDAM role added to every caseworker provisioned through CRD, used as a marker that the user was onboarded via the CRD pipeline. See [Caseworker Profiles](../explanation/caseworker-profiles.md).

**D-record** — A `list_of_values` row with `active='D'` indicating soft-deletion; physically removed from the database after each batch load run. See [Batch Loading](../explanation/batch-loading.md).

**data-ingestion-lib** — Shared HMCTS library (`com.github.hmcts:data-ingestion-lib`) providing Apache Camel route infrastructure, Azure Blob Camel component wiring, `DataIngestionLibraryRunner`, and `RouteExecutor`. Used by both batch-load CronJobs. See [Batch Loading](../explanation/batch-loading.md).

**dataload_schedular_audit** — Database table recording batch job run timestamps; used for daily idempotency checks. Note: the "schedular" spelling is canonical (a persistent typo). See [Batch Loading](../explanation/batch-loading.md).

**dataload_exception_records** — Database table storing per-row validation failures with table name, field, error description, and row ID; produced by both batch loaders. See [Batch Loading](../explanation/batch-loading.md).

**eLinks** — External judiciary middleware API (operated by FutureEHR, hosted on Heroku) that is the source-of-truth for judicial office holder data; populated nightly from CIPHR e-HR. JRD is the only RD service with an external third-party data feed. See [Judicial Users](../explanation/judicial-users.md).

**epimms_id** — Electronic Property Information Mapping Management System identifier; the unique business key for a court building shared across HMCTS systems (LRD, CRD, JRD). See [Locations](../explanation/locations.md) and [API Location](api-location.md).

**FaCT** — Find a Court or Tribunal; the public-facing court finder service. LRD stores `fact_url` links to it on each court venue. See [Locations](../explanation/locations.md).

**IDAM** — Identity and Access Management; the HMCTS authentication platform. All RD APIs validate IDAM OAuth2/OIDC bearer tokens in addition to S2S tokens. See [Architecture](../explanation/architecture.md).

**JOH** — Judicial Office Holder; any person who holds a judicial appointment. The core entity managed by JRD. See [Judicial Users](../explanation/judicial-users.md).

**JRD** — Judicial Reference Data; the `rd-judicial-api` service. Stores judicial office holder profiles, appointments, authorisations, and roles in the `dbjudicialdata` schema, and integrates with eLinks. See [Judicial Users](../explanation/judicial-users.md) and [API Judicial](api-judicial.md).

**LaunchDarkly** — Feature flag platform integrated by all six RD API services via `${LD_SDK_KEY}`; used to gate endpoints and pipeline steps without redeployment. See [Architecture](../explanation/architecture.md).

**LRD** — Location Reference Data; the `rd-location-ref-api` service. Provides court building locations, court venues, service codes, and region/area hierarchies. See [Locations](../explanation/locations.md) and [API Location](api-location.md).

**MFA** — Multi-Factor Authentication; PRD stores an organisation-level MFA preference (`EMAIL`, `NONE`, `PHONE`, `AUTHENTICATOR`) consumed by IDAM during authentication. See [Professional Organisations](../explanation/professional-organisations.md).

**MRD** — Master Reference Data; the upstream governance team (and system) that maintains and publishes location data, flag data, and list-of-values as versioned CSV files. See [Batch Loading](../explanation/batch-loading.md) and [Locations](../explanation/locations.md).

**NBC** — National Business Centre; a caseworker user type in CRD for centralised back-office processing. Also a `locationType` in LRD. See [Caseworker Profiles](../explanation/caseworker-profiles.md).

**`@OrgId` resolver** — Custom Spring argument resolver in PRD that extracts the caller's organisation from their IDAM JWT on external endpoints, so solicitors never need to pass an explicit org ID. See [Professional Organisations](../explanation/professional-organisations.md).

**`organisationIdentifier`** — 7-character uppercase alphanumeric external identifier for a solicitor organisation in PRD (regex `^[A-Z0-9]{7}$`); not a UUID. See [Professional Organisations](../explanation/professional-organisations.md).

**PBA** — Pay By Account; a solicitor firm's payment account number (format `PBA` + 7 alphanumeric chars). PBAs start as `PENDING` and are auto-accepted when an organisation is activated. See [Professional Organisations](../explanation/professional-organisations.md) and [API Professional](api-professional.md).

**`personal_code`** — The eLinks-assigned unique identifier for a judicial office holder; the primary key of the `judicial_user_profile` table. See [Judicial Users](../explanation/judicial-users.md).

**PRD** — Professional Reference Data; the `rd-professional-api` service. Manages solicitor organisations, their users, PBA accounts, and MFA preferences. See [Professional Organisations](../explanation/professional-organisations.md) and [API Professional](api-professional.md).

**`prd-aac-system`** — System IDAM role used by AAC; automatically filters user list queries to active users only. See [Professional Organisations](../explanation/professional-organisations.md).

**`pui-caa`** — Case Access Administrator PUI role; enables solicitors to share/assign cases within their organisation. See [Professional Organisations](../explanation/professional-organisations.md).

**PUI role** — Professional User Interface role (`pui-user-manager`, `pui-organisation-manager`, `pui-finance-manager`, `pui-case-manager`, `pui-caa`). Seeded in PRD's `prd_enum` table and provisioned into IDAM on user invite. See [Professional Organisations](../explanation/professional-organisations.md).

**`rdpreview`** — Azure Storage account used for local development and file validation (not a deployed environment). See [Batch Loading](../explanation/batch-loading.md).

**S2S** — Service-to-service authentication via the `ServiceAuthorization` JWT header; validated by `ServiceAuthFilter` (from `service-auth-provider-java-client`) before IDAM bearer-token checking. Every RD endpoint requires a valid S2S token from a whitelisted caller. See [Architecture](../explanation/architecture.md) and [Register as S2S Caller](../how-to/register-as-s2s-caller.md).

**Service code** — An LRD-assigned code (e.g. `ABA5` for Private Law, `BFA1` for IAC) identifying an organisational service line; used by payment routing, venue filtering, and JRD's `ccdServiceName` refresh. See [Locations](../explanation/locations.md).

**ShedLock** — Distributed scheduler lock library used by JRD's eLinks cron scheduler to prevent concurrent runs across pods. The batch loaders use a simpler `dataload_schedular_audit` table instead. See [Architecture](../explanation/architecture.md).

**SIDAM ID** — The identity assigned to a user within the HMCTS IDAM system; used as the payload key in both `rd-caseworker-topic` and `rd-judicial-topic` ASB messages. See [Judicial Users](../explanation/judicial-users.md).

**SOP** — HR system used by HMCTS permanent and agency staff; an indirect source of caseworker data flowing into CRD. See [Caseworker Profiles](../explanation/caseworker-profiles.md).

**SRD** — Staff Reference Data; an alternative name for CRD (`rd-caseworker-ref-api`), used in the Staff UI context. See [Caseworker Profiles](../explanation/caseworker-profiles.md).

**Super user** — The first user registered for a solicitor organisation in PRD; starts as `PENDING` and is registered in IDAM via `rd-user-profile-api` upon organisation activation. See [Professional Organisations](../explanation/professional-organisations.md).

**ticket_code** — Authorisation identifier in JRD linking a judicial office holder to a specific jurisdiction or service area; used in the `judicial_office_authorisation` table and `judicial_service_code_mapping`. See [Judicial Users](../explanation/judicial-users.md).

**UPRN** — Unique Property Reference Number; a standard UK property identifier stored on court venue records in LRD. See [Locations](../explanation/locations.md).

**UP** — User Profile; `rd-user-profile-api`, stores HMCTS user profile preferences and IDAM activation state. PRD delegates all IDAM user creation to UP via `UserProfileFeignClient`. See [Architecture](../explanation/architecture.md).
