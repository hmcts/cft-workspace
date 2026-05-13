# Work Allocation (WA) documentation

Work Allocation is the HMCTS platform that turns CCD case events into actionable caseworker tasks. It receives events from Azure Service Bus, evaluates Camunda DMN rules to decide what tasks to create, cancel, or reconfigure, drives task lifecycle through BPMN processes, and exposes tasks to caseworkers via the XUI task list. Access to tasks is enforced using AM role assignments with a granular 16-permission model.

This `docs/` tree covers the WA platform in depth: how the services fit together, how jurisdiction teams onboard by writing DMN configuration, how the task lifecycle and access model work, and API reference for both internal and service-team consumers. It follows the [Diátaxis](https://diataxis.fr/) framework — explanation, how-to guides, and reference. Workspace-wide platform topics live in the root [`docs/`](../../../docs/) tree.

## Reading order

For someone new to Work Allocation:

1. [Overview](explanation/overview.md) — what WA is, the end-to-end pipeline, task states, permissions model, and supported jurisdictions
2. [Architecture](explanation/architecture.md) — service map, databases, ASB topology, authentication, and deployment
3. [DMN Task Configuration](explanation/dmn-task-configuration.md) — how jurisdiction teams configure tasks using Camunda decision tables
4. [Task Lifecycle](explanation/task-lifecycle.md) — full task state machine, auto-assignment, reconfiguration, and access control enforcement
5. [BPMN Workflows](explanation/bpmn-workflows.md) — how the generic Camunda process manages task lifecycle events

## By topic

### Core concepts

- [Overview](explanation/overview.md) — WA model, end-to-end flow, task states, permissions, role categories, and design principles
- [Architecture](explanation/architecture.md) — service topology, databases, ASB, authentication, alerting, and data retention
- [Task Lifecycle](explanation/task-lifecycle.md) — state machine, initiation, auto-assignment, reconfiguration, access enforcement

### Task configuration (DMN)

- [DMN Task Configuration](explanation/dmn-task-configuration.md) — all seven DMN types, date calculation engine, processCategories mechanism, troubleshooting
- [BPMN Workflows](explanation/bpmn-workflows.md) — generic task BPMN, message correlation, idempotency gate, delay timer, external task workers

### Event processing

- [Case Event Handler](explanation/case-event-handler.md) — ASB session subscription, message state machine, per-case ordering, DLQ handling, retry backoff

### Access control

- [Access Control](explanation/access-control.md) — permission model (16 types), cross-role assignment, S2S tiers, sensitive audit log

## How-to recipes

- [Onboard a Jurisdiction](how-to/onboard-jurisdiction.md) — end-to-end guide: register jurisdiction, update CCD definitions, author all DMNs, deploy to Camunda, verify
- [Write DMN Configuration](how-to/write-dmn-configuration.md) — step-by-step guide for authoring all seven DMN table types with worked XML examples
- [Add Tasks for a New CCD Event](how-to/add-tasks-for-new-event.md) — incremental recipe for adding a task type to an existing jurisdiction DMN set
- [Debug Stuck Tasks](how-to/debug-stuck-tasks.md) — diagnosing `UNCONFIGURED` tasks, `UNPROCESSABLE` messages, DLQ blockages, and INITIATION job failures

## Reference

- [DMN Schema](reference/dmn-schema.md) — complete field reference for all seven DMN types: inputs, outputs, hit policies, date calculation attributes
- [Task States](reference/task-states.md) — all `CFTTaskState` values with transitions, actions (audit labels), termination sub-types, and permissions per endpoint
- [API: Workflow (`wa-workflow-api`)](reference/api-workflow.md) — DMN evaluation and BPMN message correlation endpoints; external task workers; error codes
- [API: Task Management (`wa-task-management-api`)](reference/api-task-management.md) — full CRUD, search, assignment, completion, cancel, and batch operation endpoint reference

## Glossary

[Glossary](reference/glossary.md) — definitions of WA-specific terms: BPMN, DMN, FEEL, CFTTaskState, idempotencyKey, task_roles, sensitive_task_event_logs, and more.
