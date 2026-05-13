---
title: Api Orchestrator
topic: stitching
diataxis: reference
product: em
audience: both
sources:
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/CcdStitchBundleCallbackController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/NewBundleController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/CcdCloneBundleController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/endpoint/StitchingCompleteCallbackController.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/service/caseupdater/DefaultUpdateCaller.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/service/ccdcallbackhandler/CcdCallbackDtoCreator.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/configuration/BundleConfiguration.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/configuration/LocalConfigurationLoader.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/AutomatedCaseUpdater.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/BundleFactory.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/CallbackUrlCreator.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/stitching/StitchingService.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/service/caseupdater/CcdBundleStitchingService.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/service/caseupdater/UpdateCase.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/service/caseupdater/CcdCaseUpdater.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/service/orchestratorcallbackhandler/CcdCallbackBundleUpdater.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/automatedbundling/AutomatedStitchingExecutor.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/service/dto/CcdBundleDTO.java
  - em-ccd-orchestrator:src/main/java/uk/gov/hmcts/reform/em/orchestrator/stitching/dto/TaskState.java
  - em-ccd-orchestrator:src/main/resources/application.yaml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/em/em-ccd-orchestrator/src/main/resources/bundleconfiguration/sscs-bundle-config.yaml
confluence:
  - id: "1473558677"
    title: "CCD Orchestrator API"
    last_modified: "unknown"
    space: "RDM"
  - id: "1061126365"
    title: "Bundling Integration Guide"
    last_modified: "unknown"
    space: "RDM"
  - id: "303989417"
    title: "Automated Bundling LLD"
    last_modified: "unknown"
    space: "RDM"
  - id: "1048478663"
    title: "Automated Bundling HLD"
    last_modified: "unknown"
    space: "RDM"
  - id: "1945632872"
    title: "Addressing CCD timeouts when stitching multiple documents"
    last_modified: "unknown"
    space: "DATS"
  - id: "1626282109"
    title: "EM CCD Orchestrator Workload Model"
    last_modified: "unknown"
    space: "RQA"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- `em-ccd-orchestrator` receives CCD callback payloads and triggers document stitching via `em-stitching-api`; it is stateless (no database).
- Five endpoints: sync stitch, async stitch, automated new-bundle, clone, and a self-callback for stitching completion.
- The CCD field `caseBundles` is the hardcoded property name for the bundle array in case data.
- Bundle structure is defined in YAML config files shipped inside the JAR under `bundleconfiguration/`; the config filename is specified in case data at event time.
- S2S service name: `em_ccd_orchestrator`. All `/api/**` endpoints require both S2S and JWT authentication.
- CCD imposes a 10-second callback timeout; the sync path can exceed this for large bundles, which is why the async path exists.

## Endpoints

| Method | Path | Mode | Description |
|--------|------|------|-------------|
| POST | `/api/stitch-ccd-bundles` | Synchronous | Receives CCD callback, stitches bundles, polls until complete, returns stitched document URL in response. |
| POST | `/api/async-stitch-ccd-bundles` | Asynchronous | Receives CCD callback, submits stitching task with callback URL, returns immediately with task ID. |
| POST | `/api/new-bundle` | Asynchronous | Automated bundling endpoint; loads config from case data, builds bundles, fires async stitch. |
| POST | `/api/clone-ccd-bundles` | Synchronous | Clones an existing bundle (deep copy). |
| POST | `/api/stitching-complete-callback/{caseId}/{triggerId}/{bundleId}` | Inbound callback | Called by `em-stitching-api` when an async task completes; updates CCD case data with the stitched document. |

The stitching-complete-callback endpoint is gated by the feature toggle `endpoint-toggles.stitching-complete-callback` (default: `true`, `application.yaml:97`).

## CCD Callback Request Format

All inbound endpoints expect a standard CCD callback payload. The orchestrator reads from the body using `CcdCallbackDtoCreator.createDto(request, "caseBundles")` (`CcdCallbackDtoCreator.java:33`).

### Required fields in the CCD payload

| JSON path | Type | Description |
|-----------|------|-------------|
| `case_details.case_data.caseBundles` | Array | The bundle collection. Each item is a `CcdBundleDTO`. |
| `case_details.case_data.bundleConfiguration` | String | (For `/api/new-bundle`) Filename of the YAML config to load. |
| `case_details.case_data.multiBundleConfiguration` | Array of `{value: filename}` | (For `/api/new-bundle`) Alternative: multiple configs to produce multiple bundles. |
| `case_details.id` | Long | CCD case ID. |
| `case_details.jurisdiction` | String | Jurisdiction identifier (e.g. `SSCS`, `IA`). |

When `cdam.validation.enabled=true` (env var `ENABLE_CDAM_VALIDATION`), the DTO additionally requires `jurisdictionId` and `caseTypeId` fields and applies JSR-303 validation (`DefaultUpdateCaller.java:55-65`).

### Parsed DTO fields

`CcdCallbackDto` exposes: `getCaseId()`, `getJurisdiction()`, `getJurisdictionId()`, `getCaseTypeId()`, `getEventId()`, `getEventToken()`, `getJwt()`.

## CCD Callback Response Format

All endpoints return a `CcdCallbackResponseDto`:

```json
{
  "data": { "caseBundles": [ /* updated bundle array */ ] },
  "errors": [],
  "warnings": [],
  "documentTaskId": 12345
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data` | Object | The modified `case_data` with stitched document references populated. On error, returns the original (pre-modification) case data (`CcdCallbackResponseDto.java:34`). |
| `errors` | Array of String | Non-empty when stitching fails. Causes CCD to abort the event. |
| `warnings` | Array of String | Non-fatal messages. |
| `documentTaskId` | Long | (Async only) The ID of the created `DocumentTask` in stitching-api. |

On any exception, the endpoint returns HTTP 400 with errors populated (`DefaultUpdateCaller.java:79`).

## Bundle Configuration Format

Configuration files live in `src/main/resources/bundleconfiguration/` and are loaded from the classpath at runtime (`LocalConfigurationLoader.java:26-29`). Adding a new config requires a code change and redeploy.

### Top-level fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | String | Yes | Display title of the bundle. |
| `filename` | String | Yes | Output PDF filename. |
| `filenameIdentifier` | String (JSON Pointer) | No | JSON Pointer into case data used to prefix the filename (e.g. `/case_details/id`). |
| `coverpageTemplate` | String | No | Template name for the cover page. |
| `pageNumberFormat` | String | No | Page numbering format. |
| `sortOrder` | Array of `BundleConfigurationSort` | No | Global sort order. Each entry: `{field: <JSON Pointer>, order: ascending|descending}`. |
| `hasTableOfContents` | Boolean | No | Whether to include a table of contents. |
| `hasCoversheets` | Boolean | No | Whether to include coversheets per document. |
| `hasFolderCoversheets` | Boolean | No | Whether to include coversheets per folder. |
| `paginationStyle` | String | No | Pagination style identifier. |
| `documentNameValue` | String (JSON Pointer) | No | Override for the document name field path (default: `/documentName`). |
| `documentLinkValue` | String (JSON Pointer) | No | Override for the document link field path (default: `/documentLink`). |
| `documentImage` | Object | No | Image configuration for the bundle. |
| `enableEmailNotification` | Boolean | No | Send GOV.UK Notify email on stitch success/failure. Default: `false`. |
| `customDocument` | Object | No | Custom document config. Must be paired with `customDocumentLinkValue`. |
| `customDocumentLinkValue` | String | No | Must be paired with `customDocument`. |
| `folders` | Array of `BundleConfigurationFolder` | No | Folder structure containing documents. |
| `documents` | Array of document selectors | No | Top-level document selectors (outside any folder). |

### Folder structure

```yaml
folders:
  - name: "Hearing Documents"
    documents:
      - type: document
        property: /caseData/someDocument
      - type: documentSet
        property: /caseData/someCollection
        filters:
          - property: /value/documentType
            value: "witness-statement"
    folders:
      - name: "Sub-folder"
        documents: [...]
```

### Document selectors

| Type | Fields | Description |
|------|--------|-------------|
| `document` | `property` (JSON Pointer) | Selects a single document from case data. |
| `documentSet` | `property` (JSON Pointer), `filters` (optional array) | Selects an array of documents. Filters apply regex matching (`String.matches()`) against each item (`BundleFactory.java:226-232`). |

Each filter has `property` (JSON Pointer relative to the collection item) and `value` (regex pattern).

### Example: minimal config

```yaml
title: "Default Bundle"
filename: "bundle"
enableEmailNotification: false
hasTableOfContents: true
hasCoversheets: true
folders:
  - name: "Documents"
    documents:
      - type: documentSet
        property: /caseData/uploadedDocuments
```

### Config resolution order

1. `case_data.bundleConfiguration` (single filename)
2. `case_data.multiBundleConfiguration` (array of `{value: filename}`)
3. Jurisdiction map fallback: only `"SSCS" -> "sscs-bundle-config.yaml"` (`AutomatedCaseUpdater.java:118-121`)
4. Default: `"default-config.yaml"`

## Async Callback Flow

When using the async path (`/api/new-bundle` or `/api/async-stitch-ccd-bundles`):

1. The orchestrator constructs a callback URL: `{scheme}://{host}:{port}/api/stitching-complete-callback/{caseId}/{triggerId}/{bundleId}` (`CallbackUrlCreator.java:27-36`).
2. The `DocumentTaskDTO` (with embedded `CallbackDto.callbackUrl`) is POSTed to `{EM_STITCHING_API_URL}/api/document-tasks`.
3. When stitching completes, `em-stitching-api` POSTs to the callback URL.
4. The orchestrator's `StitchingCompleteCallbackController` updates CCD case data via `startEvent` / `submitEvent` on the CCD data-store API.
5. The callback handler updates the matching bundle: sets `stitchStatus` to the task state, `eligibleForCloning` to `"no"`, populates `stitchedDocument` (on success) or `stitchingFailureMessage` (on failure) (`CcdCallbackBundleUpdater.java:62-81`).

### Async Callback Trigger Event

The default CCD event ID used when the orchestrator updates the case via the stitching-complete callback is `asyncStitchingComplete` (`AutomatedStitchingExecutor.java:26`). Services can override this by specifying a custom `triggerId` in the callback URL path.

### Callback Retry (Stitching-API Side)

When `em-stitching-api` fails to reach the orchestrator's callback URL, it retries up to 3 times (configured via `maxRetries` on the `DocumentTask`). If all retries fail, the `callbackStatus` is set to `CALLBACK_FAILED`.

### Callback URL configuration

| Env var | Config property | Default | Description |
|---------|----------------|---------|-------------|
| `CALLBACK_DOMAIN` | `callbackUrlCreator.host` | `localhost` | The orchestrator's own hostname. |
| `CALLBACK_HTTP_SCHEME` | `callbackUrlCreator.scheme` | `http` | URL scheme. |
| `CALLBACK_HTTP_HOST_PORT` | `callbackUrlCreator.port` | `8080` | Port number. |

In cloud: `CALLBACK_DOMAIN` is set to `em-ccd-orchestrator-{env}.service.core-compute-{env}.internal` with port `80`.

## Sync Polling Behaviour

The synchronous path (`/api/stitch-ccd-bundles`) polls `em-stitching-api` for task completion:

- Polls `GET {EM_STITCHING_API_URL}/api/document-tasks/{id}` until `taskState` is not `NEW` or `IN_PROGRESS`.
- Exponential back-off starting at 1 second: `sleepTime += 1000 * (attempt + 2)` (`StitchingService.java:186-190`).
- Maximum 7 retries (`MAX_RETRY_TO_POLL_STITCHING=7`). After exhaustion, throws `StitchingTaskMaxRetryException`.
- On success, reads `$.bundle.stitchedDocumentURI` and `$.bundle.hashToken` from the response.

### CCD Callback Timeout Constraint

CCD imposes a **10-second timeout** on all callbacks. By default CCD retries failed callbacks 3 times, each subject to the same 10-second limit. The only available downstream option is to disable retries entirely (still a single 10-second attempt).

The sync stitching path can exceed this timeout when:
- The stitching service has a batch processing delay (~5 seconds on cold start).
- The orchestrator polls at ~1-second intervals, adding latency after stitching completes.
- Multiple bundles are stitched sequentially within one callback.

For scenarios requiring multiple bundles, use the async path (`/api/new-bundle`) or have the calling service execute stitch calls concurrently.
<!-- CONFLUENCE-ONLY: CCD 10-second timeout limit not verified in source (enforcement is in CCD data-store, not this repo) -->

## Authentication

| Layer | Mechanism |
|-------|-----------|
| Service-to-service | S2S token validated by `ServiceAuthFilter`. Default whitelisted callers (`application.yaml:85`): `sscs, ccd, em_gw, ccd_data, iac, em_stitching_api, xui_webapp, civil_service, prl_cos_api, ethos_repl_service, et_cos`. Additional services (e.g. `sptribs_case_api`, `civil_general_applications`) may be added via the `S2S_NAMES_WHITELIST` env var at deployment time. |
| User identity | OAuth2 JWT validated by Spring Security resource server. |
| Outbound to stitching-api | JWT passed as `Authorization` header; fresh S2S token generated per request (`StitchingService.java:135-136`). |

## Email Notifications (GOV.UK Notify)

Notifications are sent only when `enableEmailNotification: true` in the bundle config.

| Template | ID | Trigger |
|----------|----|---------|
| Success | `58f6384c-64f9-4ddc-a409-259fe04d1836` | Async callback with `taskState=DONE` |
| Failure | `2f133f4e-5adc-418c-9554-b18968db253e` | Async callback with `taskState=FAILED`, or sync path error |

Personalisation keys sent to Notify: `case_reference`, `bundle_name`, `system_error_message`. The recipient email is fetched from IDAM `GET /details` using the JWT from the original request.

Failure notifications are suppressed for the `cloneBundle` and `asyncStitchingComplete` CCD events (`DefaultUpdateCaller.java:78-82`).

## Bundle States and Eligibility Flags

Each `CcdBundleDTO` carries state-tracking fields that control processing flow:

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `eligibleForStitching` | String | `"yes"` / `"no"` | When `"yes"`, the sync path will stitch this bundle. Set to `"no"` after stitching completes (`CcdCaseUpdater.reorderBundles`). |
| `eligibleForCloning` | String | `"yes"` / `"no"` | When `"yes"`, the clone endpoint will copy this bundle. Set to `"no"` after the async callback completes (`CcdCallbackBundleUpdater.java:63`). |
| `stitchStatus` | String | `"NEW"`, `"IN_PROGRESS"`, `"DONE"`, `"FAILED"` | Maps to `TaskState` enum. Set during async stitching initiation and updated on callback completion. |
| `stitchingFailureMessage` | String | Free text | Error description from stitching-api; populated on callback regardless of success/failure. |

<!-- DIVERGENCE: Confluence LLD says the field is 'eligibleForBundling', but source (CcdBundleDTO.java:24, CcdCaseUpdater.reorderBundles) uses 'eligibleForStitching'. Source wins. -->

After sync stitching, bundles whose `eligibleForStitching` was `"yes"` are reordered to index 0 of the `caseBundles` array with the flag set to `"no"` (`CcdCaseUpdater.reorderBundles`).

## Bundle DTO Validation

The `CcdBundleDTO` applies JSR-303 validation before stitching (`CcdBundleStitchingService.java:35-39`):

| Field | Constraint | Error message |
|-------|-----------|---------------|
| `fileName` | `@Size(min=2, max=50)` + `@Pattern("^[-._A-Za-z0-9]*$")` | "File Name should contain at least 2 and not more than 50 Chars" |
| `description` | `@Size(max=255)` | "Bundle Description should not contain more than 255 Chars" |

The filename regex permits only alphanumerics, hyphens, dots, and underscores. If validation fails, an `InputValidationException` is thrown and the endpoint returns HTTP 400 with errors listing the violations.

## CCD Integration Events

Services integrate with the orchestrator by configuring CCD events that fire callbacks. The standard event IDs are:

| CCD Event ID | Callback type | Orchestrator endpoint | Purpose |
|--------------|--------------|----------------------|---------|
| `createBundle` | about-to-start | `/api/new-bundle` | Automated bundle creation from config |
| `stitchBundle` | about-to-submit | `/api/stitch-ccd-bundles` | Synchronous stitch of eligible bundles |
| `editBundle` | N/A (CCD UI only) | N/A | Amend bundle contents before stitching |
| `cloneBundle` | about-to-submit | `/api/clone-ccd-bundles` | Deep copy an existing bundle |
| `asyncStitchingComplete` | triggered by orchestrator | N/A (internal) | CCD event the orchestrator fires to save async results |

<!-- CONFLUENCE-ONLY: Event ID naming conventions (createBundle, stitchBundle, etc.) are documented in Confluence integration guide but not enforced in source -- services can use any event ID -->

Services must add the `Bundle`, `BundleDocument`, `BundleFolder`, and `BundleSubfolder` CCD complex types to their definition files, ensuring correct spelling and capitalisation for JSON parsing compatibility.

## Pagination Styles

The `paginationStyle` field on a bundle controls page number placement in the stitched PDF:

| Value | Description |
|-------|-------------|
| `off` | No pagination (default) |
| `topLeft` | Page numbers top-left |
| `topCenter` | Page numbers top-center |
| `topRight` | Page numbers top-right |
| `bottomLeft` | Page numbers bottom-left |
| `bottomCenter` | Page numbers bottom-center |
| `bottomRight` | Page numbers bottom-right |

Source: `CcdBundlePaginationStyle.java` enum.

## Production Workload (2022)

Peak hourly throughput observed in production (July--October 2022, weekday working hours):

| Endpoint | Peak requests/hour | Date |
|----------|-------------------|------|
| `POST /api/stitch-ccd-bundles` | 367 | 12 Sep 2022 |
| `POST /api/new-bundle` | 149 | 04 Aug 2022 |
| `POST /api/stitching-complete-callback/...` | 287 | 09 Sep 2022 |
| `POST /api/async-stitch-ccd-bundles` | 0 | N/A |
| `POST /api/clone-ccd-bundles` | 0 | N/A |

The synchronous stitch endpoint dominates production traffic. The async stitch endpoint (`/api/async-stitch-ccd-bundles`) had zero recorded usage; services preferring async use `/api/new-bundle` instead (which internally triggers async stitching with a callback).
<!-- CONFLUENCE-ONLY: Production workload figures are from Application Insights (rpa-prod, 3-month retention). Not verified in source. -->

## OpenAPI Specification

The published spec is available at `platops/cnp-api-docs/docs/specs/em-ccd-orchestrator.json`.

## Examples

### Real bundle configuration: SSCS

This is the complete, production SSCS bundle config from the `em-ccd-orchestrator` JAR. It demonstrates `documentNameValue` overriding the default document name path (`/documentFileName` instead of `/documentName`), per-folder `documentSet` with `filters`, and a production Docmosis cover page template ID.

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

Key observations from this real config:
- No `paginationStyle` is set — defaults to `off` (no page numbers).
- `hasFolderCoversheets: false` but `hasCoversheets: true` — each document gets a cover sheet, but folders do not.
- The `\w+` regex in the `bundleAddition` filter matches any non-empty bundle addition value — effectively selecting all documents that have a bundle addition set.
- The `audioVideoEvidenceBundleDocument` is a single document (not a set) included at the root level of the "Further additions" folder.

## See also

- [Trigger Bundle Stitching](../how-to/trigger-bundle-stitching.md) — step-by-step service onboarding guide covering bundle YAML authoring, CCD event configuration, and handling both sync and async responses
- [Stitching and Bundling](../explanation/stitching-and-bundling.md) — explains the underlying stitching pipeline, CCD timeout constraints, and the async path rationale
- [API: Stitching](api-stitching.md) — the downstream API this orchestrator calls to create and poll `DocumentTask` jobs
- [Glossary](glossary.md#bundle) — definitions for `Bundle`, `caseBundles`, `bundleConfiguration`, `asyncStitchingComplete`, and `DocumentTask`
