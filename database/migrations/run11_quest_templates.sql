-- Run 11: Additional Quest Templates
-- Adds 24 new quest templates (6 per mode) to increase variety
-- Idempotent: uses WHERE NOT EXISTS to skip duplicates

-- ========================================
-- FITNESS QUESTS (6 new)
-- ========================================

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Stretching Routine', 'Complete a 15-minute stretching or flexibility session', 'daily', 30, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'fitness'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Stretching Routine');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Walk 10K Steps', 'Hit 10,000 steps today — walk, jog, or hike', 'daily', 50, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'fitness'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Walk 10K Steps');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Plank Challenge', 'Hold a plank for as long as you can — beat your personal best', 'daily', 40, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'fitness'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Plank Challenge');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Yoga Session', 'Complete a 20-minute yoga or meditation session', 'daily', 40, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'fitness'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Yoga Session');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'HIIT Blast', 'Complete a high-intensity interval training session (20+ min)', 'daily', 80, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'fitness'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'HIIT Blast');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Weekly: 5 Active Days', 'Be active at least 5 days this week', 'weekly', 150, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'fitness'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Weekly: 5 Active Days');

-- ========================================
-- HYDRATION QUESTS (6 new)
-- ========================================

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Herbal Tea Break', 'Swap one coffee for herbal tea today', 'daily', 25, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'hydration'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Herbal Tea Break');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Water Before Meals', 'Drink a full glass of water before each meal today', 'daily', 30, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'hydration'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Water Before Meals');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Evening Hydration', 'Drink at least 3 glasses of water after 6 PM', 'daily', 30, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'hydration'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Evening Hydration');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Lemon Water Morning', 'Start the day with warm lemon water before breakfast', 'daily', 20, 'easy', TRUE, '06:00:00', '09:00:00', FALSE, NULL, FALSE
FROM modes WHERE name = 'hydration'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Lemon Water Morning');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Track Water Intake', 'Log every glass of water you drink today (aim for 8+)', 'daily', 40, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'hydration'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Track Water Intake');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Weekly: Zero Soda', 'Go the entire week without sugary drinks', 'weekly', 120, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'hydration'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Weekly: Zero Soda');

-- ========================================
-- FINANCE QUESTS (6 new)
-- ========================================

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'No-Spend Day', 'Spend zero discretionary money today', 'daily', 50, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'finance'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'No-Spend Day');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Review Subscriptions', 'Review all active subscriptions and cancel unused ones', 'daily', 60, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'finance'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Review Subscriptions');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Compare Prices', 'Before buying something today, compare prices from 3 sources', 'daily', 30, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'finance'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Compare Prices');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Set Savings Goal', 'Define or update a specific savings goal with a target amount', 'daily', 40, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'finance'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Set Savings Goal');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Track Impulse Purchases', 'Write down every impulse to buy something — review at end of day', 'daily', 40, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'finance'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Track Impulse Purchases');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Weekly: 3 No-Spend Days', 'Have at least 3 days with zero discretionary spending this week', 'weekly', 200, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'finance'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Weekly: 3 No-Spend Days');

-- ========================================
-- LEARNING QUESTS (6 new)
-- ========================================

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Watch Educational Video', 'Watch a tutorial, lecture, or documentary (30+ min)', 'daily', 40, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'learning'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Watch Educational Video');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Write Chapter Summary', 'Read a chapter and write a short summary in your own words', 'daily', 60, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'learning'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Write Chapter Summary');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Teach Someone', 'Explain a concept you learned recently to another person', 'daily', 80, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'learning'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Teach Someone');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Code Challenge', 'Solve a coding problem on LeetCode, Codewars, or similar', 'daily', 60, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'learning'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Code Challenge');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Language Practice', 'Practice a foreign language for 20+ minutes (app, flashcards, conversation)', 'daily', 40, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'learning'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Language Practice');

INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)
SELECT id, 'Weekly: Read a Book Chapter', 'Read at least one full chapter of a non-fiction book this week', 'weekly', 150, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE
FROM modes WHERE name = 'learning'
AND NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Weekly: Read a Book Chapter');
