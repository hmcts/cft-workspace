---
title: Architecture
topic: architecture
diataxis: explanation
product: am
audience: both
sources:
  - am-role-assignment-service:src/main/resources/application.yaml
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/controller/endpoints/CreateAssignmentController.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/service/common/ValidationModelService.java
  - am-role-assignment-service:src/main/resources/validationrules/core/organisational-role-mapping-common.drl
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/enums/RoleCategory.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/enums/GrantType.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/enums/Classification.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/CRDTopicConsumerNew.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/JRDTopicConsumerNew.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/RASFeignClient.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/JBSFeignClient.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RequestMappingService.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/config/servicebus/CRDMessagingConfiguration.java
  - am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/CreateBookingController.java
  - am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/QueryBookingController.java
  - am-judicial-booking-service:src/main/resources/db/migration/V1_1__init_tables.sql
  - am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/DeleteBookingController.java
  - am-role-assignment-service:src/main/resources/db/migration/V1_6__adding_new_indexes.sql
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/service/common/ParseRequestService.java
  - am-role-assignment-service:charts/am-role-assignment-service/values.yaml
  - am-role-assignment-service:charts/am-role-assignment-service/values.aat.template.yaml
  - am-role-assignment-service:charts/am-role-assignment-service/values.preview.template.yaml
  - am-role-assignment-batch-service:src/main/java/uk/gov/hmcts/reform/roleassignmentbatch/task/DeleteJudicialExpiredRecords.java
  - am-role-assignment-batch-service:src/main/resources/application.yaml
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/constants/RoleAssignmentConstants.java
  - am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/apihelper/Constants.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RefreshOrchestrator.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/controller/RefreshController.java
  - am-org-role-mapping-service:src/main/resources/db/migration/V1.1__init_tables.sql
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedataaccesscontrol/RoleAssignmentAttributesResource.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/role/entities/RoleAssignmentForSearch.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/role/entities/RoleAttributeDefinition.java
  - rpx-xui-webapp:src/app/app-utils.ts
  - rpx-xui-webapp:src/app/components/routing/application-routing.component.ts
  - rpx-xui-webapp:src/booking/guards/booking-guard.ts
  - rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.html
  - rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.ts
  - rpx-xui-webapp:src/booking/containers/booking-check/booking-check.component.ts
  - rpx-xui-webapp:src/booking/containers/booking-wrapper/booking-wrapper.component.ts
  - rpx-xui-webapp:src/booking/containers/utils/booking-error-handler.ts
  - rpx-xui-webapp:api/accessManagement/index.ts
  - cnp-flux-config:apps/am/am-role-assignment-service/prod.yaml
  - cnp-flux-config:apps/am/am-role-assignment-batch-service/prod.yaml
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1491643419"
    title: "HLD - Role Assignment Service - v1.3"
    last_modified: "2021-04-26T00:00:00Z"
    space: "AM"
  - id: "1385792545"
    title: "LLD - Role Assignment Service"
    last_modified: "2021-02-28T00:00:00Z"
    space: "AM"
  - id: "1411088955"
    title: "LLD - Organisation Role Mapping Service"
    last_modified: "2021-12-01T00:00:00Z"
    space: "AM"
  - id: "1507722499"
    title: "HLD - Judicial Booking Service - v1.2"
    last_modified: "2021-07-26T00:00:00Z"
    space: "AM"
  - id: "1386808483"
    title: "POST /am/role-assignments"
    last_modified: "2021-01-28T00:00:00Z"
    space: "AM"
  - id: "1549244580"
    title: "Introduction - Role Assignment Services (RAS) 2.0 & 2.1"
    last_modified: "2021-09-01T00:00:00Z"
    space: "AM"
confluence_checked_at: "2026-05-13T00:00:00Z"
sources_sha:
  "am-role-assignment-service:src/main/resources/application.yaml": "afcdc7d88f685a2246dca216c0aeb0b6a4847506"
  "am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/controller/endpoints/CreateAssignmentController.java": "5a420960cb363b1ca81ad9919d2eba59f564ff17"
  "am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/service/common/ValidationModelService.java": "d5ae78f5037cd43a3381296a6b5031086fb6f7a4"
  "am-role-assignment-service:src/main/resources/validationrules/core/organisational-role-mapping-common.drl": "683f8db55a52ff5a3f4cfa6dc64c582a3f6e83d8"
  "am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/enums/RoleCategory.java": "8393259c0171c8cd063931d46b0bb8c532f0c6e0"
  "am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/enums/GrantType.java": "5fde8587eb8b34a4002a4c046ebce1ea4b470ab1"
  "am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/enums/Classification.java": "3ae3f88f96468c3ea6ef8786454679e3cc564cef"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/CRDTopicConsumerNew.java": "175b92db711bc975d09a26f5d9561b1577299667"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/JRDTopicConsumerNew.java": "175b92db711bc975d09a26f5d9561b1577299667"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/RASFeignClient.java": "01f9d2badc46bb8aef815a44232129bdf3edbe47"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/JBSFeignClient.java": "5681b077bfb8793b7b037004a9aeddbdd4581904"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RequestMappingService.java": "fdc432dbe5badb633ba4e240bfc2fb2ec5453602"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/config/servicebus/CRDMessagingConfiguration.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/CreateBookingController.java": "3d9772cc831118b015b4a2ef2561e1d452d39706"
  "am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/QueryBookingController.java": "3d9772cc831118b015b4a2ef2561e1d452d39706"
  "am-judicial-booking-service:src/main/resources/db/migration/V1_1__init_tables.sql": "910817b922d76c16f7c7a1cdf63105516b36b705"
  "am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/DeleteBookingController.java": "1e0e29994093123b06bd2b86b19fd6b8b1e85110"
  "am-role-assignment-service:src/main/resources/db/migration/V1_6__adding_new_indexes.sql": "b87bc2930c91ddf57d03e1918aa5edf055a5c70f"
  "am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/service/common/ParseRequestService.java": "b570497f596fc184b488c5419d0dd4d3f8ec6e91"
  "am-role-assignment-service:charts/am-role-assignment-service/values.yaml": "afcdc7d88f685a2246dca216c0aeb0b6a4847506"
  "am-role-assignment-service:charts/am-role-assignment-service/values.aat.template.yaml": "d5ae78f5037cd43a3381296a6b5031086fb6f7a4"
  "am-role-assignment-service:charts/am-role-assignment-service/values.preview.template.yaml": "e869c163161f8b96767a34e45aae0b3cb4644c8c"
  "am-role-assignment-batch-service:src/main/java/uk/gov/hmcts/reform/roleassignmentbatch/task/DeleteJudicialExpiredRecords.java": "85ab735f7b60e74650e8a27dc8c473a6a750722d"
  "am-role-assignment-batch-service:src/main/resources/application.yaml": "85ab735f7b60e74650e8a27dc8c473a6a750722d"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/constants/RoleAssignmentConstants.java": "7e4eb810bfd5adca1c0c9825960a6e1e5a9c8851"
  "am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl": "c15c7771f4f24dbfecdc81514fe9f16c2546ed6c"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/apihelper/Constants.java": "fdc432dbe5badb633ba4e240bfc2fb2ec5453602"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RefreshOrchestrator.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/controller/RefreshController.java": "fdc432dbe5badb633ba4e240bfc2fb2ec5453602"
  "am-org-role-mapping-service:src/main/resources/db/migration/V1.1__init_tables.sql": "4634ca2f2028547d964f2f1deb111816ffa5da75"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedataaccesscontrol/RoleAssignmentAttributesResource.java": "484119b15a8eacd34f30af868e363047f014cd40"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/role/entities/RoleAssignmentForSearch.java": "a72b84b435c5aff7c35d39c67f6c01c2e394538f"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/role/entities/RoleAttributeDefinition.java": "a72b84b435c5aff7c35d39c67f6c01c2e394538f"
  "rpx-xui-webapp:src/app/app-utils.ts": "eed279a4dd5502643063241d86c2911799acac38"
  "rpx-xui-webapp:src/app/components/routing/application-routing.component.ts": "eed279a4dd5502643063241d86c2911799acac38"
  "rpx-xui-webapp:src/booking/guards/booking-guard.ts": "a8162ca6dc81cd9756fb4e18bfb33ce02a6101ed"
  "rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.html": "0cc0e9a4686b861db394bcc009c4b6681b24badd"
  "rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.ts": "58a4a6ae5f174e6208432620948d0212d2f2baea"
  "rpx-xui-webapp:src/booking/containers/booking-check/booking-check.component.ts": "58a4a6ae5f174e6208432620948d0212d2f2baea"
  "rpx-xui-webapp:src/booking/containers/booking-wrapper/booking-wrapper.component.ts": "8577c8c217f3e58ec34ce4efde89c468268befb7"
  "rpx-xui-webapp:src/booking/containers/utils/booking-error-handler.ts": "1bb90ae55466b4ca3bf2b1df1b0ac19b6fa8cd20"
  "rpx-xui-webapp:api/accessManagement/index.ts": "ff76662ca439152d588ee2ff0e17025be3413fc7"
  "cnp-flux-config:apps/am/am-role-assignment-service/prod.yaml": "e781760115094d551f69723716c4a8bb3c6591e3"
  "cnp-flux-config:apps/am/am-role-assignment-batch-service/prod.yaml": "65bd3d613151c3022fa81bdfe62a93ce33b88145"
---

## TL;DR

- AM is the runtime role-assignment plane for CFT, composed of three services (RAS, ORM, JBS) plus two batch jobs.
- **RAS** (port 4096) is the canonical store — it validates, persists, queries, and deletes role assignments using Drools rules and PostgreSQL. Attribute queries are served by a GIN index on the `attributes` JSONB column.
- **ORM** (port 4098) provisions organisational roles by subscribing to Azure Service Bus topics for CRD/JRD change events, running Drools mapping rules, and calling RAS with `replaceExisting=true`.
- **JBS** (port 4097) stores judicial location bookings consumed by ORM during fee-paid judicial role mapping. The `bookable` role attribute controls which users see the booking UI in ExUI.
- Inbound consumers are CCD data store, XUI, WA, AAC, and HMC — all authenticated via S2S tokens. Validation rules are "allow" nature: each assignment must match at least one Drools rule to be accepted.
- Reference-data sources (CRD, JRD) push user-change events via ASB; ORM pulls full profiles via Feign on receipt.

## Component diagram

```mermaid
graph TD
    subgraph "Inbound consumers"
        CCD[CCD Data Store]
        XUI[XUI Webapp]
        WA[WA Task Mgmt]
        AAC[AAC Manage Case Assignment]
        HMC[HMC Hearing Service]
    end

    subgraph "Access Management"
        RAS["RAS<br/>port 4096<br/>(role_assignment DB)"]
        ORM["ORM<br/>port 4098<br/>(refresh_jobs DB)"]
        JBS["JBS<br/>port 4097<br/>(booking DB)"]
        BATCH_PURGE["Batch Purge<br/>(CronJob)"]
        BATCH_REFRESH["Refresh Batch<br/>port 5333<br/>(CronJob)"]
    end

    subgraph "Reference Data"
        CRD["CRD<br/>(rd-case-worker-ref-api)"]
        JRD["JRD<br/>(rd-judicial-api)"]
    end

    subgraph "Azure Service Bus"
        CRD_TOPIC["CRD Topic"]
        JRD_TOPIC["JRD Topic"]
    end

    CCD -->|POST/DELETE /am/role-assignments| RAS
    XUI -->|POST /am/role-assignments/query| RAS
    WA -->|POST /am/role-assignments/query| RAS
    AAC -->|POST /am/role-assignments| RAS
    HMC -->|POST /am/role-assignments/query| RAS

    CRD -->|publishes user changes| CRD_TOPIC
    JRD -->|publishes user changes| JRD_TOPIC

    CRD_TOPIC -->|subscription| ORM
    JRD_TOPIC -->|subscription| ORM

    ORM -->|POST /am/role-assignments<br/>replaceExisting=true| RAS
    ORM -->|POST /am/bookings/query| JBS
    ORM -->|GET profiles| CRD
    ORM -->|GET profiles| JRD

    RAS -->|GET case data| CCD

    BATCH_PURGE -->|DELETE expired records| RAS
    BATCH_PURGE -->|DELETE expired bookings| JBS
    BATCH_REFRESH -->|POST /am/role-mapping/refresh| ORM
```

## Role Assignment Service (RAS)

RAS is the core API at the centre of the AM platform. Every role assignment — both organisational (staff/judicial) and case-level — is stored, validated, and queried through RAS.

### Responsibilities

- **Create** role assignments via `POST /am/role-assignments` with Drools-based validation (`CreateAssignmentController.java:44`).
- **Query** assignments via `POST /am/role-assignments/query` (v1 single-query, v2 multi-query differentiated by content-type header).
- **Delete** assignments by process+reference, by ID, or by bulk query.
- **Validate** every create request against embedded Drools rules, using a two-stage model: (1) service-trust rule approves (`CREATE_APPROVED`), (2) pattern-config validation promotes to `APPROVED` (`role-assignment-config-validation.drl:44`).

### Database

PostgreSQL with Flyway migrations (`spring.flyway.out-of-order: true` to accommodate mixed versioning schemes).

| Table | Purpose |
|-------|---------|
| `role_assignment` | Live assignments. JSONB `attributes` column with GIN index. |
| `role_assignment_history` | Full audit trail. PK is `(id, request_id, status)`. Includes `status_sequence` for ordering. |
| `role_assignment_request` | Request metadata (client, assigner, correlation ID, process, reference, replace_existing). |
| `flag_config` | Per-environment Drools feature flags. |
| `actor_cache_control` | ETag caching — incremented on every assignment change for an actor. Supports HTTP 304 responses via `If-None-Match` header. |

RAS does not support update operations. Records can only be created or deleted; the full history trail is maintained automatically in `role_assignment_history`.

### Role assignment state model

Assignments progress through a state machine:

```
CREATE_REQUESTED -> APPROVED -> LIVE
                 \-> REJECTED

LIVE -> DELETE_REQUESTED -> DELETE_APPROVED -> DELETED
                        \-> DELETE_REJECTED (remains LIVE)

LIVE -> EXPIRED (batch purge when end_time <= now)
```

### Data model enumerations

| Field | Values (source) |
|-------|-----------------|
| `RoleCategory` | `JUDICIAL`, `LEGAL_OPERATIONS`, `ADMIN`, `PROFESSIONAL`, `CITIZEN`, `SYSTEM`, `OTHER_GOV_DEPT`, `CTSC` |
| `GrantType` | `BASIC`, `SPECIFIC`, `STANDARD`, `CHALLENGED`, `EXCLUDED` |
| `Classification` | `PUBLIC`, `PRIVATE`, `RESTRICTED` (implements `isAtLeast()` comparison) |
| `RoleType` | `CASE`, `ORGANISATION` |
| `ActorIdType` | `IDAM`, `CASEPARTY` (`ActorIdType.java:3-4`) |

<!-- DIVERGENCE: Confluence HLD v1.3 lists RoleCategory as [judicial, legal-operations, admin, ctsc, professional, citizen] (6 values), but source RoleCategory.java has 8 values including SYSTEM and OTHER_GOV_DEPT. Source wins. -->

### Role assignment attributes

The `attributes` JSONB column stores key/value pairs that scope and qualify the assignment:

| Attribute | Description | Used for access control |
|-----------|-------------|------------------------|
| `caseId` | CCD case ID (case roles only) | Yes |
| `jurisdiction` | CCD jurisdiction code | Yes |
| `caseType` | CCD case type ID | Yes |
| `region` | LRD region ID | Yes — CCD matches it against `caseManagementLocation.region` |
| `location` | Court ePIMMS property ID | Yes — CCD matches it against `caseManagementLocation.baseLocation` |
| `baseLocation` | Booking location ID; written only by the booking-derived judicial rules, from `JudicialBooking.locationId` | Not by CCD — Work Allocation reads it as its own `location` |
| `primaryLocation` | User's primary location (same across all assignments for a user) | No |
| `contractType` | `Salaried`, `Fee-Paid` or `Voluntary` (judicial only), copied from the JRD appointment type | No |
| `caseAccessGroupId` | Associates role assignment to multiple cases from CCD (group role assignment) | Yes |
| `bookable` | Boolean — gates the ExUI booking journey (see below) | No |

The attribute names are not interchangeable, and the two consumers disagree on them. CCD deserialises exactly seven attribute keys — `jurisdiction`, `caseType`, `caseId`, `region`, `location`, `contractType`, `caseAccessGroupId` — and silently ignores everything else (`ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedataaccesscontrol/RoleAssignmentAttributesResource.java:36-42`). Work Allocation instead reads `baseLocation` and maps it onto its own `location` field (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/role/entities/RoleAssignmentForSearch.java:64`, `.../RoleAttributeDefinition.java:11`). ORM's mapping rules write `baseLocation`, never `location` (`am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/constants/RoleAssignmentConstants.java:18`), so a booking location scopes tasks but not case access.

`contractType` is populated straight from the appointment type on the judicial profile, so its values are the JRD literals `Salaried`, `Fee-Paid` and `Voluntary` (`am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/constants/RoleAssignmentConstants.java:33-35`). RAS's role configuration declares `contractType` optional with no enumerated values, so it does not constrain them.

`bookable` gates the ExUI booking journey. ExUI treats a user as bookable when the IDAM `roleCategories` include `JUDICIAL` **and** at least one role assignment carries a `bookable` attribute equal to `true` or the string `"true"` (`rpx-xui-webapp:src/app/app-utils.ts:291-303`). When a bookable judicial user lands on `/`, ExUI redirects them to the booking page instead of the normal landing page (`rpx-xui-webapp:src/app/components/routing/application-routing.component.ts:47-48`), and an equivalent test guards the `/booking` routes, additionally accepting the legacy `caseworker-judge` IDAM role in place of the `JUDICIAL` category (`rpx-xui-webapp:src/booking/guards/booking-guard.ts:19-36`). ORM writes the attribute as the JSON **string** `"true"`, not a boolean — `civil-judicial-org-role-mapping.drl:353`, which is why the ExUI check accepts either form. Seven jurisdictions set it, all on fee-paid judicial roles: civil, fr, possessions, privatelaw, publiclaw, sscs and stcic.

### Validation model

RAS builds a validation model before executing Drools rules. The model contains:

1. The `RoleAssignmentRequest` (the incoming request).
2. `RoleAssignmentHistory` objects for each requested role (already written to DB in CREATE_REQUESTED status).
3. Three collections of existing `RoleAssignment` records:
   - Current assignments for the **assignee(s)** (the actors being given roles).
   - Current assignments for the **authenticated user** (from IDAM token).
   - Current assignments for the **requestor/assigner** (from `assignerId` in the request body).

The four identity types used in validation:

| Identity | Source | Purpose |
|----------|--------|---------|
| Assigner ID | `roleRequest.assignerId` in body | The user approving the role assignment |
| Microservice ID | `serviceAuthorization` S2S token | The calling service |
| Authenticated User ID | `Authorization` Bearer token | The user account submitting the request |
| Assignee ID | `actorId` in each requested role | The user receiving the role |

### Role configuration (pattern validation)

After Drools rules approve an assignment, a final "safety net" check confirms the assignment matches at least one configured pattern for the role name. Patterns define mandatory fields and acceptable values per role. This is static configuration deployed with the service (in JSON files), loaded at startup.

### Performance characteristics

Attribute queries are served by a GIN index on `role_assignment.attributes`, created with the `jsonb_path_ops` operator class (`V1_6__adding_new_indexes.sql:2`). `jsonb_path_ops` indexes only value paths, so it supports the containment operator the query API uses but not key-existence operators — the `hasAttributes` filter, which tests for key presence via `jsonb_extract_path_text`, does not benefit from it.

<!-- CONFLUENCE-ONLY: not verified in source -->
- Performance tested for up to **2000** role assignments per single user. Beyond this, performance may degrade.
- Target throughput: **30-40** `getAssignmentsByActorId` calls per second from CCD data store.

### S2S authorised callers

The full list (`application.yaml:127`):

```
ccd_gw, am_role_assignment_service, am_org_role_mapping_service,
am_role_assignment_refresh_batch, xui_webapp, aac_manage_case_assignment,
ccd_data, wa_workflow_api, wa_task_management_api, wa_task_monitor,
wa_case_event_handler, iac, hmc_cft_hearing_service, ccd_case_disposer,
sscs, fis_hmc_api, fpl_case_service, disposer-idam-user, civil_service,
prl_cos_api
```

The S2S `clientId` is extracted and passed to Drools rules — a caller not in this list is rejected at the filter layer; a caller in this list but without matching Drools rules will have assignments rejected as unapproved (`reject-unapproved-role-assignments.drl:11`).

### Environment-specific Drools bypass

RAS reads a `BYPASS_ORG_DROOL_RULE` environment variable into the `byPassOrgDroolRule` flag on every `Request` fact (`application.yaml:181`, `ParseRequestService.java:41-48`). The service-trust rules for organisational roles fire on `byPassOrgDroolRule || clientId == "am_org_role_mapping_service"` (`organisational-role-mapping-common.drl:21` and `:50`), so with the flag on, any authorised S2S caller can create organisational role assignments; with it off, only ORM can.

It is off by default — `${BYPASS_ORG_DROOL_RULE:false}` — and the base chart sets it to `false` too (`charts/am-role-assignment-service/values.yaml:48`). It is switched on only in lower environments: `values.aat.template.yaml:12` and `values.preview.template.yaml:33`, and in flux for AAT, Demo and Perftest. Production sets it to `false` explicitly (`cnp-flux-config:apps/am/am-role-assignment-service/prod.yaml:18`).

### Query API

RAS exposes two query mechanisms:

- `GET /am/role-assignments/actors/{actorId}` — retrieves all current (non-expired) role assignments for an actor. Supports **ETag-based caching**: the response includes a weak ETag header; if the client sends `If-None-Match` with a matching ETag, RAS returns HTTP 304 with no body.
- `POST /am/role-assignments/query` — multi-clause query. Each clause contains AND-ed criteria; multiple clauses are OR-ed. Supports filtering by `actorId`, `roleType`, `roleName`, `roleCategory`, `classification`, `grantType`, `authorisations`, `validAt`, `hasAttributes`, `readOnly`, and arbitrary `attributes` key/value pairs. Results support sorting (by `begin`/`end` or any attribute) and pagination.

The v2 multi-query variant is differentiated by content-type header.

### Outbound dependency

RAS calls CCD data store via Feign (`feign.client.config.datastoreclient.url`, default `http://localhost:4452`) to lazily load case data during case-role validation. Case data is Caffeine-cached with 120-second TTL, max 500 entries (`application.yaml:113-117`).

## Org Role Mapping Service (ORM)

ORM is the provisioning engine for organisational roles. It does not store role assignments itself — it computes them and delegates persistence to RAS.

### Trigger: Azure Service Bus

ORM subscribes to two ASB topics:

| Property | Env var | Default |
|----------|---------|---------|
| `amqp.crd.topic` | `CRD_TOPIC_NAME` | — |
| `amqp.crd.subscription` | `CRD_SUBSCRIPTION_NAME` | — |
| `amqp.jrd.topic` | `JRD_TOPIC_NAME` | — |
| `amqp.jrd.subscription` | `JRD_SUBSCRIPTION_NAME` | — |
| `amqp.host` | `AMQP_HOST` | — |

Messages arrive as `UserRequest` (list of user IDs). Receive mode is `PEEK_LOCK` with manual completion via `disableAutoComplete()` + explicit `completeAsync()` (`CRDMessagingConfiguration.java:82-86`). Retry policy: 10 max retries, 1-minute delay, FIXED mode (`CRDMessagingConfiguration.java:69-71`).

<!-- DIVERGENCE: Confluence LLD-ORM says "maximum of 4 delivery attempts" with "5 minute delay", but source CRDMessagingConfiguration.java:69-71 shows maxRetries=10, delay=Duration.ofMinutes(1), mode=FIXED. Source wins. -->

If after all retry attempts the message has not been processed, it moves to the dead letter queue. Manual recovery is required (the team must be alerted to messages on the dead letter queue).

### Mapping flow

```mermaid
sequenceDiagram
    participant ASB as Azure Service Bus
    participant ORM as ORM (port 4098)
    participant CRD as CRD / JRD
    participant JBS as JBS (port 4097)
    participant RAS as RAS (port 4096)

    ASB->>ORM: UserRequest (user IDs)
    ORM->>CRD: Fetch profiles (Feign)
    Note over ORM: For judicial users:
    ORM->>JBS: POST /am/bookings/query
    JBS-->>ORM: Active bookings
    ORM->>ORM: Run Drools mapping rules
    ORM->>RAS: POST /am/role-assignments<br/>(replaceExisting=true)
    RAS-->>ORM: 201 Created
    ORM->>ASB: complete() message
```

1. Deserialize ASB message as `UserRequest` (`TopicConsumer.java:63`).
2. Fetch user profiles from CRD or JRD via Feign (with `@Retryable`, 3 attempts, 500ms backoff x3).
3. For judicial users, fetch active bookings from JBS (`POST /am/bookings/query`).
4. Flatten profiles: CRD produces one `CaseWorkerAccessProfile` per role x workArea; JRD produces one `JudicialAccessProfile` per appointment x serviceCode (`AssignmentRequestBuilder.java:126-218`).
5. Execute Drools `StatelessKieSession` with profiles + feature flags + bookings as facts (`RequestMappingService.java:186-214`).
6. Call RAS with `replaceExisting=true`, `process="staff-organisational-role-mapping"` or `"judicial-organisational-role-mapping"`, `reference=userId` (`RequestMappingService.java:292-305`).

### Drools rule organisation

Per-jurisdiction packages in `kmodule.xml`: `iac`, `sscs`, `civil`, `privatelaw`, `publiclaw`, `employment`, `stcic`, `hrs`, `probate`, plus `core`.

Judicial mapping uses two stages:
- **Stage 1** (`*-judicial-office-holder-mapping.drl`): `JudicialAccessProfile` + `FeatureFlag` -> inserts `JudicialOfficeHolder`.
- **Stage 2** (`*-judicial-org-role-mapping.drl`): `JudicialOfficeHolder` + optional `JudicialBooking` -> inserts `RoleAssignment`.

Fee-paid judicial roles require a matching `JudicialBooking` fact (providing `locationId`/`regionId`). Salaried roles do not.

Staff mapping uses a simpler single stage:
- `*-staff-org-role-mapping.drl`: `CaseWorkerAccessProfile` + `FeatureFlag` -> inserts `RoleAssignment`.

CRD staff profiles are flattened to one `CaseWorkerAccessProfile` per role x workArea combination. Only the primary location (`isPrimary=true`) is used for `primaryLocation`. All roles and all service codes are processed (the `isPrimary` flag on roles is ignored for mapping purposes).

### Database

ORM has a small PostgreSQL database with:
- `refresh_jobs` — tracks async refresh job state (used by the refresh-batch service).
- `flag_config` — per-environment Drools feature flags (same pattern as RAS).

The `refresh_jobs` table schema:

| Column | Type | Description |
|--------|------|-------------|
| `job_id` | bigint (PK) | Unique job identifier |
| `role_category` | text | Scope: `JUDICIAL`, `LEGAL_OPERATIONS`, etc. |
| `jurisdiction` | text | Scope: specific jurisdiction code or `ALL` |
| `status` | text | `NEW`, `COMPLETED` or `ABORTED` (`Constants.java:48-50`) |
| `user_ids` | text[] | On an aborted job, the user IDs that failed |
| `comments` | text | Rule change details |
| `created` | timestamp | Job creation time |
| `log` | text | Error messages on abort |
| `linked_job_id` | bigint | Unused on the production path — see below |

The refresh batch picks up records with `status=NEW` — a job in any other state is rejected with `ERROR_REFRESH_JOB_INVALID_STATE` (`RefreshOrchestrator.java:117-127`) — calls ORM's refresh endpoint, and on success ORM sets the status to `COMPLETED`. On partial failure it sets `ABORTED` and writes the failed user IDs to `user_ids` on that same job (`RefreshOrchestrator.java:291-309`); retrying means creating a new job, not following `linked_job_id`, which no production code path populates.

### ORM role assignment request mapping

When ORM calls RAS, it constructs requests with these conventions:

| Field | Value |
|-------|-------|
| `clientId` | `am-org-role-mapping-service` |
| `process` | `staff-organisational-role-mapping` (CRD) or `judicial-organisational-role-mapping` (JRD) |
| `reference` | IDAM user ID |
| `replaceExisting` | Always `true` |
| `roleType` | Always `ORGANISATION` |
| `grantType` | Always `STANDARD` |
| `actorIdType` | `IDAM` |

An empty `requestedRoles` list with `replaceExisting=true` effectively deletes all existing organisational assignments for that user (e.g. when a staff member is flagged as deleted in CRD).

### Refresh endpoint

`POST /am/role-mapping/refresh?jobId={id}` returns HTTP 202 immediately; processing runs `@Async`. Called by `am-role-assignment-refresh-batch` (authorised callers: `am_org_role_mapping_service`, `am_role_assignment_refresh_batch` — `application.yaml:172`).

## Judicial Booking Service (JBS)

JBS is a small synchronous REST service with a single responsibility: store and query time-bounded judicial location bookings.

### Endpoints

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| POST | `/am/bookings` | Create a booking | 201 |
| POST | `/am/bookings/query` | Query by user IDs | 200 |
| DELETE | `/am/bookings/{userId}` | Delete all bookings for user (hidden from Swagger) | 204 |

### Database

Single table `booking` (Flyway `V1_1__init_tables.sql`):

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | — |
| `user_id` | text | IDAM user ID |
| `location_id` | text (nullable) | HMCTS location code (EPIMS ID) |
| `region_id` | text (nullable) | HMCTS region code (mandatory if `location_id` is set) |
| `begin_time` | timestamp | Midnight UTC of `beginDate` |
| `end_time` | timestamp | Midnight UTC of `endDate + 1 day` (inclusive end) |
| `created` | timestamp | — |

Queries filter `endTime > now()` so expired bookings are never returned (`BookingRepository.java:13`). "Current" bookings include future bookings that have not yet started.

### Booking date semantics

Bookings use an inclusive date range. The `end_time` stored is `last_day + 1` at midnight, so role assignments created from a booking ending on Thursday have their `endTime` set to Friday 00:00:00 UTC.

### Booking lifecycle and ExUI integration

ExUI's booking journey lives at `/booking`, behind the bookable-judicial guard. Its "Work access" page offers up to three radio options (`rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.html`):

1. **Choose an existing booking** — rendered only when JBS returns bookings for the user. Picking one calls the judicial refresh, then routes to `/work/my-work/list` filtered to that booking's location (`rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.ts:118-129`).
2. **Create a new booking** — location, then dates, then a check page. Confirming posts the booking to JBS and, on success, chains straight into the judicial refresh before routing to `/work/my-work/list` with `newBooking: true` (`rpx-xui-webapp:src/booking/containers/booking-check/booking-check.component.ts:72-96`).
3. **View tasks and cases** — no calls to JBS or ORM; ExUI routes to `/work/my-work/list` scoped to whichever booking locations are already live (`rpx-xui-webapp:src/booking/containers/booking-wrapper/booking-wrapper.component.ts:77-89`).

The three ExUI paths are node-layer proxies, not the AM endpoints themselves: `/am/getBookings` fans out to `POST /am/bookings/query` on JBS and enriches each booking with its site name from Location Reference Data, `/am/createBooking` wraps the body as `{ bookingRequest: ... }` for `POST /am/bookings`, and `/am/role-mapping/judicial/refresh` wraps it as `{ refreshRequest: { userIds: [...] } }` for ORM's endpoint of the same path (`rpx-xui-webapp:api/accessManagement/index.ts:36-85`, `am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/controller/RefreshController.java:100`).

ExUI normalises the dates before posting: `beginDate` becomes 00:00 and `endDate` 23:59:59.999 UTC, and only when local time and UTC differ, to stop JBS rejecting a British Summer Time midnight that is the previous day in UTC (`rpx-xui-webapp:src/booking/containers/booking-check/booking-check.component.ts:54-70`).

Booking creation and role refresh fail differently, which matters because the second half is not retried automatically. A failed `createBooking` routes to `/not-authorised` (401/403), `/service-down` (500) or `/booking-service-down`; a failed refresh **after** the booking was created always routes to `/refresh-booking-service-down` (`rpx-xui-webapp:src/booking/containers/utils/booking-error-handler.ts:13-35`). That page tells the user to log out and select their booking again — which re-enters through option 1 and re-runs the refresh, so the booking is not lost, but until then the user holds a booking with no matching role assignments.

### Booking retention

Bookings are hard-deleted 2 years after they end. `am-role-assignment-batch-service` runs `DELETE from booking b where b.end_time < (current_date - ? ) + '00:00:00'::time` against the JBS database, with the parameter coming from `days: ${DAYS:730}` — `DeleteJudicialExpiredRecords.java:103-107` and `application.yaml:45`. Production pins the same 730 and runs the CronJob at 22:00 daily (`cnp-flux-config:apps/am/am-role-assignment-batch-service/prod.yaml:8,15`). A negative `days` aborts the step rather than deleting everything (`DeleteJudicialExpiredRecords.java:55-58`).

The table has no update path — JBS exposes no `PUT` or `PATCH` — but it is not append-only. `DELETE /am/bookings/{userId}` removes every booking for a user; the controller is annotated `@Hidden` so it does not appear in the published OpenAPI spec, but it is a live route (`am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/DeleteBookingController.java:17-41`). Neither the purge nor that endpoint writes an audit record, so the booking table cannot be treated as its own audit log.

<!-- DIVERGENCE: Confluence describes the booking table as immutable, with no update or delete via the API in initial scope, serving as its own audit log. Source has a live (Swagger-hidden) `DELETE /am/bookings/{userId}` and a nightly purge that removes rows outright. Source wins. -->


### S2S authorised callers

`am_judicial_booking_service`, `am_org_role_mapping_service`, `xui_webapp` (`application.yaml:96`). ORM is in the `bypass-userid-validation-for-services` list, allowing it to query bookings for any user without JWT-subject matching.

## Batch services

### am-role-assignment-batch-service (purge)

A Spring Batch Kubernetes CronJob (no HTTP port). Deletes expired records from both the RAS `role_assignment` database and the JBS `booking` table. Runs daily.

### am-role-assignment-refresh-batch (port 5333)

A Spring Batch Kubernetes CronJob that triggers a full refresh of organisational role assignments by calling ORM's `/am/role-mapping/refresh` endpoint. Used after Drools rule changes or periodic reconciliation.

## Ports and protocols summary

| Service | Port | Protocol | Database |
|---------|------|----------|----------|
| RAS | 4096 | HTTP (REST) | PostgreSQL (`role_assignment`, `role_assignment_history`, etc.) |
| JBS | 4097 | HTTP (REST) | PostgreSQL (`booking`) |
| ORM | 4098 | HTTP (REST) + ASB subscriber | PostgreSQL (`refresh_jobs`, `flag_config`) |
| Refresh Batch | 5333 | HTTP (outbound only) | None (calls ORM) |
| Purge Batch | — | Direct DB | Connects to RAS + JBS databases |

## Data flow patterns

**Organisational role provisioning** (event-driven):
ASB topic -> ORM -> CRD/JRD (profiles) + JBS (bookings) -> Drools -> RAS (persist)

**Case-role assignment** (synchronous, consumer-initiated):
CCD/AAC/XUI -> RAS -> Drools validation (may lazy-load case data from CCD) -> persist

**Query** (synchronous):
XUI/WA/HMC -> RAS -> PostgreSQL (JPA Specifications with JSONB containment queries)

**Purge** (scheduled):
CronJob -> RAS DB (delete expired) + JBS DB (delete expired)

**Refresh** (scheduled):
CronJob -> ORM `/refresh` -> (same as organisational provisioning flow)

## Auditing and data retention

All requests and role assignment state transitions are audited in `role_assignment_request` and `role_assignment_history` tables. Since RAS does not support update operations (only create and delete), the history trail is inherently complete without separate audit logging.

The purge batch job handles data lifecycle:
- **Expiry**: daily deletion of `role_assignment` records where `end_time <= now`, with corresponding `EXPIRED` status history records.
- **Retention**: hard deletion of history records older than a configured threshold (aligned with case record lifetime).
- **JBS purge**: deletion of booking records past their retention period (2 years per HLD specification).

## Security model

RAS validation rules are "allow" in nature — each create or delete must match at least one rule. Rules can reference:
- The microservice ID (S2S client), assigner/assignee/authenticated user identities.
- The current role assignments of any of those users.
- Case data (loaded via CCD Feign client) for case-role validation.
- The properties of the requested role assignment itself.

This enables fine-grained trust models. For example, only `am_org_role_mapping_service` can create organisational judicial roles in production, while `iac_case_allocation` can only create tribunal-caseworker case roles for IAC Asylum cases where the assignee already holds the corresponding organisational role.

## See also

- [Overview](overview.md) — conceptual introduction to AM's role model, grant types, and platform position
- [Drools Rules](drools-rules.md) — how the embedded Drools engine validates assignments in RAS and maps profiles in ORM
- [Batch Jobs](batch-jobs.md) — operational detail on the purge and refresh CronJobs described in this page
- [RAS API Reference](../reference/api-role-assignment-service.md) — endpoint reference, request/response shapes, and enumerated values

## Glossary

| Term | Definition |
|------|-----------|
| RAS | Role Assignment Service — the core CRUD API for role assignments (port 4096) |
| ORM | Org Role Mapping Service — provisions organisational roles from reference data (port 4098) |
| JBS | Judicial Booking Service — stores judicial location bookings (port 4097) |
| CRD | Case Worker Reference Data — source of staff user profiles |
| JRD | Judicial Reference Data — source of judicial user profiles and appointments |
| ASB | Azure Service Bus — message broker carrying CRD/JRD change events |
| S2S | Service-to-service authentication via `service-auth-provider` tokens |
