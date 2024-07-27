import { DecorationOptions, MarkdownString, Position, Range, Uri } from "vscode";
import { IEditorLine, IMappedTranslations, ITranslations } from "../types";
import { settings } from "../settings";
import { escapeHtml, getRandomColor } from "../utilities/utils";

type ContextTableRow = {
    language: string,
    message: string,
    editCommand: Uri|string|null
};

const MISSING_TRANSLATION_MESSAGE = `[missing]`;
const EMPTY_TRANSLATION_MESSAGE = `[empty]`;

const contextTooltip = (translations: IMappedTranslations) => {
    // Get a list of the configured required/found language tags.
    const languageTags = [...new Set([...settings().requiredLanguages, ...Object.keys(translations)])];

    // Generate rows for each language tag
    const contextTableRows: ContextTableRow[] = languageTags.map((languageTag) => {
        return {
            language: languageTag.toUpperCase(),
            message: translations?.[languageTag] ? translations[languageTag]['value'].toString() : MISSING_TRANSLATION_MESSAGE,
            editCommand: translations?.[languageTag] ? Uri.parse(`command:symfonyTranslationHelper.openTranslationFile?${encodeURI(JSON.stringify({
                fileName: translations[languageTag].source.fileName,
                range: translations[languageTag].source?.value || translations[languageTag].source?.key
            }))}`) : null
        };
    });

    const contextTable = `<strong>Translations</strong><hr>  \n<table>${contextTableRows.map(renderTranslationRow).join('')}</table>`;
    const tooltip = new MarkdownString(contextTable, true);

    tooltip.supportHtml = true;
    tooltip.isTrusted = true;
    tooltip.supportThemeIcons = true;

    return tooltip;
};

const renderTranslationRow = (row: ContextTableRow) => {
    // Decide between machine translate and edit command based on the message
    const message = (row.message === MISSING_TRANSLATION_MESSAGE) ? `<span style="color:#ff0000;">${escapeHtml(row.message)}</span>` : escapeHtml(row.message);
    const actionCommandLink = (row.message === MISSING_TRANSLATION_MESSAGE) || !row.editCommand ? '' : `<a href="${row.editCommand}">$(edit)</a>`;
    const messageListing = `<td><strong>${escapeHtml(row.language)}&nbsp;</strong></td><td>${message}&nbsp;</td><td>${actionCommandLink}&nbsp;</td>`;
    return `<tr>${messageListing}</tr>`;
};

export const getDecorationOptions = (line: IEditorLine, match: string, translations: ITranslations): DecorationOptions|null => {
    if ((!settings().preview && !settings().hover) || !translations?.[match] || line.value.indexOf(match) === -1) {
        return null;
    }

    const previewLanguageTag = settings().previewLanguageTag;
    let color = settings().previewColor || 'green';
    if (color.toLowerCase() === 'random') {
        color = getRandomColor();
    }

    return {
        renderOptions: settings().preview ? {
            after: {
                contentText: translations[match]?.[previewLanguageTag] ? translations[match][previewLanguageTag]?.['value'].toString() || EMPTY_TRANSLATION_MESSAGE : MISSING_TRANSLATION_MESSAGE,
                fontStyle: 'italic',
                margin: '0 .5rem',
                color: translations[match]?.[previewLanguageTag] ? (color || 'green') : 'ff0000',
            },
        } : undefined,
        hoverMessage: settings().hover ? contextTooltip(translations[match]) : undefined,
        range: new Range(
            new Position(line.lineNumber, line.value.indexOf(match) - 1),
            new Position(line.lineNumber, line.value.indexOf(match) + match.length + 1),
        ),
    };
};
