# Send Letter (Bulk Print) documentation

Send Letter Service is the HMCTS Bulk Print platform. It accepts PDF documents from case-management services, buffers them in PostgreSQL, and asynchronously uploads zipped (and optionally PGP-encrypted) bundles to Xerox's SFTP server. Xerox physically prints and posts the letters under a 48-hour SLA. Every letter is tracked through a `Created` → `Uploaded` → `Posted` state machine; daily email reports summarise upload volumes and flag stale or delayed letters.

This docs tree covers the runtime architecture, letter lifecycle, configuration reference, integration how-to, and operational troubleshooting. It is aimed at service-team engineers integrating with Bulk Print, platform engineers maintaining the service, and on-call engineers diagnosing incidents.

## Reading order

For someone new to Send Letter:

1. [Overview](explanation/overview.md) — what the service does, the letter lifecycle at a glance, onboarded services, and authentication
2. [Architecture](explanation/architecture.md) — runtime components, scheduling internals, SFTP, PGP encryption, database schema, and Xerox integration
3. [Letter Lifecycle](explanation/letter-lifecycle.md) — deep-dive into each status transition, error handling, and storage reclamation
4. [Integrate from a service](how-to/integrate-from-a-service.md) — step-by-step guide to onboarding a new calling service

## By topic

### Core concepts

- [Overview](explanation/overview.md) — product purpose, letter lifecycle summary, onboarded services, and operational contacts
- [Architecture](explanation/architecture.md) — component diagram, `UploadLettersTask`, `MarkLettersPostedService`, ShedLock, SFTP, PGP, Flyway DB, email reporting

### Letter lifecycle and state machine

- [Letter Lifecycle](explanation/letter-lifecycle.md) — `Created` → `Uploaded` → `Posted` state machine; error states (`FailedToUpload`, `Skipped`, `NoReportAborted`); deduplication; storage reclamation; admin interventions

### Integration

- [Integrate from a service](how-to/integrate-from-a-service.md) — prerequisites, S2S registration, SFTP folder setup, `application.yaml` config changes, `send-letter-client` usage, PDF formatting requirements

### Operations and troubleshooting

- [Troubleshoot upload failures](how-to/troubleshoot-upload-failures.md) — step-by-step diagnosis for letters stuck in `Created`; scheduling, FTP downtime, ShedLock, batch-break errors, SFTP auth, OOM, stale letters, and admin endpoints

## How-to recipes

- [Integrate from a service](how-to/integrate-from-a-service.md) — onboard a new calling service end-to-end
- [Troubleshoot upload failures](how-to/troubleshoot-upload-failures.md) — diagnose and resolve SFTP upload problems

## Reference

- [API reference](reference/api.md) — all REST endpoints (`POST /letters`, GET status, admin `mark-*`, task triggers), request/response schemas, validation constraints, file-naming convention, service-folder mapping, and OpenAPI spec location
- [Configuration reference](reference/configuration.md) — every `application.yaml` key and environment variable: FTP service folders, scheduling, FTP downtime window, SMTP reporting, PGP encryption, retry, stale-letter thresholds, cleanup tasks, data retention intervals, rate limiting, database, and LaunchDarkly

## Glossary

[Glossary](reference/glossary.md) — definitions for `UploadLettersTask`, `MarkLettersPostedService`, `ShedLock`, `LetterStatus`, `ServiceFolderMapping`, `FtpAvailabilityChecker`, PGP, SFTP, S2S, `send-letter-client`, `send-letter-mock`, `additional_data`, `letter_id`, `type`, Xerox, CDAM, LaunchDarkly, and more.
