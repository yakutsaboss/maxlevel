# Telegram RPG Bot - API Documentation

REST API powering the Mini App, admin panel, and Telegram bot integrations.

## Base URL

```
Development: http://localhost:3000
Production:  https://yakutsa.ru
```

---

## Authentication

### Telegram WebApp Auth (User Endpoints)

All user-facing endpoints require the `x-telegram-init-data` header containing Telegram WebApp `initData`. The server validates the HMAC signature against the bot token and checks that `auth_date` is less than 1 hour old.

```typescript
headers: {
  'x-telegram-init-data': window.Telegram.WebApp.initData
}
```

**Validation steps (server-side):**
1. Parse `initData` as URL-encoded params
2. Extract and remove `hash`
3. Sort remaining params alphabetically, join with `\n`
4. HMAC-SHA256 the result using `HMAC(bot_token, "WebAppData")` as secret key
5. Compare computed hash with provided hash
6. Reject if `auth_date` is older than 1 hour

**Development bypass:** Set `NODE_ENV=development` and `SKIP_AUTH=true` in `.env` to skip validation. Never use in production.

### Admin Basic Auth (Admin Endpoints)

All `/api/admin/*` endpoints require HTTP Basic Authentication.

```bash
curl -u "admin:password" https://yakutsa.ru/api/admin/stats
```

Credentials are configured via `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` environment variables. The password hash is SHA-256.

**Roles** (hierarchical):
| Role | Level | Description |
|------|-------|-------------|
| `super_admin` | 3 | Full access, can delete users |
| `admin` | 2 | Can manage quests, jobs, broadcasts |
| `moderator` | 1 | Read-only access |

**Permissions** are checked per-endpoint (e.g., `users:read`, `quests:create`). Super admins with `*` permission bypass all checks.

### Webhook Auth (Payment Webhooks)

The `POST /api/payments/webhook` endpoint verifies authenticity via the `x-telegram-bot-api-secret-token` header using constant-time comparison.

---

## Rate Limiting

Rate limits are enforced per IP address using `express-rate-limit`. Standard `RateLimit-*` headers are returned.

| Limiter | Window | Max Requests | Applies To |
|---------|--------|-------------|------------|
| API (global) | 1 min | 120 | All routes |
| Read | 1 min | 60 | GET requests |
| Mutation | 1 min | 30 | POST/PUT/PATCH/DELETE |
| Auth | 5 min | 20 | Auth endpoints (skips successful) |

**Development bypass:** Set `SKIP_RATE_LIMIT=true` in `.env`.

When rate limited, the API returns `429 Too Many Requests`:
```json
{
  "error": "Too Many Requests",
  "message": "Too many requests from this IP, please try again later",
  "retryAfter": "1 minute"
}
```

---

## Health Check

### GET `/health`

Check if the API server is running. No authentication required.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-07T10:30:00.000Z",
  "uptime": 3600.5
}
```

---

## Users

### POST `/api/users`

Create or upsert a user (called from bot on `/start`). No Telegram auth required.

**Body:**
```json
{
  "telegramId": 123456789,
  "firstName": "John",
  "username": "johndoe"
}
```

**Response (201):**
```json
{
  "data": {
    "message": "User created successfully",
    "user": { "id": 1, "telegram_id": 123456789, "first_name": "John", "username": "johndoe", "current_level": 1, "total_xp": 0 }
  }
}
```

### GET `/api/users/:telegramId/stats`

Comprehensive user stats including modes, active quests, achievements, and streaks.

**Auth:** Telegram WebApp + ownership check (user can only view own data)

**Response:**
```json
{
  "data": {
    "user": { "id": 1, "telegram_id": 123456789, "first_name": "John", "current_level": 5, "total_xp": 1250 },
    "modes": [
      { "id": 1, "name": "fitness", "display_name": "Fitness", "icon": "\ud83d\udcaa", "description": "..." }
    ],
    "activeQuests": [
      { "id": 1, "title": "Morning Workout", "xp_reward": 50, "frequency": "daily", "difficulty": "medium", "status": "pending", "progress": 0, "target": 3, "mode_name": "fitness" }
    ],
    "completedQuestsToday": 2,
    "recentAchievements": [
      { "id": 1, "name": "First Steps", "icon": "\ud83c\udfaf", "xp_reward": 25, "rarity": "common", "unlocked_at": "2026-02-07T10:00:00.000Z" }
    ],
    "xpGainedToday": 150,
    "streakData": { "current": 7, "longest": 14, "daysActive": 30 },
    "perModeStreaks": [
      { "mode_id": 1, "mode_name": "fitness", "current_streak": 7, "longest_streak": 14 }
    ]
  }
}
```

### GET `/api/users/:telegramId/quests/active`

Get active (pending/ready/in_progress) quests for the authenticated user.

**Auth:** Telegram WebApp + ownership

### GET `/api/users/:telegramId/quests/completed`

Get completed quests for the authenticated user.

**Auth:** Telegram WebApp + ownership
**Query:** `limit` (optional, default 50, max 100)

### GET `/api/users/:telegramId/achievements`

Get all unlocked achievements for the authenticated user.

**Auth:** Telegram WebApp + ownership

### PATCH `/api/users/:userId/xp`

Award XP to a user.

**Auth:** Telegram WebApp
**Body:**
```json
{ "amount": 50 }
```

**Response:**
```json
{
  "data": { "message": "XP added successfully", "newTotal": 1300, "newLevel": 5, "leveledUp": false }
}
```

### PATCH `/api/users/:userId/streak`

Update all streaks for a user across all modes.

**Auth:** Telegram WebApp

**Response:**
```json
{
  "data": { "message": "Streaks updated", "current_streak": 8 }
}
```

### PATCH `/api/users/:telegramId/profile`

Update user profile (display name, avatar).

**Auth:** Telegram WebApp + ownership
**Body:**
```json
{
  "first_name": "NewName",
  "avatar_id": 5
}
```

**Validation:** `first_name` 1-32 chars, `avatar_id` integer 1-16.

**Response:**
```json
{
  "data": { "id": 1, "telegram_id": 123456789, "first_name": "NewName", "avatar_id": 5, "level": 5, "xp": 1250, "timezone": "Europe/Moscow" }
}
```

### GET `/api/users/:telegramId/preferences`

Get user notification and timezone preferences.

**Auth:** Telegram WebApp + ownership

**Response:**
```json
{
  "data": { "notification_enabled": true, "reminder_time": 9, "timezone": "Europe/Moscow" }
}
```

### PATCH `/api/users/:telegramId/preferences`

Update notification and timezone preferences.

**Auth:** Telegram WebApp + ownership
**Body (all fields optional):**
```json
{
  "notification_enabled": true,
  "reminder_time": 9,
  "timezone": "Europe/Moscow"
}
```

**Validation:** `reminder_time` integer 0-23, `timezone` non-empty string.

### DELETE `/api/users/:telegramId/account`

Soft-delete account: deactivates user, anonymizes PII, wipes all progress data. Re-opening the mini app starts fresh onboarding.

**Auth:** Telegram WebApp + ownership

**Response:**
```json
{ "data": { "message": "Account deleted successfully" } }
```

**What gets deleted (in order):** onboarding state, check-ins, punishment data, quest instances, mode configs, user modes, achievements, activity log, streaks, reminders. User row is deactivated (not hard-deleted).

---

## Quests

### GET `/api/quests/users/:userId/active`

Get active quests for a user (by internal user ID).

**Auth:** Telegram WebApp + user authorization

**Response:**
```json
{
  "data": {
    "quests": [
      { "id": 1, "quest_id": 1, "name": "Morning Workout", "xp_reward": 50, "quest_type": "daily", "difficulty": "medium", "mode_name": "fitness", "status": "pending", "check_in_count": 0, "target": 3 }
    ],
    "count": 1
  }
}
```

### GET `/api/quests/users/:userId/completed`

Get completed quests. **Query:** `limit` (default 50).

**Auth:** Telegram WebApp + user authorization

### GET `/api/quests/users/:userId/stats`

Get quest statistics breakdown.

**Auth:** Telegram WebApp + user authorization

**Response:**
```json
{
  "data": { "total_completed": 23, "active_quests": 3, "daily_completed": 15, "weekly_completed": 8 }
}
```

### POST `/api/quests/:questId/complete`

Mark a quest as completed. Uses row-level locking to prevent concurrent double-completion. Awards XP, updates streaks, and checks for new achievements.

**Auth:** Telegram WebApp

**Response:**
```json
{
  "data": { "message": "Quest completed successfully", "xpEarned": 50, "newLevel": 5, "leveledUp": false }
}
```

### PATCH `/api/quests/:questId/progress`

Update quest progress. Auto-completes if progress reaches target.

**Auth:** Telegram WebApp + user authorization
**Body:**
```json
{ "progress": 2 }
```

**Response (in progress):**
```json
{
  "data": { "id": 1, "status": "pending", "progress": 2, "target": 3, "xpEarned": 0, "leveledUp": false }
}
```

**Response (auto-completed):**
```json
{
  "data": { "id": 1, "status": "completed", "progress": 3, "target": 3, "xpEarned": 50, "newLevel": 5, "leveledUp": true }
}
```

### POST `/api/quests/users/:userId/assign`

Assign new quests to user based on active modes.

**Auth:** Telegram WebApp + user authorization
**Body:**
```json
{
  "frequency": "daily",
  "count": 3
}
```

**Validation:** `frequency` must be `"daily"` or `"weekly"`. `count` optional (defaults: 3 daily, 2 weekly).

**Response:**
```json
{
  "data": {
    "message": "3 daily quests assigned successfully",
    "quests": [
      { "id": 10, "quest_id": 1, "title": "Morning Workout", "xp_reward": 50, "quest_type": "daily", "difficulty": "medium", "target": 3, "instance_date": "2026-02-13", "status": "pending" }
    ]
  }
}
```

---

## Check-ins

### POST `/api/checkins`

Create a check-in for a quest instance. Increments `check_in_count` and auto-completes if target is reached (awards XP, triggers achievements).

**Auth:** Telegram WebApp + ownership via `telegram_id`
**Body:**
```json
{
  "telegram_id": 123456789,
  "quest_instance_id": 42,
  "notes": "Completed morning run"
}
```

**Response:**
```json
{
  "data": {
    "check_in_id": 100,
    "quest_progress": { "current": 2, "target": 3 },
    "completed": false
  }
}
```

### GET `/api/checkins/:telegramId/today`

Get today's check-ins for the authenticated user.

**Auth:** Telegram WebApp + ownership

**Response:**
```json
{
  "data": {
    "check_ins": [
      { "id": 100, "check_in_time": "2026-02-13T08:00:00.000Z", "notes": "Morning run", "is_valid": true, "quest_title": "Morning Workout", "quest_status": "pending" }
    ],
    "count": 1
  }
}
```

### GET `/api/checkins/:telegramId/history`

Get paginated check-in history.

**Auth:** Telegram WebApp + ownership
**Query:** `page` (default 1), `limit` (default 20, max 100)

---

## Onboarding

### GET `/api/onboarding/:telegramId`

Get current onboarding state for a user.

**Auth:** Telegram WebApp + ownership

**Response:**
```json
{
  "data": { "current_step": "modes", "quiz_data": { "selected_modes": ["fitness"] }, "last_updated": "2026-02-13T10:00:00.000Z" }
}
```

Returns `{ current_step: null, quiz_data: null }` if no onboarding state exists.

### PUT `/api/onboarding/:telegramId`

Save/update onboarding progress.

**Auth:** Telegram WebApp + ownership
**Body:**
```json
{
  "current_step": "punishments",
  "quiz_data": { "selected_modes": ["fitness", "hydration"], "fitness": { "goal": "lose_weight" } }
}
```

### POST `/api/onboarding/:telegramId/complete`

Complete onboarding. Commits all data in a single transaction: adds modes, saves configs, sets punishment settings, awards 50 XP, assigns initial daily quests, and marks onboarding as completed. Idempotent (returns early if already completed).

**Auth:** Telegram WebApp + ownership
**Body:**
```json
{
  "quiz_data": {
    "selected_modes": ["fitness", "hydration"],
    "fitness": { "goal": "lose_weight" },
    "punishments": { "consent_given": true, "intensity_level": "easy", "safe_mode": true }
  }
}
```

**Response:**
```json
{ "data": { "xp_awarded": 50 }, "message": "Onboarding completed successfully" }
```

---

## Punishment

### GET `/api/punishment/:telegramId/settings`

Get user's punishment settings.

**Auth:** Telegram WebApp + ownership

**Response:**
```json
{
  "data": {
    "consent_given": true,
    "consent_timestamp": "2026-02-07T10:00:00.000Z",
    "intensity_level": "medium",
    "safe_mode": true,
    "custom_punishments": {},
    "max_xp_penalty": 100,
    "max_streak_reset": 3
  }
}
```

### PATCH `/api/punishment/:telegramId/settings`

Update punishment settings. Only provided fields are updated. Creates settings if none exist.

**Auth:** Telegram WebApp + ownership
**Body (all fields optional):**
```json
{
  "consent_given": true,
  "intensity_level": "high",
  "safe_mode": false,
  "custom_punishments": { "custom_message": "Do 20 pushups!" }
}
```

**Validation:** `intensity_level` must be one of: `low`, `medium`, `high`, `extreme`.

### GET `/api/punishment/:telegramId/history`

Get paginated punishment history.

**Auth:** Telegram WebApp + ownership
**Query:** `page` (default 1), `limit` (default 20, max 100)

**Response:**
```json
{
  "data": {
    "punishments": [
      { "id": 1, "punishment_type": "xp_deduction", "severity": "medium", "xp_deducted": 25, "streak_days_lost": 0, "message_sent": true, "applied_at": "2026-02-12T23:00:00.000Z", "quest_title": "Morning Workout" }
    ],
    "page": 1,
    "total": 5
  }
}
```

---

## Social

### POST `/api/social/friends/request`

Send a friend request.

**Auth:** Telegram WebApp
**Body:**
```json
{ "fromUserId": 1, "toUserId": 2 }
```

**Validation:** Both must be positive integers, cannot be equal, no duplicate requests.

**Response (201):**
```json
{
  "data": { "id": 1, "from_user_id": 1, "to_user_id": 2, "status": "pending", "created_at": "2026-02-13T10:00:00.000Z" },
  "message": "Friend request sent"
}
```

### POST `/api/social/friends/accept`

Accept a pending friend request.

**Auth:** Telegram WebApp
**Body:**
```json
{ "requestId": 1 }
```

**Response:**
```json
{
  "data": { "id": 1, "status": "accepted" },
  "message": "Friend request accepted"
}
```

### GET `/api/social/friends/:userId`

List all accepted friends for a user.

**Auth:** Telegram WebApp + user authorization

**Response:**
```json
{
  "data": [
    { "id": 2, "username": "jane", "first_name": "Jane", "current_level": 8, "total_xp": 2100, "is_active": true, "friends_since": "2026-02-10T12:00:00.000Z" }
  ]
}
```

### POST `/api/social/challenges/create`

Create a new challenge. The creator is automatically added as the first participant.

**Auth:** Telegram WebApp
**Body:**
```json
{
  "creatorId": 1,
  "title": "30 Day Fitness Challenge",
  "description": "Complete a workout every day for 30 days",
  "mode": "fitness",
  "targetValue": 30,
  "endDate": "2026-03-15"
}
```

**Validation:** `title` required, max 200 chars. `description` max 2000 chars. `targetValue` positive integer.

**Response (201):**
```json
{
  "data": { "id": 1, "creator_id": 1, "title": "30 Day Fitness Challenge", "status": "active" },
  "message": "Challenge created"
}
```

### GET `/api/social/challenges/:userId`

List user's challenges with progress and participant counts. Cached for 2 minutes.

**Auth:** Telegram WebApp + user authorization

**Response:**
```json
{
  "data": [
    { "id": 1, "title": "30 Day Fitness Challenge", "progress": 5, "participant_count": 3, "joined_at": "2026-02-13T10:00:00.000Z" }
  ]
}
```

---

## Finance

### GET `/api/finance/budget/:userId`

Get budget summary for the current month including entries grouped by category.

**Auth:** Telegram WebApp + user authorization

**Response:**
```json
{
  "data": {
    "total_income": 50000,
    "total_expense": 32000,
    "balance": 18000,
    "entries": [
      { "id": 1, "category": "Food", "amount": 500, "type": "expense", "created_at": "2026-02-13T12:00:00.000Z" }
    ],
    "by_category": { "Food": 12000, "Transport": 5000, "Entertainment": 3000 }
  }
}
```

### POST `/api/finance/budget`

Create a new budget entry (income or expense).

**Auth:** Telegram WebApp
**Body:**
```json
{
  "userId": 1,
  "category": "Food",
  "amount": 500,
  "type": "expense"
}
```

**Validation:** `type` must be `"income"` or `"expense"`. `amount` positive number. `category` max 100 chars.

### GET `/api/finance/savings/:userId`

Get all savings goals with recent deposit history (last 10 deposits per goal).

**Auth:** Telegram WebApp + user authorization

**Response:**
```json
{
  "data": {
    "goals": [
      {
        "id": 1, "name": "Emergency Fund", "target_amount": 100000, "current_amount": 35000,
        "deposits": [
          { "id": 5, "amount": 5000, "created_at": "2026-02-12T10:00:00.000Z" }
        ]
      }
    ]
  }
}
```

### POST `/api/finance/savings`

Create a new savings goal.

**Auth:** Telegram WebApp
**Body:**
```json
{
  "userId": 1,
  "name": "Emergency Fund",
  "targetAmount": 100000
}
```

**Validation:** `name` max 200 chars, `targetAmount` positive number.

### PATCH `/api/finance/savings/:id`

Add a deposit to a savings goal.

**Auth:** Telegram WebApp
**Body:**
```json
{ "amount": 5000 }
```

**Response:**
```json
{
  "data": { "new_amount": 40000, "message": "Deposit recorded" }
}
```

### GET `/api/finance/categories`

List available expense categories.

**Auth:** Telegram WebApp

**Response:**
```json
{
  "data": {
    "categories": ["Food", "Transport", "Housing", "Entertainment", "Health", "Education", "Shopping", "Bills", "Other"]
  }
}
```

---

## Analytics

### GET `/api/analytics/:userId/modes`

Per-mode analytics: completion rates, streak trends, and XP breakdown. Cached (medium TTL).

**Auth:** Telegram WebApp + user authorization

**Response:**
```json
{
  "data": [
    {
      "mode_id": 1, "mode_name": "fitness", "display_name": "Fitness", "icon": "\ud83d\udcaa",
      "completion_rate": 75,
      "total_quests": 20, "completed_quests": 15,
      "xp_earned": 750,
      "streak": { "current": 7, "longest": 14 }
    }
  ]
}
```

### GET `/api/analytics/:userId/modes/:mode`

Detailed analytics for a specific mode including quest history and weekly XP trend. The `:mode` param is the mode name (e.g., `fitness`, `hydration`). Cached (medium TTL).

**Auth:** Telegram WebApp + user authorization

**Response:**
```json
{
  "data": {
    "mode": { "id": 1, "name": "fitness", "display_name": "Fitness", "icon": "\ud83d\udcaa" },
    "progress": { "completion_rate": 75, "total_quests": 20, "completed_quests": 15 },
    "streak": { "current": 7, "longest": 14, "last_activity": "2026-02-12" },
    "weekly_xp": [
      { "day": "2026-02-07", "xp": 100 },
      { "day": "2026-02-08", "xp": 150 }
    ],
    "quest_history": [
      { "id": 42, "title": "Morning Workout", "type": "daily", "difficulty": "medium", "status": "completed", "xp_awarded": 50, "date": "2026-02-12", "completed_at": "2026-02-12T08:30:00.000Z", "check_ins": 3, "target": 3 }
    ]
  }
}
```

### GET `/api/analytics/:userId/summary`

Overall progress summary. Cached for 2 minutes.

**Auth:** Telegram WebApp + user authorization

**Response:**
```json
{
  "data": {
    "total_xp": 1250,
    "level": 5,
    "quests_completed": 23,
    "quests_total": 30,
    "completion_rate": 77,
    "active_modes": 2,
    "active_streaks": 2,
    "best_streak": 14,
    "days_active": 30,
    "xp_this_week": 350
  }
}
```

---

## Leaderboard

### GET `/api/leaderboard`

Global leaderboard ranked by total XP. Cached (short TTL, ~30s).

**Auth:** Telegram WebApp
**Query:** `limit` (default 50, max 100), `mode` (optional, filter by mode name)

**Response (default):**
```json
{
  "data": [
    {
      "user_id": 1, "telegram_id": "123456789", "username": "johndoe", "first_name": "John",
      "level": 5, "total_xp": 1250,
      "current_streak": 7, "total_quests_completed": 23,
      "xp_rank": 1, "level_rank": 1
    }
  ]
}
```

**Response (mode-filtered, `?mode=fitness`):**
```json
{
  "data": [
    {
      "user_id": 1, "username": "johndoe", "first_name": "John",
      "level": 5, "total_xp": 1250,
      "mode_xp": 750, "mode_streak": 7, "mode_quests_completed": 15,
      "xp_rank": 1
    }
  ],
  "mode": "fitness"
}
```

### GET `/api/leaderboard/weekly`

Leaderboard ranked by XP earned in the last 7 days. Only includes users with >0 weekly XP. Cached for 5 minutes.

**Auth:** Telegram WebApp
**Query:** `limit` (default 50, max 100)

**Response:**
```json
{
  "data": [
    { "user_id": 1, "username": "johndoe", "first_name": "John", "level": 5, "total_xp": 1250, "weekly_xp": 350, "rank": 1 }
  ]
}
```

### GET `/api/leaderboard/monthly`

Leaderboard ranked by XP earned in the last 30 days. Cached for 5 minutes.

**Auth:** Telegram WebApp
**Query:** `limit` (default 50, max 100)

**Response:**
```json
{
  "data": [
    { "user_id": 1, "username": "johndoe", "first_name": "John", "level": 5, "total_xp": 1250, "monthly_xp": 1100, "rank": 1 }
  ]
}
```

---

## Payments

### POST `/api/payments/create`

Initiate a new payment via Telegram Stars.

**Auth:** Telegram WebApp
**Body:**
```json
{
  "userId": 1,
  "amount": 100,
  "tier": "pro"
}
```

**Validation:** `tier` must be `"pro"` or `"premium"` (not `"free"`). `amount` positive number.

**Response (201):**
```json
{
  "data": {
    "payment_id": 1,
    "status": "pending",
    "amount": 100,
    "currency": "XTR",
    "provider": "telegram_stars",
    "tier": "pro",
    "created_at": "2026-02-13T10:00:00.000Z"
  },
  "message": "Payment initiated"
}
```

### POST `/api/payments/webhook`

Handle Telegram Stars payment callback. Completes payment and activates subscription in a single transaction. Idempotent (re-processing a completed payment returns success).

**Auth:** Webhook secret token (`x-telegram-bot-api-secret-token` header)
**Body:**
```json
{
  "telegram_payment_charge_id": "charge_abc123",
  "provider_payment_charge_id": "provider_xyz",
  "payment_id": 1
}
```

**Response:**
```json
{
  "data": {
    "payment_id": 1,
    "status": "completed",
    "subscription_tier": "pro",
    "expires_at": "2026-03-15T10:00:00.000Z"
  },
  "message": "Payment confirmed, subscription activated"
}
```

### GET `/api/payments/history/:userId`

Get payment history for a user.

**Auth:** Telegram WebApp + user authorization
**Query:** `limit` (default 50), `offset` (default 0)

**Response:**
```json
{
  "data": {
    "payments": [
      { "id": 1, "amount": 100, "currency": "XTR", "status": "completed", "provider": "telegram_stars", "created_at": "2026-02-13T10:00:00.000Z" }
    ],
    "count": 1
  }
}
```

### GET `/api/payments/subscription/:userId`

Get current subscription status.

**Auth:** Telegram WebApp + user authorization

**Response (active subscription):**
```json
{
  "data": {
    "subscription_id": 1,
    "tier": "pro",
    "raw_tier": "pro",
    "is_active": true,
    "is_expired": false,
    "started_at": "2026-02-13T10:00:00.000Z",
    "expires_at": "2026-03-15T10:00:00.000Z",
    "auto_renew": true
  }
}
```

**Response (no subscription):**
```json
{
  "data": { "tier": "free", "is_active": true, "is_expired": false }
}
```

### POST `/api/payments/subscription/upgrade`

Upgrade subscription tier. Creates or updates subscription with 30-day duration.

**Auth:** Telegram WebApp
**Body:**
```json
{ "userId": 1, "tier": "premium" }
```

### POST `/api/payments/subscription/cancel`

Cancel subscription (revert to free tier, disable auto-renew).

**Auth:** Telegram WebApp
**Body:**
```json
{ "userId": 1 }
```

**Response:**
```json
{
  "data": { "previous_tier": "pro", "tier": "free", "auto_renew": false },
  "message": "Subscription cancelled"
}
```

---

## Achievements

### GET `/api/achievements`

Get all available achievements.

**Auth:** Telegram WebApp

**Response:**
```json
{
  "achievements": [
    {
      "id": 1, "name": "First Steps", "description": "Complete your first quest",
      "icon": "\ud83c\udfaf", "xp_reward": 25, "rarity": "common",
      "category": "quests", "criteria_type": "quest_count", "criteria_value": 1
    }
  ],
  "count": 13
}
```

### GET `/api/achievements/users/:userId`

Get achievements unlocked by a user.

**Auth:** Telegram WebApp + user authorization

**Response:**
```json
{
  "achievements": [
    { "id": 1, "name": "First Steps", "icon": "\ud83c\udfaf", "xp_reward": 25, "rarity": "common", "unlocked_at": "2026-02-07T10:00:00.000Z", "progress": 100 }
  ],
  "unlocked": 5, "total": 13, "progress": 38
}
```

### GET `/api/achievements/users/:userId/available`

Get achievements the user hasn't unlocked yet.

**Auth:** Telegram WebApp + user authorization

### POST `/api/achievements/users/:userId/:achievementId/unlock`

Manually unlock an achievement for a user.

**Auth:** Telegram WebApp + user authorization

### GET `/api/achievements/users/:userId/recent`

Get recently unlocked achievements. **Query:** `limit` (default 5).

**Auth:** Telegram WebApp + user authorization

### POST `/api/achievements/users/:userId/check`

Check if user qualifies for new achievements and auto-unlock them.

**Auth:** Telegram WebApp + user authorization

---

## Modes

### GET `/api/modes`

Get all available modes.

**Auth:** Telegram WebApp

**Response:**
```json
{
  "modes": [
    { "id": 1, "name": "fitness", "display_name": "Fitness", "icon": "\ud83d\udcaa", "description": "Physical fitness and exercise", "color": "#FF6B6B" }
  ],
  "count": 2
}
```

### GET `/api/modes/users/:userId`

Get user's active modes.

**Auth:** Telegram WebApp + user authorization

### GET `/api/modes/users/:userId/summary`

Get mode summary with quest counts and XP totals.

**Auth:** Telegram WebApp + user authorization

### POST `/api/modes/users/:userId`

Add modes to a user.

**Auth:** Telegram WebApp + user authorization
**Body:** `{ "modes": ["fitness", "hydration"] }`

### DELETE `/api/modes/users/:userId/:modeId`

Remove a mode from user.

**Auth:** Telegram WebApp + user authorization

### PATCH `/api/modes/users/:userId/:modeId`

Update mode-specific settings.

**Auth:** Telegram WebApp + user authorization

### GET `/api/modes/:modeId/quests`

Get quest templates for a specific mode.

**Auth:** Telegram WebApp

---

## Admin

All admin endpoints are prefixed with `/api/admin` and require HTTP Basic Auth (see Authentication section above).

### System Stats

#### GET `/api/admin/stats`

Get overall system statistics.

**Required role:** `admin`

**Response:**
```json
{
  "data": {
    "users": { "total": "150", "active": "120" },
    "quests": { "total": "5000", "active": "300", "completed": "4200" },
    "achievements": { "users_with_achievements": "95" },
    "timestamp": "2026-02-13T10:00:00.000Z"
  }
}
```

#### GET `/api/admin/logs`

Get recent system logs from pg-boss job history.

**Required role:** `admin`
**Query:** `limit` (default 50, max 200)

**Response:**
```json
{
  "data": {
    "logs": [
      { "timestamp": "2026-02-13T10:00:00.000Z", "level": "info", "source": "job:daily-quest-assignment", "message": "Job \"daily-quest-assignment\" completed successfully" }
    ]
  }
}
```

#### GET `/api/admin/modes`

List all game modes. No role requirement (just admin auth).

#### POST `/api/admin/analytics/export`

Trigger Google Sheets analytics export.

**Required role:** `admin`

**Response:**
```json
{
  "data": {
    "message": "Analytics export completed",
    "spreadsheet_url": "https://docs.google.com/spreadsheets/...",
    "rows_exported": 150
  }
}
```

#### POST `/api/admin/broadcast`

Send a broadcast message to all active users via Telegram.

**Required role:** `admin`
**Body:**
```json
{ "message": "New features have been released!" }
```

**Response:**
```json
{ "data": { "sent": 115, "failed": 5, "total": 120 } }
```

### User Management

#### GET `/api/admin/users`

List all users with pagination.

**Required permission:** `users:read`
**Query:** `limit` (default 50), `offset` (default 0), `active` (`"true"` to filter active only)

#### GET `/api/admin/users/:userId`

Get detailed user information including stats.

**Required permission:** `users:read`

#### PATCH `/api/admin/users/:userId`

Update user details. Allowed fields: `username`, `first_name`, `timezone`, `is_active`.

**Required permission:** `users:update`

#### DELETE `/api/admin/users/:userId`

Hard-delete a user. Use with caution.

**Required role:** `super_admin`

#### POST `/api/admin/users/:userId/deactivate`

Soft-deactivate a user (preferred over delete).

**Required permission:** `users:update`

#### POST `/api/admin/users/:userId/reactivate`

Reactivate a deactivated user.

**Required permission:** `users:update`

### Quest Template Management

#### GET `/api/admin/quests`

List all quest templates with mode info.

**Required permission:** `quests:read`
**Query:** `mode_id` (optional, filter by mode), `quest_type` (optional, `"daily"` or `"weekly"`)

#### POST `/api/admin/quests`

Create a new quest template.

**Required permission:** `quests:create`
**Body:**
```json
{
  "title": "Morning Workout",
  "quest_type": "daily",
  "mode_id": 1,
  "description": "Complete a 30-minute workout",
  "xp_reward": 50,
  "difficulty": "medium",
  "requires_timer": false,
  "is_mandatory": true
}
```

**Validation:** `quest_type` must be `"daily"` or `"weekly"`. `difficulty` must be `"easy"`, `"medium"`, or `"hard"`.

#### PATCH `/api/admin/quests/:id`

Update a quest template. Allowed fields: `mode_id`, `title`, `description`, `quest_type`, `xp_reward`, `difficulty`, `requires_timer`, `timer_window_start`, `timer_window_end`, `readiness_check_enabled`, `readiness_check_time`, `is_mandatory`.

**Required permission:** `quests:update`

#### DELETE `/api/admin/quests/:id`

Delete a quest template. Fails if any quest instances reference it.

**Required permission:** `quests:delete`

**Error (instances exist):**
```json
{
  "error": "Bad Request",
  "message": "Cannot delete quest template: 15 instance(s) reference it. Delete instances first or deactivate the quest instead."
}
```

### Job Management

#### GET `/api/admin/jobs`

List registered background jobs and their schedules.

**Required role:** `admin`

#### POST `/api/admin/jobs/:name/trigger`

Manually trigger a background job by name.

**Required role:** `admin`

**Response:**
```json
{
  "data": { "message": "Job 'daily-quest-assignment' triggered", "jobId": "abc-123", "timestamp": "2026-02-13T10:00:00.000Z" }
}
```

**Error (job not found):**
```json
{
  "error": "Not Found",
  "message": "Job 'unknown-job' not found. Available: daily-quest-assignment, weekly-quest-assignment, ..."
}
```

---

## Error Responses

All errors use a consistent format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (invalid input, validation failure) |
| `401` | Unauthorized (missing/invalid auth) |
| `403` | Forbidden (insufficient permissions, ownership mismatch) |
| `404` | Not Found (resource doesn't exist) |
| `409` | Conflict (duplicate resource) |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |
| `503` | Service Unavailable (e.g., job queue not running) |

---

## CORS

CORS is configured to allow requests from:
- Mini App URL (`MINI_APP_URL` env variable)
- Development: `*` (all origins)

In production, set `MINI_APP_URL` to your deployed Mini App URL.

---

## Testing the API

### Using curl

```bash
# Health check
curl https://yakutsa.ru/health

# Get user stats (with Telegram auth)
curl https://yakutsa.ru/api/users/123456789/stats \
  -H "x-telegram-init-data: <initData>"

# Complete a quest
curl -X POST https://yakutsa.ru/api/quests/1/complete \
  -H "Content-Type: application/json" \
  -H "x-telegram-init-data: <initData>"

# Create a budget entry
curl -X POST https://yakutsa.ru/api/finance/budget \
  -H "Content-Type: application/json" \
  -H "x-telegram-init-data: <initData>" \
  -d '{"userId": 1, "category": "Food", "amount": 500, "type": "expense"}'

# Admin: list users
curl -u "admin:password" https://yakutsa.ru/api/admin/users

# Admin: trigger a job
curl -X POST -u "admin:password" https://yakutsa.ru/api/admin/jobs/daily-quest-assignment/trigger
```

### Using the Mini App

```typescript
import { apiClient } from './api/client';

// Get user stats
const stats = await apiClient.get('/users/123456789/stats');

// Complete quest
await apiClient.post('/quests/1/complete');

// Get leaderboard
const leaderboard = await apiClient.get('/leaderboard?limit=10');

// Create budget entry
await apiClient.post('/finance/budget', {
  userId: 1, category: 'Food', amount: 500, type: 'expense'
});
```
