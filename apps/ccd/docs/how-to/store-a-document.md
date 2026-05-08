---
topic: documents-and-cdam
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentUtils.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentAmApiClient.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentTimestampService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseDocumentController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/search/CaseDocumentsMetadata.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/ApplicationParams.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/document/CaseDocumentAccessManagement.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/document/CaseDataDocumentService.java
examples_extracted_from:
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/document/CaseDocumentAccessManagement.java
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/document/model/DivorceDocument.java
status: confluence-augmented
last_reviewed: "2026-04-29T00:00:00Z"
confluence_checked_at: "2026-04-29T00:00:00Z"
confluence:
  - id: "1915164271"
    title: "Secure doc store (CDAM) onboarding and gotchas"
    space: "FR"
  - id: "1953044768"
    title: "CCD Case Document Access Management (CDAM) onboarding"
    space: "DATS"
  - id: "1456373800"
    title: "Case Document & CCD - Data Store Design"
    space: "RCCD"
  - id: "1315471928"
    title: "How To Guide - Case File View (Document Categories)"
    space: "RCCD"
  - id: "1739314145"
    title: "Case File View: Upload Timestamp Population"
    space: "RCCD"
  - id: "1655935271"
    title: "CDAM Service Configuration Review"
    space: "RBS"
  - id: "1945644195"
    title: "CDAM Architecture"
    space: "RTA"
---

# Store a Document

## TL;DR

- Upload a file to CDAM (`CaseDocumentClient.uploadDocuments`) with **mandatory** `caseTypeId` and `jurisdictionId`; CDAM returns a doc URL plus a SHA-256 hash token tied to those three values plus the new document id. Then embed the URL+hash in a `Document` field in case data during an event's `about_to_submit` callback.
- Every document field in case data carries `document_url`, `document_binary_url`, `document_filename`, optional `category_id`, optional `upload_timestamp`, and (transiently) `document_hash`.
- Newly uploaded documents have a TTL in DocStore. If the CCD event isn't completed in time the file auto-deletes — this is the "shell case + upload + submit" pattern.
- CCD Data Store detects new documents at event submission, calls `CaseDocumentAmApiClient.applyPatch` (which `PATCH`es `case-document-am-api`) to register them with CDAM (validates the hash, sets the case id in metadata, removes the TTL). It strips `document_hash` before DB persist and before returning to the caller — the hash token lives only in CDAM.
- The `category_id` metadata field on the document controls which folder the document appears in inside ExUI's Case File View. Categories are configured per case type in a definition-store **Categories** sheet (or via the config-generator SDK's `builder.categories(...)`).
- Data Store auto-populates `upload_timestamp` on new documents after the `about_to_submit` callback (opt-in per case type via `ccd.upload-timestamp-featured-case-types`). Services can set it themselves in the callback and it will not be overwritten. HTML filenames (`.html`/`.htm`) are blocked at this stage unless the field regex explicitly allows them.
- Three feature flags gate CDAM integration in Data Store: `attachDocumentEnabled` (default `true`), `documentHashCloneEnabled` (default `true`), `documentHashCheckingEnabled` (default depends on `enable.document.hash.check`) — coordinate them or behaviour is inconsistent.

---

## Prerequisites

- S2S service token for your service.
- A user JWT with the appropriate CCD role that has CRU permission on the document field.
- CDAM (`ccd-case-document-am-api`) reachable from your service.
- The case type and jurisdiction known (required by CDAM at upload time).
- The calling service is on the `case-document-am-api` S2S whitelist (in `cnp-flux-config`) and has an entry in CDAM's `service_config.json` granting permission for that jurisdiction and case type. Permission types are: `CREATE` (upload), `READ` (download metadata/binary), `HASHTOKEN` (generate hash for pre-existing docs). Bulk-scan services hold wildcard (`*/*`) CREATE/HASHTOKEN because the envelope's jurisdiction/case-type is unknown at scan time. <!-- CONFLUENCE-ONLY: described in FR onboarding page (1915164271) and service config review (1655935271); not visible from this repo without a CDAM clone -->
- For Case File View / categorised documents: a **Categories** sheet in the case-type definition (or `builder.categories(...)` if you use the config-generator SDK).

---

## Step 1 — Upload the file to CDAM

Call CDAM's upload endpoint (`POST /cases/documents`) via the `CaseDocumentClient` Feign client
(`uk.gov.hmcts.reform.ccd.document.am.feign`). The request must carry three
mandatory pieces of metadata: `jurisdictionId`, `caseTypeId`, and `classification`
— CDAM persists them on the document and uses them in subsequent access checks.
A 403 from a later download means those values didn't match the caller's
authorisation. <!-- CONFLUENCE-ONLY: classification field described in LLD (1456373800); not directly enforced in CCD Data Store source -->

The hash token returned with the upload is generated as
`SHA-256(caseTypeId + jurisdictionId + documentId)` salted with a secret from
the CDAM key vault. <!-- CONFLUENCE-ONLY: algorithm choice from LLD (1456373800); not visible from CCD Data Store source -->

CDAM applies a configurable TTL to the uploaded document. If the CCD event
that should attach it never completes, the binary auto-deletes from DocStore.
The original LLD set this to 10 minutes; consult your CDAM deployment for the
actual value. <!-- CONFLUENCE-ONLY: TTL value cited in LLD (1456373800) -->

This is why decentralised services follow a "shell case + upload + submit"
pattern (see PCS write-up referenced below): create the case-holding record
first to get a case reference, then upload, then submit the event.

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
      "category_id": "applicationForms",
      "upload_timestamp": "2026-04-29T12:34:56"
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
| `category_id` | Recommended | Controls folder/bucket visibility in Case File View |
| `upload_timestamp` | Optional | `LocalDateTime`; surfaced under the filename in CFV |

The SDK type `uk.gov.hmcts.ccd.sdk.type.Document` maps these JSON keys to
fields `url`, `binaryUrl`, `filename`, `categoryId`, and `uploadTimestamp`
(`Document.java:17-74`).

> **Note**: The `DOCUMENT_BINARY_URL` constant in `CaseDocumentUtils.java:32`
> is set to the string `"document_url"` — likely a copy-paste bug. Always use
> the literal `"document_binary_url"` in your own JSON.

---

## Step 3 — What CCD Data Store does automatically at submit

When `POST /cases/{caseId}/events` is processed:

1. **Pre-callback extract.** Data Store extracts the documents+hash tokens from
   the incoming `CaseDataContent` and removes the `document_hash` so the
   callback never sees it (`CaseDocumentService.extractDocumentHashToken`,
   `CaseDocumentService.java:51-79`). It also captures any documents already
   on the DB snapshot, so it can tell new docs from existing ones.
2. **Tamper check.** `verifyNoTamper()` rejects any callback response that
   changed an existing `document_hash` value
   (`CaseDocumentService.java:131-138`). Callbacks must not overwrite existing
   hash tokens.
3. **Validate (optional).** When `documentHashCheckingEnabled` is on, missing
   hashes on new documents throw `ValidationException`
   (`CaseDocumentService.java:108-120`).
4. **Attach to CDAM.** New documents are registered with CDAM via
   `CaseDocumentAmApiClient.applyPatch(CaseDocumentsMetadata)`
   (`CaseDocumentService.java:104`). This call is gated by the
   `attachDocumentEnabled` flag (`CaseDocumentService.java:92`). Internally it
   `PATCH`es `case-document-am-api`'s `/cases/documents` endpoint via the
   Feign client (`CaseDocumentAmApiClient.java:31-49`). On failure (forbidden
   or otherwise) it raises `DocumentTokenException` and the transaction
   rolls back. <!-- DIVERGENCE: Confluence (1456373800) refers to the endpoint as `POST /cases/documents/attachToCase`. Data Store source (CaseDocumentAmApiClient.java:39) uses `caseDocumentClientApi.patchDocument(...)` — i.e. it is implemented as a PATCH on `/cases/documents`. Source wins; the Confluence path is historical/incorrect. -->
5. **CDAM-side effect.** CDAM validates each hash, sets the case id in the
   document's metadata, and bulk-removes the TTL so the doc is no longer
   garbage-collected. <!-- CONFLUENCE-ONLY: CDAM-side metadata update + TTL removal described in LLD (1456373800); CDAM source is in libs/rse-cft-lib/projects/ccd-case-document-am-api -->
6. **Strip hashes.** `stripDocumentHashes()` removes every `document_hash` from
   the data before DB persist and before returning to the caller
   (`CaseDocumentService.java:41-49`). The `case_data` table therefore never
   stores hash tokens. This step is gated by `documentHashCloneEnabled` for
   the cloning path; an in-source `TODO` notes the flag is intended to be
   removed and the behaviour made unconditional.
7. **Auto-populate `upload_timestamp`.** After the `about_to_submit` callback
   returns, `CaseDocumentTimestampService.addUploadTimestamps()` compares the
   modified case data against the DB snapshot and stamps any new document
   (identified by `document_url` not present in the original) with the current
   UTC time in nanosecond-precision ISO format
   (`yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS`). If the service already set
   `upload_timestamp` in its callback, the value is preserved (the service
   takes precedence). This feature is **opt-in per case type** via
   `ccd.upload-timestamp-featured-case-types` (`ApplicationParams.java:191`).
8. **HTML upload blocking.** Within the same timestamp-population pass, if a new
   document has a filename ending in `.html`/`.htm` and the field's
   `regularExpression` does not explicitly permit HTML, a
   `CaseValidationException` is thrown and the event is rejected
   (`CaseDocumentTimestampService.java:267-269`).

---

## Step 4 — What `category_id` buys you

CDAM/Data Store uses `category_id` to group documents into logical folders
visible in ExUI's **Case File View** tab. Without a value the document lands
in the "Uncategorised" folder. Set `category_id` to a `CategoryID` from the
**Categories** sheet (or `builder.categories(...)` invocation) configured for
your case type. <!-- CONFLUENCE-ONLY: Uncategorised-folder fallback documented in CFV how-to (1315471928); not directly in CCD source -->

### Defining categories (spreadsheet)

In the case-type definition spreadsheet, fill out a `Categories` sheet:

| CaseTypeID | CategoryID | CategoryLabel | DisplayOrder | ParentCategoryID |
|---|---|---|---|---|
| myCaseType | C1 | Application Documents | 10 | |
| myCaseType | C2 | Supporting Documents | 20 | |
| myCaseType | C11 | Evidence | 10 | C1 |
| myCaseType | C12 | ID Proof | 20 | C1 |

Then on `CaseField` (and `ComplexTypes` for nested document fields), set the
`CategoryID` column to a value from above for each `Document` or
`Collection<Document>` field. Add a `ComponentLauncher` field plus a
`caseFileView` tab whose `DisplayContextParameter` is `#ARGUMENT(CaseFileView)`
so ExUI knows to render the case-file-view component. <!-- CONFLUENCE-ONLY: full CFV definition-store setup from RCCD how-to (1315471928); CCD source enforces the field but the spreadsheet wiring is documented in Confluence -->

Grant CRU on the document fields and on `componentLauncher` to allow
case-workers to move documents between categories; granting only R
(on `componentLauncher`) lets them view the folders without re-categorising.

When a user moves a document to a different category via CFV, Data Store
records a system event with ID `DocumentUpdated` in the case history
(`CreateCaseEventService.java:349`, `DefaultCreateEventOperation.java:89`).
To surface this in the Case History tab, define the event with read-only
AuthorisationCaseEvent for the relevant access profiles. Optionally set
`Publish=Y` on the event if downstream consumers need to react to
recategorisation via the message bus. <!-- CONFLUENCE-ONLY: full DocumentUpdated setup steps from 1315471928; source confirms the event ID but not the publish/subscribe wiring -->

### Defining categories (config-generator SDK)

If your service uses the config-generator SDK, declare categories via
`builder.categories(UserRole.CASEWORKER).categoryID(...).categoryLabel(...).displayOrder(...).build()`
and add a `caseFileView` tab with `#ARGUMENT(CaseFileView)` as the
`DisplayContextParameter` on a `ComponentLauncher` field.

### Decentralised services: setting `category_id` dynamically

In a decentralised service you can set the category, filename, and
`upload_timestamp` on the way out — when CCD requests case data — rather than
storing them on the document field itself: <!-- CONFLUENCE-ONLY: pattern from PCS spike (1933860267) -->

```java
return Document.builder()
    .url(entity.getUrl())
    .binaryUrl(entity.getBinaryUrl())
    .filename(buildFilename(entity))             // can rebuild for display
    .categoryId(entity.getType().getCategory()
                                 .map(Enum::name)
                                 .orElse(null))   // null → Uncategorised
    .uploadTimestamp(entity.getLastModified())
    .build();
```

The displayed filename in CFV reflects whatever `filename` you return; the
underlying download filename is unaffected.

### nfdiv pattern (centralised service)

nfdiv stores documents as `ListValue<DivorceDocument>` where `DivorceDocument`
wraps a `ccd.sdk.type.Document` and a `DocumentType` enum
(`nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/document/model/`). The
`DocumentType` drives `category_id` mapping.

---

## Step 5 — Retrieve document metadata

`GET /cases/{caseId}/documents/{documentId}` returns CDAM metadata for the
document including its current `category_id`, permissions, and TTL if set
(`CaseDocumentController.java:59`). The `documentId` is the UUID segment from
`document_url` (`https://cdam-host/documents/<documentId>`).

---

## Hash-token lifecycle summary

Upload to CDAM -> CDAM returns `hashToken` -> callback embeds it in case data
-> Data Store extracts hash, calls `applyPatch` on CDAM (validates hash, sets
case-id, removes TTL) -> Data Store strips `document_hash` before DB persist
-> `case_data` table never stores hash tokens -> metadata available via
`GET /cases/{caseId}/documents/{documentId}`.

---

## Feature flags

All three flags must be aligned. Partial enablement causes inconsistent
behaviour. Defaults verified against `ApplicationParams.java`:

| Property | Default | Effect when `true` |
|---|---|---|
| `ccd.case-document-am-api.attachDocumentEnabled` | `true` | Data Store calls `applyPatch` (i.e. `PATCH /cases/documents`) to register docs with CDAM |
| `ccd.documentHashCloneEnabled` | `true` | Hash tokens are stripped (via cloning) before persist/response. Source carries a `TODO` to make this unconditional |
| `enable.document.hash.check` (`isDocumentHashCheckingEnabled()`) | env-driven | Missing hash tokens on new documents are rejected with `ValidationException` |
| `ccd.upload-timestamp-featured-case-types` | comma-separated list | Only case types in this list get auto-populated `upload_timestamp` on new documents (`ApplicationParams.java:191`) |

In practice all CFT-deployed environments run with these on. Confluence's FR
onboarding page describes ExUI also needing the per-case-type CDAM toggle in
LaunchDarkly so that ExUI uses the CDAM upload path rather than the legacy
direct-DM-Store path. <!-- CONFLUENCE-ONLY: ExUI LD toggle described in 1915164271; not modelled in this repo -->

## Common gotchas

These come from real incidents on the FinRem onboarding (Confluence page
1915164271). They aren't enforced by the source you can read in this
repository, so treat them as warnings rather than hard rules.

- **Bulk-scan exception-record case type ≠ target case type.** When a document
  is uploaded against an exception-record case type and then a "promote to
  case" event creates a new case of a different type, CDAM still has the
  *original* case-type/jurisdiction stamped in the document metadata. Subsequent
  reads against the new case fail CDAM's metadata check unless those original
  values also grant the reader access. Plan your role/case-type permissions
  with this in mind. <!-- CONFLUENCE-ONLY: incident-driven advice from 1915164271 -->
- **Hard-delete semantics changed when CDAM was enabled.** A pre-existing
  delete code path that called DM-Store `/delete` (which is a hard delete)
  was inadvertently activated by the CDAM feature toggle on FinRem (DFR-4514),
  destroying recoverable docs. If your service has any document-deletion
  branches, audit them before enabling CDAM end-to-end. <!-- CONFLUENCE-ONLY: 1915164271 -->
- **Intermittent 404s on retrieval mid-event** (CCD-7418) — known issue;
  retrying the event clears it. <!-- CONFLUENCE-ONLY: 1915164271 -->

---

## Verify

1. Submit the event; confirm `document_hash` is absent from the response `data` (stripped by Data Store).
2. `GET /cases/{caseId}/documents/{documentId}` returns `200` with metadata — confirms CDAM registration.
3. In CDAM logs, look for `applyPatch` with your document UUID to confirm the registration path.

---

## Example

### Upload and embed a document (nfdiv pattern)

```java
// from apps/nfdiv/nfdiv-case-api/.../document/CaseDocumentAccessManagement.java
public UploadResponse upload(String userToken, String serviceToken,
                             String displayName, String fileName,
                             String filePath) throws IOException {
    return client.uploadDocuments(
        userToken, serviceToken,
        getCaseType(),   // e.g. "NFD"
        JURISDICTION,    // e.g. "DIVORCE"
        List.of(new InMemoryMultipartFile(displayName, fileName,
                    MediaType.APPLICATION_PDF_VALUE,
                    IOUtils.resourceToByteArray(filePath)))
    );
}
```

<!-- source: apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/document/CaseDocumentAccessManagement.java:28-50 -->

### Document field on a case-data class (nfdiv pattern)

```java
// from apps/nfdiv/nfdiv-case-api/.../document/model/DivorceDocument.java
public class DivorceDocument {
    @CCD(label = "Select your document", regex = ".pdf,.tif,.tiff,.jpg,.jpeg,.png")
    private Document documentLink;   // sdk type — carries url, binaryUrl, filename, categoryId

    @CCD(label = "Select document type", typeOverride = FixedList,
         typeParameterOverride = "DocumentType")  // drives category_id mapping
    private DocumentType documentType;
}
```

<!-- source: apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/document/model/DivorceDocument.java:21-57 -->

## See also

- [Documents and CDAM](../explanation/documents-and-cdam.md) — conceptual overview of the CDAM integration and hash-token lifecycle
- [CDAM API reference](../reference/api-cdam.md) — full endpoint reference for ccd-case-document-am-api

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

