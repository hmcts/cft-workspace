---
title: Architecture
topic: architecture
diataxis: explanation
product: send-letter
audience: both
sources:
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/UploadLettersTask.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/MarkLettersPostedService.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/config/SchedulerConfiguration.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/ftp/FtpClient.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/encryption/PgpEncryptionUtil.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/LetterService.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/reports/EmailSender.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/ftp/FtpAvailabilityChecker.java
  - send-letter-service:src/main/resources/application.yaml
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/util/FileNameHelper.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/DeleteOldLettersTask.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/DeleteOldFilesTask.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/ClearOldLetterContentTask.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/launchdarkly/Flags.java
status: reviewed
last_reviewed: "2026-05-13T12:00:00Z"
examples_extracted_from:
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/config/SchedulerConfiguration.java
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/tasks/UploadLettersTask.java
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/services/ftp/FtpAvailabilityChecker.java
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/services/util/FileNameHelper.java
  - apps/send-letter/send-letter-service/src/main/resources/application.yaml
confluence:
  - id: "1791333554"
    title: "Bulk Print - HLD and LLD v1.2"
    last_modified: "2025-05-12"
    space: "RBPS"
  - id: "1440495919"
    title: "DTS - Bulk Print"
    last_modified: "2022-06-23"
    space: "DATS"
  - id: "531137194"
    title: "Send-Letter ( Bulk Print) On-boarding"
    last_modified: "2020-03-13"
    space: "RBPS"
  - id: "1440498830"
    title: "Bulk print - Knowledge bank"
    last_modified: "2021-03-19"
    space: "DATS"
  - id: "1875865980"
    title: "Integrating to Bulk Print"
    last_modified: "2024-01-01"
    space: "RRFM"
  - id: "1891014156"
    title: "Implementing Send-letter-service aka bulk print"
    last_modified: "2024-01-01"
    space: "RRFM"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Single Spring Boot service (port 8485) that accepts PDF documents via REST, persists them to PostgreSQL, and asynchronously uploads zip/PGP bundles to an external print provider (Xerox) over SFTP.
- Two key scheduled pipelines: `UploadLettersTask` (polls DB, uploads to SFTP every 30s) and `MarkLettersPostedService` (parses provider CSV reports to confirm posting) -- coordinated across pods via ShedLock (JDBC-backed).
- Letters transition through `Created` -> `Uploaded` -> `Posted`; file content is nulled from the DB after posting to reclaim storage. Per-service data retention policies govern hard deletion (3 months to 18 years depending on service).
- PGP encryption (AES-256, BouncyCastle) is opt-in; zip bytes are encrypted before SFTP upload producing `.pgp` files. Xerox requires a whitelisted egress IP for SSH traffic.
- Onboarding a new service requires: S2S registration, Xerox folder creation (approx. 6-week lead time), and config updates to `ftp.service-folders` and `reports.service-config`.
- LaunchDarkly feature flags gate the `DeleteOldLettersTask`; scheduling is disabled by default (`SCHEDULING_ENABLED=false`).

## Runtime components

```mermaid
graph LR
    subgraph Calling Services
        A[CMC / Civil / SSCS / Probate / ...]
    end

    subgraph send-letter-service
        B[REST API<br/>POST /letters]
        C[(PostgreSQL<br/>letters table)]
        D[UploadLettersTask<br/>@Scheduled 30s]
        E[MarkLettersPostedService<br/>manual trigger]
        F[Email Reports<br/>@Scheduled cron]
    end

    subgraph External
        G[Xerox<br/>SFTP Server]
        H[SMTP Server]
    end

    A -->|S2S auth| B
    B -->|INSERT Created| C
    D -->|SELECT Created| C
    D -->|Upload .zip/.pgp| G
    D -->|UPDATE Uploaded| C
    E -->|Download CSVs| G
    E -->|UPDATE Posted| C
    F -->|Send CSV reports| H
```

## Letter lifecycle

Letters progress through a state machine tracked in the `letters.status` column (`LetterStatus.java:11-19`):

| Status | Set by | Meaning |
|--------|--------|---------|
| `Created` | `LetterService.save()` | Letter persisted, awaiting upload |
| `Uploaded` | `UploadLettersTask` | Successfully written to SFTP |
| `Posted` | `MarkLettersPostedService` | Provider CSV confirms physical posting |
| `FailedToUpload` | `LetterEventService` | Non-IO error during upload |
| `Skipped` | `UploadLettersTask` | No SFTP folder mapping for the service |
| `NoReportAborted` | `CheckLettersPostedService` | Uploaded > 7 days with no provider report |
| `Aborted` / `PostedLocally` / `NotSent` | `ActionController` | Manual admin intervention |

After reaching `Posted` or `Aborted`, `fileContent` is set to NULL to reclaim bytea storage (`LetterRepository.java:150-152`).

## Scheduling: UploadLettersTask

The primary upload loop runs as a Spring `@Scheduled` task with a fixed delay of 30 seconds (`application.yaml:176`).

**Key behaviour** (`UploadLettersTask.java:78-155`):

1. Checks FTP availability window via `FtpAvailabilityChecker` -- skips if within the configured downtime (default 16:00-17:00 London).
2. Queries for `Created` letters older than `db-poll-delay` (default 2 minutes) to avoid racing with async writes.
3. Opens a single SFTP session and processes up to `BATCH_SIZE = 10` letters per run.
4. For each letter, resolves the target SFTP folder from `ServiceFolderMapping`. If `additionalData.isInternational = true`, appends `/International` to the path.
5. On successful upload: status -> `Uploaded`, sets `sentToPrintAt`.
6. On a non-`IOException` error: marks the letter `FailedToUpload` and **breaks the batch** -- one bad letter blocks all subsequent letters until manual intervention (`UploadLettersTask.java:119-124`).

The task bean is gated by `@ConditionalOnProperty(value = "scheduling.enabled", matchIfMissing = true)`, but `application.yaml` defaults `scheduling.enabled` to `false` via `${SCHEDULING_ENABLED:false}` -- so scheduling only activates in environments where `SCHEDULING_ENABLED=true`.

## Scheduling: MarkLettersPostedService

Unlike `UploadLettersTask`, there is **no `@Scheduled` annotation** on `MarkLettersPostedService.processReports()`. It is triggered manually via `POST /tasks/process-reports` (protected by `actions.api-key`) and runs asynchronously in a single-thread executor (`TaskController.java:57-63`).

**Key behaviour** (`MarkLettersPostedService.java:86-259`):

1. Downloads all `.csv` files from the provider's SFTP reports folder.
2. Parses each CSV (Apache Commons CSV) extracting `InputFileName`, `StartDate`, `StartTime`.
3. Extracts the letter UUID from the PDF filename in each row.
4. Transitions matching letters from `Uploaded` -> `Posted`; nulls `fileContent`.
5. On successful parse: deletes the report from SFTP, records `ReportStatus.SUCCESS` in the `reports` table.
6. On parse failure: keeps the file, records `ReportStatus.FAIL`.

A complementary `CheckLettersPostedService` (triggered via `GET /tasks/check-posted`) marks letters `NoReportAborted` if they have been in `Uploaded` status for more than 7 days with no corresponding report record.

## ShedLock

Distributed lock coordination ensures only one pod executes each scheduled task at a time. The lock provider is `JdbcTemplateLockProvider` backed by the `shedlock` table (created in Flyway migration `V010__Add_shedlock.sql`).

Configuration (`SchedulerConfiguration.java:19-31`):

- Default `lockAtMostFor`: `PT10M` (10 minutes)
- `UploadLetters` lock: uses the default 10-minute max
- `StaleLettersTask`: `lockAtLeastFor = "PT15S"`, `lockAtMostFor = "PT30S"`
- `daily-letter-upload-summary` and other report tasks: `lockAtLeastFor = "PT5S"`

`SchedulerConfiguration` depends on `flyway`/`flywayInitializer` beans to guarantee migrations have run before ShedLock attempts to acquire locks. ShedLock version: 6.10.0 (`build.gradle:244-245`).

## SFTP integration

The service uses the SSHJ library (`com.hierynomus:sshj:0.40.0`) for SFTP operations.

**Connection model** (`FtpClient.java:218-263`):

- Each `runWith(...)` call creates a fresh `SSHClient`, connects, authenticates with SSH key pair (no passphrase), opens an `SFTPClient`, runs the action, then disconnects in `finally`.
- Host fingerprint verification is enforced.
- A `RetryTemplate` with exponential backoff (default 5 retries, 2000ms initial wait) wraps operations that throw `FtpException` (`RetryConfig.java:22-31`).

**Upload path convention**: `{targetFolder}/{serviceFolder}/{filename}` for normal letters; `{targetFolder}/{serviceFolder}/International/{filename}` for international letters (`additionalData.isInternational = true`); `{smokeTestTargetFolder}/{filename}` for smoke-test letters.

**Availability window**: `FtpAvailabilityChecker` compares the current London time against a configurable downtime window (env vars `FTP_DOWNTIME_FROM` / `FTP_DOWNTIME_TO`, default 16:00-17:00). Handles both same-day and overnight windows (`FtpAvailabilityChecker.java:30-36`).

<!-- CONFLUENCE-ONLY: not verified in source -->
**Network constraints**: Xerox requires a whitelisted IP address for inbound SSH connections. The service uses a dedicated Azure gateway for SFTP egress to satisfy this requirement. Xerox hosts a Globalscape FTP server for their onward processing.

## PGP encryption

Encryption is opt-in, controlled by `encryption.enabled` (env `ENCRYPTION_ENABLED`, default `false`).

When enabled (`LetterService.java:365-371`):

1. The PGP public key is loaded from `encryption.publicKey` at construction time. The key must be in ASCII-armored format.
2. After zipping documents, the zip bytes are encrypted via `PgpEncryptionUtil.encryptFile(...)` producing a `.pgp` file.
3. Algorithm: AES-256 with integrity packet; compression: ZIP (`PgpEncryptionUtil.java:139-142`, `:159`).
4. `Letter.isEncrypted` and `Letter.encryptionKeyFingerprint` are persisted so the provider knows to decrypt.

Crypto libraries: BouncyCastle `bcprov-jdk18on`, `bcpkix-jdk18on`, `bcpg-jdk18on` version 1.84.

## Email reporting

Reports are sent via Spring Mail (SMTP port 587, STARTTLS). The `EmailSender` bean is only created when `spring.mail.host` is configured (`EmailSender.java:18`). Each report task additionally requires its own `@ConditionalOnProperty` enable flag.

| Report | Cron (London) | Content |
|--------|---------------|---------|
| `DailyLetterUploadSummaryReport` | 19:00 daily | Letter count by service for the day |
| `DailyFtpLetterUploadSummaryReport` | 15:59:45 daily | Actual SFTP file count by folder |
| `DelayAndStaleReport` | 13:00 daily | Letters uploaded > N business days without `Posted`; stale letters over last 6 days |

All report tasks share the `UPLOAD_SUMMARY_REPORT_RECIPIENTS` env var for recipients. Reports are CSV attachments generated by `CsvWriter`.

Note: `spring.mail.test-connection: true` means a misconfigured SMTP host will prevent application startup (`application.yaml:68`).

## Database

PostgreSQL with Flyway migrations (`V001` through `V035`). Key tables:

| Table | Purpose |
|-------|---------|
| `letters` | Primary letter storage: status, `file_content` (bytea), checksum, timestamps, `additional_data` (json), `copies` (json) |
| `letter_events` | Audit trail per letter (type, notes, created_at) |
| `duplicates` | Letters rejected by deduplication (race-condition recovery) |
| `exceptions` | Letters that failed async save |
| `shedlock` | Distributed lock coordination |
| `reports` | Tracks provider CSV files processed (date, code, status) |
| `documents` | Per-document checksums linked to letters |

Deduplication is enforced at two levels: (1) Java-level query for existing `Created` letter with matching checksum before insert; (2) unique DB index on `(checksum, status)` where `status = 'Created'` (`V019`).

## File naming conventions

Upload filenames are generated by `FileNameHelper.generateName()` (`FileNameHelper.java:100-117`) following the pattern:

```
{type}{ibcaInfix}_{service}_{createdAt}_{uuid}.{pgp|zip}
```

| Component | Source | Example |
|-----------|--------|---------|
| `type` | Letter type agreed with Xerox during onboarding (e.g. `CMC001`, `SSCS001`) | `CMC001` |
| `ibcaInfix` | `_IB` if service is `sscs` and `additionalData.isIbca = true` | `_IB` or empty |
| `service` | S2S service name with underscores stripped | `cmcclaimstore` |
| `createdAt` | `ddMMyyyyHHmmss` format | `13052026143022` |
| `uuid` | Letter UUID (contains hyphens, hence underscores as separator) | `a1b2c3d4-...` |
| extension | `.pgp` if encrypted, `.zip` otherwise | `.pgp` |

PDF filenames within the zip follow a simpler convention: `{type}{ibcaInfix}_{service}_{uuid}.pdf`.

The letter UUID is extracted from report CSVs by parsing the filename with `FileNameHelper.extractIdFromPdfName()`, taking the last underscore-delimited segment.

## Print provider (Xerox)

The external print provider is **Xerox** (under the MOJ FITS contract). Key operational characteristics:

<!-- CONFLUENCE-ONLY: not verified in source -->
- **Interface**: file-based only -- Xerox does not expose an API. Integration is exclusively via SFTP file transfer and daily CSV reconciliation reports.
- **SLA**: 48-hour print-and-post commitment from file receipt.
- **Egress**: Xerox requires a whitelisted IP address for SSH traffic, necessitating a dedicated gateway for egress from the Azure environment.
- **Processing times** (per-service batch processing on weekdays):

<!-- CONFLUENCE-ONLY: not verified in source -->
| Service | Xerox processing time |
|---------|----------------------|
| FINREM | 16:30 |
| NFDIVORCE | 17:05 |
| CMC / DIVORCE | 17:30 |
| SSCS IB | 17:55 |
| SSCS | 18:00 |
| PRIVLAW | 18:00 |
| FPL | 18:15 |
| PROBATE | 19:00 |

- **Stationery & envelope types**: agreed per-service during onboarding. Xerox uses the letter `type` field (e.g. `CMC001`) to determine the envelope format, postage class, inserts, and duplex requirements.
- **Suitable usage**: mandatory notices, complex case communications, letters for digitally excluded citizens, letters requiring envelope inserts.
- **Unsuitable usage**: bulk mailing, printing stock, simple messaging (use GOV.UK Notify instead), recorded delivery, adding barcodes.

## Onboarding

Adding a new service to Bulk Print is a multi-party process with approximately **6 weeks lead time** for Xerox:

1. **Business engagement**: Service team contacts Bulk Print project managers and goes through the Bulk Print Functional Specification.
2. **Xerox setup**: BSP team facilitates meeting between Xerox and the service team. Xerox creates a folder on the SFTP server for both UAT and Production. A document type code (e.g. `PCS001`) is agreed.
3. **S2S registration**: Service must be registered in `service-auth-provider-app`.
4. **Configuration**: Bulk Print team adds entries to `ftp.service-folders` (mapping S2S service name to SFTP folder) and `reports.service-config` (mapping to display name and report code) in `application.yaml`.
5. **Deployment order**: The Xerox folder must exist before the configuration is deployed -- deploying config first will cause upload failures for letters from that service.

<!-- CONFLUENCE-ONLY: not verified in source -->
The service does not validate letter types -- it passes the type through to Xerox, which handles envelope selection and processing rules based on what was agreed during onboarding.

Current onboarded services and their SFTP folder mappings (`application.yaml:141-168`):

| S2S Service | SFTP Folder | Notes |
|-------------|-------------|-------|
| `cmc_claim_store` | `CMC` | |
| `civil_service` | `CMC` | Feature-flagged (`CIVIL_SERVICE_ENABLED`, default false) |
| `civil_general_applications` | `CMC` | |
| `send_letter_tests` | `BULKPRINT` | Smoke test |
| `nfdiv_case_api` | `NFDIVORCE` | |
| `divorce_frontend` | `DIVORCE` | |
| `probate_backend` | `PROBATE` | |
| `sscs` | `SSCS` | |
| `finrem_document_generator` | `FINREM` | |
| `finrem_case_orchestration` | `FINREM` | |
| `fpl_case_service` | `FPL` | |
| `prl_cos_api` | `PRIVLAW` | |
| `pcs_api` | `PCS` | |

## Data retention and cleanup

Three separate cleanup mechanisms operate on different timescales:

### 1. SFTP file cleanup (`DeleteOldFilesTask`)

Deletes uploaded files from the SFTP server once they exceed a configurable TTL (default 12 hours). Runs hourly at 15 minutes past the hour. Gated by `FILE_CLEANUP_ENABLED` (default `false`, enabled in production only).

### 2. DB content cleanup (`ClearOldLetterContentTask`)

Nulls `fileContent` for letters in `Uploaded` status that are older than the configured TTL (default 31 days). Runs daily at 07:00 London. Gated by `OLD_LETTER_CONTENT_CLEANUP_ENABLED` (default `false`). Intended for AAT environments.

### 3. Hard deletion of old letters (`DeleteOldLettersTask`)

Permanently deletes letter records from the database. Runs weekly (Saturday 17:00 London). Controlled by LaunchDarkly feature flag `send-letter-service-delete-letters-cron`. Each service has a configurable retention interval (`application.yaml:227-242`):

| Service | Retention |
|---------|-----------|
| `civil_general_applications` | 6 years |
| `civil_service` | 6 years |
| `cmc_claim_store` | 2 years |
| `fpl_case_service` | 2 years |
| `send_letter_tests` | 2 years |
| `probate_backend` | 1 year |
| `prl_cos_api` | 18 years |
| `pcs_api` | 6 months |
| `divorce_frontend` | 3 months |
| `finrem_case_orchestration` | 3 months |
| `finrem_document_generator` | 3 months |
| `nfdiv_case_api` | 3 months |
| `sscs` | 3 months |

## Feature flags (LaunchDarkly)

The service integrates LaunchDarkly for runtime feature toggling. Current flags:

| Flag key | Controls |
|----------|----------|
| `send-letter-service-delete-letters-cron` | Gates the `DeleteOldLettersTask` scheduled job |
| `send-letter-service-test` | General test flag |

LaunchDarkly is configured via `LAUNCH_DARKLY_SDK_KEY` with an offline mode fallback (`LAUNCH_DARKLY_OFFLINE_MODE`, default `false`).

## In-development: Bulk Print Frontend

<!-- CONFLUENCE-ONLY: not verified in source -->
Per HLD v1.2, a frontend dashboard is planned/in development to provide:

- **Role-based access control** via CFT IdAM with three roles: `bulk-print-viewer`, `bulk-print-reports`, `bulk-print-admin` (SC cleared)
- **Letter management**: view status, download uploaded letters (with justification), abort letters without developer intervention
- **Audit logging**: all actions (viewing, deleting, status changes) stored in the database
- **Access restrictions**: behind Azure Front Door, restricted to DOM1 devices or VPN
- **Statistics and reporting**: letter volumes per service, downloadable reports

This addresses the operational burden of 200+ manual letter-abort requests that currently require developer involvement.

## Architectural decisions and divergences from original HLD

The original HLD (approved at PDG Architecture Working Group) proposed using **Azure Service Bus** for internal message queuing between the API layer and the upload task. The current production implementation diverges from this: letters are persisted directly to **PostgreSQL** and the `UploadLettersTask` polls the database. There is no message bus in the current architecture.

<!-- DIVERGENCE: Confluence HLD says Azure Service Bus is used for queuing print requests, but send-letter-service:build.gradle has no Service Bus dependency and the implementation uses PostgreSQL (LetterRepository) directly. Source wins. -->

Other key architectural decisions preserved from the HLD:
- **Pass by value** (not reference): documents are sent as base64-encoded bytes in the API request, stored in DB, not fetched from Document Management at upload time.
- **No manifest files**: Xerox had limited experience with them; reconciliation is done via daily audit CSV reports.
- **NPP merges composite documents**: multiple documents for one envelope are merged by the send-letter-service, not by the calling service.
- **Traditional development** (not serverless/Lambda): deemed lower risk at the time of build.

## Examples

### Scheduler and ShedLock configuration

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

The `@ConditionalOnProperty` on `scheduling.enabled` means the entire `SchedulerConfiguration` bean — and therefore all `@Scheduled` tasks — is absent when `SCHEDULING_ENABLED` is falsy. The Flyway `@DependsOn` guard ensures the `shedlock` table exists before lock acquisition is attempted.

### UploadLettersTask scheduling declaration

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/tasks/UploadLettersTask.java

@Component
@ConditionalOnProperty(value = "scheduling.enabled", matchIfMissing = true)
public class UploadLettersTask {

    public static final int BATCH_SIZE = 10;
    public static final String SMOKE_TEST_LETTER_TYPE = "smoke_test";
    public static final String INTERNATIONAL_FOLDER = "/International";

    @SchedulerLock(name = "UploadLetters")
    @Scheduled(fixedDelayString = "${tasks.upload-letters.interval-ms}")
    public void run() {
        if (!availabilityChecker.isFtpAvailable(now(ZoneId.of(EUROPE_LONDON)).toLocalTime())) {
            logger.info("Not processing 'UploadLetters' task due to FTP downtime window");
        } else {
            if (repo.countByStatus(LetterStatus.Created) > 0) {
                processLetters();
            }
        }
    }
    // ...
}
```

### FTP downtime window logic

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/services/ftp/FtpAvailabilityChecker.java

public class FtpAvailabilityChecker implements IFtpAvailabilityChecker {

    private final LocalTime downtimeStart;
    private final LocalTime downtimeEnd;

    public FtpAvailabilityChecker(String downtimeFromHour, String downtimeToHour) {
        this.downtimeStart = LocalTime.parse(downtimeFromHour);
        this.downtimeEnd = LocalTime.parse(downtimeToHour);
    }

    public boolean isFtpAvailable(LocalTime time) {
        if (downtimeStart.isBefore(downtimeEnd)) {
            return time.isBefore(downtimeStart) || time.isAfter(downtimeEnd);
        } else {
            return time.isBefore(downtimeStart) && time.isAfter(downtimeEnd);
        }
    }
}
```

Default window via `application.yaml`: `ftp.downtime.from: ${FTP_DOWNTIME_FROM:16:00}` / `ftp.downtime.to: ${FTP_DOWNTIME_TO:17:00}`.

### Upload filename generation

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/services/util/FileNameHelper.java

// Pattern: {type}{ibcaInfix}_{service}_{ddMMyyyyHHmmss}_{uuid}.{pgp|zip}
public static String generateName(
    String type, String service, LocalDateTime createdAtDateTime,
    UUID id, Boolean isEncrypted, Map<String, Object> additionalData
) {
    return String.format(
        "%s%s_%s_%s_%s.%s",
        type.replace("_", ""),
        infectedBloodInfix(service, additionalData),   // "_IB" for SSCS IBCA letters
        service.replace("_", ""),
        createdAtDateTime.format(dateTimeFormatter),   // ddMMyyyyHHmmss
        id,
        Boolean.TRUE.equals(isEncrypted) ? "pgp" : "zip"
    );
}

// SSCS infected-blood infix
public static String infectedBloodInfix(String service, Map<String, Object> additionalData) {
    if ("sscs".equalsIgnoreCase(service) && additionalData != null
            && "true".equalsIgnoreCase(String.valueOf(additionalData.get("isIbca")))) {
        return "_IB";
    }
    return "";
}
```

### Scheduling defaults (application.yaml)

```yaml
# Source: apps/send-letter/send-letter-service/src/main/resources/application.yaml

scheduling:
  enabled: ${SCHEDULING_ENABLED:false}
  lock_at_most_for: ${SCHEDULING_LOCK_AT_MOST_FOR:PT10M}

tasks:
  upload-letters:
    interval-ms: ${UPLOAD_LETTERS_INTERVAL:30000}     # 30-second fixed delay
    db-poll-delay: ${DB_POLL_DELAY:2}                 # skip letters newer than 2 minutes

stale-letters:
  min-age-in-business-days: ${STALE_BUSINESS_DAYS:2}
  min-age-in-days-for-no-report-abort: ${NO_REPORT_ABORT_DAYS:7}
```

## See also

- [Overview](overview.md) — product context, onboarded services, and operational support contacts
- [Letter Lifecycle](letter-lifecycle.md) — detailed per-phase walk-through of each status transition
- [Configuration reference](../reference/configuration.md) — all environment variables and `application.yaml` keys including FTP service-folder mappings
- [Troubleshoot upload failures](../how-to/troubleshoot-upload-failures.md) — step-by-step diagnosis for letters stuck in `Created` status
