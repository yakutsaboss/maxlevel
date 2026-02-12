/**
 * Admin Job Management Routes
 * GET /jobs, POST /jobs/:name/trigger
 */

import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/adminAuth.js';
import { getJobQueue } from '../../jobs/boss.js';
import { getRegisteredJobs } from '../../jobs/registerJobs.js';
import { asyncHandler, successResponse, NotFoundError, ApiError, InternalServerError } from '../utils/errors.js';
import { logger } from '../../utils/logger.js';

const log = logger.child({ component: 'adminJobs' });

const router = Router();

/**
 * GET /api/admin/jobs
 * List registered background jobs and their schedules
 */
router.get('/', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  let jobs;
  try {
    jobs = getRegisteredJobs();
  } catch (err) {
    log.error('Error listing jobs', err as Error);
    throw new InternalServerError('Failed to list jobs');
  }
  res.json(successResponse({
    jobs,
    timestamp: new Date().toISOString(),
  }));
}));

/**
 * POST /api/admin/jobs/:name/trigger
 * Manually trigger a background job
 */
router.post('/:name/trigger', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const boss = getJobQueue();

  if (!boss) {
    throw new ApiError('Job queue is not running', 503);
  }

  const registeredJobs = getRegisteredJobs();
  const jobExists = registeredJobs.some(j => j.name === name);

  if (!jobExists) {
    throw new NotFoundError(
      `Job '${name}' not found. Available: ${registeredJobs.map(j => j.name).join(', ')}`
    );
  }

  let jobId;
  try {
    jobId = await boss.send(name, {});
  } catch (err) {
    log.error('Error triggering job', err as Error);
    throw new InternalServerError('Failed to trigger job');
  }

  const adminUser = req.adminUser!;
  log.info(`Job '${name}' triggered by ${adminUser.username}`, { jobId });

  res.json(successResponse({
    message: `Job '${name}' triggered`,
    jobId,
    timestamp: new Date().toISOString(),
  }));
}));

export { router as adminJobsRouter };
