import { settings } from './../settings';

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
    const icon = level === 'error' ? `🔴`: (level === 'info' ? `💡` : `❎`);

    if (logLevel === 'verbose' || (logLevel === 'info' && level === 'error') || logLevel === level) {
        console.log(`[symfony-translation-helper] ${icon} ${text}`, ...data);
    }
};