---
name: check-doc-drift
description: Detect drift between docs/ and the upstream platops/hmcts.github.io site. Reports which ported docs need refreshing because their upstream source has changed, plus any new upstream pages worth porting and any upstream pages that have been removed. Use when the user asks "what docs need updating?", "has the platops site changed since we ported it?", or "refresh the docs". Also use periodically as a maintenance check.
---

# /check-doc-drift

Reports drift between the workspace's ported documentation under `docs/` and the upstream `platops/hmcts.github.io` clone. Read-only with respect to the docs themselves — it does **not** auto-edit ported pages or the manifest. The user (or you, in a follow-up turn) acts on the report.

## How it works

`docs/.port-manifest.yaml` records, for every ported page, the upstream source path and the upstream commit SHA the page was last reconciled with. A `dropped:` block lists upstream paths/globs we've decided not to port (so they don't surface as "new upstream" forever).

`scripts/doc-drift` reads the manifest and runs `git log <synced_sha>..HEAD -- <source>` per entry against the upstream clone. It buckets each entry into: **in-sync**, **needs-update**, **removed-upstream** (upstream file deleted), or **new-upstream** (upstream has a new `*.html.md.erb` not in the manifest and not on the drop-list).

## How to run

```bash
./scripts/doc-drift            # check against current state of the upstream clone
./scripts/doc-drift --pull     # fetch + ff-pull upstream first, then check
```

`--pull` mode bails out if the upstream clone is dirty or on a non-default branch, mirroring the non-destructive contract that `scripts/sync` uses for clones generally. If that bails, run `./scripts/doc-drift` without `--pull` to check against whatever upstream commit is currently checked out.

The script exits non-zero if there's anything to act on (any of: needs-update, removed-upstream, new-upstream is non-empty).

## How to act on the report

For each **needs-update** entry, the user (or you) needs to:

1. Re-run `scripts/port-page <source> <target>` against the new upstream content. This overwrites the target with a freshly converted version.
2. Re-apply the manual fixes that diverge from the source, in particular:
   - Inlined partials (front-door config/endpoints, troubleshooting clusters)
   - Diátaxis-section-aware link targets (the source uses absolute paths like `/cloud-native-platform/onboarding/person/`; the target needs relative paths into `tutorials/`/`how-to/`/`reference/`)
   - Image paths (source uses `./images/foo.png`; target uses `../images/foo.png` or `../../images/foo.png` depending on depth)
   - `(Confluence)`/`(Slack)` annotations on external links
3. Bump the entry's `synced_sha` in `docs/.port-manifest.yaml` to the new upstream HEAD SHA.
4. Update the entry's `notes:` if the manual divergence list changed.

For each **removed-upstream** entry: the upstream page is gone. Likely the target should be deleted too — check with the user first because the content may still be useful even if upstream removed it. If deleting, remove the file under `docs/` and the entry from the manifest.

For each **new-upstream** entry: this is a *new* upstream page that didn't exist when the port last ran. Either:
- Port it (use `scripts/port-page` and add a manifest entry pinned to the current upstream HEAD), or
- Add the path / a glob covering it to the manifest's `dropped:` block with a one-line reason. Subsequent runs will then ignore it.

Don't silently leave new-upstream items unaddressed — they're the main thing this skill exists to catch.

## When to run

- The user asks about doc freshness, refresh, or sync.
- Periodically as a maintenance check, especially before doing onboarding-flavoured work that leans heavily on `docs/tutorials/cnp-onboarding/` or `docs/how-to/path-to-live/`.
- After a deliberate `git -C platops/hmcts.github.io pull` to see what came in.

## When NOT to run

- Single-page edits to `docs/` that don't touch ported content. The manifest tracks upstream→target reconciliation, not local edits.
- The upstream clone isn't present (clean workspace before bootstrap). The script will exit early with a clear error.

## Output shape

The script's output is structured (sections labelled "N in-sync", "N needs-update", etc.) so it can be summarised concisely. When relaying to the user, lead with the counts; only enumerate specific entries the user is likely to want to act on. If there's nothing to do (zero drift), say so in one line.
