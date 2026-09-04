# Devcontainer Config

The container uses the prebuilt image `hmctsprod.azurecr.io/cft-workspace/devcontainer:latest`, published by `.github/workflows/publish-devcontainer.yml` whenever `.devcontainer/**` changes on `master`.

The image is a multi-arch manifest covering `linux/amd64` and `linux/arm64`, so Apple Silicon Macs pull a native arm64 image — no `--platform` override or local build needed.

`hmctsprod` is not anonymous-pull enabled, so before first start (and roughly every 3h thereafter, when the token expires) authenticate with:

```
az login
az acr login --name hmctsprod
```

To build locally from `Dockerfile` instead of pulling, swap the `image` key in `devcontainer.json` for:

```
"build": { "dockerfile": "Dockerfile" }
```

The image includes both Claude Code and Codex. Claude state is mounted from the host as before. Codex state uses the persistent `cft-codex` Docker volume so host-specific configuration is not copied into the Linux container; run `codex login --device-auth` once inside the container.

[ralphex](https://github.com/umputun/ralphex) is installed as well, pinned by version in the `Dockerfile`. It drives Claude Code in a loop and can delegate external review to `codex`, so authenticate both before using it.
