import { Vault, TFile, Notice, request } from 'obsidian';
export default class StoryService {
    getFiles(vault: Vault): string[] {
        const files: string[] = [];
        vault.getFolderByPath('English/Vocabulary')?.children.forEach((file) => {
            if (file instanceof TFile && file.extension === 'md') {
                files.push(file.path);
            }
        }
        );
        return files;
    }

    pickRandomFileNames(files: string[], count: number): string {
        if (files.length === 0) {
            return '';
        }
        let selectedFiles: string[] = [];
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * files.length);
            selectedFiles.push(files[randomIndex]);
            files.splice(randomIndex, 1); // Remove the selected file to avoid duplicates
        }
        return selectedFiles.join(', ');
    }

    processFileNames(files: string[]): string[] {
        return files.map(file => file.replace(/\.md$/, ''));
    }

    async generateStory(vault: Vault): Promise<string> {
        const files = this.getFiles(vault);
        const count = 10;
        const words = this.pickRandomFileNames(this.processFileNames(files), count);
        if (words.length === 0) {
            new Notice('No vocabulary files found in the specified folder!');
            return '';
        }
        return new Promise((resolve, reject) => {
            new Notice(`Starting story generation`);
            const SERVER_URL = process.env.SERVER_URL;
            request({
                url: `${SERVER_URL}/api/story`,
                body: JSON.stringify({ words: words }),
                method: 'POST',
                contentType: 'application/json',
            }).then((response) => {
                new Notice(`Received response for the selected words: ${words}`);
                resolve(response);
            }).catch((error) => {
                new Notice(`Error: ${error}`);
                reject(error);
            });
        });
    }
}