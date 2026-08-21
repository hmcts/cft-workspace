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
  - wa-task-management-api:charts/wa-task-management-api/values.yaml
  - wa-task-monitor:charts/wa-task-monitor/values.yaml
  - wa-task-monitor:src/main/resources/application.yaml
  - wa-shared-infrastructure:servicebus.tf
  - wa-shared-infrastructure:prod.tfvars
  - wa-shared-infrastructure:aat.tfvars
  - wa-ccd-definitions:definitions/appeal/json/AuthorisationCaseField.json
  - wa-ccd-definitions:definitions/appeal/json/ComplexTypes.json
  - wa-ccd-definitions:definitions/appeal/json/CaseField.json
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/CaseEventMessageService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/additionaldata/AdditionalDataContext.java
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
sources_sha:
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/config/AllowedJurisdictionConfiguration.java": "d25e17e8fb5aea374a6796169b23012aa94688a9"
  "wa-task-management-api:src/main/resources/application.yaml": "308d2b86243c7d52027d413be51089facd576c82"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/domain/DecisionTable.java": "71b4bd80834d28bad71bb62431fb4cca339ed4bb"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java": "272fb0b4257fe638eeea7af521ae84738cec491a"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/enums/CFTTaskState.java": "016267cf74a1cefbc05d5e54fc56b4843d6164f2"
  "wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/domain/camunda/DmnAndMessageNames.java": "677e0581c9fad1f6109115c5eb3d8ed9e1232091"
  "wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn": "0f8832e3017f8a0676e7ef179e8802c797241707"
  "wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn": "510747dd6d79a189f498d51c500718bb30adf51c"
  "wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn": "d93044190a89ac64e5b112dacb6df5c6af2273bd"
  "wa-task-configuration-template:src/main/resources/wa-task-cancellation-wa-wacasetype.dmn": "c3eae8d2e8f687e8a601a41496fca78df453e9e2"
  "wa-task-configuration-template:src/main/resources/wa-task-completion-wa-wacasetype.dmn": "f256d9afd3ae0ee4420642d1a7648e271423f4a4"
  "wa-task-configuration-template:src/main/resources/wa-task-types-wa-wacasetype.dmn": "ad5c4d1f3f999a71df3e145d1b784637e15fe261"
  "wa-task-configuration-template:camunda-deployment.sh": "0a58de5ec9a536dc6f319f113a1ff203f6cb77dd"
  "wa-task-management-api:charts/wa-task-management-api/values.yaml": "2c1a4b4efa36ddddd2110db152330ec1aac3aa03"
  "wa-task-monitor:charts/wa-task-monitor/values.yaml": "4560efac20eea439607f9a6e04abfe0b436a773e"
  "wa-task-monitor:src/main/resources/application.yaml": "05035529b105f5cc2dcbe35bf709b80c7cbd5a76"
  "wa-shared-infrastructure:servicebus.tf": "06c600b52119409478459b7cab9cf4712eaa15a3"
  "wa-shared-infrastructure:prod.tfvars": "5906f2c6a49dc8acdd293da96b3c811a758d6dd0"
  "wa-shared-infrastructure:aat.tfvars": "98e59f0635166193c0b4f278b5e2e9f6dea281fc"
  "wa-ccd-definitions:definitions/appeal/json/AuthorisationCaseField.json": "6a655780a053100a33704ba29e03eb615e8f5e84"
  "wa-ccd-definitions:definitions/appeal/json/ComplexTypes.json": "6a655780a053100a33704ba29e03eb615e8f5e84"
  "wa-ccd-definitions:definitions/appeal/json/CaseField.json": "0f8b0b8f90b4ffb8ae6645f6c7107688d955a75a"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/CaseEventMessageService.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/additionaldata/AdditionalDataContext.java": "9c7139a70732f6dca95acb412c36706fa9e79be8"
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
- CCD events that trigger tasks must carry `Publish: Y` on the CaseEvent tab, which is what makes CCD send them to the Azure Service Bus `ccd-case-events` topic. Per-field `Publish`/`PublishAs` on CaseEventToFields controls the `additionalData` payload of that message, not whether it is sent.
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

**Azure Service Bus whitelisting**: `wa-case-event-handler` reads the `ccd-case-events-<env>` topic through the `wa-ccd-case-events-sub-<env>` subscription in the `ccd-servicebus-<env>` namespace (resource group `ccd-shared-<env>`), created with `requires_session = true` and `lock_duration = "PT30S"`. Delivery is filtered by an `azurerm_servicebus_subscription_rule` named `wa-case-events-sub-rule-<env>` whose `SqlFilter` is `jurisdiction_id IN (${var.allowed_jurisdictions})` (`wa-shared-infrastructure:servicebus.tf:1-45`). Adding a jurisdiction means adding it to `allowed_jurisdictions` in that environment's tfvars — there is no runtime configuration for it.

The comparison is a literal SQL `IN`, so every environment lists both casings of each jurisdiction id (`'ia', 'IA'`, `'st_cic','ST_CIC'`, …). Production carries `ia`, `civil`, `privatelaw`, `publiclaw`, `employment` and `ST_CIC` only (`wa-shared-infrastructure:prod.tfvars:1`), while AAT additionally carries `wa`, `sscs`, `DIVORCE` and `pcs` (`wa-shared-infrastructure:aat.tfvars:1`). A jurisdiction can therefore be present in `config.allowedJurisdictions` on `wa-task-management-api` and still receive no case events in production — `sscs` and `wa` are in that state.

In `aat` the rule count flips: `case_events_sub_rule_instances_count` evaluates to `0` and the `message_context` resource creates `wa-message-context-sub-rule-aat` with the identical filter instead (`wa-shared-infrastructure:servicebus.tf:8-10,36-42`). Both resources read the same `allowed_jurisdictions` variable, so the tfvars edit is the same either way.

## Step 1b: Update CCD definition for WA access

Before tasks can be configured, the WA system user must be able to read the case data fields referenced in your configuration DMN.

1. Add `caseworker-wa-task-configuration` to your `AuthorisationCaseField` definitions with at minimum `R` (Read) permission on every field your configuration DMN references (e.g. location fields, case name, appeal type, hearing dates). The reference definitions grant that role `CRUD` on every field of `WaCaseType` (`wa-ccd-definitions:definitions/appeal/json/AuthorisationCaseField.json`).
2. Publishing is controlled by two separate flags, and both matter:
   - `Publish` on the **CaseEvent** tab. `ccd-data-store-api` only builds a Service Bus message for the event when this is true (`ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/CaseEventMessageService.java:41`). With `Publish: N` no message is sent, whatever the field configuration says.
   - `Publish` (and optionally `PublishAs`, an alias for the published key) per row on the **CaseEventToFields** tab. `AdditionalDataContext.findPublishableFields` walks the event's fields and includes only those with `publish == true`; a field whose display context is `COMPLEX` is recursed into so nested subfields can be published individually (`ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/additionaldata/AdditionalDataContext.java:55-88`). A field absent from that set does not appear in `additionalData` and cannot be read by a DMN.
3. Add the following standard case data fields if not already present:
   - **`caseManagementLocation`** — a complex field whose `region` and `baseLocation` (court EPIMMS ID) subfields the configuration DMN reads to set the task's region and location. Both reads are null-guarded and fall back to hard-coded values — region `"1"`, base location `"765324"`, staff location `"Taylor House"` (`wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:71,88,105`) — so a case type missing the field silently routes every task to the template's default court rather than failing.
   - **`caseManagementCategory`** — read as `caseManagementCategory.value.code` and mapped to the display category shown in task lists (`wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:119-126`).
   - **`caseAccessCategory`** (optional) — used when access rules vary between subtypes within the same CCD case type.
   - **`nextHearingDate`** (optional) — feeds the task's `nextHearingDate` and can act as the origin for due-date and priority-date calculation (`wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:465,530-533,1244-1247`).

   `WaCaseType` defines `caseManagementLocation` as a complex type with a single `baseLocation` element, plus `caseAccessCategory` and `nextHearingDate` as flat fields (`wa-ccd-definitions:definitions/appeal/json/ComplexTypes.json`, `wa-ccd-definitions:definitions/appeal/json/CaseField.json:43-50,93-100`).

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
4. **WA system user** — the `wa-system-username` Key Vault secret is mounted as `WA_SYSTEM_USERNAME` by both `wa-task-management-api` (`wa-task-management-api:charts/wa-task-management-api/values.yaml:17-18`, `wa-task-management-api:src/main/resources/application.yaml:75`) and `wa-task-monitor` (`wa-task-monitor:charts/wa-task-monitor/values.yaml:52-53`, `wa-task-monitor:src/main/resources/application.yaml:65`). That account must be able to read your case data from CCD; if it cannot, configuration and reconfiguration fail for every task on your case type.

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
