-- Run 56: Tier Rename (pro → subscriber) + Channel Subscriptions Cache
-- Execute on server:
--   PGPASSWORD=postgres psql -h localhost -U postgres -d telegram_rpg -f /opt/wibecode-bot/database/migrations/run56_tier_rename.sql

BEGIN;

-- ============================================================
-- 1. Rename tier: pro → subscriber in subscriptions table
-- ============================================================

-- Drop existing CHECK constraint on tier column
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

-- Update existing 'pro' rows to 'subscriber'
UPDATE subscriptions SET tier = 'subscriber' WHERE tier = 'pro';

-- Add new CHECK constraint with updated tier values
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tier_check
    CHECK (tier IN ('free', 'subscriber', 'premium'));

-- ============================================================
-- 2. Update payments metadata referencing 'pro' tier
-- ============================================================

UPDATE payments
SET metadata = jsonb_set(metadata, '{tier}', '"subscriber"')
WHERE metadata->>'tier' = 'pro';

-- ============================================================
-- 3. Create channel_subscriptions cache table
-- ============================================================

CREATE TABLE IF NOT EXISTS channel_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    channel_username VARCHAR(100) NOT NULL,
    is_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, channel_username)
);

CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_user_id ON channel_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_checked_at ON channel_subscriptions(checked_at);

COMMENT ON TABLE channel_subscriptions IS 'Cache for Telegram channel membership checks (1-hour TTL, used by tier system)';

COMMIT;
