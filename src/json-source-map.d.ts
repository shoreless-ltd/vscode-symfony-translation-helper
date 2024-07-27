declare module 'json-source-map' {
    interface IPosition {
        line: number,
        column: number,
        pos: number
    }

    interface IPointers {
        [pointer: string]: {
            key: IPosition,
            keyEnd: IPosition,
            value: IPosition,
            valueEnd: IPosition
        }
    }

    export function parse(source: string, _?: any, options?: Object): {
        data: any,
        pointers: IPointers
    };

    export function stringify(data: any, _?: any, space?: string|number|Object): {
        json: string
        pointers: IPointers
    };
}
