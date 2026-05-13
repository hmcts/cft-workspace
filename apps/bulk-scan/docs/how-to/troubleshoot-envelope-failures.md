---
title: Troubleshoot Envelope Failures
topic: processing
diataxis: how-to
product: bulk-scan
audience: both
sources:
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/tasks/processor/EnvelopeProcessor.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/validation/MetafileJsonValidator.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/validation/EnvelopeValidator.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/services/storage/OcrValidationRetryManager.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/tasks/OrchestratorNotificationTask.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/tasks/UploadEnvelopeDocumentsTask.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/services/OrchestratorNotificationService.java
  - bulk-scan-processor:src/main/resources/application.yaml
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/ActionController.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/EnvelopeController.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/ReportsController.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/entity/Status.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/servicebus/domains/envelopes/EnvelopeMessageProcessor.java
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1663977130"
    title: "Bulk scan - Developer FAQs"
    last_modified: "unknown"
    space: "DATS"
  - id: "1638182762"
    title: "Bulk Scan, Bulk print & FaCT Useful Links"
    last_modified: "unknown"
    space: "RBS"
  - id: "1694700322"
    title: "Bulk Scan testing in lower environments"
    last_modified: "unknown"
    space: "DATS"
  - id: "1775307063"
    title: "Technical Specification V1.4"
    last_modified: "unknown"
    space: "RBS"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- An envelope can fail at validation (JSON schema or business rules), CDAM upload, or ASB notification — each stage leaves distinct DB status and log traces.
- The processor DB `envelope` table's `status` column tells you where the envelope is stuck: `CREATED` (never uploaded), `UPLOAD_FAILURE`, `UPLOADED` (never notified), `METADATA_FAILURE`, or absent (validation failed before persistence).
- Rejected blobs are moved to `{container}-rejected` in Azure Blob Storage — inspect them there.
- OCR validation retries are tracked in blob metadata keys `ocrValidationRetryCount` and `ocrValidationRetryDelayExpirationTime`, not in the database.
- The ASB dead-letter queue for the `envelopes` queue captures messages the orchestrator could not process; the orchestrator retries up to `ENVELOPES_QUEUE_MAX_DELIVERY_COUNT` times before dead-lettering.
- Use the processor's `/actions` API (authenticated with `actions-api-key`) to manually complete, reprocess, abort, or reclassify stuck envelopes.

## Identify the failure stage

1. Query the processor PostgreSQL database for the envelope by filename:

   ```sql
   SELECT id, status, zip_file_name, container, upload_failure_count, created_at
   FROM envelope
   WHERE zip_file_name = '<filename>.zip';
   ```

2. Interpret the `status` value:

   | Status | Meaning | Next step |
   |--------|---------|-----------|
   | (no row) | Validation failed before DB persistence | Check logs for schema/business validation errors |
   | `CREATED` | Persisted but documents not yet uploaded | Check upload task and CDAM connectivity |
   | `METADATA_FAILURE` | Envelope persisted but metadata inconsistency found among files and metadata info | Check logs for metadata mismatch; may need manual intervention |
   | `UPLOAD_FAILURE` | Upload to CDAM failed; will retry up to `max_tries` (default 5) | Check `upload_failure_count`; inspect CDAM logs |
   | `UPLOADED` | Documents uploaded but notification not sent | Check notification task is enabled |
   | `NOTIFICATION_SENT` | Handed to orchestrator, awaiting ACK | Check orchestrator and ASB `processed-envelopes` queue |
   | `ABORTED` | Envelope in inconsistent state has been manually aborted | No further processing; investigate root cause |
   | `COMPLETED` | Fully processed or rejected | No action needed |

## Diagnose validation failures

Validation failures happen before the envelope is persisted to the DB. The blob remains in the input container (or is moved to `{container}-rejected`).

3. Check processor logs for the envelope filename. Common validation error types:

   - **`InvalidEnvelopeSchemaException`** — the `metadata.json` inside the ZIP failed JSON Schema draft-04 validation (`MetafileJsonValidator.java`). Required fields: `po_box`, `jurisdiction`, `delivery_date`, `opening_date`, `zip_file_createddate`, `zip_file_name`, `envelope_classification`, `scannable_items`. The schema enforces `additionalProperties: false` — any unknown field causes rejection.
   - **`NonPdfFileFoundException`** — the ZIP contains a file that is neither `.pdf` nor `.json` (`ZipFileProcessor.java:113-135`).
   - **`FileSizeExceedMaxUploadLimit`** — a PDF exceeds 300 MB (`ZipFileProcessor.java:68-79`). The blob is moved to `{container}-rejected` immediately.
   - **Container/jurisdiction mismatch** — `EnvelopeValidator.assertContainerMatchesJurisdictionAndPoBox` checks that the container name, jurisdiction, and PO box triple matches a `containers.mappings` entry (`EnvelopeValidator.java:210-233`).
   - **`OcrDataNotFoundException`** — classification is `NEW_APPLICATION` or `SUPPLEMENTARY_EVIDENCE_WITH_OCR` but no FORM/SSCS1 document carries OCR data (`EnvelopeValidator.java:92-125`).

4. Validate the `zip_file_name` format matches the required pattern:
   ```
   ^\d+_([012][0-9]|30|31)-([0][0-9]|[1][012])-[2][0][0-9][0-9]-([01][0-9]|[2][0123])-[0-5][0-9]-[0-5][0-9]\.(test\.)?zip$
   ```

5. Check that `document_control_number` values are numeric (`^[0-9]+$`) and unique, and that `file_name` entries end with `.pdf`.

6. Verify the container/jurisdiction/PO box triple matches a configured mapping. Known production mappings:

   <!-- CONFLUENCE-ONLY: not verified in source -->

   | Jurisdiction | Container | PO Box values |
   |---|---|---|
   | SSCS | sscs | 12626, 13150 |
   | CMC | cmc | 12747 |
   | DIVORCE | nfd | 13226 |
   | DIVORCE | finrem | 12746 |
   | PROBATE | probate | 12625, 12624 |
   | PUBLICLAW | publiclaw | 12879 |
   | PRIVATELAW | privatelaw | 13235 |

## Inspect rejected blobs in Azure Storage

6. List blobs in the rejected container using Azure CLI:

   ```bash
   az storage blob list \
     --container-name "<jurisdiction>-rejected" \
     --account-name "reformscan<environment>" \
     --output table
   ```

7. Download a rejected blob for local inspection:

   ```bash
   az storage blob download \
     --container-name "<jurisdiction>-rejected" \
     --name "<blob-name>" \
     --account-name "reformscan<environment>" \
     --file ./rejected-envelope.zip
   ```

8. Unzip and inspect `metadata.json` locally against the known schema constraints.

## Diagnose OCR validation failures

9. Check blob metadata for OCR retry state:

   ```bash
   az storage blob metadata show \
     --container-name "<jurisdiction>" \
     --name "<blob-name>" \
     --account-name "reformscan<environment>"
   ```

   Look for keys `ocrValidationRetryCount` (max 2 retries) and `ocrValidationRetryDelayExpirationTime` (300-second backoff per retry, `application.yaml:248-249`).

10. If OCR validation returned `Status.ERRORS`, the envelope is rejected (`OcrValidator.java:138-147`). Check that:
    - The jurisdiction's OCR validation URL is configured (env vars like `OCR_VALIDATION_URL_SSCS`, `OCR_VALIDATION_URL_PROBATE`, etc.).
    - The `documentSubtype` is recognised by the remote OCR service — HTTP 404 means unrecognised subtype (`OcrValidator.java:183-185`).
    - The OCR URL lookup is by PO box, not by container. A misconfigured `poBoxes` list causes validation to be silently skipped.

## Diagnose CDAM upload failures

11. Query envelopes stuck in `UPLOAD_FAILURE`:

    ```sql
    SELECT id, zip_file_name, container, upload_failure_count, created_at
    FROM envelope
    WHERE status = 'UPLOAD_FAILURE'
    ORDER BY created_at DESC;
    ```

12. Check that the upload task is enabled and running:
    - `UPLOAD_TASK_ENABLED` must be set (no default in config).
    - The task uses ShedLock (`upload-documents` lock name) — check the `shedlock` table for a stuck lock:

      ```sql
      SELECT * FROM shedlock WHERE name = 'upload-documents';
      ```

      If `lock_until` is in the past but the task is not running, the replica may have crashed. The lock will auto-expire after `PT10M` (default `SCHEDULING_LOCK_AT_MOST_FOR`).

13. Verify CDAM connectivity. The upload target is `${case_document_am.url}/cases/documents`. The `caseTypeId` sent is `<CONTAINER_UPPERCASE>_ExceptionRecord` (e.g., `SSCS_ExceptionRecord`). If the case type is not registered in CCD, CDAM rejects the upload (`DocumentServiceHelper.java:46-48`).

14. Check that `upload_failure_count` has not exceeded `UPLOAD_MAX_TRIES` (default 5). Once exceeded, the envelope remains in `UPLOAD_FAILURE` permanently and requires manual intervention.

## Diagnose ASB notification failures

15. Query envelopes stuck in `UPLOADED` status (documents uploaded but notification never sent):

    ```sql
    SELECT id, zip_file_name, container, created_at
    FROM envelope
    WHERE status = 'UPLOADED'
    ORDER BY created_at DESC;
    ```

16. Check that the notification task is enabled:
    - `NOTIFICATIONS_TO_ORCHESTRATOR_TASK_ENABLED` defaults to `false` (`application.yaml:223`) — it must be explicitly set to `true`.

17. Check process events for notification failures:

    ```sql
    SELECT e.zip_file_name, pe.event, pe.created_at
    FROM process_event pe
    JOIN envelope e ON e.id = pe.envelope_id
    WHERE pe.event = 'DOC_PROCESSED_NOTIFICATION_FAILURE'
    ORDER BY pe.created_at DESC;
    ```

18. Inspect the ASB dead-letter queue for the `envelopes` queue. Messages that the orchestrator could not process end up here. Use Azure Service Bus Explorer or the Azure Portal to peek at dead-lettered messages and inspect their `DeadLetterReason` and `DeadLetterErrorDescription` properties.

## Diagnose orchestrator processing failures (stale envelopes)

19. Query envelopes stuck in `NOTIFICATION_SENT` status (handed to orchestrator but never completed):

    ```sql
    SELECT id, zip_file_name, container, created_at
    FROM envelope
    WHERE status = 'NOTIFICATION_SENT'
    ORDER BY created_at DESC;
    ```

20. Check the orchestrator's behaviour on failure. The orchestrator uses Azure Service Bus message delivery counting:
    - On `POTENTIALLY_RECOVERABLE_FAILURE` (any exception that is not `InvalidMessageException`), the message lock is allowed to expire and the message returns to the queue for retry.
    - Retries continue up to `ENVELOPES_QUEUE_MAX_DELIVERY_COUNT` (configured via env var). Once exceeded, the message is dead-lettered with reason "Too many deliveries".
    - On `UNRECOVERABLE_FAILURE` (e.g. invalid message format), the message is immediately dead-lettered.

    <!-- DIVERGENCE: Confluence (page 1638182762) says max delivery count is 300 (an Azure-level setting), but source (EnvelopeMessageProcessor.java:45) shows it is configurable via ${ENVELOPES_QUEUE_MAX_DELIVERY_COUNT} and defaults vary by environment (integration tests use 10). The actual production value is set in infrastructure config, not hardcoded. Source wins. -->

21. Common cause of stale envelopes: a downstream service (e.g. Probate, SSCS) returns a 5xx to CCD during a callback. CCD converts any 4xx/5xx from a callback into a `502 Bad Gateway` response to the orchestrator. The orchestrator treats this as potentially recoverable and retries indefinitely up to the max delivery count.

    To confirm this pattern, check App Insights for the orchestrator with the envelope ID or zip filename. Look for repeated `CCDCallbackException` traces.

22. Check the orchestrator's `callback_result` table in its PostgreSQL database to see if the envelope was eventually processed:

    ```sql
    SELECT * FROM callback_result
    WHERE exception_record_id = '<ccd_case_reference>';
    ```

    A successful attachment will also produce an App Insights trace: "Attached documents from envelope to case."

## Check envelope status via HTTP endpoints

23. Use the processor's built-in HTTP endpoints to check envelope status without direct DB access:

    - **By container and filename**: `GET /envelopes/{container}/{file_name}`
    - **By envelope ID**: `GET /envelopes/{id}`
    - **Stale incomplete envelopes**: `GET /envelopes/stale-incomplete-envelopes`

    Example:
    ```bash
    curl http://bulk-scan-processor-<env>.service.core-compute-<env>.internal/envelopes/<container>/<filename>.zip
    ```

    The response includes `status`, `ccd_id`, and `ccd_action` fields. Expected `ccd_action` values:
    - `AUTO_ATTACHED_TO_CASE` — supplementary evidence successfully attached to an existing case
    - `AUTO_CREATED_CASE` — new application successfully created a case
    - `EXCEPTION_RECORD` — an exception record was created (see "Exception record creation rules" below)

24. For daily monitoring, use the reporting endpoints:

    | Endpoint | Purpose |
    |----------|---------|
    | `GET /reports/envelopes-count-summary?date=YYYY-MM-DD` | Count of envelopes by container for the given date |
    | `GET /reports/zip-files-summary?date=YYYY-MM-DD` | All zip files received for a given date with status |
    | `GET /reports/rejected` | Recently rejected zip files |
    | `GET /reports/rejected-zip-files` | Rejected zip files with details |

## Check blob-router dispatch status

25. Before the processor sees an envelope, it passes through `blob-router-service`. Check the blob-router DB if the envelope never appears in the processor:

    ```sql
    SELECT * FROM envelopes
    WHERE file_name = '<filename>.zip';
    ```

    A successful dispatch shows status `DISPATCHED`. If the row exists but is not `DISPATCHED`, the envelope never reached the processor's storage account.

26. The blob-router also exposes an HTTP endpoint:
    ```bash
    curl http://reform-scan-blob-router-<env>.service.core-compute-<env>.internal/envelopes?file_name=<filename>.zip
    ```

## Check scheduling is active

27. Confirm that the relevant env vars are set for the environment:

    | Env var | Default | Effect if missing |
    |---------|---------|-------------------|
    | `SCAN_ENABLED` | `false` | Blob polling does not run |
    | `UPLOAD_TASK_ENABLED` | (none) | Upload task does not run |
    | `NOTIFICATIONS_TO_ORCHESTRATOR_TASK_ENABLED` | `false` | Notification task does not run |
    | `SCHEDULING_LOCK_AT_MOST_FOR` | `PT10M` | ShedLock expiry duration |

28. The `IncompleteEnvelopesTask` (cron: `0 */15 * * * *`) sends alerts for envelopes stuck longer than `monitoring.incomplete-envelopes.stale-after` (configurable duration). Check AlertManager or the relevant monitoring channel for these alerts. The task is controlled by `monitoring.incomplete-envelopes.enabled`.

## Manual intervention via the actions API

29. The processor exposes an `/actions` API for manual envelope state transitions. All endpoints require a `Bearer` token set to the `actions-api-key` keyvault secret (`ACTIONS_API_KEY` env var):

    | Action | Method | Path | Effect |
    |--------|--------|------|--------|
    | Reprocess | `PUT` | `/actions/reprocess/{envelopeId}` | Re-trigger processing for a failed envelope |
    | Complete | `PUT` | `/actions/{envelopeId}/complete` | Mark envelope as `COMPLETED` when it is actually done but status was not updated |
    | Abort | `PUT` | `/actions/{envelopeId}/abort` | Mark envelope as `ABORTED` — use for unrecoverably broken envelopes |
    | Reclassify + Reprocess | `PUT` | `/actions/update-classification-reprocess/{envelopeId}` | Change classification to `EXCEPTION` and reprocess — forces creation of an exception record |

    Example:
    ```bash
    curl -X PUT \
      http://bulk-scan-processor-<env>.service.core-compute-<env>.internal/actions/reprocess/<envelope-uuid> \
      -H "Authorization: Bearer <actions-api-key>"
    ```

## Exception record creation rules

<!-- CONFLUENCE-ONLY: not verified in source -->

30. An exception record is created by the orchestrator when any of the following conditions occur:
    - Envelope has `supplementary_evidence` classification but no `case_number` is provided.
    - Envelope has `supplementary_evidence` classification with a `case_number` that cannot be found in CCD.
    - Envelope has `new_application` classification and OCR validation returns warnings or the transformation URL returns errors.
    - Envelope classification from the supplier is `exception`.
    - Any other processing failure outside the happy path.

    Some jurisdictions (e.g. Financial Remedy, SSCS) are configured to always create exception records instead of auto-creating cases.

## Error notification to supplier

31. When envelope processing fails at the validation stage, the supplier is notified via an HTTPS POST to their configured notification endpoint. The error notification payload includes:

    | Field | Description |
    |-------|-------------|
    | `zip_file_name` | Name of the failing zip file |
    | `po_box` | PO Box the envelope was addressed to |
    | `error_code` | One of: `ERR_FILE_LIMIT_EXCEEDED`, `ERR_METAFILE_INVALID`, `ERR_AV_FAILED`, `ERR_SIG_VERIFY_FAILED`, `ERR_RESCAN_REQUIRED`, `ERR_ZIP_PROCESSING_FAILED` |
    | `error_description` | Human-readable error message |
    | `document_control_number` | Present only for rescan/filesize issues with a specific document |

    This notification is sent by `reform-scan-notification-service`, not by the processor directly. If the supplier reports they did not receive a notification, check that service's logs and connectivity.

## Clearing test data (lower environments only)

32. In UAT/demo, if you need to re-upload the same test pack, clear existing data first. The processor rejects duplicate `zip_file_name`, `document_control_number`, and payment DCN values.

    **blob-router DB:**
    ```sql
    DELETE FROM envelopes
    WHERE container = '<container>'
      AND file_name IN ('<filename1>.zip', '<filename2>.zip');
    ```

    **bulk-scan-processor DB** (must delete child records first):
    ```sql
    DELETE FROM scannable_items WHERE envelope_id IN
      (SELECT id FROM envelopes WHERE container = '<container>'
       AND zipfilename IN ('<filename1>.zip', '<filename2>.zip'));

    DELETE FROM payments WHERE envelope_id IN
      (SELECT id FROM envelopes WHERE container = '<container>'
       AND zipfilename IN ('<filename1>.zip', '<filename2>.zip'));

    DELETE FROM envelopes
    WHERE container = '<container>'
      AND zipfilename IN ('<filename1>.zip', '<filename2>.zip');
    ```

## Verify

- After resolving the issue, confirm the envelope progresses by re-querying:

  ```sql
  SELECT id, status, zip_file_name FROM envelope
  WHERE zip_file_name = '<filename>.zip';
  ```

  The status should advance from the previously-stuck state within 30 seconds (the default scheduling delay for scan, upload, and notification tasks).

- For rejected blobs that were fixed and re-uploaded, confirm a new envelope row appears with status progressing through `CREATED` -> `UPLOADED` -> `NOTIFICATION_SENT` -> `COMPLETED`.

## See also

- [Envelope Processing](../explanation/envelope-processing.md) — explains the status lifecycle, validation stages, and ShedLock behaviour behind these failure modes
- [Orchestration Flow](../explanation/orchestration-flow.md) — stale envelopes and ASB retry behaviour in the orchestrator
- [API Processor Reference](../reference/api-processor.md) — full reference for the `/actions`, `/envelopes`, and `/reports` endpoints used in diagnosis
- [Envelope Format](../reference/envelope-format.md) — the metadata.json schema constraints that cause validation failures
