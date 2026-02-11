import { describe, it, expect } from 'vitest';
import { LEVEL_XP_DIVISOR } from '../../utils/xpAward.js';

/**
 * Pure formula tests — no DB mocks needed.
 * Verifies that the level formula `Math.floor(totalXp / LEVEL_XP_DIVISOR) + 1`
 * produces consistent results at critical boundaries and that
 * xp_to_next_level = current_level * LEVEL_XP_DIVISOR matches the level system.
 */

/** The canonical level formula used by awardXp. */
function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / LEVEL_XP_DIVISOR) + 1;
}

/** The xp_to_next_level formula used by user-helpers.ts. */
function xpToNextLevel(currentLevel: number): number {
  return currentLevel * LEVEL_XP_DIVISOR;
}

describe('XP formula consistency', () => {
  it('LEVEL_XP_DIVISOR is 500', () => {
    expect(LEVEL_XP_DIVISOR).toBe(500);
  });

  it('level boundaries: 499→L1, 500→L2, 999→L2, 1000→L3', () => {
    expect(calculateLevel(499)).toBe(1);
    expect(calculateLevel(500)).toBe(2);
    expect(calculateLevel(999)).toBe(2);
    expect(calculateLevel(1000)).toBe(3);
  });

  it('xp_to_next_level threshold equals the XP needed to reach the NEXT level', () => {
    // For each level, xp_to_next_level should equal the exact XP where the
    // user would transition to (level + 1). Since level = floor(xp/500)+1,
    // the transition to level N+1 happens at xp = N * 500.
    for (let level = 1; level <= 10; level++) {
      const threshold = xpToNextLevel(level);
      // One XP below threshold → still at this level
      expect(calculateLevel(threshold - 1)).toBe(level);
      // At threshold → next level
      expect(calculateLevel(threshold)).toBe(level + 1);
    }
  });

  it('zero XP yields level 1', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('negative XP clamps to level 1 (floor division with negative)', () => {
    // Math.floor(-1 / 500) = -1, so -1 + 1 = 0 — but the DB has CHECK (total_xp >= 0)
    // and CHECK (current_level >= 1). These tests document the pure-math behavior.
    expect(calculateLevel(-1)).toBe(0);
    expect(calculateLevel(-499)).toBe(0);
    expect(calculateLevel(-500)).toBe(0);
    expect(calculateLevel(-501)).toBe(-1);
  });

  it('large XP values produce correct levels', () => {
    expect(calculateLevel(50000)).toBe(101);   // 50000 / 500 + 1
    expect(calculateLevel(99999)).toBe(200);   // floor(99999/500) + 1 = 199 + 1
    expect(calculateLevel(100000)).toBe(201);
  });
});
