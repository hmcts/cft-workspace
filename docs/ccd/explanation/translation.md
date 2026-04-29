---
topic: translation
audience: both
sources:
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/TranslationServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/service/ImportServiceImpl.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/util/translation/DefinitionSheetsToTranslate.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/client/translation/TranslationServiceApiClient.java
  - ccd-definition-store-api:excel-importer/src/main/java/uk/gov/hmcts/ccd/definition/store/excel/client/translation/DictionaryRequest.java
  - ccd-definition-store-api:domain/src/main/java/uk/gov/hmcts/ccd/definition/store/domain/ApplicationParams.java
  - ccd-admin-web:src/main/service/manage-welsh-dictionary-service.ts
  - ccd-admin-web:src/main/service/welsh-dictionary-service.ts
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1875863695"
    title: "Using Welsh Language Translation"
    space: "RRFM"
  - id: "1775187467"
    title: "Welsh Language Translation Service Operations Guide"
    space: "WLTS"
  - id: "1576340177"
    title: "Welsh Language Translation Service Home"
    space: "WLTS"
  - id: "1875620232"
    title: "Understanding character representation issues with Welsh Translations"
    space: "EXUI"
---

# Translation

## TL;DR

- CCD integrates with `ts-translation-service` (WLTS — Welsh Language Translation Service) to provide Welsh-language translations of case-type labels, event names, hint text, fixed-list values, and similar definition strings.
- Integration is **at definition-import time**, not per-event: when a case definition is uploaded to `ccd-definition-store-api`, it asynchronously PUTs translatable strings to the translation service's `/dictionary` endpoint to seed it with English phrases.
- It is **platform-wide**, not per-case-type — controlled by the `welsh-translation.enabled` flag on the definition store. There is no opt-in field on the case-type definition itself, and no method on the ccd-config-generator `ConfigBuilder`.
- ExUI (not data-store) is what calls the translation service at runtime to look up Welsh equivalents for the strings it renders. Welsh translations themselves are uploaded separately, via the Admin Web "Manage Welsh Dictionary" CSV upload, to seed the same dictionary.

## How translation actually integrates with CCD

Live in production for all services since March 2025. The flow is:

1. A service team uploads a case-type definition spreadsheet to `ccd-definition-store-api` (typically via `ccd-admin-web`).
2. After the import finishes parsing all sheets, if `welsh-translation.enabled` is true the definition store kicks off an **`@Async` background task** that scans configured columns of configured sheets and builds a `DictionaryRequest` payload of `{ english_phrase: { translation: "", yesOrNo: <bool> } }` entries.
3. That payload is sent as `PUT <ts.translation.service.host>/dictionary` (Feign client `TranslationServiceApiClient`). The translation service stores any new English phrases for later translation. Existing phrases are unaffected.
4. Translators (typically via the Welsh Language Unit) populate Welsh equivalents and upload them as a CSV through Admin Web's "Manage Welsh Dictionary" page (or call the dictionary endpoints directly).
5. At runtime, **ExUI** — not the CCD data-store — calls the translation service to resolve Welsh equivalents for case-definition strings it renders, falling back to English where no translation exists.

Failures of step 2/3 are logged but do **not** fail the import (see `TranslationServiceImpl.callTranslationService`: errors are caught and logged at `error` level only).

## Configuration

Translation is enabled platform-wide on the definition store, not per case type:

```properties
# ccd-definition-store-api application.properties
welsh-translation.enabled=${WELSH_TRANSLATION_ENABLED:true}
ts.translation.service.host=${TS_TRANSLATION_SERVICE_HOST:http://localhost:4650}
```

In the chart values for `ccd-definition-store-api`, the host points at the cluster-internal hostname:

```yaml
TS_TRANSLATION_SERVICE_HOST: http://ts-translation-service-{env}.service.core-compute-{env}.internal
```

There is **no** `translationServiceUrl` (or similar) method on the ccd-config-generator `ConfigBuilder`, and no per-case-type "Translation Service" column on the `CaseType` sheet — translation is a platform concern, not a service-team opt-in. <!-- DIVERGENCE: prior draft of this page claimed both a per-case-type opt-in column on the CaseType sheet and a `builder.translationServiceUrl(...)` SDK method. Source review of `libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/ConfigBuilder.java` and `apps/ccd/ccd-definition-store-api/.../TranslationServiceImpl.java` shows neither exists; the only switch is `welsh-translation.enabled` on the definition store. Source wins. -->

For local rse-cft-lib runs the flag is hard-defaulted to false in the bootstrapper, so translation does nothing locally without a code change. <!-- CONFLUENCE-ONLY: rse-cft-lib hard-default false noted in Confluence (RRFM/1875863695); not re-verified here. -->

## What gets pushed to the dictionary on import

The set of (sheet, column) tuples that the definition store scans is fixed in `DefinitionSheetsToTranslate.DEFINITION_SHEETS_TO_TRANSLATE`:

| Sheet | Columns scanned for translatable strings |
| --- | --- |
| `CaseType` | `Name`, `Description` |
| `Jurisdiction` | `Name`, `Description` |
| `State` | `Name`, `Description` |
| `CaseEvent` | `Name`, `Description` |
| `CaseEventToFields` | `PageLabel` |
| `CaseEventToComplexTypes` | `EventElementLabel`, `EventHintText` |
| `CaseField` | `Label`, `HintText` |
| `ComplexTypes` | `ElementLabel`, `HintText` |
| `CaseTypeTab` | `TabLabel` |
| `ChallengeQuestionTab` | `QuestionText` |
| `FixedLists` | `ListElement` |
| `SearchInputFields` | `Label` |
| `SearchResultFields` | `Label` |
| `SearchCasesResultFields` | `Label` |
| `WorkBasketInputFields` | `Label` |
| `WorkBasketResultFields` | `Label` |

Each entry becomes a key in the `translations` map of the `PUT /dictionary` request body, with an empty `translation` value and a `yesOrNo` flag set to true when the source field is a `YesOrNo` `CaseField` `Label` (so the translation service knows the same phrase needs separate Yes/No renderings).

### Known limitation: HTML in labels

If a `Label` contains HTML markup, the entire label (HTML and all) is pushed as a **single phrase** rather than tokenised. Welsh translations therefore have to match the full HTML-bearing string verbatim — translating just the natural-language fragments inside won't work. <!-- CONFLUENCE-ONLY: documented in RRFM/1875863695 from PCS spike; not separately verified here. -->

## Wire format: the `PUT /dictionary` payload

```json
{
  "translations": {
    "Submit application": { "translation": "" },
    "Are you sure?":      { "translation": "", "yesOrNo": true },
    "Existing phrase":    { "translation": "Welsh equivalent" }
  }
}
```

`translation` is empty when the definition store is just registering English phrases. When a CSV is uploaded through Admin Web, both sides are populated. The optional `yesOrNo`/`yes`/`no` keys exist in the wire format but extensive testing on AAT showed only `yesOrNo: true` has any observable effect — the `yes`/`no` translation fields are not used by the dictionary. <!-- CONFLUENCE-ONLY: yes/no behaviour noted in RRFM/1875863695. -->

## Admin Web "Manage Welsh Dictionary" CSV

Translators upload Welsh translations as a CSV via Admin Web (`/manageWelshDictionary`). The expected format is:

```csv
"englishPhrase","welshPhrase"
```

…or optionally:

```csv
"englishPhrase","welshPhrase","yesOrNo","yes","no"
```

The Admin Web Node service (`manage-welsh-dictionary-service.ts`) parses the CSV, builds the JSON shape above, and PUTs it to the same `/dictionary` endpoint with the user's `Authorization` and `ServiceAuthorization` headers. The user must hold the `manage-translations` IDAM role; downloading the dictionary requires `load-translations`.

> Practical tip from the PCS spike: edit the CSV in Excel, not a text editor — escaping rules around HTML labels are easy to get wrong by hand. <!-- CONFLUENCE-ONLY -->

## Boundaries — what translation is and isn't

- **Definition-import push, not a per-event callback.** The data-store callback chain (`aboutToStart` / `aboutToSubmit` / `submitted`) plays no part. Service-team callback handlers do nothing translation-related.
- **English seed only.** The definition store sends English phrases with empty translations; it does not produce Welsh content.
- **Renders happen in ExUI.** ExUI calls the translation service at page-render time and substitutes Welsh strings; the data-store has no Welsh-aware code path.
- **Shared dictionary across services.** All case types share one Welsh dictionary, so changes are coordinated — automated CSV upload from service pipelines is discouraged for non-preview environments. <!-- CONFLUENCE-ONLY -->
- **Case data values are not translated by this mechanism.** ExUI does separately submit some case data (e.g. fixed-list values it encounters at runtime) to the translation service, but free-text user-entered case data is not translated.

## See also

- [`docs/ccd/explanation/callbacks.md`](callbacks.md) — full callback lifecycle (translation does **not** hook into this; included here so readers don't conflate the two)
- [`docs/ccd/explanation/definition-import.md`](definition-import.md) — the import flow into which the async dictionary push is hooked
- [`ts-translation-service` repo](https://github.com/hmcts/ts-translation-service) — the upstream service
