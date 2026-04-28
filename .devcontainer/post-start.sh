#!/usr/bin/env bash
set -euo pipefail

sudo cp --dereference /host-etc/resolv.conf /etc/resolv.conf || true

config=/home/vscode/.docker/config.json
if [[ -f $config ]]; then
  tmp=$(mktemp)
  jq 'del(.credsStore)' "$config" > "$tmp" && mv "$tmp" "$config"
fi
