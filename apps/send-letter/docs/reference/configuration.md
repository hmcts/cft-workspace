---
title: Configuration
topic: architecture
diataxis: reference
product: send-letter
audience: both
sources:
  - send-letter-service:src/main/resources/application.yaml
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/config/FtpConfigProperties.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/ftp/FtpAvailabilityChecker.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/config/SchedulerConfiguration.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/reports/EmailSender.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/reports/DailyLetterUploadSummaryReport.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/config/RetryConfig.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/config/ReportsServiceConfig.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/DeleteOldLettersTask.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/DeleteOldFilesTask.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/ClearOldLetterContentTask.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/DocumentService.java
status: reviewed
last_reviewed: "2026-05-13T12:00:00Z"
examples_extracted_from:
  - apps/send-letter/send-letter-service/src/main/resources/application.yaml
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/config/SchedulerConfiguration.java
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/config/RetryConfig.java
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/services/ftp/FtpAvailabilityChecker.java
confluence:
  - id: "531137194"
    title: "Send-Letter ( Bulk Print) On-boarding"
    last_modified: "unknown"
    space: "RBPS"
  - id: "1440498830"
    title: "Bulk print - Knowledge bank"
    last_modified: "unknown"
    space: "DATS"
  - id: "1791333554"
    title: "Bulk Print - HLD and LLD v1.2"
    last_modified: "unknown"
    space: "RBPS"
  - id: "1875865980"
    title: "Integrating to Bulk Print"
    last_modified: "unknown"
    space: "RRFM"
  - id: "1440487628"
    title: "Bulk Print Onboarding and Changes to live service"
    last_modified: "unknown"
    space: "RBS"
  - id: "1440495919"
    title: "DTS - Bulk Print"
    last_modified: "unknown"
    space: "DATS"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- All configuration lives in `src/main/resources/application.yaml` with environment variable overrides; secrets are mounted from `rpe-send-letter/` via Spring config tree.
- `ftp.service-folders` maps each onboarded S2S service name to an SFTP subfolder; disabled entries cause letters to be `Skipped`.
- `reports.service-config` maps services to report codes used when parsing provider CSV files.
- Scheduling is **disabled by default** (`SCHEDULING_ENABLED=false`); must be explicitly enabled in deployed environments.
- An FTP downtime window (default 16:00-17:00 London) suppresses uploads during provider maintenance.
- Cleanup configuration controls three tiers: SFTP file deletion (`file-cleanup`), DB content clearing (`old-letter-content-cleanup`), and per-service letter record deletion (`delete-old-letters`).

## FTP service folders

Bound to `FtpConfigProperties` via `@ConfigurationProperties(prefix = "ftp")` (`FtpConfigProperties.java:13`). Each entry maps an S2S service name to an SFTP target folder on the print provider's server.

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `ftp.service-folders[n].service` | String | — | S2S service name (e.g. `sscs`, `probate_backend`) |
| `ftp.service-folders[n].folder` | String | — | SFTP subfolder name (e.g. `SSCS`, `PROBATE`) |
| `ftp.service-folders[n].enabled` | Boolean | `true` | Set `false` to skip uploads for this service (letter status becomes `Skipped`) |
| `ftp.target-folder` / `FTP_TARGET_FOLDER` | String | — | Root SFTP directory under which service subfolders live |
| `ftp.smoke-test-target-folder` / `FTP_SMOKE_TEST_TARGET_FOLDER` | String | — | Separate SFTP path for smoke-test letters (type `smoke_test`) |
| `ftp.reports-folder` / `FTP_REPORTS_FOLDER` | String | — | Path on SFTP where provider deposits CSV report files |
| `ftp.hostname` / `FTP_HOSTNAME` | String | — | SFTP server hostname |
| `ftp.port` / `FTP_PORT` | int | `22` | SFTP server port |
| `ftp.fingerprint` / `FTP_FINGERPRINT` | String | — | Expected SSH host key fingerprint for verification |
| `ftp.username` / `FTP_USER` | String | — | SFTP username |
| `ftp.publicKey` / `FTP_PUBLIC_KEY` | String | — | SSH public key (PEM) |
| `ftp.privateKey` / `FTP_PRIVATE_KEY` | String | — | SSH private key (PEM); newlines normalised at load time (`FtpConfigProperties.java:118-127`) |

### Currently onboarded services

| S2S service name | SFTP folder | Enabled by default |
|---|---|---|
| `cmc_claim_store` | `CMC` | yes |
| `civil_service` | `CMC` | no (`CIVIL_SERVICE_ENABLED`, default `false`) |
| `civil_general_applications` | `CMC` | yes |
| `send_letter_tests` | `BULKPRINT` | yes |
| `divorce_frontend` | `DIVORCE` | yes |
| `nfdiv_case_api` | `NFDIVORCE` | yes |
| `probate_backend` | `PROBATE` | yes |
| `sscs` | `SSCS` | yes |
| `finrem_document_generator` | `FINREM` | yes |
| `finrem_case_orchestration` | `FINREM` | yes |
| `fpl_case_service` | `FPL` | yes |
| `prl_cos_api` | `PRIVLAW` | yes |
| `pcs_api` | `PCS` | yes |

When `ServiceFolderMapping.getFolderFor(serviceName)` returns `Optional.empty()`, the letter is marked `Skipped` (`ServiceFolderMapping.java:41-43`).

## Reports service config

Bound to `ReportsServiceConfig` via `@ConfigurationProperties`. Used by `MarkLettersPostedService` to correlate provider CSV filenames with services.

| Key | Type | Default | Description |
|---|---|---|---|
| `reports.service-config[n].service` | String | — | S2S service name |
| `reports.service-config[n].displayName` | String | — | Human-readable name for report output |
| `reports.service-config[n].reportCode` | String | — | Code extracted from provider CSV filenames (`MOJ_<CODE>_...`) |

### Report code mappings

| S2S service name | Report code | Display name | Notes |
|---|---|---|---|
| `cmc_claim_store` | `CMC` | CMC | |
| `civil_service` | `CMC` | OCMC | |
| `civil_general_applications` | `CMC` | general_applications | |
| `send_letter_tests` | `BULKPRINT` | Bulk Print | |
| `divorce_frontend` | `DIV` | Divorce | |
| `nfdiv_case_api` | `NFDIV` | Divorce | |
| `probate_backend` | `Probate` | Probate | Mixed-case code |
| `sscs` | `SSCS` | SSCS | Splits to `SSCS-IB` / `SSCS-REFORM` based on `additionalData.isIbca` (`ReportsServiceConfig.java:140-147`) |
| `finrem_document_generator` | `FRM` | FINREM | |
| `finrem_case_orchestration` | `FRM` | FINREM | |
| `fpl_case_service` | `FPL` | FPLA | |
| `prl_cos_api` | `PRIVLAW` | PRIVATELAW | |
| `pcs_api` | `PCS` | PCS | |

## Scheduling

Controlled by `SchedulerConfiguration` (`SchedulerConfiguration.java:20-21`). The entire scheduler subsystem is gated by a single property.

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `scheduling.enabled` / `SCHEDULING_ENABLED` | Boolean | `false` | Master switch for all `@Scheduled` tasks and ShedLock. Must be `true` in deployed environments. |
| `scheduling.lock_at_most_for` | Duration (ISO-8601) | `PT10M` | Default ShedLock hold duration. Individual tasks may override. |
| `tasks.upload-letters.interval-ms` / `UPLOAD_LETTERS_INTERVAL` | long | `30000` | Fixed delay between `UploadLettersTask` runs (ms) |
| `tasks.upload-letters.db-poll-delay` / `DB_POLL_DELAY` | int (minutes) | `2` | Only letters created more than N minutes ago are eligible for upload (`UploadLettersTask.java:103` uses `minusMinutes(dbPollDelay)`) |
| `tasks.stale-letters-report.cron` / `STALE_LETTERS_REPORT_CRON` | Cron | `0 30 11 * * *` | Schedule for stale letters report (11:30am London) |
| `tasks.pending-letters-report.cron` / `PENDING_LETTERS_REPORT_CRON` | Cron | `0 0 9 * * *` | Schedule for pending letters alert (9am London) |
| `tasks.pending-letters-report.before-mins` / `PENDING_LETTERS_BEFORE` | int | `15` | Letters still in `Created` status after N minutes trigger an alert |

### Scheduled tasks summary

| Task | Lock name | Schedule | Lock duration | Gating |
|---|---|---|---|---|
| `UploadLettersTask` | `UploadLetters` | Fixed delay 30s | default (`PT10M`) | `scheduling.enabled` |
| `StaleLettersTask` | `Stale` | Fixed delay | `lockAtLeastFor=PT15S`, `lockAtMostFor=PT30S` | `scheduling.enabled` |
| `DailyLetterUploadSummaryReport` | `daily-letter-upload-summary` | Cron `0 0 19 * * *` (7pm) | `lockAtLeastFor=PT5S` | `scheduling.enabled` + `reports.upload-summary.enabled` |
| `DailyFtpLetterUploadSummaryReport` | — | Cron `45 59 15 * * *` (3:59pm) | — | `scheduling.enabled` + `reports.ftp-uploaded-letters-summary.enabled` |
| `DelayAndStaleReport` | — | Cron `0 0 13 * * *` (1pm) | — | `scheduling.enabled` + `reports.delayed-stale-report.enabled` |
| `PendingLettersTask` | `PendingLetters` | Cron `0 0 9 * * *` (9am) | default | `scheduling.enabled` |
| `DeleteOldFilesTask` | `DeleteOldFiles` | Cron `0 15 * * * *` (hourly :15) | default | `file-cleanup.enabled` |
| `ClearOldLetterContentTask` | `ClearOldLetterContent` | Cron `0 0 7 * * *` (7am) | default | `old-letter-content-cleanup.enabled` |
| `DeleteOldLettersTask` | `DeleteOldLetters` | Cron `0 0 17 * * 6` (Sat 5pm) | `lockAtMostFor=2h` | LaunchDarkly flag only |

`DeleteOldLettersTask`, `DeleteOldFilesTask`, and `ClearOldLetterContentTask` are **not** guarded by `@ConditionalOnProperty(scheduling.enabled)`. They have their own independent enable flags. `DeleteOldLettersTask` additionally requires the LaunchDarkly flag `send-letter-service-delete-letters-cron` to be enabled at runtime.

## FTP downtime window

`FtpAvailabilityChecker` suppresses uploads when the current London time falls within the configured window (`FtpAvailabilityChecker.java:30-36`).

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `ftp.downtime.from` / `FTP_DOWNTIME_FROM` | `HH:mm` | `16:00` | Start of provider maintenance window (London time) |
| `ftp.downtime.to` / `FTP_DOWNTIME_TO` | `HH:mm` | `17:00` | End of provider maintenance window (London time) |

The checker handles both same-day windows (`from < to`) and overnight windows (`from > to`).

## SMTP / email reporting

Email is sent via Spring Mail (`JavaMailSender`). The `EmailSender` bean is only created when `spring.mail.host` is set (`EmailSender.java:18`).

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `spring.mail.host` / `SMTP_HOST` | String | — | SMTP server hostname. If absent, `EmailSender` bean is not created and all reports are disabled. |
| `spring.mail.port` | int | `587` | SMTP port |
| `spring.mail.username` / `SMTP_USERNAME` | String | — | SMTP auth username |
| `spring.mail.password` / `SMTP_PASSWORD` | String | — | SMTP auth password |
| `spring.mail.properties.mail.smtp.starttls.enable` | Boolean | `true` | Enable STARTTLS |
| `spring.mail.test-connection` | Boolean | `true` | Test SMTP at startup; **app fails to start** if connection fails |
| `reports.upload-summary.enabled` / `UPLOAD_SUMMARY_REPORT_ENABLED` | Boolean | `false` | Enables `DailyLetterUploadSummaryReport` (also requires `EmailSender` bean) |
| `reports.upload-summary.cron` / `UPLOAD_SUMMARY_REPORT_CRON` | Cron | `0 0 19 * * *` | Schedule for daily upload summary |
| `reports.upload-summary.recipients` / `UPLOAD_SUMMARY_REPORT_RECIPIENTS` | String[] | — | Comma-separated email recipients |
| `reports.ftp-uploaded-letters-summary.enabled` / `FTP_UPLOADED_LETTERS_SUMMARY_REPORT_ENABLED` | Boolean | `false` | Enables `DailyFtpLetterUploadSummaryReport` |
| `reports.ftp-uploaded-letters-summary.cron` / `FTP_UPLOADED_LETTERS_SUMMARY_REPORT_CRON` | Cron | `45 59 15 * * *` | Schedule (3:59:45pm London) |
| `reports.delayed-stale-report.enabled` / `DELAYED_STALE_REPORT_ENABLED` | Boolean | `false` | Enables `DelayAndStaleReport` |
| `reports.delayed-stale-report.cron` / `DELAYED_STALE_REPORT_CRON` | Cron | `0 0 13 * * *` | Schedule (1pm London) |
| `reports.delayed-stale-report.recipients` / `DELAYED_STALE_REPORT_RECIPIENTS` | String[] | — | Comma-separated email recipients |

## Encryption

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `encryption.enabled` / `ENCRYPTION_ENABLED` | Boolean | `false` | Enable PGP encryption of zip files before SFTP upload |
| `encryption.publicKey` / `ENCRYPTION_PUBLIC_KEY` | String | — | PGP public key (ASCII-armored format) |

When enabled, uploaded files have `.pgp` extension; when disabled, `.zip` (`FileNameHelper.java:114-116`).

## Retry

Configured in `RetryConfig` (`RetryConfig.java:22-31`). Applied to FTP upload operations via Spring `RetryTemplate`. Retries only on `FtpException`, using exponential backoff with the default multiplier.

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `file-upoad.retries` / `DEFAULT_RETRIES` | int | `5` | Maximum retry attempts on `FtpException` |
| `file-upoad.wait-time-in-ms` / `DEFAULT_WAIT_TIME_IN_MS` | long | `2000` | Initial backoff delay (ms); exponential multiplier applied thereafter |

<!-- DIVERGENCE: Draft originally listed these as ftp.retry.max-attempts / ftp.retry.backoff-delay-ms, but RetryConfig.java:23-24 and application.yaml:206 show the actual keys are file-upoad.retries / file-upoad.wait-time-in-ms (note the typo "upoad" is real in source). Source wins. -->

## Stale letters

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `stale-letters.min-age-in-business-days` / `STALE_BUSINESS_DAYS` | int | `2` | Business days an `Uploaded` letter can wait before being flagged as stale (`StaleLetterService.java:75`) |
| `stale-letters.min-age-in-days-for-no-report-abort` / `NO_REPORT_ABORT_DAYS` | int | `7` | Days an `Uploaded` letter waits without a report before being marked `NoReportAborted` |

## File cleanup (SFTP)

Deletes uploaded files from the provider SFTP server after a configured TTL. Gated by `file-cleanup.enabled` (prod only). The task respects the FTP downtime window (`DeleteOldFilesTask.java:67`).

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `file-cleanup.enabled` / `FILE_CLEANUP_ENABLED` | Boolean | `false` | Enable SFTP file deletion. Should be `true` in production only. |
| `file-cleanup.cron` / `FILE_CLEANUP_CRON` | Cron | `0 15 * * * *` | Schedule (default: 15 minutes past every hour, London time) |
| `file-cleanup.ttl` | Duration | `12h` | Files older than this are deleted from SFTP |

## Old letter content cleanup (database)

Clears the `fileContent` column of old letters in the database to reduce storage. Gated by `old-letter-content-cleanup.enabled`. Originally intended for AAT only but the flag is available in all environments.

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `old-letter-content-cleanup.enabled` / `OLD_LETTER_CONTENT_CLEANUP_ENABLED` | Boolean | `false` | Enable DB content cleanup |
| `old-letter-content-cleanup.cron` / `OLD_LETTER_CONTENT_CLEANUP_CRON` | Cron | `0 0 7 * * *` | Schedule (default: 7am London) |
| `old-letter-content-cleanup.ttl` | Duration (ISO-8601) | `P31D` | Letters with `Uploaded` status older than this have their content cleared |

## Delete old letters (per-service retention)

Permanently deletes letter records from the database based on per-service retention intervals. Runs via a PostgreSQL function (`batch_delete_letters`) invoked in batches. Gated by LaunchDarkly flag `send-letter-service-delete-letters-cron`. Has a 2-hour execution time cap to avoid running overnight.

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `delete-old-letters.cron` / `DELETE_OLD_LETTERS_CRON` | Cron | `0 0 17 * * 6` | Schedule (default: Saturday 5pm London) |
| `delete-old-letters.batch-size` / `BATCH_SIZE` | int | `1000` | Records deleted per batch iteration |

### Per-service retention intervals

| Service | Config key | Env var | Default |
|---|---|---|---|
| `civil_general_applications` | `delete-old-letters.civil-general-applications-interval` | `CIVIL_GENERAL_APPLICATIONS_INTERVAL` | `6 years` |
| `civil_service` | `delete-old-letters.civil-service-interval` | `CIVIL_SERVICE_INTERVAL` | `6 years` |
| `cmc_claim_store` | `delete-old-letters.cmc-claim-store-interval` | `CMC_CLAIM_STORE_INTERVAL` | `2 years` |
| `divorce_frontend` | `delete-old-letters.divorce-frontend-interval` | `DIVORCE_FRONTEND_INTERVAL` | `3 months` |
| `finrem_case_orchestration` | `delete-old-letters.finrem-case-orchestration-interval` | `FINREM_CASE_ORCHESTRATION_INTERVAL` | `3 months` |
| `finrem_document_generator` | `delete-old-letters.finrem-document-generator-interval` | `FINREM_DOCUMENT_GENERATOR_INTERVAL` | `3 months` |
| `fpl_case_service` | `delete-old-letters.fpl-case-service-interval` | `FPL_CASE_SERVICE_INTERVAL` | `2 years` |
| `nfdiv_case_api` | `delete-old-letters.nfdiv-case-api-interval` | `NFDIV_CASE_API_INTERVAL` | `3 months` |
| `prl_cos_api` | `delete-old-letters.prl-cos-api-interval` | `PRL_COS_API_INTERVAL` | `18 years` |
| `probate_backend` | `delete-old-letters.probate-backend-interval` | `PROBATE_BACKEND_INTERVAL` | `1 year` |
| `send_letter_tests` | `delete-old-letters.send-letter-tests-interval` | `SEND_LETTER_TESTS_INTERVAL` | `2 years` |
| `sscs` | `delete-old-letters.sscs-interval` | `SSCS_INTERVAL` | `3 months` |
| `pcs_api` | `delete-old-letters.pcs-interval` | `PCS_INTERVAL` | `6 months` |

These intervals are passed as PostgreSQL `INTERVAL` casts. The business agreed each interval during onboarding.
<!-- CONFLUENCE-ONLY: Confluence (Integrating to Bulk Print page) states "Agree with Business on when old letters needs to be deleted" as part of onboarding - not verified as a formal process in source -->

## Duplicate detection

The service can optionally check for duplicate letter submissions within a configurable time window. Callers opt in via the `?check-duplicate=true` query parameter on the `/letters` endpoint.

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `documents.duplicate.cut-off-time` / `DUPLICATES_CUT_OFF_TIME` | int (hours) | `1` | Time window in hours within which a letter with identical content hash is considered a duplicate |

## Rate limiting

The `/feature-flags` endpoint (used by `FeatureFlagController`) is protected by a Resilience4j rate limiter to prevent abuse.

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `resilience4j.ratelimiter.instances.default.limitForPeriod` | int | `15` | Maximum requests permitted per refresh period |
| `resilience4j.ratelimiter.instances.default.limitRefreshPeriod` | Duration | `1s` | Period after which the rate limit resets |
| `resilience4j.ratelimiter.instances.default.timeoutDuration` | Duration | `0` | Wait time for permission (0 = reject immediately) |

## Database

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `spring.datasource.url` | String | `jdbc:postgresql://${LETTER_TRACKING_DB_HOST:send-letter-database}:${LETTER_TRACKING_DB_PORT:5440}/${LETTER_TRACKING_DB_NAME:letter_tracking}` | JDBC URL for PostgreSQL letter-tracking DB |
| `LETTER_TRACKING_DB_HOST` | String | `send-letter-database` | DB hostname |
| `LETTER_TRACKING_DB_PORT` | int | `5440` | DB port |
| `LETTER_TRACKING_DB_NAME` | String | `letter_tracking` | Database name |
| `LETTER_TRACKING_DB_USER_NAME` | String | `letterservice` | DB username |
| `LETTER_TRACKING_DB_PASSWORD` | String | — | DB password |
| `spring.datasource.hikari.maximumPoolSize` | int | `30` | Maximum HikariCP connections |
| `spring.datasource.hikari.maxLifetime` | long (ms) | `7200000` | Maximum connection lifetime (2 hours) |

## Async thread pool

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `async.threadpool-size` / `ASYNC_THREADPOOL_SIZE` | int | `20` | Thread pool size for async operations |

## Administrative API key

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `actions.api-key` / `ACTIONS_API_KEY` | String | — | Static Bearer token protecting `/letters/{id}/mark-*` and `/tasks/*` endpoints |

## LaunchDarkly

| Key / env var | Type | Default | Description |
|---|---|---|---|
| `launchdarkly.sdk-key` / `LAUNCH_DARKLY_SDK_KEY` | String | — | LaunchDarkly SDK key for feature flag evaluation |

Active flag: `send-letter-service-delete-letters-cron` — gates `DeleteOldLettersTask` execution (`Flags.java:9`).

## Xerox print processing times

The print provider (Xerox) processes letters on weekdays at service-specific times. These are **not configured in `send-letter-service`** but are agreed operationally during onboarding:

| SFTP folder | Processing time (weekday) |
|---|---|
| CMC | 17:30 |
| FINREM | 16:30 |
| PRIVLAW | 18:00 |
| DIVORCE | 17:30 |
| NFDIVORCE | 17:05 |
| SSCS | 18:00 |
| SSCSIB | 17:55 |
| PROBATE | 19:00 |
| FPL | 18:15 |

<!-- CONFLUENCE-ONLY: not verified in source -->

This explains why the FTP downtime window (16:00-17:00) must end before the earliest Xerox processing time (16:30 for FINREM).

## Onboarding a new service

Configuration changes required to onboard a new service (from Confluence and confirmed in source):

1. **S2S registration** — the calling service must be registered in `service-auth-provider-app`.
2. **Xerox folder creation** — Xerox creates a folder on the SFTP server in both UAT and production (~6 week lead time from initial contact).
3. **`ftp.service-folders` entry** — add the service name, folder mapping, and optionally an `enabled` flag.
4. **`reports.service-config` entry** — add the service name, display name, and report code (document type agreed with Xerox, e.g. `CMC001`, `SSCS001`).
5. **`delete-old-letters` interval** — agree a retention period with the business and add a per-service interval property.
6. **Letter type** — the `type` field in the POST request body is opaque to `send-letter-service`; it is passed through to Xerox who uses it to select envelope format, postage class, and processing rules.

There is **no explicit S2S whitelisting** within `send-letter-service` itself. The `ftp.service-folders` configuration implicitly controls which services can successfully send letters: if a service is authenticated via S2S but has no folder mapping, its letters are marked `Skipped`.
<!-- CONFLUENCE-ONLY: "6 week lead time for Xerox" and "no specific S2S whitelisting" claims from Confluence onboarding pages - not verified in source -->

## Examples

### FTP service folders and scheduling (application.yaml)

```yaml
# Source: apps/send-letter/send-letter-service/src/main/resources/application.yaml

ftp:
  hostname: ${FTP_HOSTNAME}
  port: ${FTP_PORT}
  target-folder: ${FTP_TARGET_FOLDER}
  smoke-test-target-folder: ${FTP_SMOKE_TEST_TARGET_FOLDER:SMOKE_TEST}
  reports-folder: ${FTP_REPORTS_FOLDER}
  fingerprint: ${FTP_FINGERPRINT}
  username: ${FTP_USER}
  privateKey: ${FTP_PRIVATE_KEY}
  publicKey: ${FTP_PUBLIC_KEY}
  downtime:
    from: ${FTP_DOWNTIME_FROM:16:00}
    to: ${FTP_DOWNTIME_TO:17:00}
  service-folders:
    - service: cmc_claim_store
      folder: CMC
    - service: civil_service
      folder: CMC
      enabled: ${CIVIL_SERVICE_ENABLED:false}
    - service: send_letter_tests
      folder: BULKPRINT
    - service: nfdiv_case_api
      folder: NFDIVORCE
    - service: sscs
      folder: SSCS
    - service: pcs_api
      folder: PCS
    # ... remaining service entries follow the same pattern

scheduling:
  enabled: ${SCHEDULING_ENABLED:false}
  lock_at_most_for: ${SCHEDULING_LOCK_AT_MOST_FOR:PT10M}

tasks:
  upload-letters:
    interval-ms: ${UPLOAD_LETTERS_INTERVAL:30000}
    db-poll-delay: ${DB_POLL_DELAY:2}      # minutes; letters newer than this are skipped

encryption:
  enabled: ${ENCRYPTION_ENABLED:false}
  publicKey: ${ENCRYPTION_PUBLIC_KEY:}

file-cleanup:
  enabled: ${FILE_CLEANUP_ENABLED:false}
  cron: ${FILE_CLEANUP_CRON:0 15 * * * *}
  ttl: 12h

old-letter-content-cleanup:
  enabled: ${OLD_LETTER_CONTENT_CLEANUP_ENABLED:false}
  cron: ${OLD_LETTER_CONTENT_CLEANUP_CRON:0 0 7 * * *}
  ttl: P31D

file-upoad:               # note: typo "upoad" is in the real source
  retries: ${DEFAULT_RETRIES:5}
  wait-time-in-ms: ${DEFAULT_WAIT_TIME_IN_MS:2000}

actions:
  api-key: ${ACTIONS_API_KEY}
```

### ShedLock scheduler configuration

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/config/SchedulerConfiguration.java

@Configuration
@AutoConfigureAfter(FlywayConfiguration.class)
@DependsOn({"flyway", "flywayInitializer"})
@ConditionalOnProperty(value = "scheduling.enabled", matchIfMissing = true)
@EnableSchedulerLock(defaultLockAtMostFor = "${scheduling.lock_at_most_for}")
public class SchedulerConfiguration {

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(dataSource);
    }
}
```

### FTP retry configuration

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/config/RetryConfig.java

@Bean
public RetryTemplate retryTemplate(
    @Value("${file-upoad.retries}") int numberOfRetries,       // default 5
    @Value("${file-upoad.wait-time-in-ms}") long timeToWait   // default 2000ms
) {
    return RetryTemplate.builder()
        .retryOn(FtpException.class)
        .maxAttempts(numberOfRetries)
        .exponentialBackoff(timeToWait, ExponentialBackOffPolicy.DEFAULT_MULTIPLIER,
            ExponentialBackOffPolicy.DEFAULT_MAX_INTERVAL)
        .build();
}
```

### FTP downtime window check

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/services/ftp/FtpAvailabilityChecker.java

public boolean isFtpAvailable(LocalTime time) {
    if (downtimeStart.isBefore(downtimeEnd)) {
        // same-day window e.g. 16:00 – 17:00
        return time.isBefore(downtimeStart) || time.isAfter(downtimeEnd);
    } else {
        // overnight window e.g. 23:00 – 06:00
        return time.isBefore(downtimeStart) && time.isAfter(downtimeEnd);
    }
}
```

## See also

- [Architecture](../explanation/architecture.md) — explains how `UploadLettersTask`, ShedLock, SFTP, PGP encryption, and email reporting fit together at runtime
- [Letter Lifecycle](../explanation/letter-lifecycle.md) — how the scheduling and FTP downtime window settings affect letter state transitions
- [Integrate from a service](../how-to/integrate-from-a-service.md) — the `ftp.service-folders` and `reports.service-config` entries you need to add when onboarding
- [Troubleshoot upload failures](../how-to/troubleshoot-upload-failures.md) — which config values to check when letters are stuck
