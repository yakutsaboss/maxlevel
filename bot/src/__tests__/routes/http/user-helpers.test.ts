/**
 * Unit tests for user-helpers (bot/src/api/routes/user-helpers.ts)
 *
 * Tests the resolveUser helper function that looks up users by telegram_id
 * with streak + quest count in a single SQL query.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (hoisted before any import) ──────────────────────────────

const mockQueryOne = vi.fn();

vi.mock('../../../utils/db.js', () => ({
  queryOne: (...args: any[]) => mockQueryOne(...args),
}));

// ─── Import after mocks ────────────────────────────────────────────

import { resolveUser } from '../../../api/routes/user-helpers.js';

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('resolveUser', () => {
  const mockDbRow = {
    id: 1,
    telegram_id: 111,
    username: 'alice',
    first_name: 'Alice',
    avatar_id: 3,
    current_level: 5,
    total_xp: 2000,
    is_active: true,
    timezone: 'UTC',
    created_at: '2025-01-01',
    current_streak: 7,
    longest_streak: 14,
    total_quests_completed: 42,
  };

  it('should return user for valid telegramId', async () => {
    mockQueryOne.mockResolvedValueOnce(mockDbRow);

    const user = await resolveUser('111');

    expect(user).not.toBeNull();
    expect(user!.telegram_id).toBe(111);
    expect(user!.first_name).toBe('Alice');
    expect(mockQueryOne).toHaveBeenCalledOnce();
  });

  it('should return null for non-existent user', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const user = await resolveUser('999');

    expect(user).toBeNull();
    expect(mockQueryOne).toHaveBeenCalledOnce();
  });

  it('should return null for NaN telegramId without querying DB', async () => {
    const user = await resolveUser('abc');

    expect(user).toBeNull();
    expect(mockQueryOne).not.toHaveBeenCalled();
  });

  it('should return all expected fields with correct mapping', async () => {
    mockQueryOne.mockResolvedValueOnce(mockDbRow);

    const user = await resolveUser('111');

    expect(user).toMatchObject({
      id: 1,
      telegram_id: 111,
      username: 'alice',
      first_name: 'Alice',
      last_name: null,
      avatar_id: 3,
      level: 5,
      xp: 2000,
      xp_to_next_level: 2500,   // current_level(5) * LEVEL_XP_DIVISOR(500)
      total_quests_completed: 42,
      current_streak: 7,
      longest_streak: 14,
      created_at: '2025-01-01',
    });
  });

  it('should compute xp_to_next_level as level * LEVEL_XP_DIVISOR', async () => {
    mockQueryOne.mockResolvedValueOnce({
      ...mockDbRow,
      current_level: 10,
      avatar_id: null,
    });

    const user = await resolveUser('111');

    expect(user!.xp_to_next_level).toBe(5000);
    expect(user!.avatar_id).toBeNull();
  });
});
