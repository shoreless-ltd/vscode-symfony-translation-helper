import { DEFAULT_DOMAIN, DEFAULT_LOCALE, ILoadTranslationFileOptions, ITranslations } from "../../../types";
import { getRelativeFilePath } from "../../../utilities/workspace";
import JSONSourceMap from "./sourceMp";
const flatten = require('flatten-obj')();

/**
 * Extracts translation strings from an i18n JSON translation file.
 *
 * @param {ILoadTranslationFileOptions} options
 *   Load translation file options including the translation file language code.
 *
 * @return {ITranslations}
 *   Extracted translations including mapping information.
 */
export const loadTranslations = (options: ILoadTranslationFileOptions): ITranslations => {
    const fileName = getRelativeFilePath(options.filePath);
    const domain = options.domain || DEFAULT_DOMAIN;
    const locale = options.locale || DEFAULT_LOCALE;
    const mapped: ITranslations = {};

    const flattenedData: [string, string|number|boolean] = flatten(JSON.parse(options.fileContent || '') || {});
    if (flattenedData) {
        const sourceMap = new JSONSourceMap(options.fileContent || '', fileName);
        for (const [key, value] of Object.entries(flattenedData)) {
            mapped[key] = {
                [domain]: {
                    [locale]: {
                        value: value,
                        source: {
                            ...(sourceMap.lookup(key) || {}),
                            fileName: fileName
                        }
                    }
                }
            };
        }
    }

    return mapped;
};
