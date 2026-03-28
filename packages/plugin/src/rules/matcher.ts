import type {
	MetadataInjectionRule,
	RuleTrigger,
	MetadataCondition,
	TaskMetadata,
} from "../metadata";

export interface MatchContext {
	fromStatus: string;
	toStatus: string;
	filePath: string;
	metadata: TaskMetadata;
}

/**
 * ルールがマッチするかどうかを判定
 */
export function matchRule(
	rule: MetadataInjectionRule,
	context: MatchContext,
): boolean {
	if (!rule.enabled) {
		return false;
	}
	return matchTrigger(rule.trigger, context);
}

/**
 * トリガー条件がマッチするかどうかを判定
 */
function matchTrigger(trigger: RuleTrigger, context: MatchContext): boolean {
	// ステータス条件のチェック
	if (!matchStatus(trigger.fromStatus, context.fromStatus)) {
		return false;
	}
	if (!matchStatus(trigger.toStatus, context.toStatus)) {
		return false;
	}

	// パスパターンのチェック
	if (trigger.pathPattern && !matchPathPattern(trigger.pathPattern, context.filePath)) {
		return false;
	}

	// メタデータ条件のチェック
	if (trigger.metadata && !matchMetadataConditions(trigger.metadata, context.metadata)) {
		return false;
	}

	return true;
}

/**
 * ステータス条件がマッチするか
 */
function matchStatus(
	expected: string | string[] | undefined,
	actual: string,
): boolean {
	if (expected === undefined) {
		return true; // 条件なし = 全てにマッチ
	}
	if (Array.isArray(expected)) {
		return expected.includes(actual);
	}
	return expected === actual;
}

/**
 * パスパターンがマッチするか（簡易glob対応）
 */
function matchPathPattern(pattern: string, filePath: string): boolean {
	// 簡易的なglob実装: ** は任意のパス、* は任意の文字列
	const regexPattern = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&") // 特殊文字をエスケープ
		.replace(/\*\*/g, ".*") // ** → .*
		.replace(/\*/g, "[^/]*"); // * → [^/]*

	const regex = new RegExp(`^${regexPattern}$`);
	return regex.test(filePath);
}

/**
 * 全てのメタデータ条件がマッチするか
 */
function matchMetadataConditions(
	conditions: MetadataCondition[],
	metadata: TaskMetadata,
): boolean {
	return conditions.every((condition) =>
		matchMetadataCondition(condition, metadata),
	);
}

/**
 * 単一のメタデータ条件がマッチするか
 */
function matchMetadataCondition(
	condition: MetadataCondition,
	metadata: TaskMetadata,
): boolean {
	const value = metadata.fields[condition.key];
	const exists = condition.key in metadata.fields;

	switch (condition.operator) {
		case "exists":
			return exists;

		case "not_exists":
			return !exists;

		case "equals":
			return exists && value === condition.value;

		case "not_equals":
			return !exists || value !== condition.value;

		case "contains":
			return exists && condition.value !== undefined && value.includes(condition.value);

		case "matches":
			if (!exists || condition.value === undefined) {
				return false;
			}
			try {
				const regex = new RegExp(condition.value);
				return regex.test(value);
			} catch {
				console.warn(`[matcher] Invalid regex pattern: ${condition.value}`);
				return false;
			}

		default:
			return false;
	}
}

/**
 * 有効かつマッチするルールを全て返す
 */
export function findMatchingRules(
	rules: MetadataInjectionRule[],
	context: MatchContext,
): MetadataInjectionRule[] {
	return rules.filter((rule) => matchRule(rule, context));
}
