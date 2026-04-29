---
service: dm
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - flyway
repos:
  - apps/dm/document-management-store-app
---

# Document Management (DM)

Document Management Store (`dm-store`) is a standalone Spring Boot backend that provides secure upload, storage, retrieval, and deletion of binary files on behalf of CFT services. It is a platform-level document repository — not a CCD case-data service — that stores binaries in Azure Blob Storage and persists metadata in PostgreSQL. Consumer services (CCD, XUI, Evidence Management, and most service-team APIs) call it via its REST API to attach documents to cases and hearings.

## Repos

- `apps/dm/document-management-store-app` — the Spring Boot API: storage, retrieval, deletion, thumbnail generation, TTL batch jobs, and audit trail.

## Architecture

Callers upload files via multipart POST to `POST /documents`. The service validates MIME type and file size (configurable whitelist), streams the binary to Azure Blob Storage (`com.azure:azure-storage-blob`), persists document metadata in PostgreSQL (JPA / Hibernate Envers for audit history), and returns a document URL and UUID. Subsequent reads go via `GET /documents/{id}/binary`.

All inbound requests are authenticated with both IDAM (user bearer token) and S2S (service token). Authorisation uses a whitelist of permitted S2S service names configured in `authorization.s2s-names-whitelist`; the `ccd_case_document_am_api` service is granted blanket pass-through in `PermissionEvaluatorImpl`, reflecting CDAM's role as the authoritative access layer in newer integrations.

On deletion, `DocumentMetadataDeletionService` calls `em-anno` (annotation service) and then `em-npa` (native PDF annotations / redactions) to cascade metadata removal to those EM components before removing the blob. A Spring Batch TTL job runs nightly (`DOCUMENT_DELETE_TASK_CRON`) to purge expired documents, and an orphan-blob cleanup cron removes blobs that have no corresponding database record.

ShedLock (`net.javacrumbs.shedlock`) is used to prevent concurrent execution of scheduled tasks across replicas.

## External integrations

- `idam` — user bearer-token authentication via `idam-java-client`; client ID and secret drawn from Azure Key Vault (`dm-${env}` vault). IDAM health check optionally exposed.
- `s2s` — `service-auth-provider-java-client` used to authenticate inbound service calls and to obtain a service token when the store calls `em-anno` / `em-npa` on deletion.
- `flyway` — DB schema managed by Flyway migrations under `src/main/resources/db/migration/`; the build plugin is `org.flywaydb.flyway` and the pipeline calls `enableDbMigration('dm')`.

## Notable conventions and quirks

- Default port is **4603** (`SERVER_PORT`). The Swagger UI is at `http://localhost:4603/swagger-ui/index.html`.
- The `ccd_case_document_am_api` S2S name bypasses all permission checks entirely (`PermissionEvaluatorImpl`). This is how CDAM enforces its own document-level access without dm-store re-checking user roles.
- The s2s whitelist (`S2S_NAMES_WHITELIST`) is long and enumerates every consuming service by name; new consumers must be added here and to the Key Vault.
- `em-anno` and `em-npa` API URLs are injected at runtime (`EM_ANNO_API_URL`, `EM_NPA_API_URL`); default to localhost ports for local development.
- Pact contract tests are maintained both as consumer and provider roles (`enablePactAs([CONSUMER, PROVIDER])` in Jenkinsfile).
- The JAR is assembled as `dm-store.jar` (not the default artefact name) and runs on Java 21 distroless.
