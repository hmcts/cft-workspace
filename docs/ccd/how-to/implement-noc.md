---
topic: notice-of-change
audience: both
sources:
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/NoticeOfChangeController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/ChangeOrganisationRequest.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/client/datastore/CaseDetails.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/NoticeOfChangeQuestions.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/VerifyNoCAnswersService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/ras/RoleAssignmentService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/repository/DefaultDataStoreRepository.java
  - aac-manage-case-assignment:src/main/resources/application.yaml
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemApplyNoticeOfChange.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/client/AssignCaseAccessClient.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseData.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseRoleID.java
examples_extracted_from:
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/divorcecase/model/CaseRoleID.java
status: needs-fix
last_reviewed: "2026-04-29T00:00:00Z"
---

# Implement Notice of Change

## TL;DR

- Notice of Change (NoC) lets a solicitor prove they represent a litigant and take over a case role, replacing the previous solicitor.
- The flow requires: a `ChangeOrganisationRequest` complex field on the case, a `ChallengeQuestion` group named `NoCChallenge` in the definition, two CCD events (`notice-of-change-requested` / `notice-of-change-applied`), and `aac-manage-case-assignment` (AAC) wired as callback handler.
- AAC owns the NoC endpoints at `POST /noc/noc-requests`, `POST /noc/check-noc-approval`, `POST /noc/apply-decision`, `POST /noc/noc-prepare`, and `POST /noc/set-organisation-to-remove`.
- On approval, AAC calls `am-role-assignment-service` (AMRAS) to create `CASE`-scoped role assignments for the incoming org's users and removes them for the outgoing org.
- The `ChangeOrganisationRequest.ApprovalStatus` uses numeric strings: `"0"` = Pending, `"1"` = Approved, `"2"` = Rejected.
- Case roles involved in NoC must be backed by `OrganisationPolicy` fields — AAC discovers them by scanning case data, not by a fixed field name.

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

---

## Step 3 — Define the ChallengeQuestion group

In the CCD definition (spreadsheet or JSON), create a challenge question group with tab ID **`NoCChallenge`** — this is hardcoded in AAC (`NoticeOfChangeQuestions.java:39`).

Each question must specify:
- `QuestionId` — unique within the group
- `QuestionText` — shown to the solicitor
- `AnswerFieldType` — field type to compare against
- `CaseRoleId` — the bracket role this answer identifies (e.g. `[APPONESOLICITOR]`)
- `FieldIds` — dot-separated path(s) into case data whose value the solicitor must match

Example question (JSON shape):

```json
{
  "QuestionId": "applicant1Surname",
  "QuestionText": "What is the applicant's last name?",
  "AnswerFieldType": "Text",
  "CaseRoleId": "[APPONESOLICITOR]",
  "FieldIds": "applicant1.lastName"
}
```

Answer matching strips whitespace and `-'` characters and is case-insensitive for text fields (`ChallengeAnswerValidator.java:122`). Exactly one `CaseRoleId` must match all answers; zero or multiple matches are rejected.

---

## Step 4 — Create the two NoC CCD events

You need two system-driven events. Grant them only to the system accounts that AAC uses.

### 4a. `notice-of-change-requested`

This event captures the `ChangeOrganisationRequest` after AAC verifies the answers. Wire AAC callbacks:

| Callback hook | AAC endpoint |
|---|---|
| About-to-start | `POST /noc/noc-prepare` |
| Submitted | `POST /noc/check-noc-approval` |

Grant `CRU` to `caseworker-caa` only.

```java
// Using ccd-config-generator SDK (nfdiv pattern)
configBuilder.event("notice-of-change-requested")
    .forStates(POST_ISSUE_STATES)
    .name("Notice Of Change Requested")
    .grant(CREATE_READ_UPDATE, ORGANISATION_CASE_ACCESS_ADMINISTRATOR)
    .aboutToStartCallback(this::aboutToStart)    // calls POST /noc/noc-prepare
    .submittedCallback(this::submitted);         // calls POST /noc/check-noc-approval
```

See `SystemRequestNoticeOfChange.java:54-81` for the nfdiv reference implementation.

### 4b. `notice-of-change-applied`

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

See `SystemApplyNoticeOfChange.java:63-71` for the nfdiv reference implementation.

---

## Step 5 — Wire AAC as the callback host

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

| Term | Definition |
|---|---|
| `ChangeOrganisationRequest` (COR) | CCD complex field type holding the in-flight NoC state: org to add, org to remove, selected case role, approval status, timestamps. |
| `ChallengeQuestion` | A question in the `NoCChallenge` group used to verify a solicitor's knowledge of the litigant they claim to represent. |
| AAC / MCA | `aac-manage-case-assignment` — the microservice that owns NoC and case-assignment flows. Runs on port 4454. |
| AMRAS | `am-role-assignment-service` — stores and evaluates case-scoped role assignments. AAC writes to it on NoC approval. |
| `caseworker-caa` | The IDAM role (`ORGANISATION_CASE_ACCESS_ADMINISTRATOR`) used by the AAC system account to drive the `notice-of-change-requested` event. |
| `caseworker-approver` | The IDAM role (`NOC_APPROVER`) used to trigger and approve the `notice-of-change-applied` event. |
