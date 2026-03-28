import type { MetadataInjectionRule } from "../metadata";

/**
 * デフォルトルール: 現行動作との互換性を保つ
 */
export const DEFAULT_RULES: MetadataInjectionRule[] = [
	{
		id: "default-completed",
		name: "Record completion datetime",
		enabled: true,
		trigger: {
			toStatus: "x",
			metadata: [{ key: "completionDatetime", operator: "not_exists" }],
		},
		actions: [{ type: "set", key: "completionDatetime", value: "{{datetime}}" }],
	},
	{
		id: "default-clear-completion",
		name: "Clear completion datetime when reopened",
		enabled: true,
		trigger: {
			fromStatus: "x",
			metadata: [{ key: "completionDatetime", operator: "exists" }],
		},
		actions: [{ type: "delete", key: "completionDatetime" }],
	},
];

/**
 * デフォルトルールのコピーを取得
 */
export function getDefaultRules(): MetadataInjectionRule[] {
	return DEFAULT_RULES.map((rule) => ({
		...rule,
		trigger: {
			...rule.trigger,
			fromStatus: Array.isArray(rule.trigger.fromStatus)
				? [...rule.trigger.fromStatus]
				: rule.trigger.fromStatus,
			toStatus: Array.isArray(rule.trigger.toStatus)
				? [...rule.trigger.toStatus]
				: rule.trigger.toStatus,
			metadata: rule.trigger.metadata?.map((condition) => ({ ...condition })),
		},
		actions: rule.actions.map((action) => ({ ...action })),
	}));
}
