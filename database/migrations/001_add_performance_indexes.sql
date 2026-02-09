-- Performance indexes for high-concurrency API queries
-- Run this on production DB: psql -d telegram_rpg -f database/migrations/001_add_performance_indexes.sql

-- Most queried pattern: user's active/completed quests
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quest_instances_user_status
  ON quest_instances(user_id, status);

-- Completed quests today (stats endpoint)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quest_instances_user_completed_at
  ON quest_instances(user_id, completed_at)
  WHERE status = 'completed';

-- User achievements lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_achievements_user_achievement
  ON user_achievements(user_id, achievement_id);
