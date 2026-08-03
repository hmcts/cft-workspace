---
title: How to run and maintain the doc-drift pipeline
topic: doc-drift-pipeline
diataxis: how-to
product: workspace
audience: both
---
# How to run and maintain the doc-drift pipeline

Doc pages under `docs/` and `apps/<product>/docs/` cite source files in other
HMCTS repos and pin the SHA each claim was written against. Upstream moves; the
pins don't. `scripts/doc-drift` finds the gap.

## Run it locally

```bash
./scripts/doc-drift --mode=source     # which pages have stale/broken citations
./scripts/doc-drift --record          # re-pin every resolvable citation
```

`--record` asserts "this page is correct as of now" — it pins SHAs without
reading the prose. Only run it after you have actually reconciled the pages, or
you freeze wrong text as fresh.

### Your local clones can lie

Two things make a local run disagree with CI, both of which understate drift:

- **A stale clone.** Unpinned citations resolve against the repo's default ref,
  falling back to `HEAD`. If your clone hasn't been fetched for months, `HEAD`
  is months old and a file deleted upstream still resolves. Run `scripts/sync`
  first.
- **A shallow clone.** `git log -1 -- <path>` needs history. In a shallow clone
  it returns the tip commit for *every* path, so a page can look fresh (or get
  `--record`ed to a meaningless SHA) with no signal that anything is wrong.
  Check with `git -C <clone> rev-parse --is-shallow-repository`, and
  `git fetch --unshallow` if it says `true`.

CI is the authority here: it clones fresh every week.

## The weekly workflow

`.github/workflows/doc-drift.yml` runs 06:00 UTC Monday, and on demand via
**Actions → Weekly doc drift → Run workflow**. Two dispatch inputs:

- `dry_run` — report drift without letting Claude edit or push.
- `verbose` — log Claude's full output, including its reasoning. Off by default
  because tool results land in this public repo's logs; turn it on when a run
  needs explaining, since otherwise the action logs only its init and result
  JSON and a no-op run is indistinguishable from a broken one.

It clones the cited repos, runs the source-mode check, and if anything is
stale or broken, hands the report to Claude to reconcile the prose against the
current source, re-record the SHAs, and push to master.

### Why it clones the way it does

`scripts/ci-clone-cited` exists because `scripts/bootstrap` can't run on a
runner — bootstrap hard-fails unless `ssh -T git@github.com` authenticates, and
`manifest_tsv()` emits `git@github.com:` URLs. The CI script clones over HTTPS
instead, and only the ~70 repos a doc page actually cites rather than all 222
in the manifest.

The clones are **blobless and not checked out** (`--filter=blob:none
--no-checkout`). `doc-drift` only asks two questions of a clone — "what commit
last touched this path" and "does this path exist on this ref" — and both
resolve from commit and tree objects alone. That takes the whole set to ~600 MB
in about 20 seconds, and per-path SHAs come out identical to a full clone.

Two consequences worth knowing:

- **`git log --depth=1` is not an option.** With no history, `git log -1 --
  <path>` returns the tip commit for every path, so every citation would report
  stale at once — the same failure as a shallow local clone, across the board.
- **Don't read clone files with the Read tool** in CI; there is no working
  tree. Use `git show <ref>:<path>`.

`doc-drift` also uses `git rev-parse --verify <ref>:<path>` rather than
`git cat-file -e` for its existence check. They answer the same question, but
`cat-file` needs the blob — which a blobless clone doesn't have, so it would
trigger a per-file lazy fetch or, offline, wrongly report every citation
broken. The check step sets `GIT_NO_LAZY_FETCH=1` so any such regression fails
loudly instead of silently fetching 3 GB.

That guard is **step-local, and must stay that way.** Detection needs only
commits and trees; the *fix* step needs blobs, because `git show <ref>:<path>`
and `git diff <old>..<new>` are how Claude reads what actually changed. Setting
`GIT_NO_LAZY_FETCH` job-wide (via `GITHUB_ENV` or the Claude step's `env:`)
breaks that with a confusing error:

```
$ GIT_NO_LAZY_FETCH=1 git show origin/master:src/main/resources/META-INF/kmodule.xml
fatal: bad object origin/master:src/main/resources/META-INF/kmodule.xml
```

The failure mode is nasty: drift is still detected and reported correctly, so the
run goes green, but Claude can't read a single line of any changed source and
correctly declines to invent prose — a silent, expensive no-op. Lazy fetching
only the files Claude actually diffs costs well under a second each.

### Required setup

`CLAUDE_CODE_APP_ID` and `CLAUDE_CODE_PRIVATE_KEY` are **hmcts org secrets**
and already reach this repo — no per-repo secret to create. The Bedrock role
(`HMCTSClaudeGitHubActionsRole`) is hardcoded in the workflow, matching
`cath-service` and `expressjs-monorepo-template`; an ARN isn't sensitive, and
the role's trust policy is what decides which repos may assume it, so this repo
must be added there.

What does need checking is the **Claude GitHub App's permissions on
`cft-workspace`**. Org secrets existing doesn't imply the app is installed
here — the secrets are just a key, and `create-github-app-token` mints a token
scoped to wherever that app is actually installed.

The app needs **`contents: write`** on this repo, and read access is not
enough — read gets you all the way to a commit and then fails:

```
remote: Permission to hmcts/cft-workspace.git denied to hmctsclaudecode[bot].
fatal: unable to access 'https://github.com/hmcts/cft-workspace.git/': 403
```

The job's `permissions: contents: write` block does **not** grant this. That
governs the default `GITHUB_TOKEN`; the push uses the app token, whose scope
comes from the app installation. Only an org admin can widen it.

The "Verify the work actually landed" step fails the job when this happens.
It compares `HEAD` against `origin/master` rather than just checking for a
dirty tree, because a commit that failed to push leaves the tree clean — the
symptom is a green run that changed nothing, which is indistinguishable from
"no drift to fix" unless you look at the remote.

The good news is that an under-installed app degrades gracefully rather than
breaking the run. A token that can't see a given repo does **not** block a
public clone — GitHub falls back to anonymous access, and 69 of the 70 cited
repos are public. Only `rpx-xui-dev-utils` is private, cited once from
[`apps/xui/docs/how-to/local-development.md`](../../apps/xui/docs/how-to/local-development.md).
`ci-clone-cited` reports an unreachable repo and carries on, and `doc-drift`
tags its citations `(repo not cloned)` so they're distinguishable from
genuinely deleted files. The workflow prompt tells Claude to leave those pages
untouched — important, because otherwise a permissions gap looks like a deleted
file and the "fix" would be to delete correct prose.

So the failure mode of the app not being installed is one page unchecked, not a
broken pipeline or a bad edit.

`cft-workspace` has no branch protection on `master`, so the workflow pushes
directly. Nothing gates the commit but the instructions in the workflow
prompt; if you want review instead, change the final `git push` to open a PR.

## Citations that can't be tracked

Not everything is SHA-trackable, and that's by design:

- **Bare-path citations** (`docs/reference/taxonomy.md`) point at
  workspace-tracked files. The resolver short-circuits them — they exist but
  aren't tracked through this mechanism. About 6 workspace-local pages.
- **Never cite a dependency manifest or lockfile.** `package.json`,
  `build.gradle`, lockfiles and friends change on nearly every commit, so
  citing one makes the page report stale constantly without anything it claims
  having changed. Cite the code that consumes the dependency instead. Same
  reason exact `x.y.z` versions don't belong in prose — see
  `.claude/agents/topic-writer.md`.
- **Branch-pinned citations** (`<repo>@<branch>:<path>`) go `broken` once the
  branch merges or is deleted. Drop the `@branch` pin and re-record.
- **Renamed repos.** A citation resolves by repo name; if upstream renames the
  repo, `workspace.yaml` needs updating too, or the clone URL 404s.

## Other modes

```bash
./scripts/doc-drift --mode=port         # ported CNP pages vs upstream hmcts.github.io
./scripts/doc-drift --mode=confluence   # Confluence revisions
```

Only source mode runs weekly. Port mode needs `platops/hmcts.github.io` cloned
and fetchable; Confluence mode needs the Atlassian MCP, which isn't available
to a runner.

## See also

- [`docs/reference/taxonomy.md`](../reference/taxonomy.md) — frontmatter schema
- `/docs-drift` — the interactive skill wrapping these checks
- `/docs-generate <product>` — regenerates a product's doc set
