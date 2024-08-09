import { basename, extname } from 'path';
import { globbySync } from '@esm2cjs/globby';
import { FileDataCache } from 'file-data-cache';
import { settings } from './settings';
import { deepMergeObjects, escapeRegExp, subStrCount } from './utilities/utils';
import { DEFAULT_DOMAIN, DEFAULT_LOCALE, ILoadTranslationFileOptions, ITranslations } from './types';
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
    log(`Searching for translation files.`);
    const paths = globbySync(filenames, {
        cwd: workspaceRoot,
        onlyFiles: true,
        expandDirectories: false,
        ignore: ignoredFolders
    });
    log('Found translation files:', 'debug', paths);
    return paths;
};

/**
 * Extracts and returns the domain and language code from a translation file name.
 *
 * This function is using the translation file patterns configured in the
 * extension settings to match the `[DOMAIN]` and `[LOCALE]` placeholders of the
 * given file name to actual values.
 *
 * @param {string} path
 *   Translation file path.
 *
 * @return {Object}
 *   Object with extracted locale, or `DEFAULT_LOCALE` if no language code could be found,
 *   and domain, or `DEFAULT_DOMAIN`, if no domain could be extracted.
 */
const getFileDomainAndLocale = (path: string): {
    domain: string,
    locale: string
} => {
    let domain = DEFAULT_DOMAIN;
    let locale = DEFAULT_LOCALE;

    settings().translationFilePatterns.some(value => {
        // Compare translation file pattern with parent directories, such as `[LOCALE]/translations.json`,
        // to the corresponding folders of the given file path.
        const compare = path.split('/').slice(-1 * (subStrCount('/', value) + 1)).join('/');

        // Replace `[DOMAIN]` and `[LOCALE]` placeholders in translation file pattern with regular expression
        // groups and escape the remaining pattern text.
        const regexPattern = value.replace(/\[DOMAIN\]|\[LOCALE\]/g, ';').split(';').map(patternPart => escapeRegExp(patternPart)).join('(.*)');

        // Match the pattern against the translation file path fragment.
        const match = compare.match(new RegExp(regexPattern));
        if (match) {
            const domPos = value.indexOf('[DOMAIN]');
            const langPos = value.indexOf('[LOCALE]');

            if (langPos !== -1) {
                locale = domPos === -1 ? match[1] : match[domPos < langPos ? 2 : 1];
            }

            if (domPos !== -1) {
                domain = langPos === -1 ? match[1] : match[domPos < langPos ? 1 : 2];
            }
            else if (settings().parsingMode === 'symfony') {
                const baseNameParts = basename(path).split('.');
                if (baseNameParts.length > 1 && baseNameParts[0] && (langPos === -1 || baseNameParts[0] !== locale)) {
                    domain = baseNameParts[0];
                }
            }

            return true;
        }

        return false;
    });

    // Whether the translation file name is using the ICU format indicator.
    if (domain.indexOf('+') !== -1) {
        // Filter ICU hint from the domain.
        domain = domain.substring(0, domain.indexOf('+'));
    }
log('Domain and locale', 'error', path, domain, locale);
    return {
        domain: domain.toLowerCase(),
        locale: locale.toLowerCase()
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
        ...getFileDomainAndLocale(filePath)
    };

    log(`Loading translation file "${filePath}".`);
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
                log(`No suitable translation file parser found for "${extension}" extension of "${filePath}".`, 'error');
        }
    }
    catch (error: any) {
        log(`Load translation file error for "${filePath}":`, 'error', error);
    }

    log(`Load translation file "${filePath}":`, 'debug', result);
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
            log(`Translation file(s) changed.`);
            allTranslations = translationFileCache
                .getValues()
                .reduce((result, keyValues) => deepMergeObjects(result, keyValues), {});
            log(`New translations:`, 'debug', allTranslations);
        }
    }

    return allTranslations || { };
};
