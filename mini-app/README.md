# Telegram RPG Quest Bot - Mini App

Beautiful, gamified Telegram Mini App for the RPG Quest Bot.

## 🚀 Features

- ✅ **Dashboard**: View user stats, active quests, and recent achievements
- ✅ **Quests Page**: Browse and complete daily/weekly quests
- ✅ **Profile Page**: View achievements, streaks, and account info
- ✅ **Telegram Integration**: Native feel with Telegram theme colors
- ✅ **Haptic Feedback**: Tactile responses for better UX
- ✅ **Animations**: Smooth transitions and micro-interactions
- ✅ **Responsive**: Mobile-first design optimized for Telegram

## 📦 Tech Stack

- **React 18** + **TypeScript**
- **Vite** (fast builds)
- **Tailwind CSS** (styling)
- **Framer Motion** (animations)
- **React Router** (navigation)
- **React Query** (data fetching)
- **@twa-dev/sdk** (Telegram WebApp SDK)
- **Axios** (API client)
- **Lucide React** (icons)

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd mini-app
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3001`

### 4. Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### 5. Preview Production Build

```bash
npm run preview
```

## 🔗 Integration with Bot

### Step 1: Add Web App Button to Bot

In your bot code (`bot/src/index.ts`):

```typescript
bot.command('app', async (ctx) => {
  await ctx.reply('Open the Mini App:', {
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🎮 Open RPG Quest',
          web_app: { url: 'https://your-domain.com' }
        }
      ]]
    }
  });
});
```

### Step 2: Create API Endpoints

The Mini App expects these endpoints:

```
GET  /api/users/:telegramId/stats
GET  /api/users/:userId/quests/active
GET  /api/users/:userId/quests/completed
POST /api/quests/:questId/complete
PATCH /api/quests/:questId/progress
GET  /api/users/:userId/achievements
GET  /api/achievements
POST /api/users/:userId/modes
DELETE /api/users/:userId/modes/:modeId
GET  /api/leaderboard
```

### Step 3: Validate Telegram InitData

On your backend, validate the `X-Telegram-Init-Data` header:

```typescript
import crypto from 'crypto';

function validateTelegramWebAppData(initData: string, botToken: string): boolean {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
}
```

## 📱 Testing in Telegram

### Local Development

1. Use **ngrok** to expose your local server:
   ```bash
   ngrok http 3001
   ```

2. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

3. Update bot command to use ngrok URL:
   ```typescript
   web_app: { url: 'https://abc123.ngrok.io' }
   ```

4. Open Telegram, send `/app` to your bot, and click the button

### Production

1. Deploy to hosting (Vercel, Netlify, Cloudflare Pages, etc.)
2. Update bot with production URL
3. Test in Telegram

## 🎨 Customization

### Colors

Edit `tailwind.config.js` to customize colors. The app automatically adapts to Telegram's light/dark theme.

### Animations

Modify animations in individual components using Framer Motion or add custom animations in `src/index.css`.

### Icons

Using Lucide React. Browse icons at [lucide.dev](https://lucide.dev).

## 📂 Project Structure

```
mini-app/
├── src/
│   ├── api/
│   │   └── client.ts          # API client with axios
│   ├── components/
│   │   └── Navigation.tsx     # Bottom navigation
│   ├── hooks/
│   │   └── useTelegram.ts     # Telegram WebApp hooks
│   ├── pages/
│   │   ├── Dashboard.tsx      # Home page
│   │   ├── Quests.tsx         # Quests page
│   │   └── Profile.tsx        # Profile page
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── public/                    # Static assets
├── index.html                 # HTML template
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
└── package.json              # Dependencies
```

## 🔧 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🐛 Troubleshooting

### Mini App not loading in Telegram

1. Check that URL is HTTPS (Telegram requires HTTPS)
2. Verify `telegram-web-app.js` is loaded in `index.html`
3. Check browser console for errors

### API calls failing

1. Check CORS settings on backend
2. Verify API_URL in `.env`
3. Check `X-Telegram-Init-Data` header is being sent

### Theme colors not working

1. Check that Telegram WebApp SDK is loaded
2. Verify CSS variables in `index.css`
3. Test in actual Telegram app (not browser)

### Animations laggy

1. Reduce motion in Framer Motion components
2. Use CSS transforms instead of layout changes
3. Enable GPU acceleration with `will-change` CSS property

## 📚 Resources

- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [Telegram WebApp SDK](https://core.telegram.org/bots/webapps#initializing-mini-apps)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/)

## 🎉 Next Steps

1. **Add more pages**: Leaderboard, Settings, Shop
2. **Implement TON Connect**: For blockchain features
3. **Add push notifications**: Via Telegram Bot API
4. **Create share functionality**: Referral system
5. **Add analytics**: Track user behavior

Happy coding! 🚀
