# Explanation

Conceptual background that helps you understand *why* CFT works the way it does. Read these when you need context, not when you have a specific task to do.

## Platform

- [Cloud Native Platform](cloud-native-platform.md) _(planned)_ — what CNP is, the principles behind it, and the infrastructure shape.

## Engineering principles

See [`principles/`](principles/README.md).

- [Coding in the open](principles/coding-in-the-open.md) _(planned)_
- [Continuous delivery](principles/continuous-delivery.md) _(planned)_
- [DevOps](principles/devops.md) _(planned)_
- [Programming](principles/programming.md) _(planned)_
- [Testing](principles/test.md) _(planned)_

## CCD platform

CCD docs live in their own tree: [`docs/ccd/`](../ccd/). It has its own Diátaxis layout (tutorials, how-to, explanation, reference) and is generated/maintained by the `/generate-ccd-docs` skill. Topics covered include the case-type model, event lifecycle, callbacks, permissions, role assignment, decentralisation, documents/CDAM, search, Notice of Change, case flags, work-basket, work-allocation integration, hearings, and more.

Start at [`docs/ccd/README.md`](../ccd/README.md).

## CFT internals (planned)

- **IDAM token flow** — user vs S2S, token endpoints, how `service-auth-provider-java-client` is used.
- **Flux → AKS deployment** — what `cnp-flux-config` actually does, how a service rolls out from PR to AAT to prod.
- **CFT clusters & environments** — sandbox/AAT/prod, cluster naming, where to look for what.

Pages don't exist yet — add as you find yourself explaining one of these to a teammate the first time.
