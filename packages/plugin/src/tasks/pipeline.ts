import type { TaskChange } from "./diff";
import type { TasksPluginCacheUpdatePayload } from "./types";
import type { Plugin } from "obsidian";

export type TaskChangeContext = {
	plugin: Plugin;
	payload: TasksPluginCacheUpdatePayload;
	previousPayload: TasksPluginCacheUpdatePayload | null;
};

export type TaskChangeHandler = (
	changes: TaskChange[],
	context: TaskChangeContext
) => void | Promise<void>;

export class TaskChangePipeline {
	private handlers: TaskChangeHandler[] = [];

	register(handler: TaskChangeHandler): void {
		this.handlers.push(handler);
	}

	async dispatch(changes: TaskChange[], context: TaskChangeContext): Promise<void> {
		for (const handler of this.handlers) {
			await handler(changes, context);
		}
	}
}
