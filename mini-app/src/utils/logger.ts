type LogContext = Record<string, unknown>;

const isDev = import.meta.env.DEV;

export const logger = {
  error(message: string, context?: LogContext) {
    if (isDev) console.error(`[ERROR] ${message}`, context ?? '');
    // Production: future error-tracking integration (e.g. Sentry)
  },

  warn(message: string, context?: LogContext) {
    if (isDev) console.warn(`[WARN] ${message}`, context ?? '');
  },

  info(message: string, context?: LogContext) {
    if (isDev) console.info(`[INFO] ${message}`, context ?? '');
  },
};
