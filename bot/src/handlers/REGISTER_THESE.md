# New Handlers to Register in index.ts

These handlers were created by Agent B and need to be registered in `bot/src/index.ts`.

## New Command Handlers

### /settings
```typescript
import { handleSettings, handleSettingsCallback } from './handlers/settings.js';

// Register command
bot.command('settings', handleSettings);

// Register callback queries (all start with 'settings:')
bot.callbackQuery(/^settings:/, handleSettingsCallback);
```

### /stats
```typescript
import { handleStats, handleStatsCallback } from './handlers/stats.js';

// Register command
bot.command('stats', handleStats);

// Register callback queries (all start with 'stats:')
bot.callbackQuery(/^stats:/, handleStatsCallback);
```

## Bot Commands Menu Update

Add to `bot.api.setMyCommands()`:
```typescript
{ command: 'settings', description: 'Configure notifications, reminders, timezone' },
{ command: 'stats', description: 'View your weekly and all-time statistics' },
```

## Callback Query Prefixes

The new handlers use these callback data prefixes:
- `settings:notif`, `settings:notif:on`, `settings:notif:off`
- `settings:reminder`, `settings:reminder:<hour>`
- `settings:tz`, `settings:tz:<timezone>`
- `settings:back`
- `stats:week`, `stats:all`

Make sure these don't conflict with existing callback routes.
