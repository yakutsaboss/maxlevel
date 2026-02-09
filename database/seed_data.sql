-- Seed Data for Telegram RPG Quest Bot
-- Initial modes and achievement templates

-- ========================================
-- MODES (MVP: Fitness + Hydration)
-- ========================================

INSERT INTO modes (name, display_name, description, icon_emoji) VALUES
('fitness', 'Fitness', 'Physical exercise and workouts', '🏋️'),
('hydration', 'Hydration', 'Water intake and hydration tracking', '💧'),
('finance', 'Finance', 'Saving goals and budget tracking', '💰'),
('learning', 'Learning', 'Reading and skill development', '📚')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- ACHIEVEMENTS (MVP)
-- ========================================

-- Fitness Achievements
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('first_workout', 'First Workout', '🔥', '{"type": "quest_complete", "mode": "fitness", "count": 1}', 50, 'common'),
('week_warrior', 'Week Warrior', '💪', '{"type": "streak", "mode": "fitness", "days": 7}', 100, 'rare'),
('month_champion', 'Month Champion', '🏋️', '{"type": "streak", "mode": "fitness", "days": 30}', 500, 'epic'),
('gym_rat', 'Gym Rat', '🏆', '{"type": "quest_complete", "mode": "fitness", "count": 50}', 300, 'rare'),
('iron_will', 'Iron Will', '⚡', '{"type": "quest_complete_consecutive", "mode": "fitness", "days": 14}', 200, 'epic')
ON CONFLICT (name) DO NOTHING;

-- Hydration Achievements
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('first_drop', 'First Drop', '💧', '{"type": "quest_complete", "mode": "hydration", "count": 1}', 25, 'common'),
('hydro_hero', 'Hydro Hero', '🌊', '{"type": "streak", "mode": "hydration", "days": 7}', 75, 'rare'),
('ocean_master', 'Ocean Master', '🏆', '{"type": "streak", "mode": "hydration", "days": 30}', 300, 'epic'),
('water_warrior', 'Water Warrior', '💦', '{"type": "quest_complete", "mode": "hydration", "count": 100}', 250, 'rare'),
('hydration_legend', 'Hydration Legend', '👑', '{"type": "quest_complete_consecutive", "mode": "hydration", "days": 21}', 400, 'legendary')
ON CONFLICT (name) DO NOTHING;

-- Finance Achievements
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('first_saving', 'First Saving', '💰', '{"type": "quest_complete", "mode": "finance", "count": 1}', 50, 'common'),
('budget_master', 'Budget Master', '📊', '{"type": "streak", "mode": "finance", "days": 7}', 100, 'rare'),
('finance_guru', 'Finance Guru', '🏦', '{"type": "streak", "mode": "finance", "days": 30}', 500, 'epic'),
('penny_pincher', 'Penny Pincher', '🪙', '{"type": "quest_complete", "mode": "finance", "count": 50}', 300, 'rare'),
('wall_street', 'Wall Street', '📈', '{"type": "quest_complete_consecutive", "mode": "finance", "days": 14}', 200, 'epic')
ON CONFLICT (name) DO NOTHING;

-- Learning Achievements
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('first_lesson', 'First Lesson', '📚', '{"type": "quest_complete", "mode": "learning", "count": 1}', 50, 'common'),
('study_streak', 'Study Streak', '📖', '{"type": "streak", "mode": "learning", "days": 7}', 100, 'rare'),
('scholar', 'Scholar', '🎓', '{"type": "streak", "mode": "learning", "days": 30}', 500, 'epic'),
('bookworm', 'Bookworm', '🐛', '{"type": "quest_complete", "mode": "learning", "count": 50}', 300, 'rare'),
('lifelong_learner', 'Lifelong Learner', '🧠', '{"type": "quest_complete_consecutive", "mode": "learning", "days": 14}', 200, 'epic')
ON CONFLICT (name) DO NOTHING;

-- Cross-Mode Achievements
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('balanced_start', 'Balanced Start', '⚖️', '{"type": "multi_mode_active", "count": 2}', 100, 'common'),
('comeback_king', 'Comeback King', '🔄', '{"type": "streak_rebuild", "days": 7}', 150, 'rare'),
('level_5', 'Level 5 Achiever', '⭐', '{"type": "level_reached", "level": 5}', 200, 'common'),
('level_10', 'Level 10 Master', '🌟', '{"type": "level_reached", "level": 10}', 500, 'rare'),
('xp_grinder', 'XP Grinder', '💎', '{"type": "total_xp", "amount": 5000}', 300, 'epic')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- QUEST TEMPLATES (MVP)
-- ========================================

-- Get mode IDs for all modes
DO $$
DECLARE
    fitness_mode_id INT;
    hydration_mode_id INT;
    finance_mode_id INT;
    learning_mode_id INT;
BEGIN
    SELECT id INTO fitness_mode_id FROM modes WHERE name = 'fitness';
    SELECT id INTO hydration_mode_id FROM modes WHERE name = 'hydration';
    SELECT id INTO finance_mode_id FROM modes WHERE name = 'finance';
    SELECT id INTO learning_mode_id FROM modes WHERE name = 'learning';

    -- Fitness Quest Templates
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (fitness_mode_id, 'Morning Workout', 'Complete your morning workout session at the gym or home', 'daily', 50, 'medium', TRUE, '06:00:00', '07:00:00', TRUE, '05:45:00', TRUE),
    (fitness_mode_id, 'Evening Cardio', 'Complete your evening cardio session', 'daily', 50, 'medium', TRUE, '18:00:00', '19:00:00', TRUE, '17:45:00', TRUE),
    (fitness_mode_id, 'Weekly Goal: 4 Sessions', 'Complete at least 4 workout sessions this week', 'weekly', 200, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- Hydration Quest Templates
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (hydration_mode_id, 'Drink Water (Every 2 Hours)', 'Stay hydrated throughout the day - 12 glasses target', 'daily', 40, 'easy', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (hydration_mode_id, 'Morning Hydration', 'Drink 2 glasses of water within 1 hour of waking up', 'daily', 20, 'easy', TRUE, '07:00:00', '09:00:00', FALSE, NULL, FALSE),
    (hydration_mode_id, 'Weekly Hydration Goal', 'Stay hydrated every day this week', 'weekly', 150, 'easy', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- Finance Quest Templates (added in Run 5, active in production)
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (finance_mode_id, 'Track Daily Expenses', 'Log all your expenses for today', 'daily', 40, 'easy', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (finance_mode_id, 'Review Budget', 'Review your budget and adjust categories if needed', 'daily', 30, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (finance_mode_id, 'Weekly Savings Check', 'Check your savings progress and transfer to savings account', 'weekly', 150, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (finance_mode_id, 'Weekly Finance Review', 'Review all spending categories and plan next week', 'weekly', 200, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- Learning Quest Templates (added in Run 5, active in production)
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (learning_mode_id, 'Daily Study Session', 'Complete your daily study or reading session', 'daily', 50, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (learning_mode_id, 'Practice Skills', 'Practice what you learned with exercises or projects', 'daily', 40, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (learning_mode_id, 'Weekly Learning Review', 'Review what you learned this week and plan next topics', 'weekly', 150, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (learning_mode_id, 'Weekly Goal: 5 Sessions', 'Complete at least 5 study sessions this week', 'weekly', 200, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;
END $$;

-- ========================================
-- INITIAL CONFIGURATION (Optional)
-- ========================================

-- You can add test users, sample configurations, etc. here for development
-- Example:
-- INSERT INTO users (telegram_id, username, first_name, timezone) VALUES
-- (123456789, 'testuser', 'Test User', 'America/New_York')
-- ON CONFLICT (telegram_id) DO NOTHING;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check that data was inserted correctly
-- SELECT 'Modes:', COUNT(*) FROM modes;
-- SELECT 'Achievements:', COUNT(*) FROM achievements;
-- SELECT 'Quest Templates:', COUNT(*) FROM quests;
