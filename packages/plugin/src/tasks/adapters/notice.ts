import { Notice } from "obsidian";
import type { TaskChangeHandler } from "../pipeline";
import { formatStatusChange } from "../formatters";

export function createNoticeHandler(): TaskChangeHandler {
	return (changes) => {
		for (const change of changes) {
			new Notice(formatStatusChange(change));
		}
	};
}
