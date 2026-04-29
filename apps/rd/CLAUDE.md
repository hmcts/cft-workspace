---
service: rd
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - flyway
repos:
  - apps/rd/rd-professional-api
  - apps/rd/rd-location-ref-api
---

# Reference Data (RD)

The Reference Data product provides two standalone Spring Boot APIs that supply shared lookup data consumed by many other CFT services. `rd-professional-api` holds organisations, users, and professional relationships used for case access and firm management. `rd-location-ref-api` holds court building and service-area location data used for hearings, case routing, and caseworker assignment. Neither service is CCD-based; they are platform-level data stores queried over HTTP by service teams.

## Repos

- `apps/rd/rd-professional-api` — Professional Reference Data API: manages solicitor organisations, their users (PUI roles), and Judicial/Caseworker profile relationships; exposes REST endpoints consumed by XUI, AAC, iAC, FPL, and others.
- `apps/rd/rd-location-ref-api` — Location Reference Data API: provides court building locations, service codes, and region/area hierarchies; consumed by hearings, caseworker-ref, and payment services.

## Architecture

Both APIs are self-contained Spring Boot 3 / Java 21 services backed by independent PostgreSQL databases. `rd-professional-api` uses the schema `dbrefdata` (port 5428 by default); `rd-location-ref-api` uses `locrefdata` (port 5458). Flyway manages migrations for both, with migration scripts under `src/main/resources/db/migration` and `db/postgres`.

`rd-professional-api` additionally runs an Apache Camel data-load pipeline that ingests bulk CSV files from Azure Blob Storage (`rd-common-data` container) on a configurable cron schedule (default every 10 minutes). The pipeline uses ShedLock to prevent concurrent runs across replicas. The Camel routes are configured via `application-camel-routes-common.yaml` and `application-prd-user-details-router.yaml`.

Both services protect endpoints with S2S (service-auth-provider) and IDAM OAuth2/OIDC. Each declares an `s2s-authorised.services` allowlist — for example, `rd-professional-api` trusts `xui_webapp`, `aac_manage_case_assignment`, `fpl_case_service`, and others; `rd-location-ref-api` trusts `payment_app`, `rd_caseworker_ref_api`, and `rd_judicial_api`.

Both services use LaunchDarkly for feature flags (`LD_SDK_KEY` environment variable). Pact contract tests are published to the HMCTS Pact Broker, and both Jenkinsfiles register the services as `PROVIDER` in the pact pipeline on `master` and PR builds.

## External integrations

- `idam`: both services use `idam-java-client` and Spring Security OAuth2 resource-server; OIDC issuer configured at `${OPEN_ID_API_BASE_URI}` pointing at IDAM.
- `s2s`: both use `service-auth-provider-java-client` (version 5.3.3); S2S URL set via `${S2S_URL}`; microservice names are `rd_professional_api` and `rd_location_ref_api`.
- `flyway`: both services auto-apply Flyway migrations on startup; migration locations include a `db/postgres` subdirectory for PostgreSQL-specific scripts. Both Jenkinsfiles call `enableDbMigration('rd')`.

## Notable conventions and quirks

- `rd-professional-api` runs on port 8090; `rd-location-ref-api` on port 8099. Both expose health at `/health`.
- The Camel bulk-load job in `rd-professional-api` reads and archives CSVs from Azure Blob (`rd-common-data` / `rd-common-data-archive`). This is the only service in the workspace that uses camel-azure for bulk data ingestion.
- Both Jenkinsfiles sync `demo`, `ithc`, and `perftest` branches from master automatically via `syncBranchesWithMaster`.
- Both services use Caffeine caching for S2S tokens (`maximumSize=50, expireAfterWrite=1m`).
- `rd-professional-api` has a `deleteOrganisationEnabled` flag (default `false`) and an `activeOrgsExternalEnabled` flag, both controlled by environment variable.
