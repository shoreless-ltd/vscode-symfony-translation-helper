import { workspace } from 'vscode';
import { resolve } from 'path';
import { settingToArray } from './utilities/utils';
import { getWorkspaceRootPath } from './utilities/workspace';
import { KEY_PATTERN } from './types';

/**
 * Extension settings type.
 */
export type ExtensionSettings = {
    extensions: string[],
    workspaceRoot: string,
    preview: boolean,
    hover: boolean,
    parsingMode: string,
    domainSupport: boolean,
    keyPattern: string,
    keyLength: number,
    previewLocale: string,
    requiredLanguages: string[],
    translationFilePatterns: string[],
    translationsFilenames: string[],
    translationsFolders: string[],
    ignoredFolders: string[],
    keyTemplate?: string,
    logLevel: string,
    debugToChannel: boolean,
    previewColor: string,
};

/**
 * Extension settings.
 *
 * @var {ExtensionSettings|null}
 */
let extensionSettings: ExtensionSettings | null;

/**
 * Returns the extension settings.
 *
 * @param {boolean} [reload=false]
 *   Whether to reload the extension settings.
 *
 * @return {ExtensionSettings}
 *   The extension settings.
 */
export const settings = (reload: boolean = false): ExtensionSettings => {
    if (!extensionSettings || reload) {
        const workspaceRoot = getWorkspaceRootPath();
        const rawSettings = workspace.getConfiguration('symfonyTranslationHelper');
        const res: ExtensionSettings = {
            workspaceRoot: resolve(workspaceRoot),
            translationFilePatterns: settingToArray(rawSettings.translationFiles.patterns).map(fileName => fileName.replace(/\\/, '/').replace(/\[LANG\]|\[LANGCODE\]/g, '[LOCALE]')),
            translationsFilenames: settingToArray(rawSettings.translationFiles.patterns).flatMap(
                (fileName) => settingToArray(rawSettings.translationFiles.folders).map(path => path.trim().replace(/\\/, '/').replace(/^\/+|\/+$/g, '') + '/**/' + fileName.replace(/\\/, '/').replace(/\[DOMAIN\]|\[LANG\]|\[LANGCODE\]|\[LOCALE\]/g, '*')) || ['**/' + fileName.replace(/\\/, '/').replace(/\[DOMAIN\]|\[LANG\]|\[LANGCODE\]|\[LOCALE\]/g, '*')],
            ),
            preview: rawSettings.preview.enabled || false,
            parsingMode: rawSettings.parsingMode,
            domainSupport: rawSettings.domainSupport || rawSettings.parsingMode === `symfony`,
            keyPattern: rawSettings.translationKeyPattern || KEY_PATTERN,
            keyLength: rawSettings.translationKeyMinLength || 0,
            previewLocale: (rawSettings.preview.language || 'en').toLowerCase(),
            previewColor: rawSettings.preview.color || '',
            hover: rawSettings.hover.enabled || false,
            requiredLanguages: settingToArray(rawSettings.requiredLanguages).map(language => language.toLowerCase()),
            extensions: settingToArray(rawSettings.extensions).map((ext) => ext[0] === '.' ? ext : `.${ext}`),
            translationsFolders: settingToArray(rawSettings.translationFiles.folders).map(path => path.replace(/\\/, '/')),
            ignoredFolders: settingToArray(rawSettings.translationFiles.ignored).map(path => '**/' + path.trim().replace(/\\/, '/').replace(/^\/+|\/+$/g, '') + '/**'),
            logLevel: rawSettings.logLevel,
            debugToChannel: rawSettings.logToChannel || false
        };
        extensionSettings = res;
    }
    return extensionSettings;
};
