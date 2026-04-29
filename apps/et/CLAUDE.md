---
service: et
ccd_based: true
ccd_config: json
ccd_features:
  - notice_of_change
  - case_flags
  - global_search
  - linked_cases
  - hearings
  - work_allocation_tasks
  - specific_access
  - categories
integrations:
  - idam
  - s2s
  - am
  - rd
  - notify
  - cdam
  - cftlib
  - flyway
repos:
  - apps/et/et-ccd-callbacks
  - apps/et/et-ccd-case-migration
  - apps/et/et-cron
  - apps/et/et-full-system
  - apps/et/et-full-system-servers
  - apps/et/et-hearings-api
  - apps/et/et-performance
  - apps/et/et-pet-admin
  - apps/et/et-pet-api
  - apps/et/et-pet-ccd-export
  - apps/et/et-pet-et1
  - apps/et/et-pet-et3
  - apps/et/et-shared-infrastructure
  - apps/et/et-slack-alerts
  - apps/et/et-sya-api
  - apps/et/et-sya-frontend
  - apps/et/et-syr-frontend
  - apps/et/et-wa-post-deployment-ft-tests
  - apps/et/et-wa-task-configuration
  - apps/et/et-xui-e2e-tests
---

# Employment Tribunals (ET)

The Employment Tribunals service allows claimants to submit ET1 claims against employers and respondents to file ET3 responses, replacing a legacy JADU system. It spans two distinct subsystems: the older "PET" (Public Employment Tribunals) Ruby stack that handled the original digital ET1/ET3 forms, and the newer CCD-backed caseworker and self-represented party portals built on the HMCTS CFT stack.

## Repos

- `apps/et/et-ccd-callbacks` — Spring Boot 3.3 Java 21 case orchestration service (known as "et-cos"); handles all CCD callbacks for England/Wales, Scotland, and Admin jurisdictions; also hosts the consolidated JSON CCD definitions under `ccd-definitions/`
- `apps/et/et-sya-api` — Spring Boot Java API for the self-represented claimant portal (SYA = Submit Your Appeal); creates and manages CCD cases on behalf of citizens; uses `hmcts.ccd.sdk` plugin
- `apps/et/et-sya-frontend` — Node/Express TypeScript frontend (port 3002) for citizens submitting ET1 claims
- `apps/et/et-syr-frontend` — Node/Express TypeScript frontend (port 3003) for respondents answering ET1 claims via the response hub
- `apps/et/et-hearings-api` — Spring Boot Java API (port 4560) integrating with HMC via Azure Service Bus topic to process hearing updates
- `apps/et/et-cron` — Helm chart that runs scheduled tasks using the `et-cos` jar image (e.g. `BatchReconfigurationTask`)
- `apps/et/et-wa-task-configuration` — Camunda DMN/BPMN files for Work Allocation task initiation, cancellation, and configuration
- `apps/et/et-wa-post-deployment-ft-tests` — Post-deployment functional tests for the Work Allocation path; publishes events to ASB and validates task creation
- `apps/et/et-xui-e2e-tests` — End-to-end Playwright tests exercising the ExUI caseworker interface
- `apps/et/et-ccd-case-migration` — Framework-based data migration tool for updating existing CCD cases when definitions change
- `apps/et/et-pet-api` — Legacy Ruby on Rails API (ET API) — the original JADU-replacement backend for ET1 and ET3 forms
- `apps/et/et-pet-et1` — Legacy Ruby on Rails frontend for citizens submitting ET1 claims (atet)
- `apps/et/et-pet-et3` — Legacy Ruby on Rails frontend for respondents filing ET3 responses
- `apps/et/et-pet-admin` — Legacy Ruby on Rails admin UI sharing the same Postgres/Redis as `et-pet-api`
- `apps/et/et-pet-ccd-export` — Legacy Ruby Sidekiq worker that exports cases from the PET stack into CCD via the `external_system_ccd` queue
- `apps/et/et-full-system` — Cucumber-based full-system integration test suite for the legacy PET stack
- `apps/et/et-full-system-servers` — Docker Compose orchestration (git submodules) for running all legacy PET components together
- `apps/et/et-shared-infrastructure` — Terraform definitions for shared Azure infrastructure (Key Vault, App Insights, etc.)
- `apps/et/et-slack-alerts` — Alert rules for Slack notifications
- `apps/et/et-performance` — Gatling Scala performance/load tests

## Architecture

The product has two execution paths that converge in CCD. The legacy PET path (Ruby): `et-pet-et1` and `et-pet-et3` frontends submit to `et-pet-api`, which persists to Postgres/Redis and queues an export job; `et-pet-ccd-export` drains that queue via Sidekiq and pushes cases to `ccd-data-store-api` using S2S + IDAM credentials. The `et-pet-admin` provides a back-office view over the same Postgres database.

The modern CFT path: Citizens use `et-sya-frontend` (ET1) and `et-syr-frontend` (ET3), both backed by `et-sya-api` (port 4550). `et-sya-api` directly calls `ccd-data-store-api` on behalf of the citizen and delegates document operations to CDAM (`case-document-am-api`). Notifications (submission confirmations, updates) go via GOV.UK Notify. `et-sya-api` uses the `hmcts.ccd.sdk` Gradle plugin but as a classpath scanner to pick up shared `uk.gov.hmcts.ccd.sdk` beans — it does not emit its own CCD definition; the definitions are all in `et-ccd-callbacks`.

Caseworkers access ET cases through ExUI, which invokes `et-ccd-callbacks` (the `et-cos` service, port 8081) for every CCD event lifecycle callback (`/aboutToStart`, `/aboutToSubmit`, `/submitted`). `et-ccd-callbacks` orchestrates document generation via Docmosis Tornado, sends notifications via GOV.UK Notify, and integrates with `rd-professional-api` and `case-document-am-api`. It uses a Postgres database with Flyway migrations for case reference tracking and internal queues.

`et-hearings-api` (port 4560) subscribes to the HMC Azure Service Bus topic (`hmc-to-hearings-api`) and processes hearing lifecycle notifications back into CCD. `et-cron` runs scheduled tasks (e.g. ACAS certificate retrieval, notice-of-change refresh) by invoking the `et-cos` jar with a `TASK_NAME` environment variable.

## CCD touchpoints

Case-type definitions are held as JSON under `et-ccd-callbacks/ccd-definitions/jurisdictions/`, split across three jurisdictions: `england-wales`, `scotland`, and `admin`. Each jurisdiction has its own case-type JSON (CaseField, CaseEvent, AuthorisationCaseEvent, WorkBasketInputFields, etc.). There is no config-generator emitting code; definitions are managed manually as JSON and converted to Excel for import using `ccd-definition-processor`. Local development uses `rse-cft-lib` (via `bootWithCCD`) embedded in `et-ccd-callbacks`.

CCD features in use: `noticeOfChangeAnswers` fields and `ChallengeQuestion` entries in Scotland/England-Wales definitions wire up the Notice of Change flow; `caseFlags` (`Flags` type) in `CaseField-CaseFlagsCaseLinking.json` enables case flags; `SearchCriteria` and `SearchParty` definitions enable Global Search; `CaseLink` fields (`createCaseLink`, `maintainCaseLink`) wire linked-cases; `WorkBasketInputFields` and `WorkBasketResultFields` directories in all three jurisdictions configure Work Allocation task visibility. `specific-access-*` roles appear in `RoleToAccessProfiles-WA.json`. Document categories are configured via `Categories.json` files per jurisdiction. HMC case fields (`CaseField-HMC-nonprod.json`, `EventToComplexTypes-HMC-nonprod.json`) wire hearings for non-production environments.

Callbacks are implemented in `et-ccd-callbacks` controllers under the `uk.gov.hmcts.ethos.replacement.docmosis.controllers` package. The application registers with CCD as microservice `et_cos` (S2S) and exposes callbacks at its public URL. A scheduled cron (`noticeOfChange: 0 */10 * * * ?`) polls and refreshes NoC fields periodically.

## External integrations

- `idam`: OAuth2 client id `et-cos` / `et-sya-api` / `et_hearings_api`; IDAM URL configured via `IDAM_API_URL`; RSE IdAM Simulator used in `cftlib` profile.
- `s2s`: `service-auth-provider` configured via `SERVICE_AUTH_PROVIDER_URL`; microservice names `ccd_gw` (et-cos legacy), `et_sya_api`, `et_hearings_api`.
- `am`: `am-role-assignment-service` not directly referenced in application YAML; role-to-access-profile definitions in CCD imply AM-backed RBAC.
- `rd`: `rd-professional-api` wired in `et-ccd-callbacks/application.yaml` at `${RD_PROFESSIONAL_API_URL}` (default port 4507); used for professional user lookups.
- `notify`: GOV.UK Notify via `gov-notify-api-key` / `GOV_NOTIFY_API_KEY` in both `et-ccd-callbacks` and `et-sya-api`; used for submission confirmations and case update notifications.
- `cdam`: `case-document-am-api` at `${CASE_DOCUMENT_AM_URL}` (default port 4455) in both `et-ccd-callbacks` and `et-sya-api`; handles secure document access.
- `cftlib`: `com.github.hmcts.rse-cft-lib` version `0.19.2084` in `et-ccd-callbacks`; provides `bootWithCCD` task and embedded CCD for local dev.
- `flyway`: Flyway migrations under `et-ccd-callbacks/src/main/resources/db/migration/` (V001–V005); manages case reference sequence tables for England/Wales and Scotland.
- Docmosis Tornado: third-party document rendering engine, not a controlled integration token; configured via `TORNADO_ACCESS_KEY` / `TORNADO_URL` in `et-ccd-callbacks` and `et-sya-api`.
- Azure Service Bus: `et-hearings-api` subscribes to the HMC topic `hmc-to-hearings-api`; connection configured via `HMC_HEARINGS_TOPIC_*` environment variables.
- ACAS API: `et-sya-api` calls `${ACAS_BASE_URL}` with an API key to fetch ACAS conciliation certificates during claim submission.

## Notable conventions and quirks

- `et-ccd-callbacks` is referred to as "et-cos" (Employment Tribunals Case Orchestration Service) in Spring application name, S2S microservice registration, jar name (`et-cos.jar`), and internal service URLs (`ET_COS_URL`).
- Three separate CCD jurisdictions (England/Wales, Scotland, Admin) each have independent JSON definition trees under the same repo; import scripts (`bin/import-ccd-definition.sh e|s|a`) handle them separately.
- The `hmcts.ccd.sdk` Gradle plugin appears in `et-sya-api` and `et-hearings-api` builds but is used as a bean scanning mechanism (via `scanBasePackages = {"uk.gov.hmcts.ccd.sdk", ...}`), not to emit CCD definitions — definitions all live as JSON in `et-ccd-callbacks`.
- The legacy PET stack (et-pet-*) is Ruby/Rails and shares a Postgres+Redis cluster with `et-pet-api` as the canonical database; `et-pet-ccd-export` is the bridge to CCD via Sidekiq.
- Timezone: `et-ccd-callbacks` sets the JVM timezone to `Europe/London` in `DocmosisApplication.init()`.
- Port conventions: `et-ccd-callbacks` at 8081, `et-sya-api` at 4550, `et-syr-frontend` at 3003, `et-sya-frontend` at 3002, `et-hearings-api` at 4560.
