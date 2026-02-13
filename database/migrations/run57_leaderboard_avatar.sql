-- Run 57: Recreate leaderboard_mv with avatar_id
DROP MATERIALIZED VIEW IF EXISTS leaderboard_mv;

CREATE MATERIALIZED VIEW leaderboard_mv AS
SELECT
    u.id AS user_id,
    u.telegram_id,
    u.username,
    u.first_name,
    u.current_level,
    u.total_xp,
    u.avatar_id,
    COALESCE(MAX(s.current_streak), 0) AS best_current_streak,
    COALESCE(MAX(s.longest_streak), 0) AS best_longest_streak,
    COALESCE(COUNT(DISTINCT qi.id) FILTER (WHERE qi.status = 'completed'), 0) AS total_quests_completed,
    RANK() OVER (ORDER BY u.total_xp DESC) AS xp_rank,
    RANK() OVER (ORDER BY u.current_level DESC, u.total_xp DESC) AS level_rank
FROM users u
LEFT JOIN streaks s ON s.user_id = u.id
LEFT JOIN quest_instances qi ON qi.user_id = u.id
WHERE u.is_active = true
GROUP BY u.id, u.telegram_id, u.username, u.first_name, u.current_level, u.total_xp, u.avatar_id
ORDER BY u.total_xp DESC;

CREATE UNIQUE INDEX idx_leaderboard_mv_user_id ON leaderboard_mv(user_id);
CREATE INDEX idx_leaderboard_mv_xp_rank ON leaderboard_mv(xp_rank);
