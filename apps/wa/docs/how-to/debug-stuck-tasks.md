---
title: Debug Stuck Tasks
topic: task-lifecycle
diataxis: how-to
product: wa
audience: both
sources:
  - wa-task-monitor:src/main/java/uk/gov/hmcts/reform/wataskmonitor/services/jobs/initiation/InitiationJobService.java
  - wa-task-monitor:src/main/java/uk/gov/hmcts/reform/wataskmonitor/config/job/InitiationJobConfig.java
  - wa-task-monitor:src/main/java/uk/gov/hmcts/reform/wataskmonitor/services/jobs/failure/initiation/TaskInitiationFailuresJobService.java
  - wa-task-monitor:src/main/resources/camunda/camunda-search-cftTaskState-unconfigured.json
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/clients/DatabaseMessageConsumer.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/clients/MessageReadinessConsumer.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/clients/UnprocessableHttpErrors.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/services/DeadLetterQueuePeekService.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/repository/CaseEventMessageRepository.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/handlers/InitiationCaseEventHandler.java
status: reviewed
examples_extracted_from:
  - apps/wa/wa-case-event-handler/src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/repository/CaseEventMessageRepository.java
  - apps/wa/wa-task-monitor/src/main/resources/application.yaml
confluence:
  - id: "1558253874"
    title: "WA Dead Letter Queue implementation key classes."
    last_modified: "unknown"
    space: "WA"
  - id: "1504242427"
    title: "WA CFT DB Task Initiation"
    last_modified: "unknown"
    space: "WA"
  - id: "1552152378"
    title: "HLD - Task Repository v1.2"
    last_modified: "unknown"
    space: "WA"
  - id: "1504219560"
    title: "Options to schedule jobs in wa-task-monitor"
    last_modified: "unknown"
    space: "WA"
  - id: "1864162866"
    title: "WA - TM - Case Event Handler Performance Improvements"
    last_modified: "unknown"
    space: "WA"
  - id: "1457304217"
    title: "WA CCD Event Handling NFRs"
    last_modified: "unknown"
    space: "WA"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- A task stuck in `Unconfigured` state means the CEH-to-workflow-api-to-Camunda initiation path succeeded (a BPMN process started with `taskState=unconfigured`) but the task-monitor INITIATION job has not yet picked it up, or the `POST /task/{id}/initiation` call to task-management-api failed.
- Check three places in order: (1) CEH message state in the `wa_case_event_messages` database, (2) wa-task-monitor logs for the INITIATION job report, (3) the ASB Dead Letter Queue.
- If the DLQ is non-empty, the entire CEH pipeline stalls — no `NEW` messages promote to `READY` until the DLQ is cleared (`MessageReadinessConsumer.java:49-71`). The DLQ check is controlled by the `azure.servicebus.enableASB-DLQ` toggle.
- The INITIATION job only queries tasks created within the last 120 minutes by default (env `INITIATION_TIME_LIMIT`). Tasks older than this window are silently skipped unless `INITIATION_TIME_LIMIT_FLAG=false`.
- The diagnostic job `TASK_INITIATION_FAILURES` logs stuck tasks as WARN but does not remediate them. It queries for tasks with `createdBefore = now() - INITIATION_TIME_LIMIT` (the inverse window to the INITIATION job).
- During event bursts (common from IAC), the message backlog can take hours to clear. An existing Azure alert fires when messages are not processed within 2 hours.

## Prerequisites

- Access to the Kubernetes namespace where WA services are running (AAT or production).
- Ability to query the `wa_case_event_messages_db` PostgreSQL database (via `kubectl port-forward` or pgAdmin).
- Access to Application Insights / Azure Monitor for wa-task-monitor and wa-case-event-handler logs.
- Access to the Camunda admin console (Cockpit) for the target environment.

## 1. Confirm the task is stuck

1. Open the Camunda admin Cockpit for the target environment.
2. Navigate to **Running Process Instances** and filter by `processDefinitionKey = wa-task-initiation-ia-asylum`.
3. Locate the process instance for the case in question and inspect the `cftTaskState` task-level variable.
4. If `cftTaskState = unconfigured`, the task is genuinely stuck — it was created by CEH sending a `createTaskMessage` to Camunda but has not been initiated by the task-monitor.

## 2. Check the CEH message pipeline

Understanding the processing order is important for diagnosis: within a single CCD case event, CEH processes messages in priority order: (1) Cancellations, (2) Warnings, (3) Initiations. Messages for the same case are processed sequentially in event_timestamp order — never in parallel. This means a stuck cancellation message blocks all subsequent initiations for that case.

5. Query the `wa_case_event_messages` table for the case:

   ```sql
   SELECT message_id, state, event_id, case_id, event_timestamp,
          retry_count, hold_until, from_dlq, delivery_count
   FROM wa_case_event_messages
   WHERE case_id = '<case-id>'
   ORDER BY event_timestamp DESC;
   ```

6. Interpret the `state` column:
   - `NEW` — message received but not yet promoted to `READY`. The DLQ might be blocking promotion (see step 9). `MessageReadinessConsumer` checks DLQ emptiness for each message individually via `DeadLetterQueuePeekService.isDeadLetterQueueEmpty()`.
   - `READY` — message is queued for processing but has not been picked up yet. Check `hold_until` — if it is in the future, the message is in a retry backoff period.
   - `PROCESSED` — message was handled successfully. The problem is downstream (Camunda or task-monitor).
   - `UNPROCESSABLE` — message hit a non-retryable error. The specific non-retryable HTTP codes are: **400 (Bad Request), 403 (Forbidden), 404 (Not Found)** (`UnprocessableHttpErrors.java`). All other HTTP errors and `RetryableException` are treated as retryable. Check Application Insights for the `FeignException` details.

7. If `retry_count >= 8`, the message has exhausted all retries and was marked `UNPROCESSABLE` (`DatabaseMessageConsumer.java:39-50`). The retry backoff schedule is:

   | Retry | Delay (seconds) |
   |-------|----------------|
   | 1     | 5              |
   | 2     | 15             |
   | 3     | 30             |
   | 4     | 60             |
   | 5     | 300            |
   | 6     | 900            |
   | 7     | 1800           |
   | 8     | 3600           |

8. If a message for this case has `event_timestamp IS NULL` or `case_id IS NULL`, it blocks all other messages for the same case (and in the case of `case_id IS NULL`, blocks ALL messages globally) from processing. The `LOCK_AND_GET_NEXT_MESSAGE_SQL` query in `CaseEventMessageRepository.java` enforces this with `NOT EXISTS` subqueries. Additionally, messages are selected using `FOR UPDATE SKIP LOCKED` to prevent concurrent processing of the same message. Resolve by triggering the `FIND_PROBLEM_MESSAGES` job (see step 13).

## 3. Check the Dead Letter Queue

9. Query Application Insights for `wa-case-event-handler` logs containing `DeadLetterQueuePeekService`:

   ```kusto
   traces
   | where cloud_RoleName == "wa-case-event-handler"
   | where message contains "DeadLetterQueue"
   | order by timestamp desc
   | take 20
   ```

10. If the DLQ is non-empty, `MessageReadinessConsumer` will not promote any `NEW` messages to `READY` — the entire pipeline stalls (`MessageReadinessConsumer.java:49-71`). The DLQ must be drained before normal processing resumes. Note: DLQ checking is only active when `azure.servicebus.enableASB-DLQ=true` (disabled in functional tests and local profiles).

    The DLQ check works by calling `ServiceBusReceiverClient.peekMessage(1)` on the dead letter queue subscription. If any message is returned, the DLQ is considered non-empty and no promotions occur.

11. To inspect and clear DLQ messages in non-production, use the CEH testing controller:

    ```
    GET /messages/query?states=NEW&from_dlq=true
    ```

    In production, use Azure Service Bus Explorer to inspect and dead-letter/complete messages on the DLQ subscription.

    Note: Messages consumed from the DLQ by `CcdCaseEventsDeadLetterQueueConsumer` are persisted into the database with `from_dlq=true`. The message selection query applies additional ordering rules for DLQ messages — they are only processed when a non-DLQ message with a higher timestamp exists for the same case, or when 30+ minutes have elapsed since their event timestamp.

## 4. Check the task-monitor INITIATION job

12. Query Application Insights for wa-task-monitor INITIATION job execution:

    ```kusto
    traces
    | where cloud_RoleName == "wa-task-monitor"
    | where message contains "INITIATION" or message contains "GenericJobReport"
    | order by timestamp desc
    | take 50
    ```

13. Look for the `GenericJobReport` log entry which shows `totalTasks` and individual `GenericJobOutcome` entries. If the task appears in the report with a failure, the issue is in the `POST /task/{id}/initiation` call to `wa-task-management-api`.

14. Verify the INITIATION job is being triggered at all — check that `wa-task-batch-service` CronJob pods are completing successfully:

    ```bash
    kubectl get cronjobs -n <namespace> | grep batch
    kubectl get pods -n <namespace> -l app=wa-task-batch-service --sort-by=.status.startTime | tail -5
    ```

15. If the task was created more than 120 minutes ago, it falls outside the default `INITIATION_TIME_LIMIT` window. The INITIATION job query applies a `createdAfter` filter of `now() - 120 minutes` (`InitiationJobService.java:118-136`). To pick up older tasks, temporarily set `INITIATION_TIME_LIMIT_FLAG=false` in the task-monitor deployment, which removes the time filter entirely.

    The env vars controlling this behaviour (from `application.yaml`):
    ```yaml
    job:
      initiation:
        camunda-max-results: ${INITIATION_CAMUNDA_MAX_RESULTS:100}
        camunda-time-limit-flag: ${INITIATION_TIME_LIMIT_FLAG:true}
        camunda-time-limit: ${INITIATION_TIME_LIMIT:120}  # minutes
    ```

## 5. Check the TASK_INITIATION_FAILURES diagnostic job

16. Search wa-task-monitor logs for WARN-level entries from the `TASK_INITIATION_FAILURES` job:

    ```kusto
    traces
    | where cloud_RoleName == "wa-task-monitor"
    | where severityLevel >= 2
    | where message contains "TASK_INITIATION_FAILURES" or message contains "unconfigured"
    | order by timestamp desc
    ```

    This diagnostic job queries Camunda for tasks still `cftTaskState=unconfigured` with `createdBefore = now() - camundaTimeLimit` (tasks that should have been initiated but were not). It logs task IDs, caseId, jurisdiction, name, caseTypeId, and created date as WARN but does not remediate. It also logs `taskState` and `cftTaskState` variable values for each task (`TaskInitiationFailuresJobService.java:110-118`).

    Note: if `INITIATION_TIME_LIMIT_FLAG=false`, the `TASK_INITIATION_FAILURES` job exits immediately without checking — it requires the time-limit flag to be enabled to function (`TaskInitiationFailuresJobService.java:94-97`).

## 6. Remediate

17. **If CEH message is `UNPROCESSABLE`**: trigger the `RESET_PROBLEM_MESSAGES` job on CEH to reset it back to `NEW`:

    ```bash
    curl -X POST https://<ceh-host>/messages/jobs/RESET_PROBLEM_MESSAGES \
      -H "ServiceAuthorization: Bearer <s2s-token>" \
      -H "Content-Type: application/json"
    ```

18. **If CEH message is `PROCESSED` but task is still unconfigured in Camunda**: the problem is in the task-monitor. Manually trigger the INITIATION job with the time limit disabled:

    ```bash
    curl -X POST https://<task-monitor-host>/monitor/tasks/jobs \
      -H "ServiceAuthorization: Bearer <s2s-token>" \
      -H "Content-Type: application/json" \
      -d '{"job_details": {"name": "INITIATION"}}'
    ```

    If the task is older than 120 minutes, you must first set `INITIATION_TIME_LIMIT_FLAG=false` on the task-monitor pod or temporarily reduce `INITIATION_TIME_LIMIT` to cover the task's age.

19. **If the DLQ is blocking**: drain the DLQ first. In non-production, use the testing controller or Azure Service Bus Explorer to complete/remove poisonous messages. In production, complete or dead-letter the problematic messages via Azure Service Bus Explorer, then wait for `MessageReadinessConsumer` to promote pending `NEW` messages.

20. **If `INITIATION_CAMUNDA_MAX_RESULTS` (default 100) is too low**: during a backlog, only the first 100 unconfigured tasks are returned per INITIATION cycle. Increase via env var `INITIATION_CAMUNDA_MAX_RESULTS` or wait for subsequent cycles to pick up remaining tasks.

## 7. Diagnose message backlogs (burst scenarios)

<!-- CONFLUENCE-ONLY: not verified in source -->

21. If a service team (commonly IAC) produces a burst of thousands of CCD events in a short window, the CEH message table accumulates a large backlog. Normal daily volume is ~20-30K messages. The ordering query ensures correctness (per-case FIFO) but throughput is limited.

22. Check the backlog size:

    ```sql
    SELECT state, COUNT(*) FROM wa_case_event_messages
    WHERE received > NOW() - INTERVAL '24 hours'
    GROUP BY state;
    ```

    If `READY` count is in the thousands, expect multi-hour clearing time.

23. Identify if a single case or jurisdiction is dominating:

    ```sql
    SELECT case_id, COUNT(*) as msg_count
    FROM wa_case_event_messages
    WHERE state = 'READY'
    GROUP BY case_id
    ORDER BY msg_count DESC
    LIMIT 10;
    ```

24. The message retention in the `wa_case_event_messages` table is 90 days (~2.7M messages at steady state). Large backlogs compound the ordering query cost because the `NOT EXISTS` subqueries and `MIN(event_timestamp)` aggregation scan across all unprocessed rows.

25. An existing Azure alert fires when messages remain unprocessed for more than 2 hours. If you see this alert, it typically indicates either a DLQ blockage or a downstream service outage (Camunda, CCD, or wa-workflow-api).

## 8. Understand initiation concurrency

26. The `POST /task/{id}/initiation` endpoint in `wa-task-management-api` uses row-level locking on the `task_id` primary key in the CFT tasks table. If two INITIATION cycles attempt to initiate the same task concurrently, the second will receive a 409 Conflict (unique constraint violation on the tasks table).

27. The initiation transaction calls multiple external services (CCD for case data, Camunda Decision Engine for DMN configuration, Camunda API to update `cftTaskState`, and AM role-assignment-service for auto-assignment). In worst case, the lock can be held for up to ~1.5 minutes due to network timeouts and retries.

28. If you see 409 errors in the task-monitor INITIATION job report, these are generally safe to ignore — they indicate the task was already initiated by a concurrent request.

## Verify

- Re-query Camunda Cockpit for the process instance: `cftTaskState` should now be a value other than `unconfigured` (typically the task variable is removed or the process completes).
- Query `wa-task-management-api` for the task:

  ```bash
  curl -X POST https://<task-mgmt-host>/task \
    -H "Authorization: Bearer <idam-token>" \
    -H "ServiceAuthorization: Bearer <s2s-token>" \
    -H "Content-Type: application/json" \
    -d '{"search_parameters": [{"key": "caseId", "operator": "IN", "values": ["<case-id>"]}]}'
  ```

  The task should appear in the response with a state other than `unconfigured`.

- In Application Insights, confirm the next `GenericJobReport` for the INITIATION job no longer lists the task ID as a failure.

## See also

- [Case Event Handler](../explanation/case-event-handler.md) — how messages flow from ASB through CEH to Camunda, including the DLQ blocking mechanism
- [BPMN Workflows](../explanation/bpmn-workflows.md) — the INITIATION job's role in the BPMN process and task-monitor job configuration
- [Task States](../reference/task-states.md) — state machine reference including `UNCONFIGURED`, `UNPROCESSABLE`, and terminal states
- [Architecture](../explanation/architecture.md) — CronJob schedule overrides and alert conditions for stuck tasks
