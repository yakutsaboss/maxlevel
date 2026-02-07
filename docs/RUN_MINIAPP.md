# 🚀 Quick Run Commands - Mini App

## ✨ TL;DR - Fastest Way to Run

```bash
# 1. Navigate to mini-app
cd mini-app

# 2. Start (dependencies already installed!)
npm run dev

# 3. Open browser
# http://localhost:3001
```

Done! Mini App is running. 🎉

---

## 📝 Step-by-Step Commands

### Windows PowerShell / CMD

```powershell
# Navigate to project
cd c:\Users\Asus\Desktop\Wibecode

# Go to mini-app folder
cd mini-app

# Start development server
npm run dev

# (In another terminal) Start the bot
cd ..\bot
npm run dev
```

### Git Bash / Linux / Mac

```bash
# Navigate to project
cd ~/Desktop/Wibecode  # Adjust path as needed

# Go to mini-app folder
cd mini-app

# Start development server
npm run dev

# (In another terminal) Start the bot
cd ../bot
npm run dev
```

---

## 🌐 Testing Options

### Option 1: Browser Only (Quick Test)

```bash
# Start mini-app
cd mini-app
npm run dev

# Open in browser
start http://localhost:3001  # Windows
open http://localhost:3001   # Mac
xdg-open http://localhost:3001  # Linux
```

**Limitations**: Telegram features won't work (no initData, theme, etc.)

### Option 2: Telegram with ngrok (Full Test)

#### Step 1: Start Mini App
```bash
cd mini-app
npm run dev
```

#### Step 2: Start ngrok (New Terminal)
```bash
ngrok http 3001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

#### Step 3: Update Bot
```bash
# Edit bot/.env.bot
# Change MINI_APP_URL to your ngrok URL
code bot/.env.bot  # Or use any editor
```

```env
MINI_APP_URL=https://abc123.ngrok.io
```

#### Step 4: Start Bot (New Terminal)
```bash
cd bot
npm run dev
```

#### Step 5: Test in Telegram
```
1. Open Telegram app
2. Find your bot
3. Send: /app
4. Click "🎮 Open RPG Quest"
5. Mini App loads! ✨
```

---

## 🔄 Common Commands

### Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Troubleshooting

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Kill process on port 3001 (if stuck)
# Windows:
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# Mac/Linux:
lsof -i :3001
kill -9 <pid>

# Check for errors
npm run build
```

---

## 🎯 All-in-One Start Script

Create this file: `mini-app/start.sh` (Mac/Linux) or `mini-app/start.bat` (Windows)

### start.sh (Mac/Linux)
```bash
#!/bin/bash
echo "🚀 Starting Telegram Mini App..."
echo ""
echo "📦 Installing dependencies (if needed)..."
npm install
echo ""
echo "🔥 Starting development server..."
npm run dev
```

Make it executable:
```bash
chmod +x start.sh
./start.sh
```

### start.bat (Windows)
```batch
@echo off
echo 🚀 Starting Telegram Mini App...
echo.
echo 📦 Installing dependencies (if needed)...
call npm install
echo.
echo 🔥 Starting development server...
call npm run dev
```

Run it:
```batch
start.bat
```

---

## 🧪 Test Workflow

### Daily Development Flow

```bash
# Morning: Start everything
cd mini-app && npm run dev     # Terminal 1
cd bot && npm run dev          # Terminal 2
ngrok http 3001                # Terminal 3

# Develop: Edit files, see changes instantly
# (Vite hot reload = instant updates!)

# Test: Open /app in Telegram

# Evening: Stop everything
# Ctrl+C in all terminals
```

### With VS Code Tasks (Optional)

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Mini App",
      "type": "npm",
      "script": "dev",
      "path": "mini-app/",
      "problemMatcher": [],
      "presentation": {
        "group": "dev"
      }
    },
    {
      "label": "Start Bot",
      "type": "npm",
      "script": "dev",
      "path": "bot/",
      "problemMatcher": [],
      "presentation": {
        "group": "dev"
      }
    }
  ]
}
```

Then: **Ctrl+Shift+P** → **Tasks: Run Task** → Select task

---

## 📊 Status Checks

### Check if Mini App is Running

```bash
# Windows
netstat -ano | findstr :3001

# Mac/Linux
lsof -i :3001

# Or just open browser:
curl http://localhost:3001
```

### Check Logs

```bash
# Mini App logs are in terminal where you ran `npm run dev`

# Bot logs
cd bot && npm run dev
# Watch terminal output
```

---

## 🎨 Environment Variables

### Current Setup

**mini-app/.env** (already configured):
```env
VITE_API_URL=http://localhost:3000/api
VITE_NODE_ENV=development
```

**bot/.env.bot** (needs ngrok URL for Telegram testing):
```env
MINI_APP_URL=https://your-ngrok-url.ngrok.io
```

### Change API URL

Edit `mini-app/.env`:
```env
# Local development
VITE_API_URL=http://localhost:3000/api

# Or production
VITE_API_URL=https://your-api.com/api
```

Restart dev server after changes!

---

## 🔥 Hot Tips

1. **Auto-Open Browser**: Add to package.json
   ```json
   "dev": "vite --open"
   ```

2. **Custom Port**: Add to vite.config.ts
   ```typescript
   server: { port: 3002 }
   ```

3. **Network Access**: Access from phone on same WiFi
   ```
   Local:   http://localhost:3001
   Network: http://192.168.x.x:3001  ← Use this on phone
   ```

4. **Debug Mode**: Add to .env
   ```env
   VITE_DEBUG=true
   ```

---

## ✅ Verification Checklist

After starting, verify:

- [ ] Terminal shows "Local: http://localhost:3001"
- [ ] Browser opens and shows Mini App
- [ ] No errors in terminal
- [ ] Hot reload works (edit a file, see instant change)
- [ ] Network URL accessible (if needed)

For Telegram testing:
- [ ] ngrok running with HTTPS URL
- [ ] Bot updated with ngrok URL
- [ ] Bot running (shows "Listening for updates")
- [ ] `/app` command works in Telegram
- [ ] Mini App loads in Telegram
- [ ] Telegram theme applied
- [ ] Navigation works

---

## 🆘 Emergency Commands

### Everything Broken?

```bash
# Nuclear option: Clean slate
cd mini-app
rm -rf node_modules package-lock.json dist
npm install
npm run dev
```

### Port Already in Use?

```bash
# Use different port
vite --port 3002
```

### ngrok Not Working?

```bash
# Restart ngrok
# Press Ctrl+C
ngrok http 3001

# Or use different port
ngrok http 3002
```

---

## 📞 Quick Reference

| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Test production build |
| `npm install` | Install dependencies |
| `npm run lint` | Check code quality |

| URL | Purpose |
|-----|---------|
| `http://localhost:3001` | Mini App (browser) |
| `https://xxx.ngrok.io` | Mini App (Telegram) |
| `http://localhost:3000` | Bot API (if running) |

---

**Ready to start?** Just run:

```bash
cd mini-app && npm run dev
```

🎉 That's it! Your Mini App is live on http://localhost:3001
