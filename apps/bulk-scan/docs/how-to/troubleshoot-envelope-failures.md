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
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/services/ErrorNotificationSender.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/model/out/msg/ErrorMsg.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/model/out/msg/ErrorCode.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/services/UploadEnvelopeDocumentsService.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/exceptions/FileSizeExceedMaxUploadLimit.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/entity/ProcessEvent.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/model/common/Event.java
  - bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/validation/OcrValidator.java
  - bulk-scan-orchestrator:charts/bulk-scan-orchestrator/values.yaml
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/EnvelopeTransformer.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/TransformationRequestCreator.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/casecreation/AutoCaseCreator.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/envelopehandlers/ExceptionClassificationHandler.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/envelopehandlers/SupplementaryEvidenceHandler.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/envelopehandlers/SupplementaryEvidenceWithOcrHandler.java
  - bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/envelopehandlers/NewApplicationHandler.java
  - cnp-flux-config:apps/bsp/bulk-scan-orchestrator/prod.yaml
  - cnp-flux-config:apps/bsp/bulk-scan-orchestrator/aat.yaml
  - cnp-flux-config:apps/bsp/bulk-scan-orchestrator/demo.yaml
  - cnp-flux-config:apps/bsp/bulk-scan-orchestrator/ithc.yaml
  - cnp-flux-config:apps/bsp/bulk-scan-orchestrator/perftest.yaml
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
    last_modified: "2026-07-01"
    space: "RBS"
confluence_checked_at: "2026-08-20T00:00:00Z"
sources_sha:
  ? "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/services/ErrorNotificationSender.java"
  : "e37789988ec16d3c5162a38a37c2c974b37d27b4"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/model/out/msg/ErrorMsg.java": "e37789988ec16d3c5162a38a37c2c974b37d27b4"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/model/out/msg/ErrorCode.java": "e37789988ec16d3c5162a38a37c2c974b37d27b4"
  ? "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/services/UploadEnvelopeDocumentsService.java"
  : "e37789988ec16d3c5162a38a37c2c974b37d27b4"
  ? "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/exceptions/FileSizeExceedMaxUploadLimit.java"
  : "e37789988ec16d3c5162a38a37c2c974b37d27b4"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/entity/ProcessEvent.java": "2b43e4fa15ff5c6c837d0b8f207b54b3cc29b61c"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/model/common/Event.java": "77a26ce3d10483278a94f3148a618b69f1e66cbe"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/tasks/processor/EnvelopeProcessor.java": "ac5ee8dbac634179a557c12e09779457e22e34ad"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/validation/MetafileJsonValidator.java": "e37789988ec16d3c5162a38a37c2c974b37d27b4"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/validation/EnvelopeValidator.java": "1a4ed083d2ce4288859c9449cf36cb5f7e0a45b0"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/services/storage/OcrValidationRetryManager.java": "e37789988ec16d3c5162a38a37c2c974b37d27b4"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/tasks/OrchestratorNotificationTask.java": "e37789988ec16d3c5162a38a37c2c974b37d27b4"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/tasks/UploadEnvelopeDocumentsTask.java": "e37789988ec16d3c5162a38a37c2c974b37d27b4"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/services/OrchestratorNotificationService.java": "ac5ee8dbac634179a557c12e09779457e22e34ad"
  "bulk-scan-processor:src/main/resources/application.yaml": "143488c2c25b4bee56e4c8d5201c280a37c0c0d9"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/ActionController.java": "e37789988ec16d3c5162a38a37c2c974b37d27b4"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/EnvelopeController.java": "2b43e4fa15ff5c6c837d0b8f207b54b3cc29b61c"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/controllers/ReportsController.java": "77a26ce3d10483278a94f3148a618b69f1e66cbe"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/entity/Status.java": "e37789988ec16d3c5162a38a37c2c974b37d27b4"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/servicebus/domains/envelopes/EnvelopeMessageProcessor.java"
  : "e5c2aae520540c34ba5a9476e59cdf9ebe3eca28"
  "bulk-scan-processor:src/main/java/uk/gov/hmcts/reform/bulkscanprocessor/validation/OcrValidator.java": "3b463d31c663cb0e155239467383b7732a64feaa"
  "bulk-scan-orchestrator:charts/bulk-scan-orchestrator/values.yaml": "3bf6a33c0e90821820d8bab62a9f3129a9dd3244"
  "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/EnvelopeTransformer.java": "191d098f8515659ce5fe6dfc59a5f553efa019ca"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/client/transformation/TransformationRequestCreator.java"
  : "2a3662a2e5440b8c1f1b427f00f3257373590421"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/casecreation/AutoCaseCreator.java"
  : "2b0ff9656c512532859844cfa7c588a9e45769db"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/envelopehandlers/ExceptionClassificationHandler.java"
  : "c7bcda72fb826e91f171f33989af1d1db0656562"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/envelopehandlers/SupplementaryEvidenceHandler.java"
  : "c7bcda72fb826e91f171f33989af1d1db0656562"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/envelopehandlers/SupplementaryEvidenceWithOcrHandler.java"
  : "c7bcda72fb826e91f171f33989af1d1db0656562"
  ? "bulk-scan-orchestrator:src/main/java/uk/gov/hmcts/reform/bulkscan/orchestrator/services/ccd/envelopehandlers/NewApplicationHandler.java"
  : "c7bcda72fb826e91f171f33989af1d1db0656562"
  "cnp-flux-config:apps/bsp/bulk-scan-orchestrator/prod.yaml": "8ba4e8844d57070f48a9ef9a00e1d7b7178e71c5"
  "cnp-flux-config:apps/bsp/bulk-scan-orchestrator/aat.yaml": "eb8746dc8fb3f2493cc0337fb3d38e7cdf664cad"
  "cnp-flux-config:apps/bsp/bulk-scan-orchestrator/demo.yaml": "13d0a050a442f6bbf32aba9ba719be6b7c45598f"
  "cnp-flux-config:apps/bsp/bulk-scan-orchestrator/ithc.yaml": "8ef474bf1db14c6741a8c04c9ef4848973f87bda"
  "cnp-flux-config:apps/bsp/bulk-scan-orchestrator/perftest.yaml": "eb8746dc8fb3f2493cc0337fb3d38e7cdf664cad"
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

Validation failures happen before the envelope is persisted to the DB. The blob remains in the input container (or is moved to `{container}-rejected`). Each of these throws a subclass of `EnvelopeRejectionException`, which `FileContentProcessor` routes to `FileRejector.handleInvalidBlob` — that sends the supplier notification and then moves the blob. The 300 MB PDF size limit is *not* one of these; see [Diagnose an oversized PDF](#diagnose-an-oversized-pdf).

3. Check processor logs for the envelope filename. Common validation error types:

   - **`InvalidEnvelopeSchemaException`** — the `metadata.json` inside the ZIP failed JSON Schema draft-04 validation (`MetafileJsonValidator.java`). Required fields: `po_box`, `jurisdiction`, `delivery_date`, `opening_date`, `zip_file_createddate`, `zip_file_name`, `envelope_classification`, `scannable_items`. The schema enforces `additionalProperties: false` — any unknown field causes rejection.
   - **`NonPdfFileFoundException`** — the ZIP contains a file that is neither `.pdf` nor `.json` (`ZipFileProcessor.java:113-135`).
   - **Container/jurisdiction mismatch** — `EnvelopeValidator.assertContainerMatchesJurisdictionAndPoBox` checks that the container name, jurisdiction, and PO box triple matches a `containers.mappings` entry (`EnvelopeValidator.java:210-233`).
   - **`OcrDataNotFoundException`** — classification is `NEW_APPLICATION` or `SUPPLEMENTARY_EVIDENCE_WITH_OCR` but no FORM/SSCS1 document carries OCR data (`EnvelopeValidator.java:92-125`).

4. Validate the `zip_file_name` format matches the required pattern:
   ```
   ^\d+_([012][0-9]|30|31)-([0][0-9]|[1][012])-[2][0][0-9][0-9]-([01][0-9]|[2][0123])-[0-5][0-9]-[0-5][0-9]\.(test\.)?zip$
   ```

5. Check that `document_control_number` values are numeric (`^[0-9]+$`) and unique, and that `file_name` entries end with `.pdf`.

6. Verify the container/jurisdiction/PO box triple matches a configured mapping. Known production mappings:

   | Jurisdiction | Container | PO Box values |
   |---|---|---|
   | SSCS | sscs | 12626, 13150, 13618 |
   | CMC | cmc | 12747 |
   | DIVORCE | divorce | 12706 |
   | DIVORCE | nfd | 13226 |
   | DIVORCE | finrem | 12746 |
   | PROBATE | probate | 12625, 12624 |
   | PUBLICLAW | publiclaw | 12879 |
   | PRIVATELAW | privatelaw | 13235 |

   Source: `bulk-scan-processor:src/main/resources/application.yaml` (`containers.mappings`). These eight are the complete set. Note that three separate containers map to the `DIVORCE` jurisdiction, so jurisdiction alone is never enough to identify the container — always check the triple.

## Diagnose an oversized PDF

`FileSizeExceedMaxUploadLimit` is easy to mistake for a validation failure. It is not one, and it behaves differently from everything in the previous section:

- It extends `RuntimeException`, **not** `EnvelopeRejectionException`, so it does not go through `FileRejector`.
- It is thrown from `ZipFileProcessor.checkFileSizeAgainstUploadLimit`, reached only via `extractPdfFiles` from `UploadEnvelopeDocumentsService.processBlobContent` — i.e. during the **upload-documents** task, long after the envelope row was created.
- The handler moves the blob to `{container}-rejected`, records a `FILE_SIZE_EXCEED_UPLOAD_LIMIT_FAILURE` event, sets the envelope status to `COMPLETED`, saves it, and throws `FailedUploadException`.
- **No error notification is sent to the supplier.** There is no `ERR_FILE_LIMIT_EXCEEDED` message on the `notifications` queue.

So the symptom is an envelope that reached `COMPLETED` with a rejected blob and a silent supplier. Search for the `FILE_SIZE_EXCEED_UPLOAD_LIMIT_FAILURE` event rather than expecting a notification:

```sql
SELECT pe.container, pe.zipfilename, e.status, pe.reason, pe.createdat
FROM process_events pe
LEFT JOIN envelopes e
  ON e.container = pe.container AND e.zipfilename = pe.zipfilename
WHERE pe.event = 'FILE_SIZE_EXCEED_UPLOAD_LIMIT_FAILURE'
ORDER BY pe.createdat DESC;
```

`process_events` has no envelope foreign key — `envelope_id` was dropped in migration `V007__Envelope_upgrade.sql`, so `(container, zipfilename)` is the only way to correlate the two tables.

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

30. An exception record is what the orchestrator produces whenever the automated path cannot finish. The trigger depends on the classification:
    - `exception` — always, with no other possible outcome (`ExceptionClassificationHandler.java:32-35`).
    - `supplementary_evidence` — when `CaseFinder` matches no case, and also when a case is matched but attaching the documents to it fails (`SupplementaryEvidenceHandler.java:49-77`).
    - `supplementary_evidence_with_ocr` — when auto case update is off for the container, when the update is abandoned as impossible, or when a recoverable update error is still failing on the last delivery (`SupplementaryEvidenceWithOcrHandler.java:43-64`).
    - `new_application` — when auto case creation is off for the container, when more than one case already exists for the envelope id, when the transformation endpoint answers 400 or 422 or returns a body that fails validation, when CCD rejects the create with 400 or 422, or when a recoverable failure is still failing on the last delivery (`AutoCaseCreator.java:54-59`, `:65-79`, `:129-137`, `EnvelopeTransformer.java:56-67`, `NewApplicationHandler.java:46-62`).

    In production and AAT, auto case creation is on for `bulkscanauto`, `probate` and `nfd`, and auto case update for `bulkscanauto` and `nfd`; every other container has both `false` (`charts/bulk-scan-orchestrator/values.yaml:32-51`, with no override in `cnp-flux-config:apps/bsp/bulk-scan-orchestrator/prod.yaml` or `aat.yaml`). For those services an exception record is the routine outcome for every envelope and not a fault to investigate.

    Read the flag for the environment you are debugging in, not the chart. Demo enables `privatelaw` and `finrem` creation (`cnp-flux-config:apps/bsp/bulk-scan-orchestrator/demo.yaml:15,17`), ithc enables `privatelaw` (`ithc.yaml:14`) and perftest enables `probate` (`perftest.yaml:11`). A container that auto-creates in demo and raises an exception record in production is behaving as configured.

    Warnings are not a trigger. Requests on the automated path are built with `is_automated_process` and `ignore_warnings` both `true` (`TransformationRequestCreator.java:43-58`), so a transformation endpoint answering 200 with warnings still gets a case created, and an OCR `WARNINGS` response at the processor is logged with processing continuing (`OcrValidator.java:147-152`). Do not look for a warning when explaining an unexpected exception record — look for one of the triggers above.

## Error notification to supplier

31. When envelope processing fails at the validation stage, the processor publishes an `ErrorMsg` to the `notifications` Service Bus queue (`ErrorNotificationSender.java:88`). `reform-scan-notification-service` consumes it and POSTs an `ErrorNotificationRequest` to the supplier's endpoint. The processor's message carries:

    | Field | Value as sent by the processor |
    |-------|-------------------------------|
    | `id` | `{container}_{zipFileName}` — the ASB message ID |
    | `eventId` | The processor's event ID |
    | `zip_file_name` | Name of the failing zip file |
    | `jurisdiction` | **The container name**, not the mapped jurisdiction |
    | `po_box` | A comma-joined list of **all** PO boxes mapped to that container — not the one the envelope declared |
    | `error_code` | One of `ERR_METAFILE_INVALID`, `ERR_ZIP_PROCESSING_FAILED`, `ERR_SERVICE_DISABLED`, `ERR_PAYMENTS_DISABLED` |
    | `error_description` | Human-readable error message |
    | `document_control_number` | Always `null` |
    | `service` | Always `"bulk_scan_processor"` |
    | `container` | The container name |

    Two traps when reading a notification during an incident:

    - `jurisdiction` and `po_box` are **not** the envelope's values. Both are derived from the container, so a `ContainerJurisdictionPoBoxMismatchException` notification shows the *expected* PO boxes, never the offending one. Get that from the metadata or the processor log.
    - `ERR_AV_FAILED` and `ERR_SIG_VERIFY_FAILED` never come from the processor — they come from `blob-router-service`, before the blob reaches the jurisdiction container. If you see one, stop looking in the processor's logs and database. `ERR_FILE_LIMIT_EXCEEDED` and `ERR_RESCAN_REQUIRED` are declared in `ErrorCode.java` but raised nowhere in either cloned repo.

    Oversized PDFs produce **no** notification at all — see [Diagnose an oversized PDF](#diagnose-an-oversized-pdf).

    If the supplier reports they did not receive a notification, check `reform-scan-notification-service`'s logs and connectivity, and confirm the message actually reached the `notifications` queue (its namespace is overridden via `QUEUE_NOTIFICATIONS_NAMESPACE`, so it may not be in the same namespace as `envelopes` and `processed-envelopes`).

<!-- CONFLUENCE-ONLY: the supplier-facing ErrorNotificationRequest shape (which adds a reference_id), its HTTP basic auth and the expected 201 + notification_id response come from Technical Specification V1.4 §6.1; reform-scan-notification-service is not cloned in this workspace. -->

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
