import { Router, Request, Response } from 'express';
import { getPool } from '../../utils/db.js';
import { getJobQueue } from '../../jobs/boss.js';
import { logger } from '../../utils/logger.js';

const router = Router();
const log = logger.child({ component: 'health' });

const BUILD_VERSION = process.env.BUILD_VERSION || 'dev';
const GIT_COMMIT = process.env.GIT_COMMIT || 'unknown';
const startTime = Date.now();

interface HealthCheck {
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
  [key: string]: unknown;
}

/**
 * GET /health
 * Detailed health check with database, queue, and memory status.
 * No auth, no rate limit — used by monitoring and load balancers.
 */
router.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, HealthCheck> = {};
  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';

  // Database connectivity check
  try {
    const dbStart = Date.now();
    const pool = getPool();
    const result = await pool.query('SELECT 1 AS ok');
    const dbLatency = Date.now() - dbStart;
    const poolInfo = pool as { totalCount?: number; idleCount?: number; waitingCount?: number };
    checks.db = {
      status: result.rows[0]?.ok === 1 ? 'ok' : 'error',
      latencyMs: dbLatency,
      totalConnections: poolInfo.totalCount ?? 0,
      idleConnections: poolInfo.idleCount ?? 0,
      waitingRequests: poolInfo.waitingCount ?? 0,
    };
  } catch (err) {
    checks.db = { status: 'error', error: (err as Error).message };
    overallStatus = 'error';
  }

  // pg-boss queue status
  try {
    const boss = getJobQueue();
    if (boss) {
      const queueStart = Date.now();
      // pg-boss stores jobs in pgboss.job table — count pending
      const pool = getPool();
      const result = await pool.query(
        `SELECT state, COUNT(*)::int AS count FROM pgboss.job WHERE name NOT LIKE '__pgboss%' GROUP BY state`
      );
      const queueLatency = Date.now() - queueStart;
      const states: Record<string, number> = {};
      for (const row of result.rows) {
        states[row.state as string] = row.count as number;
      }
      checks.queue = {
        status: 'ok',
        latencyMs: queueLatency,
        created: states.created ?? 0,
        active: states.active ?? 0,
        completed: states.completed ?? 0,
        failed: states.failed ?? 0,
      };
    } else {
      checks.queue = { status: 'error', error: 'Queue not started' };
      overallStatus = overallStatus === 'error' ? 'error' : 'degraded';
    }
  } catch (err) {
    checks.queue = { status: 'error', error: (err as Error).message };
    overallStatus = overallStatus === 'error' ? 'error' : 'degraded';
  }

  // Memory usage
  const mem = process.memoryUsage();
  const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
  const rssMb = Math.round(mem.rss / 1024 / 1024);
  const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  checks.memory = {
    status: heapPercent > 90 ? 'error' : 'ok',
    heapUsedMb,
    heapTotalMb,
    rssMb,
    heapPercent,
  };
  if (heapPercent > 90) {
    overallStatus = overallStatus === 'error' ? 'error' : 'degraded';
    log.warn('High heap usage', { heapPercent });
  }

  const uptimeSeconds = Math.round(process.uptime());

  const statusCode = overallStatus === 'error' ? 503 : 200;
  res.status(statusCode).json({
    status: overallStatus,
    checks,
    version: BUILD_VERSION,
    gitCommit: GIT_COMMIT,
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
