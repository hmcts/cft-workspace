---
topic: documents-and-cdam
audience: both
sources:
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/document/write-document-field.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/document/write-document-field.html
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentTimestampService.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CCD.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/generator/JsonUtils.java
  - document-management-store-app:src/main/resources/application.yaml
  - cnp-flux-config:apps/dm-store/dm-store/aat.yaml
  - cnp-flux-config:apps/dm-store/dm-store/prod.yaml
examples_extracted_from:
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/document/model/DivorceDocument.java
status: reviewed
last_reviewed: "2026-05-21T00:00:00Z"
confluence_checked_at: "2026-05-21T00:00:00Z"
confluence:
  - id: "1134527827"
    title: "Restrict upload of document by file extension"
    space: "RCCD"
title: Restrict Document Upload by File Extension
diataxis: how-to
product: ccd
---

# Restrict Document Upload by File Extension

## TL;DR

- Set the **`RegularExpression`** column on every Document `CaseField` (or `ComplexTypes` row) to a comma-separated list of dotted extensions, e.g. `.pdf,.jpg,.png`. **Despite the column name it is not a regex** for Document fields.
- The toolkit uses the value as the file-picker `accept=` hint *and* as a client-side filename match before upload. Matching is case-insensitive — `.pdf` covers `.PDF` etc.
- Configuration is **per-field**: repeat the same list against every Document field for a consistent service-wide allow-list.
- The per-field list is a **UX control**, not a security boundary — DM Store's `DM_MULTIPART_WHITELIST_EXT` is the only server-side enforcement. Keep the per-field list a subset of the DM Store whitelist.
- HTML files (`.html`/`.htm`) are blocked server-side by CCD Data Store on event submit unless the field's `RegularExpression` explicitly lists `.html` or `.htm`.

---

## Prerequisites

- A Document field already declared in your case-type definition (CaseField row of type `Document`, or a ListElementCode of type `Document` inside a ComplexType).
- Knowledge of which extensions DM Store accepts in your target environment — see *Step 4*. If you list an extension that DM Store rejects, the OS file picker will show it and the toolkit will accept it, but the actual upload will fail at DM Store with a 422.

---

## Step 1 — Choose the extensions

Pick the shortest list of extensions your service actually needs. Each entry must include the leading full-stop and is **case-insensitive**:

```
.pdf,.jpg,.png,.jpeg
```

Common service-team lists:

```
# Documents only
.pdf,.doc,.docx,.rtf

# Documents + images
.pdf,.doc,.docx,.rtf,.jpg,.jpeg,.png,.tif,.tiff,.bmp

# Documents + images + spreadsheets (nfdiv-style)
.pdf,.tif,.tiff,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx
```

Cross-check against DM Store's current allow-list (`document-management-store-app/src/main/resources/application.yaml:dm.multipart.whitelist-ext`) and any env-specific override in `cnp-flux-config` (`apps/dm-store/dm-store/<env>.yaml`). Listing an extension here that DM Store rejects results in a runtime 422 from the upload, not a definition-store import error.

---

## Step 2 — Apply to each Document field

### Option A — Definition spreadsheet (CaseField tab)

For top-level Document fields, set the `RegularExpression` column on the `CaseField` row:

| CaseTypeID | ID | Label | FieldType | RegularExpression |
|---|---|---|---|---|
| myCaseType | applicationFormDoc | Application form | Document | `.pdf,.jpg,.png` |
| myCaseType | evidenceDoc | Evidence document | Document | `.pdf,.jpg,.png` |

### Option B — Definition spreadsheet (ComplexTypes tab)

For Document fields nested inside a Complex Type, set the value on the **ComplexTypes** row for the inner Document field, *not* on the outer Complex Type row:

| ID | ListElementCode | FieldType | RegularExpression |
|---|---|---|---|
| DocumentWithMetadata | documentLink | Document | `.pdf,.jpg,.png` |
| DocumentWithMetadata | documentType | FixedList-DocumentType | |

### Option C — Config-generator SDK (Java)

If your service uses `libs/ccd-config-generator`, set `regex` on the `@CCD` annotation against the inner `Document` field of your wrapping complex type:

```java
// from apps/nfdiv/nfdiv-case-api/.../document/model/DivorceDocument.java
public class DivorceDocument {

    @CCD(
        label = "Select your document",
        regex = ".pdf,.tif,.tiff,.jpg,.jpeg,.png"
    )
    private Document documentLink;

    @CCD(
        label = "Select document type",
        typeOverride = FixedList,
        typeParameterOverride = "DocumentType"
    )
    private DocumentType documentType;
}
```

The SDK serialises `regex` to the `RegularExpression` column when generating the definition spreadsheet (see `JsonUtils.java:108-109` — `target.put("RegularExpression", annotation.regex())`). The runtime effect is identical to Option A/B.

**Repeat for every Document field.** There is no inheritance: omitting the value on any field leaves that field unrestricted (the toolkit performs no client-side check and the file picker shows everything).

---

## Step 3 — (Optional) Allow HTML explicitly

If your service genuinely needs to accept `.html` / `.htm` uploads, you must:

1. Include `.html` (and `.htm` if needed) in the field's `RegularExpression`. Either form is accepted by Data Store: a comma-separated list (`.pdf,.html`) or a real regex containing regex metacharacters (Data Store sniffs metacharacters to decide which form you used — `fieldAllowsHtml` in `CaseDocumentTimestampService.java:302-321`).
2. Ensure DM Store's allow-list in your target environment also accepts `text/html` and `.html`. AAT does (`aat.yaml:18-19`); demo, ithc, perftest, prod do **not** — they run on the in-repo defaults, which exclude HTML.

Without step 1, Data Store will refuse to attach the document at event submit with the message `HTML documents are not permitted for this field`, even if DM Store accepted the upload. The check is in `CaseDocumentTimestampService.processDocumentNode` (lines 256-274) and only fires for **new** documents added by the current event — pre-existing documents on the case are not re-validated.

---

## Step 4 — Cross-check the DM Store whitelist

Whichever extensions you list must also be accepted by DM Store in the target environment, or the upload itself will fail before XUI ever embeds the document reference.

In-repo defaults (`document-management-store-app/src/main/resources/application.yaml`):

```yaml
dm:
  multipart:
    whitelist-ext: ${DM_MULTIPART_WHITELIST_EXT:.jpg,.jpeg,.bmp,.tif,.tiff,.png,.pdf,.txt,.doc,.dot,.docx,.dotx,.xls,.xlt,.xla,.xlsx,.xltx,.xlsb,.ppt,.pot,.pps,.ppa,.pptx,.potx,.ppsx,.rtf,.csv,.mp3,.m4a,.mp4}
    whitelist:     ${DM_MULTIPART_WHITELIST:image/jpeg,application/pdf,image/tiff,image/png,image/bmp,text/plain,application/octect-stream,application/msword,…}
```

Cluster overrides (re-check before relying on it):

| Env | Override file | Adds vs in-repo default |
|---|---|---|
| AAT | `cnp-flux-config/apps/dm-store/dm-store/aat.yaml:18-19` | `text/html`, `.html`, `.dotx` |
| demo, ithc, perftest | (no `DM_MULTIPART_WHITELIST*` set) | — runs on in-repo defaults |
| prod | (no `DM_MULTIPART_WHITELIST*` set — only `S2S_NAMES_WHITELIST` / `DELETE_ENDPOINT_WHITELIST` overridden) | — runs on in-repo defaults |

If you need an extension DM Store rejects (or to refuse an extension it currently accepts globally), the change is a `DM_MULTIPART_WHITELIST*` env-var update via PR to `cnp-flux-config`, not a CCD-side change. Note that **prod does not currently accept `.html`** — anything that relies on HTML uploads working in prod needs a flux-config PR first.

---

## Step 5 — Verify

1. Import the updated case-type definition.
2. In EXUI, open the Document field. The browser file-picker should list only your chosen extensions under "Customised Files" / "Supported Extensions" (label varies by browser and OS). The "All files" toggle is still present — that is browser behaviour, not a misconfiguration. <!-- CONFLUENCE-ONLY: label wording from page 1134527827 — browser-specific behaviour, not testable from source. -->
3. Try to upload a file with an unlisted extension by switching the picker to "All files". The toolkit shows "Document format is not supported" and refuses to submit. (Watch for the `UPLOAD_ERROR_INVALID_FORMAT` text under the input.)
4. Try to upload via a non-toolkit client (e.g. curl against the BFF proxy or CDAM). The upload succeeds if DM Store allows the type — confirming the per-field list is UX, not security.
5. If your list includes `.html`/`.htm`, upload one and submit the event; confirm Data Store doesn't reject with `HTML documents are not permitted for this field`.

---

## Limitations to be aware of

- **The `accept` attribute is a hint.** Every browser file dialog also offers an "All files" or equivalent option that bypasses the filter. Client-side enforcement of "supported only" requires the toolkit's `fileChangeEvent` check; non-toolkit clients ignore both.
- **Per-field configuration is per-field.** There is no service-wide default. Omitting `RegularExpression` on any single Document field means no validation for that field. Grep your definition before importing.
- **`Collection<Document>` works the same way.** Set `RegularExpression` on the inner Document type via the ComplexTypes tab / `@CCD(regex=…)` on the inner field.
- **The terminology in the UI is browser-dependent.** Some browsers label the filtered list "Customised Files", others "Supported Extensions". This is out of CCD's control. <!-- CONFLUENCE-ONLY: label variations from page 1134527827; not testable from source. -->
- **Media Viewer support is narrower than dm-store storage.** An extension that dm-store will *store* is not automatically one Media Viewer can *render* in-browser. The canonical mime-type ↔ extension mapping that dm-store accepts (and the subset Media Viewer can render) lives on Confluence page [1186104429](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1186104429) (RDM space). Use that table when choosing your per-field list. <!-- CONFLUENCE-ONLY: canonical mime/extension table maintained on Confluence; not in source. -->

---

## See also

- [Document extension validation](../explanation/document-extension-validation.md) — the layered enforcement story across XUI, CDAM, DM Store, and Data Store
- [Store a document](store-a-document.md) — full upload + attach flow
- [Documents and CDAM](../explanation/documents-and-cdam.md) — CDAM access-control model

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.
