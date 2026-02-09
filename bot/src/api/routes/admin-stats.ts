/**
 * Admin Stats, Analytics & General Routes
 * GET /stats, POST /analytics/export, GET /modes, POST /broadcast, GET /logs
 */

import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/adminAuth.js';
import { executePythonTool } from '../../utils/pythonTools.js';

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
      users: usersResult.data?.[0] || { total: 0, active: 0 },
      quests: questsResult.data?.[0] || { total: 0, active: 0, completed: 0 },
      achievements: achievementsResult.data?.[0] || { users_with_achievements: 0 },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching stats:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch system statistics',
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
        error: 'Export Failed',
        message: result.error || 'Analytics export failed',
      });
    }

    const adminUser = (req as any).adminUser;
    console.log(`[ADMIN] Analytics export triggered by ${adminUser.username}`);

    res.json({
      message: 'Analytics export completed',
      ...((result.data as any) || {}),
    });
  } catch (error) {
    console.error('[ADMIN] Error exporting analytics:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to export analytics',
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
        error: 'Server Error',
        message: 'Failed to fetch modes',
      });
    }

    res.json({
      modes: result.data || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ADMIN] Error listing modes:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch modes',
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

    if (!message) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Message is required',
      });
    }

    res.status(501).json({
      error: 'Not Implemented',
      message: 'Broadcast feature not yet implemented. Coming soon!',
    });
  } catch (error) {
    console.error('[ADMIN] Error broadcasting:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to send broadcast',
    });
  }
});

/**
 * GET /api/admin/logs
 * Get recent system logs
 */
router.get('/logs', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Log viewing not yet implemented. Use PM2 logs or Docker logs instead.',
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching logs:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch logs',
    });
  }
});

export { router as adminStatsRouter };
