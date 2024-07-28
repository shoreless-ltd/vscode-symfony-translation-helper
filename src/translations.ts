import { basename, extname } from 'path';
import { globbySync } from '@esm2cjs/globby';
import { FileDataCache } from 'file-data-cache';
import { settings } from './settings';
import { deepMergeObjects, escapeRegExp } from './utilities/utils';
import { DEFAULT_DOMAIN, DEFAULT_LANGUAGE, ILoadTranslationFileOptions, ITranslations } from './types';
import { loadTranslations as loadJsonTranslations } from './parser/source/json/parser';
import { loadTranslations as loadYamlTranslations } from './parser/source/yaml/parser';
import log from './utilities/logger';

/**
 * Interval to check for new translation files.
 *
 * @var {number}
 */
const SEARCH_TRANSLATIONS_FILES_INTERVAL: number = 60000;

/**
 * Interval to check, whether cached translation files are outdated. (Using last modification date.)
 *
 * @var {number}
 */
const CACHE_INTERVAL: number = 5000;

/**
 * Translations cache.
 *
 * @var {ITranslations|null}
 */
let allTranslations: ITranslations|null = null;

/**
 * Timestamp of the last search for translation files.
 *
 * @var {number}
 */
let lastTranslationFilesSearch = 0;

/**
 * Translation files data cache.
 *
 * @var {FileDataCache}
 */
const translationFileCache = new FileDataCache({
    loadFileData: (filePath, fileContent) => loadTranslationFile({
        filePath,
        fileContent,
    }),
    checkInterval: CACHE_INTERVAL,
    readFile: true
});

/**
 * Whether the translation files cache is empty.
 *
 * @return {boolean}
 *   `true`, if the translation files cache is empty, `false` otherwise.
 */
const isTranslationFileCacheEmpty = (): boolean => translationFileCache.getEntries().length === 0;

/**
 * Whether a file in the translation files cache changed.
 *
 * @return {boolean}
 *   `true`, if a file in the translation file cache changed, `false` otherwise.
 */
const hasTranslationFileCacheChanged = (): boolean => isTranslationFileCacheEmpty() ? false : translationFileCache.getEntries().some(({ lastCheck }) => lastCheck?.wasChanged);

/**
 * Search options interface for `searchTranslationFiles()`.
 *
 * @property {string} workspaceRoot
 *   Workspace root path.
 * @property {array} filenames
 *   Array of file name patterns to search for.
 * @property {array} ignoredFolders
 *   Array of ignore patterns.
 */
interface ISearchTranslationFilesOptions {
    workspaceRoot: string,
    filenames: string[],
    ignoredFolders: string[],
};

/**
 * Locates translation files within the current workspace.
 *
 * @param {ISearchTranslationFilesOptions}
 *   The search options.
 * 
 * @return {array}
 *   Array of file paths relative to the workspace that are matching the given options.
 *
 * @todo Use `workspace.findFiles()` instead of globby.
 */
const searchTranslationFiles = ({
    workspaceRoot,
    filenames,
    ignoredFolders,
}: ISearchTranslationFilesOptions): string[] => {
    log(`👨🏻‍💻 Searching for translation files.`);
    const paths = globbySync(filenames, {
        cwd: workspaceRoot,
        onlyFiles: true,
        expandDirectories: false,
        ignore: ignoredFolders
    });
    log('💡 Found: ' + JSON.stringify(paths));
    return paths;
};

/**
 * Extracts and returns the domain and language code from a translation file name.
 *
 * This function is using the translation file patterns configured in the
 * extension settings to match the `[DOMAIN]` and `[LANGCODE]` placeholders of the
 * given file name to actual values.
 *
 * @param {string} path
 *   Translation file path.
 *
 * @return {Object}
 *   Extracted language code, or `'und'` if no language code could be found.
 */
const getFileDomainAndLanguage = (path: string): {
    domain: string,
    language: string
} => {
    const baseName = basename(path);
    let domain = DEFAULT_DOMAIN;
    let language = DEFAULT_LANGUAGE;

    settings().translationFilePatterns.some(value => {
        const patternParts = value.replace(/\[DOMAIN\]|\[LANGCODE\]/g, ';').split(';');
        const regexPattern = patternParts.map(patternPart => escapeRegExp(patternPart)).join('(.*)');
        const match = baseName.match(new RegExp(regexPattern));
        if (match) {
            const domPos = value.indexOf('[DOMAIN]');
            const langPos = value.indexOf('[LANGCODE]');
            if (langPos !== -1) {
                language = domPos === -1 ? match[1] : match[domPos < langPos ? 2 : 1];
            }
            if (domPos !== -1) {
                domain = langPos === -1 ? match[1] : match[domPos < langPos ? 1 : 2];
            }
            else {
                const baseNameParts = baseName.split('.');
                if (baseNameParts.length > 2 && baseNameParts[0] && (langPos === -1 || baseNameParts[0] !== language)) {
                    domain = baseNameParts[0];
                }
            }
            return true;
        }
        return false;
    });

    // Whether the translation file is using the ICU format.
    if (domain.indexOf('+') !== -1) {
        // Filter ICU hint from the domain.
        domain = domain.substring(0, domain.indexOf('+'));
    }

    return {
        domain: domain.toLowerCase(),
        language: language.toLowerCase()
    };
};

/**
 * Extracts translation strings from translation files.
 *
 * Supports JSON i18n files or YAML translation files.
 *
 * @param {ILoadTranslationFileOptions} options
 *   Load translation file options.
 *
 * @return {ITranslations}
 *   Extracted translations including mapping information.
 */
const loadTranslationFile = (options: ILoadTranslationFileOptions): Object => {
    const { filePath } = options;
    const extension = extname(filePath).toLowerCase();
    const parserOptions: ILoadTranslationFileOptions = {
        ...options,
        ...getFileDomainAndLanguage(filePath)
    };

    log(`💡 Loading translation file "${filePath}".`);
    let result: Object = {};
    try {
        switch (extension) {
            case '.json':
                result = loadJsonTranslations(parserOptions);
                break;

            case '.yaml':
            case '.yml':
                result = loadYamlTranslations(parserOptions);
                break;

            default:
                log(`💡 No suitable translation file parser found for "${extension}" extension of "${filePath}".`);
        }
    }
    catch (error: any) {
        log(`💡 Load translation file error for "${filePath}": ${error.toString()}`);
    }

    // log('💡 Load translation file "' + filePath + '": ' + JSON.stringify(result));
    return result;
};

/**
 * Checks, whether a file exists in the translation files cache.
 * 
 * @param {string} filePath
 *   Path of a file to check.
 *
 * @return {boolean} 
 *   `true`, if the file exists in the translation files cache, `false` otherwise.
 */
export const isTranslationFile = (filePath: string): boolean => typeof translationFileCache.map.get(filePath) !== 'undefined';

/**
 * Clears all files from the translation files cache.
 */
export const clearTranslationsCache = () => {
    translationFileCache.map.clear();
    lastTranslationFilesSearch = 0;
    allTranslations = null;
};

/**
 * Refreshes translation file cache data.
 */
export const updateTranslationFilesCache = (forceTranslationFilesSearch: boolean = false) => {
    const now = Date.now();
    let translationFilePaths = translationFileCache.getPaths().map(path => path.substring(settings().workspaceRoot.length ? settings().workspaceRoot.length + 1 : 0));

    if (forceTranslationFilesSearch || allTranslations === null || now - lastTranslationFilesSearch >= SEARCH_TRANSLATIONS_FILES_INTERVAL) {
        // Recheck for new i18ns files
        translationFilePaths = searchTranslationFiles({
            workspaceRoot: settings().workspaceRoot,
            filenames: settings().translationsFilenames,
            ignoredFolders: settings().ignoredFolders,
        });
        lastTranslationFilesSearch = now;
        translationFileCache.getEntries().forEach(({ path }) => {
            if (!translationFilePaths.includes(path.substring(settings().workspaceRoot.length ? settings().workspaceRoot.length + 1 : 0))) {
                translationFileCache.map.delete(path);
            };
        });
    }
    translationFilePaths.forEach((filePath) => translationFileCache.loadData(settings().workspaceRoot + (settings().workspaceRoot.length ? '/' : '') + filePath));
};

/**
 * Returns all translations found in all translation files.
 *
 * @return {ITranslations}
 *   Nested object with all found translation strings, its values and meta information.
 */
export const getTranslations = (): ITranslations => {
    updateTranslationFilesCache();

    if (isTranslationFileCacheEmpty()) {
        allTranslations = {};
    }
    else {
        if (hasTranslationFileCacheChanged()) {
            allTranslations = translationFileCache
                .getValues()
                .reduce((result, keyValues) => deepMergeObjects(result, keyValues), {});
            log(`Translation file(s) changed. Translations: ${JSON.stringify(allTranslations)}`);
        }
    }

    return allTranslations || { };
};
