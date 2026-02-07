# Mini App Integration Guide

This guide shows how to integrate the Telegram Mini App with your RPG Quest Bot backend.

## 🔗 Required API Endpoints

The Mini App expects these REST API endpoints to be available:

### User Endpoints

#### Get User Stats
```
GET /api/users/:telegramId/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "telegram_id": 123456789,
      "username": "johndoe",
      "first_name": "John",
      "last_name": "Doe",
      "level": 5,
      "xp": 1250,
      "xp_to_next_level": 2000,
      "total_quests_completed": 42,
      "current_streak": 7,
      "longest_streak": 14,
      "created_at": "2024-01-15T10:30:00Z"
    },
    "modes": [
      {
        "user_id": 1,
        "mode_id": 1,
        "is_active": true,
        "activated_at": "2024-01-15T11:00:00Z",
        "mode": {
          "id": 1,
          "name": "fitness",
          "display_name": "Fitness",
          "description": "Track your workouts",
          "icon": "💪",
          "is_active": true
        }
      }
    ],
    "activeQuests": [...],
    "completedQuestsToday": 3,
    "recentAchievements": [...],
    "xpGainedToday": 150,
    "streakData": {
      "current": 7,
      "longest": 14,
      "daysActive": 25
    }
  }
}
```

### Quest Endpoints

#### Get Active Quests
```
GET /api/users/:userId/quests/active
```

#### Get Completed Quests
```
GET /api/users/:userId/quests/completed?limit=20
```

#### Complete Quest
```
POST /api/quests/:questId/complete
Body: { "progress": 100 }
```

#### Update Quest Progress
```
PATCH /api/quests/:questId/progress
Body: { "progress": 50 }
```

### Achievement Endpoints

#### Get All Achievements
```
GET /api/achievements
```

#### Get User Achievements
```
GET /api/users/:userId/achievements
```

### Mode Endpoints

#### Add Mode to User
```
POST /api/users/:userId/modes
Body: { "mode_id": 1 }
```

#### Remove Mode from User
```
DELETE /api/users/:userId/modes/:modeId
```

## 🔐 Authentication

The Mini App sends Telegram's `initData` in the `X-Telegram-Init-Data` header for every API request.

### Backend Validation (TypeScript/Node.js)

```typescript
import crypto from 'crypto';

function validateTelegramWebAppData(initData: string, botToken: string): boolean {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');

  if (!hash) return false;

  urlParams.delete('hash');

  // Create data-check-string
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

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

  return calculatedHash === hash;
}

// Express middleware
export function validateTelegramInit(req, res, next) {
  const initData = req.headers['x-telegram-init-data'];

  if (!initData) {
    return res.status(401).json({ error: 'Missing init data' });
  }

  const isValid = validateTelegramWebAppData(initData, process.env.TELEGRAM_BOT_TOKEN);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid init data' });
  }

  // Parse user data
  const urlParams = new URLSearchParams(initData);
  const userJson = urlParams.get('user');
  if (userJson) {
    req.telegramUser = JSON.parse(userJson);
  }

  next();
}
```

### Python Validation

```python
import hashlib
import hmac
from urllib.parse import parse_qsl

def validate_telegram_webapp_data(init_data: str, bot_token: str) -> bool:
    """Validate Telegram WebApp initData"""
    try:
        parsed_data = dict(parse_qsl(init_data))
        hash_value = parsed_data.pop('hash', None)

        if not hash_value:
            return False

        # Create data-check-string
        data_check_string = '\n'.join(
            f"{k}={v}" for k, v in sorted(parsed_data.items())
        )

        # Create secret key
        secret_key = hmac.new(
            b"WebAppData",
            bot_token.encode(),
            hashlib.sha256
        ).digest()

        # Calculate hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()

        return calculated_hash == hash_value
    except Exception:
        return False
```

## 🚀 Deployment

### Option 1: Static Hosting (Recommended)

Deploy to platforms that support static sites:

#### Vercel
```bash
cd mini-app
npm run build
vercel --prod
```

#### Netlify
```bash
cd mini-app
npm run build
netlify deploy --prod --dir=dist
```

#### Cloudflare Pages
```bash
cd mini-app
npm run build
# Upload dist/ folder to Cloudflare Pages
```

### Option 2: Docker

```dockerfile
# mini-app/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Option 3: Same Server as Bot

```bash
# Build Mini App
cd mini-app
npm run build

# Copy to bot's public directory
mkdir -p ../bot/public
cp -r dist/* ../bot/public/

# Serve from Express/Node.js
```

In your bot server:
```typescript
import express from 'express';
import path from 'path';

const app = express();

// Serve Mini App
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRouter);

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

## 🔧 Environment Variables

### Bot (.env)
```env
MINI_APP_URL=https://your-domain.com
```

### Mini App (.env)
```env
VITE_API_URL=https://your-api.com/api
```

## 📱 Testing

### Local Testing with ngrok

1. Start Mini App:
   ```bash
   cd mini-app
   npm run dev
   ```

2. Expose with ngrok:
   ```bash
   ngrok http 3001
   ```

3. Update bot's MINI_APP_URL:
   ```env
   MINI_APP_URL=https://abc123.ngrok.io
   ```

4. Test in Telegram:
   - Send `/app` to your bot
   - Click "Open RPG Quest" button
   - Mini App should load

### Production Testing

1. Deploy Mini App to hosting
2. Update MINI_APP_URL to production URL
3. Test all features:
   - [ ] Dashboard loads
   - [ ] Quests display correctly
   - [ ] Profile shows achievements
   - [ ] Navigation works
   - [ ] Telegram theme applies
   - [ ] API calls succeed

## 🐛 Common Issues

### CORS Errors

Add CORS headers to your API:

```typescript
app.use(cors({
  origin: process.env.MINI_APP_URL,
  credentials: true
}));
```

### initData Validation Fails

- Check bot token is correct
- Verify initData format
- Test with Telegram's official test environment

### Mini App doesn't load in Telegram

- Ensure URL is HTTPS
- Check Content-Security-Policy headers
- Verify telegram-web-app.js is loaded

### API 401 Unauthorized

- Check X-Telegram-Init-Data header is sent
- Verify validation logic
- Test with real Telegram user data

## 📚 Resources

- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [Validating Data](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
- [Mini App Examples](https://core.telegram.org/bots/webapps#examples)

## ✅ Integration Checklist

- [ ] API endpoints implemented
- [ ] Telegram initData validation working
- [ ] CORS configured correctly
- [ ] Mini App deployed to HTTPS URL
- [ ] Bot commands updated with Mini App URL
- [ ] Tested in actual Telegram app
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Analytics configured (optional)

Happy integrating! 🚀
