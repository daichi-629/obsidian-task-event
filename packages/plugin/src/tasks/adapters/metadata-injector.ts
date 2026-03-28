import type { Vault } from "obsidian";
import type { TaskChange } from "../diff";
import type { TaskChangeHandler } from "../pipeline";

/**
 * Dataview形式のメタデータをタスク行に差し込むためのハンドラーを作成
 * 例: `- [x] タスク` → `- [x] タスク [completedAt:: 2026-03-28]`
 */
export function createMetadataInjectorHandler(): TaskChangeHandler {
	return async (changes, context) => {
		const vault = context.plugin.app.vault;

		for (const change of changes) {
			// 完了状態への変更のみ処理
			if (change.toStatus !== "x") {
				continue;
			}

			if (!change.path || change.lineNumber === undefined) {
				console.warn("[metadata-injector] Missing path or lineNumber", change);
				continue;
			}

			await injectCompletedMetadata(vault, change);
		}
	};
}

async function injectCompletedMetadata(vault: Vault, change: TaskChange): Promise<void> {
	const file = vault.getFileByPath(change.path!);
	if (!file) {
		console.warn("[metadata-injector] File not found:", change.path);
		return;
	}

	const content = await vault.read(file);
	const lines = content.split("\n");
	
	// Tasks プラグインの lineNumber は 0-indexed
	const lineIndex = change.lineNumber ?? 0;
	if (lineIndex < 0 || lineIndex >= lines.length) {
		console.warn("[metadata-injector] Line number out of range:", change.lineNumber);
		return;
	}

	const originalLine = lines[lineIndex];
	
	// 既にメタデータがある場合はスキップ
	if (originalLine.includes("[completedAt::")) {
		console.debug("[metadata-injector] Already has completedAt metadata, skipping");
		return;
	}

	// 現在日時を取得
	const now = new Date();
	const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
	
	// Dataview形式のインラインメタデータを追加
	const metadataStr = `[completedAt:: ${dateStr}] `;
	const newLine = insertBeforeTasksMetadata(originalLine, metadataStr);
	
	lines[lineIndex] = newLine;
	
	await vault.modify(file, lines.join("\n"));
	
	console.debug("[metadata-injector] Injected metadata:", {
		path: change.path,
		lineNumber: change.lineNumber,
		originalLine,
		newLine
	});
}

/**
 * Tasks プラグインの predefined メタデータの前にカスタムメタデータを挿入
 * 
 * Tasks メタデータ: 📅 ⏳ 🛫 ✅ ❌ 🔁 ⏫ 🔼 🔽 ⏬ 🆔 ⛔
 * Dataview インライン: [key:: value]
 */
function insertBeforeTasksMetadata(line: string, metadata: string): string {
	// Tasks プラグインのメタデータ絵文字
	const emojiPattern = /\s*[📅⏳🛫✅❌🔁⏫🔼🔽⏬🆔⛔]/u;
	// Dataview インラインフィールド
	const dataviewPattern = /\s*\[[^\]]+::/;
	
	const emojiMatch = line.match(emojiPattern);
	const dataviewMatch = line.match(dataviewPattern);
	
	// 最初に見つかる位置を取得
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
		return `${beforeMeta} ${metadata}${afterMeta}`;
	}
	
	// メタデータがない場合は末尾に追加
	return `${line.trimEnd()} ${metadata}`.trimEnd();
}
