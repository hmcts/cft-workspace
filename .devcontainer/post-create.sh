#!/usr/bin/env bash
set -euxo pipefail

sudo chown -R vscode:vscode /home/vscode/.claude /commandhistory /home/vscode/.docker

echo '{}' > /home/vscode/.docker/config.json

corepack enable

touch /commandhistory/.bash_history /commandhistory/.zsh_history

if ! grep -q 'HISTFILE=/commandhistory/.bash_history' /home/vscode/.bashrc; then
  echo 'export HISTFILE=/commandhistory/.bash_history' >> /home/vscode/.bashrc
fi
if ! grep -q 'HISTFILE=/commandhistory/.zsh_history' /home/vscode/.zshrc; then
  echo 'export HISTFILE=/commandhistory/.zsh_history' >> /home/vscode/.zshrc
fi

touch /home/vscode/.claude/.claude.json
ln -sf /home/vscode/.claude/.claude.json /home/vscode/.claude.json

npm install -g @anthropic-ai/claude-code

# Bootstrap workspace clones (idempotent — skips repos already present).
# Runs as the workspace's `vscode` user; needs SSH auth set up beforehand.
cd /workspaces/hmcts
if gh auth status >/dev/null 2>&1; then
  ./scripts/bootstrap || true     # don't fail post-create on a missing repo
  ./scripts/doctor --quiet || true
else
  echo
  echo "==> Skipped scripts/bootstrap — run 'gh auth login' then './scripts/bootstrap'."
  echo
fi
