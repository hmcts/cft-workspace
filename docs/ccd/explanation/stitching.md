---
topic: stitching
audience: both
sources: []
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Stitching

## TL;DR

- Stitching is the process of assembling multiple documents into a single PDF via the `em-stitching-api` service.
- A service triggers stitching by populating a `DocumentTaskDTO` payload and calling the stitching API; CCD stores the resulting `Document` reference.
- The stitched output is a `Document` complex type: `url`, `binaryUrl`, `filename`.
- Services that use ccd-config-generator map the stitched document to a field typed `Document` (`Document.java` in the SDK built-in types).

<!-- TODO: research note insufficient for em-stitching-api endpoint paths, request/response shape, and async polling pattern. Re-run research phase targeting apps/ccd/em-stitching-api or apps/em-stitching-api. -->

## When services use stitching

Stitching is used when a case event must bundle several uploaded files into one renderable document — for example, combining a coversheet with an application PDF before serving to a respondent.

The calling service:

1. Collects document references from case data (each is a `Document` with `url` + `binaryUrl`).
2. Posts a bundle descriptor to `em-stitching-api`.
3. Polls or awaits a callback until the stitched document URL is returned.
4. Writes the returned `Document` back to a CCD field via an `aboutToSubmit` callback.

## Data shape

The SDK `Document` type used to hold the stitched result:

```json
{
  "document_url": "https://dm-store/documents/<uuid>",
  "document_binary_url": "https://dm-store/documents/<uuid>/binary",
  "document_filename": "stitched-bundle.pdf"
}
```

In ccd-config-generator the field is declared as type `Document`
(`sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java`).

<!-- TODO: research note insufficient for the DocumentTaskDTO / BundleDTO schema and the em-stitching-api POST endpoint. -->

## See also

- [`docs/ccd/explanation/documents.md`](documents.md) — CDAM document upload and access
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definition of Document complex type
