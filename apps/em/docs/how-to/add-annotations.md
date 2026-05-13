---
title: Add Annotations
topic: annotation
diataxis: how-to
product: em
audience: both
sources:
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/AnnotationSetResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/AnnotationResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/BookmarkResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/FilterAnnotationSet.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/MetaDataResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/TagResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/rest/DocumentDataResource.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/AnnotationSet.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/Annotation.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/Comment.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/Rectangle.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/Bookmark.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/Metadata.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/Tag.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/domain/enumeration/AnnotationType.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/service/dto/AnnotationDTO.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/config/security/SecurityConfiguration.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/config/security/DeleteDocumentDataInterceptor.java
  - em-annotation-api:src/main/java/uk/gov/hmcts/reform/em/annotation/config/CommentHeaderConfig.java
  - em-annotation-api:src/main/resources/application.yaml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "303989415"
    title: "Annotation LLD"
    last_modified: "unknown"
    space: "RDM"
  - id: "1473558598"
    title: "Annotation API"
    last_modified: "unknown"
    space: "RDM"
  - id: "1114964596"
    title: "EM DM - Annotations"
    last_modified: "unknown"
    space: "RQA"
  - id: "1236697622"
    title: "Annotation Comment Behavior"
    last_modified: "unknown"
    space: "RDM"
  - id: "1122501633"
    title: "Annotation Access Management"
    last_modified: "unknown"
    space: "RDM"
  - id: "1184924652"
    title: "Annotation API - Error Handling"
    last_modified: "unknown"
    space: "RSTR"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- `em-annotation-api` stores annotations (highlights, comments, bookmarks) against documents, scoped per user.
- All requests require both an IDAM Bearer token and an S2S `serviceauthorization` header (whitelisted services: `em_gw`, `xui_webapp`).
- Callers must generate and supply UUID IDs — the API does not auto-generate them (`AnnotationSetResource.java:90`, `AnnotationResource.java:92`).
- An `AnnotationSet` is the root container: one per (user, document) pair, enforced by DB constraint.
- The standard workflow is get-or-create: call `GET /api/annotation-sets/filter?documentId=` first, then create a set only if one does not exist.
- Supported annotation types: `AREA`, `HIGHLIGHT`, `POINT`, `TEXTBOX` (`AnnotationType.java`).

## Prerequisites

- A valid IDAM OAuth2 Bearer token for the acting user.
- An S2S token from `service-auth-provider` for a whitelisted service (default: `em_gw`, `xui_webapp`).
- The DM Store document ID (UUID string) of the document to annotate.

## Create an annotation set

An `AnnotationSet` is the top-level container. One set per (user, document) pair is enforced at database level (`V1__baseline_migration.sql:184`).

1. Generate a UUID for the annotation set ID (client-side).
2. Send the following request:

```http
POST /api/annotation-sets
Authorization: Bearer {idam_token}
ServiceAuthorization: {s2s_token}
Content-Type: application/json

{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "documentId": "{dm_store_document_id}"
}
```

3. The API saves the set and returns the fully rendered DTO with HTTP 201.

**Note**: If a set already exists for this (user, document) pair, the request will fail with a constraint violation (HTTP 400).

## Add an annotation (highlight, area, point, or textbox)

Annotations belong to an `AnnotationSet`. Each annotation has a `type` (one of `AREA`, `HIGHLIGHT`, `POINT`, `TEXTBOX`), bounding rectangles (for highlights/areas), and optional comments.

1. Generate a UUID for the annotation ID.
2. Generate UUIDs for any comments and rectangles.
3. Send the request:

```http
POST /api/annotations
Authorization: Bearer {idam_token}
ServiceAuthorization: {s2s_token}
Content-Type: application/json

{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "annotationSetId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "highlight",
  "page": 1,
  "color": "FFFF00",
  "comments": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "content": "This paragraph is relevant to the claim"
    }
  ],
  "rectangles": [
    {
      "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "x": 100.0,
      "y": 200.0,
      "width": 300.0,
      "height": 20.0
    }
  ]
}
```

4. The API returns HTTP 201 with the created annotation DTO.

**Key field notes**:

| Field | Notes |
|-------|-------|
| `type` | Maps to `annotationType` in the domain via `@JsonProperty("type")` (`AnnotationDTO.java:20–21`). Valid values: `AREA`, `HIGHLIGHT`, `POINT`, `TEXTBOX` (`AnnotationType.java`) |
| `page` | Integer page number; validated `@Min(0)` — must not be negative (`AnnotationDTO.java:23`) |
| `color` | String colour value (hex without `#` prefix) |
| `comments[].content` | Max 5000 characters (`Comment.java:28`) |
| `rectangles[]` | Coordinates as `Double`; stored as `numeric(10,6)` |
| `documentId` | Optional String — included in response only when non-null (`@JsonInclude(NON_NULL)`) |
| `caseId` | Optional String — case reference for the annotation |
| `jurisdiction` | Optional String — jurisdiction identifier |
| `commentHeader` | Optional String — configured per jurisdiction via `configuration.comment-header.jurisdictionPaths` in `application.yaml` |
| `tags` | Optional set of `TagDTO` objects (name, label, color) attached to the annotation |

## Add a bookmark

Bookmarks are independent of annotation sets. They reference a document ID (UUID type) directly and support tree structure via `parent` and `previous` fields.

1. Generate a UUID for the bookmark ID.
2. Send the request:

```http
POST /api/bookmarks
Authorization: Bearer {idam_token}
ServiceAuthorization: {s2s_token}
Content-Type: application/json

{
  "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "documentId": "f6a7b8c9-d0e1-2345-fabc-456789012345",
  "name": "Key evidence",
  "pageNumber": 3,
  "xCoordinate": 0,
  "yCoordinate": 150,
  "parent": null,
  "previous": null
}
```

3. The API returns HTTP 201 with the created bookmark.

**Constraints**: `name` is limited to 30 characters (`Bookmark.java:19–50`). Note that `documentId` for bookmarks is a UUID, unlike annotation sets where it is a String (`AnnotationSet.java:32`, `Bookmark.java:29`).

### Bulk-update bookmarks

Use `PUT /api/bookmarks_multiple` to update multiple bookmarks in a single request (`BookmarkResource.java:174`).

### Bulk-delete bookmarks

Use `DELETE /api/bookmarks_multiple` with a body containing:

```json
{
  "deleted": ["uuid-1", "uuid-2"],
  "updated": { "id": "uuid-3", "parent": null, "previous": null, "..." : "..." }
}
```

The `updated` field is optional and allows re-pointing a sibling/parent after deletion (`BookmarkResource.java:285–305`).

## Retrieve annotations for a document

Use the user-scoped filter endpoint — **not** the raw `GET /api/annotation-sets` which returns all sets without user scoping (`AnnotationSetResource.java:164`).

```http
GET /api/annotation-sets/filter?documentId={dm_store_document_id}
Authorization: Bearer {idam_token}
ServiceAuthorization: {s2s_token}
```

This returns the annotation set (with nested annotations, comments, and rectangles) for the calling user's document. Returns HTTP 404 if no set exists (`FilterAnnotationSet.java:56`).

## Retrieve bookmarks for a document

```http
GET /{documentId}/bookmarks
Authorization: Bearer {idam_token}
ServiceAuthorization: {s2s_token}
```

Returns all bookmarks for the current user on the specified document (`BookmarkResource.java:219`).

## Typical integration workflow

The recommended pattern used by `em-media-viewer` and XUI consumers:

1. **Get or create annotation set** — call `GET /api/annotation-sets/filter?documentId={id}`. If HTTP 404 is returned, create a new annotation set via `POST /api/annotation-sets`.
2. **Post annotation** — create annotations (highlights, areas) via `POST /api/annotations` referencing the annotation set ID.
3. **Add comment** — comments are nested within the annotation payload. To add a comment to an existing annotation, use `PUT /api/annotations` with the updated annotation body including the new comment.
4. **Retrieve all** — re-fetch the annotation set via the filter endpoint to get the full tree (annotations, comments, rectangles).

<!-- CONFLUENCE-ONLY: not verified in source -->
This get-or-create pattern is documented in the "EM DM - Annotations" Confluence page and matches the observed media-viewer client behaviour. There is no explicit lock mechanism for concurrent updates to the same annotation.

## Set document rotation metadata

The metadata endpoint stores page rotation angles for a document. It is feature-toggled via `endpoint-toggles.metadata` (default: enabled).

```http
POST /api/metadata/
Authorization: Bearer {idam_token}
ServiceAuthorization: {s2s_token}
Content-Type: application/json

{
  "documentId": "f6a7b8c9-d0e1-2345-fabc-456789012345",
  "rotationAngle": 90
}
```

Returns HTTP 201 with the created metadata DTO.

**Retrieve** rotation metadata for a document:

```http
GET /api/metadata/{documentId}
Authorization: Bearer {idam_token}
ServiceAuthorization: {s2s_token}
```

Returns HTTP 200 with `rotationAngle`, or HTTP 204 (No Content) if no rotation is set (`MetaDataResource.java:116–126`).

**Constraints**: Both `documentId` (UUID) and `rotationAngle` (Integer) are `@NotNull` (`MetadataDto.java:14–17`).

## Retrieve tags for a user

Tags are user-defined labels that can be attached to annotations. Retrieve all tags created by a specific user:

```http
GET /api/tags/{createdBy}
Authorization: Bearer {idam_token}
ServiceAuthorization: {s2s_token}
```

Returns HTTP 200 with a list of `TagDTO` objects. Each tag has: `name` (max 20 chars), `label` (max 20 chars), `color` (max 20 chars), and `createdBy` (`Tag.java:21–32`).

## Delete all document data

Purges all annotations, bookmarks, and metadata for a document. This endpoint has a **separate** S2S whitelist (`em_gw`, `dm_store`) enforced by `DeleteDocumentDataInterceptor`, and is feature-toggled via `endpoint-toggles.document-data-deletion` (default: enabled).

```http
DELETE /api/documents/{docId}/data
Authorization: Bearer {idam_token}
ServiceAuthorization: {s2s_token}
```

Returns HTTP 204. The operation is idempotent — succeeds even if no data exists for the document.

## Permissions model

- All `/api/**` endpoints require both IDAM JWT and S2S token (`SecurityConfiguration.java:71`).
- Authorised S2S callers default to `em_gw,xui_webapp` (configurable via `S2S_NAMES_WHITELIST` env var, `application.yaml:115`).
- Annotation sets are user-scoped: `findOneByDocumentId` filters by `SecurityUtils.getCurrentUserLogin()` (`AnnotationSetServiceImpl.java:97–99`).
- Bookmark write/update/delete operations enforce ownership — a `ResourceNotFoundException` is thrown if the bookmark belongs to a different user (`BookmarkServiceImpl.java:73–77`, `BookmarkServiceImpl.java:110–113`).
- The document-data deletion endpoint (`DELETE /api/documents/{docId}/data`) has a separate S2S whitelist (`em_gw,dm_store` via `DELETE_DOCUMENT_DATA_WHITELIST` env var) and is feature-toggled via `endpoint-toggles.document-data-deletion`.
- Only the annotation creator can edit or delete their annotations — there is no sharing mechanism in the current source code.

<!-- CONFLUENCE-ONLY: not verified in source -->
Confluence documents a planned annotation-sharing feature with privacy levels (Private, Internal Only, All Users, Share with specific users/roles) integrating with the Access Management component. The design specifies AM records with `serviceName=Annotations`, `resourceType=annotation`, `resourceName=documentAnnotation`. This sharing functionality is **not yet implemented** in the current `em-annotation-api` source — only creator-scoped private annotations exist today.

## Error handling

Common error responses across all annotation endpoints:

| Status | Cause |
|--------|-------|
| 400 | DTO validation failure (invalid UUID, missing required fields, constraint violation such as duplicate annotation set for same user+document) |
| 401 | Missing or invalid IDAM Bearer token or S2S token |
| 403 | Calling service not in the S2S whitelist |
| 404 | Resource not found (annotation, annotation set, bookmark, comment, or rectangle with given ID does not exist) |
| 500 | Unexpected server error (e.g., update fails due to data integrity issue) |

**Notes from functional testing**: Some endpoints return HTTP 500 instead of the expected 400/404 for edge cases (e.g., creating a bookmark without mandatory fields, deleting a non-existent annotation). These are documented bugs in the Confluence "Annotation API" test coverage page.

## Verify

1. Create an annotation set and annotation using the steps above.
2. Confirm creation by calling the filter endpoint:

```bash
curl -s -X GET \
  "https://{host}/api/annotation-sets/filter?documentId={document_id}" \
  -H "Authorization: Bearer {idam_token}" \
  -H "ServiceAuthorization: {s2s_token}" \
  | jq '.id, .annotations[0].id'
```

Both UUIDs you supplied should be returned in the response.

## See also

- [Annotation Flow](../explanation/annotation-flow.md) — explains the annotation and redaction architecture, data model, proxy configuration, and key differences between the two flows
- [API: Annotation](../reference/api-annotation.md) — full endpoint reference for `em-annotation-api` including all CRUD paths, field constraints, known bugs, and production traffic patterns
- [Embed Media Viewer](embed-media-viewer.md) — how to configure `@hmcts/media-viewer` to enable the annotation UI that calls these endpoints via proxy
- [Local Development with cftlib](local-development-cftlib.md) — how to run `em-annotation-api` locally with `bootWithCCD` to test annotation flows end-to-end
