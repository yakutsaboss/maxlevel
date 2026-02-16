-- Run 65: Add completed_at column to challenge_participants
-- Non-destructive migration (IF NOT EXISTS)
ALTER TABLE challenge_participants ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
