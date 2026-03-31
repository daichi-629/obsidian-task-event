import { normalizePath, Notice, TFile, type Vault } from "obsidian";
import type { MetadataInjectionRule } from "./metadata";
import { getDefaultRules } from "./rules";

export interface PluginSettings {
	rulesFilePath: string;
	rules: MetadataInjectionRule[];
}

const DEFAULT_SETTINGS: PluginSettings = {
	rulesFilePath: "",
	rules: [],
};

const JSON_CODE_BLOCK_PATTERN = /```json\s*([\s\S]*?)```/gi;

interface PersistedPluginSettings {
	rulesFilePath?: unknown;
}

type RuleRecord = Record<string, unknown>;

interface SettingsHost {
	loadData(): Promise<unknown>;
	saveData(data: { rulesFilePath: string }): Promise<void>;
	app: {
		vault: Vault;
	};
}

/**
 * プラグイン設定をロード
 */
export async function loadSettings(plugin: SettingsHost): Promise<PluginSettings> {
	const data = (await plugin.loadData()) as PersistedPluginSettings | null;
	const rulesFilePath =
		typeof data?.rulesFilePath === "string"
			? normalizePath(data.rulesFilePath)
			: DEFAULT_SETTINGS.rulesFilePath;

	return {
		rulesFilePath,
		rules: await loadRulesFromMarkdown(plugin.app.vault, rulesFilePath),
	};
}

/**
 * プラグイン設定を保存
 */
export async function saveSettings(
	plugin: SettingsHost,
	settings: PluginSettings,
): Promise<void> {
	await plugin.saveData({
		rulesFilePath: settings.rulesFilePath,
	});
}

/**
 * デフォルト設定を取得
 */
export function getDefaultSettings(): PluginSettings {
	return {
		rulesFilePath: DEFAULT_SETTINGS.rulesFilePath,
		rules: [],
	};
}

export async function refreshRules(
	plugin: SettingsHost,
	settings: PluginSettings,
): Promise<void> {
	settings.rules = await loadRulesFromMarkdown(
		plugin.app.vault,
		settings.rulesFilePath,
	);
}

export function findRulesFile(
	vault: Vault,
	rulesFilePath: string,
): TFile | null {
	if (!rulesFilePath.trim()) {
		return null;
	}

	const file = vault.getFileByPath(normalizePath(rulesFilePath));
	return file instanceof TFile ? file : null;
}

export function buildDefaultRulesMarkdown(): string {
	return [
		"# Task event rules",
		"",
		"```json",
		JSON.stringify(getDefaultRules(), null, 2),
		"```",
		"",
	].join("\n");
}

async function loadRulesFromMarkdown(
	vault: Vault,
	rulesFilePath: string,
): Promise<MetadataInjectionRule[]> {
	if (!rulesFilePath.trim()) {
		return [];
	}

	const file = findRulesFile(vault, rulesFilePath);
	if (!file) {
		console.warn("[settings] Rules file not found:", rulesFilePath);
		notifySettingsLoadFailure(`Rules file not found: ${rulesFilePath}`);
		return [];
	}

	try {
		const content = await vault.cachedRead(file);
		const jsonText = extractFirstJsonCodeBlock(content);
		if (!jsonText) {
			console.warn("[settings] No JSON code block found in rules file:", rulesFilePath);
			notifySettingsLoadFailure(`Rules file has no JSON code block: ${rulesFilePath}`);
			return [];
		}

		const parsed = JSON.parse(jsonText) as unknown;
		const rules = normalizeRules(parsed);
		if (!rules) {
			console.warn("[settings] Invalid rules JSON in file:", rulesFilePath);
			notifySettingsLoadFailure(`Rules file contains invalid JSON: ${rulesFilePath}`);
			return [];
		}

		return rules;
	} catch (error) {
		console.error("[settings] Failed to load rules from markdown:", error);
		notifySettingsLoadFailure(`Failed to load rules file: ${rulesFilePath}`);
		return [];
	}
}

function notifySettingsLoadFailure(message: string): void {
	new Notice(message, 7000);
}

function extractFirstJsonCodeBlock(markdown: string): string | null {
	const match = JSON_CODE_BLOCK_PATTERN.exec(markdown);
	JSON_CODE_BLOCK_PATTERN.lastIndex = 0;
	return match?.[1]?.trim() ?? null;
}

function normalizeRules(value: unknown): MetadataInjectionRule[] | null {
	if (Array.isArray(value)) {
		return value
			.map((rule) => normalizeRule(rule))
			.filter((rule): rule is MetadataInjectionRule => rule !== null);
	}

	if (isRecord(value) && Array.isArray(value.rules)) {
		return value.rules
			.map((rule) => normalizeRule(rule))
			.filter((rule): rule is MetadataInjectionRule => rule !== null);
	}

	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function normalizeRule(value: unknown): MetadataInjectionRule | null {
	if (!isRecord(value)) {
		return null;
	}

	const trigger = normalizeTrigger(value.trigger);
	if (!trigger) {
		return null;
	}

	return {
		...value,
		trigger,
	} as MetadataInjectionRule;
}

function normalizeTrigger(value: unknown): MetadataInjectionRule["trigger"] | null {
	if (!isRecord(value)) {
		return null;
	}

	const trigger: RuleRecord = { ...value };
	const fromStatus =
		normalizeStatusCondition(trigger.fromStatus) ??
		normalizeStatusCondition(trigger.beforeStatus) ??
		normalizeStatusCondition(trigger["before status"]);
	const toStatus =
		normalizeStatusCondition(trigger.toStatus) ??
		normalizeStatusCondition(trigger.afterStatus) ??
		normalizeStatusCondition(trigger["after status"]);

	if (fromStatus !== undefined) {
		trigger.fromStatus = fromStatus;
	}
	if (toStatus !== undefined) {
		trigger.toStatus = toStatus;
	}

	delete trigger.beforeStatus;
	delete trigger.afterStatus;
	delete trigger["before status"];
	delete trigger["after status"];

	return trigger as MetadataInjectionRule["trigger"];
}

function normalizeStatusCondition(
	value: unknown,
): string | string[] | undefined {
	if (typeof value === "string") {
		return value;
	}

	if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
		return [...value];
	}

	return undefined;
}
