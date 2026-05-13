---
service: am
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - rd
  - flyway
api_specs:
  - apps/am/am-role-assignment-service:am-role-assignment-service.json
  - apps/am/am-org-role-mapping-service:am-org-role-mapping-service.json
  - apps/am/am-judicial-booking-service:am-judicial-booking-service.json
exemplar_dirs: []
repos:
  - apps/am/am-role-assignment-service
  - apps/am/am-org-role-mapping-service
  - apps/am/am-judicial-booking-service
  - apps/am/am-role-assignment-batch-service
  - apps/am/am-role-assignment-refresh-batch
confluence_spaces:
  - AM
  - RBAC
---

# Access Management (AM)

The AM product is the runtime role-assignment plane for the CFT platform. It manages which actors hold which organisational and case-level roles at any given time, and exposes that information to two primary consumers: CCD (for case access control) and Work Allocation (for task routing). Service teams never interact with AM directly — they write Drools rules that ORM and RAS evaluate against Reference Data to derive and persist role assignments.

## Repos

- `apps/am/am-role-assignment-service` — Core API: creates, queries, and deletes role assignments for both case and organisational roles. Consumed by XUI, CCD data store, AAC, WA, and HMC.
- `apps/am/am-org-role-mapping-service` — Provisions organisational roles for staff and judicial users by evaluating Drools mapping rules against Case Worker Reference Data (CRD) and Judicial Reference Data (JRD). Listens to Azure Service Bus topics for CRD and JRD change events.
- `apps/am/am-judicial-booking-service` — Stores judicial location bookings; consumed by ORM when mapping judicial users to location-scoped organisational roles.
- `apps/am/am-role-assignment-batch-service` — Spring Batch Kubernetes job that purges expired role assignment and judicial booking records once a day.
- `apps/am/am-role-assignment-refresh-batch` — Spring Batch job that triggers ORM to re-evaluate and refresh organisational role assignments (e.g. after rule changes).

## Architecture

At the centre sits `am-role-assignment-service` (port 4096), backed by a PostgreSQL database with Flyway migrations. CCD data store, XUI, AAC, WA and HMC are all listed as authorised S2S callers. RAS validates incoming assignment requests against Drools decision tables and persists or deletes records. It also calls CCD data store (`feign: datastoreclient`) to retrieve case data needed for case-role validation.

`am-org-role-mapping-service` (port 4098) consumes two Azure Service Bus topics — one for Case Worker Reference Data changes (`CRD_TOPIC_NAME`) and one for Judicial Reference Data changes (`JRD_TOPIC_NAME`). On receipt it fetches staff/judicial profiles from the CRD (`CASE_WORKER_REF_APP_URL`) and JRD (`JUDICIAL_REF_APP_URL`) Feign clients, runs the Drools mapping rules, and calls RAS to persist the resulting role assignments. It also calls `am-judicial-booking-service` (`JBS_URL`) to factor in judicial location bookings.

`am-judicial-booking-service` (port 4097) is a small standalone Spring Boot service with its own Postgres + Flyway database, holding time-bounded judicial bookings (location, start/end). It exposes `POST /am/judicial/bookings` and is called by ORM during judicial role mapping.

The two batch services are non-HTTP Spring Batch applications scheduled as Kubernetes CronJobs. `am-role-assignment-batch-service` deletes expired records from both the RAS and judicial booking databases. `am-role-assignment-refresh-batch` (port 5333) calls ORM and RAS to trigger a full refresh of organisational role assignments.

## External integrations

- `idam`: all services authenticate via IDAM (`idam-java-client`); S2S secrets and OIDC client configs are set per-service.
- `s2s`: `service-auth-provider-java-client` used across all five repos for inbound and outbound S2S token validation.
- `rd`: ORM calls CRD (`rd-case-worker-ref-api`) and JRD (`rd-judicial-api`) via Feign clients to fetch user profiles for role mapping.
- `flyway`: RAS, ORM, and JBS all manage their Postgres schemas with Flyway migrations under `src/main/resources/db/migration/`.

## Notable conventions and quirks

- RAS uses Drools (`org.drools` 10.x) for role-assignment validation rules; ORM uses a separate Drools engine for mapping rules. Both are embedded in-process rather than deployed as a decision server.
- ORM uses `azure-messaging-servicebus` to subscribe to CRD and JRD change events — this is the primary trigger for organisational role provisioning, not a polling loop.
- All three APIs publish OpenAPI specs via a `SwaggerPublisher` integration test that writes to `/tmp/openapi-specs.json`; the `swagger.yml` workflow picks that up and pushes to `cnp-api-docs`.
- The batch services do not expose HTTP APIs and have no Swagger publication.
- Port assignments: RAS=4096, JBS=4097, ORM=4098, refresh-batch=5333.
- RAS uses Liquibase in older versions of documentation but currently uses Flyway (`spring.flyway.enabled`).
