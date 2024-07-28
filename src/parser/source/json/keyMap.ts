import jsonMap from 'json-source-map';
import { ILocation } from "../../../types";

export default class JSONKeyMap {
    fileName: string;
    keyMap;

    constructor(content: string, fileName: string) {
        this.fileName = fileName;
        this.keyMap = jsonMap.parse(content);
    }

    lookup(path: string|string[]): ILocation|null {
        if (typeof path === 'string' || path instanceof String) {
            path = path
                .replace(/\[([^\[\]]*)\]/g, '.$1.')
                .split('.')
                .filter(t => t !== '');
        }

        path = '/' + path.join('/');
        const keyMapEntry = this.keyMap.pointers?.[path] || null;

        if (!keyMapEntry) {
            return null;
        }

        return {
            key: {
                start: { line: keyMapEntry.key.line, col: keyMapEntry.key.column },
                end: { line: keyMapEntry.keyEnd.line, col: keyMapEntry.keyEnd.column }
            },
            value: {
                start: { line: keyMapEntry.value.line, col: keyMapEntry.value.column },
                end: { line: keyMapEntry.valueEnd.line, col: keyMapEntry.valueEnd.column }
            },
            fileName: this.fileName
        };
    }
}
