/**
 * Tests for /leaderboard bot command handler
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

import { handleLeaderboard } from '../../handlers/leaderboard.js';

// ─── Helpers ────────────────────────────────────────────────────────

function createMockCtx(telegramId?: number) {
  return {
    from: telegramId ? { id: telegramId } : undefined,
    reply: vi.fn(),
  } as any;
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────

describe('handleLeaderboard', () => {
  it('should send top 10 message with medals', async () => {
    const top10 = [
      { username: 'alice', first_name: 'Alice', current_level: 10, total_xp: 5000, xp_rank: '1' },
      { username: 'bob', first_name: 'Bob', current_level: 8, total_xp: 4000, xp_rank: '2' },
      { username: 'charlie', first_name: 'Charlie', current_level: 6, total_xp: 3000, xp_rank: '3' },
    ];

    mockQuery.mockResolvedValueOnce(top10);
    mockQueryOne.mockResolvedValueOnce({ username: 'testuser', first_name: 'Test', current_level: 3, total_xp: 500, xp_rank: '15' });

    const ctx = createMockCtx(123456789);
    await handleLeaderboard(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const msg = ctx.reply.mock.calls[0][0] as string;

    expect(msg).toContain('Leaderboard');
    expect(msg).toContain('Alice');
    expect(msg).toContain('Bob');
    expect(msg).toContain('Charlie');
    // User is rank 15 (not in top 10), should be appended
    expect(msg).toContain('Test');
    expect(msg).toContain('15.');
  });

  it('should show user rank when not in top 10', async () => {
    const top10 = Array.from({ length: 10 }, (_, i) => ({
      username: `user${i + 1}`,
      first_name: `User ${i + 1}`,
      current_level: 10 - i,
      total_xp: 5000 - i * 400,
      xp_rank: String(i + 1),
    }));

    mockQuery.mockResolvedValueOnce(top10);
    mockQueryOne.mockResolvedValueOnce({
      username: 'myuser',
      first_name: 'Me',
      current_level: 2,
      total_xp: 100,
      xp_rank: '42',
    });

    const ctx = createMockCtx(999);
    await handleLeaderboard(ctx);

    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('42.');
    expect(msg).toContain('Me');
  });

  it('should handle empty leaderboard', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const ctx = createMockCtx(123456789);
    await handleLeaderboard(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('The leaderboard is empty. Be the first to earn XP!');
  });

  it('should handle DB error gracefully', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));

    const ctx = createMockCtx(123456789);
    await handleLeaderboard(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('Failed to load leaderboard. Try again later.');
  });

  it('should handle missing ctx.from', async () => {
    const ctx = createMockCtx(); // no telegramId

    await handleLeaderboard(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('Could not identify your Telegram account.');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should not show user rank line when user is in top 10', async () => {
    const top10 = [
      { username: 'testuser', first_name: 'Test', current_level: 10, total_xp: 5000, xp_rank: '1' },
    ];

    mockQuery.mockResolvedValueOnce(top10);
    mockQueryOne.mockResolvedValueOnce({
      username: 'testuser',
      first_name: 'Test',
      current_level: 10,
      total_xp: 5000,
      xp_rank: '1',
    });

    const ctx = createMockCtx(123456789);
    await handleLeaderboard(ctx);

    const msg = ctx.reply.mock.calls[0][0] as string;
    // Rank 1 should not trigger the "rank > 10" section
    expect(msg).not.toContain('---');
  });
});
