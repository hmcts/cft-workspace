---
title: Write Dmn Configuration
topic: dmn
diataxis: how-to
product: wa
audience: both
sources:
  - wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-cancellation-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-completion-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-types-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-allowed-days-wa-wacasetype.dmn
  - wa-task-configuration-template:camunda-deployment.sh
  - wa-task-configuration-template:src/test/java/uk/gov/hmcts/reform/wataskconfigurationtemplate/DmnDecisionTable.java
  - wa-task-configuration-template:build.gradle
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateType.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/domain/calendar/DateTypeIntervalData.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskAutoAssignmentService.java
status: reviewed
examples_extracted_from:
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-initiation-wa-wacasetype.dmn
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-configuration-wa-wacasetype.dmn
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-permissions-wa-wacasetype.dmn
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-types-ia-asylum.dmn
  - apps/wa/wa-task-configuration-template/camunda-deployment.sh
confluence:
  - id: "1478710505"
    title: "Task Initiation DMN"
    last_modified: "unknown"
    space: "WA"
  - id: "1753707700"
    title: "WA - Task Attribute Configuration Details"
    last_modified: "unknown"
    space: "WA"
  - id: "1525466902"
    title: "WA Feature Flag DMN rules"
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
  - id: "1473545126"
    title: "Task Cancellation & Task Warnings (R2)"
    last_modified: "unknown"
    space: "WA"
  - id: "1824134416"
    title: "WA TM: Setting the Assignee for Task Initiation"
    last_modified: "unknown"
    space: "WA"
confluence_checked_at: "2026-05-13T12:00:00Z"
---

## TL;DR

- A WA task-configuration DMN is a Camunda decision table that maps CCD events to tasks and their attributes.
- Seven DMN files per case type: initiation, configuration, permissions, cancellation, completion, allowed-days, and task-types.
- File naming convention: `wa-task-<category>-<jurisdiction>-<casetype>.dmn`; the `decision id` inside must match the filename stem.
- The configuration DMN emits key/value pairs for date calculation (dueDate, priorityDate, nextHearingDate) -- the Task Management Service computes final dates post-DMN evaluation.
- In the permissions DMN, `Own` and `Claim` must appear on the same rule row, and permission values must have no spaces after commas.
- Start from `wa-task-configuration-template` -- copy and rename the example DMN files for your jurisdiction/case type.

## Prerequisites

- Camunda Modeler 5.x installed (for visual editing of `.dmn` files).
- Java 21 and Gradle available locally.
- A clone of `wa-task-configuration-template`.
- Knowledge of your CCD case type's event IDs, post-event states, and case-data field paths.

## 1. Copy and rename the template DMN files

1. Clone `wa-task-configuration-template`.
2. Under `src/main/resources/`, copy each `wa-task-*-wa-wacasetype.dmn` file and rename it to `wa-task-<category>-<your-jurisdiction>-<your-casetype>.dmn`.
3. Open each renamed file in Camunda Modeler and update the `id` attribute on the `<decision>` element to match the new filename stem.

```
# Example: for IA Asylum
wa-task-initiation-ia-asylum.dmn        -> decision id="wa-task-initiation-ia-asylum"
wa-task-configuration-ia-asylum.dmn     -> decision id="wa-task-configuration-ia-asylum"
wa-task-permissions-ia-asylum.dmn       -> decision id="wa-task-permissions-ia-asylum"
wa-task-cancellation-ia-asylum.dmn      -> decision id="wa-task-cancellation-ia-asylum"
wa-task-completion-ia-asylum.dmn        -> decision id="wa-task-completion-ia-asylum"
wa-task-allowed-days-ia-asylum.dmn      -> decision id="wa-task-allowed-days-ia-asylum"
wa-task-types-ia-asylum.dmn             -> decision id="wa-task-types-ia-asylum"
```

## 2. Write the initiation DMN

The initiation DMN determines which tasks are created when a CCD event fires.

**Hit policy**: `COLLECT` (multiple rules can fire, creating multiple tasks from one event).

**Input columns**:

| Column | Type | Description |
|--------|------|-------------|
| `eventId` | string | CCD event ID |
| `postEventState` | string | CCD case state after the event |
| Additional data fields | FEEL expression | e.g. `additionalData.Data.appealType` |

**Output columns**:

| Column | Type | Description |
|--------|------|-------------|
| `taskId` | string | Task identifier (must equal `taskType`) |
| `name` | string | Human-readable task name |
| `delayDuration` | integer | Simple day-offset delay before task becomes available |
| `delayUntil` | json | Structured delay object (for working-day-aware delays) |
| `workingDaysAllowed` | integer | SLA days; typically `2` |
| `processCategories` | string | Comma-separated categories, e.g. `"caseProgression"` |
| `taskType` | string | Must match `taskId` |

**Add a rule row** for each CCD event that should create a task:

```xml
<!-- Example: submitCase in state caseUnderReview creates reviewAppealSkeletonArgument -->
<rule>
  <inputEntry><text>"submitCase"</text></inputEntry>
  <inputEntry><text>"caseUnderReview"</text></inputEntry>
  <outputEntry><text>"reviewAppealSkeletonArgument"</text></outputEntry>
  <outputEntry><text>"Review Appeal Skeleton Argument"</text></outputEntry>
  <outputEntry><text></text></outputEntry>  <!-- no delay -->
  <outputEntry><text></text></outputEntry>  <!-- no delayUntil -->
  <outputEntry><text>2</text></outputEntry>
  <outputEntry><text>"caseProgression"</text></outputEntry>
  <outputEntry><text>"reviewAppealSkeletonArgument"</text></outputEntry>
</rule>
```

For working-day-aware delays, use the `delayUntil` JSON structure (`wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn:797-843`):

```json
{
  "delayUntilOrigin": "2026-12-23T18:00",
  "delayUntilIntervalDays": 4,
  "delayUntilNonWorkingCalendar": "https://www.gov.uk/bank-holidays/england-and-wales.json",
  "delayUntilNonWorkingDaysOfWeek": "SATURDAY,SUNDAY",
  "delayUntilSkipNonWorkingDays": true,
  "delayUntilMustBeWorkingDay": "No"
}
```

To create multiple tasks from one event, add multiple rows with the same `eventId`/`postEventState` -- COLLECT hit policy will fire them all.

### Setting an initial assignee

The initiation DMN can optionally output an `initialAssignee` column to pre-assign the task to a specific user (by IDAM ID). The value is typically sourced from case additional data (e.g. `additionalData.Data.assigneeFromCaseData`). Task Management validates the user has `Own` or `Execute` permissions before confirming; if validation fails, auto-assignment runs instead.

## 3. Write the configuration DMN

The configuration DMN sets task attributes (location, work type, priority, due date, description, etc.).

**Hit policy**: `RULE ORDER` (all matching rules apply in order; later rules override earlier ones for the same attribute).

**Input columns**:

| Column | Type | Description |
|--------|------|-------------|
| `caseData` | string | Full CCD case data map |
| `taskType` | FEEL expression | Resolved from `taskAttributes.taskType` |

**Output columns**:

| Column | Type | Description |
|--------|------|-------------|
| `name` | string | Attribute name key |
| `value` | string | Attribute value (FEEL expression or literal) |
| `canReconfigure` | boolean | `true` = re-evaluated on reconfiguration; `false` = set only once |

### Initiation vs reconfiguration inputs

During **initiation**, all Camunda process/task variables are passed as inputs. During **reconfiguration**, inputs come from the existing task DB record -- only persisted fields are available, and `canReconfigure=false` rows are skipped. Additional properties are accessed differently: `taskAttributes.<KEY>` at initiation vs `taskAttributes.additionalProperties.<KEY>` at reconfiguration.

### Mandatory output attributes

These attributes must be provided (or have defaults) otherwise task initiation/reconfiguration will fail:

- **With defaults**: `dueDate` (now+2d), `dueDateTime` (16:00), `title` (task name), `priorityDate` (dueDate), `majorPriority` (5000), `minorPriority` (500)
- **Must be provided**: `region`, `location`, `caseManagementCategory`, `caseName`, `roleCategory`, `workType`

### Common attribute names to configure

| Attribute name | Typical value source | `canReconfigure` |
|----------------|---------------------|------------------|
| `caseName` | `caseData.appellantGivenNames + " " + caseData.appellantFamilyName` | true |
| `region` | `caseData.caseManagementLocation.region` | true |
| `location` | `caseData.caseManagementLocation.baseLocation` | true |
| `locationName` | `caseData.staffLocation` | true |
| `caseManagementCategory` | `caseData.caseManagementCategory.value.code` | true |
| `workType` | Per task type: `"hearing_work"`, `"decision_making_work"`, `"access_requests"` | false |
| `roleCategory` | `"LEGAL_OPERATIONS"`, `"ADMIN"`, `"JUDICIAL"`, `"CTSC"` | false |
| `description` | HTML string with `${[CASE_REFERENCE]}` placeholder | false |
| `majorPriority` | `1000` (urgent) or `5000` (normal) | true |
| `minorPriority` | `500` | false |

### Additional properties

Use the `additionalProperties_<KEY>` output name pattern to store arbitrary key/value pairs against the task (persisted as JSON in `additional_properties`). Access differs by context: `taskAttributes.<KEY>` at initiation vs `taskAttributes.additionalProperties.<KEY>` at reconfiguration. Guard both paths in your FEEL expression for rules that run in both contexts.

### Setting the assignee via configuration DMN

The configuration DMN can output an `assignee` attribute (name: `"assignee"`, value: FEEL expression referencing `taskAttributes.assignee`). Task Management validates the proposed assignee has `Own` or `Execute` permissions; if invalid, auto-assignment runs. Set `canReconfigure: false` unless you intentionally want reconfiguration to reassign -- a null/empty value with `canReconfigure: true` removes the existing assignee.

### Date calculation

The configuration DMN does **not** output final calculated dates directly. Instead, it emits key/value pairs that instruct the Task Management date calculation engine. Three dates are supported:

| Date | Mandatory | Prefix | UI display | Purpose |
|------|-----------|--------|------------|---------|
| Due Date | Yes | `dueDate` | No | SLA reporting -- tasks completed after due date are "late" |
| Priority Date | Yes | `priorityDate` | No | Orders tasks in the UI by urgency |
| Next Hearing Date | No | `nextHearingDate` | Yes | Shows proximity to next hearing |

For each date, emit these key/value pairs (using dueDate as example):

| Key | Type | Description |
|-----|------|-------------|
| `dueDateOrigin` | date-time string | Starting point for calculation (must be a literal, not an expression) |
| `dueDateIntervalDays` | integer | Offset in days (can be negative) |
| `dueDateNonWorkingCalendar` | URL string | Calendar of non-working days, e.g. `"https://www.gov.uk/bank-holidays/england-and-wales.json"` |
| `dueDateNonWorkingDaysOfWeek` | string | e.g. `"SATURDAY,SUNDAY"` |
| `dueDateSkipNonWorkingDays` | boolean | If `true`, interval counts only working days |
| `dueDateMustBeWorkingDay` | string | `"Next"`, `"Previous"`, or `"No"` |
| `dueDateTime` | time string | Time component, e.g. `"16:00"` |

Replace the prefix with `priorityDate` or `nextHearingDate` for the other dates.

**Important**: values must be literals at DMN output time. For example, `now()` is a valid FEEL expression that produces a literal date-time result. But outputting the string `"now()"` will fail because the date calculation engine does not evaluate expressions.

**Advanced patterns** (confirmed in `wa-task-configuration-template` and `wa-task-management-api` calendar package):

- **OriginRef**: `<prefix>OriginRef` references another calculated date as origin with comma-separated fallbacks: `"nextHearingDate,priorityDate"` (first available wins).
- **OriginEarliest / OriginLatest**: picks the earliest or latest from a set of dates: `"hearingPreDate,dueDate"`.
- **Intermediate dates**: define custom date prefixes (e.g. `hearingPreDate`) with the same key pattern, then reference them from other calculations via OriginRef/OriginEarliest/OriginLatest.

**Layering convention**: Use a blank `taskType` input on base rows to set defaults, then add task-type-specific rows that override. RULE ORDER means the later, more specific row wins.

**Duplicate key merging**: If a key appears more than once in the DMN output, scalar values use the last occurrence; list values (like `NonWorkingCalendar`) are merged into a combined list in output order.

(`wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:648-740`)

## 4. Write the permissions DMN

The permissions DMN defines which roles can perform which actions on each task type.

**Hit policy**: `RULE ORDER`

**Input columns**:

| Column | Type | Description |
|--------|------|-------------|
| `taskType` | FEEL expression | Falls back to `"r1"` when `taskAttributes` is null |
| `case` | (reserved) | Unused; leave blank |

**Output columns**:

| Column | Type | Description |
|--------|------|-------------|
| `caseAccessCategory` | string | e.g. `"categoryA"`, `"categoryA,categoryB"` |
| `name` | string | Role name: `"task-supervisor"`, `"tribunal-caseworker"`, `"judge"` |
| `value` | string | Comma-separated permission flags |
| `roleCategory` | string | `"LEGAL_OPERATIONS"`, `"JUDICIAL"`, `"ADMIN"`, `"CTSC"` |
| `authorisations` | string | Optional authorisation codes |
| `assignmentPriority` | integer | Lower = higher priority for auto-assignment |
| `autoAssignable` | boolean | Whether the role is auto-assignable |

**Permission flags**: `Read`, `Own`, `Manage`, `Cancel`, `Assign`, `Unassign`, `Complete`, `CompleteOwn`, `CancelOwn`, `Claim`, `Unclaim`, `Execute`, `UnassignClaim`, `UnassignAssign`, `UnclaimAssign`.

<!-- DIVERGENCE: Confluence "Granular Task Permissions Onboarding" (1616388317) lists older permissions (READ, REFER, MANAGE, OWN, EXECUTE, CANCEL) as the legacy set and states "Refer" was removed. Source wa-task-configuration-template permissions DMN uses the granular model (Read, Own, Manage, etc.) confirming the migration is complete. Source wins. -->

### Critical formatting rules

- **`Own` and `Claim` must appear on the same rule row.** If they are on separate rows, the user will not see the task in the "Available Tasks" screen.
- **No spaces after commas** in permission values. For example, use `"Read,Own,Claim"` not `"Read, Own, Claim"`. Spaces will break the permission model.

Keep the universal `task-supervisor` catch-all as the first rule -- it grants `"Read,Manage,Cancel,Assign,Unassign,Complete"` for all task types (`wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn:26-53`).

## 5. Write the cancellation DMN

Maps CCD events to cancel, warn, or reconfigure actions against tasks.

**Hit policy**: `COLLECT`

**Input columns**: `fromState`, `event`, `state` (to-state), `appealType` (FEEL from `additionalData.Data.appealType`).

**Output columns**:

| Column | Type | Description |
|--------|------|-------------|
| `action` | string | `"Cancel"`, `"Warn"`, or `"Reconfigure"` |
| `warningCode` | string | e.g. `"TA01"` (only for Warn) |
| `warningText` | string | Human-readable warning |
| `processCategories` | string | Scope action to specific task categories |

### Multiple-category cancellation semantics

When more than one category is specified in a cancellation row (e.g. `"categoryA,categoryB"`), the system cancels tasks that have **all** the specified categories (AND logic). Each triggered row in the DMN produces a separate cancellation message.

Example: a row with `"categoryA,categoryB"` cancels tasks that have **both** A and B, but not tasks with only A.

### Warnings and reconfiguration

Use `action="Warn"` with a `warningCode` (e.g. `"TA01"`) and `warningText` to flag tasks without cancelling them -- a warning icon appears in XUI. Use `action="Reconfigure"` for events that should trigger task reconfiguration rather than cancellation (e.g. an `"UPDATE"` event). See `wa-task-configuration-template:src/main/resources/wa-task-cancellation-wa-wacasetype.dmn:346-370`.

## 6. Write the completion DMN

Maps CCD events to task types that should be auto-completed.

**Hit policy**: `COLLECT`

**Input columns**: `eventId`.

**Output columns**: `taskType` (string), `completionMode` (always `"Auto"`).

Add one row per event-to-task-type auto-completion mapping:

```
eventId="requestRespondentEvidence" -> taskType="reviewTheAppeal", completionMode="Auto"
eventId="decideAnApplication"       -> taskType="processApplication", completionMode="Auto"
```

## 7. Write the allowed-days DMN

Defines the SLA (working days allowed) per task type. This is used by the task monitor to detect overdue tasks.

**Hit policy**: `FIRST` (first matching rule wins).

**Input columns**: `taskId` (string).

**Output columns**:

| Column | Type | Description |
|--------|------|-------------|
| `taskId` | string | Task type identifier (echoed back) |
| `name` | string | Human-readable task name |
| `workingDaysAllowed` | integer | SLA in working days |

Add one row per task type with its expected turnaround time:

```
taskId="provideRespondentEvidence" -> name="Follow Up Overdue Respondent Evidence", workingDaysAllowed=2
taskId="provideCaseBuilding"       -> name="Follow Up Overdue Case Building", workingDaysAllowed=2
```

## 8. Write the task-types DMN

A catalogue of all recognised task type IDs for your case type. XUI uses this to populate task-type filter dropdowns.

**Hit policy**: `COLLECT`

**Inputs**: none (unconditional -- all rows always fire).

**Output columns**: `taskTypeId` (string), `taskTypeName` (string).

Add one row per task type. Start from the empty `wa-task-types-ia-asylum.dmn` as a blank slate (`wa-task-configuration-template:src/main/resources/wa-task-types-ia-asylum.dmn`).

## 9. Update the test harness

1. Add your DMN file references to the `DmnDecisionTable` enum (`wa-task-configuration-template:src/test/java/uk/gov/hmcts/reform/wataskconfigurationtemplate/DmnDecisionTable.java:7-28`) with key-filename pairs matching your new decision IDs.
2. Create test classes extending `DmnDecisionTableBaseUnitTest`. Set `currentDmnDecisionTable` in `@BeforeAll`.
3. Add a **row-count guard test** asserting `logic.getRules().size()` equals your expected rule count. This forces test updates whenever rows are added.
4. Add parameterised scenario tests with `@MethodSource("scenarioProvider")` that stream input maps and assert on expected outputs.

## 10. Test locally

1. Run the DMN unit tests:

```bash
./gradlew test
```

This evaluates your DMN tables in-process against the Camunda DMN engine with an H2 database -- no external Camunda instance required.

2. Run integration tests:

```bash
./gradlew integration
```

3. Generate a coverage report:

```bash
./gradlew jacocoTestReport
```

## 11. Deploy to Camunda

1. Update `camunda-deployment.sh` -- set `TENANT_ID` and `PRODUCT` to your jurisdiction values (`wa-task-configuration-template:camunda-deployment.sh:11-12`).

2. Obtain an S2S service token for a whitelisted service.

3. Run deployment:

```bash
export CAMUNDA_URL=https://<camunda-host>/engine-rest
./camunda-deployment.sh $SERVICE_TOKEN
```

The script iterates all `*.dmn` and `*.bpmn` files under `src/main/resources/` and POSTs each to `${CAMUNDA_URL}/deployment/create` with your tenant ID.

## Appendix: Internal fields (do not use)

<!-- CONFLUENCE-ONLY: not verified in source -->

The following attributes are internal to Task Management and **must not** be referenced in service team DMN rules: `lastUpdatedUser`, `taskName`, `dueDateTime`, `caseCategory`, `lastReconfigurationTime`, `reconfigureRequestTime`, `autoAssigned`, `state`, `indexed`, `lastUpdatedTimestamp`, `lastUpdatedAction`, `taskRoleResources`, `executionTypeCode`, `businessContext`, `terminationReason`, `assignmentExpiry`, `workTypeResource`.

Some have been renamed: `taskName` -> `name`, `dueDateTime` -> `dueDate`, `caseCategory` -> `caseManagementCategory`, `workTypeResource` -> `workType`.

## Verify

1. **Unit tests pass**: `./gradlew test` -- all DMN scenarios green.
2. **Deployment succeeded**: `camunda-deployment.sh` outputs `201 Created` per file. Confirm via: `curl -s "${CAMUNDA_URL}/decision-definition?tenantIdIn=<your-tenant>" -H "ServiceAuthorization: Bearer $SERVICE_TOKEN" | jq '.[].key'`
3. **End-to-end**: trigger a CCD event in a test environment and confirm a task appears in XUI with correct attributes, permissions, and cancellation/completion behaviour.

## Examples

### Blank-slate task-types DMN

Start from this empty shell when registering task types for a new jurisdiction. Add one `<rule>` per task type — no input columns, two output columns.

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-types-ia-asylum.dmn
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
             xmlns:camunda="http://camunda.org/schema/1.0/dmn"
             id="Definitions_1kep5qz" name="DRD"
             namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="wa-task-types-ia-asylum" name="Task Types DMN"
            camunda:historyTimeToLive="P90D">
    <decisionTable id="DecisionTable_17knzal" hitPolicy="COLLECT">
      <input id="Input_1">
        <!-- No input columns: all rules always fire (unconditional catalogue) -->
        <inputExpression typeRef="string"><text></text></inputExpression>
      </input>
      <output id="Output_1" name="taskTypeId"   typeRef="string" />
      <output id="..."       name="taskTypeName" typeRef="string" />
      <!-- Add <rule> elements here — one per task type -->
    </decisionTable>
  </decision>
</definitions>
```

### Initiation DMN — null-safe FEEL input expressions

The `appealType` input column shows the idiomatic FEEL null-safe pattern used throughout all WA DMNs:

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-initiation-wa-wacasetype.dmn
<input id="InputClause_0a0i7vo" label="Appeal Type" camunda:inputVariable="appealType">
  <inputExpression typeRef="string">
    <!-- Guard every level of the navigation path — Camunda FEEL throws on null dereference -->
    <text>if(additionalData != null
          and additionalData.Data != null
          and additionalData.Data.appealType != null) then
          additionalData.Data.appealType
          else null</text>
  </inputExpression>
</input>
```

### Configuration DMN — RULE ORDER and canReconfigure

Base rules (blank `taskType` input) set defaults; later task-specific rows override. The `canReconfigure` column controls which attributes are refreshed when a reconfiguration event fires.

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-configuration-wa-wacasetype.dmn
<decisionTable hitPolicy="RULE ORDER">
  <input label="CCD Case Data" camunda:inputVariable="caseData">
    <inputExpression typeRef="string"><text></text></inputExpression>
  </input>
  <input label="Task type" camunda:inputVariable="taskType">
    <inputExpression typeRef="string">
      <text>if(taskAttributes != null and taskAttributes.taskType != null) then
            taskAttributes.taskType
            else if(taskType != null) then taskType
            else null</text>
    </inputExpression>
  </input>
  <output name="name"           typeRef="string" />
  <output name="value"          typeRef="string" />
  <output name="canReconfigure" typeRef="boolean" />

  <!-- Base rule: set caseName for ALL task types (canReconfigure=true → refreshed on reconfiguration) -->
  <rule>
    <inputEntry><text></text></inputEntry>  <!-- any caseData -->
    <inputEntry><text></text></inputEntry>  <!-- any taskType -->
    <outputEntry><text>"caseName"</text></outputEntry>
    <outputEntry><text>caseData.appellantGivenNames + " " + caseData.appellantFamilyName</text></outputEntry>
    <outputEntry><text>true</text></outputEntry>
  </rule>

  <!-- Base rule: region with null-safe fallback to "1" (National) -->
  <rule>
    <inputEntry><text></text></inputEntry>
    <inputEntry><text></text></inputEntry>
    <outputEntry><text>"region"</text></outputEntry>
    <outputEntry>
      <text>if (caseData.caseManagementLocation != null
            and caseData.caseManagementLocation.region != null) then
            caseData.caseManagementLocation.region else "1"</text>
    </outputEntry>
    <outputEntry><text>true</text></outputEntry>
  </rule>
</decisionTable>
```

### Permissions DMN — OWN+CLAIM same row

The supervisor catch-all rule (all task types) and a role-specific rule showing `OWN` and `CLAIM` on the same row:

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-permissions-wa-wacasetype.dmn
<!-- Universal supervisor: blank taskType = matches all task types -->
<rule>
  <description>supervisor task permissions</description>
  <inputEntry><text></text></inputEntry>  <!-- any taskType -->
  <inputEntry><text></text></inputEntry>
  <outputEntry><text>"categoryA"</text></outputEntry>
  <outputEntry><text>"task-supervisor"</text></outputEntry>
  <outputEntry><text>"Read,Manage,Cancel,Assign,Unassign,Complete"</text></outputEntry>
  <outputEntry><text></text></outputEntry>
  <outputEntry><text></text></outputEntry>
  <outputEntry><text></text></outputEntry>
  <outputEntry><text>false</text></outputEntry>
</rule>

<!-- Role-specific: OWN and CLAIM must be on the same row for Available Tasks visibility -->
<rule>
  <description>Tribunal caseworker — Own+Claim on same row</description>
  <inputEntry><text>"reviewNewSubmission"</text></inputEntry>
  <inputEntry><text></text></inputEntry>
  <outputEntry><text></text></outputEntry>
  <outputEntry><text>"tribunal-caseworker"</text></outputEntry>
  <!-- No spaces after commas — trailing spaces break the permission model parser -->
  <outputEntry><text>"Read,Own,Claim,Unclaim,UnclaimAssign,CompleteOwn,CancelOwn"</text></outputEntry>
  <outputEntry><text>"LEGAL_OPERATIONS"</text></outputEntry>
  <outputEntry><text></text></outputEntry>
  <outputEntry><text>2</text></outputEntry>   <!-- assignmentPriority -->
  <outputEntry><text>false</text></outputEntry>
</rule>
```

### Deployment script

```bash
// Source: apps/wa/wa-task-configuration-template/camunda-deployment.sh
PRODUCT="wa"
TENANT_ID="wa"   # override in your derived repo: e.g. TENANT_ID="ia", TENANT_ID="civil"

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

- [DMN Schema](../reference/dmn-schema.md) — complete field reference for all seven DMN table types (inputs, outputs, hit policies)
- [DMN Task Configuration](../explanation/dmn-task-configuration.md) — conceptual explanation of how each DMN table works and the date calculation engine
- [How-to: Add Tasks for a New Event](add-tasks-for-new-event.md) — focused recipe for adding a single task to an existing DMN set
- [How-to: Onboard a Jurisdiction](onboard-jurisdiction.md) — full end-to-end guide including whitelisting, CCD role grants, and verification
- [Access Control](../explanation/access-control.md) — explains the `OWN`+`CLAIM` same-row constraint and permission model details
