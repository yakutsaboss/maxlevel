import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';

interface InventoryItem {
  [key: string]: unknown;
  purchase_id: number;
  shop_item_id: number;
  name: string;
  description: string | null;
  type: string;
  rarity: string;
  icon_emoji: string | null;
  is_equipped: boolean;
  payment_method: string;
  amount_paid: number;
  purchased_at: string;
}

const router = Router();

// GET /api/inventory/:userId — Returns user's owned items grouped by type
router.get('/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId <= 0) {
    throw new BadRequestError('Invalid userId');
  }

  const items = await query<InventoryItem>(
    `SELECT
       up.id AS purchase_id,
       up.shop_item_id,
       si.name,
       si.description,
       si.type,
       si.rarity,
       si.icon_emoji,
       up.is_equipped,
       up.payment_method,
       up.amount_paid,
       up.purchased_at
     FROM user_purchases up
     JOIN shop_items si ON si.id = up.shop_item_id
     WHERE up.user_id = $1
     ORDER BY up.purchased_at DESC`,
    [userId]
  );

  // Group items by type
  const grouped: Record<string, InventoryItem[]> = {};
  for (const item of items) {
    if (!grouped[item.type]) {
      grouped[item.type] = [];
    }
    grouped[item.type].push(item);
  }

  res.json(successResponse({
    items,
    grouped,
    totalCount: items.length,
  }));
}));

// POST /api/inventory/:userId/equip — Equip an avatar item
router.post('/:userId/equip', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId <= 0) {
    throw new BadRequestError('Invalid userId');
  }

  const { itemId } = req.body;
  if (!itemId) {
    throw new BadRequestError('Missing required field: itemId');
  }

  const parsedItemId = safeParseInt(String(itemId), 0);
  if (parsedItemId <= 0) {
    throw new BadRequestError('Invalid itemId');
  }

  // Verify user owns this item
  const purchase = await queryOne<InventoryItem>(
    `SELECT up.id AS purchase_id, up.shop_item_id, si.type, up.is_equipped
     FROM user_purchases up
     JOIN shop_items si ON si.id = up.shop_item_id
     WHERE up.user_id = $1 AND up.shop_item_id = $2
     LIMIT 1`,
    [userId, parsedItemId]
  );

  if (!purchase) {
    throw new NotFoundError('Item not found in your inventory');
  }

  if (purchase.type !== 'avatar_item') {
    throw new BadRequestError('Only avatar items can be equipped');
  }

  if (purchase.is_equipped) {
    throw new BadRequestError('Item is already equipped');
  }

  // Unequip all previously equipped avatar items for this user, then equip the new one
  await query(
    `UPDATE user_purchases up
     SET is_equipped = false
     FROM shop_items si
     WHERE up.shop_item_id = si.id
       AND up.user_id = $1
       AND si.type = 'avatar_item'
       AND up.is_equipped = true`,
    [userId]
  );

  await query(
    `UPDATE user_purchases
     SET is_equipped = true
     WHERE user_id = $1 AND shop_item_id = $2`,
    [userId, parsedItemId]
  );

  res.json(successResponse({ equipped: true, itemId: parsedItemId }));
}));

// POST /api/inventory/:userId/unequip — Unequip an avatar item
router.post('/:userId/unequip', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId <= 0) {
    throw new BadRequestError('Invalid userId');
  }

  const { itemId } = req.body;
  if (!itemId) {
    throw new BadRequestError('Missing required field: itemId');
  }

  const parsedItemId = safeParseInt(String(itemId), 0);
  if (parsedItemId <= 0) {
    throw new BadRequestError('Invalid itemId');
  }

  // Verify user owns this item and it's equipped
  const purchase = await queryOne<InventoryItem>(
    `SELECT up.id AS purchase_id, up.shop_item_id, si.type, up.is_equipped
     FROM user_purchases up
     JOIN shop_items si ON si.id = up.shop_item_id
     WHERE up.user_id = $1 AND up.shop_item_id = $2
     LIMIT 1`,
    [userId, parsedItemId]
  );

  if (!purchase) {
    throw new NotFoundError('Item not found in your inventory');
  }

  if (purchase.type !== 'avatar_item') {
    throw new BadRequestError('Only avatar items can be unequipped');
  }

  if (!purchase.is_equipped) {
    throw new BadRequestError('Item is not currently equipped');
  }

  await query(
    `UPDATE user_purchases
     SET is_equipped = false
     WHERE user_id = $1 AND shop_item_id = $2`,
    [userId, parsedItemId]
  );

  res.json(successResponse({ equipped: false, itemId: parsedItemId }));
}));

export const inventoryRouter = router;
