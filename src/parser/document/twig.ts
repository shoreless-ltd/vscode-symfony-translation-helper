import { Position, Range, TextDocument } from 'vscode';
import { IRecognitionException, IToken } from 'chevrotain';
import { IDocumentParser, IDocumentParserStatic, IDocumentParserTranslations, ITranslationKey } from '../../types';
import { settings } from '../../settings';
import { Template } from './twig/types';
import log from '../../utilities/logger';
import { ASTQTwigAdapter, parseAST } from './twig/ast';
import { trimmedRange } from '../../utilities/utils';
const ASTQ = require('astq');

/**
 * Twig document parser for Symfony Twig templates.
 *
 * Uses `{% trans %}` tag and `trans` filter within a Twig template to extract
 * related translation key strings. If a `{% trans_default_domain %}` tag is
 * found, its defined domain will be added to the translation key information:
 *
 * <code language="twig">
 * {% trans_default_domain domain %}
 * {{ message|trans(arguments={}, domain=string|null, locale=string|null) }}
 * {% trans with {} from domain into locale %} message {% endtrans %}
 * </code>
 *
 * Requires the `'symfony'` document parsing mode.
 */
export const TwigDocumentParser: IDocumentParserStatic = class TwigDocumentParser implements IDocumentParser {
    #document: TextDocument;
    #ast: Template;
    #tokens: IToken[];
    #errors: IRecognitionException[];

    /**
     * {@inheritdoc}
     */
    static applies(document: TextDocument): boolean {
        return document.languageId === 'twig' && settings().parsingMode === 'symfony';
    }

    /**
     * {@inheritdoc}
     */
    constructor(document: TextDocument) {
        this.#document = document;

        ({
            ast: this.#ast,
            tokens: this.#tokens,
            errors: this.#errors
        } = parseAST(document));
    }

    /**
     * {@inheritdoc}
     */
    getTranslationKeys(): IDocumentParserTranslations {
        let translationKeys: ITranslationKey[] = [];

        // Whether document parsing failed.
        if (this.#errors.length) {
            log('Twig parser error(s).', 'debug', this.#errors, this.#tokens);
            return {
                translations: translationKeys,
                hasErrors: true
            };
        }

        const file = this.#document.uri;
        const astq = new ASTQ();
        let hasErrors = false;

        astq.adapter(ASTQTwigAdapter);

        /**
         * Tries to determine the translation domain from a previous `trans_default_domain` tag.
         *
         * The closest `trans_default_domain` tag with a domain string on the path back to the
         * tree root will be used.
         *
         * Note: We do NOT traverse into nor evaluate previous `if ... then [... else]`
         * expressions, but check direct parents and left siblings only. The domain of an AST
         * tree representing the following example will be resolved to `root_domain`, if the
         * `trans` filter identifier is the node given to this function:
         *
         * <code language="twig">
         * {% trans_default_domain 'root_domain' %}
         * {% if condition %}
         *     {% trans_default_domain 'success' %}
         * {% else %}
         *     {% trans_default_domain 'error' %}
         * {% endif %}
         * {{ message|trans }}
         * </code>
         *
         * @param {object} node
         *   The Twig AST node to start checking from.
         *
         * @return {string|undefined}
         *   The resolved translation domain, or `undefined`, if none was found.
         */
        const domainFromTransDefault = (node: any):string|undefined => {
            let domain:string|undefined = undefined;

            if (!settings().domainSupport) {
                return domain;
            }

            while (node._parent && !domain) {
                // Check node left axis siblings for `trans_default_domain` tag.
                let axis = node?._axis;
                let index = node?._index;
                node = node._parent;
                if (axis && index) {
                    let transDefaultTags = astq.query(node, `*/:'${axis}' TransDefaultDomainStatement [ @_index < ${index} ]`);
                    if (transDefaultTags.length && transDefaultTags[transDefaultTags.length - 1]?.domain && transDefaultTags[transDefaultTags.length - 1]?.domain?.type === 'StringLiteral') {
                        domain = transDefaultTags[transDefaultTags.length - 1].domain.value;
                    }
                }
            }

            return domain;
        };

        /**
         * Process `trans` filter found in the Twig AST.
         *
         * Filters may have named parameters, parameters by position, or a mix of both. This method checks
         * for unnamed parameters first (domain in second position, locale in third) and/or parameter names
         * only, after a named parameter occurred.
         *
         * @param node
         *   Twig AST node representing the `trans` identifier.
         */
        const transFilter = (node: any) => {
            const startNode = node;
            let domain = undefined;
            let locale = undefined;

            log(`Found trans filter.`, 'debug', node);

            if (node._parent && node._parent.type === 'CallExpression') {
                node = node._parent;
                const args = node.arguments;

                // Whether arguments exist.
                if (args.length) {
                    let hasNamed = false;
                    // loop over all arguments.
                    for (let i = 0; i < args.length; i++) {
                        if (args[i].type === 'NamedArgument') {
                            hasNamed = true;
                            if (args[i].key.type === 'Identifier' && args[i].value && args[i].value.type === 'StringLiteral') {
                                if (settings().domainSupport && args[i].key.name === 'domain') {
                                    domain = args[i].value.value;
                                }
                                else if (args[i].key.name === 'locale') {
                                    locale = args[i].value.value;
                                }
                            }
                        }
                        // Whether no named arguments exist (so far) and the argument is a string literal.
                        if (!hasNamed && args[i].type === 'StringLiteral') {
                            // Second argument (domain).
                            if (settings().domainSupport && i === 1) {
                                // Set domain.
                                domain = args[i].value;
                            }
                            // Third argument (locale).
                            else if (i === 2) {
                                // Set locale.
                                locale = args[i].value;
                            }
                        }
                    }
                }
            }

            // Traverse to the farthest filter expression in the immediate parents chain.
            while (node._parent && node._parent.type === 'FilterExpression') {
                node = node._parent;
            }

            // Traverse through the expressions.
            while (node.expression && node.expression.type === 'FilterExpression') {
                node = node.expression;
            }

            // Whether the entire expression chain starts with a string.
            if (node.expression.type === 'StringLiteral') {
                node = node.expression;
                log('Found node.', 'debug', node);
                // Use the string as translation key.
                translationKeys.push({
                    value: node.value,
                    file: file,
                    range: new Range(new Position(node._source.startLine - 1, node._source.startColumn - 1), new Position(node._source.endLine - 1, node._source.endColumn)),
                    isCandidate: false,
                    domain: domain || domainFromTransDefault(startNode),
                    locale: locale
                });
            }
        };

        /**
         * Process `trans` tags found in the Twig AST.
         *
         * @param node
         *   Twig AST node representing the `trans` tag.
         */
        const transTag = (node: any) => {
            const startNode = node;
            let domain = domainFromTransDefault(node);
            let locale = undefined;

            log(`Found trans tag.`, 'debug', node);

            if (node?.['domain'] && node.domain.type === 'StringLiteral') {
                domain = node.domain.value;
            }
            if (node?.['locale'] && node.locale.type === 'StringLiteral') {
                locale = node.locale.value;
            }

            // Extract the translation key. We deliberately ignore trans tags with
            // nested Twig tags.
            if (node.body && node.body.length === 1 && node.body[0].type === 'Text') {
                node = node.body[0];

                const value = node.value.toString().trim();
                if (value.length > 0) {
                    translationKeys.push({
                        value: value,
                        file: file,
                        range: trimmedRange(new Position(node._source.startLine - 1, node._source.startColumn - 1), node.value.toString()),
                        isCandidate: false,
                        domain: domain || domainFromTransDefault(startNode),
                        locale: locale
                    });
                }
            }
        };

        try {
            // Process `trans` filters.
            astq.query(this.#ast, `.//Identifier[@name == 'trans']`).forEach(transFilter);

            // Process `trans` tags.
            astq.query(this.#ast, `.//TransStatement`).forEach(transTag);

            log('Extracted Twig keys.', 'debug', translationKeys);
        }
        catch (ex: any) {
            hasErrors = true;
            log('Error occurred', 'error', ex);
        }

        return {
            translations: translationKeys,
            hasErrors: hasErrors
        };
    }
};
