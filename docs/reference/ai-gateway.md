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
module for a new **chat/completions** use case. Onboard to the gateway instead.

This doesn't extend to Azure AI services the gateway doesn't expose, such as OCR /
Document Intelligence: the gateway's APIM only fronts the chat-completions path (see
below), so a team that needs Document Intelligence provisions its own account by
calling `terraform-module-ai-services` directly with
`cognitive_account_kind = "FormRecognizer"`, rather than trying to route that traffic
through the gateway. A new resource type or module call like this needs allow-listing
in `hmcts/cnp-jenkins-config`'s `terraform-infra-approvals/<repo>.json` before the
Terraform pipeline will accept it.

## Calling it

The gateway exposes an OpenAI-SDK-compatible chat-completions endpoint, so existing
OpenAI client libraries work unmodified:

```
POST https://ai-gateway.sandbox.platform.hmcts.net/ai/platform/foundry/models/v1/chat/completions
Authorization: Bearer <Entra token for api://<gateway-client-id>/.default>
Ocp-Apim-Subscription-Key: <your APIM subscription key>
```

The gateway is deployed to two environments — sandbox and a non-production one used
for AAT — but the two onboarding repos name the non-production environment
differently: `platform-ai-gateway-infra` calls its directory `environments/stg/`,
`central-app-registration` calls the matching one `environments/nonprod/`. Engineers
call it "AAT". There is no separate prod deployment yet. Access is
**workload-to-workload only** — managed identity or service-principal client
credentials, no user auth. APIM enforces token quotas, per-team model allowlists,
content safety, and per-service cost attribution, and returns errors in the OpenAI
error envelope (e.g. `403 model_not_permitted`, `429 token_quota_exceeded`).

Each environment deploys its own model set — a model allowed in one may not exist in
the other, and the onboarding CI validator rejects an `allowedModels` entry that isn't
actually deployed there.

Onboarding a new team or model is two PRs, no ticket needed:

1. `central-app-registration` — add an entry to
   `environments/<sbox|nonprod>/ai_gateway_onboarding.yaml` granting your identity the
   `AI.Gateway.Standard` app role. Use the managed identity's **object id**
   (`principalId`), not its client id.
2. `platform-ai-gateway-infra` — add your service/model to the matching
   `environments/<sbox|stg>/` onboarding config for the APIM allowlist and quota.

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

Sending an image this way is unverified rather than unsupported: the platform's
`llm-content-safety`/`shield-prompt` policy and its prompt-token estimation are both
built around plain text, and neither has been confirmed to behave correctly against an
array-of-parts payload. For document-interrogation use cases, extracting text with an
OCR step and sending that text is the better-supported path — it also avoids the
token-estimation and content-safety uncertainty above. The gateway itself has no OCR
or Document Intelligence route (its only path is chat-completions), so that extraction
step has to happen outside the gateway — see the note on `terraform-module-ai-services`
above for provisioning a Document Intelligence account directly.

## Related

- [Technology stack](technology-stack.md)
