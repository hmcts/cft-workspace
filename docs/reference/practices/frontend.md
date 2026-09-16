---
title: Frontend applications
topic: frontend
diataxis: reference
product: workspace
audience: both
---
# Frontend applications

Citizen frontend applications should be built using a node.js based Server Side Rendering (SSR) framework such as Express.

Professional frontend applications should be built using a node.js based Single Page Application (SPA) framework such as Angular.

Both citizen and professional applications should be based on the [GOV.UK Design System](https://design-system.service.gov.uk/) and use
[GOV.UK Frontend](https://frontend.design-system.service.gov.uk/) or a derivative such as [HMCTS Frontend](https://github.com/hmcts/frontend).

### Node.js

Use the current LTS version. Ensure that there is a process in place to upgrade it as new versions released.

Deno is not currently recommended.

### Dependency management

Ensure dependabot or renovate has been configured so that dependencies are kept up to date.

NPM or Yarn is acceptable.

### TypeScript

TypeScript is recommended for all new projects.

### Browser support

Applications should support the latest version of Chrome, Edge, Firefox and Safari.

Where possible applications should aim to use a responsive layout in order to work on mobile devices.

### Code style

Use an opinionated code linter such as eslint and code formatter such as prettier to eliminate discussions about subjective coding preferences.

### Accessibility

Use Pa11y for accessibility testing to WCAG 2.1 AA.

### Cross-browser and UI testing

Use playwright or cypress to test applications in the browser.

Playwright locator methods such as `isVisible()`, `isChecked()`, `count()` and `textContent()`
accept a `timeout` option, but it only bounds how long that one check waits before returning —
it does not retry. Pairing one of these with a fixed `sleep`/`waitForTimeout` to cover a race
(the element appearing late) is fragile: if the sleep is later removed or shortened, the check
can return a stale `false`/empty result within milliseconds of being called, well before the
element actually appears. Use the retrying equivalents instead — `locator.waitFor()` or
`expect(locator).toBeVisible()` / `.toBeChecked()` — which poll until the condition holds or the
timeout elapses.

Playwright's `--grep`/`--grep-invert` tag filters match as an unanchored substring (or regex),
not an exact tag match. A new tag that is a substring of an existing one — `@health` inside
`@healthCheck`, or `@rent` inside `@rentNonRent` — is silently pulled into any run that filters
on the shorter tag. Check new tag names against the existing tag list for this before adding one.

### Security

Configure the Content Security Policy headers to prevent XSS attacks.

Add CSRF protection to forms to ensure that they cannot be submitted by a third party.

Server-side templating engines (Nunjucks, and Jinja-derivatives generally) autoescape
output by default — that is the primary XSS defence for any value that reaches a template,
not just CSP. A `| safe` filter (or equivalent raw-output helper) disables autoescaping for
that value, so only apply it to content that is verifiably server-constructed or static;
using it on any field editable by an admin, caseworker, or other user and then rendered on a
publicly accessible page reopens a stored-XSS hole that CSP alone will not close.
