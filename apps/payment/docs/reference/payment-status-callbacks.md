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
  - ccpay-service-request-cpo-update-service:src/main/java/uk/gov/hmcts/reform/config/servicebus/ServiceBusConfiguration.java
  - ccpay-service-request-cpo-update-service:src/main/java/uk/gov/hmcts/reform/services/CpoUpdateServiceImpl.java
  - ccpay-service-request-cpo-update-service:src/main/java/uk/gov/hmcts/reform/dtos/requests/CpoUpdateServiceRequest.java
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/dto/PaymentStatusDto.java
  - apps/payment/ccpay-service-request-cpo-update-service/src/main/java/uk/gov/hmcts/reform/services/CpoUpdateServiceImpl.java
confluence:
  - id: "1958058001"
    title: "Service Callback LLD"
    last_modified: "2025-03-28"
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
confluence_checked_at: "2026-05-13"
---

## TL;DR

- `ccpay-payment-app` publishes payment-status updates to two Azure Service Bus (ASB) topics: `ccpay-service-callback-topic` (card/PBA payment status callbacks to service teams) and `ccpay-service-request-cpo-update-topic` (service-request updates forwarded to the Case Payment Orders API).
- Messages are published via `TopicClientProxy` with a 3-attempt retry and exponential backoff (`1s * attemptNumber`).
- The external consumer `ccpay-functions-node` (Azure Function, Node.js) reads from `ccpay-service-callback-topic`, authenticates with S2S as `payment_app`, and sends a PUT request to the service's registered callback URL. It retries 6 times at 30-minute intervals before dead-lettering.
- The `ccpay-service-callback-topic` carries either a `PaymentDto` (legacy path) or `PaymentStatusDto` (Ways2Pay path) JSON payload with a `serviceCallbackUrl` message property.
- The `ccpay-service-request-cpo-update-topic` carries a `ServiceRequestCpoDto` (snake_case JSON) consumed by `ccpay-service-request-cpo-update-service`.
<!-- REVIEW: FF4j flag name is wrong. The actual flag name is "payment-callback-service" (from CallbackService.FEATURE in model/src/main/java/uk/gov/hmcts/payment/api/service/CallbackService.java:8), not "service-callback". -->
- Publishing is gated by the FF4j feature flag `service-callback`. The Payment Status Update Job (`status-payment-job-job`) runs every 30 minutes to check for outstanding initiated card payments.

## Topics

| Topic name | Purpose | Publisher | Consumer(s) |
|---|---|---|---|
| `ccpay-service-callback-topic` | Card/PBA payment status callbacks to service teams | `CallbackServiceImpl`, `ServiceRequestDomainServiceImpl` | `ccpay-functions-node` (Azure Function) -> service teams via their registered `serviceCallbackUrl` |
| `ccpay-service-request-cpo-update-topic` | Service-request payment status updates | `ServiceRequestDomainServiceImpl` | `ccpay-service-request-cpo-update-service` -> CPO API |

<!-- DIVERGENCE: Confluence (FAQ page 1815114088) says ccpay-function-node retries 6 times at 30-minute intervals, but ccpay-functions-node is not in the workspace repos and cannot be verified in source. The publisher-side retry in TopicClientProxy.java:17 is confirmed as 3 attempts with linear backoff. Source wins for the publisher; the consumer retry is documented from Confluence. -->

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
| `POST /service-request/{ref}/card-payments` | `service-callback-url` URL parameter | `payment.service_callback_url` |
| `POST /card-payments` (legacy) | `service-callback-url` URL parameter | `payment.service_callback_url` |
| `POST /credit-account-payments` (legacy PBA) | N/A | N/A (no callback) |

<!-- CONFLUENCE-ONLY: not verified in source -->

## Message format: `ccpay-service-callback-topic`

Two payload shapes are published depending on which callback path is triggered in `CallbackServiceImpl.callback()` (`CallbackServiceImpl.java:46-89`):

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
| `payment.case_reference` | String | Service-specific case reference (may be empty) |
| `payment.account_number` | String | PBA account number (empty for card payments) |

### Callback delivery to services

The `ccpay-functions-node` Azure Function (not in this workspace) consumes messages from `ccpay-service-callback-topic` and delivers them as **PUT** requests to the service's callback URL.

| Aspect | Detail |
|---|---|
| HTTP method | PUT |
| `ServiceAuthorization` header | S2S token for microservice `payment_app` |
| `Content-Type` header | `application/json` |
| Expected success response | HTTP 200 or 201 |
| Retry on failure | 6 attempts, 30 minutes apart |
| After retry exhaustion | Message is dead-lettered |

<!-- CONFLUENCE-ONLY: not verified in source -->

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
4. Callback URL provided in either the `payment` table or `payment_fee_link` table

**Important**: If a service calls `GET /card-payments/{reference}` (legacy status check), this updates the payment status in the DB but does **not** trigger a callback. The Payment Status Update Job will then skip that payment because it is no longer "Initiated". The service must handle the status response itself.

### Feature gate

<!-- REVIEW: The FF4j flag value stated here is wrong. CallbackService.FEATURE = "payment-callback-service" (not "service-callback"). See model/src/main/java/uk/gov/hmcts/payment/api/service/CallbackService.java:8. -->
Publishing is controlled by the FF4j feature flag `service-callback` (`CallbackService.FEATURE = "service-callback"`). If the flag is disabled, no messages are sent.

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

The `amqp.jrd.*` key prefix is a naming leftover from a template -- it does not involve Judicial Reference Data (`ServiceBusConfiguration.java:43-47`).

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
- Retry: 3 attempts with sleep of `1s * attemptNumber` between each (`TopicClientProxy.java:17,49`).
- A correlation ID (UUID) is added to each message for tracing (`ServiceRequestDomainServiceImpl:587`).

Two beans manage the two topics:
- `TopicClientProxy` (injected into `CallbackServiceImpl`) -- targets `ccpay-service-callback-topic`.
- `TopicClientService.getTopicClientProxy()` -- returns a proxy targeting `ccpay-service-request-cpo-update-topic`.

## Scheduled jobs

| Job | Cron schedule | Purpose |
|---|---|---|
| `status-payment-job-job` | Every 30 minutes | Checks initiated card payments against GOV.UK Pay; triggers callback if status changed |
| `dead-letter-queue-process-job` | 02:30 daily | Reprocesses DLQ messages for the CPO update topic |
| `unprocessed-payment-update-job` | :15 past each hour, Mon-Fri | Checks payment failures with unprocessed payment references |

## Registered consumers (S2S callers)

Services that receive callbacks via `ccpay-service-callback-topic` register their `serviceCallbackUrl` at payment/service-request creation time. The trusted S2S caller list for `ccpay-payment-app` includes (`application.properties:110`):

```
cmc, cmc_claim_store, probate_frontend, divorce_frontend, ccd_gw, api_gw,
finrem_payment_service, ccpay_bubble, jui_webapp, xui_webapp, fpl_case_service,
iac, probate_backend, civil_service, paymentoutcome_web, adoption_web,
prl_cos_api, refunds_api, civil_general_applications, notifications_service,
nfdiv_case_api, ccpay_gw, pcs_api
```

Any service in this list can register a callback URL when creating a payment or service request.

Known service callback URLs (from Confluence):

| Service | Callback URL pattern |
|---|---|
| Probate | `/payment/gor-payment-request-update` |
| Civil | `/service-request-update-claim-issued` |
| Divorce (legacy) | `/payment-update` |

<!-- CONFLUENCE-ONLY: not verified in source -->

## Dead-letter queue reprocessing

Endpoint: `PATCH /jobs/dead-letter-queue-process` (`ServiceRequestController:289-294`)

Connects to `ccpay-service-request-cpo-update-topic/.../subscriptions/serviceRequestCpoUpdateSubscription/$deadletterqueue` and reprocesses messages (`ServiceRequestDomainServiceImpl:489-531`).

**Important**: Only messages whose properties contain `503` (service unavailable) are reprocessed. Other dead-lettered messages (e.g. deserialization failures) are consumed from the DLQ but not republished (`ServiceRequestDomainServiceImpl:510`).

## Failure scenarios

| # | Scenario | Impact | Mitigation |
|---|---|---|---|
| 1 | Payment status updated by another endpoint (e.g. `GET /card-payments/{ref}`) | Payment Status Update Job skips it; no callback sent | Service must handle the status from the API response directly |
| 2 | Service Bus message lost | Case stuck at payment stage | Manual callback (see operational procedures) |
| 3 | Service endpoint returns non-2XX | Function-node retries 6 times at 30-min intervals, then dead-letters | Investigate service logs; manual resend if needed |
| 4 | Callback URL not stored in DB | No callback possible | Ensure `call_back_url` / `service-callback-url` passed at creation |
| 5 | Azure Service Bus unavailable | `TopicClientProxy` throws after 3 retries | Message logged as error; no automatic recovery |

<!-- CONFLUENCE-ONLY: not verified in source -->

## Examples

### Publisher: dual code path in CallbackServiceImpl

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java

public synchronized void callback(PaymentFeeLink paymentFeeLink, Payment payment) {
    if (!ff4j.check(CallbackService.FEATURE)) {
        LOG.warn("Service callback feature is disabled");
        return;
    }

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
                Thread.sleep(1000L * attempt); // linear backoff: 1s, 2s, 3s
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
- [Glossary](glossary.md) — definitions for ASB, ccpay-functions-node, Callback URL, CPO, Service Request
