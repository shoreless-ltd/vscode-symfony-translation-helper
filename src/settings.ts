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
    keyPattern: string,
    keyLength: number,
    previewLanguageTag: string,
    requiredLanguages: string[],
    translationFilePatterns: string[],
    translationsFilenames: string[],
    translationsFolders: string[],
    ignoredFolders: string[],
    keyTemplate?: string,
    verbose: boolean,
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
            translationFilePatterns: settingToArray(rawSettings.translationFiles.patterns).map(fileName => fileName.replace(/\[LANG\]/g, '[LANGCODE]')),
            translationsFilenames: settingToArray(rawSettings.translationFiles.patterns).flatMap(
                (fileName) => settingToArray(rawSettings.translationFiles.folders).map(path => path.trim().replace(/^\/+|\/+$/g, '') + '/**/' + fileName.replace(/\[DOMAIN\]|\[LANG\]|\[LANGCODE\]/g, '*')) || ['**/' + fileName.replace(/\[LANG\]/g, '*')],
            ),
            preview: rawSettings.preview.enabled || false,
            keyPattern: rawSettings.translationKeyPattern || KEY_PATTERN,
            keyLength: rawSettings.translationKeyMinLength || 0,
            previewLanguageTag: (rawSettings.preview.language || 'en').toLowerCase(),
            previewColor: rawSettings.preview.color || '',
            hover: rawSettings.hover.enabled || false,
            requiredLanguages: settingToArray(rawSettings.requiredLanguages).map(language => language.toLowerCase()),
            extensions: settingToArray(rawSettings.extensions).map((ext) => ext[0] === '.' ? ext : `.${ext}`),
            translationsFolders: settingToArray(rawSettings.translationFiles.folders),
            ignoredFolders: settingToArray(rawSettings.translationFiles.ignored).map(path => '**/' + path.trim().replace(/^\/+|\/+$/g, '') + '/**'),
            verbose: rawSettings.verbose || false
        };
        extensionSettings = res;
    }
    return extensionSettings;
};
