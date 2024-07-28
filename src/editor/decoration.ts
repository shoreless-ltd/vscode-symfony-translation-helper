import { DecorationOptions, MarkdownString, Position, Range, Uri } from "vscode";
import { DEFAULT_DOMAIN, IEditorLine, IMappedTranslations, ITranslations } from "../types";
import { settings } from "../settings";
import { escapeHtml, getRandomColor } from "../utilities/utils";

type ContextTableRow = {
    domain?: string,
    language: string,
    message: string,
    editCommand: Uri|string|null
};

const MISSING_TRANSLATION_MESSAGE = `[missing]`;
const EMPTY_TRANSLATION_MESSAGE = `[empty]`;

const renderTranslationTableHeader = (showDomain: boolean) => {
    let header = `<th align="left">Langcode</th><th align="left">Translation</th><th>&nbsp</th>`;
    if (showDomain) {
        header = `<th align="left">Domain</th>` + header;
    }
    return `<tr>${header}</tr>`;
};

const renderTranslationTableRow = (row: ContextTableRow) => {
    // Decide between machine translate and edit command based on the message
    const message = (row.message === MISSING_TRANSLATION_MESSAGE) ? `<span style="color:#ff0000;">${escapeHtml(row.message)}</span>` : escapeHtml(row.message);
    const actionCommandLink = (row.message === MISSING_TRANSLATION_MESSAGE) || !row.editCommand ? '' : `<a href="${row.editCommand}">$(edit)</a>`;
    let messageListing = `<td><strong>${escapeHtml(row.language)}&nbsp;</strong></td><td>${message}&nbsp;</td><td>${actionCommandLink}&nbsp;</td>`;
    if (row.domain) {
        messageListing = `<td><strong>${escapeHtml(row.domain)}&nbsp;</strong></td>` + messageListing;
    }
    return `<tr>${messageListing}</tr>`;
};

const contextTooltip = (translations: IMappedTranslations) => {
    const showDomain = Object.keys(translations).length > 1 || !translations?.[DEFAULT_DOMAIN];

    // Generate rows for each language tag
    let contextTableRows: ContextTableRow[] = [];
    Object.keys(translations).forEach(domain => {
        let languageTags = [...new Set([...settings().requiredLanguages, ...Object.keys(translations[domain])])];
        languageTags.forEach((languageTag) => {
            contextTableRows.push({
                domain: showDomain ? domain : undefined,
                language: languageTag.toUpperCase(),
                message: translations[domain]?.[languageTag] ? translations[domain][languageTag]['value'].toString() : MISSING_TRANSLATION_MESSAGE,
                editCommand: translations[domain]?.[languageTag] ? Uri.parse(`command:symfonyTranslationHelper.openTranslationFile?${encodeURI(JSON.stringify({
                    fileName: translations[domain][languageTag].source.fileName,
                    range: translations[domain][languageTag].source?.value || translations[domain][languageTag].source?.key
                }))}`) : null
            });
        });
    });

    const contextTable = `<strong>Translations</strong><hr>  \n<table>${renderTranslationTableHeader(showDomain)}${contextTableRows.map(renderTranslationTableRow).join('')}</table>`;
    const tooltip = new MarkdownString(contextTable, true);

    tooltip.supportHtml = true;
    tooltip.isTrusted = true;
    tooltip.supportThemeIcons = true;

    return tooltip;
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
                contentText: translations[match]?.[Object.keys(translations[match])[0]]?.[previewLanguageTag] ? translations[match]?.[Object.keys(translations[match])[0]]?.[previewLanguageTag]?.['value'].toString() || EMPTY_TRANSLATION_MESSAGE : MISSING_TRANSLATION_MESSAGE,
                fontStyle: 'italic',
                margin: '0 .5rem',
                color: translations[match]?.[Object.keys(translations[match])[0]]?.[previewLanguageTag] ? (color || 'green') : 'ff0000',
            },
        } : undefined,
        hoverMessage: settings().hover ? contextTooltip(translations[match]) : undefined,
        range: new Range(
            new Position(line.lineNumber, line.value.indexOf(match) - 1),
            new Position(line.lineNumber, line.value.indexOf(match) + match.length + 1),
        ),
    };
};
