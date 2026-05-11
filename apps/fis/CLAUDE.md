---
service: fis
ccd_based: true
ccd_config: config-generator
ccd_features:
  - work_allocation_tasks
  - hearings
  - query_search
integrations:
  - idam
  - s2s
  - am
  - rd
  - notify
  - cdam
  - bulk_scan
  - send_letter
repos:
  - apps/fis/fis-cos-api
  - apps/fis/fis-bulk-scan-api
  - apps/fis/fis-ds-web
  - apps/fis/fis-hmc-api
---

# FIS (Family Integration Service)

FIS is the Family Integration Service, a citizen-facing platform for private family law and adoption "edge cases" — forms such as FMPO (Forced Marriage Protection Orders), FGM (Female Genital Mutilation protection orders), and adoption-related applications (A58/A59/A60 relative adoption). It provides a digital journey for citizens to create, update, and submit family law applications into CCD, and connects the hearings management layer (HMC) to case data for private law cases.

## Repos

- `apps/fis/fis-cos-api` — Spring Boot case-orchestration service; owns CCD config-generator definitions, handles citizen application create/update/submit events against `ccd-data-store-api`, and stores documents via CDAM. Manages cases in the `PRLAPPS` (Private Law) and `A58` (Adoption) CCD case types under the `PRIVATELAW` and `Adoption` jurisdictions.
- `apps/fis/fis-bulk-scan-api` — Spring Boot bulk-scan transform service; validates and transforms paper form scans (C100, FL401, A58/59/60, FGM001, C63, etc.) for ingestion into CCD via the bulk-scan pipeline.
- `apps/fis/fis-ds-web` — Express/TypeScript citizen-facing frontend; provides the online journey for edge-case applications, talks to `fis-cos-api` for case creation/updates, and to IDAM for authentication.
- `apps/fis/fis-hmc-api` — Spring Boot hearings-management adapter; subscribes to HMC Azure Service Bus topics and mediates hearing data between `hmc-cft-hearing-service` and CCD case data (private law PRLAPPS cases). Also queries Reference Data for venue and judicial information.

## Architecture

At runtime, citizens access the application via `fis-ds-web` (port 4000). The frontend authenticates users via IDAM (OAuth2 / `ds-ui` client), obtains an S2S token as `ds_ui`, and calls `fis-cos-api` at `/case/dss-orchestration/{create,update}` to create or update CCD cases. `fis-cos-api` (port 8099) is registered as `fis_cos_api` in S2S, calls `ccd-data-store-api` for case data and `ccd-case-document-am-api` for document management, and uses the `idam-java-client` + `ccd-client` libraries. GOV.UK Notify is used by `fis-cos-api` to send email notifications (application submitted, save & sign out, etc.) in both English and Welsh.

Paper forms arrive through `fis-bulk-scan-api` (port 8090). It is registered as `fis_cos_api` in S2S (shared microservice key) and accepts transformation requests from the bulk-scan pipeline. Each supported form type (C100, FL401, A58, FGM001, C63, etc.) has its own Spring profile with dedicated validation and transform YAML, producing CCD-compatible case payloads.

`fis-hmc-api` (port 4550) bridges the HMCTS Hearings Management Component and CCD. It subscribes to the `hmc-to-cft` Azure Service Bus topic (subscription `hmc-fis-subs-prl-demo`) and calls `hmc-cft-hearing-service` for hearing details. It also queries `rd-location-ref-api` for venue data and `rd-judicial-api` for judicial officer details. Role Assignment Service (`am-role-assignment-service`) is referenced for case access checks.

## CCD touchpoints

`fis-cos-api` uses the `hmcts.ccd.sdk` Gradle plugin (config-generator, version `0.25.16` in cos-api, `5.6.1` in hmc-api) to emit CCD definitions. The `PrivateLawEdgeCase` class implements `CCDConfig<CaseData, State, UserRole>` and configures the `PRLAPPS` case type under the `PRIVATELAW` jurisdiction. Case events include `citizen-prl-create-dss-application`, `citizen-prl-update-dss-application`, and `citizen-prl-submit-dss-application`; the analogous adoption events target the `A58`/`Adoption` case type. WorkBasket input and result fields are defined (`PrivateLawWorkBasketInputFields`, `PrivateLawWorkBasketResultFields`), enabling work-allocation views. Elasticsearch-backed query search is configured in `fis-hmc-api` (`ccd.elastic-search-api`).

`fis-hmc-api` drives the hearings feature: it calls `hmc-cft-hearing-service` and processes the incoming Service Bus message stream to keep hearing state in sync with CCD case data. Case flags and linked-cases features were not found in the source at time of analysis.

## External integrations

- `idam`: `fis-cos-api` and `fis-hmc-api` use `idam-java-client`; `fis-ds-web` uses IDAM OAuth2 (`ds-ui` client, `idam-web-public` for redirect, `idam-api` for token). `fis-bulk-scan-api` uses IDAM S2S only.
- `s2s`: All Java services use `service-auth-provider-java-client`. Registered microservice names: `fis_cos_api` (cos-api and bulk-scan), `ds_ui` (frontend), `fis_hmc_api` (hmc-api).
- `am`: `fis-hmc-api` calls `am-role-assignment-service` (`role-assignment-service.api.url` in `application.yaml`).
- `rd`: `fis-hmc-api` calls `rd-location-ref-api` (`ref_data_venue.api.url`) and `rd-judicial-api` (`ref_data_judicial.api.url`).
- `notify`: `fis-cos-api` uses `notifications-java-client` (GOV.UK Notify) for email notifications; templates configured in `application.yaml` for English and Welsh languages.
- `cdam`: `fis-cos-api` uses `ccd-case-document-am-client` (version `1.59`) for all document storage operations via `ccd-case-document-am-api`.
- `bulk_scan`: `fis-bulk-scan-api` receives paper form envelopes from `bulk-scan-processor`; `allowed-services` includes `bulk_scan_processor` and `bulk_scan_orchestrator`.
- `send_letter`: `send-letter-client` (version `3.0.23`) is declared as a build dependency of `fis-cos-api` but no active call sites were found in the main source; likely retained for future use or transitively required.

## Notable conventions and quirks

- `fis-cos-api` serves a dual role: it is the citizen-facing case orchestration API *and* the registered S2S microservice name (`fis_cos_api`) shared by `fis-bulk-scan-api`. Both services draw from the same `fis-kv-aat` Key Vault namespace.
- `fis-hmc-api` targets `demo` environment URLs as its master-branch defaults (rather than AAT), which is unusual — AAT is used for PR previews but demo is the default for `onMaster` deployment.
- `fis-cos-api` includes a `generateTypeScript` Gradle task that produces TypeScript type definitions from `cosapi.**model.*` and `uk.gov.hmcts.ccd.sdk.type.*` for consumption by the frontend.
- `fis-hmc-api` uses Java 21 (the only repo in this product on Java 21); `fis-cos-api` and `fis-bulk-scan-api` use Java 17.
- Both `fis-cos-api` and `fis-bulk-scan-api` have `SwaggerPublisherTest` classes that write the OpenAPI spec to `/tmp/swagger-specs.json` during integration test runs, but neither has a `.github/workflows/publish-openapi*.yml` or legacy `swagger.yml` workflow wired up to publish to `cnp-api-docs`.
- Slack notifications for all repos target `#fis-integration-tech-notifications`.
