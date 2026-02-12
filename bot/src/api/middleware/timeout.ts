import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

const timeoutLog = logger.child({ component: 'timeout' });

const SLOW_REQUEST_THRESHOLD_MS = 5000;

/**
 * Request timeout middleware.
 * Responds with 504 if the request exceeds the given timeout.
 * Logs a warning for slow requests (> 5s).
 */
export function requestTimeout(ms: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      timeoutLog.error('Request timeout', undefined, {
        method: req.method,
        path: req.path,
        requestId: req.requestId,
        timeoutMs: ms,
      });

      if (!res.headersSent) {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: `Request exceeded ${ms}ms timeout`,
        });
      }
    }, ms);

    res.on('finish', () => {
      clearTimeout(timer);

      if (!timedOut) {
        const duration = Date.now() - start;
        if (duration > SLOW_REQUEST_THRESHOLD_MS) {
          timeoutLog.warn('Slow request', {
            method: req.method,
            path: req.path,
            requestId: req.requestId,
            durationMs: duration,
          });
        }
      }
    });

    // Also clear timer if the connection is closed prematurely
    res.on('close', () => {
      clearTimeout(timer);
    });

    next();
  };
}
