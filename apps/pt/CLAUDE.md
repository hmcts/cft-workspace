---
service: pt
ccd_based: true
ccd_config: config-generator
ccd_features:
  - decentralised_ccd
  - query_search
  - roles_access_management
integrations:
  - idam
  - s2s
  - cftlib
  - flyway
api_specs:
  - apps/pt/pt-api:pt-api.json
repos:
  - apps/pt/pt-api
  - apps/pt/pt-frontend
  - apps/pt/pt-shared-infrastructure
---

# Property Tribunal (PT)

PT is the HMCTS digital service for **Residential Property Tribunal** applications — currently the "Apply for an open market rent determination" journey, covering the two application types `challengeRentIncrease` and `challengeExcessiveRent`. Tenants of assured periodic tenancies or agricultural occupancies apply to have the tribunal determine the open market rent for their property.

`pt-api` is the Spring Boot 3 / Java 21 backend that owns all case data (decentralised CCD) and the CCD case-type definition; `pt-frontend` is the Express/TypeScript citizen-facing web app; `pt-shared-infrastructure` is the per-environment Terraform (resource group, key vault, App Insights, managed Redis).

The product is **early-stage** — the frontend citizen journey is being built out page by page, and most of the caseworker-facing CCD events are declared shells (see [Maturity](#maturity) below).

## Repos

- `apps/pt/pt-api` — Spring Boot REST API (port 4550), decentralised CCD case-type owner, PostgreSQL persistence via Flyway, `hmcts.ccd.sdk` definition generation
- `apps/pt/pt-frontend` — Express + TypeScript / Nunjucks citizen frontend (port 4000), Redis-backed sessions, IDAM OIDC login; served at `https://pt.aat.platform.hmcts.net/`
- `apps/pt/pt-shared-infrastructure` — Terraform for the `pt-<env>` resource group, the `pt-kv1-<env>` key vault, App Insights, and the managed Redis instance backing frontend sessions

## Architecture

The frontend authenticates citizens via IDAM (authorization-code flow against `idam-web-public`, `pt-frontend` client) and then talks to **two** backends:

- **CCD data-store** (`ccd.url`, case type `PT`) for anything that mutates a case — `CcdApiClient` in `pt-frontend/src/main/services/ccdApiClient.ts` uses CCD's standard lifecycle (`GET /case-types/PT/event-triggers/<event>` → `POST /case-types/PT/cases`, and `GET /cases/{id}/event-triggers/{event}` → `POST /cases/{id}/events`). Retries 502/504, surfaces 409 version conflicts.
- **pt-api directly** (`api.url`) for read-only citizen queries — `PtApiClient` calls `GET /applications` and `GET /applications/{caseReference}`, which is the whole of pt-api's public HTTP surface today (plus health/info/swagger).

pt-api is registered as a **decentralised CCD** service (`ccd { decentralised = true }` in `build.gradle`, `CCD_DECENTRALISED_CASE-TYPE-SERVICE-URLS_PT` pointed at it). CCD delegates persistence to pt-api's decentralised event callbacks rather than storing case data itself; pt-api writes to its own `pt` PostgreSQL schema. `CASE_API_URL` (default `http://localhost:4550`) is the callback host CCD is told to call, set via `builder.setCallbackHost(caseApiUrl)` in `CaseType.java`.

Note the asymmetry: **the frontend never writes through pt-api**. Case creation goes citizen → CCD → pt-api's `citizen-create-application` callback → `PTCaseService.createCase`. The frontend's only direct pt-api calls are reads.

Local development runs the full CFT stack in-process via the `rse-cft-lib` plugin (`bootWithCCD` and friends — see `build.gradle`'s `CftlibExec` block: additional database `pt`, Postgres on 6432, XUI restricted to `XUI_JURISDICTIONS=PT`).

## CCD touchpoints

One case type — `PT` ("Possession") in jurisdiction `PT` ("Civil Possession") — generated from Java by the `hmcts.ccd.sdk` plugin v6.32.0 (config-generator pattern). `CaseType.java` is the root `CCDConfig<PTCase, State, UserRole>`; `CASE_TYPE_SUFFIX` appends a PR number / `staging` to the case-type ID and name to avoid collisions across environments.

- **Case model** — `PTCase` (`ccd/domain/PTCase.java`) is deliberately thin: applicant name/email/postcode, `applicationType`, `tenancyType`, an unwrapped `applicantContactPreferences`, and a `targetState` FixedList for super-user state moves. The rich domain lives in pt-api's **JPA entity model** (~42 entities: `PTCaseEntity`, `CaseApplicationEntity`, `CaseParty*`, `MarketRentCaseEntity`, `NoticeOfRentChangeEntity`, `TenancyDetailsEntity`, `CaseFlagEntity`, `CaseHearingEntity`, …) rather than in CCD fields. This is the decentralised pattern taken to its conclusion — CCD sees a handful of fields; the service owns the schema.
- **States** — 11, in `ccd/domain/State.java`: `AWAITING_SUBMISSION_TO_HMCTS`, `PENDING_CASE_ISSUED`, `CASE_ISSUED`, `CASE_PROGRESSION`, `HEARING_READINESS` ("Awaiting Listing"), `PREPARE_FOR_HEARING_CONDUCT_HEARING`, `AWAITING_JUDGMENT`, `CLOSED`, `CASE_STAYED`, `DRAFT_DISCARDED`, `REQUESTED_FOR_DELETION`.
- **Events** — ~75 declared, one class per event under `ccd/event/**` (`citizen`, `draft`, `casemanagement`, `managecase`, `hearing`, `flags`, `links`, `orders`, `stays`, `bundle`, `decision`, `documentmanagement`, `feeandpay`, `refer`, `test`). IDs and display names are centralised in the `EventId` enum — **always add new events there**, not as inline string literals.
- **Roles / access** — two parallel enums: `UserRole` (used as the `CCDConfig` role type, tagging each role `IDAM` or `RAS` via `RoleType`) and `AccessProfile` (used by the `HasAccessControl` classes under `ccd/accesscontrol/`: `CitizenAccess`, `ClaimantAccess`, `DefendantAccess`, `SuperUserAccess`, `CaseworkerReadAccess`, `RasValidationAccess`, `InternalCaseFlagAccess`, `GlobalSearchAccess`). Case roles (`[DEFENDANT]`, `[DEFENDANTSOLICITOR]`, `ctsc`, `hearing-centre-admin`, `wlu-admin`, judicial roles) are declared as `RAS`-typed, so the generated definition carries case-level role authorisations — hence `roles_access_management`.
- **Search** (`query_search`) — `searchInputFields()`, `searchCasesFields()`, `searchResultFields()`, `workBasketInputFields()`, `workBasketResultFields()` are all configured, but each with a **single field** (`applicantFirstName`) and a placeholder "Example" tab. Scaffolding, not a finished work-basket.
- **Definition publishing** — `generateCCDConfig` emits JSON to `build/definitions/`, `bin/create-xlsx.sh` converts it via the `ccd/definition-processor` Docker image, and `HighLevelDataSetupApp` (BEFTA `DataLoaderToDefinitionStore`) imports it and registers the 15 CCD roles. `createRoleAssignments()` is deliberately overridden to a no-op — PT does not create role assignments during data setup.

## External integrations

- `idam` — `idam-java-client` v3.0.5. pt-api holds a system user (`PT_IDAM_SYSTEM_USERNAME`) and two OAuth2 password-grant client registrations (`prd-admin`, `system-user`), validates inbound citizen tokens itself via `IdamAuthenticationFilter` / `IdamAuthenticator` / `IdamUserInfoApi`. `UpstreamThrottling` translates IDAM throttling responses into `Retry-After`. The frontend does OIDC by hand (no `openid-client`) in `src/main/auth/user/oidc.ts`.
- `s2s` — `service-auth-provider-java-client` v5.3.5. Registered microservices `pt_api` and `pt_frontend`; whitelist `pt_api,pt_frontend,ccd_data`.
- `cftlib` — `rse-cft-lib` plugin v0.19.2326; `CftlibConfig` seeds IDAM users, CCD roles, and role assignments (`cftlib-am-role-assignments.json`) and imports the generated definition.
- `flyway` — pt-api owns the `pt` PostgreSQL schema; migrations `V1`–`V7` under `src/main/resources/db/migration/`. `V3__init.sql` drops the throwaway `pt_case` table from V1/V2 and lays down the real ~40-table model, using Postgres `ENUM` types (`YES_NO`, `PROPERTY_TYPE`) mapped through Hibernate `SqlTypes.NAMED_ENUM`.

**Wired but not yet called** — these look like integrations from `build.gradle` / chart env vars, and are *not* claimed in the frontmatter, so don't assume behaviour behind them:

- **CDAM** — `ccd-case-document-am-client` v1.59.2, `CaseDocumentClientApi` enabled in `@EnableFeignClients`, `CASE_DOCUMENT_AM_URL` set in every environment, CDAM deployed in the `pr-values:ccd` preview — but no pt-api code calls it. Document handling is entity-model-only (`DocumentEntity`, carrying a `categoryId`).
- **Bulk print / send-letter** — `send-letter-client` v5.1.1 on the classpath, `uk.gov.hmcts.reform.sendletter` in `scanBasePackages`, `SEND_LETTER_URL` wired; no call sites.
- **AM / role assignment** — no calls from pt-api. The preview overlay deploys `am-org-role-mapping-service` (with CRD/JRD Service Bus topics) pointed at the **shared AAT** `am-role-assignment-service`, and XUI runs with `FEATURE_ACCESS_MANAGEMENT_ENABLED`, but that's deployment topology rather than a service integration.

Genuinely absent: **payment / fees** (the `feeandpay` CCD events exist and move states, but there's no `payments-java-client` or `fees-java-client` dependency), **notify**, **rd**, and **HMC** (the `hearing`/`hearings` events are local state machines, not HMC integration).

## Frontend journey model

`pt-frontend` uses a config-driven step framework in `src/main/modules/steps/` (`JourneyFlowConfig` / `StepConfig` / `SectionConfig` in `stepFlow.interface.ts`), with three journeys, each a directory under `src/main/steps/` holding a `flow.config.ts`, a `stepRegistry.ts`, and one directory per page (`index.ts` + `.njk` + locale JSON):

- **`pre-application`** (`/pre-application`) — eligibility triage. Hub step `starting-or-returning`; branches to several `you-need-to-use-another-form*` dead ends based on postcode (`isPartOfInitialRollout` — currently only the `B` and `M` postcode areas), English-address checks, housing-association landlords, and joint tenancies.
- **`new-application`** — `application-type` then `tenancy-type`; the `tenancy-type` step's `beforeRedirect` is where the CCD case is actually created (`citizen-create-application`), after which the user is redirected to `/<caseReference>/task-list`.
- **`application`** (`/:caseReference`) — the main form, organised as a **task list** (`hubStepName: 'task-list'`) over 9 visual groups and 14 sections declared in `sections.config.ts`, with `dependsOn` gating `check-your-answers-and-submit` on every other section, and `showCondition` predicates in `flow.config.ts` for conditional pages.

Welsh is scaffolded throughout (`src/main/assets/locales/{en,cy}/`) via i18next. Functional tests are CodeceptJS + Playwright with Gherkin features and Zephyr reporting (`zephyr-scripts/`).

## Maturity

Be careful reading pt-api's event tree as finished work: **51 of the ~74 event classes** carry `// TODO: implement when further details are released` — they declare the event, states, and a `grant(CRU, PT_CASE_WORKER)` placeholder, and return an empty `SubmitResponse`. The ones with real behaviour are the `citizen/*` events, most of `managecase/*`, `feeandpay/*` (state transitions only), and `test/*`.

Consequently several CCD features are **declared-but-not-wired**, and are deliberately *not* claimed in the frontmatter:

- **case flags** — `flags-create-flag` / `flags-manage-flag` events, `InternalCaseFlagAccess`, and `CaseFlagEntity` / `CasePartyFlagEntity` / `FlagReferenceDataEntity` tables all exist, but there are no `Flags` / `caseFlags` CCD fields on `PTCase`.
- **global search** — `GlobalSearchAccess` grants `GS_profile` read on every state, but there are no `SearchCriteria` / `SearchParty` fields.
- **linked cases** — `links-link-case` / `links-manage-links` events exist; no `CaseLink` fields.
- **hearings** — hearing events exist; no HMC client, topic, or `HmcHearingApi`.
- **notice of change** — a `notice-of-change` event shell exists; no `aac-manage-case-assignment` wiring.
- **work allocation** — see the `values.wa.preview.template.yaml` note below; the chart overlay is written but nothing initiates tasks.

## Notable conventions and quirks

- **PCS copy-paste heritage.** pt-api was bootstrapped from `pcs-api` and several names still say so. The CCD case type is `PT` but named **"Possession"** in jurisdiction **"Civil Possession"** — leftovers, since this product is the Residential *Property* Tribunal (open market rent determination), not possession claims. Likewise `CftlibConfig` calls `lib.createProfile(..., "CIVIL", "PT", ...)`, and — a real bug worth knowing about — the `generateCCDConfig` task in `build.gradle` exports `PCS_DB_USER_NAME` / `PCS_DB_PASSWORD` instead of `PT_*`, so it only works because the `pt` datasource defaults happen to match.
- **Package is `uk.gov.hmcts.reform.pt`** (with `.reform.`), unlike most CFT services which use `uk.gov.hmcts.reform.<x>` only in older repos — grep accordingly.
- **`pr-values:ccd` gates CCD entirely.** `Jenkinsfile_CNP` sets `CCD_ENABLED=false` unless the PR carries the `pr-values:ccd` label; `build.gradle` reads that to switch off `ccd { runtimeIndexing }`, and only labelled PRs get `enableHighLevelDataSetup`. So a preview build without the label deploys pt-api with no CCD stack at all.
- **`values.wa.preview.template.yaml` is present but unwired.** The chart overlay for a full Work Allocation preview (Camunda, task-management/monitor/workflow APIs, the four cron batches, ORM, Service Bus topics) exists and its header points at [`pcs-api#1930`](https://github.com/hmcts/pcs-api/pull/1930) as the model — but `Jenkinsfile_CNP` has no `pr-values:wa` branch, and pt-api publishes **no** CCD case events to Service Bus (no JMS/ASB code at all). Treat WA as prepared, not live. See [WA preview: when ORM and RAS are needed](../wa/docs/how-to/set-up-wa-in-preview.md#when-orm-and-ras-are-actually-needed) — note PT differs from PCS here by deploying ORM and pointing at AAT's RAS.
- **Staging case type on AAT.** The master pipeline generates and imports the definition **twice** — once as `PT-staging` against `https://pt-api-staging.aat.platform.hmcts.net`, once as plain `PT` against the internal AAT host. AAT smoke tests run against the `staging` suffix.
- **Cross-repo preview pairing.** Put a `pt-api-pr:<number>` label on a pt-frontend PR and its Jenkinsfile repoints CCD, CDAM, XUI, and pt-api at that pt-api preview. Watch out: the data-store URL it builds contains a typo — `ccd-data-store-api-pct-api-pr-…` (`pct`, not `pt`) — so paired previews resolve the wrong host.
- **Key vault is `pt-kv1-<env>`**, not `pt-<env>` (renamed in `pt-shared-infrastructure` commits `5a540c6`→`629be20`); pt-api imports it as a config tree from `/mnt/secrets/pt-kv1/`.
- **Managed Redis, not the Bitnami chart.** `pt-shared-infrastructure/redis.tf` provisions Azure Managed Redis (`terraform-module-azure-managed-redis`, Balanced_B1, private endpoint only) and writes `redis-connection-string` into the key vault; the frontend chart has `redis.enabled: false` and consumes that secret. Frontend sessions are Redis-backed with a 90-minute TTL.
- **`-Werror` on all Java compilation** with `-Xlint:unchecked`, and `check` depends on `integration` — integration tests (Testcontainers Postgres) run as part of a normal `./gradlew check`.
- **Pact consumer only.** Both repos publish consumer pacts (`pt_api`, `pt_frontend`) to `pact-broker.platform.hmcts.net` and run `can-i-deploy`; pt-api's consumer tests cover IDAM and S2S.
- **Slack channel `#pt-tech`**; nightly pipelines run Fortify against `pt-kv1-aat`.
