---
title: Asynchronous Case-Event Messaging
topic: messaging
diataxis: explanation
product: ccd
audience: both
sources:
  - ccd-message-publisher:src/main/java/uk/gov/hmcts/ccd/config/SchedulingConfiguration.java
  - ccd-message-publisher:src/main/java/uk/gov/hmcts/ccd/config/MessagePublisherParams.java
  - ccd-message-publisher:src/main/java/uk/gov/hmcts/ccd/data/MessageQueueCandidateEntity.java
  - ccd-message-publisher:src/main/java/uk/gov/hmcts/ccd/data/MessageQueueCandidateRepository.java
  - ccd-message-publisher:src/main/java/uk/gov/hmcts/ccd/service/MessagePublisherRunnable.java
  - ccd-message-publisher:src/main/java/uk/gov/hmcts/ccd/controller/MessagePublisherLivenessHealthIndicator.java
  - ccd-message-publisher:src/main/java/uk/gov/hmcts/ccd/config/JacksonConfiguration.java
  - ccd-message-publisher:src/main/resources/application.yaml
  - ccd-message-publisher:src/main/resources/application-dev.yaml
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/CaseEventDefinition.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/CaseEventMessageService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/std/MessageInformation.java
  - ccd-data-store-api:src/main/resources/db/migration/V0001__Base_version.sql
  - ccd-message-publisher:src/main/java/uk/gov/hmcts/ccd/service/MessageProperties.java
  - ccd-message-publisher:src/main/java/uk/gov/hmcts/ccd/config/CcdMessageConverter.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/additionaldata/DataBlockGenerator.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/additionaldata/DefinitionBlockGenerator.java
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_MultiplePages/CaseEvent.json
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/PublishedEvent.java
examples_extracted_from:
  - apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_MultiplePages/CaseEvent.json
  - libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/PublishedEvent.java
status: reviewed
last_reviewed: "2026-05-29T00:00:00Z"
confluence:
  - id: "1460562062"
    title: "CCD Asynchronous Messaging LLD (WIP)"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1440503289"
    title: "Work Allocation Scope of Delivery"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1460561625"
    title: "Work Allocation Phase 2 Scope of Delivery"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1875854371"
    title: "Decentralised data persistence"
    last_modified: "2025-09-26"
    space: "RCCD"
confluence_checked_at: "2026-05-29T00:00:00Z"
---

# Asynchronous Case-Event Messaging

## TL;DR

- CCD case events are committed **synchronously** to the data store, then published **asynchronously** to Azure Service Bus. A slow or broken downstream consumer can never block or fail case progression.
- Publishing is **opt-in per event**: only when a `CaseEventDefinition` has `publish = true` does the data store write a row to the `message_queue_candidates` table.
- That write happens inside the **same transaction** as the audit-event INSERT — there is no transactional outbox listener; decoupling is achieved purely by a separate poller process.
- `ccd-message-publisher` (port 4456) is a standalone scheduler that polls `message_queue_candidates` every 10s (`*/10 * * * * *`), sends each row to JMS, then marks it published.
- Delivery is **at-least-once** — consumers must be idempotent (`EventInstanceId` is a natural dedup key). Per-case FIFO ordering comes from `JMSXGroupID = CaseId`; there is no global ordering. Filterable JMS properties (`jurisdiction_id`, `case_type_id`, `case_id`, `event_id`) are **snake_case** and omitted when absent.
- Which case fields ride along is configurable per field via `Publish` / `PublishAs`, surfacing under `AdditionalData` as paired `Data` (values) and `Definition` (type metadata) blocks.
- Dev mode uses an embedded in-memory ActiveMQ broker; production uses CCD's own Azure Service Bus namespace via `SERVICE_BUS_CONNECTION_STRING`. **Decentralised** case types reuse the same publisher and outbox pattern against the owning service's database.

## Why asynchronous

CCD has two distinct mechanisms for reacting to a case event:

- **Synchronous callbacks** run *inside* the event transaction (about-to-start, mid-event, about-to-submit, submitted — see [`callbacks.md`](callbacks.md)). A callback that errors or times out can fail the event and roll back the change. They are appropriate when the downstream logic must complete before the case progresses.
- **Asynchronous messaging** runs *after* the event has committed. The case data is already persisted; the message is published on a best-effort, retry-until-delivered basis. This is the right tool for downstream work that must not be on the critical path — most prominently work allocation (see [`work-allocation-integration.md`](work-allocation-integration.md)).

The design goal is that a downed consumer never affects case progression. If a service team asks "why didn't the work-allocation task fire?", the answer is almost always somewhere in this pipeline — not in the event transaction itself.

## Opting an event in to publishing

Publishing is gated on a single Boolean. `CaseEventDefinition` (in `ccd-data-store-api`) carries a `@JsonProperty("publish") private Boolean publish` field (`CaseEventDefinition.java:49-50`), populated from the imported case-type definition. The flag is **per-event**, not per-case-type — individual events on the same case type can be opted in or out independently.

During event creation, `CaseEventMessageService.handleMessage()` checks the flag:

```java
if (Boolean.TRUE.equals(messageContext.getCaseEventDefinition().getPublish())) {
    // serialise MessageInformation and INSERT into message_queue_candidates
}
```

(`CaseEventMessageService.java:41`.) Note the `Boolean.TRUE.equals(...)` guard: a `null` or `false` `publish` value writes nothing. Only an explicit `true` triggers a message.

The call sits inside `saveAuditEventForCaseDetails`, reached from `createCaseEvent` which is annotated `@Transactional(propagation = REQUIRES_NEW)` (`CreateCaseEventService.java:194`). So the INSERT into `message_queue_candidates` happens **within the same transaction as the audit-event write** (see [`audit-and-history.md`](audit-and-history.md)). There is no Spring transaction-event listener and no JMS code in the data store at all — the message is just a row in a table. The "post-commit" decoupling is achieved entirely by `ccd-message-publisher` running as a separate process that polls rows after they are committed.

This is the **Transactional Outbox Pattern** by name: the asynchronous-messaging LLD's stated design principle is that "if the Data Store fails to write to either the `case_event` or message-queue table then both inserts should be rolled back" — the candidate row and the audit event are committed atomically, so a candidate row exists if and only if the event was durably recorded. The publisher then reads committed rows out-of-band.

## Selective field publishing (`AdditionalData`)

Opting an event in (above) controls *whether* a message is sent. Two further definition columns — `Publish` and `PublishAs` on the **CaseEventToFields** and **EventToComplexTypes** tabs — control *which case fields* ride along in the message body, under `AdditionalData`.

<!-- CONFLUENCE-ONLY: the definition-import semantics of the Publish / PublishAs columns (Y/Yes/T/True/N/No/F/False vocabulary, COMPLEX-DisplayContext interaction, import-time validation) are documented in the WA LLDs but live in the definition store / import path, not in ccd-message-publisher or the data-store classes cited as this page's sources. -->

- **`Publish`** (`Text(40)`): one of `Y`/`Yes`/`T`/`True`/`N`/`No`/`F`/`False`/empty; empty defaults to *no*. Setting it on a field whose event is *not* publishable is silently ignored (no import error).
- **`PublishAs`** (`Text(70)`, nullable): if set, the field appears in `AdditionalData` under this alias instead of its field ID. Must be unique across both tabs for the case type. The alias is also surfaced via `originalId` in the definition block.
- A field marked `Publish` whose `DisplayContext` is `COMPLEX` is rejected at import — for complex fields the per-element publishing is configured in **EventToComplexTypes** instead.

`AdditionalData` has two sibling blocks (assembled by `DataBlockGenerator` / `DefinitionBlockGenerator` in the data store):

- **`Data`** — the selected field values. Type coercion happens here: `SimpleNumber` fields are emitted as JSON numbers, `SimpleBoolean` (`YesOrNo`) as `true`/`false`, dynamic lists as their full `{ value, list_items }` structure, complex/collection fields as nested objects/arrays; everything else is a string. A field's key is its `PublishAs` alias if set, else its field ID (or `ListElementCode` for complex-type elements).
- **`Definition`** — type metadata per published key: `{ originalId, type, subtype, typeDef }`. `type` is one of `SimpleText`, `SimpleNumber`, `SimpleDate`, `SimpleDateTime`, `SimpleBoolean`, `FixedList`, `FixedRadioList`, `MultiSelectList`, `DynamicList`, `DynamicRadioList`, `DynamicMultiSelectList`, `Complex`, `Collection`. `subtype` is the underlying CCD type name (`null` for `DynamicList`); `typeDef` is `null` for simple types and a nested definition block for `Complex`/`Collection`. Splitting data from definition lets subscribers that only need values skip the definition entirely and avoids duplicating type metadata across messages.

A `PublishAs` on an *element* inside a complex type promotes that element to a **top-level** key in `AdditionalData.Data`, in addition to (not instead of) its appearance nested inside the complex structure — so it can legitimately appear twice.

## The `message_queue_candidates` table

The candidate rows live in the **data store's** PostgreSQL database (`ccd_data`). The DDL is owned by data-store Flyway (`V0001__Base_version.sql:261-286`); `ccd-message-publisher` ships no Flyway of its own and assumes the table already exists.

| Column | Type | Meaning |
|---|---|---|
| `id` | `bigserial` PK | row identity |
| `message_type` | `varchar(70)` | discriminator; only value in use is `CASE_EVENT` |
| `time_stamp` | `timestamp` (default `now()`) | when the candidate was written; drives ordering |
| `published` | `timestamp` (nullable) | `NULL` until published; set by the publisher on success |
| `message_information` | `jsonb` | full serialised payload (see below) |

There is an index on `time_stamp`. The publisher connects to this database directly over JDBC via `DATA_STORE_DB_HOST` / `DATA_STORE_DB_PORT` / `DATA_STORE_DB_NAME` — there is no REST API between the two services.

## The payload

`message_information` is a JSON serialisation of `MessageInformation` (data-store). The publisher reads it opaquely as a `JsonNode` and forwards it unchanged as a JMS `BytesMessage`.

| JSON key | Type | Source |
|---|---|---|
| `UserId` | String | IDAM user ID |
| `JurisdictionId` | String | `caseDetails.getJurisdiction()` |
| `CaseTypeId` | String | `caseDetails.getCaseTypeId()` |
| `CaseId` | String | 16-digit case reference |
| `EventTimeStamp` | LocalDateTime | audit-event created date |
| `EventInstanceId` | Long | audit-event row ID — useful as a dedup key |
| `EventId` | String | the case-event definition ID |
| `PreviousStateId` | String | state before the event |
| `NewStateId` | String | state after the event |
| `AdditionalData` | object | `{ Data: {...}, Definition: {...} }` — selected case fields plus field-type metadata (see [Selective field publishing](#selective-field-publishing-additionaldata)) |

> `EventTimeStamp` is a `LocalDateTime` (`MessageInformation.java:22-23`) serialised without a timezone designator. Per ISO 8601 the absence of a trailing `Z` means it is **local time, not UTC** — a known CCD wart called out by the LLD reviewer. Consumers must not assume UTC.

Five values are promoted from the JSON body to **JMS string properties** so consumers can filter and route without deserialising the body. The mapping lives in the `MessageProperties` enum (`MessageProperties.java`), whose two columns are the **JSON source key** (camelCase) and the **emitted JMS property name** (snake_case, except `JMSXGroupID`):

| JMS property | JSON source key | Purpose |
|---|---|---|
| `jurisdiction_id` | `JurisdictionId` | filtering |
| `case_type_id` | `CaseTypeId` | filtering |
| `case_id` | `CaseId` | filtering |
| `event_id` | `EventId` | filtering |
| `JMSXGroupID` | `CaseId` | **session-based per-case FIFO ordering** |

<!-- DIVERGENCE: Confluence "Work Allocation Phase 2 Scope of Delivery" (RCCD 1460561625) and the data store both use camelCase for the *JSON body* keys, but an earlier draft of this page listed the JMS *property* names as camelCase (`JurisdictionId` etc.). MessageProperties.java:4-8 shows the JMS properties are snake_case (`jurisdiction_id`, `case_type_id`, `case_id`, `event_id`); only `JMSXGroupID` keeps its conventional name. The Phase 2 change log records this rename ("from camelCase to snake_case"). Source wins. -->

`JMSXGroupID` and `case_id` both read the JSON `CaseId` but write to different JMS properties. `JMSXGroupID` is what makes Azure Service Bus route all messages for a given case to the same session, giving session-aware consumers ordered, per-case delivery.

A property is **set only when its value is present**. `setProperties` skips a property when the JSON source key is absent, or when its text value is the string `"null"` (`MessagePublisherRunnable.java:76-85`). Subscribers using these properties for filtering must therefore tolerate messages where a property is missing — e.g. `PreviousStateId` is empty on a case-creation event, though that field is not itself promoted to a property.

> Wire-format quirk: `CcdMessageConverter` extends `MappingJackson2MessageConverter` targeting `BYTES` messages. For Qpid/AMQP it additionally sets the AMQP `content-type` annotation to `application/json`; ActiveMQ messages get no such annotation. The `_type` JMS property is set by Jackson convention to the concrete Java class passed to `convertAndSend` — here a `JsonNode`, **not** `MessageInformation` — so consumers must not rely on `_type` for deserialisation.

## The publisher scheduler

`SchedulingConfiguration implements SchedulingConfigurer`. For each enabled task in the bound `message-publisher.tasks` list, it registers a Spring `CronTask` wrapping a `MessagePublisherRunnable` (`SchedulingConfiguration.java:45-50`). The thread pool is sized to the number of enabled tasks (`SchedulingConfiguration.java:37-38`). Out of the box only one task is configured (`tasks[0]`, `CASE_EVENT`), though the design supports multiple message types and destinations.

Each tick:

1. Selects unpublished rows for the task's message type — `WHERE published IS NULL AND message_type = :messageType ORDER BY time_stamp ASC` (`MessageQueueCandidateRepository.java:17-20`). It uses `Slice` (not `Page`), so Spring Data issues no COUNT query; pagination is by `hasNext()`.
2. Sends each row to JMS and accumulates it.
3. Marks the accumulated rows `published` via `saveAll`.
4. Deletes already-published rows older than `published < now() - publishedRetentionDays` (default 7 days).

Defaults (all overridable; see config table below): schedule `*/10 * * * * *` (every 10s), batch size 1000 rows per tick.

## Delivery semantics

- **At-least-once.** A row is marked `published` only *after* a successful JMS send plus `saveAll`. If the JVM crashes between send and save, the row stays unpublished and is re-sent next tick. **Consumers must be idempotent** — `EventInstanceId` (the audit-event row ID) is a natural deduplication key.
- **A JMS failure stops the current tick.** `processUnpublishedMessages` is wrapped in try/catch (`MessagePublisherRunnable.java:51-58`). On any exception, processing halts for that tick; rows already sent are saved as published, and the failing row plus everything after it stay `published IS NULL` to be retried on the next tick. There is no exponential back-off and no dead-letter handling inside the publisher.
- **Per-case ordering, no global ordering.** Within a tick rows go out oldest-first (`time_stamp ASC`), and `JMSXGroupID = CaseId` gives session-aware consumers FIFO per case. There is no ordering guarantee across different cases.

## Liveness

`MessagePublisherLivenessHealthIndicator` queries for the oldest unpublished message and reports `BROKEN` if it is older than `ALLOWED_STALE_PERIOD` minutes (default 5) (`ccd-message-publisher/src/main/java/uk/gov/hmcts/ccd/controller/MessagePublisherLivenessHealthIndicator.java:56-68`). In Kubernetes this trips the liveness probe and restarts the pod if publishing gets stuck. Health is exposed at `GET /health` on port 4456.

## Dev vs production

Deployment detail (config, not in-source behaviour):

- **Production**: `spring.jms.servicebus.connection-string = ${SERVICE_BUS_CONNECTION_STRING}`. The `connectionFactory` bean is `@ConditionalOnProperty(spring.jms.servicebus.enabled)` and `spring-cloud-azure-starter-servicebus-jms` provides the AMQP 1.0 connection. `ActiveMQAutoConfiguration` is explicitly excluded in `application.yaml` so the Azure starter takes over. Destination set by `CCD_CASE_EVENTS_DESTINATION` (default `ccd-case-events`, a session-enabled topic). The broker is CCD's own Azure Service Bus namespace (`ccd-servicebus-<env>`, provisioned by `ccd-shared-infrastructure`); per the LLD it currently uses **public endpoints** over the (encrypted) public Internet — private endpoints (RDO-10105) and zone redundancy (DTSPO-484) are noted as outstanding. CCD owns the topic; work allocation was its first subscriber, and other subscribers attach with **SQL filters** on the message properties so they only receive the case types and events they need (a GDPR data-minimisation concern called out in the Phase 2 LLD).
- **Dev**: `SPRING_PROFILES_ACTIVE=dev` activates `application-dev.yaml`, which sets `spring.jms.servicebus.enabled: false` and an embedded in-memory ActiveMQ broker (`broker-url: vm://localhost?broker.persistent=false`, AMQP 1.0), clearing the auto-configure exclusion so ActiveMQ is re-enabled. A Hawtio console is available at `/hawtio` (dev only).

Key environment variables:

| Env var | Default | Purpose |
|---|---|---|
| `SERVICE_BUS_CONNECTION_STRING` | (required in prod) | Azure SB AMQP connection string |
| `CCD_CASE_EVENTS_DESTINATION` | `ccd-case-events` | topic/queue name |
| `CCD_CASE_EVENTS_MESSAGE_TYPE` | `CASE_EVENT` | must match data-store `MessageType` |
| `CCD_CASE_EVENTS_SCHEDULE` | `*/10 * * * * *` | poll cron (every 10s) |
| `CCD_CASE_EVENTS_BATCH_SIZE` | `1000` | rows per tick |
| `CCD_CASE_EVENTS_PUBLISHED_RETENTION_DAYS` | `7` | days to keep published rows |
| `CCD_CASE_EVENTS_ENABLED` | `true` | disable the task entirely |
| `ALLOWED_STALE_PERIOD` | `5` | minutes before liveness reports BROKEN |
| `DATA_STORE_DB_HOST` / `..._PORT` / `..._NAME` | `localhost` / `5452` / `ccd_data` | shared PG database |
| `SPRING_PROFILES_ACTIVE` | (unset = prod) | set `dev` for embedded ActiveMQ |

## Decentralised case types

Under [decentralised data persistence](decentralisation.md), the source of truth for a case's data moves out of the data store and into the owning service. Message publishing moves with it, but the mechanism is deliberately unchanged:

<!-- CONFLUENCE-ONLY: the decentralised publishing model is described in the "Decentralised data persistence" LLD (RCCD 1875854371); it is design-level and not yet fully reflected in the cited data-store source on this page. -->

- The decentralised service runs the **same Transactional Outbox Pattern**: when it persists a case event it inserts a row into **its own** `message_queue_candidates` table in the same atomic transaction.
- **`ccd-message-publisher` is reused as-is** — a decentralised service deploys its own instance pointed at its own database. There is no code fork; the publisher is database-agnostic and only needs JDBC access plus the Service Bus connection string.
- For decentralised case types the data store **suppresses** the `AboutToSubmit` and `Submitted` callbacks and delegates persistence via a single `POST /ccd-persistence/cases` call to the owning service, so the outbox insert happens in the service's transaction rather than CCD's. The at-least-once guarantee to downstream consumers (work allocation et al.) is preserved end-to-end.

## Downstream consumers

The destination is consumed by work allocation and other message-handler services (named generically in the publisher's README — it does not reference specific repos). The session-enabled topic plus `JMSXGroupID = CaseId` is specifically designed for session-aware consumers that need per-case FIFO. See [`work-allocation-integration.md`](work-allocation-integration.md) for how work allocation reacts to these events.

## Example

### JSON form — CaseEvent.json with `Publish` set

The `FT_MultiplePages` test case type has two events side-by-side: one opted in to publishing and one opted out, making it the clearest reference example in the test definitions.

```json
// apps/ccd/ccd-test-definitions/src/main/resources/uk/gov/hmcts/ccd/test_definitions/valid/BEFTA_MASTER/FT_MultiplePages/CaseEvent.json
[
  {
    "LiveFrom": "01/01/2017",
    "CaseTypeID": "FT_MultiplePages",
    "ID": "createCase",
    "Name": "Create a case",
    "DisplayOrder": 1,
    "PreConditionState(s)": "",
    "PostConditionState": "CaseCreated",
    "SecurityClassification": "Public",
    "ShowSummary": "Y",
    "Publish": "Y"
  },
  {
    "LiveFrom": "01/01/2017",
    "CaseTypeID": "FT_MultiplePages",
    "ID": "addExtraInfo",
    "Name": "Add Details",
    "DisplayOrder": 1,
    "PreConditionState(s)": "CaseCreated",
    "PostConditionState": "extraDetailsAdded",
    "SecurityClassification": "Public",
    "ShowSummary": "Y",
    "Publish": "N"
  }
]
```

`createCase` writes a row to `message_queue_candidates`; `addExtraInfo` does not. Any empty `Publish` column also means no message is written.

### config-generator form — SDK event with `.publishToCamunda()`

```java
// libs/ccd-config-generator/test-projects/e2e/src/main/java/uk/gov/hmcts/divorce/sow014/nfd/PublishedEvent.java
@Component
public class PublishedEvent implements CCDConfig<CaseData, State, UserRole> {

    @Override
    public void configure(final ConfigBuilder<CaseData, State, UserRole> configBuilder) {
        new PageBuilder(configBuilder
            .event(PublishedEvent.class.getSimpleName())
            .forAllStates()
            .name("Published Event")
            .description("Published Event")
            .publishToCamunda()          // sets Publish = Y in generated CaseEvent JSON
            .showEventNotes()
            .grant(CREATE_READ_UPDATE, CASE_WORKER, JUDGE)
            .grant(CREATE_READ_UPDATE_DELETE, SUPER_USER)
            .grantHistoryOnly(LEGAL_ADVISOR, JUDGE))
            .page("addCaseNotes")
            .pageLabel("Add case notes")
            .optional(CaseData::getNote);
    }
}
```

`.publishToCamunda()` is the SDK equivalent of `Publish: Y`. The generator emits it as `"Publish": "Y"` in the `CaseEvent.json` output.

## See also

- [`callbacks.md`](callbacks.md) — synchronous, in-transaction alternative that *can* fail the event
- [`event-model.md`](event-model.md) — where `CaseEventDefinition` and the `publish` flag come from
- [`audit-and-history.md`](audit-and-history.md) — the audit-event write that shares the transaction
- [`work-allocation-integration.md`](work-allocation-integration.md) — the primary downstream consumer
- [`decentralisation.md`](decentralisation.md) — how publishing moves into the owning service for decentralised case types
