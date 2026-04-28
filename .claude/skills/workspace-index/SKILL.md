---
name: workspace-index
description: Regenerate INDEX.md from each product's CLAUDE.md frontmatter. Use after generating or updating product-level CLAUDE.md files, or when the user asks "what's in the workspace?" / "which products use X?" and INDEX.md looks stale.
---

# Workspace index

`INDEX.md` at the workspace root is a generated taxonomy matrix. Each row is one product (`apps/<product>`, `libs`, or `platops`), with columns for service, repo count, CCD usage, and integrations. The `/find-feature` and `/list-integrations` commands consult it; so do most cross-product questions.

## How to refresh

```bash
./scripts/index
```

The script walks every product directory that has a `CLAUDE.md` at its root (`apps/*/CLAUDE.md`, `libs/CLAUDE.md`, `platops/CLAUDE.md`), parses the YAML frontmatter, and rewrites `INDEX.md`. Products without a CLAUDE.md aren't listed — run `/generate-product-claude-md` first.

## When to re-run

- Right after `/generate-product-claude-md` populates new or updated CLAUDE.md files.
- After `./scripts/sync` if a product's classification might have changed (e.g. a service moved to decentralised CCD).
- When the user asks an index-keyed question and the file's mtime is older than the most recent product update.

## When NOT to re-run

If `INDEX.md` was rebuilt within this session, just read it. Don't burn a build for a question you can answer from existing data.

## Reading INDEX.md programmatically

For automated checks (e.g. inside `/find-feature`), parse the markdown table directly. Columns are stable: `Product | Service | Repos | CCD | Integrations`. The `CCD` column may contain `—`, the config style, and `feat: ...` joined by `;`.
