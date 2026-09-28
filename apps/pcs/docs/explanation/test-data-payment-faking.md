---
title: Test Data Payment Faking and Case History
topic: test-data-payments
diataxis: explanation
product: pcs
audience: both
sources:
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/testingsupport/endpoint/TestingSupportController.java
  - pcs-api:src/main/resources/db/migration/V001__r1a_baseline_schema.sql
---
# Test Data Payment Faking and Case History

A possession claim only reaches `CASE_ISSUED` once pcs-api receives a `claimIssuePayment` confirmation on `PUT /payment-update`. In production this call comes from ccpay after it takes a real payment. Most non-prod case setup — e2e and functional test suites, performance scripts, and PCS's own testing-support helpers — instead calls `/payment-update` directly with the `pcs_api` service token, skipping ccpay entirely. pcs-api cannot tell the two apart: it marks the fee paid, issues the case, and generates documents and access codes for a faked call exactly as it would for a real one.

A faked payment looks identical to a real one everywhere a caseworker or citizen would look in CCD: case history shows the same `claimIssuePayment` ("Payment Confirmation") event, authored by "Service Account", moving the case to `CASE_ISSUED`. The two only diverge in `fee_payment.payment_reference` — a real ccpay payment carries an `RC-...` reference, while a faked one leaves the reference empty (or, on cases seeded by older scripts, a fixed placeholder reference that repeats across many cases). XUI's Service Request / payment tab queries ccpay live rather than reading anything pcs-api stored, so it correctly reports these cases as "Not paid" even though the case itself is `CASE_ISSUED`. That mismatch is not a bug in either service, and case history alone cannot be used to diagnose it — the case-history event is identical either way.

This is the default outcome of most non-prod case creation, not an isolated incident: on AAT and perftest, tens of thousands of issued claims carry a faked payment against a much smaller number with a real ccpay reference. It's harmless for scenarios that never open the payment tab, but anything that checks payment status through XUI or ccpay — including performance runs that load that page — needs cases paid for real, or must treat "Not paid" as the expected state for its faked cases rather than a defect to chase.
