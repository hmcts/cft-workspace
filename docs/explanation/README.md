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

## CFT internals (planned)

- **CCD platform** — case data store, definition store, case-type lifecycle, decentralised model.
- **IDAM token flow** — user vs S2S, token endpoints, how `service-auth-provider-java-client` is used.
- **Flux → AKS deployment** — what `cnp-flux-config` actually does, how a service rolls out from PR to AAT to prod.
- **Decentralised CCD** — what changed when service teams started owning their case-type definitions.
- **CFT clusters & environments** — sandbox/AAT/prod, cluster naming, where to look for what.

Pages don't exist yet — add as you find yourself explaining one of these to a teammate the first time.
