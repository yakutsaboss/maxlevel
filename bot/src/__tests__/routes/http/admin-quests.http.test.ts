/**
 * HTTP integration tests for admin quest routes (bot/src/api/routes/admin-quests.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 * Covers 4 endpoints: list, create, update, delete quest templates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';
import { getMockDb } from '../../helpers/httpMocks.js';

// ─── Mocks (hoisted before any route import) ───────────────────────

vi.mock('../../../utils/db.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../../api/middleware/adminAuth.js', () => ({
  requirePermission: () => (req: any, _res: any, next: any) => {
    req.adminUser = {
      id: 'testadmin',
      username: 'testadmin',
      role: 'super_admin',
      permissions: ['*'],
    };
    next();
  },
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('../../../utils/sqlBuilder.js', () => ({
  buildDynamicUpdate: vi.fn(),
}));

// ─── Import router + mock refs after mocks ──────────────────────────

import { adminQuestsRouter } from '../../../api/routes/admin-quests.js';
import { buildDynamicUpdate } from '../../../utils/sqlBuilder.js';

const db = getMockDb();
const mockBuildDynamicUpdate = buildDynamicUpdate as ReturnType<typeof vi.fn>;

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/admin/quests', adminQuestsRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET / (list quest templates) ──────────────────────────────────

describe('GET /api/admin/quests', () => {
  it('should return 200 with quest template list', async () => {
    db.query.mockResolvedValueOnce([
      { id: 1, title: 'Morning Run', quest_type: 'daily', mode_name: 'fitness', mode_display_name: 'Fitness', mode_icon: '💪' },
      { id: 2, title: 'Weekly Review', quest_type: 'weekly', mode_name: 'productivity', mode_display_name: 'Productivity', mode_icon: '📋' },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/quests')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.quests).toHaveLength(2);
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('should filter by mode_id when provided', async () => {
    db.query.mockResolvedValueOnce([
      { id: 1, title: 'Morning Run', quest_type: 'daily', mode_name: 'fitness' },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/quests?mode_id=1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.quests).toHaveLength(1);
    // Verify the query was called with the mode_id param
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('q.mode_id = $1'),
      [1],
    );
  });

  it('should filter by quest_type when provided', async () => {
    db.query.mockResolvedValueOnce([]);

    await request(buildApp())
      .get('/api/admin/quests?quest_type=daily')
      .expect(200);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('q.quest_type = $1'),
      ['daily'],
    );
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/admin/quests')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

// ─── POST / (create quest template) ────────────────────────────────

describe('POST /api/admin/quests', () => {
  it('should return 201 when creating a valid quest template', async () => {
    db.queryOne.mockResolvedValueOnce({
      id: 5,
      title: 'New Quest',
      quest_type: 'daily',
      xp_reward: 50,
    });

    const res = await request(buildApp())
      .post('/api/admin/quests')
      .send({ title: 'New Quest', quest_type: 'daily', xp_reward: 50 })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Quest template created successfully');
    expect(res.body.data.quest.id).toBe(5);
  });

  it('should return 400 when title is missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/quests')
      .send({ quest_type: 'daily' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing required fields');
  });

  it('should return 400 when quest_type is missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/quests')
      .send({ title: 'Some Quest' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing required fields');
  });

  it('should return 400 for invalid quest_type', async () => {
    const res = await request(buildApp())
      .post('/api/admin/quests')
      .send({ title: 'Bad Quest', quest_type: 'monthly' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('quest_type must be');
  });

  it('should return 400 for invalid difficulty', async () => {
    const res = await request(buildApp())
      .post('/api/admin/quests')
      .send({ title: 'Bad Quest', quest_type: 'daily', difficulty: 'impossible' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('difficulty must be');
  });
});

// ─── PATCH /:id (update quest template) ─────────────────────────────

describe('PATCH /api/admin/quests/:id', () => {
  it('should return 200 when updating a quest template', async () => {
    mockBuildDynamicUpdate.mockReturnValueOnce({
      text: 'UPDATE quests SET title = $1 WHERE id = $2',
      values: ['Updated Title', 1],
    });

    db.queryOne.mockResolvedValueOnce({
      id: 1,
      title: 'Updated Title',
      quest_type: 'daily',
    });

    const res = await request(buildApp())
      .patch('/api/admin/quests/1')
      .send({ title: 'Updated Title' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Quest template updated successfully');
    expect(res.body.data.quest.title).toBe('Updated Title');
  });

  it('should return 400 when no valid fields provided', async () => {
    const res = await request(buildApp())
      .patch('/api/admin/quests/1')
      .send({ unknown_field: 'value' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('No valid fields to update');
  });

  it('should return 400 for invalid quest_type in update', async () => {
    const res = await request(buildApp())
      .patch('/api/admin/quests/1')
      .send({ quest_type: 'monthly' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('quest_type must be');
  });

  it('should return 404 when quest template not found', async () => {
    mockBuildDynamicUpdate.mockReturnValueOnce({
      text: 'UPDATE quests SET title = $1 WHERE id = $2',
      values: ['Updated Title', 999],
    });

    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/admin/quests/999')
      .send({ title: 'Updated Title' })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Quest template not found');
  });
});

// ─── DELETE /:id (delete quest template) ─────────────────────────────

describe('DELETE /api/admin/quests/:id', () => {
  it('should return 200 when deleting a quest with no instances', async () => {
    // First queryOne: find the quest
    db.queryOne.mockResolvedValueOnce({ id: 1, title: 'Old Quest' });
    // Second queryOne: check instance count
    db.queryOne.mockResolvedValueOnce({ count: 0 });
    // execute: DELETE
    db.execute.mockResolvedValueOnce(undefined);

    const res = await request(buildApp())
      .delete('/api/admin/quests/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Quest template deleted successfully');
    expect(res.body.data.deletedQuest.id).toBe(1);
    expect(res.body.data.deletedQuest.title).toBe('Old Quest');
  });

  it('should return 404 when quest template not found', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .delete('/api/admin/quests/999')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Quest template not found');
  });

  it('should return 400 when quest has existing instances', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1, title: 'Active Quest' });
    db.queryOne.mockResolvedValueOnce({ count: 5 });

    const res = await request(buildApp())
      .delete('/api/admin/quests/1')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Cannot delete quest template');
    expect(res.body.error).toContain('5 instance(s)');
  });
});
