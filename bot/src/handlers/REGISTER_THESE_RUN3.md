# Run 3 — New Commands to Register (Agent B)

## Already Registered by Agent B

1. **`/profile`** — `handleProfile` from `./handlers/profile.ts`
   - Registered in `index.ts`: `bot.command('profile', handleProfile)`
   - Replaced the old miniapp `handleOpenProfile` for the `/profile` command

2. **`/help`** — `handleHelp` + `handleHelpCallback` from `./handlers/help.ts`
   - Registered in `index.ts`: `bot.command('help', handleHelp)` and `bot.callbackQuery(/^help:/, handleHelpCallback)`
   - Replaced the inline /help stub in index.ts

## New Exports (not commands)

3. **`sendDailySummary`** from `./handlers/dailySummary.ts`
   - Exported function `sendDailySummary(bot, userId)` — to be wired into a pg-boss job later
   - NOT a command handler — it's called from background jobs
