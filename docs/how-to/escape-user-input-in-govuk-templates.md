---
title: Escape user input in GOV.UK Frontend templates
topic: escape-user-input-in-govuk-templates
diataxis: how-to
product: workspace
audience: service-team
---
# Escape user input in GOV.UK Frontend templates

Stop user-entered text from being rendered as HTML in Express and Nunjucks frontends that use `govuk-frontend` components. This is the fix pattern for the "HTML injection" finding that citizen frontends most often receive from an ITHC, and the same mistake exists in most of the estate's Node frontends because they all build component parameters the same way.

## The trap

Every `govuk-frontend` component that shows text accepts two alternative parameters: `text`, which the macro HTML-escapes, and `html`, which it inserts verbatim. When both are set, `html` wins. This applies to `govukSummaryList` rows (`key`, `value`, `actions.items`), `govukTable` cells, `govukInsetText`, `govukPanel`, `govukNotificationBanner`, `govukErrorSummary` items, `govukRadios` and `govukCheckboxes` item labels and hints, and more.

Nunjucks autoescaping protects `{{ variable }}` in your own templates. It does not protect a value you have already placed in a component's `html` parameter, because by then you have told the macro it is markup.

The usual way this goes wrong is a helper that builds rows for "Check your answers" pages:

```typescript
export function summaryRow(key: string, value: string, href?: string): SummaryRow {
  return {
    key: { text: key },
    value: { html: value },   // every caller's value is now unescaped markup
    actions: href ? { items: [{ href, text: 'Change' }] } : undefined,
  };
}
```

The helper uses `html` so that a handful of callers can pass a `<br>`-separated address or a link. Every other caller then passes free text a user typed (a claim description, evidence, a reason) straight through as HTML. `<b>`, `<u>` and stray closing tags render; a good Content Security Policy is usually what stops `<script>` and `onerror` from executing, and a tester will report the injection either way.

## Steps

### 1. Make the helper safe by default

Escape in the helper, and give intentional markup its own entry point:

```typescript
import { escapeHtml } from 'common/utils/escapeHtml';

export function summaryRow(key: string, value: string, href?: string): SummaryRow {
  return buildRow(key, { text: value }, href);
}

export function summaryRowHtml(key: string, html: string, href?: string): SummaryRow {
  return buildRow(key, { html }, href);
}
```

Using `text` and letting the macro escape is preferable to escaping yourself and passing `html`, because it cannot be double-escaped and does not depend on your utility being correct. If the row value has to be assembled (an escaped user string inside markup you wrote), escape the user parts explicitly and pass the result as `html`:

```typescript
summaryRowHtml(key, `${escapeHtml(line1)}<br>${escapeHtml(postcode)}`, href);
```

### 2. Audit the callers

`grep -rn "summaryRow(" src/main` (or whatever the helper is called). For each call decide: is the value user-entered or externally supplied text (stay on the escaped default), or markup the application wrote (switch to the explicit `Html` variant)? Do the same for any other place that sets `html:` on a component parameter with a value that did not originate in your code.

### 3. Add a test that pins the behaviour

```typescript
it('renders user text with angle brackets as literal text', () => {
  const row = summaryRow('Reason', '<b>not bold</b>');
  expect(row.value.text).toBe('<b>not bold</b>');
  expect(row.value.html).toBeUndefined();
});
```

And a rendering test through the Nunjucks environment for one page, asserting the output contains `&lt;b&gt;`.

### 4. Check where else the same string is rendered

The text usually also reaches CCD (rendered by ExUI, which escapes) and document generation (Docmosis templates treat fields as text unless the template says otherwise). Confirm rather than assume; the ITHC evidence is for one page, but the finding is about the data.

## Do not fix it by rejecting input

Stripping or rejecting `<` and `>` on input is tempting and wrong: legitimate free text contains them ("amount < 100", "A > B"), and the data has already been stored for every existing case. Output encoding at the point of rendering is the fix. Input validation is for format (a postcode, a date), not for HTML safety.

## Related

- [Frontend applications](../reference/practices/frontend.md), Security section
- [Respond to an ITHC penetration test report](respond-to-an-ithc-report.md)
- GOV.UK Frontend component options list `text` and `html` for each component; the rule is the same everywhere: `text` is escaped, `html` is not
