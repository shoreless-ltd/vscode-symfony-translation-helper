import { workspace } from "vscode";
import { settings } from "../settings";

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
export const getRelativeFilePath = (filePath: string): string => filePath.indexOf(settings().workspaceRoot + '/') === 0 ? filePath.substring(settings().workspaceRoot.length + 1) : filePath;

/**
 * Returns the workspace root path.
 *
 * @return {string}
 *   The workspace root path.
 *
 * @todo Use `workspace.findFiles()` instead.
 */
export const getWorkspaceRootPath = (): string => {
    const currentWorkspace = workspace.workspaceFolders?.length ? workspace.workspaceFolders[0] : undefined;

    if (!currentWorkspace) {
        return '';
    }

    return currentWorkspace.uri.fsPath;
};
