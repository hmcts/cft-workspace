# Getting started

Goal: clone the workspace, run the devcontainer, bootstrap every CFT repo, and have a working cross-repo grep — in under 10 minutes.

## 1. Prerequisites

- A GitHub account with access to the `hmcts` organisation.
- An SSH key uploaded to GitHub. Test: `ssh -T git@github.com` should print "Hi <username>! You've successfully authenticated…".
- VS Code with the **Dev Containers** extension, or the Docker CLI.
- (For HMCTS-internal hostnames) the F5 VPN. Connect **before** opening the devcontainer to avoid the DNS resolution issue.

## 2. Clone and open

```bash
git clone git@github.com:hmcts/cft-workspace.git
cd cft-workspace
code .
```

Accept the "Reopen in Container" prompt when VS Code asks. The post-create hook will:

1. Confirm `gh auth status`.
2. Run `./scripts/bootstrap` to clone all manifest entries.
3. Run `./scripts/doctor` and print a summary.

If you're not using VS Code, run those steps yourself on the host.

## 3. First commands

```bash
# Search across every clone.
./scripts/grep "noticeOfChange"

# Sync everything to its remote default branch.
./scripts/sync

# Sync only the nfdiv repos.
./scripts/sync apps/nfdiv

# Add a new repo to the manifest and clone it.
./scripts/add-repo apps/civil/civil-service hmcts/civil-service

# Refresh the workspace index after changes.
./scripts/index
```

## 4. First Claude Code interaction

Try one of:

```
/doctor
/tour ccd
/find-feature notice_of_change
/list-integrations work_allocation
```

The first two read static state. The latter two consult `INDEX.md` — if it's empty (no product CLAUDE.md generated yet), Claude will offer to run `/generate-product-claude-md` first.

## 5. Working inside a clone

`cd` into a specific clone before running build/test commands. Each is its own git repo with its own toolchain — see its README and `CLAUDE.md`.

## Common stumbles

- **`scripts/bootstrap` errors with "GitHub SSH auth failed"** → your SSH key isn't on GitHub. Run `ssh-keygen -t ed25519` then upload `~/.ssh/id_ed25519.pub` to GitHub Settings → SSH and GPG keys.
- **AAT hostnames don't resolve** → the F5 VPN started after the devcontainer; rebuild the container or run `.devcontainer/refresh-dns.sh`.
- **`./scripts/sync` skips a repo** → it has dirty changes, is on a non-default branch, or has unpushed commits. That's by design; commit/push/clean first, then re-run.
