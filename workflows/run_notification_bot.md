# Run Notification Bot Workflow

## Objective
Start the Wibecode notification bot to receive Claude Code session notifications and project status updates.

## Prerequisites
- ✅ `TELEGRAM_NOTIFICATION_BOT_TOKEN` set in `.env`
- ✅ `TELEGRAM_NOTIFICATION_CHAT_ID` set in `.env`
- ✅ Python dependencies installed (`pip install -r requirements.txt`)

## Steps

### 1. Verify Environment Variables

Check that your notification bot credentials are configured:

```bash
cat .env | grep TELEGRAM_NOTIFICATION
```

You should see:
```
TELEGRAM_NOTIFICATION_BOT_TOKEN=8527387420:AAEGq2ARbBKbxv9QXrxogLz-OTrcG34MMHE
TELEGRAM_NOTIFICATION_CHAT_ID=8272858406
```

### 2. Start the Bot

Run the notification bot handler:

```bash
python tools/notification_bot_handler.py
```

You should see:
```
🤖 Starting Wibecode Notification Bot...
📁 Project root: C:\Users\Asus\Desktop\Wibecode
👤 Authorized chat ID: 8272858406
✅ Bot is running! Press Ctrl+C to stop.
💬 Send /status to the bot to get project status.
```

### 3. Test the Bot

Open Telegram and message your notification bot:

**Available Commands:**
- `/start` - Get welcome message and command list
- `/help` - Show detailed help
- `/status` - Get project status with completion percentage and milestones

### 4. Run in Background (Optional)

#### Windows (Background):
```bash
# Using pythonw (no console window)
start /B pythonw tools\notification_bot_handler.py
```

#### Linux/Mac (Background):
```bash
nohup python tools/notification_bot_handler.py > logs/bot.log 2>&1 &
```

### 5. Stop the Bot

**Foreground:** Press `Ctrl+C`

**Background (Windows):**
```bash
taskkill /F /IM python.exe /FI "WINDOWTITLE eq notification_bot_handler*"
```

**Background (Linux/Mac):**
```bash
pkill -f notification_bot_handler.py
```

## Expected Output

### /status Command Example:

```
📊 Wibecode Project Status

Overall Progress: 42.5%
████████████░░░░░░░░

🎯 Milestones:

✅ 🎯 Project Setup (5/5)
   ██████████ 100%

🔄 🤖 Bot Foundation (2/4)
   █████░░░░░ 50%
   • Webhook setup
   • Command handlers

⏳ 🗄️ Database Layer (0/4)
   ░░░░░░░░░░ 0%
   • Database structure
   • Database schema

📝 Next Steps:
• 🤖 Bot Foundation: Webhook setup
• 🗄️ Database Layer: Database structure
• 🎨 Mini App Frontend: Mini App directory

Generated: 2026-02-07 16:30:45
```

## Automatic Notifications

When the bot is running, you'll also receive automatic notifications:

**Session Start:**
```
🚀 Claude Code Session Started
📁 Project: Wibecode
⏰ Time: 16:30:22
📅 Date: 2026-02-07
```

**Session End:**
```
✅ Claude Code Session Completed
📁 Project: Wibecode
⏱️ Duration: 12m 34s
💾 Memory Used: 245MB
⏰ Finished: 16:42:56
📅 Date: 2026-02-07
```

## Troubleshooting

### Bot doesn't respond
- Check bot token is correct
- Verify bot is running (`ps aux | grep notification_bot_handler`)
- Check Telegram Bot API is accessible

### "Unauthorized access" message
- Verify `TELEGRAM_NOTIFICATION_CHAT_ID` matches your Telegram user ID
- Get your chat ID: Message [@userinfobot](https://t.me/userinfobot) on Telegram

### Status command shows errors
- Ensure `project_status_tracker.py` exists in `tools/`
- Check Python path and dependencies
- Run manually: `python tools/project_status_tracker.py`

## Notes

- The notification bot is separate from your project bot
- It only responds to the authorized chat ID (you)
- All communication is private and secure
- Session hooks work independently of the bot (via curl)
- The bot provides on-demand status checks via `/status`

## Integration with WAT Framework

This notification bot fits into the WAT framework as:
- **Workflow**: This document (SOP for running the bot)
- **Agent**: You (deciding when to check status)
- **Tool**: `notification_bot_handler.py` and `project_status_tracker.py` (execution)
