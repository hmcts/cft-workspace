---
topic: stitching
audience: both
sources:
  - libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java
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
         │                          │  GET /documents/{id}/binary
         │                          ▼
         │                       dm-store
         │                          │
         │                          │  POST /documents (stitched PDF)
         │                          ▼
         │                       dm-store
         ▼
   service-api writes Document reference to CCD case data
```

<!-- CONFLUENCE-ONLY: pipeline shape (Spring Batch job, dm-store interaction) sourced from RCCD/Docstore-Doc Stitching Interaction page; em-stitching-api / em-ccd-orchestrator repos are not cloned in this workspace so endpoint paths are not source-verified. -->

### The two services

- **em-ccd-orchestrator** — orchestrates callbacks from CCD relating to management and stitching of bundles. Exposes the bundle/stitching control plane.
- **em-stitching-api** — headless service that executes the actual stitching as a Spring Batch job; exposes a `DocumentTasks` resource.

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

These are observed in production traffic logs (Application Insights, July–Oct 2022). The em-ccd-orchestrator and em-stitching-api repos are not cloned in this workspace, so paths below are from Confluence Swagger references rather than source.

### em-ccd-orchestrator

| Endpoint | Purpose | Sync? |
| --- | --- | --- |
| `POST /api/stitch-ccd-bundles` | Create and stitch a CCD bundle. | Sync |
| `POST /api/async-stitch-ccd-bundles` | Create and stitch a CCD bundle. | Async |
| `POST /api/new-bundle` | Create a bundle; response does **not** include the stitched document URL. | Async |
| `POST /api/clone-ccd-bundles` | Clone an existing bundle. | — |
| `POST /api/stitching-complete-callback/{caseId}/{triggerId}/{bundleId}` | Internal callback used by the stitching pipeline to update the stitched document details and stitched status against the case in CCD. | — |

Observed prod peak loads (per hour): `stitch-ccd-bundles` 367, `new-bundle` 149, `stitching-complete-callback` 287. The async variants (`async-stitch-ccd-bundles`, `clone-ccd-bundles`) had zero observed traffic.

### em-stitching-api

| Endpoint | Purpose |
| --- | --- |
| `POST /api/document-tasks` | Create a document task (a stitch job). |
| `GET /api/document-tasks/{id}` | Get an existing document task — used to poll for completion. |

<!-- CONFLUENCE-ONLY: endpoint paths and workload metrics from RQA Workload Model pages (data is from 2022); not verified against em-stitching-api or em-ccd-orchestrator source. -->

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

- [`docs/ccd/explanation/documents.md`](documents.md) — CDAM document upload and access
- [`docs/ccd/explanation/callbacks.md`](callbacks.md) — callback timeout and retry behaviour
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definition of Document complex type
