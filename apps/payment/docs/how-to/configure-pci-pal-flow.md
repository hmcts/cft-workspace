---
title: Configure Pci Pal Flow
topic: telephony
diataxis: how-to
product: payment
audience: both
sources:
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/PciPalPaymentService.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/TelephonySystem.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/AntennaTelephonySystem.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/KervTelephonySystem.java
  - ccpay-payment-app:api/src/main/resources/application.properties
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentGroupController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/pcipal/TelephonyController.java
  - ccpay-payment-app:api-contract/src/main/java/uk/gov/hmcts/payment/api/contract/TelephonyCardPaymentsRequest.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/TelephonyCallbackDto.java
  - ccpay-payment-app:charts/payment-api/values.yaml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/payment/ccpay-payment-app/model/src/main/java/uk/gov/hmcts/payment/api/service/TelephonySystem.java
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/dto/TelephonyCallbackDto.java
confluence:
  - id: "1859518531"
    title: "Kerv Telephony LLD"
    last_modified: "2025-07-07T00:00:00Z"
    space: "DTSFP"
  - id: "1825014500"
    title: "Antenna Telephony LLD"
    last_modified: "2024-12-30T00:00:00Z"
    space: "DTSFP"
  - id: "865992841"
    title: "Technical Specification - PCI Pal (NOC hosted)"
    last_modified: "2020-08-20T00:00:00Z"
    space: "RP"
  - id: "1914813835"
    title: "Telephony"
    last_modified: "2025-01-01T00:00:00Z"
    space: "DTSFP"
  - id: "1444745314"
    title: "Telephony Payments - PCIPAL Antenna"
    last_modified: "2020-09-17T00:00:00Z"
    space: "RP"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- PCI-PAL telephony payments are configured per jurisdiction via a `flow.id` property mapped to an OAuth-secured PCI-PAL provider (currently **Kerv** only).
- Each new jurisdiction requires: a flow ID issued by PCI-PAL, OAuth credentials for the Kerv provider, and a code change to register the service type in `TelephonySystem.getFlowId()`.
- **Kerv is the sole active provider.** The `validateDefaultTelephonySystem` method in `PaymentGroupController` rejects any value other than `"kerv"`. Antenna configuration remains in code but is disabled at runtime (`PaymentGroupController.java:619-629`).
- The OAuth token exchange POSTs `grant_type`, `tenantname`, `username`, `client_id`, `client_secret` to the provider's token URL (`PciPalPaymentService.java:116-132`). For Kerv, `username` is the obfuscated IDAM user ID of the logged-in CTSC staff member.
- After authentication, a launch request sends the `flowId`, amount (in pence), callback/return URLs, and order ID to the provider's launch endpoint.
- The API request body accepts an optional `telephony_system` field; if omitted it defaults to `"kerv"` (`TelephonyCardPaymentsRequest.java:55-56`).

## Prerequisites

- Access to the PCI-PAL admin portal (Kerv/Trinity) for the target environment.
- The jurisdiction's service name as it appears in `ccpay-payment-app` (e.g. `"Probate"`, `"Divorce"`, `"Financial Remedy"`, `"Family Private Law"`, `"Immigration and Asylum Appeals"`, `"Specified Money Claims"`).
- Ability to create Azure DevOps pipeline variables or Vault secrets for the target environment.
- A clone of `ccpay-payment-app` for the code change.
- Contact details for the PCI-PAL provider team (historically via Andy Briggs, the overall Project Manager for the PCI-PAL contract).
<!-- CONFLUENCE-ONLY: not verified in source -->

## Steps

### 1. Obtain a flow ID from PCI-PAL

Contact the PCI-PAL provider (Antenna or Kerv) and request a new telephony flow for your jurisdiction. They will provision a flow and return a **flow ID** (a string identifier). You will also confirm:

- The **tenant name** for your organisation.
- The **OAuth client ID** and **client secret** for your application.
- The **token URL**, **launch URL**, and **view ID URL** for the environment (these are typically shared across jurisdictions within a single provider).

### 2. Choose the target provider

Currently all new jurisdictions **must use Kerv**. The `validateDefaultTelephonySystem` method in `PaymentGroupController.java:619-629` rejects any telephony system value other than `"kerv"`.

<!-- DIVERGENCE: Confluence "Kerv Telephony LLD" says default is "antenna" when telephony_system is missing, but PaymentGroupController.java:622-623 defaults to KervTelephonySystem.TELEPHONY_SYSTEM_NAME ("kerv") and line 626 rejects non-kerv. Source wins. -->

- `KervTelephonySystem` — configured with `PCI_PAL_KERV_*` environment variables; the only active system.
- `AntennaTelephonySystem` — configured with `PCI_PAL_ANTENNA_*` environment variables; **disabled at runtime** (validation rejects "antenna"). Configuration still present for legacy/rollback purposes.

Existing jurisdictions (both providers have config): Probate, Divorce, Specified Money Claims, Financial Remedy, Family Private Law, Immigration and Asylum Appeals.

The PCI-PAL staging environment uses tenant ID **1288** for Kerv (303 for Antenna).
<!-- CONFLUENCE-ONLY: not verified in source -->

### 3. Add the flow ID property

Add an environment variable for the new flow ID, following the naming convention of existing flows in `application.properties:56-69`. The pattern is:

```properties
# Kerv (active provider)
pci-pal.kerv.<jurisdiction>.flow.id=${PCI_PAL_KERV_<JURISDICTION>_FLOW_ID:}
```

For completeness (and future rollback capability), also add the Antenna equivalent in lines 40-54:

```properties
# Antenna (disabled but retained)
pci-pal.antenna.<jurisdiction>.flow.id=${PCI_PAL_ANTENNA_<JURISDICTION>_FLOW_ID:}
```

Existing flow IDs are configured for: probate, divorce, prl (Family Private Law), iac (Immigration and Asylum Appeals), and strategic (shared by Specified Money Claims and Financial Remedy).

Each flow ID is unique per provider per service. The strategic flow ID is shared between services that don't have a dedicated MID (Merchant ID).
<!-- CONFLUENCE-ONLY: not verified in source -->

### 4. Register the service type in TelephonySystem

The mapping is defined in the abstract base class `TelephonySystem.getFlowId(serviceType)` (`TelephonySystem.java:35-48`). It maps a service type string to the corresponding flow ID property value. Both `AntennaTelephonySystem` and `KervTelephonySystem` inherit this method. If the service type is not found, a `PaymentException` is thrown with message: `"This telephony system does not support telephony calls for the service '<serviceType>'."`.

Current map entries (`TelephonySystem.java:37-42`):

| Service Type String | Flow ID Field |
|---|---|
| `"Probate"` | `probateFlowId` |
| `"Divorce"` | `divorceFlowId` |
| `"Specified Money Claims"` | `strategicFlowId` |
| `"Financial Remedy"` | `strategicFlowId` |
| `"Family Private Law"` | `prlFlowId` |
| `"Immigration and Asylum Appeals"` | `iacFlowId` |

To add a new jurisdiction:

1. Add a new field to `TelephonySystem.java` (e.g. `private String newServiceFlowId;`).
2. Add an override getter in both `KervTelephonySystem` and `AntennaTelephonySystem` with the appropriate `@Value` annotation.
3. Add the `flowIdMap.put(...)` entry in `getFlowId()`.

```java
// In TelephonySystem.java
flowIdMap.put("<Your Service Type>", this.getNewServiceFlowId());
```

The service type string must **exactly match** the `serviceDescription` returned by the Reference Data service (`rd-location-ref-api`) for the `case_type` passed in the request. This is looked up via `referenceDataService.getOrganisationalDetail(...)` in `PaymentGroupController.java:562`.

### 5. Configure OAuth credentials in the environment

Secrets are stored in Azure Key Vault under the `ccpay` namespace and mounted into the Pod via the Helm chart (`charts/payment-api/values.yaml`). For a new jurisdiction you typically only need to add the flow ID secret; provider-level credentials are already shared.

**Kerv secrets (Helm secret names -> application properties):**

| Vault Secret Name | Application Property | Purpose |
|---|---|---|
| `pci-pal-kerv-tenant-name` | `pci-pal.kerv.tenant.name` | PCI-PAL tenant name |
| `pci-pal-kerv-client-id` | `pci-pal.kerv.client.id` | OAuth client ID |
| `pci-pal-kerv-client-secret` | `pci-pal.kerv.client.secret` | OAuth client secret |
| `pci-pal-kerv-get-tokens-url` | `pci-pal.kerv.get.tokens.url` | Token endpoint URL |
| `pci-pal-kerv-launch-url` | `pci-pal.kerv.launch.url` | Launch endpoint URL |
| `pci-pal-kerv-view-id-url` | `pci-pal.kerv.view.id.url` | View ID base URL (redirect built as `{viewIdURL}{id}/framed`) |
| `pci-pal-kerv-<jurisdiction>-flow-id` | `pci-pal.kerv.<jurisdiction>.flow.id` | The flow ID obtained in step 1 |

The corresponding environment variables follow the pattern `PCI_PAL_KERV_<PROPERTY>` (e.g. `PCI_PAL_KERV_PROBATE_FLOW_ID`).

The `grant_type` defaults to `client_credentials` in `application.properties:57` and is not typically stored as a secret.

**Username handling:** For Kerv, the `username` parameter in the OAuth token exchange is the **obfuscated IDAM user ID** of the logged-in CTSC staff member (hashed via `Objects.hash(idamUserId)` in `PaymentGroupController.java:668`), not a static secret. This differs from Antenna, which used a static `pci-pal-antenna-user-name` secret.

If the provider-level credentials already exist, you only need to add the new `pci-pal-kerv-<jurisdiction>-flow-id` secret to Vault and the Helm chart.

### 6. Set the callback URL

The `PCI_PAL_CALLBACK_URL` is set in the Helm chart and follows this template (`charts/payment-api/values.yaml:43`):

```
https://cft-mtls-api-mgmt-appgw.{{ .Values.global.environment }}.platform.hmcts.net/telephony-api/telephony/callback
```

For production, this resolves to:
```
https://cft-mtls-api-mgmt-appgw.platform.hmcts.net/telephony-api/telephony/callback
```

The callback endpoint (`POST /telephony/callback`) accepts `application/x-www-form-urlencoded` content and is secured via mTLS through the Azure API Management gateway (client certificate + `Ocp-Apim-Subscription-Key` header). It extracts `orderReference` and `transactionResult` from the callback (`TelephonyController.java:48-52`).

The `transactionResult` field has four possible values: `SUCCESS`, `DECLINE`, `ERROR`, `CANCELLED`.

The full callback payload fields (`TelephonyCallbackDto.java`):

| Field | Type | Description |
|---|---|---|
| `orderCurrency` | string | Currency code (often empty) |
| `orderAmount` | string (required) | Amount in base units (pence) |
| `orderReference` | string (required) | Payment reference (RC-XXXX-XXXX-XXXX-XXXX) |
| `ppAccountID` | string | Maps to Flow ID |
| `transactionResult` | string (required) | SUCCESS, DECLINE, ERROR, or CANCELLED |
| `transactionAuthCode` | string | Auth code if successful |
| `transactionID` | string | Transaction ID from payment gateway |
| `transactionResponseMsg` | string | Gateway response (decline/error reason) |
| `cardExpiry` | string | Card expiry (MMYY) |
| `cardLast4` | string | Last 4 digits of card |
| `ppCallID` | string | Maps to session ID |
| `customData1` | string | Order reference with timestamp |
| `customData2` | string | Card brand (e.g. MASTERCARD) |
| `customData3` | string | Payment method (e.g. CreditCard) |
| `customData4` | string | Reserved (always empty) |

This callback URL is sent to PCI-PAL during the launch request and is the same for all jurisdictions within an environment. It is not per-request configurable.

### 7. Understand the launch flow (reference)

The full PCI-PAL interaction triggered by `POST /payment-groups/{payment-group-reference}/telephony-card-payments`:

1. **Token acquisition** — `PciPalPaymentService.getPaymentProviderAuthorisationTokens()` POSTs to the tokens URL with form-encoded params:
   - `grant_type` (typically `client_credentials`)
   - `tenantname`
   - `username` (for Kerv: obfuscated IDAM ID; for Antenna: static secret)
   - `client_id`
   - `client_secret`
   
   Returns: `accessToken` and `refreshToken`.

2. **Session launch** — `PciPalPaymentService.getTelephonyProviderLink()` POSTs JSON to the launch URL with `Authorization: Bearer <accessToken>`:
   ```json
   {
     "FlowId": "<flowId>",
     "InitialValues": {
       "orderId": "RC-XXXX-XXXX-XXXX-XXXX",
       "amount": "10000",
       "currencyCode": "GBP",
       "callbackURL": "<callback-url>",
       "returnURL": "<paybubble-return-url>"
     }
   }
   ```
   Note: `amount` is in **pence** (base units) — the service calls `movePointRight(2)` on the decimal amount (`PciPalPaymentService.java:80`).

3. **View redirect** — The response contains a session ID. The redirect URL is built as `{viewIdURL}{sessionId}/framed`. The `/framed` suffix removes the PCI-PAL navigation banner (logout/password reset).

4. **PayBubble handling** — PayBubble stores the `accessToken` and `refreshToken` in cookies, then submits a form to the view URL to display the PCI-PAL card-details page within an iframe.

5. **Callback** — After payment completes, PCI-PAL POSTs the result to the callback URL (independent server-to-server call).

### 8. Deploy

1. Merge the code change (new flow ID property + `TelephonySystem` mapping) via PR to `master`.
2. Ensure the Vault secrets are set for the target environment before the deployment reaches it.
3. Deploy `ccpay-payment-app` through the standard pipeline.
4. Production deployments require a ServiceNow Change Request (CR). The feature should be UAT-tested in the DEMO environment first.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Verify

1. In the target environment, trigger a telephony payment for the new jurisdiction via PayBubble (select "Trinity" as the telephony system in the UI).
2. Confirm the API returns HTTP 201 with a response body containing `_links.next_url.href` following the pattern `{viewIdURL}{sessionId}/framed` (`PciPalPaymentService.java:97`).
3. Confirm the initial payment status is `Initiated` in PayBubble.
4. Complete a test payment in the PCI-PAL card-details flow and confirm the callback arrives at `POST /telephony/callback`, updating the payment status to `success` in the database.
5. Check the application logs for errors:
   - `PaymentException: "This telephony system does not support telephony calls for the service '<X>'"` — the `getFlowId()` mapping was not found for the service type.
   - `PciPalConfigurationException` (HTTP 400 from PCI-PAL) — the flow ID is invalid or not configured on the PCI-PAL side. The PCI-PAL error message typically says `"flow identifier not found"`.
   - `TelephonyServiceException: "Invalid telephony system name"` — the `telephony_system` field was set to something other than `"kerv"`.
6. If using the DEMO environment, verify the callback URL resolves to `https://cft-mtls-api-mgmt-appgw.demo.platform.hmcts.net/telephony-api/telephony/callback`.

### Payment status lifecycle

| Stage | DB Status | Notes |
|---|---|---|
| Payment created | `created` | Shows as "Initiated" in PayBubble |
| PCI-PAL returns success | `success` | Callback received with `transactionResult=SUCCESS` |
| PCI-PAL returns failure | `failed` | Callback with DECLINE or ERROR |
| User cancels | `cancelled` | Callback with CANCELLED |

## Business rules

- Telephony payments must cover **all outstanding fees** for a case. Partial telephony payments are not permitted.
<!-- CONFLUENCE-ONLY: not verified in source -->
- Duplicate callback rejection: if a payment has already been marked as `success`, a subsequent callback for the same `orderReference` is rejected to prevent duplicate reconciliation entries sent to Liberata.
<!-- CONFLUENCE-ONLY: not verified in source -->
- Address Verification Service (AVS) is switched off/disabled on the PCI-PAL side. Billing address is not captured or validated.
<!-- CONFLUENCE-ONLY: not verified in source -->
- The LaunchDarkly feature flag `pci-pal-antenna-feature` historically controlled Antenna availability. A newer flag `pci-pal-telephony-selection` controls whether PayBubble displays the system-selection radio buttons (Antenna vs Trinity/Kerv).
<!-- CONFLUENCE-ONLY: not verified in source -->

## Examples

### TelephonySystem: flow ID map and default system name

```java
// Source: apps/payment/ccpay-payment-app/model/src/main/java/uk/gov/hmcts/payment/api/service/TelephonySystem.java

public abstract class TelephonySystem {
    // ...
    public static final String DEFAULT_SYSTEM_NAME = "kerv";

    public String getFlowId(String serviceType) {
        Map<String, String> flowIdMap = new HashMap<>();
        flowIdMap.put("Probate",                      this.getProbateFlowId());
        flowIdMap.put("Divorce",                      this.getDivorceFlowId());
        flowIdMap.put("Specified Money Claims",        this.getStrategicFlowId());
        flowIdMap.put("Financial Remedy",             this.getStrategicFlowId()); // shares strategic
        flowIdMap.put("Family Private Law",           this.getPrlFlowId());
        flowIdMap.put("Immigration and Asylum Appeals", this.getIacFlowId());

        if (!flowIdMap.containsKey(serviceType)) {
            throw new PaymentException(
                "This telephony system does not support telephony calls for the service '"
                    + serviceType + "'.");
        }
        return flowIdMap.get(serviceType);
    }
}
```

To add a new jurisdiction, add a field (e.g. `newServiceFlowId`) to `TelephonySystem`, override the getter in both `KervTelephonySystem` and `AntennaTelephonySystem`, and add a `flowIdMap.put(...)` entry.

### TelephonyCallbackDto: PCI-PAL posts these fields on payment completion

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/dto/TelephonyCallbackDto.java

@Getter @Setter @ToString
@Builder(builderMethodName = "telephonyCallbackWith")
public class TelephonyCallbackDto {
    private String orderCurrency;
    @NotNull private String orderAmount;       // pence (e.g. "48850" = £488.50)
    @NotNull private String orderReference;    // RC-XXXX-XXXX-XXXX-XXXX
    private String ppAccountID;
    @NotNull private String transactionResult; // SUCCESS, DECLINE, ERROR, or CANCELLED
    private String transactionAuthCode;
    private String transactionID;
    private String transactionResponseMsg;
    @ToString.Exclude
    private String cardExpiry;  // excluded from logs
    private String cardLast4;
    private String ppCallID;
    private String customData1;
    private String customData2;
    private String customData3;
    private String customData4;
}
```

## See also

- [PCI-PAL Telephony](../explanation/pci-pal-telephony.md) — how the telephony system works, Antenna vs Kerv architecture, and callback handling
- [Reference: API Payments](../reference/api-payments.md) — `POST /telephony/callback` endpoint spec and `TelephonyCallbackDto` fields
- [How-to: Integrate from a Service](integrate-from-a-service.md) — general service onboarding including S2S registration
- [Glossary](../reference/glossary.md) — definitions for PCI-PAL, Flow ID, CTSC, APIM
