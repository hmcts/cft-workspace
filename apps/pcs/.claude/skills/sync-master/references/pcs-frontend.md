# pcs-frontend specifics

Read this when `git remote get-url origin` matches `hmcts/pcs-frontend`.

`pcs-frontend`'s `.git/hooks/commit-msg` enforces the JIRA prefix (plus single-line, no co-author, no AI footer, no emoji). Build commit messages that comply by construction so the hook never has cause to reject — see the hook rejection policy below for what to do if it does anyway.

## Change classifier — bucket every incoming file by blast radius

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

Aggregate counts per tag. Surface in the plan gate.

**Conditional follow-up triggered by classifier:**
- If `package.json` or any lockfile is in **GLOBAL: Config/Infra** → flag that `yarn install` will need to run after merge.
- If `package.json` itself is in the diff → run the dependency-bump breakdown below.
- If any path under `src/main/steps/<journey>/<step>/` is in the diff → run the per-journey breakdown below.

## Commit timeline by ticket

Group commits by JIRA prefix so the approver sees ticket-level scope, not N unstructured one-liners.

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

## Dependency-bump breakdown

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

## Per-journey step breakdown

`Steps: 23 files` is meaningless to a senior FE approver; `respond-to-claim: 18, make-an-application: 5` tells them which feature area they're absorbing.

```bash
git diff --name-only HEAD..origin/master -- 'src/main/steps/' | \
  awk -F/ 'NF>=5 {print $4}' | sort | uniq -c | sort -rn
```

(Files at depth ≤ 4 — `src/main/steps/index.ts`, `src/main/steps/<journey>/flow.config.ts`, `src/main/steps/<journey>/stepRegistry.ts` — are deliberately excluded; they belong to the **GLOBAL: Journey config** bucket, not the per-step breakdown.)

Render each journey on its own line in the LOW IMPACT block, replacing the flat `Steps: <N> files` row. Sort by file count desc.

## Skip-worktree state

pcs-frontend's local-dev tweaks live on the `local-setup` branch (per `CLAUDE.md`). Candidate files are the OIDC local simulator and module index:
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

## Mechanical conflict resolution (only if the user explicitly authorises auto-resolution)

- import-block merges (combining import lists from both sides; drop unused imports to avoid lint errors)
- non-overlapping additions (both sides added independent code in the same region — keep both)
- file rename + content change (rename on one side, content change on the other — apply both)

Semantic conflicts (changed logic, changed behavior, intent overlap) **always** require human resolution — never auto-resolve.

## Verify gate

```bash
# Only if classifier flagged package.json or a lockfile
yarn install --frozen-lockfile

# Always
yarn lint
yarn build:server
```
If `yarn install`, `yarn lint`, or `yarn build:server` fail: STOP, surface failure, do not push.

`yarn lint` covers ESLint, Prettier, and stylelint. `yarn build:server` is a fast TypeScript compile (`tsc`) — catches type errors. Webpack `yarn build` and Jest `yarn test:unit` are CI's job, not this gate.

## Hook rejection policy

Hook rejection (husky pre-commit, lint-staged, secrets scan, etc.): STOP. Show the **verbatim** hook output. Diagnose root cause: mechanical (wrong message format) vs. real (false token in test fixture vs. real secret, lint/format error) vs. false positive (interactive prompt the agent can't answer; flagged content already on origin/master).

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

## Commit messages

Single-line, JIRA-prefixed (`^[A-Z]+-[0-9]+`), no co-author attribution, no AI generation footer, no emoji. Always supply via `-m`. `.git/hooks/commit-msg` enforces all five — build compliant messages by construction so the hook never has cause to reject. If it does (e.g. a user-resolved conflict commit included a stray co-author), fix the message and retry. `--no-verify` MUST NOT be used to bypass message-format violations — those are easy to fix; fix them.

## Worktree path (Phase 4)

```bash
WT="/tmp/pcs-frontend-merge-${BRANCH//\//-}-$$"
```
