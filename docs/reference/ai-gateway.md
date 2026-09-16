---
title: AI Gateway
topic: ai-gateway
diataxis: reference
product: workspace
audience: both
---
# AI Gateway

The **HMCTS AI Gateway** is the platform's sanctioned route to LLMs — an APIM control
plane sitting in front of **Azure AI Foundry** (Azure's model-catalogue-as-a-service,
the equivalent of AWS Bedrock; rebranded from Azure OpenAI Service / AI Studio).
Databricks is unrelated and not required for this route. The gateway is owned by DTS
Platform Operations, split across three repos:

| Repo | What it is |
|---|---|
| [`hmcts/terraform-module-ai-services`](https://github.com/hmcts/terraform-module-ai-services) | Public CNP-conventioned Terraform module for the underlying Foundry hub, cognitive account, deployments, content safety and private endpoints. |
| [`hmcts/platform-ai-gateway-infra`](https://github.com/hmcts/platform-ai-gateway-infra) | The gateway itself — APIM in front of Foundry, self-service onboarding via YAML + PR. |
| [`hmcts/platform-ai-gateway-docs`](https://github.com/hmcts/platform-ai-gateway-docs) | Published docs at <https://hmcts.github.io/platform-ai-gateway-docs>. |

Both layers already exist — don't provision a separate `azurerm_cognitive_account` CNP
module for a new LLM use case. Onboard to the gateway instead.

## Calling it

The gateway exposes an OpenAI-SDK-compatible chat-completions endpoint, so existing
OpenAI client libraries work unmodified:

```
POST https://ai-gateway.sandbox.platform.hmcts.net/ai/platform/foundry/models/v1/chat/completions
Authorization: Bearer <Entra token for api://<gateway-client-id>/.default>
Ocp-Apim-Subscription-Key: <your APIM subscription key>
```

At time of writing the gateway is deployed to the `sandbox` environment only. Access
is **workload-to-workload only** — managed identity or service-principal client
credentials, no user auth. APIM enforces token quotas, per-team model allowlists,
content safety, and per-service cost attribution, and returns errors in the OpenAI
error envelope (e.g. `403 model_not_permitted`, `429 token_quota_exceeded`).

Onboarding a new team or model is two PRs, no ticket needed:

1. `central-app-registration` — add an entry to
   `environments/sbox/ai_gateway_onboarding.yaml` granting your identity the
   `AI.Gateway.Standard` app role. Use the managed identity's **object id**
   (`principalId`), not its client id.
2. `platform-ai-gateway-infra` — add your service/model to the onboarding config for
   the APIM allowlist and quota.

## Request contract has no file field

The published OpenAPI spec (`platform-ai-gateway-infra:components/apim/specs/ai-gateway-v1.yaml`)
defines a `ChatCompletionRequest` with exactly these fields: `model`, `messages`,
`stream`, `temperature`, `max_completion_tokens`, `max_tokens` (deprecated), `top_p`,
`frequency_penalty`, `presence_penalty`, `stop`, `n`, `user`. There is no `file`,
`document`, or `attachments` field — the gateway's docs list document extraction as
explicitly out of v1 scope.

This means a PDF or other binary document cannot be posted directly. It has to be
converted to one or more images before it leaves your service, and sent as an
`image_url` content part with a base64 `data:` URL:

```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "user", "content": [
        { "type": "text", "text": "Describe this document." },
        { "type": "image_url", "image_url": { "url": "data:image/png;base64,<...>" } }
    ] }
  ]
}
```

`ChatMessage.content` is typed `oneOf: [string, array<object>]`, and the array item is
an unconstrained `object`, so this OpenAI-style content-parts shape passes APIM
validation and is forwarded to Foundry, where vision-capable models (e.g. `gpt-4o`)
accept it. Don't assume a binary upload path exists just because the endpoint is
"OpenAI-compatible" — check the gateway's own spec, not the generic OpenAI schema,
since the gateway's contract is narrower.

## Related

- [Technology stack](technology-stack.md)
