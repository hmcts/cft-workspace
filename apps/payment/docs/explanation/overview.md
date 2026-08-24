---
title: Overview
topic: overview
diataxis: explanation
product: payment
audience: both
sources:
  - ccpay-payment-app:api/src/main/resources/application.properties
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CreditAccountPaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/pcipal/TelephonyController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/ServiceRequestController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/GovPayDelegatingPaymentService.java
  - ccpay-payment-app:gov-pay-client/src/main/java/uk/gov/hmcts/payment/api/external/client/GovPayClient.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/PciPalPaymentService.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/AccountServiceImpl.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/LiberataService.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/util/ReferenceUtil.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/model/PaymentStatus.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/MaintenanceJobsController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentGroupController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/AccountController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentStatusController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/mapper/PBAStatusErrorMapper.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/mapper/ServiceRequestDomainDataEntityMapper.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/mapper/PaymentDtoMapper.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/service/ServiceRequestDomainServiceImpl.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/service/RefundRemissionEnableServiceImpl.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/configuration/LaunchDarklyFeatureToggler.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/util/PayStatusToPayHubStatus.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/TelephonySystem.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/AntennaTelephonySystem.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/KervTelephonySystem.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/PaymentServiceImpl.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/UserAwareDelegatingPaymentService.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/configuration/FeatureToggler.java
  - ccpay-payment-app:api/src/main/resources/db/changelog/db.changelog-refdata.yaml
  - ccpay-payment-app:api/src/main/resources/db/changelog/db.changelog-0.0.6.yaml
  - ccpay-payment-app:api/src/main/resources/db/changelog/db.changelog-0.0.8.yaml
  - ccpay-payment-app:api/src/main/resources/db/changelog/db.changelog-0.0.9.yaml
  - ccpay-payment-app:settings.gradle
  - cnp-flux-config:apps/fees-pay/ccpay-callback-function/ccpay-callback-function.yaml
  - cnp-flux-config:apps/fees-pay/status-payment-job/status-payment-job.yaml
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1952809367"
    title: "Fees & Payments Service Knowledge (systems)"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1952812014"
    title: "Payment Processing"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1952815186"
    title: "Payment Lifecycle"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1952811686"
    title: "Payment Methods"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1952811611"
    title: "Service Requests Overview"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1958058001"
    title: "Service Callback LLD"
    last_modified: "2026-06-01"
    space: "DTSFP"
  - id: "1952812626"
    title: "Ways to Pay for Citizens"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1958061399"
    title: "Real Time PBA Payments HLD"
    last_modified: "2026-06-01"
    space: "DTSFP"
confluence_checked_at: "2026-08-20T00:00:00Z"
sources_sha:
  "ccpay-payment-app:api/src/main/resources/application.properties": "1908ddc16a3f086c816e17c1ff8b27bee4b8f414"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CreditAccountPaymentController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/pcipal/TelephonyController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/ServiceRequestController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java": "af2825478c26ce3bf534be6fd51c309f8f30e07e"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/GovPayDelegatingPaymentService.java": "4ad418c9d46f4d82cf3cc50a83620cfe86a17d42"
  "ccpay-payment-app:gov-pay-client/src/main/java/uk/gov/hmcts/payment/api/external/client/GovPayClient.java": "5c28ea10564258d9c193bead87675b85afa50c21"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/PciPalPaymentService.java": "cd90241f94938ecec08b8768ce5e2bb4fc4fa5ab"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/AccountServiceImpl.java": "db1fcc54a4fb30ca256c1fa1b465d65369ae653b"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/LiberataService.java": "5c28ea10564258d9c193bead87675b85afa50c21"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/util/ReferenceUtil.java": "f200d99c269e2871d1dfdce27187cad4b02c2c73"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/model/PaymentStatus.java": "5c28ea10564258d9c193bead87675b85afa50c21"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java": "eb705202fee5f0ee030daa3e71c1366be0c83a47"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/MaintenanceJobsController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentGroupController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/AccountController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentStatusController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/mapper/PBAStatusErrorMapper.java": "89b67ec9107bf106e0f07b0e31bf3bb996a30ba8"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/mapper/ServiceRequestDomainDataEntityMapper.java": "12ba331815bfe64352efdc106dfd650ce6b68daa"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/mapper/PaymentDtoMapper.java": "5b3f2699cf9bc81f927d28766a8731a16f9d58f9"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/service/ServiceRequestDomainServiceImpl.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/service/RefundRemissionEnableServiceImpl.java": "65bcad2ffb092e534b051dbb0349914658506a57"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/configuration/LaunchDarklyFeatureToggler.java": "65bcad2ffb092e534b051dbb0349914658506a57"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/util/PayStatusToPayHubStatus.java": "1aec5909aac1e66f1cd19cbdd2aac2009c42aa68"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/TelephonySystem.java": "e73670ad6d187564188d1f828e551dc1554074a9"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/AntennaTelephonySystem.java": "c144ef6b6c298b35f14cf2400b4d8fad4d57b3e7"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/KervTelephonySystem.java": "c144ef6b6c298b35f14cf2400b4d8fad4d57b3e7"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/PaymentServiceImpl.java": "109655a0103cf081d4da2680872c7f77351f6e16"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/UserAwareDelegatingPaymentService.java": "65bcad2ffb092e534b051dbb0349914658506a57"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/configuration/FeatureToggler.java": "3e9ece1186c812f47690ff5020d35b37f163cb63"
  "ccpay-payment-app:api/src/main/resources/db/changelog/db.changelog-refdata.yaml": "17f30d3afb0d93af7a34eac0e07cb5d6120c93ba"
  "ccpay-payment-app:api/src/main/resources/db/changelog/db.changelog-0.0.6.yaml": "49aa8817f619e226e00c1f1010299dba05898908"
  "ccpay-payment-app:api/src/main/resources/db/changelog/db.changelog-0.0.8.yaml": "c0cb9c298edd78221ec9c47f0fc43e71f1df4e4a"
  "ccpay-payment-app:api/src/main/resources/db/changelog/db.changelog-0.0.9.yaml": "1eecc96d51c2a425d51bc20682ab252806a62ff6"
  "ccpay-payment-app:settings.gradle": "7bafc8bc5e167ac022ea09d0d178dda6df95e09b"
  "cnp-flux-config:apps/fees-pay/ccpay-callback-function/ccpay-callback-function.yaml": "d0c0963e9f746ac8fc5038459af65c77d786a96f"
  "cnp-flux-config:apps/fees-pay/status-payment-job/status-payment-job.yaml": "5632e1e8c45f3270060c58942c68c44b69045bc4"
---

## TL;DR

- HMCTS Fees & Pay (`ccpay-payment-app`) is the central payment gateway; it wraps GOV.UK Pay (card), PCI-PAL (telephony), and Liberata (Pay By Account) behind a unified REST API with IDAM + S2S authorisation.
- Service teams never call GOV.UK Pay or PCI-PAL directly; they call the Payment API which routes to the correct provider, maps credentials per-service, and persists a structured payment reference (format `RC-XXXX-XXXX-XXXX-XXXC` with Luhn check digit) for reconciliation.
- The "Service Request" model is the strategic integration pattern: services create a service request, attach payments to it, and receive status callbacks -- enabling retry without duplicate records.
- Payment-status callbacks flow through Azure Service Bus to a Function Node that delivers PUT requests to consuming services, retrying up to 5 further times at 30-minute intervals if the service does not return a 2XX.
- Liberata reconciles payment data twice per day via `/payments` and `/reconciliation-payments` endpoints; a Real Time PBA initiative is designed to shift PBA payments to instant Liberata validation with no overnight reconciliation needed, but is not yet in source.
- The service is NOT CCD-based. It records `ccd_case_number` against payment records but does not store case data in CCD.

## Platform responsibilities

The Fees & Payments platform and its consuming services have clearly delineated responsibilities:

| Responsibility | Fees & Payments | Consuming Service |
|----------------|:-:|:-:|
| Provide payment APIs | Y | |
| Integrate with payment providers (GOV.UK Pay, PCI-PAL, Liberata) | Y | |
| Generate payment references | Y | |
| Manage payment status tracking | Y | |
| Create Service Requests | | Y |
| Redirect users to payment providers | | Y |
| Retrieve payment status (poll or receive callback) | | Y |
| Progress case workflow after payment (CCD event) | | Y |

## Payment lifecycle

The typical end-to-end payment lifecycle:

1. **Fee identification** — service retrieves the applicable fee from the Fees Register API.
2. **Service request creation** — service creates a Service Request to represent the payment requirement.
3. **Payment initiation** — service requests a payment link or initiates PBA payment via the relevant endpoint.
4. **Payment processing** — Fees & Payments routes to the appropriate provider.
5. **Status update** — provider returns outcome; the Payment Status Update Job polls GOV.UK Pay for outstanding card payments.
6. **Payment allocation** — payment is allocated to fees via Apportionment rules (when `apportion-feature` LaunchDarkly flag is enabled).
7. **Callback delivery** — status is published to ASB and delivered to the service's callback URL.
8. **Case progression** — service fires a CCD event to advance the case.

## What problem does Payment solve?

GOV.UK Pay provides the card-payment rails for government services, but each HMCTS jurisdiction requires its own GOV.UK Pay account (with separate API keys), its own PCI-PAL telephony flow, and its own PBA billing reference. Without a central gateway, every service team would independently integrate with these providers, duplicate auth/retry logic, and fragment reconciliation data.

`ccpay-payment-app` solves this by:

1. **Abstracting provider integration** — a single `POST /card-payments` or `POST /credit-account-payments` endpoint regardless of underlying provider.
2. **Enforcing authentication** — all inbound requests require both an IDAM user JWT and an S2S service JWT (`trusted.s2s.service.names` defines 24 trusted S2S callers including `xui_webapp`, `civil_service`, `pcs_api`, `nfdiv_case_api`).
3. **Generating structured payment references** — the `payment_fee_link.payment_reference` ties a payment group (fees + remissions + payments) together for downstream reconciliation.
4. **Aggregating for reconciliation** — Liberata pulls payment data via `/payments` and `/reconciliation-payments` with filters on `payment_method`, `service_name`, `ccd_case_number`, `start_date`, `end_date`.

## Payment channels

### Card payments (GOV.UK Pay)

The primary online payment channel. The flow is:

```mermaid
sequenceDiagram
    participant ST as Service Team App
    participant PA as ccpay-payment-app
    participant GP as GOV.UK Pay

    ST->>PA: POST /card-payments (+ return-url header)
    PA->>PA: Resolve GOV.UK Pay API key for service
    PA->>GP: POST /v1/payments (amount in pence)
    GP-->>PA: {payment_id, next_url, ...}
    PA-->>ST: 201 {reference, next_url}
    ST->>GP: Redirect citizen to next_url
    GP-->>PA: Callback / status poll
    PA->>PA: Persist status, publish to ASB
```

Key implementation details:

- Each HMCTS service has a named GOV.UK Pay API key configured via `gov.pay.auth.key.<service>` properties (`GovPayConfig:9`). The `ServiceToTokenMap` maps human-readable service names (e.g. `"divorce"`) to property key names (e.g. `"divorce_frontend"`) (`ServiceToTokenMap:13-27`).
- Amounts are converted from pounds to pence with `movePointRight(2).intValue()` before forwarding to GOV.UK Pay (`GovPayDelegatingPaymentService:46-52`).
- `return-url` and `service-callback-url` are passed as request headers, not in the body (`CardPaymentController:119-121`).
- Resilience4j circuit breakers protect both create and retrieve calls (`GovPayClient:55-77`).
- GOV.UK Pay URL: `gov.pay.url=${GOV_PAY_URL:https://publicapi.payments.service.gov.uk/v1/payments}` (in `application.properties`).

### Telephony payments (PCI-PAL)

For telephone-channel payments, PCI-PAL handles PCI-DSS-compliant card capture. Two provider configurations are wired as Spring components, each supplying the same set of credentials and per-service flow IDs from its own property prefix:

| Provider | System name | Property prefix | Environment prefix |
|----------|-------------|-----------------|--------------------|
| Antenna | `antenna` (`AntennaTelephonySystem:14`) | `pci-pal.antenna.*` | `PCI_PAL_ANTENNA_*` (`application.properties:42-55`) |
| Kerv | `kerv` (`KervTelephonySystem:14`) | `pci-pal.kerv.*` | `PCI_PAL_KERV_*` (`application.properties:58-70`) |

`POST /payment-groups/{payment-group-reference}/telephony-card-payments` accepts only Kerv. A missing or empty `telephonySystem` in the request body is defaulted to `kerv`, and any other value is rejected with a `TelephonyServiceException` (`PaymentGroupController:629-638`). The Antenna configuration is not reachable through that endpoint.

Flow IDs are keyed by service type, not by provider. `TelephonySystem.getFlowId()` recognises `Probate`, `Divorce`, `Specified Money Claims`, `Financial Remedy`, `Family Private Law` and `Immigration and Asylum Appeals`, and throws a `PaymentException` for any other service type (`TelephonySystem:35-48`) — a service outside that set cannot take a telephony payment at all. `Specified Money Claims` and `Financial Remedy` both resolve to the `strategic` flow ID.

The flow: the call agent's application obtains an OAuth token for the provider (`PciPalPaymentService:116`), then launches a PCI-PAL flow with the resolved `flowId` (`PciPalPaymentService:70-113`). PCI-PAL redirects the agent into a framed card-capture page. On completion, PCI-PAL calls back to `POST /telephony/callback` with `orderReference` and `transactionResult` (`TelephonyController:47-53`). The `transactionResult` is lower-cased and looked up directly against the `payment_status` table, so any value that is not a seeded status name fails the lookup (`PaymentServiceImpl:114-119`). A payment already in `success` is left untouched and the attempt is recorded as a `DUPLICATE_STATUS_UPDATE` audit event (`PaymentServiceImpl:139-147`).

<!-- CONFLUENCE-ONLY: not verified in source -->
**Business rule**: telephony payments must cover **all outstanding fees** for a case. Partial telephony payments are not permitted. This contrasts with card payments where partial payment scenarios can occur via separate service requests.

### Pay By Account (Liberata PBA)

Professional users (solicitors) pay using their PBA account. The flow:

1. Service team calls `POST /credit-account-payments` with the PBA number.
2. Payment API calls Liberata's account validation endpoint (`GET ${liberata.api.account.url}/{pbaCode}`) to check the account is `ACTIVE` (`AccountServiceImpl:72-76`). The default URL targets Liberata's v2 account API (`application.properties:81`).
3. If the account is active with sufficient available balance, the payment is created with status `success`; otherwise it is created with status `failed` and a status-history error code — `CA-E0001` for insufficient funds, `CA-E0003` for on-hold, `CA-E0004` for deleted (`PBAStatusErrorMapper:23-56`).
4. Every `failed` outcome returns the same HTTP 403 on this endpoint (`CreditAccountPaymentController:168-171`), so the caller has to read the error code out of the response body to tell insufficient funds from an unusable account. Account lookup failure returns 404 and an unreachable Liberata returns 504 (`CreditAccountPaymentController:149-155`).

The distinct 410 (deleted) and 412 (on hold) statuses belong to the standalone account lookup `GET /accounts/{accountNumber}` (`AccountController:65-69`) and to the service-request PBA endpoint — see [Payment Lifecycle](payment-lifecycle.md#paying-against-a-service-request) for that mapping.

Liberata integration uses OAuth2 password grant for token acquisition (`LiberataService:36-58`) and Resilience4j time-limiters (15s timeout, `application.properties:244-245`).

<!-- CONFLUENCE-ONLY: not verified in source -->
The PBA API has evolved through multiple versions (v1, v2, v3). New services are expected to integrate with **PBA v3** (via the service-request endpoint `POST /service-request/{ref}/pba-payments`). PBA payments are ultimately settled through **direct debit** by Liberata.

### Real Time PBA (in design)

<!-- CONFLUENCE-ONLY: design-only; verified absent from source at origin/master — LiberataService (model module) still has only getAccessToken() with an OAuth2 password grant, and there is no pbaPayment() method, no Sanctum token/refresh endpoints, and no PBA_PAYMENT_RECONCILIATION_IGNORE property. See architecture.md for the full absence check. -->
The current PBA model relies on credit-limit checks using data updated overnight, meaning decisions can be based on information up to 24 hours old. A "Real Time PBA" initiative is designed to change this:

- The RC transaction reference is generated **upfront** (before calling Liberata), so every request is tracked from the start.
- PayHub calls a **new** Liberata PBA payment API which validates the account and debits it in one call, replacing the current pattern of checking the account and settling later.
- Outcomes are instant: `Success` or `Failed` with no overnight reconciliation needed for these transactions — PBA payments are to be excluded from the `/reconciliation-payments` feed via a new environment-variable toggle.
- Transactions can enter a `Pending` state if the Liberata API times out; a scheduled job monitors pending transactions and brings them to a terminal state.
- Idempotency is enforced to prevent duplicate transactions.

This enables bulk-claim scenarios (Civil, TEC) where multiple PBA payments in a batch need real-time credit validation to avoid exceeding limits.

The design is deliberately contained: the HLD states that the rules for allowing a transaction do not change, Liberata still decides success or failure, and the PayHub API contract stays as it is — only the backend service layer changes, so consuming services need do nothing. Two things do change beyond PayHub's internals. The legacy `POST /credit-account-payments` endpoint is to be **retired**, with FPL the last remaining consumer needing to move to `POST /service-request/{ref}/pba-payments`; this is tracked as the design's principal dependency, because the legacy endpoint is not idempotent and making it real-time would risk duplicate payments. And PBA payments on IAC cases will **fail** if the `surname` and `case_reference` supplementary data is missing, rather than proceeding without it. The new Liberata API also moves authentication to Laravel Sanctum sliding-session bearer tokens; see [Architecture](architecture.md#real-time-pba-processing-in-design) for the token lifecycle and the error-code remapping.

### Bulk scan (cash/cheque)

`ccpay-bulkscanning-app` receives payment envelopes from the Exela bulk-scan pipeline (cash and cheque payments posted by citizens) and forwards them into `ccpay-payment-app` via its bulk-scanning REST endpoint.

## Service Request model

The strategic integration pattern uses "service requests" (also called "Ways to Pay") rather than direct payment creation. A Service Request represents a single payment requirement for a case and acts as the persistent container for payment attempts.

### Lifecycle

1. **Fee identification** — the service retrieves the applicable fee from the Fees Register API.
2. **Service request creation** — `POST /service-request` creates a payment group (fees, amounts, case reference, callback URL).
3. **Payment initiation** — `POST /service-request/{ref}/card-payments` or `POST /service-request/{ref}/pba-payments` attaches a payment to the group.
4. **Payment processing** — the payment is processed through the relevant channel (GOV.UK Pay / Liberata PBA).
5. **Status callback** — on payment completion, a callback is sent to the service's registered URL.
6. **Case progression** — the service progresses the case workflow (typically a CCD event).

If a payment attempt fails, the **same Service Request is reused** for the next attempt. Services must not create duplicate Service Requests for the same fee requirement -- doing so leads to duplicate payment records.

### Service request statuses

The callback response carries a `service_request_status` field with one of:

| Status | Meaning |
|--------|---------|
| `Paid` | Full payment received |
| `Partially paid` | Payment covers some but not all of the required amount |
| `Not paid` | Payment failed |

These values are computed by `ServiceRequestUtil.getServiceRequestStatus()`.

### Idempotency

PBA payments via service requests include idempotency protection: a request hashcode is checked against the `idempotency_keys` table before creating a duplicate (`ServiceRequestController:166-199`).

### Ways to Pay (citizen vs professional)

<!-- CONFLUENCE-ONLY: not verified in source -->

| Feature | Citizens | Professionals |
|---------|----------|---------------|
| Payment channels | Online card payment (GOV.UK Pay) | PBA + online card payment |
| User interface | Service UI | Expert UI (Manage Cases) |
| Account required | No | Optional PBA account |
| Retry payment | Yes (same SR) | Yes (same SR) |

### CPO updates

On payment completion, updates are also published to `ccpay-service-request-cpo-update-topic` for the Case Payment Orders API (`ServiceRequestDomainServiceImpl:534-572`).

## Asynchronous callbacks (Azure Service Bus)

Two ASB topics carry payment events to consuming services:

| Topic | Purpose | Consumers |
|-------|---------|-----------|
| `ccpay-service-callback-topic` | Card/PBA payment status updates | Service teams (civil, PCS, etc.) via `serviceCallbackUrl` |
| `ccpay-service-request-cpo-update-topic` | Service-request/CPO lifecycle events | `ccpay-service-request-cpo-update-service` |

### Publishing to the topic

`CallbackServiceImpl` (`CallbackServiceImpl.java:42-79`) publishes to the callback topic when a payment reaches a terminal state. It selects the callback URL from one of two locations:

| Scenario | Callback URL source (DB column) |
|----------|-------------------------------|
| Legacy card payment (`POST /card-payments`) | `payment.service_callback_url` |
| W2P card/PBA payment (`POST /service-request/{ref}/...`) | `payment_fee_link.service_request_callback_url` |
| Legacy PBA (`POST /credit-account-payments`) | **No callback** — not supported |

<!-- DIVERGENCE: Confluence says "ccpay-function-node application" picks up the message and sends callback to services, but no function-node code exists in ccpay-payment-app repos. The TopicClientProxy in ccpay-payment-app publishes to the topic with 3 retry attempts and linear backoff (1s, 2s, 3s). Source wins for the publish-side retry. -->

The `TopicClientProxy` (`TopicClientProxy.java:36-52`) handles publish-side retry: 3 attempts with linear backoff (`1000ms * attempt`). The message carries the `serviceCallbackUrl` as a custom property so the downstream subscriber knows where to forward the status.

### Callback delivery and retry

Delivery to the service endpoint is performed by a separate Azure Function, deployed as the `ccpay-callback-function` HelmRelease from the `ccpay/callback-function` image. It reads the `serviceCallbackPremiumSubscription` subscription on `ccpay-service-callback-topic`, is scaled by a KEDA `azure-servicebus` trigger on that subscription, and is configured with `DELAY_MESSAGE_MINUTES: 30` (`cnp-flux-config:apps/fees-pay/ccpay-callback-function/ccpay-callback-function.yaml:8-24`). A callback the service does not accept is therefore re-presented half an hour later, not immediately — a service that is down for a deployment window sees its callbacks arrive well after the payment completed.

<!-- CONFLUENCE-ONLY: not verified in source. Confluence states the function retries for up to 5 additional attempts and then abandons delivery. The retry ceiling is a property of the ccpay-callback-function code, which is not among the cloned repos, and no max-delivery-count is set on the subscription in cnp-flux-config. -->
The function delivers the payment status to the service's registered URL via HTTP PUT, and retries if the service does not return HTTP 200 or 201, for up to **5 additional attempts**, after which delivery is abandoned.

### Callback JSON response shape

The response delivered to the consuming service's callback URL:

```json
{
  "service_request_reference": "2024-1750000047245",
  "ccd_case_number": "1693844866384051",
  "service_request_amount": "288.00",
  "service_request_status": "Paid",
  "payment": {
    "payment_amount": "288.00",
    "payment_reference": "RC-1693-8460-7863-3217",
    "payment_method": "card",
    "case_reference": "128554/001/JR/KR",
    "account_number": "PBA0087272"
  }
}
```

| Field | Notes |
|-------|-------|
| `service_request_status` | One of `Paid`, `Not paid`, `Partially paid` |
| `payment_method` | `"payment by account"` or `"card"` |
| `account_number` | Present only for PBA payments |
| `case_reference` | Service-specific reference set at SR creation; absent if SR was created in PayBubble |

The request includes a `ServiceAuthorization` header from the `payment_app` S2S microservice. Consuming services must whitelist `payment_app` in their trusted S2S caller list.

### Callback trigger points

| Payment path | Trigger |
|--------------|---------|
| W2P PBA payment | Immediate (within the API call) |
| W2P Card payment | Via Payment Status Update Job (after GOV.UK Pay confirms) |
| Legacy card payment (`/card-payments`) | Via Payment Status Update Job |
| Legacy PBA (`/credit-account-payments`) | **No callback** |

## Payment references

Each payment transaction is assigned a unique reference that persists across the system for tracking, status queries, and reconciliation.

### Reference format

```
RC-XXXX-XXXX-XXXX-XXXC   (receipt / payment)
RF-XXXX-XXXX-XXXX-XXXC   (refund)
```

### Reference components

| Component | Description | Source |
|-----------|-------------|--------|
| Prefix | `RC` = receipt, `RF` = refund | Passed to `ReferenceUtil.getNext(prefix)` |
| Digits 1-11 | UTC timestamp in tenths of a second (`millis / 100`) | `ReferenceUtil:19` |
| Digits 12-15 | 4 random digits (`SecureRandom.nextInt(10000)`) | `ReferenceUtil:24` |
| Digit 16 (C) | Luhn check digit | `ReferenceUtil:28-29` |

The 16 digits are formatted into four groups of four, separated by hyphens. This format is used universally across PayHub, PayBubble, CCD, and reconciliation reports.

## Payment statuses

Payment statuses represent the current state of a transaction. Different systems use different status terminology; Fees & Payments normalises these so consuming services can interpret outcomes consistently.

### PayHub internal statuses

The `payment_status` reference table is seeded by Liquibase with nine rows, and the seeded name is the value stored against a payment:

| DB value | Seeded description | Seeded by |
|----------|--------------------|-----------|
| `created` | Valid payment instructions entered and recorded successfully | `db.changelog-refdata.yaml:23` |
| `success` | Valid payment details and user successfully made payment | `db.changelog-refdata.yaml:24` |
| `failed` | Invalid payment details/unsuccessful payment | `db.changelog-refdata.yaml:25` |
| `cancelled` | User cancels session | `db.changelog-refdata.yaml:26` |
| `error` | Missing payment parameters | `db.changelog-refdata.yaml:27` |
| `submitted` | Payment submitted | `db.changelog-refdata.yaml:128` |
| `started` | Payment started and awaiting card details | `db.changelog-0.0.6.yaml:11` |
| `pending` | Payment awaiting confirmation from external provider | `db.changelog-0.0.8.yaml:19` |
| `decline` | Payment declined | `db.changelog-0.0.9.yaml:179` |

`pending` is set on a PBA payment whose service appears in `pba.config1.service.names`; that branch skips the Liberata account check entirely (`CreditAccountPaymentController:158-162`).

### Cross-system status mapping

<!-- DIVERGENCE: Confluence's cross-system table lists "Timed out" as a PayHub status against a GOV.UK Pay "Timed Out". No such value exists in the payment_status reference data or in PayStatusToPayHubStatus, and the enum lookup has no fallback. Source wins. -->

A stored `payment_status` name and a GOV.UK Pay status name are both resolved through the same enum, `PayStatusToPayHubStatus`, to produce the `status` field returned to callers (`PayStatusToPayHubStatus:7`; `ServiceRequestDomainDataEntityMapper:86`; `PaymentDtoMapper:45`):

| Stored / provider status | Reported status |
|--------------------------|-----------------|
| `created`, `started`, `submitted` | `Initiated` |
| `success` | `Success` |
| `failed`, `cancelled`, `error` | `Failed` |
| `pending` | `Pending` |
| `decline` | `Declined` |

The lookup is `PayStatusToPayHubStatus.valueOf(status.toLowerCase())` with no default branch, so a provider status outside those nine names raises an `IllegalArgumentException` instead of mapping to a fallback — a new GOV.UK Pay state breaks the response mapping rather than degrading it.

### PBA-specific statuses

<!-- DIVERGENCE: Confluence lists a fourth PBA status, "Settled", described as payment collected through direct debit. No such status is seeded in payment_status and no PBA code path sets one; PBA payments only ever reach pending, success or failed. Source wins. -->

A PBA payment lands in one of three states:

| Status | Set when |
|--------|----------|
| `pending` | The requesting service is in `pba.config1.service.names`, so no Liberata check runs (`CreditAccountPaymentController:158-162`) |
| `success` | Liberata reports the account `ACTIVE` with sufficient available balance (`PBAStatusErrorMapper:23-56`) |
| `failed` | Liberata reports insufficient funds (`CA-E0001`), on hold (`CA-E0003`) or deleted (`CA-E0004`) (`PBAStatusErrorMapper:23-56`) |

### Payment Status Update Job

A scheduled job (`PATCH /jobs/card-payments-status-update` in `MaintenanceJobsController`) polls GOV.UK Pay for outstanding card payments and updates them if the provider has recorded a different outcome. In production it is a CronJob on `*/30 * * * *` — every thirty minutes (`cnp-flux-config:apps/fees-pay/status-payment-job/status-payment-job.yaml:11`).

The candidate set is narrow. `listInitiatedStatusPaymentsReferences()` selects only payments whose provider is `GOV_PAY` and whose status is not already `success`, `failed`, `error` or `cancelled`, created earlier than `callback.payments.cutoff.time.in.minutes` ago (`PaymentServiceImpl:167-173`, `PaymentServiceImpl:62-63`). The property defaults to `0` in `application.properties:204`, so with no environment override there is no quiet period and a payment is eligible on the next run. PCI-PAL and PBA payments are excluded by the provider filter.

Retrieving a payment's status through the API mutates it. `retrieve(String)` is `@Transactional` and calls `fillTransientDetails`, which sets `paymentStatus` on the managed entity from the GOV.UK Pay status (`UserAwareDelegatingPaymentService:493-506`), so the new status is flushed on commit. That overload also passes `shouldCallBack = false`, and the callback is only published when the flag is true (`UserAwareDelegatingPaymentService:415-417`, `UserAwareDelegatingPaymentService:393-397`). A service that polls its own payment before the job runs therefore moves it into a terminal status with no callback published, and the job then skips it because it no longer matches the query — the service owns the outcome from that point on.

## Data model (core entities)

| Entity | Table | Role |
|--------|-------|------|
| `PaymentFeeLink` | `payment_fee_link` | The "payment group" / service request; holds `payment_reference`, links fees, payments, remissions |
| `Payment` | `payment` | Individual payment record; links to a provider (`govpay`, `pci_pal`, `pba`); stores `ccd_case_number`, `s2s_service_name` |
| `PaymentFee` | `fee` | Fee line item with `code`, `version`, `calculated_amount`, `volume` |
| `Remission` | `remission` | Help-with-fees remission against a fee |
| `FeePayApportion` | `fee_pay_apportion` | Maps payment amounts to individual fees (when `apportion-feature` LaunchDarkly flag enabled) |

The schema is managed with Liquibase (32 changelog files, `db.changelog-master.xml`). The initial full schema was established in `db.changelog-0.0.2.yaml`.

## Authentication and authorisation

All endpoints require S2S authentication. The trusted caller list (`trusted.s2s.service.names`) includes: `cmc`, `cmc_claim_store`, `probate_frontend`, `divorce_frontend`, `ccd_gw`, `xui_webapp`, `fpl_case_service`, `iac`, `civil_service`, `prl_cos_api`, `nfdiv_case_api`, `pcs_api`, and others.

Endpoints are split into two security profiles:

- **External** (S2S only, no user token): `/payments`, `/payments/**`, `/card-payments/*/status`, `/telephony/callback`, `/jobs/**`
- **Internal** (S2S + IDAM user token): all other endpoints

IDAM roles used: `citizen`, `payments`, `pui-finance-manager`, `pui-case-manager`, `payments-refund`, `payments-refund-approver`.

## Feature flags

Runtime toggling is LaunchDarkly only. The `FeatureToggler` interface exposes a single method, `getBooleanValue(key, defaultValue)` (`FeatureToggler.java:3-7`), and its one implementation delegates straight to the LaunchDarkly SDK's `boolVariation` (`LaunchDarklyFeatureToggler.java:24-34`). The flags read in `main` code are:

| Flag | Read by |
|------|---------|
| `apportion-feature` | `CardPaymentController:182`, `CreditAccountPaymentController:174`, `PaymentGroupController:102`, `ServiceRequestDomainServiceImpl:238` and others |
| `payment-status-update-flag` | `PaymentStatusController:41` — gates every payment-status endpoint |
| `iac-supplementary-details-feature` | `PaymentController:215` |
| `prod-strategic-fix` | `PaymentGroupController:375`, `PaymentGroupController:447` |
| `refund-remission-lagtime-feature` | `RefundRemissionEnableServiceImpl:59`, `RefundRemissionEnableServiceImpl:92` |

Every call site supplies `false` as the default, so a LaunchDarkly outage or an unset key disables the feature rather than enabling it.

Separately, `application.properties:190-193` holds four plain Spring booleans — `feature.check.liberata.account.for.all.services`, `feature.duplicate.payment.check`, `feature.case.reference.validation` and `feature.discontinued.fees`. These are build-time configuration injected with `@Value`, not runtime toggles.

## Reconciliation

Liberata (the HMCTS finance partner, also referred to as the "Middle Office supplier") pulls aggregated payment data via:

- `GET /payments` — filterable by payment method, service, date range, CCD case number, PBA number.
- `GET /reconciliation-payments` — same filters plus IAC supplementary info.

<!-- CONFLUENCE-ONLY: not verified in source -->
Reconciliation occurs **twice per day**. Liberata compares payment records in Fees & Payments against financial transactions from payment providers (GOV.UK Pay, Barclays ePDQ). If discrepancies are found (jurisdiction errors, transaction mismatches, missing/duplicate records), an incident is raised for investigation.

CSV reports are generated on demand via `POST /jobs/email-pay-reports?payment_method=&service_name=&start_date=&end_date=` and emailed to configured addresses per service/payment-method combination.

## See also

- [Architecture](architecture.md) — hub-and-spoke topology, all nine repos, database and auth details
- [Payment Lifecycle](payment-lifecycle.md) — detailed status transitions, apportionment, and failure types
- [GOV.UK Pay Integration](govuk-pay-integration.md) — multi-account key resolution, idempotency, and status polling
- [How-to: Integrate from a Service](../how-to/integrate-from-a-service.md) — step-by-step onboarding guide for new service teams
- [Reference: API Payments](../reference/api-payments.md) — full endpoint catalogue for `ccpay-payment-app`
- [Glossary](../reference/glossary.md) — definitions for PBA, Service Request, RC reference, W2P, and more
