---
title: Glossary
topic: reference
diataxis: reference
product: am
audience: both
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
---

# AM Glossary

Terms used across the Access Management documentation.

---

**`actor_cache_control`**
A PostgreSQL table in the RAS database storing one row per actor (IDAM user). Holds an incrementing `etag` integer and a pre-computed `json_response` JSONB blob. Used to implement HTTP 304 ETag caching on `GET /am/role-assignments/actors/{actorId}`.
See: [Role Assignment Lifecycle](../explanation/role-assignment-lifecycle.md)

---

**`ActorIdType`**
Enum identifying the type of ID stored in `actorId`. In practice always `IDAM` (the actor is an IDAM user UUID).
See: [Overview](../explanation/overview.md)

---

**ASB (Azure Service Bus)**
The message broker carrying CRD and JRD user-change events. ORM subscribes to two ASB topics (one for CRD, one for JRD) in PEEKLOCK mode and calls RAS after processing each message.
See: [Architecture](../explanation/architecture.md)

---

**`bookable`**
A boolean attribute stored on certain fee-paid judicial role assignments. When any current role assignment for a user has `bookable=true`, ExUI presents the judicial booking UI on login.
See: [Judicial Booking](../explanation/judicial-booking.md)

---

**`CaseWorkerAccessProfile`**
An ORM internal model — one `CaseWorkerAccessProfile` is created per `role x workArea` combination from a CRD `CaseWorkerProfile`. These objects are inserted as Drools facts during ORM mapping rule evaluation.
See: [Org Role Mapping Flow](../explanation/org-role-mapping-flow.md)

---

**Classification**
Enum controlling security-level scoping of a role assignment: `PUBLIC`, `PRIVATE`, `RESTRICTED` (ordered: RESTRICTED >= PRIVATE >= PUBLIC). A user with RESTRICTED classification can access all three levels.
See: [RAS API Reference](api-role-assignment-service.md)

---

**CRD (Case Worker Reference Data)**
The `rd-case-worker-ref-api` service, which is the canonical source of staff user profiles. ORM fetches profiles from CRD when it receives a user-change event from Azure Service Bus.
See: [Architecture](../explanation/architecture.md)

---

**`ExistingRoleAssignment`**
A distinct Java type in RAS (not to be confused with `RoleAssignment`). Represents role assignments already in the database, fetched for the assigner, authenticated user, and assignees before Drools rules run. Used in rules that require the assigner or assignee to already hold a qualifying role.
See: [Drools Rules](../explanation/drools-rules.md)

---

**`FeatureFlag`**
A Drools fact loaded from the `flag_config` PostgreSQL table (one per flag name). Every ORM and RAS rule begins with a `FeatureFlag` guard condition. In production, flags are cached at startup; in lower environments they are re-read per execution.
See: [Drools Rules](../explanation/drools-rules.md)

---

**`flag_config`**
A PostgreSQL table in the ORM (and RAS) database storing per-environment Drools feature flags. Schema: `(id, flag_name, env, service_name, status)`. New flags are added via Flyway migrations.
See: [ORM API Reference](api-org-role-mapping.md)

---

**GrantType**
Enum controlling how a role was granted: `BASIC` (default), `STANDARD` (org role from profile), `SPECIFIC` (explicitly allocated case role), `CHALLENGED` (self-requested with justification), `EXCLUDED` (conflict of interest removal).
See: [Overview](../explanation/overview.md)

---

**JBS (Judicial Booking Service)**
`am-judicial-booking-service`, port 4097. Stores time-bounded judicial location bookings. ORM queries JBS during fee-paid judicial role mapping to obtain `locationId` and `regionId` for location-scoped assignments.
See: [Judicial Booking](../explanation/judicial-booking.md)

---

**JRD (Judicial Reference Data)**
The `rd-judicial-api` service, which is the canonical source of judicial user profiles and appointments. ORM fetches judicial profiles from JRD when it receives a user-change event.
See: [Architecture](../explanation/architecture.md)

---

**`JudicialAccessProfile`**
An ORM internal model — one `JudicialAccessProfile` is created per `appointment x serviceCode` combination from a JRD `JudicialProfileV2`. Inserted as Drools facts for Stage 1 judicial office holder mapping.
See: [Org Role Mapping Flow](../explanation/org-role-mapping-flow.md)

---

**`JudicialBooking`**
An ORM internal model representing a booking record fetched from JBS. Inserted as a Drools fact so that Stage 2 fee-paid judicial rules can join on `userId` and read `locationId`/`regionId`.
See: [Judicial Booking](../explanation/judicial-booking.md)

---

**`JudicialOfficeHolder`**
An intermediate Drools fact produced by Stage 1 judicial mapping rules. Carries an `office` string (e.g. `"CIVIL Circuit Judge-Salaried"`) that Stage 2 rules match against. Does not persist — exists only in working memory during a single Drools execution.
See: [Drools Rules](../explanation/drools-rules.md)

---

**kmodule.xml**
A Drools classpath descriptor (`META-INF/kmodule.xml`) that declares which `KieBase` packages are loaded into the rule engine. Both RAS and ORM have their own `kmodule.xml`. A `.drl` file in a package not listed here will never be loaded.
See: [Drools Rules](../explanation/drools-rules.md)

---

**ORM (Org Role Mapping Service)**
`am-org-role-mapping-service`, port 4098. Provisions organisational role assignments by subscribing to CRD/JRD Azure Service Bus topics, evaluating Drools mapping rules, and calling RAS with `replaceExisting=true`.
See: [Org Role Mapping Flow](../explanation/org-role-mapping-flow.md)

---

**`process` / `reference`**
Two string fields on a role assignment request that group related assignments for bulk replacement or deletion. ORM uses `process="staff-organisational-role-mapping"` and `reference=<userId>`. When `replaceExisting=true`, RAS deletes all existing assignments sharing the same `process`+`reference` before inserting the new set.
See: [Role Assignment Lifecycle](../explanation/role-assignment-lifecycle.md)

---

**RAS (Role Assignment Service)**
`am-role-assignment-service`, port 4096. The central CRUD and query API for role assignments. Validates every create/delete request through an embedded Drools engine and persists approved assignments to PostgreSQL.
See: [Architecture](../explanation/architecture.md)

---

**`refresh_jobs`**
A PostgreSQL table in the ORM database tracking bulk role-refresh jobs. Columns include `job_id`, `role_category`, `jurisdiction`, `status` (`NEW`/`COMPLETED`/`ABORTED`), and `user_ids` (for targeted retries). The refresh batch reads `NEW` rows and dispatches them to ORM's refresh endpoint.
See: [Batch Jobs](../explanation/batch-jobs.md)

---

**`replaceExisting`**
A boolean flag on a role-assignment create request. When `true`, RAS atomically deletes all existing assignments with the same `process`+`reference` and inserts the new set. ORM always sets this to `true`.
See: [Role Assignment Lifecycle](../explanation/role-assignment-lifecycle.md)

---

**RoleCategory**
Enum classifying the user population a role belongs to: `JUDICIAL`, `LEGAL_OPERATIONS`, `ADMIN`, `PROFESSIONAL`, `CITIZEN`, `SYSTEM`, `OTHER_GOV_DEPT`, `CTSC`.
See: [RAS API Reference](api-role-assignment-service.md)

---

**`RoleConfig`**
A singleton loaded from JSON files under `src/main/resources/roleconfig/` at RAS startup. Defines each role's valid structural patterns. Used by the Stage 2 Drools rule `validate_role_assignment_against_patterns` as a fact in working memory.
See: [Drools Rules](../explanation/drools-rules.md)

---

**RoleType**
Enum distinguishing `ORGANISATION` roles (staff/judicial standing roles derived from Reference Data) from `CASE` roles (scoped to a specific `caseId`).
See: [Overview](../explanation/overview.md)

---

**S2S (Service-to-Service)**
Authentication mechanism where microservices identify themselves via short-lived tokens issued by `service-auth-provider`. The `clientId` extracted from the S2S token determines which Drools validation rules apply to a request.
See: [Architecture](../explanation/architecture.md)

---

**`StatelessKieSession`**
The Drools session type used by both RAS and ORM. No working memory persists between invocations — facts are inserted fresh each time `execute(commands)` is called. This makes Drools execution side-effect-free across requests.
See: [Drools Rules](../explanation/drools-rules.md)

---

**`substantive`**
An attribute set on a role assignment by the Stage 2 Drools pattern-validation rule (`"Y"` or `"N"`). Derived from the `substantive` field in the role's JSON configuration. Substantive roles represent a user's primary standing roles (as opposed to task-routing or shadow roles).
See: [Role Assignment Lifecycle](../explanation/role-assignment-lifecycle.md)

---

**`validAt`**
A query filter on `POST /am/role-assignments/query` that returns only assignments whose time window contains the given timestamp: `(beginTime IS NULL OR beginTime <= validAt) AND (endTime IS NULL OR endTime >= validAt)`.
See: [Query Role Assignments](../how-to/query-role-assignments.md)
