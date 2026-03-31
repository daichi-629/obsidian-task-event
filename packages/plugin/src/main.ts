import { normalizePath, Plugin, TFile } from "obsidian";
import { loadSettings, refreshRules, saveSettings, type PluginSettings } from "./settings";
import { TaskEventSettingTab } from "./settings-tab";
import { registerTasksPipeline } from "./tasks";

export default class TaskEventPlugin extends Plugin {
	settings!: PluginSettings;

	async onload() {
		console.debug("Loading TaskEventPlugin...");
		this.settings = await loadSettings(this);
		this.addSettingTab(new TaskEventSettingTab(this.app, this));
		this.registerRuleFileWatchers();
		this.app.workspace.onLayoutReady(() => {
			void refreshRules(this, this.settings);
		});
		registerTasksPipeline(this, () => this.settings);
	}

	private registerRuleFileWatchers(): void {
		this.registerEvent(
			this.app.vault.on("modify", async (file) => {
				await this.reloadRulesIfTarget(file);
			})
		);
		this.registerEvent(
			this.app.vault.on("rename", async (file, oldPath) => {
				if (normalizePath(oldPath) === this.settings.rulesFilePath) {
					this.settings.rulesFilePath = file.path;
					await saveSettings(this, this.settings);
				}
				await this.reloadRulesIfTarget(file);
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", async (file) => {
				await this.reloadRulesIfTarget(file);
			})
		);
	}

	private async reloadRulesIfTarget(file: TFile): Promise<void> {
		if (normalizePath(file.path) !== this.settings.rulesFilePath) {
			return;
		}

		await refreshRules(this, this.settings);
	}
}
