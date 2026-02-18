# MaxLevel RPG Bot — Architecture Overview

## System Overview

```
                         Telegram Cloud
                              |
                    HTTPS Webhook (/webhook)
                              |
                    +-------------------+
                    |   nginx (SSL)     |
                    |  reverse proxy    |
                    +-------------------+
                              |
              +---------------+---------------+
              |                               |
     /webhook (Bot)              /api/* (REST API)
              |                               |
     +--------+--------+        +-------------+-------------+
     |  Grammy Bot      |        |   Express API Server      |
     |  (commands,       |        |   (Mini-App backend)      |
     |   inline keyboards)|       |   - Auth middleware        |
     +--------+--------+        |   - Rate limiter           |
              |                  |   - Route handlers         |
              |                  +-------------+-------------+
              |                               |
              +---------------+---------------+
                              |
                    +---------+---------+
                    |   PostgreSQL 16    |
                    |   (telegram_rpg)   |
                    +---------+---------+
                              |
                    +---------+---------+
                    |   pg-boss          |
                    |   (job queue)      |
                    +-------------------+
```

## Components

### 1. Telegram Bot (Grammy)

- **Framework**: Grammy (TypeScript Telegram bot framework)
- **Mode**: Webhook (not polling) at `https://yakutsa.ru/webhook`
- **Commands**: `/start` (registration + mini-app launch), `/help`, `/stats`, `/modes`, `/quests`
- **Inline keyboards**: Quest completion, check-ins, mode selection

### 2. REST API (Express)

- **Framework**: Express 4 (TypeScript)
- **Base URL**: `https://yakutsa.ru/api`
- **Authentication**: Telegram `initData` validation (HMAC-SHA256)
- **Admin auth**: HTTP Basic Authentication
- **Rate limiting**: `express-rate-limit` (read: 100/min, mutation: 30/min)
- **19 route groups** mounted at `/api/*` (see API_REFERENCE.md)

### 3. Mini-App (React + Vite)

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Telegram theme integration
- **State**: React Context + custom hooks
- **Pages**: Dashboard, Quests, Achievements, Leaderboard, Shop, Inventory, Analytics, Social, Finance, Settings, Profile
- **PWA**: Service Worker + manifest for offline support
- **Accessibility**: WCAG 2.1 AA, keyboard navigation, screen reader support
- **Build output**: Served as static files via nginx

### 4. Database (PostgreSQL 16)

- **Name**: `telegram_rpg`
- **Key tables**: `users`, `modes`, `user_modes`, `quests`, `quest_instances`, `check_ins`, `streaks`, `achievements`, `user_achievements`, `friend_requests`, `challenges`, `challenge_participants`, `shop_items`, `user_purchases`, `payments`, `subscriptions`, `punishment_settings`, `punishment_history`, `avatar_items`, `user_avatar`, `trophies`, `user_trophies`, `finance_budget_entries`, `finance_savings_goals`, `finance_savings_deposits`, `channel_subscriptions`, `onboarding_state`, `mode_configs`, `reminders`, `notification_modes`
- **Schema**: `database/schema.sql`
- **Seed data**: `database/seed_data.sql`
- **Migrations**: `database/migrations/` (21 migration files, Run 5 through Run 73)

### 5. Background Jobs (pg-boss)

| Job | Schedule | Description |
|-----|----------|-------------|
| `daily-quest-reset` | `0 0 * * *` (midnight) | Expire uncompleted daily quests, assign new ones |
| `streak-check` | `0 1 * * *` (01:00) | Validate and update user streaks |
| `quest-reminders` | `0 * * * *` (hourly) | Send timezone-aware quest reminders via Telegram |
| `daily-summary` | `0 * * * *` (hourly) | Send daily progress summary (timezone-aware) |
| `leaderboard-refresh` | `*/30 * * * *` (every 30 min) | Refresh cached leaderboard data |
| `achievement-batch-check` | `0 */1 * * *` (hourly) | Batch check and unlock achievements for all users |
| `achievement-notifier` | `*/15 * * * *` (every 15 min) | Notify users of newly unlocked achievements |
| `punishment-check` | `30 0 * * *` (00:30) | Apply punishments for uncompleted quests |
| `db-cleanup` | `0 3 * * 0` (Sun 03:00) | Clean up stale data, expired sessions |
| `analytics-export` | `0 6 * * 1` (Mon 06:00) | Export analytics to Google Sheets |

## Key Directories

```
bot/
  src/
    api/
      routes/          # 33 route files (user, quest, achievement, shop, etc.)
      middleware/       # auth, adminAuth, rateLimiter, premiumGate, timeout, errorReporter
      utils/           # errors, constants
    handlers/          # Grammy command and callback handlers
    jobs/
      definitions/     # 10 job definition files
      boss.ts          # pg-boss initialization
      registerJobs.ts  # Job registration and scheduling
    utils/             # db, cache, logger, streak, xpAward, achievementEngine, etc.
    bot.ts             # Grammy bot setup and webhook

mini-app/
  src/
    components/        # React UI components
    pages/             # Route-level page components
    hooks/             # Custom React hooks
    api/               # API client and types
    contexts/          # React contexts (auth, theme, etc.)
  public/              # Static assets, manifest, service worker

database/
  schema.sql           # Full database schema
  seed_data.sql        # Initial data (modes, quests, achievements, trophies)
  migrations/          # Incremental SQL migrations

tools/                 # Python scripts (WAT framework) for DB operations
workflows/             # Markdown SOPs for agent workflows
docs/                  # Project documentation
```

## Data Flow

### User Registration
```
Telegram /start → Grammy bot → POST /api/users → INSERT users → Send welcome
```

### Onboarding
```
Mini-App opens → GET /api/onboarding/:telegramId
  → User selects modes, answers quiz
  → POST /api/onboarding/:telegramId/complete
    → Transaction: add modes, save configs, award 50 XP, assign initial quests
```

### Quest Lifecycle
```
Daily Quest Reset Job → assigns new quests from templates
  → User opens Mini-App → GET /api/users/:telegramId/stats
  → User checks in → POST /api/checkins
    → increment check_in_count → auto-complete if target reached
    → award XP → check achievements → update streaks
```

### Check-in Flow
```
Mini-App → POST /api/checkins { telegram_id, quest_instance_id }
  → Verify ownership → Transaction:
    → INSERT check_ins
    → UPDATE quest_instances.check_in_count
    → If complete: mark completed, award XP
  → Invalidate cache → Check achievements
```

## Authentication

### Telegram initData (User API)
All user-facing endpoints validate the `x-telegram-init-data` header:
1. Parse the Telegram `initData` string
2. Verify HMAC-SHA256 signature using the bot token
3. Extract `user.id` as the authenticated Telegram ID
4. Ownership check: ensure the requested resource belongs to the authenticated user

### Admin API (Basic Auth)
Admin endpoints (`/api/admin/*`) use HTTP Basic Authentication:
- Role-based access: `admin`, `super_admin`
- Permission-based gating: `users:read`, `users:update`, `quests:create`, etc.

### Payment Webhook
Payment webhooks from Telegram use secret token verification (no initData).

## Deployment

### Infrastructure
- **Server**: Timeweb VDS (85.239.58.205), Ubuntu 24.04, 2 CPU / 2GB RAM / 40GB NVMe
- **Domain**: yakutsa.ru (A record)
- **SSL**: Let's Encrypt via certbot (auto-renew)
- **Process manager**: PM2 (`telegram-rpg-bot` process)
- **Config**: `ecosystem.config.js` with `--env production`

### Reverse Proxy (nginx)
```
yakutsa.ru/webhook     → localhost:3000/webhook  (Grammy bot)
yakutsa.ru/api/*       → localhost:3000/api/*    (Express API)
yakutsa.ru/*           → /opt/wibecode-bot/mini-app/dist/  (static React app)
```

### Deploy Process
```bash
git push origin main
ssh root@85.239.58.205
cd /opt/wibecode-bot && git pull
cd bot && npm install && npm run build
cd ../mini-app && npm run build
pm2 restart telegram-rpg-bot --update-env
```

## Subscription Tiers

| Tier | Mode Limit | How to Get |
|------|-----------|------------|
| Free | 2 modes | Default |
| Subscriber | 3 modes | Join @yakutsaway Telegram channel |
| Premium | 6 modes | 599 Telegram Stars/month |
