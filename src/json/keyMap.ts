import jsonMap from 'json-source-map';
import { ILocation } from "../types";

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
            fileName: this.fileName,
            line: keyMapEntry.key.line + 1,
            col: keyMapEntry.key.column + 1,
        };
    }
}
