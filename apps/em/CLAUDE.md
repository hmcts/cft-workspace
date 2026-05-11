---
service: em
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - cdam
  - notify
  - cftlib
  - flyway
api_specs:
  - apps/em/em-annotation-api:em-annotation-api.json
  - apps/em/em-ccd-orchestrator:em-ccd-orchestrator.json
  - apps/em/em-hrs-api:em-hrs-api.json
  - apps/em/em-stitching-api:em-stitching-api.json
  - apps/em/em-native-pdf-annotator-app:em-native-pdf-annotator-app.json
repos:
  - apps/em/em-annotation-api
  - apps/em/em-ccd-orchestrator
  - apps/em/em-hrs-api
  - apps/em/em-hrs-ingestor
  - apps/em/em-icp-api
  - apps/em/em-media-viewer
  - apps/em/em-native-pdf-annotator-app
  - apps/em/em-stitching-api
  - apps/em/em-test-helper
---

# Evidence Management (EM)

The Evidence Management product provides the document processing and presentation layer for HMCTS CFT services. It handles document stitching/bundling (assembling multiple files into a single PDF bundle for case hearings), in-document annotations and redactions, in-court presentation via live sessions, and hearing recording ingest, storage, and playback. Consumer services — civil, IA, PRL, SSCS, and others — call into EM components during case preparation and hearing workflows.

## Repos

- `apps/em/em-annotation-api` — Spring Boot service storing and retrieving document annotations (highlights, comments) backed by PostgreSQL with Flyway migrations
- `apps/em/em-ccd-orchestrator` — Spring Boot mediator that receives CCD callbacks, triggers bundle-stitching via `em-stitching-api`, and returns stitched-document references back into CCD case data
- `apps/em/em-hrs-api` — Spring Boot Hearing Recording Service: stores hearing recording metadata in PostgreSQL, serves recordings to authorised parties (judges, clerks, parties), and dispatches notification emails via GOV.UK Notify
- `apps/em/em-hrs-ingestor` — Spring Boot batch runner that polls a CVP Azure Blob Store, compares what HRS API already holds, and submits new recording files to `em-hrs-api` for ingest
- `apps/em/em-icp-api` — Node/TypeScript backend for In-Court Presentation sessions; manages session lifecycles via Azure Web PubSub and Redis; consumed by `em-media-viewer`
- `apps/em/em-media-viewer` — Angular library published to NPM (`@hmcts/media-viewer`) for embedding in service frontends; renders PDFs and images with annotation, redaction, and ICP capabilities
- `apps/em/em-native-pdf-annotator-app` — Spring Boot service handling native-PDF markup (redaction markings) and the final redaction rendering step; integrates with CDAM for document storage
- `apps/em/em-stitching-api` — Spring Boot document-stitching engine using Apache PDFBox and Apache POI (Word); processes stitching jobs asynchronously via Spring Batch with ShedLock distributed locking
- `apps/em/em-test-helper` — Shared Java library (published to ADO Artifacts) providing IDAM/S2S/CCD test helpers used by the functional test suites of other EM repos

## Architecture

The primary consumer-facing flow is document bundling. A service team's CCD callback hits `em-ccd-orchestrator` with a list of documents to bundle. The orchestrator calls `em-stitching-api` to create a `DocumentTask` job, polls for completion, then returns the stitched document URL (via CDAM) back to the calling CCD case event. `em-stitching-api` retrieves source documents from CDAM (`ccd-case-document-am-client`), merges them with PDFBox/POI, and stores the result. The orchestrator also notifies failure via GOV.UK Notify (`notifications-java-client`).

Annotation and redaction are a parallel path. The Angular `em-media-viewer` library renders documents inline in XUI or bespoke frontends. Annotation persistence hits `em-annotation-api` (via an `/em-anno` proxy in the consuming app). Redaction markings and final redaction rendering go to `em-native-pdf-annotator-app` (via `/api/markups` and `/api/redaction` proxies). Both backend services are backed by PostgreSQL with Flyway migrations and use CDAM for document access.

Hearing recordings flow from CVP Azure Blob Store into `em-hrs-ingestor`, which polls on a schedule and submits new files to `em-hrs-api`. `em-hrs-api` stores recording metadata in PostgreSQL, serves audio/video segments to authorised users, and sends reporting emails via GOV.UK Notify. The In-Court Presentation path uses `em-icp-api` (Node/TypeScript), which creates live viewer sessions backed by Azure Web PubSub, allowing a presenter to control what document and page all participants see simultaneously via Redis pub/sub.

All Java services authenticate callers via IDAM (OAuth2 resource-server) and service-to-service calls via `service-auth-provider-java-client`. Local development for `em-annotation-api`, `em-stitching-api`, `em-native-pdf-annotator-app`, and `em-hrs-api` uses `rse-cft-lib` (`bootWithCCD` task) to run the full CFT stack in-process.

## External integrations

- `idam`: all Java services use `idam-java-client` for OAuth2 user identity; `em-hrs-api` also uses an IDAM system-user account for CCD data operations
- `s2s`: `service-auth-provider-java-client` in every Java service and `em-hrs-ingestor`; S2S microservice names include `em_annotation_app`, `em_stitching_api`, `em_hrs_api`, `em_ccd_orchestrator`
- `cdam`: `em-stitching-api`, `em-ccd-orchestrator`, and `em-native-pdf-annotator-app` use `ccd-case-document-am-client` for document fetch and upload; `em-annotation-api` calls CCD data-store client (document references stored as CCD case document URLs)
- `notify`: `em-ccd-orchestrator` sends stitching success/failure emails (template IDs hardcoded in `application.yaml`); `em-hrs-api` sends hearing-report emails
- `cftlib`: `em-annotation-api`, `em-stitching-api`, `em-native-pdf-annotator-app`, and `em-hrs-api` use `rse-cft-lib` plugin for local `bootWithCCD` development
- `flyway`: `em-annotation-api`, `em-stitching-api`, `em-hrs-api`, and `em-native-pdf-annotator-app` all manage PostgreSQL schemas via Flyway migrations under `src/main/resources/db/migration/`

## Notable conventions and quirks

- `em-icp-api` is marked as archived ("Archiving this repo for time been to update the Delivery Report on grafana") at the top of its README, but the code and its spec (`em-icp.json`) remain present in `platops/cnp-api-docs`.
- `em-stitching-api` implements versioned document tasks so two deployed versions can share the same PostgreSQL database during a zero-downtime deployment; new-version tasks are ignored by old-version workers.
- `em-hrs-ingestor` has no functional tests by design; it is a batch poller that runs once on application startup and exits.
- `em-ccd-orchestrator` accepts a `callbackUrlCreator` configuration block to construct the stitching-complete callback URL — the `CALLBACK_DOMAIN` env var must be set to the service's own ingress hostname in cloud environments.
- The `em-media-viewer` Angular library is published to NPM and consumed by XUI and service frontends; it is not a deployed service and has no OpenAPI spec.
- `em-test-helper` is published via ADO Artifacts at `com.github.hmcts:em-test-helper`; it is included only in `functionalTestImplementation`/`aatImplementation` scope in consumer repos.
