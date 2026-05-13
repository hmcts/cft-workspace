---
service: rd
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - flyway
api_specs:
  - apps/rd/rd-caseworker-ref-api:rd-caseworker-ref-api.json
  - apps/rd/rd-professional-api:rd-professional-api.json
  - apps/rd/rd-judicial-api:rd-judicial-api.json
  - apps/rd/rd-location-ref-api:rd-location-ref-api.json
  - apps/rd/rd-commondata-api:rd-commondata-api.json
  - apps/rd/rd-user-profile-api:rd-user-profile-api.json
repos:
  - apps/rd/rd-caseworker-ref-api
  - apps/rd/rd-professional-api
  - apps/rd/rd-judicial-api
  - apps/rd/rd-location-ref-api
  - apps/rd/rd-commondata-api
  - apps/rd/rd-user-profile-api
  - apps/rd/rd-commondata-dataload
  - apps/rd/rd-location-ref-data-load
confluence_spaces:
  - RD
---

# Reference Data (RD)

The Reference Data product is a platform-level suite of Spring Boot services that supply shared lookup data consumed by many other CFT services. It covers professional organisations (solicitor firms and their users), judicial office holders, court locations, caseworker profiles, common flag/category data, and user profile records. None of the services hold CCD case data; they are standalone stores queried over HTTP by service teams and platform components.

## Repos

- `apps/rd/rd-professional-api` — Professional Reference Data API (PRD): manages solicitor organisations, their users, PUI roles, and professional relationships; consumed by XUI, AAC, FPL, IA, and others.
- `apps/rd/rd-judicial-api` — Judicial Reference Data API (JRD): stores judicial office holder profiles, appointments, authorisations, and roles; consumed by AM and hearing services.
- `apps/rd/rd-caseworker-ref-api` — Caseworker Reference Data API (CRD): manages caseworker user profiles and skill/location assignments; publishes events to Azure Service Bus topic `rd-caseworker-topic`.
- `apps/rd/rd-location-ref-api` — Location Reference Data API (LRD): provides court building locations, service codes, and region/area hierarchies; consumed by hearings, caseworker-ref, and payment services.
- `apps/rd/rd-commondata-api` — Common Data API: serves shared lookup tables (case flags, panel member types, list-of-values, categories) used across CFT; port 4550.
- `apps/rd/rd-user-profile-api` — User Profile API: stores HMCTS user profile preferences and activation state; port 8091.
- `apps/rd/rd-commondata-dataload` — Common Data batch loader: Apache Camel/Kubernetes job that ingests GPG-encrypted CSVs (FlagDetails, FlagService, OtherCategories, ListOfValues, CaseLinkingReasons) from Azure Blob Storage (`rd-common-data` container) and persists them to the Common Data database.
- `apps/rd/rd-location-ref-data-load` — Location batch loader: Apache Camel/Kubernetes job that ingests CourtVenue, BuildingLocation, and OrgServiceCCDMapping CSVs from Azure Blob Storage (`lrd-ref-data` container) and persists them to the LRD database.

## Architecture

The six API services are independent Spring Boot 3 / Java 21 REST APIs, each backed by its own PostgreSQL database. Flyway manages schema migrations for all six (migration scripts under `src/main/resources/db/migration`); all Jenkinsfiles call `enableDbMigration('rd')` to apply migrations at deploy time. Each service secures its endpoints with S2S (`service-auth-provider-java-client`) and IDAM OAuth2/OIDC, declaring an `s2s-authorised.services` allowlist in `application.yaml`.

The two batch-load services (`rd-commondata-dataload`, `rd-location-ref-data-load`) are Kubernetes-scheduled jobs rather than persistent HTTP services. They use Apache Camel routes to read GPG-decrypted CSV files from Azure Blob Storage, transform and validate the data, then write it to the respective PostgreSQL database. Files are archived to a separate container after processing. The batch jobs use `data-ingestion-lib` and ShedLock to prevent concurrent runs.

`rd-judicial-api` also integrates with the eLinks judiciary middleware API (`${ELINKS_URL}`) to refresh judicial profile data, and publishes events to an Azure Service Bus topic (`rd-judicial-topic`). `rd-caseworker-ref-api` similarly publishes to `rd-caseworker-topic`. Both `rd-judicial-api` and `rd-caseworker-ref-api` call `rd-location-ref-api` internally (`${LOCATION_REF_DATA_URL}`) to enrich records with location details.

All API services use LaunchDarkly for runtime feature flags (`${LD_SDK_KEY}`). All six register Pact contract tests against the HMCTS Pact Broker; Jenkinsfiles register them as `PROVIDER` on master and PR builds. All services sync `demo`, `ithc`, and `perftest` branches from master via `syncBranchesWithMaster`.

## External integrations

- `idam`: all six API services use `idam-java-client` and Spring Security OAuth2 resource-server; OIDC issuer at `${OPEN_ID_API_BASE_URI}` pointing at IDAM; microservice client IDs in `application.yaml`.
- `s2s`: all six API services use `service-auth-provider-java-client`; S2S URL at `${S2S_URL}`; each service has its own microservice name (e.g. `rd_professional_api`, `rd_caseworker_ref_api`).
- `flyway`: all six API services auto-apply Flyway migrations on startup; all Jenkinsfiles call `enableDbMigration('rd')`.

## Notable conventions and quirks

- Service ports: `rd-professional-api` 8090, `rd-user-profile-api` 8091, `rd-judicial-api` 8093, `rd-caseworker-ref-api` 8095, `rd-location-ref-api` 8099, `rd-commondata-api` 4550.
- The two batch-load repos have no persistent HTTP server; they are run as Kubernetes CronJobs once per day per cluster.
- `rd-judicial-api` integrates with the external eLinks judiciary middleware API via `${ELINKS_URL}` — the only service in the product with an external third-party data feed.
- `rd-caseworker-ref-api` and `rd-judicial-api` both publish domain events to Azure Service Bus topics and send email reports to `DLRefDataSupport@hmcts.net`.
- Each API service reads its secrets from an Azure Key Vault mount at `/mnt/secrets/rd/` (`spring.config.import: optional:configtree:/mnt/secrets/rd/`).
- `rd-commondata-api` uses a custom schema name `dbcommondata` (not the default `public`) — Flyway migrations must reference this explicitly; see README for the local-dev workaround.
- `ccd-user-profile-api.json` in `platops/cnp-api-docs` is a separate spec for a CCD-internal user profile API — not the same as `rd-user-profile-api`.
