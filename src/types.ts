import { TextEditor } from "vscode";

export const MIN_KEY_SIZE = 6;
export const KEY_PATTERN = `[a-zA-Z0-9._-]{${MIN_KEY_SIZE},}`;

export const hasSeparator = (key: string) => key.indexOf('_') !== -1 || key.indexOf('-') !== -1 || key.indexOf('.') !== -1;

export interface IMappedTranslation {
    value: string|number|boolean,
    source: ILocation
};

export interface IMappedTranslations {
    [language: string]: IMappedTranslation
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
