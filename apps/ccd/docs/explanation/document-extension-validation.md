---
topic: documents-and-cdam
audience: both
sources:
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/document/write-document-field.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/document/write-document-field.html
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/domain/definition/field-type.model.ts
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentTimestampService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/FieldTypeDefinition.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V0001__Base_version.sql
  - ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/controller/endpoints/CaseDocumentAmController.java
  - ccd-case-document-am-api:src/main/java/uk/gov/hmcts/reform/ccd/documentam/dto/DocumentUploadRequest.java
  - document-management-store-app:src/main/java/uk/gov/hmcts/dm/service/FileContentVerifier.java
  - document-management-store-app:src/main/java/uk/gov/hmcts/dm/security/MultipartFileListWhiteListValidator.java
  - document-management-store-app:src/main/java/uk/gov/hmcts/dm/controller/StoredDocumentController.java
  - document-management-store-app:src/main/resources/application.yaml
  - cnp-flux-config:apps/dm-store/dm-store/aat.yaml
status: reviewed
last_reviewed: "2026-05-21T00:00:00Z"
confluence_checked_at: "2026-05-21T00:00:00Z"
confluence:
  - id: "1134527827"
    title: "Restrict upload of document by file extension"
    space: "RCCD"
  - id: "930742744"
    title: "RDM-3590: Document Upload - Restrict file type feature"
    space: "RCCD"
  - id: "1186104429"
    title: "Document Store - Common file types & those supported by the Store and Media Viewer"
    space: "RDM"
  - id: "1035174312"
    title: "Configure Max File Upload Size for Document Management Store"
    space: "RCCD"
  - id: "867435081"
    title: "CCD Document Upload Process And Recommendation Slides"
    space: "RCCD"
title: Document Extension Validation
diataxis: explanation
product: ccd
---

# Document Extension Validation

## TL;DR

- Filename / extension validation is **layered** across XUI, CDAM, DM Store, and an upstream AV scanner — they each enforce a different thing (or nothing).
- The CCD-defined per-field allow-list lives in the **`RegularExpression`** column on `CaseField` / `ComplexTypes`. Despite the column name it is **not a regex** — it is a comma-separated, case-insensitive list of dotted extensions, e.g. `.pdf,.jpg,.png`.
- **XUI (ccd-case-ui-toolkit)** uses that list two ways: as the `<input accept="…">` hint for the OS file picker, and as a client-side filename match before the upload request is sent. If the field has no `RegularExpression`, both checks are no-ops.
- **CDAM (`ccd-case-document-am-api`)** does **no** filename or content validation. It is an access-control proxy: it validates `caseTypeId`, `jurisdictionId`, `classification`, but never inspects the file itself.
- **DM Store** is the only application-layer server-side gate. It enforces a global allow-list of file extensions and a Tika-detected MIME-type allow-list, configured via `DM_MULTIPART_WHITELIST_EXT` / `DM_MULTIPART_WHITELIST` env vars (set in `cnp-flux-config`). **Palo Alto AV** sits upstream of DM Store at infrastructure level and scans the byte stream for malware.
- **CCD Data Store** adds one targeted server-side check: it rejects new documents whose filename ends in `.html` / `.htm` unless the field's `RegularExpression` explicitly permits HTML.
- The CCD per-field list and the DM Store global list are independent — they can disagree, and only DM Store (and Palo Alto upstream) can refuse the byte stream. The per-field list should always be a **subset** of the DM Store whitelist.

---

## Why the layering matters

A user uploading a document in EXUI passes through four code paths in sequence:

```
Browser
   ↓ (HTML <input accept="…">; OS file picker)
XUI Angular toolkit (WriteDocumentFieldComponent)
   ↓ client-side filename match — may reject before HTTP
XUI BFF (rpx-xui-webapp /documentsv2 proxy)
   ↓ pure proxy, no inspection
CDAM (ccd-case-document-am-api  POST /cases/documents)
   ↓ access control only — no filename / MIME inspection
DM Store (document-management-store-app  POST /documents)
   ↓ extension allow-list + Tika MIME allow-list  ←  enforcement
   ↓ size limits (1GB non-media / 500MB media / 4000MB total request)
Palo Alto AV (upstream of the blob)
   ↓ malware scan; rejected files never reach storage
Blob storage
```

The Palo Alto AV scan is infrastructure-level — it lives in front of the dm-store ingress and is configured per environment, not in dm-store itself. Files that fail virus scanning never reach the byte-validation code paths described below. <!-- CONFLUENCE-ONLY: Palo Alto AV scanning documented in pages 867435081 and 1456373857; not visible in dm-store source. -->

The size limits are a separate concern from the extension list. They are configured in three places that must stay in sync — the WAF on the CCD shared infrastructure (`file_upload_limit_mb`, default 100MB), the dm-store backend (`MAX_FILE_SIZE`, default 4000MB on Spring's `max-file-size`), and the ccd-api-gateway IIS request filter (`maxAllowedContentLength`, default 30000000 bytes ≈ 28.6MB). The smallest of these wins. <!-- CONFLUENCE-ONLY: WAF and IIS limits documented in page 1035174312; not visible in dm-store source. The Spring 4000MB / media 500MB / non-media 1024MB defaults are in document-management-store-app:application.yaml. -->

Subsequently, when the service submits a CCD event that references the new document, Data Store runs its own (narrower) check:

```
Service → POST /cases/{caseId}/events → CCD Data Store
   ↓ CaseDocumentTimestampService.processDocumentNode
   ↓ rejects new docs with .html/.htm unless field allows HTML
   ↓ attaches the document to the case in CDAM (applyPatch)
```

Each layer is independently configurable, and a misconfiguration at one layer cannot be compensated for elsewhere. In particular: dropping a file off the CCD per-field list does *not* stop a determined caller hitting CDAM (or DM Store) directly; conversely, allowing it on the CCD per-field list does *not* override DM Store's MIME-type check.

---

## The `RegularExpression` column

For Document fields the `RegularExpression` column in the case-type definition spreadsheet (and the equivalent `regex` attribute on the SDK `@CCD` annotation) is **repurposed**: it holds a comma-separated list of file extensions rather than an actual regex pattern. Each extension must include the leading full-stop. Matching is case-insensitive — `.pdf` covers `.PDF`, `.Pdf`, etc.

```
.pdf,.jpg,.png,.jpeg
```

It is set on:

- **CaseField** tab — for top-level Document fields.
- **ComplexTypes** tab — for Document fields nested inside a Complex Type (set against the inner Document field, not the outer Complex Type).

The configuration is **per-field**, so to enforce a consistent service-wide allow-list, the same value has to be repeated against every Document field in the definition. There is **no default**: the seed for the `Document` base type in `ccd-definition-store-api` is `INSERT INTO field_type (created_at, reference, version) VALUES (now(), 'Document', '1')` — the `regular_expression` column is left null (`V0001__Base_version.sql`).

For other field types (Text, Number, …) the column genuinely is a Java regular expression validated server-side. Documents are the exception.

The original RDM-3590 design (2019) proposed reusing the `RegularExpression`, `Min`, and `Max` columns together — `RegularExpression` for an extension allow-list pattern (originally a real regex like `^.*\.(pdf|PDF)$`), `Min` and `Max` for file-size bounds, with a new dm-store endpoint to validate them server-side. Only the extension behaviour was delivered, and even that was simplified into the comma-list shape rather than a real regex. There is no per-field file-size validation in CCD today — `FieldTypeDefinition` carries `min` / `max` fields but neither `write-document-field.component.ts` nor the data-store callbacks consult them for Document types; size enforcement happens only at the dm-store / WAF layer. <!-- CONFLUENCE-ONLY: RDM-3590 design notes (page 930742744) describe the original intent for per-field size bounds; the delivered behaviour ignores them on Document fields. -->

---

## What XUI does with the list

The toolkit's upload component (`@hmcts/ccd-case-ui-toolkit`, `WriteDocumentFieldComponent`) consumes the value in two places:

**The file picker hint** (`write-document-field.html:21-22`):

```html
<input type="file"
       (change)="fileChangeEvent($event, caseField.field_type.regular_expression)"
       accept="{{caseField.field_type.regular_expression}}" />
```

The browser passes the `accept` value to the OS file dialog so the user only sees matching files by default. **This is purely UX** — every browser also offers an "All files" / "Other" toggle that lets the user pick anything regardless of `accept`. Treat the `accept` attribute as a hint, never as enforcement.

**Client-side filename validation** (`write-document-field.component.ts:152-172`, with `invalidFileFormat` at lines 195-201):

```ts
public fileChangeEvent(fileInput: any, allowedRegex?: string): void {
  let fileTypeRegex;
  if (allowedRegex) {
    fileTypeRegex = new RegExp(`(${allowedRegex.replace(/,/g, '|')})`, 'i');
  }
  if (fileInput.target?.files[0] && !fileInput.target?.files[0]?.name?.match(fileTypeRegex)) {
    this.invalidFileFormat();          // sets formGroup error, blocks submit
  } else if (fileInput.target.files[0]) {
    // …upload via DocumentManagementService…
  }
}
```

The component splits the comma-separated list on `,`, joins with `|`, and case-insensitively matches the filename against the resulting alternation. If the filename doesn't match, `invalidFileFormat()` clears the form value, shows "Document format is not supported", and sets `{ invalidFileFormat: true }` on the form group, blocking event submission.

**When `regular_expression` is null/empty** (the default seed in definition-store), `allowedRegex` is undefined and `fileTypeRegex` stays undefined. `String.prototype.match(undefined)` is equivalent to matching the empty regex `//`, which matches anything — so **no client-side check happens**. The `accept` attribute also renders as `accept=""`, which browsers ignore.

This is the toolkit's only filename check. Validation can be bypassed trivially by any client that doesn't run the toolkit — calling the BFF proxy or CDAM directly with curl is enough.

---

## What CDAM does

Nothing on the file. `CaseDocumentAmController.uploadDocuments` validates the `DocumentUploadRequest` DTO:

- `classification` — must be a valid enum value (`PUBLIC` / `PRIVATE` / `RESTRICTED`).
- `caseTypeId` and `jurisdictionId` — must match `INPUT_STRING_PATTERN` (sanity check, prevents header injection).
- `files` — `@NotNull`, `@Size(min = 1)` — only checks the list is non-empty.

The individual `MultipartFile` objects in the list carry no validation annotations. `DocumentManagementServiceImpl.uploadDocuments` delegates straight to the DM Store Feign client with no inspection. CDAM is purely an access-control proxy on top of DM Store; file-type safety is DM Store's responsibility.

---

## What DM Store does

DM Store is where filename and MIME enforcement actually live. The upload endpoint (`StoredDocumentController.createFrom`) takes a `@Valid UploadDocumentsCommand` whose file list is annotated `@MultipartFileListWhiteList`. The validator (`MultipartFileListWhiteListValidator`) runs `FileContentVerifier.verifyContentType` against every file, and fails the entire batch if any file is rejected.

`FileContentVerifier.verifyContentType` does two independent checks (`FileContentVerifier.java:46-83`):

1. **Extension check** — extracts the substring after the last `.` from `multipartFile.getOriginalFilename()` and looks it up (case-insensitively) in the configured allow-list.
2. **Content-sniff MIME check** — runs the byte stream through Apache Tika to detect the *actual* MIME type, and looks the result up in the configured allow-list. A special case lets `.protected` MIME types (e.g. `application/vnd.ms-word.document.protected`) through.

Both allow-lists are configured via env vars in `application.yaml`:

```yaml
dm:
  multipart:
    whitelist:     ${DM_MULTIPART_WHITELIST:image/jpeg,application/pdf,…}
    whitelist-ext: ${DM_MULTIPART_WHITELIST_EXT:.jpg,.jpeg,.bmp,.tif,.tiff,.png,.pdf,.txt,.doc,…}
```

The defaults baked into `application.yaml` are the source-of-truth fallback; cluster deployments override them via `cnp-flux-config`. As of writing, only `apps/dm-store/dm-store/aat.yaml` overrides the lists (adding `text/html` to the MIME list and `.html` to the extensions list — `.dotx` is already in the in-repo defaults); `prod.yaml`, `demo.yaml`, `perftest.yaml`, `ithc.yaml` run on the in-repo defaults.

The full canonical mime-type ↔ extension mapping that dm-store supports — and the subset that Media Viewer can render in-browser — is maintained on the [Document Store - Common file types](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1186104429) page in Confluence (RDM space). When choosing the per-field `RegularExpression` list, use that table as the source of truth: an extension that dm-store stores is not automatically one Media Viewer can render, and the user experience will differ.

Because DM Store enforces the allow-list, **the only way to genuinely refuse a file type in production is to remove it from `DM_MULTIPART_WHITELIST` and `DM_MULTIPART_WHITELIST_EXT`** (or the in-repo defaults). Trimming the CCD per-field list is a UX nicety, not a security control.

The original filename is otherwise stored as-is — DM Store does not sanitise or rewrite it. Log statements use a `sanitiseFileName` helper to defend against log injection, but storage is untouched.

---

## CCD Data Store's HTML carve-out

Data Store adds one targeted server-side rule, applied as part of the same pass that auto-populates `upload_timestamp` (`CaseDocumentTimestampService.processDocumentNode`, lines 256-274):

```java
final String filename = getDocumentFilename(documentNode);
if (isHtmlFilename(filename) && !fieldAllowsHtml(fieldTypeDefinition, filename)) {
    throw new CaseValidationException(
        List.of(new CaseFieldValidationError(fieldPath, HTML_NOT_ALLOWED_MSG)));
}
```

If a *new* document attached during an event has a filename ending in `.html` or `.htm`, Data Store rejects the event with a `CaseValidationException` carrying the message `HTML documents are not permitted for this field` — unless the field's `RegularExpression` explicitly permits HTML. The check is keyed on the document URL appearing in the new-documents set — pre-existing documents on the case are not re-validated.

`fieldAllowsHtml` (lines 302-321) accepts either:

- A real regex (heuristic: contains regex metacharacters) — compiled and matched against the filename.
- The comma-separated extension form — split, normalised to start with `.`, then `extSet.contains(".html") || extSet.contains(".htm")`.

This is the only filename-shape check applied in the CCD layer; everything else delegates to DM Store.

---

## Limitations

These are inherent to the design — they aren't bugs, but they shape what an allow-list can actually achieve:

- **Browser-side bypass.** The `accept` attribute is advisory. The OS file-picker dialog usually offers a "Show all files" or equivalent fall-back. Browsers also vary in how they label the filtered set — some show "Customised Files", others "Supported Extensions" — so the affordance the user sees is not under CCD's control. The toolkit's `fileChangeEvent` check catches this bypass for clients that use the toolkit, but it doesn't catch anything else. <!-- CONFLUENCE-ONLY: browser-label variation noted on page 1134527827; not testable from source. -->
- **No client-side check without a configured list.** Empty/null `RegularExpression` means no XUI-side validation at all. There is no fallback default.
- **CCD doesn't see DocStore's list.** The per-field allow-list in CCD is independent of `DM_MULTIPART_WHITELIST_EXT`. Allowing `.xyz` in CCD does not make DM Store accept it; refusing `.pdf` in CCD does not stop DM Store accepting it from a non-toolkit client. **Always keep the per-field list a subset of the DM Store whitelist.**
- **Environment drift.** DM Store's lists are overridden differently per environment in `cnp-flux-config`. AAT allows `.html` and `.dotx`; prod does not. A document accepted on AAT might be refused on prod (or vice versa). Verify env overrides before promoting a change.
- **Filename is what the uploader sent.** DM Store stores the original name verbatim. If filename sanitisation matters (e.g. preventing UTF-8 control characters, very long names), the service or service team should sanitise *before* uploading — neither CDAM nor DM Store will.

---

## See also

- [Documents and CDAM](documents-and-cdam.md) — the CDAM access-control model that this validation sits inside
- [Restrict document upload by file extension](../how-to/restrict-document-upload-extensions.md) — recipe for configuring the per-field list
- [Store a document](../how-to/store-a-document.md) — upload + attach event flow

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.
