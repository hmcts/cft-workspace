---
service: wa
ccd_based: true
ccd_config: json
ccd_features:
  - work_allocation_tasks
  - query_search
  - roles_access_management
integrations:
  - idam
  - s2s
  - am
  - flyway
repos:
  - apps/wa/wa-task-management-api
  - apps/wa/wa-workflow-api
  - apps/wa/wa-case-event-handler
  - apps/wa/wa-task-monitor
  - apps/wa/wa-task-batch-service
  - apps/wa/wa-message-cron-service
  - apps/wa/wa-ccd-definitions
  - apps/wa/wa-standalone-task-bpmn
  - apps/wa/wa-task-configuration-template
  - apps/wa/wa-reporting-frontend
  - apps/wa/wa-performance
  - apps/wa/wa-post-deployment-ft-tests
  - apps/wa/wa-shared-infrastructure
---

# Work Allocation (WA)

Work Allocation is the HMCTS platform that creates, routes, and manages caseworker tasks across all CFT services. It bridges CCD case events to Camunda BPMN/DMN workflows, storing tasks in its own PostgreSQL database and enforcing task access via role assignments from the Access Management service. Any jurisdiction that wants to drive task assignment off CCD events onboards by providing BPMN/DMN configurations and a WA CCD case type definition.

## Repos

- `apps/wa/wa-task-management-api` — core Spring Boot API (port 8087): CRUD for tasks, task search, task configuration, access control against AM role assignments; owns the `cft_task_db` PostgreSQL schema with Flyway migrations
- `apps/wa/wa-workflow-api` — Spring Boot API (port 8099): evaluates Camunda DMN task-configuration rules and correlates messages to Camunda BPMN processes to initiate, reconfigure, or cancel tasks; owns `wa_workflow_api` PostgreSQL schema with Flyway migrations
- `apps/wa/wa-case-event-handler` — Spring Boot service (port 8088): subscribes to the Azure Service Bus CCD case-events topic; routes messages to `wa-workflow-api` and `wa-task-management-api` to initiate/reconfigure/cancel tasks; owns `wa_case_event_messages_db` with Flyway migrations
- `apps/wa/wa-task-monitor` — Spring Boot service (port 8077): scheduled Camunda poller that detects unconfigured tasks and triggers configuration via `wa-task-management-api`; also runs maintenance jobs (termination, reconfiguration, clean-up)
- `apps/wa/wa-task-batch-service` — Node/TypeScript cron runner that fires batch jobs (e.g. INITIATION) by calling `wa-task-monitor`; exits after each invocation
- `apps/wa/wa-message-cron-service` — Node/TypeScript cron runner that triggers `FIND_PROBLEM_MESSAGES` jobs via `wa-case-event-handler`; exits after each invocation
- `apps/wa/wa-ccd-definitions` — JSON CCD case-type definitions for the WA test case type (`appeal`), including WorkBasket and SearchInput/Result configurations; used for local testing and onboarding reference
- `apps/wa/wa-standalone-task-bpmn` — Camunda BPMN files for the generic standalone task workflow; deployed to Camunda at environment setup
- `apps/wa/wa-task-configuration-template` — Camunda DMN task-configuration templates (Spring Boot app at port 4551); service teams derive their own DMN from this template
- `apps/wa/wa-reporting-frontend` — TypeScript/Express analytics dashboard (port 3100) rendering snapshot-backed task-management metrics in GOV.UK styles; uses IDAM OIDC for authentication
- `apps/wa/wa-performance` — Gatling performance tests targeting WA via XUI; uses a `common-performance` git submodule
- `apps/wa/wa-post-deployment-ft-tests` — Java functional test suite run as a post-deployment or nightly job; creates CCD cases and publishes ASB messages end-to-end
- `apps/wa/wa-shared-infrastructure` — Terraform/infrastructure repo defining shared Azure resources (Service Bus, Key Vault, Application Insights, alerts) used by all WA services

## Architecture

CCD case events are published to an Azure Service Bus topic (`ccd-case-events`). `wa-case-event-handler` consumes these via a session-based subscription, persists each message into its own PostgreSQL store (for deduplication and retry), and calls `wa-workflow-api` to evaluate relevant Camunda DMN rules and correlate messages to running BPMN process instances. The BPMN processes (held in `wa-standalone-task-bpmn` and deployed to a shared Camunda cluster) drive task lifecycle: initiation, configuration, cancellation.

`wa-task-management-api` is the authoritative task store. It serves task search and action endpoints to XUI (via the `xui_webapp` S2S service) and to other authorised services. Every request is checked against role assignments retrieved from `am-role-assignment-service` — only users whose roles grant the required permissions on the task can read, assign, or complete it. The task database uses PostgreSQL with Flyway migrations and supports a read replica for search load.

`wa-task-monitor` runs scheduled Camunda polls to detect tasks that are in an `Unconfigured` state (typically tasks that missed their initial configuration callback) and re-triggers configuration. It also runs periodic maintenance jobs: termination, reconfiguration (after `reconfigure_request_time_hours`), and Camunda clean-up in non-production environments.

The two cron services (`wa-task-batch-service`, `wa-message-cron-service`) are lightweight Node processes deployed as Kubernetes CronJobs. They authenticate with S2S, call their target service endpoint for one job, then exit. `wa-reporting-frontend` is an always-on Express app that reads from snapshot data and presents analytics dashboards; it is independent of the task write path.

## CCD touchpoints

`wa-ccd-definitions` holds the `appeal` (WA test) case type as JSON under `definitions/appeal/json/`, covering `CaseField`, `CaseEvent`, `AuthorisationCaseField`, `WorkBasketInputFields`, `WorkBasketResultFields`, `SearchInputFields`, and `SearchResultFields`. This is processed by the `ccd-definition-processor` Node tool (invoked via Yarn scripts) to generate environment-specific Excel files for upload to `ccd-definition-store-api`. Service teams consuming WA supply their own CCD definitions; the WA definitions here cover only the platform's own test/demo case type.

`wa-case-event-handler` is the primary CCD integration point: it receives case-event messages from the CCD Service Bus topic and calls `ccd-data-store-api` (via `core-case-data-store-client`) to fetch case details when processing messages. `wa-task-management-api` and `wa-task-monitor` also query `ccd-data-store-api` directly. All three services declare `core_case_data.api.url` in their `application.yaml` pointing to `ccd-data-store-api`.

WorkBasket and Search configurations in the CCD definitions expose WA tasks indirectly through the case UI. Task-level access is independently enforced by `wa-task-management-api` against AM role assignments — the CCD definition grants are separate from task permissions.

## External integrations

- `idam`: all Java services validate bearer tokens against IDAM JWKS (`/o/jwks`); `wa-reporting-frontend` uses OIDC with `@hmcts/nodejs-healthcheck`. System user credentials used by `wa-task-management-api` and `wa-task-monitor` to perform privileged operations.
- `s2s`: `service-auth-provider-java-client` present in `wa-task-management-api`, `wa-workflow-api`, `wa-case-event-handler`, and `wa-task-monitor`; Node cron services also acquire S2S tokens directly via `s2s-service.ts`.
- `am`: `wa-task-management-api` and `wa-task-monitor` call `am-role-assignment-service` (`role-assignment-service.url`) to evaluate task access permissions and retrieve role assignments.
- `flyway`: `wa-task-management-api` (Flyway plugin + `flyway-core`), `wa-workflow-api`, and `wa-case-event-handler` all manage their PostgreSQL schemas with Flyway. Each service owns a separate database/schema.

## Notable conventions and quirks

- `wa-case-event-handler` uses Azure Service Bus **session-based** subscriptions for ordered, per-case message processing. The `AZURE_SERVICE_BUS_DLQ_FEATURE_TOGGLE` flag enables/disables DLQ checking; functional tests set it to `false` and inject messages via `CaseEventHandlerTestingController` rather than via ASB.
- `wa-task-management-api` supports a **read replica** datasource (`datasource-replica`) for task search queries, configured via `POSTGRES_REPLICA_HOST`/`POSTGRES_REPLICA_PORT`. Logical replication must be enabled separately.
- All three Java API services integrate **LaunchDarkly** feature flags (`launchDarkly.sdkKey`) for runtime feature toggling.
- The allowed jurisdictions and case types for task management are configured as `config.allowedJurisdictions` and `config.allowedCaseTypes` in `wa-task-management-api`, covering IA, WA, SSCS, Civil, Public Law, Private Law, Employment, and ST CIC.
- Performance tests in `wa-performance` target WA through XUI and rely on a `common-performance` git submodule — run `git submodule update --init --recursive` before building.
- `wa-post-deployment-ft-tests` is configured to run hourly via `Jenkinsfile_nightly` cron (`0 * * * *`) and uses `withNightlyPipeline()` rather than a standard deployment pipeline.
