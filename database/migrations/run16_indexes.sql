-- Run 16: Performance indexes for common query patterns
-- Idempotent: all use IF NOT EXISTS, safe to run multiple times.

-- Quest instances by user + status (used by quest listing, failed quest detection)
CREATE INDEX IF NOT EXISTS idx_qi_user_status ON quest_instances(user_id, status);

-- Check-ins by quest instance + validity (used by check-in counting)
CREATE INDEX IF NOT EXISTS idx_checkins_quest_valid ON check_ins(quest_instance_id, is_valid);

-- User achievements ordered by unlock time (used by recent achievements)
CREATE INDEX IF NOT EXISTS idx_ua_unlocked_at ON user_achievements(user_id, unlocked_at DESC);

-- Punishment history by user ordered by time (used by punishment history pagination)
CREATE INDEX IF NOT EXISTS idx_punishment_history_user_at ON punishment_history(user_id, applied_at DESC);

-- Punishment settings by user (used by consent check before applying punishment)
CREATE INDEX IF NOT EXISTS idx_punishment_settings_user ON punishment_settings(user_id);
