---
service: nfdiv
ccd_based: true
ccd_config: config-generator
ccd_features:
  - notice_of_change
  - case_flags
  - query_search
  - work_allocation_tasks
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
repos:
  - apps/nfdiv/nfdiv-case-api
  - apps/nfdiv/nfdiv-frontend
---

# No Fault Divorce (NFDIV)

The No Fault Divorce service allows couples to apply online for a divorce or dissolution of civil partnership in England and Wales under the no-fault divorce legislation. It handles both sole and joint applications from citizens and solicitors, covering the full lifecycle: submission, Acknowledgement of Service, Conditional Order, and Final Order, as well as judicial separation.

## Repos

- `apps/nfdiv/nfdiv-case-api` — Spring Boot backend (Java 21): handles all CCD callbacks, case progression logic, bulk-scan paper-case ingestion, scheduled cron tasks, and document generation via Docmosis. Also owns the CCD case-type definition (generated from Java using `hmcts.ccd.sdk`).
- `apps/nfdiv/nfdiv-frontend` — Express/TypeScript citizen-facing web application served on port 3001. Presents the divorce application journey to citizens and proxies data to the case API and CCD data store.

## Architecture

At runtime, citizens access the service through `nfdiv-frontend`, which calls `nfdiv-case-api` for business logic and communicates directly with the CCD data store for case reads. Caseworkers and solicitors interact through ExUI (Manage Case), which triggers CCD callbacks that land on `nfdiv-case-api` at `http://localhost:4013` (configurable via `CASE_API_URL`). The callback host is set in `NoFaultDivorce.java` via `configBuilder.setCallbackHost(...)`.

The case API integrates with a wide set of downstream services: IDAM for authentication, S2S for service-to-service tokens, `aac-manage-case-assignment` for Notice of Change and solicitor representation flows, `rd-professional-api` for solicitor PBA/organisation lookups, the Payments API for fee collection, `send-letter-service` for offline correspondence, Docmosis (`doc_assembly.url`) for document generation, CDAM (`case_document_am`) for document storage, and GOV.UK Notify for email/SMS notifications. The frontend additionally uses LaunchDarkly for runtime feature flags prefixed `NFD_`.

The service also handles paper-case ingestion from `bulk-scan-processor`/`bulk-scan-orchestrator` via transformation endpoints in `bulkscan/`. Scheduled cron tasks (e.g. `SystemProgressHeldCasesTask`) run inside the case-api JVM and drive automated case progression.

## CCD touchpoints

The case type `NFD` in jurisdiction `DIVORCE` is registered using the `hmcts.ccd.sdk` config-generator plugin (Gradle plugin `hmcts.ccd.sdk` version `6.7.2`, `rse-cft-lib` `0.19.2066`). `NoFaultDivorce.java` implements `CCDConfig<CaseData, State, UserRole>` and is the root config entry point; supporting classes under `divorcecase/` define events, tabs, search inputs/results, and workbasket fields. The `./gradlew generateCCDConfig` task emits JSON definitions to `build/definitions/NFD/`; the Jenkinsfile then calls `bin/ccd-build-definition.sh` to package them into an XLSX for import.

The definition enables:
- **Notice of Change**: the `noticeofchange/` package implements `AssignCaseAccessClient` calling `aac-manage-case-assignment`, with a dedicated `SystemRequestNoticeOfChange` event.
- **Case Flags**: `SetupCaseFlags` task initialises flags on case creation via `CaseFlagsService`.
- **Query search / WorkBasket**: `SearchInputFields`, `SearchResultFields`, `WorkBasketInputFields`, and `WorkBasketResultFields` are all wired up via config-generator.
- **Global Search**: `CoreCaseDataConfiguration` instantiates a `SearchCriteria` bean from `reform-ccd-client`, indicating global search configuration.
- **Bulk action**: a separate `BulkAction` case type handles batch pronouncement scheduling (bulk list).

The callback controller endpoints follow the standard CCD pattern (`/callbacks/about-to-submit`, `/callbacks/mid-event`, etc.); the URL base is injected as `CASE_API_URL` in Jenkins/Helm.

## External integrations

- `idam`: `idam-java-client` (`3.0.4`); client ID `divorce`; system-update credentials for cron tasks; configured under `idam.*` in `application.yaml`.
- `s2s`: `service-auth-provider-java-client` (`5.3.2`); microservice name `nfdiv_case_api`.
- `am`: `cftlib-am-role-assignments.json` defines role assignments for local testing; `ROLE_ASSIGNMENT_URL` points to `am-role-assignment-service`.
- `rd`: `rd-professional-api` called for PBA accounts and organisation data; URL `prd.api.url` / `PRD_API_BASEURL`.
- `payment`: Fees & Pay API at `payment.service.api.baseurl`; solicitor PBA payments on submission.
- `bulk_scan`: transformation endpoints (`BulkScanCaseTransformationController`) receive envelopes from `bulk_scan_processor`; configured in `s2s-authorised.services`.
- `send_letter`: `send-letter-client` (`5.0.3`); URL `send-letter.url`; used for offline postal correspondence to unrepresented parties.
- `notify`: `notifications-java-client` (`6.0.0-RELEASE`); over 100 Notify templates configured in `application.yaml` for English and Welsh.
- `cdam`: `ccd-case-document-am-client` (`1.59.2`); document upload/download via `CaseDocumentAccessManagement`; URL `case_document_am.url`.
- `cftlib`: `com.github.hmcts.rse-cft-lib` Gradle plugin; `bootWithCCD` and `cftlibTest` tasks embed CCD for local development and integration tests; Playwright used for browser-level cftlib tests.

## Notable conventions and quirks

- The case-api serves on port `4013`; the frontend on port `3001`; the `bootWithCCD` local stack exposes ExUI on port `3000` and Manage-Organisation ExUI on port `3009`.
- The `CHANGE_ID` environment variable modifies the case type ID at build time (e.g. `NFD-232` on preview), allowing per-PR CCD definitions to be deployed independently without clashing with shared AAT.
- TypeScript type definitions for the CCD model are generated by `./gradlew generateTypeScript` and must be manually copied into `nfdiv-frontend/src/main/app/case/definition.ts` when case-type fields change.
- LaunchDarkly flags in the frontend must be prefixed `NFD_` and must use underscores rather than hyphens (hyphens are parsed as minus operators in Nunjucks).
- The service supports both divorce and civil partnership dissolution through the same case type, with mode determined by case data fields rather than separate case types.
- Welsh-language Notify templates and Docmosis documents are configured in parallel with English ones; many Welsh templates carry `#TODO: Welsh translation needed` comments indicating incomplete translations.
