---
title: Onboard Jurisdiction
topic: overview
diataxis: how-to
product: wa
audience: both
sources:
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/config/AllowedJurisdictionConfiguration.java
  - wa-task-management-api:src/main/resources/application.yaml
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/domain/DecisionTable.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/enums/CFTTaskState.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/domain/camunda/DmnAndMessageNames.java
  - wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-cancellation-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-completion-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-types-wa-wacasetype.dmn
  - wa-task-configuration-template:camunda-deployment.sh
status: reviewed
examples_extracted_from:
  - apps/wa/wa-task-management-api/src/main/resources/application.yaml
  - apps/wa/wa-task-configuration-template/camunda-deployment.sh
confluence:
  - id: "1545343113"
    title: "Work Allocation / Case Access Management Architectural Onboarding Guide"
    last_modified: "unknown"
    space: "WA"
  - id: "1672087665"
    title: "Onboarding Triage Guidance"
    last_modified: "unknown"
    space: "WA"
  - id: "1550716868"
    title: "Draft Service Onboarding Notes"
    last_modified: "unknown"
    space: "WA"
  - id: "1460564191"
    title: "Onboarding Framework"
    last_modified: "unknown"
    space: "WA"
  - id: "1518685963"
    title: "Analysis for Onboarding"
    last_modified: "unknown"
    space: "WA"
  - id: "1525466902"
    title: "WA Feature Flag DMN rules"
    last_modified: "unknown"
    space: "WA"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Onboarding a new jurisdiction requires: registering it in `allowedJurisdictions`/`allowedCaseTypes`, whitelisting on the Azure Service Bus subscription, granting CCD field access to the `caseworker-wa-task-configuration` role, authoring DMN decision tables, deploying them to Camunda, and verifying end-to-end task creation.
- The `wa-task-configuration-template` repo provides a complete reference implementation; copy its DMN files and rename from `wa-wacasetype` to `<jurisdiction>-<casetype>`.
- Seven DMN tables are needed: initiation, configuration, permissions, cancellation, completion, allowed-days, and task-types.
- DMN table keys follow the pattern `wa-task-<type>-<jurisdiction>-<casetype>` (lowercase). The code in `DecisionTable.getTableKey()` and `DmnAndMessageNames.getTableKey()` enforces this.
- Services must also onboard to Access Management (role assignments) and Reference Data (staff/judicial/location) — those are separate processes but required for full WA functionality.
- DMN deployment uses `camunda-deployment.sh` with S2S auth against the shared Camunda cluster.

## Prerequisites

- A CCD case type definition with events that should trigger tasks.
- CCD events that trigger tasks must be configured with `Publish` or `PublishAs` in the case definition so they are published to the Azure Service Bus `ccd-case-events` topic.
- The `caseworker-wa-task-configuration` role must have read access to all CCD case fields referenced in your configuration DMN. Update your `AuthorisationCaseField` definitions accordingly.
- Access to the shared Camunda cluster URL for your target environment.
- An S2S service token whitelisted for Camunda deployment.
- Camunda Modeler (for visual DMN editing) or a text editor for raw XML.
- Coordination with the WA team and AM team: your service needs to be whitelisted on the ASB subscription filter and in Access Management for role assignments.

## Step 1: Register jurisdiction and case type

1. Open the `wa-task-management-api` Helm chart values (or equivalent environment config) and locate `config.allowedJurisdictions` and `config.allowedCaseTypes`.
2. Add your jurisdiction slug (e.g. `employment`) to the `allowedJurisdictions` list and your case type ID (e.g. `ET_EnglandWales`) to the `allowedCaseTypes` list.

The defaults from `application.yaml` are:
- **Jurisdictions**: `ia`, `wa`, `sscs`, `civil`, `publiclaw`, `privatelaw`, `employment`, `st_cic`
- **Case types**: `asylum`, `wacasetype`, `sscs`, `civil`, `generalapplication`, `care_supervision_epo`, `prlapps`, `et_englandwales`, `et_englandwales_listings`, `et_englandwales_multiple`, `et_scotland`, `et_scotland_listings`, `et_scotland_multiple`, `et_admin`, `privatelaw_exceptionrecord`, `benefit`, `CriminalInjuriesCompensation`

If your jurisdiction is already listed, confirm the case type is also present.

**Azure Service Bus whitelisting**: The `wa-case-event-handler` listens on the `ccd-case-events` topic via a subscription with a SQL filter rule that restricts which jurisdictions' events are processed. You need a ticket raised with the WA team to add your jurisdiction to this subscription filter in each environment (AAT, then Production). Without this, events for your case type will not reach the Case Event Handler.
<!-- CONFLUENCE-ONLY: ASB subscription filter whitelisting process not verified in source -->

## Step 1b: Update CCD definition for WA access

Before tasks can be configured, the WA system user must be able to read the case data fields referenced in your configuration DMN.

1. Add `caseworker-wa-task-configuration` to your `AuthorisationCaseField` definitions with at minimum `R` (Read) permission on every field your configuration DMN references (e.g. location fields, case name, appeal type, hearing dates).
2. Ensure any case fields used as inputs in the initiation DMN are included in the `Publish` configuration of the CCD event (`additionalData` payload). Only fields explicitly published by CCD are available to the DMN evaluation.
3. Add the following standard case data fields if not already present:
   - **`caseManagementLocation`** — a complex field containing `region` and `baseLocation` (court EPIMMS ID). Tasks derive their location from this field; without it, tasks cannot be correctly routed to users.
   - **`caseManagementCategory`** — displayed in task lists and used for filtering. Map to a meaningful category for your service.
   - **`caseAccessCategory`** (optional) — used when access rules vary between subtypes within the same CCD case type.
   - **`nextHearingDate`** (optional) — surfaced in task/case lists to allow prioritisation based on upcoming hearings.

<!-- CONFLUENCE-ONLY: caseManagementLocation/caseManagementCategory requirement not verified in source -->

## Step 2: Clone the task configuration template

3. Clone `wa-task-configuration-template`:
   ```bash
   git clone git@github.com:hmcts/wa-task-configuration-template.git
   ```
4. Copy all DMN files from `src/main/resources/` that match the pattern `wa-task-*-wa-wacasetype.dmn`.
5. Rename each file replacing `wa-wacasetype` with your `<jurisdiction>-<casetype>` slug. For example:
   ```
   wa-task-initiation-employment-et_englandwales.dmn
   wa-task-configuration-employment-et_englandwales.dmn
   wa-task-permissions-employment-et_englandwales.dmn
   wa-task-cancellation-employment-et_englandwales.dmn
   wa-task-completion-employment-et_englandwales.dmn
   wa-task-allowed-days-employment-et_englandwales.dmn
   wa-task-types-employment-et_englandwales.dmn
   ```
6. Inside each DMN XML file, update the `<decision id="...">` attribute to match the new filename stem (without `.dmn`).

## Step 3: Author the initiation DMN

The initiation DMN determines which tasks are created when CCD events fire.

7. Set the hit policy to `COLLECT` (multiple rules can fire per event, creating multiple tasks).
8. Define input columns:
   - `eventId` (string) — the CCD event ID
   - `postEventState` (string) — the case state after the event
   - Additional FEEL expressions for case data fields (e.g. `additionalData.Data.appealType`)
9. Define output columns:
   - `taskId` / `taskType` — the task type identifier (same value in both columns)
   - `name` — human-readable display name
   - `workingDaysAllowed` — default SLA in working days
   - `processCategories` — comma-separated category identifiers (e.g. `"caseProgression"`)
   - `delayDuration` or `delayUntil` — optional delay before task becomes actionable
10. Add one row per (event, task) combination. Example:

| eventId | postEventState | taskId | name | workingDaysAllowed | processCategories |
|---------|---------------|--------|------|-------------------|-------------------|
| `submitCase` | `caseUnderReview` | `reviewAppeal` | Review the appeal | 2 | `caseProgression` |

## Step 4: Author the configuration DMN

The configuration DMN sets task attributes (location, work type, role category, priority, due dates).

11. Set the hit policy to `RULE ORDER` (later matching rules override earlier ones).
12. Define inputs: `caseData` (string — the CCD case data map) and `taskType` (FEEL expression from `taskAttributes.taskType`).
13. Define outputs: `name` (attribute key), `value` (attribute value), `canReconfigure` (boolean).
14. Add rows for each task type covering at minimum:
    - `caseName`, `region`, `location`, `locationName` — from case data fields
    - `workType` — must be exactly one of the centrally-maintained values (see table below)
    - `roleCategory` — exactly one of: `"LEGAL_OPERATIONS"`, `"ADMIN"`, `"JUDICIAL"`, `"CTSC"`
    - `caseManagementCategory` — from case data
    - `majorPriority` / `minorPriority` — numeric sort weight for task list ordering
    - `description` — a markdown/HTML string shown in the Task Tab, typically containing a link to the event trigger: `[Action text](/case/JURISDICTION/CaseType/${[CASE_REFERENCE]}/trigger/eventId)`
    - `nextHearingDate` — from case data; surfaced in task lists for prioritisation
    - `dueDateOrigin`, `dueDateIntervalDays`, `dueDateNonWorkingCalendar`, `dueDateSkipNonWorkingDays`, `dueDateMustBeWorkingDay` — for calculated due dates

**Work types** are a centrally-maintained enumeration shared across all services:

| ID | Display Name | Description |
|----|-------------|-------------|
| `hearing_work` | Hearing work | Any task related to a hearing |
| `upper_tribunal` | Upper Tribunal | Any task related to appeals to the upper tribunal |
| `routine_work` | Routine work | Routine task not requiring a legal decision |
| `decision_making_work` | Decision-making work | Task requiring a legal decision |
| `applications` | Applications | Task related to applications |
| `priority` | Priority | High priority tasks to complete first |
| `error_management` | Manage errors | Investigate robot or notification failures |
| `access_requests` | Access requests | Review specific access requests |
| `review_case` | Review case | Any task requiring case review |
| `evidence` | Evidence | Review evidence or submissions |
| `follow_up` | Follow Up | Follow up with a person or action |

<!-- CONFLUENCE-ONLY: work types list from Confluence Onboarding Framework; not maintained as an enum in source code -->

If your tasks require a work type not in the list above, a governance process with the WA team is needed to extend the central set.

Set `canReconfigure=true` on attributes that should be recalculated when a reconfiguration is triggered (e.g. `location`, `caseName`). Attributes with `canReconfigure=false` are set only on initial task creation.

## Step 5: Author the permissions DMN

The permissions DMN controls who can act on each task type.

15. Set the hit policy to `RULE ORDER`.
16. Keep the universal `task-supervisor` catch-all as the first rule:
    ```
    task-supervisor | Read,Manage,Cancel,Assign,Unassign,Complete | LEGAL_OPERATIONS
    ```
17. Add rows for each role/task-type combination. Output columns:
    - `name` — role name (e.g. `"tribunal-caseworker"`, `"judge"`)
    - `value` — comma-separated permission flags from the `PermissionTypes` enum: `Read`, `Refer`, `Own`, `Manage`, `Execute`, `Cancel`, `Complete`, `CompleteOwn`, `CancelOwn`, `Claim`, `Unclaim`, `Assign`, `Unassign`, `UnclaimAssign`, `UnassignClaim`, `UnassignAssign`
    - `roleCategory` — the role category (`LEGAL_OPERATIONS`, `ADMIN`, `JUDICIAL`, `CTSC`)
    - `assignmentPriority` — integer; lower = higher priority for auto-assignment
    - `autoAssignable` — boolean; set `true` for roles that receive auto-assignment. Auto-assignment only works for **case roles** (not organisational roles) — a user must be allocated to the specific case via a case role assignment for auto-assignment to take effect.
    - `authorisations` — optional; judicial ticket codes or authorisation numbers. Only applies when the role requires specific authorisations (e.g. specialist tribunal tickets).

**Auto-assignment logic**: When a task is created/reconfigured, if exactly one user has a case role on the case that is marked `autoAssignable=true` for that task type, and the role grants the `Own` permission, the task is automatically assigned to that user. If multiple eligible users exist, `assignmentPriority` breaks the tie (lower number wins).

## Step 6: Author the cancellation, completion, and task-types DMNs

18. **Cancellation DMN** (hit policy `COLLECT`): map CCD events to actions (`Cancel`, `Warn`, `Reconfigure`) against task process categories. Include `warningCode`/`warningText` for `Warn` actions.
19. **Completion DMN** (hit policy `COLLECT`): map CCD event IDs to task types that should be auto-completed (set `completionMode = "Auto"`).
20. **Task types DMN** (hit policy `COLLECT`, no input): list every `taskTypeId` and `taskTypeName` your jurisdiction defines. XUI uses this to populate filter dropdowns.
21. **Allowed days DMN** (hit policy `FIRST`): map direction task IDs to follow-up task types with `workingDaysAllowed` values.

## Step 7: Deploy DMN and BPMN to Camunda

22. Set environment variables:
    ```bash
    export CAMUNDA_URL="https://camunda-<env>.platform.hmcts.net/engine-rest"
    ```
23. Edit `camunda-deployment.sh` — update `TENANT_ID` and `PRODUCT` to your jurisdiction values (`camunda-deployment.sh:11-12`).
24. Obtain an S2S token for a service whitelisted in Camunda.
25. Run the deployment:
    ```bash
    ./camunda-deployment.sh $SERVICE_TOKEN
    ```
    The script POSTs each `.dmn` and `.bpmn` file under `src/main/resources/` to `${CAMUNDA_URL}/deployment/create` with the `ServiceAuthorization` header.

## Step 8: Write DMN unit tests

26. Create a test class extending `DmnDecisionTableBaseUnitTest` from the template.
27. Add a row-count guard assertion (e.g. `assertThat(logic.getRules().size(), is(N))`) to catch untested row additions.
28. Add parameterised scenarios using `@MethodSource("scenarioProvider")` that exercise representative input combinations and assert expected outputs.
29. Run:
    ```bash
    ./gradlew test
    ```

## Verify

Confirm end-to-end task creation:

1. Trigger a CCD event (in AAT or local cftlib) for your case type that matches a row in your initiation DMN.
2. Query the task management API to confirm a task was created:
   ```bash
   curl -X POST https://wa-task-management-api-<env>.service.core-compute-<env>.internal/task \
     -H "Authorization: Bearer $USER_TOKEN" \
     -H "ServiceAuthorization: $S2S_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "search_parameters": [
         {"key": "jurisdiction", "operator": "IN", "values": ["<your-jurisdiction>"]},
         {"key": "case_id", "operator": "IN", "values": ["<case-id>"]}
       ]
     }'
   ```
3. Confirm the response contains a task with the expected `task_type`, `location`, `work_type`, and permissions matching your DMN configuration.
4. Open the case in ExUI and confirm the task appears in the Tasks tab with correct assignment and action buttons.

## Feature flag pattern for DMN rules

If you need to merge DMN rules to `master` without them becoming active immediately (e.g. for a coordinated go-live), you can add a feature flag column:

- **Option A** — add an `isLive` boolean input column. Set to `false` for unreleased rules; flip to `true` at release time.
- **Option B** — add a `liveFrom` output column containing an ISO-8601 date string (e.g. `"2024-06-01T00:00:00"`). The WA framework filters out rules whose `liveFrom` date is in the future.

This avoids the risk of partially-released DMN rules being evaluated in production before the service is ready.

## Troubleshooting

Common issues encountered during onboarding:

| Symptom | Likely cause | Resolution |
|---------|-------------|------------|
| CCD event fires but no task appears | ASB subscription filter does not include your jurisdiction | Raise ticket with WA team to add jurisdiction to subscription SQL filter |
| CCD event fires but no task appears | Initiation DMN inputs don't match — case data not published or missing fields | Ensure all `additionalData` fields needed by initiation DMN are in the CCD `Publish` config |
| CCD event fires but no task appears | Earlier failed/unprocessable event for same case blocks the session | Contact WA team to check for `UNPROCESSABLE` messages in `wa-case-event-handler` |
| Task visible in Camunda but not in ExUI | Task stuck in `UNCONFIGURED` state | Configuration DMN failed — check that `caseworker-wa-task-configuration` can read all referenced CCD fields |
| Task data doesn't match expectations | Configuration DMN references a field the WA user can't access | Add missing field to `AuthorisationCaseField` for `caseworker-wa-task-configuration` |
| Users cannot see tasks in their task list | Role assignment region doesn't match task region | Ensure user region matches task region. Note: region `1` (National) is **not** a superset of all regions. To give a role access to **all regions**, create it with **no region ID**. |
| Due date differs between Camunda and ExUI | Calendar enhancement vs legacy calculation | ExUI uses the new calendar-based due date from the task DB; Camunda retains the legacy `workingDaysAllowed` calculation as a task variable |

**Task states** (from `CFTTaskState` enum): `UNCONFIGURED` -> `PENDING_AUTO_ASSIGN` -> `ASSIGNED` / `UNASSIGNED` -> `COMPLETED` / `CANCELLED` / `TERMINATED`. A task stuck in `UNCONFIGURED` indicates configuration failure. `PENDING_RECONFIGURATION` is a transient state during reconfiguration.

## Access Management onboarding (parallel workstream)

Full WA functionality requires users to have correct role assignments. This is a separate onboarding with the AM team but must proceed in parallel:

1. **Organisational role mappings** — specify how staff/judicial reference data maps to role assignments. Provide requirements to the AM team; common patterns exist.
2. **Case role validation rules** — define which users can grant/receive case roles on your case type. Raise with AM team.
3. **Standard role names** — ensure your configuration includes permissions for standard roles: `task-supervisor`, `case-allocator`, `hmcts-judiciary`, `hmcts-legal-operations`, `hmcts-admin`, and the specific/challenged access variants.
4. **WA system user** — the `wa-system-username` credential (stored in Key Vault) must be granted sufficient access to retrieve your case data from CCD. This user is used by `wa-task-management-api` and `wa-task-monitor` for task configuration and reconfiguration.

<!-- CONFLUENCE-ONLY: AM onboarding steps not verified in source -->

## Examples

### Allowed jurisdictions and case types configuration

```yaml
// Source: apps/wa/wa-task-management-api/src/main/resources/application.yaml
config:
  # Add your jurisdiction slug to allowedJurisdictions and your case type to allowedCaseTypes
  allowedJurisdictions: ${ALLOWED_JURISDICTIONS:ia,wa,sscs,civil,publiclaw,privatelaw,employment,st_cic}
  allowedCaseTypes: ${ALLOWED_CASE_TYPES:asylum,wacasetype,sscs,civil,generalapplication,care_supervision_epo,prlapps,et_englandwales,et_englandwales_listings,et_englandwales_multiple,et_scotland,et_scotland_listings,et_scotland_multiple,et_admin,privatelaw_exceptionrecord,benefit,CriminalInjuriesCompensation}
```

### Camunda deployment script

Update `TENANT_ID` to your jurisdiction identifier before running:

```bash
// Source: apps/wa/wa-task-configuration-template/camunda-deployment.sh
#!/bin/bash
## Usage: ./camunda-deployment [SERVICE_TOKEN]
PRODUCT="wa"
TENANT_ID="wa"   # change this to your jurisdiction, e.g. "ia", "civil", "employment"

for file in $BASEDIR/src/main/resources/*.bpmn $BASEDIR/src/main/resources/*.dmn; do
  if [ -f "$file" ]; then
    curl --silent --show-error ${CAMUNDA_URL}/deployment/create \
      -H 'Content-Type: multipart/form-data' \
      -H "ServiceAuthorization: ${SERVICE_TOKEN}" \
      -F "deployment-source=$PRODUCT" \
      -F "tenant-id=$TENANT_ID" \
      -F data=@$file
  fi
done
```

## See also

- [How-to: Write DMN Configuration](write-dmn-configuration.md) — detailed guide for authoring each of the seven DMN table types
- [How-to: Add Tasks for a New Event](add-tasks-for-new-event.md) — incremental recipe once onboarding is complete
- [DMN Task Configuration](../explanation/dmn-task-configuration.md) — explains configuration DMN inputs, date calculation, and reconfiguration behaviour
- [Overview](../explanation/overview.md) — lists currently onboarded jurisdictions and design principles
- [How-to: Debug Stuck Tasks](debug-stuck-tasks.md) — first-line troubleshooting when tasks do not appear after onboarding
