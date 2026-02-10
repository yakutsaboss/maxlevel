-- Run 13: Add target column to quest_instances
-- Fixes the check-in bug where every quest auto-completes after 1 check-in
-- because target was hardcoded to 1 in the checkins.ts query.
--
-- Target mapping by difficulty: easy=1, medium=3, hard=5
-- Idempotent: safe to run multiple times.

-- Step 1: Add target column with default 1
ALTER TABLE quest_instances ADD COLUMN IF NOT EXISTS target INTEGER DEFAULT 1;

-- Step 2: Backfill existing rows based on quest difficulty
UPDATE quest_instances qi
SET target = CASE
  WHEN q.difficulty = 'easy' THEN 1
  WHEN q.difficulty = 'medium' THEN 3
  WHEN q.difficulty = 'hard' THEN 5
  ELSE 1
END
FROM quests q
WHERE qi.quest_id = q.id AND qi.target = 1;
