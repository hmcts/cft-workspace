---
title: Glossary
topic: reference
diataxis: reference
product: bulk-scan
audience: both
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
---

# Bulk Scan Glossary

Domain terms used across the Bulk Scan documentation, listed alphabetically.

---

**`attachScannedDocs`**
The CCD event fired by the orchestrator to append scanned documents to an existing service case for `SUPPLEMENTARY_EVIDENCE` envelopes. Does not invoke a service-team callback. See [Orchestration Flow](../explanation/orchestration-flow.md).

**`attachScannedDocsWithOcr`**
The hard-coded CCD event ID used when updating an existing case with `SUPPLEMENTARY_EVIDENCE_WITH_OCR` data. The orchestrator always uses this event ID; the value returned in `SuccessfulUpdateResponse.event_id` is ignored. Service teams must define this event in their CCD case definition. See [API Orchestrator Reference](api-orchestrator.md).

**`awaitingPaymentDCNProcessing`**
A `YesOrNo` CCD field on every Exception Record. Set to `"Yes"` when the envelope contains payment DCNs. Gates case creation until the payment processor fires the `completeAwaitingPaymentDCNProcessing` event. See [Exception Records](../explanation/exception-records.md).

**Azure Service Bus (ASB)**
The messaging backbone between `bulk-scan-processor` and `bulk-scan-orchestrator`. Three queues: `envelopes` (processor → orchestrator), `processed-envelopes` (orchestrator → processor), and `notifications` (processor → notification-service). See [Architecture](../explanation/architecture.md).

**BGC (Bank Giro Credit)**
Pre-printed credit slips used by Exela when depositing cheques and postal orders at the bank on behalf of HMCTS. The BGC slip carries a Pay Hub payment reference. See [Payment Handling](../explanation/payment-handling.md).

**`blob-router-service`**
The upstream gateway service (in the `reform-scan` resource group) that receives signed outer ZIPs from the scanning supplier, verifies the digital signature, runs antivirus scanning, and dispatches the inner `envelope.zip` to the appropriate jurisdiction container in the `bulkscan` storage account. See [Architecture](../explanation/architecture.md).

**`bulkScanCaseReference`**
A `Text` CCD field that service teams must add to their own case type. The orchestrator writes the Exception Record's CCD ID here when creating a service case from an ER, enabling idempotency checks. See [API Orchestrator Reference](api-orchestrator.md).

**`bulkScanEnvelopes`**
A `Collection` CCD field on service cases that links back to the envelopes that contributed documents. Populated by the orchestrator when `case-definition-has-envelope-ids` is true. See [Exception Records](../explanation/exception-records.md).

**`bulk-scan-orchestrator`**
Spring Boot service (port 8582) that consumes envelope notifications from the Azure Service Bus `envelopes` queue and creates or updates CCD cases (or Exception Records). See [Orchestration Flow](../explanation/orchestration-flow.md) and [Architecture](../explanation/architecture.md).

**`bulk-scan-payment-processor`**
Stateless Spring Boot service (port 8583) that bridges the orchestrator, Pay Hub, and CCD for payment DCN registration. Exposes `POST /payment/create` and `POST /payment/update`. See [Payment Handling](../explanation/payment-handling.md).

**`bulk-scan-processor`**
Spring Boot service (port 8581) that polls Azure Blob Storage, validates envelope ZIPs, uploads PDFs to CDAM, and publishes notifications to the `envelopes` ASB queue. See [Envelope Processing](../explanation/envelope-processing.md) and [Architecture](../explanation/architecture.md).

**CDAM (Case Document Access Management)**
The HMCTS document gateway service. All PDFs from envelopes are uploaded to CDAM at `POST /cases/documents` before the orchestrator can reference them in CCD. See [Architecture](../explanation/architecture.md).

**Classification** (`envelope_classification`)
The routing label on each envelope that determines what action the orchestrator takes. Values: `new_application`, `supplementary_evidence`, `supplementary_evidence_with_ocr`, `exception`. Lowercase in `metadata.json`; uppercase enum in the processor and orchestrator code. See [Envelope Format](envelope-format.md).

**`completeAwaitingPaymentDCNProcessing`**
The CCD event fired by the payment processor to clear the `awaitingPaymentDCNProcessing` gate on an Exception Record after payment DCNs are successfully registered in Pay Hub. Can fire from any state. See [Exception Records](../explanation/exception-records.md).

**CTSC (Courts and Tribunal Service Centre)**
Centralised HMCTS processing centres where caseworkers handle bulk-scanned envelopes and associated payments. See [Payment Handling](../explanation/payment-handling.md).

**DCN (Document Control Number)**
A unique numeric identifier assigned by the scanning supplier (Exela/XBP) to each scanned page or document in an envelope. Appears as `document_control_number` in `metadata.json` and as a payment reference in Pay Hub. Must be numeric only (`^[0-9]+$`). See [Envelope Format](envelope-format.md).

**Dead-Letter Queue (DLQ)**
The Azure Service Bus sub-queue that receives messages after they have exceeded `max-delivery-count` retries. The orchestrator also dead-letters invalid messages immediately. The `CleanupEnvelopesDlqTask` periodically purges old DLQ entries. See [Orchestration Flow](../explanation/orchestration-flow.md).

**Envelope**
A scanned batch uploaded by the scanning supplier. Physically it is a signed outer ZIP containing `envelope.zip` (PDFs + `metadata.json`) and a `signature` file. After the blob-router verifies the signature, the processor sees only the inner `envelope.zip`. See [Envelope Format](envelope-format.md) and [Envelope Processing](../explanation/envelope-processing.md).

**Exception Record (ER)**
A CCD case of type `<CONTAINER_UPPERCASE>_ExceptionRecord` created by the orchestrator when an envelope cannot be automatically matched to a service case. Caseworkers triage ERs and can trigger conversion events (`createNewCase`, `attachToExistingCase`). See [Exception Records](../explanation/exception-records.md).

**Exela / XBP**
The scanning supplier contracted by HMCTS to receive paper post, open envelopes, scan documents, and handle payment instruments. Exela does not scan cheque images or extract PII. See [Overview](../explanation/overview.md).

**`ExceptionRecordFinalizer`**
Orchestrator component that clears OCR warnings and sets `caseReference` / `attachToCaseReference` on the Exception Record after successful case creation or attachment. See [Exception Records](../explanation/exception-records.md).

**`jurisdiction`**
The CCD jurisdiction associated with a bulk-scan container (e.g. `SSCS`, `PROBATE`, `DIVORCE`, `PUBLICLAW`, `CMC`, `PRIVATELAW`). Used to route envelopes, derive CCD case types, and look up IDAM credentials. See [Architecture](../explanation/architecture.md).

**`journeyClassification`**
The CCD field on an Exception Record that records the original `envelope_classification` value. Visible to caseworkers to indicate whether the envelope was a new application, supplementary evidence, or explicit exception. See [Exception Records](../explanation/exception-records.md).

**Liberata**
The HMCTS reconciliation processor that pulls payment data from Pay Hub daily and reconciles banked amounts. Not part of the bulk-scan pipeline directly. See [Payment Handling](../explanation/payment-handling.md).

**`metadata.json`**
The manifest file inside every `envelope.zip`, validated against JSON Schema draft-04. Contains PO box, jurisdiction, classification, and an array of `scannable_items`. See [Envelope Format](envelope-format.md).

**`max-delivery-count`**
The Azure Service Bus setting governing how many times an unprocessed message is retried before dead-lettering. Configured to 300 in production (approximately 24 hours of retry window). See [Orchestration Flow](../explanation/orchestration-flow.md).

**OCR data**
Optical Character Recognition key-value pairs extracted by the scanning supplier from form fields. Stored as base64-encoded JSON in `scannable_items[].ocr_data` in `metadata.json`. Forwarded to the orchestrator and passed to jurisdiction services via transformation or update callbacks. See [Envelope Format](envelope-format.md).

**OCR validation endpoint**
A `POST /forms/{form-type}/validate-ocr` HTTP endpoint implemented by service teams. Called by the processor before envelope upload. Returns `SUCCESS`, `WARNINGS`, or `ERRORS`. See [Exception Records](../explanation/exception-records.md) and [How to Onboard](../how-to/onboard-new-jurisdiction.md).

**Pay Hub**
The HMCTS centralised payments platform. `bulk-scan-payment-processor` registers payment DCNs with Pay Hub at `POST /bulk-scan-payments`. See [Payment Handling](../explanation/payment-handling.md).

**PayBubble**
The Pay Hub front-end web application (`paybubble.{env}.platform.hmcts.net`) used by caseworkers to view and allocate payments against cases. Not part of the bulk-scan pipeline. See [Payment Handling](../explanation/payment-handling.md).

**PEEK_LOCK**
The Azure Service Bus receive mode used by the orchestrator. Messages are locked (not consumed) until the orchestrator explicitly completes or abandons them. This enables at-least-once delivery with retry on failure. See [Orchestration Flow](../explanation/orchestration-flow.md).

**PO Box**
The postal address identifier that routes paper post to the correct scanning supplier station and maps to a specific jurisdiction and container within the Bulk Scan pipeline. Appears as `po_box` in `metadata.json`. See [Envelope Format](envelope-format.md).

**`ProcessedEnvelope`**
The completion signal published to the `processed-envelopes` ASB queue by the orchestrator after a successful CCD action. Contains `envelope_id`, `ccd_id`, and `envelope_ccd_action`. Triggers blob deletion in the processor. See [Orchestration Flow](../explanation/orchestration-flow.md).

**`reform-scan-notification-service`**
Upstream service that sends error notifications (error code + description) back to the scanning supplier's HTTPS endpoint when blob-router or processor validation fails. See [Architecture](../explanation/architecture.md).

**Rejected container**
The `{container}-rejected` Azure Blob Storage container where blobs are moved when validation fails (schema error, non-PDF files, oversized PDFs, signature failure). See [Envelope Processing](../explanation/envelope-processing.md).

**SAS token**
Azure Shared Access Signature token. Issued by `bulk-scan-processor` at `GET /token/{serviceName}` with write+list+read permissions and a 300-second default validity. The scanning supplier uses these tokens to upload ZIPs. See [API Processor Reference](api-processor.md).

**ShedLock**
The JDBC-backed distributed lock library used by the processor's upload, notification, and delete tasks to prevent concurrent execution across multiple replicas. The blob-scanning task instead uses Azure Blob leases. See [Envelope Processing](../explanation/envelope-processing.md).

**SIP (Service Implementation Pack)**
The formal document agreed between a service team and the scanning supplier (XBP/Exela) specifying form templates, OCR field names, data types, and operational rules. Required before supplier configuration can begin. Lead time: at least 8 weeks. See [How to Onboard](../how-to/onboard-new-jurisdiction.md).

**Stale envelope**
An envelope stuck in `NOTIFICATION_SENT` status because the orchestrator is repeatedly retrying a non-recoverable error. Common cause: a downstream service returns 5xx, CCD normalises it to 502, the orchestrator treats it as recoverable and retries up to max-delivery-count. See [Troubleshoot Envelope Failures](../how-to/troubleshoot-envelope-failures.md).

**`transformation-url`**
A per-jurisdiction HTTP endpoint implemented by service teams. The orchestrator POSTs a `TransformationRequest` here when converting an Exception Record into a service case. Returns `case_type_id`, `event_id`, and `case_data`. See [API Orchestrator Reference](api-orchestrator.md) and [Exception Records](../explanation/exception-records.md).

**`update-url`**
A per-jurisdiction HTTP endpoint implemented by service teams for `SUPPLEMENTARY_EVIDENCE_WITH_OCR` envelopes. The orchestrator POSTs a `CaseUpdateRequest` here before firing `attachScannedDocsWithOcr` on CCD. See [API Orchestrator Reference](api-orchestrator.md).

**XBP**
The current trading name of the scanning supplier (formerly Exela). Used interchangeably with "Exela" in documentation. See [Overview](../explanation/overview.md).
