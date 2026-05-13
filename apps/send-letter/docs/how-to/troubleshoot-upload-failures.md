---
title: Troubleshoot Upload Failures
topic: lifecycle
diataxis: how-to
product: send-letter
audience: both
sources:
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/UploadLettersTask.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/config/SchedulerConfiguration.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/ftp/FtpAvailabilityChecker.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/ftp/FtpClient.java
  - send-letter-service:src/main/resources/application.yaml
  - send-letter-service:src/main/resources/db/migration/V010__Add_shedlock.sql
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/ActionController.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/reports/StaleLetterController.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/reports/PendingLettersController.java
status: reviewed
last_reviewed: "2026-05-13T12:00:00Z"
examples_extracted_from:
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/tasks/UploadLettersTask.java
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/controllers/ActionController.java
  - apps/send-letter/send-letter-service/src/main/resources/application.yaml
confluence:
  - id: "1667699171"
    title: "Bulk print - Developer FAQs"
    last_modified: "unknown"
    space: "DATS"
  - id: "1535411766"
    title: "BAU"
    last_modified: "unknown"
    space: "RBPS"
  - id: "1223328306"
    title: "Alerts and reports"
    last_modified: "unknown"
    space: "RBPS"
  - id: "1689792409"
    title: "Bulk Print - Incidents"
    last_modified: "unknown"
    space: "DATS"
  - id: "1440498830"
    title: "Bulk print - Knowledge bank"
    last_modified: "unknown"
    space: "DATS"
  - id: "1094582361"
    title: "Encryption Key rotation"
    last_modified: "unknown"
    space: "RBPS"
confluence_checked_at: "2026-05-13T12:00:00Z"
---

## TL;DR

- Letters stuck in `Created` status means the `UploadLettersTask` scheduler is not picking them up for SFTP upload.
- Most common causes: `SCHEDULING_ENABLED` is `false` (the default), the FTP downtime window is active, SFTP connectivity/auth failure, or a stale ShedLock row preventing the task from acquiring the lock.
- A single non-IOException upload error breaks the entire batch (max 10 letters per cycle) -- one bad letter blocks all subsequent uploads until manual intervention.
- The scheduler runs every 30 seconds but only processes letters created more than 2 minutes ago (`DB_POLL_DELAY`).
- Use the admin endpoints (`mark-created`, `mark-aborted`, `mark-posted-locally`, `mark-not-sent`) to manage stuck letters. All require the `actions-api-key` secret as a Bearer token.
- Letters uploaded but not printed within 2 business days are flagged as stale; an automated alert emails the team.

## Symptom

Letters remain in `Created` status indefinitely. The `sentToPrintAt` column is null. No upload activity appears in logs.

## Step 1: Confirm scheduling is enabled

The `UploadLettersTask` and the entire `SchedulerConfiguration` only activate when `scheduling.enabled=true` (`SchedulerConfiguration.java:20`). The default in `application.yaml:171` is:

```yaml
scheduling:
  enabled: ${SCHEDULING_ENABLED:false}
```

1. Check the pod's environment variable: `SCHEDULING_ENABLED` must be `true`.
2. If missing or `false`, the scheduler bean is never created and no uploads will occur.
3. Verify in logs at startup -- look for ShedLock initialisation messages. Their absence confirms scheduling is disabled.

## Step 2: Check the FTP downtime window

The `UploadLettersTask` checks `FtpAvailabilityChecker.isFtpAvailable()` before processing any letters (`UploadLettersTask.java:82-84`). If the current London time falls within the downtime window, uploads are silently skipped with the log message "Not processing 'UploadLetters' task due to FTP downtime window".

<!-- DIVERGENCE: Confluence (Knowledge bank) says downtime is integer hours. Source application.yaml:139-140 shows full HH:MM time strings. Source wins. -->

1. Check the configured window. Defaults are 16:00-17:00 London time (`application.yaml:138-140`):
   ```yaml
   ftp:
     downtime:
       from: ${FTP_DOWNTIME_FROM:16:00}
       to: ${FTP_DOWNTIME_TO:17:00}
   ```
2. The checker parses these as `LocalTime` values and handles both same-day windows (start < end) and overnight windows (start > end) (`FtpAvailabilityChecker.java:30-35`).
3. If letters are stuck during what should be an active period, confirm the pod's timezone is `Europe/London` and that the env vars have not been misconfigured to create an all-day window (e.g. `FTP_DOWNTIME_FROM=00:00`, `FTP_DOWNTIME_TO=23:59`).
4. **Xerox processing context**: Xerox starts downloading files between 16:00 and 17:30 on weekdays. The default downtime window aligns with this -- letters uploaded during Xerox's download window could be partially processed. Files received before 16:00 are processed same day (Mon-Fri). Xerox has 48 hours to print and mail after download.

## Step 3: Verify SFTP connectivity

The service uses SSHJ (`com.hierynomus:sshj:0.40.0`) with public-key authentication (`FtpClient.java:248-263`).

1. Check logs for `UserAuthException` -- this is caught and logged as "Unable to authenticate" without retry (`FtpClient.java:225-228`). Common causes:
   - Expired or rotated SSH key pair.
   - PEM private key newline corruption in environment variables (`FtpConfigProperties.java:118-127` applies a workaround, but malformed keys can still fail).
   - Incorrect host fingerprint -- the service verifies the server fingerprint on connect.
2. Check logs for `IOException` or `TimeoutException` during upload. On timeout, the service attempts to delete partial files before rethrowing (`FtpClient.java:99-105`).
3. The retry template retries up to 5 times with 2000ms exponential backoff on `FtpException` (`RetryConfig.java:22-31`). If all retries are exhausted, the letter stays `Created` for the next scheduler cycle -- unless it was a non-IOException error (see Step 5).

## Step 4: Check ShedLock state

`UploadLettersTask.run()` is annotated with `@SchedulerLock(name = "UploadLetters")` (`UploadLettersTask.java:78`). The default `lockAtMostFor` is `PT10M` (`application.yaml:172`).

1. Query the `shedlock` table:
   ```sql
   SELECT name, lock_until, locked_at, locked_by
   FROM shedlock
   WHERE name = 'UploadLetters';
   ```
2. If `lock_until` is in the future and significantly ahead of `locked_at` (more than 10 minutes), the lock may be stale -- perhaps a pod died while holding it.
3. To release a stuck lock manually:
   ```sql
   UPDATE shedlock
   SET lock_until = NOW()
   WHERE name = 'UploadLetters';
   ```
4. After clearing, the next scheduler cycle (30 seconds) will re-acquire the lock and resume processing.

## Step 5: Identify a blocking letter

The upload loop processes a maximum of `BATCH_SIZE = 10` letters per scheduler cycle (`UploadLettersTask.java:38,101`). A single non-IOException error during upload causes the batch loop to `break` (`UploadLettersTask.java:119-124`). The problematic letter is marked `FailedToUpload` via `letterEventService.failLetterUpload()`, but all remaining letters in the batch are not processed until the next cycle.

1. Query for the blocking letter:
   ```sql
   SELECT id, service, type, status, created_at
   FROM letters
   WHERE status = 'FailedToUpload'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
2. Check `letter_events` for the failure detail:
   ```sql
   SELECT * FROM letter_events
   WHERE letter_id = '<uuid>'
   ORDER BY created_at DESC;
   ```
3. If the failed letter has been resolved or should be skipped, mark it as `Aborted` via the admin endpoint:
   ```
   PUT /letters/{id}/mark-aborted
   Authorization: Bearer <ACTIONS_API_KEY>
   ```
   The API key is stored in the Key Vault secret `actions-api-key` (in `rpe-send-letter-<env>` vault).
4. Letters with no service-folder mapping are marked `Skipped` (`UploadLettersTask.java:158-163`). Check that the calling service's S2S name has an entry in `ftp.service-folders`. Note that some services have an explicit `enabled` flag (e.g. `civil_service` defaults to `enabled: false`).
5. To re-queue a letter for upload (e.g. after fixing the root cause), mark it back to `Created`:
   ```
   PUT /letters/{id}/mark-created
   Authorization: Bearer <ACTIONS_API_KEY>
   ```

## Step 6: Check the db-poll-delay

<!-- DIVERGENCE: Draft previously stated db-poll-delay was 120000 milliseconds. Source application.yaml:177 shows DB_POLL_DELAY:2 and UploadLettersTask.java:103 uses minusMinutes(dbPollDelay). The delay is 2 minutes (integer), not 120000ms. Source wins. -->

The scheduler only picks up letters created more than 2 minutes ago (`application.yaml:177`). The value is in **minutes**, not milliseconds. If you are testing and expecting immediate upload, wait at least 2 minutes after submission.

```yaml
tasks:
  upload-letters:
    db-poll-delay: ${DB_POLL_DELAY:2}  # minutes -- used in minusMinutes()
```

## Step 7: Check for large file / OOM issues

Extremely large PDFs (total batch > ~95 MB zipped) can cause `OutOfMemoryError: Java heap space` during zip creation. This blocks the entire upload task, not just one letter.

<!-- CONFLUENCE-ONLY: not verified in source -->

1. Check AppInsights for OOM exceptions:
   ```
   exceptions
   | where outerMessage contains "Handler dispatch failed; nested exception is java.lang.OutOfMemoryError: Java heap space"
   | where timestamp > ago(7d)
   | sort by timestamp desc
   ```
2. If OOM is confirmed, identify the culprit letter by correlating timestamps with recently created letters from services known to send large evidence bundles (SSCS, Civil).
3. Mark the oversized letter as `Aborted` and notify the calling service to reduce document sizes or split into multiple requests.

## Step 8: Check for SFTP account lockout

<!-- CONFLUENCE-ONLY: not verified in source -->

Xerox may lock the SFTP account after security changes or failed authentication attempts. Symptoms: persistent `UserAuthException` even after verifying key correctness.

1. To unblock the FTP account, raise a SNOW ticket with the following assignment:
   - **Service Offering**: Offsite Bulk Print Services
   - **Assignment Group**: Offsite_Bulk_Printing_Xerox
2. The FTP username is stored in the Key Vault secret `ftp-user` in `rpe-send-letter-<env>`.
3. During planned Xerox maintenance, disable uploads by setting `SCHEDULING_ENABLED=false` via Flux config (e.g. `cnp-flux-config` PR). Re-enable after maintenance is confirmed complete.

## Step 9: Prevent letter from reaching Xerox

If a letter has already been submitted but must not be printed:

1. **Not yet uploaded** (status = `Created`): Mark it as `Aborted` via the admin endpoint:
   ```
   PUT /letters/{id}/mark-aborted
   Authorization: Bearer <ACTIONS_API_KEY>
   ```
2. **Already uploaded** (status = `Uploaded`): Raise a DevOps ticket to delete the file from the SFTP server. Connection details are in the `rpe-send-letter-prod` Key Vault. Contact Xerox if the file has already been downloaded for processing.

## Monitoring endpoints

The service exposes internal endpoints for monitoring upload health (accessible via VPN on the internal hostname `rpe-send-letter-service-<env>.service.core-compute-<env>.internal`):

| Endpoint | Purpose |
|----------|---------|
| `GET /pending-letters` | Letters in `Created` status not yet uploaded |
| `GET /stale-letters` | Letters uploaded > 2 business days ago without `Posted` confirmation |
| `GET /stale-letters/download` | CSV download of stale letters |
| `GET /letters?date=YYYY-MM-DD` | All letters created on a given date (expect `Uploaded` status) |
| `GET /reports/count-summary?date=YYYY-MM-DD` | Letter count per service for a given day |
| `GET /letters/{id}` | Letter status by ID |
| `GET /letters/{id}?include-additional-info=true` | Letter with `additional_data` payload |
| `GET /letters/v2/{id}` | Letter with copies information |
| `GET /letters/{id}/extended-status` | Letter with full event history |
| `GET /health` | Service health check |

## Admin action endpoints

All admin endpoints are `PUT` requests under `/letters/{id}` and require `Authorization: Bearer <ACTIONS_API_KEY>` (secret: `actions-api-key` in the environment's Key Vault).

| Endpoint | Effect |
|----------|--------|
| `PUT /letters/{id}/mark-created` | Re-queues letter for upload (resets to `Created`) |
| `PUT /letters/{id}/mark-aborted` | Permanently skips letter (sets `Aborted`) |
| `PUT /letters/{id}/mark-posted-locally` | Marks as printed locally (e.g. Xerox returned it for local printing) |
| `PUT /letters/{id}/mark-not-sent` | Marks a stale letter as not sent (triggers re-investigation) |
| `PUT /letters/{id}/mark-posted?date=YYYY-MM-DD&time=HH:MM:SS` | Manually marks as posted with timestamp |

## Letter statuses reference

| Status | Meaning |
|--------|---------|
| `Created` | Letter received from calling service, awaiting upload |
| `Uploaded` | Successfully uploaded to Xerox SFTP |
| `Posted` | Confirmed printed and mailed (from Xerox report) |
| `Aborted` | Manually cancelled -- will not be uploaded or reprinted |
| `Skipped` | Service folder not found -- upload was skipped |
| `FailedToUpload` | Upload attempted but failed (non-IOException) |
| `PostedLocally` | Printed locally instead of by Xerox |
| `NotSent` | Stale letter marked as not sent for re-investigation |

## Stale letters

A letter is considered **stale** when it has been uploaded to Xerox's SFTP but no `Posted` confirmation has been received within 2 business days (`stale-letters.min-age-in-business-days: ${STALE_BUSINESS_DAYS:2}`).

The `StaleLettersTask` runs on a cron schedule (default: `0 30 11 * * *` -- 11:30 AM London time) and sends an email alert if stale letters are found. A separate `DelayAndStaleReport` also monitors this.

If a letter remains stale for 7+ days without a Xerox report (`min-age-in-days-for-no-report-abort: ${NO_REPORT_ABORT_DAYS:7}`), it may be auto-aborted by `CheckLettersPostedService`.

**To investigate stale letters:**
1. Check the `/stale-letters` endpoint or download the CSV at `/stale-letters/download`.
2. Report unprocessed letters to Xerox by raising a SNOW ticket assigned to `DTS IT ServiceDesk`. Include `KBA` in the "Minimum Data set" field. Reference: INC5444831.

## International letters

If a letter's `additionalData` JSON contains `"isInternational": true`, it is uploaded to `<serviceFolder>/International` rather than the base service folder (`UploadLettersTask.java:147-151`). This is verified in source code.

## Verify

After applying a fix, confirm the pipeline is flowing:

1. Check that letters are transitioning out of `Created`:
   ```sql
   SELECT status, COUNT(*)
   FROM letters
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY status;
   ```
2. Look for successful upload log entries: "Uploaded letter id: {uuid}, checksum: {hash}, file name: {name}, folder: {folder}".
3. Confirm the `shedlock` row for `UploadLetters` shows a recent `locked_at` timestamp, proving the task is running.
4. Check `/pending-letters` -- it should show zero or only very recently created letters.
5. For a specific letter, query its extended status: `GET /letters/{id}/extended-status` to see the full event timeline.

## Known incident patterns

Based on historical incidents documented by the team:

1. **Xerox security changes breaking SFTP auth** (P1): Xerox updated server-side security without notification. Letters accumulated in `Created` status but no data was lost. Resolution: Xerox rolled back; long-term fix was to agree notification process for maintenance.
2. **Database storage exhaustion** (P2): DB at >95% capacity caused insert failures for new letter requests. Resolution: PlatOps increased DB storage.
3. **Duplicate letters from client retries** (P1): When DB returned errors, the `send-letter-client` retry logic re-submitted letters, creating duplicates that Xerox printed. The duplicate detection logic did not catch all cases. Resolution: Reduced retries in client library; improved dedup logic (ongoing).

## Examples

### Batch-break error handling in UploadLettersTask

This is the critical behaviour that causes a single bad letter to block all subsequent uploads in the same scheduler cycle:

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/tasks/UploadLettersTask.java

private int processLetters() {
    return ftp.runWith(client -> {
        int uploadCount = 0;
        for (int i = 0; i < BATCH_SIZE; i++) {   // BATCH_SIZE = 10
            Optional<Letter> letterOpt =
                repo.findFirstLetterCreated(LocalDateTime.now().minusMinutes(dbPollDelay));
            if (letterOpt.isPresent()) {
                Letter letter = letterOpt.get();
                try {
                    boolean uploaded = processLetter(letter, client);
                    if (uploaded) uploadCount++;
                } catch (Exception ex) {
                    if (!(ex.getCause() instanceof IOException)) {
                        // non-IO error: mark letter FailedToUpload ...
                        letterEventService.failLetterUpload(letter, ex);
                    }
                    break;   // ... and stop the entire batch
                }
            } else {
                break;
            }
        }
        return uploadCount;
    });
}
```

An `IOException` (network/SFTP failure) propagates without marking the letter — the letter stays `Created` and will be retried on the next 30-second cycle. A non-IOException (e.g. encryption failure) marks it `FailedToUpload` and breaks the batch.

### Admin action endpoints

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/controllers/ActionController.java

@PutMapping(path = "/{id}/mark-aborted")
public ResponseEntity<Void> markAsAborted(
    @RequestHeader(value = AUTHORIZATION, required = false) String authHeader,
    @PathVariable UUID id
) {
    validateAuthorization(authHeader);   // checks "Bearer <actions.api-key>"
    letterActionService.markLetterAsAborted(id);
    return new ResponseEntity<>(HttpStatus.OK);
}

@PutMapping(path = "/{id}/mark-created")
public ResponseEntity<Void> markAsCreated(
    @RequestHeader(value = AUTHORIZATION, required = false) String authHeader,
    @PathVariable UUID id
) {
    validateAuthorization(authHeader);
    letterActionService.markLetterAsCreated(id);
    return new ResponseEntity<>(HttpStatus.OK);
}
```

All admin endpoints use the same `Authorization: Bearer <ACTIONS_API_KEY>` token from the Key Vault secret `actions-api-key`.

### Scheduling config (the master switch)

```yaml
# Source: apps/send-letter/send-letter-service/src/main/resources/application.yaml

scheduling:
  enabled: ${SCHEDULING_ENABLED:false}   # default is FALSE — must be true in deployed envs

tasks:
  upload-letters:
    interval-ms: ${UPLOAD_LETTERS_INTERVAL:30000}   # 30s fixed delay between runs
    db-poll-delay: ${DB_POLL_DELAY:2}               # skip letters newer than 2 minutes
```

## See also

- [Letter Lifecycle](../explanation/letter-lifecycle.md) — explains each status transition and the error states (`FailedToUpload`, `Skipped`, `NoReportAborted`)
- [Architecture](../explanation/architecture.md) — `UploadLettersTask` internals, ShedLock coordination, SFTP connection model, and FTP retry configuration
- [Configuration reference](../reference/configuration.md) — scheduling env vars, FTP downtime window settings, and ShedLock parameters
- [API reference](../reference/api.md) — admin and task endpoints used during incident response
