#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY=$(az keyvault secret show \
  --vault-name sps-ai-kv-sbox \
  --name apim-subscription-dtsse-ai-gateway-bedrock-swe \
  --query value -o tsv)

export CLAUDE_CODE_USE_BEDROCK=1
export CLAUDE_CODE_SKIP_BEDROCK_AUTH=1
export CLAUDE_CODE_API_KEY_HELPER_TTL_MS=300000
export AWS_REGION=eu-west-2
export ANTHROPIC_BEDROCK_BASE_URL=https://ai-gateway.sandbox.platform.hmcts.net/ai/platform/v1/bedrock
export ANTHROPIC_CUSTOM_HEADERS="Ocp-Apim-Subscription-Key: $KEY"
export ANTHROPIC_DEFAULT_HAIKU_MODEL='eu.anthropic.claude-haiku-4-5-20251001-v1:0'
export ANTHROPIC_DEFAULT_OPUS_MODEL='eu.anthropic.claude-opus-5[1m]'
export ANTHROPIC_DEFAULT_SONNET_MODEL='eu.anthropic.claude-sonnet-5[1m]'

exec claude --settings $SCRIPT_DIR/cnp.settings.json --dangerously-skip-permissions "$@"
