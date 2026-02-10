/**
 * Admin Job Management Routes
 * GET /jobs, POST /jobs/:name/trigger
 */

import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/adminAuth.js';
import { getJobQueue } from '../../jobs/boss.js';
import { getRegisteredJobs } from '../../jobs/registerJobs.js';
import { logger } from '../utils/logger.js';

const log = logger.child({ component: 'adminJobs' });

const router = Router();

/**
 * GET /api/admin/jobs
 * List registered background jobs and their schedules
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const jobs = getRegisteredJobs();
    res.json({
      success: true,
      data: {
        jobs,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('Error listing jobs', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to list jobs',
    });
  }
});

/**
 * POST /api/admin/jobs/:name/trigger
 * Manually trigger a background job
 */
router.post('/:name/trigger', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const boss = getJobQueue();

    if (!boss) {
      return res.status(503).json({
        success: false,
        error: 'Job queue is not running',
      });
    }

    const registeredJobs = getRegisteredJobs();
    const jobExists = registeredJobs.some(j => j.name === name);

    if (!jobExists) {
      return res.status(404).json({
        success: false,
        error: `Job '${name}' not found. Available: ${registeredJobs.map(j => j.name).join(', ')}`,
      });
    }

    const jobId = await boss.send(name, {});

    const adminUser = (req as any).adminUser;
    log.info(`Job '${name}' triggered by ${adminUser.username}`, { jobId });

    res.json({
      success: true,
      data: {
        message: `Job '${name}' triggered`,
        jobId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('Error triggering job', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger job',
    });
  }
});

export { router as adminJobsRouter };
