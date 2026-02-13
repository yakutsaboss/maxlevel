import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module before importing the module under test
vi.mock('../../utils/db.js', () => ({
  queryOne: vi.fn(),
  query: vi.fn(),
}));

import { updateStreak } from '../../utils/streak.js';
import { queryOne } from '../../utils/db.js';

const mockQueryOne = vi.mocked(queryOne);

describe('updateStreak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls queryOne with the correct SQL and params', async () => {
    mockQueryOne.mockResolvedValueOnce({ current_streak: 2 });

    await updateStreak(1, 5);

    expect(mockQueryOne).toHaveBeenCalledTimes(1);
    expect(mockQueryOne).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE streaks'),
      [1, 5],
    );
  });

  it('passes userId as $1 and modeId as $2', async () => {
    mockQueryOne.mockResolvedValueOnce({ current_streak: 1 });

    await updateStreak(42, 3);

    const [, params] = mockQueryOne.mock.calls[0];
    expect(params).toEqual([42, 3]);
  });

  it('SQL handles consecutive day streak increment (yesterday case)', async () => {
    // The SQL CASE checks last_activity_date = yesterday → current_streak + 1
    mockQueryOne.mockResolvedValueOnce({ current_streak: 5 });

    await updateStreak(10, 2);

    const sql = mockQueryOne.mock.calls[0][0] as string;
    expect(sql).toContain('current_streak + 1');
    expect(sql).toContain('ELSE 1'); // gap reset branch
  });

  it('SQL handles gap reset (ELSE 1 branch)', async () => {
    // When last_activity_date is NOT yesterday, streak resets to 1
    mockQueryOne.mockResolvedValueOnce(null); // no row returned (already done today)

    await updateStreak(7, 1);

    const sql = mockQueryOne.mock.calls[0][0] as string;
    expect(sql).toContain('ELSE 1');
  });

  it('SQL skips update if already completed today (IS DISTINCT FROM)', async () => {
    // The WHERE clause includes IS DISTINCT FROM current date to skip same-day updates
    mockQueryOne.mockResolvedValueOnce(null);

    await updateStreak(1, 1);

    const sql = mockQueryOne.mock.calls[0][0] as string;
    expect(sql).toContain('IS DISTINCT FROM');
  });

  it('SQL updates longest_streak using GREATEST', async () => {
    mockQueryOne.mockResolvedValueOnce({ current_streak: 10 });

    await updateStreak(1, 1);

    const sql = mockQueryOne.mock.calls[0][0] as string;
    expect(sql).toContain('GREATEST');
    expect(sql).toContain('longest_streak');
  });

  it('resolves without error when queryOne returns null (same-day no-op)', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    // Should not throw
    await expect(updateStreak(1, 1)).resolves.toBeUndefined();
  });
});
