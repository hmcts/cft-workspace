---
title: Onboard New Jurisdiction
topic: overview
diataxis: how-to
product: bulk-scan
audience: both
sources:
  - bulk-scan-processor:src/main/resources/application.yaml
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/config/ContainerMappings.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/validation/OcrValidator.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/services/document/DocumentServiceHelper.java
  - bulk-scan-orchestrator:src/main/resources/application.yaml
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/TransformationClient.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/caseupdate/CaseUpdateDataClient.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/envelopehandlers/CreateExceptionRecord.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/config/ServiceConfigItem.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/definition/ServiceCaseFields.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/EventIds.java
  - bulk-scan-ccd-definitions:definitions/bulkscan-exception/data/sheets/CaseField.json
  - bulk-scan-ccd-definitions:definitions/bulkscan-exception/data/sheets/CaseEvent.json
  - bulk-scan-ccd-definitions:definitions/privatelaw/data/sheets/CaseEvent.json
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/bulk-scan/bulk-scan-processor/src/main/resources/application.yaml
  - apps/bulk-scan/bulk-scan-orchestrator/src/main/resources/application.yaml
  - apps/bulk-scan/bulk-scan-ccd-definitions/definitions/bulkscan-exception/data/sheets/CaseEvent.json
confluence:
  - id: "1051493435"
    title: "1) Bulk Scanning - Service Onboarding and Live service changes Information"
    last_modified: "2026-03-14T00:00:00Z"
    space: "RBS"
  - id: "1064666568"
    title: "Technical prerequisites and information for Service on-boarding with Phase 2 Bulk scanning for case creation."
    last_modified: "2019-12-12T00:00:00Z"
    space: "RBS"
  - id: "1568507897"
    title: "Service Onboarding for Bulk-scan"
    last_modified: "2022-05-12T00:00:00Z"
    space: "RP"
  - id: "1444745812"
    title: "Bulk Scan - Service Onboarding Plan (WIP)"
    last_modified: "2020-09-24T00:00:00Z"
    space: "DATS"
  - id: "1783785981"
    title: "Bulk scan - Service operations guide"
    last_modified: "2024-12-01T00:00:00Z"
    space: "DATS"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Onboarding a new jurisdiction into the Bulk Scan pipeline requires configuration in three repos: `bulk-scan-processor`, `bulk-scan-orchestrator`, and `bulk-scan-ccd-definitions`.
- You need an Azure Blob Storage container named after your service, a CCD Exception Record case-type definition, and (optionally) OCR validation, transformation, and update HTTP endpoints in your service.
- The processor maps containers to jurisdictions/PO boxes; the orchestrator maps services to `transformation-url` and `update-url` callbacks.
- Exception Record case type ID follows the pattern `<CONTAINER_UPPERCASE>_ExceptionRecord` (e.g. `PRIVATELAW_ExceptionRecord`).
- Your service case definition must include a `bulkScanCaseReference` field (used for duplicate detection) and the `attachScannedDocsWithOcr` event (for OCR-bearing supplementary evidence).
- Allow 8 weeks lead time for the scanning supplier (XBP/Exela) to configure form templates and OCR field mappings; a Service Implementation Pack (SIP) and Change Request form are required.

## Prerequisites

- Access to the Azure subscription that hosts the Bulk Scan storage account.
- A CCD jurisdiction already registered (e.g. `SSCS`, `PROBATE`, `PUBLICLAW`).
- Your service deployed with S2S registration so the orchestrator can call it.
- Familiarity with the CCD definition JSON sheet format used in `bulk-scan-ccd-definitions`.
- Agreement with the scanning supplier (XBP/Exela) on form templates, OCR field naming, and data types — documented in a Service Implementation Pack (SIP). Start this at least 8 weeks before your target go-live date.
<!-- CONFLUENCE-ONLY: not verified in source -->
- If your service uses payments, whitelist your service in `ccpay-bulkscanning-app` (see Step 9b below).

## Step 1: Provision the Azure Blob Storage container

1. Create a blob container in the Bulk Scan storage account. The container name must be lowercase and will be used as the service identifier throughout the pipeline (e.g. `privatelaw`, `nfd`, `sscs`).
2. Create a matching `<container>-rejected` container for blobs that fail validation.
3. The container name becomes the key for SAS token issuance, document upload (`caseTypeId = <CONTAINER_UPPER>_ExceptionRecord`), and all processor/orchestrator lookups.

## Step 2: Configure the processor container mappings

Add an entry to `containers.mappings` in `bulk-scan-processor`'s `application.yaml`. Each mapping binds a container to a jurisdiction, PO box(es), and optional OCR validation URL.

```yaml
containers:
  mappings:
    - container: yourservice
      jurisdiction: YOURJURISDICTION
      poBoxes:
        - "12345"
      ocrValidationUrl: ${OCR_VALIDATION_URL_YOURSERVICE:}
      enabled: true
      paymentsEnabled: false
```

Key fields:

| Field | Purpose |
|---|---|
| `container` | Blob container name (lowercase) |
| `jurisdiction` | CCD jurisdiction ID |
| `poBoxes` | List of PO box identifiers the scanning supplier uses |
| `ocrValidationUrl` | URL for OCR validation endpoint (blank to skip) |
| `paymentsEnabled` | Whether payment DCNs are expected in envelopes |

The processor uses this mapping to validate that each envelope's `jurisdiction` and `po_box` match the container it was uploaded to (`bulk-scan-processor:src/main/java/.../validation/EnvelopeValidator.java:210-233`).

## Step 3: Configure SAS token issuance

Add your service to the `accesstoken.serviceConfig` list in `bulk-scan-processor`'s `application.yaml` so the scanning supplier can obtain upload tokens:

```yaml
accesstoken:
  serviceConfig:
    - serviceName: yourservice
      validity: ${SAS_TOKEN_VALIDITY:300}
```

The token endpoint is `GET /token/{serviceName}` — the `serviceName` must exactly equal the container name (`bulk-scan-processor:src/main/java/.../services/SasTokenGeneratorService.java:57-60`).

## Step 4: Write the Exception Record CCD definition

Create a new directory `definitions/yourservice/data/sheets/` in `bulk-scan-ccd-definitions` with the standard JSON sheet files. Copy from an existing jurisdiction (e.g. `privatelaw`) and adapt:

1. **`CaseType.json`** — set `CaseTypeID` to `YOURSERVICE_ExceptionRecord`, `JurisdictionID` to your CCD jurisdiction.
2. **`CaseField.json`** — use the standard exception-record field set (29 fields). Required fields include: `journeyClassification`, `poBox`, `formType`, `deliveryDate`, `openingDate`, `scannedDocuments`, `scanOCRData`, `attachToCaseReference`, `caseReference`, `envelopeId`, `containsPayments`, `awaitingPaymentDCNProcessing`, `surname`.
3. **`CaseEvent.json`** — define events with orchestrator callbacks:
   - `createException` (initial ingestion, no callback)
   - `attachToExistingCase` with `CallBackURLAboutToSubmitEvent: ${CCD_DEF_BULK_SCAN_ORCHESTRATOR_URL}/callback/attach_case` and `RetriesTimeoutURLAboutToSubmitEvent: 10`
   - `createNewCase` with `CallBackURLAboutToSubmitEvent: ${CCD_DEF_BULK_SCAN_ORCHESTRATOR_URL}/callback/create-new-case` and `RetriesTimeoutURLAboutToSubmitEvent: 30` (the default 5-second timeout is insufficient for the multi-service call chain; 30 seconds is required — `bulk-scan-ccd-definitions:definitions/privatelaw/data/sheets/CaseEvent.json:37`)
   - `rejectRecord`, `updateManually`, `completeAwaitingPaymentDCNProcessing`
4. **`State.json`** — standard states: `ScannedRecordReceived`, `ScannedRecordAttachedToCase`, `ScannedRecordCaseCreated`, `ScannedRecordRejected`, `ScannedRecordManuallyHandled`.
5. **`AuthorisationCaseType.json`** — grant CRUD to `caseworker-<service>-bulkscan` and `caseworker-<service>-systemupdate` access profiles.
6. **`ComplexTypes.json`** — include `ScannedDocument`, `KeyValue`, and `BulkScanEnvelope` complex types.
7. **`FixedLists.json`** — include `ScannedDocumentType` values (`cherished`, `other`, `coversheet`, `form`) and `ReferenceType` values (`ccdCaseReference`, `externalCaseReference`). Add jurisdiction-specific PO box values if needed.

Build the XLSX with:

```bash
cd definitions/yourservice
../../bin/json2xlsx.sh aat
```

Upload to `ccd-definition-store-api` in the target environment.

## Step 4b: Add Bulk Scan fields to your service case definition

In addition to the Exception Record definition (managed in `bulk-scan-ccd-definitions`), your own service's CCD case definition must include these fields and events for Bulk Scan integration:

1. **`bulkScanCaseReference`** field — a `Text` field that stores the CCD reference of the exception record from which the case was created. Used for duplicate detection by the orchestrator (`bulk-scan-orchestrator:src/main/java/.../services/ccd/definition/ServiceCaseFields.java:10`):

   ```json
   {
     "LiveFrom": "01/01/2018",
     "CaseTypeID": "{your case type ID}",
     "ID": "bulkScanCaseReference",
     "Label": "Exception Record Reference",
     "FieldType": "Text",
     "SecurityClassification": "PUBLIC"
   }
   ```

2. **Case creation event** — an event for creating a new case from an exception record. The event ID is defined by your service team (it will be returned in the transformation response).

3. **`attachScannedDocsWithOcr` event** — used by the orchestrator to update an existing case with supplementary evidence containing OCR data. The event ID is hard-coded in the orchestrator (`bulk-scan-orchestrator:src/main/java/.../services/ccd/EventIds.java:11`).

4. Ensure the caseworker roles that trigger exception record conversion also have access to these events in `AuthorisationCaseEvent`, because the orchestrator authenticates as the triggering caseworker.

## Step 5: Implement the transformation-url callback (service team)

The orchestrator calls this endpoint when converting an Exception Record into a service case. Implement a `POST` endpoint at a path of your choice (typically `/transform-exception-record`).

**Request shape** (`TransformationRequest`):

```json
{
  "exception_record_id": "1234567890",
  "exception_record_case_type_id": "YOURSERVICE_ExceptionRecord",
  "envelope_id": "uuid",
  "is_automated_process": false,
  "po_box": "12345",
  "po_box_jurisdiction": "YOURJURISDICTION",
  "journey_classification": "NEW_APPLICATION",
  "form_type": "A1",
  "delivery_date": "2024-01-15T10:30:00",
  "opening_date": "2024-01-15T11:00:00",
  "scanned_documents": [...],
  "ocr_data_fields": [{"name": "field1", "value": "val1"}],
  "ignore_warnings": false
}
```

**Required response shape** (`SuccessfulTransformationResponse`):

```json
{
  "case_creation_details": {
    "case_type_id": "YourServiceCaseType",
    "event_id": "createCase",
    "case_data": { ... }
  },
  "warnings": []
}
```

The orchestrator validates the response with Jakarta Bean Validation — `case_creation_details`, `case_type_id`, `event_id`, and `case_data` are all required and must not be empty (`bulk-scan-orchestrator:src/main/java/.../client/transformation/model/response/CaseCreationDetails.java`).

**Important**: The `case_data` object returned in `case_creation_details` **must** include `bulkScanCaseReference` as a top-level field, populated with the `exception_record_id` value from the request. The orchestrator uses this field for idempotency — it searches for existing cases by this reference before creating a new one (`bulk-scan-orchestrator:src/main/java/.../services/ccd/CcdApi.java:50`). Without it, duplicate cases may be created on retry.

The endpoint must accept a `ServiceAuthorization` S2S header from `bulk_scan_orchestrator`.

> **Note**: The `TransformationRequest` also includes deprecated fields `id` and `case_type_id` (without the `exception_record_` prefix) for backward compatibility. New integrations should use `exception_record_id` and `exception_record_case_type_id` (`bulk-scan-orchestrator:src/main/java/.../client/transformation/model/request/TransformationRequest.java:16-27`).

## Step 6: Implement the update-url callback (optional, service team)

Required only if your service handles `SUPPLEMENTARY_EVIDENCE_WITH_OCR` envelopes. The orchestrator calls this when attaching OCR-bearing evidence to an existing case.

Your service case definition must include the event `attachScannedDocsWithOcr` (`bulk-scan-orchestrator:src/main/java/.../services/ccd/EventIds.java:11`). The orchestrator uses this hard-coded event ID to update the case in CCD, authenticating as the caseworker who triggered the action. Ensure appropriate caseworker roles have access to this event in `AuthorisationCaseEvent`.

**Request shape** (`CaseUpdateRequest`):

```json
{
  "is_automated_process": false,
  "case_update_details": {
    "exception_record_case_type_id": "YOURSERVICE_ExceptionRecord",
    "exception_record_id": "1234567890",
    "envelope_id": "uuid",
    "po_box": "12345",
    "po_box_jurisdiction": "YOURJURISDICTION",
    "form_type": "A1",
    "delivery_date": "2024-01-15T10:30:00",
    "opening_date": "2024-01-15T11:00:00",
    "scanned_documents": [...],
    "ocr_data_fields": [...]
  },
  "case_details": {
    "id": "9876543210",
    "case_type_id": "YourServiceCaseType",
    "case_data": { ... }
  }
}
```

**Required response shape** (`SuccessfulUpdateResponse`):

```json
{
  "case_update_details": {
    "event_id": "attachScannedDocsWithOcr",
    "case_data": { ... }
  },
  "warnings": []
}
```

**Update response constraints**:

- The returned `case_data` **must preserve** the existing `bulkScanCaseReference` field value (used for duplicate detection).
- The response **must add** all scanned documents from the exception record's `scanned_documents` collection to the case's `scannedDocuments` field, checking for duplicates by `control_number`. The orchestrator will only call your endpoint if the exception record contains documents not already present in the case.
- The orchestrator fills the `exceptionRecordReference` field on each newly-added scanned document entry with the exception record ID before writing to CCD.

## Step 7: Register OCR validation URL (optional, service team)

If your forms require OCR validation before ingestion, implement a `POST` endpoint matching the pattern:

```
POST {baseUrl}/forms/{form-type}/validate-ocr
```

The processor calls this with a `ServiceAuthorization` S2S header and a JSON body containing OCR key-value pairs. Return a response with `status: SUCCESS`, `WARNINGS`, or `ERRORS` (`bulk-scan-processor:src/main/java/.../ocrvalidation/client/OcrValidationClient.java:46-49`).

Set the `OCR_VALIDATION_URL_YOURSERVICE` environment variable in `bulk-scan-processor` to point to your service's base URL. This maps through to the `ocrValidationUrl` field in the container mapping (Step 2).

## Step 8: Register service in orchestrator config

Add your service to the `service-config.services` map in `bulk-scan-orchestrator`'s `application.yaml`:

```yaml
service-config:
  services:
    - service: yourservice
      jurisdiction: YOURJURISDICTION
      transformation-url: ${TRANSFORMATION_URL_YOURSERVICE:}
      update-url: ${UPDATE_URL_YOURSERVICE:}
      case-type-ids:
        - YourServiceCaseType
      allow-creating-case-before-payments-are-processed: false
      form-type-to-surname-ocr-field-mappings:
        - formType: YOURFORM
          ocrFields:
            - person1_last_name
      auto-case-creation-enabled: false
      auto-case-update-enabled: false
      case-definition-has-envelope-ids: false
      search-cases-by-envelope-id: false
      supplementary-data-enabled: false
```

| Field | Purpose |
|---|---|
| `service` | Must match the blob container name |
| `jurisdiction` | CCD jurisdiction ID |
| `transformation-url` | Full URL of your transformation endpoint (Step 5) |
| `update-url` | Full URL of your update endpoint (Step 6); leave blank if not needed |
| `case-type-ids` | List of your service's CCD case type IDs (not the Exception Record). The orchestrator searches across these types when looking for existing cases by legacy ID or envelope reference. If empty, no case can be found except by direct CCD ID. |
| `allow-creating-case-before-payments-are-processed` | If `true`, cases can be created even if payment DCNs haven't been processed yet |
| `form-type-to-surname-ocr-field-mappings` | Maps form types to OCR field names containing surnames. Used by the orchestrator to populate the `surname` field on the exception record for search. |
| `auto-case-creation-enabled` | If `true`, `NEW_APPLICATION` envelopes create cases without caseworker intervention |
| `auto-case-update-enabled` | If `true`, `SUPPLEMENTARY_EVIDENCE_WITH_OCR` envelopes update cases automatically |
| `case-definition-has-envelope-ids` | If `true`, your case definition includes a `bulkScanEnvelopes` field for envelope tracking |
| `search-cases-by-envelope-id` | If `true`, enables searching for existing cases by envelope ID |
| `supplementary-data-enabled` | If `true`, enables supplementary data writes to CCD |

All boolean fields default to `false` (`bulk-scan-orchestrator:src/main/java/.../config/ServiceConfigItem.java:40-44`).

## Step 9: Deploy and enable scheduling

Ensure these environment variables are set in the processor's deployment for your environment:

- `SCAN_ENABLED=true` (defaults to `false` — `bulk-scan-processor:src/main/resources/application.yaml:214`)
- `NOTIFICATIONS_TO_ORCHESTRATOR_TASK_ENABLED=true` (defaults to `false` — `bulk-scan-processor:src/main/resources/application.yaml:223`)

Without both flags, envelopes in your new container will not be processed or forwarded to the orchestrator.

## Step 9b: Register with payments (if applicable)

If your service's envelopes contain payment Document Control Numbers (DCNs), you must also whitelist your service in the `ccpay-bulkscanning-app` repository so that `bulk-scan-payment-processor` can register payments with Pay Hub on your behalf.

Add your service's S2S name to the `trusted.s2s.service.names` list in `ccpay-bulkscanning-app`'s `application.yaml` and `values.yaml`:
<!-- CONFLUENCE-ONLY: not verified in source -->

```yaml
# values.yaml
S2S_AUTHORISED_SERVICES: payment_app,ccpay_bubble,...,xui_webapp,yourservice

# application.yaml
trusted:
  s2s:
    service:
      names: ccpay_bubble,...,payment_app,yourservice
```

Also ensure `paymentsEnabled: true` is set in the processor container mapping (Step 2).

## Step 10: Agree OCR field mappings with scanning supplier

Before integration testing can begin, you must complete the form-configuration process with the scanning supplier (XBP/Exela):
<!-- CONFLUENCE-ONLY: not verified in source -->

1. Create an OCR field specification spreadsheet per form (see [SIP template on Confluence](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1051493435)). Each row defines:
   - Form section and data item
   - Input type and validation pattern
   - **Data file key name** (the OCR field name sent in `ocr_data_fields`) — this is critical and cannot be changed after supplier configuration without a new Change Request
   - Whether the field is required
   - Business rules and action if required field is missing (reject, create draft, contact appellant, populate default)

2. Submit an **XBP Change Request form** including: volumes, operational process changes, implementation date, dependencies, and urgency.

3. Key considerations for OCR field design:
   - Checkbox values: agree with the supplier on representations (`True`/`False`, `T`/`F`, etc.)
   - Free-text address fields may arrive as a single concatenated value rather than split into `address_line1`, `address_line2`, etc.
   - Date formats must be explicitly defined (e.g. `DD/MM/YYYY`)
   - Data types for all OCR key/values should be documented

A reference sample app that implements all required endpoints is available at: <https://github.com/hmcts/bulk-scan-ccd-event-handler-sample-app>

## Verify

1. Upload a test envelope ZIP (filename ending `.test.zip`) to your container using a SAS token from `GET /token/yourservice`.
2. Check the processor logs for successful validation and document upload for your container.
3. Confirm an Exception Record appears in CCD under case type `YOURSERVICE_ExceptionRecord` in state `ScannedRecordReceived`.
4. In ExUI, trigger the `createNewCase` event on the Exception Record and confirm the orchestrator calls your transformation URL and creates the service case.

## Examples

### Processor container mappings — an existing jurisdiction as reference

The PrivateLaw entry from `bulk-scan-processor`'s `application.yaml` shows all optional fields: `enabled` flag, `ocrValidationUrl`, `paymentsEnabled`:

```yaml
// Source: apps/bulk-scan/bulk-scan-processor/src/main/resources/application.yaml
containers:
  mappings:
    - container: privatelaw
      jurisdiction: PRIVATELAW
      poBoxes:
        - 13235
      paymentsEnabled: ${PAYMENTS_ENABLED_PRIVATELAW:false}
      enabled: ${PRIVATELAW_ENABLED:false}
      ocrValidationUrl: ${OCR_VALIDATION_URL_PRIVATELAW}
```

Contrast with SSCS, which has multiple PO boxes and no payments:

```yaml
// Source: apps/bulk-scan/bulk-scan-processor/src/main/resources/application.yaml
    - container: sscs
      jurisdiction: SSCS
      poBoxes:
        - 12626
        - 13150
        - 13618
      ocrValidationUrl: ${OCR_VALIDATION_URL_SSCS}
```

### SAS token service config — processor

The `accesstoken.serviceConfig` list that controls which services can obtain upload tokens. All services use the same `SAS_TOKEN_VALIDITY` env var default (300 seconds):

```yaml
// Source: apps/bulk-scan/bulk-scan-processor/src/main/resources/application.yaml
accesstoken:
  serviceConfig:
    - serviceName: sscs
      validity: ${SAS_TOKEN_VALIDITY:300}
    - serviceName: probate
      validity: ${SAS_TOKEN_VALIDITY:300}
    - serviceName: privatelaw
      validity: ${SAS_TOKEN_VALIDITY:300}
    - serviceName: nfd
      validity: ${SAS_TOKEN_VALIDITY:300}
    # ... (one entry per container; serviceName must exactly match the container name)
```

### CaseEvent.json for a jurisdiction exception record

The BULKSCAN exception record events as a complete template. Note the 30-second timeout on `createNewCase` is absent from the BULKSCAN definition (it is added in per-service definitions such as PrivateLaw and SSCS):

```json
// Source: apps/bulk-scan/bulk-scan-ccd-definitions/definitions/bulkscan-exception/data/sheets/CaseEvent.json
[
  {
    "LiveFrom": "01/01/2018",
    "CaseTypeID": "BULKSCAN_ExceptionRecord",
    "ID": "createException",
    "Name": "Create an exception record",
    "PostConditionState": "ScannedRecordReceived",
    "SecurityClassification": "Public"
  },
  {
    "LiveFrom": "01/01/2018",
    "CaseTypeID": "BULKSCAN_ExceptionRecord",
    "ID": "attachToExistingCase",
    "Name": "Attach record to existing case",
    "PreConditionState(s)": "ScannedRecordReceived",
    "PostConditionState": "ScannedRecordAttachedToCase",
    "CallBackURLAboutToSubmitEvent": "${CCD_DEF_BULK_SCAN_ORCHESTRATOR_URL}/callback/attach_case",
    "SecurityClassification": "Public"
  },
  {
    "LiveFrom": "01/01/2018",
    "CaseTypeID": "BULKSCAN_ExceptionRecord",
    "ID": "createNewCase",
    "Name": "Create new case from exception",
    "PreConditionState(s)": "ScannedRecordReceived",
    "PostConditionState": "ScannedRecordCaseCreated",
    "CallBackURLAboutToSubmitEvent": "${CCD_DEF_BULK_SCAN_ORCHESTRATOR_URL}/callback/create-new-case",
    "SecurityClassification": "Public"
  },
  {
    "LiveFrom": "01/01/2018",
    "CaseTypeID": "BULKSCAN_ExceptionRecord",
    "ID": "completeAwaitingPaymentDCNProcessing",
    "Name": "Complete DCN processing",
    "PreConditionState(s)": "*",
    "PostConditionState": "*",
    "SecurityClassification": "Public"
  },
  {
    "LiveFrom": "01/01/2018",
    "CaseTypeID": "BULKSCAN_ExceptionRecord",
    "ID": "rejectRecord",
    "Name": "Reject record",
    "PreConditionState(s)": "ScannedRecordReceived;ScannedRecordJourneyReclassified",
    "PostConditionState": "ScannedRecordRejected",
    "SecurityClassification": "Public"
  },
  {
    "LiveFrom": "01/01/2018",
    "CaseTypeID": "BULKSCAN_ExceptionRecord",
    "ID": "updateManually",
    "Name": "Manually handle record",
    "PreConditionState(s)": "ScannedRecordReceived;ScannedRecordJourneyReclassified",
    "PostConditionState": "ScannedRecordManuallyHandled",
    "SecurityClassification": "Public"
  }
]
```

When adapting for a new jurisdiction, replace `BULKSCAN_ExceptionRecord` with `YOURSERVICE_ExceptionRecord` throughout. Add `"RetriesTimeoutURLAboutToSubmitEvent": 30` to the `createNewCase` event.

## See also

- [Exception Records](../explanation/exception-records.md) — the full exception-record CCD data model and state machine your definition must implement
- [API Orchestrator Reference](../reference/api-orchestrator.md) — complete transformation-url and update-url request/response contracts with examples
- [Envelope Format](../reference/envelope-format.md) — the metadata.json schema and OCR data format your supplier must produce
- [Troubleshoot Envelope Failures](troubleshoot-envelope-failures.md) — diagnosing issues during integration testing
