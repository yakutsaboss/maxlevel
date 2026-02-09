# Run 7 — Agent B Changes

## Summary
Mode-aware achievement checking, categories endpoint, mode-filtered leaderboard, and admin refactor.

## Changed Files

### bot/src/api/routes/achievements.ts
- **New helper functions**: `checkCriteriaMet()` and `filterQualifyingAchievements()` — handle mode-aware criteria types
- **New criteria types supported**: `quest_complete` (with mode), `streak` (with mode), `quest_complete_consecutive` (with mode), `multi_mode_active`, `streak_rebuild`, `level_reached`
- **New endpoint**: `GET /api/achievements/categories` — returns distinct achievement categories from criteria

### bot/src/api/routes/leaderboard.ts
- **Enhanced endpoint**: `GET /api/leaderboard?mode=<name>` — optional mode filter
- When `mode` is provided, ranks users by mode-specific XP earned from completed quests
- Without `mode`, returns the existing cross-mode top 50 leaderboard

### bot/src/api/routes/admin.ts (REFACTORED)
- Reduced from 498 lines to a thin router (~23 lines) that mounts sub-routers
- All API paths unchanged — no breaking changes

### bot/src/api/routes/admin-stats.ts (NEW)
- `GET /api/admin/stats`
- `POST /api/admin/analytics/export`
- `GET /api/admin/modes`
- `POST /api/admin/broadcast`
- `GET /api/admin/logs`

### bot/src/api/routes/admin-users.ts (NEW)
- `GET /api/admin/users`
- `GET /api/admin/users/:userId`
- `PATCH /api/admin/users/:userId`
- `DELETE /api/admin/users/:userId`
- `POST /api/admin/users/:userId/deactivate`
- `POST /api/admin/users/:userId/reactivate`

### bot/src/api/routes/admin-jobs.ts (NEW)
- `GET /api/admin/jobs`
- `POST /api/admin/jobs/:name/trigger`

## New API Endpoints
- `GET /api/achievements/categories` — returns `{ categories: ['fitness', 'general', 'hydration', ...] }`
- `GET /api/leaderboard?mode=fitness` — mode-filtered leaderboard

## Database Queries Added
- Mode-specific quest completion count: `quest_instances` JOIN `quests` JOIN `modes`
- Mode-specific streak: `streaks` JOIN `modes`
- Consecutive days with mode quests: CTE with ROW_NUMBER gap-and-island pattern
- Multi-mode active check: `user_modes` COUNT DISTINCT
- Mode leaderboard: aggregates `quest_instances.xp_awarded` per mode
