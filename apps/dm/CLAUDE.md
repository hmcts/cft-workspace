---
service: dm
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - flyway
api_specs:
  - apps/dm/document-management-store-app:document-management-store-app.json
repos:
  - apps/dm/document-management-store-app
---

# Document Management (DM)

Document Management Store (`dm-store`) is a standalone Spring Boot backend that provides secure upload, storage, retrieval, and deletion of binary files on behalf of CFT services. It is a platform-level document repository — not a CCD case-data service — that stores binaries in Azure Blob Storage and persists metadata in PostgreSQL. Consumer services (CCD, XUI, Evidence Management, and most service-team APIs) call it via its REST API to attach documents to cases and hearings.

## Repos

- `apps/dm/document-management-store-app` — the Spring Boot API: storage, retrieval, deletion, thumbnail generation, TTL batch jobs, and audit trail.

## Architecture

Callers upload files via multipart POST to `POST /documents`. The service validates MIME type and file size against configurable whitelists (`DM_MULTIPART_WHITELIST`, `DM_MULTIPART_WHITELIST_EXT`), streams the binary to Azure Blob Storage (`com.azure:azure-storage-blob`), persists document metadata in PostgreSQL (JPA / Hibernate Envers for audit history), and returns a document URL and UUID. Subsequent reads go via `GET /documents/{id}/binary`.

All inbound requests are authenticated with both IDAM (user bearer token) and S2S (service token). Authorisation uses a whitelist of permitted S2S service names (`S2S_NAMES_WHITELIST`); the `ccd_case_document_am_api` service is granted blanket pass-through in `PermissionEvaluatorImpl`, reflecting CDAM's role as the authoritative access layer in newer integrations. A separate `DELETE_ENDPOINT_WHITELIST` controls which services may call the hard-delete endpoint (currently `ccd_case_disposer` and `em_gw`).

On deletion, `DocumentMetadataDeletionService` calls `em-anno` (annotation service) and then `em-npa` (native PDF annotations / redactions) to cascade metadata removal to those EM components before removing the blob. A Spring Batch TTL job runs nightly (`DOCUMENT_DELETE_TASK_CRON: 0 5 0-6 * * *`) to purge expired documents, and an orphan-blob cleanup cron (`ORPHAN_FILE_DELETION_CRONJOB_SCHEDULE`) removes blobs that have no corresponding database record. ShedLock (`net.javacrumbs.shedlock`) prevents concurrent execution of scheduled tasks across replicas.

## External integrations

- `idam` — user bearer-token authentication via `idam-java-client`; client ID and secret drawn from Azure Key Vault (`dm-${env}` vault). IDAM health check optionally exposed via `toggle.includeidamhealth`.
- `s2s` — `service-auth-provider-java-client` used to authenticate inbound service calls and to obtain a service token when the store calls `em-anno` / `em-npa` on deletion. Service name is `dm_store`.
- `flyway` — DB schema managed by Flyway migrations; the pipeline calls `enableDbMigration('dm')`. The `dbMigration.runOnStartup` toggle controls whether migrations run at startup or only validated.

## Notable conventions and quirks

- Default port is **4603** (`SERVER_PORT`). The Helm chart sets `applicationPort: '4603'`. The Dockerfile `EXPOSE` line lists 8080 and 5005 (debug), but the application binds to 4603 — this is a mismatch in the Dockerfile that does not affect deployment.
- The `ccd_case_document_am_api` S2S name bypasses all permission checks entirely (`PermissionEvaluatorImpl`). This is how CDAM enforces its own document-level access without dm-store re-checking user roles.
- The `S2S_NAMES_WHITELIST` enumerates every consuming service by name (20+ services in `application.yaml`); new consumers must be added here and to the Key Vault secret.
- `em-anno` and `em-npa` API URLs are injected at runtime (`EM_ANNO_API_URL`, `EM_NPA_API_URL`); AAT values are `http://em-anno-aat.service.core-compute-aat.internal` and `http://em-npa-aat.service.core-compute-aat.internal`.
- Pact contract tests are maintained in both consumer and provider roles (`enablePactAs([CONSUMER, PROVIDER])` in Jenkinsfile). The Pact broker is at `https://pact-broker.platform.hmcts.net`.
- The JAR is assembled as `dm-store.jar` and runs on Java 21 distroless (`hmctsprod.azurecr.io/base/java:21-distroless`).
- Apache Tika (`tika-core`, `tika-parsers-standard-package`) is used for MIME-type detection/verification on upload.
- The OpenAPI spec is published via `OpenAPIPublisherTest` (integration test writes to `/tmp/openapi-specs.json`) triggered by the `.github/workflows/publish-openapi.yml` workflow on pushes to `master`. The spec is registered in `platops/cnp-api-docs` as `document-management-store-app.json`.
