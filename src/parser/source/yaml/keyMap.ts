import YAML from 'yaml';
import { ISourceMapChildren, ISourceMapElement, ILocation } from '../../../types';

export default class YAMLKeyMap {
    fileName: string;
    keyMap: ISourceMapElement;

    constructor(content: string, fileName: string) {
        const lineCounter = new YAML.LineCounter();
        const document = YAML.parseDocument(content, { keepSourceTokens: true, lineCounter: lineCounter });

        this.fileName = fileName;
        this.keyMap = {
            children: this.index(document, lineCounter)
        };
    }

    index(node: any, lineCounter: YAML.LineCounter): ISourceMapChildren|null {
        if (node === null) {
            return null;
        }

        if (YAML.isDocument(node)) {
            return this.index(node.contents, lineCounter);
        }
        else if (YAML.isSeq(node)) {
            // @todo Explore a scenario for arrays/sequences in translation files.
            const sequence: ISourceMapChildren = {};
            if (node.items instanceof Array) {
                const children: any[] = node.items;
                for (let i = 0; i < children.length; ++i) {
                    sequence[i.toString()] = {
                        children: this.index(children[i], lineCounter)
                    };
                }
            }
            return sequence;
        }
        else if (YAML.isMap(node)) {
            return node.items.reduce((children: ISourceMapChildren, pair: YAML.Pair) => {
                return {
                    ...children,
                    ...this.index(pair, lineCounter)
                };
            }, {});
        }
        else if (YAML.isPair(node)) {
            let pair: any = node;
            return {
                [pair.key.toString()] : {
                    key: {
                        start: {
                            offset: pair.key.range[0] || 0,
                            ...lineCounter.linePos(pair.key.range[0] || 0)
                        },
                        end: {
                            offset: pair.key.range[1] || 0,
                            ...lineCounter.linePos(pair.key.range[1] || 0)
                        }
                    },
                    value: pair.value ? {
                        start: {
                            offset: pair.value.range[0] || 0,
                            ...lineCounter.linePos(pair.value.range[0] || 0)
                        },
                        end: {
                            offset: pair.value.range[1] || 0,
                            ...lineCounter.linePos(pair.value.range[1] || 0)
                        }
                    } : undefined,
                    children: YAML.isScalar(pair.value) ? null : this.index(node.value, lineCounter)
                }
            };
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

        const keyMapEntry: ISourceMapElement|null = path.reduce((xs: ISourceMapElement|null, x: string): ISourceMapElement|null => xs?.children?.[x] ?? null, this.keyMap);

        if (!keyMapEntry) {
            return null;
        }

        return {
            ...keyMapEntry,
            fileName: this.fileName,
        };
    }
}
