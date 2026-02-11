import { describe, it, expect, vi, beforeEach } from 'vitest';
import { awardXp, LEVEL_XP_DIVISOR } from '../../utils/xpAward.js';

/** Helper: creates a mock PoolClient whose query() returns configurable rows. */
function createMockClient(totalXpAfterUpdate: number, currentLevel: number) {
  const queryFn = vi.fn();

  // First call: UPDATE users … RETURNING total_xp, current_level
  queryFn.mockResolvedValueOnce({
    rows: [{ total_xp: totalXpAfterUpdate, current_level: currentLevel }],
  });

  // Second call (if level-up): UPDATE users SET current_level
  queryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

  return { query: queryFn } as any;
}

describe('LEVEL_XP_DIVISOR', () => {
  it('equals 500', () => {
    expect(LEVEL_XP_DIVISOR).toBe(500);
  });
});

describe('awardXp', () => {
  it('awards XP and returns correct totals', async () => {
    const client = createMockClient(250, 1);
    const result = await awardXp(client, 1, 250);

    expect(result.totalXp).toBe(250);
    expect(result.newLevel).toBe(1);
    expect(result.oldLevel).toBe(1);
    expect(result.leveledUp).toBe(false);
  });

  it('detects level-up at threshold (499 → 500 XP triggers level 2)', async () => {
    // User had 499 XP (level 1), gains 1 → total 500 → level 2
    const client = createMockClient(500, 1);
    const result = await awardXp(client, 1, 1);

    expect(result.totalXp).toBe(500);
    expect(result.newLevel).toBe(2);
    expect(result.oldLevel).toBe(1);
    expect(result.leveledUp).toBe(true);

    // Should have issued a second UPDATE for current_level
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET current_level'),
      [2, 1],
    );
  });

  it('does not level up when XP stays below threshold', async () => {
    // User at 400 XP (level 1), gains 50 → total 450 → still level 1
    const client = createMockClient(450, 1);
    const result = await awardXp(client, 5, 50);

    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(1);
    // Only one query (the UPDATE RETURNING), no level-up UPDATE
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('handles multi-level jump correctly', async () => {
    // User at 0 XP (level 1), gains 1500 → total 1500 → level 4
    const client = createMockClient(1500, 1);
    const result = await awardXp(client, 10, 1500);

    expect(result.totalXp).toBe(1500);
    expect(result.newLevel).toBe(4);
    expect(result.oldLevel).toBe(1);
    expect(result.leveledUp).toBe(true);

    // Should update current_level to 4
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET current_level'),
      [4, 10],
    );
  });

  it('passes correct params to the XP UPDATE query', async () => {
    const client = createMockClient(100, 1);
    await awardXp(client, 42, 75);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('total_xp = total_xp + $1'),
      [75, 42],
    );
  });

  it('returns oldLevel from the DB row, not a recalculation', async () => {
    // DB says current_level = 3, but XP is 1600 (level would be 4)
    // This tests that oldLevel comes from the DB (current_level), not from XP math
    const client = createMockClient(1600, 3);
    const result = await awardXp(client, 1, 100);

    expect(result.oldLevel).toBe(3);
    expect(result.newLevel).toBe(4);
    expect(result.leveledUp).toBe(true);
  });

  it('level formula matches Math.floor(totalXp / 500) + 1 for edge values', async () => {
    // Test at exact boundaries
    const cases = [
      { xp: 0, expectedLevel: 1 },
      { xp: 499, expectedLevel: 1 },
      { xp: 500, expectedLevel: 2 },
      { xp: 501, expectedLevel: 2 },
      { xp: 999, expectedLevel: 2 },
      { xp: 1000, expectedLevel: 3 },
    ];

    for (const { xp, expectedLevel } of cases) {
      const client = createMockClient(xp, 1);
      const result = await awardXp(client, 1, xp);
      expect(result.newLevel).toBe(expectedLevel);
    }
  });
});
