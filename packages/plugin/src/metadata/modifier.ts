import type { RuleActionType } from "./types";

/** Dataview インラインフィールド [key:: value] を抽出する正規表現 */
const DATAVIEW_FIELD_PATTERN = /\[([^\]]+)::\s*([^\]]*)\]/g;

/** Tasks プラグインのメタデータ絵文字 */
const TASKS_EMOJI_PATTERN = /\s*[📅⏳🛫✅❌🔁⏫🔼🔽⏬🆔⛔]/u;

/**
 * タスク行のメタデータを変更する
 */
export function modifyLineMetadata(
	line: string,
	action: RuleActionType,
	key: string,
	value?: string,
): string {
	switch (action) {
		case "set":
			return setField(line, key, value ?? "");
		case "delete":
			return deleteField(line, key);
		case "append":
			return appendToField(line, key, value ?? "");
		default:
			return line;
	}
}

/**
 * フィールドを追加または更新
 */
function setField(line: string, key: string, value: string): string {
	const sanitizedValue = sanitizeValue(value);
	const newField = `[${key}:: ${sanitizedValue}]`;

	// 既存のフィールドを探す
	const existingPattern = new RegExp(`\\[${escapeRegex(key)}::\\s*[^\\]]*\\]`);
	if (existingPattern.test(line)) {
		// 既存フィールドを更新
		return line.replace(existingPattern, newField);
	}

	// 新規追加: Tasks絵文字または既存Dataviewフィールドの前に挿入
	return insertBeforeMetadata(line, newField);
}

/**
 * フィールドを削除
 */
function deleteField(line: string, key: string): string {
	const pattern = new RegExp(`\\s*\\[${escapeRegex(key)}::\\s*[^\\]]*\\]`, "g");
	return line.replace(pattern, "").replace(/\s+$/, "");
}

/**
 * 既存フィールドに値を追記
 */
function appendToField(line: string, key: string, appendValue: string): string {
	const sanitizedValue = sanitizeValue(appendValue);
	const existingPattern = new RegExp(`\\[${escapeRegex(key)}::\\s*([^\\]]*)\\]`);
	const match = line.match(existingPattern);

	if (match) {
		const existingValue = match[1];
		const newValue = existingValue + sanitizedValue;
		return line.replace(existingPattern, `[${key}:: ${newValue}]`);
	}

	// フィールドが存在しない場合は新規作成
	return setField(line, key, sanitizedValue);
}

/**
 * Tasks プラグインのメタデータの前にフィールドを挿入
 */
function insertBeforeMetadata(line: string, field: string): string {
	// Tasks 絵文字メタデータを探す
	const emojiMatch = line.match(TASKS_EMOJI_PATTERN);
	// 既存の Dataview インラインフィールドを探す
	DATAVIEW_FIELD_PATTERN.lastIndex = 0;
	const dataviewMatch = DATAVIEW_FIELD_PATTERN.exec(line);

	let insertIndex: number | undefined;

	if (emojiMatch?.index !== undefined && dataviewMatch?.index !== undefined) {
		insertIndex = Math.min(emojiMatch.index, dataviewMatch.index);
	} else if (emojiMatch?.index !== undefined) {
		insertIndex = emojiMatch.index;
	} else if (dataviewMatch?.index !== undefined) {
		insertIndex = dataviewMatch.index;
	}

	if (insertIndex !== undefined) {
		const beforeMeta = line.slice(0, insertIndex).trimEnd();
		const afterMeta = line.slice(insertIndex);
		return `${beforeMeta} ${field} ${afterMeta.trimStart()}`;
	}

	// メタデータがない場合は末尾に追加
	return `${line.trimEnd()} ${field}`;
}

/**
 * 値に含まれる改行を除去（インラインメタデータには改行不可）
 */
function sanitizeValue(value: string): string {
	if (value.includes("\n") || value.includes("\r")) {
		console.warn("[metadata-modifier] Newline in value replaced with space");
		return value.replace(/[\r\n]+/g, " ").trim();
	}
	return value;
}

/**
 * 正規表現の特殊文字をエスケープ
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
