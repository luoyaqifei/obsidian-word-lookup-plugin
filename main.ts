import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, request } from 'obsidian';

// Remember to rename these classes and interfaces!

interface WordLookupPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: WordLookupPluginSettings = {
	mySetting: 'default'
}

export default class WordLookupPlugin extends Plugin {
	settings: WordLookupPluginSettings;

	async query(queryText: string): Promise<string> {
		if (!queryText) {
			new Notice('No word selected!');
			return '';
		}
		return new Promise((resolve, reject) => {
			new Notice(`Looking up: ${queryText}`);
			request({
				url: `http://127.0.0.1:5000/api/vocab`,
				body: JSON.stringify({ input_text: queryText }),
				method: 'POST',
				contentType: 'application/json',
			}).then((response) => {
				new Notice(`Response: ${response}`);
				resolve(response);
			})
				.catch((error) => {
					new Notice(`Error: ${error}`);
					reject(error);
				});
		});

	}

	async queryWithContext(editor: Editor, view: MarkdownView) {
		const selectedText = editor.getSelection()?.trim();
		let queryText = selectedText;
		if (selectedText == '') {
			return new Notice('No word selected!');
		}

		if (selectedText.length < 30) {
			const selectionStart = editor.getCursor('from').line;
			const selectionEnd = editor.getCursor('to').line;
			let lines = '';
			if (selectionStart !== selectionEnd) {
				lines = editor.getLine(selectionStart) + editor.getLine(selectionEnd);
			}
			else {
				lines = editor.getLine(selectionStart);
			}
			if (!(lines.contains("[[") && lines.contains("]]"))) {
				if (!(selectedText.contains("[[") && selectedText.contains("]]"))) {
					editor.replaceSelection(`[[${selectedText}]]`);
				}
				queryText = lines;
			}
		}
		this.query(queryText);
		return queryText;
	}
	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Word Lookup Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Word look up journey starts!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Word Lookup Plugin Active');

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor: Editor, view: MarkdownView) => {
				menu.addItem((item) =>
					item
						.setTitle("Look up word with context") // Corrected typo and to match command name
						.setIcon("pencil") // Use any icon you like
						.onClick(() => {
							// Execute your existing command for full functionality
							this.queryWithContext(editor, view).then((result) => {
								if (result) {
									new Notice(`Lookup result: ${result}`);
								}
							}).catch((error) => {
								new Notice(`Error during lookup: ${error}`);
							});
						})
				);
			})
		);
		this.addCommand({
			id: 'look-up-word-with-context',
			name: 'Look up word with context',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'z' }],
			editorCallback: this.queryWithContext.bind(this)
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
