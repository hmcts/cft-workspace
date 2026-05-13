---
title: Api Stitching
topic: stitching
diataxis: reference
product: em
audience: both
sources:
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/rest/DocumentTaskResource.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/DocumentTask.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/Bundle.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/BundleDocument.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/enumeration/TaskState.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/Callback.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/DocumentImage.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/service/impl/DocumentTaskServiceImpl.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/config/BatchConfiguration.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/batch/DocumentTaskCallbackProcessor.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/validation/CallableEndpointValidator.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/enumeration/ImageRenderingLocation.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/enumeration/ImageRendering.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/enumeration/PageNumberFormat.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/enumeration/PaginationStyle.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/StitchingCompleteCallbackController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/CallbackUrlCreator.java
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/em/em-stitching-api/src/main/java/uk/gov/hmcts/reform/em/stitching/domain/DocumentTask.java
  - apps/em/em-stitching-api/src/main/java/uk/gov/hmcts/reform/em/stitching/domain/enumeration/TaskState.java
confluence:
  - id: "1114964598"
    title: "EM DM - Bundling & Stitching"
    last_modified: "unknown"
    space: "RQA"
  - id: "1626281237"
    title: "Stitching Workload Model"
    last_modified: "unknown"
    space: "RQA"
  - id: "1478708296"
    title: "Docstore- Doc Stitching Interaction"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1945632872"
    title: "Addressing CCD timeouts when stitching multiple documents"
    last_modified: "unknown"
    space: "DATS"
  - id: "1814318365"
    title: "EM Consumer/Provider Contract Testing / PACT"
    last_modified: "unknown"
    space: "RDM"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Stitching API accepts a `DocumentTask` via `POST /api/document-tasks`, processes it asynchronously (Spring Batch), and returns the merged PDF location on the task's bundle.
- Poll `GET /api/document-tasks/{id}` to check task state: `NEW` -> `IN_PROGRESS` -> `DONE` or `FAILED`.
- Alternatively, supply a `callback` object with a URL; the service POSTs the completed task DTO to that URL automatically.
- Service runs on port `4630`; S2S microservice name is `em_stitching_api`; authorised callers are `em_ccd_orchestrator` and `em_gw`.
- CDAM path is used when both `caseTypeId` and `jurisdictionId` are populated; otherwise falls back to legacy DM Store.
- CCD does not store the bundle or stitched PDF itself -- only the document URI references are saved in CCD case data.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/document-tasks` | Create a new stitching task |
| `GET` | `/api/document-tasks/{id}` | Retrieve task status and result |

### POST /api/document-tasks

Creates a `DocumentTask` and enqueues it for asynchronous stitching.

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | IDAM Bearer token. Stored on the task for later CDAM/DM calls. |
| `ServiceAuthorization` | Yes | S2S token. Must be from `em_ccd_orchestrator` or `em_gw`. |

**Request body** (`application/json`)

```json
{
  "bundle": {
    "bundleTitle": "Trial Bundle",
    "description": "All documents for hearing",
    "fileName": "trial-bundle",
    "hasTableOfContents": true,
    "hasCoversheets": true,
    "hasFolderCoversheets": false,
    "coverpageTemplate": "FL-FRM-GOR-ENG-12345",
    "coverpageTemplateData": { "caseNo": "1234567890" },
    "pageNumberFormat": "numberOfPages",
    "paginationStyle": "bottomCenter",
    "enableEmailNotification": false,
    "documentImage": {
      "docmosisAssetId": "hmcts.png",
      "imageRenderingLocation": "allPages",
      "imageRendering": "opaque",
      "coordinateX": 50,
      "coordinateY": 50
    },
    "folders": [
      {
        "folderName": "Applicant",
        "sortIndex": 1,
        "documents": [
          {
            "docTitle": "Application Form",
            "docDescription": "Completed C100",
            "documentURI": "http://dm-store/documents/abc-123",
            "sortIndex": 1
          }
        ]
      }
    ],
    "documents": [
      {
        "docTitle": "Cover Letter",
        "docDescription": "Introductory letter",
        "documentURI": "http://dm-store/documents/def-456",
        "sortIndex": 0
      }
    ]
  },
  "caseTypeId": "CARE_SUPERVISION_EPO",
  "jurisdictionId": "PUBLICLAW",
  "caseId": "1234567890123456",
  "callback": {
    "callbackUrl": "https://em-ccd-orchestrator.service.internal/api/stitching-complete-callback/1234567890123456/createBundle/bundleId"
  }
}
```

**Response** -- `201 Created`

Returns the created `DocumentTaskDTO` with `taskState: "NEW"` and a server-assigned `id`.

```json
{
  "id": 42,
  "bundle": {
    "bundleTitle": "Trial Bundle",
    "stitchedDocumentURI": null,
    "stitchStatus": null,
    "fileName": "trial-bundle",
    "hashToken": null
  },
  "taskState": "NEW",
  "failureDescription": null
}
```

Note: `bundle.id` is not exposed in the response (`@JsonIgnore` on `BundleDTO.java:23`). The `jwt` field is also `@JsonIgnore` and never serialised (`DocumentTaskDTO.java:32`).

### GET /api/document-tasks/{id}

Retrieves the current state of a previously created task. Scoped to the creating user -- `findByIdAndCreatedBy` at `DocumentTaskRepository.java:16` means a task created by user A cannot be fetched by user B.

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | IDAM Bearer token (must match the user who created the task) |
| `ServiceAuthorization` | Yes | S2S token |

**Response** -- `200 OK`

```json
{
  "id": 42,
  "bundle": {
    "bundleTitle": "Trial Bundle",
    "stitchedDocumentURI": "http://cdam/cases/documents/merged-789",
    "stitchStatus": "DONE",
    "fileName": "trial-bundle",
    "hashToken": "abc123hashtoken"
  },
  "taskState": "DONE",
  "failureDescription": null
}
```

When `taskState` is `FAILED`, `failureDescription` contains the error message (max 5000 chars).

## Task lifecycle

| State | Meaning |
|-------|---------|
| `NEW` | Task created, awaiting batch pickup |
| `IN_PROGRESS` | Batch processor has claimed the task and is stitching |
| `DONE` | Stitching complete; `bundle.stitchedDocumentURI` populated |
| `FAILED` | Stitching failed; see `failureDescription` |

The batch reader polls every 6 seconds (configurable via `DOCUMENT_TASK_MILLISECONDS`, defaults to `6000`). Only tasks with `version <= currentBuildNumber` are picked up, enabling zero-downtime rolling deployments. Tasks are selected with `PESSIMISTIC_WRITE` locking and ordered by `createdDate` (oldest first).

The batch uses a chunk size of 5 (i.e. up to 5 tasks processed per batch iteration).

### Timing characteristics

Based on production observations and performance testing:
<!-- CONFLUENCE-ONLY: not verified in source -->

- A 298-page bundle (7 documents, 2 Word + 5 PDF, ~70MB) stitches in approximately 21 seconds.
- A 1000-page bundle is expected to take around 1 minute.
- The first task in a batch cycle may incur a ~5 second delay waiting for the batch job to fire. Subsequent tasks in the same cycle are picked up almost immediately if the executor is warm.
- The `em-ccd-orchestrator` polls the stitching service at ~1-second intervals for completion status, adding latency after stitching completes.

### CCD callback timeout considerations

CCD imposes a 10-second timeout on all callbacks. When stitching is triggered from within a CCD `aboutToSubmit` callback (via the orchestrator's synchronous `/api/stitch-ccd-bundles` endpoint), bundles with many pages or multiple bundles in sequence risk exceeding this timeout. For multiple bundles, service teams should:
<!-- CONFLUENCE-ONLY: not verified in source -->

- Use the asynchronous endpoint (`/api/async-stitch-ccd-bundles`) where possible.
- Execute concurrent stitching requests to reduce total wall-clock time.
- Consider combining Docmosis templates to eliminate the need for stitching altogether.

## Callback mechanism

If a `callback` object is supplied on creation, the service POSTs the final `DocumentTaskDTO` to `callback.callbackUrl` after the task reaches `DONE` or `FAILED`.

| Callback field | Type | Description |
|----------------|------|-------------|
| `callbackUrl` | String (required, `@NotNull`) | Destination URL for the POST |
| `callbackState` | Enum (read-only) | `NEW`, `SUCCESS`, or `FAILURE` |
| `failureDescription` | String (read-only) | Error detail on HTTP failure (max 5000 chars) |
| `attempts` | int (read-only) | Number of delivery attempts made |

Callback retries: up to 3 attempts (configurable via `CALLBACK_MAX_ATTEMPTS`). On final failure, `callbackState` is set to `FAILURE`. Note: an `IOException` during the HTTP call immediately sets `callbackState` to `FAILURE` without retrying.

The callback POST includes `ServiceAuthorization` (fresh S2S token generated by `AuthTokenGenerator`) and `Authorization` (stored JWT from the original request) headers.

### Callback URL validation

The callback URL is validated before the task is persisted. In production (`callbackurlvalidator.env=PROD`), the URL host must exactly match one of the configured `CALLBACK_DOMAINS`. In non-production environments, the URL need only contain one of the allowed hosts as a substring. If no allowed hosts are configured or the URL is blank, the callback is rejected with a `ConstraintViolationException`.

### Callback URL format (em-ccd-orchestrator)

When the orchestrator submits a stitching task, it constructs the callback URL using `CallbackUrlCreator`:

```
{scheme}://{host}:{port}/api/stitching-complete-callback/{caseId}/{triggerId}/{bundleId}
```

The `host` is configured via `CALLBACK_DOMAIN` env var on the orchestrator.

### Email notification on callback

When `enableEmailNotification` is `true` on the bundle and stitching completes (DONE or FAILED), the orchestrator's `StitchingCompleteCallbackController` sends an email notification via GOV.UK Notify using configured template IDs (`notify.successTemplateId` / `notify.failureTemplateId`).

## Bundle fields reference

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `bundleTitle` | String | max 255 chars | Title of the bundle (used as PDF filename fallback) |
| `description` | String | max 1000 chars | Optional description |
| `fileName` | String | max 255 chars | Output filename (without extension); falls back to `bundleTitle` if null or empty |
| `fileNameIdentifier` | String | max 255 chars | Optional identifier appended to filename |
| `hasTableOfContents` | boolean | | Insert a clickable table of contents |
| `hasCoversheets` | boolean | | Insert cover sheets before each document |
| `hasFolderCoversheets` | boolean | | Insert cover sheets before each folder |
| `coverpageTemplate` | String | | Docmosis template name for the bundle cover page |
| `coverpageTemplateData` | JSON object | stored as `jsonb` | Data map passed to the cover page template |
| `pageNumberFormat` | enum | | Page numbering display format (see below) |
| `paginationStyle` | enum | | Position of page numbers (see below) |
| `enableEmailNotification` | Boolean | | Whether to send email notification on completion |
| `documentImage` | object | stored as `jsonb` | Watermark/overlay configuration (see below) |
| `stitchedDocumentURI` | String (read-only) | | URI of the merged PDF after stitching |
| `hashToken` | String (read-only) | max 5000 chars | CDAM hash token for accessing the stitched document |

### PageNumberFormat enum

| JSON value | Behaviour | TOC column header |
|------------|-----------|-------------------|
| `numberOfPages` (default) | Displays total page count per document, e.g. "5 pages" | "Total Pages" |
| `pageRange` | Displays the page range within the bundle, e.g. "12 - 16" | "Page" |

### PaginationStyle enum

| Value | Position |
|-------|----------|
| `off` (default) | No page numbers |
| `topLeft` | Top-left corner |
| `topCenter` | Top-center |
| `topRight` | Top-right corner |
| `bottomLeft` | Bottom-left corner |
| `bottomCenter` | Bottom-center |
| `bottomRight` | Bottom-right corner |

## BundleDocument fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `docTitle` | String | max 255 chars | Document title displayed in the table of contents |
| `docDescription` | String | max 1000 chars | Optional description |
| `documentURI` | String | | URI to the source document (DM Store or CDAM) |
| `sortIndex` | int | | Ordering index within its parent (folder or bundle root) |

## DocumentImage (watermark) fields

| Field | Type | Description |
|-------|------|-------------|
| `docmosisAssetId` | String | Docmosis asset name for the watermark image |
| `imageRenderingLocation` | enum | `allPages` or `firstPage` |
| `imageRendering` | enum | `opaque` (foreground overlay) or `translucent` (background underlay) |
| `coordinateX` | Integer | Horizontal position as percentage (0-100) |
| `coordinateY` | Integer | Vertical position as percentage (0-100) |

Coordinates are clamped to 0-100 by `DocumentImage.verifyCoordinates()` (`DocumentImage.java:56-67`).

## Supported document formats

The stitching engine converts non-PDF source documents before merging:

| Converter | MIME types |
|-----------|-----------|
| PDFConverter (pass-through) | `application/pdf` |
| DocmosisConverter (remote) | `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, Excel, PowerPoint, `application/rtf`, `text/plain`, `application/octet-stream` |
| ImageConverter (PDFBox) | `image/jpeg`, `image/png`, `image/bmp`, `image/gif`, `image/tiff`, `image/svg+xml` |

Note: Docmosis conversion has been tested successfully for files up to approximately 4MB.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Consumer integration patterns

The stitching API is an internal service -- it is not called directly by service teams or CCD. The primary consumer is `em-ccd-orchestrator`, which exposes the following external-facing endpoints:

| Method | Path | Mode | Description |
|--------|------|------|-------------|
| `POST` | `/api/stitch-ccd-bundles` | Synchronous | Creates and stitches a CCD bundle (polls stitching API internally) |
| `POST` | `/api/async-stitch-ccd-bundles` | Asynchronous | Creates a bundle and triggers stitching via callback |
| `POST` | `/api/new-bundle` | Asynchronous | Creates a bundle without stitching |
| `POST` | `/api/clone-ccd-bundles` | -- | Clones an existing bundle |

The orchestrator receives CCD callbacks, extracts the bundle configuration from case data, submits a `DocumentTask` to the stitching API, and (in sync mode) polls `GET /api/document-tasks/{id}` until completion. In async mode, it provides its own callback URL for the stitching API to POST results back to.

## Document storage flow

1. The orchestrator (or caller) submits a `DocumentTask` referencing source document URIs.
2. The stitching batch job downloads each source document binary via `GET /documents/{documentId}/binary` (from CDAM if `caseTypeId` + `jurisdictionId` are set, otherwise DM Store).
3. Non-PDF documents are converted via Docmosis or the image converter.
4. All PDFs are merged using Apache PDFBox.
5. The merged PDF is uploaded via `POST /documents` (to CDAM or DM Store).
6. The CDAM `hashToken` is stored on the bundle for subsequent access by the orchestrator.

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `CDAM_URL` | `http://localhost:4455` | CDAM base URL |
| `DM_STORE_APP_URL` | `http://localhost:4603` | Legacy DM Store base URL |
| `S2S_NAMES_WHITELIST` | `em_ccd_orchestrator,em_gw` | Authorised S2S callers |
| `CALLBACK_MAX_ATTEMPTS` | `3` | Max callback delivery retries |
| `DOCUMENT_TASK_MILLISECONDS` | `6000` | Batch polling interval in milliseconds |
| `TASK_ENV` | `documentTaskLock-local` | ShedLock lock name prefix |
| `CALLBACK_DOMAINS` | `localhost` | Comma-separated list of allowed callback URL hosts |
| `CALLBACK_HTTP_SCHEME` | `http` | Allowed scheme for callback URLs |
| `CALLBACK_HTTP_HOST_PORT` | `8080` | Allowed port for callback URLs |

## Workload profile (production)

Based on 2022 production data (July-October):
<!-- CONFLUENCE-ONLY: not verified in source -->

| Metric | Peak value (per hour) |
|--------|----------------------|
| `POST /api/document-tasks` | 405 |
| `GET /api/document-tasks/{id}` | ~65,000 |

The high ratio of GET to POST calls reflects the polling pattern: each task creation generates many status-check calls until completion.

## Examples

### DocumentTask entity and TaskState enum

The `DocumentTask` JPA entity maps to `versioned_document_task`. The `version` column is the build number stamped at task creation time; the batch reader filters with `version <= buildNumber` to implement zero-downtime rolling deployments.

```java
// Source: apps/em/em-stitching-api/src/main/java/uk/gov/hmcts/reform/em/stitching/domain/DocumentTask.java
@Entity
@Table(name = "versioned_document_task")
public class DocumentTask extends AbstractAuditingEntity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @OneToOne(cascade = CascadeType.ALL)
    private Bundle bundle;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_state")
    private TaskState taskState = TaskState.NEW;

    @Column(name = "failure_description", length = 5000)
    private String failureDescription;

    @Column(name = "case_type_id")
    private String caseTypeId;

    @Column(name = "case_id")
    private String caseId;

    @Column(name = "jurisdiction_id")
    private String jurisdictionId;

    @OneToOne(cascade = CascadeType.ALL)
    private Callback callback;

    private int version;   // set to buildInfo.getBuildNumber() at save time
    // ...
}
```

```java
// Source: apps/em/em-stitching-api/src/main/java/uk/gov/hmcts/reform/em/stitching/domain/enumeration/TaskState.java
public enum TaskState {
    NEW, IN_PROGRESS, DONE, FAILED
}
```

## See also

- [Stitching and Bundling](../explanation/stitching-and-bundling.md) — explains the Spring Batch processing pipeline, versioned tasks, ShedLock, bundle YAML format, and CCD timeout constraints
- [API: Orchestrator](api-orchestrator.md) — `em-ccd-orchestrator` endpoint reference; primary caller of this API
- [Trigger Bundle Stitching](../how-to/trigger-bundle-stitching.md) — step-by-step guide for service teams integrating with the orchestrator (which in turn calls this API)
- [Glossary](glossary.md#documenttask) — definitions for `DocumentTask`, `TaskState`, `versioned_document_task`, and `CDAM`
