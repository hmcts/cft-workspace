# cft-workspace docs

Documentation for the workspace itself, organised by [Diátaxis](https://diataxis.fr/):

| Folder | Purpose | Examples |
|---|---|---|
| [`tutorials/`](tutorials/) | Lessons that teach by doing. Read top-to-bottom. | "Get the workspace running end-to-end" |
| [`how-to/`](how-to/) | Goal-oriented recipes for an experienced user. | "Add a new repo", "Debug an IDAM token" |
| [`reference/`](reference/) | Look-up information. Information-dense, no narrative. | "Manifest schema", "Taxonomy fields" |
| [`explanation/`](explanation/) | Conceptual background. Read when you want context. | "How CCD works", "IDAM token flow" |

Pages here cover workspace-wide and platform topics. Product-specific docs live in `apps/<product>/docs/` (see below).

Every Diátaxis page (`tutorials/`, `how-to/`, `reference/`, `explanation/`) carries mandatory frontmatter — `title`, `topic`, `diataxis`, `product`, `audience`. Run `./scripts/_backfill-frontmatter` to populate it and `./scripts/docs-index` to regenerate the workspace-root `DOCS.md` index. Skills `/cft-explain` and `/cft-how-to` route via `DOCS.md`.

Per-repo guidance lives in each clone's `CLAUDE.md` (auto-generated, taxonomy frontmatter + body) — that's a different layer from this directory.

## Product-specific docs

Each platform product has its own Diátaxis tree:

- [`apps/ccd/docs/`](../apps/ccd/docs/) — CCD case-type model, events, callbacks, permissions, decentralisation, documents, search, NoC, case flags, work-basket, work-allocation. Generated and maintained by `/docs-generate ccd`. Start at [`apps/ccd/docs/README.md`](../apps/ccd/docs/README.md).
- [`apps/xui/docs/`](../apps/xui/docs/) — Expert UI (scaffolded).
- [`apps/bulk-scan/docs/`](../apps/bulk-scan/docs/) — Bulk Scan (scaffolded).
- [`apps/wa/docs/`](../apps/wa/docs/) — Work Allocation (scaffolded).
- [`apps/am/docs/`](../apps/am/docs/) — Access Management (scaffolded).
