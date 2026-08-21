---
title: Api Orchestrator
topic: architecture
diataxis: reference
product: bulk-scan
audience: both
sources:
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/TransformationClient.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/request/TransformationRequest.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/response/SuccessfulTransformationResponse.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/response/CaseCreationDetails.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/caseupdate/CaseUpdateDataClient.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/caseupdate/model/request/CaseUpdateRequest.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/caseupdate/model/response/SuccessfulUpdateResponse.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/controllers/CcdCallbackController.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/TransformationRequestCreator.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/caseupdate/CaseUpdateRequestCreator.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/config/ServiceConfigItem.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/EventIds.java
  - bulk-scan-orchestrator:src/main/resources/application.yaml
  - bulk-scan-ccd-definitions:definitions/bulkscan-exception/data/sheets/CaseEvent.json
  - bulk-scan-ccd-definitions:definitions/divorce/data/sheets/CaseEvent.json
  - bulk-scan-ccd-definitions:definitions/probate/data/sheets/CaseEvent.json
  - bulk-scan-ccd-definitions:definitions/finrem/data/sheets/CaseEvent.json
  - bulk-scan-ccd-definitions:definitions/privatelaw/data/sheets/CaseEvent.json
  - bulk-scan-ccd-definitions:definitions/sscs/data/sheets/CaseEvent.json
  - bulk-scan-ccd-definitions:definitions/cmc/data/sheets/CaseEvent.json
  - bulk-scan-ccd-definitions:definitions/publiclaw/data/sheets/CaseEvent.json
  - bulk-scan-ccd-definitions:definitions/nfd/data/sheets/CaseEvent.json
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/bulk-scan/bulk-scan-orchestrator/src/main/resources/application.yaml
  - apps/bulk-scan/bulk-scan-orchestrator/src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/request/TransformationRequest.java
confluence:
  - id: "1064666568"
    title: "Technical prerequisites and information for Service on-boarding with Phase 2  Bulk scanning for case creation."
    last_modified: "unknown"
    space: "RBS"
  - id: "1775307063"
    title: "Technical Specification V1.4"
    last_modified: "2026-07-01"
    space: "RBS"
  - id: "1914807879"
    title: "DTS-SSCS-FT: CM - Spike: Bulk Scan"
    last_modified: "unknown"
    space: "DATS"
  - id: "1839007484"
    title: "Bulk scan phase 2 /BSP -2"
    last_modified: "unknown"
    space: "PL"
  - id: "1051493435"
    title: "1) Bulk Scanning - Service Onboarding and Live service changes Information"
    last_modified: "2026-07-01"
    space: "RBS"
confluence_checked_at: "2026-08-20T00:00:00Z"
sources_sha:
  "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/TransformationClient.java": "6d8494debc6cedcc3edb339b126ae3d43c5bd32d"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/request/TransformationRequest.java"
  : "d3a809222612c0bf26d215b484ab75b5fdf5e914"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/response/SuccessfulTransformationResponse.java"
  : "6d8494debc6cedcc3edb339b126ae3d43c5bd32d"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/response/CaseCreationDetails.java"
  : "6d8494debc6cedcc3edb339b126ae3d43c5bd32d"
  "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/caseupdate/CaseUpdateDataClient.java": "6d8494debc6cedcc3edb339b126ae3d43c5bd32d"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/caseupdate/model/request/CaseUpdateRequest.java"
  : "524322d1631cf453a82729538b199d0f1357f6c6"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/caseupdate/model/response/SuccessfulUpdateResponse.java"
  : "6d8494debc6cedcc3edb339b126ae3d43c5bd32d"
  "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/controllers/CcdCallbackController.java": "e5c2aae520540c34ba5a9476e59cdf9ebe3eca28"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/TransformationRequestCreator.java"
  : "2a3662a2e5440b8c1f1b427f00f3257373590421"
  "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/caseupdate/CaseUpdateRequestCreator.java": "2a3662a2e5440b8c1f1b427f00f3257373590421"
  "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/config/ServiceConfigItem.java": "e5c2aae520540c34ba5a9476e59cdf9ebe3eca28"
  "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/EventIds.java": "277a9607e25400f67e44fabafc0938060ea2d4d5"
  "bulk-scan-orchestrator:src/main/resources/application.yaml": "3bf6a33c0e90821820d8bab62a9f3129a9dd3244"
  "bulk-scan-ccd-definitions:definitions/bulkscan-exception/data/sheets/CaseEvent.json": "ea6da3682f7d976e1084903f88e0fbbed3c1bfaa"
  "bulk-scan-ccd-definitions:definitions/divorce/data/sheets/CaseEvent.json": "35b02b1772fe52b293b7ee0ada3f8e16f5cc5acc"
  "bulk-scan-ccd-definitions:definitions/probate/data/sheets/CaseEvent.json": "048e77eeeeb4c29153dd2bae36d39ff7a97317ad"
  "bulk-scan-ccd-definitions:definitions/finrem/data/sheets/CaseEvent.json": "cb564e9d4cd55543c6775a6e8da7c143958e36c6"
  "bulk-scan-ccd-definitions:definitions/privatelaw/data/sheets/CaseEvent.json": "e7accc5a391fe45df1a4eae14be811336197f28f"
  "bulk-scan-ccd-definitions:definitions/sscs/data/sheets/CaseEvent.json": "bf4ce54e4c3c5808d1af19a896d12faeb6e7b8d5"
  "bulk-scan-ccd-definitions:definitions/cmc/data/sheets/CaseEvent.json": "f6dae4ab633e09e8020afdf32667d6058c36d470"
  "bulk-scan-ccd-definitions:definitions/publiclaw/data/sheets/CaseEvent.json": "01bc579ef08926752d2f72815b2e9691f214d107"
  "bulk-scan-ccd-definitions:definitions/nfd/data/sheets/CaseEvent.json": "65671e97c555fb762c486969c24e6484d44a6fa2"
---

## TL;DR

- `bulk-scan-orchestrator` exposes three CCD callback endpoints and calls two service-team-provided URLs (`transformation-url`, `update-url`) to delegate jurisdiction-specific logic.
- The transformation URL converts exception record data into a service case; the update URL merges OCR data into an existing case.
- Both service-team URLs receive a `ServiceAuthorization` S2S header and return structured JSON with `case_data`, `event_id`, and optional `warnings`.
- CCD callback endpoints: `POST /callback/create-new-case`, `POST /callback/attach_case`, `POST /callback/reclassify-exception-record`.
- Service teams must add a `bulkScanCaseReference` field to their CCD case definition and define an `attachScannedDocsWithOcr` event for case updates.
- The orchestrator validates responses using Jakarta Bean Validation; invalid responses are treated as unrecoverable failures.

## CCD Callback Endpoints

These endpoints are called by CCD when a caseworker triggers an event on an Exception Record.

| Endpoint | CCD Event | Purpose |
|----------|-----------|---------|
| `POST /callback/create-new-case` | `createNewCase` | Transforms ER into a service case via `transformation-url`, then creates the case in CCD |
| `POST /callback/attach_case` | `attachToExistingCase`, and the per-service "extend" variants (`extendBulkScanCase`, probate's `extendCaveatCase`) | Attaches ER documents/OCR to an existing service case; calls `update-url` for `SUPPLEMENTARY_EVIDENCE_WITH_OCR` |
| `POST /callback/reclassify-exception-record` | `reclassifyRecord` | Reclassifies an exception record's journey classification |

All callbacks receive a standard CCD callback payload containing `case_details` with the Exception Record data. The orchestrator returns a CCD callback response with updated `data` fields.

The controller also accepts `Authorization` (IDAM token) and `user-id` headers from CCD, which are forwarded to downstream services for caseworker-context operations (`CcdCallbackController.java:48-49`).

### CCD-side wiring

The exception-record case types in `bulk-scan-ccd-definitions` are what point CCD at these endpoints. Each event's `CallBackURLAboutToSubmitEvent` is built from `${CCD_DEF_BULK_SCAN_ORCHESTRATOR_URL}`, so the definition is environment-parameterised rather than hard-coded per environment (`bulk-scan-ccd-definitions:definitions/bulkscan-exception/data/sheets/CaseEvent.json:21,35,49,101`).

`RetriesTimeoutURLAboutToSubmitEvent` is the per-event callback timeout in seconds. Where it is set, `createNewCase` gets 30 seconds and the attach events get 10. Line numbers below are into each definition's `definitions/<name>/data/sheets/CaseEvent.json`:

| Definition | `createNewCase` | attach events |
|------------|-----------------|---------------|
| `divorce` | 30 (line 35) | 10 (line 22) |
| `probate` | 30 (line 52) | 10 (lines 22, 37), and 10 on `reclassifyRecord` (line 105) |
| `finrem` | 30 (line 70) | 10 (line 22) |
| `privatelaw` | 30 (line 37) | 10 (line 23) |
| `sscs` | 30 (line 37) | not set |
| `cmc`, `publiclaw` | no `createNewCase` event | 10 (line 22) |
| `nfd`, `bulkscan-exception` | not set | not set |

Definitions that leave the column empty fall back to the retry/timeout defaults configured in `ccd-data-store-api` rather than to a bulk-scan value. `cmc` and `publiclaw` define no `createNewCase` event at all, matching their absence of a `transformation-url` in the orchestrator's service config.

<!-- CONFLUENCE-ONLY: Confluence pages 1064666568 and 1051493435 state that CCD's default 5s callback timeout is too short for the create-new-case chain and produces failures reported to the caseworker despite a successful case creation. The default lives in ccd-data-store-api deployment config and the failure mode is operational experience, so neither is checkable from bulk-scan source. -->
`create-new-case` fans out to the service team's `transformation-url`, CDAM and CCD before returning, so it is the callback most sensitive to a short timeout.

## Transformation URL Contract

The orchestrator POSTs to the service team's configured `transformation-url` to convert exception record data into a service case structure.

### Request: `POST {transformation-url}`

**Headers:**

| Header | Value |
|--------|-------|
| `ServiceAuthorization` | S2S token (service: `bulk_scan_orchestrator`) |
| `Content-Type` | `application/json` |

**Body (`TransformationRequest`):**

| Field | Type | Description |
|-------|------|-------------|
| `exception_record_id` | String | CCD ID of the exception record (null for automated processing) |
| `exception_record_case_type_id` | String | CCD case type of the ER (null for automated processing) |
| `id` | String | **Deprecated** alias for `exception_record_id` (still serialised) |
| `case_type_id` | String | **Deprecated** alias for `exception_record_case_type_id` (still serialised) |
| `envelope_id` | String | UUID of the original envelope |
| `is_automated_process` | boolean | `true` for queue-driven auto-creation, `false` for caseworker callback |
| `po_box` | String | PO Box from envelope metadata |
| `po_box_jurisdiction` | String | Jurisdiction derived from PO Box |
| `journey_classification` | String | Enum: `NEW_APPLICATION`, `SUPPLEMENTARY_EVIDENCE`, `SUPPLEMENTARY_EVIDENCE_WITH_OCR`, `EXCEPTION` |
| `form_type` | String | Form type identifier from OCR metadata |
| `delivery_date` | String (ISO datetime) | Envelope delivery timestamp |
| `opening_date` | String (ISO datetime) | Envelope opening timestamp |
| `scanned_documents` | Array | Scanned document metadata |
| `ocr_data_fields` | Array | OCR key-value pairs |
| `ignore_warnings` | boolean | `true` for automated; from CCD callback `ignoreWarnings` for manual |

<!-- DIVERGENCE: Confluence (page 1064666568) swagger spec for journey_classification lists only ["exception", "new_application", "supplementary_evidence"], but source Classification.java shows 4 values: EXCEPTION, NEW_APPLICATION, SUPPLEMENTARY_EVIDENCE, SUPPLEMENTARY_EVIDENCE_WITH_OCR. Source wins. -->

Source: `TransformationRequest.java:17-28`, `TransformationRequestCreator.java:43-58`

**Example request (from Confluence onboarding docs):**

```bash
curl --request POST \
  --url https://callback.service.host.url/transform-exception-record \
  --header 'content-type: application/json' \
  --header 'ServiceAuthorization: <valid s2s auth token>' \
  --data '{
    "case_type_id": "SSCS_ExceptionRecord",
    "id": "1234567890123456",
    "po_box": "12626",
    "po_box_jurisdiction": "SSCS",
    "form_type": "SSCS1",
    "delivery_date": "2019-07-20T12:34:56.789Z",
    "opening_date": "2019-07-21T13:00:00.000Z",
    "scanned_documents": [
      {
        "type": "form",
        "subtype": "SSCS1",
        "url": { "document_url": "https://dm-store-...", "document_binary_url": "...", "document_filename": "..." },
        "control_number": "123135453645",
        "file_name": "123135453645.pdf",
        "scanned_date": "2019-07-15T12:34:56.789Z",
        "delivery_date": "2019-07-18T12:00:00.000Z"
      }
    ],
    "ocr_data_fields": [
      { "name": "appellant_firstName", "value": "John" },
      { "name": "appellant_lastName", "value": "Smith" }
    ]
  }'
```

### Response: `SuccessfulTransformationResponse`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `case_creation_details` | Object | Yes | Contains the case type, event, and data for CCD |
| `case_creation_details.case_type_id` | String | Yes | Target CCD case type ID |
| `case_creation_details.event_id` | String | Yes | CCD event ID to fire |
| `case_creation_details.case_data` | Map | Yes | Full case data payload for CCD |
| `warnings` | List of String | No | Validation warnings; if non-empty and `ignore_warnings` was false, the orchestrator returns warnings to the caseworker |
| `errors` | List of String | No | Validation errors; if returned with HTTP 422, these are shown to the caseworker and case creation is blocked |
| `supplementary_data` | Map of Maps | No | Supplementary data forwarded to CCD (only if `supplementaryDataEnabled` config flag is true) |

The `case_creation_details.case_data` **must** include `bulkScanCaseReference` as a top-level field, populated with the `id` value from the request. This provides idempotency protection -- the orchestrator searches for existing cases by this reference before creating a new one.

Source: `SuccessfulTransformationResponse.java`, `CaseCreationDetails.java`

### Error handling

| HTTP Status | Orchestrator behaviour |
|-------------|----------------------|
| 200 | Success; response validated via Jakarta Bean Validation |
| 400 / 422 | `UNRECOVERABLE_FAILURE` -- message dead-lettered (automated) or error returned to caseworker (callback). For 422, response body `errors` and `warnings` are presented to the caseworker. |
| 5xx / timeout | `POTENTIALLY_RECOVERABLE_FAILURE` -- message requeued for retry |
| Invalid response body | `ConstraintViolationException` treated as unrecoverable |

Source: `EnvelopeTransformer.java:56-67`

## Update URL Contract

The orchestrator POSTs to the service team's configured `update-url` when attaching `SUPPLEMENTARY_EVIDENCE_WITH_OCR` to an existing case.

### Request: `POST {update-url}`

**Headers:**

| Header | Value |
|--------|-------|
| `ServiceAuthorization` | S2S token (service: `bulk_scan_orchestrator`) |
| `Content-Type` | `application/json` |

**Body (`CaseUpdateRequest`):**

| Field | Type | Description |
|-------|------|-------------|
| `is_automated_process` | boolean | `true` for queue-driven auto-update, `false` for caseworker callback |
| `case_update_details` | Object | New-format envelope/ER details (preferred) |
| `case_update_details.exception_record_case_type_id` | String | Case type of the ER |
| `case_update_details.exception_record_id` | String | CCD ID of the ER |
| `case_update_details.envelope_id` | String | UUID of the envelope |
| `case_update_details.po_box` | String | PO Box |
| `case_update_details.po_box_jurisdiction` | String | Jurisdiction |
| `case_update_details.form_type` | String | Form type |
| `case_update_details.delivery_date` | String (ISO datetime) | Delivery timestamp |
| `case_update_details.opening_date` | String (ISO datetime) | Opening timestamp |
| `case_update_details.scanned_documents` | Array | Scanned documents |
| `case_update_details.ocr_data_fields` | Array | OCR key-value pairs |
| `case_details` | Object | The existing CCD case being updated |
| `case_details.id` | String | CCD case ID |
| `case_details.case_type_id` | String | CCD case type |
| `case_details.case_data` | Map | Current case data |
| `exception_record` | Object | **Deprecated** -- outer wrapper still sent for backwards compatibility |

Source: `CaseUpdateRequest.java:7-8`, `CaseUpdateRequestCreator.java:31-40`

**Example request (from Confluence onboarding docs):**

```bash
curl --request POST \
  --url https://callback.service.host.url/update-case \
  --header 'content-type: application/json' \
  --header 'ServiceAuthorization: <valid s2s auth token>' \
  --data '{
    "exception_record": {
      "id": "id",
      "case_type_id": "case_type_123",
      "po_box": "12345",
      "po_box_jurisdiction": "BULKSCAN",
      "form_type": "BULK1",
      "journey_classification": "SUPPLEMENTARY_EVIDENCE_WITH_OCR",
      "delivery_date": "2019-08-01T01:02:03.456Z",
      "opening_date": "2019-08-02T02:03:04.567Z",
      "scanned_documents": [ ... ],
      "ocr_data_fields": [ { "name": "country", "value": "United Kingdom" } ]
    },
    "case_details": {
      "id": "1234123412341234",
      "case_type_id": "case_type_123",
      "case_data": { ... }
    }
  }'
```

### Response: `SuccessfulUpdateResponse`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `case_update_details` | Object | Yes | Contains event and updated case data |
| `case_update_details.event_id` | String | Yes | Present in model but **not used** by the orchestrator (it hard-codes `attachScannedDocsWithOcr` as the CCD event) |
| `case_update_details.case_data` | Map | Yes | Updated case data to submit to CCD |
| `warnings` | List of String | No | Validation warnings |

Source: `SuccessfulUpdateResponse.java`, `response/CaseUpdateDetails.java`, `CcdCaseUpdater.java:80-85`

### Service-team constraints for case updates

Services must adhere to these rules when returning updated case data:

- **Preserve `bulkScanCaseReference`** -- this field is used for duplicate detection and its value must not be changed.
- **Add scanned documents** from the exception record's `scanned_documents` to the case's `scannedDocuments` collection, ensuring no duplicates (checked by `control_number`). The orchestrator will only call the update endpoint if the exception record contains documents not already present in the case.
- After calling the service, the orchestrator injects `exceptionRecordReference` into each newly-added scanned document entry before submitting to CCD (`SupplementaryEvidenceUpdater.java:132-133`).

<!-- CONFLUENCE-ONLY: these are obligations on the service teams own endpoint, stated in Confluence page 1064666568. The orchestrator does not enforce them, so they are not checkable in source; the third bullet is the only one with a source citation. -->
These constraints are documented in the Confluence onboarding guide (page 1064666568, section 2.3.4).

## Service Configuration

Each jurisdiction's URLs are declared in the orchestrator's `application.yaml`:

```yaml
service-config:
  services:
    - service: bulkscan
      jurisdiction: BULKSCAN
      transformation-url: ${TRANSFORMATION_URL_BULKSCAN}
      update-url: ${UPDATE_URL_BULKSCAN}
      case-type-ids:
        - Bulk_Scanned
      allow-creating-case-before-payments-are-processed: true
      allow-attaching-to-case-before-payments-are-processed-for-classifications:
        - SUPPLEMENTARY_EVIDENCE
      form-type-to-surname-ocr-field-mappings:
        - formType: PERSONAL
          ocrFields:
            - last_name
      auto-case-creation-enabled: ${AUTO_CASE_CREATION_ENABLED_BULKSCAN}
      auto-case-update-enabled: ${AUTO_CASE_UPDATE_ENABLED_BULKSCAN}
      case-definition-has-envelope-ids: ${CASE_DEFINITION_HAS_ENVELOPE_IDS_BULKSCAN}
      search-cases-by-envelope-id: ${CAN_SEARCH_CASES_BY_ENVELOPE_ID_BULKSCAN}
      supplementary-data-enabled: false
```

### Config flags per service

| Flag | Effect |
|------|--------|
| `transformation-url` | Required for `create-new-case` callback to proceed (`CreateCaseCallbackService.java:149`) |
| `update-url` | Required for `SUPPLEMENTARY_EVIDENCE_WITH_OCR` attach callback (`SupplementaryEvidenceWithOcrUpdater.java:46-47`) |
| `auto-case-creation-enabled` | Enables automated (non-callback) case creation from queue |
| `auto-case-update-enabled` | Enables automated (non-callback) case update from queue |
| `supplementary-data-enabled` | Forwards `supplementary_data` from transformation response to CCD |
| `allow-creating-case-before-payments-are-processed` | When false, blocks case creation if `awaitingPaymentDCNProcessing == "Yes"` |
| `allow-attaching-to-case-before-payments-are-processed-for-classifications` | List of classifications (e.g. `SUPPLEMENTARY_EVIDENCE`) that bypass the payment check when attaching to a case |
| `case-definition-has-envelope-ids` | Whether the service's CCD case definition includes an envelope IDs field |
| `search-cases-by-envelope-id` | Enables searching for existing cases by envelope ID (for duplicate detection) |
| `form-type-to-surname-ocr-field-mappings` | Maps form types to OCR field names containing a surname; used for case-matching heuristics |

Source: `ServiceConfigItem.java`, `application.yaml:88-260`

### Currently configured services

| Service | Jurisdiction | Has transformation-url | Has update-url |
|---------|-------------|----------------------|----------------|
| bulkscan | BULKSCAN | Yes | Yes |
| bulkscanauto | BULKSCAN | Yes | Yes |
| sscs | SSCS | Yes | No |
| probate | PROBATE | Yes | Yes |
| divorce | DIVORCE | Yes | No |
| finrem | DIVORCE | Yes | No |
| cmc | CMC | No | No |
| publiclaw | PUBLICLAW | No | No |
| nfd | DIVORCE | Yes | No |
| privatelaw | PRIVATELAW | Yes | No |

Source: `application.yaml:94-259`

## CCD Definition Requirements

Service teams onboarding with bulk scan phase 2 must configure their CCD definitions with:

1. **`bulkScanCaseReference` field** -- a top-level `Text` field on the service case type. Contains the CCD reference of the exception record from which the case was created. Provides idempotency protection.

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

2. **Case creation event** -- a new CCD event (ID chosen by the service team) used for creating service cases. The `event_id` returned in `SuccessfulTransformationResponse.case_creation_details.event_id` must match this.

3. **`attachScannedDocsWithOcr` event** -- used by the orchestrator when updating existing cases with supplementary evidence containing OCR data. Caseworkers who trigger the attach action must have access to this event via `AuthorisationCaseEvent`.

4. **`CallBackURLAboutToSubmitEvent`** for the `createNewCase` event must point to `{orchestrator-host}/callback/create-new-case`.

<!-- CONFLUENCE-ONLY: the CCD definition requirements in this section come from Confluence pages 1064666568 and 1051493435. They are satisfied in each services own CCD definition repo, not in orchestrator source; bulk-scan-ccd-definitions shows a worked example for privatelaw. -->
The `RetriesTimeoutURLAboutToSubmitEvent` column for `createNewCase` should be set to 30 seconds (default 5s is insufficient for the multi-service-call chain).

Source: Confluence page 1064666568 section 2.1, confirmed by `EventIds.java:10-11`

## Authentication

All calls from the orchestrator to service-team URLs carry a `ServiceAuthorization` header containing an S2S token for service name `bulk_scan_orchestrator` (`TransformationClient.java:45-46`, `CaseUpdateDataClient.java:39-68`). Service teams must whitelist this S2S name.

CCD operations use a per-jurisdiction cached IDAM authenticator (`CcdAuthenticatorFactory`) with the `bulkscan` system user. Auth errors (401/403) evict the cache entry (`CcdApi.java:591-594`).

## Sample Application

The bulk-scan team provides a reference implementation for service teams:

- Repository: [bulk-scan-ccd-event-handler-sample-app](https://github.com/hmcts/bulk-scan-ccd-event-handler-sample-app)
- Implements all required endpoints: OCR validation, transformation, and case update
- Useful as a starting point and for end-to-end testing

## Important Notes

- `SUPPLEMENTARY_EVIDENCE` (without OCR) does **not** call `update-url`. It directly fires the `attachScannedDocs` CCD event on the target case.
- Only `SUPPLEMENTARY_EVIDENCE_WITH_OCR` triggers the `update-url` because OCR data requires service-specific processing.
- The `exception_record` wrapper in `CaseUpdateRequest` is deprecated (marked `forRemoval`) but still serialised. New service implementations should read from `case_update_details`.
- Similarly, `TransformationRequest.id` and `TransformationRequest.caseTypeId` are deprecated aliases still serialised alongside `exception_record_id` / `exception_record_case_type_id`.
- After a successful transformation, document hashes are fetched from CDAM and injected into `scannedDocuments[].url.document_hash` before the case is submitted to CCD (`AutoCaseCreator.java:96-116`).
- The orchestrator hard-codes the event ID `attachScannedDocsWithOcr` when updating cases via CCD (`CcdCaseUpdater.java:85`, `AutoCaseUpdater.java:80`). The `event_id` field in `SuccessfulUpdateResponse` is present in the model but not consumed by the callback path.
- The conventional endpoint paths used by service teams are `/transform-exception-record` (transformation) and `/update-case` (updates), though the orchestrator only cares about the configured URL -- the path segment is the service team's choice.

## See also

- [Orchestration Flow](../explanation/orchestration-flow.md) — how the orchestrator decides when to call transformation-url versus update-url
- [Exception Records](../explanation/exception-records.md) — the CCD state machine and caseworker conversion flow that triggers these callbacks
- [Architecture](../explanation/architecture.md) — end-to-end pipeline explanation
- [How to Onboard a New Jurisdiction](../how-to/onboard-new-jurisdiction.md) — implementing transformation-url, update-url, and OCR validation endpoints
