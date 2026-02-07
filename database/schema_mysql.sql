-- Telegram RPG Quest Bot Database Schema
-- MySQL 8.0+
-- Converted from PostgreSQL schema

-- Drop existing tables (for fresh install)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS punishment_history;
DROP TABLE IF EXISTS punishment_settings;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS streaks;
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS check_ins;
DROP TABLE IF EXISTS quest_instances;
DROP TABLE IF EXISTS quests;
DROP TABLE IF EXISTS mode_configs;
DROP TABLE IF EXISTS user_modes;
DROP TABLE IF EXISTS modes;
DROP TABLE IF EXISTS onboarding_state;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'UTC',
    current_level INT DEFAULT 1,
    total_xp INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT check_level_positive CHECK (current_level >= 1),
    CONSTRAINT check_xp_non_negative CHECK (total_xp >= 0)
) COMMENT='Core user accounts linked to Telegram';

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_active ON users(is_active);

-- Modes (fitness, hydration, finance, learning)
CREATE TABLE modes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    icon_emoji VARCHAR(10)
) COMMENT='Available mode categories (fitness, hydration, finance, learning)';

-- User-enabled modes (many-to-many)
CREATE TABLE user_modes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mode_id INT NOT NULL,
    enabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE KEY unique_user_mode(user_id, mode_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mode_id) REFERENCES modes(id)
) COMMENT='User-enabled modes (many-to-many relationship)';

CREATE INDEX idx_user_modes_user_id ON user_modes(user_id);
CREATE INDEX idx_user_modes_active ON user_modes(user_id, is_active);

-- Mode configurations (from quiz responses)
CREATE TABLE mode_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mode_id INT NOT NULL,
    quiz_responses JSON,        -- Stores quiz Q&A
    pain_points JSON,            -- Pain points from questionnaire
    personalized_plan JSON,      -- Generated plan (rule-based)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_mode_config(user_id, mode_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mode_id) REFERENCES modes(id)
) COMMENT='Personalized configurations per mode from quiz responses';

CREATE INDEX idx_mode_configs_user_mode ON mode_configs(user_id, mode_id);

-- Quest templates (reusable quest definitions)
CREATE TABLE quests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mode_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quest_type VARCHAR(20) NOT NULL CHECK (quest_type IN ('daily', 'weekly')),
    xp_reward INT DEFAULT 50,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    requires_timer BOOLEAN DEFAULT FALSE,
    timer_window_start TIME,      -- e.g., 06:00:00
    timer_window_end TIME,        -- e.g., 07:00:00
    readiness_check_enabled BOOLEAN DEFAULT FALSE,
    readiness_check_time TIME,    -- e.g., 05:45:00 (15 min before)
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mode_id) REFERENCES modes(id)
) COMMENT='Reusable quest templates';

CREATE INDEX idx_quests_mode ON quests(mode_id);
CREATE INDEX idx_quests_type ON quests(quest_type);

-- Quest instances (user-specific quest occurrences)
CREATE TABLE quest_instances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quest_id INT NOT NULL,
    instance_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'in_progress', 'completed', 'failed', 'skipped')),
    readiness_confirmed BOOLEAN DEFAULT FALSE,
    readiness_confirmed_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    check_in_count INT DEFAULT 0,
    xp_awarded INT DEFAULT 0,
    notes TEXT,
    UNIQUE KEY unique_quest_instance(user_id, quest_id, instance_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quest_id) REFERENCES quests(id)
) COMMENT='User-specific quest occurrences per day/week';

CREATE INDEX idx_quest_instances_user_date ON quest_instances(user_id, instance_date);
CREATE INDEX idx_quest_instances_status ON quest_instances(status);
CREATE INDEX idx_quest_instances_date ON quest_instances(instance_date);

-- Check-ins (for timer-based quests)
CREATE TABLE check_ins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quest_instance_id INT NOT NULL,
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT TRUE,  -- Within timer window?
    location_lat DECIMAL(10, 8),    -- Optional GPS
    location_lon DECIMAL(11, 8),
    notes TEXT,
    FOREIGN KEY (quest_instance_id) REFERENCES quest_instances(id) ON DELETE CASCADE
) COMMENT='Check-in records for timer-based quests';

CREATE INDEX idx_check_ins_quest_instance ON check_ins(quest_instance_id);

-- Achievements
CREATE TABLE achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    badge_icon VARCHAR(50),         -- Emoji or icon name
    criteria JSON,                  -- {"type": "streak", "days": 7}
    xp_bonus INT DEFAULT 0,
    rarity VARCHAR(20) CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
) COMMENT='Achievement definitions';

-- User achievements
CREATE TABLE user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_achievement(user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
) COMMENT='Unlocked achievements per user';

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- Streaks (per mode)
CREATE TABLE streaks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mode_id INT NOT NULL,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_activity_date DATE,
    UNIQUE KEY unique_user_mode_streak(user_id, mode_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mode_id) REFERENCES modes(id)
) COMMENT='Streak tracking per mode per user';

CREATE INDEX idx_streaks_user_mode ON streaks(user_id, mode_id);

-- Reminders (scheduled notifications)
CREATE TABLE reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quest_id INT,
    reminder_type VARCHAR(50) CHECK (reminder_type IN ('readiness_check', 'quest_start', 'quest_end', 'daily_summary')),
    scheduled_time TIME NOT NULL,  -- In UTC
    timezone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_sent TIMESTAMP NULL,
    message_template TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quest_id) REFERENCES quests(id)
) COMMENT='Scheduled reminders for quests';

CREATE INDEX idx_reminders_user_active ON reminders(user_id, is_active);
CREATE INDEX idx_reminders_scheduled ON reminders(scheduled_time, is_active);

-- Punishment settings (per user)
CREATE TABLE punishment_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMP NULL,
    intensity_level VARCHAR(20) DEFAULT 'medium' CHECK (intensity_level IN ('low', 'medium', 'high', 'extreme')),
    safe_mode BOOLEAN DEFAULT TRUE,
    max_xp_penalty INT DEFAULT 200,     -- Cap on XP loss per day
    max_streak_reset INT DEFAULT 7,     -- Max days of streak that can be reset
    custom_punishments JSON,            -- User-defined punishments
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT='User consent and punishment preferences';

-- Punishment history (audit log)
CREATE TABLE punishment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quest_instance_id INT,
    punishment_type VARCHAR(50),            -- 'xp_penalty', 'streak_reset', 'badge_revoke', 'custom'
    severity VARCHAR(20),
    xp_deducted INT DEFAULT 0,
    streak_days_lost INT DEFAULT 0,
    message_sent TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quest_instance_id) REFERENCES quest_instances(id)
) COMMENT='Audit log of applied punishments';

CREATE INDEX idx_punishment_history_user ON punishment_history(user_id);
CREATE INDEX idx_punishment_history_applied ON punishment_history(applied_at);

-- Onboarding state (to resume interrupted flows)
CREATE TABLE onboarding_state (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    current_step VARCHAR(50),               -- 'mode_selection', 'fitness_quiz', 'pain_points', etc.
    quiz_data JSON,                         -- Stores partial quiz responses
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT='State for resuming interrupted onboarding';
