---
title: General Application Email Notifications
topic: general-applications
diataxis: reference
product: pcs
audience: both
sources:
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/event/genapp/SubmitEventHandler.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/feesandpay/service/GenAppPaymentCallbackHandler.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/notify/service/NotificationService.java
---
# General Application Email Notifications

PCS sends exactly one email for a general application (gen-app): "general application received". It always goes to the applicant party only — there is no notification to the respondent, the other party's representative, or the claimant when a defendant applies. The only gen-app method on `NotificationService` is `sendGenAppReceivedEmail` (`NotificationService.java:232`); there is no "application granted" or "application refused" notification once a caseworker decides it.

Whether and when the email fires depends on the submitting journey and whether a fee is due:

- **Citizen (CUI) application with no fee.** Sent immediately on submit, alongside the submission document and the review task (`SubmitEventHandler.java:126`).
- **Any application with a fee, from either journey.** Nothing is sent on submit. The application sits in state `PENDING_GEN_APP_ISSUED` and the email only goes out when the payment callback reports `PAID` (`GenAppPaymentCallbackHandler.java:42`). If the payment fails or is never completed, no email is ever sent — the handler only logs a warning, so a stalled payment is a silent notification gap, not a visible error.
- **ExUI (legal rep or caseworker) application with no fee.** No email at all. The ExUI branch (`SubmitEventHandler.java:103-116`) creates the submission document and the Work Allocation review task but never calls `NotificationService` — this is asymmetric with the CUI no-fee path, which does notify.

When investigating a "did we not send a notification for this gen-app" question, check the application's fee status and submitting journey first; each of the three paths above has a different, independent trigger point rather than a single place where the email is sent.
