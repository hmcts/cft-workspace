---
service: probate
ccd_based: true
ccd_config: json
ccd_features:
  - notice_of_change
  - work_allocation_tasks
  - query_search
  - global_search
integrations:
  - idam
  - s2s
  - am
  - rd
  - payment
  - bulk_scan
  - send_letter
  - notify
  - cdam
  - cftlib
api_specs:
  - apps/probate/probate-back-office:probate-back-office.json
repos:
  - apps/probate/probate-back-office
  - apps/probate/probate-business-service
  - apps/probate/probate-caveats-frontend
  - apps/probate/probate-ccd-data-migration-tool
  - apps/probate/probate-commons
  - apps/probate/probate-frontend
  - apps/probate/probate-orchestrator-service
  - apps/probate/probate-performance
  - apps/probate/probate-shared-infrastructure
  - apps/probate/probate-submit-service
---

# Probate

Probate is the HMCTS digital service for applying for a grant of representation and raising caveats to prevent
such grants. It serves both citizen personal applicants and solicitors/legal professionals. Cases are stored in CCD
under the PROBATE jurisdiction with six case types: `GrantOfRepresentation`, `Caveat`, `WillLodgement`,
`StandingSearch`, `LegacySearch`, and `LegacyCaseType`.

## Repos

- `apps/probate/probate-back-office` — Spring Boot CCD callback service; holds all JSON case-type definitions, implements business logic, bulk-scan transforms, payment callbacks, GOV.UK Notify emails, and PDF/send-letter dispatch
- `apps/probate/probate-business-service` — Spring Boot shared-logic service providing address lookup, document upload, and email validation to the frontends via the orchestrator
- `apps/probate/probate-caveats-frontend` — Node/Express citizen-facing frontend for caveat applications; talks exclusively to the orchestrator
- `apps/probate/probate-ccd-data-migration-tool` — One-off data migration runner using the `ccd-case-migration-starter` framework; used when CCD definition changes require existing case-data backfills
- `apps/probate/probate-commons` — Shared Java DTO library (published to Azure Artifacts `hmcts-lib`) consumed by all Java services
- `apps/probate/probate-frontend` — Node/Express citizen-facing frontend for grant of representation (personal applicants and solicitors); talks exclusively to the orchestrator
- `apps/probate/probate-orchestrator-service` — Spring Boot API gateway between the two frontends and back-end services; also runs scheduled cron jobs (SmeeAndFordExtract, HMRCExtract)
- `apps/probate/probate-performance` — Gatling performance tests against the citizen application
- `apps/probate/probate-shared-infrastructure` — Terraform/Azure shared infrastructure definitions (placeholder; minimal content)
- `apps/probate/probate-submit-service` — Spring Boot service creating and updating CCD cases via `ccd-data-store-api`

## Architecture

Both citizen frontends (`probate-frontend` for grants, `probate-caveats-frontend` for caveats) route all requests
through `probate-orchestrator-service` (port 8888 locally). The orchestrator acts as an API gateway, fanning out
to `probate-back-office`, `probate-business-service`, and `probate-submit-service` as needed. It also runs scheduled
data-extract cron jobs (Smee & Ford, HMRC). Caseworkers and solicitors access cases through XUI Manage Cases
(port 3000 locally) and XUI Manage Org (port 3001).

`probate-submit-service` is responsible for creating and initially updating CCD cases by calling `ccd-data-store-api`
directly. Once a case exists in CCD, `probate-back-office` (port 4104 locally) handles all CCD callbacks —
`AboutToStart`, `AboutToSubmit`, and `Submitted` — at `${BACK_OFFICE_BASEURL}/case/*` paths. Shared DTOs and
request/response models are published as the `probate-commons` artifact and consumed by all four Java services.

Key external calls from `probate-back-office`: payment service requests at `${PAYMENT_URL}/service-request` with
payment update callbacks at `/payment/gor-payment-request-update` and `/payment/caveat-payment-request-update`;
GOV.UK Notify for bilingual (English/Welsh) email notifications; `send-letter-client` for bulk-printed documents;
CDAM at `${CASE_DOCUMENT_AM_URL}` (port 4455) for document storage; and Docmosis PDF service at
`${PDF_SERVICE_BASEURL}` for generating grant and caveat documents. The back-office also integrates with
`life-events-client` for death registration data.

## CCD touchpoints

Case-type definitions are stored as JSON under `probate-back-office/ccdImports/configFiles/`, one directory per case
type. Conversion scripts at `ccdImports/conversionScripts/createAllXLS.sh` / `importAllXLS.sh` build and import XLS
spreadsheets to CCD. The `rse-cft-lib` Gradle plugin (`com.github.hmcts.rse-cft-lib` version `0.19.2115`) is applied
in `build.gradle`; the `bootWithCcd` task embeds a full CCD stack for local development. The `ccd-diff.yml` workflow
detects changes to CCD definition JSON between PRs.

Notice of Change is wired for the solicitor case-sharing flow: `ChallengeQuestion.json` in `CCD_Probate_Backoffice`
defines the `NoCChallenge` question (answer field `deceasedSurname`), `NoticeOfChangeController.java` implements the
callback, and the service calls `aac-manage-case-assignment` at `${ACA_SERVICE_API_BASEURL}` (port 4454). Work
Allocation is opt-in via the `PROBATE_WA_ENABLED` environment variable, which toggles inclusion of WA-specific JSON
definition files (`-wa.json` suffix) during XLS generation. `SearchInputFields.json`, `SearchResultFields.json`, and
`WorkBasketInputFields.json` / `WorkBasketResultFields.json` are configured across multiple case types.

## External integrations

- `idam` — `idam-java-client` v3.0.5; OAuth flow against `${IDAM_SERVICE_HOST}`; client ID `ccd_gateway`
- `s2s` — `service-auth-provider-java-client` v5.3.3; microservice name `probate_backend`; authorised callers include `ccd_data`, `bulk_scan_processor`, `bulk_scan_orchestrator`, `payment_app`
- `am` — `aac-manage-case-assignment` at `${ACA_SERVICE_API_BASEURL}` for the Notice of Change solicitor flow
- `rd` — PRD organisations API at `${PRD_API_URL}/refdata/external/v1/organisations` for solicitor organisation lookup
- `payment` — Service request callbacks at `${PAYMENT_URL}/service-request`; fees registry at `${FEE_URL}/fees-register/fees/lookup`; hmctsOrgId `ABA6`
- `bulk_scan` — `ExceptionRecordController` accepts bulk-scan envelopes from `bulk_scan_processor` and `bulk_scan_orchestrator` at `/transform-scanned-data` and `/transform-exception-record`
- `send_letter` — `send-letter-client` v5.1.1 at `${SEND_LETTER_SERIVCE_BASEURL}` (note typo in config key — missing 'c' in SERVICE)
- `notify` — `notifications-java-client` v6.0.0; key at `${PROBATE_NOTIFY_KEY}`; extensive bilingual (English/Welsh) template IDs in `application.yml`
- `cdam` — `ccd-case-document-am-client` v1.59.2 at `${CASE_DOCUMENT_AM_URL}` (port 4455 locally)
- `cftlib` — `com.github.hmcts.rse-cft-lib` v0.19.2115 Gradle plugin; `bootWithCcd` task for local full-stack development

## Notable conventions and quirks

- CCD definitions live inside `probate-back-office` rather than a separate definitions repo. A shutter mode exists: passing `true` as a second argument to `createAllXLS.sh` generates a shuttered XLS; `shutterOption` in `Jenkinsfile_CNP` controls per-environment shuttering.
- PR chaining for frontend changes: a `probate-frontend` PR must be linked to an orchestrator PR and that to a back-office PR by updating `BACK_OFFICE_API_URL` / `ORCHESTRATOR_SERVICE_URL` in each Helm chart's `values.yml`.
- The `send-letter` config key contains a typo: `SEND_LETTER_SERIVCE_BASEURL` (missing 'c' in SERVICE). Match exactly when overriding.
- Work Allocation features are toggled by `PROBATE_WA_ENABLED`; WA-specific definition JSON is included in XLS generation only when this flag is set. Preview WA testing requires the `pr-values:wa` GitHub label.
- Both frontends use Redis for session storage (`redis-server` must be running locally). LaunchDarkly feature flags are used in both frontends and the back-office (`launchdarkly-key` Key Vault secret / `${LAUNCHDARKLY_KEY}`).
- The back-office uses PostgreSQL via Spring Data JPA with no Flyway migrations in the source tree — schema is managed externally.
- The OpenAPI spec for `probate-back-office` is published to `platops/cnp-api-docs/docs/specs/probate-back-office.json` via the CNP pipeline rather than a dedicated `.github/workflows/publish-openapi.yml`.
