import type { Plugin } from "obsidian";
import type { TasksPluginCacheUpdatePayload } from "./types";
import { diffTasks } from "./diff";
import type { TaskChangePipeline } from "./pipeline";

export function registerTasksEventPipeline(
	plugin: Plugin,
	pipeline: TaskChangePipeline
): void {
	let previousPayload: TasksPluginCacheUpdatePayload | null = null;

	const handler = (payload: TasksPluginCacheUpdatePayload) => {

		const changes = diffTasks(previousPayload, payload);
		void pipeline.dispatch(changes, {
			plugin,
			payload,
			previousPayload
		});

		previousPayload = payload;
	};

	plugin.registerEvent(
		plugin.app.workspace.on(
			"obsidian-tasks-plugin:cache-update",
			handler as (payload: TasksPluginCacheUpdatePayload) => void
		)
	);
}
