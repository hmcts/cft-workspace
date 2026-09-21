#!/usr/bin/env bash
set -euo pipefail
exec az account get-access-token \
  --scope "api://b3bfa0f5-faa5-4d10-bba0-e284144aea89/.default" \
  --query accessToken -o tsv
