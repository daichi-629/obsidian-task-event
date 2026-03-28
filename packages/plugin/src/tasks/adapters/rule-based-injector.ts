import type { Vault } from "obsidian";
import type { TaskChange } from "../diff";
import type { TaskChangeHandler } from "../pipeline";
import type { PluginSettings } from "../../settings";
import {
	type MetadataInjectionRule,
	parseTaskMetadata,
	buildTemplateContext,
} from "../../metadata";
import { findMatchingRules, executeAllRuleActions } from "../../rules";

/**
 * ルールベースのメタデータ注入ハンドラーを作成
 */
export function createRuleBasedInjectorHandler(
	getSettings: () => PluginSettings,
): TaskChangeHandler {
	return async (changes, context) => {
		const vault = context.plugin.app.vault;
		const settings = getSettings();

		for (const change of changes) {
			if (!change.path || change.lineNumber === undefined) {
				console.warn("[rule-based-injector] Missing path or lineNumber", change);
				continue;
			}

			await processChange(vault, change, settings.rules);
		}
	};
}

async function processChange(
	vault: Vault,
	change: TaskChange,
	rules: MetadataInjectionRule[],
): Promise<void> {
	const file = vault.getFileByPath(change.path!);
	if (!file) {
		console.warn("[rule-based-injector] File not found:", change.path);
		return;
	}

	const content = await vault.read(file);
	const lines = content.split("\n");

	const lineIndex = change.lineNumber ?? 0;
	if (lineIndex < 0 || lineIndex >= lines.length) {
		console.warn("[rule-based-injector] Line number out of range:", change.lineNumber);
		return;
	}

	const originalLine = lines[lineIndex];
	const metadata = parseTaskMetadata(originalLine);

	// マッチするルールを検索
	const matchingRules = findMatchingRules(rules, {
		fromStatus: change.fromStatus,
		toStatus: change.toStatus,
		filePath: change.path!,
		metadata,
	});

	if (matchingRules.length === 0) {
		console.debug("[rule-based-injector] No matching rules for change:", change);
		return;
	}

	// テンプレートコンテキストを生成
	const templateContext = buildTemplateContext({
		fromStatus: change.fromStatus,
		toStatus: change.toStatus,
		filePath: change.path!,
		existingFields: metadata.fields,
	});

	// 全ルールのアクションを実行
	const newLine = executeAllRuleActions(originalLine, matchingRules, templateContext);

	if (newLine === originalLine) {
		console.debug("[rule-based-injector] No changes made to line");
		return;
	}

	lines[lineIndex] = newLine;
	await vault.modify(file, lines.join("\n"));

	console.debug("[rule-based-injector] Applied rules:", {
		path: change.path,
		lineNumber: change.lineNumber,
		matchedRules: matchingRules.map((r) => r.id),
		originalLine,
		newLine,
	});
}
