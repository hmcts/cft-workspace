---
name: cft-ccd-trace-callback
description: Trace a CCD callback for a given event-id and service from definition through to controller. Returns the chain of file:line locations. Use when the user wants to know what runs when an event is submitted in a specific service.
---

# Trace a CCD callback

Given an event-id and a service, follow the callback URL from where it's declared in the case-type definition to the Spring controller in the service repo, and onwards to any side-effect calls (CDAM, payment, notify, AAC).

## When to use

- "What happens when `create-application` is submitted in `nfdiv`?"
- "Trace the `aboutToSubmit` callback for `solicitor-link-case` in `civil`."
- "Where does the `submitted` callback for `payment-update` go?"

## When NOT to use

- General "how do callbacks work" questions — use `/cft-explain callbacks`.
- Cross-service trends — use `/cft-ccd-find-feature` or `/cft-find-example`.

## Inputs

`$ARGUMENTS` should be `<event-id> <service>` (e.g. `create-application nfdiv`). If the service is omitted, ask for it — without it the search is too broad.

## Procedure

1. **Detect the definition style for the service.**
   - SDK (ccd-config-generator) — most service-team Java repos (nfdiv, civil, sptribs, adoption, pcs, finrem, prl, sscs, et, …):
     - `rg -l "implements CCDConfig" apps/<service>/` returns ≥1 hit.
   - JSON — e.g. probate, iac, and similar legacy services:
     - `find apps/<service> -path '*/definitions/*/CaseEvent.json'` returns hits.
   - If both look present, the SDK is the source of truth — JSON files in an SDK repo are usually generated artefacts.

2. **Locate the event declaration.**

   **SDK style** — the event lives in its own class implementing `CCDConfig<CaseData, State, UserRole>`, typically under `…/event/<EventName>.java`. Inside its `configure(...)` method it calls `configBuilder.event("<event-id>")` (often via a constant whose string value matches):
   ```
   rg -n 'configBuilder\.event\("<event-id>"\)' apps/<service>/
   rg -n '= *"<event-id>"' apps/<service>/      # if declared via a constant
   ```
   Then locate `.event(<CONSTANT>)` on the result. The case-type class (the class implementing `CCDConfig<CaseData, State, UserRole>` near the top of the package — e.g. `…/ccd/CaseType.java`, `…/ciccase/<Domain>.java`, `…/divorcecase/NoFaultDivorce.java`) is useful context but not required to trace a single event. Class names are domain-specific — there is no fixed suffix like `*Definitions.java`.

   **JSON style** — open `apps/<service>/**/definitions/<jurisdiction>/CaseEvent.json` (or the spreadsheet equivalent) and find the row for the event-id. Read the `CallBackURLAboutToStartEvent`, `CallBackURLAboutToSubmitEvent`, `CallBackURLSubmittedEvent` columns.

3. **Resolve the handler.**

   **SDK style** — there is **no service-local Spring controller**. The HTTP layer is `libs/ccd-config-generator/sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/runtime/CallbackController.java` (`@RestController @RequestMapping("/callbacks")`), which receives `POST /callbacks/about-to-start|about-to-submit|submitted|mid-event` from CCD data-store and dispatches into the configured method reference via `CcdCallbackExecutor`. On the EventBuilder lines, read the inline wiring:
   - `.aboutToStartCallback(this::aboutToStart)`
   - `.aboutToSubmitCallback(this::aboutToSubmit)`
   - `.submittedCallback(this::submitted)`
   - `.midEventCallback(this::midEvent)` (or per-page via the `.fields()` builder)

   Each is a method reference. Resolve it to the actual method `file:line` on the same class (or the referenced bean). That method *is* the handler — there is no extra controller hop.

   **JSON style** — search the service for `@PostMapping` matching the callback URL path; that controller method is the handler.

4. **Trace one further hop for side effects.**
   - From the handler method, follow the call graph one level: which collaborator does it dispatch to? CDAM uploads, payment calls, notify, AAC role-assignment, ES indexing, stream events.
   - Cap depth at 2 hops from the handler — this is a trace, not a static analyser.

5. **Render the chain.**

## Output format

```
Event: <event-id>
Service: <service>
Style: [SDK | JSON]

Definition:
  apps/<service>/<path>:<line>

Callbacks:
  about_to_start  → <Class>.<method>  apps/<service>/<path>:<line>
  about_to_submit → <Class>.<method>  apps/<service>/<path>:<line>
                  → side effects:
                      - <hop: file:line>
  submitted       → <Class>.<method>  apps/<service>/<path>:<line>

Notes:
  <anything surprising — async dispatch, missing callback, deprecated URL>
```

For JSON-style traces, also include the declared `POST <url>` on the line above each handler — that URL is the only routing key. For SDK-style traces, omit the URL: it is always `POST /callbacks/<phase>` and is handled by ccd-config-generator's `CallbackController`, not the service.

If a callback is not wired for the event, say so rather than guessing.

## Don't

- Don't trace beyond 2 hops from the handler. The chain gets unhelpful fast.
- Don't expect an SDK-based service to have a `@PostMapping` callback controller — that controller lives in `libs/ccd-config-generator`, not the service repo. Handlers are inline method references on the Event class.
- Don't grep for `*Definitions.java` — no service uses that filename. The reliable signal for SDK case-type / event classes is `implements CCDConfig<…>`.
- Don't speculate. If a handler is wired via reflection or an annotation processor, surface that and stop.
- Don't search every service. The service is required input.
