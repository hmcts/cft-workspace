---
title: Integrate From A Service
topic: overview
diataxis: how-to
product: payment
audience: both
sources:
  - ccpay-payment-app:api/src/main/resources/application.properties
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/configuration/security/PaymentAuthCheckerConfiguration.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CreditAccountPaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/ServiceRequestController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/pcipal/TelephonyController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/servicebus/CallbackServiceImpl.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/v1/model/govpay/GovPayConfig.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/ServiceToTokenMap.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/servicerequest/ServiceRequestDto.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/servicerequest/ServiceRequestPaymentDto.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/OnlineCardPaymentRequest.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/configuration/FF4jConfiguration.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/CallbackService.java
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/payment/ccpay-payment-app/model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/ServiceToTokenMap.java
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/dto/OnlineCardPaymentRequest.java
confluence:
  - id: "1952815065"
    title: "Payments - Technical Integration Overview"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1953047074"
    title: "GOV.UK Pay Card Payments Service Onboarding Guide"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1890795875"
    title: "Services integration with Payments & Service Requests (Orders / Invoices) for Card Payments"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1952811625"
    title: "Service Request Behaviour"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1638189078"
    title: "Service Onboarding for Ways to Pay Card Payment"
    last_modified: "unknown"
    space: "RP"
  - id: "1952812621"
    title: "Payment by Account (PBA)"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1791348214"
    title: "Telephony Service Onboarding Guide"
    last_modified: "unknown"
    space: "DTSFP"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- To call `ccpay-payment-app`, your service must be registered as a trusted S2S caller and provide both an IDAM user JWT and an S2S service JWT on every request.
- Three payment methods are available: card payments (via GOV.UK Pay), PBA / credit-account payments (via Liberata), and telephony payments (via PCI-PAL).
- The modern integration path (Ways2Pay) uses Service Requests (`POST /service-request`) to group fees, then initiates a payment against the service request.
- Asynchronous payment-status callbacks are delivered via Azure Service Bus topic `ccpay-service-callback-topic`; your service must subscribe and handle status updates.
- A per-service GOV.UK Pay API key must be configured in the payment service infrastructure for card payments to work; the key mapping flows from the Org/Service ID through Reference Data to a vault secret.
- The onboarding process requires coordination with the F&P team, Liberata, and (for telephony) PCI-PAL.

## Prerequisites

Before integrating, ensure you have:

- An S2S microservice name registered with `service-auth-provider-api`.
- Your S2S name added to the `trusted.s2s.service.names` list in `ccpay-payment-app` configuration (`application.properties:110`).
- A GOV.UK Pay account and API key (for card payments) -- the key is configured as `gov.pay.auth.key.<your_service>` in the payment service's Helm chart.
- Access to the Azure Service Bus namespace (for receiving callbacks).
- Your service's Org/Service ID configured in Reference Data (the `hmcts_org_id` used in Service Request creation).
- Finance Service Management engaged on income and accounting returns.
<!-- CONFLUENCE-ONLY: not verified in source -->

### Onboarding dependencies (card payments)

These dependencies come from the F&P onboarding process and are not modelled in code:

| Dependency | Owner |
|---|---|
| Finance Service Management engaged on income/accounting returns | Service team |
| Service ID / ORG URN mapped in Reference Data | F&P team |
| GOV.UK Pay Service account created | F&P Service Manager/PO |
| Barclaycard Merchant ID (WorldPay) configured for live | F&P team |
| New fee / keywords approved by service management | Service team |
<!-- CONFLUENCE-ONLY: not verified in source -->

## Step 1: Register your service as a trusted S2S caller

1. Raise a PR against `ccpay-payment-app` to add your S2S microservice name to the `trusted.s2s.service.names` property in `api/src/main/resources/application.properties:110`.
2. Also add the same service name to the `TRUSTED_S2S_SERVICE_NAMES` variable in `charts/payment-api/values.yaml` and update the chart version in `Chart.yaml`.
3. The current trusted list includes: `cmc`, `cmc_claim_store`, `probate_frontend`, `divorce_frontend`, `ccd_gw`, `api_gw`, `finrem_payment_service`, `ccpay_bubble`, `jui_webapp`, `xui_webapp`, `fpl_case_service`, `iac`, `probate_backend`, `civil_service`, `paymentoutcome_web`, `adoption_web`, `prl_cos_api`, `refunds_api`, `civil_general_applications`, `notifications_service`, `nfdiv_case_api`, `ccpay_gw`, `pcs_api`.
4. Optionally, add the service name in `cnp-flux-config` for specific environments (this overrides the application-level list): `https://github.com/hmcts/cnp-flux-config/blob/master/apps/fees-pay/ccpay-payment-api/prod.yaml`.

## Step 2: Configure a GOV.UK Pay API key (card payments only)

The GOV.UK Pay key mapping works through a chain:

```
Service ID (hmcts_org_id in SR request)
  -> Ref Data call fetches Enterprise Service Name
    -> ServiceToTokenMap maps service name to alias (S2S name)
      -> Dynamic config maps alias to vault secret value
```

### 2a. Create the GOV.UK Pay Service

The F&P Service Manager / Product Owner creates the service in GOV.UK Pay with these settings:

- **Service name**: Format `"HMCTS <Service Name>"` (e.g. "HMCTS Possessions")
- **Paying user email addresses**: Ask for email: On, Send confirmation: On, Send refund emails: Off
- **Organisation**: HM Courts & Tribunals Service, 102 Petty France, London, SW1H 9AJ
- **Payment provider**: WorldPay (HMCTSONLINEFEES merchant code for live)
- **Card types**: Visa debit, Mastercard debit, Visa credit, Mastercard credit
- **Apple Pay / Google Pay**: On
<!-- CONFLUENCE-ONLY: not verified in source -->

### 2b. Generate and store the API key

1. Generate a Test API Key from the GOV.UK Pay admin (while service is in Sandbox mode). This key covers all lower environments: Demo, ITHC, Perftest, and AAT.
2. Store the key in Azure Key Vault:
   ```bash
   az keyvault secret set --vault-name ccpay-aat --name gov-pay-keys-<service_alias> --value '<api_key_value>'
   ```
3. Map it in the `ccpay-payment-app` Helm chart (`charts/payment-api/values.yaml`):
   ```yaml
   - name: gov-pay-keys-<service_alias>
     alias: gov.pay.auth.key.<s2s_name>
   ```
4. Add the corresponding property to `application.properties`:
   ```properties
   gov.pay.auth.key.<s2s_name>=${GOV_PAY_AUTH_KEY_<UPPER_ALIAS>:}
   ```

### 2c. Add the ServiceToTokenMap entry

If your Enterprise Service Name (from Reference Data) does not directly match your S2S name, add a mapping in `ServiceToTokenMap.java`:

```java
// model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/ServiceToTokenMap.java
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
```

The lookup is case-insensitive. If your service name is not found, a `PaymentServiceNotFoundException` is thrown.

## Step 3: Create a Service Request

The recommended integration path (Ways2Pay) groups fees under a Service Request before initiating payment. The Service Request remains associated with the case and can be reused for multiple payment attempts (e.g. after a failed card payment, the user can retry without creating a new Service Request).

1. Call `POST /service-request` with the required body.
2. Include headers:
   - `Authorization: Bearer <IDAM_user_token>`
   - `ServiceAuthorization: Bearer <S2S_token>`
3. The response contains a `service_request_reference` you will use in subsequent payment calls.

### Request body

All fields below are **mandatory** (validated with `@NotNull` / `@NotBlank` / `@NotEmpty`):

| Field | Type | Validation | Description |
|---|---|---|---|
| `ccd_case_number` | string | `@Pattern("^[0-9]{16}")` | 16-digit CCD case number |
| `case_reference` | string | `@NotBlank` | Your service's case reference |
| `hmcts_org_id` | string | `@NotBlank` | Organisation/Service ID from Reference Data |
| `call_back_url` | string | `@NotBlank` | URL where F&P sends payment status updates |
| `case_payment_request` | object | `@NotNull @Valid` | Contains `action` and `responsible_party` |
| `fees` | array | `@NotEmpty`, no duplicate fee codes | List of fee items |

Each fee object:

| Field | Type | Validation |
|---|---|---|
| `code` | string | `@NotEmpty` |
| `version` | string | `@NotEmpty` |
| `calculated_amount` | BigDecimal | `@NotNull`, max 2 decimal places |
| `volume` | integer | `@Positive` |

```json
POST /service-request
{
  "ccd_case_number": "1234567890123456",
  "case_reference": "REF-2024-001",
  "hmcts_org_id": "ABA1",
  "call_back_url": "https://your-service.platform.hmcts.net/payment-callback",
  "case_payment_request": {
    "action": "Action 1",
    "responsible_party": "Party 1"
  },
  "fees": [
    {
      "code": "FEE0001",
      "version": "1",
      "calculated_amount": 550.00,
      "volume": 1
    }
  ]
}
```

### Response codes

| Code | Meaning |
|---|---|
| 201 | Service Request created |
| 400 | Creation failed |
| 401 | Credentials required |
| 403 | Forbidden |
| 404 | No Service found for given CaseType |
| 422 | Invalid or missing attribute |
| 504 | Unable to retrieve service information |

## Step 4a: Initiate a card payment (GOV.UK Pay) -- Ways2Pay

1. Call `POST /service-request/{service-request-reference}/card-payments`.
2. Pass the following headers:
   - `Authorization: Bearer <IDAM_user_token>`
   - `ServiceAuthorization: Bearer <S2S_token>`
   - `service-callback-url` -- (optional header) the URL the payment service will call back with the payment status

3. The request body requires:

| Field | Type | Validation | Description |
|---|---|---|---|
| `amount` | BigDecimal | `@NotNull`, min 0.01, max 2 decimal places | Payment amount |
| `currency` | CurrencyCode | `@NotNull` | Must be `GBP` |
| `language` | string | `@NotNull @NotEmpty` | e.g. `"EN"` |
| `return-url` | string | `@NotNull @NotEmpty` | URL citizen is redirected to after GOV.UK Pay |

<!-- DIVERGENCE: Confluence says return-url is a header; source (OnlineCardPaymentRequest.java + ServiceRequestController.java:319) shows it is a required field in the request body for the Ways2Pay endpoint. The header value is overridden by the body value. Source wins. -->

```json
POST /service-request/{service-request-reference}/card-payments
Content-Type: application/json
Authorization: Bearer <IDAM_token>
ServiceAuthorization: Bearer <S2S_token>

{
  "amount": 550.00,
  "currency": "GBP",
  "language": "EN",
  "return-url": "https://your-service.platform.hmcts.net/payment-result"
}
```

4. The response includes a `next_url` -- redirect the user's browser there to complete payment on GOV.UK Pay.
5. After the user completes payment, they are redirected back to your `return-url`.
6. Call `GET /card-payments/{internal-reference}/status` to confirm the payment status and trigger a callback message to your service's `call_back_url`.

### What happens if the user abandons payment

If the user closes their browser during the GOV.UK Pay journey, your service will not receive a redirect. In this scenario, the F&P scheduled job (runs approximately every 15 minutes) queries GOV.UK Pay for updated statuses and publishes a callback to your service's registered callback URL via Azure Service Bus.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Step 4a (legacy): Initiate a card payment -- legacy endpoint

The older `POST /card-payments` endpoint is still supported but **new services should use Ways2Pay**.

In the legacy flow, `return-url` and `service-callback-url` are passed as **request headers** (not in the body). The body uses `site_id` instead of `hmcts_org_id`.

```json
POST /card-payments
Content-Type: application/json
Authorization: Bearer <IDAM_token>
ServiceAuthorization: Bearer <S2S_token>
return-url: https://your-service.platform.hmcts.net/payment-result
service-callback-url: https://your-service.platform.hmcts.net/payment-callback

{
  "amount": 550.00,
  "currency": "GBP",
  "description": "Application fee",
  "ccd_case_number": "1234567890123456",
  "case_reference": "REF-2024-001",
  "service": "PCS",
  "site_id": "AAA7",
  "fees": [
    {
      "code": "FEE0001",
      "version": "1",
      "calculated_amount": 550.00,
      "volume": 1
    }
  ]
}
```

## Step 4b: Initiate a PBA (credit account) payment

New services should use **PBA v3** via the Service Request endpoint.

1. Call `POST /service-request/{service-request-reference}/pba-payments`.
2. The request body requires:

| Field | Type | Validation | Description |
|---|---|---|---|
| `amount` | BigDecimal | `@NotNull`, min 0.01, max 2 decimal places | Payment amount |
| `currency` | string | Must be `"GBP"` | Currency code |
| `account_number` | string | `@NotEmpty` | PBA account number (e.g. `PBA0082848`) |
| `organisation_name` | string | `@NotEmpty` | Organisation name |
| `customer_reference` | string | `@NotEmpty` | Customer/solicitor reference |
| `idempotency_key` | string | `@NotEmpty` | Unique key to prevent duplicate payments |

```json
POST /service-request/{service-request-reference}/pba-payments
{
  "amount": 550.00,
  "currency": "GBP",
  "account_number": "PBA0082848",
  "organisation_name": "Example Solicitors LLP",
  "customer_reference": "SOL-REF-001",
  "idempotency_key": "unique-uuid-per-attempt"
}
```

3. The payment service validates the PBA account against Liberata synchronously. Response codes:

| Code | Error Code | Meaning |
|---|---|---|
| 201 Created | -- | Payment accepted |
| 402 Payment Required | `CA-E0001` | Insufficient funds |
| 409 Conflict | -- | Duplicate payment (idempotency key or hash match) |
| 410 Gone | `CA-E0004` | PBA account deleted |
| 412 Precondition Failed | `CA-E0003` | PBA account on hold |
| 412 (from endpoint) | -- | Service request already paid |
| 417 | -- | Amount does not equal service request balance |
| 504 Gateway Timeout | -- | Liberata timeout |

### PBA balance check caveat

The Liberata API validates account status and balance synchronously, but the **balance data itself is based on the previous day's snapshot** (not real-time). This means a payment may pass the balance check initially but later fail during financial settlement if funds became insufficient between the snapshot and the actual debit.
<!-- CONFLUENCE-ONLY: not verified in source -->

### Idempotency

PBA payments via the Service Request endpoint enforce idempotency. The `idempotency_key` is mandatory. If you resend the same request:
- If the original is still `pending`, you receive a `409 Conflict`.
- If the original completed, you receive the original response (replayed from the idempotency record).

## Step 4c: Initiate a telephony payment (PCI-PAL)

Telephony payments are used for phone-based payments taken by staff via PayBubble. The integration involves launching a PCI-PAL session.

1. Your service calls `PciPalPaymentService.getTelephonyProviderLink()` (usually via a frontend action in PayBubble) to get a PCI-PAL redirect URL.
2. The payment amount is supplied in pounds; pence conversion happens internally (`PciPalPaymentService.java:70-113`).
3. PCI-PAL posts back to `POST /telephony/callback` (form-urlencoded) when the transaction completes. This endpoint is S2S-only authenticated (`SpringSecurityConfiguration:54-62`).
4. Supported service types for PCI-PAL flow IDs: `Probate`, `Divorce`, `Specified Money Claims`, `Financial Remedy`, `Family Private Law`, `Immigration and Asylum Appeals` (`TelephonySystem.java:35-48`). Contact the Fees & Pay team to add new service types.

### Telephony onboarding process

Onboarding telephony requires a multi-party SIT process:

1. Service team requests F&P Team to set up Telephony Payment.
2. F&P Team informs PCI-PAL and configures MID flow.
3. Service team creates test cases and makes telephony payments for each fee code, sharing CCD Case Number, Payment RC Reference, Fee Code, and Amount.
4. F&P Team verifies and emails Liberata with the data sheet.
5. Liberata initiates reconciliation verification.
6. F&P Team sends confirmation to PCI-PAL.
7. After all parties confirm, SIT is concluded.
<!-- CONFLUENCE-ONLY: not verified in source -->

### Telephony test numbers (non-production)

| Provider | Dial number |
|---|---|
| Antenna | 01473905163 |
| Kerv/Trinity | 01473905157 |
<!-- CONFLUENCE-ONLY: not verified in source -->

## Step 5: Handle asynchronous payment callbacks

The payment service publishes status updates to the Azure Service Bus topic `ccpay-service-callback-topic`.

1. Your service's registered callback URL (the `call_back_url` from the Service Request, or the `service-callback-url` header from a legacy card payment) determines the destination.
2. The callback message is a JSON body containing either:
   - `PaymentDto` -- when `payment.serviceCallbackUrl` is set (legacy card payments)
   - `PaymentStatusDto` -- when `paymentFeeLink.callBackUrl` is set (Service Request flow)
3. The message has a `serviceCallbackUrl` property in the Service Bus message properties indicating the delivery endpoint.
4. The callback is published when:
   - A card payment status changes (triggered by `GET /card-payments/{internal-reference}/status` or the scheduled status-update job)
   - The `payment-callback-service` FF4j feature flag is enabled (`CallbackService.FEATURE`)

<!-- DIVERGENCE: Confluence/draft previously referenced the feature flag name as "service-callback", but source (CallbackService.java:8) shows the actual feature flag name is "payment-callback-service". Source wins. -->

### Callback payload (Service Request flow)

```json
{
  "service_request_reference": "2024-1234567890",
  "service_request_status": "Paid",
  "payment": {
    "payment_reference": "RC-1234-5678-9012-3456",
    "date_created": "2024-01-15T10:30:00.000+0000",
    "status": "success",
    "payment_amount": 550.00
  }
}
```
<!-- CONFLUENCE-ONLY: not verified in source -->

## Step 6: Query payment status

At any time you can retrieve the current payment status:

- `GET /card-payments/{reference}` -- full payment details
- `GET /card-payments/{reference}/statuses` -- status history
- `GET /card-payments/{reference}/details` -- includes card details (last 4 digits, brand)
- `GET /card-payments/{internal-reference}/status` -- retrieves status by internal reference and triggers a callback message

All require `Authorization` + `ServiceAuthorization` headers.

### Payment status values

| Status | Description |
|---|---|
| Initiated | Payment created, awaiting user action |
| Success | Payment completed successfully |
| Failed | Payment rejected or errored |
| Declined | Card declined by provider |
| Timed Out | Payment session expired |
| Cancelled | Payment cancelled by user |
| Error | Unexpected error during processing |

## Error handling considerations

Services should account for the following scenarios:

| Scenario | Recommended handling |
|---|---|
| Duplicate payment requests | Use idempotency keys (PBA) or check existing SR status before creating new payments |
| Payment session expiry | Handle redirect with expired status; allow user to retry against same Service Request |
| Failed redirects / browser close | Rely on scheduled job (~15 min) and callback notification |
| Declined payments | Display error to user; allow retry against same Service Request |
| PBA balance failures after initial success | Handle `PaymentStatusDto` callbacks with failed status |
| Duplicate payment attempts (card) | Check response codes 425 (Too Many Requests) and 452 (Already Paid) |

## Verify

1. In a non-production environment, create a Service Request and then a card payment. Confirm you receive a `next_url` in the response.
2. After completing the GOV.UK Pay sandbox journey, call `GET /card-payments/{internal-reference}/status` and verify the status is `success`.
3. For PBA, use a test PBA account number and verify the response code is `201 Created`.
4. Confirm your callback URL receives a message on the Azure Service Bus topic after payment completes.

## Examples

### ServiceToTokenMap: enterprise service name to GOV.UK Pay key alias

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

### OnlineCardPaymentRequest: Ways2Pay card payment body validation

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
    private String returnUrl;  // in the request body for Ways2Pay, not a header
}
```

## See also

- [Overview](../explanation/overview.md) — platform responsibilities, payment channels, and service request model
- [GOV.UK Pay Integration](../explanation/govuk-pay-integration.md) — multi-account key resolution, idempotency, and 90-minute session window details
- [Payment Status Callbacks](../reference/payment-status-callbacks.md) — ASB topic schemas, callback URL registration, and `ccpay-functions-node` retry
- [Reference: API Payments](../reference/api-payments.md) — full endpoint catalogue with request/response shapes
- [How-to: Troubleshoot Payment Status](troubleshoot-payment-status.md) — what to do when payments get stuck or callbacks are not received
- [Glossary](../reference/glossary.md) — definitions for Service Request, W2P, PBA, S2S, RC reference
