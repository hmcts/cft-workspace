---
title: Api Payments
topic: architecture
diataxis: reference
product: payment
audience: both
sources:
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CreditAccountPaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/pcipal/TelephonyController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/ServiceRequestController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/AccountController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/MaintenanceJobsController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentReportController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentStatusController.java
  - ccpay-payment-app:api/src/main/resources/application.properties
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/configuration/security/SpringSecurityConfiguration.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/TelephonyCallbackDto.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/PaymentStatusDto.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/OnlineCardPaymentRequest.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/validators/DuplicatePaymentValidator.java
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/dto/OnlineCardPaymentRequest.java
confluence:
  - id: "1890795875"
    title: "Services integration with Payments & Service Requests (Orders / Invoices) for Card Payments"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1952811625"
    title: "Service Request Behaviour"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1440494705"
    title: "Migrate Services from PBA Config1 to Config2 Payments API"
    last_modified: "unknown"
    space: "RP"
  - id: "1794553235"
    title: "Service Callback LLD (NEW +Payment Failures WIP)"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "317817310"
    title: "Payments API - Integration with services"
    last_modified: "unknown"
    space: "RP"
  - id: "865992841"
    title: "Technical Specification - PCI Pal (NOC hosted)"
    last_modified: "unknown"
    space: "RP"
  - id: "1803672594"
    title: "Service Request Card Payment Idempotency Update LLD"
    last_modified: "unknown"
    space: "DTSFP"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- `ccpay-payment-app` is the central HMCTS payment gateway exposing REST endpoints for card payments (GOV.UK Pay), PBA (Liberata), telephony (PCI-PAL), service requests, and payment-failure callbacks.
- All endpoints require S2S authentication; most also require an IDAM user token. External paths (S2S-only) include `/payments`, `/card-payments/*/status`, `/telephony/callback`, `/jobs/**`. Payment-failure POST/PATCH paths are `permitAll()`.
- Card payments wrap GOV.UK Pay; PBA payments validate accounts against Liberata (Config 2: balance + status checks, returns immediate success/failure); telephony payments launch PCI-PAL flows via Antenna or Kerv providers.
- Service requests are the newer payment orchestration model. A Service Request represents a payment requirement for a case, supports multiple payment attempts, and is agnostic to the payment channel used.
- PBA payments within a service request use idempotency keys (request hashcode); card payments use a 90-minute created-state window to detect and cancel stale GOV.UK Pay sessions.
- The service publishes payment-status events to Azure Service Bus topics (`ccpay-service-callback-topic`, `ccpay-service-request-cpo-update-topic`).

## Authentication

All inbound requests require a `ServiceAuthorization` header (S2S JWT). Internal paths additionally require an `Authorization` header (IDAM user JWT).

| Path pattern | Auth model | Notes |
|---|---|---|
| `/payments`, `/payments/**` | S2S only | Reconciliation endpoints for Liberata |
| `/card-payments/*/status` | S2S only | Status polling by services |
| `/telephony/callback` | S2S only | PCI-PAL inbound callback |
| `/jobs/**` | S2S only | Scheduled job triggers |
| `/payment-failures/**` (POST/PATCH) | `permitAll()` | Liberata failure callbacks — no auth |
| All other paths | S2S + IDAM user | Standard internal auth |

Trusted S2S callers (`application.properties:110`): `cmc`, `cmc_claim_store`, `probate_frontend`, `divorce_frontend`, `ccd_gw`, `api_gw`, `finrem_payment_service`, `ccpay_bubble`, `jui_webapp`, `xui_webapp`, `fpl_case_service`, `iac`, `probate_backend`, `civil_service`, `paymentoutcome_web`, `adoption_web`, `prl_cos_api`, `refunds_api`, `civil_general_applications`, `notifications_service`, `nfdiv_case_api`, `ccpay_gw`, `pcs_api`.

## Card Payments (GOV.UK Pay)

Controller: `CardPaymentController.java`

| Method | Path | Description |
|---|---|---|
| `POST` | `/card-payments` | Create a card payment via GOV.UK Pay |
| `GET` | `/card-payments/{reference}` | Retrieve payment by reference |
| `GET` | `/card-payments/{reference}/details` | Retrieve payment with card details |
| `GET` | `/card-payments/{reference}/statuses` | Retrieve payment status history |
| `POST` | `/card-payments/{reference}/cancel` | Cancel a payment (feature-flagged: `payment-cancel`) |

### POST /card-payments

**Headers** (in addition to auth):

| Header | Required | Description |
|---|---|---|
| `return-url` | Yes | URL GOV.UK Pay redirects to after payment |
| `service-callback-url` | No | URL for payment-status ASB callback |

**Request body** (`CardPaymentRequest`):

```json
{
  "amount": 215.00,
  "description": "Court fee",
  "ccd_case_number": "1234567890123456",
  "case_reference": "REF-123",
  "service": "CMC",
  "currency": "GBP",
  "provider": "gov pay",
  "channel": "online",
  "fees": [
    {
      "code": "FEE0001",
      "version": "1",
      "calculated_amount": 215.00,
      "volume": 1
    }
  ],
  "language": "en",
  "case_type": "MoneyClaimCase"
}
```

**Notes**:
- Amount is converted to pence internally via `movePointRight(2).intValue()` before forwarding to GOV.UK Pay (`GovPayDelegatingPaymentService:46-52`).
- If `case_type` is provided, the controller resolves `siteId` and `service` from `rd-location-ref-api` (`CardPaymentController:115-189`).
- `language` is lower-cased before forwarding to GOV.UK Pay.
- Apportion logic runs post-creation when LaunchDarkly flag `apportion-feature` is enabled (`CardPaymentController:183`).
- GOV.UK Pay API key is resolved per calling service via `ServiceToTokenMap` and `GovPayKeyRepository`.

**Resilience**: `GovPayClient.createPayment()` is wrapped in a Resilience4j `@CircuitBreaker(name = "createCardPayment")` (`GovPayClient.java:55-66`).

## PBA (Credit Account Payments)

Controller: `CreditAccountPaymentController.java`

| Method | Path | Description |
|---|---|---|
| `POST` | `/credit-account-payments` | Create a PBA payment |
| `GET` | `/credit-account-payments/{paymentReference}` | Retrieve PBA payment |
| `DELETE` | `/credit-account-payments/{paymentReference}` | Delete PBA payment by reference |

### Config 1 vs Config 2

The PBA API has two configurations. Services on Config 1 bypass Liberata validation (payment goes to `pending` status and relies on daily reconciliation reports). Config 2 performs real-time account checks:

| Feature | Config 1 | Config 2 |
|---|---|---|
| Account balance check | No | Yes (previous day's balance) |
| Account status check | No | Yes |
| Payment status | Pending | Immediate Success/Failed |
| Daily reconciliation report | Yes | No (redundant) |

**Important**: The Config 2 balance check is **not real-time** — it validates against the previous day's closing balance. A payment may pass the check but later fail processing at Liberata if the balance changed intra-day.
<!-- CONFLUENCE-ONLY: not verified in source -->

Services still on Config 1 are listed in `pba.config1.service.names` (application.properties).

### POST /credit-account-payments

**Request body** (`CreditAccountPaymentRequest`):

```json
{
  "amount": 500.00,
  "description": "Application fee",
  "ccd_case_number": "1234567890123456",
  "case_reference": "REF-456",
  "service": "DIVORCE",
  "currency": "GBP",
  "customer_reference": "CUSTOMER-REF",
  "organisation_name": "Smith Solicitors",
  "account_number": "PBA1234567",
  "fees": [
    {
      "code": "FEE0205",
      "version": "3",
      "calculated_amount": 500.00,
      "volume": 1
    }
  ]
}
```

**Note**: `ccd_case_number` should be treated as mandatory — services must provide a CCD case reference to ensure proper reconciliation. A future backlog item will enforce this at the API level.
<!-- CONFLUENCE-ONLY: not verified in source -->

**Flow**:
1. Duplicate payment check runs first (`CreditAccountPaymentController:161`). The `DuplicatePaymentValidator` prevents the same user from paying for the same case with the same payment details twice within a configurable window (default: **2 minutes**, `duplicate.payment.check.interval.in.minutes:2`). After that window, a retry is treated as a new request.
2. If the calling service is in `pba.config1.service.names`, the payment bypasses Liberata validation and is set to `pending` status.
3. Otherwise, the Liberata account API is called to validate the PBA account (`AccountServiceImpl:43-57`).
4. Liberata validation failure returns HTTP 403 FORBIDDEN; success returns 201 CREATED.

**Response error codes** (Config 2):

| HTTP Status | Liberata Code | Meaning | Payment Reference Created |
|---|---|---|---|
| 201 | — | Payment created successfully | Yes (status: Success) |
| 400 | — | Payment creation failed | No |
| 403 | `CA-E0001` | Insufficient funds | Yes (status: Failed) |
| 403 | `CA-E0003` | Account on hold | Yes (status: Failed) |
| 403 | `CA-E0004` | Account deleted | Yes (status: Failed) |
| 404 | — | Account not found | No |
| 422 | — | Invalid or missing attribute | No |
| 504 | — | Unable to retrieve account information | No |

**Liberata integration details**:
- Account API: `GET https://bpacustomerportal.liberata.com/pba/public/api/v2/account/{pbaCode}` (configurable via `LIBERATA_API_ACCOUNT_URL`).
- OAuth2 token URL: password grant to `https://bpacustomerportal.liberata.com/pba/public/oauth/token` (configurable via `LIBERATA_OAUTH2_TOKEN_URL`).
- Timeouts: 15s connect, 15s read (`application.properties:88-89`).
- Resilience: `@CircuitBreaker` + `@TimeLimiter(name = "retrievePbaAccountTimeLimiter")` with 15s timeout.

## PBA Account Lookup

Controller: `AccountController.java`

| Method | Path | Description |
|---|---|---|
| `GET` | `/accounts/{accountNumber}` | Check PBA account status |

**Response status mapping** (`AccountController:58-77`):

| Liberata status | HTTP response |
|---|---|
| `ACTIVE` | 200 OK |
| `DELETED` | 410 Gone |
| `ON_HOLD` | 412 Precondition Failed |
| `NOT_FOUND` | 404 Not Found |

## Telephony (PCI-PAL)

Controller: `TelephonyController.java`

| Method | Path | Content-Type | Description |
|---|---|---|---|
| `POST` | `/telephony/callback` | `application/x-www-form-urlencoded` | PCI-PAL callback with payment result |

### POST /telephony/callback

Receives the inbound callback from PCI-PAL after a telephony payment transaction completes. The endpoint is exposed via Azure API Management (APIM) at `/telephony-api/telephony/callback` and secured with an `Ocp-Apim-Subscription-Key` header and client certificate (TLS 1.2 mutual auth).

**Form fields** (`TelephonyCallbackDto`) — all sent as `application/x-www-form-urlencoded`:

| Field | Required | Description | Example |
|---|---|---|---|
| `orderReference` | Yes (`@NotNull`) | Payment reference from PayHub (`RC-XXXX-XXXX-XXXX-XXXX`) | `RC-1550-0785-8859-7805` |
| `orderAmount` | Yes (`@NotNull`) | Amount transacted in base units (pence for GBP) | `48850` |
| `transactionResult` | Yes (`@NotNull`) | Outcome: `SUCCESS`, `DECLINE`, `ERROR`, `CANCELLED` | `SUCCESS` |
| `orderCurrency` | No | Currency code (usually blank in callbacks) | `GBP` |
| `ppAccountID` | No | PCI Pal processing account ID | `1210` |
| `transactionAuthCode` | No | Authorisation code if successful | `T1234` |
| `transactionID` | No | Transaction ID from payment gateway (ePDQ) | `3045021106` |
| `transactionResponseMsg` | No | Gateway response (usually for declines/errors) | `Insufficient Funds` |
| `cardExpiry` | No | Card expiry date (MMYY) | `1220` |
| `cardLast4` | No | Last four digits of card | `9999` |
| `cardType` | No | Card brand from BIN check | `MASTERCARD` |
| `ppCallID` | No | PCI Pal call ID for debugging | `820782890` |
| `customData1` | No | PCI Pal order reference + timestamp | `MOJTest120190124123432` |
| `customData2` | No | Duplicate of cardType | `MASTERCARD` |
| `customData3` | No | Payment method | `CreditCard` |
| `customData4` | No | Reserved (always blank) | |

The controller lower-cases `transactionResult` before updating the payment status in the database (`TelephonyController:50-51`).

**APIM callback environments**:

| Environment | URL |
|---|---|
| AAT | `https://core-api-mgmt-aat.azure-api.net/telephony-api` |
| Demo | `https://core-api-mgmt-demo.azure-api.net/telephony-api` |
<!-- CONFLUENCE-ONLY: not verified in source -->

**Outbound telephony flow** (triggered by service teams, not via this callback):
1. `PciPalPaymentService.getPaymentProviderAuthorisationTokens()` acquires an OAuth token from the configured provider (Antenna or Kerv).
2. `PciPalPaymentService.getTelephonyProviderLink()` POSTs a `TelephonyProviderLinkIdRequest` to the provider's launch URL with `flowId`, `amount` (pence), `callbackURL`, `returnURL`, `orderId`, `currencyCode=GBP`.
3. Response `id` is combined with the `viewIdURL` to produce: `{viewIdURL}{id}/framed` — this is the redirect URL for the agent.

**Supported service types** (mapped to PCI-PAL flow IDs via `TelephonySystem.getFlowId()`):
- Probate
- Divorce
- Specified Money Claims
- Financial Remedy
- Family Private Law
- Immigration and Asylum Appeals

**Providers**: Antenna (strategic) and Kerv. Default system: `"kerv"` (`TelephonySystem.java:33`). Each has separate OAuth credentials and per-jurisdiction flow IDs configured via environment variables (`PCI_PAL_ANTENNA_*` / `PCI_PAL_KERV_*`).

## Service Requests

Controller: `ServiceRequestController.java`

A Service Request represents a payment requirement for a case. Once created, it remains associated with the case and supports multiple payment attempts across different channels (card, PBA, telephony, bulk scan). Failed payment attempts stay linked to the original Service Request, allowing retry without creating new ones.

| Method | Path | Description |
|---|---|---|
| `POST` | `/service-request` | Create a service request |
| `POST` | `/service-request/{service-request-reference}/pba-payments` | Pay a service request via PBA |
| `POST` | `/service-request/{service-request-reference}/card-payments` | Pay a service request via card |
| `GET` | `/card-payments/{internal-reference}/status` | Retrieve card payment status by internal reference |

### Integration pattern (card payments via service request)

The recommended flow for services integrating card payments:

1. **Persist case in CCD** — ensure the case has a CCD Case Reference before calling payments.
2. **Create Service Request** — `POST /service-request` with a `service-callback-url` header. This URL is where F&P will notify the service of payment status changes.
3. **Create card payment against the SR** — `POST /service-request/{ref}/card-payments` with a `return-url` in the body. Response includes the GOV.UK Pay URL and a payment reference.
4. **Redirect user to GOV.UK Pay** — the user completes payment on GOV.UK Pay.
5. **User returns** — GOV.UK Pay redirects back to the service's `return-url`. The service queries payment status using the payment reference.
6. **Fallback callback** — if the user never returns (browser closed, session timeout), F&P sends a callback to the service via the registered callback URL.
<!-- CONFLUENCE-ONLY: not verified in source -->

### POST /service-request/{reference}/card-payments

**Request body** (`OnlineCardPaymentRequest`):

```json
{
  "amount": 100.00,
  "currency": "GBP",
  "language": "en",
  "return-url": "https://service.com/confirmation"
}
```

**Validation** (`OnlineCardPaymentRequest.java`):
- `amount`: `@NotNull`, `@DecimalMin("0.01")`, `@Positive`, max 2 decimal places
- `currency`: `@NotNull` (enum `CurrencyCode`)
- `language`: `@NotNull`, `@NotEmpty`
- `return-url`: `@NotNull`, `@NotEmpty`

**Response codes** (`ServiceRequestController:296-309`):

| HTTP Status | Meaning |
|---|---|
| 201 | Card payment created, response includes GOV.UK Pay URL |
| 404 | Service request not found |
| 409 | Idempotency key conflict (different payment details) |
| 412 | Order already paid |
| 425 | Payment request already in progress for this SR |
| 452 | SR already paid / amount mismatch with SR balance |
| 504 | Unable to connect to GOV.UK Pay |

**Card payment idempotency** (90-minute window):

The endpoint checks for existing card payments in `created` state from `gov pay` provider within the last **90 minutes**. If found:

1. Retrieves payment status from GOV.UK Pay.
2. If the existing payment is **successful** in GOV.UK Pay: updates the local DB and redirects the user to their `return-url` (avoids duplicate payment).
3. If the existing payment is still **initiated/in-progress**: cancels it via GOV.UK Pay's cancel API, then creates a new payment.
4. If no existing payment or the existing payment has a terminal non-success status: creates a new card payment normally.

### POST /service-request/{reference}/pba-payments

**Idempotency**: The endpoint computes a request hashcode and checks `IdempotencyKeys` for prior submissions (`ServiceRequestController:166-199`). If a non-retryable result exists, it is returned directly.

**Liberata error code mapping** (`ServiceRequestController:219-226`):

| Liberata code | Meaning | HTTP status |
|---|---|---|
| `CA-E0004` | PBA account deleted | 410 Gone |
| `CA-E0003` | PBA account on hold | 412 Precondition Failed |
| `CA-E0001` | Insufficient funds | 402 Payment Required |

### ASB topic publishing

After service request creation, a message is published to `ccpay-service-request-cpo-update-topic` with payload `ServiceRequestCpoDto` (action, case_id, order_reference, responsible_party) and message property `serviceCallbackUrl = {case-payment-orders.api.url}/case-payment-orders` (`ServiceRequestDomainServiceImpl:534-572`).

After card payment status retrieval via `GET /card-payments/{internal-reference}/status`, a message is published to `ccpay-service-callback-topic` (`ServiceRequestController:351`).

### Service callback message format

The callback message published to `ccpay-service-callback-topic` uses `PaymentStatusDto`:

```json
{
  "service_request_reference": "2022-1648229603982",
  "ccd_case_number": "1648229404992811",
  "service_request_amount": 232.00,
  "service_request_status": "Paid",
  "payment": {
    "payment_amount": 232.00,
    "payment_reference": "RC-1648-2296-4212-7303",
    "payment_method": "card",
    "case_reference": "1648229404992811",
    "account_number": ""
  }
}
```

The message is sent with the `serviceCallbackUrl` as an ASB message property so consuming services receive it at their registered callback endpoint.

## Payment Failures (Liberata Callbacks)

Controller: `PaymentStatusController.java`

These endpoints receive payment-failure notifications from Liberata (chargebacks, bounced cheques) and manage the failure lifecycle. They are exposed as `permitAll()` paths (no auth required) since Liberata calls them directly.

| Method | Path | Description |
|---|---|---|
| `POST` | `/payment-failures/bounced-cheque` | Record a bounced cheque failure |
| `POST` | `/payment-failures/chargeback` | Record a chargeback failure |
| `POST` | `/payment-failures/unprocessed-payment` | Record an unprocessed payment |
| `GET` | `/payment-failures/{paymentReference}` | Get failure details by payment reference |
| `PATCH` | `/payment-failures/{failureReference}` | Update failure with "ping 2" representment data |
| `GET` | `/payment-failures/failure-report` | Generate failure report for a date range |

All POST/PATCH endpoints return `503 Service Unavailable` if the LaunchDarkly `payment-status-update-flag` is enabled (kill-switch for the failure pipeline).

**Failure lifecycle** (two-ping model):

1. **Ping 1** — Liberata sends a `POST /payment-failures/bounced-cheque` or `POST /payment-failures/chargeback` with initial failure data (amount, event date, has_amount_debited). The system inserts a `payment_failures` record and cancels any active refund for the affected payment reference.
2. **Ping 2** — Liberata sends a `PATCH /payment-failures/{failureReference}` with representment outcome (representment_status, representment_date). This updates the existing failure record.

After processing, a callback message with event type `Payment-Failure` is published to the service callback topic, including a `dispute` section:

```json
{
  "event": "Payment-Failure",
  "ccd_case_number": "1654766204254711",
  "dispute": {
    "dispute_amount": "215",
    "failure_event_date": "2021-08-15T10:34:45",
    "has_amount_debited": "yes",
    "representment_status": "yes",
    "representment_date": "2021-08-15T10:34:45"
  }
}
```
<!-- CONFLUENCE-ONLY: not verified in source -->

## Reconciliation Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/payments` | Payment data for Liberata reconciliation |
| `GET` | `/reconciliation-payments` | Payments with IAC supplementary info |

Both support query parameters: `payment_method`, `service_name`, `ccd_case_number`, `pba_number`, `start_date`, `end_date`.

## Scheduled Job Endpoints

These endpoints are triggered by shell scripts (not `@Scheduled` annotations).

| Method | Path | Description |
|---|---|---|
| `POST` | `/jobs/email-pay-reports` | Generate CSV report and email per service/payment method |
| `POST` | `/jobs/duplicate-payment-process` | Generate and email duplicate payment CSV |
| `PATCH` | `/jobs/card-payments-status-update` | Poll GOV.UK Pay for all `initiated` card payments and update statuses |
| `PATCH` | `/jobs/unprocessed-payment-update` | Update unprocessed payment references (LaunchDarkly: `payment-status-update-flag`) |
| `PATCH` | `/jobs/dead-letter-queue-process` | Reprocess DLQ from `ccpay-service-request-cpo-update-topic` |

**POST /jobs/email-pay-reports** query parameters: `payment_method`, `service_name`, `start_date`, `end_date`.

## Key Configuration Properties

| Property | Default | Description |
|---|---|---|
| `gov.pay.url` | `https://publicapi.payments.service.gov.uk/v1/payments` | GOV.UK Pay API base URL |
| `gov.pay.auth.key.<service>` | — | Per-service GOV.UK Pay API key |
| `gov.pay.operational_services` | `ccd_gw,api_gw,ccpay_gw` | Internal S2S service names |
| `liberata.api.account.url` | `https://bpacustomerportal.liberata.com/pba/public/api/v2/account` | Liberata PBA account endpoint |
| `liberata.oauth2.token.url` | `https://bpacustomerportal.liberata.com/pba/public/oauth/token` | Liberata OAuth2 token endpoint |
| `liberata.connect.timeout` | `15000` | Liberata connect timeout (ms) |
| `liberata.read.timeout` | `15000` | Liberata read timeout (ms) |
| `fees.register.url` | `https://fees-register-api.platform.hmcts.net` | Fees Register API URL |
| `pba.config1.service.names` | — | Services that bypass Liberata PBA check |
| `pci-pal.callback-url` | — | Stored callback URL for PCI-PAL |

## Feature Flags

| Flag | System | Controls |
|---|---|---|
| `payment-cancel` | FF4j | Enables `POST /card-payments/{reference}/cancel` |
| `service-callback` | FF4j | Enables ASB callback publishing |
| `payment-search` | FF4j | Payment search feature |
| `bulk-scan-check` | FF4j | Bulk-scan validation |
| `discontinued-fees-feature` | FF4j | Include discontinued fees in reports |
| `duplicate-payment-check` | FF4j | Enables duplicate payment detection in PBA flows |
| `apportion-feature` | LaunchDarkly | Fee-payment apportioning after payment creation |
| `payment-status-update-flag` | LaunchDarkly | Kill-switch for payment-failure endpoints (returns 503 when enabled); also gates `/jobs/unprocessed-payment-update` |

## Integration Gotchas

These are important behaviours for consuming services to be aware of:

1. **Stale payment status**: Neither HMCTS Payment Gateway nor GOV.UK Pay support push notifications for payment status updates. If a user completes payment but their browser fails to redirect back to the `return-url` (e.g. network interruption, session timeout), the payment status will not be reflected in your application until you query it again. Services should implement a background job for refreshing payment statuses, or rely on the F&P service callback mechanism.

2. **Duplicate payment risk (legacy /card-payments)**: The legacy `POST /card-payments` endpoint has no built-in duplicate detection. Any retries from the service are treated as new payment requests. Use the service-request card payment endpoint (`POST /service-request/{ref}/card-payments`) for the 90-minute idempotency protection.

3. **Duplicate PBA prevention window**: The `DuplicatePaymentValidator` prevents the same user from paying for the same case with identical details within **2 minutes** (configurable via `duplicate.payment.check.interval.in.minutes`). Two different users paying from the same PBA account within that window can still cause duplicates.
<!-- CONFLUENCE-ONLY: not verified in source -->

4. **CCD case required before payment**: Services should persist their case in CCD and obtain a CCD Case Reference before calling any payment endpoint. This ensures downstream reconciliation works correctly.

## Examples

### `POST /card-payments` controller signature

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java

@PostMapping(value = "/card-payments")
@Transactional
public ResponseEntity<PaymentDto> createCardPayment(
    @RequestHeader(value = "return-url", required = false) String returnURL,
    @RequestHeader(value = "service-callback-url", required = false) String serviceCallbackUrl,
    @RequestHeader(required = false) MultiValueMap<String, String> headers,
    @Valid @RequestBody CardPaymentRequest request) throws CheckDigitException {

    // return-url and service-callback-url are REQUEST HEADERS, not body fields
    // caseType triggers a Reference Data lookup to resolve siteId and service name
    if (StringUtils.isNotBlank(request.getCaseType())) {
        OrganisationalServiceDto org = referenceDataService.getOrganisationalDetail(
            Optional.ofNullable(request.getCaseType()), Optional.empty(), headers);
        request.setSiteId(org.getServiceCode());
        request.setService(org.getServiceDescription());
    }
    // ...
    PaymentFeeLink paymentLink = delegatingPaymentService.create(paymentServiceRequest);
    return new ResponseEntity<>(paymentDtoMapper.toCardPaymentDto(paymentLink), CREATED);
}
```

### `POST /service-request/{ref}/card-payments` request body validation

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/dto/OnlineCardPaymentRequest.java

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@JsonInclude(NON_NULL)
public class OnlineCardPaymentRequest {

    @NotNull(message = "amount can't be Blank")
    @DecimalMin("0.01")
    @Positive
    @Digits(integer = 10, fraction = 2, message = "Payment amount cannot have more than 2 decimal places")
    private BigDecimal amount;

    @NotNull(message = "currency can't be Blank")
    private CurrencyCode currency;

    @NotNull(message = "language can't be Blank")
    @NotEmpty(message = "language can't be Empty")
    private String language;

    @NotNull(message = "return-url can't be Blank")
    @NotEmpty(message = "return-url can't be Empty")
    @JsonProperty("return-url")
    private String returnUrl;  // in the request BODY for Ways2Pay (not a header)
}
```

## See also

- [Overview](../explanation/overview.md) — platform responsibilities, payment channels, and authentication model
- [Payment Lifecycle](../explanation/payment-lifecycle.md) — status transitions, apportionment, and failure recording
- [GOV.UK Pay Integration](../explanation/govuk-pay-integration.md) — key resolution, idempotency logic, and status polling deep-dive
- [PCI-PAL Telephony](../explanation/pci-pal-telephony.md) — telephony system architecture, callback, and Antenna vs Kerv providers
- [Payment Status Callbacks](payment-status-callbacks.md) — ASB topic schemas, dual callback paths, and retry semantics
- [How-to: Integrate from a Service](../how-to/integrate-from-a-service.md) — step-by-step integration guide for service teams
- [Glossary](glossary.md) — definitions for Service Request, PBA, W2P, RC reference, Apportionment
