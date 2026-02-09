/**
 * Tests for /profile bot command handler (bot/src/handlers/profile.ts)
 *
 * Mocks: db (query, queryOne), Grammy context (ctx.reply, ctx.from)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  getPool: vi.fn(),
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { handleProfile } from '../../handlers/profile.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockCtx(telegramId?: number, firstName?: string) {
  return {
    from: telegramId
      ? { id: telegramId, first_name: firstName || 'TestUser' }
      : undefined,
    reply: vi.fn(),
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('handleProfile', () => {
  it('should send profile with full user data (modes, streaks, achievements)', async () => {
    const mockUser = {
      id: 1,
      telegram_id: 123456789,
      username: 'testuser',
      first_name: 'Alice',
      current_level: 5,
      total_xp: 2500,
      timezone: 'UTC',
      created_at: '2025-01-01T00:00:00Z',
    };

    const mockModes = [
      { display_name: 'Fitness', icon_emoji: '💪' },
      { display_name: 'Hydration', icon_emoji: '💧' },
    ];

    const mockStreaks = [
      { current_streak: 7, longest_streak: 14, display_name: 'Fitness', icon_emoji: '💪' },
    ];

    const mockAchievementCount = { count: 3 };

    // queryOne for user lookup
    mockQueryOne.mockResolvedValueOnce(mockUser);
    // query for modes
    mockQuery.mockResolvedValueOnce(mockModes);
    // query for streaks
    mockQuery.mockResolvedValueOnce(mockStreaks);
    // queryOne for achievement count
    mockQueryOne.mockResolvedValueOnce(mockAchievementCount);

    const ctx = createMockCtx(123456789, 'Alice');
    await handleProfile(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const msg = ctx.reply.mock.calls[0][0] as string;
    const opts = ctx.reply.mock.calls[0][1];

    // Profile header
    expect(msg).toContain("Alice's Profile");
    // Level and XP
    expect(msg).toContain('Level 5');
    expect(msg).toContain('Total XP: 2500');
    // Modes
    expect(msg).toContain('Fitness');
    expect(msg).toContain('Hydration');
    // Streaks
    expect(msg).toContain('7 days');
    expect(msg).toContain('best: 14');
    // Achievements
    expect(msg).toContain('3 unlocked');
    // Joined date
    expect(msg).toContain('Joined');
    // Parse mode
    expect(opts.parse_mode).toBe('Markdown');
  });

  it('should show "no active modes" when user has no modes', async () => {
    const mockUser = {
      id: 1,
      telegram_id: 123456789,
      username: 'testuser',
      first_name: 'Bob',
      current_level: 1,
      total_xp: 0,
      timezone: 'UTC',
      created_at: '2025-06-01T00:00:00Z',
    };

    mockQueryOne.mockResolvedValueOnce(mockUser);
    mockQuery.mockResolvedValueOnce([]);  // no modes
    mockQuery.mockResolvedValueOnce([]);  // no streaks
    mockQueryOne.mockResolvedValueOnce({ count: 0 });  // no achievements

    const ctx = createMockCtx(123456789, 'Bob');
    await handleProfile(ctx);

    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('No active modes');
    expect(msg).toContain('0 unlocked');
  });

  it('should reply with "not found" when user does not exist', async () => {
    mockQueryOne.mockResolvedValueOnce(null);  // user not found

    const ctx = createMockCtx(999999999, 'Nobody');
    await handleProfile(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Profile not found. Use /start to create your account.');
    // Should NOT call further queries
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should reply with error when ctx.from is missing', async () => {
    const ctx = createMockCtx();  // no from
    await handleProfile(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('Could not identify your Telegram account.');
    expect(mockQueryOne).not.toHaveBeenCalled();
  });

  it('should handle DB error gracefully', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('Connection refused'));

    const ctx = createMockCtx(123456789);
    await handleProfile(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('Failed to load profile. Try again later.');
  });

  it('should handle null streaks/achievements gracefully', async () => {
    const mockUser = {
      id: 1,
      telegram_id: 123456789,
      username: 'testuser',
      first_name: 'Charlie',
      current_level: 2,
      total_xp: 150,
      timezone: 'UTC',
      created_at: '2025-03-15T00:00:00Z',
    };

    mockQueryOne.mockResolvedValueOnce(mockUser);
    mockQuery.mockResolvedValueOnce([]);  // no modes
    mockQuery.mockResolvedValueOnce([
      { current_streak: null, longest_streak: null, display_name: 'Reading', icon_emoji: '📚' },
    ]);
    mockQueryOne.mockResolvedValueOnce(null);  // null achievement count

    const ctx = createMockCtx(123456789, 'Charlie');
    await handleProfile(ctx);

    const msg = ctx.reply.mock.calls[0][0] as string;
    // Null streak should default to 0
    expect(msg).toContain('0 days');
    expect(msg).toContain('best: 0');
    // Null achievement count should default to 0
    expect(msg).toContain('0 unlocked');
  });
});
