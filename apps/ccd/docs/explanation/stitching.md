---
topic: stitching
audience: both
sources:
  - libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/rest/DocumentTaskResource.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/config/BatchConfiguration.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/service/impl/DmStoreDownloaderImpl.java
  - em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/service/impl/DmStoreUploaderImpl.java
  - em-stitching-api:src/main/resources/application.yaml
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/CcdStitchBundleCallbackController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/NewBundleController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/CcdCloneBundleController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/StitchingCompleteCallbackController.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1224769548"
    title: "D.2.3e Document Stitching"
    space: "DACS"
  - id: "1626282109"
    title: "EM CCD Orchestrator Workload Model"
    space: "RQA"
  - id: "1626281237"
    title: "Stitching Workload Model"
    space: "RQA"
  - id: "1478708296"
    title: "Docstore- Doc Stitching Interaction"
    space: "RCCD"
  - id: "1945632872"
    title: "Addressing CCD timeouts when stitching multiple documents"
    space: "DATS"
  - id: "1114964598"
    title: "EM DM - Bundling & Stitching"
    space: "RQA"
title: Stitching
diataxis: explanation
product: ccd
sources_sha:
  "libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java": "013ed140d477b8ef8ea079619d0b6e0a96d89fa2"
  "em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/rest/DocumentTaskResource.java": "b947f251eaf22b670a2701193fd2bbd3cadb5ec1"
  "em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/config/BatchConfiguration.java": "305d667570e24bd9d0b98f5a48c5be1c3563f259"
  "em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/service/impl/DmStoreDownloaderImpl.java": "0fcf36d48857753416d60e626744567e9df3170a"
  "em-stitching-api:src/main/java/uk/gov/hmcts/reform/em/stitching/service/impl/DmStoreUploaderImpl.java": "0fcf36d48857753416d60e626744567e9df3170a"
  "em-stitching-api:src/main/resources/application.yaml": "b4fa29544c90897df72b4f8376efe1600cc4c154"
  "em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/CcdStitchBundleCallbackController.java": "5bc8c4fda1c1b561846b3d960398f7fc86700ac5"
  "em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/NewBundleController.java": "76f50f2a1fff38d4500c39030ff043f132ff9f59"
  "em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/CcdCloneBundleController.java": "5bc8c4fda1c1b561846b3d960398f7fc86700ac5"
  "em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/StitchingCompleteCallbackController.java": "6c1a512c71e548439d96afbe0645b3521685081a"
---

# Stitching

## TL;DR

- Stitching is the physical merging of a bundle of documents into a single PDF, performed by `em-stitching-api`. CCD itself stores **only document references** — never the bundle contents or the stitched output.
- Two services collaborate: `em-ccd-orchestrator` is the CCD-facing entry point that builds and tracks bundles; `em-stitching-api` does the actual PDF assembly via a Spring Batch job.
- Calling services trigger stitching from their own callbacks (typically `aboutToSubmit`) by POSTing a bundle descriptor. CCD has no native stitching hook — it's external integration owned by each service.
- The stitched output is written back into a CCD field of type `Document` (SDK built-in `Document.java`).
- Stitching is slow enough (5–20+ s for typical bundles) that it routinely fights the **10-second CCD callback timeout** — services use async patterns, parallel calls, or template merging to stay under it.

## Architecture

Stitching is **not** a CCD platform feature. The CCD codebase (data-store, definition-store, ccd-config-generator SDK, AAC) contains no stitching hooks, callbacks, or special field types for it. It's a pair of external Evidence Management services that any service can integrate with from within its own CCD callback handlers.

```
   service-api (e.g. ia-case-documents-api)
         │
         │  POST  bundle descriptor
         ▼
   em-ccd-orchestrator ────► em-stitching-api (Spring Batch)
         │                          │
         │                          │  GET /documents/{id} → follow _links.binary
         │                          ▼
         │                       dm-store
         │                          │
         │                          │  POST /documents (stitched PDF)
         │                          ▼
         │                       dm-store
         ▼
   service-api writes Document reference to CCD case data
```

### The two services

- **em-ccd-orchestrator** — orchestrates callbacks from CCD relating to management and stitching of bundles. Exposes the bundle/stitching control plane.
- **em-stitching-api** — headless service that executes the actual stitching as a Spring Batch job; exposes a `DocumentTasks` resource.

### Stitching is not triggered by the request that asks for it

`POST /api/document-tasks` only inserts a `DocumentTask` row in state `NEW` and returns 201 (`DocumentTaskResource.java:70`, `:75-76`). The work is picked up out-of-band by a Spring Batch job on a fixed-delay tick — `DOCUMENT_TASK_MILLISECONDS`, **default 6000 ms** (`BatchConfiguration.java:108`, `application.yaml:43`) — which reads `taskState = 'NEW'` in chunks of 5, oldest first, under a `PESSIMISTIC_WRITE` lock (`BatchConfiguration.java:196-201`, `:246-248`). A ShedLock annotation keyed on `task.env` (`:109`) means only one pod runs the job at a time, so the tick does not scale out with replica count.

Two consequences worth designing around:

- **There is a floor on latency.** Even a trivial single-page stitch cannot complete faster than the next tick, so sub-second stitching is not available at any bundle size.
- **Tasks are gated on build number.** The reader filters `t.version <= buildInfo.getBuildNumber()` (`:198`). A task created by a newer deployment is invisible to older pods still running — which is what makes the queue safe to drain across a rolling deploy, but also means a task can sit in `NEW` indefinitely if the build that created it is rolled back.

Callback dispatch is a **separate** batch job, not part of the stitch: `processDocumentCallbackJob` reads tasks in `DONE`/`FAILED` whose callback is still `NEW`, ordered by `lastModifiedDate`, page size 5 (`:211-223`, `:262-267`). A stitch can therefore be complete in dm-store before the calling service has been told.

### What the pipeline does to dm-store

On the way in, the downloader fetches each document's metadata and follows `_links.binary.href` rather than constructing a binary path itself (`DmStoreDownloaderImpl.java:79-85`). On the way out there are two distinct paths (`DmStoreUploaderImpl.java:52-57`):

| Bundle state | Call |
| --- | --- |
| No `stitchedDocumentURI` yet | `POST {dm-store}/documents`, multipart `files` (`:78-83`) |
| Already stitched once | `POST` to the existing `stitchedDocumentURI` — a dm-store new-version upload, multipart `file` (singular) (`:132-137`) |

Note the form field name changes between the two (`files` vs `file`), and that a re-stitch **replaces the document version in place** rather than creating a new document — so the CCD field's `document_url` stays valid across re-stitches.

<!-- DIVERGENCE: the RCCD "Docstore-Doc Stitching Interaction" page shows the stitched upload as an unclassified POST /documents. Source hard-codes classification=PUBLIC on the multipart body (DmStoreUploaderImpl.java:66) irrespective of the classification of the source documents being bundled. Source wins. -->

## When services use stitching

Stitching is used when a case event must bundle several uploaded files into one renderable document — for example, combining a coversheet with an application PDF before serving to a respondent, or bundling a hearing pack of 200–1000 pages from many separate uploads.

Real-world IAC example (production, 7 source documents — 2 Word + 5 PDF, 298 pages, ~70 MB): full stitch took **21.28 s** end-to-end. A 1000-page bundle is estimated around 1 minute.

Per-service typical bundle sizes (page counts):

| Service | Typical bundle size |
| --- | --- |
| SSCS | 300–500 pages |
| CMC | 200 pages |
| IAC | 200–1000 pages |

<!-- CONFLUENCE-ONLY: page-count guidance sourced from EM DM Bundling & Stitching (RQA); not source-verified. -->

The calling service workflow:

1. Collects document references from case data (each is a `Document` with `url` + `binaryUrl`).
2. Posts a bundle descriptor to `em-ccd-orchestrator` (`/api/stitch-ccd-bundles` or `/api/new-bundle`).
3. Polls `em-stitching-api` (`GET /api/document-tasks/{id}`) or awaits the orchestrator's `stitching-complete-callback` until the stitched document URL is returned.
4. Writes the returned `Document` back to a CCD field via an `aboutToSubmit` callback.

## API endpoints

Every path below is verified against the two repos' controllers at `origin/master`. The traffic figures are from production Application Insights, July–Oct 2022, and are the only part of this section not source-derived.

### em-ccd-orchestrator

| Endpoint | Purpose | Sync? | Source |
| --- | --- | --- | --- |
| `POST /api/stitch-ccd-bundles` | Create and stitch a CCD bundle. | Sync | `CcdStitchBundleCallbackController.java:37` |
| `POST /api/async-stitch-ccd-bundles` | Create and stitch a CCD bundle. | Async | `CcdStitchBundleCallbackController.java:58` |
| `POST /api/new-bundle` | Create a bundle; response does **not** include the stitched document URL — it is written back to the bundle in CCD asynchronously by the stitching API. | Async | `NewBundleController.java:32-37` |
| `POST /api/clone-ccd-bundles` | Clone an existing bundle. | — | `CcdCloneBundleController.java:33` |
| `POST /api/stitching-complete-callback/{caseId}/{triggerId}/{bundleId}` | Internal callback used by the stitching pipeline to update the stitched document details and stitched status against the case in CCD. Body is a `DocumentTaskDTO`. | — | `StitchingCompleteCallbackController.java:52-54`, `:78-83` |

All five take the IDAM bearer and S2S tokens as `authorization` / `serviceauthorization` headers, both marked `required = true`, and all document `403 Access Denied`.

Observed prod peak loads (per hour): `stitch-ccd-bundles` 367, `new-bundle` 149, `stitching-complete-callback` 287. The async variants (`async-stitch-ccd-bundles`, `clone-ccd-bundles`) had zero observed traffic.

### em-stitching-api

Both are under a class-level `@RequestMapping("/api")` (`DocumentTaskResource.java:42`).

| Endpoint | Purpose | Success | Source |
| --- | --- | --- | --- |
| `POST /api/document-tasks` | Create a document task (a stitch job). Enqueues only — see above. | 201 | `DocumentTaskResource.java:64-76` |
| `GET /api/document-tasks/{id}` | Get an existing document task — used to poll for completion. | 200 | `DocumentTaskResource.java:129-147` |

<!-- CONFLUENCE-ONLY: the workload metrics in this section (peak loads, page counts) come from the RQA Workload Model pages and are from 2022; there is no source equivalent. -->

## Data shape

The SDK `Document` type used to hold the stitched result, with all current fields:

```json
{
  "document_url": "https://dm-store/documents/<uuid>",
  "document_binary_url": "https://dm-store/documents/<uuid>/binary",
  "document_filename": "stitched-bundle.pdf",
  "category_id": "stitched",
  "upload_timestamp": "2026-04-29T10:00:00"
}
```

In ccd-config-generator the field is declared as type `Document` — see [`sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java`](../../../libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java). The SDK type is annotated `@ComplexType(name = "Document", generate = false)` — CCD already knows the type, so the SDK doesn't generate a definition for it.

Note: the older 3-arg and 4-arg constructors are deprecated since 2026-02-18 (`@Deprecated`). New code should use the builder or the all-args constructor that includes `uploadTimestamp`.

### `DocumentTaskDTO` and bundle descriptor

The full `DocumentTaskDTO` and bundle JSON schemas live inside the em-stitching-api / em-ccd-orchestrator repos and are documented in their Swagger UIs:

- `em-stitching-perftest.service.core-compute-perftest.internal/swagger-ui/index.html`
- `em-ccd-orchestrator-perftest.service.core-compute-perftest.internal/swagger-ui/index.html`

Neither repo is cloned in this workspace, so the exact DTO field set is not reproduced here. <!-- CONFLUENCE-ONLY: links above; not source-verified. -->

## The 10-second callback timeout problem

CCD imposes a **10-second timeout** on every callback, with up to 3 retries (each subject to the same 10-second timeout). Stitching multiple bundles inside an `aboutToSubmit` callback can blow this budget.

Concrete IAC example (List case event for detained appeals, two stitched bundles): full callback took **15.885 s** — over the limit. Breakdown of bundle 1 (cold path):

| Stage | Duration |
| --- | --- |
| documents-api -> em-ccd-orchestrator | 10.86 s |
| em-ccd-orchestrator → em-stitching-api | 0.36 s |
| em-stitching-api processes task | 5.54 s |
| em-ccd-orchestrator polling delay | 5.1 s |

Two factors dominate latency:

- **~5 s batch-processing delay** before the stitching Spring Batch job picks up a new task.
- **~1 s polling interval** by em-ccd-orchestrator against em-stitching-api after the job completes.

Bundle 2 in the same request took 1.3 s because the executor was warmed up.

### Mitigations services use

1. **Merge upstream templates** — combine multiple Docmosis templates into one so no stitching is needed at all. Cleanest fix; downside is page-break control becomes awkward.
2. **Parallel orchestrator calls** — when multiple bundles must be stitched, fire the calls concurrently rather than sequentially to halve wall time.
3. **Async stitching** — use `POST /api/async-stitch-ccd-bundles` or post via `new-bundle` and let the `stitching-complete-callback` write back the result asynchronously, so the original event submit returns immediately.

<!-- CONFLUENCE-ONLY: timing breakdown and mitigation strategies from DATS page "Addressing CCD timeouts when stitching multiple documents"; specific to ia-case-documents-api but the timeout itself is a general CCD constraint. -->

## Bundle composition

A bundle can mix file types — Word, PDF, image. Non-PDF inputs are converted to PDF via Docmosis at the stitching stage. The stitched output may include an index page and cover sheets if configured.

Tested Docmosis conversion limit: **4 MB per source file**. <!-- CONFLUENCE-ONLY: from EM DM Bundling & Stitching (RQA); date of test not recorded. -->

## What CCD stores vs what stitching stores

| Data | Stored where |
| --- | --- |
| Source document binaries | dm-store |
| Stitched PDF binary | dm-store (uploaded by stitching pipeline via `POST /documents`) |
| Bundle descriptor (list of source URIs, options) | em-stitching-api DB |
| Document hash during stitching window | em-stitching-api DB (replaced by CCD's hash once the document is associated with the case) |
| Document references in case data | CCD (`Document` complex type — `url`, `binaryUrl`, `filename`, `category_id`, `upload_timestamp`) |

CCD case data **never** contains binary content — only references. <!-- CONFLUENCE-ONLY: hash-handover detail from RCCD Docstore-Doc Stitching Interaction. -->

## See also

- [`apps/ccd/docs/explanation/documents.md`](documents.md) — CDAM document upload and access
- [`apps/ccd/docs/explanation/callbacks.md`](callbacks.md) — callback timeout and retry behaviour
- [`apps/ccd/docs/reference/glossary.md`](../reference/glossary.md) — definition of Document complex type
