# 🌐 Telegram RPG Bot - API Documentation

The REST API provides programmatic access to user data, quests, achievements, and modes for the Mini App.

## Base URL

```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

All API requests require Telegram WebApp authentication via the `x-telegram-init-data` header.

```typescript
headers: {
  'x-telegram-init-data': window.Telegram.WebApp.initData
}
```

### Development Mode

To skip authentication during development, set in `.env.bot`:

```env
NODE_ENV=development
SKIP_AUTH=true
```

⚠️ **Never use this in production!**

---

## Endpoints

### Health Check

#### GET `/health`

Check if the API server is running.

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

### Get User Stats

#### GET `/api/users/:telegramId/stats`

Get user statistics by Telegram ID.

**Parameters:**
- `telegramId` (path) - User's Telegram ID

**Response:**
```json
{
  "user": {
    "id": 1,
    "telegram_id": 123456789,
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    "level": 5,
    "total_xp": 1250,
    "current_streak": 7,
    "created_at": "2026-01-01T00:00:00.000Z"
  },
  "stats": {
    "level": 5,
    "total_xp": 1250,
    "current_streak": 7,
    "longest_streak": 14,
    "quests_completed": 23,
    "daily_quests_completed": 15,
    "weekly_quests_completed": 8,
    "achievements_unlocked": 5
  }
}
```

### Get User Profile

#### GET `/api/users/:userId/profile`

Get detailed user profile information.

**Parameters:**
- `userId` (path) - User's internal ID

**Response:**
```json
{
  "user": { /* user object */ },
  "stats": { /* stats object */ },
  "activeModes": [
    {
      "id": 1,
      "name": "fitness",
      "icon": "💪",
      "description": "Physical fitness and exercise"
    }
  ],
  "achievementsCount": 5
}
```

### Create User

#### POST `/api/users`

Create a new user (called from bot on /start).

**Body:**
```json
{
  "telegramId": 123456789,
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": { /* user object */ }
}
```

### Add XP to User

#### PATCH `/api/users/:userId/xp`

Award XP to a user.

**Body:**
```json
{
  "amount": 50,
  "reason": "Quest completion"
}
```

**Response:**
```json
{
  "message": "XP added successfully",
  "newTotal": 1300,
  "newLevel": 5,
  "leveledUp": false
}
```

### Update User Streak

#### PATCH `/api/users/:userId/streak`

Update the user's daily streak.

**Response:**
```json
{
  "message": "Streak updated successfully",
  "streak": 8
}
```

---

## Quests

### Get Active Quests

#### GET `/api/quests/users/:userId/active`

Get all active quests for a user.

**Response:**
```json
{
  "quests": [
    {
      "id": 1,
      "quest_template_id": 1,
      "name": "Morning Workout",
      "description": "Complete a 30-minute workout",
      "xp_reward": 50,
      "frequency": "daily",
      "difficulty": "medium",
      "mode_id": 1,
      "mode_name": "fitness",
      "status": "active",
      "progress": 0,
      "target_value": 1,
      "assigned_date": "2026-02-07",
      "due_date": "2026-02-08"
    }
  ],
  "count": 1
}
```

### Get Completed Quests

#### GET `/api/quests/users/:userId/completed`

Get completed quests for a user.

**Query Parameters:**
- `limit` (optional) - Number of quests to return (default: 50)

**Response:**
```json
{
  "quests": [ /* array of quest objects */ ],
  "count": 15
}
```

### Get Quest Details

#### GET `/api/quests/:questId`

Get detailed information about a specific quest.

**Response:**
```json
{
  "quest": {
    "id": 1,
    "user_id": 1,
    "name": "Morning Workout",
    "description": "Complete a 30-minute workout",
    "xp_reward": 50,
    "frequency": "daily",
    "difficulty": "medium",
    "mode_name": "fitness",
    "mode_icon": "💪",
    "status": "active",
    "progress": 0,
    "target_value": 1,
    "assigned_date": "2026-02-07",
    "due_date": "2026-02-08"
  }
}
```

### Complete Quest

#### POST `/api/quests/:questId/complete`

Mark a quest as completed.

**Body (optional):**
```json
{
  "progress": 1
}
```

**Response:**
```json
{
  "message": "Quest completed successfully",
  "xpEarned": 50,
  "newLevel": 5,
  "leveledUp": false
}
```

### Update Quest Progress

#### PATCH `/api/quests/:questId/progress`

Update the progress of a quest.

**Body:**
```json
{
  "progress": 0.5
}
```

**Response:**
```json
{
  "message": "Quest progress updated successfully",
  "progress": 0.5
}
```

### Assign Quests

#### POST `/api/quests/users/:userId/assign`

Assign new quests to a user based on their active modes.

**Body:**
```json
{
  "frequency": "daily"
}
```

**Response:**
```json
{
  "message": "3 daily quests assigned successfully",
  "quests": [ /* array of assigned quest objects */ ]
}
```

---

## Achievements

### Get All Achievements

#### GET `/api/achievements`

Get all available achievements.

**Response:**
```json
{
  "achievements": [
    {
      "id": 1,
      "name": "First Steps",
      "description": "Complete your first quest",
      "icon": "🎯",
      "xp_reward": 25,
      "rarity": "common",
      "category": "quests",
      "criteria_type": "quest_count",
      "criteria_value": 1
    }
  ],
  "count": 13
}
```

### Get User Achievements

#### GET `/api/achievements/users/:userId`

Get achievements unlocked by a user.

**Response:**
```json
{
  "achievements": [
    {
      "id": 1,
      "achievement_id": 1,
      "name": "First Steps",
      "description": "Complete your first quest",
      "icon": "🎯",
      "xp_reward": 25,
      "rarity": "common",
      "category": "quests",
      "unlocked_at": "2026-02-07T10:00:00.000Z",
      "progress": 100
    }
  ],
  "unlocked": 5,
  "total": 13,
  "progress": 38
}
```

### Get Available Achievements

#### GET `/api/achievements/users/:userId/available`

Get achievements the user hasn't unlocked yet.

**Response:**
```json
{
  "achievements": [ /* array of achievement objects */ ],
  "count": 8
}
```

### Unlock Achievement

#### POST `/api/achievements/users/:userId/:achievementId/unlock`

Manually unlock an achievement for a user.

**Response:**
```json
{
  "message": "Achievement unlocked successfully",
  "achievement": { /* achievement object */ },
  "xpEarned": 25,
  "newLevel": 5,
  "leveledUp": false
}
```

### Get Recent Achievements

#### GET `/api/achievements/users/:userId/recent`

Get recently unlocked achievements.

**Query Parameters:**
- `limit` (optional) - Number of achievements (default: 5)

**Response:**
```json
{
  "achievements": [ /* array of achievement objects */ ],
  "count": 3
}
```

### Check for New Achievements

#### POST `/api/achievements/users/:userId/check`

Check if user qualifies for any new achievements and auto-unlock them.

**Response:**
```json
{
  "newAchievements": [ /* newly unlocked achievements */ ],
  "count": 2,
  "message": "Unlocked 2 new achievement(s)!"
}
```

---

## Modes

### Get All Modes

#### GET `/api/modes`

Get all available modes.

**Response:**
```json
{
  "modes": [
    {
      "id": 1,
      "name": "fitness",
      "display_name": "Fitness",
      "icon": "💪",
      "description": "Physical fitness and exercise",
      "color": "#FF6B6B"
    }
  ],
  "count": 2
}
```

### Get User Modes

#### GET `/api/modes/users/:userId`

Get user's active modes.

**Response:**
```json
{
  "modes": [ /* array of mode objects */ ],
  "count": 2
}
```

### Get Mode Summary

#### GET `/api/modes/users/:userId/summary`

Get mode summary with quest counts.

**Response:**
```json
{
  "summary": [
    {
      "mode_id": 1,
      "mode_name": "fitness",
      "icon": "💪",
      "active_quests": 3,
      "completed_quests": 15,
      "total_xp": 750
    }
  ]
}
```

### Add Modes to User

#### POST `/api/modes/users/:userId`

Add modes to a user.

**Body:**
```json
{
  "modes": ["fitness", "hydration"]
}
```

**Response:**
```json
{
  "message": "Modes added successfully",
  "modes": [ /* array of added mode objects */ ]
}
```

### Remove Mode from User

#### DELETE `/api/modes/users/:userId/:modeId`

Remove a mode from user.

**Response:**
```json
{
  "message": "Mode removed successfully"
}
```

### Update Mode Settings

#### PATCH `/api/modes/users/:userId/:modeId`

Update mode-specific settings for a user.

**Body:**
```json
{
  "settings": {
    "notificationsEnabled": true,
    "reminderTime": "08:00"
  }
}
```

**Response:**
```json
{
  "message": "Mode settings updated successfully",
  "settings": { /* updated settings */ }
}
```

### Get Mode Quests

#### GET `/api/modes/:modeId/quests`

Get quest templates for a specific mode.

**Response:**
```json
{
  "quests": [ /* array of quest template objects */ ],
  "count": 6
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid/missing authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

### Example Error Response

```json
{
  "error": "Not Found",
  "message": "Quest not found"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. In production, consider adding:
- Per-user rate limits (e.g., 100 requests/minute)
- Per-IP rate limits for unauthenticated endpoints
- Stricter limits for expensive operations

---

## CORS

CORS is configured to allow requests from:
- Mini App URL (set in `MINI_APP_URL` env variable)
- Development: `*` (all origins)

In production, set `MINI_APP_URL` to your deployed Mini App URL.

---

## Testing the API

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# Get user stats (skip auth in dev)
curl http://localhost:3000/api/users/123456789/stats \
  -H "x-telegram-init-data: test"

# Complete a quest
curl -X POST http://localhost:3000/api/quests/1/complete \
  -H "Content-Type: application/json" \
  -H "x-telegram-init-data: test" \
  -d '{"progress": 1}'
```

### Using the Mini App

The Mini App automatically includes authentication:

```typescript
import { apiClient } from './api/client';

// Get user stats
const stats = await apiClient.get('/users/123456789/stats');

// Complete quest
await apiClient.post('/quests/1/complete', { progress: 1 });
```

---

## Next Steps

1. **Install dependencies**: `cd bot && npm install`
2. **Start the server**: `npm run dev`
3. **Test endpoints**: Use curl or the Mini App
4. **Add error handling**: Customize error responses
5. **Add logging**: Implement request/response logging
6. **Add rate limiting**: Protect against abuse
7. **Add caching**: Cache frequently accessed data

---

## Support

- API runs on port `3000` (configurable via `API_PORT`)
- Uses Python tools for database operations
- Integrated with existing WAT framework
- Compatible with Mini App frontend

For issues, check:
- Bot logs: `cd bot && npm run dev`
- Python tool errors: Test tools directly
- Database connection: Check `DATABASE_URL` in `.env`
