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
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/validators/DuplicateSpecification.java
  - ccpay-payment-app:api-contract/src/main/java/uk/gov/hmcts/payment/api/contract/CreditAccountPaymentRequest.java
  - ccpay-payment-app:api-contract/src/main/java/uk/gov/hmcts/payment/api/contract/DisputeDto.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/mapper/PBAStatusErrorMapper.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/mapper/PaymentGroupDtoMapper.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/service/PaymentStatusUpdateServiceImpl.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/service/IdempotencyServiceImpl.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentGroupController.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/UserAwareDelegatingPaymentService.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/AccountServiceImpl.java
  - ccpay-payment-app:charts/payment-api/values.yaml
  - ccpay-payment-app:infrastructure/main.tf
  - ccpay-payment-app:infrastructure/cft-api-mgmt.tf
  - ccpay-payment-app:infrastructure/template/cft-api-policy.xml
  - cnp-flux-config:apps/fees-pay/ccpay-payment-api/demo.yaml
  - cnp-flux-config:apps/fees-pay/ccpay-payment-api/prod.yaml
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
sources_sha:
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CreditAccountPaymentController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/pcipal/TelephonyController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/ServiceRequestController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/AccountController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/MaintenanceJobsController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentReportController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentStatusController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/resources/application.properties": "1908ddc16a3f086c816e17c1ff8b27bee4b8f414"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/configuration/security/SpringSecurityConfiguration.java": "e8033dfe3c25862046cd940eadb7522175cb4aba"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/TelephonyCallbackDto.java": "5c28ea10564258d9c193bead87675b85afa50c21"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/PaymentStatusDto.java": "0cf6e7d5ce9bdb8418b6627d44867a1e83dc1981"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/OnlineCardPaymentRequest.java": "5c28ea10564258d9c193bead87675b85afa50c21"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/validators/DuplicatePaymentValidator.java": "b98d8bf169859a75dfc3253731b318edc427ed19"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/validators/DuplicateSpecification.java": "5c28ea10564258d9c193bead87675b85afa50c21"
  "ccpay-payment-app:api-contract/src/main/java/uk/gov/hmcts/payment/api/contract/CreditAccountPaymentRequest.java": "5c28ea10564258d9c193bead87675b85afa50c21"
  "ccpay-payment-app:api-contract/src/main/java/uk/gov/hmcts/payment/api/contract/DisputeDto.java": "f190c168e2485e79521c0b05f64c0551abd2b6d6"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/mapper/PBAStatusErrorMapper.java": "89b67ec9107bf106e0f07b0e31bf3bb996a30ba8"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/mapper/PaymentGroupDtoMapper.java": "5668566104d470baee1e3b1cd06671ecb24580d8"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/service/PaymentStatusUpdateServiceImpl.java": "5c28ea10564258d9c193bead87675b85afa50c21"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/service/IdempotencyServiceImpl.java": "7a5df2f161deebfb9cf3e7e0941bd0cdc21318de"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentGroupController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/UserAwareDelegatingPaymentService.java": "65bcad2ffb092e534b051dbb0349914658506a57"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/AccountServiceImpl.java": "db1fcc54a4fb30ca256c1fa1b465d65369ae653b"
  "ccpay-payment-app:charts/payment-api/values.yaml": "f4fb59095aad65f13e8673472f64f4cdb246af7a"
  "ccpay-payment-app:infrastructure/main.tf": "ee7c2d7f0f6afaf7745af97efbc2137db3fcd6c5"
  "ccpay-payment-app:infrastructure/cft-api-mgmt.tf": "77c8d9342601a2740e0dc8ede816767a1e929c33"
  "ccpay-payment-app:infrastructure/template/cft-api-policy.xml": "77c8d9342601a2740e0dc8ede816767a1e929c33"
  "cnp-flux-config:apps/fees-pay/ccpay-payment-api/demo.yaml": "67d250f6d9e01aea4cca1fccea0335de837673c4"
  "cnp-flux-config:apps/fees-pay/ccpay-payment-api/prod.yaml": "b8d4f674f4f79c6505b4b4869ee3e96d0925ae3e"
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

Trusted S2S callers (`trusted.s2s.service.names` in `application.properties`) -- 24 in all: `cmc`, `cmc_claim_store`, `probate_frontend`, `divorce_frontend`, `ccd_gw`, `api_gw`, `finrem_payment_service`, `ccpay_bubble`, `jui_webapp`, `xui_webapp`, `fpl_case_service`, `iac`, `probate_backend`, `civil_service`, `paymentoutcome_web`, `adoption_web`, `prl_cos_api`, `refunds_api`, `civil_general_applications`, `notifications_service`, `nfdiv_case_api`, `ccpay_gw`, `pcs_api`, `pcs_frontend`.

## Rate limiting

Since PAY-8011 (August 2026) every endpoint carries a method-level
`@RateLimiter(name = "default-rate-limiter")` — the annotation used to sit at class
level, and was moved down onto each mapping. All endpoints across all controllers draw
on that one shared instance, so the limit is service-wide, not per endpoint or per
caller.

| Setting | Env var | Default |
|---|---|---|
| Requests per period | `API_RATE_LIMIT_FOR_PERIOD` | 20 |
| Refresh period | `API_RATE_LIMIT_REFRESH_PERIOD` | `1s` |
| Wait for a permit | `API_RATE_LIMIT_TIMEOUT_DURATION` | `0` |

Three things to know before you rely on this:

- **The default dropped from 100/s to 20/s** when the limit became env-configurable.
  Anything that used to burst up to 100 requests a second now needs
  `API_RATE_LIMIT_FOR_PERIOD` raised for its environment.
- **The Resilience4j instance was renamed** from `defaultRateLimiter` to
  `default-rate-limiter`, and `retrievePbaAccountTimeLimiter.timeoutDuration` to
  `.timeout-duration`. Any Helm or environment override still written in the old
  camelCase form is now inert — Spring binds it to nothing and fails silently, leaving
  the limiter on its default.
- **A throttled request does not return 429 here.** Unlike `ccpay-refunds-app`, this
  service has no `@ExceptionHandler` for Resilience4j's `RequestNotPermitted`, so the
  exception escapes as a generic **500**. Do not treat a 500 under load as a server
  fault before checking the rate limiter; and do not write client retry logic that keys
  off 429.

The README documents these as `REFUNDS_API_RATE_LIMIT_*`. That is wrong — it is copied
from `ccpay-refunds-app`, which has its own separate limiter (see
[Refunds API](api-refunds.md#rate-limiting)). The names this service reads are the ones
in the table above.

## Card Payments (GOV.UK Pay)

Controller: `CardPaymentController.java`

| Method | Path | Description |
|---|---|---|
| `POST` | `/card-payments` | Create a card payment via GOV.UK Pay |
| `GET` | `/card-payments/{reference}` | Retrieve payment by reference |
| `GET` | `/card-payments/{reference}/details` | Retrieve payment with card details |
| `GET` | `/card-payments/{reference}/statuses` | Retrieve payment status history |
| `POST` | `/card-payments/{reference}/cancel` | Cancel a payment through GOV.UK Pay; returns 204 with an empty body (`CardPaymentController:241-245`) |

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
- `channel` and `provider` are optional. When either is blank the controller forces both to `online` and `gov pay` (`CardPaymentController:124-127`), so the values in the body above are the defaults rather than required input.
- A `ccd_case_number` on the request is copied down onto every fee that does not carry one of its own (`CardPaymentController:129-140`).
- `description` is HTML-encoded with `Encode.forHtml` before it reaches GOV.UK Pay (`CardPaymentController:159`).
- If `case_type` is provided, the controller resolves `siteId` and `service` from `rd-location-ref-api` (`CardPaymentController:144-147`). Otherwise `service` is treated as a service code and mapped to a name locally (`:152`).
- `language` is lower-cased before forwarding to GOV.UK Pay, and is dropped entirely when blank or equal to the literal string `string` (`CardPaymentController:171-172`).
- Apportion logic runs post-creation when LaunchDarkly flag `apportion-feature` is enabled (`CardPaymentController:182-186`).
- GOV.UK Pay API key is resolved per calling service via `ServiceToTokenMap` and `GovPayKeyRepository`.

**Resilience**: `GovPayClient.createPayment()` is wrapped in a Resilience4j `@CircuitBreaker(name = "createCardPayment")` (`GovPayClient.java:55-66`).

## PBA (Credit Account Payments)

Controller: `CreditAccountPaymentController.java`

| Method | Path | Description |
|---|---|---|
| `POST` | `/credit-account-payments` | Create a PBA payment |
| `GET` | `/credit-account-payments/{paymentReference}` | Retrieve PBA payment with its fees (`CreditAccountPaymentController:198`) |
| `GET` | `/credit-account-payments/{paymentReference}/statuses` | Retrieve the payment's status history (`CreditAccountPaymentController:214`) |
| `DELETE` | `/credit-account-payments/{paymentReference}` | Delete PBA payment by reference; returns 204 (`CreditAccountPaymentController:230-234`) |

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

The check itself is a single comparison of the `availableBalance` field Liberata returns against the requested amount, and an `ACTIVE` account with a sufficient balance is marked `success` before anything is written to the database (`PBAStatusErrorMapper:22-26`, `:64-65`).

Services still on Config 1 are listed in `pba.config1.service.names`, which defaults to the single value `dummy` (`application.properties:218`). Every service therefore takes the Config 2 path unless `PBA_CONFIG1_SERVICE_NAMES` is set for the environment. The list is matched against the `service` value as it arrives in the request (`CreditAccountPaymentController:120`), and that comparison runs before the `case_type` reference-data lookup overwrites `service` with the enterprise service description (`:124-130`). Entries in `PBA_CONFIG1_SERVICE_NAMES` must therefore be the codes callers send, not the resolved service descriptions.

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
  "case_type": "DIVORCE",
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

**Validation** (`CreditAccountPaymentRequest`):
- `amount`, `description`, `service`, `customer_reference`, `organisation_name`, `account_number` and a non-empty `fees` list are all mandatory (`:31-72`).
- `ccd_case_number` is not individually mandatory. A class-level `@AssertFalse` rejects the request only when **both** `ccd_case_number` and `case_reference` are absent, with the message `Either ccdCaseNumber or caseReference is required.` (`CreditAccountPaymentRequest:74-77`). A PBA payment carrying only a `case_reference` is accepted.
<!-- DIVERGENCE: Confluence states that `ccd_case_number` should be treated as mandatory and that a backlog item will enforce it at the API level. Source accepts either `ccd_case_number` or `case_reference` and enforces neither on its own (`ccpay-payment-app:api-contract/src/main/java/uk/gov/hmcts/payment/api/contract/CreditAccountPaymentRequest.java:74-77`). Source wins. -->
- Exactly one of `site_id` and `case_type` must be supplied. A second `@AssertFalse` rejects the request when both are set and when neither is, with the message `Either of Site ID or Case Type is mandatory as part of the request.` (`CreditAccountPaymentRequest:79-83`). Sending both is as invalid as sending neither, so the example above uses `case_type` alone.

**Flow**:
1. If the calling service is in `pba.config1.service.names`, the payment bypasses Liberata validation and is set to `pending` status (`CreditAccountPaymentController:158-162`).
2. Otherwise, the Liberata account API is called to validate the PBA account (`AccountServiceImpl:42-57`) and `PBAStatusErrorMapper` sets the payment status and any `CA-E00nn` error code from the account status and balance (`CreditAccountPaymentController:143-157`).
3. The duplicate payment check runs after Liberata validation, not before (`CreditAccountPaymentController:164`). The `DuplicatePaymentValidator` prevents the same user from paying for the same case with the same payment details twice within a configurable window (default: **2 minutes**, `duplicate.payment.check.interval.in.minutes:2`). After that window, a retry is treated as a new request. Because the Liberata call happens first, a duplicate submission still consumes a PBA account lookup before being rejected with a `DuplicatePaymentException`.
4. The payment and its fees are persisted (`CreditAccountPaymentController:166`) before the response status is chosen, so a Liberata-rejected payment exists in the database with status `failed`.
5. A payment whose status is `failed` returns HTTP 403 FORBIDDEN with the full payment DTO (`CreditAccountPaymentController:168-170`); success returns 201 CREATED.

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
- Timeouts: 15s connect, 15s read (`liberata.connect.timeout`, `liberata.read.timeout`).
- Resilience: `@CircuitBreaker(name = "defaultCircuitBreaker")` on the synchronous entry point (`AccountServiceImpl:43`) and `@TimeLimiter(name = "retrievePbaAccountTimeLimiter")` on the async retrieval (`:59`), configured with `timeout-duration=15000ms` and `cancel-running-future=true` (`application.properties:244-245`). Note the kebab-case property key: `retrievePbaAccountTimeLimiter.timeoutDuration` binds to nothing.

## PBA Account Lookup

Controller: `AccountController.java`

| Method | Path | Description |
|---|---|---|
| `GET` | `/accounts/{accountNumber}` | Check PBA account status |

**Response status mapping** (`AccountController:61-79`, exception handlers at `:82-119`):

| Liberata status | HTTP response |
|---|---|
| `ACTIVE` | 200 OK |
| `DELETED` | 410 Gone |
| `ON_HOLD` | 412 Precondition Failed |
| `NOT_FOUND` | 404 Not Found |
| Liberata unreachable | 503 Service Unavailable |

Only 410, 412 and 404 are translated into a response body; any other client error from Liberata is rethrown unhandled (`AccountController:103-104`). Anything that is not an `HttpClientErrorException` at all — connection refused, read timeout, an open circuit breaker — is wrapped as `LiberataServiceInaccessibleException` (`:76-79`) and mapped to 503 (`:115-118`), so 503 from this endpoint means the platform could not reach Liberata rather than that the account is unusable.

## Telephony (PCI-PAL)

Controller: `TelephonyController.java`

| Method | Path | Content-Type | Description |
|---|---|---|---|
| `POST` | `/telephony/callback` | `application/x-www-form-urlencoded` | PCI-PAL callback with payment result |

### POST /telephony/callback

Receives the inbound callback from PCI-PAL after a telephony payment transaction completes. The endpoint is exposed through an Azure API Management API named `Telephony API` on base path `telephony-api`, defined in `ccpay-payment-app`'s own terraform rather than in `ccpay-payment-api-gateway` (`infrastructure/cft-api-mgmt.tf:31-46`, `infrastructure/main.tf:24`). The APIM product sets `subscription_required = "true"` (`infrastructure/cft-api-mgmt.tf:24`), so callers must send `Ocp-Apim-Subscription-Key`.

Client authentication is by certificate thumbprint. The inbound policy reads the `X-ARR-ClientCertThumbprint` header injected by the Application Gateway and rejects the request with 401 when it is absent or not in the allow-list rendered from `telephony_api_gateway_certificate_thumbprints` (`infrastructure/template/cft-api-policy.xml:7-26`, `infrastructure/main.tf:22-23`). Rotating the PCI-PAL client certificate therefore requires a terraform change in this repo, not a configuration change in the service.

The same policy mints the S2S token itself: it derives a TOTP from the `ccpay-s2s-client-secret` named value, leases a token from `rpe-service-auth-provider`, and overwrites the `ServiceAuthorization` header on the way through (`infrastructure/template/cft-api-policy.xml:27-71`). PCI-PAL never holds an S2S secret, and any `ServiceAuthorization` a caller does send is discarded.

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

**APIM callback URL**:

The callback URL handed to PCI-PAL comes from `PCI_PAL_CALLBACK_URL`, bound to `pci-pal.callback-url` (`application.properties:38`). Its deployed value is templated per environment in the Helm chart:

```
https://cft-mtls-api-mgmt-appgw.{{ .Values.global.environment }}.platform.hmcts.net/telephony-api/telephony/callback
```

(`ccpay-payment-app:charts/payment-api/values.yaml:43`). The demo and prod flux overlays pin the same host with the environment substituted (`cnp-flux-config:apps/fees-pay/ccpay-payment-api/demo.yaml:15`, `prod.yaml:24`), which means every environment goes through the mTLS-fronted Application Gateway host, and a callback arriving on any other host will not carry the `X-ARR-ClientCertThumbprint` header the APIM policy requires.
<!-- DIVERGENCE: Confluence documents the callback URLs as `https://core-api-mgmt-aat.azure-api.net/telephony-api` and `https://core-api-mgmt-demo.azure-api.net/telephony-api`. Source uses the mTLS Application Gateway host `https://cft-mtls-api-mgmt-appgw.<env>.platform.hmcts.net/telephony-api/telephony/callback` in the chart and in both flux overlays; the `core-api-mgmt-*.azure-api.net` form survives only in local `docker-compose.yml` files. Source wins. -->

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
6. **Fallback callback** — if the user never returns (browser closed, session timeout), the service is notified through the registered callback URL.

The fallback in step 6 is delivered by the `PATCH /jobs/card-payments-status-update` job, not by the request path. The job lists every GOV.UK Pay payment still in a non-terminal state past the cutoff and calls `retrieveWithCallBack` on each (`MaintenanceJobsController:56-72`). That variant polls GOV.UK Pay and fires the callback only when two conditions hold: the status GOV.UK Pay reports is not already present in the payment's status history (`UserAwareDelegatingPaymentService:361-366`), and either the payment or its service request carries a callback URL (`:393-394`). When no callback URL is registered the job logs `Service callback url is null!` and moves on (`:396`).

Two consequences follow. The plain `GET /card-payments/{reference}` retrieval passes `shouldCallBack = false` (`UserAwareDelegatingPaymentService:415-417`), so polling for status never triggers a callback. And because the callback is gated on the status being new to the status history, a status the service has already been told about is not re-sent — the callback is an edge notification, not a periodic heartbeat.

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

**Response codes** (`ServiceRequestController:303-314`):

| HTTP Status | Meaning |
|---|---|
| 201 | Card payment created, response includes GOV.UK Pay URL |
| 302 | An existing GOV.UK Pay payment already succeeded; redirect back to the return URL |
| 400 | Payment creation failed |
| 403 | Unauthenticated request |
| 404 | Service request not found |
| 409 | Idempotency key conflict (different payment details) |
| 412 | Order already paid |
| 422 | Invalid or missing attributes |
| 425 | Payment request already in progress for this SR |
| 452 | SR already paid / amount mismatch with SR balance |
| 500 | Internal server error |
| 504 | Unable to connect to GOV.UK Pay |

The 302 is the idempotency path below, so a client following redirects automatically will land on its own return URL without ever seeing a payment reference in the response body.

**Card payment idempotency** (90-minute window):

The endpoint checks for existing card payments in `created` state from `gov pay` provider within the last **90 minutes**. If found:

1. Retrieves payment status from GOV.UK Pay.
2. If the existing payment is **successful** in GOV.UK Pay: updates the local DB and redirects the user to their `return-url` (avoids duplicate payment).
3. If the existing payment is still **initiated/in-progress**: cancels it via GOV.UK Pay's cancel API, then creates a new payment.
4. If no existing payment or the existing payment has a terminal non-success status: creates a new card payment normally.

### POST /service-request/{reference}/pba-payments

**Idempotency**: The endpoint computes a request hashcode over the body plus the service-request reference and looks up `IdempotencyKeys` by that hashcode (`ServiceRequestController:177`, `:187`). Rows whose stored Liberata response is retryable are filtered out first (`:190`), so only a non-retryable prior result short-circuits the request (`:193-196`). When nothing matches, a `pending` idempotency row is written before the payment is attempted and updated to `completed` with the response afterwards (`:199-200`, `:247-248`).

**Liberata error code mapping** (`ServiceRequestController:223-231`):

| Liberata code | Meaning | HTTP status |
|---|---|---|
| `CA-E0004` | PBA account deleted | 410 Gone |
| `CA-E0003` | PBA account on hold | 412 Precondition Failed |
| `CA-E0001` | Insufficient funds | 402 Payment Required |
| — | `LiberataServiceTimeoutException` | 504 Gateway Timeout (`:235-237`) |
| — | Any other exception | 500 Internal Server Error (`:239-241`) |

All five outcomes are written to the idempotency record, but only some of them lock the request out. `HTTP_CODE_ALLOWABLE_RETRIES` is `{504, 500, 412, 402, 410}` (`IdempotencyServiceImpl:20`), and completed rows carrying one of those codes are dropped from the duplicate set (`:36-40`), so a retry after a timeout, a server error, an on-hold account, insufficient funds or a deleted account is attempted again for real. A completed row with any other code — notably 201 and 409 — short-circuits the retry and the stored response is replayed. Reusing the same `idempotency_key` also short-circuits regardless of code, because that lookup is not filtered (`ServiceRequestController:192-193`).

### ASB topic publishing

After service request creation, a message is published to `ccpay-service-request-cpo-update-topic` with payload `ServiceRequestCpoDto` (action, case_id, order_reference, responsible_party) and message property `serviceCallbackUrl = {case-payment-orders.api.url}/case-payment-orders` (`ServiceRequestDomainServiceImpl:534-572`).

After card payment status retrieval via `GET /card-payments/{internal-reference}/status`, a message is published to `ccpay-service-callback-topic` (`ServiceRequestController:357-358`). Publishing is a side effect of the GET, so repeated polling republishes the callback.

That endpoint requires the payment to have been apportioned. When no `FeePayApportion` rows exist for the payment it throws `PaymentNotSuccessException` (`ServiceRequestController:342-345`), which the controller maps to **400** with the message `Payment is not successful` (`:365-368`). A service polling immediately after redirect can see a 400 rather than a pending status.

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
| `POST` | `/payment-failures/bounced-cheque` | Record a bounced cheque failure; returns 200 (`PaymentStatusController:62-78`) |
| `POST` | `/payment-failures/chargeback` | Record a chargeback failure (`:85`) |
| `POST` | `/payment-failures/unprocessed-payment` | Record an unprocessed payment (`:105`) |
| `GET` | `/payment-failures/{paymentReference}` | Get failure details by payment reference (`:126`) |
| `PATCH` | `/payment-failures/{failureReference}` | Update failure with "ping 2" representment data (`:161`) |
| `DELETE` | `/payment-status-delete/{failureReference}` | Delete a failure record; returns 204 (`:153-157`) |
| `GET` | `/payment-failures/failure-report` | Failure report for a `date_from`/`date_to` range (`:197-199`) |
| `GET` | `/telephony-payments/telephony-payments-report` | Telephony payments report for a `date_from`/`date_to` range (`:220-222`) |

Both report endpoints take `date_from` and `date_to` query parameters in `MM/dd/yyyy` form, and both widen the range internally to the start and end of the given days (`PaymentStatusController:208`, `:227`).

The LaunchDarkly `payment-status-update-flag` is a kill switch for the failure pipeline, and it covers more than the writes: the three POSTs, the PATCH, `GET /payment-failures/{paymentReference}` and `GET /payment-failures/failure-report` all refuse when it is enabled (`PaymentStatusController:65`, `:88`, `:108`, `:129`, `:164`, `:203`). The POSTs, PATCH and single-failure GET return a bodyless `503`; the failure report instead throws `LiberataServiceInaccessibleException`, which the same controller maps to `503` with the message `service unavailable` (`:203-204`, `:249-253`). Turning the flag on therefore blocks the failure report as well as the ingest endpoints. `DELETE /payment-status-delete/{failureReference}` and the telephony report are not gated.

The `/payment-failures/{paymentReference}` GET returns `204 No Content` rather than 404 when the reference has no failures (`PaymentStatusController:141-142`).

A repeat POST for a failure reference that already exists trips a `DataIntegrityViolationException`, which is converted to `FailureReferenceNotFoundException` (`PaymentStatusUpdateServiceImpl:106-107`) and surfaces as **429 Too Many Requests** (`PaymentStatusController:231-234`) — not a 409.

**Failure lifecycle** (two-ping model):

1. **Ping 1** — Liberata sends a `POST /payment-failures/bounced-cheque` or `POST /payment-failures/chargeback` with initial failure data (amount, event date, has_amount_debited). The system inserts a `payment_failures` record (`PaymentStatusUpdateServiceImpl:99-105`) and then calls `ccpay-refunds-app` to cancel any active refund for the affected payment reference (`:111-131`, `PaymentStatusController:72-74`).
2. **Ping 2** — Liberata sends a `PATCH /payment-failures/{failureReference}` with representment outcome (representment_status, representment_date). This updates the existing failure record.

The refund cancellation in step 1 is best-effort: every failure mode, including the refunds service being unreachable, is caught and logged, and `cancelFailurePaymentRefund` returns `true` regardless (`PaymentStatusUpdateServiceImpl:121-131`). A refund that should have been cancelled can therefore remain active with no signal on the Liberata response.

No message is published to a Service Bus topic during either ping. Failure data reaches consumers by being read back: `PaymentGroupDtoMapper.evaluatePaymentDispute` attaches a `disputes` array to each payment in the payment group (`PaymentGroupDtoMapper:277-317`, wired at `:147`), using the `DisputeDto` fields `ping_number`, `is_dispute`, `failure_reference`, `reason`, `payment_reference`, `ccd_case_number`, `amount`, `dcn`, `failure_event_date_time`, `has_amount_debited`, `representment_success`, `representment_outcome_date` and `failure_type` (`DisputeDto:22-34`).

`ping_number` and `is_dispute` are derived rather than stored: a null `representment_success` yields ping 1 with `is_dispute = true`, `Yes` yields ping 2 with `is_dispute = false`, and any other value yields ping 2 with `is_dispute = true` (`PaymentGroupDtoMapper:285-294`).
<!-- DIVERGENCE: Confluence describes a callback message with event type `Payment-Failure` and a nested `dispute` object containing `dispute_amount`, `failure_event_date`, `has_amount_debited`, `representment_status` and `representment_date`, published to the service callback topic after each ping. Source contains no `Payment-Failure` literal, no `event` field and no topic publication in the payment-failure path; failure data is exposed as a `disputes` array on the payment DTO with different field names (`ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/mapper/PaymentGroupDtoMapper.java:277-317`, `ccpay-payment-app:api-contract/src/main/java/uk/gov/hmcts/payment/api/contract/DisputeDto.java:22-34`). Source wins. -->

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

Every runtime toggle in this service goes through `LaunchDarklyFeatureToggler.getBooleanValue(key, default)`. There are five keys, each defaulting to `false`:

| Flag | Controls |
|---|---|
| `apportion-feature` | Fee-payment apportioning after card and PBA payment creation (`CardPaymentController:182-186`, `CreditAccountPaymentController:174`, `PaymentGroupController:290`, `:415`, `:606`) and the SUCCESS/failure fee-amount update during status retrieval (`UserAwareDelegatingPaymentService:376-391`) |
| `iac-supplementary-details-feature` | IAC supplementary details on the reconciliation response (`PaymentController:215`) |
| `payment-status-update-flag` | Kill switch for the payment-failure endpoints, returning 503 when enabled; also gates `/jobs/unprocessed-payment-update`, but with the sense inverted — the job runs when the flag is **off** (`PaymentStatusController:180`) |
| `prod-strategic-fix` | Duplicate-DCN rejection on the two `bulk-scan-payments-strategic` endpoints (`PaymentGroupController:375-382`, `:447-455`) |
| `refund-remission-lagtime-feature` | Refund and remission lag-time eligibility (`PaymentRefundsServiceImpl:413`, `RefundRemissionEnableServiceImpl:59`, `:92`) |

Because every default is `false`, an environment with LaunchDarkly unreachable runs with apportionment off, IAC supplementary details off, duplicate-DCN checking off — and the payment-failure endpoints open, since their kill switch is the one flag whose safe state is the default.

The four `feature.*` keys in `application.properties` — `feature.check.liberata.account.for.all.services`, `feature.duplicate.payment.check`, `feature.case.reference.validation` and `feature.discontinued.fees` (`application.properties:190-193`) — are bound to nothing. No `@Value` or `@ConfigurationProperties` reads them, and there is no FF4j on the classpath, so changing them has no effect.

## Integration Gotchas

These are important behaviours for consuming services to be aware of:

1. **Stale payment status**: Neither HMCTS Payment Gateway nor GOV.UK Pay support push notifications for payment status updates. If a user completes payment but their browser fails to redirect back to the `return-url` (e.g. network interruption, session timeout), the payment status will not be reflected in your application until you query it again. Services should implement a background job for refreshing payment statuses, or rely on the F&P service callback mechanism.

2. **Duplicate payment risk (legacy /card-payments)**: The legacy `POST /card-payments` endpoint has no built-in duplicate detection. Any retries from the service are treated as new payment requests. Use the service-request card payment endpoint (`POST /service-request/{ref}/card-payments`) for the 90-minute idempotency protection.

3. **Duplicate PBA prevention window**: The `DuplicatePaymentValidator` prevents the same user from paying for the same case with identical details within **2 minutes** (configurable via `duplicate.payment.check.interval.in.minutes`). Two different users paying from the same PBA account within that window can still cause duplicates: the predicate matches on `userId`, `amount`, `serviceType`, `ccdCaseNumber` (falling back to `caseReference` when absent), `paymentChannel` and the creation window, and the fee list must match code-for-code (`DuplicateSpecification:36-51`, `DuplicatePaymentValidator:46-63`). The PBA account number is not part of the key, and neither is the customer reference. The validator is wired only into the legacy `POST /credit-account-payments` (`CreditAccountPaymentController:164`, `:279-280`) — the service-request PBA endpoint relies on idempotency keys instead, so the 2-minute window does not apply there.

4. **Case identifier required before payment**: The API accepts either `ccd_case_number` or `case_reference` and rejects a request only when both are missing (`CreditAccountPaymentRequest:74-77`). The reconciliation endpoints filter on `ccd_case_number` and the `disputes` payload reports it, so a payment created with only a `case_reference` is accepted but cannot be found by CCD case number afterwards.

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
