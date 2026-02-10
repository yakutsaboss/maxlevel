/**
 * Admin Stats, Analytics & General Routes
 * GET /stats, POST /analytics/export, GET /modes, POST /broadcast, GET /logs
 */

import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/adminAuth.js';
import { executePythonTool } from '../../utils/pythonTools.js';
import { query } from '../../utils/db.js';

const router = Router();

/**
 * GET /api/admin/stats
 * Get overall system statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const usersResult = await executePythonTool('db_operations', [
      '--query',
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM users',
    ]);

    const questsResult = await executePythonTool('db_operations', [
      '--query',
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
       FROM quest_instances`,
    ]);

    const achievementsResult = await executePythonTool('db_operations', [
      '--query',
      'SELECT COUNT(DISTINCT user_id) as users_with_achievements FROM user_achievements',
    ]);

    res.json({
      success: true,
      data: {
        users: usersResult.data?.[0] || { total: 0, active: 0 },
        quests: questsResult.data?.[0] || { total: 0, active: 0, completed: 0 },
        achievements: achievementsResult.data?.[0] || { users_with_achievements: 0 },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system statistics',
    });
  }
});

/**
 * POST /api/admin/analytics/export
 * Trigger Google Sheets analytics export on demand
 */
router.post('/analytics/export', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const result = await executePythonTool('sheets_analytics_export', ['--export-all']);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Analytics export failed',
      });
    }

    const adminUser = (req as any).adminUser;
    console.log(`[ADMIN] Analytics export triggered by ${adminUser.username}`);

    res.json({
      success: true,
      data: {
        message: 'Analytics export completed',
        ...((result.data as any) || {}),
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics',
    });
  }
});

/**
 * GET /api/admin/modes
 * List all modes
 */
router.get('/modes', async (req: Request, res: Response) => {
  try {
    const result = await executePythonTool('mode_manager', ['--list-modes']);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch modes',
      });
    }

    res.json({
      success: true,
      data: {
        modes: result.data || [],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error listing modes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch modes',
    });
  }
});

/**
 * POST /api/admin/broadcast
 * Send broadcast message to all active users
 */
router.post('/broadcast', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(503).json({
        success: false,
        error: 'Bot token not configured',
      });
    }

    // Get all active users
    const users = await query<{ telegram_id: number }>(
      'SELECT telegram_id FROM users WHERE is_active = true'
    );

    if (users.length === 0) {
      return res.json({ success: true, data: { sent: 0, failed: 0, total: 0 } });
    }

    const adminUser = (req as any).adminUser;
    console.log(`[ADMIN] Broadcast initiated by ${adminUser.username} to ${users.length} users`);

    let sent = 0;
    let failed = 0;
    const BATCH_SIZE = 20;

    // Send in batches of 20 with 1-second delay between batches
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (user) => {
          const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: user.telegram_id,
              text: message.trim(),
              parse_mode: 'HTML',
            }),
          });
          if (!response.ok) {
            const err = await response.text();
            throw new Error(`Telegram API ${response.status}: ${err}`);
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          sent++;
        } else {
          failed++;
          console.warn(`[ADMIN] Broadcast failed for user:`, result.reason?.message);
        }
      }

      // Rate limit delay between batches (skip after last batch)
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[ADMIN] Broadcast complete: ${sent} sent, ${failed} failed`);

    res.json({ success: true, data: { sent, failed, total: sent + failed } });
  } catch (error) {
    console.error('[ADMIN] Error broadcasting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send broadcast',
    });
  }
});

/**
 * GET /api/admin/logs
 * Get recent system logs
 */
router.get('/logs', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    // Query pg-boss job history for completed/failed jobs
    const jobs = await query<{
      name: string;
      state: string;
      completedon: string;
      output: any;
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

    res.json({ success: true, data: { logs } });
  } catch (error) {
    console.error('[ADMIN] Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
    });
  }
});

export { router as adminStatsRouter };
