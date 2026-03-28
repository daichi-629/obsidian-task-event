/**
 * タスク行から抽出されるメタデータ
 */
export interface TaskMetadata {
	/** Dataview インラインフィールド [key:: value] */
	fields: Record<string, string>;

	/** Tasks プラグインのメタデータ（読み取り専用、参照用） */
	tasksEmoji: TasksEmojiMetadata;
}

export interface TasksEmojiMetadata {
	due?: string; // 📅
	scheduled?: string; // ⏳
	start?: string; // 🛫
	done?: string; // ✅
	cancelled?: string; // ❌
	recurrence?: string; // 🔁
	priority?: string; // ⏫🔼🔽⏬
}

/**
 * メタデータ注入ルール
 */
export interface MetadataInjectionRule {
	id: string;
	name: string;
	enabled: boolean;
	trigger: RuleTrigger;
	actions: RuleAction[];
}

/**
 * ルールの発火条件
 */
export interface RuleTrigger {
	/** 変更前のステータス（省略可、単一値または配列） */
	fromStatus?: string | string[];
	/** 変更後のステータス（省略可、単一値または配列） */
	toStatus?: string | string[];
	/** メタデータ条件 */
	metadata?: MetadataCondition[];
	/** パスパターン（glob形式） */
	pathPattern?: string;
}

/**
 * メタデータの存在・値をチェックする条件
 */
export interface MetadataCondition {
	key: string;
	operator: MetadataOperator;
	/** operator によっては不要 */
	value?: string;
}

export type MetadataOperator =
	| "exists"
	| "not_exists"
	| "equals"
	| "not_equals"
	| "contains"
	| "matches";

/**
 * ルールのアクション
 */
export interface RuleAction {
	type: RuleActionType;
	key: string;
	/** delete時は不要、テンプレート使用可 */
	value?: string;
}

export type RuleActionType = "set" | "delete" | "append";

/**
 * テンプレート展開に使用するコンテキスト
 */
export interface TemplateContext {
	date: string;
	datetime: string;
	time: string;
	fromStatus: string;
	toStatus: string;
	file: {
		basename: string;
		path: string;
	};
	meta: Record<string, string>;
}
