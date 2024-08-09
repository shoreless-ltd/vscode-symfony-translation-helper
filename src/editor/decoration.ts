import { DecorationOptions, MarkdownString, Uri } from "vscode";
import { DEFAULT_DOMAIN, ITranslationKey, ITranslations } from "../types";
import { settings } from "../settings";
import { escapeHtml, getRandomColor } from "../utilities/utils";

type ContextTableRow = {
    domain?: string,
    locale: string,
    message: string,
    color: string,
    editCommand: Uri|string|null
};

const MISSING_TRANSLATION_MESSAGE = `[missing]`;
const EMPTY_TRANSLATION_MESSAGE = `[empty]`;

const renderTranslationTableHeader = (showDomain: boolean) => {
    let header = `<th align="left"><small>Locale</small></th><th align="left"><small>Translation</small></th><th>&nbsp</th>`;
    if (showDomain) {
        header = `<th align="left"><small>Domain</small></th>` + header;
    }
    return `<thead><tr>${header}</tr></thead>`;
};

const renderTranslationTableRow = (row: ContextTableRow) => {
    // Decide between machine translate and edit command based on the message
    const message = `<span style="color:${row.color};">${escapeHtml(row.message)}</span>`;
    const actionCommandLink = (row.message === MISSING_TRANSLATION_MESSAGE) || !row.editCommand ? '' : `<a href="${row.editCommand}">$(edit)</a>`;
    let messageListing = `<td>${escapeHtml(row.locale)}&nbsp;</td><td>${message}&nbsp;</td><td>${actionCommandLink}&nbsp;</td>`;
    if (row.domain) {
        messageListing = `<td>${escapeHtml(row.domain)}&nbsp;</td>` + messageListing;
    }
    return `<tr>${messageListing}</tr>`;
};

const contextTooltip = (key: ITranslationKey, allTranslations: ITranslations) => {
    let text = `<strong>Translation:</strong> <span style="color:${renderTranslationColor(key, allTranslations)};"><strong>${renderTranslation(key, allTranslations)}</strong></span>\n`;
    const defaultLocale = key.locale || settings().previewLocale;

    let subTitleParts = [];
    if (key.value) {
        subTitleParts.push(`Key: <span style="color:var(--vscode-editor-foreground);"><strong>${key.value}</strong></span>`);
    }
    if (settings().domainSupport && key.domain) {
        subTitleParts.push(`Domain: <span style="color:var(--vscode-editor-foreground);"><strong>${key.domain}</strong></span>`);
    }
    if (defaultLocale) {
        subTitleParts.push(`Locale: <span style="color:var(--vscode-editor-foreground);"><strong>${defaultLocale.toUpperCase()}</strong></span>`);
    }
    if (subTitleParts.length) {
        text += `<hr><hr>\n<small>${subTitleParts.join('&nbsp;&nbsp;|&nbsp;&nbsp;')}</small>`;
    }
    text += `\n`;

    const translations = allTranslations?.[key.value];

    if (translations || (settings().domainSupport && key.domain)) {
        const showDomain = settings().domainSupport && (Object.keys(translations).length > 1 || !translations?.[DEFAULT_DOMAIN]);

        // Generate rows for each language tag
        let contextTableRows: ContextTableRow[] = [];
        let domains = settings().domainSupport && key.domain ? [...new Set([...[key.domain], ...Object.keys(translations)])] : Object.keys(translations);
        domains.forEach(domain => {
            let locales = [...new Set([ ...(defaultLocale ? [defaultLocale] : []), ...settings().requiredLanguages, ...Object.keys(translations?.[domain] || [])])];
            locales.forEach((locale) => {
                contextTableRows.push({
                    domain: showDomain ? domain : undefined,
                    locale: locale.toUpperCase(),
                    message: renderTranslation(key, allTranslations, domain, locale),
                    color: renderTranslationColor(key, allTranslations, domain, locale),
                    editCommand: translations?.[domain]?.[locale] ? Uri.parse(`command:symfonyTranslationHelper.openTranslationFile?${encodeURI(JSON.stringify({
                        fileName: translations[domain][locale].source.fileName,
                        range: translations[domain][locale].source?.value || translations[domain][locale].source?.key
                    }))}`) : null
                });
            });
        });
        //text += `<hr>\n<small>All translations${showDomain ? ' in all domains' : ''}</small><br>\n<br>\n`;
        text += `<hr><hr>\n<table>${renderTranslationTableHeader(showDomain)}<tbody>${contextTableRows.map(renderTranslationTableRow).join('')}</tbody></table>`;
    }

    const tooltip = new MarkdownString(text, true);

    tooltip.supportHtml = true;
    tooltip.isTrusted = true;
    tooltip.supportThemeIcons = true;

    return tooltip;
};

const renderTranslation = (
    key: ITranslationKey,
    translations: ITranslations,
    domain: string = key.domain || (translations?.[key.value] ? Object.keys(translations[key.value])[0] : DEFAULT_DOMAIN),
    locale: string = key.locale || settings().previewLocale
) => translations?.[key.value]?.[domain]?.[locale] ? translations[key.value]?.[domain]?.[locale]?.['value'].toString() || EMPTY_TRANSLATION_MESSAGE : MISSING_TRANSLATION_MESSAGE;

const renderTranslationColor = (
    key: ITranslationKey,
    translations: ITranslations,
    domain: string = key.domain || (translations?.[key.value] ? Object.keys(translations[key.value])[0] : DEFAULT_DOMAIN),
    locale: string = key.locale || settings().previewLocale
) => translations?.[key.value]?.[domain]?.[locale] ? (translations[key.value]?.[domain]?.[locale]?.['value'].toString() ? `var(--vscode-editor-foreground)` : `var(--vscode-editorWarning-foreground)`) : `var(--vscode-editorError-foreground)`;

export const getDecorationOptions = (key: ITranslationKey, translations: ITranslations): DecorationOptions|null => {
    if (!(settings().preview || !settings().hover)) {
        return null;
    }

    let color = settings().previewColor || 'green';
    if (color.toLowerCase() === 'random') {
        color = getRandomColor();
    }

    return {
        renderOptions: settings().preview ? {
            after: {
                contentText: renderTranslation(key, translations),
                fontStyle: 'italic',
                margin: '0 .5rem',
                color: translations[key.value]?.[key.domain || Object.keys(translations[key.value])[0]]?.[key.locale || settings().previewLocale] ? (color || 'green') : `var(--vscode-editorError-foreground)`,
            },
        } : undefined,
        hoverMessage: settings().hover ? contextTooltip(key, translations) : undefined,
        range: key.range,
    };
};
