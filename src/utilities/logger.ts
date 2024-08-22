import { window } from 'vscode';
import { settings } from './../settings';

const outputChannel = window.createOutputChannel('Symfony Translation Helper');
const formatValue = (value: any, indent: number = 1): string => {
    const prefix = ''.padStart(indent * 2);

    if (value === null) {
        return `null`;
    }

    switch (typeof value) {
        case 'undefined':
        case 'symbol':
        case 'function':
            return `[${typeof value}]`;

        case 'boolean':
            return `${value ? 'true' : 'false'}`;
    
        case 'string':
            return `'${value}'`;
    
        case 'object':
            let ret: string = `\{\n`;
            for (const [key, val] of Object.entries(value)) {
                ret += `${prefix}  ${key}: ${formatValue(val, indent + 1)}\n`;
            }
            ret += `${prefix}\}`;
            return ret;

        default:
            return `${value.toString()}`;

    }
};

/**
 * Logs the given message to the console, if verbose mode is enabled.
 *
 * @param {string} text
 *   Message to log.
 * @param {string} level
 *   Log level of the message.
 * @param {any} [...data]
 *   Additional data.
 */
export default function log(text: string, level: 'debug'|'info'|'error' = 'info', ...data: any): void {
    const logLevel = settings().logLevel;
    const debugToChannel = settings().debugToChannel;

    const icon = level === 'error' ? `🔴`: (level === 'info' ? `💡` : `❎`);

    if (logLevel === 'verbose' || (logLevel === 'info' && level === 'error') || logLevel === level) {
        if (debugToChannel && outputChannel) {
            outputChannel.appendLine(`${icon} [${level.toUpperCase()}] ${text}`);
            data.map((value: any) => {
                outputChannel.appendLine('- ' + formatValue(value));
            });
            // outputChannel.show();
        }
        else {
            console.log(`[symfony-translation-helper] ${icon} ${text}`, ...data);
        }
    }
};