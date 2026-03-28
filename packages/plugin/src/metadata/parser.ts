import type { TaskMetadata, TasksEmojiMetadata } from "./types";

/** Dataview インラインフィールド [key:: value] を抽出する正規表現 */
const DATAVIEW_FIELD_PATTERN = /\[([^\]]+)::\s*([^\]]*)\]/g;

/** Tasks プラグインの絵文字メタデータパターン */
const TASKS_EMOJI_PATTERNS: Record<keyof TasksEmojiMetadata, RegExp> = {
	due: /📅\s*(\d{4}-\d{2}-\d{2})/,
	scheduled: /⏳\s*(\d{4}-\d{2}-\d{2})/,
	start: /🛫\s*(\d{4}-\d{2}-\d{2})/,
	done: /✅\s*(\d{4}-\d{2}-\d{2})/,
	cancelled: /❌\s*(\d{4}-\d{2}-\d{2})/,
	recurrence: /🔁\s*([^\s📅⏳🛫✅❌⏫🔼🔽⏬🆔⛔\[]+)/,
	priority: /([⏫🔼🔽⏬])/,
};

/**
 * タスク行からメタデータを抽出する
 */
export function parseTaskMetadata(line: string): TaskMetadata {
	return {
		fields: parseDataviewFields(line),
		tasksEmoji: parseTasksEmoji(line),
	};
}

/**
 * Dataview インラインフィールドを抽出
 * 例: "[completedAt:: 2026-03-28]" → { completedAt: "2026-03-28" }
 */
function parseDataviewFields(line: string): Record<string, string> {
	const fields: Record<string, string> = {};
	let match: RegExpExecArray | null;

	// Reset lastIndex for global regex
	DATAVIEW_FIELD_PATTERN.lastIndex = 0;

	while ((match = DATAVIEW_FIELD_PATTERN.exec(line)) !== null) {
		const key = match[1].trim();
		const value = match[2].trim();
		fields[key] = value;
	}

	return fields;
}

/**
 * Tasks プラグインの絵文字メタデータを抽出
 */
function parseTasksEmoji(line: string): TasksEmojiMetadata {
	const emoji: TasksEmojiMetadata = {};

	for (const [key, pattern] of Object.entries(TASKS_EMOJI_PATTERNS)) {
		const match = line.match(pattern);
		if (match) {
			emoji[key as keyof TasksEmojiMetadata] = match[1];
		}
	}

	return emoji;
}

/**
 * タスク行から特定のDataviewフィールドの値を取得
 */
export function getFieldValue(
	line: string,
	key: string,
): string | undefined {
	const metadata = parseTaskMetadata(line);
	return metadata.fields[key];
}

/**
 * タスク行に特定のDataviewフィールドが存在するかチェック
 */
export function hasField(line: string, key: string): boolean {
	const metadata = parseTaskMetadata(line);
	return key in metadata.fields;
}
