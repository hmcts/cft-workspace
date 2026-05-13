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
    last_modified: "unknown"
    space: "AM"
  - id: "1658260403"
    title: "Architecture"
    last_modified: "unknown"
    space: "DTSAM"
  - id: "1597738955"
    title: "Work Allocation Common ORG and CASE Roles"
    last_modified: "unknown"
    space: "AM"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- ORM (Org Role Mapping Service) runs on port 4098 and provisions organisational role assignments for staff and judicial users by bridging Reference Data (CRD/JRD) to the Role Assignment Service (RAS).
<!-- REVIEW: Source shows maxRetries=10 and delay=1 minute (FIXED mode), not "max 4 delivery attempts, 5-minute lock duration". See am-org-role-mapping-service:src/main/java/.../config/servicebus/CRDMessagingConfiguration.java:68-71. -->
- Primary trigger is Azure Service Bus (CRD/JRD topics) with PEEKLOCK mode, max 4 delivery attempts, 5-minute lock duration; HTTP endpoints exist for batch refresh and on-demand judicial refresh.
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

- Messages received in **PEEKLOCK** mode via `ServiceBusProcessorClient`.
- Message body is deserialized into a `UserRequest` (list of user IDs that changed).
- On successful processing, the message is completed via `messageContext.complete()`.
- On error, the message is **not** abandoned -- it will not be redelivered until the lock expires (5 minutes).
<!-- CONFLUENCE-ONLY: not verified in source -->
- Maximum 4 delivery attempts configured on the ASB subscription. After 4 failed attempts, messages move to the dead letter queue.
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

When processing caseworker profiles from CRD:
<!-- CONFLUENCE-ONLY: not verified in source -->
- Only the **primary base location** (`isPrimary=true`) is used for the `primaryLocation` attribute.
- **All roles** for a user are considered for mapping (the `isPrimary` flag on role is ignored).
- **All work areas** (service codes) are considered when applying mapping rules.
- A user with `deleteFlag=true` (or soft-deleted) results in an empty `requestedRoles` array, which causes RAS to delete all existing assignments.

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

For judicial users, additional attributes are populated from JRD data:
<!-- CONFLUENCE-ONLY: not verified in source -->
- `beginTime`: Judicial Office Appointment start date.
- `endTime`: Judicial Office Appointment end date.
- `authorisations`: List of authorisation IDs from `judicial_office.authorisation.authorisation_id`.
- `region`: From `judicial_office_appointment.region_id`.
- `baseLocation`: From `judicial_office_appointment.base_location_id`.
- `contractType`: From `judicial_user_profile.contract_type`.

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

Currently onboarded services with active ORM flags (prod):
<!-- CONFLUENCE-ONLY: not verified in source -->
- IAC: `iac_1_1`, `iac_jrd_1_0`, `iac_wa_1_2` through `iac_wa_1_7`
- Civil: `civil_wa_1_0` through `civil_wa_2_5`
- Private Law: `privatelaw_wa_1_0` through `privatelaw_wa_1_8`
- Public Law: `publiclaw_wa_1_0` through `publiclaw_wa_2_2`
- Employment: `employment_wa_1_0` through `employment_wa_3_0`
- SSCS: `sscs_wa_1_0`, `sscs_wa_1_2`, `sscs_wa_1_3`, `sscs_wa_1_5`, `sscs_hearing_1_0`
- Special Tribunals (CIC): `st_cic_wa_1_0` through `st_cic_wa_1_1`

### LaunchDarkly flags (operational toggles)

| Flag key | Purpose | Prod status |
|----------|---------|-------------|
| `orm-jrd-org-role` | Toggle JRD ASB message consumption | Live |
| `orm-refresh-role` | Enable/disable refresh API functionality | Not Live |
| `orm-refresh-job-enable` | Enable/disable refresh job invocation | Not Live |
| `orm-base-flag` | Test flag for FTA scenarios (aat only) | Not Live |

Note: the `application.yaml` comment states "LD is not used but legacy configuration is retained" -- current source retains LD SDK config but may not actively use it for feature decisions.

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
| HRS (Hearing Recording) | In development | Flag: `hrs_1_0` |
| Possessions | Onboarding | Flag: `possessions_wa_1_0` |
| Probate | Onboarding | Flag: `probate_wa_1_0` |
| Financial Remedy | Draft | Not yet signed off |
<!-- CONFLUENCE-ONLY: not verified in source -->

## Role ID mapping (CRD Role ID to ORM Role Name)

The CRD `roleId` field maps to organisation role names via Drools rules:

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
| 22 | HRS Team Leader |
<!-- CONFLUENCE-ONLY: not verified in source -->

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
