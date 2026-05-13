---
title: Dmn Schema
topic: dmn
diataxis: reference
product: wa
audience: both
sources:
  - wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-cancellation-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-completion-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-allowed-days-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-types-wa-wacasetype.dmn
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateType.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateCalculator.java
status: reviewed
examples_extracted_from:
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-initiation-wa-wacasetype.dmn
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-configuration-wa-wacasetype.dmn
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-permissions-wa-wacasetype.dmn
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-cancellation-wa-wacasetype.dmn
  - apps/wa/wa-task-configuration-template/src/main/resources/wa-task-types-ia-asylum.dmn
confluence:
  - id: "1478710505"
    title: "Task Initiation DMN"
    last_modified: "unknown"
    space: "WA"
  - id: "1753707700"
    title: "WA - Task Attribute Configuration Details"
    last_modified: "unknown"
    space: "WA"
  - id: "1753682604"
    title: "Task Date Configuration Guide"
    last_modified: "unknown"
    space: "WA"
  - id: "1525466902"
    title: "WA Feature Flag DMN rules"
    last_modified: "unknown"
    space: "WA"
  - id: "1616388317"
    title: "Granular Task Permissions Onboarding"
    last_modified: "unknown"
    space: "WA"
  - id: "1629953189"
    title: "HLD - Task Date Configuration v1.1"
    last_modified: "unknown"
    space: "WA"
  - id: "1824134416"
    title: "WA TM: Setting the Assignee for Task Initiation"
    last_modified: "unknown"
    space: "WA"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- WA uses seven Camunda DMN decision tables per jurisdiction/case-type to control task lifecycle: initiation, configuration, permissions, cancellation, completion, allowed-days, and task-types.
- DMN file names follow `wa-task-<category>-<jurisdiction>-<casetype>.dmn`; decision IDs match the file stem exactly.
- Hit policies vary by table: COLLECT (initiation, cancellation, completion, task-types), RULE ORDER (configuration, permissions), FIRST (allowed-days).
- The configuration DMN outputs key/value pairs; date attributes (dueDate, priorityDate, nextHearingDate) are post-processed by a dedicated date-calculation engine in `wa-task-management-api`, not evaluated inline.
- `wa-workflow-api` evaluates initiation/configuration DMNs; `wa-task-management-api` evaluates permissions/configuration DMNs.
- Input attributes differ between initiation (Camunda variables) and reconfiguration (task DB record); only fields with `canReconfigure=true` are re-evaluated on reconfiguration.

## Naming convention

All DMN files follow a strict naming pattern:

```
wa-task-<category>-<jurisdiction>-<casetype>.dmn
```

The `decision id` attribute inside the XML matches the filename stem. Jurisdiction teams substitute `wa-wacasetype` with their own slug (e.g. `ia-asylum`, `civil-civil`).

## 1. Initiation DMN

Creates tasks from CCD case events. Hit policy: **COLLECT** (multiple rules can fire per event, creating multiple tasks).

### Inputs

| Column | Type | Description |
|--------|------|-------------|
| `eventId` | string | CCD event ID that triggered the message |
| `postEventState` | string | CCD case state after the event |
| `appealType` | string | FEEL expression from `additionalData.Data.appealType` |
| `journeyType` | string | FEEL expression from `additionalData.Data.journeyType` |
| `lastModifiedApplicationType` | string | FEEL expression from `additionalData.Data.lastModifiedApplication.type` |
| `lastModifiedApplicationDecision` | string | FEEL expression from `additionalData.Data.lastModifiedApplication.decision` |

### Outputs

| Column | Type | Description |
|--------|------|-------------|
| `taskId` | string | Task identifier (must match `taskType`) |
| `name` | string | Human-readable task name |
| `delayDuration` | integer | Simple day-offset delay before task activation |
| `delayUntil` | json | Structured delay object (see below) |
| `workingDaysAllowed` | integer | Default working days to complete (typically `2`) |
| `processCategories` | string | Comma-separated category identifiers, e.g. `"caseProgression"`, `"timeExtension"`, `"followUpOverdue"` |
| `taskType` | string | Must match `taskId`; consumed by configuration DMN |
| `initialAssignee` | string | (Optional) IDAM user ID to pre-assign the task on initiation. Validated against role assignments before use. |

### `delayUntil` JSON structure

| Field | Type | Description |
|-------|------|-------------|
| `delayUntil` | datetime | Absolute datetime to delay until |
| `delayUntilTime` | time | Time-of-day component |
| `delayUntilOrigin` | datetime | Reference datetime for interval calculation |
| `delayUntilIntervalDays` | integer | Number of days to add to origin |
| `delayUntilNonWorkingCalendar` | string | URL to bank-holidays JSON (e.g. `https://www.gov.uk/bank-holidays/england-and-wales.json`) |
| `delayUntilNonWorkingDaysOfWeek` | string | e.g. `"SATURDAY,SUNDAY"` |
| `delayUntilSkipNonWorkingDays` | boolean | Whether to skip non-working days in interval |
| `delayUntilMustBeWorkingDay` | string | `"Next"`, `"Previous"`, or `"No"` |

Source: `wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn:5-57`

## 2. Configuration DMN

Sets task attributes after creation. Hit policy: **RULE ORDER** (all matching rules applied in order; later rules override earlier ones for the same attribute).

The configuration DMN is evaluated in two different contexts:

- **Initiation**: all Camunda process/task variables are available as inputs (referenced via `taskAttributes.*`). These originate from the BPMN process started for the task.
- **Reconfiguration**: inputs originate from the existing task DB record, not Camunda. Only fields already persisted on the task are available. Internal fields (see below) are being removed from the reconfiguration input set.

### Inputs

| Column | Type | Description |
|--------|------|-------------|
| `caseData` | string | Full CCD case data map (fetched fresh from `ccd-data-store-api` in both contexts) |
| `taskType` | string | Resolved from `taskAttributes.taskType` or the `taskType` variable |

### Outputs

| Column | Type | Description |
|--------|------|-------------|
| `name` | string | Attribute name key |
| `value` | string | Attribute value |
| `canReconfigure` | boolean | Whether the attribute is re-evaluated on reconfiguration (`false`/null = set only on initial configuration) |

### Recognised attribute names

| Attribute | Mandatory | Default | Notes |
|-----------|-----------|---------|-------|
| `caseName` | yes | - | e.g. `caseData.appellantGivenNames + " " + caseData.appellantFamilyName` |
| `region` | yes | - | `caseData.caseManagementLocation.region` |
| `location` | yes | - | `caseData.caseManagementLocation.baseLocation` |
| `locationName` | no | - | `caseData.staffLocation` |
| `caseManagementCategory` | yes | - | `caseData.caseManagementCategory.value.code` or `caseData.appealType` |
| `workType` | yes | - | Values: `"hearing_work"`, `"decision_making_work"`, `"access_requests"`, etc. Refers to work type ID. |
| `roleCategory` | yes | - | Values: `"LEGAL_OPERATIONS"`, `"ADMIN"`, `"JUDICIAL"`, `"CTSC"`, `"ENFORCEMENT"` |
| `title` | yes | task_name | Free-text task title; defaults to the task name from initiation DMN |
| `description` | no | - | HTML template; uses `${[CASE_REFERENCE]}` placeholder |
| `dueDate` | yes | now() + 2 days at 16:00 | Direct specification or via date calculation engine |
| `dueDateTime` | - | `"16:00"` | Time component of the due date |
| `priorityDate` | yes | dueDate | Date used for task ordering in the UI |
| `majorPriority` | yes | `5000` | `1000` if urgent, else `5000` |
| `minorPriority` | yes | `500` | Secondary priority |
| `nextHearingId` | no | - | `caseData.nextHearingId` |
| `nextHearingDate` | no | - | `caseData.nextHearingDate`; displayed in UI for hearing proximity |
| `assignee` | no | - | Literal IDAM user ID; validated against role assignments (must have OWN or EXECUTE permission) |
| `additionalProperties_*` | no | - | Suffix becomes map key in `additionalProperties` JSON on the task resource |
| `executionTypeCode` | - | `MANUAL` | Execution type enumeration |
| `securityClassification` | - | `PUBLIC` | Security classification enumeration |

#### Date calculation attributes

These are not written directly to the task; they are consumed by the date-calculation engine (see "Calculated-dates chaining" below):

| Attribute | Description |
|-----------|-------------|
| `calculatedDates` | Comma-separated list of date names to calculate in sequence. Default: `"nextHearingDate,dueDate,priorityDate"`. Services may insert intermediate date names at any point. |
| `<dateName>Origin` | ISO 8601 date/time starting point. Last value wins if multiple rules match. |
| `<dateName>OriginRef` | Comma-separated list of calculated date names; first non-empty value used as origin. |
| `<dateName>OriginEarliest` | Comma-separated list of calculated date names; earliest non-empty value used. |
| `<dateName>OriginLatest` | Comma-separated list of calculated date names; latest non-empty value used. |
| `<dateName>IntervalDays` | Integer days to add/subtract from origin. Can be negative. Default `0`. |
| `<dateName>NonWorkingCalendar` | URL(s) to calendar JSON resource. Multiple values are merged into a combined calendar. |
| `<dateName>NonWorkingDaysOfWeek` | Comma-separated `java.time.DayOfWeek` values, e.g. `"SATURDAY,SUNDAY"`. Multiple values merged. |
| `<dateName>SkipNonWorkingDays` | Boolean. Default `true`. Whether non-working days are skipped in interval calculation. |
| `<dateName>MustBeWorkingDay` | `"Next"`, `"Previous"`, or `"No"`. Default `"Next"`. Rolls final date to a working day. |
| `<dateName>Time` | ISO 8601 time (HH:mm). Overrides the time portion of the calculated date. |

Source: `wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:8-21`

### Calculated-dates chaining

The `calculatedDates` attribute defines a processing pipeline. Each name in the comma-separated value is computed in order using its corresponding `*Origin`, `*IntervalDays`, `*NonWorkingCalendar`, `*NonWorkingDaysOfWeek`, `*SkipNonWorkingDays`, `*MustBeWorkingDay` attributes. Later dates in the chain can reference earlier computed values via `*OriginRef` attributes.

The date-calculation engine in `wa-task-management-api` (class `DateType`) recognises three built-in date types plus intermediate dates:

| Date Type | Default if null | Order | Displayed in UI |
|-----------|----------------|-------|-----------------|
| `nextHearingDate` | null (no default) | 1 | Yes |
| `dueDate` | now() + 2 days at 16:00 | 2 | No (SLA reporting) |
| `priorityDate` | dueDate | 3 | No (ordering) |
| intermediate (any other name) | null (no default) | 4 | No |

Source: `wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateType.java`

#### Method selection precedence

For each date name, the engine selects a calculation method based on which keys are present in the DMN output:

1. If a `<dateName>` key is present (direct ISO 8601 value), **Direct Specification** is used.
2. Otherwise, if any of `<dateName>Origin`, `<dateName>OriginRef`, `<dateName>OriginEarliest`, `<dateName>OriginLatest` is present, **Date Interval Calculation** is used.
3. It is an error for more than one of `Origin`, `OriginRef`, `OriginEarliest`, `OriginLatest` to appear for the same date name (multiple instances of the same key are permitted, but not conflicting origin-type keys).

#### Key merging rules

When a key appears multiple times in the DMN output (common when global defaults are overridden by task-specific rules):

- **Last-value-wins**: `Origin`, `OriginRef`, `OriginEarliest`, `OriginLatest`, `IntervalDays`, `SkipNonWorkingDays`, `MustBeWorkingDay`, `Time`
- **Merged (accumulated)**: `NonWorkingCalendar` (all URLs form a combined calendar), `NonWorkingDaysOfWeek` (union of all specified days)

#### Null handling

Null/empty date values are valid. Adding days to a null origin produces a null result without error. `OriginRef`, `OriginEarliest`, and `OriginLatest` ignore null values in their lists and only use non-null entries. If all entries are null, the output is null.

#### Calendar resource format

Calendar URLs must return JSON matching this schema:

```json
{
  "events": [
    { "date": "2024-12-25" },
    { "date": "2024-12-26", "working_day": true }
  ]
}
```

- `working_day` defaults to `false`; setting `true` reinstates a date as a working day (useful for service-specific overrides of standard bank holidays).
- Resources must be publicly accessible (no auth required).
- The engine caches calendar resources in memory with an expiry of at least one hour.

Standard UK government resources:
- `https://www.gov.uk/bank-holidays/england-and-wales.json`
- `https://www.gov.uk/bank-holidays/scotland.json`
- `https://www.gov.uk/bank-holidays/northern-ireland.json`

#### Example

From `functionalTestTask2` (`wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:1066-1235`):

```
calculatedDates = "nextHearingDate,hearingPreDate,dueDate,priorityDate"
hearingPreDateOriginRef = "nextHearingDate"
hearingPreDateIntervalDays = -5
priorityDateOriginEarliest = "hearingPreDate,dueDate"
```

This calculates: (1) nextHearingDate from case data, (2) hearingPreDate as 5 days before the next hearing, (3) dueDate with its own rules, (4) priorityDate as the earliest of hearingPreDate or dueDate.

## 3. Permissions DMN

Defines which roles can act on which task types. Hit policy: **RULE ORDER**.

### Inputs

| Column | Type | Description |
|--------|------|-------------|
| `taskType` | string | From `taskAttributes.taskType`; falls back to `"r1"` when `taskAttributes` is null |
| `case` | (reserved) | Unused; reserved for future case-data-based permission filters |

### Outputs

| Column | Type | Description |
|--------|------|-------------|
| `caseAccessCategory` | string | Comma-separated access categories, e.g. `"categoryA,categoryB"` |
| `name` | string | Role name, e.g. `"task-supervisor"`, `"tribunal-caseworker"`, `"judge"` |
| `value` | string | Comma-separated permission flags |
| `roleCategory` | string | `"LEGAL_OPERATIONS"`, `"JUDICIAL"`, `"ADMIN"`, `"CTSC"`, `"ENFORCEMENT"` |
| `authorisations` | string | Optional authorisation codes (e.g. `"testAuth"`) |
| `assignmentPriority` | integer | Lower value = higher priority for auto-assignment |
| `autoAssignable` | boolean | Whether the role qualifies for auto-assignment |

### Permission flags

| Flag | Meaning |
|------|---------|
| `Read` | View the task |
| `Refer` | Refer the task (legacy; retained in source but deprecated in the granular model) |
| `Own` | Own the task (after claim/assign) |
| `Manage` | Manage task lifecycle |
| `Execute` | Execute the task action (allows assignment and completion, similar to Own) |
| `Cancel` | Cancel any task |
| `CancelOwn` | Cancel only tasks you own |
| `Complete` | Complete any task |
| `CompleteOwn` | Complete only tasks you own |
| `Claim` | Claim an unassigned task |
| `Unclaim` | Release a claimed task |
| `Assign` | Assign a task to another user |
| `Unassign` | Unassign a task |
| `UnassignClaim` | Unassign then claim |
| `UnassignAssign` | Unassign then assign to another |
| `UnclaimAssign` | Unclaim then assign to another |

Source: `wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java`

<!-- DIVERGENCE: Confluence "Granular Task Permissions Onboarding" says the new model "retains the current except 'Refer'", implying Refer was removed. But PermissionTypes.java still includes REFER("Refer", "refer"). Source wins — Refer exists in the enum but is deprecated for new configurations. -->

### Permission DMN rules

Important rules when configuring the permissions DMN:

- **`Own` and `Claim` must appear on the same row** in the permissions DMN. If they are on separate rows, the task will not appear in the "Available tasks" screen in XUI.
- **No spaces after commas** in the permission value string. Trailing spaces break the permission model parser (e.g. use `"Read,Own,Claim"` not `"Read, Own, Claim"`).
- The first rule is always a universal `task-supervisor` catch-all granting `Read,Manage,Cancel,Assign,Unassign,Complete` (`wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn:26-53`).

<!-- CONFLUENCE-ONLY: not verified in source -->

## 4. Cancellation DMN

Determines what happens to existing tasks when CCD events fire. Hit policy: **COLLECT**.

### Inputs

| Column | Type | Description |
|--------|------|-------------|
| `fromState` | string | CCD case state before the event |
| `event` | string | CCD event ID |
| `state` | string | CCD case state after the event |
| `appealType` | string | FEEL expression from `additionalData.Data.appealType` |

### Outputs

| Column | Type | Description |
|--------|------|-------------|
| `action` | string | One of: `"Cancel"`, `"Warn"`, `"Reconfigure"` |
| `warningCode` | string | Warning identifier (e.g. `"TA01"`, `"TA02"`); only with `action="Warn"` |
| `warningText` | string | Human-readable warning message |
| `processCategories` | string | Scopes the action to tasks in a specific process category |

### Action semantics

| Action | Effect |
|--------|--------|
| `Cancel` | Terminates matching tasks |
| `Warn` | Flags tasks with warning code/text without cancelling |
| `Reconfigure` | Triggers reconfiguration of matching tasks (used for `UPDATE` events) |

Source: `wa-task-configuration-template:src/main/resources/wa-task-cancellation-wa-wacasetype.dmn`

## 5. Completion DMN

Maps CCD events to tasks that should be auto-completed. Hit policy: **COLLECT**.

### Inputs

| Column | Type | Description |
|--------|------|-------------|
| `eventId` | string | CCD event ID |

### Outputs

| Column | Type | Description |
|--------|------|-------------|
| `taskType` | string | Task type to auto-complete |
| `completionMode` | string | Always `"Auto"` |

Source: `wa-task-configuration-template:src/main/resources/wa-task-completion-wa-wacasetype.dmn:12-242`

## 6. Allowed Days DMN

Maps Camunda direction task IDs to WA follow-up task types with default working-days-allowed. Hit policy: **FIRST**.

### Inputs

| Column | Type | Description |
|--------|------|-------------|
| `taskId` | string | Camunda direction/task ID (not the WA task type) |

### Outputs

| Column | Type | Description |
|--------|------|-------------|
| `taskId` | string | WA task type ID for the follow-up task |
| `name` | string | Display name |
| `workingDaysAllowed` | integer | Default working days allowed (typically `2`) |

Source: `wa-task-configuration-template:src/main/resources/wa-task-allowed-days-wa-wacasetype.dmn:13-110`

## 7. Task Types DMN

Catalogue of all recognised task type IDs for the jurisdiction/case type. Used by XUI to populate task-type filter dropdowns. Hit policy: **COLLECT**.

### Inputs

None (unconditional; all rows always fire).

### Outputs

| Column | Type | Description |
|--------|------|-------------|
| `taskTypeId` | string | Unique task type identifier |
| `taskTypeName` | string | Human-readable display name |

Source: `wa-task-configuration-template:src/main/resources/wa-task-types-wa-wacasetype.dmn`

## Summary of hit policies

| DMN Table | Hit Policy | Effect |
|-----------|-----------|--------|
| Initiation | COLLECT | Multiple tasks can be created from one event |
| Configuration | RULE ORDER | All matching rules apply; last match wins per attribute |
| Permissions | RULE ORDER | All matching rules apply; roles accumulate |
| Cancellation | COLLECT | Multiple actions can fire per event |
| Completion | COLLECT | Multiple task types can be auto-completed per event |
| Allowed Days | FIRST | First matching rule wins |
| Task Types | COLLECT | All rows returned as the complete catalogue |

## Initiation vs reconfiguration context

The configuration DMN is evaluated in two distinct contexts. Understanding the differences is critical for service teams writing rules:

| Aspect | Initiation | Reconfiguration |
|--------|-----------|-----------------|
| Input origin | Camunda process/task variables | Task DB record |
| `taskAttributes.*` contents | All Camunda variables from the BPMN process | Only fields persisted on the task |
| `additionalProperties` access | `taskAttributes.<PROP_NAME>` | `taskAttributes.additionalProperties.<PROP_NAME>` |
| `canReconfigure` effect | Ignored (all fields are set) | Only fields with `canReconfigure=true` are updated |
| Mandatory output validation | Prevents task from being fully initiated | Prevents reconfiguration of that attribute |

### Mandatory configuration outputs

The following outputs are mandatory -- their absence prevents the task from being available to users:

`dueDate`, `dueDateTime`, `title`, `priorityDate`, `majorPriority`, `minorPriority`, `roleCategory`, `caseName`, `caseManagementCategory`, `region`, `location`, `workType`

Most of these have built-in defaults (see "Recognised attribute names" above) so they will only fail validation if the DMN explicitly produces an invalid value.

### Internal fields being deprecated

The following input fields are available during reconfiguration but are considered internal and must not be used in service DMN rules (they will be removed):

`lastUpdatedUser`, `taskName`, `dueDateTime`, `caseCategory`, `lastReconfigurationTime`, `reconfigureRequestTime`, `autoAssigned`, `state`, `indexed`, `lastUpdatedTimestamp`, `lastUpdatedAction`, `taskRoleResources`, `executionTypeCode`, `businessContext`, `terminationReason`, `assignmentExpiry`, `workTypeResource`

These are being renamed to consistent names:

| Deprecated name | Replacement |
|-----------------|-------------|
| `taskName` | `name` |
| `dueDateTime` | `dueDate` |
| `caseCategory` | `caseManagementCategory` |
| `workTypeResource` | `workType` |

<!-- CONFLUENCE-ONLY: not verified in source -->

## Initial assignee

Service teams can pre-assign a task at initiation by providing an `initialAssignee` output from their initiation DMN. The flow:

1. Service writes CCD callback code to set a case-data field containing the intended assignee's IDAM ID.
2. That field is published in the CCD case-event message as `additionalData`.
3. The initiation DMN extracts it and outputs `initialAssignee`.
4. The value is passed to Camunda as a process variable when the standalone task BPMN starts.
5. The configuration DMN can reference it via `taskAttributes.assignee` and output an `assignee` attribute.
6. `wa-task-management-api` validates the assignee has `OWN` or `EXECUTE` permission on the task before committing the assignment.

If validation fails (user lacks correct role assignments), the system falls back to the standard auto-assignment process.

Source: `wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskAutoAssignmentService.java`

## Notable conventions

- **`taskId` equals `taskType`** in the initiation DMN: both output columns carry the same camelCase string (`wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn:51,57`).
- **`"r1"` fallback**: the permissions DMN defaults `taskType` to `"r1"` when `taskAttributes` is null, ensuring tasks always get at least the default role set.
- **`canReconfigure` semantics**: `false` or null means set-once; `true` means re-evaluated on reconfiguration requests.
- **`additionalProperties_` prefix**: output names with this prefix are collected into the task resource's `additionalProperties` map. The suffix becomes the map key.
- **`additionalProperties` access differs by context**: at initiation use `taskAttributes.<PROP_NAME>`; at reconfiguration use `taskAttributes.additionalProperties.<PROP_NAME>`.
- **`processCategories` is comma-separated**: multiple categories in a single initiation rule are expressed as one comma-separated string (e.g. `"caseProgression,followUpOverdue"`).
- **FEEL null-safety**: input expressions use `if(X != null and X.Y != null) then X.Y else null` to avoid null-navigation errors.
- **`description` uses HTML**: encoded HTML with `<br />` tags, rendered by XUI at display time.
- **Multiple calendars**: `dueDateNonWorkingCalendar` and `delayUntilNonWorkingCalendar` support comma-separated calendar URLs.
- **Null output clears values**: if the configuration DMN explicitly returns null/empty for a field during reconfiguration (with `canReconfigure=true`), it overwrites any existing value in the DB.
- **Camunda uses camelCase**: all field names follow camelCase convention (`taskId`, `dueDate`, etc.).

## Task database schema

The `cft_task_db.tasks` table stores all task attributes. Key columns and their defaults:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `task_id` | text PK | (from Camunda) | |
| `due_date_time` | timestamp NOT NULL | CURRENT_TIMESTAMP + 2 days | |
| `major_priority` | int4 | 5000 | |
| `minor_priority` | int4 | 500 | |
| `auto_assigned` | bool | false | |
| `has_warnings` | bool | false | |
| `created` | timestamp NOT NULL | CURRENT_TIMESTAMP | |
| `priority_date` | timestamp NOT NULL | (set to dueDate) | |
| `indexed` | bool NOT NULL | false | |
| `additional_properties` | jsonb | NULL | Flexible key/value store |
| `state` | enum | | `task_state_enum` |
| `security_classification` | enum | | `security_classification_enum` |
| `execution_type_code` | enum | | `execution_type_enum` |
| `task_system` | enum | | `task_system_enum` (default SELF) |

<!-- CONFLUENCE-ONLY: not verified in source -->

## Examples

### Initiation DMN skeleton with input column structure

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-initiation-wa-wacasetype.dmn
<decision id="wa-task-initiation-wa-wacasetype" name="Task initiation DMN"
          camunda:historyTimeToLive="P90D">
  <decisionTable hitPolicy="COLLECT">
    <!-- Standard input columns — replace wa-wacasetype suffix with <jurisdiction>-<casetype> -->
    <input camunda:inputVariable="eventId">
      <inputExpression typeRef="string"><text></text></inputExpression>
    </input>
    <input camunda:inputVariable="postEventState">
      <inputExpression typeRef="string"><text></text></inputExpression>
    </input>
    <input camunda:inputVariable="appealType">
      <!-- FEEL null-safe navigation is mandatory for all additionalData fields -->
      <inputExpression typeRef="string">
        <text>if(additionalData != null and additionalData.Data != null
              and additionalData.Data.appealType != null) then
              additionalData.Data.appealType else null</text>
      </inputExpression>
    </input>
    <input camunda:inputVariable="journeyType">
      <inputExpression typeRef="string">
        <text>if(additionalData != null and additionalData.Data != null
              and additionalData.Data.journeyType != null) then
              additionalData.Data.journeyType else null</text>
      </inputExpression>
    </input>
    <!-- Output columns -->
    <output name="taskId"             typeRef="string" />
    <output name="name"               typeRef="string" />
    <output name="delayDuration"      typeRef="integer" />
    <output name="delayUntil"         typeRef="json" />
    <output name="workingDaysAllowed" typeRef="integer" />
    <output name="processCategories"  typeRef="string" />
    <output name="taskType"           typeRef="string" />
  </decisionTable>
</decision>
```

### Configuration DMN — task-type input expression

The configuration DMN resolves the task type from Camunda variables with a multi-level fallback:

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-configuration-wa-wacasetype.dmn
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
```

### Permissions DMN — `"r1"` fallback

When `taskAttributes` is null (e.g. during initial DMN evaluation before process variables are set), the task type defaults to `"r1"`. This ensures tasks always receive a permission set:

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-permissions-wa-wacasetype.dmn
<input label="Task Type" camunda:inputVariable="taskType">
  <inputExpression typeRef="string">
    <text>if(taskAttributes != null and taskAttributes.taskType != null) then
          taskAttributes.taskType
          else "r1"</text>
  </inputExpression>
</input>
```

### Cancellation DMN — Warn and Reconfigure actions

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-cancellation-wa-wacasetype.dmn
<decision id="wa-task-cancellation-wa-wacasetype" name="Task cancellation DMN"
          camunda:historyTimeToLive="P90D">
  <decisionTable hitPolicy="COLLECT">
    <input><inputExpression typeRef="string"><text>fromState</text></inputExpression></input>
    <input><inputExpression typeRef="string"><text>event</text></inputExpression></input>
    <input><inputExpression typeRef="string"><text>state</text></inputExpression></input>
    <input>
      <!-- null-safe appealType extraction -->
      <inputExpression typeRef="string">
        <text>if(additionalData != null and additionalData.Data != null
              and additionalData.Data.appealType != null) then
              additionalData.Data.appealType else null</text>
      </inputExpression>
    </input>
    <output name="action"            typeRef="string" />
    <output name="warningCode"       typeRef="string" />
    <output name="warningText"       typeRef="string" />
    <output name="processCategories" typeRef="string" />

    <!-- Warn rule: flags all tasks when a dummy application event fires (no Cancel) -->
    <rule id="DecisionRule_0p1obrw">
      <inputEntry><text></text></inputEntry>
      <inputEntry><text>"_DUMMY_makeAnApplication"</text></inputEntry>
      <inputEntry><text></text></inputEntry>
      <inputEntry><text></text></inputEntry>
      <outputEntry><text>"Warn"</text></outputEntry>
      <outputEntry><text>"TA01"</text></outputEntry>
      <outputEntry><text>"There is an application task which might impact other active tasks"</text></outputEntry>
      <outputEntry><text></text></outputEntry>
    </rule>
  </decisionTable>
</decision>
```

### Task-types DMN — empty starting structure

```xml
// Source: apps/wa/wa-task-configuration-template/src/main/resources/wa-task-types-ia-asylum.dmn
<decision id="wa-task-types-ia-asylum" name="Task Types DMN" camunda:historyTimeToLive="P90D">
  <decisionTable hitPolicy="COLLECT">
    <input id="Input_1">
      <inputExpression typeRef="string"><text></text></inputExpression>
    </input>
    <output name="taskTypeId"   typeRef="string" />
    <output name="taskTypeName" typeRef="string" />
    <!-- No rules yet — add one per task type with unconditional outputs -->
  </decisionTable>
</decision>
```

## See also

- [DMN Task Configuration](../explanation/dmn-task-configuration.md) — conceptual explanation of each DMN type; date calculation engine internals; processCategories mechanism
- [How-to: Write DMN Configuration](../how-to/write-dmn-configuration.md) — authoring guide with worked XML examples for each table type
- [How-to: Add Tasks for a New Event](../how-to/add-tasks-for-new-event.md) — incremental recipe for adding a task to existing DMNs
- [Access Control](../explanation/access-control.md) — how Permissions DMN outputs become `task_roles` rows used for access decisions
- [Glossary](glossary.md) — definitions of DMN-specific terms (COLLECT, RULE ORDER, FIRST, canReconfigure, FEEL)
