---
description: Trace a CCD callback for a given event-id and service from definition through to controller.
---

Run the `ccd-trace-callback` skill with `$ARGUMENTS`.

Usage: `/ccd-trace-callback <event-id> <service>` — e.g. `/ccd-trace-callback create-application nfdiv`.

Both arguments are required. The skill locates the event in the service's case-type definition (SDK or JSON form), extracts the callback URLs, finds the matching `@PostMapping` handlers in the service, and traces up to two hops further into the call chain. Output is the chain as a sequence of `file:line` locations.

For general questions about how callbacks work, use `/ccd-explain callbacks`. For finding callback examples across repos, use `/ccd-find-example`.
