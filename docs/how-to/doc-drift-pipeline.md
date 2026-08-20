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
**Actions → Weekly doc drift → Run workflow**. Three dispatch inputs:

- `dry_run` — report drift without letting Claude edit or push.
- `verbose` — log Claude's full output, including its reasoning. Off by default
  because tool results land in this public repo's logs; turn it on when a run
  needs explaining, since otherwise the action logs only its init and result
  JSON and a no-op run is indistinguishable from a broken one. You no longer
  need it to diagnose a failed push — that happens in its own step now.
- `timeout_minutes` — the job's budget, 60 by default. See
  [When the run doesn't fit the budget](#when-the-run-doesnt-fit-the-budget).

**Lint the workflow before you push a change to it.** An invalid expression
doesn't produce an error you can read — the run dies in two seconds with
"This run likely failed because of a workflow file issue", no job, no annotation,
and nothing the API will tell you. [`actionlint`](https://github.com/rhysd/actionlint)
names the line and the reason:

```bash
actionlint .github/workflows/*.yml
```

It caught `timeout-minutes: ${{ github.event.inputs.timeout_minutes || 60 }}`
immediately — `timeout-minutes` must be a *number* and a dispatch input is
always a *string*, so it needs `fromJSON(...)`. Two burnt dispatches to discover
what one lint run says outright.

It clones the cited repos, runs the source-mode check, and if anything is
stale or broken, hands the report to Claude to reconcile the prose against the
current source, re-record the SHAs, and **commit — once per product, as it
goes**. The workflow pushes, not Claude — see [Why the push is a workflow
step](#why-the-push-is-a-workflow-step).

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

### Why the push is a workflow step

Claude reconciles the pages and commits. The **`Push to master` step** pushes
whatever commits it finds — one, or one per product. That split is deliberate,
and it was bought with two lost runs.

A push from inside the prompt fails in the worst possible way. The action's
output is suppressed by default (see `verbose` above), so the error goes
nowhere — the 2026-08-17 run reconciled 68 pages, committed, and the only trace
of what went wrong was `Verify the work actually landed` reporting one commit
that never reached master. A model can also simply decide it is finished and
skip the push; a workflow step can't. Now the push happens in plain sight, its
error lands in the log verbatim, and a `403` names itself.

The step retries once through a rebase, because a human landing something on
master mid-run gets the commit rejected as non-fast-forward. Claude only ever
touches `docs/`, `apps/*/docs/` and `DOCS.md`, so that rebase is nearly always
clean; when it conflicts, the step aborts it and fails loudly rather than
guessing.

### App tokens expire after exactly one hour

This one is worth internalising, because it is invisible until it bites. A
GitHub App installation token dies **one hour** after it is minted, and this job
is budgeted for at least that long. Mint one token at the top and use it at the
end, and you are racing the clock with no warning that you lost:

```
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed for 'https://github.com/hmcts/cft-workspace.git/'
```

That is the 2026-08-10 run, failing at 07:30:32 on a token minted 06:30:30 — to
the second. Nothing was wrong with the app's permissions; the credential had
simply aged out mid-job.

So the workflow mints **two** tokens: one for the checkout and the clones, and a
fresh one immediately before pushing, reused by the verify step. The checkout
also sets `persist-credentials: false`, so no stale credential is left in
`.git/config` for a later step to pick up and fail on. Nothing in between needs
it — `scripts/ci-clone-cited` strips the token from each clone's remote
(leaving public URLs that fetch blobs anonymously), and Claude only commits
locally.

If you add a step that talks to GitHub, give it the fresh token, not
`steps.app-token.outputs.token`. On any run longer than an hour that first token
is *certainly* dead by the end, so this isn't a race — it's a guarantee. What
keeps the run working anyway is that nothing after the clone step needs it:
`ci-clone-cited` rewrites each clone's remote to its public URL, so Claude's
lazy blob fetches go out anonymously for the whole run.

One consequence to know about: `claude-code-action` has its own `always()`
teardown steps that use the token you passed it. On a long run those can fail on
the expired credential, which fails the **Fix drift with Claude** step even
though Claude's work was fine. That is why `Push to master` is gated on
`always()` and not on the Claude step succeeding.

### When the run doesn't fit the budget

Claude commits **once per product**: reconcile every affected page under
`apps/<slug>/docs/`, then `--record --product=<slug>`, `docs-index`, `git add`
that tree, commit, next product. Root `docs/` pages are the product
`workspace`, which is the slug `--product` takes for them.

That granularity is not a preference, it is the finest one that's honest.
`--record` has no per-page scope — it pins every page it discovers,
unconditionally, "correct as of now" — so a run that reconciled 10 of CCD's 40
pages and then recorded would pin the other 30 as fresh without reading them,
turning the drift report green over prose nobody checked. Per-*product* is safe
because the whole product is reconciled before it is recorded, and it degrades
honestly: a run killed mid-product loses only that product's work, and those
pages come back on next week's report still stale. Going finer needs a
`--page=<path>` scope added to `scripts/doc-drift` first.

Before this, Claude committed once at the end and the job was all-or-nothing.
It hit `timeout-minutes` mid-way twice, losing everything — 2026-08-10 (38
pages) and 2026-08-20 (70 pages, cancelled at the 60-minute wall having
committed nothing).

A normal weekly delta is a handful of pages and fits 60 minutes easily. A
**backlog** doesn't, and it used to be self-feeding: every run that failed to
land its work left the same pages stale for next week, plus whatever drifted
since. Roughly a page every 45 seconds is what the 2026-08-20 run managed.

To clear one, dispatch with `timeout_minutes` raised — 180 for ~70 pages. Costs
a few tens of pounds of Bedrock. A run that runs out of budget now keeps the
products it finished, so the next run starts from a smaller backlog; check which
products landed rather than assuming the whole report was cleared.

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

The app in question is **HMCTSClaudeCode** (slug `hmctsclaudecode`, app id
`2670524`, owned by `hmcts`), pushing as `hmctsclaudecode[bot]`. It needs
`contents: write` **on this repo**, and read is not enough — read gets you all
the way to a commit and then fails:

```
remote: Permission to hmcts/cft-workspace.git denied to hmctsclaudecode[bot].
fatal: unable to access 'https://github.com/hmcts/cft-workspace.git/': 403
```

The job's `permissions: contents: write` block does **not** grant this. That
governs the default `GITHUB_TOKEN`; the push uses the app token, whose scope
comes from the app installation. Only an org admin can widen it.

This was the state from the pipeline's creation until **2026-08-20**: the app
could read but not write, so every weekly run reconciled pages and then threw
the work away. Granted that morning, and confirmed by the probe pushing a
scratch branch. If it regresses, it is fixed on:

> Org settings → GitHub Apps → HMCTSClaudeCode → Configure → Repository access

**Do not try to answer "can it push?" from the API.** Every route into that
question misreports, which is why this repo has a probe workflow that pushes for
real. Two traps, both hit while diagnosing this:

```
$ gh api repos/hmcts/cft-workspace/collaborators/hmctsclaudecode%5Bbot%5D/permission --jq .permission
none        # even for repos where the app demonstrably works — apps aren't collaborators
```

```
permissions: {"admin":false,"maintain":false,"pull":false,"push":false,"triage":false}
            # GET /repos/{repo} as the installation — and this was the run whose push SUCCEEDED
```

The second is the nastier one: it reads like a definitive `push: false` and it is
simply not. Nor does the app's own declared permission set settle it —
`GET /apps/hmctsclaudecode` is public and has always reported
`"contents": "write"`, which says what the app *may* be granted, not what this
repo's installation actually granted. And read access proves nothing either way,
because this repo is public: the checkout and the cited clones succeed
anonymously whatever the token can do.

A real push is the only ground truth, so **run the probe**:
`.github/workflows/app-token-probe.yml` (**Actions → App token probe → Run
workflow**) mints a token exactly as doc-drift does, logs the reported
permissions as context, then pushes a scratch branch and deletes it. Only the
push can fail the job. It answers the question in ~20 seconds with no Bedrock
spend, instead of waiting 45 minutes and £20 for a full run to tell you the same
thing, and it never touches master.

The "Verify the work actually landed" step fails the job when a push doesn't
land. It compares `HEAD` against `origin/master` rather than just checking for a
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

`cft-workspace` has no branch protection on `master` and no repo rulesets, so
the workflow pushes directly. Nothing gates the commit but the instructions in
the workflow prompt; if you want review instead, change the `Push to master`
step to open a PR.

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

- `.github/workflows/app-token-probe.yml` — is the app allowed to push? (~20s)
- [`docs/reference/taxonomy.md`](../reference/taxonomy.md) — frontmatter schema
- `/docs-drift` — the interactive skill wrapping these checks
- `/docs-generate <product>` — regenerates a product's doc set
