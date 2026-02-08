# Run Notification Bot Workflow

## Objective
Run the yakutsawibecode_bot for project status and Claude session notifications.

## Prerequisites
- `TELEGRAM_NOTIFICATION_BOT_TOKEN` and `TELEGRAM_NOTIFICATION_CHAT_ID` set in `.env`
- Python dependencies: `pip install python-telegram-bot python-dotenv`

## Quick Start

### Start the bot (interactive)
```bash
python tools/notification_bot_handler.py
```

### Start in background (Windows)
```bash
start /B pythonw tools\notification_bot_handler.py
```

## Bot Commands
- `/start` — Welcome message
- `/status` — Project completion status with milestones
- `/help` — Available commands

## Sending Notifications (from Claude or scripts)

The `send_notification.py` script calls the Telegram API directly — the bot doesn't need to be running for this.

```bash
# Session started
python tools/send_notification.py start "Working on feature X"

# Session finished
python tools/send_notification.py finish "Completed feature X"

# Custom message
python tools/send_notification.py "Any text you want to send"
```

## Files
- `tools/notification_bot_handler.py` — Bot with /status command (polling)
- `tools/send_notification.py` — Standalone notification sender (no bot required)
- `tools/project_status_tracker.py` — Analyzes project and generates status report

## Troubleshooting
- **Bot doesn't respond**: Check token in `.env`, make sure bot is running
- **"Unauthorized"**: Verify `TELEGRAM_NOTIFICATION_CHAT_ID` matches your Telegram user ID
- **Status errors**: Run `python tools/project_status_tracker.py` manually to debug
