import { TextDocument } from 'vscode';
import { TwigLexer } from './lexer';
import { TwigParser } from './parser';
import { Node } from './types';

let lexer: TwigLexer;
let parser: TwigParser;

/**
 * Checks, whether the given value is an AST node.
 *
 * @param {unknown} value
 *   The value to check.
 * 
 * @return {boolean}
 *   `true`, if the given value is an AST node, `false` otherwise. 
 */
export const isNode = (value: unknown): value is Node => {
    return (
        value !== null &&
        typeof value === 'object' &&
        'type' in value &&
        typeof value.type === 'string'
    );
};

export const getChildNodes = (node: object, axis: string = '*'): object[] => {
    const children: any[] = [];

    let checkField = (node: any, field: string) => {
        if (field.charAt(0) === '_') {
            return;
        }

        if (Object.prototype.hasOwnProperty.call(node, field) && isNode(node[field])) {
            children.push(node[field]);
        }
        else if (Object.prototype.hasOwnProperty.call(node, field) && Array.isArray(node[field])) {
            node[field].forEach((node) => {
                if (isNode(node)) {
                    children.push(node);
                }
            });
        }
    };

    if (axis === '*') {
        for (let field in node) {
            checkField(node, field);
        }
    }
    else if (Object.prototype.hasOwnProperty.call(node, axis)) {
        checkField(node, axis);
    }

    return children;
};

/**
 * ASTQ adapter for Twig AST node trees.
 */
export class ASTQTwigAdapter {
    static taste = isNode;

    static getParentNode = (node: any) => node._parent;

    static getChildNodes = getChildNodes;

    static getNodeType = (node: any) => node.type;

    static getNodeAttrNames = (node: any) => {
        const attrNames: string[] = [];

        for (let key in node) {
            if (
                Object.prototype.hasOwnProperty.call(node, key)
                && typeof node[key] !== 'object'
                && key !== 'type'
            ) {
                attrNames.push(key);
            }
        }

        return attrNames;
    };

    static getNodeAttrValue = (node: any, attr: string) => (
        Object.prototype.hasOwnProperty.call(node, attr)
        && typeof node[attr] !== "object"
        && attr !== 'type'
    ) ? node[attr] : undefined;
}

export class Walker {
    enter: (...args: any) => any;

    constructor(enter: (...args: any) => any) {
        this.enter = enter;
    }

    visit<AST extends Node>(
        node: AST,
        parent?: AST,
        prop?: string,
        index?: number
    ): AST {
        if (node) {
            if (this.enter) {
                this.enter(node, parent, prop, index);
            }

            for (let key in node) {
                if (key.charAt(0) !== '_') {
                    const value = node[key];
                    if (Array.isArray(value)) {
                        const nodes = value;
    
                        for (let i = 0; i < nodes.length; i += 1) {
                            const item = nodes[i];
    
                            if (isNode(item)) {
                                this.visit(item, node, key, i);
                            }
                        }
                    }
                    else if (isNode(value)) {
                        // @ts-ignore
                        this.visit(value, node, key);
                    }
                }
            }
        }

        return node;
    }
}

/**
 * Runs a function on an AST node and all its children.
 *
 * @param {T} ast
 *   Twig AST node. 
 * @param {Function} enter
 *   Function to run for the node and all its children.
 *
 * @return {T}
 *   The AST node.
 */
export function walk<T extends Node>(ast: T, enter: (...args: any) => any): T {
    const walker = new Walker(enter);

    return walker.visit(ast);
}

/**
 * Parses the given Twig text document into an AST tree.
 *
 * @param {TextDocument} document
 *   The Twig text document.
 *
 * @return {Object}
 *   An object containing the parsed AST tree, the generated source tokens, and/or a list
 *   of errors that occurred during parsing.
 */
export const parseAST = (document: TextDocument) => {
    // Lex Twig document into tokens.
    lexer = lexer || new TwigLexer();
    const { tokens } = lexer.tokenize(document.getText());

    // Parse tokens to AST.
    parser = parser || new TwigParser({
        recoveryEnabled: true
    });
    parser.input = tokens;
    const ast = parser.Template();

    // Errors list.
    const errors = parser.errors;

    // Add a `_parent`, `_axis` and `_index` properties to each AST
    // node to make it traversable.
    if (ast) {
        walk(ast, (node, parent, axis, index) => {
            node._parent = parent;
            if (typeof axis !== 'undefined') {
                node._axis = axis;
            }
            if (typeof index !== 'undefined') {
                node._index = index;
            }
        });
    }

    return {
        ast: ast,
        tokens: tokens,
        errors: errors
    };
};
