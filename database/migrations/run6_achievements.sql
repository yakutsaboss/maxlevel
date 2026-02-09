-- Run 6 Migration: Finance & Learning Achievements + Performance Indexes
-- Idempotent — safe to run multiple times

-- ========================================
-- FINANCE ACHIEVEMENTS (5)
-- ========================================
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('first_saving', 'First Saving', '💰', '{"type": "quest_complete", "mode": "finance", "count": 1}', 50, 'common'),
('budget_master', 'Budget Master', '📊', '{"type": "streak", "mode": "finance", "days": 7}', 100, 'rare'),
('finance_guru', 'Finance Guru', '🏦', '{"type": "streak", "mode": "finance", "days": 30}', 500, 'epic'),
('penny_pincher', 'Penny Pincher', '🪙', '{"type": "quest_complete", "mode": "finance", "count": 50}', 300, 'rare'),
('wall_street', 'Wall Street', '📈', '{"type": "quest_complete_consecutive", "mode": "finance", "days": 14}', 200, 'epic')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- LEARNING ACHIEVEMENTS (5)
-- ========================================
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('first_lesson', 'First Lesson', '📚', '{"type": "quest_complete", "mode": "learning", "count": 1}', 50, 'common'),
('study_streak', 'Study Streak', '📖', '{"type": "streak", "mode": "learning", "days": 7}', 100, 'rare'),
('scholar', 'Scholar', '🎓', '{"type": "streak", "mode": "learning", "days": 30}', 500, 'epic'),
('bookworm', 'Bookworm', '🐛', '{"type": "quest_complete", "mode": "learning", "count": 50}', 300, 'rare'),
('lifelong_learner', 'Lifelong Learner', '🧠', '{"type": "quest_complete_consecutive", "mode": "learning", "days": 14}', 200, 'epic')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- PERFORMANCE INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_qi_user_status ON quest_instances(user_id, status) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_qi_completed_at ON quest_instances(completed_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_ua_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id);
