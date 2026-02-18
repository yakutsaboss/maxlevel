# MaxLevel RPG Bot — API Reference

Base URL: `https://yakutsa.ru/api`

All endpoints (except where noted) require the `x-telegram-init-data` header for authentication.

Response format: `{ success: true, data: ... }` or `{ success: false, error: "..." }`

---

## User

### POST /api/users
Create or upsert a user (called from bot on /start).
- **Body**: `{ telegramId, firstName, lastName?, username? }`
- **Response**: `{ message, user }`

### PATCH /api/users/:userId/xp
Add XP to a user. Requires auth + ownership.
- **Body**: `{ amount: number }`
- **Response**: `{ message, newTotal, newLevel, leveledUp }`

### PATCH /api/users/:userId/streak
Update all streaks for a user. Requires auth + ownership.
- **Response**: `{ message, current_streak }`

### GET /api/users/:telegramId/stats
Get comprehensive user stats (modes, quests, achievements, streaks). Requires ownership.
- **Response**: `{ user, modes[], activeQuests[], completedQuestsToday, recentAchievements[], xpGainedToday, streakData, perModeStreaks[] }`

### GET /api/users/:telegramId/quests/active
Get active quests for a user. Requires ownership.
- **Response**: Array of quest objects with mode info.

### GET /api/users/:telegramId/quests/completed
Get completed quests. Requires ownership.
- **Query**: `?limit=50` (max 100)
- **Response**: Array of completed quest objects.

### GET /api/users/:telegramId/achievements
Get all unlocked achievements for a user. Requires ownership.
- **Response**: Array of achievement objects.

### PATCH /api/users/:telegramId/profile
Update user profile. Requires ownership.
- **Body**: `{ first_name?, avatar_id? }` (avatar_id: 1-16)
- **Response**: Updated user object.

### DELETE /api/users/:telegramId/account
Soft-delete account: anonymize PII, wipe progress, deactivate. Requires ownership.
- **Response**: `{ message: "Account deleted successfully" }`

### GET /api/users/:telegramId/preferences
Get notification/timezone preferences. Requires ownership.
- **Response**: `{ notification_enabled, reminder_time, timezone, dnd_enabled, dnd_start, dnd_end }`

### PATCH /api/users/:telegramId/preferences
Update preferences. Requires ownership.
- **Body**: `{ notification_enabled?, reminder_time? (0-23), timezone?, dnd_enabled?, dnd_start? (0-23), dnd_end? (0-23) }`
- **Response**: Updated preferences object.

---

## Quests

### GET /api/quests/users/:userId/active
Get all active quests for a user. Requires auth + ownership.
- **Response**: `{ quests[], count }`

### GET /api/quests/users/:userId/completed
Get completed quests. Requires auth + ownership.
- **Query**: `?limit=50`
- **Response**: `{ quests[], count }`

### GET /api/quests/users/:userId/stats
Get quest statistics. Requires auth + ownership.
- **Response**: `{ total_completed, active_quests, daily_completed, weekly_completed }`

### POST /api/quests/:questId/complete
Mark a quest as completed. Awards XP, updates streaks and achievements.
- **Response**: `{ message, xpEarned, newLevel, leveledUp }`

### PATCH /api/quests/:questId/progress
Update quest progress. Auto-completes if progress reaches target.
- **Body**: `{ progress: number }`
- **Response**: `{ id, status, progress, target, xpEarned, newLevel, leveledUp }`

### POST /api/quests/users/:userId/assign
Assign new quests to a user (daily/weekly). Respects fitness level for difficulty bias.
- **Body**: `{ frequency: "daily"|"weekly", count?: number }`
- **Response**: `{ message, quests[] }`

---

## Achievements

### GET /api/achievements
Get all available achievements. Cached 5 min.
- **Response**: Array of achievements with criteria and category.

### GET /api/achievements/categories
Get distinct achievement categories. Cached 5 min.
- **Response**: Array of category strings.

### GET /api/achievements/users/:userId
Get user's unlocked achievements. Requires auth + ownership.
- **Response**: `{ achievements[], unlocked, total, progress (%) }`

### GET /api/achievements/users/:userId/available
Get achievements the user hasn't unlocked yet. Requires auth + ownership.
- **Response**: `{ achievements[], count }`

### POST /api/achievements/users/:userId/:achievementId/unlock
Manually unlock an achievement. Awards XP bonus.
- **Response**: `{ message, achievement, xpEarned, totalXp, newLevel, leveledUp }`

### GET /api/achievements/users/:userId/recent
Get recently unlocked achievements. Requires auth + ownership.
- **Query**: `?limit=5` (max 50)
- **Response**: `{ achievements[], count }`

### POST /api/achievements/users/:userId/check
Run achievement engine to check and unlock eligible achievements.
- **Response**: `{ newAchievements[], count }`

---

## Shop

### GET /api/shop/items
List all active shop items.
- **Query**: `?type=avatar_item|achievement`, `?featured=true`
- **Response**: Array of shop items with purchase counts.

### GET /api/shop/items/:itemId
Get single shop item details.
- **Response**: Shop item object with purchase count.

### POST /api/shop/purchase
Purchase a shop item with XP or Stars.
- **Body**: `{ userId, itemId, paymentMethod: "stars"|"xp" }`
- **Response**: `{ purchase, item, newBalance: { xp } }`

### GET /api/shop/purchases/:userId
Get user's purchase history. Requires auth + ownership.
- **Response**: Array of purchases with item info.

---

## Inventory

### GET /api/inventory/:userId
Get user's owned items grouped by type. Requires auth + ownership.
- **Response**: `{ items[], grouped: { [type]: items[] }, totalCount }`

### POST /api/inventory/:userId/equip
Equip an avatar item (unequips previous). Requires auth + ownership.
- **Body**: `{ itemId }`
- **Response**: `{ equipped: true, itemId }`

### POST /api/inventory/:userId/unequip
Unequip an avatar item. Requires auth + ownership.
- **Body**: `{ itemId }`
- **Response**: `{ equipped: false, itemId }`

---

## Social

### POST /api/social/friends/request
Send a friend request.
- **Body**: `{ fromUserId, toUserId }`
- **Response**: Friend request object.

### POST /api/social/friends/accept
Accept a friend request.
- **Body**: `{ requestId }`
- **Response**: Updated friend request object.

### POST /api/social/friends/reject
Reject a friend request.
- **Body**: `{ requestId, userId }`
- **Response**: Updated friend request object.

### GET /api/social/friends/pending/:userId
List pending incoming friend requests. Requires auth + ownership.
- **Response**: Array of pending requests with sender info.

### GET /api/social/friends/:userId
List accepted friends. Requires auth + ownership.
- **Response**: Array of friend objects.

### DELETE /api/social/friends/:userId/:friendId
Remove a friend. Requires auth + ownership.
- **Response**: `{ message: "Friend removed" }`

### GET /api/social/users/search
Search users by username.
- **Query**: `?q=query` (min 2 chars), `?excludeUserId=N`
- **Response**: Array of user objects (max 10).

### POST /api/social/challenges/create
Create a new challenge.
- **Body**: `{ creatorId, title, description?, mode?, targetValue?, endDate? }`
- **Response**: Challenge object.

### GET /api/social/challenges/discover
Browse active public challenges. No auth required (rate-limited).
- **Query**: `?limit=20` (max 100), `?offset=0`, `?mode=fitness`
- **Response**: Array of challenges with creator info and participant count.

### GET /api/social/challenges/:challengeId/details
Get full challenge details with participants.
- **Response**: Challenge object with participants array.

### GET /api/social/challenges/:userId
List user's challenges. Requires auth + ownership. Cached 2 min.
- **Response**: Array of challenges with progress.

### POST /api/social/challenges/:challengeId/join
Join a challenge.
- **Body**: `{ userId }`
- **Response**: Success message.

### PATCH /api/social/challenges/:challengeId/progress
Update challenge progress. Auto-detects completion.
- **Body**: `{ userId, progress }`
- **Response**: Updated participant record.

### DELETE /api/social/challenges/:challengeId/leave
Leave a challenge (creators cannot leave).
- **Body**: `{ userId }`
- **Response**: Success message.

---

## Finance

### GET /api/finance/budget/:userId
Get current month's budget summary. Requires auth + ownership.
- **Response**: `{ total_income, total_expense, balance, entries[], by_category }`

### POST /api/finance/budget
Create a budget entry (income or expense).
- **Body**: `{ userId, category, amount, type: "income"|"expense" }`
- **Response**: `{ message: "Budget entry created" }`

### GET /api/finance/savings/:userId
Get all savings goals with deposit history. Requires auth + ownership.
- **Response**: `{ goals[]: { ...goal, deposits[] } }`

### POST /api/finance/savings
Create a new savings goal.
- **Body**: `{ userId, name, targetAmount }`
- **Response**: `{ id, message }`

### PATCH /api/finance/savings/:id
Add a deposit to a savings goal.
- **Body**: `{ amount }`
- **Response**: `{ new_amount, message }`

### GET /api/finance/categories
List available expense categories.
- **Response**: `{ categories: ["Food", "Transport", "Housing", ...] }`

---

## Analytics

### GET /api/analytics/:userId/modes
Per-mode analytics: completion rates, streaks, XP. Requires auth + ownership. Cached 5 min.
- **Query**: `?range=7d|30d|all`
- **Response**: Array of mode analytics objects.

### GET /api/analytics/:userId/modes/:mode
Detailed analytics for a specific mode. Requires auth + ownership. Cached 5 min.
- **Response**: `{ mode, progress, streak, weekly_xp[], quest_history[] }`

### GET /api/analytics/:userId/summary
Overall progress summary. Requires auth + ownership. Cached 2 min.
- **Query**: `?range=7d|30d|all`
- **Response**: `{ total_xp, level, quests_completed, quests_total, completion_rate, active_modes, active_streaks, best_streak, days_active, xp_this_week }`

---

## Export

### GET /api/export/:userId/csv
Export user data as a CSV file download. Requires auth + ownership.
- **Response**: CSV file (Content-Disposition: attachment).

### GET /api/export/:userId/json
Export user data as a JSON file download. Requires auth + ownership.
- **Response**: JSON file with user, quest history, achievements, streaks.

---

## Modes

### GET /api/modes
Get all available modes. Cached.
- **Response**: `{ modes[], count }`

### GET /api/modes/users/:userId
Get user's active modes. Requires auth + ownership.
- **Response**: `{ modes[], count }`

### GET /api/modes/users/:userId/summary
Get mode summary with quest counts. Requires auth + ownership.
- **Response**: `{ summary[]: { mode, active_quests, completed_quests } }`

### POST /api/modes/users/:userId
Add modes to user. Tier-based limit enforced. Requires auth + ownership.
- **Body**: `{ modes: ["fitness", "hydration", ...] }`
- **Response**: `{ message, added[], failed[], already_active[] }`

### DELETE /api/modes/users/:userId/:modeId
Deactivate a mode for user. Requires auth + ownership.
- **Response**: `{ message: "Mode removed successfully" }`

### PATCH /api/modes/users/:userId/:modeId
Update mode settings. Requires auth + ownership.
- **Body**: `{ settings: { ... } }`
- **Response**: `{ message, settings }`

### GET /api/modes/:modeId/quests
Get quest templates for a mode. Cached.
- **Response**: `{ quests[], count }`

---

## Leaderboard

### GET /api/leaderboard
Get leaderboard (cross-mode or filtered by mode). Cached 30s.
- **Query**: `?limit=50` (max 100), `?mode=fitness`
- **Response**: Array of leaderboard entries with XP, level, streak, avatar.

### GET /api/leaderboard/weekly
Leaderboard ranked by XP earned in last 7 days. Cached 5 min.
- **Query**: `?limit=50` (max 100)
- **Response**: Array with `weekly_xp` and `rank`.

### GET /api/leaderboard/monthly
Leaderboard ranked by XP earned in last 30 days. Cached 5 min.
- **Query**: `?limit=50` (max 100)
- **Response**: Array with `monthly_xp` and `rank`.

---

## Onboarding

### GET /api/onboarding/:telegramId
Get onboarding state. Requires ownership.
- **Response**: `{ current_step, quiz_data }` or `{ current_step: null, quiz_data: null }`.

### PUT /api/onboarding/:telegramId
Save/update onboarding state. Requires ownership.
- **Body**: `{ current_step, quiz_data? }`
- **Response**: Updated state object.

### POST /api/onboarding/:telegramId/complete
Complete onboarding (transaction: modes, configs, punishment, XP, quests). Requires ownership.
- **Body**: `{ quiz_data: { selected_modes[], punishments?, gender?, nickname?, ... } }`
- **Response**: `{ xp_awarded: 50 }` or `{ xp_awarded: 0, already_completed: true }`.

---

## Check-ins

### POST /api/checkins
Create a check-in. Increments progress, auto-completes if target reached.
- **Body**: `{ telegram_id, quest_instance_id, notes? }`
- **Response**: `{ check_in_id, quest_progress: { current, target }, completed }`

### GET /api/checkins/:telegramId/today
Get today's check-ins. Requires ownership.
- **Response**: `{ check_ins[], count }`

### GET /api/checkins/:telegramId/history
Paginated check-in history. Requires ownership.
- **Query**: `?page=1`, `?limit=20` (max 100)
- **Response**: `{ check_ins[], page, limit, count }`

---

## Punishment

### GET /api/punishment/:telegramId/settings
Get punishment settings. Requires ownership.
- **Response**: `{ consent_given, consent_timestamp, intensity_level, safe_mode, custom_punishments, max_xp_penalty, max_streak_reset }`

### PATCH /api/punishment/:telegramId/settings
Update punishment settings. Requires ownership.
- **Body**: `{ consent_given?, intensity_level?: "low"|"medium"|"high"|"extreme", safe_mode?, custom_punishments? }`
- **Response**: Updated settings.

### GET /api/punishment/:telegramId/history
Paginated punishment history. Requires ownership.
- **Query**: `?page=1`, `?limit=20` (max 100)
- **Response**: `{ punishments[], page, total }`

### POST /api/punishment/:telegramId/deduct
Manually trigger Stars deduction. Requires ownership + consent.
- **Body**: `{ amount, reason }`
- **Response**: Punishment record.

---

## Payments

### POST /api/payments/create
Create a payment and generate Telegram Stars invoice.
- **Body**: `{ userId, amount, tier: "premium" }`
- **Response**: `{ payment_id, status, amount, currency, provider, tier, invoice_url, created_at }`

### GET /api/payments/history/:userId
Get payment history. Requires auth + ownership.
- **Query**: `?limit=50`, `?offset=0`
- **Response**: `{ payments[], count }`

### GET /api/payments/subscription/:userId
Get subscription status. Requires auth + ownership.
- **Response**: `{ tier, is_active, is_expired, started_at?, expires_at?, auto_renew? }`

### POST /api/payments/subscription/upgrade
Upgrade subscription tier.
- **Body**: `{ userId, tier: "premium" }`
- **Response**: `{ subscription_id, tier, expires_at }`

### POST /api/payments/subscription/cancel
Cancel subscription (set to free).
- **Body**: `{ userId }`
- **Response**: `{ previous_tier, tier: "free", auto_renew: false }`

### GET /api/payments/tiers
Get tier info. **No auth required.**
- **Response**: `{ tiers[]: { name, modeLimit, price, purchasable, description } }`

### POST /api/payments/webhook
Handle Telegram Stars payment callback. **No user auth** (uses secret token).
- **Body**: `{ telegram_payment_charge_id, provider_payment_charge_id?, payment_id }`
- **Response**: `{ payment_id, status, subscription_tier, expires_at }`

---

## Avatars

### GET /api/avatars/items
Get all avatar items (catalog).
- **Response**: Array of avatar items.

### GET /api/avatars/:userId
Get user's equipped avatar.
- **Response**: `{ hairstyle, outfit, accessory, background }` (item IDs or null).

### PATCH /api/avatars/:userId/equip
Equip an avatar item. Requires auth + ownership.
- **Body**: `{ category: "hairstyle"|"outfit"|"accessory"|"background", itemId: number|null }`
- **Response**: Updated equipped items object.

---

## Trophies

### GET /api/trophies
List all available trophies (public catalog).
- **Response**: Array of trophy objects with criteria.

### GET /api/trophies/:userId
Get user's earned trophies. Requires auth + ownership.
- **Response**: Array of earned trophies with details.

### GET /api/trophies/:userId/check
Check and award newly earned trophies based on user stats.
- **Response**: Array of newly awarded trophies.

---

## Channel Subscription

### GET /api/channel/:userId/status
Check channel subscription status (cached 1 hour). Requires auth + ownership.
- **Response**: `{ channel, is_subscribed, tier, checked_at, from_cache }`

### POST /api/channel/:userId/refresh
Force re-check channel status (bypasses cache). Requires auth + ownership.
- **Response**: `{ channel, is_subscribed, tier, checked_at, from_cache: false }`

---

## Admin (requires Basic Auth)

All admin endpoints require the `Authorization: Basic ...` header.

### GET /api/admin/stats
Get overall system statistics (user count, quest count, achievements).
- **Permission**: `admin`
- **Response**: `{ users: { total, active }, quests: { total, active, completed }, achievements, timestamp }`

### POST /api/admin/analytics/export
Trigger Google Sheets analytics export.
- **Permission**: `admin`
- **Response**: `{ message, spreadsheet_url?, rows_exported?, sheets_updated? }`

### GET /api/admin/modes
List all modes.
- **Response**: `{ modes[], timestamp }`

### POST /api/admin/broadcast
Send broadcast message to all active users.
- **Permission**: `admin`
- **Body**: `{ message }`
- **Response**: `{ sent, failed, total }`

### GET /api/admin/logs
Get recent system logs (pg-boss job history).
- **Permission**: `admin`
- **Query**: `?limit=50` (max 200)
- **Response**: `{ logs[]: { timestamp, level, source, message } }`

### GET /api/admin/users
List all users with pagination.
- **Permission**: `users:read`
- **Query**: `?limit=50`, `?offset=0`, `?active=true`
- **Response**: `{ users[], limit, offset, timestamp }`

### GET /api/admin/users/:userId
Get detailed user information.
- **Permission**: `users:read`
- **Response**: `{ user, stats, timestamp }`

### PATCH /api/admin/users/:userId
Update user (username, first_name, timezone, is_active).
- **Permission**: `users:update`
- **Body**: `{ username?, first_name?, timezone?, is_active? }`
- **Response**: `{ message, user }`

### DELETE /api/admin/users/:userId
Hard delete user. **Requires super_admin role.**
- **Response**: `{ message, deletedUser: { id, telegram_id, username } }`

### POST /api/admin/users/:userId/deactivate
Soft-deactivate user.
- **Permission**: `users:update`
- **Response**: `{ message, user }`

### POST /api/admin/users/:userId/reactivate
Reactivate a deactivated user.
- **Permission**: `users:update`
- **Response**: `{ message, user }`

### GET /api/admin/jobs
List registered background jobs and their schedules.
- **Permission**: `admin`
- **Response**: `{ jobs[]: { name, cron }, timestamp }`

### POST /api/admin/jobs/:name/trigger
Manually trigger a background job.
- **Permission**: `admin`
- **Response**: `{ message, jobId, timestamp }`

### GET /api/admin/quests
List all quest templates.
- **Permission**: `quests:read`
- **Query**: `?mode_id=N`, `?quest_type=daily|weekly`
- **Response**: `{ quests[], count, timestamp }`

### POST /api/admin/quests
Create a new quest template.
- **Permission**: `quests:create`
- **Body**: `{ title, quest_type, mode_id?, description?, xp_reward?, difficulty?, requires_timer?, is_mandatory?, ... }`
- **Response**: `{ message, quest }`

### PATCH /api/admin/quests/:id
Update a quest template.
- **Permission**: `quests:update`
- **Body**: Any of: `mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, is_mandatory, ...`
- **Response**: `{ message, quest }`

### DELETE /api/admin/quests/:id
Delete a quest template (fails if instances reference it).
- **Permission**: `quests:delete`
- **Response**: `{ message, deletedQuest: { id, title } }`
