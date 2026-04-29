---
service: pcs
ccd_based: true
ccd_config: config-generator
ccd_features:
  - decentralised_ccd
  - global_search
  - linked_cases
  - hearings
  - work_allocation_tasks
  - query_search
integrations:
  - idam
  - s2s
  - rd
  - payment
  - notify
  - cftlib
  - flyway
repos:
  - apps/pcs/pcs-api
  - apps/pcs/pcs-frontend
---

# Possession Claims Service (PCS)

PCS is the HMCTS digital service for mortgage and landlord possession claims, allowing claimants to issue possession claims online and defendants to respond. `pcs-api` is the Spring Boot 3 / Java 21 backend that owns all case data, CCD configuration, and business logic; `pcs-frontend` is the Express/TypeScript citizen-facing web app that guides users through claim issue and defendant response journeys.

## Repos

- `apps/pcs/pcs-api` — Spring Boot REST API, CCD case-type owner (decentralised), PostgreSQL persistence via Flyway, all integrations
- `apps/pcs/pcs-frontend` — Express + TypeScript / Nunjucks frontend; handles citizen OIDC login, Redis-backed sessions, and calls CCD and pcs-api

## Architecture

At runtime the frontend (port 3209) authenticates citizens via OIDC against IDAM. For case interactions it calls CCD data-store directly (`ccd.url`, defaulting to port 4452) — not pcs-api — using CCD's standard event lifecycle (GET event-trigger, POST events). For mid-event draft saves the frontend POSTs the full `possessionClaimResponse` DTO to CCD's `/validate` endpoint, which in turn triggers pcs-api's mid-event callback to persist the draft. Non-case endpoints (health, info, fee lookup stubs via Wiremock) are called directly against `api.url` (pcs-api port 3206).

pcs-api is registered as a **decentralised CCD** service: `ccd { decentralised = true }` in `build.gradle`, and CCD is configured with `CCD_DECENTRALISED_CASE-TYPE-SERVICE-URLS_PCS=http://localhost:3206`. CCD reads and writes case data by calling pcs-api's persistence callbacks rather than its own data store. The CCD case type definition is emitted via the `hmcts.ccd.sdk` Gradle plugin (config-generator pattern), with `CaseType.java` as the root `CCDConfig` entry point.

Local development runs the full CFT stack in-process via `./gradlew bootWithCCD` (rse-cft-lib / cftlib), exposing XUI at port 3000, pcs-api at 3206, Postgres at 6432, IDAM simulator at 5062. The frontend can point at this local stack via `yarn start:dev:pcs-local`.

## CCD touchpoints

PCS registers one case type (`PCS`) in jurisdiction `PCS` using the `ccd-config-generator` Java SDK. The `CaseType` class implements `CCDConfig<PCSCase, State, UserRole>` and sets the callback host (`CASE_API_URL`, default `http://localhost:3206`). Registration is decentralised: pcs-api serves the persistence callbacks that CCD delegates storage to.

Wired CCD features: `SearchCriteria` (global search) and `SearchParty` access via `GlobalSearchAccess`; `CaseLink` + `linkedCasesComponentLauncher` fields with a "Linked cases" tab (`linked_cases`); `workBasketResultFields()` configured with case reference and property address (`work_allocation_tasks`); `searchInputFields()`, `searchCasesFields()`, and `searchResultFields()` configured (`query_search`). Hearings integration (`hearings`) is via Azure Service Bus (`hmc-to-cft-aat` topic) and `HmcHearingApi` Feign client pointing at `HMC_API_URL`.

Notable CCD callbacks: mid-event validation at `?pageId=respondToPossessionDraftSavePage` (draft persistence); submitted callbacks on `createPossessionClaim`, `respondPossessionClaim`, `confirmEviction`, `enforceTheOrder`, and linked-case events (`CreateCaseLink`, `MaintainLinkCase`).

## External integrations

- `idam` — `idam-java-client` v3.0.5; pcs-api holds a system user and OAuth client; frontend uses `openid-client` for OIDC.
- `s2s` — `service-auth-provider-java-client` v5.3.3; both pcs-api (`pcs_api`) and pcs-frontend (`pcs_frontend`) are registered S2S microservices.
- `rd` — `rd-professional-api` (`RdProfessionalApi` Feign client at `RD_PROFESSIONAL_API_URL`) and `rd-location-ref-api` (`LocationReferenceApi` at `LOCATION_REF_URL`).
- `payment` — `payments-java-client` v1.7.0; also `fees-java-client` v0.1.0 for fee lookup against the Fees Register (`FEES_REGISTER_API_URL`).
- `notify` — `notifications-java-client` v6.0.0; email notifications sent via GOV.UK Notify with retry/back-off scheduling handled by db-scheduler.
- `cftlib` — `rse-cft-lib` Gradle plugin v0.19 used for `bootWithCCD` local dev task and `cftlibTest` test source set.
- `flyway` — Flyway migrations under `src/main/resources/db/migration/` (V001–V080+); pcs-api owns the `pcs` PostgreSQL database schema.

## Notable conventions and quirks

- **Doc assembly** — pcs-api integrates with `doc-assembly-client` (`DocAssemblyService`) to generate PDF documents from Docmosis templates at `DOC_ASSEMBLY_URL`. This is template-based document generation (not em-stitching bundling) and has no taxonomy token — see `doc_assembly.url` in `application.yaml`.
- **CDAM** — `XUI_DOCUMENTS_API_V2` points at `ccd-case-document-am-api` in cftlib config, but pcs-api does not directly call CDAM; documents are handled through XUI/CCD.
- **Case type suffix** — The `CASE_TYPE_SUFFIX` env var (typically the PR number) appends to the case type ID and name in preview environments to avoid collisions.
- **Wiremock in preview** — Adding the `pr-values:wiremock` label to a PR deploys a Wiremock pod pre-configured to proxy and stub external APIs (e.g. Fee Register).
- **db-scheduler** — Async task scheduling (Notify retries, fee lookups, access code generation) is handled by `db-scheduler-spring-boot-starter` backed by the same PostgreSQL instance.
- **Pact contract tests** — Both pcs-api and pcs-frontend publish consumer pacts to `pact-broker.platform.hmcts.net`.
