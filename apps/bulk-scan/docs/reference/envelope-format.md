---
title: Envelope Format
topic: processing
diataxis: reference
product: bulk-scan
audience: both
sources:
  - bulk-scan-processor:src/main/resources/metafile-schema.json
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/tasks/processor/ZipFileProcessor.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/validation/MetafileJsonValidator.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/validation/EnvelopeValidator.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/model/blob/InputEnvelope.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/model/blob/InputScannableItem.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/model/blob/InputOcrData.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/model/blob/InputNonScannableItem.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/util/OcrDataDeserializer.java
  - bulk-scan-processor:src/main/resources/application.yaml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/bulk-scan/bulk-scan-processor/src/main/resources/metafile-schema.json
  - apps/bulk-scan/bulk-scan-processor/src/main/resources/application.yaml
confluence:
  - id: "1775307063"
    title: "Technical Specification V1.4"
    last_modified: "2024-06-06T00:00:00Z"
    space: "RBS"
  - id: "1933856272"
    title: "Metadata files for Bulk Scan"
    last_modified: "2025-01-01T00:00:00Z"
    space: "DATS"
  - id: "1694700322"
    title: "Bulk Scan testing in lower environments"
    last_modified: "2023-06-30T00:00:00Z"
    space: "DATS"
  - id: "834372271"
    title: "Testing Bulk Scanning using Blob Storage"
    last_modified: "2023-01-01T00:00:00Z"
    space: "PRO"
  - id: "1663977130"
    title: "Bulk scan - Developer FAQs"
    last_modified: "2023-06-30T00:00:00Z"
    space: "DATS"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- An envelope is a signed outer ZIP containing `envelope.zip` (metadata.json + PDFs) and a `signature` file for non-repudiation.
- The ZIP filename must match the pattern `{numeric}_{DD}-{MM}-{YYYY}-{HH}-{mm}-{ss}.zip` (or `.test.zip` for test envelopes).
- `metadata.json` is validated against a JSON Schema (draft-04) with `additionalProperties: false` — unknown fields cause rejection.
- Each scannable item requires a unique `document_control_number` and a corresponding `.pdf` file in the ZIP.
- OCR data is base64-encoded JSON with a `Metadata_file` array of `{metadata_field_name, metadata_field_value}` pairs; required when classification is `NEW_APPLICATION` or `SUPPLEMENTARY_EVIDENCE_WITH_OCR` and a FORM/SSCS1 document is present.
- Maximum PDF size per document: 300 MB.

## ZIP file structure

The supplier uploads a **signed outer ZIP** to Azure Blob Storage. The blob-router-service verifies the signature before forwarding the inner envelope to bulk-scan-processor.

### Outer ZIP (uploaded to blob storage)

```
<name-of-application>.zip
  |-- envelope.zip        (inner ZIP containing the actual envelope payload)
  |-- signature           (digital signature of envelope.zip)
```

The outer ZIP is digitally signed using SHA256withRSA. The supplier signs `envelope.zip` with their private key; HMCTS verifies the signature using the supplier's pre-shared public key. The public/private key pair should be renewed every six months.

<!-- CONFLUENCE-ONLY: outer ZIP structure with signature verified via blob-router-service, not bulk-scan-processor source -->

### Inner ZIP (envelope.zip) — processed by bulk-scan-processor

| Entry | Required | Constraints |
|-------|----------|-------------|
| `metadata.json` | Yes (exactly one) | Must be a `.json` file; validated against `metafile-schema.json` |
| `*.pdf` | Yes (one or more) | Each PDF referenced by a `scannable_items[].file_name` entry |
| Any other extension | Forbidden | Triggers `NonPdfFileFoundException` and envelope rejection |

The inner ZIP is processed by `ZipFileProcessor.getZipContentDetail` which iterates entries: `.json` extension files are read as metadata bytes, `.pdf` extension files are recorded by name, and anything else causes immediate rejection (`ZipFileProcessor.java:113-135`).

Individual PDFs are size-checked against a 300 MB limit (`ZipFileProcessor.MAX_PDF_SIZE = 314_572_800`) before upload. Exceeding this triggers blob rejection to the `*-rejected` container (`ZipFileProcessor.java:68-79`).

<!-- DIVERGENCE: Confluence Technical Specification V1.4 says max file size is 75MB, but bulk-scan-processor:ZipFileProcessor.java:29 shows MAX_PDF_SIZE = 314_572_800 (300MB). Source wins. -->

## ZIP filename convention

The ZIP filename (as stored in Azure Blob Storage and declared in `metadata.json`) must match:

```
^\d+_([012][0-9]|30|31)-([0][0-9]|[1][012])-[2][0][0-9][0-9]-([01][0-9]|[2][0123])-[0-5][0-9]-[0-5][0-9]\.(test\.)?zip$
```

Format: `{numericId}_{DD}-{MM}-{YYYY}-{HH}-{mm}-{ss}.zip`

Examples:
- `1234567_21-05-2024-14-30-00.zip` — production envelope
- `9999_01-01-2025-09-00-00.test.zip` — test envelope (generates `MsgLabel.TEST` in downstream notification)

Source: `metafile-schema.json:50`

## metadata.json schema

The metadata file is validated using JSON Schema draft-04 via `com.github.fge:json-schema-validator`. The schema enforces `additionalProperties: false` on both the top-level object and `scannable_items` array items — any unrecognised field fails validation (`metafile-schema.json`).

Enum values (e.g. `envelope_classification`) are parsed case-insensitively (`MetafileJsonValidator.java:19`).

### Required top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `po_box` | string | PO Box identifier used to route OCR validation and jurisdiction mapping |
| `jurisdiction` | string | Jurisdiction code (e.g. `SSCS`, `PROBATE`, `DIVORCE`) |
| `delivery_date` | string (datetime) | When the envelope was delivered to the scanning supplier. Pattern: `yyyy-MM-ddTHH:mm:ss.SSSZ` |
| `opening_date` | string (datetime) | When the envelope was opened. Pattern: `yyyy-MM-ddTHH:mm:ss.SSSZ` |
| `zip_file_createddate` | string (datetime) | Timestamp of ZIP creation. Pattern: `yyyy-MM-ddTHH:mm:ss.SSSZ` |
| `zip_file_name` | string | Must match the regex pattern above |
| `envelope_classification` | string (enum) | One of: `new_application`, `supplementary_evidence`, `supplementary_evidence_with_ocr`, `exception` |
| `scannable_items` | array | List of scanned documents (at least one required, `minItems: 1`) |

All datetime fields are validated by the schema pattern `^\d{4}\-\d{2}\-\d{2}T\d{2}\:\d{2}\:\d{2}\.\d{3}Z$` — they must be ISO-8601 UTC with exactly three fractional digits and a trailing `Z`.

Source: `metafile-schema.json:219-228`

### Optional top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `case_number` | string or null | Existing case reference (trimmed of whitespace at parse time — `InputEnvelope.java:77`). Max length: 100 |
| `previous_service_case_reference` | string or null | Legacy case reference from a previous system |
| `rescan_for` | string or null | ZIP filename of a previously rejected envelope that this envelope rescans. Must match same regex as `zip_file_name` |
| `payments` | array | Payment document control numbers associated with the envelope (see payments section below) |
| `non_scannable_items` | array | Items in the envelope that cannot be scanned (e.g. USB sticks, DVDs) |

### envelope_classification values

The schema enum values are **lowercase** (`new_application`, not `NEW_APPLICATION`). They are parsed case-insensitively by `MetafileJsonValidator`.

| Value | CCD action on success | Behaviour |
|-------|----------------------|-----------|
| `new_application` | `AUTO_CREATED_CASE` or `EXCEPTION_RECORD` | OCR data required if Form/SSCS1 document present; triggers new case creation. If transformation fails, creates an Exception Record |
| `supplementary_evidence` | `AUTO_ATTACHED_TO_CASE` or `EXCEPTION_RECORD` | Attaches documents to an existing case identified by `case_number`; `Form` and `SSCS1` document types disallowed (`EnvelopeValidator.java:52-57`). If case not found, creates Exception Record |
| `supplementary_evidence_with_ocr` | Case update or `EXCEPTION_RECORD` | OCR data required if Form/SSCS1 document present; updates existing case with OCR data and documents. Only Probate service as of June 2024; configurable for others |
| `exception` | `EXCEPTION_RECORD` | Always creates an Exception Record; OCR validation skipped entirely (`OcrValidator.java:74`) |

<!-- CONFLUENCE-ONLY: CCD action outcomes (AUTO_ATTACHED_TO_CASE, AUTO_CREATED_CASE, EXCEPTION_RECORD) from Confluence testing guide, not verified in source -->

## scannable_items schema

Each entry in the `scannable_items` array describes one scanned document image. The array enforces `uniqueItems: true`.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `document_control_number` | string | Yes | Must match `^[0-9]+$`; must be unique across all items in the envelope |
| `scanning_date` | string (datetime) | Yes | When the page was scanned. Pattern: `yyyy-MM-ddTHH:mm:ss.SSSZ` |
| `file_name` | string | Yes | Must match `^.+\.pdf$`; must correspond to a PDF entry in the ZIP |
| `document_type` | string (enum) | Yes | See allowed values below |
| `next_action` | string | Yes | Next action the scanning supplier will take on the physical document (e.g. `return`, `destroy`, `forward`) |
| `next_action_date` | string (datetime) | Yes | When the next action will occur. Pattern: `yyyy-MM-ddTHH:mm:ss.SSSZ` |
| `ocr_data` | string or null | Conditional | Base64-encoded OCR data; see OCR data section |
| `ocr_accuracy` | string or null | No | Level of OCR accuracy (supplier-defined) |
| `manual_intervention` | string or null | No | Description of any manual intervention during scanning |
| `document_sub_type` | string or null | No | Used as the `formType` in OCR validation URL dispatch (e.g. `SSCS1`, `PA1P`, `D8`) |
| `notes` | string or null | No | Contextual information describing the scanned file (e.g. "The document had ink spilled on it") |

Note: The JSON field is `document_sub_type` (with underscore), not `document_subtype`. Required fields per the schema: `document_control_number`, `scanning_date`, `file_name`, `document_type`, `next_action`, `next_action_date`.

Source: `metafile-schema.json:75-159`

### document_type allowed values

| Value | Notes |
|-------|-------|
| `Cherished` | |
| `Other` | |
| `SSCS1` | Triggers OCR requirement for applicable classifications |
| `Will` | |
| `Coversheet` | |
| `Form` | Triggers OCR requirement for applicable classifications |
| `Supporting Documents` | |
| `Forensic Sheets` | |
| `IHT` | |
| `PP's Legal Statement` | |
| `PPs Legal Statement` | Variant without apostrophe |

Source: `metafile-schema.json:130-143`

`SUPPLEMENTARY_EVIDENCE` envelopes may not contain `Form` or `SSCS1` document types (`EnvelopeValidator.java:52-57`).

## OCR data shape

### In the metadata.json (wire format)

In `metadata.json`, `ocr_data` is a base64-encoded string (schema pattern: `^[0-9a-zA-Z=+/]*$`). When decoded, it yields a JSON object with a single key `Metadata_file` containing an array of field name/value pairs:

```json
{
  "Metadata_file": [
    { "metadata_field_name": "person1_title", "metadata_field_value": "Mrs" },
    { "metadata_field_name": "person1_first_name", "metadata_field_value": "Jane" },
    { "metadata_field_name": "person1_last_name", "metadata_field_value": "Smith" }
  ]
}
```

The field names and values are jurisdiction/form-specific. Each service defines its own OCR fields (e.g. SSCS uses `mrn_date`, `person1_nino`; Probate uses `deceasedForenames`, `deceasedDateOfDeath`).

### Java model (after deserialization)

At parse time, `OcrDataDeserializer` base64-decodes the string and maps it to `InputOcrData`, which contains a `List<InputOcrDataField>`. Each field has:
- `name` (mapped from `metadata_field_name`) — a `TextNode`
- `value` (mapped from `metadata_field_value`) — a `ValueNode`

Source: `OcrDataDeserializer.java`, `InputOcrData.java`, `InputOcrDataField.java`

### When OCR data is required

OCR data is required (raises `OcrDataNotFoundException`) when:
- Classification is `new_application` or `supplementary_evidence_with_ocr`, **and**
- A document of type `Form` or `SSCS1` is present

Source: `EnvelopeValidator.java:92-125`

### Downstream format (to orchestrator)

When sent downstream to the orchestrator, OCR data is serialised as an array of `OcrDataField` objects:

```json
{
  "ocr_data": [
    { "name": "field_name", "value": "field_value" }
  ]
}
```

Null field values are serialised as empty strings (`EnvelopeMsg.java:281-300`).

## Validation pipeline

Envelope validation occurs in two phases:

### Phase 1: Schema validation

`MetafileJsonValidator.validate(byte[], String)` validates the raw JSON bytes against `metafile-schema.json`. Throws `InvalidEnvelopeSchemaException` on failure (`EnvelopeProcessor.java:68-84`).

### Phase 2: Business rule validation

`EnvelopeValidator` applies the following ordered checks:

| Check | Description |
|-------|-------------|
| `assertZipFilenameMatchesWithMetadata` | ZIP blob name must match `zip_file_name` in metadata |
| `assertContainerMatchesJurisdictionAndPoBox` | Container/jurisdiction/PO box triple must match a `containers.mappings` entry (case-insensitive) |
| `assertServiceEnabled` | The jurisdiction must be enabled in configuration |
| `assertEnvelopeContainsOcrDataIfRequired` | OCR data present when classification demands it |
| `assertEnvelopeHasPdfs` | At least one PDF must be present |
| `assertDocumentControlNumbersAreUnique` | No duplicate DCNs |
| `assertPaymentsEnabledForContainerIfPaymentsArePresent` | Payments only allowed for containers that support them |
| `assertEnvelopeContainsDocsOfAllowedTypesOnly` | Document types restricted per classification |

Source: `EnvelopeValidator.java`

### Phase 3: OCR validation (remote)

If the envelope's PO box has a configured `ocrValidationUrl`, a POST request is sent to `{baseUrl}/forms/{formType}/validate-ocr`. Response status `ERRORS` causes rejection; `WARNINGS` are recorded but processing continues.

## payments array

Each entry in the optional `payments` array identifies a payment instrument (cheque, postal order, cash) enclosed in the physical envelope.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `document_control_number` | string | Yes | Must match `^[0-9]+$` |

The schema allows `additionalProperties: true` on payment items (unlike scannable items), so future fields can be added without breaking validation.

Payment DCNs are processed by `bulk-scan-payment-processor`, which maps PO box to a Pay Hub site ID and calls the Payments API to register or update payment records. The separate Payments meta-info API (called by the supplier after banking) provides the amount, currency, method, and BGC slip number.

Source: `metafile-schema.json:161-183`

## non_scannable_items array

The optional `non_scannable_items` array records items in the physical envelope that cannot be scanned (CDs, DVDs, USB memory sticks, etc.).

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `document_control_number` | string | Yes | Must match `^[0-9]+$` |
| `item_type` | string | Yes | e.g. `CD`, `DVD`, `USB memory stick` |
| `notes` | string | No | Contextual description (e.g. "4GB USB memory stick") |

Source: `metafile-schema.json:184-216`, `InputNonScannableItem.java`

## Container and jurisdiction mapping

Each Azure Blob Storage container maps to a jurisdiction and one or more PO boxes via `containers.mappings` configuration. The container name is also used:

- As the blob storage container identifier
- To derive the CDAM `caseTypeId` as `{CONTAINER_UPPERCASE}_ExceptionRecord` (e.g. `sscs` becomes `SSCS_ExceptionRecord`) (`DocumentServiceHelper.java:46-48`)
- As the `serviceName` for SAS token issuance

### Container mapping table

| Container | Jurisdiction | PO Boxes | OCR Validation | Payments |
|-----------|-------------|----------|----------------|----------|
| `sscs` | SSCS | 12626, 13150, 13618 | Yes | No |
| `probate` | PROBATE | 12625, 12624 | Yes | Yes |
| `divorce` | DIVORCE | 12706 | Yes | Yes |
| `finrem` | DIVORCE | 12746 | Yes | Yes |
| `cmc` | CMC | 12747 | No | No |
| `publiclaw` | PUBLICLAW | 12879 | No | Yes |
| `privatelaw` | PRIVATELAW | 13235 | Yes | Yes |
| `nfd` | DIVORCE | 13226 | Yes | Yes |

Source: `application.yaml:136-185`

Rejected envelopes are moved to a `{container}-rejected` container (e.g. `sscs-rejected`).

## Document subtypes

The `document_sub_type` field is a dynamic, jurisdiction-specific list. The subtype is used as the `formType` when dispatching OCR validation requests. Known subtypes include:

| Jurisdiction | Document Type | Subtypes |
|-------------|--------------|----------|
| Probate | Form | PA1P, PA1A, PA8A |
| Probate | Cherished | Will |
| CMC | Other | N9, N9a, N9b, N11, N225 |
| SSCS | Form | SSCS1, SSCS1PE, SSCS1U, SSCS2 |
| Divorce | Form | D8, DAOS1, DAOS2, DAOS3, DAOS4, DAOS5, D84, D80A-E, D36 |
| Financial Remedy | Form | A |

<!-- CONFLUENCE-ONLY: document subtype list from Technical Specification V1.4, not verified in source -->

## Error notification codes

When envelope processing fails, the system sends an error notification to the scanning supplier via HTTPS POST. The notification includes the following error codes:

| Error Code | Meaning |
|-----------|---------|
| `ERR_FILE_LIMIT_EXCEEDED` | A document exceeded the maximum file size |
| `ERR_METAFILE_INVALID` | The metadata.json failed schema or business-rule validation |
| `ERR_AV_FAILED` | Antivirus scan detected a threat |
| `ERR_SIG_VERIFY_FAILED` | Digital signature verification failed (non-repudiation) |
| `ERR_RESCAN_REQUIRED` | A specific document needs to be rescanned |
| `ERR_ZIP_PROCESSING_FAILED` | General ZIP processing failure |

The notification payload includes `zip_file_name`, `po_box`, `error_code`, `error_description`, and optionally `document_control_number` (for document-specific errors) and `reference_id`.

<!-- CONFLUENCE-ONLY: error notification codes and payload from Technical Specification V1.4, not verified in source -->

## Examples

### JSON Schema (metafile-schema.json)

The full JSON Schema draft-04 document that governs `metadata.json` validation. The processor validates every incoming envelope against this schema using `com.github.fge:json-schema-validator`.

```json
// Source: apps/bulk-scan/bulk-scan-processor/src/main/resources/metafile-schema.json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "https://hmcts.github.io/bulk-scan-processor",
  "type": "object",
  "title": "Envelope schema",
  "properties": {
    "po_box":                      { "type": "string" },
    "jurisdiction":                { "type": "string" },
    "delivery_date":               { "type": "string", "pattern": "^\\d{4}\\-\\d{2}\\-\\d{2}T\\d{2}\\:\\d{2}\\:\\d{2}\\.\\d{3}Z$" },
    "opening_date":                { "type": "string", "pattern": "^\\d{4}\\-\\d{2}\\-\\d{2}T\\d{2}\\:\\d{2}\\:\\d{2}\\.\\d{3}Z$" },
    "zip_file_createddate":        { "type": "string", "pattern": "^\\d{4}\\-\\d{2}\\-\\d{2}T\\d{2}\\:\\d{2}\\:\\d{2}\\.\\d{3}Z$" },
    "zip_file_name": {
      "type": "string",
      "pattern": "^\\d+_([012][0-9]|30|31)-([0][0-9]|[1][012])-[2][0][0-9][0-9]-([01][0-9]|[2][0123])-[0-5][0-9]-[0-5][0-9]\\.(test\\.)?zip$"
    },
    "envelope_classification": {
      "type": "string",
      "enum": ["exception", "new_application", "supplementary_evidence", "supplementary_evidence_with_ocr"],
      "default": "exception"
    },
    "case_number":                  { "type": ["string", "null"], "maxLength": 100 },
    "previous_service_case_reference": { "type": ["string", "null"] },
    "rescan_for":                   { "type": ["string", "null"] },
    "scannable_items": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "type": "object",
        "properties": {
          "document_control_number": { "type": "string", "pattern": "^[0-9]+$" },
          "scanning_date":           { "type": "string", "pattern": "^\\d{4}\\-\\d{2}\\-\\d{2}T\\d{2}\\:\\d{2}\\:\\d{2}\\.\\d{3}Z$" },
          "file_name":               { "type": "string", "pattern": "^.+\\.pdf$" },
          "document_type": {
            "type": "string",
            "enum": ["Cherished","Other","SSCS1","Will","Coversheet","Form","Supporting Documents","Forensic Sheets","IHT","PP's Legal Statement","PPs Legal Statement"]
          },
          "document_sub_type":       { "type": ["string", "null"] },
          "ocr_data":                { "type": ["string", "null"], "pattern": "^[0-9a-zA-Z=+/]*$" },
          "ocr_accuracy":            { "type": ["string", "null"] },
          "manual_intervention":     { "type": ["string", "null"] },
          "next_action":             { "type": "string" },
          "next_action_date":        { "type": "string", "pattern": "^\\d{4}\\-\\d{2}\\-\\d{2}T\\d{2}\\:\\d{2}\\:\\d{2}\\.\\d{3}Z$" },
          "notes":                   { "type": ["string", "null"] }
        },
        "required": ["document_control_number","scanning_date","file_name","document_type","next_action","next_action_date"],
        "additionalProperties": false
      }
    },
    "payments": {
      "type": "array",
      "items": {
        "properties": { "document_control_number": { "type": "string", "pattern": "^[0-9]+$" } },
        "required": ["document_control_number"],
        "additionalProperties": true
      }
    },
    "non_scannable_items": {
      "type": "array",
      "items": {
        "properties": {
          "document_control_number": { "type": "string", "pattern": "^[0-9]+$" },
          "item_type":               { "type": "string" },
          "notes":                   { "type": "string" }
        },
        "required": ["document_control_number","item_type"],
        "additionalProperties": false
      }
    }
  },
  "required": ["po_box","jurisdiction","delivery_date","opening_date","zip_file_createddate","zip_file_name","envelope_classification","scannable_items"],
  "additionalProperties": false
}
```

### Complete metadata.json example (SSCS new application)

A representative `metadata.json` for an SSCS new-application envelope with one form document and OCR data.

```json
// Example: complete metadata.json for an SSCS new_application envelope
{
  "po_box": "12626",
  "jurisdiction": "SSCS",
  "delivery_date": "2024-05-21T09:00:00.000Z",
  "opening_date": "2024-05-21T10:30:00.000Z",
  "zip_file_createddate": "2024-05-21T11:00:00.000Z",
  "zip_file_name": "1234567_21-05-2024-11-00-00.zip",
  "envelope_classification": "new_application",
  "scannable_items": [
    {
      "document_control_number": "1234567890",
      "scanning_date": "2024-05-21T09:05:00.000Z",
      "file_name": "1234567890.pdf",
      "document_type": "SSCS1",
      "document_sub_type": "SSCS1",
      "next_action": "Return",
      "next_action_date": "2024-06-21T00:00:00.000Z",
      "ocr_data": "eyJNZXRhZGF0YV9maWxlIjpbeyJtZXRhZGF0YV9maWVsZF9uYW1lIjoicGVyc29uMV9sYXN0X25hbWUiLCJtZXRhZGF0YV9maWVsZF92YWx1ZSI6IlNtaXRoIn1dfQ=="
    }
  ]
}
```

The `ocr_data` field is a base64-encoded JSON string. When decoded, the above example produces:

```json
// Decoded ocr_data content (Metadata_file format)
{
  "Metadata_file": [
    { "metadata_field_name": "person1_last_name", "metadata_field_value": "Smith" }
  ]
}
```

### Container mapping configuration (application.yaml)

How the processor maps blob containers to jurisdictions and PO boxes:

```yaml
// Source: apps/bulk-scan/bulk-scan-processor/src/main/resources/application.yaml
containers:
  mappings:
    - container: sscs
      jurisdiction: SSCS
      poBoxes:
        - 12626
        - 13150
        - 13618
      ocrValidationUrl: ${OCR_VALIDATION_URL_SSCS}
    - container: probate
      jurisdiction: PROBATE
      poBoxes:
        - 12625
        - 12624
      ocrValidationUrl: ${OCR_VALIDATION_URL_PROBATE}
      paymentsEnabled: ${PAYMENTS_ENABLED_PROBATE:false}
    - container: privatelaw
      jurisdiction: PRIVATELAW
      poBoxes:
        - 13235
      paymentsEnabled: ${PAYMENTS_ENABLED_PRIVATELAW:false}
      enabled: ${PRIVATELAW_ENABLED:false}
      ocrValidationUrl: ${OCR_VALIDATION_URL_PRIVATELAW}
    # ... (divorce, finrem, cmc, publiclaw, nfd follow the same pattern)
```

## See also

- [Envelope Processing](../explanation/envelope-processing.md) — how the processor validates, parses, and uploads documents from envelopes
- [Exception Records](../explanation/exception-records.md) — OCR data fields and how they flow from metadata.json into CCD
- [API Orchestrator Reference](api-orchestrator.md) — the transformation-url contract that receives the parsed envelope contents
- [Troubleshoot Envelope Failures](../how-to/troubleshoot-envelope-failures.md) — diagnosing validation failures against this schema
