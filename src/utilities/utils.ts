import { Position, Range } from "vscode";

/**
 * Escapes a potentially unsafe string for use in HTML markup.
 *
 * @param {string} unsafe
 *   The unsafe string to escape.
 *
 * @return
 *   HTML escaped version of the given string.
 */
export const escapeHtml = (unsafe: string): string => {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Escapes a string for being used in regular expressions.
 *
 * @param {string} str
 *   The string to be escaped.
 *
 * @return
 *   Escaped string that can be used in regular expressions.
 */
export const escapeRegExp = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
* Splits the given setting string into an array of setting values.
*
* @param {string} stringSettings
*   Settings string.
*
* @return {array}
*   Array of setting values.
*/
export const settingToArray = (stringSettings: string = ''): Array<string> =>
   stringSettings
       .replace(/,/g, ';')
       .split(';')
       .filter((ext) => ext.length);

/**
 * Returns a random color string.
 *
 * @return {string}
 *   A random color string.
 */
export const getRandomColor = (): string => {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

/**
 * Merges the properties of an object recursively into another object.
 *
 * @param {object} targetObject
 *   Target object.
 * @param {object} sourceObject
 *   Source object.
 *
 * @return
 *   The target object with merged properties from the source object.
 */
export const deepMergeObjects = (targetObject: any, sourceObject: any) => {
    for (let key in sourceObject) {
        if (sourceObject.hasOwnProperty(key)) {
            if (sourceObject[key] instanceof Object && targetObject[key] instanceof Object) {
                targetObject[key] = deepMergeObjects(targetObject[key], sourceObject[key]);
            }
            else {
                targetObject[key] = sourceObject[key];
            }
        }
    }
    return targetObject;
};

export const subStrCount = (needle: string, haystack: string): number => haystack.split(needle).length - 1;

export const trimmedRange = (startPos: Position, text: string) => {
    let line = startPos.line;
    let column = startPos.character;

    const trimmed = text.trim();
    const tStart = text.indexOf(trimmed);
    const tEnd = tStart + trimmed.length;

    for (let i = 0; i < tEnd; i++) {
        if (i === tStart) {
            startPos = new Position(line, column);
        }
        if (text.charAt(i) === '\n') {
            line++;
            column = 0;
        }
        else {
            column++;
        }
    }

    return new Range(startPos, new Position(line, column));
};