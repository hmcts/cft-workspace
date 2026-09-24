---
title: Welsh Language and Wales Jurisdiction
topic: welsh-language
diataxis: explanation
product: pcs
audience: both
sources:
  - pcs-frontend:src/main/modules/i18n/index.ts
  - pcs-frontend:src/main/views/template.njk
  - pcs-frontend:src/main/views/journeyTemplate.njk
  - pcs-frontend:src/main/views/stepsTemplate.njk
  - pcs-frontend:src/main/assets/locales/en/common.json
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/service/FeatureFlag.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/page/resumepossessionclaim/wales/DocumentsYouveUploadedChecklistPage.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/page/resumepossessionclaim/SelectClaimantType.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/postcodecourt/service/EligibilityService.java
  - pcs-api:src/main/resources/db/migration/V026__pilot_postcodes.sql
---
# Welsh Language and Wales Jurisdiction

PCS has two independent concepts that are easy to conflate because both are called "Welsh": the Welsh **language** toggle on the citizen frontend, and Wales as a **jurisdiction** for the property in a claim. Disabling one does not disable the other.

**Welsh language is a frontend i18n concern, unrelated to where the property is.** `pcs-frontend` declares English and Welsh as the supported languages and detects the active one from the `lang` query string, a cookie, or the session (`src/main/modules/i18n/index.ts`). The "Cymraeg" toggle rendered in the page layouts is just a translated string sourced from the `languageToggle` locale key, and any user — including one filing a claim against an England property — can switch the whole citizen journey into Welsh. There is no LaunchDarkly flag gating the language toggle itself; PCS's frontend flags cover PCQ, respond-to-claim, "your support", and uncategorised documents, not language.

**Wales jurisdiction is a backend concern, and only partly flag-gated.** A property's `legislativeCountry` (`England` or `Wales`, title case) is resolved from its postcode via the postcode-to-court mapping, and `pcs-api` branches on that value for grounds, notices, documents, and Renting Homes (Wales) contract pages. A `wales-make-a-claim-enabled` feature flag exists (`FeatureFlag.java`), but it gates exactly one page — the Wales documents checklist (`DocumentsYouveUploadedChecklistPage.java`) — not the Wales branches used elsewhere, such as claimant-type eligibility (`SelectClaimantType.java`).

**The real switch for Wales claims is a postcode eligibility whitelist, not a flag.** A postcode is only eligible to start a claim at all if its court appears in the `eligibility_whitelisted_epim` table with an `eligible_from` date in the past (`EligibilityService.java`). Only one Welsh court (Caernarfon, EPIMS 366572) is whitelisted, seeded in `V026__pilot_postcodes.sql`. Removing that row, or moving its effective date into the future, is what actually stops new Wales claims — it is a data migration, not a toggle, and it has no effect on the Welsh language journey, which remains available to any England-based claim.

**Locale files merge citizen-base first, journey-scoped override second — and the override is per key, not per file.** A journey- or role-scoped `cy` locale file (for example a legal-representative override) only needs to carry the keys it genuinely wants to change. Any other key present in that file — even a stale placeholder left over from before the real Welsh translation existed — fully shadows the citizen-base translation for that key, silently, with no lint or build warning. When the citizen-base file later gains a correct Welsh translation, a page using the override file keeps showing the old or placeholder text until that specific key is removed from the override.

**Untranslated Welsh strings are marked with a `cy` prefix on the English text, but the prefix convention is not applied consistently.** Most placeholder values are the English string with `cy` stuck directly on the front (`cyUpload files`); a large minority — concentrated in the respond-to-claim check-your-answers pages — instead use `cy ` with a trailing space (`cy Upload files`). Any search or tooling that checks for only one of the two variants will undercount how much of the service is still untranslated.
