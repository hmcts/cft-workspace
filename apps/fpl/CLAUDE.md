---
service: fpl
ccd_based: true
ccd_config: json
ccd_features:
  - notice_of_change
  - global_search
  - linked_cases
  - work_allocation_tasks
  - query_search
  - case_assignment
  - roles_access_management
integrations:
  - idam
  - s2s
  - am
  - rd
  - payment
  - send_letter
  - notify
  - cdam
  - cftlib
  - flyway
api_specs:
  - apps/fpl/fpl-ccd-configuration:fpla-case-service.json
  - apps/fpl/fpl-ccd-configuration:fpl-cafcass-api.json
repos:
  - apps/fpl/fpl-ccd-configuration
  - apps/fpl/fpl-ccd-data-migration-tool
  - apps/fpl/fpl-wa-task-configuration
---

# Family Public Law (FPL)

Family Public Law is the HMCTS digital service for public law family proceedings — primarily care and supervision orders, emergency protection orders, and placement applications. Local authority social workers and legal teams submit applications through XUI, and the service manages the full court workflow from application through to final order. It is built around a single CCD case type (`CARE_SUPERVISION_EPO`) in the `PUBLICLAW` jurisdiction.

## Repos

- `apps/fpl/fpl-ccd-configuration` — The core service: Spring Boot backend (`fpl_case_service`) implementing all CCD callbacks, plus the JSON CCD case-type definition (`ccd-definition/`) and Playwright/Codecept E2E tests.
- `apps/fpl/fpl-ccd-data-migration-tool` — A standalone Spring Boot runner that implements `ccd-case-migration-starter`, used to batch-migrate case data by triggering the `migrateCase` CCD event on filtered cases.
- `apps/fpl/fpl-wa-task-configuration` — Camunda DMN files that drive Work Allocation task initiation, configuration, completion, cancellation, permissions, and type definitions for the `PUBLICLAW/CARE_SUPERVISION_EPO` case type.

## Architecture

The `fpl-ccd-configuration` service (`fpl_case_service`) runs on port 4000 and acts as the CCD callback host for all case events. CCD's data-store calls it on `about-to-start`, `mid-event`, `about-to-submit`, and `submitted` hooks at paths like `/callback/<event>/about-to-submit`. CCD definition files (under `ccd-definition/`) are packaged into an Excel spreadsheet by `bin/fpl-process-definition.sh` and imported into `ccd-definition-store-api` during deployment. The `bootWithCCD` Gradle task (via `rse-cft-lib`) brings up the full CFT stack locally using AAT credentials fetched from Azure Key Vault (`fpl-aat`).

Work Allocation is handled indirectly: the service triggers a `create-work-allocation-task` dummy CCD event (via `WorkAllocationTaskService`) that writes a sentinel field (`lastCreatedWATask`), which Camunda DMN rules in `fpl-wa-task-configuration` pick up to create tasks in `wa-task-management-api`. The DMN files cover the full task lifecycle for `CARE_SUPERVISION_EPO`.

The data migration tool (`fpl-ccd-data-migration-tool`) operates as a separate CLI process — not a running service — that authenticates as the FPL system user, fetches cases from `ccd-data-store-api`, and triggers the `migrateCase` event. The actual migration logic lives as a callback in `MigrateCaseController` within `fpl-ccd-configuration`. Case ID targeting is via a mapping env var (`CASE_ID_LIST_MAPPING`) or an Elasticsearch query.

## CCD touchpoints

FPL uses a centralised CCD definition (JSON files under `ccd-definition/`), processed into an Excel sheet and uploaded to `ccd-definition-store-api` by Jenkins. There is no config-generator SDK usage — all case fields, events, states, roles, and authorisations are expressed in JSON. The single case type is `CARE_SUPERVISION_EPO` in jurisdiction `PUBLICLAW`. A second minimal shared-storage definition exists under `ccd-definition/CaseField/SharedStorage/`.

CCD features wired in include: Notice of Change (a `NoticeOfChangeController` handles callbacks; `ChallengeQuestion.json` defines the verification questions; `case-assignment.api.url` points to `aac-manage-case-assignment`); linked cases (`caseLinks` field using `CaseLink` type and `LinkedCasesComponentLauncher`); Global Search (`SearchParty.json` maps respondents and children); WorkBasket inputs and results configured for case list views; `SearchInputFields.json`/`SearchResultFields.json` for CCD search. Role assignment is queried via `AmApi` (calling `am-role-assignment-service`).

Custom CCD callbacks are extensive — over 100 controllers handle individual case events. Key patterns: `about-to-submit` callbacks perform validation and data enrichment; `submitted` callbacks trigger notifications (GOV.UK Notify), generate documents (Docmosis Tornado via `docmosis.tornado.url`), and dispatch letters (`send-letter-client`). The service also exposes a Cafcass-facing REST API (`/cases/...`) documented in `fpl-cafcass-api.json`.

## External integrations

- `idam`: `idam-java-client` (`com.github.hmcts:idam-java-client`) used for system-user login and token validation; microservice ID `fpl_case_service`.
- `s2s`: `service-auth-provider-java-client`; secrets in `fpl-${env}` and `s2s-${env}` Key Vault entries.
- `am`: `AmApi` Feign client calls `am_role_assignment.api.url` to check and create role assignments.
- `rd`: `OrganisationApi` calls `rd_professional.api.url`; optional judicial/staff APIs at `rd_judicial.api.url` and `rd_staff.api.url` (feature-toggled).
- `payment`: `payment.api.url` used for case submission fees; `fees-register.api.url` for fee lookups; many fee codes configured per order type.
- `send_letter`: `send-letter-client` (`com.github.hmcts:send-letter-client`) used via `SendLetterService`/`SendDocumentService` for bulk print dispatch.
- `notify`: `notifications-java-client` (`uk.gov.service.notify`) used throughout for emails to local authorities, courts, CAFCASS, and parties.
- `cdam`: `ccd-case-document-am-client` (`com.github.hmcts:ccd-case-document-am-client`) at `case_document_am.url` for document access management.
- `cftlib`: `com.github.hmcts.rse-cft-lib` plugin in `service/build.gradle`; `bootWithCCD` task for local development.
- `flyway`: Flyway core + PostgreSQL dialect present; migrations under `service/src/main/resources/db/migration/`; Quartz scheduler also uses a PostgreSQL-backed job store (`fpl_scheduler` database).

## Notable conventions and quirks

- The root `build.gradle` in `fpl-ccd-configuration` is largely a placeholder — the real build is in the `service/` subproject. The root script exists so the Jenkins pipeline can detect the Java version (`JavaLanguageVersion.of(21)`).
- CCD definition Excel files are generated by `bin/fpl-process-definition.sh` and archived as Jenkins artifacts for each PR (`ccd-fpl-preview-<PR_ID>-toggle-on.xlsx`, `-toggle-off.xlsx`, `-shuttered.xlsx`). Toggle-on and toggle-off variants accommodate LaunchDarkly feature flags — the definition itself references feature-gated fields/events.
- The service uses Docmosis Tornado for PDF document generation (orders, notices of proceedings, etc.) — not em-stitching. The Tornado key is a required secret (`docmosis-api-key` in Key Vault).
- `fpl-ccd-data-migration-tool` is an operational tool, not a deployed service. It has no Helm chart; it is run ad-hoc as a JAR with environment-specific parameters.
- The Cafcass API (`/cases/...`) is authenticated via a custom interceptor (`CafcassApiInterceptor`) and publishes its own separate OpenAPI spec (`fpl-cafcass-api.json`) distinct from the legacy callback spec (`fpla-case-service.json`).
- The `fpla-case-service.json` spec in `platops/cnp-api-docs` appears to be a legacy Swagger 2.0 snapshot; no active publishing workflow was found in the current `.github/workflows/` — the spec reflects an older version of the service API.
