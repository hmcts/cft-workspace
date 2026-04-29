---
service: sptribs
ccd_based: true
ccd_config: config-generator
ccd_features:
  - decentralised_ccd
  - case_flags
  - global_search
  - linked_cases
  - work_allocation_tasks
  - query_search
  - stitching
integrations:
  - idam
  - s2s
  - am
  - rd
  - notify
  - cdam
  - work_allocation
  - cftlib
  - flyway
  - send_letter
repos:
  - apps/sptribs/sptribs-case-api
  - apps/sptribs/sptribs-frontend
  - apps/sptribs/sptribs-dss-update-case-web
  - apps/sptribs/sptribs-e2etests
  - apps/sptribs/sptribs-shared-infrastructure
---

# Special Tribunals (sptribs)

Special Tribunals is the HMCTS service handling Criminal Injuries Compensation (CIC) tribunal cases (with scope to expand to other tribunal types such as Mental Health). It allows caseworkers to create, manage, and progress CIC tribunal cases through CCD (XUI), and provides two separate citizen-facing web journeys: one for submitting new DSS applications and one for updating existing cases.

## Repos

- `apps/sptribs/sptribs-case-api` — Spring Boot backend (port 4013); owns the CCC case type definition (via ccd-config-generator) and handles all CCD event callbacks
- `apps/sptribs/sptribs-frontend` — Node/Express caseworker-facing frontend (port 4000); primarily integrates with CCD/XUI flows for internal users
- `apps/sptribs/sptribs-dss-update-case-web` — Node/Express citizen-facing web app (port 3100) for the DSS Update Case journey; allows citizens and legal representatives to upload documents against an existing CCD case
- `apps/sptribs/sptribs-e2etests` — Playwright-based end-to-end test suite covering DSS Submit, DSS Update, and Case API UI flows; shared pipeline test runner
- `apps/sptribs/sptribs-shared-infrastructure` — Terraform-managed Azure infrastructure (App Insights, Key Vault, monitoring alerts)

## Architecture

At runtime, `sptribs-case-api` is the core backend. It registers the `CriminalInjuriesCompensation` case type under the `ST_CIC` jurisdiction with CCD using the `hmcts.ccd.sdk` config-generator plugin (`id 'hmcts.ccd.sdk' version '6.7.2'`). The service is declared decentralised (`decentralised = true` in `build.gradle`), meaning CCD routes callbacks for that case type to the API at `http://localhost:4013` (or its cluster URL in higher envs), configured via the environment variable `CCD_DECENTRALISED_CASE-TYPE-SERVICE-URLS_CriminalInjuriesCompensation`.

Caseworkers access the system through ExUI (`xui-manage-cases`), which calls CCD data-store, which in turn invokes callbacks on `sptribs-case-api`. The `sptribs-frontend` and `sptribs-dss-update-case-web` apps provide separate UI journeys that call `sptribs-case-api` directly (they are listed as S2S-authorised services: `sptribs_frontend` and `sptribs_dss_update_case_web`). Both node apps follow the standard HMCTS Express pattern with Redis for session storage and GOV.UK frontend components.

The case API publishes CCD case events onto an Azure Service Bus topic (`ccd-case-events-aat`) — `caseEventServiceBus = true` — which feeds the Work Allocation pipeline. It also calls `wa-task-monitor-api` and `wa-task-management-api` directly. A PostgreSQL database (with Flyway migrations under `src/main/resources/db/migration/`) stores correspondence data and anonymisation sequences.

## CCD touchpoints

Case-type definitions are emitted entirely through the `ccd-config-generator` SDK (plugin `hmcts.ccd.sdk`). The `generateCCDConfig` Gradle task runs the Spring app in `config-gen` profile to produce JSON under `ccd-definitions/definitions`, then `buildCCDXlsx` packages it into the CCD definition spreadsheet. The service is registered as decentralised and CCD routes all `CriminalInjuriesCompensation` callbacks to port 4013.

Case flags (`uk.gov.hmcts.ccd.sdk.type.Flags`) are present in the model (`RetiredFields.java` migrates legacy flag fields). Global Search is configured via a dedicated `SearchCriteria` class implementing `SearchCriteriaField`. `CaseLink` fields are used in `CaseData` for linked-case functionality. WorkBasket input/result fields are configured in `WorkBasketInputFields` and `WorkBasketResultFields`. Document bundling via `em-ccd-orchestrator` (stitching) is integrated through `BundlingService`.

Key callback event IDs for citizen DSS flows are declared in `application.yaml` under `caseinfo.apps`: `citizen-cic-create-dss-application`, `citizen-cic-submit-dss-application`, and `citizen-cic-dss-update-case`.

## External integrations

- `idam`: `idam-java-client` v3.0.5; OAuth2 client ID `sptribs-case-api`; system update user credentials injected from Key Vault
- `s2s`: `service-auth-provider-java-client` v5.3.3; microservice name `sptribs_case_api`; authorised services listed in `s2s-authorised.services`
- `am`: Role Assignment URL `${ROLE_ASSIGNMENT_URL}` (confirmed by `cftlibTest` environment and AM references in data-store S2S config)
- `rd`: Calls `rd-location-ref-api` (`/refdata/location/court-venues`) via `LocationClient`; calls `rd-judicial-api` via `JudicialClient` for judicial user lookups
- `notify`: `notifications-java-client` v6.0.0; extensive GOV.UK Notify template IDs defined in `application.yaml` under `uk.gov.notify.email.templatesCIC`
- `cdam`: `ccd-case-document-am-client` v1.59.2; document access managed via `CaseDocumentClientApi` Feign client pointing at `${case_document_am.url}`
- `work_allocation`: `wa_task_management_api.url` and `wa_task_monitor_api.url` configured in `application.yaml`; case events also streamed via Azure Service Bus
- `cftlib`: `com.github.hmcts.rse-cft-lib` v0.19.2017; `bootWithCcd` and `cftlibTest` tasks embed the full CFT stack in-process for local development and testing
- `flyway`: Migrations in `src/main/resources/db/migration/` (V1 creates correspondence table; V1.1 adds anonymisation sequence)
- `send_letter`: `send-letter-service` URL wired via `${SEND_LETTER_SERVICE_BASEURL}` in `application.yaml`

## Notable conventions and quirks

- The `ccd { decentralised = true }` and `caseEventServiceBus = true` flags in `build.gradle` are the canonical signals for decentralised CCD registration and WA event streaming respectively.
- The `pr-values:wa` and `pr-values:wa-ft-tests` GitHub PR labels are used to gate Work Allocation pods and functional tests in preview environments.
- The `enable_ccd_diff` label triggers a workflow that diffs the generated CCD definition JSON between branches — useful for reviewing config-generator output changes.
- `sptribs-e2etests` tests all three applications (DSS Submit, DSS Update, Case API/XUI) in a single Playwright repo rather than per-app test suites; each app's test suite is invokable independently via separate yarn commands.
- Java 21 (distroless base image `hmctsprod.azurecr.io/base/java:21-distroless`); node apps use Node 18+ / Yarn 4.
- Camunda external task client v7.24.0 is included as a dependency, suggesting some process/task automation beyond standard WA task management.
