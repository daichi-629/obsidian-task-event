import {
	App,
	Notice,
	PluginSettingTab,
	Setting,
	normalizePath,
	TFolder,
	type TextComponent,
} from "obsidian";
import type TaskEventPlugin from "./main";
import {
	buildDefaultRulesMarkdown,
	findRulesFile,
	refreshRules,
	saveSettings,
} from "./settings";

export class TaskEventSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: TaskEventPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		void this.displayAsync();
	}

	private async displayAsync(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty();
		let rulesFileInput: TextComponent | null = null;

		new Setting(containerEl).setName("Rule source").setHeading();

		new Setting(containerEl)
			.setName("Rules file")
			.setDesc("Path to the rules file")
			.addText((text) => {
				rulesFileInput = text;
				text
					.setPlaceholder("rules/task-event-rules.md")
					.setValue(this.plugin.settings.rulesFilePath);

				text.inputEl.setAttr("spellcheck", "false");
			})
				.addButton((button) => {
					button.setButtonText("Apply").onClick(async () => {
						const nextPath = rulesFileInput?.getValue().trim() ?? "";
						this.plugin.settings.rulesFilePath = nextPath
						? normalizePath(nextPath)
						: "";
						await saveSettings(this.plugin, this.plugin.settings);
						await refreshRules(this.plugin, this.plugin.settings);
						new Notice("Rules settings updated");
						this.display();
					});
				});

		const rulesFile = findRulesFile(
			this.app.vault,
			this.plugin.settings.rulesFilePath,
		);
			if (!rulesFile && this.plugin.settings.rulesFilePath) {
				new Setting(containerEl)
					.setName("Create default rules file")
					.setDesc("Create the rules file")
				.addButton((button) => {
					button.setCta().setButtonText("Create").onClick(async () => {
						await this.createDefaultRulesFile();
						new Notice("Default rules file created");
						this.display();
					});
				});
		}
	}

	private async createDefaultRulesFile(): Promise<void> {
		const filePath = normalizePath(this.plugin.settings.rulesFilePath);
		await this.ensureParentFolders(filePath);
		await this.app.vault.create(filePath, buildDefaultRulesMarkdown());
		await refreshRules(this.plugin, this.plugin.settings);
		await saveSettings(this.plugin, this.plugin.settings);
	}

	private async ensureParentFolders(filePath: string): Promise<void> {
		const segments = filePath.split("/").slice(0, -1);
		let currentPath = "";

		for (const segment of segments) {
			currentPath = currentPath ? `${currentPath}/${segment}` : segment;
			const existing = this.app.vault.getAbstractFileByPath(currentPath);
			if (!existing) {
				await this.app.vault.createFolder(currentPath);
			}
			if (existing && !(existing instanceof TFolder)) {
				throw new Error(`Parent path is not a folder: ${currentPath}`);
			}
		}
	}
}
