-- Seed Data for Telegram RPG Quest Bot
-- Initial modes and achievement templates

-- ========================================
-- MODES (MVP: Fitness + Hydration)
-- ========================================

INSERT INTO modes (name, display_name, description, icon_emoji) VALUES
('fitness', 'Fitness', 'Physical exercise and workouts', '🏋️'),
('hydration', 'Hydration', 'Water intake and hydration tracking', '💧'),
('finance', 'Finance', 'Saving goals and budget tracking', '💰'),
('learning', 'Learning', 'Reading and skill development', '📚'),
('medication', 'Medication', 'Track medication intake and adherence', '💊'),
('habits', 'New Habits', 'Build and track new daily habits', '🎯')
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

-- Medication Achievements
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('first_dose', 'First Dose', '💊', '{"type": "quest_complete", "mode": "medication", "count": 1}', 50, 'common'),
('week_adherent', 'Week Adherent', '📅', '{"type": "streak", "mode": "medication", "days": 7}', 100, 'rare'),
('month_adherent', 'Month Adherent', '🏅', '{"type": "streak", "mode": "medication", "days": 30}', 500, 'epic'),
('dosage_master', 'Dosage Master', '💉', '{"type": "quest_complete", "mode": "medication", "count": 50}', 300, 'rare'),
('refill_ready', 'Refill Ready', '🔄', '{"type": "quest_complete_consecutive", "mode": "medication", "days": 14}', 200, 'epic')
ON CONFLICT (name) DO NOTHING;

-- Habits Achievements
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('first_habit', 'Complete your first habit check-in', '🎯', '{"type": "quest_complete", "mode": "habits", "count": 1}', 50, 'common'),
('habit_week', 'Maintain a 7-day habit streak', '🔥', '{"type": "streak", "mode": "habits", "days": 7}', 100, 'rare'),
('habit_month', '30-day habit streak master', '🏆', '{"type": "streak", "mode": "habits", "days": 30}', 500, 'epic'),
('habit_collector', 'Complete 50 habit check-ins', '📋', '{"type": "quest_complete", "mode": "habits", "count": 50}', 300, 'rare'),
('habit_unstoppable', '14 consecutive days of habit tracking', '⚡', '{"type": "quest_complete_consecutive", "mode": "habits", "days": 14}', 200, 'epic')
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
-- SOCIAL ACHIEVEMENTS (Run 65)
-- ========================================

INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('first_friend', 'First Friend', '🤝', '{"type": "friend_count", "count": 1}', 50, 'common'),
('social_butterfly', 'Social Butterfly', '🦋', '{"type": "friend_count", "count": 5}', 150, 'rare'),
('social_network', 'Social Network', '🌐', '{"type": "friend_count", "count": 10}', 300, 'epic'),
('challenge_creator', 'Challenge Creator', '🎯', '{"type": "challenge_created", "count": 1}', 75, 'common'),
('challenge_champion', 'Challenge Champion', '🏅', '{"type": "challenge_completed", "count": 5}', 250, 'epic')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- GLOBAL STREAK ACHIEVEMENTS (Run 65)
-- ========================================

-- These use the global streak (no mode filter), checked via user_row.current_streak in the engine.
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('streak_3', '3-Day Streak', '🔥', '{"type": "streak", "days": 3}', 30, 'common'),
('streak_7', '7-Day Streak', '🔥', '{"type": "streak", "days": 7}', 75, 'common'),
('streak_14', '14-Day Streak', '🔥', '{"type": "streak", "days": 14}', 150, 'rare'),
('streak_30', '30-Day Streak', '🔥', '{"type": "streak", "days": 30}', 300, 'epic'),
('streak_60', '60-Day Streak', '💎', '{"type": "streak", "days": 60}', 500, 'epic'),
('streak_100', '100-Day Streak', '👑', '{"type": "streak", "days": 100}', 1000, 'legendary')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- XP / LEVEL MILESTONE ACHIEVEMENTS (Run 65)
-- ========================================

-- level_5 and level_10 already exist in Cross-Mode Achievements above
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('level_25', 'Level 25 Expert', '🌟', '{"type": "level_reached", "level": 25}', 750, 'epic'),
('level_50', 'Level 50 Legend', '💫', '{"type": "level_reached", "level": 50}', 1500, 'legendary'),
('level_100', 'Level 100 Mythic', '🏆', '{"type": "level_reached", "level": 100}', 3000, 'legendary'),
('xp_1000', '1000 XP', '⭐', '{"type": "total_xp", "amount": 1000}', 50, 'common'),
('xp_10000', '10,000 XP', '🌟', '{"type": "total_xp", "amount": 10000}', 500, 'rare'),
('xp_50000', '50,000 XP', '💎', '{"type": "total_xp", "amount": 50000}', 1000, 'legendary')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- QUEST ACHIEVEMENTS (Run 65)
-- ========================================

INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('first_quest', 'First Quest', '📜', '{"type": "quest_count", "count": 1}', 25, 'common'),
('quest_10', '10 Quests Done', '📋', '{"type": "quest_count", "count": 10}', 100, 'common'),
('quest_50', '50 Quests Done', '📒', '{"type": "quest_count", "count": 50}', 250, 'rare'),
('quest_100', '100 Quests Done', '📕', '{"type": "quest_count", "count": 100}', 500, 'epic'),
('quest_500', '500 Quests Done', '📖', '{"type": "quest_count", "count": 500}', 1000, 'legendary')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- SPECIAL ACHIEVEMENTS (Run 65)
-- ========================================

INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('multi_mode_3', 'Triple Threat', '🎯', '{"type": "multi_mode_active", "count": 3}', 200, 'rare'),
('multi_mode_6', 'All-Rounder', '🌈', '{"type": "multi_mode_active", "count": 6}', 500, 'legendary'),
('night_owl', 'Night Owl', '🦉', '{"type": "night_quest", "hour": 22}', 100, 'rare'),
('early_bird', 'Early Bird', '🐦', '{"type": "early_quest", "hour": 6}', 100, 'rare'),
('weekend_warrior', 'Weekend Warrior', '🗓️', '{"type": "weekend_quests", "count": 10}', 200, 'epic'),
('perfectionist', 'Perfectionist', '✨', '{"type": "all_daily_complete", "days": 7}', 300, 'epic')
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
    medication_mode_id INT;
    habits_mode_id INT;
BEGIN
    SELECT id INTO fitness_mode_id FROM modes WHERE name = 'fitness';
    SELECT id INTO hydration_mode_id FROM modes WHERE name = 'hydration';
    SELECT id INTO finance_mode_id FROM modes WHERE name = 'finance';
    SELECT id INTO learning_mode_id FROM modes WHERE name = 'learning';
    SELECT id INTO medication_mode_id FROM modes WHERE name = 'medication';
    SELECT id INTO habits_mode_id FROM modes WHERE name = 'habits';

    -- Fitness Quest Templates
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    -- Easy (beginner-friendly)
    (fitness_mode_id, '10-Minute Morning Stretch', 'Start your day with a gentle 10-minute stretching routine', 'daily', 20, 'easy', TRUE, '06:00:00', '10:00:00', FALSE, NULL, FALSE),
    (fitness_mode_id, 'Light 15-Min Walk', 'Take a light 15-minute walk around your neighborhood', 'daily', 25, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (fitness_mode_id, 'Weekly Goal: 2 Sessions', 'Complete at least 2 workout sessions this week', 'weekly', 80, 'easy', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    -- Medium (existing)
    (fitness_mode_id, 'Morning Workout', 'Complete your morning workout session at the gym or home', 'daily', 50, 'medium', TRUE, '06:00:00', '07:00:00', TRUE, '05:45:00', TRUE),
    (fitness_mode_id, 'Evening Cardio', 'Complete your evening cardio session', 'daily', 50, 'medium', TRUE, '18:00:00', '19:00:00', TRUE, '17:45:00', TRUE),
    (fitness_mode_id, 'Weekly Goal: 4 Sessions', 'Complete at least 4 workout sessions this week', 'weekly', 200, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    -- Hard (challenging)
    (fitness_mode_id, '50 Push-Ups Challenge', 'Complete 50 push-ups throughout the day in any number of sets', 'daily', 80, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (fitness_mode_id, '1-Hour HIIT Workout', 'Complete a full 1-hour high-intensity interval training session', 'daily', 100, 'hard', TRUE, '06:00:00', '20:00:00', TRUE, '05:45:00', FALSE),
    (fitness_mode_id, 'Weekly Goal: 6 Sessions', 'Complete at least 6 workout sessions this week', 'weekly', 300, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- Hydration Quest Templates
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    -- Easy (existing)
    (hydration_mode_id, 'Drink Water (Every 2 Hours)', 'Stay hydrated throughout the day - 12 glasses target', 'daily', 40, 'easy', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (hydration_mode_id, 'Morning Hydration', 'Drink 2 glasses of water within 1 hour of waking up', 'daily', 20, 'easy', TRUE, '07:00:00', '09:00:00', FALSE, NULL, FALSE),
    (hydration_mode_id, 'Weekly Hydration Goal', 'Stay hydrated every day this week', 'weekly', 150, 'easy', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    -- Medium
    (hydration_mode_id, 'Drink 8 Glasses Today', 'Track and drink at least 8 glasses of water throughout the day', 'daily', 40, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (hydration_mode_id, 'Replace One Drink With Water', 'Swap one sugary or caffeinated drink for water today', 'daily', 30, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (hydration_mode_id, 'Weekly: 5 Days of 8+ Glasses', 'Hit your 8-glass daily target at least 5 days this week', 'weekly', 180, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    -- Hard
    (hydration_mode_id, 'Drink 3L Water Today', 'Track and drink at least 3 liters of water in a single day', 'daily', 80, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (hydration_mode_id, 'Weekly: Perfect Hydration Streak', 'Hit your daily water target every single day this week', 'weekly', 250, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- Finance Quest Templates (added in Run 5, active in production)
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    -- Easy (existing)
    (finance_mode_id, 'Track Daily Expenses', 'Log all your expenses for today', 'daily', 40, 'easy', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (finance_mode_id, 'Review Budget', 'Review your budget and adjust categories if needed', 'daily', 30, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    -- Medium (existing)
    (finance_mode_id, 'Weekly Savings Check', 'Check your savings progress and transfer to savings account', 'weekly', 150, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (finance_mode_id, 'Weekly Finance Review', 'Review all spending categories and plan next week', 'weekly', 200, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    -- Medium (new)
    (finance_mode_id, 'No-Spend Day', 'Avoid all unnecessary spending for the entire day', 'daily', 50, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    -- Hard
    (finance_mode_id, 'Complete Weekly Budget Review', 'Review all spending categories with receipts and plan next week in detail', 'daily', 80, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (finance_mode_id, 'Weekly: 3 No-Spend Days', 'Have at least 3 no-spend days this week', 'weekly', 250, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- Learning Quest Templates (added in Run 5, active in production)
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    -- Easy
    (learning_mode_id, 'Read for 10 Minutes', 'Read a book or article for at least 10 minutes today', 'daily', 20, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (learning_mode_id, 'Watch Educational Video', 'Watch one educational video or tutorial today', 'daily', 15, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (learning_mode_id, 'Weekly Goal: 3 Sessions', 'Complete at least 3 study sessions this week', 'weekly', 80, 'easy', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    -- Medium (existing)
    (learning_mode_id, 'Daily Study Session', 'Complete your daily study or reading session', 'daily', 50, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (learning_mode_id, 'Practice Skills', 'Practice what you learned with exercises or projects', 'daily', 40, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (learning_mode_id, 'Weekly Learning Review', 'Review what you learned this week and plan next topics', 'weekly', 150, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (learning_mode_id, 'Weekly Goal: 5 Sessions', 'Complete at least 5 study sessions this week', 'weekly', 200, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    -- Hard
    (learning_mode_id, 'Deep Work: 2-Hour Focus', 'Complete a 2-hour uninterrupted deep work session on a single topic', 'daily', 100, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (learning_mode_id, 'Weekly: Teach What You Learned', 'Explain or teach one concept you studied this week to someone else', 'weekly', 250, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- Medication Quest Templates (added in Run 41)
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    -- Easy (existing)
    (medication_mode_id, 'Take Morning Medication', 'Take your morning dosage on time to stay on track', 'daily', 40, 'easy', TRUE, '06:00:00', '09:00:00', TRUE, '05:45:00', TRUE),
    (medication_mode_id, 'Take Evening Medication', 'Take your evening dosage before bed for consistent adherence', 'daily', 40, 'easy', TRUE, '18:00:00', '21:00:00', TRUE, '17:45:00', TRUE),
    -- Medium (existing + new)
    (medication_mode_id, 'Weekly Refill Check', 'Check your medication supply and plan a refill if needed', 'weekly', 150, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (medication_mode_id, 'Log Side Effects', 'Track any side effects or changes you noticed today', 'daily', 35, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    -- Hard
    (medication_mode_id, 'Full Medication Audit', 'Review all medications, check expiration dates, and update your medication list', 'daily', 80, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (medication_mode_id, 'Weekly: Perfect Adherence', 'Take all medications on time every single day this week', 'weekly', 250, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;

    -- Habits Quest Templates (added in Run 42)
    INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
    -- Easy (existing)
    (habits_mode_id, 'Morning Habit Check', 'Complete your morning habit check-in to start the day right', 'daily', 40, 'easy', TRUE, '06:00:00', '10:00:00', TRUE, '05:45:00', TRUE),
    (habits_mode_id, 'Evening Habit Review', 'Review your daily habits and mark completed ones', 'daily', 40, 'easy', TRUE, '19:00:00', '22:00:00', TRUE, '18:45:00', TRUE),
    -- Medium (existing + new)
    (habits_mode_id, 'Weekly Habit Reflection', 'Review which habits stuck this week and which need adjustment', 'weekly', 150, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    (habits_mode_id, 'Add a New Micro-Habit', 'Choose one new micro-habit and practice it today (e.g., 1 min meditation)', 'daily', 35, 'medium', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (habits_mode_id, 'Weekly: Track All Habits Daily', 'Check in on all your active habits every day this week', 'weekly', 180, 'medium', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    -- Hard
    (habits_mode_id, 'Habit Stacking Challenge', 'Chain 3 habits together in a single morning routine and complete them all', 'daily', 90, 'hard', TRUE, '06:00:00', '10:00:00', FALSE, NULL, FALSE),
    (habits_mode_id, 'Weekly: 7-Day Perfect Streak', 'Complete all daily habit check-ins every single day this week', 'weekly', 300, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE)
    ON CONFLICT DO NOTHING;
END $$;

-- ========================================
-- AVATAR ITEMS (Run 66)
-- ========================================

INSERT INTO avatar_items (category, name, sprite_key, rarity, unlock_type, unlock_criteria, sort_order)
VALUES
  -- Hairstyles
  ('hairstyle', 'Spiky', 'hair-spiky', 'common', 'free', '{}', 1),
  ('hairstyle', 'Long Flow', 'hair-long', 'common', 'free', '{}', 2),
  ('hairstyle', 'Mohawk', 'hair-mohawk', 'rare', 'level', '{"level": 5}', 3),
  ('hairstyle', 'Crown Braid', 'hair-crown', 'epic', 'level', '{"level": 15}', 4),
  ('hairstyle', 'Flame Hair', 'hair-flame', 'legendary', 'achievement', '{"achievement": "streak_30"}', 5),
  -- Outfits
  ('outfit', 'T-Shirt', 'outfit-tshirt', 'common', 'free', '{}', 1),
  ('outfit', 'Hoodie', 'outfit-hoodie', 'common', 'free', '{}', 2),
  ('outfit', 'Armor', 'outfit-armor', 'rare', 'level', '{"level": 10}', 3),
  ('outfit', 'Wizard Robe', 'outfit-wizard', 'epic', 'achievement', '{"achievement": "multi_mode_3"}', 4),
  ('outfit', 'Golden Plate', 'outfit-golden', 'legendary', 'level', '{"level": 25}', 5),
  -- Accessories
  ('accessory', 'None', 'acc-none', 'common', 'free', '{}', 1),
  ('accessory', 'Glasses', 'acc-glasses', 'common', 'free', '{}', 2),
  ('accessory', 'Headband', 'acc-headband', 'rare', 'level', '{"level": 8}', 3),
  ('accessory', 'Wings', 'acc-wings', 'epic', 'achievement', '{"achievement": "level_25"}', 4),
  ('accessory', 'Halo', 'acc-halo', 'legendary', 'achievement', '{"achievement": "streak_100"}', 5),
  -- Backgrounds
  ('background', 'Default', 'bg-default', 'common', 'free', '{}', 1),
  ('background', 'Sunset', 'bg-sunset', 'rare', 'level', '{"level": 12}', 2),
  ('background', 'Galaxy', 'bg-galaxy', 'legendary', 'level', '{"level": 30}', 3)
ON CONFLICT (sprite_key) DO NOTHING;

-- ========================================
-- INITIAL CONFIGURATION (Optional)
-- ========================================

-- You can add test users, sample configurations, etc. here for development
-- Example:
-- INSERT INTO users (telegram_id, username, first_name, timezone) VALUES
-- (123456789, 'testuser', 'Test User', 'America/New_York')
-- ON CONFLICT (telegram_id) DO NOTHING;

-- ========================================
-- TIER SYSTEM (updated in Run 56: pro → subscriber)
-- ========================================

-- Tier Model Reference:
--   Tier       | How to get                       | Mode limit | Price         | Features
--   -----------|----------------------------------|------------|---------------|-------------------------------------------
--   free       | Default                          | 2 modes    | 0             | Basic quests, standard modes
--   subscriber | Subscribe to @yakutsaway channel | 3 modes    | Free (channel)| +1 mode slot via channel subscription
--   premium    | Telegram Stars (599/month)       | 6 modes    | 599 XTR/month | All features + personalized plans, analytics
--
-- Telegram Stars (XTR) is the payment currency via Telegram's built-in payment system.
-- 1 Star ≈ $0.013 USD (approximate, set by Telegram).
-- The 'subscriber' tier is verified via Telegram getChatMember API with 1-hour cache.

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check that data was inserted correctly
-- SELECT 'Modes:', COUNT(*) FROM modes;
-- SELECT 'Achievements:', COUNT(*) FROM achievements;
-- SELECT 'Quest Templates:', COUNT(*) FROM quests;
