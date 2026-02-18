-- Run 69: Add is_equipped column to user_purchases for inventory equip/unequip
-- Agent B: Inventory System

ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS is_equipped BOOLEAN NOT NULL DEFAULT false;

-- Index for fast lookup of equipped items per user
CREATE INDEX IF NOT EXISTS idx_user_purchases_equipped ON user_purchases(user_id, is_equipped) WHERE is_equipped = true;
