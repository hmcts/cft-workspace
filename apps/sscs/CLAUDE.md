---
service: sscs
ccd_based: true
ccd_config: json
ccd_features:
  - global_search
  - linked_cases
  - hearings
  - work_allocation_tasks
  - query_search
  - reasonable_adjustments
integrations:
  - idam
  - s2s
  - bulk_scan
  - send_letter
  - notify
  - cdam
  - work_allocation
  - cftlib
  - flyway
  - rd
  - stitching
repos:
  - apps/sscs/sscs-tribunals-case-api
  - apps/sscs/sscs-submit-your-appeal
  - apps/sscs/sscs-cor-frontend
  - apps/sscs/sscs-case-loader
  - apps/sscs/sscs-common
  - apps/sscs/sscs-ccd-case-migration
  - apps/sscs/sscs-task-configuration
  - apps/sscs/sscs-cron-trigger
  - apps/sscs/sscs-post-deployment-ft-tests
  - apps/sscs/sscs-shared-infrastructure
---

# SSCS — Social Security and Child Support

SSCS is the digital service that allows claimants to challenge decisions made about social security and child support benefits (e.g. PIP, ESA, UC). Appellants can submit appeals online, upload evidence, and track their case status. Caseworkers and judges manage appeals through ExUI backed by CCD. The service also handles legacy case ingestion from the Gaps2 system, bulk-scan paper appeals, and integrates with the Hearings Management Component (HMC) for scheduling.

## Repos

- `apps/sscs/sscs-tribunals-case-api` — Core Spring Boot backend; CCD callback handler, bulk-scan transformer, HMC integration, evidence sharing, Notify notifications, and Work Allocation support. Jurisdiction `SSCS`, case type `Benefit`.
- `apps/sscs/sscs-submit-your-appeal` — Node/Express public-facing appeal submission journey (GDS single-page-per-question pattern). Supports both standard SYA and Infected Blood Compensation (IBA) appeal modes.
- `apps/sscs/sscs-cor-frontend` — Node/Express "Manage Your Appeal" (MYA) service, descended from the COR project. Lets appellants track their case and respond to questions online. Talks to `sscs-tribunals-case-api` as its backend.
- `apps/sscs/sscs-case-loader` — Spring Boot batch job that reads legacy Gaps2 XML delta files from SFTP and creates/updates cases in CCD.
- `apps/sscs/sscs-common` — Shared Java library (CCD domain objects, IDAM/S2S utilities, case operation helpers) consumed by `sscs-tribunals-case-api`, `sscs-case-loader`, and `sscs-ccd-case-migration`.
- `apps/sscs/sscs-ccd-case-migration` — Batch migration runner built on `ccd-case-migration-starter`; used for one-off data migrations when the CCD case definition changes.
- `apps/sscs/sscs-task-configuration` — Spring Boot service hosting Camunda DMN tables (`wa-task-initiation-sscs-benefit.dmn`, `wa-task-configuration-sscs-benefit.dmn`, etc.) that the Work Allocation engine evaluates to create and route tasks.
- `apps/sscs/sscs-cron-trigger` — Lightweight scheduler that fires HTTP triggers for periodic jobs (e.g. scheduled events against the tribunals API).
- `apps/sscs/sscs-post-deployment-ft-tests` — Post-deployment functional test suite validating Work Allocation task creation/assignment flows after releases.
- `apps/sscs/sscs-shared-infrastructure` — Terraform/infra repo defining shared Azure resources (key vaults, Service Bus namespaces, metric alerts) used across all SSCS services.

## Architecture

The public entrypoints are `sscs-submit-your-appeal` (new appeals) and `sscs-cor-frontend` (ongoing case management for appellants). Both are Node/Express applications that delegate all case operations to `sscs-tribunals-case-api` over HTTP, using IDAM OAuth2 for citizen authentication and S2S tokens for service auth.

`sscs-tribunals-case-api` (port 8008) is the central hub. It acts as the CCD callback handler (`/ccdAboutToStart`, `/ccdAboutToSubmit`, `/ccdSubmittedEvent`, `/ccdMidEvent`), the bulk-scan transformer (`/transform-scanned-data`, `/validate-record`), and exposes endpoints for evidence upload, online hearings, and document generation via Docmosis. It holds a PostgreSQL database (managed by Flyway) used by Quartz for scheduled job state. The `rse-cft-lib` plugin enables the `bootWithCCD` Gradle task for local development with a full CCD stack embedded.

Legacy paper cases arrive through `sscs-case-loader`, which polls an SFTP server for Gaps2 XML delta extracts and creates/updates CCD cases via the `sscs-common` library's CCD client. `sscs-ccd-case-migration` handles structural migrations when a case definition change requires re-processing existing data.

`sscs-task-configuration` is the Work Allocation DMN host. CCD events with `"Publish": "${CCD_DEF_PUBLISH}"` emit messages to the WA engine, which calls this service's DMN tables to determine what tasks to create and who can work them.

## CCD touchpoints

SSCS uses the `json` config style: the case-type definition for `Benefit` (and a `BULKSCAN` type) is maintained as JSON sheets under `definitions/benefit/sheets/` and `definitions/bulkscan/sheets/`. A shell script (`bin/create-xlsx.sh`) merges the JSON into an XLSX spreadsheet for import, with WA-specific sheets (named `*-WA-*`) or non-WA sheets (`*-nonWA*`) included or excluded by script parameter. The `Publish` field on CaseEvents is set dynamically to `Y`/`N` to control Work Allocation event publication.

CCD features wired up include Global Search (SearchCriteria + SearchParty configured with appellant name, NINO, case reference), linked cases (`associatedCase` and `linkedCase` fields of type `Collection<CaseLink>`), Elasticsearch-backed search inputs/results, and reasonable adjustment fields (`reasonableAdjustmentChoice`, `reasonableAdjustmentsOutstanding`). Work Allocation task initiation is triggered by events published to the WA message bus.

Callbacks are registered conventionally (not decentralised). The callback base URL follows the pattern `https://sscs-tribunals-api-<pr-xxx>.preview.platform.hmcts.net` in preview environments. Bulk scan callbacks are handled at `/validate-record`, `/transform-scanned-data`, and `/forms/` endpoints in `sscs-tribunals-case-api`.

The HMC hearings integration uses a Feign client `HmcHearingApi` (URL `${hmc.url}`) and a JMS listener `HmcHearingsEventTopicListener` that consumes hearing update messages from the HMC topic. `ServiceHearingsController` exposes the hearing data endpoints that HMC calls back to for case data.

## External integrations

- `idam`: `idam-java-client` (`com.github.hmcts:idam-java-client`); IDAM API at `${IDAM_API_URL}` for citizen OAuth2 and system-update user authentication.
- `s2s`: `service-auth-provider-java-client`; S2S at `${IDAM_S2S_AUTH}` for microservice tokens. Service names: `sscs`, `ccd`, `bulkscan`.
- `bulk_scan`: `sscs-tribunals-case-api` exposes OCR validation and exception record transformation endpoints consumed by `bulk_scan_processor` and `bulk_scan_orchestrator`.
- `send_letter`: `send-letter-client` (`com.github.hmcts:send-letter-client`); `BulkPrintService` and `CoverLetterService` send letters via `${SEND_LETTER_SERVICE_BASEURL}`.
- `notify`: `notifications-java-client` (`uk.gov.service.notify`); GOV.UK Notify key at `${NOTIFICATION_API_KEY}` for email/SMS notifications to appellants and DWP.
- `cdam`: `ccd-case-document-am-client` (`com.github.hmcts:ccd-case-document-am-client`); document access at `${CASE_DOCUMENT_AM_URL}` (feature-flagged via `SECURE_DOC_STORE_FEATURE`).
- `work_allocation`: `sscs-task-configuration` hosts WA DMN tables; `sscs-tribunals-case-api` raises WA-enabled CCD events. Post-deployment tests in `sscs-post-deployment-ft-tests` validate end-to-end task flows.
- `cftlib`: `com.github.hmcts.rse-cft-lib` Gradle plugin used in `sscs-tribunals-case-api` for embedded CCD in local/CI testing via `bootWithCCD`.
- `flyway`: `flyway-core` + `flyway-database-postgresql`; migrations in `src/main/resources/db/migration/` manage the Quartz scheduler schema in PostgreSQL.
- `rd`: Location Reference Data at `${RD_LOCATION_REF_API_URL}` and Judicial Reference Data at `${JUDICIAL_REF_API_URL}`; used in hearing and adjournment flows.
- `stitching`: Em-stitching bundle API at `${BUNDLE_URL}` (default `http://localhost:4623`); used to assemble hearing bundles.

## Notable conventions and quirks

- The CCD definition build script (`bin/create-xlsx.sh`) requires `type`, `version`, and `env` arguments; `wa_enabled` defaults to false. WA is enabled per-environment via both an application feature flag (`WORK_ALLOCATION_FEATURE`) and the CCD definition flag (`WORK_ALLOCATION_FEATURE_ENABLED` in `Jenkinsfile_CNP`). To enable WA on a preview PR, add the `pr-values:wa` label.
- PRs with names starting "Bump" intentionally do not create preview environments (Dependabot noise reduction).
- `sscs-cor-frontend` is still registered in code and config under the `sscs-cor` service name despite the product being renamed "Manage Your Appeal"; renaming would require re-onboarding as a new service.
- `sscs-tribunals-case-api` hosts both the CCD callback handler and the evidence share (bulk print) pipeline in one deployable — the `bulkscan` source set is a full sub-domain within the same Spring Boot app.
- Document generation uses Docmosis (not HMCTS doc-assembly) for most SSCS letter templates; `doc-assembly-client` is present for post-hearing application documents.
