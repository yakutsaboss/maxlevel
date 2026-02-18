-- Run 73: Add DND (Do Not Disturb) columns to users table
-- These columns allow users to set quiet hours during which no notifications are sent.

ALTER TABLE users ADD COLUMN IF NOT EXISTS dnd_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dnd_start INTEGER DEFAULT 22;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dnd_end INTEGER DEFAULT 8;
