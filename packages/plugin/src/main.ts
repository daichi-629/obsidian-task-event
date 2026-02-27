import { Plugin } from "obsidian";
import { registerTasksPipeline } from "./tasks";

export default class SampleMonorepoPlugin extends Plugin {
	async onload() {
		registerTasksPipeline(this);
	}
}
