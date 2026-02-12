-- Migration 001: Social features tables (Run 45)
-- Creates friend_requests, challenges, and challenge_participants tables

BEGIN;

-- Friend requests (social system)
CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id)
);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user ON friend_requests(to_user_id);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
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

-- Challenge participants
CREATE TABLE IF NOT EXISTS challenge_participants (
    challenge_id INTEGER NOT NULL REFERENCES challenges(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    progress INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (challenge_id, user_id)
);

COMMIT;
