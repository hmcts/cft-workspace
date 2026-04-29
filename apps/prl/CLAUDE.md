---
service: prl
ccd_based: true
ccd_config: json
ccd_features:
  - notice_of_change
  - case_flags
  - global_search
  - linked_cases
  - hearings
  - roles_access_management
  - work_allocation_tasks
  - specific_access
  - reasonable_adjustments
  - query_search
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
  - bulk_print
repos:
  - apps/prl/prl-cos-api
  - apps/prl/prl-citizen-frontend
  - apps/prl/prl-ccd-definitions
  - apps/prl/prl-dgs-api
  - apps/prl/prl-wa-task-configuration
  - apps/prl/prl-ccd-case-migration
  - apps/prl/prl-cftlib-wa
  - apps/prl/prl-dev-env
  - apps/prl/prl-e2e-tests
  - apps/prl/prl-performance
  - apps/prl/prl-shared-infrastructure
---

# PRL — Private Family Law

PRL (Private Law) is the HMCTS digital service for private family law proceedings. It handles two main application types: C100 (child arrangements / prohibited steps / specific issue orders) and FL401 (domestic abuse non-molestation and occupation orders). Solicitors and litigants in person apply through ExUI (case workers / solicitors) or the citizen-facing frontend; case orchestration, document generation, notifications, and integration with courts, Cafcass, and third parties are managed by the `prl-cos-api` backend.

## Repos

- `apps/prl/prl-cos-api` — Spring Boot case orchestration service; the CCD callback handler and integration hub for the entire product
- `apps/prl/prl-citizen-frontend` — Node/Express frontend at `https://privatelaw.aat.platform.hmcts.net` for litigants in person (port 3001 locally)
- `apps/prl/prl-ccd-definitions` — JSON CCD case-type definitions for the `PRLAPPS` case type; built into an Excel spreadsheet via `ccd-definition-processor`
- `apps/prl/prl-dgs-api` — Document generation service; wraps Docmosis to render Word templates into PDFs and stores them via CDAM (port 4007)
- `apps/prl/prl-wa-task-configuration` — Camunda/Spring Boot service that configures Work Allocation task initiation and completion rules (port 4090)
- `apps/prl/prl-ccd-case-migration` — One-shot Gradle runnable for data migrations against existing CCD cases; based on the `ccd-case-migration-starter` framework
- `apps/prl/prl-cftlib-wa` — Docker Compose + Gradle helper project that adds Work Allocation (Camunda, `wa-task-management-api`) to the local cftlib development environment, simulating Azure Service Bus with a scheduled database copy
- `apps/prl/prl-dev-env` — Shell-script local dev environment initialiser; clones the CCD definition repo, starts CCD services, and imports definitions
- `apps/prl/prl-e2e-tests` — Playwright TypeScript end-to-end test suite covering solicitor and citizen journeys; tagged `@smoke`, `@nightly`, `@regression`
- `apps/prl/prl-performance` — Performance/load test scripts
- `apps/prl/prl-shared-infrastructure` — Terraform for shared Azure infrastructure (App Insights, Key Vault, Azure Monitor)

## Architecture

`prl-cos-api` (port 4044) is the central backend. It is registered with CCD as a callback service and receives `about-to-start`, `about-to-submit`, and `submitted` callbacks for all case events in `PRLAPPS`. It orchestrates all downstream calls: document generation via `prl-dgs-api`, payments via the Fees & Pay API, notifications via GOV.UK Notify and SendGrid, letters via `send-letter-service`, document storage via CDAM (`ccd-case-document-am-api`), hearing data via `fis-hmc-api`, role assignments via `am-role-assignment-service`, and reference data via `rd-professional-api`, `rd-location-ref-api`, `rd-caseworker-ref-api`, and `rd-judicial-api`.

`prl-citizen-frontend` provides the citizen journey (C100 online application, respondent response, task list). It calls `prl-cos-api` directly for case data and orchestration — it does not write to CCD independently. The citizen frontend is served at port 3001; it supports Welsh language throughout (bilingual Notify templates and Welsh document variants).

`prl-dgs-api` accepts a template name and JSON placeholder data, renders the document using Docmosis, and saves the result to CDAM. `prl-cos-api` calls it at `${PRL_DGS_API_URL}` for every document generation event (C100, FL401, and all court orders — over 80 named template configurations in `application.yaml`).

Work Allocation is wired through CCD event stream: `prl-cos-api` triggers system events that feed the WA pipeline, and `prl-wa-task-configuration` holds the Camunda DMN rules and Spring Boot configuration service that dictates task creation, role assignment, and cancellation. For local development, `prl-cftlib-wa` simulates the Azure Service Bus message queue by polling `message_queue_candidates` in PostgreSQL.

## CCD touchpoints

The case type is `PRLAPPS` in the `PRIVATELAW` jurisdiction. CCD definitions are managed as JSON source files in `prl-ccd-definitions/definitions/private-law/json/` and compiled to XLS via the `ccd-definition-processor` Node submodule (`yarn generate-excel-aat` etc.). There is no config-generator Java SDK usage — all definitions are hand-authored JSON. PR testing cross-links with `prl-cos-api` via the `pr-defs:pr-NNNN` label convention.

CCD features wired up:
- **Notice of Change**: `CaseField/NoticeOfChange/` JSON files define `NOCRequest` and `NoticeOfChangeParties` fields; `prl-cos-api` has a `NoticeOfChangeController` and `NoticeOfChangePartiesService` that call `aca:` (`aac-manage-case-assignment` at `${ACA_SERVICE_API_BASEURL}`).
- **Case Flags (v2.1)**: Extensive per-party flag fields for both C100 and FL401 applicants, respondents, solicitors, and barristers defined under `CaseField/case-flags-2-1/`. A `CaseFlagsController` in `prl-cos-api` handles `/setup-wa-task` and `/check-wa-task-status` callbacks.
- **Global Search**: `SearchCriteria` field and `SearchParty.json` configured for applicant/respondent name, DOB, email, and address lookup across both C100 and FL401 case types. `SearchInputFields.json` and `SearchResultFields.json` also present.
- **Linked Cases**: `CaseField/CaseLinking/` defines a `CaseLink`-typed field and `maintainCaseLinksFlag`.
- **Hearings**: `prl-cos-api` integrates with `fis-hmc-api` (configured at `${HEARING_API_BASEURL}`); hearing status fields and `HearingTaskData`/`NextHearingDetails` CaseField groups are defined in the CCD JSON.
- **Roles & Access Management**: `am-role-assignment-service` is called from `prl-cos-api` (configured at `${AM_ROLE_ASSIGNMENT_API_URL}`). `RoleToAccessProfiles` JSON includes `specific-access-judiciary`, `specific-access-legal-ops`, `specific-access-admin`, and `specific-access-ctsc` roles.
- **Work Allocation**: `WorkBasketInputFields.json` and `WorkBasketResultFields.json` are present; WA tasks are triggered via CCD system events from `prl-cos-api`.
- **Reasonable Adjustments**: `reviewLangAndSmReq` fields under `case-flags-2-1/`; `ReasonableAdjustmentsController` in `prl-cos-api` for citizen-submitted support needs.

## External integrations

- `idam`: `prl-cos-api` authenticates users via `https://idam-api.aat.platform.hmcts.net`; client ID `prl-cos-api` / `xuiwebapp`; system-update user credentials for background processing.
- `s2s`: `prl-cos-api` microservice name `prl_cos_api`; S2S token obtained from `${AUTH_PROVIDER_SERVICE_CLIENT_BASEURL}`.
- `am`: `am-role-assignment-service` called from `prl-cos-api` at `${AM_ROLE_ASSIGNMENT_API_URL}` for case-level role assignments.
- `rd`: Calls `rd-professional-api` (PBA validation), `rd-location-ref-api` (court lookup), `rd-caseworker-ref-api` (staff details), `rd-judicial-api` (judicial user lookup), and `rd-commondata-api` (hearing type reference data).
- `payment`: Fees & Pay API at `${PAY_URL}`; fees looked up via `fees-register-api`; supports C100 submission fee, C2 applications, and multiple other fee codes.
- `send_letter`: `send-letter-service` at `${SEND_LETTER_URL}` for postal service of orders and FM5 forms to litigants in person.
- `notify`: GOV.UK Notify for email; separate English and Welsh templates for 60+ notification scenarios. SendGrid is used in parallel for order serving, SOA documents, and FM5 reminders.
- `cdam`: `ccd-case-document-am-client` library (`ccd-case-document-am-api` at `${CCD_CASE_DOCS_AM_API}`) for all document uploads — both `prl-cos-api` (generated orders) and `prl-dgs-api` (Docmosis output).
- `cftlib`: `rse-cft-lib` Gradle plugin (`com.github.hmcts.rse-cft-lib`) in `prl-cos-api` enables `bootWithCCD` local development target; `prl-cftlib-wa` extends this with WA services.
- `bulk_print`: `BulkPrintService` used in `prl-cos-api` for physical serving of FM5 forms and orders to unrepresented parties via `send-letter-service`.

## Notable conventions and quirks

- The CCD definition repo cross-references `prl-cos-api` PR images via the `pr-cos:pr-NNNN` GitHub label; the inverse label `pr-defs:pr-NNNN` is used in `prl-cos-api` to pull a specific definitions PR. This two-way label convention is central to preview environment testing.
- Welsh language support is first-class: `prl-cos-api` holds over 80 Welsh document template pairs, and the citizen frontend supports a Welsh journey. Translation is handled through separate bilingual templates rather than via `ts-translation-service`.
- The `fis-hmc-api` (at `http://fis-hmc-api-aat.service.core-compute-aat.internal`) is an intermediate hearing management wrapper, not a direct call to `hmc-cft-hearing-service`.
- Work Allocation tasks are created by triggering CCD system events from within `prl-cos-api` callbacks, not by direct calls to `wa-task-management-api`. `prl-wa-task-configuration` holds the Camunda task configuration that drives task initiation rules.
- ACRO SFTP integration (crime reference lookup) is configured in `application.yaml` with a cron job that is disabled by default; it exports case data via password-protected ZIP to a remote SFTP server.
- The document bundle endpoint (`bundle.api.url`) supports hearing bundle preparation via `em-ccd-orchestrator` (the `BundleApiClient` feign client), not `em-stitching-api` directly.
