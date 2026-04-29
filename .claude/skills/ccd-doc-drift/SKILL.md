---
name: ccd-doc-drift
description: Detect drift between docs/ccd/ pages and the source files they cite. Reads each page's frontmatter `sources:` list, compares against current source repo HEAD, reports stale pages. Use periodically to keep CCD docs accurate.
---

# CCD doc drift

Each page in `docs/ccd/` declares its `sources:` in frontmatter — repo-relative file paths the page's claims rely on. This skill reports which pages need re-verifying because their cited source has changed since the page was last regenerated.

## When to use

- "Are the CCD docs out of date?"
- After a `./scripts/sync` pulls new commits into `apps/ccd/*` or `libs/ccd-config-generator`.
- Periodically as a maintenance check.

## When NOT to use

- For drift between `docs/` and the upstream `platops/hmcts.github.io` site — that's `check-doc-drift`.
- For "is this one page accurate" — use `/generate-ccd-docs --phase review --page <path>` instead, which spawns a `ccd-doc-reviewer` agent to verify against source.

## Procedure

1. **Enumerate pages**. `Glob` for `docs/ccd/**/*.md` (excluding `docs/ccd/.work/`).
2. **For each page**, parse YAML frontmatter via `yq`:
   ```bash
   yq '.sources' <page>
   yq '.last_run // .last_reviewed' <page>
   ```
3. **For each cited source path** in `sources`:
   - The path format is `<repo-slug>:<path-in-repo>`. Resolve `<repo-slug>` to its absolute path via `plan.yaml`'s `research_sources` mapping (or by structural lookup under `apps/`, `libs/`).
   - Get the git HEAD SHA of the file: `git -C <repo> log -1 --format=%H -- <path-in-repo>`.
   - If the page records a `sources_sha:` map, compare against it. If different (or missing), the page is **stale**.
   - If the file no longer exists at that path, the page is **broken** — its source moved or was deleted.
4. **Bucket pages**:
   - **fresh** — all sources unchanged since the page's `last_run`.
   - **stale** — at least one source has new commits.
   - **broken** — at least one source no longer exists at the cited path.
   - **untracked** — page lacks `sources:` (typically tutorials, glossary, or stub pages).
5. **Print a report**:

```
docs/ccd/ drift report — <iso8601>

stale (N):
  <path>      sources changed: <count> — <list of repo-slug:path>
  ...

broken (M):
  <path>      missing sources: <list>
  ...

untracked (K): (informational)
  <list>

fresh: <P> pages
```

6. **Suggest action**:
   - If `stale`: `/generate-ccd-docs --phase review --page <stale-path>` per page (or `--topic <token>` to batch).
   - If `broken`: human attention — the page may need to be retired or have its sources updated by hand.

## Implementation notes

- `git log` calls run inside each clone's directory. They're fast.
- Don't run all pages serially if there are many — batch by repo slug so each repo's git index is only consulted once.
- `last_reviewed` (set by the reviewer) takes precedence over `last_run` (set by the writer) when computing freshness.

## Don't

- Don't fix drift here — only report it. Fixes go through `/generate-ccd-docs`.
- Don't read source files; only their git history. This skill should be fast (~5 sec).
- Don't follow links to non-cited sources. The contract is that `sources:` is the page's verifiable surface.
