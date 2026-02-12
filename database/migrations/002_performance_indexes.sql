-- Migration 002: Performance indexes (Run 46)
-- Adds indexes for social tables and activity log queries

BEGIN;

CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type_date ON user_activity_log(activity_type, created_at DESC);

COMMIT;
