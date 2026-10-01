---
title: The citizen API lives in et-cos
topic: citizen-api
diataxis: explanation
product: et
audience: service-team
status: drafted
last_reviewed: 2026-09-30
sources:
  - et-ccd-callbacks:src/main/java/uk/gov/hmcts/reform/et/syaapi/controllers/ManageCaseController.java
  - et-ccd-callbacks:src/main/java/uk/gov/hmcts/reform/et/syaapi/service/CaseService.java
  - cnp-flux-config:apps/et/et-sya/prod.yaml
  - cnp-flux-config:apps/et/et-syr/prod.yaml
  - cnp-flux-config:apps/et/et-sya-api/prod.yaml
---

# The citizen API lives in et-cos

The API behind the ET citizen and respondent portals used to be a separate service, `et-sya-api`. It was merged into `et-ccd-callbacks` (et-cos) by [hmcts/et-ccd-callbacks#3013](https://github.com/hmcts/et-ccd-callbacks/pull/3013) in March 2026. Any change to the citizen API (`/cases/*`, `/generic-tse/*` and similar endpoints) belongs in et-ccd-callbacks.

## Where the code is

The migrated code keeps its original package, `uk.gov.hmcts.reform.et.syaapi`, alongside et-cos's own `uk.gov.hmcts.ethos.replacement.docmosis` package in the same repo and jar.

The `hmcts/et-sya-api` repo and the workspace clone at `apps/et/et-sya-api` are **stale**. They have kept the pre-migration code, and the et-cos copy has diverged since. For example, et-cos's `ManageCaseController` has case-role filtering and case-transfer-info that the old repo lacks. When the two copies disagree, et-cos is the one running in production.

## How traffic reaches it

Both frontends set `ET_SYA_API_HOST` to `http://et-cos-<env>.service.core-compute-<env>.internal` in every environment:

- `et-sya-frontend`, the claimant (ET1) portal
- `et-syr-frontend`, the respondent (ET3) portal

The request path for a citizen event, for example submitting an ET1, is:

1. The browser calls et-sya-frontend (for example `GET /submitDraftCase`).
2. et-sya-frontend calls et-cos (`PUT /cases/submit-case`).
3. et-cos calls `ccd-data-store-api` as the citizen (`startEventForCitizen` / `submitEventForCitizen`).
4. Data-store calls **back into et-cos** for the event's callbacks (for example `preDefaultValues` and `postDefaultValues`). It then calls et-cos again to save the case, because ET case types are decentralised to et-cos (see [Decentralised persistence and concurrent updates](decentralised-persistence-and-concurrent-updates.md)).

So a single citizen action can pass through et-cos three or more times. In App Insights all of it appears under `cloud_RoleName == "HMCTS et cos"`.

## What is left of et-sya-api

The `et-sya-api` HelmRelease is still in `cnp-flux-config` (`apps/et/et-sya-api/`), and in prod it runs an image built on 26 May 2026. In the week to 30 September 2026 it served only:

- health probes;
- the `AdminUserService.emptyAdminUserToken` scheduled job.

It handled no business traffic. Retiring the deployment, and checking that the scheduled job isn't also running in et-cos, is a decision for the ET team.

## Residual naming

The old service name still appears in configuration:

- et-cos's IDAM client secret falls back to `ET_SYA_API_IDAM_CLIENT_SECRET`;
- the workspace docs have historically listed `et-sya-api` / `et_sya_api` as an IDAM client and S2S name.

Check the current et-cos `application.yaml` before assuming which client or S2S identity the citizen API uses.
