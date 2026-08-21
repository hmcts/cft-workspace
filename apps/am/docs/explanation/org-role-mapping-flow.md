---
title: Org Role Mapping Flow
topic: orm
diataxis: explanation
product: am
audience: both
sources:
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/CRDTopicConsumerNew.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/JRDTopicConsumerNew.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/TopicConsumer.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/BulkAssignmentOrchestrator.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RetrieveDataService.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RequestMappingService.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/JudicialBookingService.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/JudicialRefreshOrchestrator.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/helper/AssignmentRequestBuilder.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/JBSFeignClient.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/RASFeignClient.java
  - am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-judicial-office-holder-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
  - am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/QueryBookingController.java
  - am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/domain/service/common/PersistenceService.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RefreshOrchestrator.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/controller/testingsupport/OrgMappingController.java
  - am-org-role-mapping-service:src/main/resources/application.yaml
  - am-org-role-mapping-service:src/main/resources/db/migration/V1.1__init_tables.sql
  - am-role-assignment-refresh-batch:src/main/java/uk/gov/hmcts/reform/roleassignmentrefresh/domain/service/process/RefreshJobsOrchestrator.java
  - am-org-role-mapping-service:src/main/resources/validationrules/employment/employment-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/sscs/sscs-caseworker-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-admin-mapping.drl
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/constants/RoleAssignmentConstants.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/RoleAssignment.java
  - am-org-role-mapping-service:src/main/resources/validationrules/fr/fr-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/possessions/possessions-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/privatelaw/privatelaw-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/publiclaw/publiclaw-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/sscs/sscs-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/stcic/stcic-judicial-org-role-mapping.drl
  - am-judicial-booking-service:src/main/resources/db/migration/V1_1__init_tables.sql
  - am-role-assignment-batch-service:src/main/java/uk/gov/hmcts/reform/roleassignmentbatch/task/DeleteJudicialExpiredRecords.java
  - am-role-assignment-batch-service:src/main/resources/application.yaml
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/RoleAssignmentFilteringResult.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/matcher/RoleAttributeMatcher.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/matcher/LocationMatcher.java
  - rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.html
  - rpx-xui-webapp:src/booking/containers/utils/booking-error-handler.ts
  - rpx-xui-webapp:api/accessManagement/index.ts
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-caseworker-mapping.drl
  - apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-office-holder-mapping.drl
  - apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
  - apps/am/am-org-role-mapping-service/src/main/resources/db/migration/V1.1__init_tables.sql
confluence:
  - id: "1411088955"
    title: "LLD - Organisation Role Mapping Service"
    last_modified: "unknown"
    space: "AM"
  - id: "1464034704"
    title: "Solution Approach for Role Assignments Refresh through Org Role Mapping Service"
    last_modified: "unknown"
    space: "AM"
  - id: "1460539904"
    title: "End to end data flow scenarios for staff org role mapping"
    last_modified: "unknown"
    space: "AM"
  - id: "1507722499"
    title: "HLD - Judicial Booking Service - v1.2"
    last_modified: "unknown"
    space: "AM"
  - id: "1593576197"
    title: "AM applications feature flags"
    last_modified: "2026-08-01T00:00:00Z"
    space: "AM"
  - id: "1446904483"
    title: "Judicial Booking Mapping Rules"
    last_modified: "unknown"
    space: "AM"
confluence_checked_at: "2026-08-20T00:00:00Z"
sources_sha:
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/CRDTopicConsumerNew.java": "175b92db711bc975d09a26f5d9561b1577299667"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/JRDTopicConsumerNew.java": "175b92db711bc975d09a26f5d9561b1577299667"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/TopicConsumer.java": "175b92db711bc975d09a26f5d9561b1577299667"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/BulkAssignmentOrchestrator.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RetrieveDataService.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RequestMappingService.java": "fdc432dbe5badb633ba4e240bfc2fb2ec5453602"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/JudicialBookingService.java": "df884872022dce37def76a71025b1b22e19e2635"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/JudicialRefreshOrchestrator.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/helper/AssignmentRequestBuilder.java": "b829373f4c4976248de36658b4a273ae170700e0"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/JBSFeignClient.java": "5681b077bfb8793b7b037004a9aeddbdd4581904"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/RASFeignClient.java": "01f9d2badc46bb8aef815a44232129bdf3edbe47"
  "am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-judicial-office-holder-mapping.drl": "c15c7771f4f24dbfecdc81514fe9f16c2546ed6c"
  "am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl": "c15c7771f4f24dbfecdc81514fe9f16c2546ed6c"
  "am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/QueryBookingController.java": "3d9772cc831118b015b4a2ef2561e1d452d39706"
  "am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/domain/service/common/PersistenceService.java": "4d4775f50df14d17b3b3ad83dbebe86cd2716385"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RefreshOrchestrator.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/controller/testingsupport/OrgMappingController.java": "5a2bda0dc08a948ecd4f24815d25358b75b88b37"
  "am-org-role-mapping-service:src/main/resources/application.yaml": "fdc432dbe5badb633ba4e240bfc2fb2ec5453602"
  "am-org-role-mapping-service:src/main/resources/db/migration/V1.1__init_tables.sql": "4634ca2f2028547d964f2f1deb111816ffa5da75"
  ? "am-role-assignment-refresh-batch:src/main/java/uk/gov/hmcts/reform/roleassignmentrefresh/domain/service/process/RefreshJobsOrchestrator.java"
  : "7c1fd658b6c1687cdabce688b6d28759f39a7ccc"
  "am-org-role-mapping-service:src/main/resources/validationrules/employment/employment-judicial-org-role-mapping.drl": "433429a46f5af70c664e249f5bf84a62d2c3beea"
  "am-org-role-mapping-service:src/main/resources/validationrules/sscs/sscs-caseworker-mapping.drl": "42f6660e5ccd56ea7678591ee13c499abb8e978c"
  "am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-admin-mapping.drl": "c15c7771f4f24dbfecdc81514fe9f16c2546ed6c"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/constants/RoleAssignmentConstants.java": "7e4eb810bfd5adca1c0c9825960a6e1e5a9c8851"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/RoleAssignment.java": "715406f155892e160c4e197d54c7d6f4207a2322"
  "am-org-role-mapping-service:src/main/resources/validationrules/fr/fr-judicial-org-role-mapping.drl": "080b61f9e21bcf71d7ffef41b25dfe83dcdda889"
  "am-org-role-mapping-service:src/main/resources/validationrules/possessions/possessions-judicial-org-role-mapping.drl": "f2c71dea6e9fc93641f7c24ceb6123d73d392f68"
  "am-org-role-mapping-service:src/main/resources/validationrules/privatelaw/privatelaw-judicial-org-role-mapping.drl": "1b2ec64659c7e77fe685e5853be198d1ec32f25b"
  "am-org-role-mapping-service:src/main/resources/validationrules/publiclaw/publiclaw-judicial-org-role-mapping.drl": "fcdfb1cea50ee1d860963eead015847111abc007"
  "am-org-role-mapping-service:src/main/resources/validationrules/sscs/sscs-judicial-org-role-mapping.drl": "75b324acbae0da519899d031d9b31e4a1e33b3f0"
  "am-org-role-mapping-service:src/main/resources/validationrules/stcic/stcic-judicial-org-role-mapping.drl": "3ccbdde742b4e7b15a2e2fea1f2e8b0a0f3a8f54"
  "am-judicial-booking-service:src/main/resources/db/migration/V1_1__init_tables.sql": "910817b922d76c16f7c7a1cdf63105516b36b705"
  "am-role-assignment-batch-service:src/main/java/uk/gov/hmcts/reform/roleassignmentbatch/task/DeleteJudicialExpiredRecords.java": "85ab735f7b60e74650e8a27dc8c473a6a750722d"
  "am-role-assignment-batch-service:src/main/resources/application.yaml": "85ab735f7b60e74650e8a27dc8c473a6a750722d"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/RoleAssignmentFilteringResult.java": "3e6786db4c5df9e1646fa4fd67529a6a11acaaa0"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/matcher/RoleAttributeMatcher.java": "484119b15a8eacd34f30af868e363047f014cd40"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/matcher/LocationMatcher.java": "e6d5579f206077c006f9ca7999ffbecca9bc89f9"
  "rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.html": "0cc0e9a4686b861db394bcc009c4b6681b24badd"
  "rpx-xui-webapp:src/booking/containers/utils/booking-error-handler.ts": "1bb90ae55466b4ca3bf2b1df1b0ac19b6fa8cd20"
  "rpx-xui-webapp:api/accessManagement/index.ts": "ff76662ca439152d588ee2ff0e17025be3413fc7"
---

## TL;DR

- ORM (am-org-role-mapping-service) provisions organisational role assignments by translating user profiles from CRD/JRD into role assignments in RAS.
- The primary trigger is an Azure Service Bus message containing user IDs, published by CRD or JRD when a user profile changes.
- ORM fetches the full profile from CRD/JRD, flattens it into access profiles, runs jurisdiction-specific Drools rules, and POSTs the resulting role assignments to RAS with `replaceExisting=true`.
- Judicial fee-paid roles additionally require a `JudicialBooking` fact (from JBS) to be present in the Drools session — this provides `locationId`/`regionId` for location-scoped assignments.
- The Drools session is stateless: every execution inserts profiles, feature flags, and bookings fresh — nothing persists between evaluations.
- Fee-paid judiciary roles include a `bookable` attribute that signals ExUI to present the booking UI on login — this is how the self-serve booking workflow is triggered.

## End-to-end sequence

```mermaid
sequenceDiagram
    participant ASB as Azure Service Bus<br/>(CRD/JRD Topic)
    participant ORM as am-org-role-mapping-service
    participant CRD as CRD / JRD API
    participant JBS as am-judicial-booking-service
    participant Drools as Drools Engine<br/>(StatelessKieSession)
    participant RAS as am-role-assignment-service

    ASB->>ORM: Message (UserRequest: list of user IDs)
    ORM->>ORM: Deserialize & validate user IDs
    ORM->>CRD: Fetch profiles (POST /refdata/case-worker/users/fetchUsersById<br/>or POST /refdata/judicial/users)
    CRD-->>ORM: User profiles
    ORM->>ORM: Flatten profiles → access profiles
    alt Judicial user type & bookings enabled
        ORM->>JBS: POST /am/bookings/query (user IDs)
        JBS-->>ORM: Active bookings (endTime > now)
    end
    ORM->>Drools: Insert access profiles + feature flags + bookings
    Drools->>Drools: fireAllRules()
    Drools-->>ORM: Query "getRoleAssignments" → List<RoleAssignment>
    ORM->>RAS: POST /am/role-assignments<br/>(replaceExisting=true, process+reference=userId)
    RAS-->>ORM: 201 Created
    ORM->>ASB: messageContext.complete()
```

## Step 1: ASB message arrival

ORM subscribes to two Azure Service Bus topics — one for CRD and one for JRD. Each subscription is guarded by a separate feature toggle (`amqp.crd.enabled` / `amqp.jrd.enabled`, both driven by the `AMQP_ENABLED` env var).

- `CRDTopicConsumerNew` starts a `ServiceBusProcessorClient` via `CRDMessagingConfiguration` — `CRDTopicConsumerNew.java:29-40`.
- `JRDTopicConsumerNew` does the same for JRD — `JRDTopicConsumerNew.java:29-40`.
- Both delegate to `TopicConsumer.processMessage(messageContext, userType)` — `TopicConsumer.java:60-80`.

The message body is a `UserRequest` — essentially a JSON list of IDAM user IDs whose profiles changed. The receive mode is `PEEK_LOCK` with `disableAutoComplete()`, so acknowledgement only happens after successful processing (`messageContext.complete()` at `TopicConsumer.java:79`).

Retry is configured as 10 max retries, 1-minute fixed delay (`AmqpRetryMode.FIXED`) — `CRDMessagingConfiguration.java:68-72`.

<!-- DIVERGENCE: Confluence LLD (page 1411088955) says "4 delivery attempts, 5 minute delay between attempts, then dead letter queue", but CRDMessagingConfiguration.java:69-70 shows maxRetries=10, delay=1 minute, mode=FIXED. Source wins. -->

Error handling in `TopicConsumer.processError` distinguishes between unrecoverable errors (entity disabled/not found, unauthorized — logged as error), message lock lost, and service-busy (1-second back-off sleep) — `TopicConsumer.java:32-58`.

### Bypassing the topic: the testing-support entry point

The ASB message is the only *automatic* trigger, and in ephemeral environments — a PR preview namespace, for example — it never fires: nothing publishes CRD/JRD change events there. An ORM deployed in such an environment therefore sits idle until something invokes the mapping path directly.

`POST /am/testing-support/createOrgMapping?userType=CASEWORKER` does exactly that: it takes the same `UserRequest` body the topic would have delivered and calls straight into `BulkAssignmentOrchestrator`, synchronously. It is gated by `@ConditionalOnProperty(name = "testing.support.enabled")` (`OrgMappingController.java:35`), so it exists only where `TESTING_SUPPORT_ENABLED` is set — never in prod.

This is what preview-environment seeding scripts call. Note the same feature-flag rules still apply: with `ORM_ENV: pr`, only Drools rules whose `flag_config` row is enabled for the `pr` environment will fire, so a seeding call can succeed and still write nothing. See [Feature flag taxonomy](#feature-flag-taxonomy).

Whether an ephemeral environment needs its own ORM at all is a separate question — if the role assignments it depends on already exist in the RAS it reads from, it doesn't. See [How-to: Set Up WA in Preview → When ORM and RAS are actually needed](../../../wa/docs/how-to/set-up-wa-in-preview.md#when-orm-and-ras-are-actually-needed).

## Step 2: profile retrieval and flattening

`BulkAssignmentOrchestrator.createBulkAssignmentsRequest` drives the remaining flow (`BulkAssignmentOrchestrator.java:59-102`):

1. Validates the user ID list.
2. Calls `RetrieveDataService.retrieveProfiles(userRequest, userType)`, which invokes the appropriate Feign client.

**CRD path** — `POST /refdata/case-worker/users/fetchUsersById` returns `CaseWorkerProfile` objects. `AssignmentRequestBuilder.convertUserProfileToCaseworkerAccessProfile` creates one `CaseWorkerAccessProfile` per `role x workArea` (Cartesian product) — `AssignmentRequestBuilder.java:126-167`.

Key CRD mapping rules:
- Only the **primary** base location (`isPrimary=true`) is extracted as `primaryLocation` for the role assignment.
- **All** roles for a user are considered (the `isPrimary` flag on roles is ignored for mapping purposes).
- **All** work areas / service codes are considered when applying mapping rules.

**JRD path** — `POST /refdata/judicial/users` (with `page_size = sidamIds.size() * 5` to accommodate multiple appointments) returns `JudicialProfileV2` objects. `AssignmentRequestBuilder.convertProfileToJudicialAccessProfileV2` creates one `JudicialAccessProfile` per `appointment x serviceCode` — `AssignmentRequestBuilder.java:169-218`.

Both Feign clients use `@Retryable(maxAttempts=3, backoff=@Backoff(delay=500, multiplier=3))`.

## Step 3: Judicial Booking Service interaction

For judicial users, ORM optionally fetches active bookings from JBS. This is controlled by `refresh.BulkAssignment.includeJudicialBookings` (default depends on path):

- **ASB path**: controlled by the property above.
- **Judicial refresh endpoint** (`/am/role-mapping/judicial/refresh`): always fetches bookings — `JudicialRefreshOrchestrator.java:43-61`.

ORM calls `POST /am/bookings/query` with a `JudicialBookingRequest { queryRequest: { userIds: [...] } }` — `JBSFeignClient.java:21-22`.

JBS returns only non-expired bookings (`endTime > now()`) — `PersistenceService.java:27-29`. Each `JudicialBooking` carries `userId`, `locationId`, `regionId`, `beginTime`, and `endTime`.

If JBS is unavailable, the Feign fallback returns an empty list, and role mapping proceeds without location context — fee-paid roles will simply not be created.

## Step 4: Drools rule evaluation

`RequestMappingService.getRoleAssignments` executes the mapping rules — `RequestMappingService.java:186-214`:

1. Collects all access profile objects into a flat set.
2. Builds a Drools batch command that inserts: access profiles, `List<FeatureFlag>` (from the `flag_config` DB table), and `List<JudicialBooking>`.
3. Calls `kieSession.execute(commands)` — the session is `StatelessKieSession`, so every execution starts from scratch (`DroolConfig.java:22-25`).
4. After `fireAllRules()`, runs the query `getRoleAssignments` to extract all `RoleAssignment` facts from working memory.
5. Deduplicates the resulting list.

### Caseworker mapping (single-stage)

Rules directly match `CaseWorkerAccessProfile` (checking `roleId`, `serviceCode`, `!suspended`, plus optional `taskSupervisorFlag` / `caseAllocatorFlag`) and insert a `RoleAssignment`. Example: `v1_4_civil_senior_tribunal_caseworker_org_role` — `civil-caseworker-mapping.drl:22-45`.

### Judicial mapping (two-stage)

**Stage 1** (`{jur}-judicial-office-holder-mapping.drl`): Rules match `JudicialAccessProfile` (from JRD) + `FeatureFlag` and insert a `JudicialOfficeHolder` intermediate fact with an `office` string (e.g. `"CIVIL Circuit Judge-Salaried"`). Example: `civil_circuit_judge_salaried_joh` — `civil-judicial-office-holder-mapping.drl:31-53`.

**Stage 2** (`{jur}-judicial-org-role-mapping.drl`): Rules match `JudicialOfficeHolder.office` and insert a final `RoleAssignment`.

- **Salaried roles** do not require a booking — they fire based on the office-holder fact alone.
- **Fee-paid roles** additionally require `$bk: JudicialBooking(userId == $joh.userId)` to be present. The booking provides `locationId` and `regionId` for the role assignment attributes — `civil-judicial-org-role-mapping.drl:100-135`.

```mermaid
flowchart LR
    A[JudicialAccessProfile] -->|Stage 1 rule| B[JudicialOfficeHolder]
    B -->|Stage 2 rule<br/>salaried| C[RoleAssignment]
    B -->|Stage 2 rule<br/>fee-paid| D{JudicialBooking exists?}
    D -->|Yes| E[RoleAssignment<br/>with location]
    D -->|No| F[No role created]
```

### Feature flag guards

Every rule begins with `$f: FeatureFlag(status && flagName == FeatureFlagEnum.XYZ.getValue())`. Flags are stored in the `flag_config` Postgres table and cached in a `ConcurrentHashMap` on startup. In production the cache is used; in other environments flags are re-read per execution — `RequestMappingService.java:221-239`.

### Suspended and soft-deleted users

- If `CaseWorkerAccessProfile.suspended = true`, rules do not fire (the `!suspended` constraint blocks them). The empty result set is still sent to RAS, which deletes the user's existing assignments — `RequestMappingService.java:130-142`.
- JRD users with `deletedFlag=true` are similarly given an empty set when `refresh.judicial.filterSoftDeletedUsers=true` — `RetrieveDataService.java:206-214`.

## Step 5: RAS persistence

`RequestMappingService.updateRoleAssignments` sends `POST /am/role-assignments` with:

- `requestType = CREATE`
- `replaceExisting = true`
- `process = "staff-organisational-role-mapping"` (or `"judicial-organisational-role-mapping"`)
- `reference = userId`

RAS atomically replaces all existing role assignments for that `process + reference` pair — `RequestMappingService.java:292-305`. This means ORM never appends; it always provides the full current set.

HTTP 201 = success. Any other status is counted as a failure.

### Role assignment request structure

The complete `AssignmentRequest` sent to RAS includes — `RequestMappingService.java:293-306`:

| Field | Value |
|-------|-------|
| `request.requestType` | `CREATE` |
| `request.replaceExisting` | `true` |
| `request.process` | `staff-organisational-role-mapping` or `judicial-organisational-role-mapping` |
| `request.reference` | User's IDAM ID |
| `request.assignerId` | System account UUID (from `securityUtils.getUserId()`) |
| `request.clientId` | `am-org-role-mapping-service` |
| `request.correlationId` | Random UUID per request |

Each `RoleAssignment` in `requestedRoles` carries:

| Attribute | Staff | Judicial |
|-----------|-------|----------|
| `actorIdType` | IDAM | IDAM |
| `roleType` | ORGANISATION | ORGANISATION |
| `grantType` | STANDARD | STANDARD |
| `classification` | Per mapping rule | Per mapping rule |
| `roleCategory` | Per mapping rule (e.g. `LEGAL_OPERATIONS`, `ADMIN`) | Per mapping rule (e.g. `JUDICIAL`) |
| `beginTime` | Not set | `$joh.getBeginTime()` — appointment start |
| `endTime` | Not set | `$joh.getEndTime()` **plus one day** |
| `attributes.jurisdiction` | Rule literal (e.g. `"SSCS"`) | Rule literal (e.g. `Jurisdiction.EMPLOYMENT.getName()`) |
| `attributes.primaryLocation` | ePIMMS ID from `$cap.getPrimaryLocationId()` | ePIMMS ID from `$joh.getPrimaryLocation()` |
| `attributes.region` | `$cap.getRegionId()` | `$joh.getRegionId()`, or `$bk.getRegionId()` on booking-derived rules |
| `attributes.contractType` | Not set | `Salaried`, `Fee-Paid` or `Voluntary` |
| `authorisations` | `$cap.getSkillCodes()` on most jurisdictions | `$joh.getTicketCodes()` |

The `jurisdiction` attribute is a constant written into each rule's consequence, not derived from the profile — a judicial rule in `employment/` writes `Jurisdiction.EMPLOYMENT.getName()` and an SSCS staff rule writes the string `"SSCS"` (`employment-judicial-org-role-mapping.drl:81`, `sscs-caseworker-mapping.drl:22-45`). That is why a rule file lives under a per-jurisdiction directory: the directory, not the reference data, decides the jurisdiction the assignment is scoped to.

Judicial `endTime` is the appointment end date shifted forward by one day — `.endTime($joh.getEndTime() != null ? $joh.getEndTime().plusDays(1) : null)` (`employment-judicial-org-role-mapping.drl:95`). A judge whose appointment ends on the 30th keeps access through the whole of the 30th rather than losing it at midnight on the 29th/30th boundary. When JRD supplies no end date the assignment is open-ended.

`contractType` takes one of exactly three literals — `Salaried`, `Fee-Paid`, `Voluntary` (`RoleAssignmentConstants.java:33-35`). Rules that write it use those constants, so `Fee-Paid` (hyphenated, mixed case) is the string a consumer must match on.

`authorisations` is a top-level `List<String>` on the assignment, not a comma-separated attribute (`RoleAssignment.java:42`). Staff rules do populate it, from CRD skill codes — `.authorisations($cap.getSkillCodes())` in `civil-admin-mapping.drl:69` and in the civil, fr, iac, possessions, privatelaw, probate and publiclaw rule files. The employment, sscs, stcic and hrs staff files leave it unset, so whether a caseworker assignment carries authorisations depends on the jurisdiction that wrote the rule.

<!-- DIVERGENCE: Confluence describes staff assignments as having no region, no contractType and no authorisations, and judicial jurisdiction as being derived from authorisations. In source staff rules set region from the CRD profile and most set authorisations from CRD skill codes, and jurisdiction is a per-rule literal on both paths. Source wins. -->

### Attribute matching semantics

When CCD evaluates role assignments against case data, **all** matchers must pass for the assignment to survive filtering — `hasPassedFiltering()` requires every filter result to be `TRUE`, and an assignment with no filter results at all is discarded (`ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedataaccesscontrol/RoleAssignmentFilteringResult.java:24-29`).

An unset attribute matches everything. Each matcher funnels through `isValuesMatching`, which returns `true` when the role assignment's value is absent and only compares strings when it is present (`ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/casedataaccesscontrol/matcher/RoleAttributeMatcher.java:30-36`). Setting an attribute therefore narrows access and never widens it: a senior judicial role that should carry regional rather than court-level responsibility must leave `location` unset, because setting it restricts the role to cases whose `caseManagementLocation.baseLocation` equals that one value (`LocationMatcher.java:26,36-38`).

## Multi-region cloning

Some jurisdictions (civil, publiclaw, sscs) require one role assignment per region (England/Wales regions 1-7). Rules call `cloneNewRoleAssignmentAndChangeRegion(ra, regionId)` to produce multiple assignments from a single match — `civil-judicial-org-role-mapping.drl:169-176`.

## The `bookable` attribute and ExUI booking UI

Fee-paid judicial role assignments carry a `bookable` attribute. Seven jurisdictions write it — `civil-judicial-org-role-mapping.drl:353` and `:387`, `fr-judicial-org-role-mapping.drl:150`, `possessions-judicial-org-role-mapping.drl:75`, `privatelaw-judicial-org-role-mapping.drl:245`, `publiclaw-judicial-org-role-mapping.drl:325`, `sscs-judicial-org-role-mapping.drl:474` and `stcic-judicial-org-role-mapping.drl:374`. Every one writes the JSON **string** `"true"`, not a boolean, so a consumer testing for a boolean will not see the flag.

**How it works:**

1. If a user in the `JUDICIAL` role category has any role assignment with `bookable` set, ExUI redirects to the booking journey on login. See [Judicial booking](judicial-booking.md) for the guard and the string/boolean handling.
2. The page is headed "Work access" and offers three radio options: "Choose an existing booking", "Create a new booking", and "View tasks and cases" — `rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.html:5`, `:23`, `:71`, `:83`. The third option is not a plain skip; it routes the judge to their task and case lists without changing their bookings.
3. Choosing or creating a booking makes ExUI call ORM's `POST /am/role-mapping/judicial/refresh` through the `refreshRoleAssignments` proxy, which recalculates that judge's organisational roles with the booking in scope — `rpx-xui-webapp:api/accessManagement/index.ts:36-85`.

Booking creation and the follow-up refresh fail down separate paths. A failed create sends the judge to `/not-authorised`, `/service-down` or `/booking-service-down` by status code; a failed refresh always sends them to `/refresh-booking-service-down` (`rpx-xui-webapp:src/booking/containers/utils/booking-error-handler.ts:13-35`). The second case leaves a stored booking with no role assignments derived from it.

**Booking data model** (`am-judicial-booking-service:src/main/resources/db/migration/V1_1__init_tables.sql:1-9`):

| Column | Description |
|--------|-------------|
| `id` | `uuid`, primary key |
| `user_id` | IDAM ID |
| `region_id` | Location reference data region ID |
| `location_id` | ePIMMS ID |
| `begin_time` | Start of the booking window |
| `end_time` | End of the booking window |
| `created` | Row creation timestamp |

The table stores timestamps, not dates: the half-open interval is baked into the stored `end_time` rather than applied when the role assignment is derived.

Bookings are held for two years and then deleted. `am-role-assignment-batch-service` runs a nightly `DELETE from booking b where b.end_time < (current_date - ?) + '00:00:00'::time` with the retention window taken from `days: ${DAYS:730}` — `DeleteJudicialExpiredRecords.java:103-107` and `am-role-assignment-batch-service:src/main/resources/application.yaml:45`.

## Batch refresh path

Beyond the ASB-driven path, `am-role-assignment-refresh-batch` triggers a full re-evaluation. This is needed when Drools rules change — it re-applies the new rules to all existing users for a jurisdiction. The process involves three components:

### 1. Refresh batch job (`am-role-assignment-refresh-batch`)

A Spring Batch Kubernetes CronJob — `RefreshJobsOrchestrator.java`:

1. Queries the ORM database for `refresh_jobs` records with `status = 'NEW'`.
2. For each job, calls ORM `POST /am/role-mapping/refresh?jobId={id}` (with optional `UserRequest` body if retrying specific users via `linked_job_id`).
3. Expects HTTP 202 from ORM (async processing).
4. Delays between jobs (configurable via `refresh-job-delay-duration`) to avoid overwhelming reference data APIs.
5. After all jobs complete, calls RAS user-count API (before and after) and sends a **comparison email** showing per-jurisdiction, per-role count differences.

Only `am_org_role_mapping_service` and `am_role_assignment_refresh_batch` are authorised S2S callers of the refresh endpoint — `application.yaml:172`.

### 2. ORM refresh endpoint (`POST /am/role-mapping/refresh`)

`RefreshOrchestrator.java` — processes asynchronously via `@Async`:

1. Validates the `jobId` and checks `refresh_jobs.status == 'NEW'`.
2. If `UserRequest` body contains user IDs: fetches profiles for those specific users.
3. If no user IDs: paginates through CRD via `GET /refdata/internal/staff/usersByServiceName` (page size configurable via `REFRESH_JOB_PAGE_SIZE`, default 400).
4. For judicial refreshes with `includeJudicialBookings=true`: fetches bookings in batches.
5. Applies Drools rules and POSTs results to RAS for each user.
6. On completion: updates `refresh_jobs.status` to `COMPLETED` (all success) or `ABORTED` (partial failure, storing failed user IDs in `user_ids` column).

### 3. The `refresh_jobs` table

| Column | Type | Description |
|--------|------|-------------|
| `job_id` | Bigint (PK, auto-seq) | Unique job identifier |
| `role_category` | Text | `JUDICIAL` or `LEGAL_OPERATIONS` |
| `jurisdiction` | Text | e.g. `IA`, `CIVIL`, `SSCS`, or `ALL` |
| `status` | Text | `NEW`, `COMPLETED`, or `ABORTED` |
| `user_ids` | Text[] | Failed user IDs (for retry) |
| `comments` | Text | Rule change details |
| `log` | Text | Error messages |
| `linked_job_id` | Bigint | Previous failed job to retry |
| `created` | Timestamp | Job creation/update time |

Jobs are created manually (typically by inserting a row with `status=NEW`) ahead of a scheduled batch run. The `linked_job_id` mechanism allows automatic retry of failed users: the batch job creates a new entry pointing at the failed job and copies its `user_ids`.

### 4. Judicial refresh endpoint (`POST /am/role-mapping/judicial/refresh`)

This is **synchronous** (no `refresh_jobs` table involvement) and always fetches bookings — `JudicialRefreshOrchestrator.java:43-61`. It is called by ExUI when a judge creates or continues a booking, ensuring role assignments are immediately recalculated.

## Feature flag taxonomy

ORM uses two types of feature flags:

**DB flags** (stored in `flag_config` table, per-environment): follow the naming convention `{service}_{wa|hearing}_{major}_{minor}`. Examples:
- `civil_wa_1_0` through `civil_wa_2_5` — Civil work allocation roles, incrementally added
- `sscs_hearing_1_0` — SSCS hearing-specific roles
- `employment_wa_1_0` through `employment_wa_1_5`, then `employment_wa_3_0` — Employment Tribunal (there is no `2_x`)
- `iac_jrd_1_0`, `iac_jrd_1_1` — IAC judicial reference data integration

Each flag version typically corresponds to a new set of Drools rules being enabled for that jurisdiction. Flags are toggled independently per environment (preview, demo, aat, perftest, ithc, prod).

**LaunchDarkly flags** (external service): used for infrastructure-level toggles:
- `orm-jrd-org-role` — toggles consumption of JRD judge user IDs from ASB
- `orm-refresh-role` — enables the org role refresh functionality
- `orm-refresh-job-enable` — enables refresh job execution
- `jbs-query-bookings-api-flag` — toggles JBS query bookings API
- `jbs-create-bookings-api-flag` — toggles JBS create bookings API

The full DB-flag inventory, derived by replaying the `flag_config` migrations, is in
[ORM API reference → Feature flags](../reference/api-org-role-mapping.md#feature-flags).
The LD flag purposes above come from the "AM applications feature flags" Confluence page
(ID 1593576197); no LD flag key appears in ORM source.

## Key configuration

| Property | Env var | Default | Purpose |
|----------|---------|---------|---------|
| `amqp.crd.enabled` | `AMQP_ENABLED` | — | Enable CRD topic subscription |
| `amqp.jrd.enabled` | `AMQP_ENABLED` | — | Enable JRD topic subscription |
| `feign.client.config.crdclient.url` | `CASE_WORKER_REF_APP_URL` | `http://localhost:8095` | CRD API base URL |
| `feign.client.config.jrdClient.url` | `JUDICIAL_REF_APP_URL` | `http://localhost:8091` | JRD API base URL |
| `feign.client.config.jbsClient.url` | `JUDICIAL_BOOKING_APP_URL` | `http://localhost:4097` | JBS base URL |
| `feign.client.config.roleAssignmentApp.url` | `ROLE_ASSIGNMENT_APP_URL` | `http://localhost:4096` | RAS base URL |
| `refresh.BulkAssignment.includeJudicialBookings` | `REFRESH_BULK_ASSIGNMENT_INCLUDE_BOOKINGS` | `false` | Fetch bookings in ASB path |
| `refresh.Job.includeJudicialBookings` | `REFRESH_JOB_INCLUDE_BOOKINGS` | `false` | Fetch bookings in batch refresh |
| `refresh.Job.pageSize` | `REFRESH_JOB_PAGE_SIZE` | `400` | Pagination for batch refresh |
| `refresh.Job.sortDirection` | `REFRESH_JOB_SORT_DIR` | `ASC` | Sort direction for CRD pagination |
| `refresh.Job.sortColumn` | `REFRESH_JOB_SORT_COL` | (empty) | Sort column for CRD pagination |
| `refresh.Job.authorisedServices` | — | `am_org_role_mapping_service,am_role_assignment_refresh_batch` | S2S callers allowed to invoke refresh |
| `refresh.judicial.filterSoftDeletedUsers` | `REFRESH_JUDICIAL_FILTER_SOFT_DELETED_USERS` | `false` | Filter out soft-deleted JRD users |

## Examples

### Caseworker mapping rule — Civil senior tribunal caseworker (real source)

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-caseworker-mapping.drl
rule "v1_4_civil_senior_tribunal_caseworker_org_role"
when
  $f:  FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_1_4.getValue())
  $cap: CaseWorkerAccessProfile(roleId == "1", serviceCode in ("AAA6", "AAA7"), !suspended)
then
   Map<String,JsonNode> attribute = new HashMap<>();
   attribute.put("jurisdiction", JacksonUtils.convertObjectIntoJsonNode("CIVIL"));
   attribute.put("primaryLocation", JacksonUtils.convertObjectIntoJsonNode($cap.getPrimaryLocationId()));
   attribute.put("workTypes", JacksonUtils.convertObjectIntoJsonNode("decision_making_work,access_requests"));
  insert(
      RoleAssignment.builder()
      .actorIdType(ActorIdType.IDAM)
      .actorId($cap.getId())
      .roleCategory(RoleCategory.LEGAL_OPERATIONS)
      .roleType(RoleType.ORGANISATION)
      .roleName("senior-tribunal-caseworker")
      .grantType(GrantType.STANDARD)
      .classification(Classification.PUBLIC)
      .readOnly(false)
      .attributes(attribute)
      .authorisations($cap.getSkillCodes())
      .build());
      logMsg("Rule : v1_4_civil_senior_tribunal_caseworker_org_role");
end;
```

### Stage 1 judicial mapping — Civil circuit judge salaried (real source)

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-office-holder-mapping.drl
rule "civil_circuit_judge_salaried_joh"
when
   $f:  FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_1_0.getValue())
   $jap: JudicialAccessProfile(appointment == "Circuit Judge",
                               appointmentType in ("Salaried", "SPTW"),
                               (endTime == null || endTime.compareTo(ZonedDateTime.now()) >= 0),
                               (validateAuthorisation(authorisations, "AAA6") || validateAuthorisation(authorisations, "AAA7")))
then
  insert(
      JudicialOfficeHolder.builder()
      .userId($jap.getUserId())
      .office("CIVIL Circuit Judge-Salaried")
      .jurisdiction("CIVIL")
      .ticketCodes($jap.getTicketCodes())
      .beginTime($jap.getBeginTime())
      .endTime($jap.getEndTime())
      .regionId($jap.getRegionId())
      .baseLocationId($jap.getBaseLocationId())
      .primaryLocation($jap.getPrimaryLocationId())
      .contractType($jap.getAppointmentType())
      .build());
      logMsg("Rule : civil_circuit_judge_salaried_joh");
end;
```

### Stage 2 judicial mapping — Civil district judge salaried (real source)

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
rule "civil_district_judge_org_role"
when
  $f:  FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_2_1.getValue())
  $joh: JudicialOfficeHolder(office == "CIVIL District Judge-Salaried")
then
   Map<String,JsonNode> attribute = new HashMap<>();
   attribute.put("contractType", JacksonUtils.convertObjectIntoJsonNode("Salaried"));
   attribute.put("jurisdiction", JacksonUtils.convertObjectIntoJsonNode("CIVIL"));
   attribute.put("primaryLocation", JacksonUtils.convertObjectIntoJsonNode($joh.getPrimaryLocation()));
   attribute.put("region", JacksonUtils.convertObjectIntoJsonNode($joh.getRegionId()));
   attribute.put("workTypes", JacksonUtils.convertObjectIntoJsonNode("decision_making_work,applications," +
                                                                     "multi_track_decision_making_work," +
                                                                     "intermediate_track_decision_making_work"));
  insert(
      RoleAssignment.builder()
      .actorIdType(ActorIdType.IDAM)
      .actorId($joh.getUserId())
      .roleCategory(RoleCategory.JUDICIAL)
      .roleType(RoleType.ORGANISATION)
      .roleName("district-judge")
      .grantType(GrantType.STANDARD)
      .classification(Classification.PUBLIC)
      .readOnly(false)
      .beginTime($joh.getBeginTime())
      .endTime($joh.getEndTime() !=null ? $joh.getEndTime().plusDays(1):null)
      .attributes(attribute)
      .authorisations($joh.getTicketCodes())
      .build());
      logMsg("Rule : civil_district_judge_org_role");
end;
```

### refresh_jobs table schema (real source)

The refresh batch reads from this table to find jobs to dispatch to ORM.

```sql
// Source: apps/am/am-org-role-mapping-service/src/main/resources/db/migration/V1.1__init_tables.sql
create table refresh_jobs(
    job_id bigint not null,
    role_category text not null,
    jurisdiction text not null,
    status text not null,
    comments text,
    user_ids _text NULL,
    log text,
    linked_job_id bigint,
    created timestamp,
    constraint refresh_jobs_pkey PRIMARY KEY (job_id)
);

create sequence JOB_ID_SEQ;
ALTER TABLE refresh_jobs ALTER COLUMN job_id
SET DEFAULT nextval('JOB_ID_SEQ');
```

## See also

- [Drools Rules](drools-rules.md) — detailed explanation of ORM mapping rule structure, fact types, and feature flag patterns
- [Judicial Booking](judicial-booking.md) — how JBS bookings interact with fee-paid judicial role mapping
- [Batch Jobs](batch-jobs.md) — the refresh batch CronJob that triggers ORM re-evaluation after rule changes
- [ORM API Reference](../reference/api-org-role-mapping.md) — endpoint reference for the refresh and judicial-refresh APIs
- [Write Drools Mapping Rules](../how-to/write-drools-mapping-rules.md) — how to add new jurisdiction mapping rules to ORM
