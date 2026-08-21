---
title: Payment Status Callbacks
topic: lifecycle
diataxis: reference
product: payment
audience: both
sources:
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientService.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/service/ServiceRequestDomainServiceImpl.java
  - ccpay-payment-app:api/src/main/resources/application.properties
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/PaymentStatusDto.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/PaymentReference.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/ServiceRequestController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/mapper/ServiceRequestDtoDomainMapper.java
  - ccpay-service-request-cpo-update-service:src/main/java/uk/gov/hmcts/reform/config/servicebus/ServiceBusConfiguration.java
  - ccpay-service-request-cpo-update-service:src/main/java/uk/gov/hmcts/reform/services/CpoUpdateServiceImpl.java
  - ccpay-service-request-cpo-update-service:src/main/java/uk/gov/hmcts/reform/dtos/requests/CpoUpdateServiceRequest.java
  - ccpay-service-request-cpo-update-service:src/main/resources/application.yaml
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/CallbackService.java
  - civil-service:src/main/java/uk/gov/hmcts/reform/civil/controllers/fees/ServiceRequestUpdateClaimIssuedCallbackController.java
  - probate-back-office:src/main/java/uk/gov/hmcts/probate/controller/PaymentController.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/controller/PaymentCallbackController.java
  - cnp-flux-config:apps/fees-pay/status-payment-job/status-payment-job.yaml
  - cnp-flux-config:apps/fees-pay/dead-letter-queue-process/dead-letter-queue-process.yaml
  - cnp-flux-config:apps/fees-pay/unprocessed-payment-update/unprocessed-payment-update.yaml
  - cnp-flux-config:apps/fees-pay/ccpay-cpo-update-service/prod.yaml
  - cnp-flux-config:apps/fees-pay/ccpay-callback-function/ccpay-callback-function.yaml
  - cnp-flux-config:apps/fees-pay/ccpay-callback-function/prod.yaml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/dto/PaymentStatusDto.java
  - apps/payment/ccpay-service-request-cpo-update-service/src/main/java/uk/gov/hmcts/reform/services/CpoUpdateServiceImpl.java
confluence:
  - id: "1958058001"
    title: "Service Callback LLD"
    last_modified: "2026-06-01"
    space: "DTSFP"
  - id: "1794553235"
    title: "Service Callback LLD (NEW +Payment Failures WIP)"
    last_modified: "2024-09-09"
    space: "DTSFP"
  - id: "1791332488"
    title: "Callback Function - Manually sending Payment Status updates to a Service"
    last_modified: "2024-08-09"
    space: "DTSFP"
  - id: "1815114088"
    title: "FAQ Service Support"
    last_modified: "2025-03-18"
    space: "DTSFP"
  - id: "1368032590"
    title: "S2S Implementation for Payment Status Callback | Changes for the services"
    last_modified: "2021-03-15"
    space: "RP"
  - id: "1732350785"
    title: "Cron Job Matrix"
    last_modified: "2025-01-01"
    space: "RSTR"
confluence_checked_at: "2026-08-20"
sources_sha:
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java": "af2825478c26ce3bf534be6fd51c309f8f30e07e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java": "eb705202fee5f0ee030daa3e71c1366be0c83a47"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientService.java": "80f0421010c7b573dc2437346c6f4ba49a8cae49"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/service/ServiceRequestDomainServiceImpl.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/resources/application.properties": "1908ddc16a3f086c816e17c1ff8b27bee4b8f414"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/PaymentStatusDto.java": "0cf6e7d5ce9bdb8418b6627d44867a1e83dc1981"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/PaymentReference.java": "d7a9437816824a5d44c10c5738180cba36b40501"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/ServiceRequestController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/mapper/ServiceRequestDtoDomainMapper.java": "7c2fcd29deec15bd4f249f50a126a029fcfb5d9b"
  "ccpay-service-request-cpo-update-service:src/main/java/uk/gov/hmcts/reform/config/servicebus/ServiceBusConfiguration.java": "a21fecc631d099d3e44146d87d5b7481ab2a8b24"
  "ccpay-service-request-cpo-update-service:src/main/java/uk/gov/hmcts/reform/services/CpoUpdateServiceImpl.java": "a21fecc631d099d3e44146d87d5b7481ab2a8b24"
  "ccpay-service-request-cpo-update-service:src/main/java/uk/gov/hmcts/reform/dtos/requests/CpoUpdateServiceRequest.java": "f9256a429a09119a246a95a54f463e1a099031aa"
  "ccpay-service-request-cpo-update-service:src/main/resources/application.yaml": "a21fecc631d099d3e44146d87d5b7481ab2a8b24"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/CallbackService.java": "a4175ada85e256554b5aec7d53c72dc5a6fff0d2"
  "civil-service:src/main/java/uk/gov/hmcts/reform/civil/controllers/fees/ServiceRequestUpdateClaimIssuedCallbackController.java": "caee8971ac541af666f32d046a873e986483404a"
  "probate-back-office:src/main/java/uk/gov/hmcts/probate/controller/PaymentController.java": "1f45bf631f451881fa2c24da0622cc943bf504ac"
  "nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/controller/PaymentCallbackController.java": "5e750471ffa40d01398eb1308bfbbd8957903c40"
  "cnp-flux-config:apps/fees-pay/status-payment-job/status-payment-job.yaml": "5632e1e8c45f3270060c58942c68c44b69045bc4"
  "cnp-flux-config:apps/fees-pay/dead-letter-queue-process/dead-letter-queue-process.yaml": "295f6426772759c1bedd42dff4f81ac69bb4edf5"
  "cnp-flux-config:apps/fees-pay/unprocessed-payment-update/unprocessed-payment-update.yaml": "96fd2884955cf83b11d026f5c7d9597112901770"
  "cnp-flux-config:apps/fees-pay/ccpay-cpo-update-service/prod.yaml": "204f235858ef707acc00eb4ae24c6f72a9de6563"
  "cnp-flux-config:apps/fees-pay/ccpay-callback-function/ccpay-callback-function.yaml": "f660da02ae474a3048cbfa5da3fc4a646ecedd4b"
  "cnp-flux-config:apps/fees-pay/ccpay-callback-function/prod.yaml": "7b22eb2f6fc3bfe636d2eeb4cbb0f7eb46f76bb5"
---

## TL;DR

- `ccpay-payment-app` publishes payment-status updates to two Azure Service Bus (ASB) topics: `ccpay-service-callback-topic` (card/PBA payment status callbacks to service teams) and `ccpay-service-request-cpo-update-topic` (service-request updates forwarded to the Case Payment Orders API).
- Messages are published via `TopicClientProxy` with a 3-attempt retry and a linear backoff of `1s * attemptNumber`, so the two waits are 1s and 2s and the third failure propagates (`TopicClientProxy.java:17,49`).
- The external consumer `ccpay-callback-function` (Azure Function) is KEDA-scaled on the `serviceCallbackPremiumSubscription` backlog, authenticates with S2S as `payment_app`, and sends a PUT request to the service's registered callback URL (`cnp-flux-config:apps/fees-pay/ccpay-callback-function/ccpay-callback-function.yaml:16-24`, `cnp-flux-config:apps/fees-pay/ccpay-callback-function/prod.yaml:11-12`). Any 2XX response counts as success; otherwise it redelivers on a 30-minute interval (`DELAY_MESSAGE_MINUTES`, `ccpay-callback-function.yaml:13`) for up to 5 further attempts and then gives up.
- The `ccpay-service-callback-topic` carries either a `PaymentDto` (legacy path) or `PaymentStatusDto` (Ways2Pay path) JSON payload with a `serviceCallbackUrl` message property.
- The `ccpay-service-request-cpo-update-topic` carries a `ServiceRequestCpoDto` (snake_case JSON) consumed by `ccpay-service-request-cpo-update-service`.
- Publishing is ungated: `CallbackServiceImpl.callback()` publishes whenever a callback URL is set, with no feature check (`CallbackServiceImpl.java:42-79`). The Payment Status Update Job runs every 30 minutes to check for outstanding initiated card payments (`status-payment-job.yaml:11`).

## Topics

| Topic name | Purpose | Publisher | Consumer(s) |
|---|---|---|---|
| `ccpay-service-callback-topic` | Card/PBA payment status callbacks to service teams | `CallbackServiceImpl`, `ServiceRequestDomainServiceImpl` | `ccpay-callback-function` (Azure Function) -> service teams via their registered `serviceCallbackUrl` |
| `ccpay-service-request-cpo-update-topic` | Service-request payment status updates | `ServiceRequestDomainServiceImpl` | `ccpay-service-request-cpo-update-service` -> CPO API |

<!-- DIVERGENCE: Confluence (FAQ page 1815114088 and Service Callback LLD 1958058001) says ccpay-function-node retries at 30-minute intervals for up to 5 attempts beyond the first, but ccpay-functions-node is not in the workspace repos and cannot be verified in source. The publisher-side retry in TopicClientProxy.java:17 is confirmed as 3 attempts with linear backoff. Source wins for the publisher; the consumer retry is documented from Confluence. -->

## Connection configuration

| Property | Environment variable | Default |
|---|---|---|
| ASB connection string | `ASB_CONNECTION_STRING` | -- (required) |
| Callback topic name | (hard-coded) | `ccpay-service-callback-topic` |
| CPO update topic name | (hard-coded) | `ccpay-service-request-cpo-update-topic` |
| Subscription (callback) | `application.properties` | `serviceCallbackPremiumSubscription` |
| Subscription (CPO) | `application.yaml` in CPO update service | `serviceRequestCpoUpdatePremiumSubscription` |

Both topic names are hard-coded in `ServiceRequestDomainServiceImpl:101-103`. The `TopicClientProxy` default from `application.properties` is only `ccpay-service-callback-topic`.

## Callback URL registration

Services register their callback URL at payment/service-request creation time. The URL is stored in different DB columns depending on the endpoint used:

| Endpoint | Callback URL source | DB location |
|---|---|---|
| `POST /service-request` | `call_back_url` in request body | `payment_fee_link.service_request_callback_url` |
| `POST /service-request/{ref}/card-payments` | `service-callback-url` request header | `payment.service_callback_url` |
| `POST /service-request/{ref}/pba-payments` | inherited from the service request | `payment_fee_link.service_request_callback_url` |
| `POST /card-payments` (legacy) | `service-callback-url` request header | `payment.service_callback_url` |
| `POST /credit-account-payments` (legacy PBA) | N/A | N/A (no callback) |

`service-callback-url` is an HTTP **header**, not a query parameter, on both endpoints that accept it (`CardPaymentController.java:119`, `ServiceRequestController.java:322`).

**Which column is actually read at send time depends on the path, not on where the URL was stored.** The Ways2Pay sends go through `ServiceRequestDomainService.sendMessageToTopic(dto, url)` and are always passed `paymentFeeLink.getCallBackUrl()` — the `payment_fee_link` column — for PBA payments (`ServiceRequestDomainServiceImpl.java:283,294`) and for the card status check (`ServiceRequestController.java:358`). Only `CallbackServiceImpl.callback()` consults `payment.service_callback_url`, and it prefers that column over the `payment_fee_link` one when both are populated. So a W2P card payment that supplied the `service-callback-url` header can be called back on either URL depending on which code path fires, and a service request created without `call_back_url` will get no callback from the Ways2Pay paths even if the header was supplied.

## Message format: `ccpay-service-callback-topic`

Two payload shapes are published depending on which callback path is triggered in `CallbackServiceImpl.callback()` (`CallbackServiceImpl.java:42-79`). The method is `synchronized`, so concurrent status updates on different payments serialise through a single publish path.

### Path 1 -- `payment.serviceCallbackUrl` is set (legacy card payments)

Published when a payment record has a `serviceCallbackUrl` field (set at payment creation via `POST /card-payments` with the `service-callback-url` header).

**Message body**: `PaymentDto` serialised as JSON (full payment object with fees, links, etc.).

**Message property**: `serviceCallbackUrl` = the URL registered on the payment record.

### Path 2 -- `paymentFeeLink.callBackUrl` is set (Ways2Pay / service-request flow)

Published when the payment group (`PaymentFeeLink`) has a `callBackUrl` (mapped to DB column `service_request_callback_url`). This is the primary path for modern integrations.

**Message body**: `PaymentStatusDto` serialised as JSON (see schema below).

**Message property**: `serviceCallbackUrl` = the `callBackUrl` from the payment fee link.

### `PaymentStatusDto` JSON schema

```json
{
  "service_request_reference": "2023-1692266328473",
  "ccd_case_number": "1692266325752226",
  "service_request_amount": 2500.00,
  "service_request_status": "Paid",
  "payment": {
    "payment_amount": 2500.00,
    "payment_reference": "RC-1692-2665-9206-3000",
    "payment_method": "payment by account",
    "case_reference": "098DC868",
    "account_number": "PBA0088311"
  }
}
```

Source: `PaymentStatusDto.java` and `PaymentReference.java` -- both annotated with `@JsonNaming(SnakeCaseStrategy.class)`.

| Field | Type | Description |
|---|---|---|
| `service_request_reference` | String | Service request reference, format `YYYY-<13-digit-number>` |
| `ccd_case_number` | String | 16-digit CCD case number |
| `service_request_amount` | BigDecimal | Total amount on the service request |
| `service_request_status` | String | One of: `"Paid"`, `"Not paid"`, `"Partially paid"` |
| `payment.payment_amount` | BigDecimal | Amount of this specific payment |
| `payment.payment_reference` | String | Payment reference, format `RC-NNNN-NNNN-NNNN-NNNN` |
| `payment.payment_method` | String | `"card"` or `"payment by account"` |
| `payment.case_reference` | String | Service-specific case reference, captured when the service creates the service request — empty if the service request was created in PayBubble instead |
| `payment.account_number` | String | PBA account number (empty for card payments) |

### Callback delivery to services

The `ccpay-callback-function` Azure Function (not in this workspace) consumes messages from `ccpay-service-callback-topic` and delivers them as **PUT** requests to the service's callback URL.

| Aspect | Detail |
|---|---|
| HTTP method | PUT |
| `ServiceAuthorization` header | S2S token for microservice `payment_app` (`MICROSERVICE_PAYMENT_APP` in `cnp-flux-config:apps/fees-pay/ccpay-callback-function/prod.yaml:11-12`) |
| `Content-Type` header | `application/json` |
| Expected success response | Any 2XX (the LLD notes that services often assume 200 or 201, but anything in `200 <= status < 300` is accepted) |
| Retry on failure | Redelivery interval of 30 minutes, set as `DELAY_MESSAGE_MINUTES: 30` (`cnp-flux-config:apps/fees-pay/ccpay-callback-function/ccpay-callback-function.yaml:13`); up to 5 further attempts, 6 deliveries in total |
| After retry exhaustion | The LLD states the status update to the service simply ends; it does not describe the message as dead-lettered |

<!-- CONFLUENCE-ONLY: not verified in source -->

The PUT method is fixed by the receiving side: every handler registered as a callback target in the consuming services is declared `@PutMapping` and guarded by `ServiceAuthorization`. A service that exposes only `POST` at its registered URL therefore never receives a status update, and because delivery ends after retry exhaustion without dead-lettering, the miss leaves no queued message to replay -- the payment has to be re-driven through `PATCH /jobs/card-payments-status-update` instead.

### Triggers

The callback is invoked from multiple code paths:

| Trigger | Endpoint / Job | Component | Callback initiated by |
|---|---|---|---|
| W2P PBA payment success | `POST /service-request/{ref}/pba-payments` | `ServiceRequestController` | Payment App (immediate) |
| W2P Card payment status check | `GET /card-payments/{internal-reference}/status` | `ServiceRequestController` | Payment App (immediate) |
| Card payment status update batch | `PATCH /jobs/card-payments-status-update` | `MaintenanceJobsController` | Payment Status Update Job |
| Legacy card payment | `POST /card-payments` | `CardPaymentController` | Payment Status Update Job |

The Payment Status Update Job looks for card payments that are:
1. Online card payments (not telephony)
2. Status of "Initiated" in the DB (shown as "created")
3. GOV.UK Pay status differs from the recorded status
4. Callback URL provided in the `payment` table — if absent, the `payment_fee_link` table is checked instead

The job only ever responds to **online card payments**. Failed/disputed payments, refunds, and telephony payments are all out of its scope, so none of them produce a callback from this route.

**Important**: If a service calls `GET /card-payments/{reference}` (legacy status check), this updates the payment status in the DB but does **not** trigger a callback. The Payment Status Update Job will then skip that payment because it is no longer "Initiated". The service must handle the status response itself.

### Feature gate

<!-- DIVERGENCE: Confluence (Service Callback LLD 1958058001) states publishing is controlled by an FF4j feature flag that can be switched off to suppress callbacks. ccpay-payment-app declares the flag name CallbackService.FEATURE = "payment-callback-service" (CallbackService.java:8) but never reads it, and no FF4j dependency is declared in its build; the repo's runtime toggle mechanism is LaunchDarklyFeatureToggler. CallbackServiceImpl.callback() (CallbackServiceImpl.java:42-79) publishes unconditionally once a callback URL is present. Source wins. -->
The callback path has no runtime switch. `CallbackService` declares `String FEATURE = "payment-callback-service"` (`CallbackService.java:8`), and that string is the only occurrence of the name in the repository -- nothing reads the constant. `CallbackServiceImpl.callback()` branches only on which callback URL is populated (`CallbackServiceImpl.java:43,59`).

Runtime toggling in `ccpay-payment-app` goes through `LaunchDarklyFeatureToggler`, and the flags present in the callback-publishing path govern other behaviour: `apportion-feature`, default `false`, gates fee/payment apportionment either side of the publish calls (`ServiceRequestDomainServiceImpl.java:238,303`).

The consequence for support: callbacks to a service cannot be suppressed from the Payment App side. A consumer whose callback endpoint is failing or mid-deployment keeps receiving deliveries, and the only levers are removing the registered callback URL for new payments or absorbing the traffic at the consumer's own edge.

## Message format: `ccpay-service-request-cpo-update-topic`

Published by `ServiceRequestDomainServiceImpl.sendMessageTopicCPO()` (`ServiceRequestDomainServiceImpl:534-572`) after a service request is created via `POST /service-request`.

**Message body** (`ServiceRequestCpoDto` serialised as JSON):

| Field | Type | Description |
|---|---|---|
| `action` | String | The action performed (e.g. `"Case Submit"`) |
| `case_id` | Long | CCD case ID |
| `order_reference` | String | Service request reference (e.g. `"2021-11223344556"`) |
| `responsible_party` | String | Name of the responsible party (e.g. `"Jane Doe"`) |

**Message property**: `serviceCallbackUrl` = `{case-payment-orders.api.url}/case-payment-orders`

The consumer (`ccpay-service-request-cpo-update-service`) deserialises this into `CpoUpdateServiceRequest` using `@JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)` -- all JSON keys are snake_case (`CpoUpdateServiceRequest.java:10`).

## Consumer: `ccpay-service-request-cpo-update-service`

A standalone Spring Boot service that bridges the ASB topic to the CPO API. It has no REST API beyond actuator health/info endpoints.

### Subscription configuration

| Config key | Value |
|---|---|
| `amqp.host` | `ccpay-servicebus-<env>-premium.servicebus.windows.net` |
| `amqp.jrd.topic` | `ccpay-service-request-cpo-update-topic` |
| `amqp.jrd.subscription` | `serviceRequestCpoUpdatePremiumSubscription` |
| `thread.count` | 4 (configurable via `THREAD_COUNT`) |
| Receive mode | `PEEKLOCK` |
| Max lock renewal | 1 hour |
| Message wait timeout | 5 minutes |

The `amqp.jrd.*` key prefix is a naming leftover from a template -- it does not involve Judicial Reference Data (`ServiceBusConfiguration.java:43-47`). Neither the topic nor the subscription has a usable in-repo default: both fall back to `dummy` (`application.yaml:25,27`), so the real values arrive as `AMQP_TOPIC_NAME` and `AMQP_SUBSCRIPTION` from the deployment, where `AMQP_SUBSCRIPTION` is set to `serviceRequestCpoUpdatePremiumSubscription` (`prod.yaml`).

### Processing flow

1. Message received via `IMessageHandler.onMessageAsync(IMessage)` with auto-complete disabled.
2. Body bytes deserialised to `CpoUpdateServiceRequest` via Jackson.
3. `CpoUpdateServiceImpl.updateCpoServiceWithPayment()` POSTs to `POST {cpo.baseUrl}/case-payment-orders` with headers `Authorization: Bearer <idam-token>` and `ServiceAuthorization: <s2s-token>`.
4. On success: `receiveClient.completeAsync(lockToken)`.
5. On `CpoUpdateException`: Spring Retry retries up to 3 times (default) with 30-second backoff (`CpoUpdateServiceImpl.java:54`).
6. After retry exhaustion: `@Recover` throws `MaxTryExceededException` -> message dead-lettered via `receiveClient.deadLetterAsync(lockToken, server, status)`.
7. On deserialisation failure (`InvalidCpoUpdateRequestException`): message immediately dead-lettered (`ServiceBusConfiguration.java:98`).

### Authentication

| Target | Mechanism |
|---|---|
| IDAM | Password grant (`grant_type=password`) to `{idam.url}/o/token`; service account `idam.user.ccpayfunctionnode@hmcts.net` |
| S2S | `authTokenGenerator.generate()` with microservice name `service_request_cpo_update_service` |

S2S secret sourced from Key Vault: `service-request-cpo-update-service-s2s-secret`.

## Publishing mechanism: `TopicClientProxy`

`TopicClientProxy.send(IMessage)` (`TopicClientProxy.java:59-83`):

- Opens a new `TopicClient` per message by default.
- In bulk mode (`keepClientAlive=true`), reuses the client across multiple sends -- used by `MaintenanceJobsController` during the card-payments status update batch job.
- Retry: a maximum of 3 attempts, sleeping `1s * attemptNumber` between them, so the waits are 1s then 2s and the third failure is rethrown to the caller (`TopicClientProxy.java:17,49`). Total time absorbed before the exception surfaces is about 3 seconds, which is short enough that an inbound payment request fails rather than hangs when the topic is unreachable.
- A correlation ID (UUID) is added to each message for tracing (`ServiceRequestDomainServiceImpl:589`).

Two beans manage the two topics:
- `TopicClientProxy` (injected into `CallbackServiceImpl`) -- targets `ccpay-service-callback-topic`.
- `TopicClientService.getTopicClientProxy()` -- returns a proxy targeting `ccpay-service-request-cpo-update-topic`.

## Scheduled jobs

All three run as Flux-managed `CronJob` HelmReleases in the `fees-pay` namespace, from the shared `stable/payment-jobs` chart with the same `payment/jobs` image, distinguished only by `REPORT_NAME`.

| Helm release | Cron schedule | Purpose |
|---|---|---|
| `status-payment-job` | `*/30 * * * *` -- every 30 minutes (`status-payment-job.yaml:11`) | Checks initiated card payments against GOV.UK Pay; triggers callback if status changed |
| `dead-letter-queue-process` | `30 2 * * *` -- 02:30 daily (`dead-letter-queue-process.yaml:10`) | Reprocesses DLQ messages for the CPO update topic |
| `unprocessed-payment-update` | `*/2 * * * *` -- every 2 minutes (`unprocessed-payment-update.yaml:10`) | Checks payment failures with unprocessed payment references |

The 30-minute status poll sets the floor on callback latency for a card payment whose GOV.UK Pay outcome is not observed synchronously: a service can wait up to half an hour for the status update, so a case that appears stuck at the payment stage is only worth escalating once that window has passed.

## Registered consumers (S2S callers)

Services that receive callbacks via `ccpay-service-callback-topic` register their `serviceCallbackUrl` at payment/service-request creation time. The trusted S2S caller list for `ccpay-payment-app` includes (`trusted.s2s.service.names`):

```
cmc, cmc_claim_store, probate_frontend, divorce_frontend, ccd_gw, api_gw,
finrem_payment_service, ccpay_bubble, jui_webapp, xui_webapp, fpl_case_service,
iac, probate_backend, civil_service, paymentoutcome_web, adoption_web,
prl_cos_api, refunds_api, civil_general_applications, notifications_service,
nfdiv_case_api, ccpay_gw, pcs_api, pcs_frontend
```

Any service in this list can register a callback URL when creating a payment or service request.

Callback paths registered by the consuming services, each declared as a `PUT` handler:

| Service | Callback path | Handler |
|---|---|---|
| Probate | `/payment/gor-payment-request-update` | `probate-back-office` `PaymentController.java:31,43` |
| Civil | `/service-request-update-claim-issued` | `civil-service` `ServiceRequestUpdateClaimIssuedCallbackController.java:29` |
| Divorce | `/payment-update` | `nfdiv-case-api` `PaymentCallbackController.java:25,36-40` |

Probate is the only one of the three that nests its handler under a class-level `@RequestMapping("/payment")`, which is why its registered URL carries a path prefix the others do not.

## Dead-letter queue reprocessing

Endpoint: `PATCH /jobs/dead-letter-queue-process` (`ServiceRequestController:293`)

Connects to `ccpay-service-request-cpo-update-topic/.../subscriptions/serviceRequestCpoUpdateSubscription/$deadletterqueue` in `RECEIVEANDDELETE` mode and reprocesses messages (`ServiceRequestDomainServiceImpl:489-531`).

The subscription name in that path is hard-coded as `serviceRequestCpoUpdateSubscription` (`ServiceRequestDomainServiceImpl.java:491`), while the consumer subscribes to `serviceRequestCpoUpdatePremiumSubscription` (`prod.yaml`). The job therefore drains a different subscription's dead-letter queue from the one the CPO update service reads, so messages dead-lettered by the running consumer are not the ones this job replays. Because the connection is `RECEIVEANDDELETE` (`ServiceRequestDomainServiceImpl.java:493`), anything it does pull is gone whether or not it is republished.

**Important**: Only messages whose properties contain `503` (service unavailable) are reprocessed. Other dead-lettered messages (e.g. deserialization failures) are consumed from the DLQ but not republished (`ServiceRequestDomainServiceImpl:510`).

## Failure scenarios

| # | Scenario | Impact | Mitigation |
|---|---|---|---|
| 1 | Payment status updated by another endpoint (e.g. `GET /card-payments/{ref}`) | Payment Status Update Job skips it; no callback sent | Service must handle the status from the API response directly |
| 2 | Service Bus message lost | Case stuck at payment stage | Manual callback (see operational procedures) |
| 3 | Service endpoint returns non-2XX | Function-node makes up to 5 further attempts at 30-min intervals, then stops | Investigate service logs; manual resend if needed |
| 4 | Callback URL not stored in DB | No callback possible | Ensure `call_back_url` / `service-callback-url` passed at creation |
| 5 | Service request created without `call_back_url`, callback URL supplied only as the `service-callback-url` header | The Ways2Pay paths read `payment_fee_link.service_request_callback_url` and find nothing, so no callback is published | Pass `call_back_url` on `POST /service-request` — do not rely on the header alone for W2P flows |
| 6 | Azure Service Bus unavailable | `TopicClientProxy` throws after 3 attempts | Message logged as error; no automatic recovery |

<!-- CONFLUENCE-ONLY: not verified in source -->

## Examples

### Publisher: dual code path in CallbackServiceImpl

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java

public synchronized void callback(PaymentFeeLink paymentFeeLink, Payment payment) {
    if (null != payment.getServiceCallbackUrl()) {
        // Path 1 (legacy): full PaymentDto, callback URL from payment record
        PaymentDto dto = paymentDtoMapper.toResponseDto(paymentFeeLink, payment);
        Message msg = new Message(objectMapper.writeValueAsString(dto));
        msg.setContentType("application/json");
        msg.setLabel("Service Callback Message");
        msg.setProperties(Collections.singletonMap(
            "serviceCallbackUrl", payment.getServiceCallbackUrl()));
        topicClient.send(msg);

    } else if (null != paymentFeeLink.getCallBackUrl()) {
        // Path 2 (Ways2Pay): lighter PaymentStatusDto, callback URL from service request
        String serviceRequestStatus =
            paymentGroupDtoMapper.toPaymentGroupDto(paymentFeeLink).getServiceRequestStatus();
        PaymentStatusDto paymentStatusDto =
            paymentDtoMapper.toPaymentStatusDto(paymentFeeLink.getPaymentReference(),
                "", payment, serviceRequestStatus);
        Message msg = new Message(objectMapper.writeValueAsString(paymentStatusDto));
        msg.setContentType("application/json");
        msg.setLabel("Service Callback Message");
        msg.setProperties(Collections.singletonMap(
            "serviceCallbackUrl", paymentFeeLink.getCallBackUrl()));
        topicClient.send(msg);
    }
}
```

### TopicClientProxy: 3-attempt retry with linear backoff

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java

@Component
public class TopicClientProxy {
    private static final int MESSAGE_SEND_MAX_RETRY_COUNT = 3;

    private void send(TopicClient client, IMessage message)
            throws InterruptedException, ServiceBusException {
        int attempt = 0;
        while (attempt < MESSAGE_SEND_MAX_RETRY_COUNT) {
            try {
                client.send(message);
                break; // success
            } catch (ServiceBusException | InterruptedException e) {
                attempt++;
                if (attempt >= MESSAGE_SEND_MAX_RETRY_COUNT) throw e;
                Thread.sleep(1000L * attempt); // linear backoff: 1s, then 2s
            }
        }
    }

    // In bulk mode (batch status-update job), reuse the client across sends
    public synchronized void setKeepClientAlive(boolean keepClientAlive) {
        this.keepClientAlive = keepClientAlive;
    }
}
```

### PaymentStatusDto: the Ways2Pay callback payload shape

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/dto/PaymentStatusDto.java

@JsonNaming(SnakeCaseStrategy.class)
@JsonInclude(NON_NULL)
@Builder(builderMethodName = "paymentStatusDto")
public class PaymentStatusDto {
    @JsonProperty("service_request_reference")
    private String serviceRequestReference;

    @JsonProperty("ccd_case_number")
    private String ccdCaseNumber;

    @JsonProperty("service_request_amount")
    private BigDecimal serviceRequestAmount;

    @JsonProperty("service_request_status")
    private String serviceRequestStatus; // "Paid", "Not paid", "Partially paid"

    @JsonProperty("payment")
    private PaymentReference payment;
}
```

### CPO update service: consuming the `ccpay-service-request-cpo-update-topic`

```java
// Source: apps/payment/ccpay-service-request-cpo-update-service/src/main/java/uk/gov/hmcts/reform/services/CpoUpdateServiceImpl.java

@Service
public class CpoUpdateServiceImpl implements CpoUpdateService {

    @Retryable(value = CpoUpdateException.class, backoff = @Backoff(delay = 30_000))
    public void updateCpoServiceWithPayment(CpoUpdateServiceRequest cpoUpdateServiceRequest) {
        UriComponentsBuilder builder = UriComponentsBuilder.newInstance()
            .fromUriString(cpoBaseUrl + cpoPath);
        try {
            restTemplateCpo.exchange(builder.toUriString(), HttpMethod.POST,
                new HttpEntity<>(cpoUpdateServiceRequest, getHttpHeaders()), String.class);
        } catch (HttpClientErrorException | HttpServerErrorException exception) {
            throw new CpoUpdateException("CPO", exception.getStatusCode(), exception);
        } catch (ResourceAccessException exception) {
            throw new CpoUpdateException("CPO", HttpStatus.SERVICE_UNAVAILABLE, exception);
        }
    }

    @Recover
    public void recover(CpoUpdateException exception, CpoUpdateServiceRequest request) {
        // After max retries: dead-letter the message
        throw new MaxTryExceededException(exception.getServer(), exception.getStatus(), exception);
    }
}
```

## See also

- [Payment Lifecycle](../explanation/payment-lifecycle.md) — the payment stages that trigger callback publishing and the dual callback paths
- [GOV.UK Pay Integration](../explanation/govuk-pay-integration.md) — status polling details and return-URL vs callback-URL distinction
- [How-to: Integrate from a Service](../how-to/integrate-from-a-service.md) — how to register a callback URL when creating a Service Request
- [How-to: Troubleshoot Payment Status](../how-to/troubleshoot-payment-status.md) — diagnosing missed callbacks and manual replay procedure
- [Reference: API Payments](api-payments.md) — job endpoints and reconciliation endpoint specs
- [Glossary](glossary.md) — definitions for ASB, ccpay-callback-function, Callback URL, CPO, Service Request
