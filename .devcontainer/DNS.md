# DNS in the devcontainer

HMCTS internal hostnames (`*.service.core-compute-*.internal`) only resolve via
the F5 VPN's DNS servers. When the VPN connects on the host, it rewrites the
host's `/etc/resolv.conf` to point at those nameservers. The devcontainer needs
to pick up that same configuration — otherwise lookups for AAT/Preview hosts
(Redis, S2S, CCD, etc.) return `NXDOMAIN` / `ENOTFOUND` from inside the
container even though they resolve fine on the host.

## How the fix works

Two pieces in this directory:

1. **`devcontainer.json`** bind-mounts the host's `/etc` read-only at
   `/host-etc`:
   ```json
   "mounts": [
     "source=/etc,target=/host-etc,type=bind,readonly"
   ]
   ```
2. **`post-start.sh`** copies the host's current `resolv.conf` over the
   container's on every container start:
   ```bash
   sudo cp --dereference /host-etc/resolv.conf /etc/resolv.conf
   ```
   `--dereference` is important — on systemd-resolved hosts (default on
   Ubuntu), `/etc/resolv.conf` is a symlink to
   `/run/systemd/resolve/stub-resolv.conf` and we want the resolved file
   contents, not a dangling symlink into a path that doesn't exist in the
   container.

If the VPN connects/disconnects mid-session and DNS goes stale, run
[`refresh-dns.sh`](refresh-dns.sh) to re-copy without restarting the
container:

```bash
.devcontainer/refresh-dns.sh
```

## Ubuntu hosts: required

On Linux hosts (this repo's expected setup) the host's `/etc/resolv.conf` is
typically managed by `systemd-resolved` and points at `127.0.0.53`. That stub
resolver lives in the host's network namespace and is **not reachable from
inside the container**, so without this fix the container falls back to
whatever Docker baked into `/etc/resolv.conf` at create time — usually the
pre-VPN nameservers. Internal HMCTS hosts then NXDOMAIN.

The bind-mount + copy approach replaces those stale entries with the actual
upstream nameservers the host is using right now (F5's DNS when the VPN is
up). This is necessary on Ubuntu.

## macOS hosts: usually not required

Docker Desktop on macOS runs containers in a Linux VM and proxies DNS through
its own resolver, which already follows the host's network configuration
including any active VPN. Containers get a working `/etc/resolv.conf`
(typically pointing at `192.168.65.7` or similar Docker-internal address)
that resolves whatever the host can resolve.

The bind-mount of `/etc` and the `cp` in `post-start.sh` are harmless on
macOS but generally redundant. If you're on a Mac and DNS is working without
this, you can ignore it. If a future change to Docker Desktop breaks that
assumption, the same mechanism will still work — it just isn't load-bearing
today.

## Troubleshooting

- `ENOTFOUND` for `*.core-compute-*.internal` from inside the container:
  - `cat /etc/resolv.conf` — does it list F5's nameservers, or stale ones?
  - `cat /host-etc/resolv.conf` — what does the host see right now?
  - If the host file is correct but the container's isn't, run
    `.devcontainer/refresh-dns.sh`.
- If the host file itself is wrong, the VPN isn't actually configuring DNS;
  fix that on the host first.
- If `refresh-dns.sh` doesn't help (e.g. VPN connected for the first time
  after container create and something else cached), rebuild the container
  with the VPN already up: VS Code → **Dev Containers: Rebuild Container**.
