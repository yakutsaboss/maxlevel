-- Run 5 Sync Migration
-- Consolidates all Run 4 + Run 5 schema/data changes into one idempotent script.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT).

-- ========================================
-- 1. User columns (added in Run 4)
-- ========================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_time INTEGER DEFAULT 9;

-- ========================================
-- 2. Finance & Learning modes (added by Agent 0 between Run 4-5)
-- ========================================

INSERT INTO modes (name, display_name, description, icon_emoji) VALUES
('finance', 'Finance', 'Saving goals and budget tracking', '💰'),
('learning', 'Learning', 'Reading and skill development', '📚')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 3. Quest templates for new modes
-- ========================================

DO $$
DECLARE
    finance_mode_id INT;
    learning_mode_id INT;
BEGIN
    SELECT id INTO finance_mode_id FROM modes WHERE name = 'finance';
    SELECT id INTO learning_mode_id FROM modes WHERE name = 'learning';

    -- Finance Quest Templates
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (finance_mode_id, 'Track Daily Expenses', 'Log all your expenses for today', 'daily', 40, 'easy', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (finance_mode_id, 'Review Budget', 'Review your budget and adjust categories if needed', 'daily', 30, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (finance_mode_id, 'Weekly Savings Check', 'Check your savings progress and transfer to savings account', 'weekly', 150, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (finance_mode_id, 'Weekly Finance Review', 'Review all spending categories and plan next week', 'weekly', 200, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- Learning Quest Templates
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (learning_mode_id, 'Daily Study Session', 'Complete your daily study or reading session', 'daily', 50, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (learning_mode_id, 'Practice Skills', 'Practice what you learned with exercises or projects', 'daily', 40, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (learning_mode_id, 'Weekly Learning Review', 'Review what you learned this week and plan next topics', 'weekly', 150, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (learning_mode_id, 'Weekly Goal: 5 Sessions', 'Complete at least 5 study sessions this week', 'weekly', 200, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;
END $$;

-- ========================================
-- Verification
-- ========================================
-- SELECT 'Modes:', COUNT(*) FROM modes;
-- SELECT 'Quests:', COUNT(*) FROM quests;
-- SELECT 'Users columns:', column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('avatar_id', 'notification_enabled', 'reminder_time');
