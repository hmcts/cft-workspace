---
service: adoption
ccd_based: true
ccd_config: config-generator
ccd_features:
  - work_allocation_tasks
  - query_search
  - categories
integrations:
  - idam
  - s2s
  - rd
  - payment
  - notify
  - cdam
  - cftlib
repos:
  - apps/adoption/adoption-cos-api
  - apps/adoption/adoption-web
  - apps/adoption/adoption-ccd-data-migration-tool
  - apps/adoption/adoption-cron
---

# Adoption

The Adoption service enables citizens and local authorities to apply for child adoption orders under the Adoption and Children Act 2002 (case type `A58`, jurisdiction `ADOPTION`). Citizens complete the application through a self-serve web journey; case-workers manage the case via XUI. The service handles the full lifecycle from draft through to a final adoption order, including local authority review, court submission, and document generation.

## Repos

- `apps/adoption/adoption-cos-api` — Spring Boot Case Orchestration Service (COS); owns the CCD case type definition (generated via `ccd-config-generator`), handles all CCD callbacks, document generation, GOV.UK Notify emails, payment, and scheduled cron tasks
- `apps/adoption/adoption-web` — Express/TypeScript citizen-facing frontend; collects applicant details step-by-step and creates/updates the CCD case via COS-API
- `apps/adoption/adoption-ccd-data-migration-tool` — Spring Boot CLI tool wrapping `ccd-case-migration-starter`; used ad hoc to bulk-migrate existing cases by triggering a `migrateCase` CCD event with `about-to-submit` callback on COS-API
- `apps/adoption/adoption-cron` — Helm chart that schedules Kubernetes cron jobs using the COS-API image; executes tasks such as alerting applicants whose drafts are about to expire

## Architecture

`adoption-web` (port 3001) drives the citizen journey via an Express session backed by Redis. At each submission step it calls `adoption-cos-api` (port 4550) which, acting as the CCD callback handler and direct CCD client, reads and writes case data to `ccd-data-store-api`. XUI connects to the same CCD instance for case-worker views.

`adoption-cos-api` holds the CCD case type definition, generated from Java source using the `hmcts.ccd.sdk` Gradle plugin (`com.github.hmcts.rse-cft-lib` / cftlib for local-stack testing). The `Adoption` class registers case type `A58` with `CASE_API_URL` as the callback host; CCD fires `about-to-start`, `about-to-submit`, and `submitted` hooks back to COS-API during events. CCD definitions are exported to XLSX/JSON and imported to CCD Definition Store during CI via `bin/process-and-import-ccd-definition.sh`.

Document generation uses Docmosis (via `doc_assembly` / `dg-docassembly`) and CDAM (`ccd-case-document-am-api`) for document storage. Email notifications are sent through GOV.UK Notify via `notifications-java-client`; payment integration calls the Fees & Pay API (`payment-api`) and the Professional Reference Data API (`rd-professional-api`) for PBA payment lookups.

`adoption-cron` runs scheduled tasks (draft expiry alerts, LA submission reminders) by invoking the COS-API jar with a `run <taskname>` argument on a Kubernetes cron schedule defined in its Helm chart.

## CCD touchpoints

The case type is registered centrally (not decentralised) using `ccd-config-generator`. `Adoption.java` implements `CCDConfig<CaseData, State, UserRole>` and sets the callback host from `CASE_API_URL`. A small supplemental JSON file (`ccd-definitions/AuthorisationComplexType.json`) is layered on top of the generated definitions at build time.

WorkBasket input and result fields are configured (`WorkBasketInputFields.java`, `WorkBasketResultFields.java`), enabling work-allocation task display. CCD search is configured via `SearchInputFields.java`, `SearchResultFields.java`, and `SearchCasesResultFields.java`. Documents uploaded to cases carry typed category metadata (`DocumentCategory` enum used in `AdoptionDocument` / `AdoptionUploadDocument`) wiring the `categories` CCD feature.

COS-API implements CCD event callbacks at `${CASE_API_URL}/callbacks/...`. The `bootWithCCD` Gradle task (provided by `rse-cft-lib`) spins up the full CCD stack in-process for local development.

## External integrations

- `idam`: `idam-java-client` (`com.github.hmcts:idam-java-client:3.0.5`) provides system-update user auth; `IDAM_API_BASEURL` wired in `application.yaml`
- `s2s`: `service-auth-provider-java-client` (`4.0.3` + `5.3.3`) wired via `idam.s2s-auth.*` config; microservice name `adoption_cos_api`
- `rd`: `prd.api.url` in `application.yaml` calls `rd-professional-api` for PBA account lookups
- `payment`: `payment.service.api.baseurl` calls `payment-api` for fee payments; fee amounts looked up via `fee.api.baseUrl` (fees-register-api)
- `notify`: `notifications-java-client` (`uk.gov.service.notify:notifications-java-client:5.0.1`) wired via `uk.gov.notify.api.key`; bilingual (English + Welsh) template IDs in `application.yaml`
- `cdam`: `ccd-case-document-am-client` (`1.59.2`) wired via `case_document_am.url` for document storage and access management
- `cftlib`: `com.github.hmcts.rse-cft-lib:0.19.1844` Gradle plugin provides `bootWithCCD` task for local-stack integration testing

## Notable conventions and quirks

- The `send-letter.url` property appears in `application.yaml` (a legacy template carry-over) but no Java code in the service currently calls `send-letter-service` — it is not an active integration.
- `adoption-cos-api` uses Java 21 (Dockerfile: `base/java:21-distroless`) while `adoption-ccd-data-migration-tool` targets Java 17.
- The CCD configuration is a hybrid of generated Java config plus one hand-maintained JSON override (`ccd-definitions/AuthorisationComplexType.json`); strictly the build config is `config-generator` only.
- LaunchDarkly feature flags are integrated (`launchdarkly-java-server-sdk:5.10.9`) for runtime feature toggling in COS-API.
- Pact contract tests are published to `https://pact-broker.platform.hmcts.net` on PR and master builds (`adoption-cos-api` is the consumer).
- In the Jenkinsfile, after AAT functional tests, a production CCD definition is generated immediately (using `CASE_API_URL` pointing to prod) — definitions are deployed to production as part of the AAT pipeline run.
