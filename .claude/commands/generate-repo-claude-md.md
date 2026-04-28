---
description: Generate (or regenerate) a CLAUDE.md with structured taxonomy frontmatter for one or more clones.
---

Usage:
- `/generate-repo-claude-md` — fan out across every clone in `workspace.yaml` that's currently on disk.
- `/generate-repo-claude-md <path>` — single repo, e.g. `apps/nfdiv/nfdiv-case-api`.
- `/generate-repo-claude-md <prefix>` — by prefix, e.g. `apps/nfdiv` for all four nfdiv repos.

Behaviour:
1. List target paths via `./scripts/lib/_common.sh` (`manifest_tsv $ARGUMENTS`).
2. For each, spawn a `repo-analyser` subagent with the absolute path. Run them in parallel where possible (cap concurrency at ~5 to be polite to the host).
3. After all subagents return, run `./scripts/index` to refresh `INDEX.md`.
4. Summarise: which repos got new/updated CLAUDE.md, which were skipped (e.g. not yet cloned), and the resulting `INDEX.md` row count.

This command is **re-runnable**: regenerate periodically (after sync, after a new release, on demand) so the taxonomy stays fresh.
