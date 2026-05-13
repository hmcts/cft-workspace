---
service: bulk-scan
ccd_based: true
ccd_config: json
ccd_features:
  - query_search
  - work_allocation_tasks
integrations:
  - idam
  - s2s
  - cdam
  - payment
  - flyway
api_specs:
  - apps/bulk-scan/bulk-scan-processor:bulk-scan-processor.json
  - apps/bulk-scan/bulk-scan-orchestrator:bulk-scan-orchestrator.json
  - apps/bulk-scan/bulk-scan-payment-processor:bulk-scan-payment-processor.json
exemplar_dirs: []
repos:
  - apps/bulk-scan/bulk-scan-processor
  - apps/bulk-scan/bulk-scan-orchestrator
  - apps/bulk-scan/bulk-scan-payment-processor
  - apps/bulk-scan/bulk-scan-ccd-definitions
  - apps/bulk-scan/bulk-scan-helper-frontend
confluence_spaces:
  - BS
---

# Bulk Scan

The Bulk Scan product is the HMCTS platform for ingesting scanned paper documents into the case management system. It retrieves envelopes (ZIPs containing document images and OCR metadata) from Azure Blob Storage, validates them, uploads documents to CDAM, and routes case-creation or case-update actions into CCD for each supported jurisdiction (SSCS, Probate, Divorce, FinRem, CMC, PublicLaw, PrivateLaw, NFD, BulkScan).

## Repos

- `apps/bulk-scan/bulk-scan-processor` — Spring Boot service (port 8581) that polls Azure Blob Storage, validates envelopes, uploads images via CDAM, and publishes notifications to Azure Service Bus queues.
- `apps/bulk-scan/bulk-scan-orchestrator` — Spring Boot service (port 8582) that consumes envelope notifications from Service Bus and creates or updates CCD cases (or exception records) via the CCD data-store client.
- `apps/bulk-scan/bulk-scan-payment-processor` — Spring Boot service (port 8583) that processes payment messages from Service Bus, creating or updating payment records in Pay Hub and CCD.
- `apps/bulk-scan/bulk-scan-ccd-definitions` — JSON CCD case-type definitions for each jurisdiction's Exception Record case type, managed as spreadsheet-convertible JSON sheets.
- `apps/bulk-scan/bulk-scan-helper-frontend` — Internal Express/TypeScript tool (port 8787) used by the bulk-scan team to retrieve SAS tokens and inspect blob storage during development and testing.

## Architecture

Scanned documents arrive from a scanning supplier as envelope ZIPs placed in per-jurisdiction Azure Blob Storage containers. `bulk-scan-processor` leases blobs, unzips and validates each envelope against a JSON schema, optionally calls a per-jurisdiction OCR validation URL, then uploads document images to CDAM. Successful envelopes are persisted in a PostgreSQL database and notifications published to the Azure Service Bus `envelopes` queue. A `processed-envelopes` queue carries completion signals back from orchestrators, triggering blob deletion.

`bulk-scan-orchestrator` listens on the `envelopes` Service Bus queue. For each envelope it either creates a new CCD case (via `core-case-data-store-client` with IDAM user tokens for the `bsp` client) or attaches the envelope as supplementary evidence to an existing case. If the envelope cannot be matched to a known case type, the orchestrator creates a CCD Exception Record — a special case that caseworkers can later convert or attach. It writes completion messages back to the `processed-envelopes` queue.

`bulk-scan-payment-processor` reads from a separate payments Service Bus queue. It maps PO Box numbers to site IDs and calls Pay Hub (`PAY_HUB_URL`) to either register a new payment for an exception record or update an existing payment reference when the exception record is converted to a service case.

Both Java services use ShedLock (processor) or DB-backed locking to prevent concurrent scheduling across replicas. LaunchDarkly is wired into both services for runtime feature flags. All three Java services publish OpenAPI specs to `cnp-api-docs` via `SwaggerPublisher` integration tests triggered by the `workflow-publish-openapi-spec` GitHub Actions workflow on every `master` push.

## CCD touchpoints

Case-type definitions live in `bulk-scan-ccd-definitions` as JSON sheets under `definitions/<service>/data/sheets/`. Each jurisdiction (bulkscan, bulkscanauto-exception, bulkscan-exception, cmc, divorce, finrem, nfd, privatelaw, probate, publiclaw, sscs) has its own subdirectory. The sheets include `CaseField`, `CaseEvent`, `CaseEventToFields`, `WorkBasketInputFields`, `SearchInputFields`, `SearchResultFields`, and authorisation JSONs. Definitions are environment-parameterised and built to XLSX via `bin/json2xlsx.sh {ENV}` before upload to `ccd-definition-store-api`. There is no config-generator SDK usage — all definitions are JSON-only.

`bulk-scan-orchestrator` calls `ccd-data-store-api` directly (via `core-case-data-store-client`) to search for existing cases by legacy ID or envelope ID, to create new cases, and to attach envelopes to exception records. The orchestrator implements CCD event callbacks for exception record conversion events, where a caseworker-triggered CCD event causes the orchestrator to call a jurisdiction-specific `transformation-url` to produce a proper service case. The `update-url` is called when attaching to an existing service case.

## External integrations

- `idam` — `idam-java-client` used in all three Java services; OAuth2 system user (`bsp`) token acquisition for CCD and Pay Hub calls. Credentials cached with `refresh-before-expire-in-sec: 300`.
- `s2s` — `service-auth-provider-java-client` used in all three services for S2S tokens; service names `bulk_scan_processor`, `bulk_scan_orchestrator`, `bulk_scan_payment_processor`.
- `cdam` — `ccd-case-document-am-client` (v1.59.2) used by both processor and orchestrator to upload and access scanned document images; URL from `CDAM_URL`.
- `payment` — `bulk-scan-payment-processor` calls Pay Hub at `PAY_HUB_URL` to register and update payment records. No `payments-java-client` library is used; Pay Hub is called via Feign.
- `flyway` — Flyway 11 manages PostgreSQL schemas in both processor and orchestrator; `src/main/resources/db/migration/` in each.

## Notable conventions and quirks

- Service Bus is the primary transport; JMS/ActiveMQ is an alternative transport toggled by `JMS_ENABLED` (off by default). Both processor and orchestrator exclude JMS auto-configuration unless the flag is set, and have separate JMS processor classes excluded from Sonar.
- The processor's four scheduling tasks (scan, upload-documents, notifications_to_orchestrator, delete-complete-files) each have individual `enabled` and `delay` env vars — environments can run partial pipeline stages.
- The `bulk-scan-ccd-definitions` repo holds definitions for multiple jurisdictions including some that manage their own definitions elsewhere (e.g. SSCS, Probate). The bulk-scan versions define Exception Record case types only, not the full service case types.
- The helper frontend requires GlobalProtect VPN and APIM subscription keys to retrieve SAS tokens; it is a team-internal tool only, not deployed to production.
- Local dev setup uses `common-dev-env-bsbp` (external repo) which bootstraps all bulk-scan/print repos together via a shared script.
- The processor issues SAS tokens (10 jurisdictions configured, 300-second default validity) to downstream services so they can read blob storage directly without credentials.
