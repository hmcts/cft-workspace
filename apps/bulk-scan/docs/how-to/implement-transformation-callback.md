---
title: Implement Transformation Callback
topic: orchestration
diataxis: how-to
product: bulk-scan
audience: both
sources:
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/request/TransformationRequest.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/response/SuccessfulTransformationResponse.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/response/CaseCreationDetails.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/TransformationClient.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/TransformationRequestCreator.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/CcdNewCaseCreator.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/CreateCaseCallbackService.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/EnvelopeTransformer.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/config/ServiceConfigItem.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/model/request/DocumentType.java
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/bulk-scan/bulk-scan-orchestrator/src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/request/TransformationRequest.java
  - apps/bulk-scan/bulk-scan-orchestrator/src/main/resources/application.yaml
confluence:
  - id: "1064666568"
    title: "Technical prerequisites and information for Service on-boarding with Phase 2  Bulk scanning for case creation."
    last_modified: "unknown"
    space: "RBS"
  - id: "1425080530"
    title: "Automated case creation and update"
    last_modified: "unknown"
    space: "RBS"
  - id: "931660170"
    title: "Transformation API Requirements"
    last_modified: "unknown"
    space: "RBS"
  - id: "1409844104"
    title: "Automatic Case Creation Specification--WIP"
    last_modified: "unknown"
    space: "RBS"
  - id: "1051493435"
    title: "1) Bulk Scanning - Service Onboarding and Live service changes Information"
    last_modified: "unknown"
    space: "RBS"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- The `transformation-url` is a POST endpoint your service implements to convert an exception record (or raw envelope data) into a proper service case in CCD.
- The orchestrator sends a `TransformationRequest` containing scanned documents, OCR data, and metadata; your endpoint returns a `SuccessfulTransformationResponse` with `case_type_id`, `event_id`, and `case_data`.
- Authentication is via the `ServiceAuthorization` S2S header (service name `bulk_scan_orchestrator`).
- The response is validated server-side with Jakarta Bean Validation -- a malformed response yields a `ConstraintViolationException` that the orchestrator treats as a fatal callback failure.
- Register the URL in the orchestrator's service config YAML under `service-config.services.<your-service>.transformation-url`.
- Your service's CCD case definition must include the `bulkScanCaseReference` field and a `bulkScanEnvelopes` collection (for services supporting automated processing).

## Prerequisites

- Your service is registered in `bulk-scan-orchestrator`'s `service-config.services` configuration.
- Your service can verify the `ServiceAuthorization` S2S token issued by `bulk_scan_orchestrator`.
- A CCD case type and event exist for the case you want to create (your service's own definition, not the Exception Record type).
- Your service case definition includes the `bulkScanCaseReference` field (type `Text`, security `PUBLIC`) to store the exception record reference.
- If you support automated case creation, your case definition also includes the `bulkScanEnvelopes` collection field and `BulkScanEnvelope` complex type (see "CCD definition requirements" below).
- The exception record definition's `createNewCase` event must have its `CallBackURLAboutToSubmitEvent` pointing to the orchestrator's `/callback/create-new-case` endpoint with a **30-second timeout** (set in `RetriesTimeoutURLAboutToSubmitEvent` column; the default 5 seconds is insufficient).

## Steps

### 1. Create the POST endpoint

Expose a POST endpoint at a path of your choice (e.g. `/transform-exception-record`). The orchestrator will call this URL with `Content-Type: application/json` and a `ServiceAuthorization` header.

### 2. Accept the transformation request

The request body has this shape:

```json
{
  "exception_record_id": "1234567890123456",
  "exception_record_case_type_id": "BULKSCAN_ExceptionRecord",
  "envelope_id": "a0e1f2d3-...",
  "is_automated_process": false,
  "po_box": "12345",
  "po_box_jurisdiction": "BULKSCAN",
  "journey_classification": "NEW_APPLICATION",
  "form_type": "A1",
  "delivery_date": "2024-03-15T10:30:00",
  "opening_date": "2024-03-15T11:00:00",
  "scanned_documents": [
    {
      "type": "form",
      "subtype": "A1",
      "url": { "document_url": "http://dm-store/documents/..." },
      "control_number": "1234",
      "file_name": "form_A1.pdf",
      "scanned_date": "2024-03-15T09:00:00",
      "delivery_date": "2024-03-15T10:30:00"
    }
  ],
  "ocr_data_fields": [
    { "name": "firstName", "value": "Jane" },
    { "name": "lastName", "value": "Smith" }
  ],
  "ignore_warnings": false
}
```

Key fields:

| Field | Description |
|-------|-------------|
| `exception_record_id` | CCD case ID of the exception record being converted. Null when `is_automated_process` is true. |
| `exception_record_case_type_id` | Case type of the exception record (e.g. `BULKSCAN_ExceptionRecord`). Null when automated. |
| `envelope_id` | ID of the Bulk Scan envelope that originated this data. Always present. |
| `is_automated_process` | `true` if the orchestrator is auto-creating without caseworker intervention; `false` for manual ER callback. |
| `form_type` | Identifies which paper form was scanned -- use this to route transformation logic. Validation should reject unrecognised form types. |
| `journey_classification` | One of `EXCEPTION`, `NEW_APPLICATION`, `SUPPLEMENTARY_EVIDENCE`, `SUPPLEMENTARY_EVIDENCE_WITH_OCR` (`Classification.java`). |
| `ocr_data_fields` | Key-value pairs extracted by the scanning OCR engine. |
| `scanned_documents` | The document references already stored in CDAM. Each document has a `type` field with values: `cherished`, `coversheet`, `form`, `other`, `supporting_documents`, `will`, `forensic_sheets`, `iht`, `pps_legal_statement` (`DocumentType.java`). |
| `ignore_warnings` | When `true`, proceed even if there are validation warnings. |

<!-- DIVERGENCE: Confluence (page 1064666568) lists document type enum as [cherished, coversheet, form, other], but DocumentType.java shows 9 values including supporting_documents, will, forensic_sheets, iht, pps_legal_statement. Source wins. -->

<!-- DIVERGENCE: Confluence (page 1064666568) states date format is yyyy-MM-dd'T'HH:mm:ss.SSS'Z' (with milliseconds and Z suffix), but source uses java.time.LocalDateTime serialization which produces yyyy-MM-dd'T'HH:mm:ss without timezone. Source wins; your endpoint should accept both formats defensively. -->

Note: Deprecated aliases `id` and `case_type_id` are still serialised alongside `exception_record_id` and `exception_record_case_type_id` (`TransformationRequest.java:17-28`). New implementations should use the `exception_record_*` variants. Your endpoint **must ignore unknown fields** in requests to remain compatible as new fields are added over time.

### 3. Validate and transform the data

Map the OCR fields and scanned documents into the case data structure your CCD case type expects. Validation logic should be **specific to form type** (determined by the `subtype` in `scanned_documents` and/or the top-level `form_type` field). If form type is unrecognised or unsupported, that should result in a validation error.

If validation fails:

- Return HTTP **422** with an error body containing `errors` and `warnings` arrays:
  ```json
  {
    "errors": ["Applicant's last name is missing"],
    "warnings": ["Applicant's first name consists of multiple words"]
  }
  ```
  The orchestrator parses this response (`ClientServiceErrorResponse.java`) and:
  - For manual (caseworker-triggered) requests: returns errors and warnings to the caseworker in XUI.
  - For automated requests (`is_automated_process: true`): creates an exception record instead.
- Return HTTP **400** only for genuinely malformed requests (bad syntax). The orchestrator treats this as an unrecoverable failure (`EnvelopeTransformer.java:59-61`), creates an exception record, and the BSP team is alerted about the incompatibility problem.
- Other status codes (5xx, other 4xx): the orchestrator retries a few times. If all retries fail, it creates an exception record.

If the data is partially valid, return HTTP **200** with `warnings` populated and let the caseworker decide (they can re-submit with `ignore_warnings: true`). When `ignore_warnings` is false and your response contains warnings, the orchestrator returns those warnings to the caseworker without creating a case (`CcdNewCaseCreator.java:90-97`).

<!-- CONFLUENCE-ONLY: Confluence states the orchestrator "retries a few times" on non-400/422 errors before creating an exception record. The EnvelopeTransformer source classifies non-400/422 errors as POTENTIALLY_RECOVERABLE but the retry mechanism is in the Service Bus message handler, not verified in the transformer itself. -->

### 4. Return the success response

```json
{
  "case_creation_details": {
    "case_type_id": "MyService_Case",
    "event_id": "createCase",
    "case_data": {
      "applicantFirstName": "Jane",
      "applicantLastName": "Smith",
      "scannedDocuments": [...]
    }
  },
  "warnings": []
}
```

Response contract:

| Field | Required | Description |
|-------|----------|-------------|
| `case_creation_details` | Yes | Must not be null (`@NotNull`). |
| `case_creation_details.case_type_id` | Yes | The CCD case type to create (`@NotEmpty`). |
| `case_creation_details.event_id` | Yes | The CCD event to fire (`@NotEmpty`). |
| `case_creation_details.case_data` | Yes | Map of case data fields (`@NotEmpty`). |
| `warnings` | No | List of warning strings shown to the caseworker. |
| `supplementary_data` | No | `Map<String, Map<String, Object>>` -- only forwarded if `supplementaryDataEnabled` is true for your service in orchestrator config. |

The orchestrator validates the response with Jakarta Bean Validation (`TransformationClient.java:62-68`). If any `@NotNull` / `@NotEmpty` constraint is violated, a `ConstraintViolationException` is thrown and the transformation is treated as failed.

**Important**: Your `case_data` should include `bulkScanCaseReference` populated with the `exception_record_id` (or `id`) from the request. The orchestrator will overwrite this field (`CcdNewCaseCreator.java:248`) regardless, but including it demonstrates contract compliance and serves as documentation of intent.

<!-- CONFLUENCE-ONLY: Confluence (page 1064666568) states services MUST include bulkScanCaseReference in case_data for "out of the box idempotency protection". Source confirms the orchestrator always overwrites it (CcdNewCaseCreator.java:248), so it's not strictly required from the service side but is a best practice. -->

### 5. Register the URL in orchestrator config

In the orchestrator's application configuration (typically managed via Helm chart values), add or update your service entry:

```yaml
service-config:
  services:
    - service: your_service  # must match blob storage container name
      jurisdiction: YOUR_JURISDICTION
      transformation-url: ${TRANSFORMATION_URL_YOUR_SERVICE}
      update-url: ${UPDATE_URL_YOUR_SERVICE}
      case-type-ids:
        - YourService_Case
      auto-case-creation-enabled: ${AUTO_CASE_CREATION_ENABLED_YOUR_SERVICE}
      auto-case-update-enabled: ${AUTO_CASE_UPDATE_ENABLED_YOUR_SERVICE}
      case-definition-has-envelope-ids: ${CASE_DEFINITION_HAS_ENVELOPE_IDS_YOUR_SERVICE}
      search-cases-by-envelope-id: ${CAN_SEARCH_CASES_BY_ENVELOPE_ID_YOUR_SERVICE}
      supplementary-data-enabled: false
```

Key configuration flags (`ServiceConfigItem.java`):

| Flag | Default | Purpose |
|------|---------|---------|
| `transformation-url` | (required) | URL the orchestrator POSTs `TransformationRequest` to |
| `update-url` | (optional) | URL for the case-update callback |
| `auto-case-creation-enabled` | `false` | Enable automated case creation from envelopes without caseworker intervention |
| `auto-case-update-enabled` | `false` | Enable automated case update from supplementary evidence envelopes |
| `case-definition-has-envelope-ids` | `false` | Whether the service CCD definition includes `bulkScanEnvelopes` field |
| `search-cases-by-envelope-id` | `false` | Enable searching cases by envelope ID for duplicate prevention |
| `supplementary-data-enabled` | `false` | Forward `supplementary_data` from your transformation response to CCD |
| `allow-creating-case-before-payments-are-processed` | `false` | Allow case creation even if payments haven't been processed |

The `transformation-url` must be configured (non-empty) for the `createNewCase` callback to proceed -- `CreateCaseCallbackService.java:149` filters out services where this is null or empty.

### 6. Handle the automated path

When `is_automated_process` is `true`:

- `exception_record_id` and `exception_record_case_type_id` will be null.
- `ignore_warnings` is always `true` (`TransformationRequestCreator.java:43-58`).
- Your endpoint should not rely on an existing exception record -- the orchestrator is creating the case directly from an envelope without caseworker intervention.

### 7. Handle S2S authentication

Validate the `ServiceAuthorization` header in your endpoint. The service name will be `bulk_scan_orchestrator`. Use `service-auth-provider-java-client` to verify the token. Return HTTP 401 if the token is missing/invalid, or 403 if the calling service is not authorised.

### 8. CCD definition requirements

Your service's CCD case definition must include the following fields and configuration for the transformation flow to work end-to-end:

**Required fields (all services):**

1. `bulkScanCaseReference` (type `Text`) -- stores the exception record ID for duplicate prevention:
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

2. `bulkScanEnvelopes` (type `Collection` of `BulkScanEnvelope`) -- used for duplicate prevention in automated flows:
   ```json
   {
     "LiveFrom": "01/01/2020",
     "CaseTypeID": "{your case type ID}",
     "ID": "bulkScanEnvelopes",
     "Label": "Bulk Scan Envelopes",
     "FieldType": "Collection",
     "FieldTypeParameter": "BulkScanEnvelope",
     "SecurityClassification": "PUBLIC"
   }
   ```

3. `BulkScanEnvelope` complex type (in **ComplexType** tab):
   ```json
   [
     { "ID": "BulkScanEnvelope", "ListElementCode": "id", "FieldType": "Text", "ElementLabel": "ID" },
     { "ID": "BulkScanEnvelope", "ListElementCode": "action", "FieldType": "Text", "ElementLabel": "Action" }
   ]
   ```

**Required events:**

- A case-creation event (your choice of event ID) that Bulk Scan uses via `startForCaseworker`/`submitForCaseworker`.
- `attachScannedDocsWithOcr` -- event used for updating an existing case with OCR data.

**Required role configuration (for automated processing):**

- Grant `caseworker-{your-service}-systemupdate` role `CRU` access to the creation and update events (in **AuthorisationCaseEvent** tab).
- Grant the same role `CRU` access to **all case fields** (in **AuthorisationCaseField** tab) so the orchestrator can write complete case data.
- Grant caseworker roles the same access to `bulkScanEnvelopes` as they have to `bulkScanCaseReference`.

<!-- CONFLUENCE-ONLY: CCD role configuration details (caseworker-{service}-systemupdate with CRU on all fields) are documented in Confluence but not enforced in orchestrator source code -- it's a CCD authorisation requirement. -->

## What happens after your endpoint responds

1. The orchestrator takes your `case_creation_details` and submits it to CCD via `startForCaseworker` + `submitForCaseworker`.
2. Before submission, it modifies the case data:
   - Sets `bulkScanCaseReference` to the exception record ID (`CcdNewCaseCreator.java:248`).
   - If the service supports envelope references (`caseDefinitionHasEnvelopeIds: true`), sets `bulkScanEnvelopes` to a collection containing the envelope ID with action `CREATE` (`CcdNewCaseCreator.java:250-254`). This field prevents duplicate case creation from the same envelope.
   - Even if your service returns these fields in `case_data`, the orchestrator **overwrites** them.
3. Document hashes are fetched from CDAM and injected into `scannedDocuments[].url.document_hash` (`CcdNewCaseCreator.java:278-304`).
4. If `supplementaryDataEnabled` is true for your service, the `supplementary_data` map from your response is forwarded to CCD.
5. On success, the exception record is finalised: its `caseReference` field is set to the new case ID and warnings are cleared (`ExceptionRecordFinalizer.java:26-32`).

## Verify

1. Create an exception record in CCD for your jurisdiction (via a test envelope or manually).
2. As a caseworker, trigger the "Create New Case" event on the exception record in XUI.
3. Confirm that:
   - Your transformation endpoint receives the POST with expected OCR data and documents.
   - A new service case is created in CCD with the correct `case_type_id` and populated `case_data`.
   - The exception record's `caseReference` field is updated to the new case ID.

Alternatively, for the automated path, submit an envelope with `NEW_APPLICATION` classification and `auto-case-creation-enabled: true` for your service, then verify the case is created without caseworker intervention.

## Reference implementation

The Bulk Scan team maintains a sample application that simulates a product service with all required endpoints:

- <https://github.com/hmcts/bulk-scan-ccd-event-handler-sample-app>

This is used for end-to-end testing and serves as a working reference of the transformation, validation, and update contracts.

## Examples

### TransformationRequest Java model

The exact class the orchestrator serialises and POSTs to your `transformation-url`. Note the deprecated `id`/`case_type_id` aliases that are still sent for backward compatibility:

```java
// Source: apps/bulk-scan/bulk-scan-orchestrator/src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/model/request/TransformationRequest.java
public class TransformationRequest {

    /** @deprecated Use {@link #exceptionRecordId} */
    @Deprecated
    public final String id;

    @JsonProperty("exception_record_id")
    public final String exceptionRecordId;

    /** @deprecated Use {@link #exceptionRecordCaseTypeId} */
    @Deprecated
    @JsonProperty("case_type_id")
    public final String caseTypeId;

    @JsonProperty("exception_record_case_type_id")
    public final String exceptionRecordCaseTypeId;

    @JsonProperty("envelope_id")
    public final String envelopeId;

    @JsonProperty("is_automated_process")
    public final boolean isAutomatedProcess;

    @JsonProperty("po_box")
    public final String poBox;

    @JsonProperty("po_box_jurisdiction")
    public final String poBoxJurisdiction;

    @JsonProperty("journey_classification")
    public final Classification journeyClassification;

    @JsonProperty("form_type")
    public final String formType;

    @JsonProperty("delivery_date")
    public final LocalDateTime deliveryDate;

    @JsonProperty("opening_date")
    public final LocalDateTime openingDate;

    @JsonProperty("scanned_documents")
    public final List<ScannedDocument> scannedDocuments;

    @JsonProperty("ocr_data_fields")
    public final List<OcrDataField> ocrDataFields;

    @JsonProperty("ignore_warnings")
    public final boolean ignoreWarnings;
}
```

### A real service entry in orchestrator service-config

The Probate service entry from the orchestrator's `application.yaml` shows a fully configured service with both `transformation-url` and `update-url`, multi-form surname mappings, multiple `case-type-ids`, and the payment gate enabled:

```yaml
// Source: apps/bulk-scan/bulk-scan-orchestrator/src/main/resources/application.yaml
    - service: probate
      jurisdiction: PROBATE
      transformation-url: ${TRANSFORMATION_URL_PROBATE}
      update-url: ${UPDATE_URL_PROBATE}
      form-type-to-surname-ocr-field-mappings:
        - formType: PA1P
          ocrFields:
            - deceasedSurname
        - formType: PA8A
          ocrFields:
            - deceasedSurname
        - formType: PA1A
          ocrFields:
            - deceasedSurname
      case-type-ids:
        - GrantOfRepresentation
        - Caveat
        - StandingSearch
        - WillLodgement
      allow-creating-case-before-payments-are-processed: true
      auto-case-creation-enabled: ${AUTO_CASE_CREATION_ENABLED_PROBATE}
      auto-case-update-enabled: ${AUTO_CASE_UPDATE_ENABLED_PROBATE}
      case-definition-has-envelope-ids: ${CASE_DEFINITION_HAS_ENVELOPE_IDS_PROBATE}
      search-cases-by-envelope-id: ${CAN_SEARCH_CASES_BY_ENVELOPE_ID_PROBATE}
```

## See also

- [API Orchestrator Reference](../reference/api-orchestrator.md) — full request/response contract specification with curl examples and error handling table
- [Exception Records](../explanation/exception-records.md) — the CCD state machine and caseworker conversion flow that triggers this callback
- [Orchestration Flow](../explanation/orchestration-flow.md) — how the orchestrator decides when to call transformation-url versus update-url
- [Onboard a New Jurisdiction](onboard-new-jurisdiction.md) — the broader checklist that includes this callback as one of many steps
