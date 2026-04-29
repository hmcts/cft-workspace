---
service: civil
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
  - categories
  - query_search
  - specific_access
  - stitching
integrations:
  - idam
  - s2s
  - am
  - rd
  - payment
  - notify
  - cdam
  - work_allocation
  - send_letter
  - flyway
repos:
  - apps/civil/civil-service
  - apps/civil/civil-ccd-definition
  - apps/civil/civil-camunda-bpmn-definition
  - apps/civil/civil-citizen-ui
  - apps/civil/civil-orchestrator-service
  - apps/civil/civil-wa-task-configuration
  - apps/civil/civil-rtl-export
  - apps/civil/civil-sdt
  - apps/civil/civil-sdt-commissioning
  - apps/civil/civil-sdt-common
  - apps/civil/civil-sdt-gateway
  - apps/civil/civil-operations
  - apps/civil/civil-performance
  - apps/civil/civil-wiremock-mappings
---

# Civil

Civil is the HMCTS service for money claims and civil disputes. It handles the full lifecycle of county court civil claims — from claim submission and defendant response through to hearings, judgments, and enforcement — covering both legally-represented (LR) and litigant-in-person (LiP) journeys. The service also supports general applications (GA), certificate of satisfaction (CoS), and bulk claims via the SDT (Secure Data Transfer) subsystem.

## Repos

- `apps/civil/civil-service` — Spring Boot CCD callback service (port 4000); the core backend handling all CCD events, state machine logic, document generation, and Camunda-driven notifications
- `apps/civil/civil-ccd-definition` — JSON CCD case-type definitions for the `CIVIL` and `generalapplication` case types, plus E2E tests
- `apps/civil/civil-camunda-bpmn-definition` — Camunda BPMN process definitions; drives scheduled jobs (deadlines, notifications, hearing notices) and complex multi-step flows
- `apps/civil/civil-citizen-ui` — Express/TypeScript citizen-facing frontend (port 3001) for LiP claimant and defendant journeys
- `apps/civil/civil-orchestrator-service` — Spring Boot orchestration service for bulk claims (port 9090)
- `apps/civil/civil-wa-task-configuration` — DMN and configuration for Work Allocation task assignment rules
- `apps/civil/civil-rtl-export` — Spring Boot service for real-time legal exports (port 4550)
- `apps/civil/civil-sdt` — Civil SDT application; secure data transfer for bulk claim submission
- `apps/civil/civil-sdt-commissioning` — SDT commissioning service (port 4750)
- `apps/civil/civil-sdt-common` — Shared library used by SDT services
- `apps/civil/civil-sdt-gateway` — SDT gateway service exposing the SDT API
- `apps/civil/civil-operations` — Postman collections and DB queries for debugging civil and CMC cases
- `apps/civil/civil-performance` — Gatling/CMC performance test scripts for claimant and defendant journeys
- `apps/civil/civil-wiremock-mappings` — Shared WireMock stub mappings used across civil repos for preview and testing environments

## Architecture

`civil-service` is the central backend. CCD routes all case events to its callback endpoints (configured via `CCD_DEF_CASE_SERVICE_BASE_URL` in the definition build). The service implements a Spring State Machine (`StateFlow`) that governs allowed transitions per case state, and exposes callback handlers for about/submit/mid-event phases. Camunda BPMN processes in `civil-camunda-bpmn-definition` are deployed alongside and invoke external service tasks back into `civil-service`, which drives notifications (via GOV.UK Notify), document generation (Docmosis Tornado), deadline enforcement, and hearing schedule management.

`civil-citizen-ui` is a separate Express frontend that communicates directly with `civil-service` and with CCD's data store. It serves the LiP journeys for claimants and defendants and shares IDAM/CCD helper scripts with the definition repo via `bin/pull-latest-civil-shared.sh`. The professionally-represented journeys are served by the standard ExUI (`manage-case-ui`).

The `civil-orchestrator-service` handles bulk claim submission flows, pulling from the SDT cluster (`civil-sdt`, `civil-sdt-gateway`, `civil-sdt-commissioning`) which provides a SOAP/REST gateway for bulk filers. `civil-rtl-export` handles exports to downstream legal reporting systems. `civil-wa-task-configuration` DMN tables are deployed to Camunda and govern how WA tasks are routed to caseworkers.

Preview environments are created per PR; each environment pulls the latest CCD definition release, Camunda BPMN definitions, and WireMock mappings. The `disableWiremock` PR label switches from stubs to live AAT service endpoints.

## CCD touchpoints

Civil uses **centralised** CCD registration with JSON definitions. The `civil-ccd-definition` repo holds two case types under `ccd-definition/civil/` and `ccd-definition/generalapplication/`. Definitions are built into XLS spreadsheets by `bin/build-civil-xlsx-definitions.sh` and imported at deploy time; `civil-service`'s Gradle build orchestrates this via the `buildCcdDefinitionsXls` task.

CCD features wired up: Notice of Change events (`NOC_REQUEST`, `APPLY_NOC_DECISION`) are defined in `UserEvents-NoticeOfChange.json` with challenge questions in `ChallengeQuestion/ChallengeQuestion.json`. Case flags (`Flags` field type) are configured on `Party`, `LitigationFriend`, and in `CaseField-CaseFlags.json`. Global Search is enabled via `CaseFieldGS.json` (`SearchCriteria` field) and `SearchParty/SearchParty.json`. CaseLink fields link general application cases back to parent civil cases. WorkBasket input/result fields are defined, feeding WA task configuration. Document categories are defined in `Categories/*.json`. Specific-access roles (`specific-access-legal-ops`, `specific-access-judiciary`, etc.) appear in `RoleToAccessProfiles.json`. The `QueryManagement` case type tab and related fields support the query management UI component.

`civil-service` exposes CCD callbacks on port 4000 for about-to-start, about-to-submit, and submitted phases. The HMC API is called for hearing data (`HMC_API_URL`). Bundle stitching is called via `EM_CCD_ORCHESTRATOR_URL/api/stitch-ccd-bundles`.

## External integrations

- `idam`: `idam-java-client:3.0.5` in `civil-service/build.gradle`; OAuth2 client configured in `application.yaml` against `IDAM_API_URL`
- `s2s`: `service-auth-provider-java-client:4.1.2`; microservice name `civil_service`, secret from `CIVIL_CLIENT_TOTP_SECRET`
- `am`: `role-assignment-service.api.url` (`ROLE_ASSIGNMENT_URL`) called for case-level role assignments
- `rd`: `rd_professional.api.url` (`RD_PROFESSIONAL_API_URL`) and `rd_professional.url` (`GENAPP_LRD_URL`) for location and professional reference data
- `payment`: `payments-java-client:1.6.7`; `payments.api.url` (`PAYMENTS_API_URL`), site IDs `AAA7`/`AAA6`
- `notify`: `notifications-java-client:5.2.1-RELEASE`; `notifications.govNotifyApiKey` (`GOV_NOTIFY_API_KEY`); templates catalogued in `docs/email-notifications.md`
- `cdam`: `case_document_am.url` (`CASE_DOCUMENT_AM_URL`); health indicator present in `application.yaml`
- `work_allocation`: `task-management.api.url`; Camunda external service tasks feed WA; DMN rules live in `civil-wa-task-configuration`
- `send_letter`: `send-letter.url` (`SEND_LETTER_URL`); used for postal correspondence
- `flyway`: migrations under `src/main/resources/db/migration/`; enabled via `REFERENCE_DATABASE_MIGRATION` env var

## Notable conventions and quirks

- `civil-service` runs on port **4000**; `civil-citizen-ui` on **3001**; `civil-orchestrator-service` on **9090**; SDT commissioning on **4750**.
- The CCD definition build embeds the callback service URL at build time (`CCD_DEF_CASE_SERVICE_BASE_URL`) — preview environments set this to `http://civil-service-pr-<CHANGE_ID>-java`.
- A `civilDefinitionBranch:<branch>` PR label on `civil-service` PRs directs the preview environment to pull a specific `civil-ccd-definition` branch.
- Docmosis Tornado is used for document generation (not a controlled taxonomy token); the API key expires monthly for trial accounts.
- LaunchDarkly is used for feature toggles (`LAUNCH_DARKLY_SDK_KEY`); `LAUNCH_DARKLY_OFFLINE_MODE=true` for local dev.
- The email notification catalogue (`docs/email-notifications.md`) is auto-generated and verified in CI; it cross-references Camunda BPMN files with Notify template IDs.
- Camunda schedules ~30 timer-driven jobs (deadline checks, hearing notices, mediation CSV exports, etc.) — see the schedule table in `civil-camunda-bpmn-definition/README.md`.
- The SDT subsystem (`civil-sdt*`) is a separate cluster for bulk claim filers and communicates via SOAP-style contracts independently of the main CCD flow.
