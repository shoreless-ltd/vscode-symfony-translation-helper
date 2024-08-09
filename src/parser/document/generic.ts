import { Position, Range, TextDocument } from 'vscode';
import { IDocumentParser, IDocumentParserStatic, IDocumentParserTranslations, ITranslationKey } from '../../types';
import { settings } from '../../settings';
import log from '../../utilities/logger';

/**
 * Generic document parser.
 *
 * Uses a regular expression to parse each line of a document for potential
 * translation key strings. This heuristic is quite unreliable and returns
 * a lot of false positives. Therefore, results are marked as
 * `isCandidate = true` and should be compared to existing translation keys
 * before use.
 */
export const GenericDocumentParser: IDocumentParserStatic = class GenericDocumentParser implements IDocumentParser {
    #document: TextDocument;

    /**
     * {@inheritdoc}
     */
    static applies(document: TextDocument): boolean {
        return true;
    };

    /**
     * {@inheritdoc}
     */
    constructor(document: TextDocument) {
        this.#document = document;
    }

    /**
     * {@inheritdoc}
     */
    getTranslationKeys(): IDocumentParserTranslations {
        let translationKeys: ITranslationKey[] = [];
        let hasErrors = false;

        const file = this.#document.uri;
        const lines = this.#document.getText().split('\n');
        const keyRegex: RegExp = new RegExp(`(["'])(${settings().keyPattern})?(?<!\\\\)(\\\\\\\\)*\\1`, 'g');
        let match: RegExpExecArray|null = null;

        try {
            for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
                if (lines[lineNumber]) {
                    while (match = keyRegex.exec(lines[lineNumber])) {
                        if (match.length > 2 && match[2]) {
                            let potentialKey = match[2];
                            let start = match.index;
                            if (!settings().keyLength || potentialKey.length >= settings().keyLength) {
                                translationKeys.push({
                                    value: potentialKey,
                                    file: file,
                                    // The generic parser is fuzzy. Its found keys may be false positives.
                                    isCandidate: true,
                                    range: new Range(
                                        new Position(lineNumber, start),
                                        new Position(lineNumber, start + potentialKey.length + 2),
                                    )
                                });
                            }
                        }
                    };
                }
            }
        }
        catch (error: any) {
            log(`Error while parsing document "${file}".`, 'error', error);
            hasErrors = true;
        }

        return {
            translations: translationKeys,
            hasErrors: hasErrors
        };
    }
};
