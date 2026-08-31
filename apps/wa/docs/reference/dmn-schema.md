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
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/query/CftQueryService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/query/RoleAssignmentFilter.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/CFTTaskMapper.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/CaseConfigurationProviderService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskAutoAssignmentService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskEntityToReconfigureInputVariableDefMapper.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/utils/TaskMandatoryFieldsValidator.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/domain/camunda/ReconfigureInputVariableDefinition.java
  - wa-task-management-api:src/main/resources/application.yaml
  - wa-task-management-api:src/main/resources/db/migration/V1.0.2__init_enums.sql
  - wa-task-management-api:src/main/resources/db/migration/V1.0.3__init_tables.sql
  - wa-task-management-api:src/main/resources/db/migration/V1.0.10__add_date_constraints.sql
  - wa-task-management-api:src/main/resources/db/migration/V1.0.11__set_created_not_null_constraint.sql
  - wa-task-management-api:src/main/resources/db/migration/V1.0.16__add_priority_date_set_min_max_priority_not_null_in_tasks.sql.sql
  - wa-task-management-api:src/main/resources/db/migration/V1.0.25__add_performance_indexing.sql
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/domain/camunda/response/InitiateEvaluateResponse.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/handlers/InitiationCaseEventHandler.java
  - wa-task-monitor:src/main/java/uk/gov/hmcts/reform/wataskmonitor/services/jobs/initiation/InitiationTaskAttributesMapper.java
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
sources_sha:
  "wa-task-configuration-template:src/main/resources/wa-task-initiation-wa-wacasetype.dmn": "0f8832e3017f8a0676e7ef179e8802c797241707"
  "wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn": "510747dd6d79a189f498d51c500718bb30adf51c"
  "wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn": "d93044190a89ac64e5b112dacb6df5c6af2273bd"
  "wa-task-configuration-template:src/main/resources/wa-task-cancellation-wa-wacasetype.dmn": "c3eae8d2e8f687e8a601a41496fca78df453e9e2"
  "wa-task-configuration-template:src/main/resources/wa-task-completion-wa-wacasetype.dmn": "f256d9afd3ae0ee4420642d1a7648e271423f4a4"
  "wa-task-configuration-template:src/main/resources/wa-task-allowed-days-wa-wacasetype.dmn": "ad5c4d1f3f999a71df3e145d1b784637e15fe261"
  "wa-task-configuration-template:src/main/resources/wa-task-types-wa-wacasetype.dmn": "ad5c4d1f3f999a71df3e145d1b784637e15fe261"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java": "272fb0b4257fe638eeea7af521ae84738cec491a"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateType.java": "1145b29f89b2e45601917fc0ec0c6b8801b783be"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateCalculator.java": "3f8bd2dd559caacad64b6c9c8286d0402dcee87a"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/query/CftQueryService.java": "a6e0eb1659e9b67f5ef737edcd4340c33bac0421"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/query/RoleAssignmentFilter.java": "60770094dbb454b800079ebed9b18c0c6b2dd26c"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/CFTTaskMapper.java": "b1d8bd7df29bb79a3f51aa85e5277be2e5bf0d6a"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/CaseConfigurationProviderService.java": "0464400520dda69b754e7ed2105eecfbbfcd100a"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskAutoAssignmentService.java": "ed3251b249aa89394bbacdadf277672af62c2a9d"
  ? "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskEntityToReconfigureInputVariableDefMapper.java"
  : "cb2500ea265d5b5869560c824f39b82340594e15"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/utils/TaskMandatoryFieldsValidator.java": "1d99034722b1261ca9e19f97571a035b04c649d1"
  ? "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/domain/camunda/ReconfigureInputVariableDefinition.java"
  : "e71b48c5a70d657bcca31f6c8ce0b1213f7eb686"
  "wa-task-management-api:src/main/resources/application.yaml": "f81d0a52a67fadb9884e0d94c8c63a7a92f53ec2"
  "wa-task-management-api:src/main/resources/db/migration/V1.0.2__init_enums.sql": "69212e903c7dfc1015511dbda39ef8b17ae65cbd"
  "wa-task-management-api:src/main/resources/db/migration/V1.0.3__init_tables.sql": "69212e903c7dfc1015511dbda39ef8b17ae65cbd"
  "wa-task-management-api:src/main/resources/db/migration/V1.0.10__add_date_constraints.sql": "0ae5f4d60a88c572875cf046367532e09815130b"
  "wa-task-management-api:src/main/resources/db/migration/V1.0.11__set_created_not_null_constraint.sql": "0ae5f4d60a88c572875cf046367532e09815130b"
  "wa-task-management-api:src/main/resources/db/migration/V1.0.16__add_priority_date_set_min_max_priority_not_null_in_tasks.sql.sql": "a106d75672fa514d1df32b817bb4271a2c54b129"
  "wa-task-management-api:src/main/resources/db/migration/V1.0.25__add_performance_indexing.sql": "c789d5876b98e9ca7205963fe262ba66150ac034"
  "wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/domain/camunda/response/InitiateEvaluateResponse.java": "6c82a186d17994307fda5d55eb3893b0448b3a34"
  "wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/handlers/InitiationCaseEventHandler.java": "43f8c5abc285ef6fc88d13875586e20a8fb3610f"
  "wa-task-monitor:src/main/java/uk/gov/hmcts/reform/wataskmonitor/services/jobs/initiation/InitiationTaskAttributesMapper.java": "baa7cd50a63c619b91f89f53534a30ff07523c61"
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
| `taskType` | string | Must carry the same value as `taskId` |

That table is the whole vocabulary. `wa-case-event-handler` deserialises each matched row into `InitiateEvaluateResponse`, which declares only `taskId`, `delayDuration`, `workingDaysAllowed`, `name`, `taskCategory` (deprecated), `processCategories` and `delayUntil`, and ignores unknown properties; the Camunda message is then assembled from a fixed set of process variables (`wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/domain/camunda/response/InitiateEvaluateResponse.java:13-38`, `.../handlers/InitiationCaseEventHandler.java:213-232`). Adding an output column of your own invention therefore changes nothing — the value is dropped silently.

`taskType` does not survive that mapping either. `wa-task-monitor` takes the task type from a `taskType` process variable when one is present and otherwise falls back to `taskId`, logging that it did so (`wa-task-monitor:src/main/java/uk/gov/hmcts/reform/wataskmonitor/services/jobs/initiation/InitiationTaskAttributesMapper.java:65-80`). That fallback is what the "`taskId` equals `taskType`" convention actually rests on.

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

- **`Own` and `Claim` must appear on the same row.** Each row becomes one `task_roles` record, and the "Available tasks" search joins that table once and requires both flags on the row it matched (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/query/CftQueryService.java:175-184`, `.../cft/query/RoleAssignmentFilter.java:60-77`). Split across two rows, the task is invisible on that screen.
- **Tokens are matched exactly, but surrounding whitespace is not significant.** The value is split on commas and each token trimmed before resolution, so `"Read, Own, Claim"` behaves identically to `"Read,Own,Claim"`. An unrecognised token fails the whole configuration with `IllegalArgumentException: Invalid Permission Type:<token>` (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/CFTTaskMapper.java:402-407`). The neighbouring `authorisations` value is *not* trimmed, so a space there ends up inside the stored authorisation (`CFTTaskMapper.java:409-412`).
- The first rule is always a universal `task-supervisor` catch-all granting `Read,Manage,Cancel,Assign,Unassign,Complete` (`wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn:26-53`).
<!-- DIVERGENCE: Confluence "Granular Task Permissions Onboarding" states that spaces after commas break the permission model parser. CFTTaskMapper trims each token before resolving it against PermissionTypes, so spaced and unspaced values parse the same. Source wins. -->

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

Validation happens on the task record after configuration, against the list in `config.taskMandatoryFields`, and applies equally to initiation and reconfiguration (`wa-task-management-api:src/main/resources/application.yaml:21`, `.../services/utils/TaskMandatoryFieldsValidator.java:61-88`). The 20 checked fields are:

`taskName`, `taskId`, `taskType`, `dueDateTime`, `state`, `securityClassification`, `title`, `majorPriority`, `minorPriority`, `executionTypeCode`, `caseId`, `caseTypeId`, `caseCategory`, `caseName`, `jurisdiction`, `region`, `location`, `created`, `roleCategory`, `workTypeResource`

`priorityDate` is not among them. Because these are task-record names, three of them are produced by differently-named DMN attributes: `dueDate` fills `dueDateTime`, `workType` fills `workTypeResource`, `caseManagementCategory` fills `caseCategory`. A missing platform-owned field (`taskId`, `state`, `executionTypeCode`, `created`, `dueDateTime`, `majorPriority`, `minorPriority`) raises `ValidationException`; anything else raises `ServiceMandatoryFieldValidationException`, which is the signal that a jurisdiction's DMN is short a row (`TaskMandatoryFieldsValidator.java:30-31,81-87`).
<!-- DIVERGENCE: Confluence "WA - Task Attribute Configuration Details" gives the mandatory outputs as dueDate, dueDateTime, title, priorityDate, majorPriority, minorPriority, roleCategory, caseName, caseManagementCategory, region, location and workType, and says most have built-in defaults. The enforced list is config.taskMandatoryFields, which excludes priorityDate and adds taskName, taskId, taskType, state, securityClassification, executionTypeCode, caseId, caseTypeId, jurisdiction and created. Source wins. -->

### Fields a reconfiguration rule cannot see

Reconfiguration rules read a fixed 28-field projection of the task record, `ReconfigureInputVariableDefinition`, not the record itself (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/domain/camunda/ReconfigureInputVariableDefinition.java:22-57`, built at `.../services/CFTTaskMapper.java:264-286`). These columns are absent from it and evaluate to null in a rule, with no error raised:

`securityClassification`, `notes`, `autoAssigned`, `assignmentExpiry`, `businessContext`, `executionTypeCode`, `taskRoleResources`, `taskSystem`, `terminationReason`, `indexed`, `reconfigureRequestTime`, `lastReconfigurationTime`, `lastUpdatedTimestamp`, `lastUpdatedUser`, `lastUpdatedAction`

Five more are present but renamed, so the database spelling is the wrong one to write in a rule (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskEntityToReconfigureInputVariableDefMapper.java:15-19`):

| Task record | Reconfiguration rule |
|-----------------|-------------|
| `taskName` | `name` |
| `dueDateTime` | `dueDate` |
| `state` | `taskState` |
| `caseCategory` | `caseManagementCategory` |
| `workTypeResource.id` | `workType` |

## Nominating an assignee

The mechanism is an `assignee` attribute on the **configuration** DMN, not an output on the initiation DMN (`wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:2030-2035`). A comma in the value is rejected outright with `AssigneeConfigurationException`, and when several rules produce an `assignee` only the last survives (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/CaseConfigurationProviderService.java:102,197-225`). The nominated user is then put through the ordinary auto-assignment match rather than assigned directly (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskAutoAssignmentService.java:84-112`); see [BPMN Workflows](../explanation/bpmn-workflows.md) for the step-by-step path.
<!-- DIVERGENCE: Confluence "WA TM: Setting the Assignee for Task Initiation" describes an initialAssignee output on the initiation DMN, carried into Camunda as a process variable and validated against OWN or EXECUTE. The identifier initialAssignee does not appear as a DMN column, BPMN expression or Camunda variable anywhere in the WA repos, and InitiateEvaluateResponse would discard such a column. Source wins. -->

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

The `cft_task_db.tasks` table stores all task attributes. Key columns and their database defaults:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `task_id` | text PK | (none) | Carries the Camunda task id |
| `due_date_time` | timestamp NOT NULL | (none) | Must be supplied on every insert |
| `priority_date` | timestamp NOT NULL | (none) | Must be supplied on every insert |
| `major_priority` | int4 | 5000 | Nullable |
| `minor_priority` | int4 | 500 | Nullable |
| `auto_assigned` | bool | false | |
| `has_warnings` | bool | false | |
| `created` | timestamp NOT NULL | CURRENT_TIMESTAMP | |
| `indexed` | bool NOT NULL | false | Search visibility gate |
| `additional_properties` | jsonb | (none) | Flexible key/value store |
| `state` | enum | (none) | `task_state_enum` |
| `security_classification` | enum | (none) | `security_classification_enum` |
| `execution_type_code` | enum | (none) | `execution_type_enum`, FK to `execution_types` |
| `task_system` | enum | (none) | `task_system_enum`: `SELF`, `CTSC` |

Only six columns carry a database default, and the two date columns are not among them: `due_date_time` and `priority_date` are NOT NULL with no default, so a task record that reaches the database without them fails on insert rather than acquiring a fallback value (`wa-task-management-api:src/main/resources/db/migration/V1.0.3__init_tables.sql:16`, `.../V1.0.10__add_date_constraints.sql:1`, `.../V1.0.16__add_priority_date_set_min_max_priority_not_null_in_tasks.sql.sql:1-3`). This is why `dueDateTime` is a mandatory configuration output. The `priority_date` backfill from `due_date_time` in that migration ran once over pre-existing rows; it is not an ongoing default.

`created` is the exception among the dates, defaulting to `CURRENT_TIMESTAMP` (`V1.0.3__init_tables.sql:43`, `V1.0.10__add_date_constraints.sql:2`) before being made NOT NULL (`.../V1.0.11__set_created_not_null_constraint.sql:1`). The priority defaults of 5000 and 500 arrived with `priority_date` (`V1.0.16...sql.sql:4-5`), the two booleans with the original table (`V1.0.3__init_tables.sql:26,30`), and `indexed` with the search-index work (`.../V1.0.25__add_performance_indexing.sql:15`).
<!-- DIVERGENCE: Confluence "WA - Task Attribute Configuration Details" gives due_date_time a database default of CURRENT_TIMESTAMP + 2 days and task_system a default of SELF. Neither column has a default: due_date_time is NOT NULL with none, and SELF is merely the first value of task_system_enum (V1.0.2__init_enums.sql:25-27). Source wins. -->

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
