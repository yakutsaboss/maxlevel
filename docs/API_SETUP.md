# 🚀 API Setup Guide - Telegram RPG Quest Bot

Complete guide to setting up the API server for your Telegram Mini App backend.

---

## 📋 Prerequisites

### Required Software

1. **Node.js** (v18 or higher) - for Express API server
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **Python** (v3.9 or higher) - for bot tools and Python API
   - Verify: `python --version`

3. **PostgreSQL** (v12 or higher) - database
   - Verify: `psql --version`

### Required Environment Variables

Create/update your `.env` file:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/telegram_rpg

# API Server
NODE_ENV=development
API_PORT=3000
LOG_LEVEL=info

# Authentication
SKIP_AUTH=true  # Only for development! Remove in production

# Python Tools
PYTHON_EXECUTABLE=python
PYTHON_TOOLS_PATH=../tools

# Optional: JWT for session tokens
JWT_SECRET=your_random_secret_key_here
```

---

## 🔧 Installation

### Step 1: Install Node.js Dependencies

```bash
cd bot
npm install
```

**Installs:**
- `express` - Web framework
- `grammy` - Telegram Bot framework
- `typescript` - Type safety
- `tsx` - TypeScript executor
- `cors` - Cross-origin requests
- `helmet` - Security headers
- `morgan` - Request logging

### Step 2: Install Python Dependencies

```bash
# From project root
pip install -r requirements.txt
```

**Key packages:**
- `python-telegram-bot==20.7` - Telegram Bot API (if using Python bot)
- `aiogram==3.24.0` - Modern async Telegram framework ✅ **Just installed!**
- `psycopg2-binary` - PostgreSQL adapter
- `fastapi` - Python API framework (optional)
- `pydantic` - Data validation

### Step 3: Verify Installation

```bash
# Check environment
python scripts/check_environment.py

# Expected output:
# ✓ Python version: 3.x.x
# ✓ All required dependencies installed
# ✓ Database connection successful
# ✓ Node.js installed: v18.x.x
# ✓ Bot dependencies installed
```

---

## 🏗️ Architecture Overview

Your project has **two API layers**:

### 1. **Node.js/Express API** (Primary for Mini App)
- **Location:** `bot/src/api/`
- **Port:** 3000 (default)
- **Purpose:** REST API for Telegram Mini App
- **Language:** TypeScript
- **Framework:** Express.js

**Structure:**
```
bot/src/api/
├── server.ts              # Express server setup
├── middleware/
│   └── auth.ts            # Telegram WebApp authentication
└── routes/
    ├── users.ts           # User endpoints
    ├── quests.ts          # Quest endpoints
    └── achievements.ts    # Achievement endpoints
```

### 2. **Python Tools** (Backend utilities)
- **Location:** `tools/`
- **Purpose:** Database operations, business logic
- **Language:** Python
- **Called by:** Node.js API via `executePythonTool()`

**Structure:**
```
tools/
├── db_operations.py       # Database queries
├── user_manager.py        # User CRUD
├── mode_manager.py        # Mode operations
└── quest_manager.py       # Quest logic (to be created)
```

---

## ▶️ Starting the API

### Option 1: Development Mode (Recommended)

Start both bot and API together:

```bash
cd bot
npm run dev
```

**What this does:**
1. Starts Express API server on port 3000
2. Starts Telegram bot
3. Enables hot reload (file changes auto-restart)
4. Logs requests to console

**Expected output:**
```
==================================================
🤖 Telegram RPG Quest Bot - Development Mode
==================================================

📊 Testing database connection...
✅ Database connection successful

🌐 Starting API server...
✅ API server running on http://localhost:3000

🚀 Starting bot...
✅ Bot started successfully!
   Bot username: @your_bot_name_bot

📡 Listening for updates...
```

### Option 2: Production Mode

```bash
cd bot

# Build TypeScript
npm run build

# Start server
npm start
```

### Option 3: API Only (Without Bot)

If you only need the API server:

```bash
cd bot
npm run api
```

Or manually:

```bash
cd bot
tsx src/api/server.ts
```

---

## 🧪 Testing the API

### 1. Health Check (No Auth Required)

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-07T10:30:00.000Z",
  "uptime": 123.45,
  "database": "connected"
}
```

### 2. Test Protected Endpoint (With Auth)

#### In Development (SKIP_AUTH=true):

```bash
curl http://localhost:3000/api/users/1/quests/active
```

#### In Production (Real Auth):

First, get initData from Telegram Mini App:

```javascript
// In your Mini App frontend
const initData = window.Telegram.WebApp.initData;
console.log('InitData:', initData);
```

Then use it in request:

```bash
curl -X GET http://localhost:3000/api/users/1/quests/active \
  -H "x-telegram-init-data: query_id=AAH...&user=%7B%22id%22...&hash=abc123..."
```

### 3. Using Postman

**Import this request:**

```json
{
  "method": "GET",
  "url": "http://localhost:3000/api/users/{{userId}}/quests/active",
  "headers": {
    "x-telegram-init-data": "{{telegram_init_data}}",
    "Content-Type": "application/json"
  }
}
```

**Variables:**
- `userId`: Your test user ID (e.g., `1`)
- `telegram_init_data`: InitData from Telegram (or skip in dev mode)

---

## 🔐 Authentication Setup

### Development Mode (Testing)

For local testing without Telegram:

```env
# .env
NODE_ENV=development
SKIP_AUTH=true
```

**⚠️ Warning:** This skips all authentication checks. Never use in production!

### Production Mode (Real Authentication)

```env
# .env
NODE_ENV=production
SKIP_AUTH=false  # Or remove this line
TELEGRAM_BOT_TOKEN=your_real_bot_token
```

**How it works:**
1. User opens Mini App in Telegram
2. Telegram generates `initData` with cryptographic signature
3. Frontend sends `initData` in `x-telegram-init-data` header
4. Backend validates signature using bot token
5. If valid, extracts user info and allows access

**Implementation:** See `bot/src/api/middleware/auth.ts`

---

## 🐍 Python API Gateway (Optional)

If you want a Python-based API (using FastAPI):

### Install FastAPI

Already in `requirements.txt`:
```bash
pip install fastapi uvicorn[standard]
```

### Create Python API

```python
# tools/api_gateway.py
from fastapi import FastAPI, Header, HTTPException
from typing import Optional
import os

app = FastAPI(title="Telegram RPG API")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/users/{user_id}/stats")
async def get_user_stats(
    user_id: int,
    x_telegram_init_data: Optional[str] = Header(None)
):
    # Validate Telegram auth
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Missing auth data")

    # Get user stats using existing tools
    from tools.user_manager import get_user_stats
    stats = get_user_stats(user_id)

    if not stats:
        raise HTTPException(status_code=404, detail="User not found")

    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Run Python API

```bash
python tools/api_gateway.py

# Or with uvicorn
uvicorn tools.api_gateway:app --reload --port 8000
```

---

## 📡 API Endpoints Overview

### Base URL
```
http://localhost:3000/api
```

### Available Endpoints

**Health & Status**
- `GET /health` - Health check (no auth)

**Users**
- `GET /users/:telegramId/stats` - Get user stats
- `GET /users/:userId/profile` - Get profile
- `POST /users` - Create user
- `PATCH /users/:userId/xp` - Add XP

**Quests**
- `GET /users/:userId/quests/active` - Active quests
- `GET /users/:userId/quests/completed` - Completed quests
- `GET /quests/:questId` - Quest details
- `POST /quests/:questId/complete` - Complete quest
- `PATCH /quests/:questId/progress` - Update progress
- `POST /users/:userId/quests/assign` - Assign quests

**Achievements**
- `GET /achievements` - All achievements
- `GET /achievements/users/:userId` - User achievements
- `POST /achievements/users/:userId/:achievementId/unlock` - Unlock

**Full documentation:** See [API.md](API.md) and [API_ENDPOINTS_REFERENCE.md](../workflows/api_endpoints_reference.md)

---

## 🐛 Troubleshooting

### API Server Won't Start

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Linux/Mac:
lsof -i :3000
kill -9 <pid>

# Or change port
# In .env:
API_PORT=3001
```

---

### Database Connection Failed

**Error:** `Failed to connect to PostgreSQL`

**Solutions:**
1. Check PostgreSQL is running:
   ```bash
   # Windows: Check Services
   # Linux: systemctl status postgresql
   ```

2. Verify DATABASE_URL in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/telegram_rpg
   ```

3. Test connection:
   ```bash
   python tools/db_operations.py --test-connection
   ```

---

### Authentication Fails

**Error:** `401 Unauthorized - Invalid Telegram authentication data`

**Solutions:**

**Development:**
```env
SKIP_AUTH=true  # Skip auth in dev
```

**Production:**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check initData is not expired (24h limit)
- Ensure initData is sent raw (not parsed)
- Check for clock skew between client/server

**Debug:**
```typescript
// In auth.ts, add logging
console.log('Validating initData:', {
  hasInitData: !!initData,
  hasBotToken: !!botToken,
  initDataLength: initData?.length
});
```

---

### Python Tools Not Found

**Error:** `Python tool execution failed`

**Solutions:**

1. Verify PYTHON_EXECUTABLE in `.env`:
   ```env
   PYTHON_EXECUTABLE=python
   # Or: PYTHON_EXECUTABLE=python3
   ```

2. Check PYTHON_TOOLS_PATH:
   ```env
   PYTHON_TOOLS_PATH=../tools
   ```

3. Test Python execution:
   ```bash
   python tools/db_operations.py --test-connection
   ```

---

### CORS Issues

**Error:** `Cross-Origin Request Blocked`

**Solution:** Add your frontend domain to CORS whitelist

```typescript
// In bot/src/api/server.ts
import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server
    'https://your-miniapp-domain.com'
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-telegram-init-data']
}));
```

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] Remove or set `SKIP_AUTH=false`
- [ ] Use HTTPS (not HTTP)
- [ ] Set strong `JWT_SECRET` if using sessions
- [ ] Enable rate limiting (see below)
- [ ] Use environment variables for all secrets
- [ ] Never commit `.env` to git
- [ ] Validate all user inputs
- [ ] Implement authorization (resource ownership)
- [ ] Enable request logging
- [ ] Set up monitoring/alerts

### Add Rate Limiting

```bash
cd bot
npm install express-rate-limit
```

```typescript
// In bot/src/api/server.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests
  message: 'Too many requests, please try again later'
});

app.use('/api', limiter);
```

---

## 📚 Related Documentation

- **Authentication Deep Dive:** [workflows/telegram_miniapp_authentication.md](../workflows/telegram_miniapp_authentication.md)
- **API Endpoints Reference:** [workflows/api_endpoints_reference.md](../workflows/api_endpoints_reference.md)
- **API Documentation:** [API.md](API.md)
- **Backend Complete:** [BACKEND_API_COMPLETE.md](BACKEND_API_COMPLETE.md)
- **Database Setup:** [SETUP.md](../SETUP.md)

---

## 🚀 Deployment

### Deploy to Production

See deployment guide for:
- Timeweb Cloud deployment
- PM2 process manager setup
- Nginx reverse proxy
- SSL certificate setup
- Environment configuration
- Monitoring and logs

**Quick start:**
```bash
# Build
npm run build

# Start with PM2
pm2 start dist/index.js --name telegram-bot

# Check status
pm2 status
pm2 logs telegram-bot
```

---

## ✅ Verification Checklist

After setup, verify everything works:

```bash
# 1. Check environment
python scripts/check_environment.py

# 2. Test database
python tools/db_operations.py --test-connection

# 3. Start API
cd bot && npm run dev

# 4. Test health endpoint
curl http://localhost:3000/health

# 5. Test protected endpoint (dev mode)
curl http://localhost:3000/api/users/1/quests/active

# 6. Check logs for errors
# Should see: "API server running on http://localhost:3000"
```

**All green?** ✅ You're ready to develop!

---

## 🆘 Need Help?

1. **Check logs:** `npm run dev` shows all errors
2. **Environment check:** `python scripts/check_environment.py`
3. **Database issues:** See [database_operations.md](../workflows/database_operations.md)
4. **Auth issues:** See [telegram_miniapp_authentication.md](../workflows/telegram_miniapp_authentication.md)

**Common issues:** See Troubleshooting section above

---

**API Setup Complete!** 🎉

Your Telegram RPG Quest Bot API is now ready for development. Start building your Mini App frontend!

Next steps:
- Read [API.md](API.md) for endpoint documentation
- Check [telegram_miniapp_authentication.md](../workflows/telegram_miniapp_authentication.md) for auth details
- Start developing your Mini App UI
