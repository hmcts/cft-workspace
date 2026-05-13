# Evidence Management (EM) documentation

Evidence Management is the document processing and presentation platform for HMCTS CFT services. It provides four capability areas: document stitching and bundling (assembling multiple case documents into a single PDF for hearings), in-document annotations and redactions (via `@hmcts/media-viewer`), in-court presentation (live document-view synchronisation across participants), and hearing recording ingest, storage, and playback. Consumer services — Civil, IAC, SSCS, PRL, FPLA, and others — integrate with EM during case preparation and hearing workflows.

This documentation covers the full EM product: nine repos, four capability areas, and the integration patterns needed to onboard a new service. It follows [Diátaxis](https://diataxis.fr/) structure across explanations, how-to guides, and reference pages. The intended audience is HMCTS engineers building or maintaining EM components and service teams integrating EM capabilities into their CCD-based services.

---

## Reading order

For someone new to Evidence Management:

1. [Overview](explanation/overview.md) — what EM is, its four capability areas, who consumes it, and authentication patterns
2. [Architecture](explanation/architecture.md) — service inventory, sequence diagrams, cross-cutting concerns, and non-functional requirements
3. [Stitching and Bundling](explanation/stitching-and-bundling.md) — the most-used EM capability in depth
4. [Annotation Flow](explanation/annotation-flow.md) — how annotations and redactions work end-to-end
5. [Media Viewer](explanation/media-viewer.md) — the Angular library that surfaces annotations and ICP in frontends

---

## By topic

### Core concepts

- [Overview](explanation/overview.md) — product summary, capability areas, service consumers, and operational characteristics
- [Architecture](explanation/architecture.md) — service inventory, mermaid flow diagrams, CCD bundle data model, and cross-cutting concerns

### Document stitching and bundling

- [Stitching and Bundling](explanation/stitching-and-bundling.md) — bundle YAML configuration, Spring Batch processing pipeline, CCD callback timeout, versioned tasks, and ShedLock

### Annotations, redactions, and document viewing

- [Annotation Flow](explanation/annotation-flow.md) — `em-annotation-api` data model, redaction rendering path, proxy configuration, and user-scoping rules
- [Media Viewer](explanation/media-viewer.md) — `@hmcts/media-viewer` Angular library: viewer types, toolbar customisation, ICP integration, and NPM publishing

### Hearing recordings

- [Hearing Recordings](explanation/hearing-recordings.md) — CVP/VH ingest pipeline, `FilenameParser`, HRS access control, blob copy, CCD integration, and notification emails

### In-court presentation

- [In-Court Presentation](explanation/in-court-presentation.md) — ICP/PED session lifecycle, Azure Web PubSub architecture, presenter control, and known gotchas (archived service)

---

## How-to recipes

- [Trigger Bundle Stitching](how-to/trigger-bundle-stitching.md) — configure a CCD event callback, write a bundle YAML, handle sync and async responses, troubleshoot common errors
- [Add Annotations](how-to/add-annotations.md) — create annotation sets, add annotations with comments and rectangles, manage bookmarks, set rotation metadata
- [Embed Media Viewer](how-to/embed-media-viewer.md) — install `@hmcts/media-viewer`, configure `angular.json` assets, import `MediaViewerModule`, wire proxy routes, customise toolbar
- [Local Development with cftlib](how-to/local-development-cftlib.md) — run any of the four EM Java services locally with `bootWithCCD`, test end-to-end flows

---

## Reference

- [API: Orchestrator](reference/api-orchestrator.md) — `em-ccd-orchestrator` endpoints, CCD callback format, bundle configuration reference, sync/async flow, and bundle state flags
- [API: Stitching](reference/api-stitching.md) — `em-stitching-api` endpoints, `DocumentTask` lifecycle, callback mechanism, bundle and `BundleDocument` field reference
- [API: Annotation](reference/api-annotation.md) — `em-annotation-api` full endpoint surface: annotation sets, annotations, comments, rectangles, bookmarks, tags, metadata, and deletion
- [API: HRS](reference/api-hrs.md) — `em-hrs-api` ingest, download, sharing, and deletion endpoints; domain model; filename-parsing patterns; TTL configuration; role assignments

---

## Glossary

[Glossary](reference/glossary.md) — definitions for `AnnotationSet`, `Bundle`, `caseBundles`, `CDAM`, `CVP`, `DocumentTask`, `Docmosis`, `FilenameParser`, `HRS`, `ICP`/`PED`, `PDFMerger`, `Redaction`, `rse-cft-lib`, `S2S`, `ShedLock`, `Spring Batch`, `TaskState`, `versioned_document_task`, `VH`, and more.
