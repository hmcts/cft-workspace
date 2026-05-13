---
title: Api Processor
topic: architecture
diataxis: reference
product: bulk-scan
audience: both
sources:
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/SasTokenController.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/services/SasTokenGeneratorService.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/config/AccessTokenProperties.java
  - bulk-scan-processor:src/main/resources/application.yaml
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/ActionController.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/EnvelopeController.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/ReportsController.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/PaymentController.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/ZipStatusController.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/StaleBlobController.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/entity/Status.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/model/common/Classification.java
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/bulk-scan/bulk-scan-processor/src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/ActionController.java
  - apps/bulk-scan/bulk-scan-processor/src/main/resources/application.yaml
confluence:
  - id: "1663977130"
    title: "Bulk scan - Developer FAQs"
    last_modified: "unknown"
    space: "DATS"
  - id: "1667695402"
    title: "HLD Bulk Scanning update v1.1"
    last_modified: "unknown"
    space: "RBS"
  - id: "1638182762"
    title: "Bulk Scan, Bulk print & FaCT Useful Links"
    last_modified: "unknown"
    space: "RBS"
  - id: "1694700322"
    title: "Bulk Scan testing in lower environments"
    last_modified: "unknown"
    space: "DATS"
  - id: "1689785791"
    title: "Bulk scan - Incidents"
    last_modified: "unknown"
    space: "DATS"
  - id: "1331036721"
    title: "Switching from bulk-scan to reform-scan"
    last_modified: "unknown"
    space: "RBS"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- `bulk-scan-processor` (port 8581) exposes a REST API for SAS token issuance, envelope status querying, administrative actions, reports, and payment lookups.
- `GET /token/{serviceName}` returns a time-limited Azure Blob Storage SAS token with write, list, and read permissions for the named container.
- The external-facing SAS token endpoint is served via `blob-router-service` through Azure API Management (APIM) with mTLS + OAUTH 2.0; the processor's endpoint is internal-only.
- Envelope statuses: `CREATED`, `METADATA_FAILURE`, `UPLOAD_FAILURE`, `UPLOADED`, `NOTIFICATION_SENT`, `ABORTED`, `COMPLETED`.
- Administrative actions (`/actions/*`) require a `Bearer {actions-api-key}` token and support reprocess, complete, abort, and reclassification operations.
- OpenAPI spec is published to `cnp-api-docs`; `springdoc.packagesToScan` targets `uk.gov.hmcts.reform.bulkscanprocessor.controllers` (`application.yaml:264`).

## SAS Token Endpoint

| Property | Value |
|----------|-------|
| Method | `GET` |
| Path | `/token/{serviceName}` |
| Path parameter | `serviceName` -- identifies both the configuration entry and the target Azure Blob Storage container |
| Response body | `{ "sas_token": "<token>" }` (`SasTokenResponse`) |
| Success status | `200 OK` |
| Error: unknown service | `400 Bad Request` -- `ServiceConfigNotFoundException` when `serviceName` does not match any entry in `accesstoken.serviceConfig` |
| Error: token generation failure | `500 Internal Server Error` -- `UnableToGenerateSasTokenException` when the storage account rejects the request |

### Token Properties

| Property | Value |
|----------|-------|
| Permissions | `wlr` (write, list, read) -- `BlobContainerSasPermission.parse("wlr")` (`SasTokenGeneratorService.java:69-74`) |
| Scope | Container-level -- token is scoped to the container whose name equals `serviceName` (`SasTokenGeneratorService.java:57-60`) |
| Expiry | `OffsetDateTime.now(UTC).plusSeconds(config.getValidity())` -- defaults to 300 seconds (`SAS_TOKEN_VALIDITY`) |
| Lookup | Case-insensitive match against `accesstoken.serviceConfig[].serviceName` (`SasTokenGeneratorService.java:83-90`) |

### Configured Services

| Service Name | Container | Jurisdiction | Default Validity (seconds) |
|--------------|-----------|--------------|---------------------------|
| `sscs` | sscs | SSCS | 300 |
| `bulkscan` | bulkscan | BULKSCAN (test) | 300 |
| `bulkscanauto` | bulkscanauto | BULKSCAN (test) | 300 |
| `probate` | probate | PROBATE | 300 |
| `divorce` | divorce | DIVORCE | 300 |
| `finrem` | finrem | DIVORCE | 300 |
| `cmc` | cmc | CMC | 300 |
| `publiclaw` | publiclaw | PUBLICLAW | 300 |
| `privatelaw` | privatelaw | PRIVATELAW | 300 |
| `nfd` | nfd | DIVORCE | 300 |

All entries share the `SAS_TOKEN_VALIDITY` env var default (`application.yaml:114-134`). Per-service overrides are possible via the `accesstoken.serviceConfig[].validity` property.

<!-- CONFLUENCE-ONLY: not verified in source -->
The following PO Box values are associated with each container (used in envelope metadata):
- sscs: 12626, 13150
- cmc: 12747
- divorce: 12706
- nfd: 13226
- finrem: 12746
- probate: 12625, 12624
- publiclaw: 12879
- privatelaw: 13235

### External Access (API Gateway)

The SAS token endpoint is exposed externally via Azure API Management (APIM), not directly from `bulk-scan-processor`. After the migration from bulk-scan to reform-scan architecture, the external-facing endpoint is:

```
GET https://core-api-mgmt-{env}.azure-api.net/reform-scan/token/{serviceName}
```

<!-- CONFLUENCE-ONLY: not verified in source -->
External callers (the scanning supplier XBP, formerly Exela) must provide:
- A valid client certificate (thumbprint registered in `blob-router-service` infrastructure `{env}.tfvar`)
- `Ocp-Apim-Subscription-Key` header (subscription key from the `reform-scan` APIM subscription)
- OAUTH 2.0 access token (obtained via APIM policy)

The API policy is defined in `blob-router-service/infrastructure/api-policy.xml`.

### Authentication (Internal)

No application-layer authentication is visible on the `SasTokenController` itself (`SasTokenController.java:39-42`). Access control is expected to be enforced at the API gateway or Kubernetes ingress level.

## Envelope Status Lifecycle

The processor persists envelope state in PostgreSQL. The status values are defined in the `Status` enum (`Status.java`):

| Status | Meaning | Triggering Event |
|--------|---------|-----------------|
| `CREATED` | Envelope record inserted after successful validation | (initial insert) |
| `METADATA_FAILURE` | Inconsistency between files and metadata info | `DOC_FAILURE` |
| `UPLOAD_FAILURE` | CDAM upload failed; retried up to `UPLOAD_MAX_TRIES` (default 5) | `DOC_UPLOAD_FAILURE` |
| `UPLOADED` | All document images uploaded to CDAM successfully | `DOC_UPLOADED` |
| `NOTIFICATION_SENT` | `EnvelopeMsg` published to Service Bus `envelopes` queue | `DOC_PROCESSED_NOTIFICATION_SENT` |
| `ABORTED` | Envelope in inconsistent state has been manually aborted | (admin action) |
| `COMPLETED` | Final state -- the envelope has been successfully processed by the service | (orchestrator acknowledgement via `processed-envelopes` queue) |

<!-- DIVERGENCE: Confluence (Developer FAQs) does not mention METADATA_FAILURE or ABORTED statuses, but source code Status.java clearly defines them. Source wins. -->

### Envelope Classification

Envelopes carry a `Classification` enum value (`Classification.java`) that determines routing:

| Classification | Description |
|----------------|-------------|
| `exception` | Supplier-flagged exception; always creates an Exception Record |
| `new_application` | New case application with OCR data |
| `supplementary_evidence` | Additional evidence for an existing case |
| `supplementary_evidence_with_ocr` | Additional evidence with OCR data for an existing case |

### CCD Action Outcomes

<!-- CONFLUENCE-ONLY: not verified in source -->
After processing, the envelope's `ccd_action` field records the outcome:
- `AUTO_ATTACHED_TO_CASE` -- supplementary evidence attached to an existing case via its case number
- `AUTO_CREATED_CASE` -- new case successfully created from a new_application envelope
- `EXCEPTION_RECORD` -- an Exception Record was created (due to classification=exception, missing/invalid case number, OCR validation warnings, or service-specific configuration)

## Envelope Query Endpoints

### GET /envelopes

Returns envelopes for the authenticated service, optionally filtered by status.

| Property | Value |
|----------|-------|
| Auth | `ServiceAuthorization` header (S2S token) |
| Query param | `status` (optional) -- filter by `Status` enum value |
| Response | `EnvelopeListResponse` |

### GET /envelopes/{id}

Returns a single envelope by UUID.

| Property | Value |
|----------|-------|
| Auth | `ServiceAuthorization` header (S2S token) |
| Path param | `id` -- envelope UUID |
| Response | `EnvelopeResponse` (includes `ccd_id`, `ccd_action`, status) |
| Error | `404` if not found |

### GET /envelopes/{container}/{file_name}

Returns a single envelope by container and zip filename. Hidden from OpenAPI docs.

| Property | Value |
|----------|-------|
| Auth | None (internal) |
| Path params | `container`, `file_name` |
| Response | `EnvelopeResponse` |

### GET /envelopes/stale-incomplete-envelopes

Returns envelopes that are incomplete and older than the stale threshold.

| Property | Value |
|----------|-------|
| Query param | `stale_time` (optional, default `2` hours) |
| Response | `SearchResult` containing list of `EnvelopeInfo` |

### DELETE /envelopes/stale/{envelopeId}

Removes a single stale envelope if older than the minimum threshold.

| Property | Value |
|----------|-------|
| Query param | `stale_time` (optional, default `168` hours; minimum `168` / 1 week) |
| Error | `404` if not found or not stale |

### DELETE /envelopes/stale/all

Removes all stale envelopes older than the specified threshold.

| Property | Value |
|----------|-------|
| Query param | `stale_time` (optional, default `168` hours; minimum `48`) |
| Response | `SearchResult` with list of removed envelope IDs |

## Actions API (Admin Operations)

All actions endpoints require an `Authorization: Bearer {actions-api-key}` header. The API key is stored in keyvault as `actions-api-key` and configured via `actions.api-key` application property.

| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/actions/reprocess/{id}` | Reprocess envelope by UUID |
| `PUT` | `/actions/update-classification-reprocess/{id}` | Update classification to EXCEPTION and reprocess |
| `PUT` | `/actions/{id}/complete` | Manually mark envelope as COMPLETED |
| `PUT` | `/actions/{id}/abort` | Manually mark envelope as ABORTED |

Authentication errors:
- Missing `Authorization` header: `InvalidApiKeyException` ("API Key is missing")
- Invalid key: `InvalidApiKeyException` ("Invalid API Key")
- Expected format: `Bearer {actionsApiKey}` (exact string match against configured key)

## Payment Endpoints

### GET /payment

Retrieves payment details for given Document Control Numbers (DCNs).

| Property | Value |
|----------|-------|
| Query param | `dcns` -- list of DCN strings |
| Response | `SearchResult` containing `PaymentResponse` objects |

### PUT /payment/status

Updates payment status to SUBMITTED.

| Property | Value |
|----------|-------|
| Auth | `ServiceAuthorization` header (S2S token) |
| Body | `PaymentRequest` (JSON) |
| Success | `200` with `PaymentStatusReponse` (`"success"`) |
| Errors | `401` (invalid S2S), `403` (service not configured), `400` (bad request) |

## Reports API

All report endpoints are under `/reports` and support CORS (`@CrossOrigin`).

| Method | Path | Description | Params |
|--------|------|-------------|--------|
| `GET` | `/reports/count-summary` | Envelope count summary | `date` (ISO date), `include-test` (bool, default false) |
| `GET` | `/reports/envelopes-count-summary` | Envelope count summary (alternative) | `date`, `include-test` |
| `GET` | `/reports/count-summary-report` | Envelope count summary report | `date`, `include-test` |
| `GET` | `/reports/zip-files-summary` | Zip files summary (JSON or CSV) | `date`, `container` (optional), `classification` (optional) |
| `GET` | `/reports/rejected` | Currently rejected files | (none) |
| `GET` | `/reports/rejected-zip-files` | Rejected zip files by date | `date` |
| `GET` | `/reports/rejected-zip-files/name/{name}` | Rejected zip files by name | `name` path param |
| `POST` | `/reports/reconciliation` | Reconciliation report | Body: `ReconciliationStatement` |
| `GET` | `/reports/received-scannable-items` | Received scannable items | `date`, `per_document_type` (bool) |
| `GET` | `/reports/received-payments` | Received payments | `date` |

## Zip File Status

### GET /zip-files

Lookup zip file status by one of three filters (exactly one required):

| Filter Param | Description | Validation |
|-------------|-------------|------------|
| `name` | Zip file name | Must be non-empty |
| `dcn` | Document Control Number | Minimum 6 characters |
| `ccd_id` | CCD case reference | Must be non-empty |

Returns `400` if no valid filter provided or multiple filters given.

## Stale Blobs

### GET /stale-blobs

Find blobs in Azure Storage that have not been processed within the expected time.

| Property | Value |
|----------|-------|
| Query param | `stale_time` (optional, default `120` minutes) |
| Response | `SearchResult` |

## Process Events

### GET /process-events

Query process events by DCN prefix and date range.

| Property | Value |
|----------|-------|
| Query params | `dcn_prefix` (min 10 chars), `between_dates` (2 ISO dates) |
| Response | `SearchResult` |
| Error | `400` if prefix < 10 chars or dates count != 2 |

## OpenAPI Specification

The service publishes its OpenAPI spec to `cnp-api-docs` via a `SwaggerPublisher` integration test. The spec covers all controllers in the `uk.gov.hmcts.reform.bulkscanprocessor.controllers` package (`application.yaml:264`).

| Property | Value |
|----------|-------|
| Published spec location | `platops/cnp-api-docs/` (local clone) |
| Springdoc packages scanned | `uk.gov.hmcts.reform.bulkscanprocessor.controllers` |
| Publishing mechanism | `SwaggerPublisher` integration test on `master` push |

## Configuration Reference

Key environment variables governing the API and scheduling behaviour:

| Env Var | Default | Purpose |
|---------|---------|---------|
| `SAS_TOKEN_VALIDITY` | `300` | SAS token lifetime in seconds |
| `SCAN_ENABLED` | `false` | Enables the blob polling task |
| `NOTIFICATIONS_TO_ORCHESTRATOR_TASK_ENABLED` | `false` | Enables the ASB notification task |
| `UPLOAD_MAX_TRIES` | `5` | Max document upload retry attempts |
| `UPLOAD_TASK_DELAY` | _(no default)_ | Fixed delay (ms) between upload task runs |
| `SCHEDULING_LOCK_AT_MOST_FOR` | `PT10M` | ShedLock maximum lock duration |
| `QUEUE_ENVELOPE_NAME` | _(env-specific)_ | ASB queue name for envelope notifications |
| `actions.api-key` | _(keyvault)_ | API key for admin actions endpoints |

## Examples

### ActionController — admin actions endpoints

The four admin operations, all gated by a `Bearer {actions-api-key}` token validated against the `actions.api-key` application property:

```java
// Source: apps/bulk-scan/bulk-scan-processor/src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/ActionController.java
@RestController
@RequestMapping(path = "/actions")
public class ActionController {

    @PutMapping(path = "/reprocess/{id}")
    @Operation(description = "Reprocess envelope by ID")
    public ResponseEntity<Void> reprocess(
        @RequestHeader(value = AUTHORIZATION, required = false) String authHeader,
        @PathVariable UUID id
    ) {
        validateAuthorization(authHeader);
        envelopeActionService.reprocessEnvelope(id);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @PutMapping(path = "/update-classification-reprocess/{id}")
    @Operation(description = "Update classification to EXCEPTION and reprocess envelope by ID")
    public ResponseEntity<Void> updateClassificationAndReprocess(
        @RequestHeader(value = AUTHORIZATION, required = false) String authHeader,
        @PathVariable UUID id
    ) {
        validateAuthorization(authHeader);
        envelopeActionService.updateClassificationAndReprocessEnvelope(id);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    // ... complete/abort endpoints follow the same pattern
}
```

### SAS token service config and scheduling env vars (application.yaml)

Key env vars from the processor's `application.yaml`. All ten services share the same `SAS_TOKEN_VALIDITY` default; the four scheduled tasks are independently toggled:

```yaml
// Source: apps/bulk-scan/bulk-scan-processor/src/main/resources/application.yaml
accesstoken:
  serviceConfig:
    - serviceName: sscs
      validity: ${SAS_TOKEN_VALIDITY:300}   # seconds; override per-service if needed
    - serviceName: probate
      validity: ${SAS_TOKEN_VALIDITY:300}
    # ... (bulkscan, bulkscanauto, divorce, finrem, cmc, publiclaw, privatelaw, nfd)

scheduling:
  task:
    scan:
      delay: ${SCAN_DELAY:30000}
      enabled: ${SCAN_ENABLED:false}
    upload-documents:
      delay: ${UPLOAD_TASK_DELAY}
      enabled: ${UPLOAD_TASK_ENABLED}
      max_tries: ${UPLOAD_MAX_TRIES:5}
    notifications_to_orchestrator:
      delay: ${NOTIFICATIONS_TO_ORCHESTRATOR_TASK_DELAY:30000}
      enabled: ${NOTIFICATIONS_TO_ORCHESTRATOR_TASK_ENABLED:false}
    delete-complete-files:
      enabled: ${DELETE_COMPLETE_FILES_ENABLED}
      cron: ${DELETE_COMPLETE_FILES_CRON}

actions:
  api-key: ${ACTIONS_API_KEY}

ocr-validation-max-retries: 2
ocr-validation-delay-retry-sec: 300
```

## See also

- [Envelope Processing](../explanation/envelope-processing.md) — how the processor's four scheduled tasks drive the pipeline these endpoints expose
- [Envelope Format](envelope-format.md) — the metadata.json schema validated during blob processing
- [Troubleshoot Envelope Failures](../how-to/troubleshoot-envelope-failures.md) — using these endpoints and SQL queries to diagnose stuck envelopes
- [API Orchestrator Reference](api-orchestrator.md) — the orchestrator-side API for CCD callbacks
