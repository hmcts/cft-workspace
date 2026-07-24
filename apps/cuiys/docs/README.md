---
title: CUIYS Documentation
topic: overview
diataxis: explanation
product: cuiys
audience: both
status: linked
---

# CUI Your Support (CUIYS) documentation

CUIYS ("CUI Your Support", originally **CUIRA**) is a shared HMCTS microsite that
lets citizens request, view and update the support they need for their case —
currently Reasonable Adjustments, recorded as CCD Case Flags v2.1. Service citizen
UIs integrate with it via a redirect-and-callback API instead of building the RA
journey themselves.

This `docs/` tree is written for HMCTS engineers — both service-team developers
onboarding a citizen UI to CUIYS and engineers maintaining the `cui-ra` microsite.

## Reading order

1. [Overview](explanation/overview.md) — what CUIYS is, why it exists, the
   integration model, and the citizen journey.
2. [Onboard a Service to CUIYS](how-to/onboard-a-service.md) — the end-to-end
   service-team recipe.
3. [Payload API](reference/payload-api.md) — the two-endpoint contract: headers,
   request/response schema, flag schema, environments.

## By Diátaxis type

### Explanation

- [Overview](explanation/overview.md)

### How-to

- [Onboard a Service to CUIYS](how-to/onboard-a-service.md)

### Reference

- [Payload API](reference/payload-api.md)

## Notes on sources

These pages are reconciled against the `cui-ra` source (see each page's `sources:`
frontmatter). The Confluence pages in the `CUIRA` space were the starting point but
contain known inaccuracies (status code, redirect URL format, header names) — the
[Payload API](reference/payload-api.md#corrections-to-the-confluence-spec) page
lists the corrections. Pages are marked `status: draft` pending a review pass.
