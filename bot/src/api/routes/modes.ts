import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { query, queryOne, execute } from '../../utils/db.js';
import { cached, TTL } from '../../utils/cache.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';
import {
  getUserEffectiveTier,
  MODE_LIMITS,
  isModeFreeOrUnlocked,
  getUserUnlockedModes,
  FREE_MODES,
  PAID_MODES,
  MODE_PRICES,
} from '../middleware/premiumGate.js';
import { logger } from '../../utils/logger.js';

const router = Router();
const log = logger.child({ component: 'modes' });

/**
 * GET /api/modes
 * Get all available modes. Cached — modes almost never change.
 */
router.get('/', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const modes = await cached('modes:all', TTL.MEDIUM, () =>
    query(`SELECT id, name, display_name, description, icon_emoji AS icon FROM modes ORDER BY id`)
  );

  res.json(successResponse({ modes, count: modes.length }));
}));

/**
 * GET /api/modes/unlocks/:userId
 * Get list of unlocked modes for a user (free + purchased).
 */
router.get('/unlocks/:userId', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId === 0) {
    throw new BadRequestError('Invalid userId');
  }

  const unlockedModes = await getUserUnlockedModes(userId);

  // Also get user XP for frontend display
  const user = await queryOne<{ total_xp: number }>(
    `SELECT total_xp FROM users WHERE id = $1`,
    [userId],
  );

  res.json(successResponse({
    unlockedModes,
    userXP: user?.total_xp ?? 0,
    freeModes: FREE_MODES,
    paidModes: PAID_MODES,
    modePrices: MODE_PRICES,
  }));
}));

/**
 * POST /api/modes/unlock
 * Unlock a paid mode with Stars or XP.
 * Input: { userId, modeName, method: 'stars' | 'xp' }
 */
router.post('/unlock', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const { userId, modeName, method } = req.body;

  if (!userId || !modeName || !method) {
    throw new BadRequestError('Missing required fields: userId, modeName, method');
  }

  const numericUserId = typeof userId === 'string' ? safeParseInt(userId, 0) : userId;
  if (!numericUserId || numericUserId <= 0) {
    throw new BadRequestError('userId must be a positive integer');
  }

  if (!['stars', 'xp'].includes(method)) {
    throw new BadRequestError('method must be "stars" or "xp"');
  }

  if (!PAID_MODES.includes(modeName)) {
    throw new BadRequestError(`Mode "${modeName}" is not a paid mode. Free modes: ${FREE_MODES.join(', ')}`);
  }

  const prices = MODE_PRICES[modeName];
  if (!prices) {
    throw new BadRequestError(`No pricing configured for mode: ${modeName}`);
  }

  // Check if already unlocked
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM mode_unlocks WHERE user_id = $1 AND mode_name = $2`,
    [numericUserId, modeName],
  );
  if (existing) {
    throw new BadRequestError(`Mode "${modeName}" is already unlocked`);
  }

  // Verify user exists
  const user = await queryOne<{ id: number; total_xp: number }>(
    `SELECT id, total_xp FROM users WHERE id = $1`,
    [numericUserId],
  );
  if (!user) {
    throw new NotFoundError(`User ${numericUserId} not found`);
  }

  if (method === 'xp') {
    // XP unlock — atomic deduction
    const requiredXP = prices.xp;

    const result = await queryOne<{ total_xp: number }>(
      `UPDATE users SET total_xp = total_xp - $1 WHERE id = $2 AND total_xp >= $1 RETURNING total_xp`,
      [requiredXP, numericUserId],
    );

    if (!result) {
      throw new BadRequestError(
        `Insufficient XP. Need ${requiredXP} XP, you have ${user.total_xp} XP.`
      );
    }

    // Insert unlock record
    await execute(
      `INSERT INTO mode_unlocks (user_id, mode_name, unlock_method, amount_paid)
       VALUES ($1, $2, 'xp', $3)`,
      [numericUserId, modeName, requiredXP],
    );

    log.info('Mode unlocked with XP', { userId: numericUserId, modeName, xpPaid: requiredXP, remainingXP: result.total_xp });

    res.json(successResponse({
      unlocked: true,
      modeName,
      method: 'xp',
      xpPaid: requiredXP,
      remainingXP: result.total_xp,
    }, `Mode "${modeName}" unlocked with ${requiredXP} XP`));

  } else {
    // Stars unlock — create payment + invoice
    const starsAmount = prices.stars;

    // Create pending payment record
    const payment = await queryOne<{ id: number; status: string; created_at: string }>(
      `INSERT INTO payments (user_id, amount, currency, status, provider, metadata)
       VALUES ($1, $2, 'XTR', 'pending', 'telegram_stars', $3)
       RETURNING id, status, created_at`,
      [numericUserId, starsAmount, JSON.stringify({ type: 'mode_unlock', mode_name: modeName })],
    );

    // Create Telegram Stars invoice
    const modeLabel = modeName.charAt(0).toUpperCase() + modeName.slice(1);
    let invoiceUrl: string;
    try {
      const { bot } = await import('../../bot.js');
      invoiceUrl = await bot.api.createInvoiceLink(
        `Unlock ${modeLabel} Mode`,
        `Unlock ${modeLabel} mode — track your ${modeName} habits and quests`,
        JSON.stringify({ payment_id: payment!.id, type: 'mode_unlock', mode_name: modeName }),
        '',       // provider_token: empty for Telegram Stars
        'XTR',    // currency: Telegram Stars
        [{ label: `${modeLabel} Mode`, amount: starsAmount }],
      );
    } catch (err) {
      log.error('Failed to create mode unlock invoice', { paymentId: payment?.id, error: err });
      await execute(`UPDATE payments SET status = 'failed', updated_at = NOW() WHERE id = $1`, [payment!.id]);
      throw new BadRequestError('Failed to create Telegram Stars invoice. Please try again.');
    }

    log.info('Mode unlock invoice created', { paymentId: payment?.id, userId: numericUserId, modeName, starsAmount, invoiceUrl });

    res.status(201).json(successResponse({
      unlocked: false, // Not yet — pending payment
      modeName,
      method: 'stars',
      payment_id: payment?.id,
      amount: starsAmount,
      currency: 'XTR',
      invoice_url: invoiceUrl,
    }, `Invoice created for ${modeLabel} mode unlock (${starsAmount} Stars)`));
  }
}));

/**
 * GET /api/users/:userId/modes
 * Get user's active modes
 */
router.get('/users/:userId', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);

  const rows = await query(
    `SELECT um.id, um.user_id, um.mode_id, um.is_active, um.enabled_at,
            m.name, m.display_name, m.description, m.icon_emoji AS icon
     FROM user_modes um
     JOIN modes m ON um.mode_id = m.id
     WHERE um.user_id = $1 AND um.is_active = true`,
    [userId]
  );

  res.json(successResponse({ modes: rows, count: rows.length }));
}));

/**
 * GET /api/users/:userId/modes/summary
 * Get mode summary with quest counts
 */
router.get('/users/:userId/summary', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);

  const rows = await query(
    `SELECT m.id, m.name, m.display_name, m.icon_emoji AS icon,
            COALESCE(qi_active.count, 0)::int AS active_quests,
            COALESCE(qi_done.count, 0)::int AS completed_quests
     FROM user_modes um
     JOIN modes m ON um.mode_id = m.id
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS count FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       WHERE qi.user_id = $1 AND q.mode_id = m.id
         AND qi.status IN ('pending', 'ready', 'in_progress')
     ) qi_active ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS count FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       WHERE qi.user_id = $1 AND q.mode_id = m.id AND qi.status = 'completed'
     ) qi_done ON true
     WHERE um.user_id = $1 AND um.is_active = true`,
    [userId]
  );

  res.json(successResponse({ summary: rows }));
}));

/**
 * POST /api/users/:userId/modes
 * Add modes to user.
 * Now validates per-mode unlock status instead of tier-based limits only.
 */
router.post('/users/:userId', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  const { modes } = req.body;

  if (!modes || !Array.isArray(modes) || modes.length === 0) {
    throw new BadRequestError('Invalid modes array');
  }

  // Check that all requested modes are either free or unlocked
  const modeNames = modes.map((m: string) => String(m).trim());
  for (const modeName of modeNames) {
    const allowed = await isModeFreeOrUnlocked(userId, modeName);
    if (!allowed) {
      const prices = MODE_PRICES[modeName];
      throw new BadRequestError(
        `Mode "${modeName}" requires unlock. ` +
        (prices ? `Cost: ${prices.stars} Stars or ${prices.xp} XP.` : 'Contact support.')
      );
    }
  }

  // Still enforce tier-based mode limit as a secondary check
  const userTier = await getUserEffectiveTier(userId);
  const modeLimit = MODE_LIMITS[userTier] ?? MODE_LIMITS['free'];

  const currentActive = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM user_modes WHERE user_id = $1 AND is_active = true`,
    [userId],
  );
  const currentCount = currentActive?.count ?? 0;

  if (currentCount + modes.length > modeLimit) {
    throw new BadRequestError(
      `Mode limit reached. Your tier (${userTier}) allows ${modeLimit} modes. ` +
      `You have ${currentCount} active, trying to add ${modes.length}.`
    );
  }

  const added: { mode: string; user_mode_id: number }[] = [];
  const failed: { mode: string; reason: string }[] = [];
  const already_active: string[] = [];

  // Batch 1: Fetch ALL requested modes in one query
  const allModes = await query<{ id: number; name: string }>(
    `SELECT id, name FROM modes WHERE name = ANY($1::text[])`,
    [modeNames]
  );
  const modeMap = new Map(allModes.map(m => [m.name, m.id]));

  // Identify modes not found
  for (const modeName of modeNames) {
    if (!modeMap.has(modeName)) {
      failed.push({ mode: modeName, reason: 'Mode not found' });
    }
  }

  const foundModeIds = [...modeMap.values()];
  if (foundModeIds.length === 0) {
    res.json(successResponse({ message: 'Modes added successfully', added, failed, already_active }));
    return;
  }

  // Batch 2: Fetch ALL existing user_modes for this user + requested modes in one query
  const existingUserModes = await query<{ id: number; mode_id: number; is_active: boolean }>(
    `SELECT id, mode_id, is_active FROM user_modes WHERE user_id = $1 AND mode_id = ANY($2::int[])`,
    [userId, foundModeIds]
  );
  const existingMap = new Map(existingUserModes.map(um => [um.mode_id, um]));

  // Categorize: reactivate, insert new, or skip already active
  const toReactivateIds: number[] = [];
  const toInsert: { modeName: string; modeId: number }[] = [];

  for (const modeName of modeNames) {
    const modeId = modeMap.get(modeName);
    if (modeId === undefined) continue; // already in failed

    const existing = existingMap.get(modeId);
    if (existing && existing.is_active) {
      already_active.push(modeName);
    } else if (existing && !existing.is_active) {
      toReactivateIds.push(existing.id);
      added.push({ mode: modeName, user_mode_id: existing.id });
    } else {
      toInsert.push({ modeName, modeId });
    }
  }

  // Batch 3: Reactivate inactive user_modes in one UPDATE
  if (toReactivateIds.length > 0) {
    await execute(
      `UPDATE user_modes SET is_active = true, enabled_at = NOW() WHERE id = ANY($1::int[])`,
      [toReactivateIds]
    );
  }

  // Batch 4: Insert new user_modes in one multi-row INSERT
  if (toInsert.length > 0) {
    const values: unknown[] = [];
    const placeholders: string[] = [];
    toInsert.forEach((item, i) => {
      const offset = i * 2;
      placeholders.push(`($${offset + 1}, $${offset + 2}, true)`);
      values.push(userId, item.modeId);
    });
    const inserted = await query<{ id: number; mode_id: number }>(
      `INSERT INTO user_modes (user_id, mode_id, is_active)
       VALUES ${placeholders.join(', ')}
       RETURNING id, mode_id`,
      values
    );
    const insertedMap = new Map(inserted.map(r => [r.mode_id, r.id]));
    for (const item of toInsert) {
      added.push({ mode: item.modeName, user_mode_id: insertedMap.get(item.modeId)! });
    }
  }

  // Batch 5: Upsert streaks for all modes that were added (reactivated + new)
  const allAddedModeIds = added.map(a => modeMap.get(a.mode)!).filter(Boolean);
  if (allAddedModeIds.length > 0) {
    const streakValues: unknown[] = [];
    const streakPlaceholders: string[] = [];
    allAddedModeIds.forEach((modeId, i) => {
      const offset = i * 2;
      streakPlaceholders.push(`($${offset + 1}, $${offset + 2}, 0, 0)`);
      streakValues.push(userId, modeId);
    });
    await execute(
      `INSERT INTO streaks (user_id, mode_id, current_streak, longest_streak)
       VALUES ${streakPlaceholders.join(', ')}
       ON CONFLICT (user_id, mode_id) DO NOTHING`,
      streakValues
    );
  }

  res.json(successResponse({ message: 'Modes added successfully', added, failed, already_active }));
}));

/**
 * DELETE /api/users/:userId/modes/:modeId
 */
router.delete('/users/:userId/:modeId', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  const modeId = safeParseInt(req.params.modeId, 0);

  const affected = await execute(
    `UPDATE user_modes SET is_active = false WHERE user_id = $1 AND mode_id = $2`,
    [userId, modeId]
  );

  if (affected === 0) {
    throw new NotFoundError('Mode not found for user');
  }

  res.json(successResponse({ message: 'Mode removed successfully' }));
}));

/**
 * PATCH /api/users/:userId/modes/:modeId
 */
router.patch('/users/:userId/:modeId', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  const modeId = safeParseInt(req.params.modeId, 0);
  const { settings } = req.body;

  if (!settings) {
    throw new BadRequestError('Missing settings object');
  }

  const row = await queryOne(
    `UPDATE user_modes
     SET settings = $1::jsonb
     WHERE user_id = $2 AND mode_id = $3
     RETURNING *`,
    [JSON.stringify(settings), userId, modeId]
  );

  if (!row) {
    throw new NotFoundError('Mode not found for user');
  }

  res.json(successResponse({ message: 'Mode settings updated successfully', settings: row.settings || settings }));
}));

/**
 * GET /api/modes/:modeId/quests
 * Get quest templates for a mode. Cached.
 */
router.get('/:modeId/quests', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const modeId = safeParseInt(req.params.modeId, 0);

  const quests = await cached(`mode_quests:${modeId}`, TTL.MEDIUM, () =>
    query(
      `SELECT id, title AS name, description, xp_reward, quest_type AS frequency,
              difficulty, requires_timer, is_mandatory
       FROM quests
       WHERE mode_id = $1
       ORDER BY quest_type, difficulty`,
      [modeId]
    )
  );

  res.json(successResponse({ quests, count: quests.length }));
}));

export { router as modeRouter };
