import type { MetadataInjectionRule, RuleAction, TemplateContext } from "../metadata";
import { modifyLineMetadata, renderTemplate } from "../metadata";

/**
 * ルールのアクションを実行して行を変更
 */
export function executeRuleActions(
	line: string,
	rule: MetadataInjectionRule,
	context: TemplateContext,
): string {
	let result = line;

	for (const action of rule.actions) {
		result = executeAction(result, action, context);
	}

	return result;
}

/**
 * 単一アクションを実行
 */
function executeAction(
	line: string,
	action: RuleAction,
	context: TemplateContext,
): string {
	const value = action.value ? renderTemplate(action.value, context) : undefined;

	return modifyLineMetadata(line, action.type, action.key, value);
}

/**
 * 複数ルールのアクションを順番に実行
 */
export function executeAllRuleActions(
	line: string,
	rules: MetadataInjectionRule[],
	context: TemplateContext,
): string {
	let result = line;

	for (const rule of rules) {
		result = executeRuleActions(result, rule, context);
	}

	return result;
}
