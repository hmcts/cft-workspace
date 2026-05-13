---
title: Trigger Bundle Stitching
topic: stitching
diataxis: how-to
product: em
audience: both
sources:
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/CcdStitchBundleCallbackController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/NewBundleController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/AutomatedCaseUpdater.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/configuration/LocalConfigurationLoader.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/stitching/StitchingService.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/CallbackUrlCreator.java
  - em-ccd-orchestrator:src/main/resources/bundleconfiguration/sscs-bundle-config.yaml
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/service/caseupdater/DefaultUpdateCaller.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/configuration/BundleConfiguration.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/stitching/dto/DocumentImage.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/service/dto/CcdBundlePaginationStyle.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/util/StringUtilities.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/config/Config.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/CcdCloneBundleController.java
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/em/em-ccd-orchestrator/src/main/resources/bundleconfiguration/sscs-bundle-config.yaml
confluence:
  - id: "1201996412"
    title: "Automated Bundling Configuration File Guide"
    last_modified: "unknown"
    space: "RDM"
  - id: "1061126365"
    title: "Bundling Integration Guide"
    last_modified: "unknown"
    space: "RDM"
  - id: "1945632872"
    title: "Addressing CCD timeouts when stitching multiple documents"
    last_modified: "unknown"
    space: "DATS"
  - id: "1473558677"
    title: "CCD Orchestrator API"
    last_modified: "unknown"
    space: "RDM"
  - id: "1011351714"
    title: "Document Bundling & Stitching HLD Release v1.1"
    last_modified: "unknown"
    space: "RDM"
  - id: "1104905433"
    title: "Bundling Version 1.1.0 Configuration Guide"
    last_modified: "unknown"
    space: "RDM"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Trigger document bundle stitching by configuring a CCD callback to call `em-ccd-orchestrator` at `/api/stitch-ccd-bundles` (sync) or `/api/async-stitch-ccd-bundles` / `/api/new-bundle` (async).
- Bundle contents are defined in a YAML config file packaged inside the `em-ccd-orchestrator` JAR under `bundleconfiguration/`.
- The CCD case must have a `caseBundles` collection field and a `bundleConfiguration` (or `multiBundleConfiguration`) field naming the YAML config to use.
- The orchestrator calls `em-stitching-api`, which merges the documents into a single PDF and returns the stitched document URL via CDAM.
- CCD imposes a **10-second callback timeout** -- prefer the async path for large bundles or multiple-bundle scenarios.
- Adding a new bundle config requires a code change to `em-ccd-orchestrator` and a redeploy -- there is no external config volume. Contact `#bundling-integration` on Slack for S2S whitelist changes.

## Prerequisites

- Your service is registered in the `em-ccd-orchestrator` S2S whitelist (`idam.s2s-authorised.services` in `values.yaml:27`). Current callers include: `sscs`, `ccd`, `em_gw`, `ccd_data`, `iac`, `xui_webapp`, `civil_service`, `prl_cos_api`, `sptribs_case_api`, `et_cos`, `ethos_repl_service`, `civil_general_applications`.
- Your CCD case type defines a `Collection<CaseBundle>` field named **`caseBundles`** -- the orchestrator hardcodes this name (`DefaultUpdateCaller.java:51`).
- Your CCD case type defines a text field (or collection) for the bundle configuration filename.

## Steps

### 1. Create a bundle configuration YAML

Add a YAML file under `em-ccd-orchestrator/src/main/resources/bundleconfiguration/`. The file defines bundle structure, folder hierarchy, and document selectors.

```yaml
title: My Service Hearing Bundle
filename: hearing-bundle
filenameIdentifier: /case_details/id
coverpageTemplate: TB-IAC-ENG-00680
hasTableOfContents: true
hasCoversheets: true
hasFolderCoversheets: true
paginationStyle: topLeft
pageNumberFormat: numberOfPages
enableEmailNotification: false
sortOrder:
  - field: /document_filed_date
    order: ascending
folders:
  - name: Applicant Documents
    documents:
      - type: documentSet
        property: /case_data/applicantDocuments
        filters:
          - property: /value/tag
            value: "applicant"
  - name: Respondent Documents
    documents:
      - type: document
        property: /case_data/responseDocument
```

Key fields:

| Field | Purpose | Constraints |
|-------|---------|-------------|
| `title` | Display title of the bundle | Required |
| `filename` | Base filename for the stitched PDF | Alphanumeric only (no special chars). Auto-suffixed with `.pdf` if no extension provided. Defaults to `"stitched.pdf"` if blank (`StringUtilities.java:18-28`). |
| `filenameIdentifier` | JSON Pointer into the CCD payload to prefix the filename (e.g. `/case_details/id`) | Optional; blank means no prefix |
| `coverpageTemplate` | Docmosis template identifier for the PDF cover page | Must be a valid template name registered in the Docmosis repository |
| `hasTableOfContents` | Generate a table of contents page | `true` / `false` |
| `hasCoversheets` | Generate cover sheets before each document | `true` / `false` |
| `hasFolderCoversheets` | Generate cover sheets before each folder | `true` / `false` |
| `paginationStyle` | Page number position | One of: `off`, `topLeft`, `topCenter`, `topRight`, `bottomLeft`, `bottomCenter`, `bottomRight`. Default: `off` |
| `pageNumberFormat` | Format for page numbers | `numberOfPages` (e.g. "Page 3 of 10") or `pageRange` (e.g. "Pages 3-10"). Default: `numberOfPages` |
| `folders` | Ordered list of folders, each containing document selectors | |
| `documents` (in folder) | Either `type: document` (single doc via JSON Pointer) or `type: documentSet` (array with optional filters) | |
| `sortOrder` | Array of `{field, order}` for ordering documents within a folder | `order`: `ascending` or `descending` |
| `enableEmailNotification` | Email the user on success/failure via GOV.UK Notify | `true` / `false` |
| `documentNameValue` | Override the default document name path (`/documentName`) | JSON Pointer, e.g. `/documentFileName` |
| `documentLinkValue` | Override the default document link path (`/documentLink`) | JSON Pointer |
| `customDocument` | Enable custom document type selection | `true` / `false` (default `false`). Must be paired with `customDocumentLinkValue` -- if one is set without the other, bundle creation fails (`BundleConfiguration.java:80`) |
| `customDocumentLinkValue` | Path to an alternative document link (e.g. redacted version) | JSON Pointer; only used when `customDocument: true` |
| `documentImage` | Watermark/image overlay on stitched PDF pages | Object -- see Document Image section below |

#### Document selectors

Document selectors use JSON Pointers into the CCD case payload. For `documentSet`, the `property` points to an array, and optional `filters` apply regex matching (`String.matches()`) against item properties (`BundleFactory.java:226-232`).

Default document field paths are `/documentName` and `/documentLink` unless overridden by `documentNameValue` / `documentLinkValue` in the config (`BundleFactory.java:142, 166`).

**Filter logic**: Multiple filters on a single `documentSet` entry apply as **AND** (all must match). To achieve **OR** logic, create separate `documentSet` entries pointing to the same property path with different filter values.

#### Document image (watermark)

Add a `documentImage` block to overlay an image (e.g. watermark, logo) on PDF pages within the stitched bundle. This does not apply to the index page, cover page, or cover sheets.

```yaml
documentImage:
  docmosisAssetId: hmcts.png        # Image filename in the Docmosis asset repository (include extension)
  imageRenderingLocation: allPages   # allPages | firstPage
  coordinateX: 50                    # 0-100 (percentage of page width)
  coordinateY: 50                    # 0-100 (percentage of page height)
  imageRendering: translucent        # opaque (foreground) | translucent (background)
```

<!-- CONFLUENCE-ONLY: not verified in source -->
Note: If `translucent` is selected, the image may be obscured by other objects on the page due to the way PDF layers are generated.

#### Custom documents

The `customDocument` feature allows a single bundle to include documents from two different link paths -- for example, both "original" and "redacted" versions. When `customDocument: true`, the bundling logic will look for documents at the `customDocumentLinkValue` path first; if not found, it falls back to the standard `documentLinkValue` (or default `/documentLink`).

### 2. Configure the CCD event to set the bundle config filename

In your CCD definition, ensure the event that triggers bundling populates one of:

- **`case_data.bundleConfiguration`** -- a single string naming the YAML file (e.g. `"my-service-bundle-config.yaml"`)
- **`case_data.multiBundleConfiguration`** -- a collection of `{value: "<filename>"}` nodes for multiple bundles

The orchestrator reads these fields in `AutomatedCaseUpdater.java:102-121`. If **both** fields are present, `multiBundleConfiguration` takes precedence. If neither is present, it falls back to a hardcoded map (only `"SSCS" -> "sscs-bundle-config.yaml"`) or the default `"default-config.yaml"`.

Your CCD definition should also include the following complex types in the ComplexTypes tab: `Bundle`, `BundleDocument`, `BundleFolder`, and `BundleSubfolder`. These model the bundle data structure stored in CCD. The `bundleConfiguration` field is typically backed by a FixedList in the CCD definition, allowing caseworkers to select the config file from a dropdown.
<!-- CONFLUENCE-ONLY: not verified in source -->

### 3. Register the CCD callback URL

In your CCD event definition, configure a **mid-event callback** or **about-to-submit callback** pointing to the orchestrator:

| Path | Behaviour |
|------|-----------|
| `POST /api/stitch-ccd-bundles` | Synchronous -- polls `em-stitching-api` until done (max 7 retries, exponential backoff starting at 1s -- sleep increments by `1000 * (i+2)` ms per attempt). Returns the stitched document in the response. |
| `POST /api/async-stitch-ccd-bundles` | Asynchronous -- submits the stitching task and returns immediately with a `documentTaskId`. The orchestrator updates CCD case data via a self-callback when stitching completes. |
| `POST /api/new-bundle` | Asynchronous automated bundling -- same as async but intended for automated/scheduled triggers. |
| `POST /api/clone-ccd-bundles` | Clones an existing bundle to a new bundle (no stitching involved). |

**Choosing sync vs async**: CCD imposes a **10-second timeout** on all callbacks (with up to 3 retries by default). The synchronous path can exceed this limit for large bundles -- real-world measurements show a single stitching operation can take 5-11 seconds depending on document count and whether the stitching service executor is warmed up. **Use the async path** (`/api/async-stitch-ccd-bundles`) for:
- Bundles with many documents or large PDFs
- Multiple bundles in a single event (e.g. English + Welsh, original + redacted)
- Any scenario where exceeding 10s is plausible

For **synchronous** stitching, the response body contains the updated `caseBundles` array with the stitched document URL already populated. Your callback handler receives this directly.

For **asynchronous** stitching, the orchestrator registers a callback URL (`/api/stitching-complete-callback/{caseId}/{triggerId}/{bundleId}`) that `em-stitching-api` calls on completion. The orchestrator then submits a CCD event (`asyncStitchingComplete`) to write the stitched document back into case data. The callback URL is constructed from the `CALLBACK_DOMAIN` environment variable (configured via `callbackUrlCreator.host` in `application.yaml:89`).

### 4. Handle the response

On success, the orchestrator returns a `CcdCallbackResponseDto` with:

```json
{
  "data": {
    "caseBundles": [
      {
        "value": {
          "title": "My Service Hearing Bundle",
          "stitchedDocument": {
            "document_url": "http://dm-store/documents/<uuid>",
            "document_binary_url": "http://dm-store/documents/<uuid>/binary",
            "document_filename": "hearing-bundle.pdf",
            "document_hash": "<hash-token>"
          },
          "eligibleForStitching": "No"
        }
      }
    ]
  },
  "errors": [],
  "warnings": []
}
```

Key points:
- The newly stitched bundle is placed at **index 0** of the `caseBundles` array (`CcdCaseUpdater.java:24-26`).
- `eligibleForStitching` is set to `"No"` after stitching completes.
- If a `hashToken` is returned by stitching-api, it is included in the `CcdDocument` for CDAM access (`StitchingService.java:93-98`).
- On error, the `errors` array is populated and the **original unmodified case data** is returned (`CcdCallbackResponseDto.java:34`).

### 5. Define supporting CCD events (async path)

If using the async stitching path, your CCD case type must define an event with ID **`asyncStitchingComplete`** (`DefaultUpdateCaller.java:39`, `AutomatedStitchingExecutor.java:26`). This event is triggered by the orchestrator when stitching finishes and must be configured to accept the `caseBundles` update without user interaction (i.e. an automated/system event). Without this event, the async callback will fail silently.

The Confluence "Bundling Integration Guide" recommends defining the following standard CCD events for full bundling support:

| Event ID | Purpose |
|----------|---------|
| `createBundle` | Create a new bundle (automated via config or manual via UI) |
| `stitchBundle` | Stitch a created bundle into a single PDF |
| `editBundle` | Amend documents in an existing bundle |
| `cloneBundle` | Copy an existing bundle to a new one |
| `asyncStitchingComplete` | System event for async callback updates |

<!-- CONFLUENCE-ONLY: not verified in source -->

### 6. (Optional) Enable email notifications

Set `enableEmailNotification: true` in your bundle YAML config. The orchestrator will email the triggering user (looked up from IDAM via their JWT) using GOV.UK Notify templates:

- Success: template `58f6384c-64f9-4ddc-a409-259fe04d1836`
- Failure: template `2f133f4e-5adc-418c-9554-b18968db253e`

This requires the `NOTIFICATION_API_KEY` to be set in the orchestrator's environment.

## Verify

1. Trigger the CCD event that invokes your callback. Confirm the event completes without errors in the XUI case view.
2. Check the `caseBundles` tab/field on the case -- the stitched document should appear at position 0 with a valid `stitchedDocument` link.
3. Download the stitched PDF via the document link and confirm it contains the expected documents in the configured folder order.
4. If using the async path, check the orchestrator logs for the `stitching-complete-callback` invocation and confirm the CCD event `asyncStitchingComplete` was submitted successfully.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| HTTP 400 from orchestrator | Exception during stitching or config load | Check `errors` array in response; review orchestrator logs for stack trace |
| `StitchingTaskMaxRetryException` | Stitching-api did not complete within 7 poll attempts (total wait can be ~28s with exponential backoff) | Check `em-stitching-api` health and queue depth; the task may still complete asynchronously. Consider switching to the async endpoint. |
| CCD callback timeout / event fails on submit | Synchronous stitching exceeded CCD's 10-second callback timeout | Switch to `/api/async-stitch-ccd-bundles`. If you must use sync, reduce bundle document count or stitch bundles concurrently from your service before the CCD callback. |
| Bundle config not found | Filename in `bundleConfiguration` does not match any file in `bundleconfiguration/` classpath | Ensure the YAML file is committed and the orchestrator is redeployed |
| `caseBundles` not populated | CCD field name mismatch | The orchestrator hardcodes `"caseBundles"` -- your case type must use exactly this field name |
| Async callback never arrives | `CALLBACK_DOMAIN` not set or unreachable from stitching-api | Verify `CALLBACK_DOMAIN` resolves to the orchestrator's internal hostname in the target environment |
| `customDocument` / `customDocumentLinkValue` error | One field is set without the other | Both `customDocument: true` AND `customDocumentLinkValue` must be configured together; the config validation rejects mismatches |
| HTTP 403 from orchestrator | S2S token rejected | Ensure your service name is in the `idam.s2s-authorised.services` list. Contact `#bundling-integration` on Slack to be added. |

## Example

### Real bundle config: SSCS

The following is the production SSCS bundle configuration from the orchestrator classpath. It is a good reference for a minimal real-world config: two `documentSet` folders, a cover page, and a TOC. Note how separate `documentSet` entries on the same `property` achieve OR-style filtering (each filter entry ANDs, but two entries on the same property produce OR semantics).

```yaml
// Source: apps/em/em-ccd-orchestrator/src/main/resources/bundleconfiguration/sscs-bundle-config.yaml
title: SSCS Bundle Original
filename: SscsBundle
filenameIdentifier: /case_details/id
coverpageTemplate: TB-SCS-LET-ENG-Cover-Letter-IB.docx
hasTableOfContents: true
hasCoversheets: true
hasFolderCoversheets: false
pageNumberFormat: numberOfPages
documentNameValue: /documentFileName
folders:
  - name: FTA
    documents:
      - type: documentSet
        property: /dwpDocuments
        filters:
          - property: /documentType
            value: dwpResponse
      - type: documentSet
        property: /dwpDocuments
        filters:
          - property: /documentType
            value: dwpEvidenceBundle
  - name: Further additions
    documents:
      - type: documentSet
        property: /sscsDocument
        filters:
          - property: /bundleAddition
            value: \w+
      - type: document
        property: /audioVideoEvidenceBundleDocument
```

## See also

- [Stitching and Bundling](../explanation/stitching-and-bundling.md) — explains why the async path exists (CCD 10-second timeout), Spring Batch processing internals, versioned tasks, and full bundle YAML field reference
- [API: Orchestrator](../reference/api-orchestrator.md) — `em-ccd-orchestrator` endpoint reference with request/response shapes, bundle DTO validation rules, and callback flow
- [API: Stitching](../reference/api-stitching.md) — `em-stitching-api` endpoint reference, `DocumentTask` lifecycle, and callback mechanism
- [Local Development with cftlib](local-development-cftlib.md) — how to run `em-stitching-api` locally and test end-to-end stitching without deploying to AAT
