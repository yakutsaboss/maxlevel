import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';

interface ShopItem {
  [key: string]: unknown;
  id: number;
  type: string;
  reference_id: number | null;
  name: string;
  description: string | null;
  price_stars: number;
  price_xp: number;
  is_featured: boolean;
  is_active: boolean;
  rarity: string;
  icon_emoji: string | null;
  sort_order: number;
}

interface UserPurchase {
  [key: string]: unknown;
  id: number;
  shop_item_id: number;
  payment_method: string;
  amount_paid: number;
  purchased_at: string;
}

const router = Router();

// GET /api/shop/items — List all active shop items
router.get('/items', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const featured = req.query.featured as string | undefined;

  let sql = `
    SELECT si.*,
      COALESCE((SELECT COUNT(*) FROM user_purchases up WHERE up.shop_item_id = si.id), 0)::int AS purchase_count
    FROM shop_items si
    WHERE si.is_active = true
  `;
  const params: unknown[] = [];
  let paramIdx = 1;

  if (type) {
    sql += ` AND si.type = $${paramIdx}`;
    params.push(type);
    paramIdx++;
  }

  if (featured === 'true') {
    sql += ` AND si.is_featured = true`;
  }

  sql += ` ORDER BY si.sort_order, si.id`;

  const items = await query<ShopItem & { purchase_count: number }>(sql, params);
  res.json(successResponse(items));
}));

// GET /api/shop/items/:itemId — Get single shop item details
router.get('/items/:itemId', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const itemId = safeParseInt(req.params.itemId, 0);
  if (itemId <= 0) {
    throw new BadRequestError('Invalid itemId');
  }

  const item = await queryOne<ShopItem & { purchase_count: number }>(
    `SELECT si.*,
       COALESCE((SELECT COUNT(*) FROM user_purchases up WHERE up.shop_item_id = si.id), 0)::int AS purchase_count
     FROM shop_items si
     WHERE si.id = $1 AND si.is_active = true`,
    [itemId]
  );

  if (!item) {
    throw new NotFoundError('Shop item not found');
  }

  res.json(successResponse(item));
}));

// POST /api/shop/purchase — Purchase an item
router.post('/purchase', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const { userId, itemId, paymentMethod } = req.body;

  if (!userId || !itemId || !paymentMethod) {
    throw new BadRequestError('Missing required fields: userId, itemId, paymentMethod');
  }

  if (paymentMethod !== 'stars' && paymentMethod !== 'xp') {
    throw new BadRequestError('paymentMethod must be "stars" or "xp"');
  }

  const parsedUserId = safeParseInt(String(userId), 0);
  const parsedItemId = safeParseInt(String(itemId), 0);
  if (parsedUserId <= 0 || parsedItemId <= 0) {
    throw new BadRequestError('Invalid userId or itemId');
  }

  // Verify user exists
  const user = await queryOne<{ [key: string]: unknown; id: number; total_xp: number }>(
    'SELECT id, total_xp FROM users WHERE id = $1',
    [parsedUserId]
  );
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify item exists and is active
  const item = await queryOne<ShopItem>(
    'SELECT * FROM shop_items WHERE id = $1 AND is_active = true',
    [parsedItemId]
  );
  if (!item) {
    throw new NotFoundError('Shop item not found or inactive');
  }

  // For one-time items (achievements), check for duplicate purchase
  if (item.type === 'achievement') {
    const existingPurchase = await queryOne<{ [key: string]: unknown; id: number }>(
      'SELECT id FROM user_purchases WHERE user_id = $1 AND shop_item_id = $2',
      [parsedUserId, parsedItemId]
    );
    if (existingPurchase) {
      throw new ConflictError('You already own this item');
    }
  }

  let amountPaid = 0;

  if (paymentMethod === 'xp') {
    if (item.price_xp <= 0) {
      throw new BadRequestError('This item cannot be purchased with XP');
    }
    amountPaid = item.price_xp;

    // Atomically deduct XP (fails if insufficient balance via CHECK constraint)
    const updated = await queryOne<{ [key: string]: unknown; id: number; total_xp: number }>(
      'UPDATE users SET total_xp = total_xp - $1 WHERE id = $2 AND total_xp >= $1 RETURNING id, total_xp',
      [amountPaid, parsedUserId]
    );
    if (!updated) {
      throw new BadRequestError('Insufficient XP balance');
    }
  } else {
    // Stars payment — NOTE (Run 93): Stars purchases should now use the invoice flow
    // via POST /payments/create-shop-invoice → WebApp.openInvoice() → pre_checkout_query →
    // successful_payment. This direct recording path is kept for backward compatibility
    // but the frontend (usePurchase.ts) should call the invoice endpoint instead.
    if (item.price_stars <= 0) {
      throw new BadRequestError('This item cannot be purchased with Stars');
    }
    amountPaid = item.price_stars;
  }

  // Record the purchase
  const purchase = await queryOne<UserPurchase>(
    `INSERT INTO user_purchases (user_id, shop_item_id, payment_method, amount_paid)
     VALUES ($1, $2, $3, $4)
     RETURNING id, shop_item_id, payment_method, amount_paid, purchased_at`,
    [parsedUserId, parsedItemId, paymentMethod, amountPaid]
  );

  // If it's an achievement, also unlock it for the user
  if (item.type === 'achievement' && item.reference_id) {
    await queryOne(
      `INSERT INTO user_achievements (user_id, achievement_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, achievement_id) DO NOTHING`,
      [parsedUserId, item.reference_id]
    );
  }

  // Get updated balance
  const newBalance = await queryOne<{ [key: string]: unknown; total_xp: number }>(
    'SELECT total_xp FROM users WHERE id = $1',
    [parsedUserId]
  );

  res.json(successResponse({
    purchase,
    item,
    newBalance: {
      xp: newBalance?.total_xp ?? 0,
    },
  }));
}));

// GET /api/shop/purchases/:userId — List user's purchase history
router.get('/purchases/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId <= 0) {
    throw new BadRequestError('Invalid userId');
  }

  const purchases = await query<UserPurchase & { item_name: string; item_type: string; item_icon: string | null }>(
    `SELECT up.id, up.shop_item_id, up.payment_method, up.amount_paid, up.purchased_at,
            si.name AS item_name, si.type AS item_type, si.icon_emoji AS item_icon
     FROM user_purchases up
     JOIN shop_items si ON si.id = up.shop_item_id
     WHERE up.user_id = $1
     ORDER BY up.purchased_at DESC`,
    [userId]
  );

  res.json(successResponse(purchases));
}));

export const shopRouter = router;
