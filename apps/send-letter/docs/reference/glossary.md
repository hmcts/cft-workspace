---
title: Glossary
topic: reference
diataxis: reference
product: send-letter
audience: both
status: reviewed
last_reviewed: "2026-05-13T12:00:00Z"
---

# Glossary

Terms used across the Send Letter (Bulk Print) documentation.

---

## `additional_data`

A free-form `Map<String, Object>` included in every `POST /letters` request body. Must contain a non-empty `recipients` list (enforced by `@ValidRecipients`). Other behavioural keys: `isInternational` (routes to SFTP `/International` subfolder), `isIbca` (inserts `_IB` infix in filename for SSCS Infected Blood Compensation Authority letters). Stored alongside the letter row for auditing.

See: [API reference](api.md#request-field-semantics)

---

## Bulk Print

The common name for the Send Letter Service within HMCTS. Also referred to as NPP (National Print and Post). Xerox is the current print provider under the FITS contract.

See: [Overview](../explanation/overview.md)

---

## CDAM

Case Document Access Management. The gateway service that sits in front of the document management store. If a calling service fetches PDFs from CDAM to assemble letter content, it must also be whitelisted for CDAM access separately from the Bulk Print onboarding.

See: [Integrate from a service](../how-to/integrate-from-a-service.md)

---

## `ClearOldLetterContentTask`

A scheduled task (daily at 07:00 London, gated by `OLD_LETTER_CONTENT_CLEANUP_ENABLED`) that nulls the `file_content` column for letters in `Uploaded` status older than a configurable TTL (default 31 days). Intended primarily for AAT environments.

See: [Configuration reference](configuration.md#old-letter-content-cleanup-database)

---

## `Created`

The initial letter status set when `POST /letters` is called successfully. A letter remains `Created` until the `UploadLettersTask` picks it up for SFTP upload. Letters newer than the `db-poll-delay` (default 2 minutes) are not yet eligible for upload.

See: [Letter Lifecycle](../explanation/letter-lifecycle.md#phase-1-created)

---

## `db-poll-delay`

The minimum age (in minutes, default 2) a letter must reach before `UploadLettersTask` will process it. Configured via `DB_POLL_DELAY`. Prevents the scheduler from reading letters whose async DB write has not yet committed.

See: [Configuration reference](configuration.md#scheduling)

---

## `DeleteOldFilesTask`

A scheduled task (hourly at :15, gated by `FILE_CLEANUP_ENABLED`) that removes uploaded files from the Xerox SFTP server after a configurable TTL (default 12 hours).

See: [Configuration reference](configuration.md#file-cleanup-sftp)

---

## `DeleteOldLettersTask`

A scheduled task (Saturday 17:00 London) that permanently deletes letter rows from the database according to per-service retention intervals. Gated by LaunchDarkly flag `send-letter-service-delete-letters-cron`.

See: [Architecture](../explanation/architecture.md#data-retention-and-cleanup)

---

## `FailedToUpload`

A terminal letter status set when a non-`IOException` error occurs during SFTP upload (e.g. encryption failure, data corruption). The batch loop breaks immediately when this happens, preventing subsequent letters in the same run from being processed until the failed letter is resolved.

See: [Letter Lifecycle](../explanation/letter-lifecycle.md#error-handling-during-upload)

---

## `FtpAvailabilityChecker`

The component that suppresses uploads during a configurable provider maintenance window (`FTP_DOWNTIME_FROM`/`FTP_DOWNTIME_TO`, default 16:00-17:00 London time). Handles both same-day and overnight windows.

See: [Architecture](../explanation/architecture.md#sftp-integration)

---

## FTP downtime window

The time range during which `UploadLettersTask` skips processing. Defaults to 16:00-17:00 London time to align with the Xerox download window. Configurable via `FTP_DOWNTIME_FROM` and `FTP_DOWNTIME_TO`.

See: [Configuration reference](configuration.md#ftp-downtime-window)

---

## IBCA / `isIbca`

Infected Blood Compensation Authority. SSCS letters with `additionalData.isIbca = true` receive an `_IB` infix in the upload filename and are mapped to the `SSCS-IB` report code rather than `SSCS-REFORM`.

See: [API reference](api.md#request-field-semantics)

---

## LaunchDarkly

The feature-flag platform used by Send Letter Service. The active flag `send-letter-service-delete-letters-cron` gates execution of `DeleteOldLettersTask`. Configured via `LAUNCH_DARKLY_SDK_KEY`.

See: [Architecture](../explanation/architecture.md#feature-flags-launchdarkly)

---

## `letter_id`

The UUID returned by `POST /letters` in the `SendLetterResponse`. Used to track a letter through its lifecycle via `GET /letters/{id}`. Also embedded in the SFTP upload filename so Xerox's CSV report can be matched back to the originating letter.

See: [API reference](api.md#post-letters)

---

## `LetterStatus`

The Java enum defining all nine possible letter states: `Created`, `Uploaded`, `Posted`, `Aborted`, `Skipped`, `FailedToUpload`, `PostedLocally`, `NotSent`, `NoReportAborted`. Stored as a string in the `letters.status` column.

See: [Letter Lifecycle](../explanation/letter-lifecycle.md#state-machine)

---

## `MarkLettersPostedService`

The component that downloads CSV report files from the Xerox SFTP reports folder, parses them, and transitions matched letters from `Uploaded` to `Posted`. Triggered manually via `POST /tasks/process-reports` (no automatic schedule).

See: [Letter Lifecycle](../explanation/letter-lifecycle.md#phase-3-posted)

---

## `NoReportAborted`

A terminal letter status set by `CheckLettersPostedService` when a letter has been in `Uploaded` status for more than 7 days (`NO_REPORT_ABORT_DAYS`) with no matching entry in the `reports` table. Indicates probable Xerox-side failure.

See: [Letter Lifecycle](../explanation/letter-lifecycle.md#noreportaborted-automatic)

---

## PGP encryption

Optional AES-256 PGP encryption (BouncyCastle) applied to the zip bundle before SFTP upload. Enabled by `ENCRYPTION_ENABLED=true`. The public key (`ENCRYPTION_PUBLIC_KEY`) must be Xerox's ASCII-armored PGP public key. Encrypted files use `.pgp` extension; unencrypted use `.zip`.

See: [Architecture](../explanation/architecture.md#pgp-encryption)

---

## `Posted`

The terminal happy-path letter status set by `MarkLettersPostedService` when the Xerox CSV report confirms physical printing. Upon reaching `Posted`, the `file_content` column is nulled to reclaim database storage.

See: [Letter Lifecycle](../explanation/letter-lifecycle.md#phase-3-posted)

---

## `ReportsServiceConfig`

The Spring configuration binding (`@ConfigurationProperties`) that maps each S2S service name to a report code used when parsing Xerox CSV filenames. Special handling for SSCS: `isIbca=true` maps to `SSCS-IB`, others to `SSCS-REFORM`.

See: [Configuration reference](configuration.md#reports-service-config)

---

## S2S / `ServiceAuthorization`

Service-to-Service authentication used by all callers of `POST /letters`. The `ServiceAuthorization` header carries an S2S JWT obtained from `service-auth-provider-app`. The service name decoded from the token is used to look up the SFTP folder mapping.

See: [API reference](api.md#authentication)

---

## `send-letter-client`

The Java library (`com.github.hmcts:send-letter-client`) that wraps the `POST /letters` HTTP call, handles S2S token injection, and optionally polls for letter creation confirmation. The recommended integration path for Java services. Sends requests in async mode by default.

See: [Integrate from a service](../how-to/integrate-from-a-service.md#6-add-the-send-letter-client-dependency)

---

## `send-letter-mock`

A lightweight Spring Boot application (`apps/send-letter/send-letter-mock`, port 8877) that calls the real `send-letter-service` via `send-letter-client`. Used to manually fire test letters at any environment via `GET /test`.

See: [Integrate from a service](../how-to/integrate-from-a-service.md#examples)

---

## `ServiceFolderMapping`

The runtime component that looks up the SFTP folder for a calling service's S2S name. Backed by the `ftp.service-folders` configuration list. If `getFolderFor(serviceName)` returns `Optional.empty()`, the letter is rejected (HTTP 403) at submission time or marked `Skipped` if it somehow reaches the upload phase.

See: [Configuration reference](configuration.md#ftp-service-folders)

---

## SFTP

Secure File Transfer Protocol. The send-letter-service uploads letter bundles to Xerox over SFTP using the SSHJ library with public-key authentication. Xerox requires a whitelisted egress IP. The SFTP reports folder is polled for provider CSV files confirming physical posting.

See: [Architecture](../explanation/architecture.md#sftp-integration)

---

## ShedLock

A distributed locking library (JDBC-backed via the `shedlock` database table) that ensures only one pod runs each scheduled task at a time. Key lock name: `UploadLetters` (max hold: 10 minutes). A stale lock from a crashed pod can block uploads until cleared manually.

See: [Architecture](../explanation/architecture.md#shedlock)

---

## `Skipped`

A letter status set when `UploadLettersTask` cannot find an SFTP folder mapping for the calling service. The letter is not uploaded and remains permanently in this state (it does not retry).

See: [Letter Lifecycle](../explanation/letter-lifecycle.md#upload-flow)

---

## `type` (letter type)

A Xerox-agreed document type identifier (e.g. `CMC001`, `SSCS001`) sent in the `POST /letters` request body. Xerox uses it to select the envelope format, postage class, stationery, and inserts. The send-letter-service passes the value through unchanged to the upload filename. New type values require coordination with Xerox and approximately 6 weeks lead time.

See: [API reference](api.md#type-xerox-document-type)

---

## `Uploaded`

The letter status set by `UploadLettersTask` upon successful SFTP transfer. Sets the `sentToPrintAt` timestamp. A letter may remain in `Uploaded` for up to 7 days before being auto-aborted as `NoReportAborted` if no matching Xerox report arrives.

See: [Letter Lifecycle](../explanation/letter-lifecycle.md#phase-2-uploaded)

---

## `UploadLettersTask`

The primary Spring `@Scheduled` task (fixed delay 30 seconds) that polls for `Created` letters and uploads them in batches of up to 10 to the Xerox SFTP server. Disabled by default (`SCHEDULING_ENABLED=false`). Protected by ShedLock.

See: [Architecture](../explanation/architecture.md#scheduling-uploadletterstask)

---

## Xerox

The external print provider (under the MOJ FITS contract) that receives letter bundles over SFTP, physically prints them on A4, and posts them via Royal Mail. SLA: 48 hours from file receipt to posting. Raises ServiceNow tickets for support (assignment group: `Offsite_Bulk_Printing_Xerox`).

See: [Architecture](../explanation/architecture.md#print-provider-xerox)
