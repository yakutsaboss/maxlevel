#!/usr/bin/env python3
"""
Send a notification via yakutsawibecode_bot.
Does NOT require the bot to be running — calls Telegram API directly.

Usage:
    python send_notification.py start          # Session started
    python send_notification.py finish          # Session finished
    python send_notification.py "Custom text"   # Any message
"""

import os
import sys
import urllib.request
import urllib.parse
import json
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).parent.parent.absolute()
load_dotenv(PROJECT_ROOT / ".env")

BOT_TOKEN = os.getenv('TELEGRAM_NOTIFICATION_BOT_TOKEN')
CHAT_ID = os.getenv('TELEGRAM_NOTIFICATION_CHAT_ID')

if not BOT_TOKEN or not CHAT_ID:
    print("ERROR: Missing TELEGRAM_NOTIFICATION_BOT_TOKEN or TELEGRAM_NOTIFICATION_CHAT_ID")
    sys.exit(1)


def send_message(text: str, parse_mode: str = "HTML") -> bool:
    """Send a message via Telegram Bot API"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": CHAT_ID,
        "text": text,
        "parse_mode": parse_mode
    }).encode('utf-8')

    try:
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            return result.get("ok", False)
    except Exception as e:
        print(f"Failed to send: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python send_notification.py [start|finish|\"message\"]")
        sys.exit(1)

    action = sys.argv[1].lower()
    now = datetime.now().strftime("%H:%M")
    date = datetime.now().strftime("%Y-%m-%d")

    if action == "start":
        task_desc = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
        msg = (
            f"🚀 <b>Claude Code — Started</b>\n\n"
            f"📁 Project: Wibecode\n"
            f"⏰ {now} | 📅 {date}"
        )
        if task_desc:
            msg += f"\n📝 Task: {task_desc}"

    elif action == "finish":
        task_desc = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
        msg = (
            f"✅ <b>Claude Code — Finished</b>\n\n"
            f"📁 Project: Wibecode\n"
            f"⏰ {now} | 📅 {date}"
        )
        if task_desc:
            msg += f"\n📝 Done: {task_desc}"

    else:
        # Custom message
        msg = " ".join(sys.argv[1:])

    ok = send_message(msg)
    if ok:
        print("Notification sent.")
    else:
        print("Failed to send notification.")
        sys.exit(1)


if __name__ == "__main__":
    main()
