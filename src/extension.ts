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
    Uri,
} from 'vscode';
import { extname, basename } from 'path';
import { settings } from './settings';
import log from './utilities/logger';
import { decorateTranslations } from './editor/documentDecorator';
import { getTranslations, clearTranslationsCache, isTranslationFile } from './translations';
import { ISourceMapRange } from './types';

console.log('🙈 STARTING Symfony Translation Helper');

interface IOpenTransLationFileOptions {
    fileName: string,
    range: ISourceMapRange|null
};

export const activate = async (context: ExtensionContext) => {
    // Initialize translation (files) cache.
    getTranslations();

    // Register `openTranslationFile` command.
    const command = 'symfonyTranslationHelper.openTranslationFile';
    const openTranslationFile = async ({
        fileName,
        range: target
    }: IOpenTransLationFileOptions) => {
        const uri = Uri.file(settings().workspaceRoot + (settings().workspaceRoot ? '/' : '') + fileName);
        workspace
            .openTextDocument(uri)
            .then(doc => window.showTextDocument(doc))
            .then(editor => {
                if (target) {
                    const range = new Range(new Position(target.start.line - 1, target.start.col - 1), new Position(target.end.line - 1, target.end.col - 1));
                    editor.selection = new Selection(range.start, range.end);
                    editor.revealRange(range);
                }
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
        if (editor) {
            showTranslations(editor);
        }
    }, null, context.subscriptions);

    // Change text document handler.
    workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) => {
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
            return;
        }

        try {
            decorateTranslations({
                editor,
                translations: getTranslations()
            });
        }
        catch (ex: any) {
            log('Decoration error', 'error', ex);
        }
    }
};
