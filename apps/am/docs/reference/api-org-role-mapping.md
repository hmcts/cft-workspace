---
title: Api Org Role Mapping
topic: orm
diataxis: reference
product: am
audience: both
sources:
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/controller/RefreshController.java
  - am-org-role-mapping-service:src/main/resources/application.yaml
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/CRDFeignClient.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/JRDFeignClient.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/RASFeignClient.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RefreshOrchestrator.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/BulkAssignmentOrchestrator.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/JudicialRefreshOrchestrator.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/TopicConsumer.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/CRDTopicConsumerNew.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/JRDTopicConsumerNew.java
  - am-org-role-mapping-service:src/main/resources/db/migration/V1.1__init_tables.sql
  - am-org-role-mapping-service:src/main/resources/db/migration/V1.2__new_flag_config_table.sql
  - am-org-role-mapping-service:src/main/resources/db/migration/V1.7__iac_1_0_base_flag_deletion.sql
  - am-org-role-mapping-service:src/main/resources/db/migration/V20260622_117__POFCC-117_Enable_possessions_wa_1_0_Prod.sql
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/enums/FeatureFlagEnum.java
  - am-org-role-mapping-service:src/main/resources/META-INF/kmodule.xml
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/config/servicebus/CRDMessagingConfiguration.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/config/servicebus/JRDMessagingConfiguration.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/helper/AssignmentRequestBuilder.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/ParseRequestService.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RequestMappingService.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/enums/crd/JobTitle.java
  - am-org-role-mapping-service:src/main/resources/validationrules/sscs/sscs-caseworker-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/hrs/hrs-admin-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/iac/iac-judicial-org-role-mapping.drl
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/am/am-org-role-mapping-service/src/main/resources/db/migration/V1.2__new_flag_config_table.sql
  - apps/am/am-org-role-mapping-service/src/main/resources/db/migration/V1.10__employment_wa_base_flag_addition.sql
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
  - id: "1412039978"
    title: "Refresh Org Role"
    last_modified: "unknown"
    space: "AM"
  - id: "1593576197"
    title: "AM applications feature flags"
    last_modified: "2026-08-01T00:00:00Z"
    space: "AM"
  - id: "1658260403"
    title: "Architecture"
    last_modified: "unknown"
    space: "DTSAM"
  - id: "1597738955"
    title: "Work Allocation Common ORG and CASE Roles"
    last_modified: "unknown"
    space: "AM"
confluence_checked_at: "2026-08-20T00:00:00Z"
sources_sha:
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/controller/RefreshController.java": "fdc432dbe5badb633ba4e240bfc2fb2ec5453602"
  "am-org-role-mapping-service:src/main/resources/application.yaml": "fdc432dbe5badb633ba4e240bfc2fb2ec5453602"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/CRDFeignClient.java": "00bfac76b14ef5687a04026841a511ea65ae16a0"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/JRDFeignClient.java": "00bfac76b14ef5687a04026841a511ea65ae16a0"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/feignclients/RASFeignClient.java": "01f9d2badc46bb8aef815a44232129bdf3edbe47"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RefreshOrchestrator.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/BulkAssignmentOrchestrator.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/JudicialRefreshOrchestrator.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/TopicConsumer.java": "175b92db711bc975d09a26f5d9561b1577299667"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/CRDTopicConsumerNew.java": "175b92db711bc975d09a26f5d9561b1577299667"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/servicebus/JRDTopicConsumerNew.java": "175b92db711bc975d09a26f5d9561b1577299667"
  "am-org-role-mapping-service:src/main/resources/db/migration/V1.1__init_tables.sql": "4634ca2f2028547d964f2f1deb111816ffa5da75"
  "am-org-role-mapping-service:src/main/resources/db/migration/V1.2__new_flag_config_table.sql": "f096b045752bcaf71c4a3871bdb5dd950b7e1bbc"
  "am-org-role-mapping-service:src/main/resources/db/migration/V1.7__iac_1_0_base_flag_deletion.sql": "7267dc8eb768dc198426de205418bba334763410"
  "am-org-role-mapping-service:src/main/resources/db/migration/V20260622_117__POFCC-117_Enable_possessions_wa_1_0_Prod.sql": "2e01f7521d23c6ba3e96cf345e68638ae4fbd02d"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/enums/FeatureFlagEnum.java": "080b61f9e21bcf71d7ffef41b25dfe83dcdda889"
  "am-org-role-mapping-service:src/main/resources/META-INF/kmodule.xml": "080b61f9e21bcf71d7ffef41b25dfe83dcdda889"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/config/servicebus/CRDMessagingConfiguration.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/config/servicebus/JRDMessagingConfiguration.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/helper/AssignmentRequestBuilder.java": "b829373f4c4976248de36658b4a273ae170700e0"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/ParseRequestService.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RequestMappingService.java": "fdc432dbe5badb633ba4e240bfc2fb2ec5453602"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/enums/crd/JobTitle.java": "f2c71dea6e9fc93641f7c24ceb6123d73d392f68"
  "am-org-role-mapping-service:src/main/resources/validationrules/sscs/sscs-caseworker-mapping.drl": "42f6660e5ccd56ea7678591ee13c499abb8e978c"
  "am-org-role-mapping-service:src/main/resources/validationrules/hrs/hrs-admin-mapping.drl": "edf77e986bd6e61648abd5ad21d1489940cca617"
  "am-org-role-mapping-service:src/main/resources/validationrules/iac/iac-judicial-org-role-mapping.drl": "1078cff8b07f276117db53c07033fe3c204921cd"
---

## TL;DR

- ORM (Org Role Mapping Service) runs on port 4098 and provisions organisational role assignments for staff and judicial users by bridging Reference Data (CRD/JRD) to the Role Assignment Service (RAS).
- Primary trigger is Azure Service Bus (CRD/JRD topics) consumed in `PEEK_LOCK` mode with auto-complete disabled; HTTP endpoints exist for batch refresh and on-demand judicial refresh.
- The AMQP client retries connection-level failures 10 times at a fixed 1-minute interval -- `CRDMessagingConfiguration.java:68-71`. This is transport retry, separate from the subscription's message delivery count.
- `POST /am/role-mapping/refresh` triggers async full re-evaluation (returns 202); `POST /am/role-mapping/judicial/refresh` is synchronous.
- All RAS calls use `replaceExisting=true` -- ORM always replaces the full set of org roles for a user, never appends.
- Authorised S2S callers: `am_org_role_mapping_service`, `am_role_assignment_service`, `am_role_assignment_refresh_batch`, `xui_webapp`.
- Feature flags are stored in a `flag_config` database table (DB flags per environment) and LaunchDarkly (LD flags for operational toggles).

## Endpoints

### Refresh endpoints

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| POST | `/am/role-mapping/refresh?jobId={id}` | S2S (restricted) | 202 Accepted | Triggers async organisational role refresh for a batch job. Optional `UserRequest` body for specific user IDs. |
| POST | `/am/role-mapping/judicial/refresh` | S2S (restricted) | 200 OK | Synchronous judicial refresh. Body is `JudicialRefreshRequest` containing a `UserRequest`. |

**Restricted callers** for the staff refresh endpoint: only services listed in `refresh.Job.authorisedServices` (default: `am_org_role_mapping_service`, `am_role_assignment_refresh_batch`) -- `RefreshOrchestrator.java:99-101`.

The judicial refresh endpoint uses the general S2S authorised services list (`idam.s2s-authorised.services`): `am_role_assignment_service`, `am_org_role_mapping_service`, `am_role_assignment_refresh_batch`, `xui_webapp`.

### Testing-support endpoints

Available only when `testing.support.enabled=true`:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/am/testing-support/send2CrdTopic` | Publish a message to the CRD ASB topic |
| POST | `/am/testing-support/send2JrdTopic` | Publish a message to the JRD ASB topic |

### Utility endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/am/role-mapping/fetchFlagStatus` | Anonymous (no auth required) | Fetches DB feature flag status. Used in lower environments for FTA scenario toggling. |

## Request / response shapes

### Refresh request

```json
POST /am/role-mapping/refresh?jobId=123
Content-Type: application/json
ServiceAuthorization: Bearer <s2s-token>
Authorization: Bearer <user-token>

{
  "userIds": ["user-id-1", "user-id-2"]
}
```

The body (`UserRequest`) is optional. When omitted, ORM performs a full service refresh using paginated calls to CRD based on the job's `jurisdiction` field.

### Refresh response

```
HTTP/1.1 202 Accepted
```

Work executes asynchronously via `@Async`. The refresh job status is tracked in the `refresh_jobs` database table. Final job status is `COMPLETED` (all users succeeded) or `ABORTED` (any failure) -- `RefreshOrchestrator.java:291-309`. Failed user IDs are stored in the `user_ids` column for retry via a linked job.

### Judicial refresh request

```json
POST /am/role-mapping/judicial/refresh
Content-Type: application/json
ServiceAuthorization: Bearer <s2s-token>
Authorization: Bearer <user-token>
x-correlation-id: <optional-uuid>

{
  "refreshRequest": {
    "userIds": ["judicial-user-id-1"]
  }
}
```

<!-- DIVERGENCE: Confluence LLD and the draft both showed the body as a flat {"userIds": [...]}, but RefreshController.java:120-128 shows the endpoint accepts JudicialRefreshRequest which wraps UserRequest under a "refreshRequest" key. Source wins. -->

The `x-correlation-id` header is optional; if provided it must be a valid UUID (validated against `Constants.UUID_PATTERN`).

### Judicial refresh response

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "Message": "Role refresh successful"
}
```

On failure (any user's assignment returned non-201):

```
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

"Role refresh failed"
```

## Azure Service Bus integration

ORM subscribes to two ASB topics for real-time role provisioning:

| Topic | Env var (topic name) | Subscription env var | Condition | Consumer class |
|-------|---------------------|---------------------|-----------|----------------|
| CRD | `CRD_TOPIC_NAME` | `CRD_SUBSCRIPTION_NAME` | `${amqp.crd.enabled}` | `CRDTopicConsumerNew` |
| JRD | `JRD_TOPIC_NAME` | `JRD_SUBSCRIPTION_NAME` | `${amqp.jrd.enabled}` | `JRDTopicConsumerNew` |

### Message processing behaviour

- Messages are received in `PEEK_LOCK` mode with auto-complete disabled -- `am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/config/servicebus/CRDMessagingConfiguration.java:82-83` and `am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/config/servicebus/JRDMessagingConfiguration.java:82-83`.
- Message body is deserialized into a `UserRequest` (list of user IDs that changed).
- `messageContext.complete()` runs only after `BulkAssignmentOrchestrator.createBulkAssignmentsRequest` returns -- `TopicConsumer.java:60-80`. Neither consumer calls `abandon()`, so a mapping failure leaves the message locked: redelivery waits for the lock to expire rather than happening immediately, and a persistent failure therefore burns one delivery attempt per lock period rather than looping.
- Maximum 4 delivery attempts configured on the ASB subscription. After 4 failed attempts, messages move to the dead letter queue, and the lock duration is 5 minutes. Both values are set on the subscription itself, not in ORM.
<!-- CONFLUENCE-ONLY: not verified in source -->

### Error handling

The `TopicConsumer.processError` method handles ASB errors:
- **Unrecoverable** (MESSAGING_ENTITY_DISABLED, MESSAGING_ENTITY_NOT_FOUND, UNAUTHORIZED): logged at ERROR, processing stops.
- **MESSAGE_LOCK_LOST**: logged at ERROR.
- **SERVICE_BUSY**: 1-second back-off sleep before retry.
- Other errors: logged with error source and reason.

## Downstream Feign clients

ORM calls these services during mapping execution:

| Target service | Base URL env var | Endpoint called | Purpose |
|---------------|-----------------|-----------------|---------|
| CRD (rd-case-worker-ref-api) | `CASE_WORKER_REF_APP_URL` (default `http://localhost:8095`) | `POST /refdata/case-worker/users/fetchUsersById` | Bulk fetch caseworker profiles by IDs |
| CRD (paginated) | `CASE_WORKER_REF_APP_URL` | `GET /refdata/internal/staff/usersByServiceName?ccd_service_names=...&page_size=...&page_number=...` | Full service refresh by jurisdiction |
| JRD (rd-judicial-api) | `JUDICIAL_REF_APP_URL` (default `http://localhost:8091`) | `POST /refdata/judicial/users` | Fetch judicial profiles by SIDAM IDs |
| JBS (am-judicial-booking-service) | `JUDICIAL_BOOKING_APP_URL` (default `http://localhost:4097`) | `POST /am/bookings/query` | Fetch judicial bookings for fee-paid role mapping |
| RAS (am-role-assignment-service) | `ROLE_ASSIGNMENT_APP_URL` (default `http://localhost:4096`) | `POST /am/role-assignments` | Create/replace org role assignments |

### Auth interceptors

| Interceptor | Used by | Authorization header | S2S |
|-------------|---------|---------------------|-----|
| `FeignClientInterceptor` | RAS, JBS | Current user token | Yes |
| `RdFeignClientInterceptor` | CRD, JRD | Admin IDAM token (`oidcAdminConfiguration.getUserId()`) | Yes |

`RdFeignClientInterceptor` additionally sets `Accept: application/vnd.jrd.api+json;Version=2.0` for JRD calls -- `RdFeignClientInterceptor.java:32-34`.

### Retry configuration

All Feign clients use `@Retryable`:

| Client | Max attempts | Backoff |
|--------|-------------|---------|
| CRD | 3 | 500ms, multiplier 3 |
| JRD | 3 | 500ms, multiplier 3 |
| JBS | 3 | default |

### CRD response processing rules

Each CRD caseworker profile is flattened into one `CaseWorkerAccessProfile` per (role x work
area) pair before the rules run -- `AssignmentRequestBuilder.java:126-167`:

- **All roles** and **all work areas** on the profile are offered to the mapping rules; the cartesian product means a user with 3 roles across 2 services presents 6 access profiles, each of which can match a different rule.
- Only the base location with `isPrimary=true` supplies `primaryLocationId` and `primaryLocationName`. A profile that does not have exactly one primary base location is rejected as invalid before mapping -- `ParseRequestService.java:99-107`.
- The profile's `suspended` flag is copied onto every access profile, and every mapping rule's `CaseWorkerAccessProfile(...)` pattern requires `!suspended`. A suspended user therefore matches no rule, and the resulting empty `requestedRoles` array is what makes RAS delete that user's existing assignments.

## RAS assignment request shape

When ORM sends role assignments to RAS:

```json
POST /am/role-assignments
x-correlation-id: <uuid>

{
  "roleRequest": {
    "requestType": "CREATE",
    "replaceExisting": true,
    "process": "staff-organisational-role-mapping",
    "reference": "<userId>"
  },
  "requestedRoles": [
    {
      "actorIdType": "IDAM",
      "actorId": "<userId>",
      "roleType": "ORGANISATION",
      "roleName": "...",
      "roleCategory": "LEGAL_OPERATIONS",
      "classification": "PUBLIC",
      "grantType": "STANDARD",
      "readOnly": false,
      "attributes": {
        "jurisdiction": "...",
        "primaryLocation": "...",
        "region": "...",
        "contractType": "...",
        "workTypes": "...",
        "baseLocation": "..."
      }
    }
  ]
}
```

- `process` is `"staff-organisational-role-mapping"` for caseworkers, `"judicial-organisational-role-mapping"` for judicial -- `RequestMappingService.java:292-305`.
- `grantType` is `STANDARD` for most org roles, `BASIC` for read-only `hmcts-*` global search roles.
- `roleCategory` values: `LEGAL_OPERATIONS`, `JUDICIAL`, `ADMIN`, `CTSC`, `OTHER_GOV_DEPT`.
- `classification` is set per mapping rule (typically `PUBLIC`).
- Empty `requestedRoles` array causes RAS to delete all existing assignments for that process+reference pair (used for suspended/soft-deleted users).
- `clientId` in the request header is set to `am-org-role-mapping-service`.

### Judicial-specific attributes

A JRD judicial profile is flattened into one `JudicialAccessProfile` per (appointment x service
code) pair -- `AssignmentRequestBuilder.java:169-219`. These appointment fields feed the
resulting role assignment:

- `beginTime` / `endTime`: the appointment's start and end dates. Judicial rules extend the end date by one day when setting `endTime` on the assignment -- `iac-judicial-org-role-mapping.drl:52`.
- `authorisations`: a top-level field on the assignment, not an entry in `attributes`, holding the appointment's active ticket codes (authorisations whose end date is unset or in the future) -- `AssignmentRequestBuilder.java:232-240`.
- `region`: the appointment's CFT region ID.
- `baseLocation` and `primaryLocation`: the appointment's base location ID, and its ePIMS ID when the appointment is the principal one (otherwise empty).
- `contractType`: derived from the appointment, not from the user profile. Rules either copy the appointment's contract type ID or set the literal `"Salaried"` / `"Fee-Paid"` based on the office held -- `iac-judicial-org-role-mapping.drl:74-78`.
- Only roles with no end date or a future end date count as business roles for `JudicialOfficeHolder` matching -- `AssignmentRequestBuilder.java:221-230`.

## Database schema

### refresh_jobs table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `job_id` | bigint (PK, auto-sequence) | No | Unique identifier for the refresh job |
| `role_category` | text | No | Scope: `JUDICIAL` or `LEGAL_OPERATIONS` |
| `jurisdiction` | text | No | Scope: e.g. `IA`, `CIVIL`, `ALL` |
| `status` | text | No | `NEW`, `COMPLETED`, or `ABORTED` |
| `comments` | text | Yes | Rule change details |
| `user_ids` | text[] | Yes | Failed user IDs for retry |
| `log` | text | Yes | Error message or success summary |
| `linked_job_id` | bigint | Yes | Links to parent job when retrying failed IDs |
| `created` | timestamp | Yes | Last status-update timestamp |

### flag_config table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | bigint (PK, auto-sequence) | No | Row identifier |
| `flag_name` | text | No | Feature flag name (e.g. `civil_wa_1_0`) |
| `env` | text | No | Environment (e.g. `prod`, `aat`, `local`) |
| `service_name` | text | No | Service the flag applies to (e.g. `iac`, `civil`) |
| `status` | boolean | No | Whether the flag is enabled |

## Feature flags

ORM uses a dual-layer feature flagging system:

### DB flags (per-service Drools rule activation)

DB flags in the `flag_config` table control which Drools mapping rules are active. Flag names follow the pattern `<service>_wa_<major>_<minor>` (e.g. `civil_wa_2_3`) or `<service>_hearing_<major>_<minor>`. Each flag is scoped to an environment and service.

Every flag is registered by a Flyway migration named
`V{yyyyMMdd}_{ticket}__{JIRA-TICKET}_{FLAG}_base_flag_addition.sql`, which inserts one
row per environment (`local` and `pr` `true`, everything else `false`). A later
`Enable_<flag>_Prod` migration flips the higher environments on. Each flag also has a
constant in `FeatureFlagEnum.java`.

Replaying every `flag_config` migration in Flyway order gives the following state:

| `service_name` | Prod-enabled by migration | Prod-enabled outside the migrations | Off in prod |
|---|---|---|---|
| `iac` | `iac_jrd_1_1`, `iac_wa_1_2`--`iac_wa_1_7` | `iac_1_1`, `iac_jrd_1_0` | `iac_wa_1_8`, `hrs_1_0` |
| `civil` | `civil_wa_1_1`--`civil_wa_2_5` | `civil_wa_1_0` | -- |
| `privatelaw` | `privatelaw_wa_1_1`--`privatelaw_wa_1_9`, `privatelaw_hearing_1_0` | `privatelaw_wa_1_0` | -- |
| `publiclaw` | `publiclaw_wa_1_0`--`publiclaw_wa_2_2`, `publiclaw_hearing_1_0` | -- | -- |
| `employment` | `employment_wa_1_0`--`employment_wa_1_5`, `employment_wa_3_0` | -- | -- |
| `sscs` | `sscs_wa_1_0`, `sscs_wa_1_2`, `sscs_wa_1_3`, `sscs_wa_1_5` | `sscs_hearing_1_0` | `sscs_wa_1_1`, `sscs_wa_1_4`, `sscs_hearing_1_1` |
| `st_cic` | `st_cic_wa_1_0`, `st_cic_wa_1_1` | -- | `st_cic_wa_1_2`, `st_cic_wa_1_3` |
| `pofcc` | `possessions_wa_1_0` | -- | -- |
| `probate` | -- | -- | `probate_wa_1_0` |
| `divorce` | -- | -- | `fr_wa_1_0` |

The middle column is the awkward one. Those five flags are the earliest ones, from
before the `Enable_<flag>_Prod` migration convention existed: their base migration
inserted `prod = false` and no migration ever flipped them, yet the AM feature-flags
page records them as live in prod. They were turned on out of band — via
`DB_FEATURE_FLAG_ENABLE` or a Flux value — so the migrations are not a complete record
of prod state for them. Check the environment before relying on either source.

There is no `employment_wa_2_x` — Employment jumps from `1_5` to `3_0`.
`iac_1_0` no longer exists; `V1.7__iac_1_0_base_flag_deletion.sql` removed it.

Beware that `service_name` is copy-pasted between migrations and does not always
match the flag's service. `civil_wa_1_1`, `privatelaw_wa_1_2`, `privatelaw_wa_1_3` and
`hrs_1_0` are all registered under `service_name = 'iac'`, and `publiclaw_wa_1_7`
under `'privatelaw'`. Query `flag_config` by `flag_name`, not by `service_name`.

<!-- DIVERGENCE: the AM feature-flags Confluence page lists possessions_wa_1_0 as prod=false, but V20260622_117__POFCC-117_Enable_possessions_wa_1_0_Prod.sql enables it in prod. Source wins. -->


### LaunchDarkly flags (operational toggles)

<!-- CONFLUENCE-ONLY: no LaunchDarkly flag key appears anywhere in ORM source -->

| Flag key | Purpose | Prod status |
|----------|---------|-------------|
| `orm-jrd-org-role` | Toggle JRD ASB message consumption | Live |
| `orm-judicial-refresh-role-api` | Toggle the judicial refresh API (shared with JBS) | Live |
| `orm-refresh-role` | Enable/disable refresh API functionality | Not Live |
| `orm-refresh-job-enable` | Enable/disable refresh job invocation | Not Live |
| `orm-base-flag` | Test flag for FTA scenarios (aat only) | Not Live |
| `get-db-drools-flag` | Expose DB flag status to functional tests in lower envs (shared with RAS and JBS) | Not Live |

These keys come from the AM feature-flags page, not from code. `application.yaml` keeps
only `launchdarkly.sdk.environment`, above the comment "LD is not used but legacy
configuration is retained" — no LD flag key appears anywhere in ORM source, so nothing
in the running service reads them. Treat the table as a record of what was once wired
up rather than of live behaviour.

## Configuration reference

| Property | Env var | Default | Purpose |
|----------|---------|---------|---------|
| `refresh.Job.pageSize` | `REFRESH_JOB_PAGE_SIZE` | 400 | Page size for CRD paginated refresh |
| `refresh.Job.sortDirection` | `REFRESH_JOB_SORT_DIR` | ASC | Sort direction for paginated fetch |
| `refresh.Job.sortColumn` | `REFRESH_JOB_SORT_COL` | (empty) | Sort column for paginated fetch |
| `refresh.Job.authorisedServices` | -- | `am_org_role_mapping_service,am_role_assignment_refresh_batch` | S2S services allowed to call refresh |
| `refresh.Job.includeJudicialBookings` | `REFRESH_JOB_INCLUDE_BOOKINGS` | false | Fetch JBS bookings during refresh |
| `refresh.BulkAssignment.includeJudicialBookings` | `REFRESH_BULK_ASSIGNMENT_INCLUDE_BOOKINGS` | false | Fetch JBS bookings during ASB-triggered mapping |
| `refresh.judicial.filterSoftDeletedUsers` | `REFRESH_JUDICIAL_FILTER_SOFT_DELETED_USERS` | false | Skip soft-deleted judicial users during refresh |
| `amqp.crd.enabled` | `AMQP_ENABLED` | true | Enable CRD ASB consumer |
| `amqp.jrd.enabled` | `AMQP_ENABLED` | true | Enable JRD ASB consumer |
| `testing.support.enabled` | `TESTING_SUPPORT_ENABLED` | false | Enable test-support endpoints |
| `dbFeature.flags.enable` | `DB_FEATURE_FLAG_ENABLE` | (empty) | Comma-separated flags to force-enable on startup |
| `dbFeature.flags.disable` | `DB_FEATURE_FLAG_DISABLE` | (empty) | Comma-separated flags to force-disable on startup |
| `orm.environment` | `ORM_ENV` | local | Current environment name (used for flag_config lookup) |
| `idam.s2s-authorised.services` | `AM_ORG_ROLE_MAPPING_S2S_AUTHORISED_SERVICES` | `am_role_assignment_service,am_org_role_mapping_service,am_role_assignment_refresh_batch,xui_webapp` | General S2S authorisation for all endpoints |

<!-- DIVERGENCE: Confluence says refresh.BulkAssignment.includeJudicialBookings defaults to true, but application.yaml:175 shows ${REFRESH_BULK_ASSIGNMENT_INCLUDE_BOOKINGS:false}. Source wins. -->

## Onboarded services

The following services have ORM mapping rules deployed and active:

| Service | Status | Notes |
|---------|--------|-------|
| IAC | Live | First onboarded service (WA R1/R2) |
| Civil | Live | Multiple incremental releases |
| Private Law | Live | Includes hearing roles |
| Public Law | Live | Includes hearing roles |
| SSCS | Live | Hearings complete, WA config active |
| Employment Tribunals | Live | |
| Special Tribunals (CIC) | Live | |
| Possessions | Live | Flag `possessions_wa_1_0`, prod-enabled June 2026 (`POFCC-117`) |
| HRS (Hearing Recording) | In development | Flag `hrs_1_0` registered, off in prod |
| Probate | In development | Flag `probate_wa_1_0` registered, off in prod |
| Financial Remedy | In development | Flag `fr_wa_1_0` registered (`COT-1208`), off in prod |

Every service in this table has a Drools rule package listed in
`META-INF/kmodule.xml`; the Status column reflects whether its flag is on in prod.

## Role ID mapping (CRD Role ID to ORM Role Name)

The CRD `roleId` field carries a job-title code. `JobTitle` holds the canonical code-to-title
list -- `am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/enums/crd/JobTitle.java:8-29`
-- and the Drools rules match on the code to decide which organisation role name to grant. A code
present in `JobTitle` but not matched by any rule for a given service code yields no role for that
user in that service.

| CRD Role ID | Staff Role Name |
|-------------|----------------|
| 1 | Senior Legal Caseworker (`senior-tribunal-caseworker`) |
| 2 | Legal Caseworker (`tribunal-caseworker`) |
| 3 | Hearing Centre Team Leader (`hearing-centre-team-leader`) |
| 4 | Hearing Centre Administrator (`hearing-centre-admin`) |
| 5 | Court Clerk (`clerk`) |
| 6 | NBC Team Leader (`nbc-team-leader`) |
| 7 | NBC Listing Team |
| 8 | NBC Payments Team |
| 9 | CTSC Team Leader (`ctsc-team-leader`) |
| 10 | CTSC Administrator (`ctsc`) |
| 11 | NBC Administrator (`national-business-centre`) |
| 12 | Regional Centre Team Leader (`regional-centre-team-leader`) |
| 13 | Regional Centre Administrator (`regional-centre-admin`) |
| 14 | DWP Caseworker (`dwp`) |
| 15 | HMRC Caseworker (`hmrc`) |
| 16 | Registrar (`registrar`) |
| 17 | CICA Caseworker (`cica`) |
| 18 | Cafcass Cymru Caseworker (`caseworker-privatelaw-externaluser-viewonly`) |
| 19 | IBCA Caseworker |
| 20 | WLU Administrator |
| 21 | WLU Team Leader |
| 22 | HRS Team Leader (`hrs-team-leader`) |
| 23 | Bailiff Administrator |

Code 16 is absent from `JobTitle`; SSCS matches it directly on `roleId == "16"` to grant
`registrar` -- `sscs-caseworker-mapping.drl:84-101`. Rules that match by job title rather than
by raw code go through `hasValidJobTitle(JobTitle.X)`, as HRS does for code 22 --
`hrs-admin-mapping.drl:28-45`.

## Examples

### flag_config table schema (real source)

```sql
// Source: apps/am/am-org-role-mapping-service/src/main/resources/db/migration/V1.2__new_flag_config_table.sql
CREATE TABLE flag_config(
    id bigint not null,
    flag_name text NOT NULL,
    env text NOT NULL,
    service_name text NOT NULL,
    status bool NOT NULL,
    CONSTRAINT flag_config_pkey PRIMARY KEY (id)
);
create sequence ID_SEQ;
ALTER TABLE flag_config ALTER COLUMN id SET DEFAULT nextval('ID_SEQ');

-- Initial IAC flags (true = enabled; false = disabled in this environment)
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('iac_1_0', 'local', 'iac', 'true');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('iac_1_0', 'prod', 'iac', 'true');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('iac_1_1', 'local', 'iac', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('iac_1_1', 'prod', 'iac', 'false');
-- ...
```

### Flyway migration adding a new feature flag (real source, employment)

New flags always start `false` in deployed environments; they are enabled separately after the rules are tested.

```sql
// Source: apps/am/am-org-role-mapping-service/src/main/resources/db/migration/V1.10__employment_wa_base_flag_addition.sql
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'local', 'employment', 'true');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'pr', 'employment', 'true');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'aat', 'employment', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'demo', 'employment', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'perftest', 'employment', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'ithc', 'employment', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'prod', 'employment', 'false');
```

### refresh_jobs table schema (real source)

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
ALTER TABLE refresh_jobs ALTER COLUMN job_id SET DEFAULT nextval('JOB_ID_SEQ');
```

## OpenAPI spec

The published OpenAPI spec for ORM is available at [`platops/cnp-api-docs/docs/specs/am-org-role-mapping-service.json`](../../../../platops/cnp-api-docs/docs/specs/am-org-role-mapping-service.json).

## See also

- [Org Role Mapping Flow](../explanation/org-role-mapping-flow.md) — end-to-end sequence from ASB message to RAS persistence, and how the refresh endpoints are invoked
- [Drools Rules](../explanation/drools-rules.md) — how ORM's Drools mapping rules derive role assignments from CRD/JRD profiles
- [Write Drools Mapping Rules](../how-to/write-drools-mapping-rules.md) — step-by-step guide to adding new jurisdiction rules and `flag_config` Flyway migrations
- [RAS API Reference](api-role-assignment-service.md) — the downstream RAS API that ORM calls with `replaceExisting=true`
