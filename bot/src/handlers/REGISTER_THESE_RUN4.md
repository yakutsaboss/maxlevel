# Run 4 Agent B — Changes Documentation

## Bug Fixes
- `bot/src/jobs/definitions/questReminders.ts` — Fixed `|| 5` to `?? 5` on line 70 (retry_after=0 was treated as falsy)

## Schema Sync
- `database/schema.sql` — Added 3 columns to `users` table: `avatar_id`, `notification_enabled`, `reminder_time`

## New Files
- `bot/src/jobs/definitions/dailySummary.ts` — Daily summary job definition (cron: `0 21 * * *`, 9 PM UTC)

## Modified Files
- `bot/src/jobs/registerJobs.ts` — Registered `daily-summary` job + passes bot instance via `dailySummary.setBotInstance(bot)`
- `bot/src/api/routes/leaderboard.ts` — Added `GET /api/leaderboard/weekly` endpoint (XP in last 7 days, 5min cache)

## No New Command Registrations Needed
No changes to `bot/src/index.ts` — no new bot commands added in this run.

## Notes for Agent 0
- Daily summary job queries `notification_enabled = true` users — this column was added by Agent 0's migration before Run 4
- Weekly leaderboard queries `quest_instances` directly (no materialized view) — performance should be fine for current user count
- The `sendDailySummary` handler is called with `as any` cast because it expects `Bot` (default Context) while the job stores `Bot<MyContext>` — this is safe since it only uses `bot.api.sendMessage`
