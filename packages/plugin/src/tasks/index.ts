import type { Plugin } from "obsidian";
import { createLoggerHandler } from "./adapters/logger";
import { createNoticeHandler } from "./adapters/notice";
import { registerTasksEventPipeline } from "./status-listener";
import { TaskChangePipeline } from "./pipeline";

export function registerTasksPipeline(plugin: Plugin): void {
	const pipeline = new TaskChangePipeline();
	pipeline.register(createLoggerHandler());
	pipeline.register(createNoticeHandler());
	registerTasksEventPipeline(plugin, pipeline);
}
