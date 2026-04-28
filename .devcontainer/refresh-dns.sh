#!/usr/bin/env bash
# Copy the host's current /etc/resolv.conf (following symlinks) into the
# container, so DNS tracks F5 VPN state. Run whenever VPN connects/disconnects
# mid-session — devcontainer.json also calls this on container start.
set -euo pipefail
sudo cp --dereference /host-etc/resolv.conf /etc/resolv.conf
echo "DNS refreshed from host:"
cat /etc/resolv.conf
