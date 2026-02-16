-- Run 67: Trophy System Tables
-- Adds trophies catalog and user_trophies for earned trophies

CREATE TABLE IF NOT EXISTS trophies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_emoji VARCHAR(10) NOT NULL,
    rarity VARCHAR(20) NOT NULL DEFAULT 'common',
    criteria JSONB NOT NULL DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_trophies (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trophy_id INT NOT NULL REFERENCES trophies(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, trophy_id)
);

CREATE INDEX IF NOT EXISTS idx_user_trophies_user_id ON user_trophies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trophies_trophy_id ON user_trophies(trophy_id);
