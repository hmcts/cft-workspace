---
service: ccd
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - am
  - cdam
  - flyway
  - notify
api_specs:
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v1_internal.json
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v1_external.json
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v2_internal.json
  - apps/ccd/ccd-data-store-api:ccd-data-store-api.v2_external.json
  - apps/ccd/aac-manage-case-assignment:aac-manage-case-assignment.json
  - apps/ccd/ccd-definition-store-api:ccd-definition-store-api.json
  - apps/ccd/ccd-case-document-am-api:ccd-case-document-am-api.json
  - apps/ccd/ccd-user-profile-api:ccd-user-profile-api.json
exemplar_dirs:
  - libs/ccd-config-generator/test-projects
  - apps/ccd/ccd-test-definitions
confluence_spaces:
  - RCCD
  - EUI
  - CF
  - AM
repos:
  - apps/ccd/aac-manage-case-assignment
  - apps/ccd/ccd-admin-web
  - apps/ccd/ccd-api-gateway
  - apps/ccd/ccd-case-activity-api
  - apps/ccd/ccd-case-disposer
  - apps/ccd/ccd-case-document-am-api
  - apps/ccd/ccd-case-migration-starter
  - apps/ccd/ccd-data-store-api
  - apps/ccd/ccd-definition-processor
  - apps/ccd/ccd-definition-store-api
  - apps/ccd/ccd-elastic-search
  - apps/ccd/ccd-message-publisher
  - apps/ccd/ccd-next-hearing-date-updater
  - apps/ccd/ccd-test-definitions
  - apps/ccd/ccd-test-stubs-service
  - apps/ccd/ccd-user-profile-api
---

# CCD (Core Case Data)

CCD is HMCTS's shared case-data platform. It provides persistent storage of case data,
event-driven lifecycle management, fine-grained RBAC, Elasticsearch-backed search, and
case document access control for every service-team product that builds on top of it.
CCD is a platform component — it does not use CCD itself (`ccd_based: false`).

## Repos

- `apps/ccd/ccd-data-store-api` — Spring Boot service (port 4452) that stores and queries
  case data in PostgreSQL; hosts the callback engine, supplementary data, Elasticsearch
  indexing, and the public/internal REST API consumed by XUI and service backends.
- `apps/ccd/ccd-definition-store-api` — Spring Boot service (port 4451) that validates and
  persists case-type definitions imported as Excel spreadsheets; pushes schema to Elasticsearch
  on import.
- `apps/ccd/ccd-admin-web` — Express (Node.js, port 3100) admin UI for uploading case-type
  definition spreadsheets to the definition store.
- `apps/ccd/ccd-api-gateway` — Node.js reverse proxy (port 3453) that enforces IDAM OAuth2
  auth and routes browser traffic to the data store, definition store, and document management.
- `apps/ccd/aac-manage-case-assignment` — Spring Boot service (port 4454) providing
  case-access management APIs: case-user-role assignment, Notice of Change (NoC) workflows,
  and a Spring Cloud Gateway proxy forwarding `/ccd/**` to the data store.
- `apps/ccd/ccd-case-document-am-api` — Spring Boot service (port 4455, CDAM) acting as an
  access-controlled proxy to the document management store; enforces CCD access policies on
  document upload and download.
- `apps/ccd/ccd-user-profile-api` — Spring Boot service (port 4453) storing per-user UI
  preferences and jurisdiction defaults.
- `apps/ccd/ccd-message-publisher` — Spring Boot scheduler (port 4456) that reads case events
  from PostgreSQL and publishes them to Azure Service Bus for downstream consumers (work
  allocation, message handlers).
- `apps/ccd/ccd-case-activity-api` — Node.js/Redis service (port 3460) tracking real-time
  case viewers and editors for XUI's concurrent-access indicators.
- `apps/ccd/ccd-case-disposer` — Spring Boot batch job that permanently deletes case records
  meeting configurable retention criteria, using Elasticsearch to locate qualifying cases.
- `apps/ccd/ccd-case-migration-starter` — Spring Boot framework/template for service teams to
  implement data migrations against existing cases in the data store.
- `apps/ccd/ccd-next-hearing-date-updater` — Spring Boot batch job that finds cases with a
  stale `NextHearingDate` field via Elasticsearch and fires an `UpdateNextHearingInfo` event;
  uses `rse-cft-lib` for local testing.
- `apps/ccd/ccd-definition-processor` — Node.js CLI tool (`json2xlsx` / `xlsx2json`) for
  converting between JSON and Excel case-type definition formats, with variable substitution
  and fragment support.
- `apps/ccd/ccd-test-definitions` — Java library (no running service) holding templated JSON
  and Excel case-type definition files for BEFTA-based functional tests in data-store and
  definition-store pipelines.
- `apps/ccd/ccd-test-stubs-service` — Spring Boot WireMock service (port 5555) providing
  configurable stubs for CCD callback endpoints and IDAM during functional tests.
- `apps/ccd/ccd-elastic-search` — Terraform + Ansible infrastructure repo provisioning the
  internal CCD Elasticsearch cluster on Azure VMs with internal load balancer.

## Architecture

At runtime, service-team backends create and mutate case data via `ccd-data-store-api`
(port 4452). Browser traffic from XUI reaches the data store either directly or via
`aac-manage-case-assignment`'s Spring Cloud Gateway proxy, which intercepts `/ccd/**`
requests and forwards them to `CCD_DATA_STORE_API_BASE_URL` after running
`AllowedRoutesFilter` and `ValidateClientFilter`. The `ccd-api-gateway` (port 3453) is the
older Node.js proxy layer that was used before AAC and is still present in some deployments.

Case-type definitions must be imported into `ccd-definition-store-api` before the data store
can accept events for a jurisdiction. Import can be done via the REST API directly or through
`ccd-admin-web` (which requires an IDAM user with the `ccd-import` role and posts to
`ADMINWEB_IMPORT_URL`). On import, the definition store also initialises Elasticsearch indices
for the case type, enabling search. The `ccd-definition-processor` CLI is used by service
teams to convert JSON fragment files into importable Excel spreadsheets.

All case documents are accessed through `ccd-case-document-am-api` (CDAM, port 4455), which
applies the data store's configured access-control policies before proxying to
`dm-store` (`DM_STORE_BASE_URL`). The data store calls CDAM at `case_document_am.url` to
attach documents to cases. `ccd-message-publisher` reads the data store's database on a
schedule and publishes case-event messages to Azure Service Bus for downstream work-allocation
and message-handler services.

## External integrations

- `idam`: all Java services authenticate inbound calls via IDAM OAuth2/OIDC (`idam.api.url`);
  `ccd-admin-web` and `ccd-api-gateway` use IDAM OAuth2 flows for browser-side login.
- `s2s`: all Java services validate service tokens via `service-auth-provider`
  (`idam.s2s-auth.url`); the authorised service lists are configured per service.
- `am`: `ccd-data-store-api` calls `am-role-assignment-service` at `role.assignment.api.host`
  for case-level RBAC; `aac-manage-case-assignment` also calls it at `ROLE_ASSIGNMENT_URL`.
- `cdam`: `ccd-data-store-api` calls CDAM at `case_document_am.url` (`/cases/documents/attachToCase`)
  to link uploaded documents to cases; CDAM itself proxies to `dm-store`.
- `flyway`: `ccd-data-store-api` and `ccd-definition-store-api` both manage their PostgreSQL
  schemas with Flyway (`spring.flyway.*` in `application.properties`).
- `notify`: `aac-manage-case-assignment` uses GOV.UK Notify (`notify.api-key` in
  `application.yaml`) to email parties involved in Notice of Change decisions.

`aac-manage-case-assignment` also calls `rd-professional-api` (`prd.host`) to resolve
organisations during NoC workflows — this is an `rd` integration not listed in the controlled
token vocabulary but present in `application.yaml`.

## Notable conventions and quirks

- `ccd-data-store-api` publishes four separate OpenAPI specs (v1/v2 × internal/external),
  generated by `SwaggerGeneratorTest` and committed to `hmcts/cnp-api-docs` via the
  `publish-swagger-specs.yml` workflow.
- `ccd-test-definitions` are published as a versioned artifact to Azure Artifacts; raw Excel
  files must never be imported directly as they contain un-substituted `${ENV_VAR:default}`
  callback URL templates. Use `./gradlew definitionsToJson` to convert Excel to JSON before
  committing, and `./gradlew definitionsToExcel` to generate environment-specific Excel.
- `ccd-case-activity-api` depends on Redis for real-time session tracking — it does not use
  PostgreSQL.
- `ccd-message-publisher` ships an embedded ActiveMQ in dev mode (AMQP 1.0 protocol) as a
  local substitute for Azure Service Bus; production uses `SERVICE_BUS_CONNECTION_STRING`.
- `ccd-next-hearing-date-updater` uses `com.github.hmcts.rse-cft-lib` (`bootWithCCD` Gradle
  task) to spin up a full CCD stack in-process for local functional testing.
- `ccd-case-migration-starter` is a framework template, not a deployable service; service
  teams clone or branch it to implement their own migration jobs.
- `ccd-elastic-search` is a pure infrastructure repo (Terraform + Ansible), not a Java or
  Node application; it provisions the Elasticsearch cluster that data-store and definition-store
  depend on.
