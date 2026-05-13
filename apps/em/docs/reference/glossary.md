---
title: Glossary
topic: reference
diataxis: reference
product: em
audience: both
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
---

# Evidence Management Glossary

## AnnotationSet

The top-level container for a user's annotations on a single document. One `AnnotationSet` exists per (user, document) pair, enforced by a unique database constraint. Contains N `Annotation` entities, each with `Comment` and `Rectangle` children.

See: [Annotation Flow](../explanation/annotation-flow.md), [API: Annotation](api-annotation.md)

---

## Annotation

A highlight, area box, point marker, or textbox placed on a document by a user. Stored in `em-annotation-api`. Supported types: `AREA`, `HIGHLIGHT`, `POINT`, `TEXTBOX`. Private to the creating user by default.

See: [Annotation Flow](../explanation/annotation-flow.md), [API: Annotation](api-annotation.md)

---

## asyncStitchingComplete

The CCD event ID that the orchestrator fires when an asynchronous stitching task finishes. Service teams must define this event in their CCD case type definition for the async stitching path to work.

See: [Trigger Bundle Stitching](../how-to/trigger-bundle-stitching.md), [API: Orchestrator](api-orchestrator.md)

---

## Azure Web PubSub

The managed WebSocket fan-out service used by `em-icp-api` to broadcast screen-position updates to all ICP session participants in real time. HMCTS's first use of this Azure service.

See: [In-Court Presentation](../explanation/in-court-presentation.md)

---

## Bookmark

A named, per-user page marker on a document stored by `em-annotation-api`. Supports a tree structure via `parent` and `previous` fields. Navigated using PDF.js destination handling in `em-media-viewer`.

See: [API: Annotation](api-annotation.md), [Media Viewer](../explanation/media-viewer.md)

---

## Bundle

A collection of case documents assembled for a hearing. In CCD, a `Bundle` is a complex type stored in the `caseBundles` field. Contains folders, documents, a stitched PDF reference, and status flags such as `eligibleForStitching` and `stitchStatus`.

See: [Stitching and Bundling](../explanation/stitching-and-bundling.md), [API: Orchestrator](api-orchestrator.md)

---

## bundleConfiguration

A CCD case data field containing the filename of the YAML bundle configuration to use when triggering stitching. Read by `em-ccd-orchestrator` from `case_data.bundleConfiguration`. See also `multiBundleConfiguration` for multiple bundles.

See: [Trigger Bundle Stitching](../how-to/trigger-bundle-stitching.md), [Stitching and Bundling](../explanation/stitching-and-bundling.md)

---

## caseBundles

The hardcoded CCD case data field name that `em-ccd-orchestrator` reads and writes. Service teams must name their CCD `Collection<CaseBundle>` field exactly `caseBundles` for bundling to work.

See: [API: Orchestrator](api-orchestrator.md), [Trigger Bundle Stitching](../how-to/trigger-bundle-stitching.md)

---

## CDAM (Case Document Access Management)

`ccd-case-document-am-api` — the document access gateway sitting in front of the document store. EM services (`em-stitching-api`, `em-ccd-orchestrator`, `em-native-pdf-annotator-app`) use CDAM for document download and upload. The CDAM path is used when both `caseTypeId` and `jurisdictionId` are present on a `DocumentTask`.

See: [Architecture](../explanation/architecture.md), [API: Stitching](api-stitching.md)

---

## CVP (Cloud Video Platform)

The tactical COVID-era video recording system used by HMCTS. CVP stores hearing recordings in Azure Blob Storage. `em-hrs-ingestor` polls CVP blob containers and submits new recordings to `em-hrs-api`. Being superseded by VH (Video Hearings).

See: [Hearing Recordings](../explanation/hearing-recordings.md), [API: HRS](api-hrs.md)

---

## DocumentTask

The JPA entity persisted to the `versioned_document_task` PostgreSQL table representing a single stitching job. States: `NEW` → `IN_PROGRESS` → `DONE` | `FAILED`. Carries a `version` field (build number) for zero-downtime deployments.

See: [Stitching and Bundling](../explanation/stitching-and-bundling.md), [API: Stitching](api-stitching.md)

---

## Docmosis

A commercial document generation and conversion service. Used by `em-stitching-api` to convert Word, Excel, PowerPoint, RTF, and plain-text files to PDF before merging. Also renders cover-page and folder-coversheet templates for bundles.

See: [Stitching and Bundling](../explanation/stitching-and-bundling.md), [API: Stitching](api-stitching.md)

---

## em-annotation-api

Spring Boot service storing and retrieving document annotations and bookmarks, backed by PostgreSQL. S2S name: `em_annotation_app`. Exposes `/api/annotation-sets`, `/api/annotations`, `/api/bookmarks`, `/api/metadata`, and related sub-resource endpoints.

See: [Annotation Flow](../explanation/annotation-flow.md), [API: Annotation](api-annotation.md)

---

## em-ccd-orchestrator

Stateless Spring Boot mediator that receives CCD callback events, loads bundle YAML configuration, and submits `DocumentTask` jobs to `em-stitching-api`. S2S name: `em_ccd_orchestrator`. Port 8080. No database.

See: [Architecture](../explanation/architecture.md), [API: Orchestrator](api-orchestrator.md)

---

## em-hrs-api

Spring Boot Hearing Recording Service API. Stores recording metadata in PostgreSQL, manages Azure blob copies from CVP/VH, creates CCD cases, and serves audio/video segments to authorised users. S2S name: `em_hrs_api`.

See: [Hearing Recordings](../explanation/hearing-recordings.md), [API: HRS](api-hrs.md)

---

## em-hrs-ingestor

Kubernetes CronJob Spring Boot application that polls CVP/VH Azure Blob Stores, diffs against what HRS already holds, and submits new recordings to `em-hrs-api`. Runs once per invocation then exits. S2S name: `em_hrs_ingestor`.

See: [Hearing Recordings](../explanation/hearing-recordings.md), [API: HRS](api-hrs.md)

---

## em-icp-api

Node.js/TypeScript Express service managing In-Court Presentation (ICP/PED) sessions. Backed by Azure Web PubSub and Redis. Repository is archived but remains deployed.

See: [In-Court Presentation](../explanation/in-court-presentation.md)

---

## em-media-viewer

Angular NPM library (`@hmcts/media-viewer`) for rendering documents (PDF, images, multimedia) with annotation, redaction, and ICP overlays. Consumed by XUI and service-team frontends.

See: [Media Viewer](../explanation/media-viewer.md), [Embed Media Viewer](../how-to/embed-media-viewer.md)

---

## em-native-pdf-annotator-app

Spring Boot service handling redaction markup persistence (`/api/markups`) and final redaction burn-in rendering (`/api/redaction`) via iText. Integrates with CDAM for document access. S2S name: `em_npa_app`.

See: [Annotation Flow](../explanation/annotation-flow.md), [API: Annotation](api-annotation.md)

---

## em-stitching-api

Spring Boot PDF stitching engine using Apache PDFBox and Docmosis. Processes `DocumentTask` jobs asynchronously via Spring Batch with ShedLock distributed locking. Port 4630. S2S name: `em_stitching_api`.

See: [Stitching and Bundling](../explanation/stitching-and-bundling.md), [API: Stitching](api-stitching.md)

---

## FilenameParser

Java class in `em-hrs-ingestor` that extracts hearing metadata (service code, location code, case reference, datetime, segment number) from CVP/VH recording filenames using four regex patterns applied in priority order.

See: [Hearing Recordings](../explanation/hearing-recordings.md), [API: HRS](api-hrs.md)

---

## HRS (Hearing Recording Service)

The collective name for the `em-hrs-api` + `em-hrs-ingestor` pipeline that ingests, stores, and serves hearing recordings. Recordings are sourced from CVP and VH.

See: [Hearing Recordings](../explanation/hearing-recordings.md), [API: HRS](api-hrs.md)

---

## ICP (In-Court Presentation) / PED (Presenting Evidence Digitally)

Feature allowing a presenter to synchronise the document view (page, scroll, rotation) across all hearing participants in real time. Implemented by `em-icp-api` (backend) and `em-media-viewer` (frontend). Rebranded from ICP to PED in recent releases.

See: [In-Court Presentation](../explanation/in-court-presentation.md), [Media Viewer](../explanation/media-viewer.md)

---

## Metadata (rotation)

A per-document record stored by `em-annotation-api` holding the `rotationAngle` chosen by a user, enabling consistent document orientation for all subsequent viewers. Feature-toggled via `ENABLE_METADATA_ENDPOINT`.

See: [Annotation Flow](../explanation/annotation-flow.md), [API: Annotation](api-annotation.md)

---

## PdfPosition

TypeScript interface in `em-media-viewer` representing the current viewport state: `pageNumber`, `scale`, `top`, `left`, `rotation`. Broadcast over the ICP WebSocket connection as the `UPDATE_SCREEN` event payload.

See: [In-Court Presentation](../explanation/in-court-presentation.md), [Media Viewer](../explanation/media-viewer.md)

---

## PDFMerger / PDFMergerUtility

The Apache PDFBox utility used by `em-stitching-api` to concatenate source PDFs (after conversion) into the final stitched bundle. Handles cover pages, table-of-contents, watermarks, and per-document pagination.

See: [Stitching and Bundling](../explanation/stitching-and-bundling.md)

---

## Redaction

The process of permanently obscuring content in a document. In EM, redaction markings are stored by `em-native-pdf-annotator-app` (`/api/markups`); the final irreversible burn-in is triggered by `POST /api/redaction`, which draws black rectangles on the PDF using iText and returns the redacted file.

See: [Annotation Flow](../explanation/annotation-flow.md), [Media Viewer](../explanation/media-viewer.md)

---

## rse-cft-lib / bootWithCCD

The Gradle plugin (`rse-cft-lib`) and its `bootWithCCD` task that runs a full CFT stack (CCD, IDAM, S2S, AM) in-process alongside an EM service for local development. Supported by `em-stitching-api`, `em-annotation-api`, `em-native-pdf-annotator-app`, and `em-hrs-api`.

See: [Local Development with cftlib](../how-to/local-development-cftlib.md)

---

## S2S (Service-to-Service)

Token-based authentication mechanism (`service-auth-provider-java-client`) used for inter-service calls. Each EM service has a registered microservice name (e.g. `em_stitching_api`, `em_annotation_app`) and a whitelist of caller services.

See: [Architecture](../explanation/architecture.md), [Overview](../explanation/overview.md)

---

## ShedLock

JDBC-backed distributed locking library used by `em-stitching-api` and `em-hrs-api` to ensure scheduled batch jobs run on only one pod at a time in HA deployments.

See: [Stitching and Bundling](../explanation/stitching-and-bundling.md), [Architecture](../explanation/architecture.md)

---

## Spring Batch

The scheduling and processing framework used by `em-stitching-api` to poll for new `DocumentTask` records every 6 seconds and process them in chunks of 5 with pessimistic-write locking.

See: [Stitching and Bundling](../explanation/stitching-and-bundling.md), [API: Stitching](api-stitching.md)

---

## TaskState

Enum in `em-stitching-api` with values `NEW`, `IN_PROGRESS`, `DONE`, `FAILED`. Tracks the lifecycle of a `DocumentTask` through the Spring Batch processing pipeline.

See: [API: Stitching](api-stitching.md), [Stitching and Bundling](../explanation/stitching-and-bundling.md)

---

## versioned_document_task

The PostgreSQL table backing `DocumentTask` entities in `em-stitching-api`. The `version` column (set to the deploying build number) enables zero-downtime rolling deployments by ensuring old-version pods only process tasks they created.

See: [Stitching and Bundling](../explanation/stitching-and-bundling.md), [API: Stitching](api-stitching.md)

---

## VH (Video Hearings)

The strategic replacement for CVP. VH also records hearings to Azure Blob Storage. `em-hrs-ingestor` supports ingestion from both CVP and VH sources; `HearingSource` enum values: `CVP`, `VH`.

See: [Hearing Recordings](../explanation/hearing-recordings.md), [API: HRS](api-hrs.md)
