import {
    workspace,
    window,
    TextEditor,
    TextDocumentChangeEvent,
    ConfigurationChangeEvent,
    ExtensionContext,
    commands,
    Range,
    Position,
    Selection,
} from 'vscode';
import { extname, basename } from 'path';
import { settings } from './settings';
import log from './utilities/logger';
import { decorateEditor } from './decorateEditor';
import { getTranslations, clearTranslationsCache, isTranslationFile } from './translations';

console.log('🙈 STARTING Symfony Translation Helper');

interface IOpenTransLationFileOptions {
    fileName: string,
    line: number,
    col: number
};

export const activate = async (context: ExtensionContext) => {
    // Initialize translation (files) cache.
    getTranslations();

    // Register `openTranslationFile` command.
    const command = 'symfonyTranslationHelper.openTranslationFile';
    const openTranslationFile = async ({
        fileName = 'fileName',
        line = 1,
        col = 1
    }: IOpenTransLationFileOptions) => {
        const files = await workspace.findFiles('**/' + fileName);
        if (!files) {
            return;
        }
        files.forEach(uri => {
            workspace
                .openTextDocument(uri)
                .then(doc => window.showTextDocument(doc))
                .then(editor => {
                    const range = new Range(new Position(line - 1, col - 1), new Position(line - 1, col - 1));
                    editor.selection = new Selection(range.start, range.end);
                    editor.revealRange(range);
                });
        });
    };
    context.subscriptions.push(commands.registerCommand(command, openTranslationFile));

    // Configuration change handler.
    workspace.onDidChangeConfiguration((e: ConfigurationChangeEvent) => {
        // Reload extension settings.
        settings(true);
        // Clear translation (files) cache.
        clearTranslationsCache();
        // Initialize translation (files) cache.
        getTranslations();
    }, null, context.subscriptions);

    // Change editor handler.
    window.onDidChangeActiveTextEditor((editor: TextEditor|undefined) => {
        log('Event: Editor changed');
        if (editor) {
            showTranslations(editor);
        }
    }, null, context.subscriptions);

    // Change text document handler.
    workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) => {
        log('Event: Text changed');
        const activeEditor = window.activeTextEditor;
        if (activeEditor && event.document === activeEditor.document) {
            showTranslations(activeEditor);
        }
    }, null, context.subscriptions);

    if (window.activeTextEditor) {
        showTranslations(window.activeTextEditor);
    }

    function showTranslations(editor: TextEditor) {
        const filePath = editor.document?.uri?.fsPath;
        if (!filePath) {
            return;
        }

        if (!settings().extensions.includes(extname(filePath).toLowerCase()) || isTranslationFile(filePath)) {
            log(`Ignored: ${basename(filePath)}`);
            return;
        }

        decorateEditor({
            editor,
            translations: getTranslations()
        });
    }
};
