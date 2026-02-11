type LogContext = Record<string, unknown>;

const isDev = import.meta.env.DEV;

function formatLog(level: string, message: string, context?: LogContext) {
  const entry = { level, message, ts: new Date().toISOString(), ...context };
  return JSON.stringify(entry);
}

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
