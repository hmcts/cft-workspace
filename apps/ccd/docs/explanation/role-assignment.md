---
topic: role-assignment
audience: both
sources:
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/CaseAssignmentController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/CaseAssignedUserRolesController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/NoticeOfChangeController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/CaseAssignmentService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/cau/CaseAccessOperation.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/ras/RoleAssignmentService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/ras/RoleAssignmentServiceHelperImpl.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/payload/RoleAssignment.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/ChangeOrganisationRequest.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/ApprovalStatus.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/client/datastore/CaseDetails.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/ApplicationParams.java
  - aac-manage-case-assignment:src/main/resources/application.yaml
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/CaseAccessService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/AccessProcess.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/enums/GrantType.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/enums/RoleCategory.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/CaseAccessMetadata.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/RoleAssignmentCategoryService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/PseudoRoleAssignmentsGenerator.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/DefaultCaseDataAccessControl.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/user/DefaultUserRepository.java
status: confluence-augmented
last_reviewed: 2026-08-20T00:00:00Z
confluence_checked_at: 2026-08-20T00:00:00Z
confluence:
  - id: "1875852094"
    title: "IDAM roles and Role Assignment roles"
    space: "EXUI"
    last_modified: "unknown"
  - id: "1824151245"
    title: "IdAM vs role assignment access control"
    space: "AM"
    last_modified: "unknown"
  - id: "1373537532"
    title: "LLD - Manage Case Assignment Microservice"
    space: "ACA"
    last_modified: "unknown"
  - id: "1452902365"
    title: "API Operation: Request Notice of Change"
    space: "ACA"
    last_modified: "unknown"
  - id: "1958296606"
    title: "Specific Access and Challenged Access"
    space: "DATS"
    last_modified: "unknown"
  - id: "1787468015"
    title: "Challenged And Specific Access LLD"
    space: "LAU"
    last_modified: "unknown"
  - id: "1380221923"
    title: "A Guide to Assign Access to cases for professional users: configuration"
    space: "RCCD"
    last_modified: "unknown"
  - id: "1285226654"
    title: "Access Control"
    space: "RCCD"
    last_modified: "2026-05-16"
  - id: "1622348398"
    title: "Specific Access Approval"
    space: "WA"
    last_modified: "unknown"
title: Role Assignment
diataxis: explanation
product: ccd
sources_sha:
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/CaseAssignmentController.java": "868a0ec2fccb8b0f66a70164b740497bbe8635ad"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/CaseAssignedUserRolesController.java": "2a75e87cff749c0316fff4bc3ebf0dc3ce2d36e4"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/NoticeOfChangeController.java": "868a0ec2fccb8b0f66a70164b740497bbe8635ad"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/CaseAssignmentService.java": "1b4425f359f0fb88bb92a9287488b35dd8f10adb"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/cau/CaseAccessOperation.java": "58a5b7d2164633bf1166e9360a57628af83b422b"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/ras/RoleAssignmentService.java": "b6a8f0db1eec277476c44fffbb3b35f0622f5443"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/ras/RoleAssignmentServiceHelperImpl.java": "357731efe592be4c0d58ad4b8d703ee55dace314"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/payload/RoleAssignment.java": "4bd9e4e1154254c77b8024b96176b1eda375b470"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/ChangeOrganisationRequest.java": "868a0ec2fccb8b0f66a70164b740497bbe8635ad"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/ApprovalStatus.java": "fc9e28727c63bab92cecc2d3e115f78299738347"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/client/datastore/CaseDetails.java": "fd47890952be0b44521441cdb43233ef61268ce2"
  "aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/ApplicationParams.java": "32da595b1c98b8495914f867502c256ec433d114"
  "aac-manage-case-assignment:src/main/resources/application.yaml": "9910b14cfb1fcad7a811420150a69864df3bf528"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/common/CaseAccessService.java": "b509326d3eefbb50e825485237675ec4117beebe"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/AccessProcess.java": "e6d5579f206077c006f9ca7999ffbecca9bc89f9"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/enums/GrantType.java": "e6d5579f206077c006f9ca7999ffbecca9bc89f9"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/enums/RoleCategory.java": "e6d5579f206077c006f9ca7999ffbecca9bc89f9"
  ? "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/CaseAccessMetadata.java"
  : "c33eaf088b6c7947a041d91aee4f70070099cceb"
  ? "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/RoleAssignmentCategoryService.java"
  : "e6d5579f206077c006f9ca7999ffbecca9bc89f9"
  ? "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/PseudoRoleAssignmentsGenerator.java"
  : "e6d5579f206077c006f9ca7999ffbecca9bc89f9"
  ? "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/DefaultCaseDataAccessControl.java"
  : "da6f87b5a52f0e3c7afe6a76777ddf098bd5fe90"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/user/DefaultUserRepository.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
---

# Role Assignment

## TL;DR

- Case-level RBAC in CCD is backed by **am-role-assignment-service** (AMRAS); roles are persisted as `CASE`-type `RoleAssignment` records, typically with `grantType=SPECIFIC` for case roles.
- AMRAS roles carry attributes (jurisdiction, caseType, caseId, region, location, caseAccessGroupId) that drive CCD's filtering — replacing the legacy IDAM-roles-only model that couldn't differentiate access between, say, an applicant's solicitor and a respondent's solicitor.
- **aac-manage-case-assignment** (AAC) is the orchestrator: it owns two separate flows — intra-organisation case assignment (`/case-assignments`) and AMRAS-direct role management (`/case-users`).
- `OrganisationPolicy` fields in case data bind a case role (e.g. `[Claimant]`) to a PRD organisation; `ChangeOrganisationRequest` (COR) tracks an in-flight Notice of Change with `ApprovalStatus` `"0"`/`"1"`/`"2"`.
- Two reserved IDAM system accounts (`caseworker-caa`, `caseworker-approver`) proxy access for users who don't yet have it; service-team configs must grant these IDAM roles CRUD on COR / OrganisationPolicy fields.
- Case access exposes two transient metadata fields (`access_granted`, `access_process`) to ExUI so the UI can prompt users for Challenged or Specific access where appropriate.

## How AAC orchestrates role assignment

AAC (`aac-manage-case-assignment`, port 4454) sits between XUI and three downstream systems: `ccd-data-store-api`, `ccd-definition-store-api`, and AMRAS. It also calls PRD to resolve organisation membership, and (for NoC) GOV.UK Notify to email parties.

There are two persistence paths for case-level roles, and they are distinct:

| Path | Endpoint | Writes to |
|---|---|---|
| Intra-org assignment | `POST /case-assignments` | data-store `/case-users` |
| AMRAS-direct | `POST /case-users` | AMRAS `/am/role-assignments` |
| NoC `applyDecision` bulk assign | internal | data-store `/case-users` |

The `/case-assignments` controller is conditionally enabled via `mca.conditional-apis.case-assignments.enabled` (env `MCA_CONDITIONAL_APIS_CASE_ASSIGNMENTS_ENABLED`, default `true`) (`CaseAssignmentController:42`).

The `/case-users` controller is not behind this flag but is gated by S2S: only `aac_manage_case_assignment` and `xui_webapp` may call it (`CaseAssignedUserRolesController:289-295`).

## OrganisationPolicy and case roles

Each `OrganisationPolicy` field in case data binds one case role to a PRD organisation:

```json
{
  "Organisation": { "OrganisationID": "ABC123", "OrganisationName": "Smith LLP" },
  "OrgPolicyCaseAssignedRole": "[Claimant]",
  "PreviousOrganisations": []
}
```

A case type is expected to declare a separate OrganisationPolicy for every distinct litigant role it supports — `[ApplicantSolicitor]`, `[RespondentSolicitor]`, etc. The case-creation event must default each OrganisationPolicy's `OrgPolicyCaseAssignedRole` to the matching case role; CCD's defaulting is configured through the `EventToComplexTypes` tab (or the SDK's equivalent OrgPolicyCaseAssignedRole setter).

> Litigants must not be modelled as a collection. CCD's permission model cannot vary access per element of a collection, and Notice of Change cannot target a collection element. Define each litigant up-front with its own case role.

When `CaseAssignmentService.assignCaseAccess` runs (`CaseAssignmentService:58`), it:

1. Loads the case from data-store.
2. Calls PRD to confirm the assignee is a member of the invoker's organisation.
3. Validates the assignee holds solicitor + jurisdiction roles in IDAM.
4. Finds all `OrganisationPolicy` roles matching the invoker's org.
5. Calls `dataStoreRepository.assignCase(policyRoles, caseId, assigneeId, orgId)` — writing to data-store `/case-users`.

`getCaseAssignments` (`CaseAssignmentService:83`) filters results to users in the same PRD org; roles belonging to other organisations are not returned.

### The `[CREATOR]` problem

When a solicitor creates a case, CCD automatically assigns the user a `[CREATOR]` case role (a SPECIFIC RoleAssignment of `[CREATOR]` is created via `POST /am/role-assignments`). This role does not, on its own, register the case in the org-shared count, so the case won't be shareable until a proper case role is assigned.

Service teams must therefore swap `[CREATOR]` for the correct case role early in the lifecycle, in either of two ways:

1. **About-to-submit callback** — call PRD to find the invoker's org, parse case data for the matching OrganisationPolicy, look up its `OrgPolicyCaseAssignedRole`, then call `AddCaseAssignedUsersAndRoles` followed by revoking `[CREATOR]`. Order matters — add the new role before removing the old one (each is a separate transaction; the user must never be left with no access).
2. **Post-commit callback** — call `Assign Access within Organisation` (subject to S2S whitelisting; raise a CCD ticket to be added) followed by `revokeAccessToCaseUsingDelete`.

## RoleAssignment lifecycle

When `CaseAccessOperation.addCaseUserRoles` runs (`CaseAccessOperation:112`):

1. Existing AMRAS assignments are fetched for the case/user pair.
2. Already-existing roles are filtered out (no duplicate creation).
3. `RoleAssignmentService.createCaseRoleAssignments` builds a `RoleRequestResource` with `process="CCD"`, `reference="{caseId}-{userId}"`.
4. Each `RoleAssignmentResource` is created with: `actorIdType=IDAM`, `roleType=CASE`, `grantType=SPECIFIC`, `classification=RESTRICTED`, `readOnly=false`, `beginTime=now()`.
5. AMRAS is called via `RestTemplate` (not Feign) at `POST /am/role-assignments` (`RoleAssignmentServiceHelperImpl:67`).
6. Supplementary data `orgs_assigned_users.<orgId>` on the case is incremented (`CaseAccessOperation:151`).

On removal (`CaseAccessOperation.removeCaseUserRoles`, `CaseAccessOperation:62`):

1. Existing AMRAS assignments are checked — non-existent ones are silently ignored.
2. A `MultipleQueryRequestResource` containing `RoleAssignmentQuery { caseId, userId, roleNames[] }` is POSTed to `POST /am/role-assignments/query/delete` (`ApplicationParams:91`).
3. Supplementary data count is decremented (`CaseAccessOperation:108`).
4. The `[CREATOR]` role is explicitly excluded from supplementary data counts (`CaseAccessOperation:256-259`, `CaseAccessOperation:278-279`).

`RoleAssignment.isNotExpiredRoleAssignment()` treats null `beginTime` and `endTime` as unbounded (`RoleAssignment:27`).

## Grant types and role categories

AMRAS distinguishes role assignments by `grantType`. The values CCD recognises (`GrantType.java`):

| grantType | Used for |
|---|---|
| `BASIC` | Minimal access used as a tripwire so that ExUI can prompt for Challenged access — see [Access metadata](#access-metadata-access_granted--access_process) |
| `SPECIFIC` | Case-role assignments — what AAC creates for solicitors representing a litigant, and for `[CREATOR]` |
| `STANDARD` | Organisational role with attributes (jurisdiction, region, location, etc.) |
| `CHALLENGED` | Temporary cross-region access granted after the user provides a justification |
| `EXCLUDED` | Negative rule — explicitly excludes a user from a case |

If any role assignment for the user has `grantType=EXCLUDED`, CCD removes all role assignments other than `BASIC` and `SPECIFIC` before mapping to access profiles.

`RoleCategory` (mirrored from AMRAS) is one of `JUDICIAL`, `LEGAL_OPERATIONS`, `ADMIN`, `PROFESSIONAL`, `CITIZEN` (`RoleCategory.java`).

<!-- DIVERGENCE: Confluence Access Control page lists CTSC as a category that returns 403 when reading a Restricted case without a Restricted role. Source RoleCategory enum has only JUDICIAL, LEGAL_OPERATIONS, ADMIN, PROFESSIONAL, CITIZEN. Source wins. -->

## Legacy case-role regex

Despite the move to AMRAS, CCD still uses a regex to decide whether a user "needs a case role" to access cases. The pattern (`CaseAccessService:52-54`):

```
.+-solicitor$|.+-panelmember$|^citizen(-.*)?$|^letter-holder$|^caseworker-.+-localAuthority$
```

Each role name is tested with `Matcher.matches()`, not `find()` (`DefaultUserRepository.java:206-208`), so the whole name must match one alternative — the `$` anchors are belt-and-braces. The pattern is compiled **without** `CASE_INSENSITIVE`, so a role IDAM issues as `caseworker-X-LocalAuthority` would not match `localAuthority`.

For users matching this regex who create a case, CCD assigns a SPECIFIC `[CREATOR]` Case Role role assignment. Its Role Category is **not** derived from which sub-pattern matched. `RoleAssignmentCategoryService.getRoleCategory()` re-reads the user's IDAM roles and tests three *separate* patterns, each `CASE_INSENSITIVE`, in a fixed priority order (`RoleAssignmentCategoryService.java:18-42`):

| Order | Pattern | roleCategory |
|---|---|---|
| 1 | `.+-solicitor$\|^caseworker-.+-localAuthority$` | `PROFESSIONAL` |
| 2 | `^citizen(-.*)?$\|^letter-holder$` | `CITIZEN` |
| 3 | `.+-panelmember$` | `JUDICIAL` |
| — | none matched | `LEGAL_OPERATIONS` |

Two consequences of the pattern sets being independent. A user holding several kinds of role gets the **first** category that matches, not the one belonging to whichever role satisfied the restrict regex — so a solicitor who is also a panel member is `PROFESSIONAL`. And because these three are case-insensitive while the restrict regex is not, a mixed-case role name can drive the category while failing to trigger the case-role restriction at all.

The restrict regex is also consulted during read/search to decide whether the user's `idam:<role>` pseudo-assignments are scoped to the cases they already hold a case role on, or issued unscoped — see [Legacy IDAM bridge](permissions.md#legacy-idam-as-accessprofile-bridge).

## ChangeOrganisationRequest field

The `ChangeOrganisationRequest` (COR) is a structured CCD field type that carries an in-flight representation change. Its shape:

```json
{
  "OrganisationToAdd":    { "OrganisationID": "...", "OrganisationName": "..." },
  "OrganisationToRemove": { "OrganisationID": "...", "OrganisationName": "..." },
  "CaseRoleId":           { "value": { "code": "[Claimant]", "label": "..." }, "list_items": [] },
  "RequestTimestamp":     "2026-01-15T10:00:00",
  "ApprovalStatus":       "0",
  "CreatedBy":            "solicitor@example.com"
}
```

`ApprovalStatus` stores numeric strings: `"0"` = `PENDING`, `"1"` = `APPROVED`, `"2"` = `REJECTED` (`ApprovalStatus.java`). The `check-noc-approval` endpoint also accepts the string `"APPROVED"` as equivalent to `"1"` (`NoticeOfChangeController:516-517`). The Confluence MCA-06 spec confirms responses round-trip the same enum names — payloads use `PENDING`/`APPROVED`/`REJECTED`, but the persisted JSON value is `"0"`/`"1"`/`"2"`.

The COR field has no fixed name in case data — AAC discovers it at runtime by scanning all top-level case data nodes for parents that contain children named `OrganisationToAdd` and `OrganisationToRemove` (`CaseDetails:81-93`, `client/datastore/CaseDetails.java`).

An ongoing NoC is detected by `hasCaseRoleId()` (`CaseDetails:144`): returns true when any node anywhere in the case data has a non-null `CaseRoleId`. A second concurrent NoC request is blocked at that point.

After a decision is applied, `ApplyNoCDecisionService` nullifies `CaseRoleId` in the COR (via `jacksonUtils.nullifyObjectNode`) to mark it complete, but leaves the other COR fields in place (`ApplyNoCDecisionService:90`).

### COR-related event configuration

To support NoC events, the case-type definition must:

* Declare a top-level COR field with Create/Read/Update permission for `caseworker-caa` and `caseworker-approver`.
* On the **NoC Request** event, default `ApprovalStatus` to `"1"` (Approved) for auto-approval, or `"0"` (Pending) otherwise; configure a post-commit callback to `CheckForNoCApproval`. The event must be available only to `caseworker-caa`.
* On the **NoC Approval** and **Rejection** events, default `ApprovalStatus` to `"1"` and `"2"` respectively; configure an about-to-start callback to `ApplyNoCDecision`. Available only to `caseworker-approver`.

<!-- CONFLUENCE-ONLY: COR show/hide quirk — service-team configs may need to mark CaseRoleId as READONLY rather than hidden because CCD's hide-field capability does not preserve the contents of complex-type elements. Not verified in source; recommendation comes from RCCD config guidance. -->

## Case assignment vs NoC: key distinction

Both flows ultimately affect who can access a case, but they are separate mechanisms:

- **`/case-assignments`** — intra-org sharing. A solicitor shares a case with a colleague in the same PRD organisation. No challenge questions, no approval workflow. Writes directly to data-store `/case-users`.
- **NoC** — change of representation. A solicitor from a different organisation proves they represent a litigant by answering challenge questions, then waits for approval before roles are transferred. See the NoC explanation page for the full multi-step protocol.

The NoC `applyDecision` path (`ApplyNoCDecisionService:163,200`) bulk-assigns all PRD org members of the incoming organisation and bulk-removes those of the outgoing organisation. This also goes through data-store `/case-users`, not AMRAS directly.

The auto-approval flow inside `POST /noc/noc-requests` (MCA-06) takes a third path: when the COR's defaulted `ApprovalStatus` is `"1"` (Approved) and the invoker is a solicitor in the case's jurisdiction, the API may auto-assign each matching case role on the invoker via a single call to data-store's `Add Case-Assigned Users and Roles` endpoint.

Since CCD-5334 that auto-assignment is conditional on the invoker's existing access. `RequestNoticeOfChangeService` first calls data-store `GET /internal/cases/{caseId}/access-metadata` and inspects `accessGrants`; if the invoker already holds a `STANDARD` grant on the case, no case roles are assigned, because standard access already gives them what the case roles would (`RequestNoticeOfChangeService.java:237-249`). Only when `STANDARD` is absent does the older assign-the-roles path run. Note the guard is on a non-null response: if the access-metadata call yields null, nothing is assigned at all, so a data-store that does not serve that endpoint silently disables auto-assignment rather than falling back to it.

## Specific and Challenged access

Beyond NoC and intra-org sharing, two further mechanisms let users gain access to cases they wouldn't normally see — these are administered through AMRAS validation rules and surfaced to ExUI through the access metadata.

| | Challenged | Specific |
|---|---|---|
| **Use case** | User is in the relevant service but the case is outside their usual region | User is outside the relevant service / jurisdiction |
| **Approval** | None — granted immediately on justification | Yes — routed to a `specific-access-approver-<category>` role |
| **Reason required** | Yes (mandatory) | Yes (mandatory) |
| **Duration** | Until midnight (system time) on the day of grant | Defined by the case role assignment (typically not auto-time-limited) |
| **Case role assigned** | No (a CHALLENGED role assignment is added) | Yes (a SPECIFIC `[specific-access-granted-<category>]` role is assigned) |
| **Audit** | Logged in `lau-case-backend` | Logged in `lau-case-backend` |
| **AMRAS grantType** | `CHALLENGED` | `SPECIFIC` |

For Challenged access to be offered, services must configure a `BASIC` role assignment giving every relevant user minimal visibility of the case (e.g. case title only). Without it, the case won't appear in search results and CCD has no opportunity to compute `access_process=CHALLENGED` for that user.

For Specific access, four approver roles are defined:

| Approver role | Reviews requests for users in role category |
|---|---|
| `specific-access-approver-judiciary` | JUDICIAL |
| `specific-access-approver-legal-ops` | LEGAL_OPERATIONS |
| `specific-access-approver-admin` | ADMIN |
| `specific-access-approver-ctsc` | CTSC |

A global validation rule in AMRAS allows users with these approver roles to create the matching `specific-access-<category>` role assignments. Services configure their `reviewSpecificAccessRequest<Category>` work-allocation tasks to be available to the right approver role.

LAU records both flows via a single endpoint:

```
POST audit/accessRequest
{
  requestType: "challenged" | "specific",
  caseRef, userId, action, timestamp, reason, requestEndTimestamp
}
```

<!-- CONFLUENCE-ONLY: specific-access-approver-* role names and CTSC sub-category come from the WA / AM space planning pages — not modelled in the AAC or data-store source. Verify in the actual AMRAS configuration when implementing. -->

## Access metadata (`access_granted`, `access_process`)

CCD computes two transient metadata fields on every read/search/start-event response (V2 internal APIs only) so that ExUI can decide whether to prompt the user for access:

* **`access_granted`** — CSV of grant types from the role assignments that survived filtering, de-duplicated and sorted alphabetically (`CaseAccessMetadata.java:29-38`). `BASIC` counts here, unlike in `access_process` (`DefaultCaseDataAccessControl.java:468` vs `:462`). For case creation it is always `STANDARD`.
* **`access_process`** — one of `CHALLENGED`, `SPECIFIC`, `NONE` (`AccessProcess.java`), computed post-filtering at `DefaultCaseDataAccessControl.java:402-424`:
  * `NONE` if a STANDARD/SPECIFIC/CHALLENGED role assignment passed all filtering **and** resolved to at least one access profile with `R` on the case type **and** `R` on the case's current state (`:446`). Read on the case type alone is not enough.
  * `CHALLENGED` if re-running that check against only the role assignments that failed on the region or base-location matcher would have granted access (i.e. "would have had access in the right region").
  * `SPECIFIC` otherwise — the user must request specific access.

These fields surface in:

* `searchCasesUsingPOST` results — under each case's `fields` and `fields_formatted` as `[ACCESS_GRANTED]` / `[ACCESS_PROCESS]`.
* `getCaseViewUsingGET` — under `metadataFields` as IDs `[ACCESS_GRANTED]`, `[ACCESS_PROCESS]`.
* `getCaseUpdateViewEventUsingGET` and `getCaseUpdateViewEventByCaseTypeUsingGET` — at top level as `access_granted` and `access_process`.

Note these are computed per request, never persisted.

## System accounts

AAC uses two IDAM system accounts; in addition CCD recognises both as the reserved IdAM roles `caseworker-caa` and `caseworker-approver`, which are listed under `mca.dataStoreApi.cross-jurisdictional-roles` in `application.yaml:156` (default: `caseworker-caa,caseworker-approver`):

| Account | IDAM role | Purpose |
|---|---|---|
| `caa` | `caseworker-caa` | General system-level data-store calls including proxying access for users who don't yet have it (NoC requests, CAA "Manage Organisation" reads, AAC `/case-assignments`). Token cached 1800s |
| `noc-approver` | `caseworker-approver` | Triggers NoC decision events via `NocApprovalDataStoreRepository`; separate identity for audit |

Service teams must give both `caseworker-caa` and `caseworker-approver` Read on every case field that should be visible to CAAs in Manage Organisation, and CRUD on COR / OrganisationPolicy fields that NoC events need to touch.

Tokens are cached in Caffeine with a 1800s TTL (`application.yaml:37-40` — `caaAccessTokenCache` and `nocApproverAccessTokenCache` are both in the named cache list).

A user-facing equivalent — `pui-caa` — exists for human CAAs operating ExUI Manage Organisation (`NoticeOfChangeQuestions:37`); this is an IDAM role, not a system account.

## AMRAS endpoints used

| Operation | Method + path |
|---|---|
| Create role assignments | `POST /am/role-assignments` |
| Query role assignments | `POST /am/role-assignments/query` |
| Delete by query | `POST /am/role-assignments/query/delete` |
| Get role assignments by actor | `GET /am/role-assignments/actors/{actorId}` (called by data-store, cached) |

Base URL from `role.assignment.api.host` (env `ROLE_ASSIGNMENT_URL`, default `http://localhost:5555`) (`ApplicationParams:83`).

## How CCD filters role assignments at read time

For every read/update/delete request, the data-store:

1. Calls `GET /am/role-assignments/actors/{actorId}` (cached) to fetch the user's role assignments.
2. Filters out assignments that don't apply to this case:
   * `beginTime` after now, or `endTime` before now.
   * `classification` less than that of the case.
   * `attributes.jurisdiction` set but not matching the case.
   * `attributes.casetype` set but not matching.
   * `attributes.caseId` set but not matching.
   * `attributes.caseAccessGroupId` set but not in the case's `CaseAccessGroups` field.
   * `attributes.region` set but not matching `caseManagementLocation.region`.
   * `attributes.location` set but not matching `caseManagementLocation.baseLocation`.
3. Adds `idam:<role>` pseudo-assignments, one per IDAM role on the JWT, for backward compatibility. Which flavour depends on the legacy regex (`PseudoRoleAssignmentsGenerator.java:49,62-97`): if the user matches it *and* this is not a creation profile, they get one SPECIFIC / `RESTRICTED` assignment per (IDAM role × surviving non-EXCLUDED RA carrying a `caseId`), each inheriting that RA's jurisdiction, case type and case ID — so with no such RA they get none at all. Otherwise they get one unscoped STANDARD assignment per IDAM role, classified from the definition's user-role table.
4. If any surviving RA is `EXCLUDED`, removes all RAs other than `BASIC` and `SPECIFIC`.
5. Maps survivors to Access Profiles via the `RoleToAccessProfiles` configuration.

A user with a BASIC role assignment but no Restricted role assignment for a Restricted case gets HTTP 403; a user without the BASIC RA and without a Restricted role gets HTTP 404 (the case is not even visible).

## See also

- [`apps/ccd/docs/explanation/notice-of-change.md`](notice-of-change.md) — full NoC multi-step protocol including challenge questions and approval workflow
- [`apps/ccd/docs/explanation/permissions.md`](permissions.md) — CRUD permissions and AccessProfiles in detail
- [`apps/ccd/docs/reference/glossary.md`](../reference/glossary.md) — definitions for OrganisationPolicy, COR, AMRAS, grantType
- [`apps/ccd/docs/explanation/group-access.md`](group-access.md) — org-grain group access via AccessType/AccessTypeRole sheets and CaseAccessGroups (contrast to SPECIFIC per-case role assignments)
