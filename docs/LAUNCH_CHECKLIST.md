# MaxLevel RPG Bot — Launch Checklist

## Pre-Launch: Build & Tests

- [ ] Run full test suite: `cd bot && npx vitest --run`
- [ ] Verify TypeScript compiles cleanly: `cd bot && npm run build`
- [ ] Build mini-app: `cd mini-app && npm run build`
- [ ] Verify mini-app API URL is correct: `grep 'yakutsa.ru/api' mini-app/dist/assets/index-*.js`
- [ ] Run mini-app diagnostic: `python tools/mini_app_diagnostic.py`
- [ ] Ensure no `.env` files or secrets are committed: `git diff --cached --name-only | grep -i env`

## Pre-Launch: Environment

- [ ] Verify `.env` on server has all required variables:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_BOT_USERNAME`
  - `DATABASE_URL`
  - `ADMIN_USERNAME` / `ADMIN_PASSWORD`
  - `TELEGRAM_NOTIFICATION_BOT_TOKEN`
  - `TELEGRAM_NOTIFICATION_CHAT_ID`
  - `PAYMENT_WEBHOOK_SECRET`
- [ ] Verify `mini-app/.env.production` exists on server with `VITE_API_URL=https://yakutsa.ru/api`
- [ ] Verify SSL certificate is valid: `curl -vI https://yakutsa.ru 2>&1 | grep "SSL certificate"`
- [ ] Verify certbot auto-renewal: `ssh root@85.239.58.205 "certbot certificates"`

## Database

### Pending Migrations
Run all migrations in order on the production database:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d telegram_rpg
```

| Migration File | Description |
|---|---|
| `001_leaderboard_and_activity.sql` | Leaderboard views, activity log |
| `001_add_performance_indexes.sql` | Performance indexes |
| `001_social_tables.sql` | Friend requests, challenges tables |
| `002_performance_indexes.sql` | Additional indexes |
| `003_finance_tables.sql` | Budget entries, savings goals |
| `run5_sync.sql` | Run 5 schema sync |
| `run6_achievements.sql` | Achievement tables |
| `run11_quest_templates.sql` | Quest template updates |
| `run13_quest_target.sql` | Quest target column |
| `run13_achievement_dedup.sql` | Achievement dedup constraint |
| `run14_notification_backfill.sql` | Notification backfill |
| `run16_indexes.sql` | Run 16 indexes |
| `run56_tier_rename.sql` | Subscription tier rename |
| `run57_quest_rebalance.sql` | Quest XP rebalance |
| `run57_leaderboard_avatar.sql` | Avatar in leaderboard |
| `run65_completed_at.sql` | completed_at column |
| `run66_avatar_tables.sql` | Avatar items, user_avatar |
| `run67_trophy_tables.sql` | Trophies, user_trophies |
| `run68_shop_tables.sql` | Shop items, purchases |
| `run69_inventory_equipped.sql` | Inventory equipped flag |
| `run73_dnd.sql` | DND (Do Not Disturb) columns |

### Verify Database

- [ ] All tables exist: `\dt` in psql
- [ ] Seed data loaded: `SELECT COUNT(*) FROM modes;` (should be 6)
- [ ] Quest templates exist: `SELECT COUNT(*) FROM quests;` (should be 50+)
- [ ] Achievements exist: `SELECT COUNT(*) FROM achievements;` (should be 30+)
- [ ] Trophies exist: `SELECT COUNT(*) FROM trophies;` (should be 10+)
- [ ] Shop items exist: `SELECT COUNT(*) FROM shop_items;` (should be > 0)
- [ ] Avatar items exist: `SELECT COUNT(*) FROM avatar_items;` (should be > 0)
- [ ] Indexes are in place: `\di` to list all indexes

## Mini-App

- [ ] Verify `VITE_API_URL` baked into build is `https://yakutsa.ru/api` (not `localhost:3000`)
  ```bash
  grep 'yakutsa.ru/api' /opt/wibecode-bot/mini-app/dist/assets/index-*.js
  ```
- [ ] Verify service worker version is up to date (check `sw.js` or `service-worker.js`)
- [ ] Verify `manifest.json` has correct `start_url`, `name`, and icons
- [ ] Test mini-app opens in Telegram (via bot's web_app button)
- [ ] Test mini-app loads on slow connection (service worker caching)

## Server & Processes

- [ ] PM2 process is running: `pm2 status`
- [ ] Process name is `telegram-rpg-bot`
- [ ] Memory usage is reasonable: `pm2 monit`
- [ ] Webhook is registered: verify bot responds to `/start` in Telegram
- [ ] nginx config serves:
  - `/webhook` → `localhost:3000/webhook`
  - `/api/*` → `localhost:3000/api/*`
  - `/*` → mini-app static files

## Monitoring & Health

- [ ] Health endpoint responds: `curl https://yakutsa.ru/api/health`
- [ ] Check PM2 logs for errors: `pm2 logs telegram-rpg-bot --lines 50`
- [ ] Verify pg-boss job queue is running (check admin API): `GET /api/admin/jobs`
- [ ] All 10 background jobs registered:
  - `daily-quest-reset`
  - `streak-check`
  - `quest-reminders`
  - `daily-summary`
  - `leaderboard-refresh`
  - `achievement-batch-check`
  - `achievement-notifier`
  - `punishment-check`
  - `db-cleanup`
  - `analytics-export`

## Post-Launch: Manual Testing

### Core User Flows
- [ ] Open bot in Telegram, send `/start`
- [ ] Mini-app opens with onboarding flow
- [ ] Select modes, answer quiz questions
- [ ] Complete onboarding -> dashboard loads with assigned quests
- [ ] Check in on a quest -> progress updates, XP awarded
- [ ] Complete a quest -> XP animation, level up if applicable
- [ ] View achievements page -> unlocked/locked shown correctly
- [ ] View leaderboard -> current user appears with correct rank

### Notification Flows
- [ ] Quest reminders arrive at configured `reminder_time`
- [ ] Daily summary arrives with correct stats
- [ ] Achievement notifications sent when unlocked
- [ ] DND settings respected (no notifications during DND hours)

### Social Features
- [ ] Search for users by username
- [ ] Send a friend request
- [ ] Accept a friend request
- [ ] Create a challenge
- [ ] Join a challenge
- [ ] Update challenge progress

### Monetization
- [ ] View subscription tiers
- [ ] Channel subscription check works (@yakutsaway)
- [ ] Telegram Stars payment flow (create invoice -> pay -> webhook confirms)
- [ ] Shop items display correctly
- [ ] Purchase with XP works
- [ ] Purchased items appear in inventory
- [ ] Equip/unequip avatar items

### Settings & Account
- [ ] Change timezone
- [ ] Toggle notifications
- [ ] Set DND hours
- [ ] Update profile name
- [ ] Export data (CSV and JSON)
- [ ] Delete account -> data wiped, re-onboarding on next open

### Admin Panel
- [ ] Admin login works (Basic Auth)
- [ ] System stats endpoint returns data
- [ ] User list with pagination
- [ ] Quest template CRUD
- [ ] Job list and manual trigger
- [ ] Broadcast message

## Post-Launch: Verify Webhook

```bash
# Verify webhook is set correctly
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo" | python -m json.tool
```

Expected:
- `url`: `https://yakutsa.ru/webhook`
- `has_custom_certificate`: false
- `pending_update_count`: 0 (or low number)
- `last_error_date`: should be empty or old

## Rollback Plan

If critical issues are found after launch:

1. **Quick fix**: SSH in, fix code, rebuild, restart PM2
2. **Rollback to previous commit**:
   ```bash
   ssh root@85.239.58.205
   cd /opt/wibecode-bot
   git log --oneline -5  # find the commit to roll back to
   git checkout <commit-hash> -- bot/ mini-app/
   cd bot && npm run build
   cd ../mini-app && npm run build
   pm2 restart telegram-rpg-bot --update-env
   ```
3. **Database rollback**: Migrations are forward-only. If a migration breaks something, write a corrective migration.
