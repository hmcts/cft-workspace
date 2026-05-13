---
service: payment
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - rd
  - notify
  - bulk_scan
api_specs:
  - apps/payment/ccpay-payment-app:ccpay-payment-app.payments.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.payment2.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.payment-external-api.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.bulk-scanning.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.telephony.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.recon-payments.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.recon-payments-v0.1.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.recon-payments-v0.2.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.recon-payments-v0.3.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.recon-payments-v1.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.reference-data.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.freg_api.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.freg_api1.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.refunds-list.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.refunds-status.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.refunds-status-v1.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.payment-status.json
  - apps/payment/ccpay-payment-app:ccpay-payment-app.payment-status-update.json
repos:
  - apps/payment/ccpay-payment-app
  - apps/payment/ccpay-bubble
  - apps/payment/ccpay-payment-api-gateway
  - apps/payment/ccpay-bulkscanning-app
  - apps/payment/ccpay-refunds-app
  - apps/payment/ccpay-notifications-service
  - apps/payment/ccpay-service-request-cpo-update-service
  - apps/payment/ccpay-scheduled-jobs
  - apps/payment/ccpay-paymentoutcome-web
confluence_spaces:
  - PAY
---

# Payment (Fees & Pay)

The HMCTS Fees & Pay platform is the central payment infrastructure used by all CFT service teams. It wraps GOV.UK Pay and the PCI-PAL telephony payment providers (Antenna and Kerv), adds IDAM/S2S authorisation, enforces a structured payment-reference scheme, and aggregates data across multiple GOV.UK Pay accounts to support financial reconciliation. The platform is not CCD-based — it does not hold case data in CCD, though it can record case references against payment records.

## Repos

- `apps/payment/ccpay-payment-app` — Spring Boot core payment gateway; exposes REST APIs for card (GOV.UK Pay), telephone (PCI-PAL), Payment By Account (Liberata PBA), and bulk-scanning cash/cheque receipts; owns the `payment` PostgreSQL schema; Liquibase-managed
- `apps/payment/ccpay-refunds-app` — Spring Boot refunds API; handles refund requests, Liberata reconciliation callbacks, and sends notification triggers to `ccpay-notifications-service`; Liquibase-managed
- `apps/payment/ccpay-notifications-service` — Spring Boot notifications service; sends GOV.UK Notify emails and letters for refund events; Liquibase-managed
- `apps/payment/ccpay-bulkscanning-app` — Spring Boot API capturing cash/cheque payment data from the bulk-scanning pipeline (Exela) and forwarding it to `ccpay-payment-app`; Liquibase-managed
- `apps/payment/ccpay-bubble` — Angular 18 + Express.js staff-facing web UI (PayBubble) for reviewing and managing payments; two embedded web components: `view-payment` and `fee-register-search`
- `apps/payment/ccpay-paymentoutcome-web` — Express/TypeScript citizen-facing payment outcome page shown after a GOV.UK Pay redirect
- `apps/payment/ccpay-payment-api-gateway` — Terraform-only repo; configures the Azure API Management (APIM) gateway for Liberata reconciliation endpoints; no deployable artefact
- `apps/payment/ccpay-scheduled-jobs` — Standalone JAR (included as a dependency in `ccpay-payment-app`) that runs scheduled web jobs: CSV pay-reports emailed per service/payment-method, card-payment status updates, refund notification polling
- `apps/payment/ccpay-service-request-cpo-update-service` — Spring Boot listener that consumes an Azure Service Bus topic and forwards service-request updates to the Case Payment Orders API (`cpo-case-payment-orders-api`)

## Architecture

`ccpay-payment-app` is the hub. It is a multi-module Gradle project (`payment-api`, `payment-model`, `gov-pay-client`, `payment-reference-data`, `payment-otp`, `payment-api-contract`, `case-payment-orders-client`) assembled into a single Spring Boot jar exposed on port 8080. All inbound requests require both an IDAM user JWT (`Authorization`) and an S2S service JWT (`ServiceAuthorization`). Outbound calls go to: GOV.UK Pay public API; PCI-PAL Antenna/Kerv OAuth token and launch endpoints; Liberata PBA account validation; the Fees Register; and the Case Payment Orders API (`cpo-case-payment-orders-api`). The service also publishes payment-status callback events via Azure Service Bus (`ASB_CONNECTION_STRING` / `ccpay-service-callback-topic`) to consuming services (civil, ia, pcs etc.).

`ccpay-bulkscanning-app` receives cash/cheque receipt events from the bulk-scan pipeline (Exela gateway) and posts them into `ccpay-payment-app` via its bulk-scanning REST API endpoint. `ccpay-refunds-app` calls `ccpay-payment-app` for payment lookups and calls `ccpay-notifications-service` to trigger GOV.UK Notify letters/emails when a refund is issued or status changes. `ccpay-notifications-service` holds its own `notifications` PostgreSQL schema and calls GOV.UK Notify directly (`notifications-java-client`). `ccpay-scheduled-jobs` is included as a Gradle dependency in `ccpay-payment-app` and is invoked by shell scripts that call the `/jobs/*` endpoints on the main API.

`ccpay-service-request-cpo-update-service` listens on an AMQP/Azure Service Bus topic and pushes updates to the Case Payment Orders API when service-request payment statuses change. `ccpay-bubble` is a staff Angular SPA served via Express at port 3000, connecting directly to `ccpay-payment-app` for payment data. `ccpay-paymentoutcome-web` is an Express TypeScript app at port 3100 that displays the post-payment outcome page for citizens.

All Java services use `service-auth-provider-java-client` (S2S) and `auth-checker-lib`/IDAM for authentication. Database schemas in `ccpay-payment-app` and `ccpay-bulkscanning-app` are managed with Liquibase (not Flyway); `ccpay-refunds-app` and `ccpay-notifications-service` likewise use Liquibase. The Jenkinsfile for each calls `enableDbMigration('ccpay')`.

## External integrations

- `idam` — all inbound API requests validated via `auth-checker-lib`; IDAM base URL in `auth.idam.client.baseUrl` / `AUTH_IDAM_CLIENT_BASEURL`
- `s2s` — `service-auth-provider-java-client` used across all Java services; trusted service list in `ccpay-payment-app` covers ~20 CFT services (cmc, ccd_gw, xui_webapp, pcs_api, civil_service, nfdiv_case_api, etc.)
- `rd` — `ccpay-payment-app` calls `rd-location-ref-api` via `rd.location.url` / `RD_LOCATION_BASE_URL`; also holds an `auth.ref.data.baseUrl` for a reference-data lookup
- `notify` — `ccpay-notifications-service` and `ccpay-refunds-app` both pull `uk.gov.service.notify:notifications-java-client:5.2.1-RELEASE` and send GOV.UK Notify emails and letters for refund lifecycle events; API keys configured via `LETTER_APIKEY` / `EMAIL_APIKEY`
- `bulk_scan` — `ccpay-bulkscanning-app` receives payment envelopes from the bulk-scan/Exela pipeline; `ccpay-payment-app` calls `CCPAY_BULK_SCANNING_API_URL` during functional tests

## Notable conventions and quirks

- All published OpenAPI specs for the product come from `ccpay-payment-app` alone — 18 spec files registered in `platops/cnp-api-docs/docs/specs/` with the `ccpay-payment-app.*` prefix. `ccpay-refunds-app`, `ccpay-notifications-service`, and `ccpay-service-request-cpo-update-service` each have a `SwaggerPublisherTest` that writes to `/tmp/swagger-specs.json` but have no workflow to publish to the central registry.
- `ccpay-payment-app` includes `core-case-data-store-client` as a Gradle dependency but explicitly excludes `CoreCaseDataClientAutoConfiguration` in `application.properties` (`spring.autoconfigure.exclude=...`). The `core_case_data.api.url` property is present for optional supplementary lookups only — this is not a CCD-based service.
- PCI-PAL is integrated via two providers: Antenna (strategic, used for probate/divorce/PRL/IAC) and Kerv, each with separate OAuth credential sets per jurisdiction. Per-jurisdiction `flow.id` properties drive which PCI-PAL flow is launched.
- LaunchDarkly feature flags control runtime behaviour including duplicate-payment checks (`feature.duplicate.payment.check`) and bulk-scan validation (`feature.bulk.scan.payments.check`).
- `ccpay-scheduled-jobs` is not a standalone deployment — it is a JAR dependency of `ccpay-payment-app`. Reports are triggered via `POST /jobs/email-pay-reports?payment_method=...` from shell scripts in `ccpay-payment-app`.
- `ccpay-payment-app` is a Pact provider (`enablePactAs([PROVIDER])` in its Jenkinsfile); consumer Pact tests run against `pact-broker.platform.hmcts.net`.
- Branches `demo`, `ithc`, and `perftest` are kept in sync with `master` via `syncBranchesWithMaster` in `ccpay-payment-app`'s Jenkinsfile.
- The `payment-api` directory visible under `apps/payment/` is a stale local duplicate of `ccpay-payment-app` — it is not listed in `workspace.yaml` and should be ignored.
