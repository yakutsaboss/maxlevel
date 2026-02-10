/**
 * Structured Logger with request tracing support.
 *
 * In production: outputs JSON lines (one per log entry) for machine parsing.
 * In development: outputs human-readable format.
 *
 * Usage:
 *   import { logger } from './utils/logger.js';
 *   logger.info('Server started', { port: 3000 });
 *
 *   // Create a child logger bound to request context:
 *   const log = logger.child({ requestId: req.requestId, telegramUserId: req.telegramUser?.id });
 *   log.info('Processing request');
 *   log.error('Something failed', err);
 */

import crypto from 'crypto';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  telegramUserId?: number;
  component?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: { message: string; stack?: string };
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === 'production';

class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger that inherits parent context and adds new fields.
   */
  child(ctx: LogContext): Logger {
    return new Logger({ ...this.context, ...ctx });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (isProduction) return;
    this.write('debug', message, undefined, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write('info', message, undefined, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, undefined, meta);
  }

  error(message: string, err?: Error | unknown, meta?: Record<string, unknown>): void {
    this.write('error', message, err, meta);
  }

  private write(level: LogLevel, message: string, err?: unknown, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...meta,
    };

    if (err) {
      if (err instanceof Error) {
        entry.error = { message: err.message, stack: err.stack };
      } else {
        entry.error = { message: String(err) };
      }
    }

    if (isProduction) {
      // JSON lines for machine parsing (PM2 logs, log aggregators)
      const output = JSON.stringify(entry);
      if (level === 'error') {
        process.stderr.write(output + '\n');
      } else {
        process.stdout.write(output + '\n');
      }
    } else {
      this.writeDev(entry, level);
    }
  }

  private writeDev(entry: LogEntry, level: LogLevel): void {
    const { timestamp, message, error: errObj, ...rest } = entry;
    delete rest.level;

    const time = timestamp.split('T')[1]?.replace('Z', '') ?? timestamp;
    const prefix = `[${time}] [${level.toUpperCase()}]`;
    const ctxStr = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
    const line = `${prefix} ${message}${ctxStr}`;

    switch (level) {
      case 'error':
        console.error(line);
        if (errObj?.stack) console.error(errObj.stack);
        break;
      case 'warn':
        console.warn(line);
        break;
      case 'debug':
        console.debug(line);
        break;
      default:
        console.log(line);
    }
  }
}

/**
 * Generate a unique request ID for tracing.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/** Root logger instance. Use logger.child({...}) for context-bound logging. */
export const logger = new Logger();
