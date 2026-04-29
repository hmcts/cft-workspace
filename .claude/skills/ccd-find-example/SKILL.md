---
name: ccd-find-example
description: Find real, in-repo examples of how a CCD feature is implemented. Searches the SDK test-projects, ccd-test-definitions, and service-team repos. Use when the user wants concrete code references — "show me a real Notice of Change implementation", "where do they use case_flags", "give me an example of a mid-event callback".
---

# Find CCD examples

Locate real implementations of a CCD feature across the workspace and return file paths with short excerpts.

## When to use

- "Show me an example of `case_flags` configured via the SDK."
- "Where is `ChangeOrganisationRequest` used in real services?"
- "Give me a working mid-event callback example."

## When NOT to use

- For *which products* use the feature — `/find-feature` (operates on `INDEX.md`).
- For an explanation of the feature — `/ccd-explain`.

## Search order

1. **SDK test-projects** (`libs/ccd-config-generator/test-projects/{e2e, nfdiv-case-api, pcs-api, sptribs-case-api, adoption-cos-api}`) — preferred for SDK-form examples; cleanest, smallest, most stable.
2. **Test definitions** (`apps/ccd/ccd-test-definitions/src/main/resources`) — preferred for JSON-form examples.
3. **Service-team repos** (`apps/{nfdiv,pcs,et,sscs,prl,civil,sptribs,probate,adoption,bulk-scan}`) — fall through here when 1 and 2 don't have a representative example.

## Procedure

1. Resolve `$ARGUMENTS` to a feature. Accept either a token from `docs/reference/taxonomy.md` (`notice_of_change`, `case_flags`, `global_search`, etc.) or a free-form keyword (`mid_event`, `ChallengeQuestion`, `OrganisationPolicy`).
2. Build search terms. Map common features to anchor patterns:
   - `notice_of_change` → `NoticeOfChange`, `ChangeOrganisationRequest`, `ChallengeQuestion`
   - `case_flags` → `Flags`, `caseFlags`, `FlagDetail`
   - `global_search` → `SearchCriteria`, `SearchParty`
   - `decentralised_ccd` → `/ccd-persistence`, `decentralised`
   - `roles_access_management` → `RoleAssignment`
   - `work_basket` → `WorkBasketInputFields`, `WorkBasketResultFields`
   - `mid_event` → `mid_event`, `midEventCallback`, `pageCallback`
3. Run `./scripts/grep -l '<pattern>'` rooted at each layer in the search order. Stop at the first layer that returns ≥3 hits, or aggregate across all layers if the user asked for "all" / "every".
4. For each hit, read the file and pull a 10–15 line excerpt centered on the match (use `grep -n` then `Read` with `offset`/`limit`).
5. Return: file path, one-line description (what's in this file), the excerpt as a fenced block.

## Output format

```
Found <N> examples of <feature>:

1. libs/ccd-config-generator/test-projects/e2e/.../SimpleCase.java:142
   Defines <event> with <feature>.
   ```java
   <excerpt>
   ```

2. ...
```

Keep to ≤5 examples unless the user asked for more. If layer 1 + 2 yield nothing, fall through to layer 3 and say so.

## Don't

- Don't read every match. 3–5 well-chosen excerpts beat a wall of paths.
- Don't dump entire files. Excerpts only.
- Don't search build/test output dirs — `./scripts/grep` already excludes them.
- Don't invent a feature name. If the keyword doesn't resolve, list known feature tokens from `docs/reference/taxonomy.md`.
