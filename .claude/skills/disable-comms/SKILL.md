---
name: disable-comms
description: Disconnect this Claude Code session from agent-hub — stops the bridge, marks the agent offline and silences every agent-hub hook for the session. Use when the user asks "/disable-comms", "disable comms", "disconnect from agent-hub", "stop agent messaging".
disable-model-invocation: true
---

# Disable agent-hub comms

Undo `/enable-comms` for this session.

## Procedure

1. Run:
   ```bash
   scripts/agent-hub disable
   ```
   It stops the bridge (which marks the agent offline), and removes the session's `enabled` flag so the SessionStart, UserPromptSubmit, Stop and SessionEnd hooks go back to doing nothing. No summaries are published after this.
2. Confirm in one sentence. If it warns it couldn't mark the agent offline, say the service will do so itself within 90 seconds of the last heartbeat.

Topic subscriptions are kept on the service, so a later `/enable-comms` in the same session picks them up again.
