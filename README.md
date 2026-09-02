# cft-workspace

An AI-assisted workspace for CFT engineers, with cross-repo navigation, explanations of CFT services, and a pipeline that generates workspace-wide and per-product documentation.

The workspace itself ships scaffolding only — devcontainer, scripts, AI-tool configuration, and documentation. HMCTS source lives in repos listed in [`workspace.yaml`](./workspace.yaml) and is cloned on demand into `apps/`, `libs/`, `platops/` (gitignored at the workspace level).

## Quick start

```bash
git clone git@github.com:hmcts/cft-workspace.git
cd cft-workspace

# One-time auth prerequisites (on the host):
gh auth login                 # GitHub
az login                      # Azure (AAT environments, Key Vault)
az acr login --name hmctsprod # devcontainer image
ssh -T git@github.com         # confirm SSH

# Open in VS Code and accept "Reopen in Container" 
# the devcontainer's post-create runs scripts/bootstrap.
# Or bootstrap on the host:
./scripts/bootstrap          # clone everything in workspace.yaml
./scripts/doctor             # health check
```

Run Claude Code or Codex from the workspace root so it discovers the shared instructions and workflows. The devcontainer includes both CLIs; authenticate the client you use on its first run.

To give the agent access to Jira, Confluence, and Jenkins, set up the MCP servers — see [how to set up the Atlassian and Jenkins MCP servers](./docs/how-to/set-up-mcp-servers.md). Optional; cross-repo search and the docs skills work without it.

## Layout

```
apps/<product>/           shared platform (ccd, xui, idam, ...) or service-team
  CLAUDE.md               generated product taxonomy and context
  <repo>/                 independently cloned source repository
libs/<repo>               widely-used Java/Node clients & starters
platops/<repo>            flux, dns, jenkins, AKS, plumbing

workspace.yaml            manifest - single source of truth
docs/                     workspace-wide / platform docs (Diátaxis)
apps/<product>/docs/      product-specific docs (Diátaxis)
```

## Documentation

Two layers feed the AI-assisted workflows:

- **Product taxonomy** - every product carries a `CLAUDE.md` data file with structured frontmatter (`service`, `ccd_features`, `integrations`, `exemplar_dirs`, `repos`, …). The historical filename is retained because scripts and generated indexes depend on it; both supported clients use the content. `scripts/index` aggregates these into [`INDEX.md`](./INDEX.md). Schema in [`docs/reference/taxonomy.md`](./docs/reference/taxonomy.md).
- **Diátaxis docs** - workspace-wide content in [`docs/`](./docs/), per-product content in [`apps/<product>/docs/`](./apps/ccd/docs/). Every page carries mandatory `title`, `topic`, `diataxis`, `product`, and `audience` frontmatter. `scripts/docs-index` aggregates the metadata into [`DOCS.md`](./DOCS.md).

Cross-repo navigation skills consult these indexes rather than grepping every clone: `cft-explain`, `cft-how-to`, `cft-find-example`, `cft-tour`, `cft-find-endpoint`, `cft-api-spec`, `cft-list-integrations`, `cft-ccd-find-feature`, `cft-ccd-trace-callback`, and `cft-cross-repo-search`.

## AI client support

The workflow definitions under `.claude/` remain the single source of truth. Native adapters expose the same content to Codex without maintaining a second copy:

| Capability | Claude Code | Codex |
|---|---|---|
| Repository guidance | `CLAUDE.md` | `AGENTS.md`, which loads the shared guidance |
| Skills | `.claude/skills/` and `/skill-name` | `.agents/skills/` and `$skill-name` |
| Specialist roles | `.claude/agents/` | `.codex/agents/` |
| MCP servers | `.mcp.json` | `.codex/config.toml` |

For example, use `/cft-tour ccd` in Claude Code or `$cft-tour ccd` in Codex. Project-scoped Codex configuration is loaded only after the repository is trusted. The Codex guides for [project instructions](https://developers.openai.com/codex/guides/agents-md), [skills](https://developers.openai.com/codex/skills), and [configuration](https://developers.openai.com/codex/config-basic) describe these conventions.

## MCP

The MCP configuration includes Atlassian (JIRA & Confluence), Jenkins and Playwright. Credentials for the `atlassian` and `jenkins` MCP servers are gitignored and created per-user: [set-up-mcp-servers](./docs/how-to/set-up-mcp-servers.md).


## Scripts

| Script | Purpose |
|---|---|
| `scripts/bootstrap [prefix]` | Clone every manifest entry that's not on disk. Idempotent. |
| `scripts/sync [prefix]` | Fast-forward each clean clone to its remote default. Skips dirty / branched / unpushed clones. |
| `scripts/doctor [--quiet]` | Validate auth, tooling, manifest, and clone presence. |
| `scripts/add-repo <path> <org/repo> [ref]` | Append a new entry to the manifest and clone it. |
| `scripts/grep <pattern>` | Ripgrep across all clones with CFT-aware excludes. |
| `scripts/index` | Regenerate `INDEX.md` from each product's `CLAUDE.md` frontmatter. |
| `scripts/docs-index` | Regenerate `DOCS.md` from each Diátaxis doc page's frontmatter. |

The `prefix` argument filters by path prefix — e.g. `./scripts/sync apps/nfdiv` only touches the nfdiv clones.

## Local edits to clones

Cloned repos under `apps/`, `libs/`, `platops/` are independent git repositories — branch, commit, and push there as you normally would. The workspace repo never tracks their contents, and `./scripts/sync` skips any clone that's dirty, on a non-default branch, or has unpushed commits, so local work is never overwritten.

## Troubleshooting

- **`gh auth status` fails** → run `gh auth login`.
- **`az` commands return 401 / token expired** → `az login` on the host; rebuild the devcontainer if VS Code is open.
- **`ssh -T git@github.com` fails** → upload your public key to GitHub.
- **AAT hostnames don't resolve in the devcontainer** → known F5 VPN ordering issue; rebuild the container (see `.devcontainer/refresh-dns.sh`).
- **Bootstrap reports "skip (path exists, not a git repo)"** → a directory already exists at the target path but isn't a clone; remove or rename it, then re-run.
