# Run 2: New Command Registrations

These have ALREADY been added to `bot/src/index.ts` by Agent B:

## /leaderboard command

```typescript
// Import (already added)
import { handleLeaderboard } from './handlers/leaderboard.js';

// Registration (already added)
bot.command('leaderboard', handleLeaderboard);
```

## /menu updated

`/leaderboard - View top players` line added to the menu command text.

## New API Endpoints (no registration needed — already in route files)

- `GET /api/users/:telegramId/preferences` — user notification/timezone preferences
- `PATCH /api/users/:telegramId/preferences` — update preferences
- `PATCH /api/quests/:questId/progress` — update quest progress (auto-completes at target)
