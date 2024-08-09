import { Range, TextDocument, TextEditor, Uri } from "vscode";

export const MIN_KEY_SIZE = 6;
export const KEY_PATTERN = `[a-zA-Z0-9._-]{${MIN_KEY_SIZE},}`;
export const DEFAULT_DOMAIN = '[undefined]';
export const DEFAULT_LOCALE = 'und';
export const hasSeparator = (key: string) => key.indexOf('_') !== -1 || key.indexOf('-') !== -1 || key.indexOf('.') !== -1;

/**
 * Parameter definition for translation file loaders.
 *
 * @property {string} filePath
 *   File path.
 * @property {string|undefined} fileContent
 *   The content loaded from the file. For convenience `undefined` is allowed, in case of an
 *   error while loading the file content.
 * @property {string} [domain]
 *   The translation domain.
 * @property {string} [locale]
 *   The translation language code.
 */
export interface ILoadTranslationFileOptions {
    filePath: string,
    fileContent: string|undefined,
    domain?: string,
    locale?: string
};

export interface IMappedTranslation {
    value: string|number|boolean,
    source: ILocation
};

export interface IMappedTranslations {
    [domain: string]: {
        [locale: string]: IMappedTranslation
    }
};

export interface ITranslations {
    [key: string]: IMappedTranslations
}

export interface IDecorateEditorOptions {
    editor: TextEditor
    translations: ITranslations
    keyTemplate?: string
}

export interface IEditorLine {
    value: string,
    lineNumber: number
};

export interface ISourceMapPosition {
    line: number,
    col: number
    offset?: number,
}

export interface ISourceMapRange {
    start: ISourceMapPosition,
    end: ISourceMapPosition
}

export interface ISourceMapElement {
    key?: ISourceMapRange,
    value?: ISourceMapRange,
    children?: ISourceMapChildren|null
};

export interface ISourceMapChildren {
    [key: string]: ISourceMapElement
};

export interface ILocation extends ISourceMapElement {
    fileName: string
}

export interface ITranslationKey {
    value: string,
    range: Range,
    file: Uri,
    isCandidate?: boolean,
    domain?: string,
    locale?: string
}

export interface ISourceMapConstructor {
    /**
     * Constructs a new translation file source map.
     *
     * @param {string} content
     *   The translation file content.
     * @param {string} fileName
     *   The translation file path.
     *
     * @return {ISourceMap}
     *   Translation file source map instance.
     */
    new(content: string, fileName: string): ISourceMap
}

/**
 * Interface of translation file source maps.
 */
export interface ISourceMap {
    /**
     * Returns a translation source information element by path.
     *
     * @param {string|string[]} path
     *   Source map path.
     *
     * @return {ILocation|null}
     *   The translation source information element or `null`, if the element doesn't exist.
     */
    lookup(path: string|string[]): ILocation|null
}

export interface IDocumentParserStatic {
    /**
     * Constructs a new document parser instance.
     *
     * @param {TextDocument} document
     *   The VS Code document to parse.
     *
     * @return {IDocumentParser}
     *   Document parser instance.
     */
    new(document: TextDocument): IDocumentParser,

    /**
     * Whether the document parser can be used for the given document.
     *
     * @param {TextDocument} document
     *   VS Code text document.
     *
     * @return {boolean}
     *   `true`, if the parser can parse the given document, `false` otherwise.
     */
    applies(document: TextDocument): boolean
}

/**
 * Interface of document parsers.
 */
export interface IDocumentParser {
    /**
     * Extracts information about (potential) translation keys used in the given document.
     *
     * @return {IDocumentParserTranslations}
     *   Parser translation keys information.
     */
    getTranslationKeys(): IDocumentParserTranslations
}

/**
 * Parser translation keys information.
 *
 * @property {ITranslationKey[]} translations
 *   Found (potential) translation keys information.
 * @property {boolean} hasErrors
 *   `false`, if the translations parsing was successful, `false` otherwise.
 */
export interface IDocumentParserTranslations {
    translations: ITranslationKey[],
    hasErrors: boolean
}