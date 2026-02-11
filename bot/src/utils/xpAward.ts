/**
 * Shared XP-award utility.
 * Centralizes XP granting + level calculation so quest-completion
 * and quest-progress use the exact same formula.
 */

import pg from 'pg';

/** XP required per level. Level = Math.floor(totalXp / LEVEL_XP_DIVISOR) + 1 */
export const LEVEL_XP_DIVISOR = 500;

export interface AwardXpResult {
  totalXp: number;
  newLevel: number;
  oldLevel: number;
  leveledUp: boolean;
}

/**
 * Award XP to a user within an existing transaction.
 * Updates total_xp, recalculates level, and updates current_level if leveled up.
 */
export async function awardXp(
  client: pg.PoolClient,
  userId: number,
  xpAmount: number,
): Promise<AwardXpResult> {
  // Increment XP and return updated totals + old level
  const { rows } = await client.query(
    `UPDATE users SET total_xp = total_xp + $1
     WHERE id = $2
     RETURNING total_xp, current_level`,
    [xpAmount, userId],
  );

  const user = rows[0];
  const totalXp: number = user.total_xp;
  const oldLevel: number = user.current_level;
  const newLevel = Math.floor(totalXp / LEVEL_XP_DIVISOR) + 1;
  const leveledUp = newLevel > oldLevel;

  if (leveledUp) {
    await client.query(
      `UPDATE users SET current_level = $1 WHERE id = $2`,
      [newLevel, userId],
    );
  }

  return { totalXp, newLevel, oldLevel, leveledUp };
}
