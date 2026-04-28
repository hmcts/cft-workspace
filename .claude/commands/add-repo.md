---
description: Add a new HMCTS repo to workspace.yaml and clone it.
---

Usage: `/add-repo <local-path> <org/repo> [ref]`

Run `./scripts/add-repo $ARGUMENTS`. The script appends the entry to `workspace.yaml` and clones via SSH. If the user gave only the `org/repo` and no path, ask which product (e.g. `apps/nfdiv/`, `libs/`, `platops/`) it should go under before running — never guess.

After cloning, remind the user to:
1. Commit the manifest change in the workspace repo (`git add workspace.yaml && git commit`).
2. Run `/generate-product-claude-md <product>` to refresh that product's CLAUDE.md (e.g. `/generate-product-claude-md apps/nfdiv` after adding a new nfdiv repo).
3. Run `./scripts/index` to refresh INDEX.md.
