---
title: Embed Media Viewer
topic: media-viewer
diataxis: how-to
product: em
audience: both
sources:
  - em-media-viewer:projects/media-viewer/src/lib/media-viewer.component.ts
  - em-media-viewer:projects/media-viewer/src/lib/media-viewer.module.ts
  - em-media-viewer:README.md
  - em-media-viewer:projects/media-viewer/ng-package.json
  - em-media-viewer:projects/media-viewer/src/public_api.ts
  - em-media-viewer:package.json
  - em-media-viewer:projects/media-viewer/src/lib/toolbar/toolbar-button-visibility.service.ts
  - em-media-viewer:projects/media-viewer/src/lib/redaction/services/redaction-api.service.ts
  - em-media-viewer:projects/media-viewer/src/lib/viewers/viewer-exception.model.ts
  - em-media-viewer:projects/media-viewer/src/lib/icp/icp-session-api.service.ts
  - em-media-viewer:projects/media-viewer/src/lib/viewers/pdf-viewer/pdf-js/pdf-js-wrapper.ts
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/em/em-media-viewer/proxy.config.js
  - apps/em/em-media-viewer/projects/media-viewer/src/lib/media-viewer.component.ts
confluence:
  - id: "1101398118"
    title: "Media Viewer - User Guide"
    last_modified: "unknown"
    space: "RDM"
  - id: "1186104429"
    title: "Document Store - Common file types & those supported by the Store and Media Viewer"
    last_modified: "unknown"
    space: "RDM"
  - id: "997524007"
    title: "Media Viewer - LLD"
    last_modified: "unknown"
    space: "RDM"
  - id: "1814309863"
    title: "Media Viewer Key Info"
    last_modified: "unknown"
    space: "EXUI"
  - id: "986316951"
    title: "Media & Document Viewer"
    last_modified: "unknown"
    space: "RDM"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- `@hmcts/media-viewer` (v4.2.18) is an Angular library that renders PDFs, images, and multimedia with annotation/redaction overlays.
- Install via npm/yarn, import `MediaViewerModule`, configure `angular.json` assets, and wire proxy routes in your Node backend.
- All API calls are relative paths -- the consuming app must proxy `/em-anno`, `/api/markups`, `/api/redaction`, and `/documents` to the correct backend services.
- Requires Angular ^20.0.0, NgRx ^20 as peer dependencies. `rpx-xui-translation` is a runtime dependency of the host app (used at `1.1.2-CME-780-9` currently).
- The PDF.js worker must be served at `/assets/build/pdf.worker.min.js` or PDFs will not render.
- Supports content types: `pdf`, `image` (core); `mp4`, `mp3` (multimedia); `excel`, `word`, `powerpoint`, `txt`, `rtf` (convertible via Docmosis/LibreOffice backend).

## Prerequisites

- Angular ^20.0.0 application with NgRx installed (`@ngrx/store`, `@ngrx/effects`, `@ngrx/store-devtools`)
- Node/Express backend (or equivalent) capable of proxying API routes
- Access to the public npm registry (the package is published with `"access": "public"`)
- For convertible content types (Word, Excel, PowerPoint, RTF, TXT): a Docmosis/LibreOffice conversion service accessible via the document store

## Steps

### 1. Install the package

```bash
yarn add @hmcts/media-viewer
```

Ensure peer dependencies are satisfied (from `projects/media-viewer/package.json`):

| Peer dependency | Required version |
|----------------|-----------------|
| `@angular/animations` | ^20.0.0 |
| `@angular/common` | ^20.0.0 |
| `@angular/core` | ^20.0.0 |
| `@angular/forms` | ^20.0.0 |
| `@angular/platform-browser` | ^20.0.0 |
| `@ngrx/effects` | ^20 |
| `@ngrx/store` | ^20 |
| `@ngrx/store-devtools` | ^20 |

The library also bundles these as non-peer dependencies: `pdfjs-dist` (^4.10.38), `socket.io-client` (^4.8.0), `@swimlane/ngx-datatable` (^20.0.0), `mutable-div` (^2.0.0), `uuid` (^11.0.3).

Your host app should also provide `rpx-xui-translation`, `govuk-frontend`, and `rxjs`.

### 2. Import MediaViewerModule

In your app module (or a feature module):

```typescript
import { MediaViewerModule } from '@hmcts/media-viewer';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { RpxTranslationModule } from 'rpx-xui-translation';

@NgModule({
  imports: [
    StoreModule.forRoot({}, {}),
    EffectsModule.forRoot([]),
    RpxTranslationModule.forRoot(/* config */),
    MediaViewerModule
  ]
})
export class AppModule {}
```

`MediaViewerModule` registers its own NgRx feature slice (`StoreModule.forFeature('media-viewer', reducers)`) internally (`media-viewer.module.ts:57`). You only need `forRoot` declarations in the host app.

### 3. Configure angular.json assets

Add the library's assets directory so the PDF.js worker and other static files are served:

```json
{
  "projects": {
    "your-app": {
      "architect": {
        "build": {
          "options": {
            "assets": [
              "src/assets",
              {
                "glob": "**/*",
                "input": "node_modules/@hmcts/media-viewer/assets",
                "output": "/assets"
              }
            ]
          }
        }
      }
    }
  }
}
```

This ensures the PDF.js worker is available at `/assets/build/pdf.worker.min.js` -- the path hardcoded in `PdfJsWrapper` (`pdf-js-wrapper.ts:11`).

### 4. Import styles

In your global stylesheet or `angular.json` styles array:

```scss
@import '~media-viewer/src/assets/all';
```

Note: `MediaViewerComponent` uses `ViewEncapsulation.None` (`media-viewer.component.ts:59`), so its styles will leak into your application. Scope your own styles accordingly.

### 5. Add the component to a template

```html
<mv-media-viewer
  [url]="documentUrl"
  [contentType]="'pdf'"
  [downloadFileName]="'case-bundle.pdf'"
  [enableAnnotations]="true"
  [enableRedactions]="true"
  [height]="'80vh'"
  (mediaLoadStatus)="onLoadStatus($event)"
  (viewerException)="onViewerError($event)">
</mv-media-viewer>
```

Key inputs:

| Input | Type | Default | Purpose |
|-------|------|---------|---------|
| `url` | `string` | -- | Document URL (e.g. `/documents/{uuid}/binary`). Supports both `/documents/` and `/documentsv2/` (secure mode) paths -- the component strips the prefix internally to extract the document ID. |
| `contentType` | `string` | -- | `'pdf'`, `'image'`, `'mp4'`, `'mp3'`, `'excel'`, `'word'`, `'powerpoint'`, `'txt'`, `'rtf'` |
| `downloadFileName` | `string` | -- | Filename used when downloading; falls back to default if not set |
| `showToolbar` | `boolean` | `true` | Show/hide the toolbar entirely. Set to `false` if you want to build your own control interface. |
| `enableAnnotations` | `boolean` | `false` | Enable annotation overlays and persistence. For PDFs, enables text highlight mode; for images, enables draw mode. |
| `annotationApiUrl` | `string` | `'/em-anno'` | Override the annotation API proxy path |
| `enableRedactions` | `boolean` | `false` | Enable redaction marking and rendering |
| `enableRedactSearch` | `boolean` | `false` | Enable redaction search functionality (search-and-redact) |
| `enableICP` | `boolean` | `false` | Enable In-Court Presentation (PED) mode |
| `multimediaPlayerEnabled` | `boolean` | `false` | Feature flag for multimedia content playback |
| `caseId` | `string` | -- | Required for ICP session lookup (used with document ID to call `/icp/sessions/{caseId}/{documentId}`) |
| `height` | `string` | auto | CSS height value; if unset, the component auto-calculates `calc(100vh - offset)` |
| `width` | `string` | `'100%'` | CSS width value |
| `toolbarButtonOverrides` | `any` | `{}` | Partial override of `ToolbarButtonVisibilityService` properties |

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- Confluence (LLD) mentions contentType values "video" and "audio" as strategy types, but source (media-viewer.component.ts) uses enum values "mp4" and "mp3" only. The strategy pattern exists internally but consumers must use the specific codec names. -->

Key outputs:

| Output | Emits | Purpose |
|--------|-------|---------|
| `mediaLoadStatus` | `ResponseType` | Document load result: `SUCCESS`, `FAILURE`, or `UNSUPPORTED` |
| `viewerException` | `ViewerException` | Error details (`exceptionType`, `detail.httpResponseCode`, `detail.message`) |
| `toolbarEventsOutput` | `ToolbarEventService` | Emitted on load; provides hooks for programmatic toolbar operations (search, zoom, navigate, rotate) |
| `unsavedChanges` | `boolean` | Emitted when user starts/finishes editing a comment without saving |

### 6. Configure proxy routes in your Node backend

The library makes all HTTP calls to relative paths. Your Express/Node server must proxy these to the correct backend services:

```javascript
// Express proxy configuration
const proxy = require('http-proxy-middleware');

// Document store (via CDAM)
app.use('/documents', proxy({ target: CDAM_URL }));

// Annotation API
app.use('/em-anno', proxy({ target: EM_ANNOTATION_API_URL }));

// Redaction / markup API (em-native-pdf-annotator-app)
app.use('/api/markups', proxy({ target: EM_NATIVE_PDF_ANNOTATOR_URL }));
app.use('/api/redaction', proxy({ target: EM_NATIVE_PDF_ANNOTATOR_URL }));

// ICP sessions (if enableICP is used)
app.use('/icp/sessions', proxy({ target: EM_ICP_API_URL }));
```

Required proxy routes:

| Path | Backend service | Used when |
|------|----------------|-----------|
| `/documents` | Document Management (CDAM) | Always (document fetch) |
| `/em-anno` | `em-annotation-api` | `enableAnnotations=true` |
| `/api/markups` | `em-native-pdf-annotator-app` | `enableRedactions=true` (GET, POST, DELETE) |
| `/api/markups/search` | `em-native-pdf-annotator-app` | `enableRedactSearch=true` (bulk redaction search) |
| `/api/redaction` | `em-native-pdf-annotator-app` | Redaction rendering/burn-in (POST) |
| `/icp/sessions` | `em-icp-api` | `enableICP=true` (GET `/icp/sessions/{caseId}/{documentId}`) |

The redaction API URLs are hardcoded in `RedactionApiService` (`redaction-api.service.ts:10-12`): `/api/markups`, `/api/redaction`, and `/api/markups/search`. There is no input to override them, unlike `annotationApiUrl`.

The annotation API constructs URLs as `{annotationApiUrl}/annotation-sets/filter?documentId={id}` and `{annotationApiUrl}/annotations/{id}` (`annotation-api.service.ts`).

### 7. Override toolbar buttons (optional)

To customise which toolbar buttons appear:

```html
<mv-media-viewer
  [url]="documentUrl"
  [contentType]="'pdf'"
  [toolbarButtonOverrides]="{ showRedact: false, showBookmark: true }">
</mv-media-viewer>
```

Available keys match `ToolbarButtonVisibilityService` properties: `showPrint`, `showDownload`, `showNavigation`, `showZoom`, `showRotate`, `showPresentationMode`, `showRedact`, `showOpenFile`, `showBookmark`, `showHighlightButton`, `showDrawButton`, `showSearchBar`, `showSidebar`, `showCommentSummary`, `showGrabNDragButton`, `showSaveRotationButton`.

Default toolbar buttons per content type (`toolbar-button-visibility.service.ts`):

| Button | PDF | Image | Multimedia | Unsupported |
|--------|-----|-------|------------|-------------|
| `showPrint` | yes | yes | -- | yes |
| `showDownload` | yes | yes | yes | yes |
| `showNavigation` | yes | -- | -- | -- |
| `showZoom` | yes | yes | -- | -- |
| `showRotate` | yes | yes | -- | -- |
| `showSearchBar` | yes | -- | -- | -- |
| `showSidebar` | yes | -- | -- | -- |
| `showGrabNDragButton` | yes | yes | -- | -- |
| `showCommentSummary` | yes | yes | -- | -- |
| `showPresentationMode` | yes | -- | -- | -- |
| `showRedact` | yes | yes | -- | -- |
| `showHighlightButton` | (if annotations) | -- | -- | -- |
| `showDrawButton` | -- | (if annotations) | -- | -- |

Note: For PDFs with annotations enabled, text highlight mode is activated (`showHighlightButton`). For images with annotations enabled, draw mode is activated (`showDrawButton`). Touch support for draw mode uses Hammer.js internally.

## Verify

1. Run `ng serve` and navigate to a page containing `<mv-media-viewer>`.
2. Confirm a PDF renders in the viewer and the toolbar appears.
3. Open browser DevTools Network tab -- confirm requests to `/documents/{uuid}/binary` return `200`.
4. If annotations are enabled, confirm a `GET /em-anno/{documentId}/annotation-sets` request succeeds (or returns `404` for a new document).
5. If the PDF.js worker is misconfigured, the console will show a loading error and the PDF will not render -- check that `/assets/build/pdf.worker.min.js` is accessible.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| PDF shows blank/loading spinner | PDF.js worker not served | Verify `angular.json` assets config includes `node_modules/@hmcts/media-viewer/assets` |
| `contentType` not recognised | Case-sensitive mismatch | Use lowercase values: `'pdf'`, `'image'`, etc. Classification uses `toUpperCase()` on the enum keys but the enum values themselves are lowercase |
| Annotations not loading | Missing proxy route | Ensure `/em-anno` is proxied to `em-annotation-api` |
| Redaction POST fails | Wrong proxy target | `/api/redaction` must route to `em-native-pdf-annotator-app`, not `em-annotation-api` |
| NgRx errors on startup | Missing root store | Ensure `StoreModule.forRoot({}, {})` and `EffectsModule.forRoot([])` are declared in the app module |
| Text highlight not working | Document is a scanned image | Use draw-a-box mode instead; text highlight requires the PDF to have a structured text layer |
| `mediaLoadStatus` emits `UNSUPPORTED` | Unrecognised `contentType` value | Ensure value is one of: `pdf`, `image`, `mp4`, `mp3`, `excel`, `word`, `powerpoint`, `txt`, `rtf` |
| Styles leaking into host app | `ViewEncapsulation.None` | Scope your own styles or use component-level encapsulation; the media-viewer intentionally uses no encapsulation |
| ICP not connecting | Missing proxy or caseId | Ensure `/icp/sessions` is proxied to `em-icp-api` and `[caseId]` input is set |
| Copy-text not working after rotate | Known limitation | Copy-text is disabled during and after document rotation |

## Content type classification

The component classifies `contentType` values into three categories (`media-viewer.component.ts:38-54`):

| Category | Values | Viewer strategy | Annotations supported |
|----------|--------|----------------|----------------------|
| Core | `pdf`, `image` | PDF.js viewer / `<img>` tag | Yes |
| Multimedia | `mp4`, `mp3` | HTML5 `<video>` / `<audio>` | No |
| Convertible | `excel`, `word`, `powerpoint`, `txt`, `rtf` | Converted to PDF server-side (Docmosis/LibreOffice), then rendered via PDF.js | Yes (after conversion) |

If `contentType` does not match any of these values, the viewer shows an "unsupported" state with download/print options only.

<!-- DIVERGENCE: Confluence (LLD page 997524007) lists contentType values as "pdf | image | video | audio", but source (media-viewer.component.ts) uses "pdf", "image", "mp4", "mp3", "excel", "word", "powerpoint", "txt", "rtf". The LLD predates the addition of convertible types and uses generic media-type names. Source wins. -->

### Supported file formats (Document Store)

The Document Store accepts uploads for all MIME types listed below. "Supported" in the Media Viewer column means in-viewer rendering; all others can be downloaded.

| Format | Extension | Media Viewer |
|--------|-----------|-------------|
| PDF | .pdf | Rendered natively |
| JPEG | .jpg, .jpeg | Rendered natively |
| PNG | .png | Rendered natively |
| BMP | .bmp | Rendered natively |
| TIFF | .tif, .tiff | Rendered natively |
| Word | .doc, .docx | Converted to PDF (Docmosis) |
| Excel | .xls, .xlsx | Converted to PDF (Docmosis) |
| PowerPoint | .ppt, .pptx | Converted to PDF (Docmosis) |
| RTF | .rtf | Converted to PDF (Docmosis) |
| Plain text | .txt | Converted to PDF (Docmosis) |
| CSV | .csv | Converted to PDF (Docmosis) |
| MP4 video | .mp4 | HTML5 player |
| MP3 audio | .mp3 | HTML5 player |

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- Confluence states Document Store accepts documents up to 1GB and multimedia up to 500MB, total payload up to 4000MB. These are backend limits, not enforced by the media-viewer library. -->

## Annotation behaviour

Annotations are stored by `em-annotation-api` and are **private to the author** by default -- only the comment creator can see their annotations. The annotation data model stores highlights as x,y coordinate rectangles with associated comments.

Key behaviours:
- Two annotation modes exist: **text highlight** (for PDFs with selectable text) and **draw a box** (for images or scanned documents)
- Comments include user name, text, and timestamp (displayed in local timezone, adjusted for BST)
- The comment summary panel shows all annotations with page references for navigation
- Annotations are loaded on document change via `GET {annotationApiUrl}/annotation-sets/filter?documentId={id}`
- The text highlight tool requires the document to contain structured/selectable text; scanned image PDFs require draw mode
- It is not possible to highlight text spanning two pages
- Copy-text is disabled after document rotation

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- Confluence User Guide states zoom levels range from 10, 25, 50, 75, 100, 125, 150, 250, 300, 500%. This is PDF.js default behaviour, not configured in em-media-viewer source. -->

## Persist rotation

The persist-rotation feature allows saving the rotation setting for a document. Any subsequent viewer of the same document sees it in the saved orientation.

<!-- CONFLUENCE-ONLY: not verified in source -->
<!-- Confluence states this feature is "dormant" and requires explicit activation per service. The toolbar button showSaveRotationButton exists in source but defaults to false for all content types. -->

## Local development with em-showcase

For local development and testing without deploying to AAT, use `em-showcase`:

1. Clone `em-showcase`: `git clone git@github.com:hmcts/em-showcase.git`
2. Run `docker compose up` to start local dependencies (annotation-api, native-pdf-annotator, dm-store)
3. Start the showcase Node server: follow the repo README
4. Showcase runs at `http://localhost:1337` and provides the proxy layer

Then for the media-viewer itself:

1. Clone `em-media-viewer`: `git clone git@github.com:hmcts/em-media-viewer.git`
2. `yarn install`
3. `yarn setup` (builds API and copies demo files)
4. `yarn package` (copies PDF.js worker and assets)
5. `ng serve` or `yarn start:ng` -- runs at `http://localhost:3000`

To upload test documents: navigate to `http://localhost:1337/dm-store`, upload a file, copy the returned URL, append `/binary`, and paste into the media-viewer demo app's "change document details" field.

**macOS / Apple Silicon notes**: disable ZScaler for `az login` and docker pulls (port 9010 conflict). Enable "Use Rosetta for x86_64/amd64 emulation" in Docker Desktop settings. Comment out `-XX:MaxPermSize=512m` from `JAVA_TOOL_OPTIONS` in `docker-compose-dependencies.yml`.

## Example

### Angular dev proxy (proxy.config.js)

The `em-media-viewer` repo ships this Angular webpack proxy config for local development against `em-showcase`. It shows all six context paths the library uses and is the canonical reference for what must be proxied in any consuming application.

```javascript
// Source: apps/em/em-media-viewer/proxy.config.js
module.exports = [
  {
    context: ['/documents'],
    target: 'http://localhost:1337',
    secure: false
  },
  {
    context: ['/hearing-recordings'],
    target: 'http://localhost:1337',
    secure: false
  },
  {
    context: ['/api'],               // covers /api/markups and /api/redaction
    target: 'http://localhost:1337',
    secure: false
  },
  {
    context: ['/em-anno'],
    target: 'http://localhost:1337',
    secure: false
  },
  {
    context: ['/icp'],
    target: 'http://localhost:1337',
    secure: false,
    ws: true                         // WebSocket upgrade required for ICP
  },
  {
    context: ['/doc-assembly'],
    target: 'http://localhost:1337',
    secure: false
  }
];
```

Note: in production applications, each context maps to a distinct backend service rather than a single `em-showcase` aggregator. The `ws: true` flag on `/icp` is essential — Azure Web PubSub connections use WebSocket upgrades and will fail silently without it.

## See also

- [Media Viewer](../explanation/media-viewer.md) — explains the viewer architecture, all `@Input`/`@Output` declarations, ICP lifecycle, NgRx state model, toolbar customisation, and known gotchas
- [Annotation Flow](../explanation/annotation-flow.md) — how `em-annotation-api` and `em-native-pdf-annotator-app` store and render annotations and redactions behind the proxy routes you configure here
- [API: Annotation](../reference/api-annotation.md) — full endpoint reference for `em-annotation-api` (the `/em-anno` proxy target)
- [In-Court Presentation](../explanation/in-court-presentation.md) — details on ICP session management, Azure Web PubSub, and the `ws: true` proxy requirement for `/icp/sessions`
