import type { Plugin } from "obsidian";
import type { PluginSettings } from "../settings";
import { createLoggerHandler } from "./adapters/logger";
import { createNoticeHandler } from "./adapters/notice";
import { createRuleBasedInjectorHandler } from "./adapters/rule-based-injector";
import { registerTasksEventPipeline } from "./status-listener";
import { TaskChangePipeline } from "./pipeline";

export function registerTasksPipeline(
	plugin: Plugin,
	getSettings: () => PluginSettings,
): void {
	const pipeline = new TaskChangePipeline();
	pipeline.register(createLoggerHandler());
	// pipeline.register(createNoticeHandler());
	pipeline.register(createRuleBasedInjectorHandler(getSettings));
	registerTasksEventPipeline(plugin, pipeline);
}
