-- Telegram RPG Quest Bot Database Schema
-- PostgreSQL 12+

-- Drop existing tables and views (for fresh install)
DROP VIEW IF EXISTS user_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS leaderboard_mv CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS user_activity_log CASCADE;
DROP TABLE IF EXISTS punishment_history CASCADE;
DROP TABLE IF EXISTS punishment_settings CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS streaks CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS quest_instances CASCADE;
DROP TABLE IF EXISTS quests CASCADE;
DROP TABLE IF EXISTS mode_configs CASCADE;
DROP TABLE IF EXISTS user_modes CASCADE;
DROP TABLE IF EXISTS modes CASCADE;
DROP TABLE IF EXISTS onboarding_state CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    timezone VARCHAR(50) DEFAULT 'UTC',
    current_level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    avatar_id INTEGER DEFAULT 1,                    -- User avatar selection (1-8), added in Run 4
    notification_enabled BOOLEAN DEFAULT true,      -- Daily summary notifications, added in Run 4
    reminder_time INTEGER DEFAULT 9,                -- Preferred reminder hour (UTC), added in Run 4
    CONSTRAINT check_level_positive CHECK (current_level >= 1),
    CONSTRAINT check_xp_non_negative CHECK (total_xp >= 0)
);
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- Modes (fitness, hydration, finance, learning)
CREATE TABLE modes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    icon_emoji VARCHAR(10)
);

-- User-enabled modes (many-to-many)
CREATE TABLE user_modes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mode_id INTEGER REFERENCES modes(id),
    enabled_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, mode_id)
);
CREATE INDEX idx_user_modes_user_id ON user_modes(user_id);
CREATE INDEX idx_user_modes_active ON user_modes(user_id, is_active);

-- Mode configurations (from quiz responses)
CREATE TABLE mode_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mode_id INTEGER REFERENCES modes(id),
    quiz_responses JSONB,        -- Stores quiz Q&A
    pain_points JSONB,            -- Pain points from questionnaire
    personalized_plan JSONB,      -- Generated plan (rule-based)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, mode_id)
);
CREATE INDEX idx_mode_configs_user_mode ON mode_configs(user_id, mode_id);

-- Quest templates (reusable quest definitions)
CREATE TABLE quests (
    id SERIAL PRIMARY KEY,
    mode_id INTEGER REFERENCES modes(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quest_type VARCHAR(20) CHECK (quest_type IN ('daily', 'weekly')) NOT NULL,
    xp_reward INTEGER DEFAULT 50,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    requires_timer BOOLEAN DEFAULT FALSE,
    timer_window_start TIME,      -- e.g., 06:00:00
    timer_window_end TIME,        -- e.g., 07:00:00
    readiness_check_enabled BOOLEAN DEFAULT FALSE,
    readiness_check_time TIME,    -- e.g., 05:45:00 (15 min before)
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_quests_mode ON quests(mode_id);
CREATE INDEX idx_quests_type ON quests(quest_type);

-- Quest instances (user-specific quest occurrences)
CREATE TABLE quest_instances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quest_id INTEGER REFERENCES quests(id),
    instance_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'in_progress', 'completed', 'failed', 'skipped')),
    readiness_confirmed BOOLEAN DEFAULT FALSE,
    readiness_confirmed_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    check_in_count INTEGER DEFAULT 0,
    xp_awarded INTEGER DEFAULT 0,
    target INTEGER DEFAULT 1,                -- Check-in target (easy=1, medium=3, hard=5), added in Run 13
    notes TEXT,
    UNIQUE(user_id, quest_id, instance_date)
);
CREATE INDEX idx_quest_instances_user_date ON quest_instances(user_id, instance_date);
CREATE INDEX idx_quest_instances_status ON quest_instances(status);
CREATE INDEX idx_quest_instances_date ON quest_instances(instance_date);

-- Check-ins (for timer-based quests)
CREATE TABLE check_ins (
    id SERIAL PRIMARY KEY,
    quest_instance_id INTEGER REFERENCES quest_instances(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP DEFAULT NOW(),
    is_valid BOOLEAN DEFAULT TRUE,  -- Within timer window?
    location_lat DECIMAL(10, 8),    -- Optional GPS
    location_lon DECIMAL(11, 8),
    notes TEXT
);
CREATE INDEX idx_check_ins_quest_instance ON check_ins(quest_instance_id);

-- Achievements
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    badge_icon VARCHAR(50),         -- Emoji or icon name
    criteria JSONB,                 -- {"type": "streak", "days": 7}
    xp_bonus INTEGER DEFAULT 0,
    rarity VARCHAR(20) CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
);

-- User achievements
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id),
    unlocked_at TIMESTAMP DEFAULT NOW(),
    notification_sent_at TIMESTAMPTZ,       -- Dedup for achievement notifier, added in Run 13
    UNIQUE(user_id, achievement_id)
);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- Streaks (per mode)
CREATE TABLE streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mode_id INTEGER REFERENCES modes(id),
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    UNIQUE(user_id, mode_id)
);
CREATE INDEX idx_streaks_user_mode ON streaks(user_id, mode_id);

-- Reminders (scheduled notifications)
CREATE TABLE reminders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quest_id INTEGER REFERENCES quests(id),
    reminder_type VARCHAR(50) CHECK (reminder_type IN ('readiness_check', 'quest_start', 'quest_end', 'daily_summary')),
    scheduled_time TIME NOT NULL,  -- In UTC
    timezone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_sent TIMESTAMP,
    message_template TEXT
);
CREATE INDEX idx_reminders_user_active ON reminders(user_id, is_active);
CREATE INDEX idx_reminders_scheduled ON reminders(scheduled_time) WHERE is_active = TRUE;

-- Punishment settings (per user)
CREATE TABLE punishment_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMP,
    intensity_level VARCHAR(20) DEFAULT 'medium' CHECK (intensity_level IN ('low', 'medium', 'high', 'extreme')),
    safe_mode BOOLEAN DEFAULT TRUE,
    max_xp_penalty INTEGER DEFAULT 200,     -- Cap on XP loss per day
    max_streak_reset INTEGER DEFAULT 7,     -- Max days of streak that can be reset
    custom_punishments JSONB,               -- User-defined punishments
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Punishment history (audit log)
CREATE TABLE punishment_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quest_instance_id INTEGER REFERENCES quest_instances(id),
    punishment_type VARCHAR(50),            -- 'xp_penalty', 'streak_reset', 'badge_revoke', 'custom'
    severity VARCHAR(20),
    xp_deducted INTEGER DEFAULT 0,
    streak_days_lost INTEGER DEFAULT 0,
    message_sent TEXT,
    applied_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_punishment_history_user ON punishment_history(user_id);
CREATE INDEX idx_punishment_history_applied ON punishment_history(applied_at);

-- Onboarding state (to resume interrupted flows)
CREATE TABLE onboarding_state (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    current_step VARCHAR(50),               -- 'mode_selection', 'fitness_quiz', 'pain_points', etc.
    quiz_data JSONB,                        -- Stores partial quiz responses
    last_updated TIMESTAMP DEFAULT NOW()
);

-- User activity log (tracks all interactions for engagement analytics, added in Run 3)
CREATE TABLE user_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,     -- 'quest_complete', 'check_in', 'bot_command', 'miniapp_open'
    activity_data JSONB,                     -- Optional metadata
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_activity_log_user_date ON user_activity_log(user_id, created_at);
CREATE INDEX idx_activity_log_type ON user_activity_log(activity_type);

-- Payments (Telegram Stars payment records, added in Run 44)
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'XTR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    provider VARCHAR(50) NOT NULL DEFAULT 'telegram_stars',
    telegram_payment_charge_id VARCHAR(255),
    provider_payment_charge_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Subscriptions (premium tier tracking, added in Run 44)
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);

-- User stats view (used by achievement_manager.py check_and_unlock_achievements, added in Run 19)
CREATE VIEW user_stats AS
SELECT
    u.id AS user_id,
    u.current_level AS level,
    u.total_xp,
    COALESCE(MAX(s.current_streak), 0) AS current_streak,
    COALESCE(MAX(s.longest_streak), 0) AS longest_streak,
    COALESCE(COUNT(DISTINCT qi.id) FILTER (WHERE qi.status = 'completed'), 0) AS quests_completed,
    COALESCE(COUNT(DISTINCT qi.id) FILTER (WHERE qi.status = 'completed' AND q.quest_type = 'daily'), 0) AS daily_quests_completed,
    COALESCE(COUNT(DISTINCT qi.id) FILTER (WHERE qi.status = 'completed' AND q.quest_type = 'weekly'), 0) AS weekly_quests_completed
FROM users u
LEFT JOIN streaks s ON s.user_id = u.id
LEFT JOIN quest_instances qi ON qi.user_id = u.id
LEFT JOIN quests q ON qi.quest_id = q.id
WHERE u.is_active = true
GROUP BY u.id, u.current_level, u.total_xp;

-- Leaderboard materialized view (cached rankings, refreshed every 30 min by pg-boss, added in Run 3)
CREATE MATERIALIZED VIEW leaderboard_mv AS
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

CREATE UNIQUE INDEX idx_leaderboard_mv_user_id ON leaderboard_mv(user_id);
CREATE INDEX idx_leaderboard_mv_xp_rank ON leaderboard_mv(xp_rank);

-- Comments
COMMENT ON TABLE users IS 'Core user accounts linked to Telegram';
COMMENT ON TABLE modes IS 'Available mode categories (fitness, hydration, finance, learning)';
COMMENT ON TABLE user_modes IS 'User-enabled modes (many-to-many relationship)';
COMMENT ON TABLE mode_configs IS 'Personalized configurations per mode from quiz responses';
COMMENT ON TABLE quests IS 'Reusable quest templates';
COMMENT ON TABLE quest_instances IS 'User-specific quest occurrences per day/week';
COMMENT ON TABLE check_ins IS 'Check-in records for timer-based quests';
COMMENT ON TABLE achievements IS 'Achievement definitions';
COMMENT ON TABLE user_achievements IS 'Unlocked achievements per user';
COMMENT ON TABLE streaks IS 'Streak tracking per mode per user';
COMMENT ON TABLE reminders IS 'Scheduled reminders for quests';
COMMENT ON TABLE punishment_settings IS 'User consent and punishment preferences';
COMMENT ON TABLE punishment_history IS 'Audit log of applied punishments';
COMMENT ON TABLE onboarding_state IS 'State for resuming interrupted onboarding';
COMMENT ON TABLE user_activity_log IS 'Tracks all user interactions for engagement analytics';
COMMENT ON TABLE payments IS 'Telegram Stars payment records for premium subscriptions';
COMMENT ON TABLE subscriptions IS 'User premium subscription tier and billing state';
COMMENT ON VIEW user_stats IS 'Aggregated user stats for achievement checking (level, XP, streaks, quest counts)';
COMMENT ON MATERIALIZED VIEW leaderboard_mv IS 'Cached leaderboard rankings, refreshed every 30 minutes by pg-boss job';

-- Friend requests (social system, added in Run 45)
CREATE TABLE friend_requests (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id)
);
CREATE INDEX idx_friend_requests_to_user ON friend_requests(to_user_id);

-- Challenges (social system, added in Run 45)
CREATE TABLE challenges (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    mode VARCHAR(50),
    target_value INTEGER,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge participants (social system, added in Run 45)
CREATE TABLE challenge_participants (
    challenge_id INTEGER NOT NULL REFERENCES challenges(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    progress INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (challenge_id, user_id)
);

COMMENT ON TABLE friend_requests IS 'Friend request tracking for social features';
COMMENT ON TABLE challenges IS 'User-created challenges with goals and deadlines';
COMMENT ON TABLE challenge_participants IS 'Challenge participation and progress tracking';
