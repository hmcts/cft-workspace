---
title: Professional Refresh Mechanism (PRM)
topic: prm
diataxis: explanation
product: am
audience: both
sources:
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/ProfessionalRefreshOrchestrationHelper.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/CaseDefinitionService.java
  - ccd-definition-store-api:rest-api/src/main/java/uk/gov/hmcts/ccd/definition/store/rest/endpoint/AccessTypesController.java
status: drafted
---

# Professional Refresh Mechanism (PRM)

## TL;DR

- PRM is ORM's organisational-role pipeline for **professional and Other Government Department (OGD)** users — the counterpart to the CRD/JRD-driven [staff and judicial mapping flow](org-role-mapping-flow.md). It derives role assignments from CCD's per-case-type **access types** rather than from Case Worker or Judicial Reference Data.
- It runs as a numbered sequence of scheduled processes (PRM-1 through PRM-6) rather than a single service-bus-triggered flow: detecting definition changes, refreshing stale organisation profiles, and pushing the resulting role assignments to RAS are separate stages, each with its own schedule.
- An access type generates a role assignment for **every** user in the matching organisation profile when it is marked `mandatory`, or `default` with no explicit user opt-out recorded — not only for users who've actively selected it.
- Access-type lookups resolve to the highest version of a case-type reference, so a stale reference with only one version is always "latest" and is never superseded by a newer import — retiring it needs a direct database change, not just a re-import.

## Detecting definition changes

PRM-1 polls CCD definition-store's access-types endpoint and diffs the response against a snapshot ORM stored from its previous poll. Because the comparison is against the live endpoint response rather than an import event, a change made directly in the definition-store database — not only a case-type import — is picked up on the next scheduled poll.

## Which access types produce a role assignment

`ProfessionalRefreshOrchestrationHelper` walks a case type's access types and includes any that are `mandatory`, or `default` with no explicit user selection recorded, when it builds the role-assignment set for a professional/OGD organisation profile. Because these are org-wide defaults rather than per-user choices, every user in the affected profile receives the resulting role assignment on the next refresh — including a group-role assignment scoped to a generated case-access-group ID, when the access type's configuration carries a case-group-id template.

## Reaching RAS

A later stage (user refresh) pushes each affected user's full set of role assignments to RAS with `replaceExisting=true` — the same all-or-nothing replacement semantics the CRD/JRD mapping flow uses (see [`replaceExisting`](../reference/glossary.md)). A definition change is therefore not applied incrementally: it reaches real users on the next scheduled user-refresh run, not the moment the definition changes.

## Scheduling

The six PRM stages are configured as independent cron schedules, set per environment rather than fixed in code — check that environment's current configuration before assuming a cadence based on another environment or on past behaviour. Prod does not necessarily run more often than lower environments; an environment may restrict PRM to a subset of days or hours. The testing-support endpoints that let you trigger the CRD/JRD mapping path on demand (see [Org Role Mapping Flow → Bypassing the topic](org-role-mapping-flow.md#bypassing-the-topic-the-testing-support-entry-point)) are, by the same design, unavailable in prod for PRM too — there is no equivalent on-demand trigger there.

## See also

- [Org Role Mapping Flow](org-role-mapping-flow.md) — the CRD/JRD-driven mapping pipeline for staff and judicial roles
- [Batch Jobs](batch-jobs.md) — the purge and refresh CronJobs used by the staff/judicial path
- [Role Assignment Lifecycle](role-assignment-lifecycle.md) — `replaceExisting` and role-assignment status semantics
