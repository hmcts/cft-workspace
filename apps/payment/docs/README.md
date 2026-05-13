---
title: Payment Documentation
topic: overview
diataxis: explanation
product: payment
audience: both
status: linked
---

# Payment (Fees & Pay) documentation

The HMCTS Fees & Pay platform is the central payment infrastructure used by all CFT service teams. It wraps GOV.UK Pay (online card payments), PCI-PAL (telephone payments), and Liberata (Pay By Account credit accounts) behind a unified REST API with IDAM and S2S authorisation. The platform generates structured payment references, manages payment status tracking, delivers asynchronous callbacks via Azure Service Bus, and aggregates data across all payment channels for financial reconciliation by Liberata.

This `docs/` tree covers the payment platform from architecture and core concepts through to how-to recipes and full API references. It is written for HMCTS engineers — both service-team developers integrating their jurisdiction service with the payment platform and platform engineers maintaining `ccpay-payment-app` and the surrounding microservices.

## Reading order

For someone new to the Fees & Pay platform:

1. [Overview](explanation/overview.md) — what the platform does, the payment channels, the Service Request model, and the callback mechanism
2. [Architecture](explanation/architecture.md) — hub-and-spoke topology, all nine repos, databases, ASB topics, and authentication
3. [Payment Lifecycle](explanation/payment-lifecycle.md) — stage-by-stage flow from fee identification to case progression, status transitions, and failure handling
4. [GOV.UK Pay Integration](explanation/govuk-pay-integration.md) — multi-account key resolution, idempotency, and status polling
5. [How-to: Integrate from a Service](how-to/integrate-from-a-service.md) — the practical onboarding checklist

## By topic

### Core concepts

- [Overview](explanation/overview.md) — platform responsibilities, payment channels, Service Request model, and callbacks
- [Architecture](explanation/architecture.md) — hub-and-spoke topology, nine repos, databases, ASB topics, feature flags
- [Payment Lifecycle](explanation/payment-lifecycle.md) — status transitions, apportionment, payment failures, service request cancellation
- [Reconciliation](explanation/reconciliation.md) — APIM gateway, Liberata integration, scheduled CSV reports, bulk-scan reconciliation

### Payment channels

- [GOV.UK Pay Integration](explanation/govuk-pay-integration.md) — online card payments, multi-account key resolution, idempotency, status polling
- [PCI-PAL Telephony](explanation/pci-pal-telephony.md) — CTSC telephone payments, Antenna vs Kerv providers, OAuth flow, callback
- [Bulk Scan Payments](explanation/bulk-scan-payments.md) — cash/cheque/postal order pipeline via Exela, envelope lifecycle, APIM auth

### Refunds

- [Refunds Flow](explanation/refunds-flow.md) — state machine, Liberata callbacks, PayIt journey, notification dispatch, reissue

## How-to recipes

- [Integrate from a Service](how-to/integrate-from-a-service.md) — register as a trusted S2S caller, configure a GOV.UK Pay key, create Service Requests, handle callbacks
- [Configure a PCI-PAL Flow](how-to/configure-pci-pal-flow.md) — add a new jurisdiction's flow ID, update `TelephonySystem`, configure Kerv secrets
- [Troubleshoot Payment Status](how-to/troubleshoot-payment-status.md) — diagnose stuck payments, trigger the status-update job, replay missed callbacks, investigate PBA failures

## Reference

- [API — Payments](reference/api-payments.md) — full endpoint catalogue for `ccpay-payment-app` (card, PBA, telephony, service requests, job endpoints)
- [API — Refunds](reference/api-refunds.md) — full endpoint catalogue for `ccpay-refunds-app` (lifecycle, Liberata reconciliation, notifications)
- [API — Bulk Scanning](reference/api-bulk-scanning.md) — full endpoint catalogue for `ccpay-bulkscanning-app` (ingest, search, reporting)
- [Payment Status Callbacks](reference/payment-status-callbacks.md) — ASB topics, `PaymentStatusDto` schema, `TopicClientProxy` retry, CPO update service
- [Glossary](reference/glossary.md) — definitions for APIM, Apportionment, ASB, BGC slip, Callback URL, ccpay-functions-node, CPO, CTSC, DCN, Envelope, Exela, FF4j, Flow ID, GOV.UK Pay, IdempotencyKeys, Liberata, PBA, PayBubble, PayHub, PayIt, PaymentFeeLink, PaymentStatusDto, PCI-PAL, RC reference, Real Time PBA, Reconciliation, Remission, RF reference, S2S, Service Request, ServiceToTokenMap, Site ID, W2P/Ways2Pay
