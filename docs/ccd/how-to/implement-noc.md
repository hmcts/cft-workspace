---
topic: notice-of-change
audience: both
sources:
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/NoticeOfChangeController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/ChangeOrganisationRequest.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/client/datastore/CaseDetails.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/NoticeOfChangeQuestions.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/VerifyNoCAnswersService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/ChallengeAnswerValidator.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/ApplyNoCDecisionService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/ras/RoleAssignmentService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/repository/DefaultDataStoreRepository.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/client/definitionstore/DefinitionStoreApiClientConfig.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/errorhandling/noc/NoCValidationError.java
  - aac-manage-case-assignment:src/main/resources/application.yaml
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/NoticeOfChange.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/ChangeOrganisationApprovalStatus.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemApplyNoticeOfChange.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/client/AssignCaseAccessClient.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseData.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseRoleID.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/model/UserRole.java
examples_extracted_from:
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseRoleID.java
status: confluence-augmented
last_reviewed: "2026-04-29T00:00:00Z"
confluence_checked_at: "2026-04-29T00:00:00Z"
confluence:
  - id: "1380221923"
    title: "A Guide to Assign Access to cases for professional users: configuration"
    space: "RCCD"
  - id: "1452902365"
    title: "API Operation: Request Notice of Change"
    space: "ACA"
  - id: "1457321193"
    title: "API Operation: Check for Notice of Change Approval"
    space: "ACA"
  - id: "1457312216"
    title: "API Operation: Apply Notice of Change Decision"
    space: "ACA"
  - id: "1457308116"
    title: "ChallengeQuestions and answers API LLD"
    space: "RCCD"
  - id: "1460555663"
    title: "API Operation: Prepare Notice of Change Request"
    space: "ACA"
  - id: "1460552966"
    title: "API Operation: Set Organisation To Remove"
    space: "ACA"
  - id: "1791328648"
    title: "Notice of Change (Devs)"
    space: "FR"
  - id: "1444741232"
    title: "Notice of Change - Case Access API Specification"
    space: "EUI"
  - id: "1440512249"
    title: "12 Notice Of Change (formally Notice of Acting)"
    space: "RIA"
---

# Implement Notice of Change

## TL;DR

- Notice of Change (NoC) lets a solicitor prove they represent a litigant and take over a case role, replacing the previous solicitor.
- The flow requires: a `ChangeOrganisationRequest` complex field on the case, a `ChallengeQuestion` group with ID `NoCChallenge` in the definition, the relevant NoC CCD events (Request to add/replace, optional Request to remove, Approval, Rejection), and `aac-manage-case-assignment` (AAC) wired as callback handler.
- AAC owns the NoC endpoints at `POST /noc/noc-requests`, `GET /noc/noc-questions`, `POST /noc/verify-noc-answers`, `POST /noc/check-noc-approval`, `POST /noc/apply-decision`, `POST /noc/noc-prepare`, and `POST /noc/set-organisation-to-remove`.
- On approval, AAC calls the data-store `addCaseUserRoles` / `removeCaseUserRoles` APIs which fan out to `am-role-assignment-service` (AMRAS), creating `CASE`-scoped role assignments for the incoming org's users and removing them for the outgoing org. AAC also appends a `PreviousOrganisations` audit entry and emails the removed users via GOV.UK Notify.
- The `ChangeOrganisationRequest.ApprovalStatus` field carries numeric-string values from the SDK enum `ChangeOrganisationApprovalStatus`: `"0"` = `NOT_CONSIDERED` (request pending decision), `"1"` = `APPROVED`, `"2"` = `REJECTED`. The `/noc/noc-requests` API response separately reports `approval_status` as `PENDING` / `APPROVED` / `REJECTED`.
- Litigants must be defined as discrete fields with distinct case roles, never as a collection — CCD cannot scope permissions or NoC to individual elements within a collection. Case roles involved in NoC must be backed by `OrganisationPolicy` fields — AAC discovers the COR field by scanning case data for any node containing both `OrganisationToAdd` and `OrganisationToRemove` children, not by a fixed field name.

---

## Step 1 — Add OrganisationPolicy fields to your case type

Each litigant side that can change representation needs an `OrganisationPolicy` complex field. The field must contain:

- `Organisation` — resolved org reference (populated by XUI/AAC)
- `OrgPolicyCaseAssignedRole` — the bracket-wrapped case role this policy covers, e.g. `[APPONESOLICITOR]`
- `PreviousOrganisations` — collection appended by AAC after each NoC decision (audit trail)

In the ccd-config-generator SDK, declare two policies on your `CaseData`:

```java
@CCD(label = "Applicant 1 solicitor organisation")
private OrganisationPolicy<UserRole> applicant1OrganisationPolicy;

@CCD(label = "Applicant 2 solicitor organisation")
private OrganisationPolicy<UserRole> applicant2OrganisationPolicy;
```

Set `OrgPolicyCaseAssignedRole` to the bracket role that will be managed by NoC (e.g. `[APPONESOLICITOR]`).

**Constraint: litigants must not be a collection.** CCD cannot scope permissions or NoC to individual elements within a collection. Each litigant type that can be represented needs its own top-level or named-complex field with an OrganisationPolicy. For example: `Applicant` + `CaseRoleForApplicant`, `Respondent` + `CaseRoleForRespondent`.

### OrganisationPolicy JSON shapes

Valid:

```json
{"Organisation": {"OrganisationID": "Y707HZM", "OrganisationName": "FinRem-1-Org"}, "OrgPolicyCaseAssignedRole": "[APPSOLICITOR]"}
```

```json
{"OrgPolicyCaseAssignedRole": "[APPSOLICITOR]"}
```

```json
{"Organisation": {"OrganisationID": null}, "OrgPolicyCaseAssignedRole": "[APPSOLICITOR]"}
```

Invalid (empty Organisation object without null OrganisationID):

```json
{"Organisation": {}, "OrgPolicyCaseAssignedRole": "[APPSOLICITOR]"}
```

<!-- CONFLUENCE-ONLY: OrganisationPolicy JSON shape validity rules come from the FR "Notice of Change (Devs)" page — not verified against definition-store or data-store schema validation in source. -->

---

## Step 2 — Add the ChangeOrganisationRequest field

Add exactly one `ChangeOrganisationRequest` field to your case data. AAC locates it dynamically by scanning for nodes containing both `OrganisationToAdd` and `OrganisationToRemove` children (`CaseDetails.java:82-92`) — the field name itself is arbitrary, but convention is `changeOrganisationRequestField`.

```java
@CCD(
    label = "Change organisation request",
    access = {AcaSystemUserAccess.class}   // grants CRU to caseworker-caa only
)
private ChangeOrganisationRequest<CaseRoleID> changeOrganisationRequestField;
```

`CaseRoleID` must implement `HasRole`; its `getRole()` returns the selected bracket role code. See `CaseRoleID.java:23-25` in nfdiv for a reference implementation.

`AcaSystemUserAccess` restricts write access to the `caseworker-caa` system account so that only AAC can mutate this field.

**Important:** After a NoC completes (approved or rejected), AAC nullifies `ChangeOrganisationRequest.CaseRoleId`. This field **must remain null** between NoC operations — if it is non-null, AAC interprets it as an ongoing NoC request and rejects new requests with error `noc-in-progress` (`NoticeOfChangeQuestions.java:131`, `CaseDetails.java:144-148`). The `ChangeOrganisationRequestField` itself persists on the case between NoC operations; only `CaseRoleId` is cleared.

---

## Step 3 — Define the ChallengeQuestion group

In the CCD definition (spreadsheet or JSON), create a challenge question group with tab ID **`NoCChallenge`** — this is hardcoded in AAC (`NoticeOfChangeQuestions.java:39`).

The questions are stored in the **definition store**, not AAC; AAC's `GET /noc/noc-questions?case_id=...` proxies to definition-store endpoint `/api/display/challenge-questions/case-type/{ctid}/question-groups/{id}` with `id=NoCChallenge` (`DefinitionStoreApiClientConfig.java:11`).

### Required columns

Each question must specify:

| Column | Constraints | Notes |
|---|---|---|
| `Order` | int, unique within group | display order |
| `QuestionId` | string, max 70 chars, unique | API exposes as `question_id` |
| `QuestionText` | non-empty string | shown to the solicitor |
| `AnswerFieldType` | enum (see below) | type of expected answer |
| `DisplayContextParameter` | string or null | format string for `Date`/`DateTime` (e.g. `#DATETIMEENTRY(dd-MM-yyyy)`); null otherwise |
| `CaseRoleId` | bracketed role e.g. `[APPONESOLICITOR]` | role this answer binds to (encoded in `answer_field` as `:[Role]` suffix per Confluence) |
| `AnswerField` / `FieldIds` | path expression(s) into case data | see grammar below |

`AnswerFieldType` permitted values (from definition-store schema): `Text`, `Date`, `Time`, `DateTime`, `PhoneUK`, `Number`, `Email`, `Postcode`.

### `answer_field` grammar (per ChallengeQuestions LLD)

The API exposes `answer_field` as a comma-separated list of `(template):(case-role)` clauses. Within each clause `${...}` references case-data fields, `|` separates alternatives, and the `:[Role]` suffix binds the answer to a case role:

```
${OrganisationField.OrganisationName}|${OrganisationField.OrganisationID}:[Claimant],
${OrganisationField.OrganisationName}|${OrganisationField.OrganisationID}:[Defendant]
```

The above means: the answer matches if it equals either OrganisationName or OrganisationID, and the matching role is determined by which clause matched.

Most service teams configure simpler single-field answers via the `FieldIds` column on the spreadsheet, e.g.:

```json
{
  "QuestionId": "applicant1Surname",
  "QuestionText": "What is the applicant's last name?",
  "AnswerFieldType": "Text",
  "CaseRoleId": "[APPONESOLICITOR]",
  "FieldIds": "applicant1.lastName"
}
```

### Matching rules

- Whitespace and `-'` characters are stripped from both sides before comparison (`ChallengeAnswerValidator.java:123`).
- Text comparison is case-insensitive (`RequestNoticeOfChangeService.java:187-191`).
- Exactly one `CaseRoleId` must match all answers; zero or multiple matches are rejected with error code `answers-not-matched-any-litigant` or `answers-not-identify-litigant`.
- For `Date`/`DateTime` answers, the user must provide the value formatted per the `DisplayContextParameter`.

---

## Step 4 — Create the NoC CCD events

The full ACA design defines **four** distinct events. Most service teams (including nfdiv) collapse them into two by always auto-approving — that's the simpler pattern shown below as 4a/4b. If you need an approver gate, configure all four (4a + 4b + 4c + 4d).

| Event | Default `ApprovalStatus` | About-to-start callback | Submitted callback | Granted to |
|---|---|---|---|---|
| **NoC Request — add/replace** | `0` (manual) or `1` (auto) | `/noc/noc-prepare` (optional) | `/noc/check-noc-approval` | `caseworker-caa` only |
| **NoC Request — remove** | `0` or `1` | `/noc/noc-prepare` | `/noc/check-noc-approval` (and about-to-submit `/noc/set-organisation-to-remove`) | solicitors + HMCTS caseworkers |
| **NoC Approval** (manual gate) | `1` (forced) | `/noc/apply-decision` | — | `caseworker-approver` + HMCTS approvers |
| **NoC Rejection** (manual gate) | `2` (forced) | `/noc/apply-decision` | — | `caseworker-approver` + HMCTS approvers |

When the Request event auto-approves (default `ApprovalStatus = 1`), the Submitted callback to `/noc/check-noc-approval` triggers the NoCDecision (Apply) event automatically — no separate Approval event UI is needed.

**Display context caveat:** CCD's Show/Hide does not currently preserve values for complex field type elements. If you hide a COR subfield (e.g. `CaseRoleId`), the value may be lost. Use `READONLY` (or `NEVER_SHOW` in the SDK, which maps to a show-condition that is never satisfied) rather than hiding directly until this is fixed.

### 4a. NoC Request event — `notice-of-change-requested` (auto-approving pattern)

This event captures the `ChangeOrganisationRequest` after AAC verifies the answers. Wire AAC callbacks:

| Callback hook | AAC endpoint |
|---|---|
| About-to-start | `POST /noc/noc-prepare` (only required for "remove representation" flows; nfdiv omits) |
| Submitted | `POST /noc/check-noc-approval` |

Grant `CRU` to `caseworker-caa` only.

```java
// Using ccd-config-generator SDK (nfdiv pattern)
configBuilder.event("notice-of-change-requested")
    .forStates(POST_ISSUE_STATES)
    .name("Notice Of Change Requested")
    .grant(CREATE_READ_UPDATE, ORGANISATION_CASE_ACCESS_ADMINISTRATOR)
    .aboutToStartCallback(this::aboutToStart)
    .submittedCallback(this::submitted);         // calls POST /noc/check-noc-approval
```

See `SystemRequestNoticeOfChange.java:54-81` for the nfdiv reference implementation.

<!-- CONFLUENCE-ONLY: the "About-to-start = POST /noc/noc-prepare" mapping for the Request event is documented in the ACA configuration guide for "remove representation" flows only; for "add/replace" the about-to-start can be a service-side handler. nfdiv's about-to-start does service-specific logic, not /noc/noc-prepare. -->

The default event id used by the SDK (`NoticeOfChange.DEFAULT_REQUEST_EVENT_ID`) is `noc-request`, not `notice-of-change-requested` — nfdiv overrides it. Either id is fine as long as it's used consistently in your config and any Submitted callback URL configured in CCD definition matches.

### 4b. NoCDecision event — `notice-of-change-applied`

This event finalises the change and triggers AMRAS role updates via `POST /noc/apply-decision`.

| Callback hook | AAC endpoint |
|---|---|
| About-to-start | `POST /noc/apply-decision` |

Grant `CRU` to `caseworker-approver` only (`NOC_APPROVER` role).

```java
configBuilder.event("notice-of-change-applied")
    .forAllStates()
    .name("Apply Notice of Change")
    .grant(CREATE_READ_UPDATE, NOC_APPROVER)     // caseworker-approver
    .grantHistoryOnly(CASE_WORKER, SOLICITOR)
    .aboutToStartCallback(this::aboutToStart);   // calls POST /noc/apply-decision
```

See `SystemApplyNoticeOfChange.java:63-71` for the nfdiv reference implementation. The default SDK event id is `notice-of-change-applied` (`NoticeOfChange.DEFAULT_EVENT_ID`).

### 4c. NoC Approval event (optional — only with manual approver gate)

If you require a human approver (rather than auto-approval), configure a separate event whose role is to default `ApprovalStatus = 1` and trigger `/noc/apply-decision` (so it doubles as the NoCDecision event in this pattern). Grant only to `caseworker-approver` and HMCTS approver roles. Use defaulting on COR.ApprovalStatus and an about-to-start callback to `/noc/apply-decision`.

### 4d. NoC Rejection event (optional — manual approver gate)

Same as Approval but defaults `ApprovalStatus = 2`. Grant only to `caseworker-approver` and HMCTS approver roles. The about-to-start callback to `/noc/apply-decision` will see `ApprovalStatus = Rejected`, nullify the COR, and return without changing role assignments.

<!-- CONFLUENCE-ONLY: the four-event pattern (separate Approval + Rejection events) is the ACA reference design. No service in this workspace currently uses it — nfdiv, et-* and others all use the simpler auto-approve 2-event variant. -->

### Per-Confluence callback wiring summary

The full event-to-callback matrix per ACA configuration guide (page 1380221923) is:

| Event purpose | About-to-start | About-to-submit | Submitted |
|---|---|---|---|
| NoC Request (add/replace) | service handler | — | `/noc/check-noc-approval` |
| NoC Request (remove) | `/noc/noc-prepare` (build CaseRole list) | `/noc/set-organisation-to-remove` | `/noc/check-noc-approval` |
| NoC Approval | `/noc/apply-decision` | — | — |
| NoC Rejection | `/noc/apply-decision` | — | — |

---

## Step 5 — Wire AAC as the callback host

### How the ExUI NoC flow invokes AAC

When a solicitor initiates NoC from Expert UI, the browser calls ExUI's Node backend at `POST /api/noc/submitNoCEvents`. ExUI then calls AAC at `POST /noc/noc-requests`, which validates the challenge answers and triggers the configured CCD event via the data store. This proxy pattern means the solicitor never directly calls CCD event APIs — AAC acts on their behalf using the `caseworker-caa` system user.

### S2S whitelist

AAC restricts which services may call it via S2S token verification. The default whitelist is configured in `application.yaml:99`:

```
xui_webapp,ccd_data,finrem_case_orchestration,prl_cos_api,et_cos,et_sya_api
```

If your service needs to call AAC directly (e.g. from a Feign client in your callback), raise a CCD platform ticket to add your service's S2S name (`MANAGE_CASE_S2S_AUTHORISED_SERVICES`).

### Callback URL configuration

Set the callback base URL in your case type configuration to point at `aac-manage-case-assignment` (port 4454 by default):

```java
// In your top-level case type config (e.g. equivalent of NoFaultDivorce.java)
configBuilder.setCallbackHost(System.getenv().getOrDefault("CASE_API_URL", "http://localhost:4550"));
```

The NoC callbacks (`/noc/noc-prepare`, `/noc/set-organisation-to-remove`, etc.) live on AAC, not your service. In CCD definition the callback URL for these events must point at AAC's base URL, not your service's callback host. Wire them explicitly per-event if your SDK supports it, or configure CCD's callback resolver to route those event IDs to AAC.

---

## Step 6 — Call AAC from your service callbacks (optional service-side logic)

If you need to perform service-specific logic (e.g. audit trail, notification dispatch) around NoC, implement your own event classes that call AAC's client.

The nfdiv pattern uses a Feign client (`AssignCaseAccessClient`) to call AAC:

```java
// SystemApplyNoticeOfChange.aboutToStart
var response = assignCaseAccessClient.applyNoticeOfChange(
    systemUserToken,
    s2sToken,
    ApplyNoCDecisionRequest.builder().caseDetails(details).build()
);
// Convert response data back onto CaseData
var updatedData = objectMapper.convertValue(response.getData(), CaseData.class);
```

`AssignCaseAccessClient.java` is a standard Feign client targeting AAC. Use system-user tokens (not the triggering user's token) when calling AAC from callbacks — see `SystemApplyNoticeOfChange.java:87-91`.

---

## Step 7 — Verify role assignment side effects

When AAC processes `POST /noc/apply-decision` on an approved NoC, it:

1. Calls `dataStoreRepository.assignCase(...)` for all PRD users in the incoming org — writes to data-store `/case-users` (`ApplyNoCDecisionService.java:163`).
2. Calls `dataStoreRepository.removeCaseUserRoles(...)` for all PRD users in the outgoing org (`ApplyNoCDecisionService.java:200`).
3. Internally, `CaseAccessOperation.addCaseUserRoles` routes to AMRAS via `RoleAssignmentService.createCaseRoleAssignments` which POSTs to `POST /am/role-assignments` with `roleType=CASE`, `grantType=SPECIFIC`, `classification=RESTRICTED` (`RoleAssignmentService.java:74`).
4. Appends a `PreviousOrganisation` entry (with org name, address, from/to timestamps) to `OrganisationPolicy.PreviousOrganisations` via `ApplyNoCDecisionService.setOrgPolicyPreviousOrganisations`.
5. Nullifies `ChangeOrganisationRequest.CaseRoleId` to mark the NoC complete (`ApplyNoCDecisionService.java:90`).
6. Sends a GOV.UK Notify email to removed organisation users.

Note: `/noc/apply-decision` returns HTTP 200 even on processing errors — check `response.errors[]`, not HTTP status (`NoticeOfChangeController.java:361-367`).

---

## Verify

1. Trigger `GET /noc/noc-questions?case_id=<caseId>` against AAC. You should receive a `ChallengeQuestionsResult` with your configured questions (answer values stripped).

2. Call `POST /noc/noc-requests` with correct answers. On success, the case `ChangeOrganisationRequest` field will have `ApprovalStatus="1"` and `CaseRoleId` populated. Query AMRAS to confirm new role assignments:

```bash
curl -X POST https://<amras-host>/am/role-assignments/query \
  -H "Authorization: Bearer <token>" \
  -H "ServiceAuthorization: <s2s>" \
  -d '{"queryRequests":[{"caseId":["<caseId>"],"roleType":["CASE"]}]}'
```

Confirm the incoming org's users hold `CASE`-scoped assignments and the outgoing org's users do not.

---

## Error codes

AAC returns structured error codes in its responses. The full set from `NoCValidationError.java`:

| Error code | Meaning |
|---|---|
| `noc-in-progress` | An ongoing NoC request already exists (COR.CaseRoleId is non-null) |
| `no-org-policy` | No OrganisationPolicy exists for one or more roles in the NoC request |
| `noc-event-unavailable` | No NoC events available for this case type |
| `multiple-noc-requests-on-user` | Multiple NoC Request events found for the user |
| `multiple-noc-requests-on-case` | More than one ChangeOrganisationRequest found on the case |
| `insufficient-privileges` | Insufficient privileges for notice of change request |
| `case-id-invalid` | Case ID is not a valid 16-digit Luhn number |
| `case-id-empty` | Case ID is empty |
| `case-id-invalid-length` | Case ID is not 16 digits long |
| `answers-empty` | Challenge question answers were not provided |
| `answers-not-matched-any-litigant` | The answers did not match those for any litigant |
| `answers-not-identify-litigant` | The answers did not uniquely identify a litigant (matched multiple) |
| `invalid-case-role` | CaseRole in COR matched none or more than one OrganisationPolicy |
| `has-represented` | The requestor already represents the litigant identified by the answers |
| `missing-cor-case-role-id` | CaseRoleID in COR definition is missing |
| `answers-mismatch-questions` | Number of answers does not match number of questions |
| `no-answer-provided-for-question` | No answer was provided for a specific question ID |

Additionally, XUI surfaces user-facing messages (from EUI API spec):
- "Not a valid case reference" — no case with that reference exists
- "You already have access to the case" — the user's org already holds the matched OrganisationPolicy
- "Another NoC request has been actioned" — race condition: a concurrent NoC was processed first

<!-- CONFLUENCE-ONLY: XUI user-facing error messages (last three in list) come from EUI spec; not verified in aac-manage-case-assignment source. -->

---

## Example

### config-generator form — `notice-of-change-requested` event (nfdiv)

```java
// from apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java
@Override
public void configure(final ConfigBuilder<CaseData, State, UserRole> configBuilder) {
    new PageBuilder(configBuilder
        .event(NOTICE_OF_CHANGE_REQUESTED)
        .forStates(POST_ISSUE_STATES)
        .name("Notice Of Change Requested")
        .grant(CREATE_READ_UPDATE, ORGANISATION_CASE_ACCESS_ADMINISTRATOR)
        .grantHistoryOnly(LEGAL_ADVISOR, JUDGE, CASE_WORKER, SUPER_USER)
        .aboutToStartCallback(this::aboutToStart)
        .submittedCallback(this::submitted))
        .page("nocRequest")
        .complex(CaseData::getChangeOrganisationRequestField)
            .complex(ChangeOrganisationRequest::getOrganisationToAdd)
                .optional(Organisation::getOrganisationId)
                .optional(Organisation::getOrganisationName)
            .done()
            .complex(ChangeOrganisationRequest::getOrganisationToRemove)
                .optional(Organisation::getOrganisationId)
                .optional(Organisation::getOrganisationName)
            .done()
                .optional(ChangeOrganisationRequest::getRequestTimestamp)
                .optional(ChangeOrganisationRequest::getCaseRoleId)
            .optional(
                ChangeOrganisationRequest::getApprovalStatus,
                NEVER_SHOW,
                ChangeOrganisationApprovalStatus.APPROVED.getValue()
            )
        .done();
}

public SubmittedCallbackResponse submitted(CaseDetails<CaseData, State> details, CaseDetails<CaseData, State> beforeDetails) {
    String sysUserToken = idamService.retrieveSystemUpdateUserDetails().getAuthToken();
    String s2sToken = authTokenGenerator.generate();
    return assignCaseAccessClient.checkNocApproval(sysUserToken, s2sToken, acaRequest(details));
}
```

### config-generator form — `CaseRoleID` implementing `HasRole` (nfdiv)

```java
// from apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseRoleID.java
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
@Getter
public class CaseRoleID implements HasRole {

    @JsonProperty("value")
    private DynamicListItem value;

    @JsonProperty("list_items")
    private List<DynamicListItem> listItems;

    public String getRole() {
        return value.getCode().toString();
    }
}
```

<!-- source: apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java:54-81 -->
<!-- source: apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseRoleID.java:1-36 -->

## See also

- [Notice of Change](../explanation/notice-of-change.md) — conceptual overview of the NoC flow and approval model
- [AAC API reference](../reference/api-aac.md) — full endpoint reference for aac-manage-case-assignment

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

