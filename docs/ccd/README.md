# CCD Documentation

Core Case Data (CCD) is the case-data spine of most HMCTS CFT services. This documentation covers the platform from first principles through to implementation recipes and API reference.

## Tutorials

Start here if you're new to CCD.

- [First Case Type (Config Generator SDK)](tutorials/first-case-type-config-generator.md) — zero to working case type with the Java SDK
- [First Case Type (JSON)](tutorials/first-case-type-json.md) — write a case-type definition in the older JSON format
- [Running with cftlib](tutorials/running-with-cftlib.md) — boot the full CCD stack locally and debug callbacks

## Explanation

Understand how CCD works.

### Core model

- [Overview](explanation/overview.md) — what is CCD: jurisdictions, case types, states, events, fields, tabs
- [Architecture](explanation/architecture.md) — runtime components, deployment shapes, Mermaid diagrams
- [Event Model](explanation/event-model.md) — lifecycle of an event: pages, callbacks, state transitions
- [Callbacks](explanation/callbacks.md) — the callback contract: request/response, errors, timeouts, S2S auth
- [Data Types](explanation/data-types.md) — built-in field types with JSON shapes
- [Permissions](explanation/permissions.md) — CRUD on case-type definitions, role mapping
- [Role Assignment](explanation/role-assignment.md) — case-level RBAC via am-role-assignment-service

### Features

- [Decentralisation](explanation/decentralisation.md) — service-owned case data via /ccd-persistence/*
- [Documents and CDAM](explanation/documents-and-cdam.md) — upload, hash-token, retrieval
- [Search Architecture](explanation/search-architecture.md) — work-basket, global search, ES query search
- [Notice of Change](explanation/notice-of-change.md) — solicitor transfers via AAC
- [Case Flags](explanation/case-flags.md) — party-level and case-level flags
- [Work Basket](explanation/work-basket.md) — definition-driven caseworker queues
- [Work Allocation Integration](explanation/work-allocation-integration.md) — CCD events to WA tasks via DMN
- [Linked Cases](explanation/linked-cases.md) — CaseLink field type and UI flow
- [Hearings Integration](explanation/hearings-integration.md) — HMC callbacks and case fields
- [Supplementary Data](explanation/supplementary-data.md) — sidecar data distinct from case data
- [Audit and History](explanation/audit-and-history.md) — event history, versioning, XUI timeline
- [Definition Import](explanation/definition-import.md) — admin-web upload to ES index seeding

### Integrations

- [Stitching](explanation/stitching.md) — em-stitching-api for document assembly
- [Translation](explanation/translation.md) — ts-translation-service callback flow

## How-to guides

Practical recipes for common tasks.

### Case type structure

- [Add an Event](how-to/add-an-event.md)
- [Add a State](how-to/add-a-state.md)
- [Add a Tab](how-to/add-a-tab.md)
- [Add a Complex Type](how-to/add-a-complex-type.md)

### Callbacks

- [Add a Page Mid-Event Callback](how-to/add-a-page-mid-event-callback.md)
- [Implement a Callback](how-to/implement-a-callback.md)

### Access control

- [Add Permissions](how-to/add-permissions.md)

### Search and discovery

- [Enable Global Search](how-to/enable-global-search.md)
- [Enable Work Basket](how-to/enable-work-basket.md)
- [Enable Query Search](how-to/enable-query-search.md)

### Features

- [Store a Document](how-to/store-a-document.md)
- [Implement NoC](how-to/implement-noc.md)
- [Implement Case Flags](how-to/implement-case-flags.md)
- [Implement Reasonable Adjustments](how-to/implement-reasonable-adjustments.md)
- [Decentralise a Service](how-to/decentralise-a-service.md)

### Operations

- [Debug with cftlib](how-to/debug-with-cftlib.md)
- [Publish Definition to AAT](how-to/publish-definition-to-aat.md)

## Reference

Lookup tables and API contracts.

### APIs

- [Data Store API](reference/api-data-store.md) — start/submit event, search, retrieve case
- [Definition Store API](reference/api-definition-store.md) — import, retrieve case type
- [AAC API](reference/api-aac.md) — NoC, case-assignment endpoints
- [CDAM API](reference/api-cdam.md) — document upload/retrieval

### Contracts

- [Callback Contract](reference/callback-contract.md) — JSON schemas for each callback type
- [Decentralised Callbacks](reference/decentralised-callbacks.md) — /ccd-persistence/* endpoint contract
- [Permissions Matrix](reference/permissions-matrix.md) — CRUD bits, precedence rules

### SDK and definitions

- [Config Generator API](reference/config-generator-api.md) — ConfigBuilder, EventBuilder method reference
- [JSON Definition Format](reference/json-definition-format.md) — every JSON file, columns, allowed values
- [Field Types](reference/field-types.md) — exhaustive type table

### Cross-reference

- [CCD Feature Tokens](reference/ccd-feature-tokens.md) — workspace taxonomy tokens mapped to docs
- [Glossary](reference/glossary.md) — canonical term definitions
