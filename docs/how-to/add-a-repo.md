# How to add a repo

```bash
./scripts/add-repo <local-path> <org/repo> [ref]
```

Examples:

```bash
./scripts/add-repo apps/civil/civil-service hmcts/civil-service
./scripts/add-repo apps/sscs/sscs-tribunals-api hmcts/sscs-tribunals-api main
./scripts/add-repo libs/foo-spring-boot-starter hmcts/foo-spring-boot-starter
```

The script:

1. Verifies the path isn't already in `workspace.yaml`.
2. Appends a single line under `repos:` (preserving section comments).
3. Runs `./scripts/bootstrap <path>` to clone via SSH.

After it finishes:

```bash
git add workspace.yaml
git commit -m "add <repo> to manifest"

# Populate per-repo taxonomy
/generate-repo-claude-md <local-path>

# Refresh INDEX.md
./scripts/index
git add INDEX.md && git commit -m "refresh index"
```

## Picking the path

| Repo kind | Goes under |
|---|---|
| Service-team app (frontend, API, definitions, infra) | `apps/<team>/<repo>` |
| Shared platform component (CCD, XUI, IDAM, etc.) | `apps/<component>/<repo>` |
| Java/Node library | `libs/<repo>` |
| Flux config, AKS module, jenkins shared lib | `platops/<repo>` |

The taxonomy in each repo's `CLAUDE.md` carries the platform-vs-team distinction — no separate top-level dir needed.

## Pinning a branch

Pin only for long-running feature work. Default-branch tracking is the usual case.

```bash
./scripts/add-repo libs/ccd-config-generator hmcts/ccd-config-generator noc-part2
```
