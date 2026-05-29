---
title: Case File View
topic: case-file-view
diataxis: explanation
product: ccd
audience: both
sources:
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/SheetName.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/mapper/ColumnName.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/CategoryValidator.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/validation/CategoryIdValidator.java
  - ccd-definition-store-api:repository/src/main/resources/db/migration/V20220204_13078__RDM-13078_category.sql
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseFileViewController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casefileview/CategoriesAndDocuments.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casefileview/CategoriesAndDocumentsService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casefileview/FileViewDocumentService.java
  - libs/ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/CaseCategory.java
  - libs/ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
  - libs/ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Document.java
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/palette.service.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-file-view/case-file-view-field.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/case-file-view/components/case-file-view-folder/case-file-view-folder.component.ts
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/documentdata/DocumentDataRequest.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/AuthorisedCreateEventOperation.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/DefaultCreateEventOperation.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getcasedocument/CaseDocumentTimestampService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/ApplicationParams.java
  - ccd-data-store-api:src/main/resources/application.properties
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/common/Categories.json
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_CaseFileView_1/CaseField.json
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/common/Categories.json
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_CaseFileView_1/CaseField.json
status: reviewed
last_reviewed: "2026-05-29T00:00:00Z"
confluence:
  - id: "1315471928"
    title: "How To Guide - Case File View (Document Categories)"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1764268327"
    title: "How To Guide - Case File View 1.1"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1558259285"
    title: "Case File View - CategoriesAndDocument endpoint LLD"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1552131280"
    title: "Case File View - DocumentData endpoint LLD"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1329660520"
    title: "Expert UI - Low Level Design - Case File View"
    last_modified: "unknown"
    space: "EUI"
confluence_checked_at: "2026-05-29"
---

# Case File View

## TL;DR

- Case File View (CFV) lets caseworkers see a case's documents as an organised, foldered tree instead of a flat list — with search, sort, and per-document actions (open, download, print, change folder).
- The folder tree is defined at definition time: a **`Categories`** sheet (the `category` table) in `ccd-definition-store-api`, with categories nesting via `ParentCategoryID`.
- Documents are assigned to a category via the **`CategoryID`** column on `Document`/`Collection(Document)` fields, and a document's own runtime **`category_id`** sub-field can override that.
- The data store serves the tree via `GET /categoriesAndDocuments/{caseRef}` and moves documents between folders via `PUT /documentData/caseref/{caseRef}`.
- XUI renders it when a `ComponentLauncher` field carries `display_context_parameter` `#ARGUMENT(CaseFileView)`, surfaced through a `caseFileView` tab.
- CFV is the **organisation/presentation** layer only — documents are still stored and served through CDAM, and viewed via the separate Media Viewer. It is not bundling/stitching.
- CFV 1.1 adds an `upload_timestamp` sub-field that the data store auto-stamps on newly-uploaded documents — but only for case types on the `UPLOAD_TIMESTAMP_FEATURED_CASE_TYPES` whitelist.

## Defining the folder tree (categories)

Categories are definition-time metadata. In the definition spreadsheet they live on a sheet named **`Categories`** (`SheetName.CATEGORY`, `SheetName.java:37`), backed by the `public.category` table created in `V20220204_13078__RDM-13078_category.sql`. The columns are:

| Column | Notes |
| --- | --- |
| `CategoryID` | `varchar(70)`, identifier referenced by fields and child categories |
| `CategoryLabel` | `varchar(70)`, display label shown as the folder name |
| `ParentCategoryID` | optional; set to nest this category under another |
| `DisplayOrder` | integer sort order among siblings |
| `LiveFrom` / `LiveTo` | optional validity dates |
| `CaseTypeID` | the owning case type |

Categories form a tree purely through `ParentCategoryID` — a row with no parent is a root folder, and a row whose `ParentCategoryID` matches another row's `CategoryID` becomes its sub-folder.

On import, `CategoryValidator` enforces (`CategoryValidator.java:34-169`):

- `CategoryID` must be unique within a case type.
- `DisplayOrder` must be unique within the same `(case_type, parent)` — siblings cannot share a position.
- `ParentCategoryID` must reference a category in the **same case type**, not globally (`CategoryValidator.java:52-68`).

## Assigning a document to a category

A document field is placed in a folder via the **`CategoryID`** column on the `CaseField` sheet (and equally on the `ComplexTypes` sheet for nested document fields). `CategoryIdValidator` enforces two rules at import (`CategoryIdValidator.java:39-91`):

- The `CategoryID` may only be set on a field whose type is **`Document`** or **`Collection(Document)`** — any other field type is a validation error (`CategoryIdValidator.java:47-50`).
- The referenced category must exist for that case type.

This is the default, definition-level assignment. It can be overridden per document at runtime: the `Document` complex type carries a `category_id` sub-field that, when present in the case data, takes precedence (see [Category resolution](#category-resolution)).

## Defining categories with the SDK

Service teams using `ccd-config-generator` declare categories in code rather than editing a spreadsheet. Inside `CCDConfig.configure()`:

```java
builder.categories(role)
    .categoryID("Evidence")
    .categoryLabel("Evidence")
    .displayOrder(1)
    .parentCategoryID(null);
```

`ConfigBuilder.categories(...)` (`ConfigBuilder.java:64`) returns a `CaseCategory` builder exposing `.categoryID` / `.categoryLabel` / `.displayOrder` / `.parentCategoryID` (`CaseCategory.java`). The generator emits these four columns into `Categories.json`.

To override a document's category at runtime, set the `category_id` on the SDK `Document` type — it is a first-class field annotated `@JsonProperty("category_id")` (`Document.java:28-29`).

<!-- TODO: the role argument on builder.categories(...) is accepted but not emitted to Categories.json; its purpose is unclear from the research notes. -->

## Wiring a case type for CFV

Categories and `CategoryID`s only describe the *data*. To make the view appear in ExUI a service team also wires up the surrounding definition, per the CCD how-to guide:

1. **A `ComponentLauncher` field** — a top-level field of type `ComponentLauncher`. ExUI uses it as the mount point for the CFV UI component; it carries no data of its own.
2. **A `caseFileView` tab** — a `CaseTypeTab` row (conventionally `TabID` `caseFileView`, label "Case File View") that places the `ComponentLauncher` field and sets `DisplayContextParameter` to `#ARGUMENT(CaseFileView)`. <!-- CONFLUENCE-ONLY: the caseFileView tab id and "Case File View" label are the documented convention; the data store does not enforce a specific tab id. -->
3. **Read/Update ACLs on the document fields** — `AuthorisationCaseField` / `AuthorisationComplexType` entries granting the caseworker access profile `CRU` on every `Document` / `Collection(Document)` field that should be movable. Without **Update**, the document is read-only in the tree.
4. **An ACL on the `ComponentLauncher` field itself** — this is the gate for the "Change folder" action: grant the field `CRU` to allow moving documents, or `R` to render CFV read-only. <!-- CONFLUENCE-ONLY: the per-field move gate via the ComponentLauncher ACL is documented behaviour from the CCD how-to; verified in source only insofar as the PUT enforces Update access on the document field (see Move validation). -->

### Surfacing the move in case history

Moving a document fires a `DocumentUpdated` system event (see [the data-store endpoints](#the-data-store-endpoints)). This event is intentionally **not** offered in the ExUI events drop-down — services that want it visible in a Case History tab grant it **read-only** access (`AuthorisationCaseEvent` `R`) so it shows in history but cannot be triggered manually. A service can also opt to **publish** the `DocumentUpdated` event to the message bus (set `Publish = Y` on the `CaseEvent` and selected `CaseEventToFields`) so downstream processes can react to recategorisation. <!-- CONFLUENCE-ONLY: the read-only AuthorisationCaseEvent convention and message-bus publishing opt-in are from the CCD how-to; not modelled in CFV source. -->

## Upload timestamps (CFV 1.1)

CFV 1.1 introduced an `upload_timestamp` sub-field on the `Document` base type, used by ExUI to sort the tree by recency. The data store auto-populates it: on case-event submission, `CaseDocumentTimestampService.addUploadTimestamps(...)` finds document URLs present in the modified case data but **not** in the version already in the database (i.e. newly-uploaded documents) and stamps them with the current UTC time, formatted `yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS` (`CaseDocumentTimestampService.java:41,54-88`).

This is gated per case type. Stamping only runs when the case type appears in `ccd.upload-timestamp-featured-case-types` (env `UPLOAD_TIMESTAMP_FEATURED_CASE_TYPES`, `application.properties:273`; `ApplicationParams.java:191`). Onboarding a service to 1.1 therefore means (a) including `upload_timestamp` in the service's `Document` Java object and (b) asking CCD to add the case type to that whitelist — there is no per-definition switch.

## The data-store endpoints

Two endpoints on `CaseFileViewController` back the view:

| Endpoint | Purpose |
| --- | --- |
| `GET /categoriesAndDocuments/{caseRef}` | Returns the full category tree plus uncategorised documents (`CaseFileViewController.java:47-77`) |
| `PUT /documentData/caseref/{caseRef}` | Moves a document between categories by updating its `category_id` (`CaseFileViewController.java:79-103`) |

The GET response (`CategoriesAndDocuments`, serialised snake_case) has the shape:

```json
{
  "case_version": 3,
  "categories": [
    {
      "category_id": "Evidence",
      "category_name": "Evidence",
      "category_order": 100,
      "documents": [
        {
          "document_url": "...",
          "document_filename": "claim.pdf",
          "document_binary_url": "...",
          "attribute_path": "nationalityProof.documentEvidence",
          "upload_timestamp": "2024-12-31T09:56:00"
        }
      ],
      "sub_categories": []
    }
  ],
  "uncategorised_documents": []
}
```

`Category` nodes nest recursively through `sub_categories`. Each `Document` carries `document_url`, `document_filename`, `document_binary_url`, `attribute_path`, and `upload_timestamp`.

The `PUT` does not run a normal case event — it fires a synthetic `DocumentUpdated` system event to write the new `category_id` back into case data, then returns the refreshed `CategoriesAndDocuments`. The request body is snake_case: `attribute_path`, `case_version`, `category_id` (`DocumentDataRequest`, `@JsonNaming(SnakeCaseStrategy)`).

<!-- DIVERGENCE: the RCCD "DocumentData endpoint LLD" (id 1552131280) specifies path /documentData with caseRef/caseVersion/attributePath/categoryId all as request parameters, and a camelCase response (caseVersion, subCategories, unCategorisedDocuments). ccd-data-store-api:CaseFileViewController.java:79 implements PUT /documentData/caseref/{caseRef} with the other fields in a snake_case JSON body, and serialises snake_case. Source wins. -->

### Move validation

The PUT runs through `AuthorisedCreateEventOperation.createCaseSystemEvent` (`AuthorisedCreateEventOperation.java:112-150`), which enforces, in order:

- **Field exists and is a document** — if `attribute_path` resolves to nothing, `400 "Field '<path>' cannot be found"`; if it resolves to a non-document field, `400 "Field denoted by path: '<path>' is not a document field type"`.
- **Update access** — the user must have Update access to the case and to the document field (via role assignment), else the case-read/field-access checks reject the request.
- **Valid category** — `category_id` must be `null` or match a category defined for the case type, else `400 "002 Invalid categoryId"`.
- **Optimistic concurrency** — the supplied `case_version` must equal the case's current version, else `400 "003 Wrong CaseVersion"`. This is why the GET response carries `case_version`: ExUI echoes it back so a stale tree can't silently overwrite a concurrent change.

<!-- DIVERGENCE: the LLD (id 1552131280) lists numbered codes "001 non-document field", "001 Non-extant case", "002 Unauthorised for case", "003 non-extant field", "004 Unauthorised for field". Source uses prose messages for the field checks and the strings "002 Invalid categoryId" (capital I) and "003 Wrong CaseVersion" — the LLD's exact code strings are not all present in ccd-data-store-api. Source wins. -->

The `attribute_path` is **de-indexed**: collection numeric indices are replaced by the collection item's `id` value, so the path is stable across reordering (e.g. `nationalityProof.documentEvidence`, not `nationalityProof.0.documentEvidence`) (`FileViewDocumentService.java:79-87`).

## Category resolution

When building the tree, the data store walks all `Document`-typed fields and decides each document's folder using `CategoriesAndDocumentsService.resolveDocumentCategory` (`CategoriesAndDocumentsService.java:179-193`), in priority order:

1. The document's runtime `category_id` sub-field, **if** that category exists in the definition → use it.
2. The runtime `category_id` is set but **does not** exist in the definition → the document goes to `uncategorised_documents`.
3. No runtime `category_id` → fall back to the field definition's `CategoryID`.
4. Otherwise → `uncategorised_documents`.

So a document whose stored `category_id` references a now-deleted category surfaces as uncategorised rather than under the missing folder.

## How XUI renders it

CFV lives in `ccd-case-ui-toolkit` under the `palette` component family. It activates when a `ComponentLauncher` field has `display_context_parameter` set to `#ARGUMENT(CaseFileView)`: `PaletteService` resolves that argument and maps `CaseFileView` to `CaseFileViewFieldComponent` for both read and write contexts (`palette.service.ts:60`).

<!-- DIVERGENCE: the EUI "Low Level Design - Case File View" (id 1329660520) describes adding a dedicated `CaseFileView` *base field type* to the palette switch. The shipped toolkit instead activates CFV via a generic `ComponentLauncher` field keyed on the `#ARGUMENT(CaseFileView)` display-context parameter (palette.service.ts). The dedicated-field-type design was superseded by the ComponentLauncher mechanism. Source wins. -->

The early EUI LLD also envisaged a tabbed **mode selector** offering Index and Bookmark views alongside the Case File view; only the Case File view shipped. <!-- CONFLUENCE-ONLY: Index/Bookmark modes are aspirational in the EUI LLD and not present in source. -->

On init the host component calls `CaseFileViewService.getCategoriesAndDocuments(caseId)` and renders a split pane — the folder tree on the left, the Media Viewer on the right. The tree (`CaseFileViewFolderComponent`) uses the Angular CDK nested tree and supports:

- **Search** — case-insensitive substring match on document names; folders are kept if any descendant matches.
- **Sort** — A–Z / Z–A by name, or recent/oldest first by upload timestamp. Default on load is descending by upload timestamp.
- **Per-document actions** — Change folder, Open in a new tab, Download, Print. "Change folder" is gated by the field's `update` ACL (`allowMoving`) and opens a dialog populated from the real category tree.

Uncategorised documents are shown in a synthetic **"Uncategorised documents"** folder appended at the end of the tree. The "Change folder" dialog is built only from the real categories, so documents **cannot** be moved *into* the uncategorised folder.

## Boundaries

- **CDAM still owns storage and serving.** CFV reads document references (`document_binary_url`, etc.) from case data and presents them; the bytes are uploaded, downloaded, and access-controlled by CDAM in front of `dm-store`. CFV adds no new storage. See [Documents and CDAM](documents-and-cdam.md) and [CDAM API reference](../reference/api-cdam.md).
- **The Media Viewer is a separate component.** XUI embeds `<mv-media-viewer>` (from `@hmcts/media-viewer`) in the right pane; CFV only hands it a document reference. HTML documents bypass the viewer and open in a new tab.
- **CFV is not bundling/stitching.** It organises documents already on a case. Assembling documents into a merged PDF is a different concern handled by EM stitching — see [Stitching](stitching.md).
- The `Document` complex type itself is documented in [Data Types](data-types.md).

## Example

The following fragments are taken from the `FT_CaseFileView_1` case type in the BEFTA master test definitions, which is the reference implementation for CFV functional tests.

### JSON form — Categories.json

```json
// apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/common/Categories.json
[
  {
    "LiveFrom": "01/01/2017",
    "CaseTypeId": "FT_CaseFileView_1",
    "CategoryID": "CategoryID1",
    "CategoryLabel": "Evidences",
    "DisplayOrder": 100,
    "ParentCategoryID": ""
  },
  {
    "LiveFrom": "01/01/2017",
    "CaseTypeId": "FT_CaseFileView_1",
    "CategoryID": "CategoryID2",
    "CategoryLabel": "Supporting",
    "DisplayOrder": 110,
    "ParentCategoryID": ""
  },
  {
    "LiveFrom": "01/01/2017",
    "CaseTypeId": "FT_CaseFileView_1",
    "CategoryID": "CategoryID3",
    "CategoryLabel": "Party Documents",
    "DisplayOrder": 120,
    "ParentCategoryID": ""
  },
  {
    "LiveFrom": "01/01/2017",
    "CaseTypeId": "FT_CaseFileView_1",
    "CategoryID": "SubCategoryID1",
    "CategoryLabel": "Proof Documents",
    "DisplayOrder": 100,
    "ParentCategoryID": "CategoryID3"
  }
]
```

`SubCategoryID1` is a sub-folder of `CategoryID3` — the `ParentCategoryID` reference is all that is needed to create nesting.

### JSON form — CaseField.json (Document fields with CategoryID)

```json
// apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_CaseFileView_1/CaseField.json
[
  {
    "LiveFrom": "01/01/2017",
    "CaseTypeID": "FT_CaseFileView_1",
    "ID": "Document1",
    "Label": "Water Bill",
    "FieldType": "Document",
    "CategoryID": "CategoryID1",
    "SecurityClassification": "Public"
  },
  {
    "LiveFrom": "01/01/2017",
    "CaseTypeID": "FT_CaseFileView_1",
    "ID": "Document2",
    "Label": "Bank Statement",
    "FieldType": "Document",
    "CategoryID": "CategoryID2",
    "SecurityClassification": "Public"
  },
  {
    "LiveFrom": "01/01/2017",
    "CaseTypeID": "FT_CaseFileView_1",
    "ID": "Document3",
    "Label": "News Article",
    "FieldType": "Document",
    "CategoryID": "",
    "SecurityClassification": "Public"
  },
  {
    "LiveFrom": "01/01/2017",
    "CaseTypeID": "FT_CaseFileView_1",
    "ID": "evidenceDocuments",
    "Label": "Evidence Documents",
    "FieldType": "Collection",
    "CategoryID": "CategoryID1",
    "FieldTypeParameter": "Document",
    "SecurityClassification": "Public"
  }
]
```

`Document1` and `Document2` land in the `Evidences` and `Supporting` folders respectively by default. `Document3` has no `CategoryID` and will appear under "Uncategorised documents" unless its runtime `category_id` sub-field is set. `evidenceDocuments` shows the same pattern for a `Collection(Document)` field.

## See also

- [Documents and CDAM](documents-and-cdam.md) — how documents are stored and access-controlled; CDAM owns the bytes that CFV organises.
- [Stitching](stitching.md) — assembling documents into bundles (distinct from CFV organisation).
- [Data Types](data-types.md) — the `Document` field type and its `category_id` sub-field.
- [CDAM API reference](../reference/api-cdam.md) — the CDAM document API.
