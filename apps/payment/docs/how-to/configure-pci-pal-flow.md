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
  - ccpay-payment-app:api/src/main/resources/application-local.properties
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/PaymentServiceImpl.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/configuration/security/SpringSecurityConfiguration.java
  - ccpay-payment-app:gov-pay-client/src/main/java/uk/gov/hmcts/payment/api/external/client/dto/TelephonyProviderLinkIdRequest.java
  - ccpay-bubble:express/mvc/controller/PayhubController.js
  - ccpay-bubble:config/custom-environment-variables.yaml
  - cnp-flux-config:apps/fees-pay/ccpay-payment-api/prod.yaml
  - cnp-flux-config:apps/fees-pay/ccpay-payment-api/demo.yaml
  - cnp-flux-config:apps/fees-pay/ccpay-bubble-frontend/prod.yaml
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
sources_sha:
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/PciPalPaymentService.java": "cd90241f94938ecec08b8768ce5e2bb4fc4fa5ab"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/TelephonySystem.java": "e73670ad6d187564188d1f828e551dc1554074a9"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/AntennaTelephonySystem.java": "c144ef6b6c298b35f14cf2400b4d8fad4d57b3e7"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/KervTelephonySystem.java": "c144ef6b6c298b35f14cf2400b4d8fad4d57b3e7"
  "ccpay-payment-app:api/src/main/resources/application.properties": "1908ddc16a3f086c816e17c1ff8b27bee4b8f414"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/PaymentGroupController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/pcipal/TelephonyController.java": "705ea069e3264715ed4897589ba7a3adf0ed9a8e"
  "ccpay-payment-app:api-contract/src/main/java/uk/gov/hmcts/payment/api/contract/TelephonyCardPaymentsRequest.java": "cd90241f94938ecec08b8768ce5e2bb4fc4fa5ab"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/dto/TelephonyCallbackDto.java": "5c28ea10564258d9c193bead87675b85afa50c21"
  "ccpay-payment-app:charts/payment-api/values.yaml": "f4fb59095aad65f13e8673472f64f4cdb246af7a"
  "ccpay-payment-app:api/src/main/resources/application-local.properties": "1908ddc16a3f086c816e17c1ff8b27bee4b8f414"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/PaymentServiceImpl.java": "109655a0103cf081d4da2680872c7f77351f6e16"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/configuration/security/SpringSecurityConfiguration.java": "e8033dfe3c25862046cd940eadb7522175cb4aba"
  "ccpay-payment-app:gov-pay-client/src/main/java/uk/gov/hmcts/payment/api/external/client/dto/TelephonyProviderLinkIdRequest.java": "f3b63715036f0e4f237e3dd50832209f60de88ad"
  "ccpay-bubble:express/mvc/controller/PayhubController.js": "974c0d8611cdab912a2929dae44cd50c17e8bad5"
  "ccpay-bubble:config/custom-environment-variables.yaml": "efbbb7d67f100b672667bcae1e12e542e5e1013d"
  "cnp-flux-config:apps/fees-pay/ccpay-payment-api/prod.yaml": "b8d4f674f4f79c6505b4b4869ee3e96d0925ae3e"
  "cnp-flux-config:apps/fees-pay/ccpay-payment-api/demo.yaml": "67d250f6d9e01aea4cca1fccea0335de837673c4"
  "cnp-flux-config:apps/fees-pay/ccpay-bubble-frontend/prod.yaml": "fa5de470940abe2cf8b11f32f40baf0db27defec"
---

## TL;DR

- PCI-PAL telephony payments are configured per jurisdiction via a `flow.id` property mapped to an OAuth-secured PCI-PAL provider (currently **Kerv** only).
- Each new jurisdiction requires: a flow ID issued by PCI-PAL, OAuth credentials for the Kerv provider, and a code change to register the service type in `TelephonySystem.getFlowId()`.
- **Kerv is the sole active provider.** The `validateDefaultTelephonySystem` method in `PaymentGroupController` rejects any value other than `"kerv"`. Antenna configuration remains in code but is unreachable at runtime (`PaymentGroupController.java:629-639`).
- The OAuth token exchange POSTs `grant_type`, `tenantname`, `username`, `client_id`, `client_secret` to the provider's token URL (`PciPalPaymentService.java:116-132`). For Kerv, `username` is the obfuscated IDAM user ID of the logged-in CTSC staff member.
- After authentication, a launch request sends the `flowId`, amount (in pence), callback/return URLs, and order ID to the provider's launch endpoint.
- The API request body accepts an optional `telephony_system` field (`TelephonyCardPaymentsRequest.java:55-56`); when it is absent or empty, `validateDefaultTelephonySystem` sets it to `"kerv"` (`PaymentGroupController.java:632-634`).

## Prerequisites

- Access to the PCI-PAL admin portal (Kerv/Trinity) for the target environment.
- The jurisdiction's service name as it appears in `ccpay-payment-app` (e.g. `"Probate"`, `"Divorce"`, `"Financial Remedy"`, `"Family Private Law"`, `"Immigration and Asylum Appeals"`, `"Specified Money Claims"`).
- Ability to create Azure DevOps pipeline variables or Vault secrets for the target environment.
- A clone of `ccpay-payment-app` for the code change.
- Contact details for the PCI-PAL provider team (historically via Andy Briggs, the overall Project Manager for the PCI-PAL contract).
<!-- CONFLUENCE-ONLY: not verified in source -->

## Steps

### 1. Obtain a flow ID from PCI-PAL

Contact the PCI-PAL provider and request a new telephony flow for the jurisdiction. They provision a flow and return a **flow ID** (a string identifier). Also confirm:

- The **tenant name** for your organisation.
- The **OAuth client ID** and **client secret** for your application.
- The **token URL**, **launch URL**, and **view ID URL** for the environment (these are typically shared across jurisdictions within a single provider).

### 2. Choose the target provider

All new jurisdictions **must use Kerv**. The `validateDefaultTelephonySystem` method in `PaymentGroupController.java:629-639` rejects any telephony system value other than `"kerv"`, throwing `TelephonyServiceException` (HTTP 422).

<!-- DIVERGENCE: Confluence "Kerv Telephony LLD" says default is "antenna" when telephony_system is missing, but PaymentGroupController.java:632-634 defaults to KervTelephonySystem.TELEPHONY_SYSTEM_NAME ("kerv") and lines 636-637 reject non-kerv. Source wins. -->

- `KervTelephonySystem` — configured with `PCI_PAL_KERV_*` environment variables; the only reachable system.
- `AntennaTelephonySystem` — configured with `PCI_PAL_ANTENNA_*` environment variables; unreachable, because validation rejects `"antenna"` before the bean is resolved. Configuration is still wired for both.

Both providers carry a full property set for the same jurisdictions: Probate, Divorce, Specified Money Claims, Financial Remedy, Family Private Law, Immigration and Asylum Appeals (`application.properties:41-55`, `:57-70`).

PCI-PAL addresses each telephony system as a numbered session: the local-profile defaults launch and view Kerv sessions under `/session/1288/` and Antenna sessions under `/session/303/` on `pcipalstaging.cloud` (`application-local.properties:135-136`, `:150-151`). Deployed environments override the launch and view URLs from Key Vault.

### 3. Add the flow ID property

Add an environment variable for the new flow ID, following the naming convention of existing flows in the `pci-pal.*` block (`application.properties:30-70`). The pattern is:

```properties
# Kerv (active provider)
pci-pal.kerv.<jurisdiction>.flow.id=${PCI_PAL_KERV_<JURISDICTION>_FLOW_ID:}
```

Add the Antenna equivalent alongside it, in the Antenna block at `application.properties:41-55`:

```properties
# Antenna (retained, not reachable)
pci-pal.antenna.<jurisdiction>.flow.id=${PCI_PAL_ANTENNA_<JURISDICTION>_FLOW_ID:}
```

Flow-ID properties exist for `probate`, `divorce`, `prl` (Family Private Law), `iac` (Immigration and Asylum Appeals) and `strategic`, which `getFlowId` returns for both Specified Money Claims and Financial Remedy (`application.properties:51-55`, `:66-70`, `TelephonySystem.java:39-40`).

Each provider holds its own set of these properties, so a jurisdiction's Antenna flow ID and its Kerv flow ID are separate values.

The strategic flow ID is shared between services that do not have a dedicated MID (Merchant ID).
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

The service type string must **exactly match** the `serviceDescription` returned by the Reference Data service (`rd-location-ref-api`) for the `case_type` passed in the request. This is looked up via `referenceDataService.getOrganisationalDetail(...)` in `PaymentGroupController.java:572` and passed straight to `getFlowId` (`PaymentGroupController.java:668-670`), so the mapping key is reference data's wording, not the case type.

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

The `grant_type` defaults to `client_credentials` (`pci-pal.antenna.grant.type` and `pci-pal.kerv.grant.type`) and is not typically stored as a secret.

**Username handling:** For Kerv, the `username` parameter in the OAuth token exchange is the **obfuscated IDAM user ID** of the logged-in CTSC staff member — `getIdamUserId` resolves the `sub` claim and passes `String.valueOf(Objects.hash(sub))` (`PaymentGroupController.java:673-686`) — not a static secret. The Antenna branch of the same ternary uses the static `pci-pal.antenna.user.name` value injected into the controller (`PaymentGroupController.java:142-143`, `:600`), which the chart binds to the `pci-pal-antenna-user-name` Vault secret (`charts/payment-api/values.yaml:204-205`). There is no Kerv equivalent secret to create.

If the provider-level credentials already exist, you only need to add the new `pci-pal-kerv-<jurisdiction>-flow-id` secret to Vault and the Helm chart.

### 6. Set the callback URL

The `PCI_PAL_CALLBACK_URL` is set in the Helm chart and follows this template (`charts/payment-api/values.yaml:43`):

```
https://cft-mtls-api-mgmt-appgw.{{ .Values.global.environment }}.platform.hmcts.net/telephony-api/telephony/callback
```

Production sets it explicitly in Flux, and the host carries the `prod` segment (`cnp-flux-config:apps/fees-pay/ccpay-payment-api/prod.yaml:24`):
```
https://cft-mtls-api-mgmt-appgw.prod.platform.hmcts.net/telephony-api/telephony/callback
```

The callback endpoint (`POST /telephony/callback`) accepts `application/x-www-form-urlencoded` content and reaches the API through the Azure API Management gateway over mTLS (client certificate + `Ocp-Apim-Subscription-Key` header). The path also sits in the service-only Spring Security filter chain (`SpringSecurityConfiguration.java:53-75`), so the request arriving at the pod must still carry a valid `ServiceAuthorization` S2S token; no user token is involved. The handler extracts `orderReference` and `transactionResult` from the callback (`TelephonyController.java:51-55`).

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

2. **Session launch** — `PciPalPaymentService.getTelephonyProviderLink()` POSTs JSON to the launch URL with `Authorization: Bearer <accessToken>`. The request DTO carries no Jackson naming strategy, so the wire field names are camelCase exactly as declared (`TelephonyProviderLinkIdRequest.java:16-32`):
   ```json
   {
     "flowId": "<flowId>",
     "initialValues": {
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
5. Check the application logs for errors. Two different faults produce the identical message `This telephony system does not support telephony calls for the service '<X>'.`, so the HTTP status is the only discriminator:
   - **HTTP 400** — `PaymentException` from `getFlowId()`: the service type has no entry in `flowIdMap` (`TelephonySystem.java:44-46`, handler at `PaymentGroupController.java:725-729`). Fix the mapping.
   - **HTTP 412** — `PciPalConfigurationException`: the mapping resolved, but PCI-PAL answered the launch call with 400 (`PciPalPaymentService.java:99-104`, handler at `PaymentGroupController.java:743-747`). The flow ID is not configured on the PCI-PAL side. The PCI-PAL response body is not propagated to the caller; read it from the log line at `PciPalPaymentService.java:101-103`, which also logs the flow ID, launch URL and view URL actually used.
   - **HTTP 422** — `TelephonyServiceException: "Invalid telephony system name"`: the `telephony_system` field was set to something other than `"kerv"` (`PaymentGroupController.java:636-637`, handler at `:737-741`).
6. If using the DEMO environment, verify the callback URL resolves to `https://cft-mtls-api-mgmt-appgw.demo.platform.hmcts.net/telephony-api/telephony/callback` (`cnp-flux-config:apps/fees-pay/ccpay-payment-api/demo.yaml:15`).

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
  The API does not police this: `amount` is validated only for presence, positivity and at most two decimal places (`TelephonyCardPaymentsRequest.java:34-38`) and is never compared with the payment group's outstanding fee total.
- A repeat callback for a payment already in `success` changes nothing. `updateTelephonyPaymentStatus` skips the status write, the Service Bus callback and the `telephony_callback` payload insert, and records a `DUPLICATE_STATUS_UPDATE` audit event instead (`PaymentServiceImpl.java:114-148`). The endpoint still answers `204`, so PCI-PAL cannot tell a duplicate from a first delivery — the audit event is the only trace.
- Address Verification Service (AVS) is switched off/disabled on the PCI-PAL side. Billing address is not captured or validated.
<!-- CONFLUENCE-ONLY: not verified in source -->
- Whether PayBubble offers the system-selection radio buttons is decided by the `TELEPHONY_FEATURE` environment variable, bound to the `pci-pal.telephony-selection` config key (`ccpay-bubble:config/custom-environment-variables.yaml:14`) and served to the Angular app from `GET /pci-pal-telephony-selection/feature`. The buttons appear only when the resolved value is exactly `enabled`; any other value, including the unsubstituted placeholder, yields `false` (`ccpay-bubble:express/mvc/controller/PayhubController.js:52-67`). Production sets it to `enabled` (`cnp-flux-config:apps/fees-pay/ccpay-bubble-frontend/prod.yaml:25`), so the Antenna option is on screen in production even though the API answers `422` for it.
<!-- DIVERGENCE: Confluence presents `pci-pal-telephony-selection` and `pci-pal-antenna-feature` as LaunchDarkly flags. Source: telephony selection is a node-config value driven by the TELEPHONY_FEATURE env var (ccpay-bubble:express/mvc/controller/PayhubController.js:52-67), not a LaunchDarkly flag; `pci-pal-antenna-feature` is stubbed only in ccpay-payment-app unit tests and is read by no production code. Source wins. -->

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
