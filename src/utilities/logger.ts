import { settings } from './../settings';

/**
 * Logs the given message to the console, if verbose mode is enabled.
 *
 * @param {string} text
 *   Text to log.
 */
export default function log(text: string): void {
    if (settings().verbose) {
        console.log(`[symfony-translation-helper] ${text}`);
    }
};