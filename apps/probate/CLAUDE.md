---
service: probate
ccd_based: true
ccd_config: json
ccd_features:
  - notice_of_change
  - bulk_scan
  - work_allocation_tasks
  - query_search
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

Probate is the HMCTS digital service for applying for a grant of representation (probate) and raising caveats to prevent
such a grant. It serves both citizen personal applicants and solicitors. Cases are stored in CCD under the PROBATE
jurisdiction with multiple case types: `GrantOfRepresentation`, `Caveat`, `WillLodgement`, `StandingSearch`,
`LegacySearch`, and `LegacyCaseType`.

## Repos

- `apps/probate/probate-back-office` — Spring Boot CCD callback service; implements all business logic, CCD case-type JSON definitions, bulk-scan transform, payment handling, GOV.UK Notify emails, and PDF/send-letter dispatch
- `apps/probate/probate-business-service` — Spring Boot service providing shared business logic (address lookup, document upload, email validation) consumed by the frontends via the orchestrator
- `apps/probate/probate-caveats-frontend` — Node/Express citizen-facing frontend for caveat applications; talks to the orchestrator
- `apps/probate/probate-ccd-data-migration-tool` — One-off data migration runner using the `ccd-case-migration-starter` framework; used when case definitions change in ways requiring existing case-data backfills
- `apps/probate/probate-commons` — Shared Java DTO library published to Azure Artifacts; consumed by back-office, business-service, orchestrator, and submit-service
- `apps/probate/probate-frontend` — Node/Express citizen-facing frontend for grant of representation (personal applicants and solicitors); talks to the orchestrator
- `apps/probate/probate-orchestrator-service` — Spring Boot API gateway sitting between the two frontends and the back-end services (back-office, business-service, submit-service); runs scheduled cron jobs (e.g. SmeeAndFordExtractTask)
- `apps/probate/probate-performance` — Gatling performance tests against the probate citizen application (uses `common-performance` submodule)
- `apps/probate/probate-shared-infrastructure` — Terraform/Azure infra definitions for shared probate infrastructure (placeholder repo, minimal content)
- `apps/probate/probate-submit-service` — Spring Boot service handling submission of completed applications to CCD via `core_case_data.api.url`

## Architecture

The two citizen-facing frontends (`probate-frontend` for grants, `probate-caveats-frontend` for caveats) do not call
back-end services directly. All requests route through `probate-orchestrator-service` (port 8888 locally), which acts
as an API gateway forwarding calls to `probate-back-office`, `probate-business-service`, and `probate-submit-service`
as appropriate. The orchestrator also owns scheduled extract jobs (Smee & Ford, HMRC data extracts).

`probate-submit-service` is responsible for creating and updating CCD cases via `ccd-data-store-api`. Once a case
exists in CCD, `probate-back-office` handles all further CCD callbacks — it is registered as the callback service for
the PROBATE jurisdiction and responds to CCD's `AboutToSubmit`, `AboutToStart`, and `Submitted` callback URLs. The
back-office runs on port 4104 locally and its callback base URL is `${BACK_OFFICE_BASEURL}`.

Shared DTOs (case data model, request/response objects) are published as the `probate-commons` library (pulled from
Azure Artifacts feed `hmcts-lib`) and consumed by all Java services. Caseworkers and solicitors access cases via
XUI Manage Cases (port 3000 locally); solicitors also use XUI Manage Org (port 3001).

## CCD touchpoints

CCD case-type definitions are stored as JSON under `probate-back-office/ccdImports/configFiles/`, one directory per
case type (`CCD_Probate_Backoffice`, `CCD_Probate_Caveat`, `CCD_Probate_Will_Lodgement`, `CCD_Probate_Legacy_Cases`,
`CCD_Probate_Legacy_Search`, `CCD_Probate_Standing_Search`). Conversion scripts at
`ccdImports/conversionScripts/createAllXLS.sh` / `importAllXLS.sh` build and import the XLS spreadsheets. The
`rse-cft-lib` plugin (`com.github.hmcts.rse-cft-lib`) is applied in `build.gradle` and the `bootWithCcd` task is
used for local development against a fully embedded CCD stack.

The back-office implements CCD callbacks at `/case/*` and `/legacy/*` paths, handles bulk-scan `ExceptionRecord`
transforms at `/transform-scanned-data` and `/transform-exception-record`, and exposes payment update callbacks at
`/payment/gor-payment-request-update` and `/payment/caveat-payment-request-update`. Notice of Change is wired via
`NoticeOfChangeController` and there is a `noticeOfChangeReceived` GOV.UK Notify template ID in the solicitor email
configuration. Work allocation is toggled via `PROBATE_WA_ENABLED` and, when enabled, adds WA-specific JSON files
(files named with `-wa.json` suffix) to the case definitions.

Search is configured with `SearchInputFields.json`, `SearchResultFields.json`, and `SearchCasesResultFields.json` in
the `CCD_Probate_Backoffice` directory. `WorkBasketInputFields.json` and `WorkBasketResultFields.json` are present
across multiple case types.

## External integrations

- `idam` — `idam-java-client` in `build.gradle`; OAuth flow at `${IDAM_SERVICE_HOST}`; IDAM client ID `ccd_gateway`
- `s2s` — `service-auth-provider-java-client`; microservice name `probate_backend`; secret from `${S2S_AUTH_TOTP_SECRET}`
- `am` — `aac-manage-case-assignment` is used for Notice of Change (solicitor case-sharing flow); AAC URL at `${ACA_SERVICE_API_BASEURL}`
- `rd` — PRD organisations API called at `${PRD_API_URL}/refdata/external/v1/organisations` (solicitor org lookup)
- `payment` — Service request callbacks at `${PAYMENT_URL}/service-request`; fees registry at `${FEE_URL}/fees-register/fees/lookup`; hmctsOrgId `ABA6`
- `bulk_scan` — Back-office accepts bulk-scan envelopes from `bulk_scan_processor` and `bulk_scan_orchestrator` (listed in `authorised.services`); `ExceptionRecordController` handles transforms
- `send_letter` — `send-letter-client` dependency; URL at `${SEND_LETTER_SERIVCE_BASEURL}` (note typo in config key)
- `notify` — `notifications-java-client`; API key at `${PROBATE_NOTIFY_KEY}`; extensive bilingual (English/Welsh) template IDs configured in `application.yml`
- `cdam` — `ccd-case-document-am-client`; document AM URL at `${CASE_DOCUMENT_AM_URL}`
- `cftlib` — `com.github.hmcts.rse-cft-lib` Gradle plugin; `bootWithCcd` task embeds full CCD stack for local development

## Notable conventions and quirks

- CCD definitions live in `probate-back-office` rather than a separate definitions repo. A shuttering mode exists: `./ccdImports/conversionScripts/createAllXLS.sh probate-back-office:4104 true` produces a shuttered XLS; the Jenkinsfile `shutterOption` flag controls which environments are shuttered.
- PR chaining: linking a probate-frontend PR requires creating linked orchestrator and back-office PRs and updating `BACK_OFFICE_API_URL` / `ORCHESTRATOR_SERVICE_URL` in each chart's `values.yml`.
- The `send-letter` config key has a typo in `application.yml`: `SEND_LETTER_SERIVCE_BASEURL` (missing 'c' in SERVICE). Match exactly when overriding.
- Work Allocation features are controlled by the `PROBATE_WA_ENABLED` environment variable; WA-specific definition JSON is included only when this flag is set.
- The back-office uses a PostgreSQL database (via JPA, no Flyway migrations visible in the source tree — schema is managed externally).
- Both frontends use Redis for session storage (`redis-server` must be running locally).
- LaunchDarkly feature flags are used in both frontends (`launchDarkly-key` from Key Vault) and in the back-office (`${LAUNCHDARKLY_KEY}`).
