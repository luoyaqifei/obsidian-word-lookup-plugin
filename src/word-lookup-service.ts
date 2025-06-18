import { Notice, Editor, MarkdownView, request } from "obsidian";

export default class WordLookupService {
    async query(queryText: string): Promise<string> {
        if (!queryText) {
            new Notice('No word selected!');
            return '';
        }
        return new Promise((resolve, reject) => {
            new Notice(`Looking up the selected word(s)`);
            const SERVER_URL = process.env.SERVER_URL;
            request({
                url: `${SERVER_URL}/api/vocab`,
                body: JSON.stringify({ input_text: queryText }),
                method: 'POST',
                contentType: 'application/json',
            }).then((response) => {
                new Notice(`Received response for the selected word(s)`);
                resolve(response);
            }).catch((error) => {
                new Notice(`Error: ${error}`);
                reject(error);
            });
        });
    }

    async queryWithContext(editor: Editor, view: MarkdownView) {
        const selectedText = editor.getSelection();
        let queryText = selectedText;
        if (selectedText.trim() == '') {
            return new Notice('No word selected!');
        }

        this.query(queryText);
        return queryText;
    }

    async markAndQuery(editor: Editor, view: MarkdownView) {
        const selectedText = editor.getSelection();
        let queryText = selectedText;
        if (selectedText.trim() == '') {
            return new Notice('No word selected!');
        }
        const selectionStart = editor.getCursor('from').line;
        const selectionEnd = editor.getCursor('to').line;
        let lines = '';
        if (selectionStart !== selectionEnd) {
            lines = editor.getLine(selectionStart) + editor.getLine(selectionEnd);
        }
        else {
            lines = editor.getLine(selectionStart);
        }
        if (!(selectedText.contains("[[") && selectedText.contains("]]"))) {
            let bracketedText = `[[${selectedText.trim()}]]`;
            if (selectedText[0] == ' ' || selectedText[selectedText.length - 1] == ' ') {
                bracketedText = ` ${bracketedText} `;
            }
            editor.replaceSelection(bracketedText);
            lines = lines.replace(selectedText, bracketedText);
        }
        queryText = lines;
        await this.query(queryText);
        return queryText;
    }

}