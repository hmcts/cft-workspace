---
name: cft-find-example
description: Find real, in-repo examples of how a feature is implemented in any HMCTS CFT product (CCD, XUI, WA, AM, bulk-scan, service teams). Use when the user wants concrete code references — "show me a real Notice of Change implementation", "where do they use case_flags", "give me an example of a mid-event callback".
---

# Find CFT examples

Locate real implementations of a feature across the workspace and return file paths with short excerpts.

## When to use

- "Show me an example of `case_flags` configured via the SDK."
- "Where is `ChangeOrganisationRequest` used in real services?"
- "Give me a working mid-event callback example."
- "Where do XUI components consume the case-flags API?"

## When NOT to use

- For *which products* use the feature — `/cft-ccd-find-feature` (operates on `INDEX.md`).
- For an explanation of the feature — `/cft-explain`.
- For a how-to recipe — `/cft-how-to`.

## Procedure

1. **Resolve `$ARGUMENTS` to a feature.** Accept either:
   - A token from `docs/reference/taxonomy.md` (`notice_of_change`, `case_flags`, `global_search`, `work_allocation_tasks`, etc.).
   - A free-form keyword (`mid_event`, `ChallengeQuestion`, `OrganisationPolicy`, `RoleAssignment`).

2. **Infer the product**. Map the feature/keyword to a product:
   - CCD features (`notice_of_change`, `case_flags`, `global_search`, `decentralised_ccd`, `work_basket`, `mid_event`) → `apps/ccd`.
   - `work_allocation*` → `apps/wa`.
   - `roles_access_management`, `RoleAssignment` → `apps/am`.
   - `bulk_scan*`, `Envelope`, `OcrData` → `apps/bulk-scan`.
   - XUI / Angular / `case-ui-toolkit` → `apps/xui`.
   - If the user explicitly named a product ("in xui", "in wa"), use that.
   - If still ambiguous, default to `apps/ccd` (the most common case) and say so.

3. **Resolve search roots from the product's CLAUDE.md frontmatter**. Read `apps/<product>/CLAUDE.md` and pull `exemplar_dirs:` from its YAML frontmatter (the block between the first two `---` lines — the body that follows is prose, not YAML, so `yq` must read the frontmatter block alone):
   ```bash
   exemplar_dirs=$(awk '/^---[[:space:]]*$/{c++; if(c==2)exit; if(c>0)next} c==1{print}' \
       apps/<product>/CLAUDE.md | yq -r '.exemplar_dirs[]?')
   ```
   - If non-empty, grep those paths first.
   - If empty or missing, fall through to grepping the whole `apps/<product>/` tree.

4. **Build search terms.** Map common features to anchor patterns:
   - `notice_of_change` → `NoticeOfChange`, `ChangeOrganisationRequest`, `ChallengeQuestion`
   - `case_flags` → `Flags`, `caseFlags`, `FlagDetail`, `FlagLauncher`
   - `global_search` → `SearchCriteria`, `SearchParty`
   - `decentralised_ccd` → `/ccd-persistence`, `decentralised`
   - `roles_access_management` → `RoleAssignment`
   - `work_basket` → `WorkBasketInputFields`, `WorkBasketResultFields`
   - `mid_event` → `mid_event`, `midEventCallback`, `pageCallback`
   - `work_allocation_tasks` → `TaskResource`, `TaskAttribute`, `wa_task_configuration`

5. **Grep, in this order**:
   ```bash
   # Layer 1: curated exemplar_dirs (if any).
   ./scripts/grep -l '<pattern>' <exemplar_dirs>
   # Layer 2: the rest of the product tree.
   ./scripts/grep -l '<pattern>' apps/<product>/
   ```
   Stop at the first layer that returns ≥3 hits, or aggregate across layers if the user asked for "all" / "every".

6. **For each hit, read the file** and pull a 10–15 line excerpt centred on the match (`grep -n` then `Read` with `offset`/`limit`).

7. **Return**: file path, one-line description (what's in this file), the excerpt as a fenced block.

## Output format

```
Found <N> examples of <feature> (product: apps/<product>):

1. libs/ccd-config-generator/test-projects/e2e/.../SimpleCase.java:142
   Defines <event> with <feature>.
   ```java
   <excerpt>
   ```

2. ...
```

Keep to ≤5 examples unless the user asked for more. If the curated `exemplar_dirs` yield nothing, fall through and say so.

## Don't

- Don't read every match. 3–5 well-chosen excerpts beat a wall of paths.
- Don't dump entire files. Excerpts only.
- Don't search build/test output dirs — `./scripts/grep` already excludes them.
- Don't invent a feature name. If the keyword doesn't resolve, list known feature tokens from `docs/reference/taxonomy.md`.
- Don't grep all clones blindly — start in `exemplar_dirs`, then the product tree. Use `/cft-cross-repo-search` only when the user explicitly wants a workspace-wide sweep.
