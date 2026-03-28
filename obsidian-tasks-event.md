# Obsidian Tasks ステータス変更トリガー: 実装戦略

## 目的
Obsidian Tasks プラグインの「タスクのステータス変更」をトリガーに、別プラグインで処理を実行できるかを検討し、実装戦略をまとめる。

## 結論
- 公式な「ステータス変更イベント API」は **存在しない**。
- 現実的な方法は **イベントまたはファイル変更の監視 + 差分検出**。
- 最も低コストで精度が高いのは **Tasks の内部イベント** `obsidian-tasks-plugin:cache-update` を購読する方式。

## 戦略 A: Tasks 内部イベント購読（推奨）
### 概要
Tasks がキャッシュ更新時に発火するイベントを購読し、前回のタスク配列との差分から「status 変更」を検出する。

### 利点
- Tasks が解釈した Task オブジェクトが直接取得できる（パース不要）。
- ステータス・日付・依存関係など Tasks の仕様に一致した状態を扱える。

### 欠点
- **非公開イベント**のため将来的な破壊的変更の可能性がある。
- イベント名が変更されると動かなくなる。

### イベント仕様（内部）
- イベント名: `obsidian-tasks-plugin:cache-update`
- データ: `{ tasks: Task[], state: State }`

### 差分検出の考え方
- 前回スナップショットを保持して比較。
- 識別子優先順位:
  1) `task.id` が存在する場合はそれをキーにする。
  2) ない場合は `path + lineNumber + description` などを組み合わせる。
- ステータス比較: `task.status.symbol` または `task.status.type` を比較。

### 注意点
- 繰り返しタスクは **1回の変更で複数タスクが生成**される場合がある。
- `onCompletion: delete` により完了タスクが消える場合がある。
- `task.id` が空のタスクは識別が不安定。

## 戦略 B: Obsidian 標準のファイル/キャッシュイベント監視
### 概要
`metadataCache.on('changed')` や `vault.on('modify')` でファイル変更を監視し、変更ファイル内のタスクを再解析して差分を取る。

### 利点
- Tasks の内部 API に依存しない。
- Obsidian 標準 API のみで実装可能。

### 欠点
- Tasks と同じパーサを再実装する必要がある（仕様追従が重い）。
- 変更検出の精度が Tasks の挙動とズレやすい。

## 推奨方針
- **まずは戦略 A を採用**し、イベント名の変更に備えてフォールバックとして戦略 B を用意する。
- 変更検出は `status` のみならず `doneDate` / `cancelledDate` も必要になる可能性があるため、Task の比較対象を拡張可能にする。

## 実装メモ（簡易）
1. `workspace.on('obsidian-tasks-plugin:cache-update', handler)` で購読
2. `handler` 内で前回の `tasks` と比較
3. 差分から `status` 変更を抽出して処理を実行

