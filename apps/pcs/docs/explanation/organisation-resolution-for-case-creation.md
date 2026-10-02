---
title: Organisation Resolution for Case Creation
topic: organisation-resolution
diataxis: explanation
product: pcs
audience: both
sources:
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/reference/service/OrganisationService.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/service/party/PartyService.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/service/PcsCaseService.java
---
# Organisation Resolution for Case Creation

Creating a possession claim requires pcs-api to resolve an organisation record for the user submitting the `createPossessionClaim` event. `PartyService.createClaimantStub` calls `OrganisationService.getOrganisationDetailsForCurrentUser()` and requires a non-null result; if it is null, case creation fails with a `NullPointerException` ("Organisation must be provided to create a case") out of `PcsCaseService.createCase`.

`OrganisationService` does not call rd-professional for every user. It first checks whether the current user holds one of three AM organisational roles — `claimant`, `claimant-solicitor`, `defendant-solicitor` — and returns null immediately if none is held, without ever calling rd-professional. Only a user holding one of these roles reaches the rd-professional lookup that actually populates the organisation details.

These organisational roles are not granted by pcs-api itself. They are minted by AM's Professional Refresh Mechanism (PRM) batch, which runs on its own schedule and processes PRD organisation/access-type state asynchronously — see [Professional Refresh Mechanism](../../../am/docs/explanation/professional-refresh-mechanism.md) for how that cadence works and why it can differ by environment. A user who has just been added to an organisation, or whose organisation has just been granted a PCS access type, will not hold the role — and will hit this NPE on case creation — until PRM next processes them. This is a role-propagation delay, not a pcs-api defect; when diagnosing it, check whether AM shows the organisational role for the affected user before assuming a code fault.
