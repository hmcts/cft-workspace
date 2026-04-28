---
description: Fast-forward all (or prefix-filtered) cloned repos to their default branch. Skips dirty / branched / unpushed clones.
---

Run `./scripts/sync $ARGUMENTS` from the workspace root. The argument is an optional path prefix (e.g. `apps/nfdiv` to sync only the nfdiv repos). Without arguments, all manifest entries are synced.

After the script completes, summarise the output for the user: how many were synced, how many skipped (and why), how many had errors. Don't list every successful sync — just totals and any non-OK lines.
