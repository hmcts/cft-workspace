---
name: ccd-trace-callback
description: Trace a CCD callback for a given event-id and service from definition through to controller. Returns the chain of file:line locations. Use when the user wants to know what runs when an event is submitted in a specific service.
---

# Trace a CCD callback

Given an event-id and a service, follow the callback URL from where it's declared in the case-type definition to the Spring controller in the service repo, and onwards to any side-effect calls (CDAM, payment, notify, AAC).

## When to use

- "What happens when `create-application` is submitted in `nfdiv`?"
- "Trace the `aboutToSubmit` callback for `solicitor-link-case` in `civil`."
- "Where does the `submitted` callback for `payment-update` go?"

## When NOT to use

- General "how do callbacks work" questions — use `/ccd-explain callbacks`.
- Cross-service trends — use `/find-feature` or `/ccd-find-example`.

## Inputs

`$ARGUMENTS` should be `<event-id> <service>` (e.g. `create-application nfdiv`). If the service is omitted, ask for it — without it the search is too broad.

## Procedure

1. **Locate the event in the definition**.
   - Service is at `apps/<service>/`. Look for case-type definitions:
     - SDK form: `find apps/<service>/**/*Definitions.java apps/<service>/**/*Event*.java` and grep for the event-id string or its enum equivalent.
     - JSON form: `apps/<service>/**/definitions/<jurisdiction>/CaseEvent.json` for the event row.
   - From the definition, extract the callback URLs declared for `aboutToStart`, `aboutToSubmit`, `submitted`, `mid_event`. SDK form typically generates URLs like `/callbacks/about-to-submit/<event-id>`; JSON form names them explicitly.
2. **Find the controller**.
   - Search `apps/<service>/` for `@PostMapping` matching the URL, or for `@RequestMapping` on a class with `@PostMapping` per method.
   - Note the controller class and method, with `file:line`.
3. **Trace into the service**.
   - From the controller method, follow the call graph one level: which service / handler does it dispatch to?
   - Identify side effects: CDAM uploads, payment calls, notify, AAC role-assignment, ES indexing, stream events.
   - Cap depth at 2 hops — this is a trace, not a static analyser.
4. **Render the chain**.

## Output format

```
Event: <event-id>
Service: <service>

Definition:
  apps/<service>/<path>:<line>      [SDK | JSON]

Callbacks:
  about_to_start  → POST <url>
                  → <Controller>.<method>  apps/<service>/<path>:<line>
  about_to_submit → POST <url>
                  → <Controller>.<method>  apps/<service>/<path>:<line>
                  → side effects:
                      - <hop 1: file:line>
                      - <hop 2: file:line>
  submitted       → POST <url>
                  → <Controller>.<method>  apps/<service>/<path>:<line>

Notes:
  <anything surprising — async dispatch, missing callback, deprecated URL>
```

If a callback is not declared for the event, say so rather than guessing.

## Don't

- Don't trace beyond 2 hops from the controller. The chain gets unhelpful fast.
- Don't speculate. If the controller routes via reflection / annotation processor, surface that and stop.
- Don't search every service. The service is required input.
