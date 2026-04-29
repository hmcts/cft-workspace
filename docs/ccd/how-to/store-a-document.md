---
topic: documents-and-cdam
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentUtils.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentAmApiClient.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseDocumentController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/search/CaseDocumentsMetadata.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/document/CaseDocumentAccessManagement.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/document/CaseDataDocumentService.java
examples_extracted_from:
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/document/CaseDocumentAccessManagement.java
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/document/model/DivorceDocument.java
status: reviewed
last_reviewed: "2026-04-29T00:00:00Z"
---

# Store a Document

## TL;DR

- Upload a file to CDAM (`CaseDocumentClient.uploadDocuments`), then embed the returned URL in a `Document` field in case data during an event's `about_to_submit` callback.
- Every document field in case data carries three keys: `document_url`, `document_binary_url`, and (transiently) `document_hash`.
- CCD Data Store detects new documents at event submission, calls `CaseDocumentAmApiClient.applyPatch` to register them with CDAM, then strips `document_hash` before persisting — the hash token lives only in CDAM.
- The `category_id` metadata field on the document controls which bucket/folder the document appears in for users and downstream consumers.
- Retrieve document metadata via `GET /cases/{caseId}/documents/{documentId}`.
- Three feature flags gate CDAM integration: `attachDocumentEnabled`, `documentHashCloneEnabled`, `documentHashCheckingEnabled` — coordinate them or behaviour is inconsistent.

---

## Prerequisites

- S2S service token for your service.
- A user JWT with the appropriate CCD role that has CRU permission on the document field.
- CDAM (`ccd-case-document-am-api`) reachable from your service.
- The case type and jurisdiction known (required by CDAM at upload time).

---

## Step 1 — Upload the file to CDAM

Call CDAM's upload endpoint via the `CaseDocumentClient` Feign client
(`uk.gov.hmcts.reform.ccd.document.am.feign`). Pass `caseType` and `jurisdiction`
so CDAM can apply the correct access policy.

```java
// nfdiv pattern — CaseDocumentAccessManagement.java:36
UploadResponse response = client.uploadDocuments(
    userToken,
    serviceToken,
    caseType,        // e.g. "NFD"
    jurisdiction,    // e.g. "DIVORCE"
    List.of(multipartFile)
);
Document doc = response.getDocuments().get(0);
// doc.links.self.href  → document_url
// doc.links.binary.href → document_binary_url
// doc.hashToken        → document_hash (use in case data; stripped before persist)
```

Wrap the raw bytes as `InMemoryMultipartFile` with `APPLICATION_PDF_VALUE`
(nfdiv does this in `CaseDocumentAccessManagement.java:44`). Non-PDF MIME types
are supported but PDF is the common case.

---

## Step 2 — Embed the document reference in case data

Return the document reference from your `about_to_submit` callback inside the
`data` map. The field must be typed as a CCD `Document` complex type in your
case-type definition.

```json
{
  "data": {
    "myDocument": {
      "document_url": "https://cdam-host/documents/abc-123",
      "document_binary_url": "https://cdam-host/documents/abc-123/binary",
      "document_hash": "hashTokenReturnedByCDAM",
      "document_filename": "petition.pdf",
      "category_id": "applicationForms"
    }
  }
}
```

Key fields:

| Field | Required | Notes |
|---|---|---|
| `document_url` | Yes | Self-link returned by CDAM upload |
| `document_binary_url` | Yes | Binary download link |
| `document_hash` | Yes (while hash-checking enabled) | CDAM hash token; stripped by Data Store before DB persist |
| `document_filename` | Recommended | Display name in ExUI |
| `category_id` | Recommended | Controls folder/bucket visibility |

The field name constant in Data Store is `CaseDocumentUtils.DOCUMENT_URL = "document_url"`
and `DOCUMENT_HASH = "document_hash"` (`CaseDocumentUtils.java:31-33`).

> **Note**: `DOCUMENT_BINARY_URL` constant in `CaseDocumentUtils.java:32` is
> set to the string `"document_url"` — likely a copy-paste bug. Use the literal
> string `"document_binary_url"` in your own JSON.

---

## Step 3 — What CCD Data Store does automatically at submit

When `POST /cases/{caseId}/events` is processed:

1. `CaseDocumentService.extractDocumentHashToken()` walks the DB snapshot,
   pre-callback data, and post-callback data to find new or modified document
   fields (`CaseDocumentService.java:51-79`).
2. `verifyNoTamper()` rejects any callback response that changed an existing
   `document_hash` value (`CaseDocumentService.java:131-138`). Do not overwrite
   existing hash tokens.
3. New documents are registered with CDAM via
   `CaseDocumentAmApiClient.applyPatch(CaseDocumentsMetadata)`
   (`CaseDocumentService.java:104`). This call is gated by the
   `attachDocumentEnabled` flag (`CaseDocumentService.java:92`).
4. `stripDocumentHashes()` removes every `document_hash` from the data before
   DB persist and before returning to the caller
   (`CaseDocumentService.java:41-48`). The `case_data` table therefore never
   stores hash tokens.

---

## Step 4 — What `category_id` buys you

CDAM uses `category_id` to group documents into logical folders visible in
ExUI's document tab. Without it the document lands in the default uncategorised
bucket. Set it to a value from the category list configured for your case type
in the definition store.

nfdiv stores documents as `ListValue<DivorceDocument>` where `DivorceDocument`
wraps a `ccd.sdk.type.Document` and a `DocumentType` enum
(`nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/document/model/`). The
`DocumentType` drives `category_id` mapping.

---

## Step 5 — Retrieve document metadata

```
GET /cases/{caseId}/documents/{documentId}
```

Handled by `CaseDocumentController.getCaseDocumentMetadata()`
(`CaseDocumentController.java:59`). Returns CDAM metadata for the document
including its current `category_id`, permissions, and TTL if set.

The `documentId` is the UUID segment from `document_url`
(`https://cdam-host/documents/<documentId>`).

---

## Hash-token lifecycle summary

```
Upload to CDAM → CDAM returns hashToken
      ↓
Callback returns {document_url, document_binary_url, document_hash}
      ↓
Data Store: extractDocumentHashToken() detects new doc
      ↓
Data Store: applyPatch() registers doc+hash with CDAM (attachDocumentEnabled=true)
      ↓
Data Store: stripDocumentHashes() removes hash from data
      ↓
DB case_data: no hash stored — hash lives in CDAM only
      ↓
GET /cases/{caseId}/documents/{documentId} → metadata from CDAM
```

---

## Feature flags

All three flags must be aligned. Partial enablement causes inconsistent
behaviour:

| Flag | Effect when `true` |
|---|---|
| `attachDocumentEnabled` | Data Store calls `applyPatch` to register docs with CDAM |
| `documentHashCloneEnabled` | Hash tokens are stripped before persist/response |
| `documentHashCheckingEnabled` | Missing hash tokens on new documents are rejected |

---

## Verify

1. Submit the event and confirm the response `data` field for your document does
   **not** contain `document_hash` (it is stripped by Data Store before return).
2. Call `GET /cases/{caseId}/documents/{documentId}` — a `200` response with
   the document metadata confirms CDAM registration succeeded.
3. In CDAM logs, look for `applyPatch` called with your document UUID to confirm
   the registration path was exercised.

---

## Example

### Upload and embed a document (nfdiv pattern)

```java
// from apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/document/CaseDocumentAccessManagement.java
@Service
@AllArgsConstructor
public class CaseDocumentAccessManagement {

    private CaseDocumentClient client;

    public UploadResponse upload(final String userToken,
                                 final String serviceToken,
                                 final String displayName,
                                 final String fileName,
                                 final String filePath) throws IOException {

        final var file = IOUtils.resourceToByteArray(filePath);

        return client.uploadDocuments(
            userToken,
            serviceToken,
            getCaseType(),   // e.g. "NFD"
            JURISDICTION,    // e.g. "DIVORCE"
            List.of(
                new InMemoryMultipartFile(
                    displayName,
                    fileName,
                    MediaType.APPLICATION_PDF_VALUE,
                    file
                )
            )
        );
    }
}
```

<!-- source: apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/document/CaseDocumentAccessManagement.java:28-50 -->

### Document field on a case-data class (nfdiv pattern)

```java
// from apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/document/model/DivorceDocument.java
@Data
@NoArgsConstructor
@Builder
public class DivorceDocument {

    @CCD(
        label = "Select your document",
        regex = ".pdf,.tif,.tiff,.jpg,.jpeg,.png"
    )
    private Document documentLink;   // sdk type — carries document_url, document_binary_url, document_hash

    @CCD(label = "Date added")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate documentDateAdded;

    @CCD(
        label = "Select document type",
        typeOverride = FixedList,
        typeParameterOverride = "DocumentType"  // drives category_id mapping
    )
    private DocumentType documentType;
}
```

<!-- source: apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/document/model/DivorceDocument.java:21-57 -->

## See also

- [Documents and CDAM](../explanation/documents-and-cdam.md) — conceptual overview of the CDAM integration and hash-token lifecycle
- [CDAM API reference](../reference/api-cdam.md) — full endpoint reference for ccd-case-document-am-api

## Glossary

| Term | Definition |
|---|---|
| CDAM | Case Document Access Management — the service that stores and access-controls case documents. Replaces legacy DM Store. |
| `document_hash` | A short-lived token returned by CDAM on upload, passed through case data, used by Data Store to register the doc with CDAM, then stripped. Never persisted in the `case_data` table. |
| `category_id` | Metadata field on a document that controls its folder/bucket classification in ExUI. |
| `applyPatch` | CDAM endpoint called by Data Store to register one or more documents against a case reference. |
