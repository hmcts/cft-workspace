---
topic: overview
audience: both
sources: []
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Glossary

Single canonical definitions for every term used in the CCD documentation. Terms are alphabetical. For context on how terms fit together, see the relevant explanation or how-to page.

## TL;DR

- All CCD-specific abbreviations and field names resolve here.
- Jurisdiction > Case Type > Event > State is the top-level hierarchy.
- AC = Access Control; RAS = Role Assignment Service; AM = Access Management.
- Callback hooks are `about_to_start`, `about_to_submit`, and `submitted`.
- AAC, CDAM, NoC, RAM, and XUI are the key surrounding services.

---

## Terms

**AAC** (Assign a Case)
Service (`aac-manage-case-assignment`) that manages case-role assignment and powers Notice of Change flows. Exposes REST endpoints consumed by XUI and CCD.

**about_to_start**
Callback hook invoked by the data store immediately before a case event's form is rendered. The service can pre-populate field values or return validation errors to block the event from opening.

**about_to_submit**
Callback hook invoked after the user submits an event form but before the data store persists the new case state. The service can transform data or return errors to cancel the save.

**AC** (Access Control)
General term for the permission model applied to case types, events, states, and fields. Permissions are expressed as Create / Read / Update / Delete (CRUD) flags against roles.

**AM** (Access Management)
The subsystem — comprising RAS and the AM library in the data store — that evaluates role assignments at runtime to enforce AC rules.

**callback**
An HTTP webhook registered in the case-type definition. The data store POSTs a `CallbackRequest` payload to a service-team URL at defined points in the event lifecycle. See `about_to_start`, `about_to_submit`, `submitted`.

**CaseLink**
A CCD complex field type (`CaseLink`) that stores a reference to another case by case ID. Used to model parent/child or related-case relationships.

**case type**
The schema for one category of case within a jurisdiction. Defines the fields, events, states, tabs, pages, roles, and callbacks. Stored in `ccd-definition-store-api`.

**CDAM** (Case Document Access Management)
Service (`ccd-case-document-am-api`) that controls access to case-attached documents. Generates and validates hash tokens so documents cannot be retrieved without a valid, role-backed token.

**ChangeOrganisationRequest**
A CCD complex field type that captures a request to change the organisation/solicitor linked to a case role. The AAC service reads this field to drive the Notice of Change workflow.

**complex type**
A reusable composite field definition composed of named sub-fields. Equivalent to a struct. Defined once in the definition spreadsheet and referenced by multiple case types.

**CRUD**
The four permission flags — Create, Read, Update, Delete — applied to roles in AC rules for case types, events, states, and individual fields.

**data store**
`ccd-data-store-api`. The runtime service that stores case instances, evaluates access control, invokes callbacks, and exposes the primary CCD REST API.

**decentralised**
A deployment topology (also "decentralised CCD" or "dCCD") in which each service team runs its own isolated instance of the data store and definition store rather than using a shared platform instance.

**definition store**
`ccd-definition-store-api`. Stores and serves case-type definitions (jurisdictions, case types, events, states, fields, roles). Definitions are imported as XLSX or JSON.

**dynamic list**
A field type (`DynamicList`) whose options are populated at runtime from a callback response rather than being fixed in the definition. The data store passes the list back to XUI for rendering.

**event**
A named transition in the case lifecycle (e.g. `submitApplication`). An event may change state, invoke callbacks, and apply field-level permission overrides. Defined per case type.

**field type**
The data type of a CCD field: primitives (`Text`, `Number`, `Date`, `YesOrNo`, `Email`, `Money`), collections (`Collection`), complex types, and built-in complex types (`CaseLink`, `Flags`, `OrganisationPolicy`, etc.).

**Flags**
A built-in CCD complex field type used to record case-level and party-level flags (e.g. vulnerability indicators). Rendered natively in XUI via the Case Flags feature.

**global search**
A cross-jurisdiction search API (`/searchCases`) and XUI surface that allows users to find cases across multiple case types using `SearchCriteria` and `SearchParty` fields.

**hash token**
A CDAM-issued token embedded in document URLs. Proves that the requesting user held a valid role assignment at the time of document access. Validated on every document fetch.

**IDAM** (Identity and Access Management)
The HMCTS identity service (`idam-web-public` / `idam-service`). Issues JWT bearer tokens that CCD and surrounding services use to identify the caller's user ID and roles.

**jurisdiction**
The top-level grouping in CCD (e.g. `DIVORCE`, `PROBATE`). A jurisdiction contains one or more case types and owns a set of user roles. Maps roughly to a service team's domain.

**mid-event**
A callback that fires between pages within a multi-page event form. Allows server-side validation or field mutation after the user navigates between wizard pages, before final submission.

**NoC** (Notice of Change)
The workflow by which a solicitor replaces another on a case without the original solicitor's involvement. Driven by AAC using `ChangeOrganisationRequest` and `OrganisationPolicy` fields.

**OrganisationPolicy**
A built-in CCD complex field type that links a case-role (e.g. `[APPLICANTSOLICITOR]`) to a Prd organisation ID. Required for NoC and case-assignment flows.

**page**
A wizard step within an event form. A case type definition groups fields into ordered pages; XUI renders one page at a time and fires mid-event callbacks between pages.

**RAM** (Role Assignment Migration / Role Assignment Model)
Depending on context: (1) the data model used by RAS to persist role assignments, or (2) a batch migration that moved legacy CCD role grants into RAS-managed assignments.

**RAS** (Role Assignment Service)
`am-role-assignment-service`. Stores and evaluates role assignments for users and services. The data store queries RAS on every request to determine which roles the caller holds.

**RetainHiddenValue**
A per-field flag (`RetainHiddenValue=Y` on `CaseEventToFields`, `ComplexTypes`, or `CaseField`) that instructs XUI to include a field's existing value in the submit payload even when its `ShowCondition` is currently false. Without the flag, XUI explicitly sends `null` for hidden fields, which the data store overwrites onto the stored value. The wipe is client-side (XUI), not server-side. Must be paired with a `ShowCondition`; definition-store rejects the combination without one. See [RetainHiddenValue](../explanation/retain-hidden-value.md).

**S2S** (Service-to-Service authentication)
`service-auth-provider`. Issues short-lived JWT tokens that microservices present to each other (in `ServiceAuthorization` headers) to prove their identity without user credentials.

**SearchCriteria**
A built-in CCD complex field type that maps case fields to global-search index fields. Must be populated (usually via callback) for a case to appear in global search results.

**SearchParty**
A built-in CCD complex field type used inside `SearchCriteria` to index a person's name, address, date of birth, and email for global search.

**state**
A named stage in the case lifecycle (e.g. `Submitted`, `Hearing`). Access rules on states control which roles can see or act on a case when it is in that state.

**submitted**
An asynchronous callback hook invoked after the data store has persisted the event. The service cannot reject the event at this point. Used for fire-and-forget side-effects (notifications, document generation).

**supplementary data**
A key-value map (`/cases/{id}/supplementary-data`) stored alongside case data but outside the case-type schema. Used for search boost values (`HMCTSServiceId`) and other platform metadata without polluting the case definition.

**tab**
A named grouping of fields displayed on the case details view in XUI. Tabs are defined per case type and can have role-based visibility conditions.

**work basket**
The list view of cases assigned to a team or user. Configured via `WorkBasketInputFields` (search filters) and `WorkBasketResultFields` (columns) in the case-type definition.

**XUI** (Manage Cases / ExUI)
`xui-webapp` / `case-management-web`. The browser front end through which caseworkers and legal professionals interact with CCD cases. Calls the data store and surrounding services via BFF (`xui-ao-webapp`).

---

## See also

- [`docs/ccd/explanation/case-type-model.md`](../explanation/case-type-model.md) — full hierarchy: jurisdiction, case type, event, state, field
- [`docs/ccd/explanation/access-control.md`](../explanation/access-control.md) — CRUD, roles, RAS, AM in depth
- [`docs/ccd/explanation/callbacks.md`](../explanation/callbacks.md) — callback lifecycle: about_to_start, mid-event, about_to_submit, submitted
- [`docs/ccd/explanation/noc.md`](../explanation/noc.md) — Notice of Change, OrganisationPolicy, ChangeOrganisationRequest
