# API Endpoints Reference

Quick reference guide for all Mini App API endpoints.

**Base URL:** `https://your-api.com/api`

**Authentication:** All endpoints require `x-telegram-init-data` header (see `telegram_miniapp_authentication.md`)

---

## 📝 Quest Endpoints

### Get Active Quests
```http
GET /users/:userId/quests/active
```

**Description:** Retrieve all active quests for a user

**Response:**
```json
{
  "quests": [
    {
      "id": 1,
      "quest_template_id": 5,
      "name": "Morning Workout",
      "description": "Complete 30 minutes of exercise",
      "xp_reward": 50,
      "frequency": "daily",
      "difficulty": "medium",
      "mode_id": 1,
      "mode_name": "fitness",
      "status": "active",
      "progress": 15,
      "target_value": 30,
      "assigned_date": "2024-01-15",
      "due_date": "2024-01-16"
    }
  ],
  "count": 1
}
```

---

### Get Completed Quests
```http
GET /users/:userId/quests/completed?limit=50
```

**Description:** Retrieve completed quests (paginated)

**Query Parameters:**
- `limit` (optional): Max number of quests to return (default: 50)

**Response:** Same structure as active quests, includes `completed_date`

---

### Get Quest Details
```http
GET /quests/:questId
```

**Description:** Get detailed information about a specific quest

**Response:**
```json
{
  "quest": {
    "id": 1,
    "user_id": 123,
    "quest_template_id": 5,
    "name": "Morning Workout",
    "description": "Complete 30 minutes of exercise",
    "xp_reward": 50,
    "frequency": "daily",
    "difficulty": "medium",
    "mode_id": 1,
    "mode_name": "fitness",
    "mode_icon": "🏋️",
    "status": "active",
    "progress": 15,
    "target_value": 30,
    "assigned_date": "2024-01-15T10:00:00Z",
    "due_date": "2024-01-16T23:59:59Z",
    "completed_date": null
  }
}
```

**Errors:**
- `404`: Quest not found

---

### Complete Quest
```http
POST /quests/:questId/complete
```

**Description:** Mark a quest as completed and award XP

**Request Body:**
```json
{
  "progress": 30  // Optional: Final progress value
}
```

**Response:**
```json
{
  "message": "Quest completed successfully",
  "xpEarned": 50,
  "newLevel": 5,
  "leveledUp": true
}
```

**Errors:**
- `404`: Quest not found
- `400`: Quest already completed

---

### Update Quest Progress
```http
PATCH /quests/:questId/progress
```

**Description:** Update progress without completing the quest

**Request Body:**
```json
{
  "progress": 20
}
```

**Response:**
```json
{
  "message": "Quest progress updated successfully",
  "progress": 20
}
```

**Errors:**
- `400`: Invalid progress value (negative or missing)

---

### Assign Quests
```http
POST /users/:userId/quests/assign
```

**Description:** Assign new daily or weekly quests to user

**Request Body:**
```json
{
  "frequency": "daily"  // "daily" or "weekly"
}
```

**Response:**
```json
{
  "message": "3 daily quests assigned successfully",
  "quests": [
    {
      "id": 10,
      "quest_template_id": 3,
      "template": {
        "name": "Hydration Challenge",
        "description": "Drink 8 glasses of water"
      }
    }
  ]
}
```

**Errors:**
- `400`: Invalid frequency or user has no active modes
- `404`: No quest templates available

---

## 👤 User Endpoints

### Get User Profile
```http
GET /users/:userId/profile
```

**Response:**
```json
{
  "id": 1,
  "telegram_id": 123456789,
  "username": "john_doe",
  "first_name": "John",
  "current_level": 5,
  "total_xp": 2500,
  "timezone": "America/New_York",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### Update User Profile
```http
PATCH /users/:userId/profile
```

**Request Body:**
```json
{
  "timezone": "Europe/London",
  "first_name": "Jane"
}
```

---

### Get User Stats
```http
GET /users/:userId/stats
```

**Response:**
```json
{
  "user_id": 1,
  "telegram_id": 123456789,
  "current_level": 5,
  "total_xp": 2500,
  "overall_streak": 7,
  "mode_streaks": [
    {
      "mode_name": "fitness",
      "display_name": "Fitness",
      "current_streak": 7,
      "longest_streak": 14,
      "last_activity_date": "2024-01-15"
    }
  ],
  "total_quests_completed": 42,
  "is_active": true
}
```

---

## 🏆 Achievement Endpoints

### Get User Achievements
```http
GET /users/:userId/achievements
```

**Response:**
```json
{
  "achievements": [
    {
      "id": 1,
      "name": "First Steps",
      "description": "Complete your first quest",
      "icon": "🎯",
      "xp_reward": 10,
      "unlocked_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total_unlocked": 5,
  "total_available": 20
}
```

---

### Get Achievement Details
```http
GET /achievements/:achievementId
```

**Response:**
```json
{
  "achievement": {
    "id": 1,
    "name": "First Steps",
    "description": "Complete your first quest",
    "icon": "🎯",
    "xp_reward": 10,
    "unlock_condition": "complete_quests_count >= 1",
    "is_unlocked": true,
    "unlocked_at": "2024-01-15T10:00:00Z"
  }
}
```

---

## 🎯 Mode Endpoints

### Get Active Modes
```http
GET /users/:userId/modes
```

**Response:**
```json
{
  "modes": [
    {
      "mode_id": 1,
      "name": "fitness",
      "display_name": "Fitness",
      "description": "Track workouts and exercises",
      "icon_emoji": "🏋️",
      "enabled_at": "2024-01-01T00:00:00Z",
      "is_active": true
    }
  ],
  "count": 2
}
```

---

### Add Mode
```http
POST /users/:userId/modes
```

**Request Body:**
```json
{
  "mode_name": "hydration"
}
```

**Response:**
```json
{
  "message": "Mode added successfully",
  "mode": {
    "mode_id": 2,
    "name": "hydration",
    "display_name": "Hydration",
    "is_active": true
  }
}
```

---

### Remove Mode
```http
DELETE /users/:userId/modes/:modeName
```

**Response:**
```json
{
  "message": "Mode removed successfully"
}
```

---

## 🔐 Authentication

**All endpoints require:**

**Header:**
```
x-telegram-init-data: query_id=AAH...&user=%7B%22id%22%3A123...&auth_date=1234567890&hash=abc123...
```

**Example Request:**
```bash
curl -X GET https://your-api.com/api/users/123/quests/active \
  -H "x-telegram-init-data: ${TELEGRAM_INIT_DATA}" \
  -H "Content-Type: application/json"
```

**JavaScript (Frontend):**
```javascript
const tg = window.Telegram.WebApp;

fetch('/api/users/123/quests/active', {
  headers: {
    'x-telegram-init-data': tg.initData,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## ⚠️ Error Codes

### 400 Bad Request
Invalid request parameters or body

```json
{
  "error": "Bad Request",
  "message": "Invalid frequency. Must be 'daily' or 'weekly'"
}
```

### 401 Unauthorized
Missing or invalid authentication

```json
{
  "error": "Unauthorized",
  "message": "Invalid Telegram authentication data"
}
```

### 403 Forbidden
User doesn't have permission to access resource

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found
Resource doesn't exist

```json
{
  "error": "Not Found",
  "message": "Quest not found"
}
```

### 500 Server Error
Internal server error

```json
{
  "error": "Server Error",
  "message": "Failed to fetch active quests"
}
```

---

## 📊 Common Patterns

### Get User's Active Quests and Complete One

```javascript
// 1. Get active quests
const quests = await fetch('/api/users/123/quests/active', {
  headers: { 'x-telegram-init-data': initData }
}).then(r => r.json());

// 2. User completes a quest
const questId = quests.quests[0].id;
const result = await fetch(`/api/quests/${questId}/complete`, {
  method: 'POST',
  headers: {
    'x-telegram-init-data': initData,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ progress: 30 })
}).then(r => r.json());

console.log(`Earned ${result.xpEarned} XP!`);
if (result.leveledUp) {
  console.log(`Level up! Now level ${result.newLevel}`);
}
```

### Update Quest Progress Incrementally

```javascript
// Track progress as user works
let progress = 0;

function updateProgress(increment) {
  progress += increment;

  fetch(`/api/quests/${questId}/progress`, {
    method: 'PATCH',
    headers: {
      'x-telegram-init-data': initData,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ progress })
  });
}

// User drinks a glass of water
updateProgress(1);  // 1/8 glasses

// When target reached, complete quest
if (progress >= targetValue) {
  fetch(`/api/quests/${questId}/complete`, {
    method: 'POST',
    headers: { 'x-telegram-init-data': initData }
  });
}
```

### Daily Quest Assignment Flow

```javascript
// Check if user needs new quests
async function assignDailyQuests(userId) {
  const activeQuests = await fetch(`/api/users/${userId}/quests/active`, {
    headers: { 'x-telegram-init-data': initData }
  }).then(r => r.json());

  // If no active daily quests, assign new ones
  const hasDailyQuests = activeQuests.quests.some(q => q.frequency === 'daily');

  if (!hasDailyQuests) {
    const result = await fetch(`/api/users/${userId}/quests/assign`, {
      method: 'POST',
      headers: {
        'x-telegram-init-data': initData,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ frequency: 'daily' })
    }).then(r => r.json());

    console.log(`Assigned ${result.quests.length} daily quests!`);
  }
}
```

---

## 🔗 Related Documentation

- **Authentication Details:** `telegram_miniapp_authentication.md`
- **Database Operations:** `database_operations.md`
- **User Management:** `user_management.md`
- **Mode Management:** `mode_management.md`

---

**Generated for:** Wibecode - Telegram RPG Quest Bot
**Last Updated:** 2024-01-15
