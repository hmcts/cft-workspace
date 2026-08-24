---
title: Architecture
topic: architecture
diataxis: explanation
product: payment
audience: both
sources:
  - ccpay-payment-app:settings.gradle
  - ccpay-payment-app:api/src/main/resources/application.properties
  - ccpay-payment-app:api/src/main/resources/db/changelog/db.changelog-master.xml
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/MaintenanceJobsController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/ServiceRequestController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CreditAccountPaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentGroupController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/configuration/security/SpringSecurityConfiguration.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentStatusController.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/configuration/FeatureToggler.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/configuration/LaunchDarklyFeatureToggler.java
  - cnp-flux-config:apps/fees-pay/ccpay-callback-function/ccpay-callback-function.yaml
  - cnp-flux-config:apps/fees-pay/ccpay-callback-function/prod.yaml
  - ccpay-bulkscanning-app:src/main/resources/application.yaml
  - ccpay-bulkscanning-app:build.gradle
  - ccpay-bulkscanning-app:src/main/resources/db/changelog/db.changelog-master.xml
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/service/IdempotencyServiceImpl.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/LiberataService.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/model/PaymentStatus.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/FeePayApportionServiceImpl.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/util/ServiceRequestUtil.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/PaymentStatusDto.java
  - ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/controllers/RefundsController.java
  - ccpay-refunds-app:src/main/resources/db/changelog/db.changelog-master.yaml
  - ccpay-notifications-service:src/main/java/uk/gov/hmcts/reform/notifications/controllers/NotificationController.java
  - ccpay-notifications-service:src/main/resources/db/changelog/db.changelog-master.yaml
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1952809367"
    title: "Fees & Payments Service Knowledge (systems)"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1952815186"
    title: "Payment Lifecycle"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1958058001"
    title: "Service Callback LLD"
    last_modified: "2026-06-01"
    space: "DTSFP"
  - id: "1952811686"
    title: "Payment Methods"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1958061399"
    title: "Real Time PBA Payments HLD"
    last_modified: "2026-06-01"
    space: "DTSFP"
  - id: "1890795875"
    title: "Services integration with Payments & Service Requests (Orders / Invoices) for Card Payments"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1791351069"
    title: "Bulk Scan for Cash/Cheque/PO"
    last_modified: "unknown"
    space: "DTSFP"
confluence_checked_at: "2026-08-20T00:00:00Z"
sources_sha:
  "ccpay-payment-app:settings.gradle": "7bafc8bc5e167ac022ea09d0d178dda6df95e09b"
  "ccpay-payment-app:api/src/main/resources/application.properties": "1908ddc16a3f086c816e17c1ff8b27bee4b8f414"
  "ccpay-payment-app:api/src/main/resources/db/changelog/db.changelog-master.xml": "d186319bdd2f53eeea8c6696dcaa973b62fef4e4"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/MaintenanceJobsController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/ServiceRequestController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CreditAccountPaymentController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentGroupController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/configuration/security/SpringSecurityConfiguration.java": "e8033dfe3c25862046cd940eadb7522175cb4aba"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentStatusController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/configuration/FeatureToggler.java": "3e9ece1186c812f47690ff5020d35b37f163cb63"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/configuration/LaunchDarklyFeatureToggler.java": "65bcad2ffb092e534b051dbb0349914658506a57"
  "cnp-flux-config:apps/fees-pay/ccpay-callback-function/ccpay-callback-function.yaml": "d0c0963e9f746ac8fc5038459af65c77d786a96f"
  "cnp-flux-config:apps/fees-pay/ccpay-callback-function/prod.yaml": "7b22eb2f6fc3bfe636d2eeb4cbb0f7eb46f76bb5"
  "ccpay-bulkscanning-app:src/main/resources/application.yaml": "1b54d11d83d0faf661f1c591bf676db77d01ee9e"
  "ccpay-bulkscanning-app:build.gradle": "7ceabdac8ebbe8059abb847346b6d0d8868a82fd"
  "ccpay-bulkscanning-app:src/main/resources/db/changelog/db.changelog-master.xml": "fd081cdd4f125504a975e2d58402c7bc8d08a932"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/service/IdempotencyServiceImpl.java": "7a5df2f161deebfb9cf3e7e0941bd0cdc21318de"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/LiberataService.java": "5c28ea10564258d9c193bead87675b85afa50c21"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java": "af2825478c26ce3bf534be6fd51c309f8f30e07e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java": "eb705202fee5f0ee030daa3e71c1366be0c83a47"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/model/PaymentStatus.java": "5c28ea10564258d9c193bead87675b85afa50c21"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/FeePayApportionServiceImpl.java": "445f3ac2c605bdd3fd2ff39aa1a6b7936e7b6634"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/util/ServiceRequestUtil.java": "f190c168e2485e79521c0b05f64c0551abd2b6d6"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/PaymentStatusDto.java": "0cf6e7d5ce9bdb8418b6627d44867a1e83dc1981"
  "ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/controllers/RefundsController.java": "98e5f4161db82b39d5e472d3ca4bbb212bfe6cd6"
  "ccpay-refunds-app:src/main/resources/db/changelog/db.changelog-master.yaml": "251f8931b4bd5a3e4e47d3cb0f509b1e7940abd3"
  "ccpay-notifications-service:src/main/java/uk/gov/hmcts/reform/notifications/controllers/NotificationController.java": "19e4851c3312e4345b89d72332cebf68a35a1616"
  "ccpay-notifications-service:src/main/resources/db/changelog/db.changelog-master.yaml": "14942540fbf1fd5782b38487ae7b5fbd39e66808"
---

## TL;DR

- HMCTS Fees and Pay is a hub-and-spoke platform: `ccpay-payment-app` (port 8080) is the central gateway wrapping GOV.UK Pay, PCI-PAL telephony, and Liberata PBA; spokes handle refunds, notifications, bulk-scanning, and UI.
- Nine repos: the hub (`ccpay-payment-app`), refunds API, notifications service, bulk-scanning intake, PayBubble staff UI, payment-outcome citizen page, an API gateway (Terraform-only), scheduled jobs (embedded JAR), and a CPO update listener.
- Payment lifecycle: Fee Identification, Service Request Creation, Payment Initiation, Processing (via payment channel), Status Update, Apportionment (fees paid chronologically by creation date), then Case Progression via callback.
- Inter-service messaging uses Azure Service Bus topics (`ccpay-service-callback-topic`, `ccpay-service-request-cpo-update-topic`) with `ccpay-callback-function` (Azure Function) forwarding callbacks to service endpoints on a 30-minute redelivery interval.
- Each Java service owns a dedicated PostgreSQL database with Liquibase-managed schema migrations.
- No CCD dependency at runtime -- the platform records case references against payments but does not store or manage case data.

## Hub-and-spoke topology

The platform follows a hub-and-spoke pattern where `ccpay-payment-app` is the single point of entry for payment creation, retrieval, and reconciliation. All other services either feed data into the hub or consume data from it.

```mermaid
graph TD
    subgraph "Clients"
        XUI[XUI / Service Teams]
        Liberata[Liberata Reconciliation]
        Exela[Exela / Bulk Scan Pipeline]
        Citizen[Citizen Browser]
        Staff[Staff Browser]
    end

    subgraph "Fees & Pay Platform"
        Hub[ccpay-payment-app<br/>:8080]
        Refunds[ccpay-refunds-app<br/>:8080]
        Notifications[ccpay-notifications-service<br/>:8080]
        BulkScan[ccpay-bulkscanning-app<br/>:8080]
        Bubble[ccpay-bubble<br/>:3000]
        Outcome[ccpay-paymentoutcome-web<br/>:3100]
        CPOUpdate[ccpay-service-request-cpo-update-service]
    end

    subgraph "External Services"
        GovPay[GOV.UK Pay API]
        PciPal[PCI-PAL Antenna / Kerv]
        LiberataAPI[Liberata PBA API]
        Notify[GOV.UK Notify]
        FeesReg[Fees Register API]
        CPO[cpo-case-payment-orders-api]
    end

    subgraph "Messaging"
        ASB_CB[ASB: ccpay-service-callback-topic]
        ASB_CPO[ASB: ccpay-service-request-cpo-update-topic]
    end

    XUI -->|REST| Hub
    Liberata -->|REST| Hub
    Liberata -->|PATCH /refund| Refunds
    Exela -->|REST| BulkScan
    Citizen --> Outcome
    Staff --> Bubble

    BulkScan -->|REST| Hub
    Bubble -->|REST| Hub
    Bubble -->|REST| Refunds
    Refunds -->|REST| Hub
    Refunds -->|REST| Notifications

    Hub --> GovPay
    Hub --> PciPal
    Hub --> LiberataAPI
    Hub --> FeesReg
    Hub --> ASB_CB
    Hub --> ASB_CPO

    Notifications --> Notify
    CPOUpdate -->|subscribes| ASB_CPO
    CPOUpdate -->|REST| CPO
    ASB_CB -->|consumed by| XUI
```

## The hub: ccpay-payment-app

A multi-module Gradle project assembled into a single Spring Boot 3.4 / Java 21 fat jar running on port 8080 (`ccpay-payment-app:build.gradle`).

### Internal modules

| Module | Directory | Purpose |
|--------|-----------|---------|
| `:payment-api` | `api/` | Controllers, schedulers, ASB senders, domain services |
| `:payment-model` | `model/` | JPA entities, repositories, GOV.UK Pay delegating service, PCI-PAL service, Liberata account service |
| `:payment-gov-pay-client` | `gov-pay-client/` | Apache HttpClient 5 wrapper for GOV.UK Pay public API |
| `:payment-reference-data` | `reference-data/` | `Site` entity and `/reference-data/**` endpoints |
| `:payment-otp` | `otp/` | OTP bootstrap (Aerogear OTP) |
| `:payment-api-contract` | `api-contract/` | Shared request/response DTOs |
| `:case-payment-orders-client` | `case-payment-orders-client/` | Feign client for `cpo-case-payment-orders-api` |

Module dependencies are declared in `ccpay-payment-app:settings.gradle:1-17`. The root `build.gradle` only depends on `:payment-api`, which transitively pulls all other modules.

### Outbound integrations from the hub

| Target | Protocol | Config property |
|--------|----------|-----------------|
| GOV.UK Pay | HTTPS (Apache HC5, Resilience4j circuit breaker) | `gov.pay.url` / `GOV_PAY_URL` |
| PCI-PAL Antenna | OAuth2 + launch URL | `pci-pal.antenna.*` env vars |
| PCI-PAL Kerv | OAuth2 + launch URL | `pci-pal.kerv.*` env vars |
| Liberata PBA | OAuth2 password grant + account API | `liberata.api.account.url` / `LIBERATA_API_ACCOUNT_URL` |
| Fees Register | Feign client | `fees.register.url` / `FEES_REGISTER_URL` |
| Case Payment Orders | REST | `case-payment-orders.api.url` |
| Azure Service Bus | AMQP | `ASB_CONNECTION_STRING` |

### Azure Service Bus topics

The hub publishes to two ASB topics:

1. **`ccpay-service-callback-topic`** -- card/PBA payment status callbacks to consuming services (civil, ia, pcs, etc.). Published by `CallbackServiceImpl` (`ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java:42-79`). No feature flag gates the publish; the method branches only on which callback URL is populated, and it cannot be switched off from the hub. `TopicClientProxy` makes up to 3 send attempts with a linear backoff of `1000ms * attempt`, so waits of 1s then 2s, and rethrows on the third failure (`ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java:17`, `:35-51`). `CallbackServiceImpl` catches that exception and only interrupts the thread (`:56-58`, `:75-77`), so a payment can reach a terminal status with its callback never published and nothing but a log line to show it.
2. **`ccpay-service-request-cpo-update-topic`** -- service-request payment updates forwarded to the Case Payment Orders API. Published by `ServiceRequestDomainServiceImpl` (`ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/service/ServiceRequestDomainServiceImpl.java:534-572`).

The ASB subscription for the callback topic is `serviceCallbackPremiumSubscription` (`azure.servicebus.subscription-name`). Messages are consumed by `ccpay-callback-function`, an Azure Function deployed from the `ccpay/callback-function` image and KEDA-scaled on the subscription backlog, which delivers the payment status payload to each service's registered callback URL (`cnp-flux-config:apps/fees-pay/ccpay-callback-function/ccpay-callback-function.yaml:9`, `:16-24`). Its redelivery interval is set from the environment as `DELAY_MESSAGE_MINUTES: 30` (`:13`).

## Payment lifecycle

The payment lifecycle defines the stages a payment moves through from initiation to completion. This is the integration contract consuming services must follow:

1. **Fee Identification** -- the consuming service retrieves the applicable fee from the Fees Register API.
2. **Service Request Creation** -- the service calls `POST /service-request` to create a Service Request (payment group) representing the payment required for a case. The request includes a `callBackUrl` the platform will use to notify the service of payment outcomes.
3. **Payment Initiation** -- the service calls the payment endpoint for the chosen channel (e.g. `POST /service-request/{ref}/card-payments` for card, `POST /service-request/{ref}/pba-payments` for PBA). For card payments, the response includes a GOV.UK Pay redirect URL and payment reference.
4. **Payment Processing** -- the user completes the payment journey on the external provider (GOV.UK Pay, PCI-PAL, or Liberata PBA).
5. **Payment Status Update** -- the provider returns a status. For card payments, either the service polls the status using the payment reference, or the Payment Status Update Job detects the change and triggers a callback.
6. **Payment Allocation (Apportionment)** -- once confirmed, the payment is allocated across outstanding fees sorted by `dateCreated` (earliest first). Apportionment operates within a single Service Request boundary; payments do not auto-cross to other SRs on the same case (`ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/FeePayApportionServiceImpl.java:88-93`).
7. **Case Progression** -- the consuming service receives the callback and progresses the case workflow (typically via a CCD event).

<!-- CONFLUENCE-ONLY: Step 7 case progression via CCD event is described in Confluence but not enforced by the payment platform source — it is the consuming service's responsibility -->

## Payment and service request statuses

### Payment statuses

Defined in `PaymentStatus.java` (`ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/model/PaymentStatus.java:19-24`):

| Status | Description |
|--------|-------------|
| `created` | Payment initiated (shown as "Initiated" in PayBubble UI) |
| `pending` | PBA payment recorded without a live Liberata account check. Today this is the PBA Config 1 journey: services listed in `pba.config1.service.names` skip the Liberata call entirely and the payment is set straight to `pending` (`api/src/main/java/uk/gov/hmcts/payment/api/controllers/CreditAccountPaymentController.java:157-160`, default `dummy` at `application.properties:218`). Under the designed real-time model it would also cover a transaction awaiting the Liberata response |
| `success` | Payment confirmed by the provider |
| `failed` | Payment failed at the provider |
| `cancelled` | Payment cancelled by the user |
| `error` | System error during processing |

### Service request statuses

Computed dynamically by `ServiceRequestUtil` based on fee totals, remission totals, and successful payment totals (`ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/util/ServiceRequestUtil.java:14-37`):

| Status | Condition |
|--------|-----------|
| `Disputed` | Any payment on the service request is disputed (checked first) |
| `Paid` | Fee total minus remissions minus payments <= 0 |
| `Partially paid` | Some payment or remission exists but outstanding balance > 0 |
| `Not paid` | No successful payments and no remissions applied |

<!-- DIVERGENCE: Confluence "Service Callback LLD" documents service_request_status as one of "Paid", "Not paid", "Partially paid", but ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/util/ServiceRequestUtil.java:27-28 also returns "Disputed" when any payment is disputed. Source wins. -->

## Service callback mechanism

When a payment reaches a terminal state (success or failure), the platform publishes a callback message to `ccpay-service-callback-topic` on Azure Service Bus. The message flow is:

1. **Publisher**: `CallbackServiceImpl` in `ccpay-payment-app` publishes a JSON message with the `serviceCallbackUrl` as a message property. It checks `payment.getServiceCallbackUrl()` first, then falls back to `paymentFeeLink.getCallBackUrl()` (`ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java:42-79`). The two branches send different bodies: the per-payment URL gets a `PaymentDto`, the service-request URL gets a `PaymentStatusDto`.
2. **Transport**: Azure Service Bus topic `ccpay-service-callback-topic` with subscription `serviceCallbackPremiumSubscription`.
3. **Consumer**: `ccpay-callback-function` (an Azure Function, not in the payment repos) reads messages from the subscription and sends HTTP PUT requests to the service's callback URL.
4. **Retry**: If the service does not respond with a 2XX, the function redelivers on a 30-minute interval — `DELAY_MESSAGE_MINUTES: 30` (`cnp-flux-config:apps/fees-pay/ccpay-callback-function/ccpay-callback-function.yaml:13`) — up to 5 further times before giving up. (Services commonly assume only 200 and 201 count as success; the Service Callback LLD is explicit that anything in `200 <= status < 300` is accepted.)

<!-- CONFLUENCE-ONLY: The ceiling of 5 further attempts is documented in Confluence "Service Callback LLD" but the function code is not in the payment product repos and no max_delivery_count is set on the subscription in cnp-flux-config — not verified in source -->

### Callback triggers

| Scenario | Endpoint | Trigger component | Callback URL source |
|----------|----------|-------------------|---------------------|
| Online card payment | `POST /card-payments` | Payment Status Update Job | `payment.service_callback_url` |
| W2P card payment | `POST /service-request/{ref}/card-payments` | Payment Status Update Job | `payment_fee_link.service_request_callback_url` |
| W2P PBA payment | `POST /service-request/{ref}/pba-payments` | Payment App (immediate) | `payment_fee_link.service_request_callback_url` |
| Legacy PBA payment | `POST /credit-account-payments` | N/A (no callback) | N/A |

The **Payment Status Update Job** (`PATCH /jobs/card-payments-status-update`) polls GOV.UK Pay for all `created`-status card payments, updates the local status, and triggers a callback if the status has changed. It only processes online card payments -- telephony and disputed payments are out of scope for this job.

### Callback payload shape

The callback JSON sent to consuming services follows this structure (`PaymentStatusDto`):

```json
{
  "service_request_reference": "2024-1750000047245",
  "ccd_case_number": "1693844866384051",
  "service_request_amount": 288.00,
  "service_request_status": "Paid",
  "payment": {
    "payment_amount": 288.00,
    "payment_reference": "RC-1693-8460-7863-3217",
    "payment_method": "card",
    "case_reference": "128554/001/JR/KR",
    "account_number": null
  }
}
```

The request is sent as a PUT with a `ServiceAuthorization` header the function mints for itself as the `payment_app` microservice (`MICROSERVICE_PAYMENT_APP` in `cnp-flux-config:apps/fees-pay/ccpay-callback-function/prod.yaml:11-12`). Consuming services must therefore include `payment_app` in their S2S authorised callers list, and their callback handler must accept PUT.

## Payment channels and methods

The platform supports four payment channels, each with specific rules:

| Channel | Provider | Users | Key rules |
|---------|----------|-------|-----------|
| Online card | GOV.UK Pay | Citizens, professionals | Redirect-based; async status via polling or callback |
| Telephony | PCI-PAL Kerv | Staff (CTSC) | Must cover all outstanding fees for a case; partial telephony payments not permitted |
| Payment by Account (PBA) | Liberata | Professional users | Credit account; v3 API is current for new integrations |
| Bulk Scan | Exela pipeline | Offline (cash/cheque/postal order) | Processed operationally; allocated via same apportionment rules |

<!-- CONFLUENCE-ONLY: Telephony rule "must cover all outstanding fees" and "partial telephony payments not permitted" documented in Confluence "Payment Methods" page — not verified in source -->

`POST /payment-groups/{payment-group-reference}/telephony-card-payments` is the only endpoint that creates a telephony payment. It accepts `kerv` as the `telephony_system` and nothing else: a missing or empty value is defaulted to `kerv`, and any other value — including `antenna` — is rejected with HTTP 422 before any PCI-PAL call is made (`ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentGroupController.java:629-639`, `:737-741`). The Antenna credential set and per-jurisdiction flow IDs stay configured on the hub, but no request can route to them.

### Real-time PBA processing (in design)

The PBA integration is planned to move from overnight reconciliation to real-time processing. Under the new model:

- An RC transaction reference is created immediately when the request is received (before the Liberata call).
- PayHub calls a new real-time Liberata PBA payment API (`POST /api/payment`) which validates the account **and debits it** in one call, replacing today's separate account-check-then-reconcile pattern.
- The transaction status moves through `Pending` then to `Success` or `Failed` based on the response.
- Overnight reconciliation is eliminated for PBA transactions — the `/reconciliation-payments` feed is to skip PBA payments, gated by a new environment variable (the LLD proposes `PBA_PAYMENT_RECONCILIATION_IGNORE`).
- Failure mode: if the Liberata call times out, the transaction remains in `Pending` -- a scheduled job monitors for stuck pending transactions.

Three further design decisions are worth knowing about because they change externally-visible behaviour:

- **Authentication changes shape.** The new Liberata API is a Laravel 12 application secured with Laravel Sanctum, using a sliding-session bearer token: `POST /api/auth/token` to obtain one, `POST /api/auth/refresh` to roll it, and a grace period during which the old token still works but responses carry an `X-Token-Expiring: true` header. PayHub is expected to cache the token with its `expires_at` and refresh before full expiry.
- **The API surface does not change.** The LLD is explicit that only the backend service layer changes, so consuming services should see no difference in the PayHub request or response contracts.
- **Liberata's error codes collapse onto HTTP 403.** Today the account check distinguishes insufficient funds, on-hold, and deleted accounts by HTTP status; the new payment API returns 403 for all of them with a numeric error code. The design intends to map error code 1 back to HTTP 402 (`CA-E0001`) and error code 4 back to HTTP 412 (`CA-E0003`) so that PayHub's own responses stay stable — this matters because `IdempotencyServiceImpl.HTTP_CODE_ALLOWABLE_RETRIES` keys off those codes to decide whether a failed PBA payment may be retried.
- **IAC payments will fail closed.** PBA payments on IAC cases are to be rejected outright (HTTP 412, idempotency record completed) when the `surname` and `case_reference` supplementary data is missing, rather than proceeding without it. An email alert to the IAC team is desired but not yet designed, and may land in a later release.

<!-- CONFLUENCE-ONLY: Real-time PBA is design-only. Verified absent from source at origin/master: model/src/main/java/uk/gov/hmcts/payment/api/service/LiberataService.java exposes only getAccessToken() (OAuth2 password grant reading liberata.oauth2.token.url and returning access_token) — the pbaPayment() method the LLD marks NEW does not exist anywhere in ccpay-payment-app; api/src/main/resources/application.properties:81-90 still configures bpacustomerportal.liberata.com/pba/public/api/v2/account with liberata.oauth2.token.url / authorize.url, with no Sanctum /api/auth/token or /api/auth/refresh endpoint; and no PBA_PAYMENT_RECONCILIATION_IGNORE property exists. Documented from Confluence "Real Time PBA Payments HLD" (1958061399) and "Real Time PBA Payments LLD" (1973292244). -->

The old `POST /credit-account-payments` endpoint is slated for retirement as part of this work, with FPL the remaining consumer that must migrate to `POST /service-request/{ref}/pba-payments`. That migration is a hard dependency: the legacy endpoint has only limited idempotency support, so making it real-time without moving FPL off it would carry a duplicate-payment risk. See [Overview](overview.md#real-time-pba-in-design).

## Responsibility boundary

The platform and consuming services have clearly delineated responsibilities:

| Responsibility | Fees & Payments platform | Consuming service |
|---------------|-------------------------|-------------------|
| Provide payment APIs | Yes | -- |
| Integrate with payment providers (GOV.UK Pay, PCI-PAL, Liberata) | Yes | -- |
| Generate payment references (RC-xxxx-xxxx-xxxx-xxxx) | Yes | -- |
| Create Service Requests | -- | Yes |
| Redirect users to payment providers | -- | Yes |
| Host callback URL endpoint | -- | Yes |
| Retrieve and act on payment status | -- | Yes |
| Progress case workflow after payment (CCD event) | -- | Yes |

## Spokes

### ccpay-refunds-app

Owns the `refunds` PostgreSQL schema and the full refund state machine: Sent for approval, Approved, Update required, Rejected, Accepted, Cancelled, Expired, Reissued, Closed. The state machine is encoded in `RefundState` enum with events SUBMIT, APPROVE, REJECT, UPDATEREQUIRED, ACCEPT, CANCEL (`ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/state/RefundState.java:8-133`).

Calls `ccpay-payment-app` for payment lookups and `ccpay-notifications-service` for GOV.UK Notify dispatch. Liberata reconciliation enters via `PATCH /refund/{reference}` -- when Liberata accepts a refund, the service triggers a notification immediately.

S2S trust: `payment_app, ccpay_bubble, api_gw, ccd_gw, xui_webapp, pcs_api`.

### ccpay-notifications-service

A GOV.UK Notify gateway exclusively called by `ccpay-refunds-app`. Owns the `notifications` PostgreSQL schema with tables `notification`, `contact_details`, `service_contact`, and `notification_refund_reasons`.

Exposes:
- `POST /notifications/email` -- send email via Notify
- `POST /notifications/letter` -- send letter via Notify
- `GET /notifications/{reference}` -- retrieve notification history
- `POST /notifications/doc-preview` -- generate template preview
- `GET /notifications/postcode-lookup/{postcode}` -- OS Places address validation

Two `NotificationClientApi` beans (Email and Letter) are created with separate API keys (`EMAIL_APIKEY`, `LETTER_APIKEY`) in `EmailNotificationConfig` (`ccpay-notifications-service:src/main/java/uk/gov/hmcts/reform/notifications/config/EmailNotificationConfig.java:11-25`).

S2S trust: `refunds_api, ccpay_bubble, api_gw, ccd_gw, xui_webapp`.

### ccpay-bulkscanning-app

Receives cash/cheque payment data from the bulk-scan pipeline (Exela gateway) and forwards it to `ccpay-payment-app` via its bulk-scanning REST API. Owns its own Liquibase-managed PostgreSQL schema.

### ccpay-bubble (PayBubble)

Angular 18 + Express.js staff-facing web UI served on port 3000. Connects directly to `ccpay-payment-app` and `ccpay-refunds-app` for payment/refund operations. Embeds two web components: `view-payment` and `fee-register-search`.

### ccpay-paymentoutcome-web

Express/TypeScript citizen-facing application on port 3100. Displays the post-payment outcome page after a GOV.UK Pay redirect completes.

### ccpay-payment-api-gateway

Terraform-only repo (no deployable artefact). Configures Azure API Management (APIM) policies for the Liberata reconciliation endpoints exposed by `ccpay-payment-app`.

### ccpay-scheduled-jobs

Not a standalone deployment -- it is a JAR dependency included in `ccpay-payment-app`. Jobs are triggered by shell scripts calling HTTP endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/jobs/email-pay-reports` | POST | Generate CSV payment reports and email per service/method |
| `/jobs/duplicate-payment-process` | POST | Detect and report duplicate payments |
| `/jobs/card-payments-status-update` | PATCH | Poll GOV.UK Pay for initiated card payment statuses |
| `/jobs/unprocessed-payment-update` | PATCH | Update unprocessed payment references (LaunchDarkly gated) |
| `/jobs/dead-letter-queue-process` | PATCH | Reprocess DLQ from `ccpay-service-request-cpo-update-topic` |
| `/jobs/refund-notification-update` | PATCH | Retry failed email/letter notifications (on `ccpay-refunds-app`) |

The card-payment status update job (`ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/MaintenanceJobsController.java:53-84`) fetches all `initiated` card payments, polls GOV.UK Pay for their current status, and publishes callbacks via ASB.

### ccpay-service-request-cpo-update-service

A Spring Boot listener that subscribes to the `ccpay-service-request-cpo-update-topic` ASB topic and pushes service-request payment status updates to the Case Payment Orders API (`cpo-case-payment-orders-api`).

## Databases and Liquibase

All Java services use PostgreSQL with Liquibase-managed schemas. `ccpay-bulkscanning-app` also carries `spring.flyway.enabled: true` (`ccpay-bulkscanning-app:src/main/resources/application.yaml:46`), but the only migration tooling on its classpath is `liquibase-core` (`ccpay-bulkscanning-app:build.gradle:25`, `:233`), so that property does nothing.

| Service | Database name | Changelog master | Notable tables |
|---------|--------------|------------------|----------------|
| `ccpay-payment-app` | `payment` | `db.changelog-master.xml` (32 changesets, 0.0.1 -- 0.1.16) | `payment`, `payment_fee_link`, `fee`, `remission`, `fee_pay_apportion`, `status_history`, `idempotency_keys` |
| `ccpay-refunds-app` | `refunds` | `db.changelog-master.yaml` (12 changesets, 0.1 -- 0.1.2) | `refunds`, `status_history`, `refund_reasons`, `refund_status`, `rejection_reasons`, `refund_fees` |
| `ccpay-notifications-service` | `notifications` | `db.changelog-master.yaml` (7 changesets, 0.1 -- 0.7) | `notification`, `contact_details`, `service_contact`, `notification_refund_reasons` |
| `ccpay-bulkscanning-app` | `bspayment` | `db.changelog-master.xml` (includes 0.1 and 0.2) | `envelope`, `envelope_case`, `envelope_payment`, `payment_metadata`, `status_history` |

Liquibase auto-runs on startup: `spring.liquibase.enabled=${SPRING_LIQUIBASE_ENABLED:true}` (`ccpay-payment-app:api/src/main/resources/application.properties:25`). The Jenkins pipeline for each service calls `enableDbMigration('ccpay')`.

A Gradle task `./gradlew migratePostgresDatabase` is available on `ccpay-payment-app` for manual migration (`ccpay-payment-app:build.gradle`).

## Authentication and S2S

All inbound API requests require:
1. **IDAM JWT** (`Authorization` header) -- validated via `auth-checker-lib`
2. **S2S JWT** (`ServiceAuthorization` header) -- validated against a per-service trusted-callers list

The hub's S2S trusted callers list spans 24 CFT services (`trusted.s2s.service.names` in `ccpay-payment-app:api/src/main/resources/application.properties:111`, overridable per environment via `TRUSTED_S2S_SERVICE_NAMES`):

```
cmc, cmc_claim_store, probate_frontend, divorce_frontend, ccd_gw, api_gw,
finrem_payment_service, ccpay_bubble, jui_webapp, xui_webapp, fpl_case_service,
iac, probate_backend, civil_service, paymentoutcome_web, adoption_web,
prl_cos_api, refunds_api, civil_general_applications, notifications_service,
nfdiv_case_api, ccpay_gw, pcs_api, pcs_frontend
```

A second filter chain covers the externally-facing paths with `AuthCheckerServiceOnlyFilter`, so those are authorised on the `ServiceAuthorization` header alone with no user token: `/payments`, `/payments1`, `/payments/**`, `/card-payments/*/status`, `/telephony/callback`, and `/jobs/**` (`ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/configuration/security/SpringSecurityConfiguration.java:52-75`). Ahead of it an unauthenticated chain serves Swagger, `/health`, `/info` and the `/refdata/*` lookups (`:111-136`); everything else falls to the user-plus-service chain, where endpoints such as `POST /card-payments` are gated on IDAM authorities (`payments`, `citizen`) (`:78-108`). A scheduled job or a PCI-PAL callback therefore reaches the hub on an S2S token alone, while payment creation does not.

## Feature flags

The hub has one runtime feature-flag mechanism: LaunchDarkly, behind a single-method `FeatureToggler` interface (`ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/configuration/FeatureToggler.java:5`) whose only implementation evaluates `ldClient.boolVariation(key, user, defaultValue)` (`ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/configuration/LaunchDarklyFeatureToggler.java:24-34`).

| Flag | Default | What it gates |
|------|---------|---------------|
| `apportion-feature` | `false` | Whether a confirmed payment is apportioned across fees; read from every payment-creation path and several DTO mappers |
| `prod-strategic-fix` | `false` | The strategic bulk-scan endpoints on `PaymentGroupController` (`:375`, `:447`) |
| `payment-status-update-flag` | `false` | A kill switch, not an enable switch. Setting it true makes the payment-failure endpoints return 503 or raise `LiberataServiceInaccessibleException`, and skips the `/jobs/unprocessed-payment-update` run (`ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentStatusController.java:41`, `:65-67`, `:180-186`, `:203-205`) |
| `iac-supplementary-details-feature` | `false` | IAC supplementary-details enrichment on payment retrieval |
| `refund-remission-lagtime-feature` | `false` | The lag-time window before a refund or remission may be raised |

Every call site passes `false` as the default, so a LaunchDarkly outage or a typo in a key name resolves to `false` rather than failing. The blast radius differs by flag: `apportion-feature` and `prod-strategic-fix` falling to `false` silently stops apportionment and rejects the strategic bulk-scan endpoints, while `payment-status-update-flag` falling to `false` is the healthy state.

## See also

- [Overview](overview.md) — what the platform does and who uses it
- [Payment Lifecycle](payment-lifecycle.md) — detailed stage-by-stage payment flow with status transitions
- [Reconciliation](reconciliation.md) — APIM gateway, Liberata integration, and scheduled CSV reports
- [Payment Status Callbacks](../reference/payment-status-callbacks.md) — ASB topic schemas, `TopicClientProxy` retry, and `ccpay-callback-function` delivery
- [Reference: API Payments](../reference/api-payments.md) — full endpoint catalogue for `ccpay-payment-app`
- [Glossary](../reference/glossary.md) — definitions for ASB, APIM, PayHub, PayBubble, W2P, and more

## Glossary

| Term | Definition |
|------|------------|
| PBA | Pay By Account -- solicitor firm credit accounts validated against Liberata |
| PCI-PAL | Payment Card Industry compliant telephony payment provider (Antenna and Kerv variants) |
| Service Request | A payment group (`PaymentFeeLink`) containing one or more fees to be paid; reference format `YYYY-NNNN-...` |
| CPO | Case Payment Orders -- the API that links service requests to CCD cases |
| ASB | Azure Service Bus -- the async messaging layer between payment hub and consuming services |
| Apportionment | The rules that distribute a payment across multiple outstanding fees (chronological by `dateCreated`, earliest first) within a single Service Request boundary |
| RC reference | Payment reference generated by the platform; format `RC-NNNN-NNNN-NNNN-NNNN` -- unique to every payment attempt |
| W2P | Ways to Pay -- the standardised service-request-based integration pattern for new services |
| ccpay-callback-function | Azure Function (not in payment repos) that subscribes to the callback ASB topic and delivers payment status updates to consuming services via HTTP PUT |
| Callback URL | The endpoint a consuming service registers when creating a Service Request; the platform sends payment status updates to this URL via ASB |
