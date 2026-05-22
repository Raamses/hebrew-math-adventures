/**
 * Simple logger utility to handle environment-specific logging.
 */
export const logger = {
    /**
     * Logs a message to the console only in development mode.
     */
    log: (message: string, ...args: unknown[]) => {
        if (import.meta.env.DEV) {
            console.log(message, ...args);
        }
    },

    /**
     * Always logs a warning to the console.
     */
    warn: (message: string, ...args: unknown[]) => {
        console.warn(message, ...args);
    },

    /**
     * Always logs an error to the console.
     */
    error: (message: string, ...args: unknown[]) => {
        console.error(message, ...args);
    },
};
