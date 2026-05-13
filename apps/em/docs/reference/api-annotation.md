---
title: Api Annotation
topic: annotation
diataxis: reference
product: em
audience: both
sources:
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/AnnotationSetResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/AnnotationResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/BookmarkResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/FilterAnnotationSet.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/CommentResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/RectangleResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/TagResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/MetaDataResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/DocumentDataResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/AnnotationSet.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/Annotation.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/Bookmark.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/Metadata.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/enumeration/AnnotationType.java
  - em-annotation-api:src/main/resources/application.yaml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/em/em-annotation-api/src/main/java/uk/gov/hmcts/reform/em/annotation/domain/Annotation.java
confluence:
  - id: "1473558598"
    title: "Annotation API"
    last_modified: "unknown"
    space: "RDM"
  - id: "303989415"
    title: "Annotation LLD"
    last_modified: "unknown"
    space: "RDM"
  - id: "1122501633"
    title: "Annotation Access Management"
    last_modified: "unknown"
    space: "RDM"
  - id: "1624184913"
    title: "Annotation Workload Model"
    last_modified: "unknown"
    space: "RQA"
  - id: "1902052306"
    title: "Design document for implementing retain and dispose for Em-Anno and Em-NPA"
    last_modified: "unknown"
    space: "RDM"
  - id: "1054802715"
    title: "Annotation Store Integration"
    last_modified: "unknown"
    space: "AM"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- REST API for CRUD operations on document annotations, annotation sets, bookmarks, comments, rectangles, and tags — consumed by `em-media-viewer` via an `/em-anno` proxy.
- All endpoints require IDAM JWT (`Authorization`) and S2S (`serviceauthorization`) headers; S2S microservice name is `em_annotation_app`.
- Callers must supply a UUID `id` in the request body for all create operations — IDs are never server-generated.
- `AnnotationSet` is scoped to one (user, document) pair; the filter endpoint (`/api/annotation-sets/filter`) returns only the calling user's set.
- Bookmarks are independent of annotation sets; they reference a document directly and support tree structure via `parent`/`previous` fields.
- Published OpenAPI spec: [em-annotation-api on cnp-api-docs](https://hmcts.github.io/cnp-api-docs/swagger.html?url=https://hmcts.github.io/cnp-api-docs/specs/em-annotation-api.json).

## Authentication

All `/api/**` endpoints require two headers (`SecurityConfiguration.java:71`):

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <IDAM OAuth2 JWT>` |
| `serviceauthorization` | S2S token (microservice name: `em_annotation_app`) |

Authorised S2S callers (default): `em_gw`, `xui_webapp`. The document-data-deletion endpoint has a separate whitelist: `em_gw`, `dm_store`.

## Annotation Set endpoints

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/api/annotation-sets` | Create an annotation set | Body must include `id` (UUID). Returns 400 if `id` is null (`AnnotationSetResource.java:90`). |
| PUT | `/api/annotation-sets` | Update an annotation set | Full replacement of the annotation set entity. |
| GET | `/api/annotation-sets` | List all annotation sets (paginated) | **Not user-scoped** — returns all sets. Admin-oriented. |
| GET | `/api/annotation-sets/{id}` | Get annotation set by ID | Returns **204 No Content** (not 404) when not found (`AnnotationSetResource.java:202`). |
| DELETE | `/api/annotation-sets/{id}` | Delete an annotation set | Cascades to child annotations, comments, rectangles. |
| GET | `/api/annotation-sets/filter?documentId={documentId}` | Get the calling user's annotation set for a document | User-scoped via `SecurityUtils.getCurrentUserLogin()`. Returns 404 if none exists (`FilterAnnotationSet.java:56`). |

### AnnotationSet request shape

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "documentId": "http://dm-store/documents/abc-123",
  "annotations": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "type": "highlight",
      "page": 3,
      "color": "#FFFF00",
      "comments": [],
      "rectangles": []
    }
  ]
}
```

Key fields:

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Required. Client-generated. |
| `documentId` | String | Document reference (DM Store URL or UUID — stored as `varchar(255)`). Unique per user (`AnnotationSet.java:21`). |
| `annotations` | Array | Nested annotations with cascade semantics. |

## Annotation endpoints

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/api/annotations` | Create an annotation | Body must include `id`. Calls `CcdService.buildCommentHeader()` to populate `commentHeader` from CCD case data (`AnnotationResource.java:94-95`). Returns 400 on constraint violations. |
| PUT | `/api/annotations` | Update an annotation | Full replacement. Also catches DB constraint violations and returns 400 (`AnnotationResource.java:148-150`). |
| GET | `/api/annotations/{id}` | Get annotation by ID | Returns **404** when not found (unlike annotation sets which return 204). |
| DELETE | `/api/annotations/{id}` | Delete an annotation | Cascades to comments and rectangles. |

### Annotation DTO fields

| Field | JSON key | Type | Notes |
|-------|----------|------|-------|
| `id` | `id` | UUID | Required. |
| `annotationType` | `type` | String | `@JsonProperty("type")` — JSON key differs from entity field name (`AnnotationDTO.java:22`). |
| `page` | `page` | Integer | Page number in document. |
| `color` | `color` | String | Hex colour code. |
| `caseId` | `caseId` | String | Max 20 chars (added V7). |
| `jurisdiction` | `jurisdiction` | String | Max 20 chars (added V7). |
| `commentHeader` | `commentHeader` | String | Server-populated from CCD case data. Max 255 chars. |
| `comments` | `comments` | Array | Nested `Comment` objects (cascade). |
| `rectangles` | `rectangles` | Array | Nested `Rectangle` objects (cascade). |
| `tags` | `tags` | Array | Nested `Tag` objects (many-to-many via `annotation_tags` join table). |

### Annotation types

The `AnnotationType` enum defines: `AREA`, `HIGHLIGHT`, `POINT`, `TEXTBOX` (`AnnotationType.java`). However, the `annotationType` field is stored as `String` (not the enum type), so the API accepts any value without validation. The media viewer frontend (`em-media-viewer`) uses these values when creating annotations.

<!-- CONFLUENCE-ONLY: The Annotation LLD (303989415) also lists "Drawing" and "Strikeout" as types from the pdf-annotate.js library, but the source enum only has AREA, HIGHLIGHT, POINT, TEXTBOX. Since the field is a free-text String, the frontend may send additional types not in the enum. -->

## Comment endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/comments` | Create a comment |
| PUT | `/api/comments` | Update a comment |
| GET | `/api/comments/{id}` | Get comment by ID |
| DELETE | `/api/comments/{id}` | Delete a comment |

### Comment fields

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Required. |
| `content` | String | Max 5000 characters (`Comment.java:28`). |

## Rectangle endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/rectangles` | Create a rectangle |
| PUT | `/api/rectangles` | Update a rectangle |
| GET | `/api/rectangles/{id}` | Get rectangle by ID |
| DELETE | `/api/rectangles/{id}` | Delete a rectangle |

### Rectangle fields

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Required. |
| `x` | Double | Stored as `numeric(10,6)` (`Rectangle.java:27-37`). |
| `y` | Double | Stored as `numeric(10,6)`. |
| `width` | Double | Stored as `numeric(10,6)`. |
| `height` | Double | Stored as `numeric(10,6)`. |

## Bookmark endpoints

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/api/bookmarks` | Create a bookmark | Body must include `id`. |
| PUT | `/api/bookmarks` | Update a bookmark | Enforces ownership — 404 if bookmark belongs to different user (`BookmarkServiceImpl.java:110-113`). |
| GET | `/api/bookmarks/{id}` | Get bookmark by ID | |
| DELETE | `/api/bookmarks/{id}` | Delete a bookmark | Enforces ownership. |
| GET | `/{documentId}/bookmarks` | List all bookmarks for a document | Scoped to current user (`BookmarkResource.java:219`). |
| PUT | `/api/bookmarks_multiple` | Bulk update multiple bookmarks | Accepts array of bookmark DTOs. |
| DELETE | `/api/bookmarks_multiple` | Bulk delete bookmarks | Accepts `DeleteBookmarkDTO` (`BookmarkResource.java:285`). |

### Bookmark fields

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUID | Required. |
| `name` | String | Max 30 characters (`Bookmark.java:19`). |
| `documentId` | UUID | Note: this is a UUID type, unlike `AnnotationSet.documentId` which is String (`Bookmark.java:29`). |
| `pageNumber` | Integer | Page in document. |
| `xCoordinate` | Double | Horizontal position. |
| `yCoordinate` | Double | Vertical position. |
| `parent` | UUID | Parent bookmark ID for tree structure (`Bookmark.java:45`). |
| `previous` | UUID | Previous sibling ID for ordering (`Bookmark.java:48`). |

### DeleteBookmarkDTO shape

```json
{
  "deleted": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ],
  "updated": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "Updated bookmark",
    "documentId": "880e8400-e29b-41d4-a716-446655440003",
    "pageNumber": 1,
    "parent": null,
    "previous": null
  }
}
```

## Tag endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tags/{createdBy}` | List tags created by a specific user |

Tags use a composite primary key of `(name, created_by)` — they are user-scoped (`Tag.java:16-28`). Tags are persisted internally when annotations are saved (via the `@ManyToMany` cascade on `Annotation.tags`), not through a dedicated creation endpoint. There is no REST endpoint for creating or deleting tags directly.

<!-- DIVERGENCE: Confluence test page (1473558598) and workload model only reference GET /api/tags/{createdBy}. Source (TagResource.java) confirms only this single GET endpoint exists. No POST or DELETE tag endpoints. -->

Tags are associated with annotations via a join table (`annotation_tags`). When an annotation is created or updated with tags in its payload, the tags are persisted through JPA cascade.

## Metadata endpoints (feature-toggled)

| Method | Path | Description | Toggle |
|--------|------|-------------|--------|
| POST | `/api/metadata/` | Create metadata for a document | `endpoint-toggles.metadata` (default: `true`) — `MetaDataResource.java:76` |
| GET | `/api/metadata/{documentId}` | Get metadata for a document | `endpoint-toggles.metadata` (default: `true`) — `MetaDataResource.java:115` |

Conditionally registered via `@ConditionalOnProperty`. The entire controller (`MetaDataResource`) is toggled by `ENABLE_METADATA_ENDPOINT` env var (default: `true`).

### Metadata fields

Metadata tracks document rotation state (page orientation as set by the user in the media viewer).

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | Long | Auto-generated (sequence). |
| `documentId` | UUID | Required. The document this metadata belongs to. |
| `rotationAngle` | Integer | Required. Rotation angle applied to the document view. |
| `createdBy` | String | Auto-populated from IDAM token. Max 50 chars. |

The GET endpoint returns **204 No Content** (not 404) when no metadata exists or `rotationAngle` is null (`MetaDataResource.java:121-124`).

### Production traffic note

The `GET /api/metadata/{documentId}` endpoint is one of the three highest-traffic endpoints in production, with peak hourly requests of ~9,591 (Oct 2022 data). This is called by `em-media-viewer` every time a document is opened to restore rotation state.

## Document data deletion endpoint (feature-toggled)

| Method | Path | Description | Toggle |
|--------|------|-------------|--------|
| DELETE | `/api/documents/{docId}/data` | Cascade delete all annotations, bookmarks, and metadata for a document | `endpoint-toggles.document-data-deletion` (env: `ENABLE_DOCUMENT_DELETE_ENDPOINT`, default: `true`) — `DocumentDataResource.java:56` |

Requires S2S caller to be in the `delete-document-data.s2s-whitelist` (default: `em_gw`, `dm_store`), separate from the main S2S whitelist.

This endpoint supports the **Retain & Dispose** flow: when the Doc Disposer hard-deletes a document from DM Store, it first calls this endpoint to purge all associated annotation metadata. The operation is idempotent — returns 204 whether data existed or not. Only after a successful 204 response does the Doc Disposer proceed with the document binary deletion.

## Key gotchas

| Behaviour | Detail |
|-----------|--------|
| Client-generated IDs | All create endpoints require the caller to supply a UUID `id` in the body. `null` returns 400 (`AnnotationSetResource.java:90`, `AnnotationResource.java:92`). |
| 204 vs 404 on GET | `GET /api/annotation-sets/{id}` returns 204 when not found; `GET /api/annotations/{id}` returns 404. The service uses `wrapOrNoContent` vs `wrapOrNotFound` inconsistently (`AnnotationSetResource.java:202`, `AnnotationResource.java:213`). |
| `type` vs `annotationType` | The JSON key is `"type"` but the entity field is `annotationType` (`AnnotationDTO.java:22`). |
| `documentId` type mismatch | `AnnotationSet.documentId` is `String` (varchar 255); `Bookmark.documentId` is `UUID`. Callers must handle both formats. |
| User scoping | `/api/annotation-sets` (GET, paginated) is **not** user-scoped. Use `/api/annotation-sets/filter?documentId=` for the per-user version. |

## Annotation privacy and scoping

Annotations are currently **private by default** — only the creating user can see their own annotations. This is enforced at the application level via `SecurityUtils.getCurrentUserLogin()` in the filter endpoint.

<!-- CONFLUENCE-ONLY: not verified in source -->

A design for annotation sharing via Access Management integration was documented (privacy levels: Private, Internal Only, All Users, Share with specific users/roles). The agreed MVP scope covered only "Private" and "All Users" settings. It is unclear from the source whether this AM integration was ever implemented — the current codebase shows no calls to an AM `filterResource` API. The filter endpoint (`/api/annotation-sets/filter`) returns only the calling user's annotation set, consistent with the "private only" mode.

### Business rules for annotation creation

| Role | Can create annotations? | Default privacy |
|------|------------------------|-----------------|
| Judge | Yes | Private |
| Legal Representation | Yes | Private |
| Case Worker | No | N/A |

<!-- CONFLUENCE-ONLY: not verified in source -->

## Data scoping: documents not cases

Annotations, comments, bookmarks, and metadata are associated with a **document ID**, not a case ID. The `caseId` field on annotations is informational metadata (added in schema V7 for reporting) but is not used as a primary key or lookup index. This means:

- Deleting annotation data requires knowing the document ID, not the case reference.
- The document data deletion endpoint (`DELETE /api/documents/{docId}/data`) is invoked by the Doc Disposer (not the Case Disposer) as part of the Retain & Dispose flow.

<!-- DIVERGENCE: Confluence design doc (1902052306) proposes endpoint path DELETE /api/documents/{docId}/purge, but em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/DocumentDataResource.java:55 implements DELETE /api/documents/{docId}/data. Source wins. -->

## Known bugs and status code inconsistencies

The following issues were documented in Confluence test coverage and corroborated by source inspection:

| Issue | JIRA | Status |
|-------|------|--------|
| `GET /api/annotation-sets/{id}` returns 204 instead of 404 when not found | EM-3548 | By design (uses `wrapOrNoContent`) |
| `DELETE /api/annotation-sets/{id}` returns 200 instead of 204 | EM-3573 | Known |
| `DELETE /api/annotations/{id}` throws 500 for non-existent ID | EM-3540 | Known |
| `POST /api/bookmarks` returns 500 instead of 400 for missing mandatory fields | EM-3491 | Known |
| `GET /api/{documentId}/bookmarks` returns no content even when bookmarks exist | EM-3497 | Known |
| `POST /api/comments` allows creation without annotation ID | EM-3472 | Known |
| `POST /api/rectangles` allows creation without annotation ID | EM-3483 | Known |
| `GET /api/metadata/{documentId}` returns 204 instead of 404 | EM-3574 | By design |

<!-- CONFLUENCE-ONLY: not verified in source -->

## Production traffic patterns (2022 data)

Peak hourly request volumes from production (Jul-Oct 2022):

| Endpoint | Peak/Hour | Notes |
|----------|-----------|-------|
| `GET /api/annotation-sets/filter` | ~9,672 | Primary read path for media viewer |
| `GET /api/metadata/{documentId}` | ~9,591 | Document rotation state |
| `GET /api/{documentId}/bookmarks` | ~9,427 | Bookmark list on document open |
| `POST /api/annotations` | ~331 | Annotation creation |
| `PUT /api/bookmarks` | ~212 | Bookmark updates |
| `POST /api/bookmarks` | ~194 | Bookmark creation |
| All Rectangle/Comment standalone endpoints | 0 | Managed via nested objects in annotation sets |
| All AnnotationSet CRUD (non-filter) | 0 | Not used directly in production |

The three highest-traffic endpoints (`filter`, `metadata`, `bookmarks`) are all called by `em-media-viewer` when a document is opened in ExUI. Standalone Rectangle and Comment endpoints see zero direct traffic — these entities are managed through the nested annotation-set payload.

<!-- CONFLUENCE-ONLY: not verified in source -->

## Examples

### Annotation entity (domain model)

The `Annotation` entity shows that `annotationType` is stored as a plain `String` column — not an enum-constrained database type — so the API accepts any string value without a server-side validation error. The `@ManyToOne` association to `AnnotationSet` uses `@JsonIgnoreProperties("annotations")` to prevent circular serialisation.

```java
// Source: apps/em/em-annotation-api/src/main/java/uk/gov/hmcts/reform/em/annotation/domain/Annotation.java
@Entity
@Table(name = "annotation")
public class Annotation extends AbstractAuditingEntity implements Serializable {

    @Id
    private UUID id;

    @Column(name = "annotation_type")
    private String annotationType;   // free-text; valid values: AREA, HIGHLIGHT, POINT, TEXTBOX

    @Column(name = "page")
    private Integer page;

    @Column(name = "color")
    private String color;

    @OneToMany(mappedBy = "annotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Comment> comments = new HashSet<>();

    @ManyToMany(fetch = FetchType.EAGER, cascade = CascadeType.PERSIST)
    @JoinTable(
        name = "annotation_tags",
        joinColumns = @JoinColumn(name = "annotation_id"),
        inverseJoinColumns = {
            @JoinColumn(name = "name", referencedColumnName = "name"),
            @JoinColumn(name = "createdBy", referencedColumnName = "created_by")
        })
    private Set<Tag> tags = new LinkedHashSet<>();

    @OneToMany(mappedBy = "annotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Rectangle> rectangles = new HashSet<>();

    @ManyToOne
    @JsonIgnoreProperties("annotations")
    private AnnotationSet annotationSet;

    @Column(name = "case_id")
    private String caseId;

    @Column(name = "jurisdiction")
    private String jurisdiction;

    @Column(name = "comment_header")
    private String commentHeader;
    // ...
}
```

## See also

- [Annotation Flow](../explanation/annotation-flow.md) — explains the annotation and redaction architecture, proxy configuration, data model, and key differences between annotation and redaction flows
- [Add Annotations](../how-to/add-annotations.md) — step-by-step how-to for creating annotation sets, annotations, bookmarks, and rotation metadata
- [Media Viewer](../explanation/media-viewer.md) — the Angular frontend that calls these endpoints via the `/em-anno` proxy
- [Glossary](glossary.md#annotationset) — definitions for `AnnotationSet`, `Annotation`, `Bookmark`, and `Redaction`
