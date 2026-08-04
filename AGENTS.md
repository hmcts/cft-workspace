# cft-workspace

Before doing any work, read `CLAUDE.md` in full and follow it as the canonical shared workspace guidance. The filename is retained for compatibility and does not make the guidance Claude-only.

## Codex compatibility

- Run workspace-wide tasks from this repository root. Work started inside an independently cloned child repository should follow that repository's own instructions instead.
- Product-level `apps/*/CLAUDE.md` files are generated taxonomy and product context used by both clients.
- Repository skills live under `.agents/skills/`. Each adapter points to the canonical workflow under `.claude/skills/` or `.claude/commands/`; read that referenced file completely before acting.
- In canonical workflow text, translate Claude Code `/skill-name` invocations to Codex `$skill-name` invocations and treat `$ARGUMENTS` as the arguments supplied with the current skill request.
- When a workflow requests a named specialist, use the matching project-scoped role under `.codex/agents/`. If custom roles are unavailable, read the corresponding `.claude/agents/<name>.md` before delegating or performing the work locally.
- Never edit an independently cloned repository merely to update this workspace's scaffolding or documentation.
