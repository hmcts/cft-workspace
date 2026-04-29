---
service: payment
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - rd
  - bulk_scan
repos:
  - apps/payment/ccpay-payment-app
---

# Payment

The HMCTS Payment Gateway (`ccpay-payment-app`) is the central Fees & Pay platform service used by all HMCTS service teams to create and manage court payments. It wraps the GOV.UK Pay API and the PCI-PAL telephony payment providers, enforcing a consistent payment-reference structure, multi-account aggregation, and financial reconciliation data across the entire CFT portfolio. It is not a case-data service — it does not use CCD as a store, though it can record case references against payment records.

## Repos

- `apps/payment/ccpay-payment-app` — Spring Boot payment gateway; exposes REST APIs for card payments (GOV.UK Pay), telephone payments (PCI-PAL Antenna/Kerv), Payment By Account (PBA/Liberata), bulk-scanning cash receipts, and refunds; owns the `payment` PostgreSQL schema

## Architecture

`ccpay-payment-app` is a multi-module Gradle project with sub-modules for the API (`payment-api`), data model (`payment-model`), GOV.UK Pay HTTP client (`payment-gov-pay-client`), reference data (`payment-reference-data`), OTP generation (`payment-otp`), API contract definitions (`payment-api-contract`), and a client for the Case Payment Orders service (`case-payment-orders-client`). The assembled Spring Boot jar (`payment-app.jar`) is the sole deployable artefact, exposed on port 8080.

All inbound requests require both an IDAM user JWT (`Authorization` header) and an S2S service JWT (`ServiceAuthorization` header). URL-based authorisation restricts users to their own `/users/{userId}/payments/*` paths. Outbound calls are made to GOV.UK Pay's public API, PCI-PAL Antenna/Kerv OAuth token and launch endpoints, Liberata PBA account validation, the Fees Register, IAC Supplementary Info, and a Case Payment Orders API. The service also fires callback notifications to consuming services via an Azure Service Bus topic (`ccpay-service-callback-topic`).

Database schema changes are managed with Liquibase (not Flyway); migrations live under `api/src/main/resources/db/changelog/`. The Jenkinsfile invokes `enableDbMigration('ccpay')` to run Liquibase during pipeline deployment. The pipeline also configures Pact contract tests with a Pact broker (`pact-broker.platform.hmcts.net`), marking this service as a Pact provider.

## External integrations

- `idam` — all inbound requests validated via `auth-checker-lib` and `service-auth-provider-java-client`; IDAM base URL in `auth.idam.client.baseUrl`
- `s2s` — `service-auth-provider-java-client` v5.3.3 (`idam.s2s-auth.*` properties); trusted service names list covers all consuming CFT services
- `rd` — calls `rd-location-ref-api` via `rd.location.url` property
- `bulk_scan` — integrates with `ccpay-bulkscanning-api` for cash/cheque receipts from bulk scanning; URL configured via `bulk.scanning.payments.processed.url`

## Notable conventions and quirks

- The `payment-api` directory under `apps/payment/` is a second clone of the same GitHub repo (`hmcts/ccpay-payment-app`) and is not listed in `workspace.yaml`. It appears to be a stale duplicate — treat `ccpay-payment-app` as the canonical clone.
- Refund endpoints exist in the service but the README explicitly states they will not work due to MoJ financial back-office constraints.
- The service pulls in `core-case-data-store-client` but explicitly excludes its autoconfiguration (`CoreCaseDataClientAutoConfiguration`). The `core_case_data.api.url` property is present for soft lookups only.
- PCI-PAL is integrated via two providers: Antenna (strategic) and Kerv, each with separate OAuth credential sets per jurisdiction (probate, divorce, PRL, IAC).
- LaunchDarkly feature flags control runtime behaviour (e.g. duplicate payment checks, bulk-scan validation).
- Branches `demo`, `ithc`, and `perftest` are kept in sync with `master` via `syncBranchesWithMaster` in the Jenkinsfile.
