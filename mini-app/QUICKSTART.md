# 🚀 Quick Start Guide - Telegram Mini App

Get your RPG Quest Mini App running in 5 minutes!

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn
- Your Telegram bot token
- (Optional) ngrok for local testing

## ⚡ Quick Setup

### 1. Install Dependencies

```bash
cd mini-app
npm install
```

This will install all required packages (~2 minutes).

### 2. Configure Environment

```bash
# Already created for you!
# Edit .env if needed
```

The `.env` file is already configured for local development:
```env
VITE_API_URL=http://localhost:3000/api
VITE_NODE_ENV=development
```

### 3. Start Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.1.0  ready in 500 ms

  ➜  Local:   http://localhost:3001/
  ➜  Network: http://192.168.x.x:3001/
```

The Mini App is now running! 🎉

## 🧪 Test Locally

### Option A: In Browser (Limited)

Open http://localhost:3001 in your browser.

**Note:** Some Telegram features won't work (initData, theme, etc.), but you can see the UI.

### Option B: In Telegram (Full Features)

1. **Install ngrok** (if not installed):
   ```bash
   # Windows (with Chocolatey)
   choco install ngrok

   # Mac
   brew install ngrok

   # Or download from https://ngrok.com/download
   ```

2. **Start ngrok**:
   ```bash
   ngrok http 3001
   ```

   You'll get a URL like:
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3001
   ```

3. **Update Bot**:

   In your bot's `.env.bot`:
   ```env
   MINI_APP_URL=https://abc123.ngrok.io
   ```

4. **Start Bot**:
   ```bash
   cd ../bot
   npm run dev
   ```

5. **Test in Telegram**:
   - Open Telegram
   - Send `/app` to your bot
   - Click "🎮 Open RPG Quest"
   - Mini App loads! ✨

## 📱 Features to Test

### Dashboard Page
- [x] User stats display
- [x] XP progress bar
- [x] Active modes
- [x] Active quests
- [x] Recent achievements

### Quests Page
- [x] Quest list (active/completed tabs)
- [x] Quest details modal
- [x] Progress tracking
- [x] Complete quest button

### Profile Page
- [x] User profile with avatar
- [x] Streak tracking
- [x] Achievement gallery
- [x] Account info

### Telegram Features
- [x] Theme adaptation (light/dark)
- [x] Haptic feedback
- [x] BackButton navigation
- [x] MainButton for actions
- [x] Native feel

## 🔧 Development Tips

### Hot Reload

Vite enables hot reload. Changes appear instantly without refresh!

### Check Console

Open browser DevTools (F12) to see:
- API calls
- Telegram WebApp data
- Errors (if any)

### Test Different Themes

In Telegram settings, switch between Light/Dark mode to see the app adapt.

### Mock Data (Optional)

If API isn't ready, you can mock data in components:

```typescript
// In Dashboard.tsx
const mockStats = {
  user: { level: 5, xp: 1250, ... },
  activeQuests: [...],
  // ...
};

setStats(mockStats); // Instead of API call
```

## 🏗️ Build for Production

When ready to deploy:

```bash
npm run build
```

Output goes to `dist/` folder. Deploy to:
- Vercel: `vercel --prod`
- Netlify: `netlify deploy --prod --dir=dist`
- Cloudflare Pages: Upload `dist/` folder
- Your own server: Copy `dist/` contents

## 📚 Next Steps

1. **Implement API Endpoints** - See [INTEGRATION.md](INTEGRATION.md)
2. **Deploy Mini App** - Choose hosting platform
3. **Update Bot URL** - Point to production URL
4. **Add More Features**:
   - Leaderboard page
   - Settings page
   - Notifications
   - Share functionality

## 🆘 Troubleshooting

### Port 3001 already in use

```bash
# Kill process using port
# Windows:
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# Mac/Linux:
lsof -i :3001
kill -9 <pid>
```

### Dependencies installation fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Vite not found

```bash
# Install globally
npm install -g vite

# Or use npx
npx vite
```

### ngrok session expired

Free ngrok URLs expire after ~2 hours. Just restart ngrok and update bot URL.

## 📞 Need Help?

- Check [README.md](README.md) for detailed docs
- See [INTEGRATION.md](INTEGRATION.md) for API setup
- Review code comments in source files
- Ask in issues or discussions

## 🎉 You're Ready!

Your Mini App is set up! Now you can:
- Customize UI/UX
- Add new features
- Integrate with your backend
- Deploy to production

Happy coding! 🚀✨
