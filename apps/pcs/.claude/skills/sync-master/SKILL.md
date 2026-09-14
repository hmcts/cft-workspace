---
name: sync-master
description: Intelligently merge origin/master into a branch or PR in pcs-api or pcs-frontend, classifying incoming changes by blast radius, resolving repo-specific conflicts (Flyway migrations in pcs-api; dependency bumps and per-journey changes in pcs-frontend), and verifying before push. Use when asked to merge/rebase master into a PCS branch, catch a PCS branch up with master, or review what's landed on master before absorbing it.
---

Plan-before-execute: nothing is written until the user approves the plan in Phase 2. Use the Bash tool. Do NOT prompt the user except where steps below say to.

## Repo detection

This skill only knows two repos. First:
```bash
git remote get-url origin
```
- Matches `hmcts/pcs-api` → read `references/pcs-api.md` for every repo-specific step below.
- Matches `hmcts/pcs-frontend` → read `references/pcs-frontend.md` instead.
- Anything else → refuse: this skill is PCS-specific (Flyway/Gradle for pcs-api, yarn/TS for pcs-frontend); it doesn't generalise to other repos.

Everywhere below, "the reference" means whichever of the two files was selected here.

## Modes

| Form | Behavior |
|---|---|
| `/pcs:sync-master` | In-place on the **current branch**. Phases 1→3. |
| `/pcs:sync-master <branch>` | Branch name → worktree → 1 agent. Phase 4 wraps Phases 1→3. |
| `/pcs:sync-master <PR#>` | Numeric arg → fetch PR ref, map to branch by SHA → worktree → 1 agent. Phase 4 wraps Phases 1→3. |

**One arg only.** For multiple PRs/branches in parallel, the caller spawns multiple `/pcs:sync-master` invocations as separate agents.

The flow has four phases. **Phases 1 and 2 are read-only** — they can never alter the working tree, the index, or any ref. **Phase 3 is the only mutating phase** and runs only after explicit user approval. **Phase 4** is a thin wrapper over Phases 1→3 used when an argument is given.

§5 holds the cross-cutting hard rules — they apply to every phase.

---

## Phase 1 — Analyse (read-only)

### 1.1 Pre-flight
- `git rev-parse --abbrev-ref HEAD` — refuse if `master`/`main`.
- `git status --porcelain` — list anything that isn't a skip-worktree file. If anything else is dirty, AskUserQuestion **default = abort** (not stash). Stashing must be explicit.

### 1.2 Fetch master
```bash
git fetch origin master
```
If `git rev-list --count HEAD..origin/master` is `0`, exit with `✅ Already up to date with origin/master`.

### 1.3 Resolve `${JIRA}`
Order:
1. Branch name: `git rev-parse --abbrev-ref HEAD | sed -nE 's/^([A-Z]+-[0-9]+).*/\1/p'`
2. Latest commit subject: `git log -1 --pretty=%s | sed -nE 's/^([A-Z]+-[0-9]+):.*/\1/p'`
3. AskUserQuestion: enter the JIRA ticket. Validate against `^[A-Z]+-[0-9]+`.

### 1.4 Repo-specific analysis
Do everything the reference's "Change classifier", conditional follow-ups (migration plan / dependency breakdown / per-journey breakdown), and "Skip-worktree state" sections describe. Aggregate counts per tag; HIGH-impact buckets get ⚠️ flags.

If the reference has no commit-timeline recipe of its own, use this default: group commits coming from master by JIRA ticket —
```bash
git log HEAD..origin/master --no-merges --format='%h|%s|%b%x00'
```
Parse the null-separated records, extract the JIRA prefix (`^[A-Z]+-[0-9]+`) from each subject, group by JIRA. For each group: JIRA ticket + commit count + total file count; **What** = the cleanest subject line; **Why** = the commit body if present else `(no body — intent inferred from subject)`; **Top files** = up to 5 paths, HIGH-impact buckets first.

### 1.5 Conflict prediction (in-memory 3-way merge)
```bash
git merge-tree --write-tree HEAD origin/master >/dev/null 2>&1
CONFLICTS_PREDICTED=$?   # 0 = clean, non-zero = conflicts
OVERLAP=$(comm -12 \
  <(git diff --name-only origin/master...HEAD | sort) \
  <(git diff --name-only HEAD...origin/master | sort))
```

---

## Phase 2 — Plan gate

Render the plan, ask, branch on the answer. **No mutation.**

```
========================================
Merge plan: origin/master → <branch>
========================================
Master ahead:        <N> commits [+ ticket/author summary if the reference provides one]
  <first 5 commit subjects, or the reference's timeline render>
Branch ahead:        <M> commits

JIRA prefix:         <JIRA>   (source: branch | prev commit | user)
Merge commit msg:    "<JIRA>: Merge origin/master"

Incoming work:
  <per-ticket breakdown per §1.4>

[Repo-specific block from the reference — e.g. migration plan (pcs-api),
 dependency-bump breakdown (pcs-frontend)]

Incoming changes by impact (<TOTAL> files):
  ⚠️ HIGH IMPACT (review carefully):
     <reference's HIGH-impact buckets, counts, example paths>
  MEDIUM IMPACT:
     <reference's MEDIUM-impact buckets>
  LOW IMPACT:
     <reference's LOW-impact buckets, incl. any per-journey breakdown>
  No impact:
     Docs:                <N> files
  Unclassified:           <N> files (list)

Conflict prediction:
  Result:            ✅ clean   |   ⚠️ conflicts likely
  Files touched on both sides:
    - <up to 10>
    - + N more

Skip-worktree state:
  Stash needed for:  <list, or "none">

Steps to execute:
  1. <only if reference has renames/prep>  <repo-specific prep step>
  2. <only if dirty SW> Stash skip-worktree files
  3. git merge origin/master -m "<JIRA>: Merge origin/master"
  4. <only if reference needs it>  <e.g. yarn install>
  5. <reference's verify command>
  6. <only if stashed>  git stash pop and re-set skip-worktree
  7. AskUserQuestion → push to origin
```

AskUserQuestion: `Proceed with this plan?`
- **Yes, run the plan** (default)
- **Show full diff first** → `git log --oneline -p HEAD..origin/master | head -300`, re-prompt
- **Abort** → exit cleanly. No mutation. In Phase 4, the wrapper also tears down the worktree on abort (see §4.4).

---

## Phase 3 — Execute (only after Phase 2 approval)

### 3.1 Repo-specific prep (if the plan included any)
Follow the reference's execute-time prep (e.g. pcs-api's migration rename + commit). Skip if the reference has none.

### 3.2 Stash skip-worktree files (only the modified ones)
For files identified in §1.4:
```bash
git update-index --no-skip-worktree $SKIP_FILES_MODIFIED
git stash push -m "sync-master-localdev" -- $SKIP_FILES_MODIFIED
```

### 3.3 Run the merge
```bash
git merge origin/master -m "${JIRA}: Merge origin/master"
```
- **Code conflicts:** `git status --short | grep '^UU'` lists them; **do not auto-resolve by default**; tell user to resolve and finish with `git commit -m "${JIRA}: Merge origin/master"`. Skip §3.4 onward, exit.
  - **Auto-resolve override:** if the user explicitly authorises auto-resolution for this run, only the **mechanical** conflicts listed in the reference may be resolved. Semantic conflicts (changed logic, changed behavior, intent overlap) **always** require human resolution — never auto-resolve.
- **Hook rejection (any hook):** follow the reference's hook rejection policy — the two repos' bypass rules genuinely differ. See also §5.2. Never silent retry, never silent `--no-verify`.

### 3.3.1 Manual continuation after a conflict halt
If §3.3 halted with conflicts, the user resolves them outside the agent. To finish:
- Stage resolved files: `git add <files>`
- Commit: `git commit -m "${JIRA}: Merge origin/master"`
- Resume from §3.4 (verify) and §3.6 (push).

The agent does NOT auto-resume. The user (or a fresh `/pcs:sync-master` invocation, or a direct request to Claude) owns the resolved state from this point on.

### 3.4 Verify
Run the reference's verify gate exactly. If it fails (or, for pcs-api, if migration numbers collide): STOP, surface failure, do not push.

### 3.5 Restore skip-worktree files
For files stashed in §3.2:
```bash
git stash pop
git update-index --skip-worktree $SKIP_FILES_MODIFIED
```
If `git stash pop` conflicts (merge touched the same file): leave the conflict, **do not drop the stash**, tell the user the file path. Do not push.

### 3.6 Push (with confirmation)
AskUserQuestion: `Push <branch> to origin?` — `Yes, push` / `No, keep local`. Default `Yes`.
```bash
git push origin "$(git rev-parse --abbrev-ref HEAD)"
```
Plain push only. On rejection, STOP and report — see §5.1.

### 3.7 Summary
```
========================================
✅ Merge from origin/master complete
========================================
Branch:                 <branch>
Commits merged:         <count>
[Repo-specific line — migrations renamed (pcs-api) | yarn install ran (pcs-frontend)]
Verify:                 ✅ passed
Skip-worktree restored: <list> | none
Pushed to origin:       yes | no (kept local)
```

---

## Phase 4 — Worktree wrapper (only when an arg is given)

### 4.1 Resolve the argument
- **Numeric** → GitHub PR number. Resolve via git only:
  ```bash
  git fetch origin "+refs/pull/${ARG}/head:refs/remotes/origin/pr-${ARG}"
  PR_SHA=$(git rev-parse "origin/pr-${ARG}")
  # Find which same-repo origin/<branch> points at this SHA → that's the source branch.
  BRANCH=$(git for-each-ref --format='%(refname:short) %(objectname)' refs/remotes/origin/ \
    | awk -v sha="$PR_SHA" '$2==sha && $1!="origin/pr-'"${ARG}"'" {sub(/^origin\//,"",$1); print $1; exit}')
  ```
  If `$BRANCH` is empty → no matching origin/<branch> → it's a fork PR → refuse: `"PR #${ARG} appears to be from a fork. Resolve manually."`
- **Non-numeric** → set `BRANCH=$ARG`.

### 4.1.1 Surface what was resolved
After resolving, report to the user before doing any worktree work:
```
PR #<N> resolved → branch: <BRANCH>
Same-repo:        ✅ (matched origin/<BRANCH>)   |   ❌ (fork) → refused
```
The plan gate (§2) is the user's chance to abort if anything looks wrong (e.g. PR was already merged, or targets a branch other than master). PR state and baseRef are not validated here — the plan gate's master-delta and conflict-prediction surface anything anomalous.

### 4.2 Set up the worktree (in main checkout, serial)
```bash
git fetch origin master
git fetch origin "${BRANCH}:refs/remotes/origin/${BRANCH}" 2>/dev/null || true
git rev-parse --verify "${BRANCH}" >/dev/null 2>&1 || git branch "${BRANCH}" "origin/${BRANCH}"
WT="<reference's worktree path template>"
git worktree add "${WT}" "${BRANCH}"
```

### 4.3 Spawn one agent
`Agent` tool, `subagent_type: general-purpose`. Brief: `cd "${WT}"`, run **Phase 1 → Phase 3** with one delta — skip §1.2 fetch (orchestrator did it). Report back: `branch`, `result` (clean / conflicts / verify-failed / hook-rejected / aborted), `commits_merged`, repo-specific extras (migrations renamed | change profile), `pushed`, `worktree_path`.

### 4.4 Cleanup
- `clean` → orchestrator runs `git worktree remove "${WT}"`.
- `aborted` → no mutation occurred; orchestrator runs `git worktree remove "${WT}"` (safe).
- Anything else → leave the worktree in place, surface its path so the user can `cd` in and resolve. They tear it down with `git worktree remove "${WT}"` afterwards.

---

## §5 Hard rules (apply to every phase)

1. **Plain `git push` only.** Never `--force`, never `--force-with-lease`, never any history-rewriting flag. If push is rejected, surface the error and stop — do not auto-rebase, do not retry, do not switch strategy.
2. **Hook rejection (commit-msg, pre-commit, secrets, lint/checkstyle, etc.):** STOP. Show the **verbatim** hook output. Diagnose root cause per the reference's hook rejection policy — the two repos' `--no-verify` rules are not the same, and this skill does not force them to agree.
   - **AskUserQuestion** (default = abort) whenever the reference's policy would offer a bypass: `Retry` / `Abort, fix manually` / `Bypass with --no-verify` (only offer if the reference's audit conditions are met, or the user has explicitly authorised it for this specific failure).
   - **Scope of `--no-verify` authorisation:** per-commit AND per-failure-cause. Authorising for one merge commit does NOT carry to subsequent commits, even in the same session.
   - Never silent retry. Never silent `--no-verify`.
3. **Push only after explicit AskUserQuestion confirmation.** Default may be `yes`, but the prompt must appear.
4. **Commit messages:** single-line, JIRA-prefixed (`^[A-Z]+-[0-9]+`), no co-author attribution — see the reference for repo-specific extras (pcs-frontend also forbids AI-generation footers and emoji). Always supply via `-m`.
5. **macOS-compatible shell.** `sed -E`, `sed -i ''` (empty backup arg), no `grep -P`, no GNU-only flags.
6. **Phase 4 PR resolution is git-only.** Fetch `refs/pull/<N>/head` and find the same-repo origin branch by SHA match. Fork PRs (no matching `origin/<branch>`) must be refused — we can't push back to a fork. Always surface the resolved branch before doing worktree work (§4.1.1).
7. **Verify gate is whatever the reference specifies** — don't substitute a different check (e.g. don't run pcs-frontend's Jest/webpack, or pcs-api's full test suite; both are CI's job, not this gate's).
