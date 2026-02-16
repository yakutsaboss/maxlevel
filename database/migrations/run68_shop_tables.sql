-- Run 68: Shop tables for purchasable items
-- Agent A: Shop Backend

CREATE TABLE IF NOT EXISTS shop_items (
  id SERIAL PRIMARY KEY,
  type VARCHAR(30) NOT NULL,  -- 'achievement', 'avatar_item', 'trophy_booster', 'xp_booster'
  reference_id INT,           -- points to achievements.id, avatar_items.id, etc.
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_stars INT NOT NULL DEFAULT 0,
  price_xp INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rarity VARCHAR(20) NOT NULL DEFAULT 'common',
  icon_emoji VARCHAR(10),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_purchases (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_item_id INT NOT NULL REFERENCES shop_items(id),
  payment_method VARCHAR(20) NOT NULL,  -- 'stars', 'xp'
  amount_paid INT NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_items_type ON shop_items(type);
CREATE INDEX IF NOT EXISTS idx_shop_items_active ON shop_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
