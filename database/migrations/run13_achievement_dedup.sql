-- Run 13: Add notification_sent_at to user_achievements for dedup
-- Prevents achievement notifier from sending duplicate notifications.
-- Idempotent: safe to run multiple times.

ALTER TABLE user_achievements
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;
