---
title: Glossary
topic: reference
diataxis: reference
product: payment
audience: both
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
---

# Payment Glossary

Terms used across the Fees & Pay documentation.

---

**APIM** — Azure API Management. The gateway layer that sits between external callers (Liberata, Exela/XBP) and the internal payment microservices. Handles mTLS certificate validation, S2S token generation, and field remapping for Liberata responses. See [Architecture](../explanation/architecture.md).

**Apportionment** — The rules that distribute a single payment amount across multiple outstanding fees within a Service Request. Fees are paid in chronological order by `dateCreated` (earliest first). Controlled by the `apportion-feature` LaunchDarkly flag. See [Payment Lifecycle](../explanation/payment-lifecycle.md).

**ASB** — Azure Service Bus. The async messaging layer between `ccpay-payment-app` and consuming services. Two topics are used: `ccpay-service-callback-topic` (payment status) and `ccpay-service-request-cpo-update-topic` (CPO lifecycle). See [Payment Status Callbacks](payment-status-callbacks.md).

**BGC slip** — Bank Giro Credit slip number. A max-6-digit reference from Exela identifying the banking batch/transaction for a bulk-scan payment. See [Bulk Scan Payments](../explanation/bulk-scan-payments.md).

**Callback URL** — The endpoint a consuming service registers when creating a Service Request (field `call_back_url`) or legacy card payment (header `service-callback-url`). The platform sends payment status updates to this URL via Azure Service Bus and `ccpay-functions-node`. See [Payment Status Callbacks](payment-status-callbacks.md).

**ccpay-functions-node** — An Azure Function (Node.js, not in the payment repos) that subscribes to `ccpay-service-callback-topic` and delivers payment status payloads to consuming services via HTTP PUT. Retries 6 times at 30-minute intervals before dead-lettering. See [Payment Status Callbacks](payment-status-callbacks.md).

**CPO** — Case Payment Orders. The API (`cpo-case-payment-orders-api`) that links service requests to CCD cases. Updates are published via `ccpay-service-request-cpo-update-topic` and consumed by `ccpay-service-request-cpo-update-service`. See [Payment Lifecycle](../explanation/payment-lifecycle.md).

**CTSC** — Courts and Tribunals Service Centre. The operational teams that process bulk-scanned payments and take telephone payments via PCI-PAL. See [PCI-PAL Telephony](../explanation/pci-pal-telephony.md).

**DCN** — Document Control Number. A 21-digit numeric identifier assigned to each scanned document/payment by the scanning supplier (Exela). Used as the key to match bulk-scan metadata with Exela financial data. See [Bulk Scan Payments](../explanation/bulk-scan-payments.md).

**Envelope** — A logical grouping of one or more DCNs submitted together in a single bulk-scan submission. Progresses through statuses `INCOMPLETE` -> `COMPLETE` -> `PROCESSED`. See [API — Bulk Scanning](api-bulk-scanning.md).

**Exela / XBP** — The scanning supplier contracted by HMCTS to open postal envelopes, scan documents, and bank cheques/cash/postal orders. Also known as XBP (current trading name). See [Bulk Scan Payments](../explanation/bulk-scan-payments.md).

<!-- REVIEW: The FF4j flag name for the callback feature is "payment-callback-service" (from CallbackService.FEATURE), not "service-callback". See model/src/main/java/uk/gov/hmcts/payment/api/service/CallbackService.java:8 and FF4jConfiguration.java:59-63. -->
**FF4j** — Feature Flags for Java. A static/infrastructure feature-flag mechanism used in `ccpay-payment-app` for service-level gates (e.g. `payment-cancel`, `service-callback`, `bulk-scan-check`). Contrasts with LaunchDarkly which handles dynamic runtime toggles. See [Overview](../explanation/overview.md).

**Flow ID** — A PCI-PAL identifier that routes a telephony payment to the correct payment form for a given jurisdiction. Each service (Probate, Divorce, PRL, IAC, etc.) has a distinct flow ID per provider (Antenna or Kerv). See [PCI-PAL Telephony](../explanation/pci-pal-telephony.md).

**GOV.UK Pay** — The government's card-payment platform. HMCTS routes all online card payments through GOV.UK Pay via `ccpay-payment-app`. Each HMCTS service jurisdiction has its own GOV.UK Pay account and API key. See [GOV.UK Pay Integration](../explanation/govuk-pay-integration.md).

**IdempotencyKeys** — A database table (`idempotency_keys`) in `ccpay-payment-app` that prevents duplicate PBA payments against a Service Request. A request hashcode is recorded; subsequent requests with the same hash return the original response. See [API — Payments](api-payments.md).

**Liberata** — The HMCTS middle-office finance supplier. Responsible for financial reconciliation (pulling payment data from PayHub via APIM twice per day), processing PBA account validation, and managing refund acceptance/rejection via callbacks. See [Reconciliation](../explanation/reconciliation.md).

**PBA** — Pay By Account. A credit account held by solicitor firms with Liberata. Used by professional users to pay court fees without a card. Account balance is validated in real time (Config 2) against the Liberata PBA API. See [Overview](../explanation/overview.md).

**PayBubble** — The staff-facing Angular 18 + Express.js web UI (`ccpay-bubble`, port 3000) used by caseworkers and CTSC staff to view, manage, and investigate payments and refunds. See [Architecture](../explanation/architecture.md).

**PayHub** — Informal name for `ccpay-payment-app`, the central payment recording and routing service. See [Architecture](../explanation/architecture.md).

**PayIt** — A NatWest payment portal (`https://bparefunds.liberata.com`) used for refunds when the original card is unavailable. Triggered when Liberata rejects a refund with reason "Unable to apply refund to Card". See [Refunds Flow](../explanation/refunds-flow.md).

**PaymentFeeLink** — The JPA entity (table: `payment_fee_link`) representing a Service Request. Groups one or more fees, payments, and remissions into a single billable unit tied to a CCD case. See [Payment Lifecycle](../explanation/payment-lifecycle.md).

**PaymentStatusDto** — The JSON payload shape sent to consuming services via `ccpay-service-callback-topic` in the Ways2Pay (service-request) path. Contains `service_request_reference`, `ccd_case_number`, `service_request_status`, and a nested `payment` object. See [Payment Status Callbacks](payment-status-callbacks.md).

**PCI-PAL** — A Payment Card Industry-compliant telephony payment provider used by HMCTS CTSCs. Handles card capture over the phone via an iframe in PayBubble. Two provider implementations: Antenna (legacy) and Kerv (current default). See [PCI-PAL Telephony](../explanation/pci-pal-telephony.md).

**RC reference** — A unique payment reference generated by `ccpay-payment-app`. Format: `RC-XXXX-XXXX-XXXX-XXXC` where the last digit is a Luhn check digit. Used universally across PayHub, PayBubble, CCD, and reconciliation reports. Refunds use `RF-` prefix. See [Overview](../explanation/overview.md).

**Real Time PBA** — An in-development enhancement to PBA payments that validates account balance and debits in real time against the Liberata API, replacing overnight batch reconciliation. See [Payment Lifecycle](../explanation/payment-lifecycle.md).

**Reconciliation** — The twice-daily process by which Liberata pulls aggregated payment data from PayHub via the APIM gateway and matches it against financial transactions from payment providers. Discrepancies raise incidents. See [Reconciliation](../explanation/reconciliation.md).

**Remission** — A reduction in the fee amount (e.g. Help with Fees). Stored in the `remission` table and linked to a `PaymentFeeLink`. Affects the computed Service Request status (`Paid` vs `Partially paid`). See [Payment Lifecycle](../explanation/payment-lifecycle.md).

**RF reference** — A unique refund reference generated by `ccpay-refunds-app`. Format: `RF-XXXX-XXXX-XXXX-XXXC`. See [Refunds Flow](../explanation/refunds-flow.md).

**S2S** — Service-to-Service authentication. Every inbound request to a payment microservice must carry a `ServiceAuthorization: Bearer <jwt>` header issued by `rpe-service-auth-provider`. The calling service name must appear in the `trusted.s2s.service.names` configuration. See [How-to: Integrate from a Service](../how-to/integrate-from-a-service.md).

**Service Request** — A payment group (entity `PaymentFeeLink`) that groups one or more fees to be paid for a case. Created via `POST /service-request`. Supports multiple payment attempts and all payment channels. The strategic integration pattern (Ways2Pay) for new services. See [Overview](../explanation/overview.md).

**ServiceToTokenMap** — A Spring component in `ccpay-payment-app` that maps human-readable enterprise service names (e.g. `"family private law"`) to GOV.UK Pay API key aliases (e.g. `prl_cos_api`). See [GOV.UK Pay Integration](../explanation/govuk-pay-integration.md).

**Site ID** — A 4-character code identifying the HMCTS PO Box / service responsible for a bulk-scanned payment (e.g. `AA07` = Divorce, `AA08` = Probate). Hard-coded in `ResponsibleSiteId` enum. See [Bulk Scan Payments](../explanation/bulk-scan-payments.md).

**W2P / Ways2Pay** — The standardised service-request-based integration pattern for new services. Separates payment creation from fee-group creation, enabling idempotency, retry, and multi-channel support. Contrasts with legacy direct-payment endpoints. See [How-to: Integrate from a Service](../how-to/integrate-from-a-service.md).
