---
service: finrem
ccd_based: true
ccd_config: json
ccd_features: [notice_of_change, case_flags, work_allocation_tasks, categories]
integrations: [idam, s2s, rd, payment, bulk_scan, send_letter, notify, cdam, cftlib]
repos:
  - apps/finrem/finrem-case-orchestration-service
  - apps/finrem/finrem-ccd-definitions
  - apps/finrem/finrem-citizen-ui
  - apps/finrem/finrem-task-configuration
  - apps/finrem/finrem-wa-post-deployment-ft-tests
  - apps/finrem/finrem-shared-infrastructure
  - apps/finrem/finrem-slack-alerts
---

# Financial Remedy (Finrem)

Financial Remedy is the CFT service handling financial-remedy applications on divorce/dissolution — both the
"Consented" (agreed financial settlement) and "Contested" journeys. It provides the CCD case-type definitions,
the backend orchestration/business logic behind case events, and a citizen-facing web journey for
litigants-in-person to link and view their case.

## Repos

- `finrem-case-orchestration-service` — Spring Boot service ("finrem-cos") that implements all CCD callbacks for Consented and Contested case types: about-to-start/about-to-submit/submitted handlers, document generation, notifications, bulk-scan intake, payments.
- `finrem-ccd-definitions` — CCD case-type JSON definitions for the Consented and Contested journeys, converted to/from Excel via a submoduled `ccd-definition-processor`; also hosts Playwright E2E tests and the WA DMN preview overlay values.
- `finrem-citizen-ui` — Express/TS frontend giving citizens (litigants-in-person) a journey to authenticate via IDAM, enter a case number and access code, and view/interact with a linked FR case.
- `finrem-task-configuration` — DMN files (task initiation/cancellation/completion/permissions/types) driving Work Allocation task behaviour for the Financial Remedy jurisdiction; not a deployable app.
- `finrem-wa-post-deployment-ft-tests` — black-box functional tests against WA Task Management, driven by CCD event messages, run post-deployment/nightly.
- `finrem-shared-infrastructure` — Terraform for shared Azure infra (App Insights, Key Vault) used across Finrem environments.
- `finrem-slack-alerts` — Python Azure Function that queries Application Insights and posts exception alerts to Slack.

## Architecture

`finrem-ccd-definitions` is imported into `ccd-definition-store-api` (via the CCD Admin Web import flow / Jenkins
release pipeline) to register the Consented and Contested case types. Case events configured there point their
callback URLs (via templated `${CCD_DEF_COS_URL}` placeholders) at `finrem-case-orchestration-service`, which
implements the about-to-start/about-to-submit/submitted handlers for each event (handler classes live under
`src/main/java/.../handler/*`). The service talks back to CCD's data store for case-role and case-user
operations (`core_case_data.api.url`, `ccd.data-store.api.removeCaseRolesUrl`).

Solicitors and caseworkers manage cases through XUI, driven by the same CCD case-type config. Citizens instead
use `finrem-citizen-ui`, a separate lightweight Express app that authenticates via IDAM and lets a litigant link
to their case with a case number + access code, then view case state — it does not implement CCD callbacks
itself, it consumes case data read via the backend/CCD APIs.

Work Allocation is a significant cross-cutting concern: `finrem-task-configuration` supplies the DMN rules
(task initiation/cancellation/completion/permissions) that the shared WA Task Management stack (Camunda +
`wa-task-management-api`) uses whenever finrem-cos emits CCD case events; `finrem-wa-post-deployment-ft-tests`
exercises that pipeline end-to-end (create/update case → CCD event message → task appears/claims/completes)
against preview or AAT. `finrem-ccd-definitions` carries a `pr-values:wa` preview overlay that spins up Camunda,
task management/workflow APIs, the case event handler, `rd-caseworker-ref-api`, `ccd-message-publisher` and AM
role assignment alongside the normal Finrem preview stack for this testing.

## CCD touchpoints

Case-type registration is centralised (not decentralised) and JSON-based: `finrem-ccd-definitions` holds
plain JSON under `definitions/{consented,contested}/json/...` (CaseField, CaseEvent, AuthorisationCaseEvent,
etc.), converted to Excel spreadsheets for import into `ccd-definition-store-api` — there is no
`ccd-config-generator`/Java SDK usage in this product.

CCD features wired up: **Notice of Change** and related solicitor case-access changes (`StopRepresentingClient*`,
`ApplyNocDecision*`, `UpdateContactDetailsAboutToSubmitHandler`, `NocUtils`, calls to
`aca.api.caseAssignmentsUrl` on `aac-manage-case-assignment`, and `DataStoreClient`/`CaseAssignedRoleService`
for case-role/user assignment); **case flags** (`CaseFlagsService`, `CaseFlagsConfiguration`,
`CaseFlagsWrapper`); **document categories** (`service/documentcatergory/*Categoriser` classes plus
`Categories`/`Categories-nonprod` JSON in the definitions repo); and **Work Allocation tasks**, driven by the
DMN in `finrem-task-configuration` reacting to case events emitted by finrem-cos.

Notable callbacks implemented by finrem-cos include hearing management (`handler/managehearings/*` —
about-to-start/about-to-submit/submitted/migration), bulk-scan form intake (`BulkScanController`,
`service/bulkscan/*` transformers/validators for Form A), solicitor case creation (Consented/Contested), and
document upload/removal flows that route through CDAM.

## External integrations

- `idam`: `idam-java-client` dependency; `idam.url`/`idam.api.url`/`idam.client.redirect_uri` in `application.properties`; citizen-ui also authenticates citizens via IDAM.
- `s2s`: `service-auth-provider-java-client` dependency; `idam.s2s-auth.url` config; citizen-ui functional tests use `FINREM_CASE_ORCHESTRATION_SERVICE_S2S_KEY`.
- `rd`: `prd.organisations.url` → `rd-professional-api` (`/refdata/external/v1/organisations`) for organisation lookups, plus PBA validation.
- `payment`: `payment.api.baseurl`/`payment.url` calls to `payment-api`, plus `fees.url` to the fees register for FR application/hearing fees.
- `bulk_scan`: `BulkScanController` + `service/bulkscan/*` consume scanned Form A envelopes and transform them into case data.
- `send_letter`: `send-letter-client` dependency; `send-letter.url` config for bulk-print correspondence.
- `notify`: `notifications-java-client` dependency driving `NotificationService`/`NotificationsController` (GOV.UK Notify emails).
- `cdam`: `ccd-case-document-am-client` dependency; `case_document_am.url` config used by the `evidencemanagement` upload/download/audit/delete services.
- `cftlib`: `com.github.hmcts.rse-cft-lib` Gradle plugin and `bootWithCCD` task for local CCD/ExUI development and functional tests.

## Notable conventions and quirks

- finrem-cos listens on port `9000` locally; `finrem-citizen-ui` on port `3100`.
- `finrem-ccd-definitions` keeps environment- and release-gated variants of definition files via suffixes: `-nonprod.json` (excluded from prod), `-prod.json` (prod-only), and `-wa.json`/`-wa-nonprod.json` for Work Allocation cutover — changes to WA-affected events must be duplicated/split across these rather than edited in place.
- Definitions are authored as JSON but round-tripped to Excel via a git-submoduled `ccd-definition-processor` for import into CCD Admin Web; PROD judge data in `FixedLists` is populated by Jenkins only — locally generated PROD excel must never be used.
- `finrem-citizen-ui` requires a developer-shared `.env` (not committed) with target-selection blocks (local/preview/aat) controlling `CCD_URL`/`CCD_DATA_STORE_API_URL`; only one target block should be active at a time.
- `finrem-shared-infrastructure` is pure Terraform (Key Vault, App Insights) — no application code.
- `finrem-slack-alerts` and `finrem-wa-post-deployment-ft-tests` are auxiliary/non-prod repos (monitoring and post-deploy regression respectively); neither ships to production environments.
- No product repo in this workspace publishes an OpenAPI spec to `cnp-api-docs` (the only `finrem*` entry found there, `finrem-draft-store-service.json`, belongs to a repo not present in this workspace).
