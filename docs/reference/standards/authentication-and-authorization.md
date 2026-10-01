---
title: Authentication and authorization
topic: authentication-and-authorization
diataxis: reference
product: workspace
audience: both
---

# Authentication and authorization

CFT services should use OpenID Connect with CFT IDAM for user authentication.

Authentication and authorization are separate concerns. OpenID Connect establishes the user identity. Services are responsible for their own authorization decisions.

### OpenID Connect flows

Use the authorization code flow for browser-based user authentication.

Use PKCE where the client stack supports it.

Node's `openid-client` (v6, built on `oauth4webapi`) does not error when the session's stored
PKCE code verifier is missing at the callback — it silently omits `code_verifier` from the
token request entirely rather than throwing client-side. IDAM then rejects the exchange with
`invalid_grant` / "code_verifier parameter required" and nothing is logged by the client. A
missing verifier usually means the session was lost or replayed between `/login` and the
callback (expiry, a replayed callback URL, or two concurrent logins sharing one verifier slot),
not a PKCE implementation bug — guard for a missing verifier before calling the token endpoint
so the failure is visible and actionable instead of surfacing only as an opaque IDAM error.

Use client credentials only for service-to-service authentication where no user is involved.

Avoid password and implicit grants for new integrations.

For implementation guidance, see the [OpenID Connect Guide for CFT Developers Using CFT IDAM](https://tools.hmcts.net/confluence/spaces/SISM/pages/1973296310/OpenID+Connect+Guide+for+CFT+Developers+Using+CFT+IDAM).
