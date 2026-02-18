-- Run 75: Activity Hub — activity_types + activity_logs tables
-- Creates the core schema for sport/activity logging system.

-- Activity types catalog (running, yoga, meditation, etc.)
CREATE TABLE IF NOT EXISTS activity_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    icon_emoji VARCHAR(10),
    description TEXT,
    default_duration_min INTEGER,
    calories_per_min NUMERIC(5,2),
    requires_timer BOOLEAN DEFAULT false,
    requires_gps BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activity log entries
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type_id INTEGER NOT NULL REFERENCES activity_types(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_min INTEGER,
    distance_km NUMERIC(8,3),
    calories_burned INTEGER,
    notes TEXT,
    gps_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_started
    ON activity_logs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type
    ON activity_logs(activity_type_id);

-- Seed activity types (20+ across 6 categories)
INSERT INTO activity_types (name, category, icon_emoji, description, default_duration_min, calories_per_min, requires_timer, requires_gps)
VALUES
    -- Cardio (5)
    ('Running',        'Cardio',      '🏃', 'Outdoor or treadmill running',           30, 11.5, true,  true),
    ('Cycling',        'Cardio',      '🚴', 'Road or stationary cycling',             45,  8.0, true,  true),
    ('Swimming',       'Cardio',      '🏊', 'Pool or open-water swimming',            30, 10.0, true,  false),
    ('Jump Rope',      'Cardio',      '🪢', 'Skipping rope workout',                  15, 12.0, true,  false),
    ('HIIT',           'Cardio',      '🔥', 'High-intensity interval training',       25, 13.0, true,  false),

    -- Strength (5)
    ('Gym Workout',    'Strength',    '🏋️', 'General weight training session',        60,  6.0, true,  false),
    ('Push-ups',       'Strength',    '💪', 'Bodyweight push-up sets',                15,  7.0, true,  false),
    ('Pull-ups',       'Strength',    '🫸', 'Bar pull-up sets',                       15,  8.0, true,  false),
    ('Squats',         'Strength',    '🦵', 'Bodyweight or weighted squats',          20,  6.5, true,  false),
    ('Deadlifts',      'Strength',    '🏗️', 'Barbell deadlift session',               30,  7.5, true,  false),

    -- Flexibility (3)
    ('Yoga',           'Flexibility', '🧘', 'Yoga flow or session',                   45,  3.5, true,  false),
    ('Stretching',     'Flexibility', '🤸', 'General stretching routine',             20,  2.5, true,  false),
    ('Pilates',        'Flexibility', '🧎', 'Core-focused pilates session',           45,  4.0, true,  false),

    -- Sports (4)
    ('Basketball',     'Sports',      '🏀', 'Basketball game or practice',            60,  8.5, true,  false),
    ('Football',       'Sports',      '⚽', 'Football match or training',             90,  9.0, true,  true),
    ('Tennis',         'Sports',      '🎾', 'Tennis match or practice',               60,  7.5, true,  false),
    ('Boxing',         'Sports',      '🥊', 'Boxing training or sparring',            45, 10.0, true,  false),

    -- Outdoor (3)
    ('Hiking',         'Outdoor',     '🥾', 'Trail or mountain hiking',               90,  5.5, true,  true),
    ('Walking',        'Outdoor',     '🚶', 'Casual or brisk walking',                30,  3.5, true,  true),
    ('Climbing',       'Outdoor',     '🧗', 'Indoor or outdoor rock climbing',        60,  9.0, true,  false),

    -- Mind-Body (2)
    ('Meditation',     'Mind-Body',   '🧠', 'Guided or silent meditation',            15,  1.0, true,  false),
    ('Breathing Exercises', 'Mind-Body', '🌬️', 'Focused breathing techniques',        10,  1.0, true,  false)
ON CONFLICT DO NOTHING;
