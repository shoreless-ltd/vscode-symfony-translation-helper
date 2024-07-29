import { window, DecorationOptions, TextEditorDecorationType } from 'vscode';
import { settings } from './settings';
import { IDecorateEditorOptions } from './types';
import log from './utilities/logger';
import { getDecorationOptions } from './editor/decoration';

let translationDecorationType: TextEditorDecorationType|undefined;

export function decorateEditor({
    editor,
    translations
}: IDecorateEditorOptions) {
    const sourceCode = editor.document.getText();
    const keyRegex: RegExp = new RegExp(`["'](${settings().keyPattern})["']`, 'g');

    let decorationsArray: DecorationOptions[] = [];
    const lines = sourceCode.split('\n');
    let match: RegExpExecArray|null = null;

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        if (lines[lineNumber]) {
            while (match = keyRegex.exec(lines[lineNumber])) {
                let potentialKey = match[1];
    
                if (!settings().keyLength || potentialKey.length >= settings().keyLength) {
                    log(`🐦 Potential translation key "${potentialKey}".`);
                    try {
                        if (translations?.[potentialKey]) {
                            log(`💡 Found translation(s) for ${potentialKey}.`);
                            const decoration = getDecorationOptions({value: lines[lineNumber], lineNumber: lineNumber}, potentialKey, translations);
                            if (decoration) {
                                decorationsArray.push(decoration);
                            }
                        }
                    }
                    catch (e: any) {
                        console.log(`[ERROR]`, e, translations?.[potentialKey]);
                    }
                }
            };
        }
    }

    if (translationDecorationType) {
        translationDecorationType.dispose();
    }
    translationDecorationType = window.createTextEditorDecorationType({});

    editor.setDecorations(translationDecorationType, decorationsArray);
}
