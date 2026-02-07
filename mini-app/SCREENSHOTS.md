# 📸 Mini App UI Preview

## 🎨 Visual Overview

This document describes what each page looks like. Since screenshots can't be shown in markdown, here's a detailed description of the UI.

## 📱 Dashboard Page (`/dashboard`)

### Header Section
```
╔══════════════════════════════════════╗
║ 🌟 Purple-to-Blue Gradient Header   ║
║                                      ║
║ John Doe              [Level  5]     ║
║ @johndoe              [Badge]        ║
║                                      ║
║ ┌────────────────────────────────┐   ║
║ │ XP Progress: 1250 / 2000      │   ║
║ │ ████████████░░░░░░░ 62%       │   ║
║ └────────────────────────────────┘   ║
╚══════════════════════════════════════╝
```

### Stats Grid (4 Cards)
```
┌──────────────┬──────────────┐
│ 🎯 Blue      │ 🔥 Orange    │
│ Quests Done  │ Streak       │
│     42       │   7 days     │
└──────────────┴──────────────┘
┌──────────────┬──────────────┐
│ ⚡ Yellow    │ 🏆 Purple    │
│ XP Today     │ Achievements │
│    +150      │      8       │
└──────────────┴──────────────┘
```

### Active Modes
```
┌──────────────────────────────────┐
│ 📈 Active Modes                  │
│                                  │
│ ┌─────┐ ┌─────┐                │
│ │ 💪  │ │ 💧  │                │
│ │Fit. │ │Hydr.│                │
│ └─────┘ └─────┘                │
└──────────────────────────────────┘
```

### Active Quests
```
┌──────────────────────────────────┐
│ 🎯 Active Quests                 │
│                                  │
│ ╭────────────────────────────╮  │
│ │ 💪 Do 50 push-ups    ⚡ 50 │  │
│ │ Daily fitness challenge    │  │
│ │                            │  │
│ │ Progress: 30 / 50          │  │
│ │ ████████░░░░░░░ 60%       │  │
│ │                            │  │
│ │ [easy] [daily]             │  │
│ ╰────────────────────────────╯  │
│                                  │
│ ╭────────────────────────────╮  │
│ │ 💧 Drink 8 glasses   ⚡ 30 │  │
│ │ Stay hydrated              │  │
│ │ ...                        │  │
│ ╰────────────────────────────╯  │
└──────────────────────────────────┘
```

## 📋 Quests Page (`/quests`)

### Header with Tabs
```
╔══════════════════════════════════════╗
║ 🎯 Blue-to-Purple Gradient           ║
║                                      ║
║ 🎯 Quests                            ║
║ Complete quests to level up          ║
║                                      ║
║ ┌────────────────────────────────┐   ║
║ │ [⏰ Active 5] [✅ Completed 12]│   ║
║ └────────────────────────────────┘   ║
╚══════════════════════════════════════╝
```

### Quest List (Active Tab)
```
┌──────────────────────────────────┐
│ ╭────────────────────────────╮  │
│ │ Morning Workout      ⚡ 50  │  │
│ │ Complete your daily...     │  │
│ │                            │  │
│ │ Progress: 1 / 1            │  │
│ │ ██████████████████ 100%   │  │
│ │                            │  │
│ │ [easy] [daily] [💪]        │  │
│ ╰────────────────────────────╯  │
│                                  │
│ ╭────────────────────────────╮  │
│ │ Hydration Check     ⚡ 30   │  │
│ │ Drink water regularly      │  │
│ │ ...                        │  │
│ ╰────────────────────────────╯  │
└──────────────────────────────────┘
```

### Quest Details Modal (When Clicked)
```
┌──────────────────────────────────┐
│ ━━━━                             │  ← Drag handle
│                                  │
│ Morning Workout                  │
│ Complete your daily morning...   │
│                                  │
│ ┌──────────┬──────────┐          │
│ │ ⚡ 50 XP │ 🏆 Easy  │          │
│ └──────────┴──────────┘          │
│                                  │
│ Progress: 1 / 1                  │
│ ██████████████████ 100%         │
│                                  │
│ ╭──────────────────────╮         │
│ │ ✅ Quest Complete!  │         │
│ │ Tap below to claim  │         │
│ ╰──────────────────────╯         │
└──────────────────────────────────┘

[Telegram MainButton: Complete Quest]
```

## 👤 Profile Page (`/profile`)

### Profile Header
```
╔══════════════════════════════════════╗
║ 🎨 Purple-Pink-Orange Gradient       ║
║                                      ║
║         ┌──────────┐                 ║
║         │    J     │  Lv 5           ║
║         │  Avatar  │ [Badge]         ║
║         └──────────┘                 ║
║                                      ║
║       John Doe                       ║
║       @johndoe                       ║
║                                      ║
║ ┌────────┬────────┬────────┐         ║
║ │🏆  42  │🎖️  8  │⚡ 1250 │         ║
║ │Quests  │Achiev. │TotalXP │         ║
║ └────────┴────────┴────────┘         ║
╚══════════════════════════════════════╝
```

### Streak Card
```
┌──────────────────────────────────┐
│ ╭────────────────────────────╮  │
│ │ 📅 Streak        🔥 7 days │  │
│ │                            │  │
│ │ Best: 14 days              │  │
│ ╰────────────────────────────╯  │
└──────────────────────────────────┘
```

### Active Modes Grid
```
┌──────────────────────────────────┐
│ 📈 My Modes                      │
│                                  │
│ ┌───────────┬───────────┐        │
│ │    💪     │    💧     │        │
│ │  Fitness  │ Hydration │        │
│ │ Since Jan │ Since Jan │        │
│ └───────────┴───────────┘        │
└──────────────────────────────────┘
```

### Achievements Gallery (3 columns)
```
┌──────────────────────────────────┐
│ 🏆 Achievements (8)              │
│                                  │
│ ┌─────┬─────┬─────┐              │
│ │ 🏅  │ 🎖️ │ 🥇  │              │
│ │First│Week │100  │              │
│ │Quest│King │XP   │              │
│ │⭐ 10│⭐ 50│⭐ 25│              │
│ └─────┴─────┴─────┘              │
│ ┌─────┬─────┬─────┐              │
│ │ 🔥  │ 💪  │ 💧  │              │
│ │...  │...  │...  │              │
│ └─────┴─────┴─────┘              │
└──────────────────────────────────┘
```

## 🧭 Bottom Navigation (All Pages)

```
┌──────────────────────────────────┐
│ ┌────┬────────┬────────┬────┐    │
│ │🏠  │   🎯   │   👤   │    │    │
│ │Home│ Quests │Profile │    │    │
│ │ ●  │        │        │    │    │  ← Active indicator
│ └────┴────────┴────────┴────┘    │
└──────────────────────────────────┘
```

## 🎨 Color Scheme

### Light Theme (Telegram Default)
- **Background**: `#ffffff` (white)
- **Text**: `#000000` (black)
- **Hint**: `#999999` (gray)
- **Link**: `#2481cc` (blue)
- **Button**: `#2481cc` (blue)
- **Secondary BG**: `#f4f4f5` (light gray)

### Dark Theme (Telegram Dark)
- **Background**: `#18222d` (dark blue)
- **Text**: `#ffffff` (white)
- **Hint**: `#708499` (muted blue)
- **Link**: `#5eb3f5` (light blue)
- **Button**: `#5eb3f5` (light blue)
- **Secondary BG**: `#131e29` (darker blue)

### Custom Gradients
- **Dashboard Header**: Purple (#9333ea) → Blue (#2563eb)
- **Quests Header**: Blue (#2563eb) → Purple (#9333ea)
- **Profile Header**: Purple (#9333ea) → Pink (#ec4899) → Orange (#f97316)
- **Streak Card**: Orange (#f97316) → Red (#ef4444)

## ⚡ Animations

### Level Up Animation
```
Scale: 0.8 → 1.1 → 1.0
Duration: 0.5s
Easing: ease-out
```

### Quest Complete
```
Bounce: 0 → -10px → 0
Duration: 0.6s
Easing: ease-out
```

### XP Gain
```
Translate: -20px → 0
Opacity: 0 → 1
Duration: 0.4s
```

### Page Transitions
```
Fade + Slide
Duration: 0.3s
Smooth navigation
```

## 📊 Responsive Breakpoints

```
Mobile (Default):  320px - 767px
Tablet:            768px - 1023px (not optimized, rarely used in Telegram)
Desktop:           1024px+          (not common in Telegram)
```

**Note:** Mini App is optimized for mobile-first since 95%+ of Telegram users are on mobile.

## 🎯 Interactive Elements

### Haptic Feedback Triggers
- ✅ Button taps (medium impact)
- ✅ Tab switches (selection changed)
- ✅ Quest completion (success notification)
- ✅ Navigation (light impact)
- ✅ Modal open/close (light impact)

### Telegram Native Elements
- ✅ **BackButton**: Shows on sub-pages
- ✅ **MainButton**: Shows when quest can be completed
- ✅ **Popups**: Telegram-style alerts/confirms
- ✅ **Theme**: Auto light/dark adaptation

## 📐 Layout Measurements

```
Screen Width:      100vw (full viewport)
Content Padding:   16px (1rem)
Card Radius:       16px - 24px (rounded-2xl to 3xl)
Button Radius:     12px - 16px (rounded-xl to 2xl)
Icon Size:         20px - 24px (w-5/6 h-5/6)
Spacing:           12px - 24px (gap-3 to gap-6)
```

## 🎨 Typography

```
Headings (h1):     24px (text-2xl) bold
Headings (h2):     18px (text-lg) semibold
Body:              16px (text-base) normal
Small:             14px (text-sm) normal
Tiny:              12px (text-xs) normal
```

## 🔄 Loading States

### Skeleton Screens
```
┌──────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓░░░░░░░░                │  ← Animated shimmer
│ ▓▓▓▓▓░░░░░                      │
│                                  │
│ ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░             │
│ ▓▓▓▓░░░░                        │
└──────────────────────────────────┘
```

### Progress Indicators
```
⏳ Loading...  (text)
━━━━━━━━○     (linear progress)
⌛            (spinner)
```

## 📱 How to See It Live

1. **Start Dev Server**:
   ```bash
   cd mini-app
   npm run dev
   ```

2. **Open in Browser**:
   - Go to http://localhost:3001
   - Open DevTools (F12)
   - Toggle device toolbar (Ctrl+Shift+M)
   - Select iPhone/Android device

3. **Test in Telegram**:
   - Use ngrok: `ngrok http 3001`
   - Update bot with ngrok URL
   - Send `/app` to bot
   - See actual UI with Telegram theme!

## 🎥 Future: Add Screenshots

When deployed, take screenshots and add them here:

```markdown
### Dashboard
![Dashboard](./screenshots/dashboard.png)

### Quests
![Quests](./screenshots/quests.png)

### Profile
![Profile](./screenshots/profile.png)
```

---

**Want to see it?** Run `npm run dev` and open http://localhost:3001 🎨
