# cft-workspace docs

Documentation for the workspace itself, organised by [Diátaxis](https://diataxis.fr/):

| Folder | Purpose | Examples |
|---|---|---|
| [`tutorials/`](tutorials/) | Lessons that teach by doing. Read top-to-bottom. | "Get the workspace running end-to-end" |
| [`how-to/`](how-to/) | Goal-oriented recipes for an experienced user. | "Add a new repo", "Debug an IDAM token" |
| [`reference/`](reference/) | Look-up information. Information-dense, no narrative. | "Manifest schema", "Taxonomy fields" |
| [`explanation/`](explanation/) | Conceptual background. Read when you want context. | "How CCD works", "IDAM token flow" |

Pages here cover workspace-wide and platform topics. Product-specific docs live in `apps/<product>/docs/` (see below).

Every Diátaxis page (`tutorials/`, `how-to/`, `reference/`, `explanation/`) carries mandatory frontmatter — `title`, `topic`, `diataxis`, `product`, `audience`. Run `./scripts/_backfill-frontmatter` to populate it and `./scripts/docs-index` to regenerate the workspace-root `DOCS.md` index. The `cft-explain` and `cft-how-to` skills route via `DOCS.md`.

Generated product context and taxonomy live in `apps/<product>/CLAUDE.md` outside the independently cloned repositories. Guidance for a specific clone remains in that clone's own `README.md`, `AGENTS.md`, or `CLAUDE.md`.

Workflow examples in older pages use Claude Code's `/skill-name` syntax. In Codex, invoke the same repository skill as `$skill-name`.

## Product-specific docs

Products with generated documentation have their own Diátaxis tree:

- [`apps/ccd/docs/`](../apps/ccd/docs/) — CCD case-type model, events, callbacks, permissions, decentralisation, documents, search, NoC, case flags, work-basket, work-allocation. Generated and maintained by `/docs-generate ccd`. Start at [`apps/ccd/docs/README.md`](../apps/ccd/docs/README.md).
- [`apps/xui/docs/`](../apps/xui/docs/) — Expert UI.
- [`apps/bulk-scan/docs/`](../apps/bulk-scan/docs/) — Bulk Scan.
- [`apps/wa/docs/`](../apps/wa/docs/) — Work Allocation.
- [`apps/am/docs/`](../apps/am/docs/) — Access Management.
