/**
 * Sticker API Routes
 * Provides sticker set listing and details for the mini-app sticker browser.
 * Uses the Telegram Bot API to fetch sticker set info.
 */

import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { readLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler, successResponse, NotFoundError } from '../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { bot } from '../../bot.js';
import { CELEBRATION_STICKER_PACKS } from '../../utils/stickerConfig.js';

const router = Router();
const log = logger.child({ component: 'stickers' });

// ─── GET /sets ──────────────────────────────────────────────────────────────
// List available celebration sticker sets (metadata only, no full sticker data)
router.get('/sets', authenticateTelegram, readLimiter, asyncHandler(async (_req: Request, res: Response) => {
  const sets = [];

  for (const pack of CELEBRATION_STICKER_PACKS) {
    try {
      const stickerSet = await bot.api.getStickerSet(pack.name);
      sets.push({
        name: stickerSet.name,
        title: stickerSet.title,
        sticker_count: stickerSet.stickers.length,
        is_animated: stickerSet.stickers[0]?.is_animated ?? false,
        is_video: stickerSet.stickers[0]?.is_video ?? false,
        category: pack.category,
      });
    } catch (err) {
      log.warn('Failed to fetch sticker set', { name: pack.name, error: err });
      // Skip sets that can't be fetched (may not exist or API error)
    }
  }

  res.json(successResponse(sets));
}));

// ─── GET /sets/:name ────────────────────────────────────────────────────────
// Get full details of a sticker set including all stickers
router.get('/sets/:name', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;

  if (!name || name.length > 128) {
    throw new NotFoundError('Invalid sticker set name');
  }

  let stickerSet;
  try {
    stickerSet = await bot.api.getStickerSet(name);
  } catch (err) {
    log.warn('Sticker set not found', { name, error: err });
    throw new NotFoundError(`Sticker set "${name}" not found`);
  }

  const stickers = stickerSet.stickers.map((sticker) => ({
    file_id: sticker.file_id,
    file_unique_id: sticker.file_unique_id,
    emoji: sticker.emoji || '',
    is_animated: sticker.is_animated,
    is_video: sticker.is_video,
    width: sticker.width,
    height: sticker.height,
    thumbnail: sticker.thumbnail
      ? {
          file_id: sticker.thumbnail.file_id,
          width: sticker.thumbnail.width,
          height: sticker.thumbnail.height,
        }
      : null,
  }));

  res.json(successResponse({
    name: stickerSet.name,
    title: stickerSet.title,
    sticker_type: stickerSet.sticker_type,
    stickers,
  }));
}));

export { router as stickerRouter };
