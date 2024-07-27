import YAML from 'yaml';
import { IKeyMapBase, IKeyMapChildren, IKeyMapElement, ILocation } from '../types';

export default class YAMLKeyMap {
    fileName: string;
    keyMap: IKeyMapBase;

    constructor(content: string, fileName: string) {
        const lineCounter = new YAML.LineCounter();
        const document = YAML.parseDocument(content, { keepSourceTokens: true, lineCounter: lineCounter });

        this.fileName = fileName;
        this.keyMap = {
            children: this.index(document, lineCounter)
        };
    }

    index(node: any, lineCounter: YAML.LineCounter): IKeyMapChildren|null {
        if (node === null) {
            return null;
        }

        if (YAML.isDocument(node)) {
            return this.index(node.contents, lineCounter);
        }
        else if (YAML.isSeq(node)) {
            const sequence: IKeyMapChildren = {};
            if (node.items instanceof Array) {
                const children: any[] = node.items;
                for (let i = 0; i < children.length; ++i) {
                    sequence[i.toString()] = {
                        ...lineCounter.linePos(children[i]?.srcToken?.key?.offset || 0),
                        children: this.index(children[i], lineCounter)
                    };
                }
            }
            return sequence;
        }
        else if (YAML.isMap(node)) {
            return node.items.reduce((acc: IKeyMapChildren, pair: YAML.Pair) => {
                return {
                    ...acc,
                    ...this.index(pair, lineCounter)
                };
            }, {});
        }
        else if (YAML.isPair(node)) {
            return node.key ? {
                [node.key.toString()] : {
                    ...lineCounter.linePos(node.srcToken?.key?.offset || 0),
                    children: this.index(node.value, lineCounter)
                }
            } : null;
        }

        return null;
    }

    lookup(path: string|string[]): ILocation|null {
        if (typeof path === 'string' || path instanceof String) {
            path = path
                .replace(/\[([^\[\]]*)\]/g, '.$1.')
                .split('.')
                .filter(t => t !== '');
        }

        const keyMapEntry: IKeyMapElement|null = path.reduce((xs: IKeyMapBase|null, x: string): IKeyMapElement|null => xs?.children?.[x] ?? null, this.keyMap);

        if (!keyMapEntry) {
            return null;
        }

        return {
            fileName: this.fileName,
            line: keyMapEntry.line || 1,
            col: keyMapEntry.col || 1,
        };
    }
}
