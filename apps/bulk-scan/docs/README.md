# Bulk Scan documentation

Bulk Scan is the HMCTS platform for ingesting scanned paper documents into CCD cases. The scanning supplier (XBP/Exela) uploads signed ZIP envelopes to Azure Blob Storage; from there a five-service pipeline validates the contents, stores documents in CDAM, creates or updates CCD cases (or Exception Records for manual caseworker triage), and registers payments in Pay Hub.

This `docs/` tree covers the full pipeline — architecture, processing internals, exception record handling, payment flows, the envelope format specification, API contracts, and operational how-to guides. It is written for both HMCTS engineers maintaining the platform services and service teams integrating new jurisdictions.

---

## Reading order

For someone new to Bulk Scan:

1. [Overview](explanation/overview.md) — end-to-end pipeline narrative with a full sequence diagram
2. [Architecture](explanation/architecture.md) — component breakdown of all five services, databases, queues, and resource groups
3. [Envelope Processing](explanation/envelope-processing.md) — how the processor validates, uploads, and notifies
4. [Orchestration Flow](explanation/orchestration-flow.md) — how the orchestrator routes envelopes to CCD outcomes
5. [Exception Records](explanation/exception-records.md) — the fallback mechanism and caseworker triage workflow

---

## By topic

### Core concepts

- [Overview](explanation/overview.md) — what Bulk Scan is and the full ingestion pipeline
- [Architecture](explanation/architecture.md) — services, queues, databases, storage accounts, and authentication

### Envelope lifecycle

- [Envelope Format](reference/envelope-format.md) — ZIP structure, `metadata.json` schema, OCR data format, validation rules
- [Envelope Processing](explanation/envelope-processing.md) — processor internals: blob polling, validation stages, CDAM upload, ASB notification, ShedLock

### CCD integration

- [Orchestration Flow](explanation/orchestration-flow.md) — classification routing, transformation-url, update-url, completion signal
- [Exception Records](explanation/exception-records.md) — ER creation rules, CCD state machine, conversion to service case, payment gate

### Payments

- [Payment Handling](explanation/payment-handling.md) — DCN registration with Pay Hub, PO box to site ID mapping, create and update flows

---

## How-to recipes

- [Onboard a New Jurisdiction](how-to/onboard-new-jurisdiction.md) — end-to-end checklist: blob container, processor config, Exception Record CCD definition, transformation/update/OCR endpoints, orchestrator config, payment setup, and supplier coordination
- [Troubleshoot Envelope Failures](how-to/troubleshoot-envelope-failures.md) — diagnosing failures at every stage: validation, CDAM upload, ASB notification, orchestrator stale envelopes, and manual recovery via the actions API

---

## Reference

- [Envelope Format](reference/envelope-format.md) — canonical `metadata.json` schema, ZIP filename pattern, OCR data wire format, container mapping table, error notification codes
- [API Processor Reference](reference/api-processor.md) — `bulk-scan-processor` REST API: SAS token endpoint, envelope query endpoints, admin actions API, reports API
- [API Orchestrator Reference](reference/api-orchestrator.md) — `bulk-scan-orchestrator` CCD callback endpoints and service-team callback contracts (transformation-url, update-url)
- [Glossary](reference/glossary.md) — domain terms: envelope, exception record, DCN, classification, transformation-url, ShedLock, PEEK_LOCK, stale envelope, SAS token, and more
