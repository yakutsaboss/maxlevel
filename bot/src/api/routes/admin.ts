/**
 * Admin API Routes — Main Router
 * Mounts sub-routers for stats, users, and jobs.
 * All sub-routes require admin authentication.
 */

import { Router } from 'express';
import { authenticateAdmin } from '../middleware/adminAuth.js';
import { adminStatsRouter } from './admin-stats.js';
import { adminUsersRouter } from './admin-users.js';
import { adminJobsRouter } from './admin-jobs.js';
import { adminQuestsRouter } from './admin-quests.js';

const router = Router();

// All admin routes require authentication
router.use(authenticateAdmin);

// Mount sub-routers
router.use('/', adminStatsRouter);           // GET /stats, POST /analytics/export
router.use('/users', adminUsersRouter);      // GET/PATCH/DELETE /users, modes, broadcast, logs
router.use('/jobs', adminJobsRouter);        // GET /jobs, POST /jobs/:name/trigger
router.use('/quests', adminQuestsRouter);    // GET/POST/PATCH/DELETE /quests

export { router as adminRouter };
