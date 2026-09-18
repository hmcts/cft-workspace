---
title: Respond to an ITHC penetration test report
topic: respond-to-an-ithc-report
diataxis: how-to
product: workspace
audience: service-team
---
# Respond to an ITHC penetration test report

Turn a Cyberfort (or other tester) ITHC report into an owned, trackable response without leaking the report, without taking on other teams' findings, and with a retest pack that has no gaps.

Every CFT service goes through this annually. The report lists findings against *hosts* (Manage Case, Manage Org, your citizen frontend) and *repositories*, and a large share of what is attributed to your service is actually ExUI, CCD, EM, Fees and Pay or Platform Operations code. The response has to sort that out before anyone starts fixing things.

## Before you start

- **The report is OFFICIAL-SENSITIVE.** It does not go into Jira, Confluence, Slack, or a git repository, and neither do its screenshots, payloads, endpoints-with-parameters, or the test account list. Tickets reference findings by number (`F3`, `PSC-05`) and describe the fix, not the exploit. Secops can share the report directly with any owning team that needs the detail.
- Extract the text once, locally (`pdftotext -layout`), so you can grep it. Keep that file out of any repository.
- Have the five to ten repositories that the tested hosts are built from checked out. Ownership is decided by reading code, not by the host name in the report.

## Steps

### 1. Read the whole report, then build one table

One row per finding: reference, title, CVSS and rating, the assets the report lists, and a blank *owner* column. Add the Principal Security Concerns (PSCs) as a second table with Pass or Fail and which finding each failure maps to. The PSC table matters because the assurance sign-off is on the PSCs, not the findings.

### 2. Decide ownership by where the code lives

For each finding, find the code or configuration that would have to change. Do not take the report's asset list as ownership. Typical patterns:

| Report says | Usually owned by |
|---|---|
| Manage Case or Manage Org host: cookies, headers, config endpoints, verbose errors | ExUI (`rpx-xui-webapp`, `rpx-xui-manage-organisations`) |
| Document upload, conversion, PDF generation, Docmosis, LibreOffice | EM (`dg-docassembly-api`) and CCD (`ccd-case-document-am-api`, `dm-store`) |
| TLS, ciphers, certificate, DNS CAA, OCSP, HSTS preload on a `*.platform.hmcts.net` host | Platform Operations (Front Door, DNS) |
| Payments endpoints reached through Manage Case | Fees and Pay (`ccpay-*`), proxied by ExUI |
| Your citizen frontend host, your repositories, your CCD definition | You |

Findings frequently split. A broken access control chain may run through a platform endpoint (theirs), a value your service sends to it (yours), and a Notice of Change challenge question in your CCD definition (yours). Record each link separately.

Read the actual code for the findings you own before writing the fix. Count the callers, find the existing utility that should have been used, confirm the configuration line. A ticket that says "escape output in `summaryRow`, 56 callers, `escapeHtml` exists but is used in 6 files" gets picked up; "fix HTML injection" does not.

### 3. Check the report's own evidence against any "already covered" claim

If someone says a finding is covered by an existing control (a WAF, an anti-virus scan, a proxy), check whether the report shows the attack succeeding *through* that control. A `200` response via Front Door means the WAF did not stop that payload on that environment. Record the position as "we believe X covers this, owner to confirm", not "covered", so it survives the retest.

### 4. Raise one epic and a small set of tickets

- One epic per engagement: `<Service> ITHC <year>: respond to <tester> penetration test findings`. Do not reuse a previous year's epic; keep engagements separable.
- One ticket per finding you own, named `<repo>: <what changes> [ITHC-<year> F<n>]` with the root cause, file paths, and acceptance criteria including the evidence to capture for the retest (header output, before and after counts).
- A **decision ticket** for anything that needs a product owner or another team to answer before implementation can be scoped.
- A **routing ticket** with a table of every finding you do not own: what to send, to whom, and columns for date sent, their ticket reference, and status. The retest is against the whole scope, so gaps here read as your inaction.
- A **clean-up ticket** for the post-assessment actions: rotate the passwords on every shared test account the testers were given; delete only accounts the testers created themselves; do not rebuild a non-production environment on the report's suggestion alone if your regression pack depends on its data.

Leave tickets unassigned until the team has agreed who picks the work up.

### 5. Publish a map, not the report

A short Confluence page with the findings table, ownership, Civil action in one line, and ticket links, plus the PSC table, is what other teams and management will read. Keep it detail-free so it can be shared without handling constraints. Link it from the epic.

### 6. Ask secops the questions the report leaves open

Typically: the raw scanner export the report references but does not include (for example a Snyk export), the retest date and evidence format, whether a particular journey was actually exercised, and the remediation SLA per severity so target dates can be set.

## Checklist for the retest pack

- Every owned finding: fix merged and deployed to the tested environment, or a written justification with a review date
- Every routed finding: the owning team's ticket reference and current status
- Captured evidence per finding as the acceptance criteria specified
- Test account passwords rotated
- The map page current

## Related

- [Azure Front Door WAF debug](afd-waf.md): how to check whether a request was logged or blocked by the WAF, useful for the "already covered" check in step 3
- [Escape user input in GOV.UK Frontend templates](escape-user-input-in-govuk-templates.md): the fix pattern for the HTML injection finding that citizen frontends most commonly receive
- [Create IDAM test users](create-idam-test-users.md) and [Create a professional organisation for testing](create-test-organisations.md): provisioning the accounts the testers need before the engagement
