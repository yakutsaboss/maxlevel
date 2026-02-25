import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
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
  is_animated: boolean;
  animation_data: Record<string, unknown> | null;
  price_stars: number;
}

interface AvatarShopItem extends AvatarItem {
  is_owned: boolean;
  shop_item_id: number | null;
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

// GET /api/avatars/shop?userId=<telegramId> — return all items with ownership status
router.get('/shop', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = req.query['userId'] as string | undefined;
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    throw new BadRequestError('userId query parameter is required');
  }

  const user = await queryOne<{ id: number }>('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Fetch all avatar items with their shop listing (if any) and ownership status
  const items = await query<AvatarShopItem>(`
    SELECT
      ai.*,
      si.id AS shop_item_id,
      CASE
        WHEN ai.unlock_type = 'premium'
          THEN EXISTS (
            SELECT 1 FROM user_purchases up
            WHERE up.user_id = $1 AND up.shop_item_id = si.id
          )
        ELSE true
      END AS is_owned
    FROM avatar_items ai
    LEFT JOIN shop_items si
      ON si.type = 'avatar_item' AND si.reference_id = ai.id
    ORDER BY ai.category, ai.sort_order, ai.id
  `, [user.id]);

  res.json(successResponse(items));
}));

// GET /api/avatars/:userId — get user's equipped avatar
// Note: :userId is the Telegram user ID (bigint) sent by the mini-app
router.get('/:userId', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = req.params.userId;
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    throw new BadRequestError('Invalid userId');
  }

  // Resolve telegram_id → DB user_id
  const user = await queryOne<{ id: number }>('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const avatar = await queryOne<UserAvatar>(
    'SELECT equipped_items FROM user_avatar WHERE user_id = $1',
    [user.id]
  );

  res.json(successResponse(
    avatar?.equipped_items ?? { hairstyle: null, outfit: null, accessory: null, background: null }
  ));
}));

// PATCH /api/avatars/:userId/equip — equip an item
// Note: :userId is the Telegram user ID (bigint) sent by the mini-app
router.patch('/:userId/equip', authenticateTelegram, authorizeUser, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = req.params.userId;
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    throw new BadRequestError('Invalid userId');
  }

  // Resolve telegram_id → DB user_id
  const user = await queryOne<{ id: number }>('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  if (!user) {
    throw new NotFoundError('User not found');
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

    // For premium items, verify the user has purchased them
    if (item.unlock_type === 'premium') {
      const shopItem = await queryOne<{ id: number }>(
        'SELECT id FROM shop_items WHERE type = $1 AND reference_id = $2',
        ['avatar_item', itemId]
      );
      if (!shopItem) {
        throw new ForbiddenError('This premium item is not available for purchase');
      }
      const purchased = await queryOne<{ id: number }>(
        'SELECT id FROM user_purchases WHERE user_id = $1 AND shop_item_id = $2',
        [user.id, shopItem.id]
      );
      if (!purchased) {
        throw new ForbiddenError('You have not purchased this premium avatar item');
      }
    }
  }

  const resolvedItemId = itemId ?? null;

  const result = await queryOne<UserAvatar>(
    `INSERT INTO user_avatar (user_id, equipped_items, updated_at)
     VALUES ($1, jsonb_set('{"hairstyle":null,"outfit":null,"accessory":null,"background":null}', ARRAY[$2], $3::jsonb), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET equipped_items = jsonb_set(user_avatar.equipped_items, ARRAY[$2], $3::jsonb), updated_at = NOW()
     RETURNING equipped_items`,
    [user.id, category, JSON.stringify(resolvedItemId)]
  );

  res.json(successResponse(result?.equipped_items));
}));

export const avatarRouter = router;
