---
name: workspace-index
description: Regenerate INDEX.md from each cloned repo's CLAUDE.md frontmatter. Use after generating or updating per-repo CLAUDE.md files, or when the user asks "what's in the workspace?" / "which repos use X?" and INDEX.md looks stale.
---

# Workspace index

`INDEX.md` at the workspace root is a generated taxonomy matrix. Each row is one cloned repo, with columns for type, service team, CCD usage, integrations, runtime. The `/find-feature` and `/list-integrations` commands consult it; so do most cross-repo questions.

## How to refresh

```bash
./scripts/index
```

The script walks every entry in `workspace.yaml` that's cloned on disk, parses the YAML frontmatter at the top of `<repo>/CLAUDE.md`, and rewrites `INDEX.md`. Repos without `CLAUDE.md` show up as `_no CLAUDE.md_` rows.

## When to re-run

- Right after `/generate-repo-claude-md` populates new or updated CLAUDE.md files.
- After `./scripts/sync` if the user has reason to think a repo's classification has changed (e.g. a service moved from JSON to ccd-config-generator).
- When the user asks an index-keyed question and the file's mtime is older than the most recent clone update.

## When NOT to re-run

If `INDEX.md` was rebuilt within this session, just read it. Don't burn a build for a question you can answer from existing data.

## Reading INDEX.md programmatically

For automated checks (e.g. inside `/find-feature`), parse the markdown table directly. Columns are stable: `Path | Type | Service | CCD | Integrations | Runtime`. The `CCD` column may contain `none`, the config style, the `decentralised` flag, and `feat: ...` joined by `;`.
