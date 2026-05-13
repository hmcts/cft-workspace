---
title: Add Tasks For New Event
topic: dmn
diataxis: how-to
product: wa
audience: both
sources:
  - wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-types-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-completion-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-cancellation-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-allowed-days-wa-wacasetype.dmn
  - wa-task-configuration-template:camunda-deployment.sh
  - wa-task-configuration-template:src/test/java/uk/gov/hmcts/reform/wataskconfigurationtemplate/DmnDecisionTable.java
status: reviewed
examples_extracted_from:
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-initiation-wa-wacasetype.dmn
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-permissions-wa-wacasetype.dmn
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-types-ia-asylum.dmn
  - apps/wa/wa-task-configuration-template/camunda-deployment.sh
confluence:
  - id: "1753707700"
    title: "WA - Task Attribute Configuration Details"
    last_modified: "unknown"
    space: "WA"
  - id: "1438947851"
    title: "WA Low Level Design"
    last_modified: "unknown"
    space: "WA"
  - id: "1525466902"
    title: "WA Feature Flag DMN rules"
    last_modified: "unknown"
    space: "WA"
  - id: "1824134416"
    title: "WA TM: Setting the Assignee for Task Initiation"
    last_modified: "unknown"
    space: "WA"
  - id: "1753682604"
    title: "Task Date Configuration Guide"
    last_modified: "unknown"
    space: "WA"
  - id: "1616388317"
    title: "Granular Task Permissions Onboarding"
    last_modified: "unknown"
    space: "WA"
  - id: "1484624132"
    title: "Task configuration cribsheet"
    last_modified: "unknown"
    space: "WA"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- To create a WA task from a CCD event, add a row to your jurisdiction's initiation DMN mapping `eventId`/`postEventState` to a `taskId`.
- You also need corresponding rows in the configuration, permissions, and task-types DMNs.
- DMN files follow the naming convention `wa-task-<category>-<jurisdiction>-<casetype>.dmn` and are deployed to a Camunda tenant matching the jurisdiction (e.g. `ia`, `civil`, `sscs`).
- After editing, deploy to Camunda with `camunda-deployment.sh` and verify via the functional test harness.
- The initiation DMN uses hit policy COLLECT, so a single event can create multiple tasks.
- Date attributes (due date, priority date) use a deferred calculation engine in the Task Management API — your configuration DMN outputs key-value pairs specifying *how* to calculate dates, not the dates themselves.

## Prerequisites

- A working clone of your jurisdiction's task-configuration repo (derived from `wa-task-configuration-template`).
- Camunda Modeler installed (for visual DMN editing) or familiarity with DMN XML.
- Access to the target Camunda environment URL and a valid S2S token for deployment.
- The CCD event you want to trigger the task must already be defined in your CCD definition.

## DMN naming and tenancy

All WA DMN tables follow the naming convention:

```
wa-task-<category>-<jurisdiction>-<casetype>
```

For example: `wa-task-initiation-ia-asylum`, `wa-task-configuration-civil-civilclaims`.

The `wa-` prefix identifies the DMN as Work Allocation related. The jurisdiction and case type are appended so that WA services can programmatically select the correct DMN based on the `jurisdiction` and `caseTypeId` from the CCD case event message.

Each jurisdiction deploys its DMNs to its own Camunda tenant (matching the jurisdiction identifier). This uses Camunda's multi-tenancy model with a single shared engine and database. When evaluating DMNs, WA services specify both the DMN key and the tenant ID.

The full set of DMN files in a typical task-configuration repo:

| DMN | Hit policy | Purpose |
|---|---|---|
| `wa-task-types-*` | COLLECT | Registers all task type IDs and names for the jurisdiction |
| `wa-task-initiation-*` | COLLECT | Maps CCD events/states to task creation |
| `wa-task-configuration-*` | RULE ORDER | Provides task attribute name/value pairs |
| `wa-task-permissions-*` | RULE ORDER | Defines role-based access for each task type |
| `wa-task-cancellation-*` | COLLECT | Maps events to cancellation/warning/reconfiguration actions |
| `wa-task-completion-*` | COLLECT | Maps events to automatic task completion |
| `wa-task-allowed-days-*` | FIRST | (Optional) SLA overrides per task type |

## Steps

### 1. Register the task type in the task-types DMN

Open your `wa-task-types-<jurisdiction>-<casetype>.dmn` and add a row to the decision table.

| Output column | Value |
|---|---|
| `taskTypeId` | Your new task ID, e.g. `"reviewNewSubmission"` |
| `taskTypeName` | Human-readable name, e.g. `"Review New Submission"` |

This table uses hit policy COLLECT with no inputs — every row unconditionally contributes to the catalogue. XUI uses this list to populate task-type filter dropdowns.

```xml
<!-- Example row in the task-types DMN -->
<rule id="rule_reviewNewSubmission">
  <outputEntry id="taskTypeId_reviewNewSubmission">
    <text>"reviewNewSubmission"</text>
  </outputEntry>
  <outputEntry id="taskTypeName_reviewNewSubmission">
    <text>"Review New Submission"</text>
  </outputEntry>
</rule>
```

### 2. Add a rule to the initiation DMN

Open `wa-task-initiation-<jurisdiction>-<casetype>.dmn`. Add a row mapping your CCD event to the new task.

| Input/Output | Column | Example value |
|---|---|---|
| Input | `eventId` | `"submitNewApplication"` |
| Input | `postEventState` | `"applicationSubmitted"` |
| Output | `taskId` | `"reviewNewSubmission"` |
| Output | `name` | `"Review New Submission"` |
| Output | `workingDaysAllowed` | `2` |
| Output | `processCategories` | `"caseProgression"` |
| Output | `taskType` | `"reviewNewSubmission"` |

The initiation DMN has the following input columns (`wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn:5-46`):

| Input variable | Label | Usage |
|---|---|---|
| `eventId` | Event Id | CCD event that triggered the message |
| `postEventState` | Post event state | CCD state after the event completed |
| `appealType` | Appeal Type | Derived from `additionalData.Data.appealType` |
| `journeyType` | Journey Type | Derived from `additionalData.Data.journeyType` |
| `lastModifiedApplicationType` | Last modified application type | From `additionalData.Data.lastModifiedApplication.type` |
| `lastModifiedApplicationDecision` | Last modified application decision | From `additionalData.Data.lastModifiedApplication.decision` |

The `additionalData` object is populated from published CCD case data fields configured in your CCD definition's `CaseEventToFields` tab. Service teams can publish any case data they need for DMN rule conditions.
<!-- CONFLUENCE-ONLY: not verified in source -->

Key points:

- `taskId` and `taskType` must carry the same value (`wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn:51,57`).
- Leave `delayDuration` empty (or `0`) for immediate task creation. Use a FEEL expression for delayed creation, e.g. `if (directionDueDate != null) then (date(directionDueDate) - date(now)).days else 0`.
- For more advanced delay scenarios, use the `delayUntil` output column (JSON type) instead of `delayDuration`. This supports date calculation attributes similar to due date calculation (`wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn:54`):
  ```json
  {"delayUntilOrigin":"2026-12-23T18:00",
   "delayUntilIntervalDays":4,
   "delayUntilNonWorkingCalendar":"https://www.gov.uk/bank-holidays/england-and-wales.json",
   "delayUntilNonWorkingDaysOfWeek":"SATURDAY,SUNDAY",
   "delayUntilSkipNonWorkingDays":true,
   "delayUntilMustBeWorkingDay":"No"}
  ```
  Or simply: `{"delayUntil": date and time(date(now()), time("18:00")), "delayUntilTime": time("16:00")}` to delay until a specific time of day.
- To create multiple tasks from one event, add multiple rows with the same `eventId`/`postEventState` — the COLLECT hit policy fires all matching rules (`wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn:509-589`).
- `processCategories` accepts comma-separated values for multiple categories, e.g. `"caseProgression,followUpOverdue"`.
- You can output an `initialAssignee` column to pre-assign the task to a specific IDAM user at initiation time. The value is typically sourced from `additionalData.Data.<fieldName>`. The Task Management API will validate that the assignee has `OWN` or `EXECUTE` permissions before assigning; if validation fails, normal auto-assignment runs instead.

### 3. Add configuration rules

Open `wa-task-configuration-<jurisdiction>-<casetype>.dmn`. Add rows for your new task type. This DMN uses hit policy RULE ORDER — later matching rules override earlier ones.

At minimum, add rows for these attribute names:

| `taskType` input | `name` output | `value` output | `canReconfigure` |
|---|---|---|---|
| `"reviewNewSubmission"` | `workType` | `"decision_making_work"` | `false` |
| `"reviewNewSubmission"` | `roleCategory` | `"LEGAL_OPERATIONS"` | `false` |

Common additional attributes to configure:

- `caseName` — constructed from case data fields (e.g. `caseData.appellantGivenNames + " " + caseData.appellantFamilyName`)
- `region`, `location`, `locationName` — from `caseData.caseManagementLocation`
- `description` — HTML with CCD deep-link using `${[CASE_REFERENCE]}` placeholder
- `majorPriority` — e.g. `if(caseData.urgent = "Yes") then "1000" else "5000"` (default 5000)
- `minorPriority` — secondary sort within same major priority (default 500)
- `title` — display title (defaults to `task_name` if not provided)
- `caseManagementCategory` — case categorisation
- `assignee` — IDAM user ID to assign the task to (validated against role assignments before use)
- `additionalProperties_<NAME>` — arbitrary additional attributes stored as JSON on the task record

**Mandatory configuration attributes** (agreed with business; absence prevents task initiation or reconfiguration):
`dueDate`, `title`, `priorityDate`, `majorPriority`, `minorPriority`, `roleCategory`, `workType`, `region`, `location`, `caseManagementCategory`, `caseName`. Most have built-in defaults (e.g. `dueDate` defaults to current date plus 2 days at 16:00, `majorPriority` to 5000).
<!-- CONFLUENCE-ONLY: not verified in source -->

**Date calculation attributes** — the configuration DMN outputs key-value pairs that the Task Management API's date calculation engine uses to compute `dueDate`, `priorityDate`, and `nextHearingDate`. These are **not** final date values — they are instructions. Key attributes (using `dueDate` prefix; same pattern applies to `priorityDate` and `nextHearingDate`):

| Attribute name | Purpose | Example value |
|---|---|---|
| `dueDateOrigin` | Starting date/time for the calculation | `now()` (evaluated during DMN) or a case data field reference |
| `dueDateIntervalDays` | Number of days to add to origin | `5` |
| `dueDateNonWorkingCalendar` | URL to bank holiday calendar | `"https://www.gov.uk/bank-holidays/england-and-wales.json"` |
| `dueDateNonWorkingDaysOfWeek` | Days to skip | `"SATURDAY,SUNDAY"` |
| `dueDateSkipNonWorkingDays` | Whether to skip non-working days in the interval | `true` |
| `dueDateMustBeWorkingDay` | Adjust final date to a working day | `"Next"`, `"Previous"`, `"Yes"`, or `"No"` |

If the same key appears in multiple rules, the behaviour depends on the key: scalar values (like `dueDateSkipNonWorkingDays`) use the last occurrence; list values (like `dueDateNonWorkingCalendar`) are merged into a combined list (`wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:649-1346`).

**Reconfiguration behaviour**: during reconfiguration, the input attributes come from the existing task record (not from Camunda). Camunda process variables are **not** available at reconfiguration time. Additionally, `additionalProperties` attributes are accessed differently: `taskAttributes.<NAME>` at initiation vs `taskAttributes.additionalProperties.<NAME>` at reconfiguration.
<!-- CONFLUENCE-ONLY: not verified in source -->

Set `canReconfigure` to `true` for attributes that should be recalculated when a reconfiguration event fires (e.g. location, priority). Attributes with `canReconfigure=false` are set only at initial task creation (`wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:8-21`).

### 4. Add permission rules

Open `wa-task-permissions-<jurisdiction>-<casetype>.dmn`. Add rows for each role that should have access to the new task. Hit policy is RULE ORDER.

The permissions DMN has two inputs and seven output columns (`wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn:4-23`):

| Column | Type | Purpose |
|---|---|---|
| `taskType` (input) | string | Matches the task type from the initiation DMN |
| `case` (input) | string | Case data — can be used for conditional permission rules |
| `caseAccessCategory` (output) | string | Restricts rule to specific case access category (e.g. `"categoryA"`) |
| `name` (output) | string | Role name (e.g. `"tribunal-caseworker"`) |
| `value` (output) | string | Comma-separated permission flags |
| `roleCategory` (output) | string | Role category (`"LEGAL_OPERATIONS"`, `"JUDICIAL"`, `"ADMIN"`, `"CTSC"`) |
| `authorisations` (output) | string | Additional authorisation requirement (e.g. specific ticket type) |
| `assignmentPriority` (output) | integer | Lower value = higher priority for auto-assignment |
| `autoAssignable` (output) | boolean | Whether auto-assignment should apply for this role |

Example rows:

| `taskType` input | `caseAccessCategory` | `name` output | `value` output | `roleCategory` | `authorisations` | `assignmentPriority` | `autoAssignable` |
|---|---|---|---|---|---|---|---|
| `"reviewNewSubmission"` | | `"tribunal-caseworker"` | `"Read,Own,Claim,Unclaim,UnclaimAssign,CompleteOwn,CancelOwn"` | `"LEGAL_OPERATIONS"` | | `2` | `false` |
| `"reviewNewSubmission"` | | `"senior-tribunal-caseworker"` | `"Read,Own,Claim,Unclaim,Assign,Unassign,Complete,Cancel"` | `"LEGAL_OPERATIONS"` | | `1` | `false` |

The `task-supervisor` catch-all rule (first rule in the table) applies to all task types automatically — you do not need to duplicate it (`wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn:24-53`).

**Important formatting rules:**

- `Own` and `Claim` permissions **must** appear in the same row; otherwise the task will not appear in the "Available tasks" screen in XUI.
- Do **not** include spaces after commas in the permission value string (e.g. `"Read,Own,Claim"` not `"Read, Own, Claim"`). Spaces will break the permission model.
<!-- CONFLUENCE-ONLY: not verified in source -->

Available permission flags: `Read`, `Own`, `Manage`, `Cancel`, `Assign`, `Unassign`, `Complete`, `CompleteOwn`, `CancelOwn`, `Claim`, `Unclaim`, `Execute`, `UnassignClaim`, `UnassignAssign`, `UnclaimAssign`.

### 5. (Optional) Add cancellation and completion rules

If a subsequent CCD event should cancel or auto-complete the task:

**Cancellation** — in `wa-task-cancellation-<jurisdiction>-<casetype>.dmn` (hit policy: COLLECT):

The cancellation DMN has four input columns (`wa-task-configuration-template:src/main/resources/wa-task-cancellation-wa-wacasetype.dmn:4-27`):

| Input | Variable | Description |
|---|---|---|
| From State | `fromState` | CCD state before the event |
| Event | `event` | The CCD event ID |
| State | `state` | CCD state after the event |
| AppealType / case data | derived from `additionalData` | Optional case-data-based condition |

Output columns: `action`, `warningCode`, `warningText`, `processCategories`.

Example rule:

| `fromState` | `event` | `state` | `action` | `warningCode` | `warningText` | `processCategories` |
|---|---|---|---|---|---|---|
| | `"withdrawApplication"` | | `"Cancel"` | | | `"caseProgression"` |

Actions: `"Cancel"` (terminate matching tasks), `"Warn"` (flag with `warningCode`/`warningText` but keep task active), `"Reconfigure"` (re-evaluate configuration DMN for matching tasks).

**Completion** — in `wa-task-completion-<jurisdiction>-<casetype>.dmn`:

| `eventId` input | `taskType` output | `completionMode` output |
|---|---|---|
| `"approveSubmission"` | `"reviewNewSubmission"` | `"Auto"` |

### 6. (Optional) Register allowed days

If your jurisdiction uses a `wa-task-allowed-days-<jurisdiction>-<casetype>.dmn` (hit policy: FIRST), add a row mapping the originating `taskId` to your new task's working-days-allowed value. This DMN provides overridable SLA defaults per task type, separate from the initiation DMN (`wa-task-configuration-template:src/main/resources/wa-task-allowed-days-wa-wacasetype.dmn:3-11`).

| `taskId` input | `taskId` output | `name` output | `workingDaysAllowed` output |
|---|---|---|---|
| `"provideRespondentEvidence"` | `"followUpOverdueRespondentEvidence"` | `"Follow Up Overdue Respondent Evidence"` | `2` |

Not all jurisdictions use this DMN. Check whether your jurisdiction's template includes one before adding rules.

### 7. (Optional) Use feature flags for DMN rules

To merge a rule into master without it taking effect immediately, add a date-based guard. The WA platform supports an output column pattern where rules can include a `liveFrom` ISO-8601 date string. The Task Management API filters out rules whose `liveFrom` date is in the future.
<!-- CONFLUENCE-ONLY: not verified in source -->

### 8. Update the test harness

Add a row-count guard test and scenario tests for the new rule.

In the initiation test class, update the expected rule count:

```java
@Test
void verifyRuleCount() {
    // Increment this count by 1 (or by N if you added N rules)
    assertThat(logic.getRules().size(), is(27));
}
```

Add a parameterised scenario that exercises the new rule:

```java
static Stream<Arguments> scenarioProvider() {
    return Stream.of(
        Arguments.of(
            Map.of("eventId", "submitNewApplication",
                   "postEventState", "applicationSubmitted"),
            List.of(Map.of(
                "taskId", "reviewNewSubmission",
                "name", "Review New Submission",
                "workingDaysAllowed", 2,
                "processCategories", "caseProgression",
                "taskType", "reviewNewSubmission"
            ))
        )
    );
}
```

The test base class `DmnDecisionTableBaseUnitTest` loads the DMN in-process with the Camunda DMN engine and H2 — no external Camunda required (`wa-task-configuration-template:src/test/java/uk/gov/hmcts/reform/wataskconfigurationtemplate/DmnDecisionTable.java:7-28`).

### 9. Build and run tests locally

```bash
./gradlew build
```

This compiles and runs all unit/integration tests. Fix any row-count assertion failures or scenario mismatches before proceeding.

### 10. Deploy DMN files to Camunda

Set the required environment variable and run the deployment script:

```bash
export CAMUNDA_URL="https://camunda-<env>.platform.hmcts.net/engine-rest"

./camunda-deployment.sh "$SERVICE_TOKEN"
```

The script hardcodes `PRODUCT="wa"` and `TENANT_ID` (set to your jurisdiction, e.g. `"wa"` in the template, `"ia"` in the IA-derived repo). It iterates all `*.dmn` and `*.bpmn` files under `src/main/resources/` and POSTs each to `${CAMUNDA_URL}/deployment/create` with a `ServiceAuthorization` header and `tenant-id=${TENANT_ID}` (`wa-task-configuration-template:camunda-deployment.sh:11-21`).

In your derived repo, update line 12 of `camunda-deployment.sh` to set `TENANT_ID` to your jurisdiction identifier (e.g. `TENANT_ID="ia"`, `TENANT_ID="civil"`). This maps to the Camunda multi-tenancy model where each jurisdiction's DMNs are isolated in their own tenant.
<!-- DIVERGENCE: Confluence LLD says TENANT_ID is the service identifier/jurisdiction (e.g. "ia"), but wa-task-configuration-template:camunda-deployment.sh:12 hardcodes TENANT_ID="wa". Service teams must override this in their own derived repo. -->

## Verify

1. **Trigger the CCD event** on a test case in the target environment (or inject a message via `CaseEventHandlerTestingController` in a functional test).

2. **Check that the task was created** by querying the task management API:

   ```bash
   curl -H "Authorization: Bearer $USER_TOKEN" \
        -H "ServiceAuthorization: $SERVICE_TOKEN" \
        "https://wa-task-management-api-<env>.service.core-compute-<env>.internal/task?case_id=<case_id>"
   ```

3. **Confirm task attributes** — the response should include your `taskType`, `name`, `workType`, `roleCategory`, and `location` values matching what you configured in the DMNs.

4. **Run the functional test suite** to validate end-to-end:

   ```bash
   ./gradlew functional
   ```

## Examples

### Initiation DMN — complete rule

A full rule element showing how `submitCase` (event) + `caseUnderReview` (post-event state) creates `reviewAppealSkeletonArgument`. Note `taskId` and `taskType` carry identical values.

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-initiation-wa-wacasetype.dmn
<!-- Hit policy COLLECT: multiple rules can fire from the same event -->
<decisionTable hitPolicy="COLLECT">
  <!-- Input columns with FEEL null-safe extraction from additionalData -->
  <input label="Event Id"         camunda:inputVariable="eventId">     <inputExpression typeRef="string"><text></text></inputExpression></input>
  <input label="Post event state" camunda:inputVariable="postEventState"><inputExpression typeRef="string"><text></text></inputExpression></input>
  <input label="Appeal Type"      camunda:inputVariable="appealType">
    <inputExpression typeRef="string">
      <text>if(additionalData != null and additionalData.Data != null
            and additionalData.Data.appealType != null) then
            additionalData.Data.appealType else null</text>
    </inputExpression>
  </input>
  <!-- ... journeyType, lastModifiedApplicationType, lastModifiedApplicationDecision inputs ... -->

  <!-- Output columns -->
  <output name="taskId"             typeRef="string" />
  <output name="name"               typeRef="string" />
  <output name="delayDuration"      typeRef="integer" />
  <output name="delayUntil"         typeRef="json" />
  <output name="workingDaysAllowed" typeRef="integer" />
  <output name="processCategories"  typeRef="string" />
  <output name="taskType"           typeRef="string" />  <!-- must equal taskId -->

  <!-- Rule: event="submitCase", postEventState="caseUnderReview" → create reviewAppealSkeletonArgument -->
  <rule id="DecisionRule_0vq8eyq">
    <inputEntry><text>"submitCase"</text></inputEntry>
    <inputEntry><text>"caseUnderReview"</text></inputEntry>
    <inputEntry><text></text></inputEntry>  <!-- any appealType -->
    <inputEntry><text></text></inputEntry>
    <inputEntry><text></text></inputEntry>
    <inputEntry><text></text></inputEntry>
    <outputEntry><text>"reviewAppealSkeletonArgument"</text></outputEntry>
    <outputEntry><text>"Review Appeal Skeleton Argument"</text></outputEntry>
    <outputEntry><text></text></outputEntry>  <!-- no delay -->
    <outputEntry><text></text></outputEntry>  <!-- no delayUntil -->
    <outputEntry><text>2</text></outputEntry>
    <outputEntry><text>"caseProgression"</text></outputEntry>
    <outputEntry><text>"reviewAppealSkeletonArgument"</text></outputEntry>  <!-- taskType = taskId -->
  </rule>
</decisionTable>
```

### Permissions DMN — per-task-type role rows

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-permissions-wa-wacasetype.dmn
<!-- The task-supervisor catch-all always applies (blank taskType input) -->
<rule id="DecisionRule_1d430vn">
  <description>supervisor task permissions</description>
  <inputEntry><text></text></inputEntry>
  <inputEntry><text></text></inputEntry>
  <outputEntry><text>"categoryA"</text></outputEntry>
  <outputEntry><text>"task-supervisor"</text></outputEntry>
  <outputEntry><text>"Read,Manage,Cancel,Assign,Unassign,Complete"</text></outputEntry>
  <outputEntry><text></text></outputEntry>
  <outputEntry><text></text></outputEntry>
  <outputEntry><text></text></outputEntry>
  <outputEntry><text>false</text></outputEntry>
</rule>
```

### Blank task-types DMN skeleton

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-types-ia-asylum.dmn
<decision id="wa-task-types-ia-asylum" name="Task Types DMN" camunda:historyTimeToLive="P90D">
  <decisionTable hitPolicy="COLLECT">
    <input id="Input_1">
      <inputExpression typeRef="string"><text></text></inputExpression>
    </input>
    <output name="taskTypeId"   typeRef="string" />
    <output name="taskTypeName" typeRef="string" />
    <!-- Add one <rule> per task type — no input conditions needed -->
  </decisionTable>
</decision>
```

## See also

- [How-to: Write DMN Configuration](write-dmn-configuration.md) — complete guide for authoring all seven DMN table types from scratch
- [DMN Schema](../reference/dmn-schema.md) — field-by-field reference for initiation, configuration, and permissions DMN outputs
- [DMN Task Configuration](../explanation/dmn-task-configuration.md) — explanation of how the COLLECT hit policy, date calculation engine, and processCategories mechanism work
- [How-to: Onboard a Jurisdiction](onboard-jurisdiction.md) — the broader onboarding process including ASB whitelisting and CCD role grants
