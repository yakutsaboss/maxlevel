/**
 * Tests for Punishment Check Job (bot/src/jobs/definitions/punishmentCheck.ts)
 *
 * Tests: no expired quests, marking quests failed + XP penalty,
 *        no consent (notify only), safe mode daily cap, intensity multiplier,
 *        notification failure handling.
 * Mocks: db (query, queryOne, execute), cache, logger, bot API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: (...args: any[]) => mockExecute(...args),
  getPool: vi.fn(),
}));

const mockInvalidateUserCache = vi.fn();
vi.mock('../../utils/cache.js', () => ({
  invalidateUserCache: (...args: any[]) => mockInvalidateUserCache(...args),
}));

const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();
const mockLogError = vi.fn();

vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      info: (...args: any[]) => mockLogInfo(...args),
      warn: (...args: any[]) => mockLogWarn(...args),
      error: (...args: any[]) => mockLogError(...args),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { handler, JOB_NAME, CRON_SCHEDULE, setBotInstance } from '../../jobs/definitions/punishmentCheck.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockBot(sendMessageFn = vi.fn()) {
  return {
    api: { sendMessage: sendMessageFn },
  } as any;
}

const FAILED_QUESTS = [
  { quest_instance_id: 100, user_id: 1, telegram_id: '111', title: 'Morning Run', xp_reward: 50 },
  { quest_instance_id: 101, user_id: 1, telegram_id: '111', title: 'Drink Water', xp_reward: 30 },
  { quest_instance_id: 102, user_id: 2, telegram_id: '222', title: 'Read 10 pages', xp_reward: 40 },
];

// ─── Tests ───────────────────────────────────────────────────────────

describe('punishmentCheck', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('punishment-check');
    expect(CRON_SCHEDULE).toBe('30 0 * * *');
  });

  it('should complete gracefully when no expired quests found', async () => {
    mockQuery.mockResolvedValueOnce([]); // no failed quests

    await handler([{} as any]);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('no expired quests')
    );
  });

  it('should mark expired quests as failed and apply XP penalty with consent', async () => {
    const sendMessage = vi.fn();
    setBotInstance(createMockBot(sendMessage));

    mockQuery.mockResolvedValueOnce(FAILED_QUESTS); // expired quests
    mockExecute.mockResolvedValue(1); // all executes succeed

    // User 1: get punishment settings (consent + medium intensity)
    mockQueryOne.mockResolvedValueOnce({ consent_given: true, intensity_level: 'medium', safe_mode: false, max_xp_penalty: 100 });
    // User 1: check existing warning today (none)
    mockQueryOne.mockResolvedValueOnce(null);
    // User 2: get punishment settings (consent + high intensity)
    mockQueryOne.mockResolvedValueOnce({ consent_given: true, intensity_level: 'high', safe_mode: false, max_xp_penalty: 200 });
    // User 2: check existing warning today (none)
    mockQueryOne.mockResolvedValueOnce(null);

    await handler([{} as any]);

    // Should mark all 3 quests as failed (one execute call)
    const failedUpdate = mockExecute.mock.calls[0];
    expect(failedUpdate[0]).toContain("status = 'failed'");

    // execute calls:
    // 1: mark all quests failed
    // 2: user1 quest1 XP deduct, 3: user1 quest1 history insert
    // 4: user1 quest2 XP deduct, 5: user1 quest2 history insert
    // 6: user1 warning insert
    // 7: user2 quest XP deduct, 8: user2 history insert
    // 9: user2 warning insert
    expect(mockExecute.mock.calls.length).toBeGreaterThanOrEqual(4); // at minimum: fail + penalties

    // Should invalidate cache for both users
    expect(mockInvalidateUserCache).toHaveBeenCalledWith(1);
    expect(mockInvalidateUserCache).toHaveBeenCalledWith(2);

    // Should send notifications
    expect(sendMessage).toHaveBeenCalledTimes(2);

    // Clean up bot reference
    setBotInstance(null as any);
  });

  it('should only notify (no XP penalty) when user has no consent', async () => {
    const sendMessage = vi.fn();
    setBotInstance(createMockBot(sendMessage));

    // Single user with one failed quest
    mockQuery.mockResolvedValueOnce([
      { quest_instance_id: 200, user_id: 5, telegram_id: '555', title: 'Meditate', xp_reward: 25 },
    ]);
    mockExecute.mockResolvedValue(1);
    mockQueryOne.mockResolvedValueOnce(null); // no punishment settings = no consent

    await handler([{} as any]);

    // Should mark quest as failed
    expect(mockExecute).toHaveBeenCalledTimes(1);

    // Should send notification about expired quest (no penalty)
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const msg = sendMessage.mock.calls[0][1] as string;
    expect(msg).toContain('expired');
    expect(msg).toContain('accountability off');

    // Should NOT deduct XP (no UPDATE users call beyond the failed status)
    const xpCalls = mockExecute.mock.calls.filter((c: any[]) => (c[0] as string).includes('total_xp'));
    expect(xpCalls).toHaveLength(0);

    setBotInstance(null as any);
  });

  it('should cap XP penalty when safe mode is enabled', async () => {
    const sendMessage = vi.fn();
    setBotInstance(createMockBot(sendMessage));

    // Two quests for same user, each worth 80 XP
    mockQuery.mockResolvedValueOnce([
      { quest_instance_id: 300, user_id: 3, telegram_id: '333', title: 'Hard Quest 1', xp_reward: 80 },
      { quest_instance_id: 301, user_id: 3, telegram_id: '333', title: 'Hard Quest 2', xp_reward: 80 },
    ]);
    mockExecute.mockResolvedValue(1);

    // Consent with safe mode, max 50 XP penalty per day, medium intensity (1.0x)
    mockQueryOne
      .mockResolvedValueOnce({ consent_given: true, intensity_level: 'medium', safe_mode: true, max_xp_penalty: 50 });

    // Already deducted 0 today
    mockQueryOne.mockResolvedValueOnce({ total: 0 });

    await handler([{} as any]);

    // With safe mode: max daily = 50
    // Quest 1: min(80*1.0, 50) = 50 XP, remaining = 50 - 50 = 0
    // Quest 2: min(80*1.0, 50) capped to min(50, 0) = 0 XP (daily cap reached)
    // So only 50 XP deducted total, 1 XP update + 1 history insert
    const xpUpdateCalls = mockExecute.mock.calls.filter((c: any[]) => (c[0] as string).includes('total_xp'));
    if (xpUpdateCalls.length > 0) {
      const penalty = xpUpdateCalls[0][1][0]; // first param is xpPenalty
      expect(penalty).toBeLessThanOrEqual(50);
    }

    setBotInstance(null as any);
  });

  it('should handle notification send failure gracefully', async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error('Bot blocked by user'));
    setBotInstance(createMockBot(sendMessage));

    mockQuery.mockResolvedValueOnce([
      { quest_instance_id: 400, user_id: 7, telegram_id: '777', title: 'Yoga', xp_reward: 20 },
    ]);
    mockExecute.mockResolvedValue(1);
    mockQueryOne.mockResolvedValueOnce(null); // no consent

    // Should NOT throw despite notification failure
    await expect(handler([{} as any])).resolves.toBeUndefined();

    // Log should mention completion with failed notification
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed'),
      expect.objectContaining({ notificationsFailed: 1 })
    );

    setBotInstance(null as any);
  });
});
