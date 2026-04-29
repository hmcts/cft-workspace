---
topic: translation
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Translation

## TL;DR

- CCD integrates with `ts-translation-service` to provide Welsh-language (and other) translations of case-type labels, event names, and field labels.
- A case type opts in by declaring a `translationService` endpoint in the case-type definition; CCD data-store calls that endpoint as a callback after certain events.
- Labels returned by the translation service replace the English originals in the UI for the requesting user's locale.
- No code changes are needed inside the service team's callback handlers — translation is a cross-cutting concern handled at the CCD platform layer.

## How translation fits into the case-type definition

<!-- TODO: research note insufficient for ts-translation-service opt-in field name and exact definition-store config key. The following reflects general CCD platform knowledge; verify against ccd-definition-store-api source. -->

A case type opts in to translation by setting the **Translation Service** column in the `CaseType` tab of the definition spreadsheet (or the equivalent JSON field) to the base URL of the `ts-translation-service` instance for that environment. When this field is blank the feature is disabled.

In the ccd-config-generator Java SDK the equivalent is set on the `ConfigBuilder` at case-type level:

```java
builder.translationServiceUrl("https://ts-translation-service.example");
```

<!-- TODO: confirm exact ConfigBuilder method name — not present in current research notes. -->

## Callback flow

When a user submits an event, CCD data-store fires the normal `aboutToStart` / `aboutToSubmit` / `submitted` callback chain. After `submitted` resolves, if the case type has a translation-service URL configured, data-store dispatches a **translation callback** to `ts-translation-service`:

```
POST <translationServiceUrl>/translation/case-event
```

The payload contains the case reference and the event ID. The translation service looks up pre-loaded translations for that case type's labels and returns a map of `original → translated` strings. CCD stores this map against the case and serves translated labels to Welsh-locale users via ExUI.

<!-- TODO: research note insufficient for exact request/response schema of the translation callback endpoint. -->

## See also

- [`docs/ccd/explanation/callbacks.md`](callbacks.md) — full callback lifecycle that translation hooks into
