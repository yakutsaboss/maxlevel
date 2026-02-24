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
('iron_will', 'Iron Will', '⚡', '{"type": "quest_complete_consecutive", "mode": "fitness", "days": 14}', 350, 'epic')
ON CONFLICT (name) DO NOTHING;

-- Hydration Achievements
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('first_drop', 'First Drop', '💧', '{"type": "quest_complete", "mode": "hydration", "count": 1}', 50, 'common'),
('hydro_hero', 'Hydro Hero', '🌊', '{"type": "streak", "mode": "hydration", "days": 7}', 100, 'rare'),
('ocean_master', 'Ocean Master', '🏆', '{"type": "streak", "mode": "hydration", "days": 30}', 300, 'epic'),
('water_warrior', 'Water Warrior', '💦', '{"type": "quest_complete", "mode": "hydration", "count": 100}', 250, 'rare'),
('hydration_legend', 'Hydration Legend', '👑', '{"type": "quest_complete_consecutive", "mode": "hydration", "days": 21}', 450, 'legendary')
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
('first_habit', 'First Habit', '🎯', '{"type": "quest_complete", "mode": "habits", "count": 1}', 50, 'common'),
('habit_week', 'Habit Streak', '🔥', '{"type": "streak", "mode": "habits", "days": 7}', 100, 'rare'),
('habit_month', 'Habit Master', '🏆', '{"type": "streak", "mode": "habits", "days": 30}', 500, 'epic'),
('habit_collector', 'Habit Collector', '📋', '{"type": "quest_complete", "mode": "habits", "count": 50}', 300, 'rare'),
('habit_unstoppable', 'Unstoppable', '⚡', '{"type": "quest_complete_consecutive", "mode": "habits", "days": 14}', 350, 'epic')
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
-- ACTIVITY ACHIEVEMENTS (Run 75)
-- ========================================

-- Activity count milestones
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('activity_first_workout', 'First Workout', '🏃', '{"type": "activity_count", "value": 1}', 25, 'common'),
('activity_getting_started', 'Getting Started', '🎽', '{"type": "activity_count", "value": 10}', 50, 'common'),
('activity_dedicated_athlete', 'Dedicated Athlete', '💪', '{"type": "activity_count", "value": 50}', 150, 'rare'),
('activity_century_club', 'Century Club', '🏅', '{"type": "activity_count", "value": 100}', 300, 'epic')
ON CONFLICT (name) DO NOTHING;

-- Category-specific achievements
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('activity_cardio_king', 'Cardio King', '❤️‍🔥', '{"type": "activity_category_count", "category": "Cardio", "value": 20}', 100, 'rare'),
('activity_iron_pumper', 'Iron Pumper', '🏋️', '{"type": "activity_category_count", "category": "Strength", "value": 20}', 100, 'rare'),
('activity_zen_master', 'Zen Master', '🧘', '{"type": "activity_category_count", "category": "Flexibility", "value": 20}', 100, 'rare'),
('activity_sports_star', 'Sports Star', '⚽', '{"type": "activity_category_count", "category": "Sports", "value": 20}', 100, 'rare'),
('activity_outdoor_explorer', 'Outdoor Explorer', '🏔️', '{"type": "activity_category_count", "category": "Outdoor", "value": 10}', 100, 'rare')
ON CONFLICT (name) DO NOTHING;

-- Distance, calories, time, variety, streak achievements
INSERT INTO achievements (name, description, badge_icon, criteria, xp_bonus, rarity) VALUES
('activity_marathon_runner', 'Marathon Runner', '🏃‍♂️', '{"type": "total_distance_km", "activity": "running", "value": 42}', 250, 'epic'),
('activity_calorie_crusher', 'Calorie Crusher', '🔥', '{"type": "total_calories", "value": 10000}', 200, 'epic'),
('activity_early_bird', 'Early Bird Athlete', '🌅', '{"type": "activity_time", "before": "07:00"}', 75, 'rare'),
('activity_night_owl', 'Night Owl Athlete', '🌙', '{"type": "activity_time", "after": "22:00"}', 75, 'rare'),
('activity_variety_pack', 'Variety Pack', '🎨', '{"type": "activity_all_categories", "value": 6}', 200, 'epic'),
('activity_streak_7', 'Workout Streak 7', '🔥', '{"type": "activity_streak", "value": 7}', 100, 'rare')
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
    (medication_mode_id, 'Weekly: Perfect Adherence', 'Take all medications on time every single day this week', 'weekly', 250, 'hard', FALSE, NULL, NULL, FALSE, NULL, TRUE),
    -- Medication tracker quests (added Run 87)
    (medication_mode_id, 'Take morning medications', 'Log all your morning medications as taken in the medication tracker', 'daily', 30, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (medication_mode_id, 'Take evening medications', 'Log all your evening medications as taken in the medication tracker', 'daily', 30, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
    (medication_mode_id, 'Perfect medication week', 'No missed doses all week — every scheduled medication logged as taken', 'weekly', 200, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE)
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
-- TROPHIES (Run 67)
-- ========================================

INSERT INTO trophies (name, description, icon_emoji, rarity, criteria, sort_order) VALUES
-- Beginner (common)
('First Steps', 'Complete your very first quest', '🏅', 'common', '{"type": "quest_count", "threshold": 1}', 1),
('Getting Started', 'Reach level 2', '⭐', 'common', '{"type": "level", "threshold": 2}', 2),
('Social Debut', 'Add your first friend', '🤝', 'common', '{"type": "friend_count", "threshold": 1}', 3),
-- Streak (rare)
('Week Warrior', 'Maintain a 7-day streak', '🔥', 'rare', '{"type": "streak_days", "threshold": 7}', 10),
('Fortnight Fighter', 'Maintain a 14-day streak', '⚔️', 'rare', '{"type": "streak_days", "threshold": 14}', 11),
('Monthly Master', 'Maintain a 30-day streak', '🛡️', 'epic', '{"type": "streak_days", "threshold": 30}', 12),
-- Social (rare/epic)
('Social Star', 'Add 10 friends', '🌟', 'rare', '{"type": "friend_count", "threshold": 10}', 20),
('Challenge Creator', 'Create your first challenge', '🎯', 'rare', '{"type": "challenge_created", "threshold": 1}', 21),
('Challenge Conqueror', 'Win 3 challenges', '🏆', 'epic', '{"type": "challenge_wins", "threshold": 3}', 22),
-- Mastery (epic)
('Quest Centurion', 'Complete 100 quests', '📜', 'epic', '{"type": "quest_count", "threshold": 100}', 30),
('XP Champion', 'Earn 10,000 total XP', '💰', 'epic', '{"type": "xp_total", "threshold": 10000}', 31),
('Mode Explorer', 'Activate 3 different modes', '🧭', 'epic', '{"type": "mode_count", "threshold": 3}', 32),
-- Prestige (legendary)
('Streak Legend', 'Maintain a 100-day streak', '👑', 'legendary', '{"type": "streak_days", "threshold": 100}', 40),
('Level 50 Club', 'Reach level 50', '💎', 'legendary', '{"type": "level", "threshold": 50}', 41),
('Achievement Hunter', 'Earn 20 achievements', '🏹', 'legendary', '{"type": "achievement_count", "threshold": 20}', 42),
-- Special (epic/legendary)
('Early Adopter', 'Joined before March 2026', '🌱', 'epic', '{"type": "early_adopter", "threshold": "2026-03-01"}', 50),
('Premium Pioneer', 'Make your first purchase', '💳', 'legendary', '{"type": "first_purchase", "threshold": 1}', 51)
ON CONFLICT DO NOTHING;

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
-- SHOP ITEMS (Run 68)
-- ========================================

-- Premium Achievements (purchasable only — no normal unlock criteria)
INSERT INTO shop_items (type, name, description, price_stars, price_xp, rarity, icon_emoji, is_featured, sort_order) VALUES
('achievement', 'Golden Collector', 'A prestigious badge for dedicated collectors who go above and beyond.', 50, 0, 'epic', '🥇', true, 1),
('achievement', 'Diamond Streak', 'Proof of unwavering commitment — only the most disciplined earn this.', 100, 0, 'legendary', '💎', true, 2),
('achievement', 'Platinum Social', 'A mark of social excellence and community leadership.', 75, 0, 'epic', '🤝', false, 3),
('achievement', 'Ruby Mastery', 'The rarest badge — symbolizing true mastery across all modes.', 150, 0, 'legendary', '❤️‍🔥', true, 4)
ON CONFLICT DO NOTHING;

-- Rare Avatar Items
INSERT INTO shop_items (type, name, description, price_stars, price_xp, rarity, icon_emoji, sort_order) VALUES
('avatar_item', 'Neon Mohawk', 'A glowing neon mohawk hairstyle that pulses with energy.', 40, 200, 'rare', '💇', 10),
('avatar_item', 'Shadow Cloak', 'A mysterious dark cloak that trails wisps of shadow.', 60, 0, 'epic', '🧥', 11),
('avatar_item', 'Crystal Crown', 'A crown of pure crystal shards that refracts light beautifully.', 80, 0, 'legendary', '👑', 12),
('avatar_item', 'Flame Wings', 'Blazing phoenix wings that leave embers in your wake.', 70, 350, 'epic', '🔥', 13)
ON CONFLICT DO NOTHING;

-- Trophy Boosters
INSERT INTO shop_items (type, name, description, price_stars, price_xp, rarity, icon_emoji, sort_order) VALUES
('trophy_booster', 'Trophy Revealer', 'Reveals hidden trophy criteria so you know exactly what to aim for.', 25, 150, 'rare', '🔍', 20),
('trophy_booster', 'Trophy Accelerator', '2x trophy progress speed for 24 hours. Stack the odds in your favor.', 50, 0, 'epic', '⚡', 21)
ON CONFLICT DO NOTHING;

-- XP Boosters
INSERT INTO shop_items (type, name, description, price_stars, price_xp, rarity, icon_emoji, sort_order) VALUES
('xp_booster', 'XP Doubler 24h', 'Double all XP earned for 24 hours. Perfect for grinding sessions.', 30, 500, 'rare', '✨', 30),
('xp_booster', 'XP Surge', '50% bonus XP for an entire week. Sustained growth accelerator.', 100, 0, 'epic', '🚀', 31)
ON CONFLICT DO NOTHING;

-- ========================================
-- RUSSIAN TRANSLATIONS FOR QUESTS (Run 92)
-- ========================================

-- Fitness quests
UPDATE quests SET title_ru = 'Утренняя растяжка 10 минут', description_ru = 'Начните день с лёгкой 10-минутной растяжки' WHERE title = '10-Minute Morning Stretch';
UPDATE quests SET title_ru = 'Лёгкая 15-минутная прогулка', description_ru = 'Совершите лёгкую 15-минутную прогулку по окрестностям' WHERE title = 'Light 15-Min Walk';
UPDATE quests SET title_ru = 'Цель на неделю: 2 тренировки', description_ru = 'Выполните как минимум 2 тренировки за эту неделю' WHERE title = 'Weekly Goal: 2 Sessions';
UPDATE quests SET title_ru = 'Утренняя тренировка', description_ru = 'Выполните утреннюю тренировку в зале или дома' WHERE title = 'Morning Workout';
UPDATE quests SET title_ru = 'Вечернее кардио', description_ru = 'Выполните вечернюю кардио-тренировку' WHERE title = 'Evening Cardio';
UPDATE quests SET title_ru = 'Цель на неделю: 4 тренировки', description_ru = 'Выполните как минимум 4 тренировки за эту неделю' WHERE title = 'Weekly Goal: 4 Sessions';
UPDATE quests SET title_ru = 'Испытание: 50 отжиманий', description_ru = 'Выполните 50 отжиманий за день в любом количестве подходов' WHERE title = '50 Push-Ups Challenge';
UPDATE quests SET title_ru = 'HIIT-тренировка на 1 час', description_ru = 'Выполните полноценную часовую высокоинтенсивную интервальную тренировку' WHERE title = '1-Hour HIIT Workout';
UPDATE quests SET title_ru = 'Цель на неделю: 6 тренировок', description_ru = 'Выполните как минимум 6 тренировок за эту неделю' WHERE title = 'Weekly Goal: 6 Sessions';

-- Hydration quests
UPDATE quests SET title_ru = 'Пить воду (каждые 2 часа)', description_ru = 'Поддерживайте водный баланс в течение дня — цель 12 стаканов' WHERE title = 'Drink Water (Every 2 Hours)';
UPDATE quests SET title_ru = 'Утреннее увлажнение', description_ru = 'Выпейте 2 стакана воды в течение часа после пробуждения' WHERE title = 'Morning Hydration';
UPDATE quests SET title_ru = 'Недельная цель по воде', description_ru = 'Поддерживайте водный баланс каждый день на этой неделе' WHERE title = 'Weekly Hydration Goal';
UPDATE quests SET title_ru = 'Выпить 8 стаканов сегодня', description_ru = 'Отслеживайте и выпейте минимум 8 стаканов воды за день' WHERE title = 'Drink 8 Glasses Today';
UPDATE quests SET title_ru = 'Заменить один напиток водой', description_ru = 'Замените сегодня один сладкий или кофейный напиток на воду' WHERE title = 'Replace One Drink With Water';
UPDATE quests SET title_ru = 'Неделя: 5 дней по 8+ стаканов', description_ru = 'Достигните цели в 8 стаканов в день минимум 5 дней на этой неделе' WHERE title = 'Weekly: 5 Days of 8+ Glasses';
UPDATE quests SET title_ru = 'Выпить 3 литра воды сегодня', description_ru = 'Отслеживайте и выпейте минимум 3 литра воды за один день' WHERE title = 'Drink 3L Water Today';
UPDATE quests SET title_ru = 'Неделя: идеальная гидратация', description_ru = 'Выполняйте дневную норму воды каждый день на этой неделе' WHERE title = 'Weekly: Perfect Hydration Streak';

-- Medication quests
UPDATE quests SET title_ru = 'Приём утренних лекарств', description_ru = 'Примите утреннюю дозу вовремя, чтобы не сбиваться с графика' WHERE title = 'Take Morning Medication';
UPDATE quests SET title_ru = 'Приём вечерних лекарств', description_ru = 'Примите вечернюю дозу перед сном для стабильного приёма' WHERE title = 'Take Evening Medication';
UPDATE quests SET title_ru = 'Еженедельная проверка запасов', description_ru = 'Проверьте запас лекарств и запланируйте пополнение при необходимости' WHERE title = 'Weekly Refill Check';
UPDATE quests SET title_ru = 'Записать побочные эффекты', description_ru = 'Запишите любые побочные эффекты или изменения, которые заметили сегодня' WHERE title = 'Log Side Effects';
UPDATE quests SET title_ru = 'Полный аудит лекарств', description_ru = 'Проверьте все лекарства, сроки годности и обновите список' WHERE title = 'Full Medication Audit';
UPDATE quests SET title_ru = 'Неделя: идеальный приём', description_ru = 'Принимайте все лекарства вовремя каждый день на этой неделе' WHERE title = 'Weekly: Perfect Adherence';
UPDATE quests SET title_ru = 'Принять утренние лекарства', description_ru = 'Отметьте все утренние лекарства как принятые в трекере' WHERE title = 'Take morning medications';
UPDATE quests SET title_ru = 'Принять вечерние лекарства', description_ru = 'Отметьте все вечерние лекарства как принятые в трекере' WHERE title = 'Take evening medications';
UPDATE quests SET title_ru = 'Идеальная неделя приёма', description_ru = 'Ни одной пропущенной дозы за неделю — все лекарства приняты по графику' WHERE title = 'Perfect medication week';

-- Habits quests
UPDATE quests SET title_ru = 'Утренняя проверка привычек', description_ru = 'Выполните утренний чек-ин привычек, чтобы начать день правильно' WHERE title = 'Morning Habit Check';
UPDATE quests SET title_ru = 'Вечерний обзор привычек', description_ru = 'Проверьте дневные привычки и отметьте выполненные' WHERE title = 'Evening Habit Review';
UPDATE quests SET title_ru = 'Еженедельный обзор привычек', description_ru = 'Проанализируйте, какие привычки закрепились, а какие нужно скорректировать' WHERE title = 'Weekly Habit Reflection';
UPDATE quests SET title_ru = 'Добавить новую микро-привычку', description_ru = 'Выберите одну новую микро-привычку и практикуйте её сегодня (напр., 1 мин медитации)' WHERE title = 'Add a New Micro-Habit';
UPDATE quests SET title_ru = 'Неделя: ежедневный трекинг привычек', description_ru = 'Отмечайте все активные привычки каждый день на этой неделе' WHERE title = 'Weekly: Track All Habits Daily';
UPDATE quests SET title_ru = 'Испытание: цепочка привычек', description_ru = 'Объедините 3 привычки в одну утреннюю рутину и выполните их все' WHERE title = 'Habit Stacking Challenge';
UPDATE quests SET title_ru = 'Неделя: 7-дневная идеальная серия', description_ru = 'Выполняйте все ежедневные чек-ины привычек каждый день на этой неделе' WHERE title = 'Weekly: 7-Day Perfect Streak';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check that data was inserted correctly
-- SELECT 'Modes:', COUNT(*) FROM modes;
-- SELECT 'Achievements:', COUNT(*) FROM achievements;
-- SELECT 'Quest Templates:', COUNT(*) FROM quests;
-- SELECT 'Shop Items:', COUNT(*) FROM shop_items;
