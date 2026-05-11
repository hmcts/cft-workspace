---
service: send-letter
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - s2s
  - flyway
api_specs:
  - apps/send-letter/send-letter-service:send-letter-service.json
repos:
  - apps/send-letter/send-letter-service
  - apps/send-letter/send-letter-mock
---

# Send Letter (Bulk Print)

Send Letter Service is the HMCTS Bulk Print platform. It accepts document requests from case-management services, buffers them in a PostgreSQL database, and asynchronously uploads zipped PDF bundles to an external print provider's SFTP server. The provider physically prints and posts the letters. The service tracks letter status through `Created` → `Uploaded` → `Posted` and sends daily/weekly email reports on upload activity and stale letters.

## Repos

- `apps/send-letter/send-letter-service` — the Spring Boot service: REST API, scheduled upload tasks, FTP integration, reporting, Flyway-managed letter-tracking DB
- `apps/send-letter/send-letter-mock` — a lightweight Spring Boot testing harness that calls the real `send-letter-service` via `send-letter-client`; used to exercise dev/AAT environments manually

## Architecture

Calling services authenticate to `send-letter-service` exclusively via S2S tokens — there is no IDAM/user authentication. Each onboarded service must be registered in S2S (`service-auth-provider-app`) and have a corresponding FTP folder entry in `application.yaml` before it can submit letters.

A POST to `/letters` (content type `application/vnd.uk.gov.hmcts.letter-service.in.letter.v3+json`) stores base64-encoded PDF documents and returns a `letter_id`. The `UploadLettersTask` scheduler then polls the DB and uploads pending letters as zip files to service-specific folders on the external provider's SFTP server (SSHJ library, key-pair auth). The `MarkLettersPostedTask` polls the FTP reports folder to detect when letters have been physically posted.

Letter content is optionally PGP-encrypted (BouncyCastle) before upload. Distributed scheduling is coordinated with ShedLock (JDBC-backed) so only one pod runs each scheduled task. LaunchDarkly is wired in for feature flags. Spring Batch is used internally for the scheduled upload pipeline.

The mock (`send-letter-mock`) runs on port 8877 and exposes a `/test` endpoint that generates a sample letter and forwards it to a configurable `SEND_LETTER_URL`, making it easy to fire requests at any environment without writing a custom client.

## External integrations

- `s2s`: `service-auth-provider-java-client` validates the `ServiceAuthorization` header on every inbound request; all callers must present a valid S2S token.
- `flyway`: `src/main/resources/db/migration/` holds V001–V0xx SQL migrations managing the `letters` tracking table in PostgreSQL. The Flyway plugin is also configured in `build.gradle` for direct `migratePostgresDatabase` tasks.

## Notable conventions and quirks

- Send Letter Service listens on port **8485**; the mock on port **8877**.
- Each onboarding step is manual: (1) add the microservice to S2S, (2) ask the FTP provider to create a folder on both prod and test, (3) add entries to `ftp.service-folders` and `reports.service-config` in `application.yaml`. Deploying the FTP config before the provider creates the folder will fail.
- Scheduling is **disabled by default** (`SCHEDULING_ENABLED=false`). This must be set to `true` in deployed environments.
- There is a configurable FTP downtime window (`FTP_DOWNTIME_FROM`/`FTP_DOWNTIME_TO`) during which uploads are suppressed.
- The service sends email reports via SMTP (Spring Mail). The SMTP connection is tested at startup (`test-connection: true`), so misconfigured mail settings will prevent the application from starting.
- The `publish-openapi.yaml` workflow does not set an explicit `api_name:` input; it relies on the `ApplicationTest` integration test writing to `/tmp/openapi-specs.json` and the workflow's default naming, which produces `send-letter-service.json` in `cnp-api-docs`.
- Onboarded services as of the current config: CMC, Civil, Divorce, NFDIV, Probate, SSCS, FINREM, FPL, Private Law (PRL), PCS.
