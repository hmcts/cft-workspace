# pcs-api specifics

Read this when `git remote get-url origin` matches `hmcts/pcs-api`.

## Migration plan (no rename yet)

```bash
BRANCH_MIGRATIONS=$(git diff --name-only --diff-filter=A origin/master...HEAD -- 'src/main/resources/db/migration/V*.sql')
MASTER_HIGHEST=$(git ls-tree -r origin/master --name-only \
  | grep -E 'src/main/resources/db/migration/V[0-9]+__.*\.sql$' \
  | sed -E 's|.*/V([0-9]+)__.*|\1|' | sort -n | tail -1)
```
Conflict rule: branch migration version `<= MASTER_HIGHEST`. Build the rename plan: assign `MASTER_HIGHEST + 1`, `+2`, ... in original order.

Compare migration numbers against `origin/master` only. Never against other open branches/PRs. Branches sharing a `V###` is fine until one merges to master.

## Change classifier — bucket every incoming file by blast radius

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

Aggregate counts per tag. Surface in the plan gate. HIGH-impact buckets get ⚠️ flags. Flag `⚠️ ./gradlew --refresh-dependencies recommended` if `build.gradle` is among the incoming changes.

## Skip-worktree state

Candidate files: `build.gradle` and
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
If `$SKIP_FILES_MODIFIED` is non-empty, the merge will fail with `"Your local changes to the following files would be overwritten by merge"` when incoming changes touch any of those paths — stash them first.

## Execute: rename migrations (if the plan included renames)

```bash
git mv "src/main/resources/db/migration/V${OLD}__${DESC}.sql" \
       "src/main/resources/db/migration/V${NEW}__${DESC}.sql"
git commit -m "${JIRA}: Renumber migration V${OLD} → V${NEW} to avoid origin/master conflict"
```
Do **not** grep/sed the rest of the repo for `V${OLD}__`. Flyway identifies migrations by filename + checksum.

## Mechanical conflict resolution (only if the user explicitly authorises auto-resolution)

- import-block merges (combining import lists from both sides; drop unused imports to avoid checkstyle violations)
- non-overlapping additions (both sides added independent code in the same region — keep both)
- file rename + content change (rename on one side, content change on the other — apply both)

Semantic conflicts (changed logic, changed behavior, intent overlap) **always** require human resolution — never auto-resolve.

## Verify gate

```bash
ls src/main/resources/db/migration/V*.sql | sed -E 's|.*/V([0-9]+)__.*|\1|' | sort -n | uniq -d
./gradlew compileJava compileTestJava -q
```
If `uniq -d` produces output OR compile fails: STOP, surface failure, do not push.

## Hook rejection policy

Hook rejection (commit-msg, pre-commit, secrets, checkstyle, apostrophe, etc.): STOP. Show the **verbatim** hook output. Diagnose root cause: mechanical (wrong message format) vs. real (false token in test fixture vs. real secret, checkstyle, formatting).

- **Master-resident check:** if the hook flags a specific line, verify whether identical content exists on `origin/master`:
  ```bash
  git show origin/master:<file> | sed -n '<line>p'
  ```
  If yes, the content is master-resident — it was acceptable when added to master and the merge is just surfacing it again, not introducing it. This is a strong candidate for one-time `--no-verify` with explicit user approval. Do **not** try to "fix" master-resident content as part of the merge commit (out-of-scope changes).
- **AskUserQuestion** (default = abort): `Retry` / `Abort, fix manually` / `Bypass with --no-verify` (only offer if user has explicitly authorised it for this specific failure).
- **Scope of `--no-verify` authorisation:** per-commit AND per-failure-cause. Authorising for one merge commit does NOT carry to subsequent commits, even in the same session. A new failure (or a re-run of the same flow) requires a fresh AskUserQuestion.
- Never silent retry. Never silent `--no-verify`.

## Commit messages

Single-line (pcs-api hook rejects multi-line), JIRA-prefixed (`^[A-Z]+-[0-9]+`), no co-author attribution. Always supply via `-m`.

## Worktree path (Phase 4)

```bash
WT="/tmp/pcs-merge-${BRANCH//\//-}-$$"
```
