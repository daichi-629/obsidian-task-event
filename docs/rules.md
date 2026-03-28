# Rule specification

This plugin loads rules from a Markdown file and applies them when the Tasks plugin reports a task status change.

## Rule file format

- Configure the rule file path in the plugin settings.
- The plugin reads the first fenced code block marked as `json`.
- The JSON root can be either:
  - an array of rules
  - an object with a `rules` array
- If the file is missing, the JSON block is missing, or parsing fails, the plugin falls back to the built-in default rules.

Example Markdown file:

~~~md
# Task event rules

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
~~~

## Rule schema

Each rule uses this shape:

```json
{
  "id": "unique-rule-id",
  "name": "Human readable name",
  "enabled": true,
  "trigger": {
    "fromStatus": " ",
    "toStatus": "x",
    "metadata": [
      { "key": "completionDatetime", "operator": "not_exists" }
    ],
    "pathPattern": "Projects/**/*.md"
  },
  "actions": [
    { "type": "set", "key": "completionDatetime", "value": "{{datetime}}" }
  ]
}
```

Field meanings:

- `id`: stable machine-readable identifier.
- `name`: label for humans.
- `enabled`: `false` disables the rule completely.
- `trigger`: all conditions in this object must match.
- `actions`: applied in array order when the trigger matches.

## Trigger

`trigger` supports these fields:

- `fromStatus`
- `toStatus`
- `metadata`
- `pathPattern`

### Status conditions

`fromStatus` and `toStatus` each accept:

- a single status symbol as a string
- a list of status symbols as a string array

Aliases are also accepted when the rule file is loaded:

- `beforeStatus` -> `fromStatus`
- `afterStatus` -> `toStatus`
- `"before status"` -> `fromStatus`
- `"after status"` -> `toStatus`

Examples:

```json
{ "fromStatus": "x", "toStatus": " " }
```

```json
{ "beforeStatus": [" ", "/"], "afterStatus": ["x", "-"] }
```

Status matching is exact. If a condition is omitted, it matches any status.

### Metadata conditions

`metadata` is an array. Every condition in the array must match.

Each metadata condition has this shape:

```json
{ "key": "completionDatetime", "operator": "exists" }
```

Supported operators:

- `exists`
- `not_exists`
- `equals`
- `not_equals`
- `contains`
- `matches`

Operator behavior:

- `exists`: true if `[key:: value]` exists on the task line
- `not_exists`: true if the field does not exist
- `equals`: exact string equality
- `not_equals`: true if the field is missing or the value differs
- `contains`: substring match
- `matches`: JavaScript regular expression match

Notes:

- Metadata conditions currently inspect only Dataview inline fields like `[completionDatetime:: 2026-03-29T10:30]`.
- Tasks emoji metadata such as `📅`, `✅`, `⏳` is parsed internally but is not currently addressable from rule conditions.
- Invalid regex patterns in `matches` are treated as non-matching.

Example:

```json
{
  "metadata": [
    { "key": "completionDatetime", "operator": "exists" },
    { "key": "project", "operator": "equals", "value": "alpha" }
  ]
}
```

### Path pattern

`pathPattern` matches the task file path with a simple glob implementation.

Supported pattern syntax:

- `*`: any characters except `/`
- `**`: any characters including `/`

Examples:

- `Inbox/*.md`
- `Projects/**/*.md`
- `Daily/2026-03-*.md`

Matching is done against the normalized vault-relative path.

## Actions

Each action has this shape:

```json
{ "type": "set", "key": "completionDatetime", "value": "{{datetime}}" }
```

Supported action types:

- `set`
- `delete`
- `append`

Action behavior:

- `set`: create the Dataview field if missing, otherwise replace its value
- `delete`: remove the field entirely
- `append`: append text to the existing field value, or create the field if it does not exist

Actions operate on Dataview inline fields in the task line:

- input: `- [x] Ship release [project:: alpha]`
- after `set completionDatetime`: `- [x] Ship release [project:: alpha] [completionDatetime:: 2026-03-29T10:30]`

Notes:

- `delete` does not require `value`.
- `set` and `append` sanitize newlines by replacing them with spaces.
- New fields are inserted before Tasks emoji metadata or before existing Dataview fields when possible.

## Template variables

`value` in `set` and `append` supports Mustache templates.

Available variables:

- `{{date}}`: current local date in `YYYY-MM-DD`
- `{{datetime}}`: current local datetime in `YYYY-MM-DDTHH:mm`
- `{{time}}`: current local time in `HH:mm`
- `{{fromStatus}}`: previous task status symbol
- `{{toStatus}}`: new task status symbol
- `{{file.basename}}`: file name without extension
- `{{file.path}}`: vault-relative file path
- `{{meta.someKey}}`: current value of Dataview field `someKey` before actions run

Example:

```json
{
  "type": "append",
  "key": "history",
  "value": "{{date}} {{fromStatus}}->{{toStatus}};"
}
```

## Matching and execution order

When a task status changes:

1. The plugin loads the current task line from the file.
2. It parses Dataview inline fields from that line.
3. It finds all enabled rules whose triggers match.
4. It applies all matching rules in rule order.
5. Inside each rule, it applies actions in action order.
6. It writes the modified line back to the file if the line changed.

Important behavior:

- All trigger conditions are combined with logical AND.
- Multiple matching rules can modify the same field.
- Later actions win if they overwrite the same field.
- Template values use the metadata state from the original line, not the result of previous actions.

## Built-in default rules

If no valid rule file is available, the plugin uses these defaults:

1. When a task changes to status `x`, set `[completionDatetime:: {{datetime}}]` if it does not already exist.
2. When a task changes from status `x` to any other status, delete `[completionDatetime:: ...]` if it exists.

Equivalent JSON:

```json
[
  {
    "id": "default-completed",
    "name": "Record completion datetime",
    "enabled": true,
    "trigger": {
      "toStatus": "x",
      "metadata": [
        { "key": "completionDatetime", "operator": "not_exists" }
      ]
    },
    "actions": [
      { "type": "set", "key": "completionDatetime", "value": "{{datetime}}" }
    ]
  },
  {
    "id": "default-clear-completion",
    "name": "Clear completion datetime when reopened",
    "enabled": true,
    "trigger": {
      "fromStatus": "x",
      "metadata": [
        { "key": "completionDatetime", "operator": "exists" }
      ]
    },
    "actions": [
      { "type": "delete", "key": "completionDatetime" }
    ]
  }
]
```

## Practical examples

Record completion datetime:

```json
[
  {
    "id": "record-completion",
    "name": "Record completion datetime",
    "enabled": true,
    "trigger": {
      "afterStatus": "x",
      "metadata": [
        { "key": "completionDatetime", "operator": "not_exists" }
      ]
    },
    "actions": [
      { "type": "set", "key": "completionDatetime", "value": "{{datetime}}" }
    ]
  }
]
```

Clear completion datetime when a completed task is reopened:

```json
[
  {
    "id": "clear-completion",
    "name": "Clear completion datetime when reopened",
    "enabled": true,
    "trigger": {
      "beforeStatus": "x",
      "afterStatus": [" ", "/"],
      "metadata": [
        { "key": "completionDatetime", "operator": "exists" }
      ]
    },
    "actions": [
      { "type": "delete", "key": "completionDatetime" }
    ]
  }
]
```

Restrict a rule to one folder:

```json
[
  {
    "id": "project-completion",
    "name": "Project completion metadata",
    "enabled": true,
    "trigger": {
      "toStatus": "x",
      "pathPattern": "Projects/**/*.md"
    },
    "actions": [
      { "type": "set", "key": "doneInProject", "value": "{{file.basename}}" }
    ]
  }
]
```

Append a transition log:

```json
[
  {
    "id": "status-history",
    "name": "Append status transition history",
    "enabled": true,
    "trigger": {
      "fromStatus": [" ", "/"],
      "toStatus": ["x", "-"]
    },
    "actions": [
      { "type": "append", "key": "history", "value": "{{date}} {{fromStatus}}->{{toStatus}};" }
    ]
  }
]
```

## Validation notes

- Unknown top-level fields are currently ignored.
- A rule without a valid `trigger` object is ignored.
- If part of the rules array is invalid, valid rules are still loaded.
- This document describes the current implementation, not a separately validated schema.
