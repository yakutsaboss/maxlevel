# Telegram Mini App Authentication Workflow

## Objective
Secure authentication for Telegram Mini App (Web App) using Telegram's official validation mechanism. This workflow covers the complete authentication flow, from receiving initData to validating user identity and authorizing resource access.

## Overview

Telegram Mini Apps use a special authentication mechanism based on HMAC-SHA256 signatures. When a user opens your Mini App through Telegram, the app receives `initData` - a URL-encoded string containing user information and a cryptographic signature.

**Security Model:**
- No passwords or tokens stored client-side
- Telegram cryptographically signs all user data
- Server validates signature using bot token as secret key
- Data expires after 24 hours

**Architecture:**
```
Telegram Client → Mini App (Frontend) → API (authenticateTelegram middleware) → Protected Resources
```

## Required Inputs

### Environment Variables
- **TELEGRAM_BOT_TOKEN**: Bot token from @BotFather (required)
- **NODE_ENV**: Environment mode (development/production)
- **SKIP_AUTH**: Set to 'true' to skip auth in development (optional, use with caution)

### Request Headers
- **x-telegram-init-data**: URL-encoded initData string from Telegram WebApp API

### InitData Structure
The initData contains:
- `query_id`: Unique query identifier (optional)
- `user`: JSON object with user info (id, first_name, username, etc.)
- `auth_date`: Unix timestamp when data was generated
- `hash`: HMAC-SHA256 signature

## Implementation Files

**Core Files:**
- `bot/src/api/middleware/auth.ts` - Authentication middleware
  - `validateTelegramWebAppData()` - Validates HMAC signature
  - `parseTelegramInitData()` - Parses initData into structured object
  - `authenticateTelegram()` - Express middleware for protected routes
  - `authorizeUser()` - Authorization middleware (to be implemented)

**Usage in Routes:**
- `bot/src/api/routes/quests.ts` - Quest management endpoints
- `bot/src/api/routes/users.ts` - User profile endpoints
- `bot/src/api/routes/achievements.ts` - Achievement endpoints

## Process

### 1. Frontend: Obtain InitData

In your Mini App frontend (React, Vue, etc.):

```javascript
// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();

// Get initData from Telegram
const initData = tg.initData;

// Make API request with initData in header
fetch('/api/users/123/quests/active', {
  method: 'GET',
  headers: {
    'x-telegram-init-data': initData,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('User quests:', data));
```

**Important:** Never parse or validate initData on the frontend. Always send raw initData to backend.

### 2. Backend: Validate Authentication

The `authenticateTelegram` middleware automatically:

1. **Extracts initData** from `x-telegram-init-data` header
2. **Validates signature** using HMAC-SHA256
3. **Checks expiration** (must be <24 hours old)
4. **Parses user data** and attaches to request
5. **Returns 401** if validation fails

```typescript
// In your route file
import { authenticateTelegram } from '../middleware/auth';

router.get('/users/:userId/quests/active',
  authenticateTelegram,  // ← Add middleware here
  async (req: Request, res: Response) => {
    // Access authenticated user
    const telegramUser = (req as any).telegramUser;
    console.log('Authenticated user:', telegramUser.id, telegramUser.first_name);

    // Your business logic here
  }
);
```

### 3. Validation Algorithm

The middleware implements Telegram's official validation algorithm:

```
1. Extract hash from initData
2. Remove hash parameter
3. Sort remaining parameters alphabetically
4. Create data-check-string (key=value pairs joined by \n)
5. Create secret_key = HMAC-SHA256("WebAppData", bot_token)
6. Calculate hash = HMAC-SHA256(secret_key, data-check-string)
7. Compare calculated hash with provided hash
```

**Implementation:**
```typescript
// Create secret key
const secretKey = crypto
  .createHmac('sha256', 'WebAppData')
  .update(botToken)
  .digest();

// Calculate hash
const calculatedHash = crypto
  .createHmac('sha256', secretKey)
  .update(dataCheckString)
  .digest('hex');

// Compare hashes
return calculatedHash === hash;
```

### 4. Access User Information

After successful authentication, user data is attached to the request:

```typescript
router.get('/profile', authenticateTelegram, async (req, res) => {
  const user = (req as any).telegramUser;

  res.json({
    id: user.id,                    // Telegram user ID
    firstName: user.first_name,     // User's first name
    lastName: user.last_name,       // Last name (optional)
    username: user.username,        // Username (optional)
    languageCode: user.language_code // Language code
  });
});
```

### 5. Authorization (Resource Ownership)

Use `authorizeUser` middleware to verify user owns the resource:

```typescript
// TODO: Implement in auth.ts
export function authorizeUser(req: Request, res: Response, next: NextFunction) {
  const telegramUser = (req as any).telegramUser;
  const userId = req.params.userId;

  // Query database to match telegram_id with user_id
  const dbUser = await getUserByTelegramId(telegramUser.id);

  if (dbUser.id !== parseInt(userId)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this resource'
    });
  }

  next();
}

// Usage
router.get('/users/:userId/profile',
  authenticateTelegram,  // Validate authentication
  authorizeUser,         // Verify ownership
  async (req, res) => {
    // User is authenticated AND authorized
  }
);
```

## API Endpoints Using Authentication

### Quest Endpoints

**GET /api/users/:userId/quests/active**
```bash
curl -X GET https://your-api.com/api/users/123/quests/active \
  -H "x-telegram-init-data: query_id=AAH...&user=%7B%22id%22%3A123...&auth_date=1234567890&hash=abc123..."
```

**Response:**
```json
{
  "quests": [
    {
      "id": 1,
      "name": "Morning Workout",
      "description": "Complete 30 minutes of exercise",
      "xp_reward": 50,
      "status": "active",
      "progress": 15,
      "target_value": 30
    }
  ],
  "count": 1
}
```

**POST /api/quests/:questId/complete**
```bash
curl -X POST https://your-api.com/api/quests/1/complete \
  -H "x-telegram-init-data: ..." \
  -H "Content-Type: application/json" \
  -d '{"progress": 30}'
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

### User Endpoints

All user profile endpoints require authentication:
- `GET /api/users/:userId/profile`
- `PATCH /api/users/:userId/profile`
- `GET /api/users/:userId/stats`

### Achievement Endpoints

All achievement endpoints require authentication:
- `GET /api/users/:userId/achievements`
- `GET /api/achievements/:achievementId`

## Development Mode

### Skip Authentication (Development Only)

For local development, you can skip authentication:

```bash
# In .env
NODE_ENV=development
SKIP_AUTH=true
```

**Warning:** Never use this in production! The middleware will log a warning:
```
⚠️  Authentication skipped (development mode)
```

### Testing with Mock Data

Create mock initData for testing:

```javascript
// test/mockInitData.js
const crypto = require('crypto');

function createMockInitData(botToken, userId = 123456) {
  const authDate = Math.floor(Date.now() / 1000);
  const user = {
    id: userId,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser'
  };

  const dataCheckString = [
    `auth_date=${authDate}`,
    `user=${JSON.stringify(user)}`
  ].join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return `auth_date=${authDate}&user=${encodeURIComponent(JSON.stringify(user))}&hash=${hash}`;
}

module.exports = { createMockInitData };
```

## Error Responses

### 401 Unauthorized

**Missing initData:**
```json
{
  "error": "Unauthorized",
  "message": "Missing Telegram authentication data"
}
```

**Invalid signature:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid Telegram authentication data"
}
```

**Expired data:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication data expired"
}
```

**Invalid user data:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid user data"
}
```

### 403 Forbidden

**Authorization failed:**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

### 500 Server Error

**Bot token not configured:**
```json
{
  "error": "Server Error",
  "message": "Bot token not configured"
}
```

## Edge Cases & Troubleshooting

### 1. Authentication Fails in Production

**Symptoms:**
- All requests return 401
- Frontend shows "Invalid Telegram authentication data"

**Common Causes:**
- Wrong bot token in environment variables
- InitData being modified/parsed on frontend
- Clock skew between client and server (>24 hours)

**Solutions:**
```bash
# 1. Verify bot token
echo $TELEGRAM_BOT_TOKEN

# 2. Check initData is sent raw (not parsed)
console.log('Raw initData:', tg.initData);  // Should be URL-encoded string

# 3. Check server time
date -u

# 4. Enable debug logging
console.log('Validation attempt:', {
  hasInitData: !!initData,
  hasBotToken: !!botToken,
  authDate: parsedData?.auth_date,
  ageInSeconds: authAge
});
```

### 2. Authentication Works but Authorization Fails

**Symptoms:**
- User is authenticated (middleware passes)
- But cannot access their own resources

**Cause:** Missing database lookup to match telegram_id with user_id

**Solution:**
```typescript
// Implement proper authorization
const dbUser = await getUserByTelegramId(telegramUser.id);
if (!dbUser) {
  // User authenticated but not in database
  // Create user or return error
}
```

### 3. CORS Issues

**Symptoms:**
- Authentication works in same-origin tests
- Fails when Mini App makes cross-origin requests

**Solution:**
```typescript
// Add CORS middleware before routes
import cors from 'cors';

app.use(cors({
  origin: 'https://your-miniapp-domain.com',
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-telegram-init-data']
}));
```

### 4. InitData Expires During Session

**Symptoms:**
- User authenticated successfully
- After 24 hours, all requests return 401

**Behavior:** This is expected - Telegram initData expires after 24 hours

**Solutions:**

**Option A: Reload Mini App (recommended)**
```javascript
// Detect 401 and reload
fetch('/api/endpoint', { headers: { 'x-telegram-init-data': initData } })
  .then(res => {
    if (res.status === 401) {
      // Refresh Mini App to get new initData
      window.location.reload();
    }
  });
```

**Option B: Session Tokens (complex)**
- On first authentication, issue JWT token
- Store JWT client-side (sessionStorage)
- Use JWT for subsequent requests
- Refresh JWT when needed

### 5. Multiple Bot Tokens (Staging/Production)

**Symptoms:**
- Authentication works in one environment but not another
- Using production bot token in staging

**Solution:**
```bash
# .env.production
TELEGRAM_BOT_TOKEN=123456:ABC-production-token

# .env.staging
TELEGRAM_BOT_TOKEN=789012:XYZ-staging-token
```

Use different bots for different environments via @BotFather.

### 6. User Data Missing or Incomplete

**Symptoms:**
- Authentication succeeds but `user` object is null/undefined
- Missing username, last_name, or other fields

**Cause:** Telegram doesn't guarantee all fields (username, last_name are optional)

**Solution:**
```typescript
const user = (req as any).telegramUser;

// Always check optional fields
const username = user.username || `user_${user.id}`;
const fullName = [user.first_name, user.last_name]
  .filter(Boolean)
  .join(' ');
```

## Security Best Practices

### 1. Always Validate on Backend
❌ **Wrong:**
```javascript
// Frontend
const userData = JSON.parse(decodeURIComponent(initData.split('user=')[1]));
console.log('User ID:', userData.id);  // Never trust frontend parsing!
```

✅ **Correct:**
```javascript
// Frontend: Send raw initData to backend
fetch('/api/profile', {
  headers: { 'x-telegram-init-data': tg.initData }
});

// Backend: Validate and extract
const isValid = validateTelegramWebAppData(initData, botToken);
if (!isValid) throw new Error('Invalid data');
```

### 2. Never Expose Bot Token
```bash
# ❌ Wrong: Bot token in client code
const BOT_TOKEN = "123456:ABC-DEF...";

# ✅ Correct: Store in .env, never commit
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# Add to .gitignore
.env
.env.local
.env.production
```

### 3. Implement Rate Limiting

Add rate limiting to prevent abuse:

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many authentication attempts, please try again later'
});

app.use('/api', authLimiter);
```

### 4. Log Authentication Attempts

```typescript
// In auth.ts
export function authenticateTelegram(req, res, next) {
  const ip = req.ip;
  const timestamp = new Date().toISOString();

  const isValid = validateTelegramWebAppData(initData, botToken);

  if (!isValid) {
    console.warn(`[${timestamp}] Failed auth attempt from ${ip}`);
    // Consider: Increment failed attempt counter, alert on threshold
  } else {
    console.info(`[${timestamp}] Successful auth: user ${parsedData.user.id} from ${ip}`);
  }
}
```

### 5. Implement HTTPS Only

```typescript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

### 6. Validate Resource Ownership

Always verify user owns the resource they're accessing:

```typescript
router.delete('/quests/:questId', authenticateTelegram, async (req, res) => {
  const telegramUser = (req as any).telegramUser;
  const { questId } = req.params;

  // Get quest from database
  const quest = await getQuestById(questId);

  if (!quest) {
    return res.status(404).json({ error: 'Quest not found' });
  }

  // Verify ownership
  if (quest.user_telegram_id !== telegramUser.id) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only delete your own quests'
    });
  }

  // Proceed with deletion
  await deleteQuest(questId);
  res.json({ message: 'Quest deleted' });
});
```

## Testing

### Unit Tests

```typescript
// test/auth.test.ts
import { validateTelegramWebAppData } from '../src/api/middleware/auth';

describe('Telegram Authentication', () => {
  const botToken = 'test-bot-token';

  it('should validate correct initData', () => {
    const validInitData = createMockInitData(botToken);
    expect(validateTelegramWebAppData(validInitData, botToken)).toBe(true);
  });

  it('should reject tampered data', () => {
    let initData = createMockInitData(botToken);
    initData = initData.replace('user_id=123', 'user_id=999'); // Tamper
    expect(validateTelegramWebAppData(initData, botToken)).toBe(false);
  });

  it('should reject expired data', () => {
    const oldAuthDate = Math.floor(Date.now() / 1000) - 86400 - 1; // >24h ago
    const expiredData = createMockInitData(botToken, oldAuthDate);
    // Should be rejected by authenticateTelegram middleware
  });
});
```

### Integration Tests

```typescript
// test/api.test.ts
import request from 'supertest';
import app from '../src/app';

describe('Protected API Endpoints', () => {
  it('should reject requests without initData', async () => {
    const response = await request(app)
      .get('/api/users/123/quests/active');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  it('should accept requests with valid initData', async () => {
    const validInitData = createMockInitData(process.env.TELEGRAM_BOT_TOKEN);

    const response = await request(app)
      .get('/api/users/123/quests/active')
      .set('x-telegram-init-data', validInitData);

    expect(response.status).toBe(200);
  });
});
```

## Related Workflows
- `database_operations.md` - Database queries used in API endpoints
- `user_management.md` - User CRUD operations
- `mode_management.md` - Mode subscription operations
- API deployment (future workflow)
- Rate limiting and security (future workflow)

## References
- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [Validating Data Received via Mini App](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
- [Telegram Bot API](https://core.telegram.org/bots/api)

## Learning Notes
- InitData is NOT a JWT - it's a signed URL-encoded string
- Always validate on backend, never trust frontend parsing
- Data expires after 24 hours by design (Telegram security feature)
- Username and last_name are optional fields
- query_id may be missing in some contexts
- The hash is calculated using double HMAC (secret_key, then data)
- Clock skew can cause validation failures (ensure NTP sync)
- Different bots = different signatures (staging vs production)
