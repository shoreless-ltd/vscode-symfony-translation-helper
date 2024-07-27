import { basename, extname } from 'path';
import YAML from 'yaml';
import { globbySync } from '@esm2cjs/globby';
import { FileDataCache } from 'file-data-cache';
const flatten = require('flatten-obj')();
import { settings } from './settings';
import { deepMergeObjects, escapeRegExp } from './utilities/utils';
import { ITranslations } from './types';
import YAMLKeyMap from './yaml/keyMap';
import JSONKeyMap from './json/keyMap';
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
 * Parameter type definitions for `::loadTranslationFile()`.
 *
 * @property {string} filePath
 *   File path.
 * @property {string|undefined} fileContent
 *   The content loaded from the file. For convenience `undefined` is allowed, in case of an
 *   error while loading the file content.
 */
interface ILoadTranslationFileOptions {
    filePath: string,
    fileContent: string|undefined,
    language?: string
};

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
 * Extracts and returns the language code from a translation file name.
 *
 * This function is using the translation file patterns configured in the
 * extension settings to match the `[LANG]` placeholder of the given
 * file name to an actual language code.
 *
 * @param {string} path
 *   Translation file path.
 *
 * @return {string}
 *   Extracted language code, or `'und'` if no language code could be found.
 */
const getFileLanguage = (path: string): string => {
    const baseName = basename(path);
    let language = 'und';

    settings().translationFilePatterns.some(value => {
        const patternParts = value.split('[LANG]');
        const regexPattern = escapeRegExp(patternParts[0]) + '(.*)' + (patternParts.length > 1 ? escapeRegExp(patternParts[1]) : '');
        const languageMatch = baseName.match(new RegExp(regexPattern));
        if (languageMatch) {
            language = languageMatch[1];
            return true;
        }
        return false;
    });

    return language.toLowerCase();
};

/**
 * Returns a workspace root folder relative path for the given file path.
 *
 * Removes any workspace root folder path and leading slash from the beginning of the
 * given path.
 *
 * @param {string} filePath
 *   The file path to transform to a relative path.
 *
 * @return {string}
 *   The relative file path, if the given path is prefixed by the workspace root
 *   folder path, the unchanged file path otherwise.
 */
const getRelativeFilePath = (filePath: string): string => filePath.indexOf(settings().workspaceRoot + '/') === 0 ? filePath.substring(settings().workspaceRoot.length + 1) : filePath;

/**
 * Extracts translation strings from an i18n JSON translation file.
 *
 * @param {ILoadTranslationFileOptions} options
 *   Load translation file options including the translation file language code.
 *
 * @return {ITranslations}
 *   Extracted translations including mapping information.
 */
const loadJsonTranslations = (options: ILoadTranslationFileOptions): ITranslations => {
    const fileName = getRelativeFilePath(options.filePath);
    const language = options.language || 'und';
    const mapped: ITranslations = {};

    const flattenedData: [string, string|number|boolean] = flatten(JSON.parse(options.fileContent || '') || {});
    if (flattenedData) {
        const sourceMap = new JSONKeyMap(options.fileContent || '', fileName);
        for (const [key, value] of Object.entries(flattenedData)) {
            mapped[key] = {
                [language]: {
                    value: value,
                    source: {
                        ...(sourceMap.lookup(key) || {}),
                        fileName: fileName
                    }
                }
            };
        }
    }

    return mapped;
};

/**
 * Extracts translation strings from a YAML translation file.
 *
 * @param {ILoadTranslationFileOptions} options
 *   Load translation file options including the translation file language code.
 *
 * @return {ITranslations}
 *   Extracted translations including mapping information.
 */
const loadYamlTranslations = (options: ILoadTranslationFileOptions): ITranslations => {
    const fileName = getRelativeFilePath(options.filePath);
    const language = options.language || 'und';
    const mapped: ITranslations = {};

    const flattenedData: [string, string|number|boolean] = flatten(YAML.parse(options.fileContent || '') || {});
    if (flattenedData) {
        const sourceMap = new YAMLKeyMap(options.fileContent || '', fileName);
        for (const [key, value] of Object.entries(flattenedData)) {
            mapped[key] = {
                [language]: {
                    value: value,
                    source: {
                        ...(sourceMap.lookup(key) || {}),
                        fileName: fileName
                    }
                }
            };
        }
    }

    return mapped;
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
    const language = options.language || getFileLanguage(filePath);

    log(`💡 Loading translation file "${filePath}".`);
    let result: Object = {};
    try {
        switch (extension) {
            case '.json':
                result = loadJsonTranslations({ ...options, language: language });
                break;

            default:
                result = loadYamlTranslations({ ...options, language: language });
        }
    }
    catch (error: any) {
        log(`💡 Load translation file error for "${filePath}": ${error.toString()}`);
    }

    // log('💡 Load Translation file "' + filePath + '": ' + JSON.stringify(result));
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
