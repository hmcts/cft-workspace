# Access Management (AM) documentation

Access Management is the runtime role-assignment plane for the HMCTS CFT platform. It manages which actors hold which organisational and case-level roles at any given moment, and exposes that information to two primary consumers: CCD (for case access control) and Work Allocation (for task routing). The platform is composed of five services — Role Assignment Service (RAS), Org Role Mapping Service (ORM), Judicial Booking Service (JBS), and two batch CronJobs — all orchestrated around an embedded Drools rules engine.

This docs tree covers the role-assignment data model, the Drools validation and mapping pipelines, the judicial booking flow, batch operations, and practical how-to guides for service teams writing new rules. It follows the [Diátaxis](https://diataxis.fr/) framework. Pages here are product-specific to AM; workspace-wide and platform topics live in the root [`docs/`](../../../docs/) tree.

## Reading order

For someone new to AM:

1. [Overview](explanation/overview.md) — what AM is, the role model, grant types, and how AM fits in the platform
2. [Architecture](explanation/architecture.md) — component diagram, database schemas, and service interactions for all five AM services
3. [Role Assignment Lifecycle](explanation/role-assignment-lifecycle.md) — the create/validate/persist/expire state machine
4. [Drools Rules](explanation/drools-rules.md) — how the embedded rules engine validates assignments in RAS and maps profiles in ORM
5. [Org Role Mapping Flow](explanation/org-role-mapping-flow.md) — end-to-end from Azure Service Bus event to role assignment persisted in RAS

## By topic

### Core concepts

- [Overview](explanation/overview.md) — role model, grant types, organisational vs case roles, specific access workflow, legacy vs new access control
- [Architecture](explanation/architecture.md) — RAS, ORM, JBS, and batch service internals; database schemas; data flow patterns
- [Role Assignment Lifecycle](explanation/role-assignment-lifecycle.md) — status state machine, creation flow, deletion, expiry, ETag caching, delete-by-query safety

### Drools rules engine

- [Drools Rules](explanation/drools-rules.md) — stateless KieSession, RAS validation (two-stage), ORM mapping (single/two-stage judicial), feature flags, bypass mechanisms
- [Write Drools Mapping Rules](how-to/write-drools-mapping-rules.md) — add new ORM jurisdiction rules for caseworker and judicial roles
- [Write Drools Validation Rules](how-to/write-drools-validation-rules.md) — add new RAS approval rules for case roles, system users, and ExistingRoleAssignment checks

### Organisational role provisioning

- [Org Role Mapping Flow](explanation/org-role-mapping-flow.md) — ASB message processing, profile flattening, Drools evaluation, RAS persistence, batch refresh path
- [Batch Jobs](explanation/batch-jobs.md) — purge CronJob (daily expiry deletion) and refresh CronJob (rule-change re-evaluation), operational procedures

### Judicial booking

- [Judicial Booking](explanation/judicial-booking.md) — booking data model, `bookable` attribute, fee-paid judicial role mapping, ExUI UX flow, retention and purge

## How-to recipes

- [Query Role Assignments](how-to/query-role-assignments.md) — use `POST /am/role-assignments/query` (v1 and v2), pagination headers, common patterns for actor/case/location queries
- [Write Drools Mapping Rules](how-to/write-drools-mapping-rules.md) — add ORM caseworker and judicial mapping rules, register feature flags, handle fee-paid booking rules
- [Write Drools Validation Rules](how-to/write-drools-validation-rules.md) — add RAS validation rules for new services, system users, and case-allocator flows

## Reference

- [RAS API Reference](reference/api-role-assignment-service.md) — all RAS endpoints, request/response shapes, enumerated values, Drools pipeline, feature flags, custom media types
- [ORM API Reference](reference/api-org-role-mapping.md) — ORM refresh endpoints, ASB integration, Feign clients, `flag_config` and `refresh_jobs` schemas, configuration reference
- [Glossary](reference/glossary.md) — definitions for AM-specific terms: RAS, ORM, JBS, GrantType, RoleType, `bookable`, `StatelessKieSession`, `replaceExisting`, and more
