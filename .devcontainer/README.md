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
