#!/usr/bin/env python3
"""
Wibecode Notification Bot (yakutsawibecode_bot)
Handles /status command and receives session notifications.
"""

import os
import sys
import subprocess
from pathlib import Path
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).parent.parent.absolute()
load_dotenv(PROJECT_ROOT / ".env")

BOT_TOKEN = os.getenv('TELEGRAM_NOTIFICATION_BOT_TOKEN')
CHAT_ID = os.getenv('TELEGRAM_NOTIFICATION_CHAT_ID')

if not BOT_TOKEN or not CHAT_ID:
    print("ERROR: Set TELEGRAM_NOTIFICATION_BOT_TOKEN and TELEGRAM_NOTIFICATION_CHAT_ID in .env")
    sys.exit(1)

CHAT_ID = int(CHAT_ID)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != CHAT_ID:
        await update.message.reply_text("Unauthorized.")
        return

    await update.message.reply_html(
        "<b>Wibecode Notification Bot</b>\n\n"
        "Commands:\n"
        "/status — Project completion status\n"
        "/help — Show help\n\n"
        "You'll get notified when Claude starts/finishes work."
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != CHAT_ID:
        return

    await update.message.reply_html(
        "<b>Commands</b>\n\n"
        "<b>/status</b> — Shows project milestones, completion %, and what's left\n"
        "<b>/help</b> — This message\n\n"
        "<b>Auto-notifications:</b>\n"
        "• Claude Code session started\n"
        "• Claude Code session finished"
    )


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.id != CHAT_ID:
        await update.message.reply_text("Unauthorized.")
        return

    thinking = await update.message.reply_text("Analyzing project...")

    try:
        tracker_path = PROJECT_ROOT / "tools" / "project_status_tracker.py"
        result = subprocess.run(
            [sys.executable, str(tracker_path), str(PROJECT_ROOT)],
            capture_output=True, text=True, timeout=30, encoding='utf-8'
        )

        await thinking.delete()

        if result.returncode == 0 and result.stdout.strip():
            await update.message.reply_html(result.stdout.strip())
        else:
            error = result.stderr.strip() if result.stderr else "Unknown error"
            await update.message.reply_html(f"Error:\n<code>{error[:500]}</code>")

    except subprocess.TimeoutExpired:
        await thinking.edit_text("Timed out. Try again.")
    except Exception as e:
        await thinking.edit_text(f"Error: {e}")


def main():
    print(f"Starting Wibecode Notification Bot...")
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Chat ID: {CHAT_ID}")

    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_error_handler(lambda update, ctx: print(f"Error: {ctx.error}"))

    print("Bot is running. Ctrl+C to stop.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
