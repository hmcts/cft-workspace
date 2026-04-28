#!/usr/bin/env bash
set -euo pipefail

# Sync DNS from host. On systemd-resolved Linux hosts, /etc/resolv.conf is a
# relative symlink into /run/systemd/resolve/, which is outside the /host-etc
# bind mount and so unreadable in the container. With --network=host the
# container shares the host's loopback, so pointing at 127.0.0.53 routes DNS
# through the host's stub resolver (which tracks VPN state).
src=/host-etc/resolv.conf
if sudo cp --dereference "$src" /etc/resolv.conf 2>/dev/null; then
  :
elif [[ -L "$src" && "$(readlink "$src")" == *systemd/resolve/* ]]; then
  echo 'nameserver 127.0.0.53' | sudo tee /etc/resolv.conf >/dev/null
else
  echo "warning: could not sync /etc/resolv.conf from host" >&2
fi

config=/home/vscode/.docker/config.json
if [[ -f $config ]]; then
  tmp=$(mktemp)
  jq 'del(.credsStore)' "$config" > "$tmp" && mv "$tmp" "$config"
fi
