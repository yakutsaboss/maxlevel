import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

const reporterLog = logger.child({ component: 'errorReporter' });

interface ErrorStats {
  totalErrors: number;
  errorsByRoute: Record<string, number>;
  lastError: { path: string; message: string; timestamp: string } | null;
}

let totalErrors = 0;
const errorsByRoute: Record<string, number> = {};
let lastError: ErrorStats['lastError'] = null;

/**
 * Returns accumulated error statistics.
 */
export function getErrorStats(): ErrorStats {
  return {
    totalErrors,
    errorsByRoute: { ...errorsByRoute },
    lastError,
  };
}

/**
 * Express error middleware that logs all unhandled errors with structured context
 * and tracks per-route error counts.
 *
 * Must be registered AFTER route handlers (4-param signature makes Express treat it as error middleware).
 */
export function errorReporter(err: Error, req: Request, res: Response, next: NextFunction): void {
  const routeKey = `${req.method} ${req.path}`;

  totalErrors++;
  errorsByRoute[routeKey] = (errorsByRoute[routeKey] || 0) + 1;
  lastError = {
    path: req.path,
    message: err.message,
    timestamp: new Date().toISOString(),
  };

  reporterLog.error('Unhandled error', err, {
    method: req.method,
    path: req.path,
    routeKey,
    requestId: req.requestId,
    totalErrors,
  });

  // Pass to the next error handler (the existing global error handler)
  next(err);
}
