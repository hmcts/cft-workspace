# Reference Data (RD) documentation

Reference Data is the CFT platform's shared lookup layer: a suite of six independent Spring Boot REST APIs and two batch-load Kubernetes CronJobs that supply professional organisations, judicial office holder profiles, caseworker profiles, court locations, case flags, and list-of-values to the rest of the CFT estate. None of the services hold CCD case data; they are standalone PostgreSQL-backed stores queried over HTTP by service teams and platform components (XUI, AM, AAC, hearings, payments).

This documentation tree covers the data models, API contracts, integration patterns, and operational procedures for the entire RD product. It is aimed at both service-team engineers integrating with RD APIs and platform engineers maintaining the RD services themselves.

## Reading order

For someone new to Reference Data:

1. [Overview](explanation/overview.md) — what each of the six services does, the S2S/IDAM security model, and how to onboard a new consumer
2. [Architecture](explanation/architecture.md) — service inventory, consumer topology diagram, inter-service dependencies, Azure Service Bus topics, batch loaders, and eLinks integration
3. [Register as S2S Caller](how-to/register-as-s2s-caller.md) — the first practical step for any new consuming service
4. [Query Reference Data](how-to/query-reference-data.md) — HTTP examples for every RD API once you are whitelisted
5. [Professional Organisations](explanation/professional-organisations.md) or [Locations](explanation/locations.md) — deep-dive into whichever domain is most relevant to your service

## By topic

### Core concepts

- [Overview](explanation/overview.md) — six-service product summary, security model, integration onboarding
- [Architecture](explanation/architecture.md) — service ports, consumer topology, ASB topics, batch loaders, eLinks pipeline, NFRs

### Professional organisations (PRD)

- [Professional Organisations](explanation/professional-organisations.md) — organisation lifecycle, PUI roles, PBA model, MFA, AAC integration
- [API Professional](reference/api-professional.md) — full endpoint reference (internal V1/V2, external V1/V2, users, PBAs, MFA, bulk customer)

### Judicial users (JRD)

- [Judicial Users](explanation/judicial-users.md) — eLinks pipeline, JOH lifecycle, ASB publishing, query endpoints, planned refactoring
- [API Judicial](reference/api-judicial.md) — full endpoint reference (search, refresh), request/response shapes, deduplication, routing logic

### Court locations (LRD)

- [Locations](explanation/locations.md) — data model (building locations, court venues, regions, clusters, service codes), consumer usage, V2 design
- [API Location](reference/api-location.md) — full endpoint reference (building-locations, court-venues, venue-search, orgServices, regions), response shapes, gotchas

### Caseworker profiles (CRD)

- [Caseworker Profiles](explanation/caseworker-profiles.md) — profile model, skill and location assignments, IDAM role derivation, ASB publishing, Staff UI

### Common Data

- [Common Data](explanation/common-data.md) — case flags endpoint, list-of-values endpoint, database schema, Welsh bilingual support, security
- [Batch Loading](explanation/batch-loading.md) — Apache Camel route architecture for both batch loaders, load strategies, idempotency, validation, truncate vs upsert

## How-to recipes

- [Register as S2S Caller](how-to/register-as-s2s-caller.md) — raise an RDCC JIRA ticket, get whitelisted in the target API's allowlist, and verify access
- [Query Reference Data](how-to/query-reference-data.md) — obtain S2S and IDAM tokens, choose the right API, call PRD/JRD/LRD/CRD/Common Data with worked HTTP examples
- [Onboard Common Data](how-to/onboard-common-data.md) — add a new CSV data type to `rd-commondata-dataload`: schema migration, Camel route YAML, binder class, Spring Batch wiring

## Reference

- [API Professional](reference/api-professional.md) — `rd-professional-api` endpoint reference
- [API Judicial](reference/api-judicial.md) — `rd-judicial-api` endpoint reference
- [API Location](reference/api-location.md) — `rd-location-ref-api` endpoint reference
- [Glossary](reference/glossary.md) — alphabetical definitions of PRD, JRD, CRD, LRD, eLinks, MRD, S2S, PBA, JOH, epimms_id, service code, ASB, and more
