---
title: Pci Pal Telephony
topic: telephony
diataxis: explanation
product: payment
audience: both
sources:
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/PciPalPaymentService.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/TelephonySystem.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/AntennaTelephonySystem.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/KervTelephonySystem.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/pcipal/TelephonyController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentGroupController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/TelephonyCallbackDto.java
  - ccpay-payment-app:api/src/main/resources/application.properties
  - ccpay-payment-app:charts/payment-api/values.yaml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/controllers/pcipal/TelephonyController.java
  - apps/payment/ccpay-payment-app/model/src/main/java/uk/gov/hmcts/payment/api/service/TelephonySystem.java
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/dto/TelephonyCallbackDto.java
confluence:
  - id: "865992841"
    title: "Technical Specification - PCI Pal (NOC hosted )"
    last_modified: "unknown"
    space: "RP"
  - id: "1859518531"
    title: "Kerv Telephony LLD"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1914813835"
    title: "Telephony"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1933853657"
    title: "Add a new Telephony System Provider"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "693534963"
    title: "Telephony payments"
    last_modified: "unknown"
    space: "RP"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- PCI-PAL is the telephony card-payment provider used by HMCTS for agent-assisted phone payments at CTSCs, integrated via `ccpay-payment-app`. The underlying call-centre infrastructure has migrated from 8x8 to Antenna to Kerv (Nexus/Genesis).
- Two provider implementations exist: **Antenna** (legacy) and **Kerv** (current default, enforced by `validateDefaultTelephonySystem`). The frontend exposes system selection in PayBubble behind a LaunchDarkly flag `pci-pal-telephony-selection`.
- Each provider has its own OAuth2 credentials and per-jurisdiction **flow IDs** that route calls to the correct PCI-PAL payment form. The payment gateway under PCI-PAL is Barclays ePDQ.
- The launch flow: acquire OAuth token, POST to the provider's launch URL with payment details, build a redirect URL from the response. Kerv uses the logged-in IDAM user ID as the username; Antenna uses a static secret.
- PCI-PAL posts results back via APIM to `POST /telephony/callback` as form-urlencoded data containing `orderReference` and `transactionResult` (SUCCESS, DECLINE, ERROR, CANCELLED).
- Telephony payments must cover all outstanding fees for a case; partial telephony payments are not permitted.

## Business Context

PCI-PAL was selected by the HMCTS Reform Programme to allow telephone payments to be captured in a PCI-compliant way at Courts and Tribunals Service Centres (CTSCs). PCI-PAL itself is the payment-capture layer; the underlying telephony infrastructure (call-centre backbone) has evolved through three generations:

1. **8x8** -- original system (decommissioned)
2. **Antenna** (Fournet) -- introduced ~2020, now legacy
3. **Kerv** (Nexus/Genesis) -- current strategic system

From `ccpay-payment-app`'s perspective, the PCI-PAL API contracts are the same regardless of which telephony backbone is active. What changes per system is: the PCI-PAL tenant, OAuth credentials, flow IDs, and launch/view URLs.

<!-- CONFLUENCE-ONLY: not verified in source -->
Telephony payments are typically used when: a citizen is digitally averse, a previous online card payment has failed, the citizen is signposted to the CTSC, or a supplementary fee is required in a service journey that does not yet support online payments.

## Providers: Antenna and Kerv

`ccpay-payment-app` abstracts telephony providers behind an inheritance hierarchy rooted at `TelephonySystem` (`model/src/main/java/uk/gov/hmcts/payment/api/service/TelephonySystem.java:19`). Two concrete implementations exist:

| Provider | Class | System Name | Status | Jurisdictions |
|----------|-------|-------------|--------|---------------|
| Antenna | `AntennaTelephonySystem` | `"antenna"` | Legacy (being retired) | Probate, Divorce, Specified Money Claims, Financial Remedy, Family Private Law, Immigration and Asylum Appeals |
| Kerv | `KervTelephonySystem` | `"kerv"` | Active default | Same set, different flow IDs |

Both providers expose the same interface methods: `getTokensURL()`, `getLaunchURL()`, `getViewIdURL()`, and `getFlowId(serviceType)`.

### System Selection Logic

The telephony system is selected via the `telephony_system` JSON body parameter on the `POST /payment-groups/{payment-group-reference}/telephony-card-payments` endpoint (`PaymentGroupController.java`):

1. **`validateDefaultTelephonySystem()`** (line 552) is called first. If `telephony_system` is null/empty, it defaults to `"kerv"`. If the value is anything other than `"kerv"`, it throws `TelephonyServiceException` (HTTP 422). This effectively enforces Kerv-only at the validation gate.
2. **`getTelephonySystem()`** (line 584) then resolves the `TelephonySystem` bean. If the value is `"kerv"` it returns `kervTelephonySystem`; otherwise it falls back to `antennaTelephonySystem`. Since `validateDefaultTelephonySystem` blocks non-Kerv values, Antenna is effectively unreachable through the normal path.

<!-- DIVERGENCE: Confluence (Kerv Telephony LLD, page 1859518531) says both systems should be selectable via the radio buttons and the backend defaults to antenna if telephony_system is missing. But source (PaymentGroupController.java:619-629) shows validateDefaultTelephonySystem enforces Kerv-only; non-kerv values throw TelephonyServiceException (422). Source wins -- Antenna is currently blocked. -->

The PayBubble frontend presents system selection radio buttons (displaying "Antenna" and "Trinity" for Kerv) behind the LaunchDarkly feature flag `pci-pal-telephony-selection`. When the flag is disabled, no `telephony_system` is sent and the backend defaults to Kerv.

### Username Handling

The username passed in the OAuth token request differs by system (`PaymentGroupController.java:590`):

- **Kerv**: uses the logged-in IDAM user ID (from request headers)
- **Antenna**: uses a static secret from `pci-pal.antenna.user.name` / `PCI_PAL_ANTENNA_USER_NAME`

<!-- CONFLUENCE-ONLY: not verified in source -->
The Kerv LLD suggests the IDAM user ID should be obfuscated (e.g. via `Objects.hash(idamUserId)`) before passing to PCI-PAL. The source code passes the raw IDAM ID string directly.

## OAuth2 Token Acquisition

Before launching a payment session, the service obtains an OAuth2 access token from the provider. This is the first of two PCI-PAL API calls made by the backend.

`PciPalPaymentService.getPaymentProviderAuthorisationTokens()` (`PciPalPaymentService.java:116-132`) POSTs a URL-encoded form to the provider's token endpoint with:

| Field | Source |
|-------|--------|
| `grant_type` | `PCI_PAL_ANTENNA_GRANT_TYPE` or `PCI_PAL_KERV_GRANT_TYPE` (configurable, typically `client_credentials`) |
| `tenantname` | `PCI_PAL_ANTENNA_TENANT_NAME` / `PCI_PAL_KERV_TENANT_NAME` |
| `username` | IDAM user ID (Kerv) or static secret `PCI_PAL_ANTENNA_USER_NAME` (Antenna) |
| `client_id` | `PCI_PAL_ANTENNA_CLIENT_ID` / `PCI_PAL_KERV_CLIENT_ID` |
| `client_secret` | `PCI_PAL_ANTENNA_CLIENT_SECRET` / `PCI_PAL_KERV_CLIENT_SECRET` |

The token URL is provider-specific: `PCI_PAL_ANTENNA_GET_TOKENS_URL` and `PCI_PAL_KERV_GET_TOKENS_URL` respectively.

The response returns an `accessToken` and `refreshToken`. The access token expires after approximately 5 minutes (299 seconds), but this timeout applies only to the API calls, not to the payment page session once loaded.

<!-- CONFLUENCE-ONLY: not verified in source -->
PCI-PAL staging token endpoint: `https://pcipalstaging.cloud/api/v1/token`. Production endpoint URLs are stored in Azure Key Vault secrets.

## Per-Jurisdiction Flow IDs

Each jurisdiction is assigned a distinct PCI-PAL flow ID that determines which payment form the caller agent sees. The mapping is defined in `TelephonySystem.getFlowId(serviceType)` (`TelephonySystem.java:35-48`):

| Service Type | Environment Variable Pattern | Notes |
|---|---|---|
| Probate | `PCI_PAL_{PROVIDER}_PROBATE_FLOW_ID` | |
| Divorce | `PCI_PAL_{PROVIDER}_DIVORCE_FLOW_ID` | |
| Specified Money Claims | `PCI_PAL_{PROVIDER}_STRATEGIC_FLOW_ID` | Also known as CMC |
| Financial Remedy | `PCI_PAL_{PROVIDER}_STRATEGIC_FLOW_ID` | Shares the strategic flow ID |
| Family Private Law | `PCI_PAL_{PROVIDER}_PRL_FLOW_ID` | |
| Immigration and Asylum Appeals | `PCI_PAL_{PROVIDER}_IAC_FLOW_ID` | |

Where `{PROVIDER}` is either `ANTENNA` or `KERV`. Attempting to launch a flow for an unsupported service type raises a `PaymentException`.

Note that **Financial Remedy** and **Specified Money Claims** share the same flow ID (`strategicFlowId`) in source code (`TelephonySystem.java:39-40`). There is no separate `FINANCIAL_REMEDY_FLOW_ID` environment variable despite what some Confluence documentation implies.

Each flow ID is unique per telephony system -- the Probate flow ID for Antenna differs from the Probate flow ID for Kerv. Onboarding a new service to a telephony system requires PCI-PAL to configure the flow on their side and provide the new flow ID to HMCTS.

## Launch Endpoint Flow

The end-to-end telephony launch is orchestrated by `PciPalPaymentService.getTelephonyProviderLink()` (`PciPalPaymentService.java:70-113`):

```mermaid
sequenceDiagram
    participant Agent as Calling Agent (XUI)
    participant PayAPI as ccpay-payment-app
    participant PCI as PCI-PAL (Antenna/Kerv)

    Agent->>PayAPI: Request telephony payment link
    PayAPI->>PCI: POST {tokensURL} (OAuth credentials)
    PCI-->>PayAPI: access_token
    PayAPI->>PCI: POST {launchURL} (TelephonyProviderLinkIdRequest)
    PCI-->>PayAPI: 200 { id: "..." }
    PayAPI-->>Agent: Redirect URL = {viewIdURL}{id}/framed
```

The `TelephonyProviderLinkIdRequest` JSON body sent to the launch URL has a nested structure (`TelephonyProviderLinkIdRequest.java`):

```json
{
  "flowId": "<resolved from getFlowId(serviceType)>",
  "initialValues": {
    "orderId": "RC-XXXX-XXXX-XXXX-XXXX",
    "amount": "10000",
    "currencyCode": "GBP",
    "callbackURL": "https://cft-mtls-api-mgmt-appgw.{env}.platform.hmcts.net/telephony-api/telephony/callback",
    "returnURL": "https://paybubble.{env}.platform.hmcts.net/ccd-search"
  }
}
```

| Field | Value |
|-------|-------|
| `flowId` | Resolved from `getFlowId(serviceType)` |
| `initialValues.amount` | Payment amount converted to pence (`movePointRight(2)`) |
| `initialValues.callbackURL` | Configured via `pci-pal.callback-url` property |
| `initialValues.returnURL` | Where the agent returns after the flow |
| `initialValues.orderId` | The payment reference (format `RC-XXXX-XXXX-XXXX-XXXX`) |
| `initialValues.currencyCode` | `GBP` |

On a 200 response, the service extracts the `id` field from `TelephonyProviderLinkIdResponse` and constructs the redirect URL as `{viewIdURL}{id}/framed`. The agent's browser is then redirected to this URL, which renders the PCI-PAL payment capture iframe.

On a **400** response, PCI-PAL returns "flow identifier not found" (indicating the flow ID is not configured for the system). The service throws `PciPalConfigurationException`, which maps to HTTP **412 Precondition Failed** back to the caller.

On any other non-200 response, a generic `PaymentException` is thrown.

## Callback Handling

After the caller completes (or abandons) the payment, PCI-PAL posts back to `ccpay-payment-app` via the Azure API Management (APIM) gateway with mutual TLS:

- **Endpoint**: `POST /telephony/callback`
- **Content-Type**: `application/x-www-form-urlencoded`
- **Security**: Routed through APIM (`cft-mtls-api-mgmt-appgw`) with client certificate authentication and `Ocp-Apim-Subscription-Key` header. No IDAM/S2S tokens required.
- **Handler**: `TelephonyController.updateTelephonyPaymentStatus()` (`TelephonyController.java:48`)

### Callback URL by Environment

| Environment | Callback URL |
|-------------|-------------|
| AAT | `https://cft-mtls-api-mgmt-appgw.aat.platform.hmcts.net/telephony-api/telephony/callback` |
| Demo | `https://cft-mtls-api-mgmt-appgw.demo.platform.hmcts.net/telephony-api/telephony/callback` |
| Production | `https://cft-mtls-api-mgmt-appgw.platform.hmcts.net/telephony-api/telephony/callback` |

The callback URL is configured in `charts/payment-api/values.yaml` as:
```
PCI_PAL_CALLBACK_URL: https://cft-mtls-api-mgmt-appgw.{{ .Values.global.environment }}.platform.hmcts.net/telephony-api/telephony/callback
```

### Callback Fields

The form body is bound to `TelephonyCallbackDto` (`TelephonyCallbackDto.java`):

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `orderCurrency` | string | Order currency (e.g. GBP) -- often blank | No |
| `orderAmount` | string | Amount transacted in pence (e.g. `19395` = 193.95) | Yes |
| `orderReference` | string | Payment reference (e.g. `RC-1550-0785-8859-7805`) | Yes |
| `ppAccountID` | string | PCI-PAL account ID the transaction was performed on | No |
| `transactionResult` | string | Outcome: `SUCCESS`, `DECLINE`, `ERROR`, `CANCELLED` | Yes |
| `transactionAuthCode` | string | Auth code if successful (e.g. `T1234`) | No |
| `transactionID` | string | Transaction ID from payment gateway (ePDQ PAYID) | No |
| `transactionResponseMsg` | string | Gateway response message (e.g. `Insufficient Funds`) | No |
| `cardExpiry` | string | Card expiry (e.g. `0419`) -- excluded from logging | No |
| `cardLast4` | string | Last 4 digits of card | No |
| `ppCallID` | string | Unique PCI-PAL call ID for debugging | No |
| `customData1` | string | PCI-PAL order reference + timestamp | No |
| `customData2` | string | Card type (same as cardType in older versions) | No |
| `customData3` | string | Payment method (e.g. `CreditCard`) | No |
| `customData4` | string | Reserved (always blank) | No |

The controller extracts `orderReference` and `transactionResult` (lowercased), then delegates to `paymentService.updateTelephonyPaymentStatus()` which updates the payment record's status in the database.

### Retry Behaviour

<!-- CONFLUENCE-ONLY: not verified in source -->
If PCI-PAL cannot connect to the callback API or does not receive a successful response, it retries a specified number of times. After maximum retries are exhausted, PCI-PAL emails the transaction result to a configured address.

### Security Requirements

The APIM gateway enforces:
- Mutual TLS with client certificate (PCI-PAL owns the certificate; thumbprint shared with HMCTS)
- TLS 1.2 minimum
- `Ocp-Apim-Subscription-Key` header for subscription validation
- PCI-PAL IP addresses whitelisted

The callback URL is not per-request; it is a single configured value stored via the `pci-pal.callback-url` property (`application.properties`). All telephony payments for a given environment share the same callback endpoint. The callback URL is unchanged when migrating between Antenna and Kerv.

## Payment Lifecycle and Statuses

A telephony payment moves through the following statuses:

| Stage | DB Status | Trigger |
|-------|-----------|---------|
| Payment record created | `created` | `POST /payment-groups/{ref}/telephony-card-payments` called |
| Successful payment | `success` | PCI-PAL callback with `transactionResult=SUCCESS` |
| Failed payment | `failed` | PCI-PAL callback with `transactionResult=DECLINE` or `ERROR`; or PCI-PAL returns non-200 during launch |
| Cancelled payment | `cancelled` | PCI-PAL callback with `transactionResult=CANCELLED` |

<!-- CONFLUENCE-ONLY: not verified in source -->
Telephony payments must cover all outstanding fees for a case. Partial telephony payments are not permitted. This means if multiple fees exist for a case, the telephony payment must cover the total outstanding balance.

## Configuration Properties

All telephony configuration lives in `application.properties:30-69` (overridden by environment variables in deployed environments). The property structure for each provider follows the same pattern:

```
pci-pal.{provider}.grant.type
pci-pal.{provider}.tenant.name
pci-pal.{provider}.user.name        # Antenna only; Kerv uses IDAM user ID
pci-pal.{provider}.client.id
pci-pal.{provider}.client.secret
pci-pal.{provider}.get.tokens.url
pci-pal.{provider}.launch.url
pci-pal.{provider}.view.id.url
pci-pal.{provider}.{jurisdiction}.flow.id
```

Where `{provider}` is `antenna` or `kerv`, and `{jurisdiction}` is `strategic`, `probate`, `divorce`, `prl`, or `iac`.

Additionally, Antenna has a `pci-pal.antenna.return.url` property that Kerv does not (Kerv uses the `returnURL` passed in the request body).

Shared properties (not per-provider):
- `pci-pal.callback-url` -- the callback URL sent to PCI-PAL in every launch request
- `pci-pal.api.url` -- base PCI-PAL API URL (legacy, injected into `PciPalPaymentService`)

## Adding a New Telephony Provider

When PCI-PAL migrates to a new telephony backbone (as happened 8x8 -> Antenna -> Kerv), the following changes are needed:

1. **Backend**: Create a new `TelephonySystem` subclass (use `KervTelephonySystem.java` as template). Add corresponding `application.properties` entries and Azure Key Vault secrets.
2. **Configuration files**: Update `charts/payment-api/values.yaml`, `values.preview.template.yaml`, and the Flux repository for secret mappings.
3. **Frontend** (`ccpay-web-component`): Uncomment/add radio button in `fee-summary.component.html` for the new system name. The `telephony_system` value sent to the backend must match the new system's `TELEPHONY_SYSTEM_NAME`.
4. **Validation**: Update `validateDefaultTelephonySystem()` and `getTelephonySystem()` in `PaymentGroupController` to accept the new system name.
5. **Secrets**: Obtain tenant name, client ID, client secret, and per-service flow IDs from PCI-PAL.
6. **Feature flag**: Use LaunchDarkly (`pci-pal-telephony-selection`) to control rollout.

## Gotchas

- `PciPalPaymentService.create()` (`PciPalPaymentService.java:148-153`) returns a stub `PciPalPayment` with `paymentId="spoof_id"`. The real payment session is established through `getTelephonyProviderLink()`, not `create()`.
- The amount input to `getTelephonyProviderLink()` is in pounds; pence conversion (`movePointRight(2)`) happens inside the method. PCI-PAL expects the amount in pence (base units).
- The default telephony system name is `"kerv"` (`TelephonySystem.java:33`), and `validateDefaultTelephonySystem()` in `PaymentGroupController` currently rejects any value other than `"kerv"`.
- `Financial Remedy` and `Specified Money Claims` share the same `strategicFlowId` -- there is no separate Financial Remedy flow ID despite the environment variable naming pattern suggesting otherwise.
- The OAuth access token expires in ~5 minutes, but this only applies to API calls (token, launch). Once the PCI-PAL payment page is loaded in the agent's browser, it does not expire on the 5-minute timer.
- If the agent selects the wrong telephony system (one not yet configured in PCI-PAL for that service), PCI-PAL returns HTTP 400 with "flow identifier not found", which becomes HTTP 412 to the frontend.
- The payment gateway under PCI-PAL is **Barclays ePDQ**. PCI-PAL handles the card capture and ePDQ integration; HMCTS never sees raw card data.
- The `cardExpiry` field in `TelephonyCallbackDto` is annotated with `@ToString.Exclude` to prevent it appearing in logs.

## Examples

### PCI-PAL callback handler

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/controllers/pcipal/TelephonyController.java

@RestController
@Tag(name = "Telephony", description = "Telephony Payment REST API")
public class TelephonyController {

    @PaymentExternalAPI
    @PostMapping(path = "/telephony/callback", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity updateTelephonyPaymentStatus(@Valid @ModelAttribute TelephonyCallbackDto callbackDto) {
        LOG.info("Received callback request from pci-apl : {}", callbackDto);
        paymentService.updateTelephonyPaymentStatus(
            callbackDto.getOrderReference(),
            callbackDto.getTransactionResult().toLowerCase(), // lowercased before storing
            callbackDto.toString());
        return ResponseEntity.noContent().build();
    }
}
```

### Per-jurisdiction flow ID mapping

```java
// Source: apps/payment/ccpay-payment-app/model/src/main/java/uk/gov/hmcts/payment/api/service/TelephonySystem.java

public abstract class TelephonySystem {
    // ...
    public static final String DEFAULT_SYSTEM_NAME = "kerv";

    public String getFlowId(String serviceType) {
        Map<String, String> flowIdMap = new HashMap<>();
        flowIdMap.put("Probate", this.getProbateFlowId());
        flowIdMap.put("Divorce", this.getDivorceFlowId());
        flowIdMap.put("Specified Money Claims", this.getStrategicFlowId());
        flowIdMap.put("Financial Remedy", this.getStrategicFlowId()); // shares strategic flow ID
        flowIdMap.put("Family Private Law", this.getPrlFlowId());
        flowIdMap.put("Immigration and Asylum Appeals", this.getIacFlowId());

        if (!flowIdMap.containsKey(serviceType)) {
            throw new PaymentException(
                "This telephony system does not support telephony calls for the service '" + serviceType + "'.");
        }
        return flowIdMap.get(serviceType);
    }
}
```

### Callback DTO fields

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/dto/TelephonyCallbackDto.java

@Getter
@Setter
@ToString
@Builder(builderMethodName = "telephonyCallbackWith")
public class TelephonyCallbackDto {

    private String orderCurrency;
    @NotNull
    private String orderAmount;
    @NotNull
    private String orderReference;
    private String ppAccountID;
    @NotNull
    private String transactionResult; // SUCCESS, DECLINE, ERROR, or CANCELLED
    private String transactionAuthCode;
    private String transactionID;
    private String transactionResponseMsg;
    @ToString.Exclude  // excluded from logs to avoid leaking card data
    private String cardExpiry;
    private String cardLast4;
    private String ppCallID;
    private String customData1;
    private String customData2;
    private String customData3;
    private String customData4;
}
```

## See also

- [Payment Lifecycle](payment-lifecycle.md) — how telephony payments fit into the full payment lifecycle and status model
- [How-to: Configure a PCI-PAL Flow](../how-to/configure-pci-pal-flow.md) — step-by-step guide for adding a new jurisdiction or migrating providers
- [Reference: API Payments](../reference/api-payments.md) — `POST /telephony/callback` endpoint spec and `TelephonyCallbackDto` fields
- [Reconciliation](reconciliation.md) — how telephony payments (via Barclays ePDQ) feed into the Liberata reconciliation process
- [Glossary](../reference/glossary.md) — definitions for PCI-PAL, Flow ID, CTSC, APIM
