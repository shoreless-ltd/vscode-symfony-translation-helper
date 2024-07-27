import { TextEditor } from "vscode";

export const MIN_KEY_SIZE = 6;
export const KEY_PATTERN = `[a-zA-Z0-9._-]{${MIN_KEY_SIZE},}`;

export const hasSeparator = (key: string) => key.indexOf('_') !== -1 || key.indexOf('-') !== -1 || key.indexOf('.') !== -1;

export interface IMappedTranslation {
    value: string|number|boolean,
    fileName: string,
    line: number,
    col: number
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

export interface IKeyMapBase {
    children: IKeyMapChildren|null
};

export interface IKeyMapElement extends IKeyMapBase {
    line?: number,
    col?: number
};

export interface IKeyMapChildren {
    [key: string]: IKeyMapElement
};

export interface ILocation {
    line: number,
    col: number,
    fileName: string
}