# `workspace.yaml` schema

The manifest at the repo root is the single source of truth for what the workspace pulls in.

## Top-level shape

```yaml
defaults:
  org: hmcts            # GitHub org for url shorthand (org/repo → git@github.com:org/repo.git)
  ref: default          # branch to clone — "default" means each repo's GitHub default
  depth: 0              # 0 = full clone; >0 for shallow

repos:
  <local-path>:
    url: <org>/<repo>   # required; cloned via git@github.com:<url>.git
    ref: <branch>       # optional; overrides defaults.ref
    depth: <int>        # optional; overrides defaults.depth
```

`<local-path>` is the directory the repo gets cloned into, relative to the workspace root. Example: `apps/nfdiv/nfdiv-frontend`. The script tooling uses the path prefix for filtering — pick prefixes that group sensibly (`apps/<area>/<repo>`, `libs/<repo>`, `platops/<repo>`).

## Conventions

- **SSH only.** All clones use `git@github.com:<org>/<repo>.git`. The manifest does not accept HTTPS URLs.
- **Default branch by default.** Most entries omit `ref` so each clone tracks the upstream default. Pin a `ref` only when working on a long-running feature branch (e.g. `libs/ccd-config-generator: { ref: noc-part2 }`).
- **No depth except for huge repos.** `depth: 1` is fine for a Terraform repo you only read; never use shallow clones for repos you might commit to.
- **Group by section comments.** The manifest is hand-readable — use `# ─── apps/<area> ─────` blocks for navigation. `scripts/add-repo` appends without disrupting these.

## Adding entries

Use `scripts/add-repo`:

```bash
./scripts/add-repo apps/civil/civil-service hmcts/civil-service
```

It validates the path isn't already in the manifest, appends a new line, and runs `scripts/bootstrap` for that single entry. Commit the manifest change in a separate commit from any other workspace work.

## Programmatic access

`scripts/lib/_common.sh` exposes a `manifest_tsv [prefix]` function used by all the entrypoint scripts. Output is `path<TAB>ssh_url<TAB>ref<TAB>depth` per line. Use it from any new bash tooling rather than re-parsing the YAML.
