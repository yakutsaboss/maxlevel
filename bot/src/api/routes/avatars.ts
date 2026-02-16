import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';

const VALID_CATEGORIES = ['hairstyle', 'outfit', 'accessory', 'background'] as const;

interface AvatarItem {
  [key: string]: unknown;
  id: number;
  category: string;
  name: string;
  sprite_key: string;
  rarity: string;
  unlock_type: string;
  unlock_criteria: Record<string, unknown>;
  sort_order: number;
}

interface UserAvatar {
  [key: string]: unknown;
  equipped_items: Record<string, number | null>;
}

const router = Router();

// GET /api/avatars/items — return all avatar items
router.get('/items', authenticateTelegram, readLimiter, asyncHandler(async (_req: Request, res: Response) => {
  const items = await query<AvatarItem>('SELECT * FROM avatar_items ORDER BY category, sort_order, id');
  res.json(successResponse(items));
}));

// GET /api/avatars/:userId — get user's equipped avatar
router.get('/:userId', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId <= 0) {
    throw new BadRequestError('Invalid userId');
  }

  const avatar = await queryOne<UserAvatar>(
    'SELECT equipped_items FROM user_avatar WHERE user_id = $1',
    [userId]
  );

  res.json(successResponse(
    avatar?.equipped_items ?? { hairstyle: null, outfit: null, accessory: null, background: null }
  ));
}));

// PATCH /api/avatars/:userId/equip — equip an item
router.patch('/:userId/equip', authenticateTelegram, authorizeUser, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId <= 0) {
    throw new BadRequestError('Invalid userId');
  }

  const { category, itemId } = req.body;

  if (!category || !VALID_CATEGORIES.includes(category)) {
    throw new BadRequestError(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  // itemId can be null (unequip) or a positive integer
  if (itemId !== null && itemId !== undefined) {
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new BadRequestError('itemId must be a positive integer or null');
    }

    // Verify item exists and matches category
    const item = await queryOne<AvatarItem>(
      'SELECT * FROM avatar_items WHERE id = $1 AND category = $2',
      [itemId, category]
    );

    if (!item) {
      throw new NotFoundError(`Avatar item not found in category ${category}`);
    }
  }

  const resolvedItemId = itemId ?? null;

  const result = await queryOne<UserAvatar>(
    `INSERT INTO user_avatar (user_id, equipped_items, updated_at)
     VALUES ($1, jsonb_set('{"hairstyle":null,"outfit":null,"accessory":null,"background":null}', ARRAY[$2], $3::jsonb), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET equipped_items = jsonb_set(user_avatar.equipped_items, ARRAY[$2], $3::jsonb), updated_at = NOW()
     RETURNING equipped_items`,
    [userId, category, JSON.stringify(resolvedItemId)]
  );

  res.json(successResponse(result?.equipped_items));
}));

export const avatarRouter = router;
