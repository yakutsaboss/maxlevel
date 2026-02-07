/**
 * Simple logger utility for API
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = this.getTimestamp();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, error?: Error | any, meta?: any): void {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;

    console.error(this.formatMessage('error', message, { ...errorDetails, ...meta }));
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  api(req: any, res: any, duration: number): void {
    const message = `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 500) {
      this.error(message);
    } else if (res.statusCode >= 400) {
      this.warn(message);
    } else {
      this.info(message);
    }
  }
}

export const logger = new Logger();
