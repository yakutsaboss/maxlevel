-- Run 14: Backfill notification_sent_at for existing user_achievements
-- Prevents a one-time notification burst when the achievement notifier
-- (which now filters notification_sent_at IS NULL) first runs after deploy.
-- Idempotent: safe to run multiple times.

UPDATE user_achievements
SET notification_sent_at = unlocked_at
WHERE notification_sent_at IS NULL;
