-- Run 87 Migration: Medication tracker tables + notification log
-- Apply to production: psql -h localhost -U postgres -d telegram_rpg -f database/migrations/run87_medication.sql

BEGIN;

-- ========================================
-- 1. Medications table
-- ========================================
CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(20) CHECK (frequency IN ('daily', 'twice_daily', 'three_times', 'weekly', 'as_needed')) NOT NULL DEFAULT 'daily',
    time_of_day TIME[] NOT NULL DEFAULT '{08:00}',
    color VARCHAR(20) DEFAULT 'blue',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(user_id, is_active);

-- ========================================
-- 2. Medication logs table
-- ========================================
CREATE TABLE IF NOT EXISTS medication_logs (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_time TIME NOT NULL,
    status VARCHAR(20) CHECK (status IN ('taken', 'skipped', 'postponed')) NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_med_logs_user_date ON medication_logs(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_med_logs_medication ON medication_logs(medication_id, scheduled_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_med_logs_unique ON medication_logs(medication_id, scheduled_date, scheduled_time);

-- ========================================
-- 3. Notification log table
-- ========================================
CREATE TABLE IF NOT EXISTS notification_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notif_log_user ON notification_log(user_id, sent_at DESC);

-- ========================================
-- 4. Medication tracker quest templates
-- ========================================
DO $$
DECLARE
    medication_mode_id INT;
BEGIN
    SELECT id INTO medication_mode_id FROM modes WHERE name = 'medication';

    IF medication_mode_id IS NOT NULL THEN
        INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory) VALUES
        (medication_mode_id, 'Take morning medications', 'Log all your morning medications as taken in the medication tracker', 'daily', 30, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
        (medication_mode_id, 'Take evening medications', 'Log all your evening medications as taken in the medication tracker', 'daily', 30, 'easy', FALSE, NULL, NULL, FALSE, NULL, FALSE),
        (medication_mode_id, 'Perfect medication week', 'No missed doses all week — every scheduled medication logged as taken', 'weekly', 200, 'hard', FALSE, NULL, NULL, FALSE, NULL, FALSE)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ========================================
-- 5. Table comments
-- ========================================
COMMENT ON TABLE medications IS 'User medication definitions with schedule and dosage (added Run 87)';
COMMENT ON TABLE medication_logs IS 'Medication intake log entries — taken, skipped, or postponed (added Run 87)';
COMMENT ON TABLE notification_log IS 'Notification history for in-app notification center (added Run 87)';

COMMIT;
