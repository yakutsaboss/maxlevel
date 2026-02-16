-- Run 66: Avatar system tables
-- Creates avatar_items catalog and user_avatar equipped state

CREATE TABLE IF NOT EXISTS avatar_items (
  id SERIAL PRIMARY KEY,
  category VARCHAR(20) NOT NULL,  -- 'hairstyle', 'outfit', 'accessory', 'background'
  name VARCHAR(50) NOT NULL,
  sprite_key VARCHAR(50) NOT NULL UNIQUE,  -- CSS class or sprite ref
  rarity VARCHAR(20) NOT NULL DEFAULT 'common',  -- common, rare, epic, legendary
  unlock_type VARCHAR(20) NOT NULL DEFAULT 'free',  -- 'free', 'level', 'achievement', 'purchase'
  unlock_criteria JSONB DEFAULT '{}',  -- e.g. {"level": 10} or {"achievement": "streak_30"}
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_avatar (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  equipped_items JSONB NOT NULL DEFAULT '{"hairstyle": null, "outfit": null, "accessory": null, "background": null}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avatar_items_category ON avatar_items(category);
CREATE INDEX IF NOT EXISTS idx_avatar_items_rarity ON avatar_items(rarity);
