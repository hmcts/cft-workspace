---
service: ia
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
  - query_search
integrations:
  - idam
  - s2s
  - am
  - rd
  - payment
  - notify
  - cdam
  - flyway
api_specs:
  - apps/ia/ia-case-api:ia-case-api.json
  - apps/ia/ia-case-access-api:ia-case-access-api.json
  - apps/ia/ia-case-documents-api:ia-case-documents-api.json
  - apps/ia/ia-case-notifications-api:ia-case-notifications-api.json
  - apps/ia/ia-case-payments-api:ia-case-payments-api.json
  - apps/ia/ia-home-office-integration-api:ia-home-office-integration-api.json
  - apps/ia/ia-timed-event-service:ia-timed-event-service.json
repos:
  - apps/ia/ia-aip-frontend
  - apps/ia/ia-appeal-frontend
  - apps/ia/ia-bail-case-api
  - apps/ia/ia-case-access-api
  - apps/ia/ia-case-api
  - apps/ia/ia-case-documents-api
  - apps/ia/ia-case-notifications-api
  - apps/ia/ia-case-payments-api
  - apps/ia/ia-ccd-definitions
  - apps/ia/ia-cron-config
  - apps/ia/ia-hearings-api
  - apps/ia/ia-home-office-integration-api
  - apps/ia/ia-home-office-mock-api
  - apps/ia/ia-task-configuration
  - apps/ia/ia-timed-event-service
  - apps/ia/ia-wa-post-deployment-ft-tests
---

# Immigration & Asylum (IA)

The Immigration & Asylum product is the HMCTS digital service for managing immigration and asylum appeals and bail applications. It supports appellants, legal representatives, case officers, and tribunal judges through every stage of the appeal lifecycle — from initial submission through hearings, decisions, and applications to the First-tier Tribunal Procedure and Appeals (FTPA). There are two distinct user-facing journeys: one for legally represented appellants via the XUI case worker interface, and one for unrepresented appellants via the public-facing AiP (Appellant in Person) frontend.

## Repos

- `apps/ia/ia-case-api` — core Spring Boot CCD callback service for asylum appeals; the central orchestrator that fans out to downstream APIs on each CCD event
- `apps/ia/ia-bail-case-api` — separate Spring Boot callback service handling bail application case events
- `apps/ia/ia-appeal-frontend` — static content (images) hosting for CCD definitions configuration
- `apps/ia/ia-aip-frontend` — Node/Express public-facing frontend for unrepresented appellants (AiP), talks directly to CCD
- `apps/ia/ia-ccd-definitions` — JSON CCD case-type definitions for both `Asylum` and `Bail` case types
- `apps/ia/ia-case-documents-api` — Spring Boot service generating case documents via Docmosis; handles document-related CCD callbacks
- `apps/ia/ia-case-notifications-api` — Spring Boot service sending GOV.UK Notify emails and SMSes on case events
- `apps/ia/ia-case-payments-api` — Spring Boot service integrating with Fees & Pay and Professional Reference Data for hearing fee payments
- `apps/ia/ia-case-access-api` — Spring Boot service exposing a `POST /supplementary-details` endpoint so Liberata can query CCD case data for reconciliation
- `apps/ia/ia-hearings-api` — Spring Boot service integrating IA case events with the Hearings Management Component (HMC) via Azure Service Bus
- `apps/ia/ia-home-office-integration-api` — Spring Boot service calling the Home Office ATLAS API to validate appeals and send directions/notifications
- `apps/ia/ia-home-office-mock-api` — Spring Boot mock of the Home Office API for lower environments where ATLAS is unavailable
- `apps/ia/ia-timed-event-service` — Spring Boot scheduler using Quartz/PostgreSQL to trigger CCD events at a future date and time
- `apps/ia/ia-task-configuration` — Camunda DMN files defining Work Allocation task initiation, configuration, permissions, and completion rules for the IA asylum jurisdiction
- `apps/ia/ia-cron-config` — Helm chart running scheduled cron jobs using the `ia-hearings-api` image
- `apps/ia/ia-wa-post-deployment-ft-tests` — post-deployment functional tests that create CCD cases and publish Azure Service Bus messages to smoke-test the Work Allocation pipeline

## Architecture

`ia-case-api` (port 8090) is the primary CCD callback handler for the `Asylum` case type. For most events, the `aboutToSubmit` callback fans out in sequence to `ia-case-documents-api` (`/asylum/ccdAboutToSubmit`), `ia-case-notifications-api` (`/asylum/ccdAboutToSubmit` and `ccdSubmitted`), `ia-case-payments-api` (`/asylum/ccdAboutToSubmit`), and `ia-hearings-api` (`/asylum/ccdAboutToSubmit`). `ia-home-office-integration-api` is called for events that need to notify or validate against the Home Office ATLAS system. `ia-timed-event-service` is called to schedule deferred CCD events (due-date reminders, state transitions). `ia-bail-case-api` (port 8686) mirrors this pattern for the `Bail` case type.

The two frontends occupy separate channels. `ia-appeal-frontend` is a minimal static-asset host used for images embedded in CCD definition tabs. `ia-aip-frontend` (port 3000) is a full Express application that allows unrepresented appellants to self-serve — it authenticates via IDAM and submits CCD events directly to `ccd-data-store-api` at the `CCD_API_URL`, uploading documents through CDAM (`CASE_DOCUMENT_AM_URL` port 4455).

`ia-hearings-api` (port 8100) bridges IA's case events with HMC. It calls the HMC API at `HMC_API_URL` (port 4561) and subscribes to the `hmc-to-cft` Azure Service Bus topic to receive listing updates from HMC back into CCD case data. `ia-task-configuration` provides the seven Camunda DMN files loaded by the Work Allocation task engine; they drive task lifecycle based on CCD event messages published on the Azure Service Bus.

## CCD touchpoints

CCD definitions are maintained as JSON in `ia-ccd-definitions/definitions/appeal/json/` and `definitions/bail/json/`. These are converted to Excel spreadsheets via a `ccd-definition-processor` submodule and imported into `ccd-definition-store-api`. Case type IDs are `Asylum` (jurisdiction `IA`) and `Bail`. The definitions include `SearchCriteria.json` and `SearchParty.json` (global search), `WorkBasketInputFields.json` and `WorkBasketResultFields.json` (work allocation), `SearchInputFields.json` and `SearchResultFields.json` (query search), a `caseLinks` field of type `CaseLink` (linked cases), and a `caseFlags` field of type `Flags` (case flags). Notice of Change is wired: `ia-case-api` implements `nocRequest`, `removeRepresentation`, and `removeLegalRepresentative` events calling `aac-manage-case-assignment` at `assign_case_access_api_url`.

`ia-case-api` calls `am-role-assignment-service` at `/am/role-assignments` and `/am/role-assignments/query` to assign and query case-level roles (e.g. Appellant, Legal Representative). The `ia-task-configuration` DMN files use CCD publish flags to gate which events generate Work Allocation tasks, consumed by the WA task management API.

## External integrations

- `idam`: OAuth2 OIDC flows in `ia-case-api` via `OPEN_ID_IDAM_URL`; `ia-aip-frontend` uses `IDAM_API_URL` and `IDAM_WEB_URL` for citizen login.
- `s2s`: `service-auth-provider-java-client` used across all Spring Boot services for inter-service S2S tokens; microservice name `iac`.
- `am`: `ia-case-api` calls `role-assignment-service` at `${ROLE_ASSIGNMENT_URL}` via a Feign client at `/am/role-assignments`.
- `rd`: `ia-case-api` and `ia-case-payments-api` call `rd-professional-api` at `${PROF_REF_DATA_URL}` to look up organisations and users.
- `payment`: `ia-case-payments-api` calls `fees-register-api` and `payment-api` to calculate and record hearing fees.
- `notify`: `ia-case-notifications-api` uses `notifications-java-client` (`uk.gov.service.notify`) with separate keys for asylum (`IA_GOV_NOTIFY_KEY`) and bail (`IA_BAIL_GOV_NOTIFY_KEY`).
- `cdam`: both `ia-case-api` and `ia-case-documents-api` route document access through CDAM at `${CASE_DOCUMENT_AM_URL}` (port 4455).
- `flyway`: `ia-case-api` manages its PostgreSQL schema (`ia_case_api`) via Flyway migrations under `src/main/resources/db/migration/`; `ia-timed-event-service` does the same for its Quartz scheduler schema.

## Notable conventions and quirks

- `ia-case-api` uses a **compatibility validation script** (`yarn validate` in the repo root) that cross-checks source code field usage against the current production CCD definitions before release — unusual for HMCTS service teams and guards against writing to undefined fields.
- The `ia-ccd-definitions` repo uses a git submodule (`ccd-definition-processor`) and must be cloned with `--recursive`. Definitions are encrypted for production using `IA_CCD_SECRET_KEY`.
- `ia-home-office-integration-api` and `ia-timed-event-service` both implement a **finite retry policy** for CCD event submission — they do not own business logic; any idempotency must be implemented in `ia-case-api` event handlers.
- `ia-timed-event-service` exposes an additional testing-only endpoint activated via `SPRING_PROFILES_ACTIVE=test`.
- The HMCTS service ID across all IA APIs is `BFA1`.
- `ia-task-configuration` DMN files cannot be safely developed in parallel because Camunda Modeler regenerates unique IDs on save, causing merge conflicts. Manual DMN upload to preview is automated via `bin/upload-wa-dmn-preview.sh`.
- `ia-cron-config` is a Helm chart only — it runs `ia-hearings-api` as a CronJob, passing task name arguments to the jar rather than deploying a separate application.
