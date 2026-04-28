#!/usr/bin/env bash
# Copy the host's current /etc/resolv.conf (following symlinks) into the
# container, so DNS tracks F5 VPN state. Run whenever VPN connects/disconnects
# mid-session — devcontainer.json also calls this on container start.
set -euo pipefail

src=/host-etc/resolv.conf
if sudo cp --dereference "$src" /etc/resolv.conf 2>/dev/null; then
  :
elif [[ -L "$src" && "$(readlink "$src")" == *systemd/resolve/* ]]; then
  echo 'nameserver 127.0.0.53' | sudo tee /etc/resolv.conf >/dev/null
else
  echo "error: could not sync /etc/resolv.conf from host" >&2
  exit 1
fi
echo "DNS refreshed from host:"
cat /etc/resolv.conf
