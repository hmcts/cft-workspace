---
service: hmc
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - am
  - flyway
api_specs:
  - apps/hmc/hmc-cft-hearing-service:hmc-cft-hearing-service.json
  - apps/hmc/hmc-hmi-inbound-adapter:hmc-hmi-inbound-adapter.json
  - apps/hmc/hmc-hmi-outbound-adapter:hmc-hmi-outbound-adapter.json
repos:
  - apps/hmc/hmc-cft-hearing-service
  - apps/hmc/hmc-hmi-inbound-adapter
  - apps/hmc/hmc-hmi-outbound-adapter
  - apps/hmc/hmc-admin-ui
---

# HMC — Hearings Management Component

HMC is the shared platform component that manages court hearing requests across CFT services. It provides a central API that service-team hearing adapters (civil, et, ia, prl, sscs, sptribs, etc.) use to create, update and link hearings, and brokers all communication with the Hearings Management Interface (HMI) — the downstream system operated by hearing centre listing providers.

## Repos

- `apps/hmc/hmc-cft-hearing-service` — the core Spring Boot API (port 4561); owns the hearing data model, PostgreSQL DB, access control, and Service Bus messaging; the primary integration point for CFT service teams
- `apps/hmc/hmc-hmi-inbound-adapter` — Spring Boot service (port 4559) that receives hearing-status update messages from HMI via Azure Service Bus queue and forwards them to `hmc-cft-hearing-service`
- `apps/hmc/hmc-hmi-outbound-adapter` — Spring Boot service (port 4558) that reads pending hearing requests from the shared PostgreSQL DB, converts them to HMI format, and dispatches them via Azure Service Bus; also manages pending-request lifecycle (retry, escalation, deletion)
- `apps/hmc/hmc-admin-ui` — Express/TypeScript Node.js admin interface (port 3000) for operational support; built with GOV.UK Frontend and Nunjucks; uses `hmc_tech_admin` role for access control against the core hearing service

## Architecture

`hmc-cft-hearing-service` is the hub of the product. CFT service teams call its REST API (authenticated via IDAM/S2S) to submit hearing requests and query hearing state. It persists hearing data in a PostgreSQL database managed by Flyway migrations (under `src/main/resources/db/migration/`). When a hearing request is accepted it publishes a message to an outbound Azure Service Bus queue; it also subscribes to an inbound queue to receive updates from HMI. Access control is gated against `am-role-assignment-service` (via a `RoleAssignmentService` backed by a Feign client at `${ROLE_ASSIGNMENT_URL:http://localhost:4096}`). The service also calls `ccd-data-store-api` (`${CCD_DATA_STORE_API_BASE_URL}`) to look up case details for access-checking — this is not case storage, just a lookup.

`hmc-hmi-outbound-adapter` polls a shared view of the `hmc-cft-hearing-service` database for pending hearing requests and dispatches them to HMI via Azure Service Bus. It tracks pending-request state (retry intervals, escalation windows, exception thresholds) and writes results back. It uses Feign to call HMI endpoints (`${HMI_BASE_URL}`) after acquiring an OAuth2 token from the hearing listing provider's Azure AD (`${FH_BASE_URL}`).

`hmc-hmi-inbound-adapter` listens on an Azure Service Bus queue (`${HMC_SERVICE_BUS_QUEUE}`) for status-update messages published by HMI. On receipt it authenticates against IDAM as a system user and forwards the update to `hmc-cft-hearing-service` at `${CFT_HEARING_SERVICE_URL:http://localhost:4561}` using S2S. Hearing updates are then published to a Service Bus topic so subscribing CFT services can react.

The three Service Bus resources are: an inbound queue (HMI→inbound-adapter), an outbound queue (core-service→outbound-adapter), and an external topic that `hmc-cft-hearing-service` publishes to (for service-team subscribers). All credentials come from the `hmc` Azure Key Vault.

## External integrations

- `idam`: `idam-java-client` used by `hmc-cft-hearing-service` and `hmc-hmi-inbound-adapter`; the inbound adapter authenticates as a system user (`${HMC_SYSTEM_USER_ID}`) to forward updates
- `s2s`: `service-auth-provider-java-client` used by all three Java services; `hmc-cft-hearing-service` authorises `xui_webapp`, `hmc_hmi_inbound_adapter`, `sscs`, `fis_hmc_api`, `pcs_api` by default
- `am`: `hmc-cft-hearing-service` calls `am-role-assignment-service` at `${ROLE_ASSIGNMENT_URL}` to enforce access control on hearing requests; role is checked per-request via `RoleAssignmentService`
- `flyway`: Flyway manages the `hmc_cft_hearing_service` PostgreSQL schema in `hmc-cft-hearing-service`; migration files follow a `V<date>_<ticket>__<description>.sql` naming convention

## Notable conventions and quirks

- `hmc-cft-hearing-service` uses `rse-cft-lib` (plugin `com.github.hmcts.rse-cft-lib`) for its `bootWithCCD` local development task, which embeds CCD in-process. Despite this, HMC is not CCD-based — CCD is used only for case-detail lookups, not as a case store.
- The outbound adapter shares the core service's PostgreSQL instance rather than having its own. It reads from a `MaxHearingRequestVersionView` and writes pending-request state back without going through the core API.
- Access control in `hmc-cft-hearing-service` can be disabled entirely via `HMC_ACCESS_CONTROL_ENABLED=false` (default `true`), which is set to `false` in the `bootWithCCD` task.
- The inbound-adapter's `swagger.yml` includes an extra branch `fix-swagger-ft-dp-1` in its trigger list alongside `master`, which is a leftover development branch condition.
- All three Java services expose their Swagger specs to `hmcts/reform-api-docs` (the legacy swagger destination) via `SwaggerPublisherTest` integration tests; the spec filename is derived from `$GITHUB_REPOSITORY` (i.e., the bare repo name) and confirmed present in `platops/cnp-api-docs/docs/specs/`.
