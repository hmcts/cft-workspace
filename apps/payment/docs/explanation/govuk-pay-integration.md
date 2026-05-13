---
title: Govuk Pay Integration
topic: govuk-pay
diataxis: explanation
product: payment
audience: both
sources:
  - ccpay-payment-app:gov-pay-client/src/main/java/uk/gov/hmcts/payment/api/external/client/GovPayClient.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/GovPayDelegatingPaymentService.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/v1/model/govpay/GovPayConfig.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/v1/model/govpay/GovPayKeyRepository.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/ServiceToTokenMap.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/MaintenanceJobsController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/ServiceRequestController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/service/ServiceRequestDomainServiceImpl.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/OnlineCardPaymentRequest.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/util/PayStatusToPayHubStatus.java
  - ccpay-payment-app:api/src/main/resources/application.properties
  - ccpay-scheduled-jobs:charts/payment-jobs/values.yaml
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/payment/ccpay-payment-app/gov-pay-client/src/main/java/uk/gov/hmcts/payment/api/external/client/GovPayClient.java
  - apps/payment/ccpay-payment-app/model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/GovPayDelegatingPaymentService.java
  - apps/payment/ccpay-payment-app/model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/ServiceToTokenMap.java
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java
confluence:
  - id: "1952812777"
    title: "Online Card Payment"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1953047074"
    title: "GOV.UK Pay Card Payments Service Onboarding Guide"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1794553235"
    title: "Service Callback LLD (NEW +Payment Failures WIP)"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1890795875"
    title: "Services integration with Payments & Service Requests (Orders / Invoices) for Card Payments"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1952815065"
    title: "Payments - Technical Integration Overview"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1952812014"
    title: "Payment Processing"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1803672594"
    title: "Service Request Card Payment Idempotency Update LLD"
    last_modified: "unknown"
    space: "DTSFP"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- `ccpay-payment-app` integrates with GOV.UK Pay via a dedicated `:payment-gov-pay-client` module that wraps Apache HttpClient 5 with Resilience4j circuit breakers.
- Two API models exist: **legacy** (`POST /card-payments`) where `return-url` is a request header, and **Ways2Pay** (`POST /service-request/{ref}/card-payments`) where `return-url` is in the JSON body.
- Multi-account management: each HMCTS service has its own GOV.UK Pay API key, resolved at runtime via `ServiceToTokenMap` and `GovPayKeyRepository` from the enterprise service name returned by `rd-location-ref-api`.
- Payment status is reconciled via a CronJob running every minute (`*/1 * * * *`) that calls `PATCH /jobs/card-payments-status-update`, querying GOV.UK Pay for all `initiated`-status payments.
- GOV.UK Pay payment sessions expire after **90 minutes**; the idempotency logic checks for existing payments within this window before creating new ones.
- Service callbacks publish a `PaymentStatusDto` JSON message to Azure Service Bus topics (`servicecallbacktopic` or `service-request-update`) with the callback URL as a message property.

## Architecture overview

The GOV.UK Pay integration spans three layers within `ccpay-payment-app`:

```
Controller layer          CardPaymentController / ServiceRequestController
                                      |
Domain/service layer      GovPayDelegatingPaymentService / ServiceRequestDomainServiceImpl
                                      |
Client layer              GovPayClient (gov-pay-client module)
                                      |
                          GOV.UK Pay public API (HTTPS)
```

The `:payment-gov-pay-client` Gradle module (`gov-pay-client/`) is the lowest layer. It owns the HTTP transport, error translation, and DTO mapping. The `:payment-model` module's `GovPayDelegatingPaymentService` orchestrates key resolution and amount conversion. The controller layer in `:payment-api` handles request validation, IDAM/S2S auth, and persistence.

### Two integration models

| Model | Endpoint | `return-url` location | When to use |
|-------|----------|----------------------|-------------|
| Legacy | `POST /card-payments` | Request **header** | Older service journeys; still in use |
| Ways2Pay (recommended) | `POST /service-request/{ref}/card-payments` | Request **body** (`return-url` JSON field) | All new service integrations |

The Ways2Pay model separates payment initiation into two steps: first create a Service Request (invoice), then create a card payment against it. This supports idempotency and better callback semantics.

## The gov-pay-client module

### GovPayClient

`GovPayClient` (`gov-pay-client/src/main/java/.../external/client/GovPayClient.java`) is a Spring `@Component` singleton that uses a shared Apache HttpClient 5 instance (thread-safe).

Key operations:

| Method | HTTP call | Circuit breaker | Notes |
|--------|-----------|-----------------|-------|
| `createPayment(key, request)` | `POST ${gov.pay.url}` | `createCardPayment` | Returns `GovPayPayment` with `nextUrl`, `govPayId` |
| `retrievePayment(key, govPayId)` | `GET ${gov.pay.url}/{govPayId}` | `retrieveCardPayment` | Ignores `GovPayPaymentNotFoundException` in breaker |
| `cancelPayment(key, cancelUrl)` | `POST {cancelUrl}` | none | Cancel URL from HATEOAS links in retrieve response |

All methods add `Authorization: Bearer {key}` to outbound requests (`GovPayClient.java:56-88`).

### Error translation

`GovPayErrorTranslator` maps HTTP status codes from GOV.UK Pay responses to typed exceptions:

- `GovPayPaymentNotFoundException` -- payment not found
- `GovPayCancellationFailedException` -- cancel rejected
- `GovPayTooManyRequestsException` -- rate limited (HTTP 429)
- `GovPayUnavailableException` -- GOV.UK Pay down (5xx)

Any 4xx/5xx triggers `checkNotAnError()` (`GovPayClient.java:132-140`) which delegates to the translator. All IO exceptions are wrapped as `GovPayClientException` (`GovPayClient.java:142-148`).

### Resilience4j circuit breakers

Circuit breaker configuration lives in `application.properties:237-244`. The `retrieveCardPayment` breaker is configured to ignore `GovPayPaymentNotFoundException` so that a missing payment does not count as a failure towards the breaker threshold.

## Payment creation flow

### Legacy endpoint (`POST /card-payments`)

When a service team calls `POST /card-payments`:

1. `CardPaymentController` (`CardPaymentController.java:115-189`) extracts `return-url` and `service-callback-url` from **request headers** (not body) at lines 119-121.
2. If `caseType` is present, the controller calls `referenceDataService.getOrganisationalDetail()` to resolve `siteId` and `service` from the `rd-location-ref-api`.
3. A `PaymentServiceRequest` is built and passed to `GovPayDelegatingPaymentService.create()`.
4. `GovPayDelegatingPaymentService` (`GovPayDelegatingPaymentService.java:46-52`) resolves the correct API key via `govPayKeyRepository.getKey(serviceIdSupplier.get())`, converts the amount from pounds to pence using `movePointRight(2).intValue()`, then calls `GovPayClient.createPayment()`.
5. GOV.UK Pay returns a `GovPayPayment` DTO containing `payment_id` (stored as `externalReference`), `state`, and HATEOAS `_links` including `next_url` (the hosted payment page URL) and `cancel`.
6. The `Payment` entity is persisted with the GOV.UK Pay ID. Transient fields (`nextUrl`, `returnUrl`, `cancelUrl`, `status`, `finished`) are populated from the response but **not** stored in the database (`Payment.java` `@Transient` annotations).
7. If the LaunchDarkly flag `apportion-feature` is enabled, `FeePayApportionService.processApportion()` runs post-creation (`CardPaymentController.java:183`).

The `language` field is lower-cased before forwarding to GOV.UK Pay (`CardPaymentController.java:172-174`), supporting Welsh-language payment pages.

### Ways2Pay endpoint (`POST /service-request/{ref}/card-payments`)

The recommended integration pattern for new services:

1. Service first creates a **Service Request** (invoice) via `POST /service-request`, providing a `call_back_url` and `hmcts_org_id`.
2. Service then calls `POST /service-request/{service-request-reference}/card-payments` with:
   - **Headers**: `ServiceAuthorization`, `Authorization`, `service-callback-url`
   - **Body**: `{ "amount": 100.00, "currency": "GBP", "language": "en", "return-url": "https://..." }`
3. `ServiceRequestController` reads `return-url` from the body (`OnlineCardPaymentRequest.returnUrl`).
4. Before creating a new payment, idempotency checks run (see below).
5. `ServiceRequestDomainServiceImpl.create()` calls `delegateGovPay.create()` with the enterprise service name from the Service Request.
6. The response includes `nextUrl` (GOV.UK Pay hosted page), `paymentReference` (RC-format), and `externalReference`.

**Request body validation** (`OnlineCardPaymentRequest`):
- `amount`: `@NotNull`, `@DecimalMin("0.01")`, `@Positive`, max 2 decimal places
- `currency`: `@NotNull` (CurrencyCode enum)
- `language`: `@NotNull`, `@NotEmpty`
- `return-url`: `@NotNull`, `@NotEmpty`

## Payment session behaviour and idempotency

GOV.UK Pay payment sessions expire after **90 minutes**. If the citizen abandons the payment or their session times out, the payment remains in an `initiated` state in PayHub.

### Duplicate payment prevention (Ways2Pay)

The `ServiceRequestDomainServiceImpl` implements two-phase idempotency logic when a card payment request arrives for a Service Request that already has a payment:

```
1. Identify Existing Payment
   |-- YES: Check Payment
   |       |-- Payment Successful in Payment DB?
   |       |       |-- YES: HTTP 302 redirect to return-url
   |       |       |-- NO: Check GovPay Status
   |       |               |-- Payment Successful in GovPay?
   |       |               |       |-- YES: Update DB, redirect to return-url
   |       |               |       |-- NO: Cancel Existing Payment
   |       |                       |-- Can Be Cancelled?
   |       |                       |       |-- YES: Cancel via GovPay, create new
   |       |                       |       |-- NO: Create new payment
   |-- NO: Create Card Payment
```

The `checkOnlinePaymentAlreadyExistWithCreatedState` method (`ServiceRequestDomainServiceImpl.java:429-444`):
1. Calculates a timestamp for 90 minutes ago.
2. Filters payments with `created` status, `gov pay` provider, created within the last 90 minutes.
3. Retrieves current state from GOV.UK Pay.
4. If a cancel link is present in the HATEOAS response, cancels the stale payment.

The `hasOnlineCardPaymentAlreadySuccess` method (`ServiceRequestDomainServiceImpl.java:394-427`):
1. Checks if any payment on the Service Request already has `SUCCESS` status in PayHub.
2. If not, checks any `created`-state payment within 90 minutes against GOV.UK Pay directly.
3. If GOV.UK Pay reports `success`, returns `true` (caller issues 302 redirect to return-url).

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- Confluence "Online Card Payment" states payment limits of up to £100,000 for standard providers and £5,000 for Government Banking. No limit configuration found in source code. -->

## Status polling and reconciliation

GOV.UK Pay does not push final payment status to HMCTS. Instead, `ccpay-payment-app` offers two mechanisms:

### On-demand retrieval

`GET /card-payments/{reference}` calls `GovPayClient.retrievePayment()` to fetch the latest state from GOV.UK Pay and maps it onto the persisted `Payment` record.

`GET /card-payments/{reference}/statuses` returns the full status history.

### Batch status update job

`PATCH /jobs/card-payments-status-update` (`MaintenanceJobsController.java:53-84`) is invoked by the `ccpay-scheduled-jobs` CronJob, which runs **every minute** (`*/1 * * * *` in `charts/payment-jobs/values.yaml`). It:

1. Queries all payments with status `initiated`.
2. For each, calls `delegatingPaymentService.retrieveWithCallBack()` which retrieves the current state from GOV.UK Pay and triggers the ASB callback if the payment has reached a terminal state.
3. Uses `topicClientProxy.setKeepClientAlive(true)` for batch efficiency (keeps the Azure Service Bus connection open across iterations).

This job ensures that payments where the citizen abandoned the GOV.UK Pay hosted page (never returned to `return-url`) eventually get their status reconciled.

<!-- DIVERGENCE: Confluence "Payments - Technical Integration Overview" says the scheduled job runs "typically within ~15 minutes", but ccpay-scheduled-jobs:charts/payment-jobs/values.yaml shows schedule: "*/1 * * * *" (every minute). Source wins. -->

### GOV.UK Pay status mapping

GOV.UK Pay reports statuses that are mapped to PayHub statuses via the `PayStatusToPayHubStatus` enum:

| GOV.UK Pay status | PayHub status | Description |
|-------------------|---------------|-------------|
| `created` | Initiated | Payment created, not yet confirmed |
| `started` | Initiated | User has begun entering details |
| `submitted` | Initiated | Card details submitted to provider |
| `success` | Success | Payment completed successfully |
| `failed` | Failed | Payment rejected (fraud check, 3DS failure, insufficient funds) |
| `cancelled` | Failed | Payment cancelled by user or service |
| `error` | Failed | Error in GOV.UK Pay or payment provider |
| `pending` | Pending | Awaiting confirmation |
| `decline` | Declined | Payment declined by provider |

### CCD status mapping

Services typically progress cases in CCD based on payment outcome:

| CCD Status | PayHub Status | Meaning |
|------------|---------------|---------|
| Awaiting payment | Payment initiated | User has not completed payment |
| Case progression allowed | Success | Payment confirmed |
| Case progression paused | Declined / Timed out / Cancelled / Error | Requires user retry |

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- CCD status mapping comes from Confluence "Payment Processing" page. The PayHub source does not define CCD statuses directly; these are managed by consuming services. -->

## Return URLs and callbacks

| Header/field | Purpose |
|--------------|---------|
| `return-url` (header on legacy; body on Ways2Pay) | URL where GOV.UK Pay redirects the citizen after payment completion or abandonment |
| `service-callback-url` (request header) | Stored on the `Payment` entity; used by `CallbackServiceImpl` to publish status updates via Azure Service Bus |
| `call_back_url` (Service Request body) | Stored on `PaymentFeeLink` entity; used for Ways2Pay callback routing |

The `return-url` is forwarded directly to GOV.UK Pay as part of the `CreatePaymentRequest`. After the citizen completes (or abandons) payment on the GOV.UK Pay hosted page, they are redirected to this URL. Typically this points to `ccpay-paymentoutcome-web` (port 3100) or a service team's own outcome page.

The `service-callback-url` is not sent to GOV.UK Pay. It is persisted and used internally: when `CallbackServiceImpl` detects a terminal payment state (via the batch job or on-demand retrieval), it publishes a `PaymentDto` message to Azure Service Bus with the `serviceCallbackUrl` as a message property. The consuming service (civil, PCS, etc.) picks up the message and processes the outcome.

### Callback message routing

<!-- REVIEW: The topic names in this table are wrong. There is only ONE topic: "ccpay-service-callback-topic" (confirmed in application.properties:200 and CallbackServiceImpl.java which uses a single TopicClientProxy for both paths). Both legacy and Ways2Pay callbacks go to the same topic. The names "servicecallbacktopic" and "service-request-update" do not exist in source. -->
Two Azure Service Bus topics are used:

| Topic | Used when | Legacy/new |
|-------|-----------|-----------|
| `servicecallbacktopic` | Callback URL stored on `Payment` table (legacy) | Legacy |
| `service-request-update` | Callback URL stored on `PaymentFeeLink` table (Ways2Pay) | New |

### Callback message format (Ways2Pay)

The callback message published to `service-request-update` follows this structure:

```json
{
  "service_request_reference": "2022-1648229603982",
  "ccd_case_number": "1648229404992811",
  "service_request_amount": 232,
  "service_request_status": "Paid",
  "payment": {
    "payment_amount": 232,
    "payment_reference": "RC-1648-2296-4212-7303",
    "payment_method": "card",
    "case_reference": "1648229404992811",
    "account_number": ""
  }
}
```

The `PaymentStatusDto` class defines the structure, using `@JsonNaming(SnakeCaseStrategy.class)` for snake_case serialisation.

### Callback scenarios

Service callbacks are triggered by:

| Trigger | Event type |
|---------|-----------|
| PBA payment against Service Request | `PBA-Payment` |
| Card payment status verified | `Card-Payment` |
| Status update batch job | `Card-Payment-Status-Update` |
| Bulk scan payment allocation | `Bulk Scan Payment Allocation` |
| Retrospective remission | `Retro-remission` |
| Telephony payment | `Telephony-payment` |
| Chargeback / bounced cheque | `Payment-Failure` |

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- The event type taxonomy above comes from Confluence "Service Callback LLD" page. The PaymentStatusDto class does not have an 'event' field -- this field appears in the newer callback_messages table design which may be in development. -->

### Message persistence and retry

If IDAM, CPO, or the service callback URL is down when a message is generated, the message is stored in the `callback_messages` database table with `sent_to_service = false`. A batch job reads unsent messages in creation-date order and retries delivery.

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- The callback_messages table design and retry mechanism is documented in Confluence "Service Callback LLD" but the table was not found in Liquibase changelogs during this review. -->

## Multi-account management

HMCTS operates **multiple GOV.UK Pay accounts** -- one per service jurisdiction -- to support Liberata financial reconciliation. Each account has its own API key.

### Key resolution chain

```
CardPaymentController / ServiceRequestController
  -> GovPayDelegatingPaymentService.create()
    -> govPayKeyRepository.getKey(serviceName)
      -> GovPayConfig (reads gov.pay.auth.key.{mapped_name})
```

1. **`ServiceToTokenMap`** (`ServiceToTokenMap.java:13-22`) maps human-readable enterprise service names to property key suffixes:

   | Enterprise service name | Key suffix (alias) |
   |------------------------|-------------------|
   | `"divorce"` | `"divorce_frontend"` |
   | `"probate"` | `"probate_frontend"` |
   | `"civil money claims"` | `"cmc"` |
   | `"specified money claims"` | `"cmc"` |
   | `"family private law"` | `"prl_cos_api"` |
   | `"immigration and asylum appeals"` | `"iac"` |
   | `"mortgage and landlord possession claims"` | `"pcs_api"` |
   | `"damages"` | `"cmc"` |

2. **`GovPayConfig`** (`GovPayConfig.java:9`) uses `@ConfigurationProperties(prefix = "gov.pay.auth")` to bind all `gov.pay.auth.key.*` properties into a map.

3. **`GovPayKeyRepository`** looks up the mapped name in the config and returns the API key string. If the service name is not in the map, a `PaymentServiceNotFoundException` is thrown.

### Where the enterprise service name comes from

For the **Ways2Pay** flow, the service passes `hmcts_org_id` (e.g., `"ABA5"`) in the Service Request body. The system calls `rd-location-ref-api` to resolve this to an enterprise service name (e.g., `"family private law"`), which then feeds into `ServiceToTokenMap`.

For the **legacy** flow, the `siteId` or `caseType` on the request is used to call Reference Data and resolve the service name.

### Vault secret mapping

Each GOV.UK Pay API key is stored in Azure Key Vault with a naming convention:

```
Vault secret name:     gov-pay-keys-{service}     (e.g., gov-pay-keys-prl)
Helm alias mapping:    gov.pay.auth.key.{alias}   (e.g., gov.pay.auth.key.prl_cos_api)
Environment variable:  GOV_PAY_AUTH_KEY_{UPPER}    (e.g., GOV_PAY_AUTH_KEY_PRL)
```

Configuration example (from `application.properties`):

```properties
gov.pay.auth.key.cmc=${GOV_PAY_AUTH_KEY_CMC:}
gov.pay.auth.key.cmc_claim_store=${GOV_PAY_AUTH_KEY_CMC:}
gov.pay.auth.key.probate_frontend=${GOV_PAY_AUTH_KEY_PROBATE_FRONTEND:}
gov.pay.auth.key.divorce_frontend=${GOV_PAY_AUTH_KEY_DIVORCE_FRONTEND:}
gov.pay.auth.key.iac=${GOV_PAY_AUTH_KEY_IAC:}
gov.pay.auth.key.adoption_web=${GOV_PAY_AUTH_KEY_ADOPTION:}
gov.pay.auth.key.prl_cos_api=${GOV_PAY_AUTH_KEY_PRL:}
gov.pay.auth.key.nfdiv_case_api=${GOV_PAY_AUTH_KEY_NFDIV_CASE_API:}
gov.pay.auth.key.pcs_api=${GOV_PAY_AUTH_KEY_PCS_API:}
```

### Operational services

The property `gov.pay.operational_services=ccd_gw,api_gw,ccpay_gw` (`application.properties:102`) lists S2S service names considered internal/operational. These are gateway services that proxy requests on behalf of other services -- the actual GOV.UK Pay account is resolved from the payment's `serviceType`, not the calling gateway's identity.

## Service onboarding

To onboard a new service for GOV.UK Pay card payments:

1. **Finance engagement** -- Finance Service Management engaged on income and accounting returns.
2. **Reference Data** -- Service ID / ORG URN mapped in `rd-location-ref-api`.
3. **GOV.UK Pay account** -- Created with WorldPay merchant code `HMCTSONLINEFEES`, Apple Pay and Google Pay enabled.
4. **API key generation** -- Sandbox/test key initially; production key after go-live.
5. **ServiceToTokenMap update** -- PR to `ccpay-payment-app` adding the enterprise service name to alias mapping.
6. **Vault secret** -- `az keyvault secret set --vault-name ccpay-{env} --name gov-pay-keys-{service} --value '<key>'`.
7. **Helm values** -- Add secret-to-alias mapping in `charts/payment-api/values.yaml`.
8. **application.properties** -- Add `gov.pay.auth.key.{alias}=${ENV_VAR:}`.
9. **S2S whitelist** -- Add the service's S2S name to `trusted.s2s.service.names`.
10. **SIT testing** -- Verify end-to-end in AAT with Liberata.

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- The full onboarding process above comes from Confluence "GOV.UK Pay Card Payments Service Onboarding Guide". Steps 1-3 and 10 are operational/process steps not represented in code. -->

### GOV.UK Pay service configuration

When setting up a new service in GOV.UK Pay:

| Setting | Value |
|---------|-------|
| Service name format | `HMCTS <Service Name>` |
| Ask user for email | On |
| Send payment confirmation emails | On |
| Send refund emails | Off |
| Payment provider | WorldPay (HMCTSONLINEFEES merchant code) |
| Ask for billing address | On |
| Default billing address country | United Kingdom |
| Apple Pay | On |
| Google Pay | On |
| Card types | Visa debit, Mastercard debit, Visa credit, Mastercard credit |

## Payment references

Each payment transaction is assigned a unique reference in the format:

```
RC-XXXX-XXXX-XXXX-XXXC
```

Where:
- `RC` = Receipt prefix (refunds use `RF`)
- First 11 digits = generated from a timestamp (to the tenth of a second)
- Last 4 digits = random digits for uniqueness
- `C` = check digit for validation

This reference is what services use to query payment status and is distinct from the GOV.UK Pay `payment_id` (stored as `externalReference`).

## Payment cancellation

`POST /card-payments/{reference}/cancel` (`CardPaymentController`) is feature-flagged behind the FF4j flag `payment-cancel`. When enabled, it:

1. Retrieves the payment from GOV.UK Pay to get the current HATEOAS `cancel` link.
2. Calls `GovPayClient.cancelPayment(key, cancelUrl)` which POSTs to that link.
3. GOV.UK Pay returns success or `GovPayCancellationFailedException` if the payment is in a non-cancellable state.

The Ways2Pay idempotency logic also cancels stale payments automatically when a new payment is requested against the same Service Request (see "Duplicate payment prevention" above).

## Reconciliation with Liberata

Payment transactions are reconciled by Liberata (the Middle Office supplier):

- Reconciliation occurs **twice per day**.
- Liberata compares payment records against financial transactions.
- Discrepancies (jurisdiction errors, transaction mismatches, missing/duplicate records) raise incidents.

The per-service GOV.UK Pay account structure exists specifically to support this reconciliation -- each MID (Merchant ID) maps to a specific court/tribunal fee account.

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- Reconciliation frequency (twice daily) and the Liberata process details come from Confluence "Payment Processing" page. -->

## Configuration reference

| Property | Default | Purpose |
|----------|---------|---------|
| `gov.pay.url` | `https://publicapi.payments.service.gov.uk/v1/payments` | GOV.UK Pay base URL |
| `gov.pay.auth.key.<service>` | (per env var) | API key per HMCTS service |
| `gov.pay.operational_services` | `ccd_gw,api_gw,ccpay_gw` | Gateway S2S names (not account holders) |
| Resilience4j `createCardPayment` | (see `application.properties:237-244`) | Circuit breaker for payment creation |
| Resilience4j `retrieveCardPayment` | ignores `GovPayPaymentNotFoundException` | Circuit breaker for retrieval |
| CronJob schedule | `*/1 * * * *` | Status update job frequency |

## Examples

### GOV.UK Pay HTTP client with circuit breakers

```java
// Source: apps/payment/ccpay-payment-app/gov-pay-client/src/main/java/uk/gov/hmcts/payment/api/external/client/GovPayClient.java

@Component
public class GovPayClient {

    @CircuitBreaker(name = "createCardPayment")
    public GovPayPayment createPayment(String authorizationKey, CreatePaymentRequest createPaymentRequest) {
        return withIOExceptionHandling(() -> {
            HttpPost request = postRequestFor(authorizationKey, url, createPaymentRequest);
            ClassicHttpResponse response = (ClassicHttpResponse) httpClient.execute(request);
            checkNotAnError(response);
            String responseBody = EntityUtils.toString(response.getEntity());
            return objectMapper.readValue(responseBody, GovPayPayment.class);
        });
    }

    @CircuitBreaker(name = "retrieveCardPayment")
    public GovPayPayment retrievePayment(String authorizationKey, String govPayId) {
        return withIOExceptionHandling(() -> {
            HttpGet request = getRequestFor(authorizationKey, url + "/" + govPayId);
            ClassicHttpResponse response = (ClassicHttpResponse) httpClient.execute(request);
            checkNotAnError(response);
            String responseBody = EntityUtils.toString(response.getEntity());
            return objectMapper.readValue(responseBody, GovPayPayment.class);
        });
    }

    public void cancelPayment(String authorizationKey, String cancelUrl) {
        withIOExceptionHandling(() -> {
            HttpPost request = postRequestFor(authorizationKey, cancelUrl, null);
            ClassicHttpResponse response = (ClassicHttpResponse) httpClient.execute(request);
            checkNotAnError(response);
            return null;
        });
    }

    private Header authorizationHeader(String authorizationKey) {
        return new BasicHeader(HttpHeaders.AUTHORIZATION, "Bearer " + authorizationKey);
    }

    private void checkNotAnError(ClassicHttpResponse httpResponse) throws IOException {
        int status = httpResponse.getCode();
        if (status >= 400) {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            httpResponse.getEntity().writeTo(bos);
            throw errorTranslator.toException(bos.toByteArray());
        }
    }
}
```

### Amount conversion and key resolution before GOV.UK Pay call

```java
// Source: apps/payment/ccpay-payment-app/model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/GovPayDelegatingPaymentService.java

@Override
public GovPayPayment create(PaymentServiceRequest paymentServiceRequest) {
    String key = keyForService();
    return govPayClient.createPayment(key,
        new CreatePaymentRequest(
            paymentServiceRequest.getAmount().movePointRight(2).intValue(), // pence conversion
            paymentServiceRequest.getPaymentReference(),
            paymentServiceRequest.getDescription(),
            paymentServiceRequest.getReturnUrl(),
            paymentServiceRequest.getLanguage()));
}
```

### Service name to GOV.UK Pay API key mapping

```java
// Source: apps/payment/ccpay-payment-app/model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/ServiceToTokenMap.java

@Component
public class ServiceToTokenMap {
    private static final Map<String, String> servicesMap = new HashMap<>();

    static {
        servicesMap.put("divorce", "divorce_frontend");
        servicesMap.put("probate", "probate_frontend");
        servicesMap.put("civil money claims", "cmc");
        servicesMap.put("specified money claims", "cmc");
        servicesMap.put("family private law", "prl_cos_api");
        servicesMap.put("immigration and asylum appeals", "iac");
        servicesMap.put("mortgage and landlord possession claims", "pcs_api");
        servicesMap.put("damages", "cmc");
    }

    public String getServiceKeyVaultName(String serviceName) {
        if (servicesMap.get(serviceName.toLowerCase()) != null) {
            return servicesMap.get(serviceName.toLowerCase());
        } else {
            throw new PaymentServiceNotFoundException(serviceName + " service not found in map");
        }
    }
}
```

### Card payment creation endpoint (return-url from header)

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java

@PostMapping(value = "/card-payments")
@Transactional
public ResponseEntity<PaymentDto> createCardPayment(
    @RequestHeader(value = "return-url", required = false) String returnURL,
    @RequestHeader(value = "service-callback-url", required = false) String serviceCallbackUrl,
    @RequestHeader(required = false) MultiValueMap<String, String> headers,
    @Valid @RequestBody CardPaymentRequest request) throws CheckDigitException {

    // ...

    PaymentFeeLink paymentLink = delegatingPaymentService.create(paymentServiceRequest);
    PaymentDto paymentDto = paymentDtoMapper.toCardPaymentDto(paymentLink);

    // trigger Apportion based on the launch darkly feature flag
    boolean apportionFeature = featureToggler.getBooleanValue("apportion-feature", false);
    if (apportionFeature) {
        feePayApportionService.processApportion(paymentLink.getPayments().get(0));
    }
    return new ResponseEntity<>(paymentDto, CREATED);
}
```

## See also

- [Payment Lifecycle](payment-lifecycle.md) — full lifecycle stages including apportionment and callback delivery
- [Payment Status Callbacks](../reference/payment-status-callbacks.md) — ASB topics, `PaymentStatusDto` schema, and retry semantics
- [How-to: Integrate from a Service](../how-to/integrate-from-a-service.md) — end-to-end onboarding including GOV.UK Pay key setup
- [Reference: API Payments](../reference/api-payments.md) — endpoint signatures for `POST /card-payments` and `POST /service-request/{ref}/card-payments`
- [How-to: Troubleshoot Payment Status](../how-to/troubleshoot-payment-status.md) — diagnosing stuck card payments and missing callbacks
- [Glossary](../reference/glossary.md) — definitions for ServiceToTokenMap, W2P, RC reference, Liberata
