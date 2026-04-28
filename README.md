# cft-workspace

A pre-bootstrapped workspace for working across HMCTS Common Platform / CFT repositories.

The repository ships scaffolding only — devcontainer, scripts, Claude Code agents/commands/skills, docs. Actual HMCTS source lives in repos listed in [`workspace.yaml`](./workspace.yaml) and is cloned on demand into `apps/`, `libs/`, and `platops/`.

## Audience

HMCTS engineers who want a single workspace from which to read, search, and modify across many CFT repos at once — with Claude Code skills tuned for cross-repo navigation.

## Quick start

```bash
git clone git@github.com:hmcts/cft-workspace.git
cd cft-workspace

# Open in VS Code; accept "Reopen in Container" when prompted.
# The devcontainer's post-create runs scripts/bootstrap automatically.

# Or, on the host:
gh auth login                  # one-time, if not already done
ssh -T git@github.com          # confirm SSH auth works
./scripts/bootstrap            # clone all manifest entries
./scripts/doctor               # health check
```

All clones use **SSH** (`git@github.com:...`). HTTPS is not supported.

## Layout

```
apps/<product>/<repo>     # all CFT apps — both shared platform (ccd/, xui/, idam/, ...)
                       # and service-team (nfdiv/, pcs/, ...) — taxonomy in each
                       # repo's CLAUDE.md frontmatter distinguishes them.
libs/<repo>            # widely-used Java/Node clients & starters
platops/<repo>         # flux, dns, jenkins, plumbing, AKS

workspace.yaml         # manifest — single source of truth for what's in this workspace
INDEX.md               # generated taxonomy table (run `./scripts/index`)
docs/                  # workspace docs (Diátaxis: tutorials/how-to/reference/explanation)
```

## Scripts

| Script | Purpose |
|---|---|
| `scripts/bootstrap [prefix]` | Clone every manifest entry that's not on disk. Idempotent. |
| `scripts/sync [prefix]` | Fast-forward each clean clone to its remote default. Skips dirty / branched / unpushed clones. |
| `scripts/doctor [--quiet]` | Validate auth, tooling, manifest, and clone presence. |
| `scripts/add-repo <path> <org/repo> [ref]` | Append a new entry to the manifest and clone it. |
| `scripts/grep <pattern>` | Ripgrep across all clones with CFT-aware excludes. |
| `scripts/index` | Regenerate `INDEX.md` from each repo's `CLAUDE.md` frontmatter. |

The `prefix` argument filters by path prefix — e.g. `./scripts/sync apps/nfdiv` only updates the four nfdiv repos.

## Adding a repo

```bash
./scripts/add-repo apps/civil/civil-service hmcts/civil-service
git add workspace.yaml && git commit -m "add civil-service to manifest"
```

## Generating per-product CLAUDE.md taxonomy

Each product (`apps/<product>/`, `libs/`, `platops/`) gets a `CLAUDE.md` with a structured frontmatter block (service, CCD config, CCD features, integrations, constituent repos) and a product-focused body. Generation is run via the `/generate-product-claude-md` Claude command — re-runnable so the taxonomy stays fresh as products evolve. After generating, run `./scripts/index` to refresh `INDEX.md`.

See [`docs/reference/taxonomy.md`](./docs/reference/taxonomy.md) for the full field list.

## Local edits to clones

Cloned repos under `apps/`, `libs/`, `platops/` are independent git repositories. Make changes, branch, and push there as you normally would. The cft-workspace repo itself never tracks their contents — its `.gitignore` excludes them entirely.

`./scripts/sync` deliberately skips clones that are dirty, on a non-default branch, or have unpushed commits — it will never overwrite local work.

## Troubleshooting

- **`gh auth status` fails** → run `gh auth login`.
- **`ssh -T git@github.com` fails** → upload your public key to GitHub.
- **AAT hostnames don't resolve in the devcontainer** → known F5 VPN ordering issue; rebuild the container (see `.devcontainer/refresh-dns.sh`).
- **Bootstrap reports "skip (path exists, not a git repo)"** → a directory already exists at the target path but isn't a clone; remove or rename it, then re-run.
