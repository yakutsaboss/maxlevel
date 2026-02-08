-- Migration 001: Leaderboard Materialized View & User Activity Log
-- Non-destructive: all CREATE IF NOT EXISTS
-- Run: psql -U postgres -d wibecode -f database/migrations/001_leaderboard_and_activity.sql

-- User activity log (tracks all interactions for engagement analytics)
CREATE TABLE IF NOT EXISTS user_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,   -- 'quest_complete', 'check_in', 'bot_command', 'miniapp_open'
    activity_data JSONB,                   -- Optional metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON user_activity_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON user_activity_log(activity_type);

COMMENT ON TABLE user_activity_log IS 'Tracks all user interactions for engagement analytics';

-- Leaderboard materialized view (cached rankings, refreshed every 30 min by pg-boss)
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_mv AS
SELECT
    u.id AS user_id,
    u.telegram_id,
    u.username,
    u.first_name,
    u.current_level,
    u.total_xp,
    COALESCE(MAX(s.current_streak), 0) AS best_current_streak,
    COALESCE(MAX(s.longest_streak), 0) AS best_longest_streak,
    COALESCE(COUNT(DISTINCT qi.id) FILTER (WHERE qi.status = 'completed'), 0) AS total_quests_completed,
    RANK() OVER (ORDER BY u.total_xp DESC) AS xp_rank,
    RANK() OVER (ORDER BY u.current_level DESC, u.total_xp DESC) AS level_rank
FROM users u
LEFT JOIN streaks s ON s.user_id = u.id
LEFT JOIN quest_instances qi ON qi.user_id = u.id
WHERE u.is_active = true
GROUP BY u.id, u.telegram_id, u.username, u.first_name, u.current_level, u.total_xp
ORDER BY u.total_xp DESC;

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_mv_user_id ON leaderboard_mv(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_mv_xp_rank ON leaderboard_mv(xp_rank);

COMMENT ON MATERIALIZED VIEW leaderboard_mv IS 'Cached leaderboard rankings, refreshed every 30 minutes by pg-boss job';
