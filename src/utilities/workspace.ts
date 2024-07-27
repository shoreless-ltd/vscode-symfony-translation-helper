import { workspace } from "vscode";

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
