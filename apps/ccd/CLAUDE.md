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
repos:
  - apps/ccd/ccd-data-store-api
  - apps/ccd/ccd-definition-store-api
  - apps/ccd/ccd-admin-web
  - apps/ccd/aac-manage-case-assignment
  - apps/ccd/ccd-test-definitions
---

# CCD (Core Case Data)

CCD is HMCTS's shared case-data platform. It provides persistent storage of case data,
event-driven lifecycle management, fine-grained permissions, and Elasticsearch-backed
search for every service-team product that builds on top of it. It is a platform component,
not a case-data consumer — so `ccd_based` is false.

## Repos

- `apps/ccd/ccd-data-store-api` — Spring Boot service (port 4452) that stores and queries case
  data in PostgreSQL; hosts the callback engine, supplementary data, Elasticsearch indexing,
  and the public/internal REST API consumed by XUI and service backends.
- `apps/ccd/ccd-definition-store-api` — Spring Boot service (port 4451) that validates and
  persists case-type definitions (imported as Excel spreadsheets); pushes schema to
  Elasticsearch on import.
- `apps/ccd/ccd-admin-web` — Express/TypeScript admin UI (port 3100) that lets authorised
  users upload case-definition Excel files to the definition store.
- `apps/ccd/aac-manage-case-assignment` — Spring Boot service (port 4454) providing APIs for
  case-access management: case-user-role assignment, Notice of Change (NoC) workflows, and a
  Spring Cloud Gateway proxy for XUI-to-data-store routing.
- `apps/ccd/ccd-test-definitions` — Java/Gradle library (no running service) containing
  templated CCD case-type definition files (Excel + JSON) used by the BEFTA functional-test
  framework in `ccd-data-store-api` and `ccd-definition-store-api` pipelines.

## Architecture

At runtime, service-team backends submit or query case data via `ccd-data-store-api`. Before
doing so, they must have had their case-type definition imported into `ccd-definition-store-api`
(either directly via the API or via `ccd-admin-web`). The data store fetches case-type metadata
from the definition store on every request and caches it. Case data mutations trigger outbound
HTTP callbacks to the originating service's callback endpoints.

`aac-manage-case-assignment` sits alongside the data store. XUI routes certain requests
(`/ccd/**`) through AAC's Spring Cloud Gateway proxy, which forwards to the data store at
`CCD_DATA_STORE_API_BASE_URL` after applying access-control filters. AAC directly implements
Notice of Change flows (challenge questions, approval, decision) by calling the data store and
definition store, resolving representative organisations via `rd-professional-api` (`prd.host`),
and sending email notifications via GOV.UK Notify.

All services authenticate incoming calls with IDAM OAuth2 / OIDC and S2S tokens
(`service-auth-provider`). The data store and AAC both call Access Management
(`am-role-assignment-service`) for role-based case access. The data store stores documents
through CDAM (`case_document_am.url`). Both the data store and definition store manage their
PostgreSQL schemas with Flyway migrations under `src/main/resources/db/migration`.

## External integrations

- `idam`: all three Java services authenticate via IDAM OAuth2/OIDC; credentials configured in
  `application.properties` (`idam.api.url`) and `application.yaml` (`idam.api.url`).
- `s2s`: S2S tokens used by all Java services; `idam.s2s-auth.url` in each service's config.
- `am`: data store calls `am-role-assignment-service` at `role.assignment.api.host`; AAC also
  calls it at `role.assignment.api.host` in `application.yaml`.
- `cdam`: data store calls Case Document AM at `case_document_am.url` to attach documents to
  cases.
- `flyway`: both data store and definition store use Flyway for DB schema management
  (`spring.flyway.*` properties; migrations under `src/main/resources/db/migration`).
- `notify`: AAC uses `notifications-java-client` (GOV.UK Notify) to email parties involved in
  NoC decisions; API key at `notify.api-key` in `application.yaml`.

## Notable conventions and quirks

- `ccd-test-definitions` is a library artifact, not a deployable service. It is published to
  Azure Artifacts and consumed as a Gradle test dependency. Changes must be made to JSON files
  (not Excel) and go through a `definitionsToJson` Gradle task; raw Excel files must never be
  imported directly as they contain un-substituted `${ENV_VAR:default}` callback URL templates.
- The data store exposes two API versions: v1 (stable) and v2 (beta), each with separate
  internal and external variants — four Swagger specs in total.
- AAC acts as a gateway proxy for XUI: requests to `/ccd/**` are stripped of the prefix and
  forwarded to the data store after the `AllowedRoutesFilter` and `ValidateClientFilter`
  Spring Cloud Gateway filters run.
- `ccd-admin-web` requires an IDAM user with the `ccd-import` role; it posts definition
  spreadsheets to `ADMINWEB_IMPORT_URL` (the definition store `/import` endpoint).
- `ccd-data-store-api` uses Pact contract tests (`au.com.dius.pact` plugin) to verify
  consumer-driven contracts; results can be published to a Pact Broker via `PACT_BROKER_URL`.
