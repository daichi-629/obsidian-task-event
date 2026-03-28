import Mustache from "mustache";
import type { TemplateContext } from "./types";

// moment はObsidianが提供するグローバル変数
declare const moment: typeof import("moment");

/**
 * テンプレート文字列を展開する
 * 展開後の値に改行が含まれる場合はスペースに置換
 */
export function renderTemplate(
	template: string,
	context: TemplateContext,
): string {
	const result = Mustache.render(template, context);
	return sanitizeResult(result);
}

/**
 * テンプレートコンテキストを生成
 */
export function buildTemplateContext(params: {
	fromStatus: string;
	toStatus: string;
	filePath: string;
	existingFields: Record<string, string>;
}): TemplateContext {
	const now = moment();

	return {
		date: now.format("YYYY-MM-DD"),
		datetime: now.format("YYYY-MM-DDTHH:mm"),
		time: now.format("HH:mm"),
		fromStatus: params.fromStatus,
		toStatus: params.toStatus,
		file: {
			basename: extractBasename(params.filePath),
			path: params.filePath,
		},
		meta: params.existingFields,
	};
}

/**
 * ファイルパスからベース名（拡張子なし）を抽出
 */
function extractBasename(filePath: string): string {
	const filename = filePath.split("/").pop() ?? filePath;
	const dotIndex = filename.lastIndexOf(".");
	return dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
}

/**
 * 展開結果から改行を除去
 */
function sanitizeResult(value: string): string {
	if (value.includes("\n") || value.includes("\r")) {
		console.warn("[template] Newline in rendered value replaced with space");
		return value.replace(/[\r\n]+/g, " ").trim();
	}
	return value;
}
