---
title: Write to Jira and Confluence through the Atlassian MCP
topic: write-to-jira-and-confluence-via-mcp
diataxis: how-to
product: workspace
audience: both
---
# Write to Jira and Confluence through the Atlassian MCP

What to know before asking the agent to create or update Jira issues and Confluence pages on `hmcts.atlassian.net` through the hosted `atlassian` MCP server. [Set up the Atlassian and Jenkins MCP servers](set-up-mcp-servers.md) covers getting connected; this page covers the behaviours that cost time once you start writing.

The grant is read-write. Nothing on this page happens unless you ask the agent to write, and it should confirm before it does.

## Jira

### Formatting is Markdown, not wiki markup

Cloud converts the `description` you pass to Atlassian Document Format. Plain Markdown works: headings, bullets, numbered lists, tables with a separator row, fenced code blocks, links, bold.

Older HMCTS skills and notes written for the Server instance at `tools.hmcts.net` tell you to write `{panel:title=...}`, `{code:java}`, `{{monospace}}` and `[text|url]`. On Cloud those arrive as literal text. Do not carry them over.

### Parenting and epics

- `parent: "<PROJECT>-1234"` on `createJiraIssue` sets the epic (or any parent) directly. There is no separate Epic Link custom field to fill in, unlike Server.
- Verify with JQL `parent = <PROJECT>-1234`; the older `"Epic Link" = ...` form still resolves but `parent` is the field Cloud uses.
- An existing Task can be converted to an Epic in place with `editJiraIssue` and `fields: {"issuetype": {"name": "Epic"}}`. No move wizard is needed as long as the project's workflows allow it.

### Fields worth knowing

- Priorities on the CFT projects are named `1-Highest`, `2-High`, `3-Medium`, `4-Low`, `5-Lowest`; pass the full string.
- Assign by `accountId`, not by name or email. Get your own from `atlassianUserInfo`. To unassign, pass `assignee: null` in `fields`.
- Labels may not contain spaces.
- `getJiraIssue` defaults to a compact view that omits custom fields; ask for `view: "evidence"` when you need them.

### Editing an existing description

Fetch it first with `responseContentFormat: html` and write it back with `contentFormat: html`. Fetching as Markdown is lossy for panels, tables and mentions, and writing Markdown back over a description that contains them will flatten or drop them.

## Confluence

### Get the format guide before authoring

Call `getContentFormatGuide` (through `executeRead`, `inputs: {toolName: "createConfluencePage"}`) once per session. It is the authoritative list of supported HTML. In particular, Confluence storage XML (`<ac:structured-macro>`, `<ri:page>`, CDATA) renders as raw text on Cloud; panels are `<div data-type="panel-info">`, status lozenges are `<span data-type="status">`, and so on.

### Match the house style

The agent's defaults do not match how existing CFT pages look:

- Pass `contentWidth: "max"`. The default is a narrow centred column, and any table wider than it breaks out and looks centred and detached from the text.
- Use ordinary `<table>` elements. Do not add `data-layout="wide"`.
- Prefer plain text over status lozenges and `<time>` date chips; migrated pages do not use them.
- Key/value facts read better as a bullet list with bold labels than as a two-column table.
- Open with a short info panel saying why the page exists, and close with a "Notes" section that pins the content to a date.

For an example of the target style, find a recent page in your space that a colleague wrote by hand and copy its shape.

### Every update needs a fresh snapshot token

`updateConfluenceContent` requires the `snapshotToken` from the most recent `getConfluenceContent`. If anyone has edited the page in the browser since, the update is refused with `snapshot_stale`. Always refetch immediately before updating, read what changed, and carry those changes through rather than overwriting them with your earlier copy. People do edit while the agent is working.

### Prefer targeted edits to full rewrites

Fetching with `content_format: html` returns every node with a `data-local-id`. `updateConfluenceContent` accepts an `edits` array that targets those ids (`replaceNode`, `insertNodeAfter`, `deleteNode`, `setAttrs`), which leaves the rest of the page untouched. Use `dryRun: true` first to see the resulting HTML without saving.

Cell background colour, for example, is a `setAttrs` on the `<td>` with `arguments: {"attrs": {"background": "#FFBDAD"}}`. Only the documented palette renders; the format guide lists it.

### Reading a page back to check your work

`detail: "outline"` returns the heading tree cheaply; `detail: "full"` with `content_format: markdown` is readable but lossy (it drops panels, macros and date nodes and says so in `lostFeatures`). Use the HTML form when you are going to edit.

## Jira and Confluence links

Both sides accept plain `https://hmcts.atlassian.net/browse/KEY` and `https://hmcts.atlassian.net/wiki/spaces/SPACE/pages/ID/Title` URLs. On Confluence a bare link on its own line can be given `data-card-appearance="inline"` to render as a smart link; inside a table cell a plain `<a>` with visible text is more predictable.

## Related

- [Set up the Atlassian and Jenkins MCP servers](set-up-mcp-servers.md)
