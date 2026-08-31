---
title: Overview
topic: overview
diataxis: explanation
product: em
audience: both
sources:
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/NewBundleController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/CcdStitchBundleCallbackController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/service/caseupdater/DefaultUpdateCaller.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/CallbackUrlCreator.java
  - em-ccd-orchestrator:src/main/resources/bundleconfiguration/caseprogression-bundle-config.yaml
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/batch/DocumentTaskItemProcessor.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/config/BatchConfiguration.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/pdf/PDFMerger.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/service/CdamService.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/DocumentTask.java
  - em-hrs-ingestor:src/main/java/uk/gov/hmcts/reform/em/hrs/ingestor/listener/IngestWhenApplicationReadyListener.java
  - em-hrs-ingestor:src/main/resources/application.yaml
  - em-hrs-api:src/main/resources/application.yaml
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/controller/HearingRecordingController.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/AnnotationSetResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/AnnotationSet.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/service/impl/AnnotationSetServiceImpl.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/config/security/SecurityConfiguration.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/SegmentDownloadServiceImpl.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/TtlServiceImpl.java
  - em-hrs-api:src/main/resources/ttl_service_map.json
  - em-hrs-api:src/main/resources/ttl_jurisdiction_map.json
  - em-hrs-ingestor:src/main/java/uk/gov/hmcts/reform/em/hrs/ingestor/parse/FilenameParser.java
  - em-hrs-ingestor:charts/em-hrs-ingestor/values.yaml
  - em-ccd-orchestrator:src/main/resources/application.yaml
  - cnp-flux-config:apps/em/em-hrs-ingestor/em-hrs-ingestor.yaml
  - cnp-flux-config:apps/em/em-hrs-ingestor/prod.yaml
  - cnp-flux-config:apps/em/em-hrs-api/em-hrs-api.yaml
  - cnp-flux-config:apps/em/em-anno/em-anno.yaml
  - cnp-flux-config:apps/em/em-stitching/em-stitching.yaml
  - cnp-flux-config:apps/em/em-stitching/prod.yaml
  - cnp-flux-config:apps/em/em-ccd-orchestrator/em-ccd-orchestrator.yaml
  - cnp-flux-config:apps/em/em-ccd-orchestrator/prod.yaml
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/storage/HearingRecordingStorageImpl.java
  - em-hrs-api:infrastructure/main.tf
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1504222204"
    title: "DTS - Evidence Management"
    last_modified: "unknown"
    space: "DATS"
  - id: "1595513430"
    title: "IT Service Design Package - Evidence Management"
    last_modified: "2024-10-23"
    space: "DIP"
  - id: "1460539669"
    title: "HRS - HLD Ingestion of CVP hearing recordings"
    last_modified: "unknown"
    space: "RDM"
  - id: "997524007"
    title: "Media Viewer - LLD"
    last_modified: "unknown"
    space: "RDM"
  - id: "1101398118"
    title: "Media Viewer - User Guide"
    last_modified: "unknown"
    space: "RDM"
  - id: "1468013320"
    title: "Hearing Recording Storage and Ingestion Service"
    last_modified: "unknown"
    space: "RDM"
confluence_checked_at: "2026-05-13T12:00:00Z"
sources_sha:
  "em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/NewBundleController.java": "76f50f2a1fff38d4500c39030ff043f132ff9f59"
  "em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/CcdStitchBundleCallbackController.java": "5bc8c4fda1c1b561846b3d960398f7fc86700ac5"
  "em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/service/caseupdater/DefaultUpdateCaller.java": "6c1a512c71e548439d96afbe0645b3521685081a"
  "em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/CallbackUrlCreator.java": "971e03d1e207771b5a64840bd90e2454d9a3c410"
  "em-ccd-orchestrator:src/main/resources/bundleconfiguration/caseprogression-bundle-config.yaml": "23da1bdbc204ab19d22ef60d047428f1f45d3979"
  "em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/batch/DocumentTaskItemProcessor.java": "3e65614c095b855b240593d6d91e58a02551d71a"
  "em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/config/BatchConfiguration.java": "305d667570e24bd9d0b98f5a48c5be1c3563f259"
  "em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/pdf/PDFMerger.java": "87e85c5e7b359f01ccbb43c50d115504fe7ab424"
  "em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/service/CdamService.java": "3e65614c095b855b240593d6d91e58a02551d71a"
  "em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/domain/DocumentTask.java": "706ad3ed0c5d30ef9818dee4ae4fc72c5dde9c99"
  "em-hrs-ingestor:src/main/java/uk/gov/hmcts/reform/em/hrs/ingestor/listener/IngestWhenApplicationReadyListener.java": "a2e92dac5c0e15635b8c03b7879c2f1a31b90db4"
  "em-hrs-ingestor:src/main/resources/application.yaml": "5fb13165c928bfd58aa97791e969016b88d3855d"
  "em-hrs-api:src/main/resources/application.yaml": "679a3b9d051415424f6c824b7aafa9c049ebadd4"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/controller/HearingRecordingController.java": "d9c7ef9373e8c43c3e74ab89520efb383ee52c2b"
  "em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/AnnotationSetResource.java": "b84e15b87ad87e891117a17c4da4085249314af5"
  "em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/AnnotationSet.java": "b84e15b87ad87e891117a17c4da4085249314af5"
  "em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/service/impl/AnnotationSetServiceImpl.java": "cb1b245382e54dbfed78167e1aaf5e237f3d9a32"
  "em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/config/security/SecurityConfiguration.java": "a1728d11379a77b55678f497d2debd6cc01d3872"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/SegmentDownloadServiceImpl.java": "711d96e5651c5f1932656ef6981ee45ea7ab10fc"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/TtlServiceImpl.java": "1195877a87ffdc97426c40cfe5555a9e48a1628d"
  "em-hrs-api:src/main/resources/ttl_service_map.json": "22cc67abb7fca8771a32236166bc0076e616ea17"
  "em-hrs-api:src/main/resources/ttl_jurisdiction_map.json": "d01e774a5454063d4159b4bdc62caa9b41aa4381"
  "em-hrs-ingestor:src/main/java/uk/gov/hmcts/reform/em/hrs/ingestor/parse/FilenameParser.java": "6d60056cc3b7383e3c68c6cc2ae8d896c1af9f78"
  "em-hrs-ingestor:charts/em-hrs-ingestor/values.yaml": "36ae29fef9a7b3cb16585c2d0a66d8f7015ff342"
  "em-ccd-orchestrator:src/main/resources/application.yaml": "4d5317bc931857fe148d9201c4e208f7be2c61ae"
  "cnp-flux-config:apps/em/em-hrs-ingestor/em-hrs-ingestor.yaml": "bfb56a4e4b01264c2db7eec7d682392d6491e172"
  "cnp-flux-config:apps/em/em-hrs-ingestor/prod.yaml": "6b3ddae167745d42b28307678f3716427e7a2a21"
  "cnp-flux-config:apps/em/em-hrs-api/em-hrs-api.yaml": "4813ffb27035c9e17b5b79ad9c2339f297e2e699"
  "cnp-flux-config:apps/em/em-anno/em-anno.yaml": "7a28207db8ca87fc38321ccede329238ebaaf2a8"
  "cnp-flux-config:apps/em/em-stitching/em-stitching.yaml": "52705d7fe3088ebe7a20d8f5a8f372a499e49371"
  "cnp-flux-config:apps/em/em-stitching/prod.yaml": "f8c9392b084b99a982aeadfd89b758b53b05885f"
  "cnp-flux-config:apps/em/em-ccd-orchestrator/em-ccd-orchestrator.yaml": "0e195d26539145483be5d393e7429d0e00a4c6d1"
  "cnp-flux-config:apps/em/em-ccd-orchestrator/prod.yaml": "6a067bebc6c00192c4c8c66cb7dfeb55061a9419"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/storage/HearingRecordingStorageImpl.java": "edbea18aa61de15d32c1ec7c7e866f53ed209fb9"
  "em-hrs-api:infrastructure/main.tf": "95fbc75a270365df1bdcd821a44892ba1451d840"
---

## TL;DR

- Evidence Management (EM) is the document processing and presentation layer for HMCTS CFT services, providing four capability areas: stitching/bundling, annotations/redactions, hearing recordings, and in-court presentation.
- Service teams trigger bundling via CCD callbacks to `em-ccd-orchestrator`, which submits stitching jobs to `em-stitching-api` and returns the merged PDF URL back into CCD case data. Maximum bundle size is 1GB (higher is possible but may cause timeouts).
- `em-stitching-api` downloads source documents from CDAM, converts non-PDF formats via Docmosis, merges them with Apache PDFBox, and uploads the result — all asynchronously via Spring Batch.
- Annotations and redactions are managed by `em-annotation-api` and `em-native-pdf-annotator-app`, surfaced through the `@hmcts/media-viewer` Angular library embedded in XUI. Annotations are private to their author, with no sharing mechanism.
- Hearing recordings flow from CVP/VH Blob Storage through `em-hrs-ingestor` (a Kubernetes CronJob running every 30 minutes) into `em-hrs-api` for metadata storage, CCD case creation, and authorised playback via share links (72-hour TTL).
- The service is classified as **High** criticality, runs 24/7/365, and is deployed with at least 2 pods per cluster across 2 AKS clusters for auto failover.

## Capability areas

### 1. Document stitching and bundling

Stitching is the most commonly consumed EM capability. It assembles multiple case documents — evidence PDFs, witness statements, expert reports — into a single indexed PDF bundle suitable for a hearing.

**Key services:**

| Service | Role |
|---------|------|
| `em-ccd-orchestrator` | Receives CCD callbacks, resolves bundle configuration, submits tasks to stitching-api, writes the stitched document reference back to CCD |
| `em-stitching-api` | Asynchronous stitching engine — downloads, converts, merges, uploads |

**How bundling works (async path):**

```mermaid
sequenceDiagram
    participant CCD as CCD Data Store
    participant Orc as em-ccd-orchestrator
    participant Stitch as em-stitching-api
    participant CDAM as CDAM

    CCD->>Orc: POST /api/new-bundle (or /api/async-stitch-ccd-bundles)
    Orc->>Orc: Load bundle YAML config, build bundle description
    Orc->>Stitch: POST /api/document-tasks (with callback URL)
    Stitch-->>Orc: 201 Created (taskId)
    Orc-->>CCD: Respond with documentTaskId
    Note over Stitch: Spring Batch picks up task (poll every 6s)
    Stitch->>CDAM: Download source documents
    Stitch->>Stitch: Convert to PDF, merge with PDFBox
    Stitch->>CDAM: Upload stitched PDF
    Stitch->>Orc: POST /api/stitching-complete-callback/{caseId}/{triggerId}/{bundleId}
    Orc->>CCD: Submit event updating caseBundles field
```

The synchronous path (`POST /api/stitch-ccd-bundles`) follows the same flow but the orchestrator polls the stitching-api until the task reaches `DONE` or `FAILED` rather than using a callback.

**Bundle configuration:**

Each jurisdiction ships a YAML configuration file inside `em-ccd-orchestrator` under `src/main/resources/bundleconfiguration/` (26+ configs for IAC, SSCS, ET, PRL, Civil, SPTRIBS, etc.). The CCD event specifies which config to use via `case_data.bundleConfiguration` or `case_data.multiBundleConfiguration`. Configuration defines folder structure, document selectors (JSON Pointers into case data), sort order, cover page templates, pagination style, and table of contents preferences (`em-ccd-orchestrator:src/main/resources/bundleconfiguration/`).

Adding a new bundle configuration requires a code change and redeployment of `em-ccd-orchestrator` — there is no external config volume.

**Stitching-api internals:**

- Tasks are persisted to PostgreSQL as `DocumentTask` entities mapped to `versioned_document_task` (`em-stitching-api:src/main/java/.../domain/DocumentTask.java:26`).
- A Spring Batch job polls every 6 seconds with chunk size 5, using `PESSIMISTIC_WRITE` locking to prevent double-processing across pods (`em-stitching-api:src/main/java/.../config/BatchConfiguration.java:218-225`).
- ShedLock ensures only one pod runs the batch schedule at a time in HA deployments.
- Documents are downloaded in parallel, converted via the converter chain (PDFConverter, DocmosisConverter, ImageConverter), then merged using `PDFMergerUtility` (`em-stitching-api:src/main/java/.../batch/DocumentTaskItemProcessor.java:112-118`).
- CDAM is used when `caseTypeId` and `jurisdictionId` are both set on the task; otherwise the legacy DM Store path is used (`em-stitching-api:src/main/java/.../batch/DocumentTaskItemProcessor.java:110-113`).
- Zero-downtime deployments are supported via task versioning — each task carries the build number of the pod that created it, and workers only process tasks with `version <= their own build number` (`em-stitching-api:src/main/java/.../config/BatchConfiguration.java:218-225`).

### 2. Annotations and redactions

Annotations (highlights, comments, bookmarks) and redactions are managed by two backend services and surfaced through a shared Angular viewer library:

| Service | Role |
|---------|------|
| `em-annotation-api` | Stores and retrieves annotations per document, backed by PostgreSQL. Exposes `/api/annotation-sets` (CRUD), plus resources for individual annotations, comments, rectangles, bookmarks, and tags |
| `em-native-pdf-annotator-app` | Handles redaction markings (`/api/markups`) and final burn-in redaction rendering (`/api/redaction`), integrating with CDAM |
| `em-media-viewer` | Angular library (`@hmcts/media-viewer`) embedded in XUI and service frontends; renders PDFs with annotation and redaction tooling |

The viewer communicates with the backend services via proxy routes configured in the consuming application (typically `/em-anno` for annotations and `/api/markups` for redactions).

**Media Viewer component properties:**

Consuming applications configure `@hmcts/media-viewer` with inputs including:

| Property | Type | Description |
|----------|------|-------------|
| `contentType` | `string` | `pdf` (default), `image`, `video`, `audio` — selects the viewer strategy |
| `url` | `string` | Web-accessible URI of the document (typically a CDAM/DM Store URL) |
| `enableAnnotations` | `boolean` | Enables the annotation layer (retrieves existing, allows creation) |
| `annotationApiUrl` | `string` | Backend route for annotations (default: `em-anno`) |
| `enableRedactions` | `boolean` | Enables redaction markup and burn-to-document |
| `showToolbar` | `boolean` | Show/hide the default toolbar (set `false` to build a custom UI) |

Output events: `mediaLoadStatus` (SUCCESS/FAILURE/UNSUPPORTED), `viewerException`, `toolbarEventsOutput`, `unsavedChanges`.

**Annotation rendering:**

- Annotations use **absolutely positioned DIVs** overlaid on the PDF viewer (not HTML5 Canvas), enabling standard DOM event handling.
- Two modes: **text mode** (highlights selected text) and **draw mode** (box highlights with Hammer.js touch support).
- Redaction reuses the same highlighting mechanism with different CSS classes and backend API routes.
- Bookmarks are stored via the annotations API and use PDF.js location/destination handling for navigation.
- Annotations are private to the creating user, with no way to widen that. `annotation_set` carries a unique constraint on `(created_by, document_id)` (`em-annotation-api:AnnotationSet.java:21-23`), lookups resolve the set through `securityUtils.getCurrentUserLogin()` (`AnnotationSetServiceImpl.java:45,116`), and the service's whole authorisation rule is `requestMatchers("/api/**").authenticated()` (`SecurityConfiguration.java:79`). Two people annotating the same document each get their own set and cannot see each other's work.
<!-- DIVERGENCE: The Confluence LLD describes an Access Management GRANT system for sharing annotations, in which Public grants override user-specific grants. em-annotation-api has no grant entity, endpoint, repository method or Access Management dependency; every read path is filtered by the caller's own IDAM login. Source wins. -->

**Annotation data model** (from `em-annotation-api` REST resources):

- `AnnotationSet` — top-level container scoped to a document
- `Annotation` — a highlight (one or more `Rectangle` elements) with coordinates
- `Comment` — text comment attached to an annotation
- `Bookmark` — PDF.js location-based bookmark for quick navigation
- `Tag` — categorisation label on an annotation

### 3. Hearing recordings

Hearing recordings are captured by CVP (Cloud Video Platform) and VH (Video Hearings) systems and stored in Azure Blob Storage. EM provides the ingest and access layer:

| Service | Role |
|---------|------|
| `em-hrs-ingestor` | Kubernetes CronJob that compares CVP Blob Store contents against what HRS already holds; submits new recordings to `em-hrs-api` |
| `em-hrs-api` | Stores recording metadata in PostgreSQL, creates CCD cases, serves audio/video to authorised users, manages share links, sends reporting emails |

**Scheduling and execution:**

The ingestor is deployed as a **Kubernetes CronJob** on `*/30 * * * *` — every 30 minutes, around the clock, with no off-peak window (`cnp-flux-config:apps/em/em-hrs-ingestor/em-hrs-ingestor.yaml:9`, `prod.yaml:8`). It is controlled by `ENABLE_CRONJOB` (on/off, `prod.yaml:11`) and `MAX_FILES_TO_PROCESS`, which is 50 in the base values and raised to 250 in production (`em-hrs-ingestor.yaml:17`, `prod.yaml:12`). Because each run is capped, a backlog larger than the cap is drained over successive runs rather than in one pass. When triggered, the Spring Boot application starts, runs ingestion once, then calls `System.exit(0)` (`em-hrs-ingestor:src/main/java/.../listener/IngestWhenApplicationReadyListener.java:67`). Parallel operation is forbidden via `concurrencyPolicy: Forbid` (`em-hrs-ingestor:charts/em-hrs-ingestor/values.yaml:10`), though overlapping runs between disconnected clusters will produce warnings but not duplicate data.
<!-- DIVERGENCE: Confluence says ingestor processes back 60 minutes of files; source shows CVP_PROCESS_BACK_TO_DAY=2 (processes back 2 days). Source wins. -->

**Ingestion flow:**

1. Obtain list of all folders in the CVP source container
2. For each folder, call `GET /folders/{name}` on HRS-API to get already-ingested files
3. Diff source files against ingested list; for each new file:
   - Extract metadata using the **Case Data Filename Parser** (jurisdiction, location, case reference, datetime, segment number)
   - `POST /segments` to HRS-API with parsed metadata and source blob URI
4. HRS-API initiates an Azure storage-to-storage copy (no streaming through the application) and creates a CCD case with the recording metadata

**CVP filename format:**

Recordings follow a naming convention parsed by the ingestor:

| Format | Pattern | Matches |
|--------|---------|---------|
| With location code | `SSSS-LLLL-CASEREF_yyyy-MM-dd-HH.mm.ss.SSS-TZ_V` | Location code `0372` or `0266` (Royal Courts of Justice), then any 3-4 digit code (Civil, Family) |
| Without location code | `SSSS-CASEREF_yyyy-MM-dd-HH.mm.ss.SSS-TZ_V` | Everything else, including tribunals |
| Invalid/fallback | Everything left of the timestamp becomes the case reference | Unparseable filenames |

`SSSS` is a four-character service code — three letters then a digit, such as `BBA3` (`FilenameParser.java:19-29`). A four-digit location code has its leading zeros stripped, a three-digit one is kept verbatim (`FilenameParser.java:109-112`). `TZ` is a three-letter zone id fed straight to `ZoneId.of()`, so an unrecognised zone throws rather than defaulting (`FilenameParser.java:157-164`).
<!-- DIVERGENCE: Confluence documents the leading token as a two-character jurisdiction code and lists the two-letter tribunal codes (EE, ES, GR, HWE, IA, PC, SE, TC, WP, EA, AU, IU, LU, TUX, CI, QB, HF, BP, SC, CR) as selecting the without-location format. The parser's leading token is a four-character service code and no two-letter code appears in any of its patterns; those codes are jurisdiction keys used for retention lookup in em-hrs-api, not parser input. Source wins. -->

**HRS-API endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/folders/{name}` | List ingested files for a folder (used by ingestor for diffing) |
| `POST` | `/segments` | Ingest new recording segment (202 accepted, 200 if already copied) |
| `POST` | `/sharees` | Grant a user access to a hearing recording by email; triggers GOV.UK Notify email with download link |
| `GET` | `/hearing-recordings/{recordingId}/segments/{segment}` | Download a recording segment (binary stream) |
| `GET` | `/hearing-recordings/{recordingId}/file/{fileName}` | Download by filename |

**Access control:**

- Allowed IDAM roles: `caseworker-hrs-searcher`, `caseworker-hrs` (`ALLOWED_ROLES`, `em-hrs-api:src/main/resources/application.yaml:149`)
- S2S whitelist: `ccd_gw`, `em_gw`, `em_hrs_ingestor`, `xui_webapp`, `ccd`, `ccd_data`, `ccd_case_disposer` (`S2S_NAMES_WHITELIST`, `application.yaml:103`); the `DELETE /delete` endpoint applies a narrower list of `ccd_case_disposer`, `em_gw` (`application.yaml:220`)
- Share links expire after a configurable TTL, default 72 hours (`shareelink.ttl` / `SHAREE_LINK_TTL`, `application.yaml:157-158`), compared against `sharedOn` in `SegmentDownloadServiceImpl.isAccessValid` (`:227-232`)
- Azure Managed Identity used for blob storage access: the service builds a `DefaultAzureCredential` and signs downloads with a user delegation key rather than an account key (`em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/storage/HearingRecordingStorageImpl.java:266,280-296`). The identity is the shared EM one, `rpa-<env>-mi` — `rpa-prod-mi` in production (`em-hrs-api:infrastructure/main.tf:53-56`)
<!-- CONFLUENCE-ONLY: The IAM role names granted to that identity on the CVP/VH storage account (Storage Blob Data Reader, Storage Blob Delegator) come from Confluence. They are assigned outside the cloned repos, so they cannot be verified in source. -->

**Reporting:**

`em-hrs-api` supports scheduled reporting via ShedLock-managed cron jobs (all disabled by default):
- Summary report, monthly hearing report, weekly hearing report, monthly audit report
- Reports are sent via SMTP (not GOV.UK Notify) to configured recipient lists

### 4. In-court presentation (ICP)

`em-icp-api` is a Node/TypeScript service that provides live document-viewing sessions for courtrooms. A presenter controls which document and page all participants see simultaneously, backed by Azure Web PubSub and Redis pub/sub. The viewer UI is integrated into `em-media-viewer`.

Note: this service is currently archived per its README. The functionality remains deployed but is not actively maintained.

## Service consumers

The following HMCTS services depend on EM capabilities:

| Consumer | EM capabilities used |
|----------|---------------------|
| SSCS | Document Store, Media Viewer, Redaction, Document Bundling, HRS |
| Immigration and Asylum (IAC) | Document Store, Document Bundling, HRS |
| Divorce / No Fault Divorce | Document Store, Media Viewer |
| Financial Remedy | Document Store, Media Viewer |
| Probate | Document Store, Media Viewer |
| Family Public Law (FPLA) | Redaction, Media Viewer |
| Private Law (PRL) | Document Bundling, Media Viewer |
| Civil | Document Bundling, Media Viewer |
| Employment Tribunals (ET) | Document Bundling |
| Special Tribunals (SPTRIBS) | Document Bundling |
<!-- CONFLUENCE-ONLY: not verified in source -->

## Operational characteristics

| Parameter | Value |
|-----------|-------|
| Service criticality | High (Document Store is Critical) |
| Service hours | 24/7/365 |
| DTS support hours | 08:00-18:00 M-F excl. English bank holidays |
| Availability model | 2+ pods per cluster, 2 AKS clusters, auto failover |
| Recovery time | ~2 hours to full restore |
| Maximum bundle size | 1GB (can be increased; higher may cause timeouts) |
| Database backup | Azure geo-replicated; transaction logs every 5 min, differential every 12h, full weekly |
| Data retention | 7 days of backups; recording TTL is resolved per service code, then per jurisdiction code, then from `DEFAULT_TTL` (`P20Y`) |
<!-- CONFLUENCE-ONLY: not verified in source -->

The replica figure is the deployed floor, not a ceiling: each EM Java service is pinned at 2 replicas per cluster with autoscaling to 4, across two clusters (`cnp-flux-config:apps/em/em-anno/em-anno.yaml:10,13`, `apps/em/em-stitching/em-stitching.yaml:10` with `apps/em/em-stitching/prod.yaml:14`, `apps/em/em-ccd-orchestrator/em-ccd-orchestrator.yaml:10` with `apps/em/em-ccd-orchestrator/prod.yaml:11`, `apps/em/em-hrs-api/em-hrs-api.yaml:10,13-14`).

Recording retention resolves in `TtlServiceImpl.createTtl` — a service-code entry wins, then a jurisdiction-code entry, then `DEFAULT_TTL` (`em-hrs-api:TtlServiceImpl.java:25-35`, `application.yaml:211-212`). Those maps are not uniformly 20 years: `CV` and `FM` get 6 years in `ttl_jurisdiction_map.json`, and every `AAA*`/`ABA*` service code gets 6 years in `ttl_service_map.json`. A recording whose filename yields no recognised service code falls through to the 20-year default, so a parse gap silently lengthens retention.

## Integration patterns for service teams

Service teams interact with EM primarily through two integration points:

**Triggering a bundle** — configure a CCD event callback to hit `em-ccd-orchestrator`. The orchestrator is an S2S-authorised service, and the whitelist is per environment. Production admits `sscs`, `ccd`, `ccd_data`, `iac`, `em_stitching_api`, `civil_service`, `prl_cos_api`, `sptribs_case_api`, `et_cos` and `ethos_repl_service` (`cnp-flux-config:apps/em/em-ccd-orchestrator/prod.yaml:15`) — notably not `xui_webapp`, which the in-repo default does allow (`em-ccd-orchestrator:src/main/resources/application.yaml:87`). A new consumer needs a flux change to that list, not just a service definition. Your case definition must include a `caseBundles` complex field and a `bundleConfiguration` field that names the YAML config file.

**Embedding document viewing** — add the `@hmcts/media-viewer` Angular library to your frontend. It handles PDF rendering, annotation CRUD (against `em-annotation-api`), and redaction workflows (against `em-native-pdf-annotator-app`). The library communicates with backend services via proxy routes you configure in your Express/nginx layer.

**Supported file types for document storage:**
<!-- CONFLUENCE-ONLY: not verified in source -->

| Type | Max size | Notes |
|------|----------|-------|
| Video (.MP4) | 500 MB | Download only, streaming not supported |
| Audio (.MP3) | 500 MB | Download only, streaming not supported |
| All other files | 300 MB | PDF, Word, images, etc. |

**Consuming HRS recordings** — HRS roles (`caseworker-hrs-searcher`, `caseworker-hrs`) must be assigned via IDAM. Recordings are accessed through ExUI via CCD case data. Share links (sent via GOV.UK Notify) allow external parties to download specific segments via authenticated download URLs with a 72-hour TTL.

## Authentication

All EM Java services follow the same auth pattern:

- **User auth**: OAuth2 resource server (IDAM JWT) on all `/api/**` endpoints.
- **Service auth**: S2S token validated via `ServiceAuthFilter` before JWT validation.
- Both tokens are required for any API call. Health and Swagger endpoints are open.

## See also

- [Architecture](architecture.md) — detailed service inventory, sequence diagrams, and cross-cutting concerns for all EM components
- [Stitching and Bundling](stitching-and-bundling.md) — deep-dive into the document stitching pipeline, bundle YAML configuration, and CCD callback timeout behaviour
- [Annotation Flow](annotation-flow.md) — how annotations and redactions are stored, rendered, and scoped to users
- [Hearing Recordings](hearing-recordings.md) — the CVP/VH ingest pipeline, access control, and HRS metadata model
- [In-Court Presentation](in-court-presentation.md) — the ICP/PED live-session feature backed by Azure Web PubSub
- [Media Viewer](media-viewer.md) — the `@hmcts/media-viewer` Angular library that surfaces annotations, redactions, and ICP
- [Glossary](../reference/glossary.md) — definitions for CDAM, DocumentTask, HRS, ICP, and other EM terms
