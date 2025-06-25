import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, request } from 'obsidian';
import StoryService from 'src/story-service';
import WordLookupService from 'src/word-lookup-service';

interface WordLookupPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: WordLookupPluginSettings = {
	mySetting: 'default'
}

export default class WordLookupPlugin extends Plugin {
	settings: WordLookupPluginSettings;
	lookupService: WordLookupService;
	storyService: StoryService;

	async onload() {
		await this.loadSettings();
		new Notice('server url is:' + process.env.SERVER_URL as string);
		this.lookupService = new WordLookupService();
		this.storyService = new StoryService();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Word Lookup Plugin', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Word look up journey starts!');
			try {
				const story = await this.storyService.generateStory(this.app.vault);
				if (!story) {
					new Notice('No story generated.');
					return;
				}
				const fileName = `Story-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
				const filePath = `English/stories/${fileName}`;
				const exists = await this.app.vault.adapter.exists(filePath);
				new Notice(`file exists: ${exists ? 'yes' : 'no'}`);
				let file: TFile;

				if (!exists) {
					file = await this.app.vault.create(filePath, `# Story \n\n #generated_story \n\n${story}`);
					new Notice(`Created new file: ${filePath}`);
				}

				// Open the file after it's definitely written
				await this.app.workspace.openLinkText(filePath, '', true);

			} catch (error) {
				new Notice(`Error generating story: ${error}`);
			}
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Word Lookup Plugin Active');

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor: Editor, view: MarkdownView) => {
				menu
					.addItem((item) =>
						item
							.setTitle("Mark and look up word within context")
							.setIcon("checkmark")
							.onClick(() => {
								// Execute your existing command for full functionality
								this.lookupService.markAndQuery(editor, view).then((result) => {
									if (result) {
										new Notice(`Successfully marked and looked up!`);
									}
								}).catch((error) => {
									new Notice(`Error during mark and lookup: ${error}`);
								});
							})
					)
			})
		);

		this.addCommand({
			id: 'look-up-word-with-context',
			name: 'Look up word with context',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'z' }],
			editorCallback: (editor: Editor, view: MarkdownView) => {this.lookupService.queryWithContext(editor, view)}
		});

		this.addCommand({
			id: 'mark-and-look-up-word-within-context',
			name: 'Mark and look up word within context',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'a' }],
			editorCallback: (editor: Editor, view: MarkdownView) => {this.lookupService.markAndQuery(editor, view)}
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: WordLookupPlugin;

	constructor(app: App, plugin: WordLookupPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
