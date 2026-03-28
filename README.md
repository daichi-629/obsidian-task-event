# Task Event

Task Event is an Obsidian plugin that watches task status changes from the Tasks plugin and updates inline metadata with rules.

## What it does

- Detects task status changes from the Obsidian Tasks plugin
- Matches rules by status transition, Dataview inline fields, and file path
- Applies `set`, `append`, and `delete` actions to task-line metadata

Example:

- Complete a task
- Add `[completionDatetime:: 2026-03-29T03:41]`
- Reopen the task
- Remove `[completionDatetime:: ...]`

## Installation

1. Build or download the plugin files.
2. Copy `main.js`, `manifest.json`, and `styles.css` into:
   `<Vault>/.obsidian/plugins/obsidian-task-event/`
3. In Obsidian, open **Settings → Community plugins** and enable **Task Event**.

## Rule file

Set a Markdown file path in the plugin settings. The plugin reads the first `json` code block from that file.

Minimal example:

```json
[
  {
    "id": "record-completion",
    "name": "Record completion datetime",
    "enabled": true,
    "trigger": {
      "afterStatus": "x"
    },
    "actions": [
      { "type": "set", "key": "completionDatetime", "value": "{{datetime}}" }
    ]
  }
]
```

Status conditions support both single values and arrays:

```json
{
  "beforeStatus": [" ", "/"],
  "afterStatus": "x"
}
```

Detailed rule syntax is documented in [docs/rules.md](/home/daichi/ghq/github.com/daichi-629/obsidian-task-event/docs/rules.md).

## Default behavior

If no valid rule file is configured, the plugin uses built-in defaults:

- When a task changes to `x`, set `completionDatetime`
- When a task changes from `x` to another status, delete `completionDatetime`

## Developer

```bash
pnpm install
pnpm run dev --filter plugin
pnpm run build
pnpm --filter plugin run lint
```

- Plugin entry: [packages/plugin/src/main.ts](/home/daichi/ghq/github.com/daichi-629/obsidian-task-event/packages/plugin/src/main.ts)
- Manifest: [packages/plugin/manifest.json](/home/daichi/ghq/github.com/daichi-629/obsidian-task-event/packages/plugin/manifest.json)
- Local test vault: `vault/`
