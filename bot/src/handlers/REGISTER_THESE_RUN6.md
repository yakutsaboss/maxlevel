# Run 6 Agent B Changes — What Was Modified

## No New Commands to Register
Agent B did not add new bot commands or handlers. No changes to `index.ts` needed.

## Changes Summary

### 1. Database: 10 New Achievements (Finance + Learning)
- **File**: `database/seed_data.sql` — added 5 Finance + 5 Learning achievements
- **File**: `database/migrations/run6_achievements.sql` — idempotent migration with ON CONFLICT DO NOTHING
- **Run on server**: `PGPASSWORD=postgres psql -h localhost -U postgres -d telegram_rpg -f database/migrations/run6_achievements.sql`

### 2. Performance Indexes (in migration)
- `idx_qi_user_status` — quest_instances(user_id, status) WHERE completed
- `idx_qi_completed_at` — quest_instances(completed_at) WHERE completed
- `idx_ua_user` — user_achievements(user_id)
- `idx_streaks_user` — streaks(user_id)

### 3. Daily Summary: Timezone-Aware
- **File**: `bot/src/jobs/definitions/dailySummary.ts`
- Changed cron from `0 21 * * *` (9 PM UTC only) to `0 * * * *` (every hour)
- Now filters users by `reminder_time = current UTC hour`
- Each user gets their summary at their preferred hour

### 4. Achievements API: Category Field
- **File**: `bot/src/api/routes/achievements.ts`
- `GET /api/achievements` now returns `category` field (extracted from `criteria->>'mode'`)
- Defaults to `'general'` for cross-mode achievements
- Mini-app can group achievements by category without parsing JSON
