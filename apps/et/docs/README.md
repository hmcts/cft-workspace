# Employment Tribunals (ET) documentation

Product-specific docs for Employment Tribunals. For what ET is and how its repos fit together, start with the product overview in [`../CLAUDE.md`](../CLAUDE.md). These pages follow the [Diátaxis](https://diataxis.fr/) framework. Workspace-wide platform topics live in the root [`docs/`](../../../docs/) tree.

## Explanation

- [The citizen API lives in et-cos](explanation/citizen-api-in-et-cos.md): et-sya-api was merged into et-ccd-callbacks; where the code is now and how citizen traffic flows
- [Decentralised persistence and concurrent updates](explanation/decentralised-persistence-and-concurrent-updates.md): how ET case data is stored by et-cos, why events are rejected for concurrent updates, and the patterns for fixing hotspots

## How-to

- [Find and fix concurrent-update conflict hotspots](how-to/find-and-fix-concurrent-update-conflicts.md): rank blockers in App Insights, tell duplicates from real races, and apply the right fix
