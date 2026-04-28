---
description: Health-check the workspace — auth, tooling, manifest, clone presence.
---

Run `./scripts/doctor` from the workspace root. Report every failed check with a one-line remediation suggestion (e.g. failed `gh auth status` → "run `gh auth login`"). If everything passes, say so in one sentence.
