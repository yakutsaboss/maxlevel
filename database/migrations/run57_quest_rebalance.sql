-- Run 57: Quest Template Rebalancing
-- Adds easy/hard difficulty quests to all 6 modes
-- Before: 20 quests (9 easy, 11 medium, 0 hard)
-- After:  46 quests (15 easy, 18 medium, 13 hard)
--
-- SAFE: Uses ON CONFLICT DO NOTHING, does NOT delete existing quests

BEGIN;

-- Get mode IDs
DO $$
DECLARE
    fitness_mode_id INT;
    hydration_mode_id INT;
    finance_mode_id INT;
    learning_mode_id INT;
    medication_mode_id INT;
    habits_mode_id INT;
BEGIN
    SELECT id INTO fitness_mode_id FROM modes WHERE name = 'fitness';
    SELECT id INTO hydration_mode_id FROM modes WHERE name = 'hydration';
    SELECT id INTO finance_mode_id FROM modes WHERE name = 'finance';
    SELECT id INTO learning_mode_id FROM modes WHERE name = 'learning';
    SELECT id INTO medication_mode_id FROM modes WHERE name = 'medication';
    SELECT id INTO habits_mode_id FROM modes WHERE name = 'habits';

    -- ===========================================
    -- FITNESS: Add easy + hard (was: 3 medium)
    -- ===========================================
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (fitness_mode_id, '10-Minute Morning Stretch', 'Start your day with a gentle 10-minute stretching routine', 'daily', 20, 'easy', TRUE, '06:00:00', '10:00:00', FALSE, NULL, FALSE),
    (fitness_mode_id, 'Light 15-Min Walk', 'Take a light 15-minute walk around your neighborhood', 'daily', 25, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (fitness_mode_id, 'Weekly Goal: 2 Sessions', 'Complete at least 2 workout sessions this week', 'weekly', 80, 'easy', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (fitness_mode_id, '50 Push-Ups Challenge', 'Complete 50 push-ups throughout the day in any number of sets', 'daily', 80, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (fitness_mode_id, '1-Hour HIIT Workout', 'Complete a full 1-hour high-intensity interval training session', 'daily', 100, 'hard', TRUE, '06:00:00', '20:00:00', TRUE, '05:45:00', FALSE),
    (fitness_mode_id, 'Weekly Goal: 6 Sessions', 'Complete at least 6 workout sessions this week', 'weekly', 300, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- ===========================================
    -- HYDRATION: Add medium + hard (was: 3 easy)
    -- ===========================================
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (hydration_mode_id, 'Drink 8 Glasses Today', 'Track and drink at least 8 glasses of water throughout the day', 'daily', 40, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (hydration_mode_id, 'Replace One Drink With Water', 'Swap one sugary or caffeinated drink for water today', 'daily', 30, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (hydration_mode_id, 'Weekly: 5 Days of 8+ Glasses', 'Hit your 8-glass daily target at least 5 days this week', 'weekly', 180, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (hydration_mode_id, 'Drink 3L Water Today', 'Track and drink at least 3 liters of water in a single day', 'daily', 80, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (hydration_mode_id, 'Weekly: Perfect Hydration Streak', 'Hit your daily water target every single day this week', 'weekly', 250, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- ===========================================
    -- FINANCE: Add medium + hard (was: 2 easy, 2 medium)
    -- ===========================================
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (finance_mode_id, 'No-Spend Day', 'Avoid all unnecessary spending for the entire day', 'daily', 50, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (finance_mode_id, 'Complete Weekly Budget Review', 'Review all spending categories with receipts and plan next week in detail', 'daily', 80, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (finance_mode_id, 'Weekly: 3 No-Spend Days', 'Have at least 3 no-spend days this week', 'weekly', 250, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- ===========================================
    -- LEARNING: Add easy + hard (was: 4 medium)
    -- ===========================================
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (learning_mode_id, 'Read for 10 Minutes', 'Read a book or article for at least 10 minutes today', 'daily', 20, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (learning_mode_id, 'Watch Educational Video', 'Watch one educational video or tutorial today', 'daily', 15, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (learning_mode_id, 'Weekly Goal: 3 Sessions', 'Complete at least 3 study sessions this week', 'weekly', 80, 'easy', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (learning_mode_id, 'Deep Work: 2-Hour Focus', 'Complete a 2-hour uninterrupted deep work session on a single topic', 'daily', 100, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (learning_mode_id, 'Weekly: Teach What You Learned', 'Explain or teach one concept you studied this week to someone else', 'weekly', 250, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- ===========================================
    -- MEDICATION: Add medium + hard (was: 2 easy, 1 medium)
    -- ===========================================
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (medication_mode_id, 'Log Side Effects', 'Track any side effects or changes you noticed today', 'daily', 35, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (medication_mode_id, 'Full Medication Audit', 'Review all medications, check expiration dates, and update your medication list', 'daily', 80, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (medication_mode_id, 'Weekly: Perfect Adherence', 'Take all medications on time every single day this week', 'weekly', 250, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- ===========================================
    -- HABITS: Add medium + hard (was: 2 easy, 1 medium)
    -- ===========================================
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    (habits_mode_id, 'Add a New Micro-Habit', 'Choose one new micro-habit and practice it today (e.g., 1 min meditation)', 'daily', 35, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (habits_mode_id, 'Weekly: Track All Habits Daily', 'Check in on all your active habits every day this week', 'weekly', 180, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (habits_mode_id, 'Habit Stacking Challenge', 'Chain 3 habits together in a single morning routine and complete them all', 'daily', 90, 'hard', TRUE, '06:00:00', '10:00:00', FALSE, NULL, FALSE),
    (habits_mode_id, 'Weekly: 7-Day Perfect Streak', 'Complete all daily habit check-ins every single day this week', 'weekly', 300, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Run 57 quest rebalancing complete. New quest count:';
END $$;

-- Verify final distribution
SELECT difficulty, COUNT(*) as count FROM quests GROUP BY difficulty ORDER BY difficulty;
SELECT m.name as mode, q.difficulty, COUNT(*) as count
FROM quests q JOIN modes m ON q.mode_id = m.id
GROUP BY m.name, q.difficulty
ORDER BY m.name, q.difficulty;

COMMIT;
