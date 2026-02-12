/**
 * Admin Stats, Analytics & General Routes
 * GET /stats, POST /analytics/export, GET /modes, POST /broadcast, GET /logs
 */

import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/adminAuth.js';
import { executePythonTool } from '../../utils/pythonTools.js';
import { query } from '../../utils/db.js';
import { listAllModes } from '../../utils/queries.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  InternalServerError,
} from '../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { broadcastMessage } from '../../utils/broadcast.js';

/** Shape returned by sheets_analytics_export Python tool */
interface AnalyticsExportResult {
  spreadsheet_url?: string;
  rows_exported?: number;
  sheets_updated?: string[];
}

const log = logger.child({ component: 'adminStats' });

const router = Router();

/**
 * GET /api/admin/stats
 * Get overall system statistics
 */
router.get('/stats', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const [usersRows, questsRows, achievementsRows] = await Promise.all([
    query<{ total: string; active: string }>(
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM users'
    ),
    query<{ total: string; active: string; completed: string }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
       FROM quest_instances`
    ),
    query<{ users_with_achievements: string }>(
      'SELECT COUNT(DISTINCT user_id) as users_with_achievements FROM user_achievements'
    ),
  ]);

  res.json(successResponse({
    users: usersRows[0] || { total: 0, active: 0 },
    quests: questsRows[0] || { total: 0, active: 0, completed: 0 },
    achievements: achievementsRows[0] || { users_with_achievements: 0 },
    timestamp: new Date().toISOString(),
  }));
}));

/**
 * POST /api/admin/analytics/export
 * Trigger Google Sheets analytics export on demand
 */
router.post('/analytics/export', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const result = await executePythonTool<AnalyticsExportResult>('sheets_analytics_export', ['--export-all']);

  if (!result.success) {
    throw new InternalServerError(result.error || 'Analytics export failed');
  }

  const adminUser = req.adminUser!;
  log.info(`Analytics export triggered by ${adminUser.username}`);

  res.json(successResponse({
    message: 'Analytics export completed',
    ...(result.data || {}),
  }));
}));

/**
 * GET /api/admin/modes
 * List all modes
 */
router.get('/modes', asyncHandler(async (req: Request, res: Response) => {
  const modes = await listAllModes();

  res.json(successResponse({
    modes,
    timestamp: new Date().toISOString(),
  }));
}));

/**
 * POST /api/admin/broadcast
 * Send broadcast message to all active users
 */
router.post('/broadcast', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new BadRequestError('Message is required');
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new InternalServerError('Bot token not configured');
  }

  // Get all active users
  const users = await query<{ telegram_id: number }>(
    'SELECT telegram_id FROM users WHERE is_active = true'
  );

  if (users.length === 0) {
    res.json(successResponse({ sent: 0, failed: 0, total: 0 }));
    return;
  }

  const adminUser = req.adminUser!;
  log.info(`Broadcast initiated by ${adminUser.username}`, { recipientCount: users.length });

  const chatIds = users.map(u => u.telegram_id);
  const { sent, failed } = await broadcastMessage(botToken, chatIds, message.trim());

  log.info('Broadcast complete', { sent, failed });

  res.json(successResponse({ sent, failed, total: sent + failed }));
}));

/**
 * GET /api/admin/logs
 * Get recent system logs
 */
router.get('/logs', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

  // Query pg-boss job history for completed/failed jobs
  const jobs = await query<{
    name: string;
    state: string;
    completedon: string;
    output: unknown;
    createdon: string;
  }>(
    `SELECT name, state, completedon, output, createdon
     FROM pgboss.job
     WHERE completedon IS NOT NULL
     ORDER BY completedon DESC
     LIMIT $1`,
    [limit]
  );

  const logs = jobs.map((job) => ({
    timestamp: job.completedon,
    level: job.state === 'completed' ? 'info' : 'error',
    source: `job:${job.name}`,
    message: job.state === 'completed'
      ? `Job "${job.name}" completed successfully`
      : `Job "${job.name}" failed${job.output ? ': ' + JSON.stringify(job.output) : ''}`,
  }));

  res.json(successResponse({ logs }));
}));

export { router as adminStatsRouter };
