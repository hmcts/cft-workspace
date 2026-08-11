---
service: xui
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - idam
  - s2s
  - am
  - rd
  - payment
  - cdam
  - work_allocation
exemplar_dirs: []
repos:
  - apps/xui/rpx-xui-webapp
  - apps/xui/rpx-xui-manage-organisations
  - apps/xui/rpx-xui-common-lib
  - apps/xui/ccd-case-ui-toolkit
  - apps/xui/rpx-xui-node-lib
  - apps/xui/rpx-xui-translation
  - apps/xui/rpx-xui-approve-org
  - apps/xui/rpx-xui-dev-utils
  - apps/xui/rpx-xui-icp-api
confluence_spaces:
  - EUI
  - EXUI
---

# XUI (Expert UI)

XUI is the HMCTS caseworker and legal-professional user-interface platform. It provides Manage Cases, Manage Organisations, and Approve Organisation, the shared Angular and Node libraries behind them, and the In Court Presentation API used by Media Viewer to coordinate live evidence-presenting sessions. XUI renders and orchestrates CCD and surrounding platform services but does not own CCD case definitions or case data.

## Repos

- `apps/xui/rpx-xui-webapp` — Manage Cases Angular SPA and Express BFF for caseworkers and judiciary; embeds the CCD UI toolkit and Media Viewer.
- `apps/xui/rpx-xui-manage-organisations` — Manage Organisations Angular SPA and Express BFF for legal firms, users, case sharing, and PBA accounts.
- `apps/xui/rpx-xui-common-lib` — Shared Angular components and services, including session-timeout UI and LaunchDarkly support.
- `apps/xui/ccd-case-ui-toolkit` — Published Angular library that renders CCD case lists, field types, wizard forms, event flows, and documents.
- `apps/xui/rpx-xui-node-lib` — Published Express middleware for OIDC, S2S token exchange, Redis-backed sessions, security headers, and telemetry.
- `apps/xui/rpx-xui-translation` — Published Angular pipe and service for loading Welsh translations from Translation Service.
- `apps/xui/rpx-xui-approve-org` — Approve Organisation Angular SPA and Express BFF used by HMCTS administrators to approve legal organisations.
- `apps/xui/rpx-xui-dev-utils` — XUI developer and maintenance utilities; not deployed as a runtime service.
- `apps/xui/rpx-xui-icp-api` — Node API that creates and manages In Court Presentation sessions for Media Viewer using Redis and Azure Web PubSub.

## Architecture

The three browser applications use an Angular SPA with a co-located Express BFF. The BFF owns OIDC sessions, obtains S2S tokens, and proxies calls to HMCTS services; the shared common, toolkit, node, and translation packages keep UI, authentication, session, and localisation behaviour aligned across applications.

Manage Cases talks to `ccd-api-gateway-web` for browser-facing CCD operations and `ccd-data-store-api` for server-side flows. It also orchestrates Work Allocation, Access Management, Hearings, CDAM, Reference Data, Payments, and Translation Service. Manage Organisations and Approve Organisation use Reference Data for organisation and user administration, CCD and `aac-manage-case-assignment` for case-sharing flows, and Access Management for role assignments; Manage Organisations also handles PBA operations through Payments.

Manage Cases embeds `@hmcts/media-viewer` and proxies `/icp/sessions` to `rpx-xui-icp-api`. The ICP API verifies the caller's IDAM token through `/o/userinfo`, creates or retrieves a daily session keyed by case and document, returns an Azure Web PubSub client token, stores session and participant state in Redis, and handles real-time join, leave, presenter, and screen events at `/eventhandler`.

All three browser applications authenticate through IDAM OIDC with application-specific client IDs. Deployed BFF sessions use Redis, Key Vault secrets are mounted with `@hmcts/properties-volume`, and runtime feature flags use LaunchDarkly.

## External integrations

- `idam` — the web applications use IDAM OIDC; the ICP API validates incoming bearer tokens against IDAM `/o/userinfo`.
- `s2s` — the BFFs obtain service tokens from `rpe-service-auth-provider` through `@hmcts/rpx-xui-node-lib`.
- `am` — Manage Cases and organisation flows call role-assignment and organisation-role-mapping services.
- `rd` — the applications use professional, location, judicial, and caseworker Reference Data APIs.
- `payment` — Manage Cases and Manage Organisations call Payments for Fees and Pay and PBA operations.
- `cdam` — Manage Cases routes document access through `ccd-case-document-am-api`.
- `work_allocation` — Manage Cases calls Task Management and Workflow APIs for caseworker and judicial work.

## Notable conventions and quirks

- XUI owns the CCD presentation and orchestration layer but no CCD definitions, so `ccd_based` and `ccd_config` remain `false` and `none`.
- The ICP repository moved into the XUI namespace, while runtime identifiers intentionally remain `em-icp`, including the Helm chart, service host, image path, Key Vault, and Web PubSub resources.
- The ICP API runs on port 8080 and exposes Swagger UI at `/swagger`, but it has no workflow publishing an OpenAPI file to `hmcts/cnp-api-docs`.
- The three web applications use Node 20 images; the ICP API currently uses the Node 18 base image.
