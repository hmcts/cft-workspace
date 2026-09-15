---
name: sync-master
description: Intelligently merge origin/master into a branch or PR in pcs-api or pcs-frontend, classifying incoming changes by blast radius, resolving repo-specific conflicts (Flyway migrations in pcs-api; dependency bumps and per-journey changes in pcs-frontend), and verifying before push. Use when asked to merge/rebase master into a PCS branch, catch a PCS branch up with master, or review what's landed on master before absorbing it.
---

# sync-master — merge origin/master into a PCS branch

Plan-before-execute: nothing is written until the user approves the plan in Phase 2. Use the Bash tool. Do NOT prompt the user except where steps below say to.

## Repo detection

This skill only knows two repos. First:
```bash
git remote get-url origin
```
- Matches `hmcts/pcs-api` → follow the **pcs-api** sub-steps below (Gradle/Java, Flyway migrations, checkstyle).
- Matches `hmcts/pcs-frontend` → follow the **pcs-frontend** sub-steps below (yarn/TypeScript, dependency bumps, per-journey changes).
- Anything else → refuse: this skill is PCS-specific and doesn't generalise to other repos.

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

### 1.4 Change classifier — bucket every incoming file by blast radius

```bash
INCOMING=$(git diff --name-only HEAD...origin/master)
```

**pcs-api:** first, the migration plan (no rename yet):
```bash
BRANCH_MIGRATIONS=$(git diff --name-only --diff-filter=A origin/master...HEAD -- 'src/main/resources/db/migration/V*.sql')
MASTER_HIGHEST=$(git ls-tree -r origin/master --name-only \
  | grep -E 'src/main/resources/db/migration/V[0-9]+__.*\.sql$' \
  | sed -E 's|.*/V([0-9]+)__.*|\1|' | sort -n | tail -1)
```
Conflict rule: branch migration version `<= MASTER_HIGHEST`. Build the rename plan: assign `MASTER_HIGHEST + 1`, `+2`, ... in original order. Compare migration numbers against `origin/master` only — never against other open branches/PRs; sharing a `V###` is fine until one merges to master.

Then classify:

| Tag | Path pattern | Impact |
|---|---|---|
| **GLOBAL: Build/Config** | `^build\.gradle$`, `^settings\.gradle$`, `^gradle\.properties$`, `^Dockerfile.*`, `^Jenkinsfile_.*`, `^charts/`, `application.*\.ya?ml$` | ⚠️ HIGH — build/deploy/runtime |
| **GLOBAL: Security/Filter/Advice** | `src/main/java/.*/(config\|security\|filter\|advice\|exception)/.*` | ⚠️ HIGH — cross-cutting |
| **GLOBAL: Domain root** | `src/main/java/.*/domain/(PCSCase\|State\|.*Enum)\.java` | ⚠️ HIGH — referenced everywhere |
| **Migration** | `src/main/resources/db/migration/V[0-9]+__.*\.sql$` | ⚠️ HIGH — schema change (handled above) |
| CCD event/page | `src/main/java/.*/ccd/(event\|page)/.*` | MEDIUM — entry points |
| Service | `src/main/java/.*/service/.*` | MEDIUM — business logic |
| Controller | `src/main/java/.*/controllers?/.*` | MEDIUM |
| Entity | `src/main/java/.*/entity/.*` | MEDIUM — schema-adjacent |
| Domain (specific) | `src/main/java/.*/domain/.*` (non-root) | MEDIUM |
| Repository | `src/main/java/.*/repository/.*` | LOW-MEDIUM |
| Tests | `^src/(test\|integrationTest\|functionalTest\|e2eTest)/` | LOW |
| Resources (non-migration) | `^src/main/resources/` (excluding migrations) | LOW |
| Docs | `^docs/`, `\.md$` | NONE |
| Other | anything else | UNCLASSIFIED — list separately for user to inspect |

Flag `⚠️ ./gradlew --refresh-dependencies recommended` if `build.gradle` is among the incoming changes.

**pcs-frontend:**

| Tag | Path pattern | Impact |
|---|---|---|
| **GLOBAL: Middleware** | `src/main/middleware/.*` | ⚠️ HIGH — every request |
| **GLOBAL: Module** | `src/main/modules/.*` | ⚠️ HIGH — auth/session/i18n core |
| **GLOBAL: Config/Infra** | `^(package\|package-lock\|yarn\|tsconfig.*)\.(json\|lock)$`, `^webpack.*\.js$`, `^Dockerfile.*$`, `^Jenkinsfile_.*$`, `^docker-compose.*\.yml$`, `^nodemon\.json$`, `^config/.*\.json$`, `^charts/`, `^\.husky/`, `^eslint\.config\.js$`, `^jest.*\.config\.(js\|ts)$`, `^playwright\.config\.ts$` | ⚠️ HIGH — build/deploy/runtime config |
| **GLOBAL: Journey config** | `^src/main/steps/index\.ts$`, `^src/main/steps/[^/]+/(flow\.config\|stepRegistry)\.ts$` | ⚠️ HIGH — wires routing/registration across an entire journey |
| Service | `src/main/services/.*` | MEDIUM — multi-page logic |
| Route | `src/main/routes/.*` | MEDIUM — entry points |
| Utils | `src/main/utils/.*` | MEDIUM — many callers |
| Step | `src/main/steps/.+/.+/.*` | LOW — single page in a journey |
| Step template | `src/main/views/.*\.njk$` | LOW — display-only |
| i18n locale | `src/main/assets/locales/.*\.json$` | LOW — content only |
| Static asset | `src/main/assets/.*` (non-locales), `src/main/public/.*` | LOW |
| Tests | `.*\.(test\|spec)\.ts$`, `^src/test/`, `^test/` | LOW — test-only |
| Docs | `^docs/`, `\.md$` | NONE |
| Other | anything else | UNCLASSIFIED — list separately for user to inspect |

Conditional follow-ups:
- If `package.json` or any lockfile is in **GLOBAL: Config/Infra** → flag that `yarn install` will need to run after merge (§3.4).
- If `package.json` itself is in the diff → run the dependency-bump breakdown (§1.4.1).
- If any path under `src/main/steps/<journey>/<step>/` is in the diff → run the per-journey breakdown (§1.4.2).

Aggregate counts per tag for both repos. Surface in the plan gate. HIGH-impact buckets get ⚠️ flags.

#### 1.4.1 pcs-frontend only: dependency-bump breakdown

Triggers only when `package.json` itself is in the incoming file list. (Lockfile-only changes — generated artefacts — don't get a dep-level breakdown; they're driven by the matching `package.json` change.)

```bash
if printf '%s\n' "$INCOMING" | grep -qx 'package.json'; then
  OLD=$(git show HEAD:package.json | jq -r \
    '((.dependencies // {}) + (.devDependencies // {})) | to_entries[] | "\(.key)\t\(.value)"' | sort)
  NEW=$(git show origin/master:package.json | jq -r \
    '((.dependencies // {}) + (.devDependencies // {})) | to_entries[] | "\(.key)\t\(.value)"' | sort)
  # For each package: strip leading [^0-9.] from version, compare MAJOR.MINOR.PATCH tuples.
  # Bucket:
  #   Added   = pkg in NEW only
  #   Removed = pkg in OLD only
  #   Major   = pkg in both, MAJOR(NEW) != MAJOR(OLD)
  #   Minor   = pkg in both, same MAJOR, different MINOR
  #   Patch   = pkg in both, same MAJOR.MINOR, different PATCH (or only prefix changed)
fi
```

Render: list **all** package names for **Added**, **Removed**, and **Major** (high-signal — major bumps are where breaking changes live). For Minor/Patch, show count only — names are noise.

#### 1.4.2 pcs-frontend only: per-journey step breakdown

`Steps: 23 files` is meaningless to a senior FE approver; `respond-to-claim: 18, make-an-application: 5` tells them which feature area they're absorbing.

```bash
git diff --name-only HEAD..origin/master -- 'src/main/steps/' | \
  awk -F/ 'NF>=5 {print $4}' | sort | uniq -c | sort -rn
```

(Files at depth ≤ 4 — `src/main/steps/index.ts`, `src/main/steps/<journey>/flow.config.ts`, `src/main/steps/<journey>/stepRegistry.ts` — are deliberately excluded; they belong to the **GLOBAL: Journey config** bucket, not the per-step breakdown.)

Render each journey on its own line in the LOW IMPACT block, replacing the flat `Steps: <N> files` row. Sort by file count desc.

### 1.5 Commit timeline by ticket

**pcs-api:** group commits coming from master by JIRA ticket:
```bash
git log HEAD..origin/master --no-merges --format='%h|%s|%b%x00'
```
Parse the null-separated records, extract the JIRA prefix (`^[A-Z]+-[0-9]+`) from each subject, group by JIRA. For each group: JIRA ticket + commit count + total file count; **What** = the cleanest subject line; **Why** = the commit body if present else `(no body — intent inferred from subject)`; **Top files** = up to 5 paths, HIGH-impact buckets first.

**pcs-frontend:** group commits by JIRA prefix so the approver sees ticket-level scope, not N unstructured one-liners:
```bash
# Per-ticket: count, first author seen, ISO timestamp of latest commit, sample subject
git log --format='%h%x09%an%x09%aI%x09%s' HEAD..origin/master | \
  awk -F'\t' '{
    if (match($4, /^[A-Z]+-[0-9]+/)) t=substr($4,RSTART,RLENGTH);
    else if ($4 ~ /^(Update dependency|Bump |Pin |Update .* monorepo|Update Node\.js|Update Yarn)/) t="Renovate";
    else t="(no-ticket)";
    n[t]++;
    if (!(t in a)) a[t]=$2;
    if (!(t in last) || $3>last[t]) last[t]=$3;
    if (!(t in s)) s[t]=$4;
  }
  END {for (t in n) printf "%s\t%d\t%s\t%s\t%s\n", t, n[t], a[t], last[t], s[t]}' \
  | sort -t$'\t' -k2,2 -rn

# Header counts
AUTHOR_COUNT=$(git shortlog -sn --no-merges HEAD..origin/master | wc -l | tr -d ' ')
```
Render the top **8** rows verbatim; if more, append `+ <N> more tickets`. Treat `Renovate` as a single aggregated row even if it has 20+ commits — dependency volume must not push real tickets off the list. For ticket subject, truncate to ~50 chars. For age, convert latest ISO timestamp to relative form (`Nd ago`, `Nh ago`).

### 1.6 Conflict prediction (in-memory 3-way merge)
```bash
git merge-tree --write-tree HEAD origin/master >/dev/null 2>&1
CONFLICTS_PREDICTED=$?   # 0 = clean, non-zero = conflicts
OVERLAP=$(comm -12 \
  <(git diff --name-only origin/master...HEAD | sort) \
  <(git diff --name-only HEAD...origin/master | sort))
```

### 1.7 Skip-worktree state

**pcs-api:** candidate files are `build.gradle` and
`src/main/java/uk/gov/hmcts/reform/pcs/ccd/page/resumepossessionclaim/RentArrears.java`.
List those that are skip-worktree-flagged AND modified. Only modified ones need stashing.

Skip-worktree files do NOT show in `git status` or `git diff` (that's the whole point of the flag), so working-tree state can't decide if they're modified. Use `git diff-index` against `HEAD`, which compares the index against the working tree directly and ignores the skip-worktree bit:
```bash
SW_FILES="build.gradle src/main/java/uk/gov/hmcts/reform/pcs/ccd/page/resumepossessionclaim/RentArrears.java"
# Confirm skip-worktree is set (flag column is uppercase `S`, NOT lowercase — that's assume-unchanged `h`)
git ls-files -v -- $SW_FILES | awk '$1=="S"{print $2}'
# Identify which of those are actually modified
SKIP_FILES_MODIFIED=$(git diff-index --name-only HEAD -- $SW_FILES)
```
If `$SKIP_FILES_MODIFIED` is non-empty, the merge will fail with `"Your local changes to the following files would be overwritten by merge"` when incoming changes touch any of those paths — stash them first (§3.2).

**pcs-frontend:** pcs-frontend's local-dev tweaks live on the `local-setup` branch (per its `CLAUDE.md`). Candidate files are the OIDC local simulator and module index:
- `src/main/modules/oidc/oidc-local.ts`
- `src/main/modules/index.ts`

For each, check if skip-worktree-flagged AND modified:
```bash
SKIP_FILES_MODIFIED=$(for f in src/main/modules/oidc/oidc-local.ts src/main/modules/index.ts; do
  git ls-files -v -- "$f" 2>/dev/null | awk '$1=="S"{print $2}' | while read sf; do
    [ -n "$(git diff --name-only -- "$sf")" ] && echo "$sf"
  done
done)
```
Only modified ones need stashing later.

---

## Phase 2 — Plan gate

Render the plan, ask, branch on the answer. **No mutation.**

```
========================================
Merge plan: origin/master → <branch>
========================================
Master ahead:        <N> commits [pcs-frontend: across <T> tickets, <A> authors]
  <first 5 commit subjects, or §1.5's per-ticket render>
Branch ahead:        <M> commits

JIRA prefix:         <JIRA>   (source: branch | prev commit | user)
Merge commit msg:    "<JIRA>: Merge origin/master"

Incoming work:
  <§1.5 per-ticket breakdown>

<pcs-api only>
Migration plan:
  Branch added:      <list, or "none">
  Master highest:    V<MASTER_HIGHEST>
  Renames needed:    V<OLD>→V<NEW> ...   | none

<pcs-frontend only, if package.json in diff>
Dependency changes (package.json):
  Added:    <N>  (<all names, comma-separated>)
  Removed:  <N>  (<all names>)
  Major:    <N>  (<all names — review carefully, breaking changes live here>)
  Minor:    <N>
  Patch:    <N>

Incoming changes by impact (<TOTAL> files):
  ⚠️ HIGH IMPACT (review carefully):
     <§1.4's HIGH-impact buckets, counts, example paths>
  MEDIUM IMPACT:
     <§1.4's MEDIUM-impact buckets>
  LOW IMPACT:
     <§1.4's LOW-impact buckets — pcs-frontend: per-journey breakdown from §1.4.2 replaces the flat Steps row>
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
  1. <pcs-api only, if renames>       Rename V<OLD>→V<NEW> and commit
  2. <only if dirty SW>               Stash skip-worktree files
  3. git merge origin/master -m "<JIRA>: Merge origin/master"
  4. <pcs-frontend only, if package.json>  yarn install
  5. <§3.4's verify command>
  6. <only if stashed>                git stash pop and re-set skip-worktree
  7. AskUserQuestion → push to origin
```

AskUserQuestion: `Proceed with this plan?`
- **Yes, run the plan** (default)
- **Show full diff first** → `git log --oneline -p HEAD..origin/master | head -300`, re-prompt
- **Abort** → exit cleanly. No mutation. In Phase 4, the wrapper also tears down the worktree on abort (see §4.4).

---

## Phase 3 — Execute (only after Phase 2 approval)

### 3.1 Repo-specific prep

**pcs-api:** rename migrations if the plan included renames:
```bash
git mv "src/main/resources/db/migration/V${OLD}__${DESC}.sql" \
       "src/main/resources/db/migration/V${NEW}__${DESC}.sql"
git commit -m "${JIRA}: Renumber migration V${OLD} → V${NEW} to avoid origin/master conflict"
```
Do **not** grep/sed the rest of the repo for `V${OLD}__`. Flyway identifies migrations by filename + checksum.

**pcs-frontend:** no equivalent prep step — skip to §3.2.

### 3.2 Stash skip-worktree files (only the modified ones)
For files identified in §1.7:
```bash
git update-index --no-skip-worktree $SKIP_FILES_MODIFIED
git stash push -m "sync-master-localdev" -- $SKIP_FILES_MODIFIED
```

### 3.3 Run the merge
```bash
git merge origin/master -m "${JIRA}: Merge origin/master"
```
- **Code conflicts:** `git status --short | grep '^UU'` lists them; **do not auto-resolve by default**; tell user to resolve and finish with `git commit -m "${JIRA}: Merge origin/master"`. Skip §3.4 onward, exit.
  - **Auto-resolve override:** if the user explicitly authorises auto-resolution for this run, only **mechanical** conflicts may be resolved by Claude:
    - import-block merges (combining import lists from both sides; drop unused imports to avoid checkstyle violations (pcs-api) or lint errors (pcs-frontend))
    - non-overlapping additions (both sides added independent code in the same region — keep both)
    - file rename + content change (rename on one side, content change on the other — apply both)

    Semantic conflicts (changed logic, changed behavior, intent overlap) **always** require human resolution — never auto-resolve.
- **Hook rejection:** the two repos' bypass policies genuinely differ — never force them to agree.

  **pcs-api:** STOP. Show the **verbatim** hook output (commit-msg, pre-commit, secrets, checkstyle, apostrophe, etc.). Diagnose root cause: mechanical (wrong message format) vs. real (false token in test fixture vs. real secret, checkstyle, formatting).
  - **Master-resident check:** if the hook flags a specific line, verify whether identical content exists on `origin/master`:
    ```bash
    git show origin/master:<file> | sed -n '<line>p'
    ```
    If yes, the content is master-resident — it was acceptable when added to master and the merge is just surfacing it again, not introducing it. This is a strong candidate for one-time `--no-verify` with explicit user approval. Do **not** try to "fix" master-resident content as part of the merge commit (out-of-scope changes).
  - **AskUserQuestion** (default = abort): `Retry` / `Abort, fix manually` / `Bypass with --no-verify` (only offer if user has explicitly authorised it for this specific failure).
  - **Scope of `--no-verify` authorisation:** per-commit AND per-failure-cause. Authorising for one merge commit does NOT carry to subsequent commits, even in the same session. A new failure (or a re-run of the same flow) requires a fresh AskUserQuestion.
  - Never silent retry. Never silent `--no-verify`.

  **pcs-frontend:** STOP. Show the **verbatim** hook output (husky pre-commit, lint-staged, secrets scan, etc.). Diagnose root cause: mechanical (wrong message format) vs. real (false token in test fixture vs. real secret, lint/format error) vs. false positive (interactive prompt the agent can't answer; flagged content already on origin/master).
  - **`--no-verify` is permitted only after a visible, line-by-line audit** of every other commit rule. Never silent, never reflexive. The audit MUST appear in the transcript so the user can see what was checked.
  - Audit checklist (all must pass before bypass):
    - Commit-msg: JIRA prefix `^[A-Z]+-[0-9]+:`, single line, no `Co-Authored-By:`, no "Generated with Claude Code", no emoji.
    - Pre-commit: no `docs/` paths staged; `yarn lint` (lint-staged equivalent) already green.
    - Master-resident: every file the hook flags is byte-identical to `origin/master:<file>`:
      ```bash
      diff <(git show ":0:<file>") <(git show "origin/master:<file>")
      ```
  - **If every audit item passes AND the only remaining issue is a false-positive interactive prompt**, run `git commit --no-verify -m "<JIRA>: Merge origin/master"` and proceed to verify/push.
  - **If any audit item fails**, do NOT bypass — fix the underlying issue (correct the message, unstage docs/, fix the lint error, etc.) and retry the commit normally.
  - Mechanical fixes (wrong commit message format) never bypass — fix the message and retry. Real errors (lint/format/secret) never bypass — fix the code.

### 3.3.1 Manual continuation after a conflict halt
If §3.3 halted with conflicts, the user resolves them outside the agent. To finish:
- Stage resolved files: `git add <files>`
- Commit: `git commit -m "${JIRA}: Merge origin/master"`
- Resume from §3.4 (verify) and §3.6 (push).

The agent does NOT auto-resume. The user (or a fresh `/pcs:sync-master` invocation, or a direct request to Claude) owns the resolved state from this point on.

### 3.4 Verify

**pcs-api:**
```bash
ls src/main/resources/db/migration/V*.sql | sed -E 's|.*/V([0-9]+)__.*|\1|' | sort -n | uniq -d
./gradlew compileJava compileTestJava -q
```
If `uniq -d` produces output OR compile fails: STOP, surface failure, do not push.

**pcs-frontend:**
```bash
# Only if classifier flagged package.json or a lockfile
yarn install --frozen-lockfile

# Always
yarn lint
yarn build:server
```
If `yarn install`, `yarn lint`, or `yarn build:server` fail: STOP, surface failure, do not push.

`yarn lint` covers ESLint, Prettier, and stylelint. `yarn build:server` is a fast TypeScript compile (`tsc`) — catches type errors. Webpack `yarn build` and Jest `yarn test:unit` are CI's job, not this gate (same principle for pcs-api: the full test suite is CI's job, not this gate's).

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
<pcs-api>   Migrations renamed:     V<OLD>→V<NEW>  | none
<pcs-frontend> yarn install ran:    yes (lockfile changed) | no
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
WT="/tmp/pcs-merge-${BRANCH//\//-}-$$"          # pcs-frontend: /tmp/pcs-frontend-merge-${BRANCH//\//-}-$$
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
2. **Hook rejection policy is repo-specific — see §3.3.** The two repos' `--no-verify` rules are not the same and this skill does not force them to agree. Never silent retry, never silent `--no-verify` in either repo.
3. **Push only after explicit AskUserQuestion confirmation.** Default may be `yes`, but the prompt must appear.
4. **Commit messages:** single-line, JIRA-prefixed (`^[A-Z]+-[0-9]+`), no co-author attribution. pcs-frontend additionally forbids AI-generation footers and emoji (its commit-msg hook enforces all of this). Always supply via `-m`.
5. **macOS-compatible shell.** `sed -E`, `sed -i ''` (empty backup arg), no `grep -P`, no GNU-only flags.
6. **Phase 4 PR resolution is git-only.** Fetch `refs/pull/<N>/head` and find the same-repo origin branch by SHA match. Fork PRs (no matching `origin/<branch>`) must be refused — we can't push back to a fork. Always surface the resolved branch before doing worktree work (§4.1.1).
7. **Verify gate is exactly §3.4 for the detected repo** — don't substitute a different check (e.g. don't run pcs-frontend's Jest/webpack, or pcs-api's full test suite; both are CI's job, not this gate's).
