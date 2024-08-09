import { window, DecorationOptions, TextEditorDecorationType } from 'vscode';
import { IDecorateEditorOptions, IDocumentParserStatic, ITranslationKey } from '../types';
import { getDecorationOptions } from './decoration';
import { TwigDocumentParser } from '../parser/document/twig';
import log from '../utilities/logger';
import { GenericDocumentParser } from '../parser/document/generic';

/**
 * List of available document parsers.
 */
const parsers: IDocumentParserStatic[] = [
    TwigDocumentParser,
    GenericDocumentParser
];

/**
 * Translation decoration type.
 */
let translationDecorationType: TextEditorDecorationType|undefined;

/**
 * 
 * @param {IDecorateEditorOptions}
 */
export const decorateTranslations = ({
    editor,
    translations
}: IDecorateEditorOptions) => {
    let translationKeys: ITranslationKey[] = [];

    const isParsed = parsers.some(parser => {
        if (parser.applies(editor.document)) {
            const parserInstance = new parser(editor.document);
            const { translations, hasErrors } = parserInstance.getTranslationKeys();

            if (!hasErrors) {
                translationKeys = translationKeys.concat(translations);
                return true;
            }
        }
        return false;
    });

    let decorationsArray: DecorationOptions[] = [];

    if (isParsed && translationKeys.length) {
        translationKeys.forEach(translationKey => {
            // Whether it's definitely a translation key, or at least one translation
            // exists for this key.
            if (!translationKey.isCandidate || translations?.[translationKey.value]) {
                log(`Found translation key "${translationKey.value}" at ${translationKey.range.start.line + 1}:${translationKey.range.start.character + 1}.`, 'debug', translationKey);
                const decoration = getDecorationOptions({ ...translationKey, isCandidate: false }, translations);
                if (decoration) {
                    decorationsArray.push(decoration);
                }
            }
        });
    }

    if (translationDecorationType) {
        translationDecorationType.dispose();
    }
    translationDecorationType = window.createTextEditorDecorationType({});

    editor.setDecorations(translationDecorationType, decorationsArray);
};
