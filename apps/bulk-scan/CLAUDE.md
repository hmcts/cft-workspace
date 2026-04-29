---
service: bulk-scan
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - cdam
  - payment
  - flyway
repos:
  - apps/bulk-scan/bulk-scan-processor
---

# Bulk Scan

Bulk Scan Processor is the HMCTS platform service that ingests scanned paper documents from Azure Blob Storage, validates and classifies them, extracts OCR data, and notifies downstream recipient services (jurisdiction-specific orchestrators) that new case material is ready to process. It sits at the entry point of the bulk-scan pipeline — before any jurisdiction-specific case-creation or update logic runs.

## Repos

- `apps/bulk-scan/bulk-scan-processor` — Spring Boot service that polls Azure Blob Storage containers, validates envelope metadata and OCR data, uploads documents via CDAM, and publishes notifications to Azure Service Bus queues for downstream orchestrators.

## Architecture

The processor runs as a scheduled Spring Boot service (port 8581) backed by a PostgreSQL database (Flyway-managed schema). On each scan cycle it acquires a lease on blobs in per-jurisdiction Azure Blob Storage containers (one container per jurisdiction: sscs, probate, divorce, finrem, cmc, publiclaw, privatelaw, nfd), validates the envelope ZIP against a JSON schema, optionally calls a per-jurisdiction OCR validation URL, then uploads the document images to CDAM.

Three Azure Service Bus queues are central to the message flow. The processor publishes envelope notifications to the `envelopes` queue (read by jurisdiction orchestrators). Orchestrators signal completion back via the `processed-envelopes` queue, which triggers deletion of the processed blobs. A third `notifications` queue carries status updates. JMS (ActiveMQ) is available as an alternative transport, toggled by `JMS_ENABLED`.

IDAM is used for user-context operations (client ID `bsp`), and S2S tokens authenticate calls to CDAM (`ccd-case-document-am-client`) and to the OCR validation callbacks. SAS tokens are issued per jurisdiction (10 jurisdictions configured) so recipient services can read blobs directly.

ShedLock (`shedlock-spring`) prevents concurrent scheduling across multiple pod replicas, and LaunchDarkly is wired in for runtime feature flags.

## External integrations

- `idam` — OAuth2 client (`idam-java-client`) used for system-user token acquisition; client ID `bsp`, configured under `idam.client` in `application.yaml`.
- `s2s` — `service-auth-provider-java-client` used for S2S tokens when calling CDAM and jurisdiction OCR validation endpoints; service name `bulk_scan_processor`.
- `cdam` — `ccd-case-document-am-client` (v1.59.2) used to upload scanned document images; URL from `CDAM_URL` env var.
- `payment` — per-container `paymentsEnabled` flag controls whether payment metadata is forwarded; `process-payments.enabled` master toggle. No explicit payments-java-client dependency; payment data is forwarded in envelope payloads to orchestrators.
- `flyway` — Flyway 11 manages the PostgreSQL schema under `src/main/resources/db/migration/`; `enableDbMigration('bulk-scan')` wired in Jenkinsfile_CNP.

## Notable conventions and quirks

- The service is not CCD-based itself — it feeds jurisdiction orchestrators (e.g. `bulk-scan-orchestrator` in other repos) that interact with CCD. It belongs to the bulk-scan pipeline infrastructure rather than being a CCD case service.
- Each jurisdiction maps a Blob Storage container name, a jurisdiction code, one or more PO Box numbers, and an optional OCR validation URL. This mapping lives statically in `application.yaml` under `containers.mappings`.
- The four scheduling tasks (scan, upload-documents, notifications_to_orchestrator, delete-complete-files) are individually enable/disabled and delay-configured via env vars — useful for running only specific pipeline stages in an environment.
- `common-dev-env-bsbp` is the recommended local dev setup, pulling bulk-scan and related repos together via a shared script.
- Application listens on port 8581; smoke tests default to the same port.
