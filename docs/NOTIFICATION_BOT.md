# 🤖 Notification Bot - Project Progress Tracker

## Overview

Your Wibecode notification bot now has **enhanced project tracking** capabilities! It automatically notifies you about Claude Code sessions AND provides on-demand project status updates.

## ✨ What's New

### 1. Project Status Tracker
- **Real-time progress analysis** of your Wibecode project
- **Visual progress bars** for each milestone
- **Completion percentage** tracking
- **Next steps recommendations**

### 2. On-Demand Commands
Send commands to your notification bot to get instant project insights.

## 🚀 Quick Start

### Start the Bot

**Windows:**
```bash
scripts\start_notification_bot.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/start_notification_bot.sh
./scripts/start_notification_bot.sh
```

**Manual:**
```bash
python tools/notification_bot_handler.py
```

### Test the Bot

Open Telegram and message your bot: `/status`

## 📋 Available Commands

### `/start`
Get welcome message and command overview
```
🤖 Wibecode Notification Bot

Available commands:
• /status - Get project status and progress
• /help - Show this help message
```

### `/help`
Show detailed help information about all commands and features

### `/status`
Get comprehensive project status report:

```
📊 Wibecode Project Status

Overall Progress: 35.8%
███████░░░░░░░░░░░░░

🎯 Milestones:

✅ 🎯 Project Setup (5/5)
   ██████████ 100%

🔄 🤖 Bot Foundation (1/4)
   ██░░░░░░░░ 25%
   • Bot configuration
   • Command handlers

🔄 🗄️ Database Layer (2/4)
   █████░░░░░ 50%
   • Database models
   • Migration scripts

⏳ 🎨 Mini App Frontend (0/5)
   ░░░░░░░░░░ 0%

📝 Next Steps:
• 🤖 Bot Foundation: Bot configuration
• 🗄️ Database Layer: Database models
• 🎨 Mini App Frontend: Mini App directory

Generated: 2026-02-07 16:30:55
```

## 📊 Tracked Milestones

The bot tracks **7 key milestones** with specific completion criteria:

| Milestone | Weight | What's Tracked |
|-----------|--------|----------------|
| 🎯 **Project Setup** | 10% | Framework structure, git, env vars, requirements |
| 🤖 **Bot Foundation** | 20% | Bot structure, config, commands, webhooks |
| 🗄️ **Database Layer** | 15% | DB structure, schema, models, migrations |
| 🎨 **Mini App Frontend** | 25% | React setup, TON Connect, Telegram SDK |
| 🔧 **Tools & Scripts** | 10% | Execution scripts and utilities |
| 📋 **Workflows & SOPs** | 10% | Documentation and procedures |
| 🚀 **Deployment & CI/CD** | 10% | Docker, CI/CD pipelines, configs |

## 🔔 Automatic Notifications

The bot also sends **automatic notifications** for Claude Code sessions:

### Session Start
```
🚀 Claude Code Session Started
📁 Project: Wibecode
⏰ Time: 16:30:22
📅 Date: 2026-02-07
```

### Session Complete
```
✅ Claude Code Session Completed
📁 Project: Wibecode
⏱️ Duration: 12m 34s
💾 Memory Used: 245MB
⏰ Finished: 16:42:56
📅 Date: 2026-02-07
```

## 🛠️ Technical Details

### Files Added

```
tools/
├── project_status_tracker.py      # Analyzes project state
└── notification_bot_handler.py    # Bot command handler

workflows/
└── run_notification_bot.md        # Bot startup workflow

scripts/
├── start_notification_bot.bat     # Windows launcher
└── start_notification_bot.sh      # Linux/Mac launcher
```

### How It Works

1. **Status Tracker** (`project_status_tracker.py`)
   - Scans project directory structure
   - Checks for key files and folders
   - Calculates completion percentage
   - Generates formatted Telegram message

2. **Bot Handler** (`notification_bot_handler.py`)
   - Listens for commands from authorized chat
   - Runs status tracker on `/status` command
   - Sends formatted response to Telegram

3. **Hooks** (`.claude/settings.local.json`)
   - Automatically trigger on session start/stop
   - Send curl requests to Telegram Bot API
   - No bot process needed for hooks

## 🔐 Security

- **Authorized Access Only**: Bot only responds to your chat ID
- **Environment Variables**: Credentials stored securely in `.env`
- **Separate Bots**: Notification bot is separate from project bot

## 🧪 Testing

### Test Status Tracker Manually
```bash
python tools/project_status_tracker.py .
```

### Test Bot Locally
```bash
# Start bot
python tools/notification_bot_handler.py

# In another terminal, send test command via Telegram
# Or use Telegram Bot API directly:
curl "https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=/status"
```

### Check Current Progress
```bash
# See what percentage shows up
python tools/project_status_tracker.py . | grep "Overall Progress"
```

## 📈 Understanding Progress

### Completion Criteria

Each milestone has specific tasks that must be completed:

**Example: Bot Foundation (20% weight)**
- ✅ Bot directory structure exists
- ⏳ Bot configuration file (config.py/json)
- ⏳ Command handlers directory
- ⏳ Webhook handlers directory

**Progress Calculation:**
- 1/4 tasks complete = 25% of milestone
- 25% of 20% weight = 5% of overall progress

### Overall Progress Formula

```
Overall Progress = Σ(Milestone Progress × Milestone Weight)
```

Currently: **35.8%**
- Setup: 100% × 10% = 10.0%
- Bot: 25% × 20% = 5.0%
- Database: 50% × 15% = 7.5%
- Mini App: 0% × 25% = 0.0%
- Tools: 100% × 10% = 10.0%
- Workflows: 33% × 10% = 3.3%
- Deployment: 0% × 10% = 0.0%
- **Total = 35.8%**

## 🎯 Next Steps Recommendation

The bot analyzes incomplete milestones and suggests **actionable next steps**:

1. **First incomplete task** from each milestone
2. **Prioritized by milestone order**
3. **Maximum 3 suggestions** to avoid overwhelm

Example:
```
📝 Next Steps:
• 🤖 Bot Foundation: Bot configuration
• 🗄️ Database Layer: Database models
• 🎨 Mini App Frontend: Mini App directory
```

## 🐛 Troubleshooting

### Bot doesn't respond to `/status`
1. Check bot is running: `ps aux | grep notification_bot_handler`
2. Verify token in `.env`: `TELEGRAM_NOTIFICATION_BOT_TOKEN`
3. Confirm chat ID matches: `TELEGRAM_NOTIFICATION_CHAT_ID`

### "Unauthorized access" message
Your chat ID doesn't match. Get it from [@userinfobot](https://t.me/userinfobot)

### Status shows 0% for everything
Check project structure. Bot looks for specific files/directories.

### Encoding errors (Windows)
Fixed automatically in `project_status_tracker.py` line 254

### Bot crashes on startup
```bash
# Check dependencies
pip install python-telegram-bot python-dotenv

# Verify .env exists
cat .env | grep TELEGRAM_NOTIFICATION
```

## 📝 Customizing Milestones

Edit `tools/project_status_tracker.py` → `_define_milestones()`:

```python
"custom_milestone": {
    "name": "🎯 Custom Feature",
    "weight": 10,
    "tasks": [
        {"name": "Task 1", "check": lambda: self._check_file_exists("path/to/file")},
        {"name": "Task 2", "check": lambda: self._check_dir_exists("path/to/dir")},
    ]
}
```

## 🚀 Usage Tips

1. **Check progress before/after work**
   - Send `/status` when starting
   - Send `/status` when finishing
   - See what you accomplished!

2. **Use next steps as a guide**
   - Focus on suggested tasks
   - Complete one milestone at a time
   - Progress will update automatically

3. **Run bot in background**
   - Use startup scripts for convenience
   - Bot stays running across sessions
   - Always available for status checks

4. **Integrate with workflow**
   - Check status before planning
   - Use milestones to track sprints
   - Share progress with team

## 🎉 Benefits

- ✅ **Visibility**: Always know where you stand
- ✅ **Motivation**: See progress bars fill up
- ✅ **Focus**: Clear next steps
- ✅ **Accountability**: Track what's done vs pending
- ✅ **Convenience**: Instant status from Telegram

## 📞 Support

- **Documentation**: [workflows/run_notification_bot.md](workflows/run_notification_bot.md)
- **WAT Framework**: [CLAUDE.md](CLAUDE.md)
- **Send `/help`**: To the bot for quick reference

---

**Ready to track your progress?** Start the bot and send `/status`! 📊
