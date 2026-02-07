#!/usr/bin/env python3
"""
Notification Bot Handler
Handles commands sent to the notification bot including project status requests
"""

import os
import sys
import subprocess
from pathlib import Path
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get project root
PROJECT_ROOT = Path(__file__).parent.parent.absolute()

# Get credentials from environment
BOT_TOKEN = os.getenv('TELEGRAM_NOTIFICATION_BOT_TOKEN')
AUTHORIZED_CHAT_ID = os.getenv('TELEGRAM_NOTIFICATION_CHAT_ID')

if not BOT_TOKEN or not AUTHORIZED_CHAT_ID:
    print("Error: Missing TELEGRAM_NOTIFICATION_BOT_TOKEN or TELEGRAM_NOTIFICATION_CHAT_ID in .env")
    sys.exit(1)

AUTHORIZED_CHAT_ID = int(AUTHORIZED_CHAT_ID)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    if update.effective_chat.id != AUTHORIZED_CHAT_ID:
        await update.message.reply_text("⚠️ Unauthorized access.")
        return

    welcome_message = """
🤖 <b>Wibecode Notification Bot</b>

Available commands:
• /status - Get project status and progress
• /help - Show this help message

This bot tracks your Claude Code sessions and provides project insights.
    """
    await update.message.reply_html(welcome_message)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    if update.effective_chat.id != AUTHORIZED_CHAT_ID:
        return

    help_message = """
<b>📚 Available Commands</b>

<b>/status</b>
Get detailed project status including:
• Overall completion percentage
• Milestone progress with visual bars
• Completed and pending tasks
• Next steps to focus on

<b>/help</b>
Show this help message

<b>🔔 Automatic Notifications</b>
You'll automatically receive notifications when:
• Claude Code session starts
• Claude Code session completes
• Session duration and memory usage stats
    """
    await update.message.reply_html(help_message)


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /status command"""
    if update.effective_chat.id != AUTHORIZED_CHAT_ID:
        await update.message.reply_text("⚠️ Unauthorized access.")
        return

    # Send "thinking" message
    thinking_msg = await update.message.reply_text("🔍 Analyzing project status...")

    try:
        # Run the project status tracker
        tracker_path = PROJECT_ROOT / "tools" / "project_status_tracker.py"

        result = subprocess.run(
            [sys.executable, str(tracker_path), str(PROJECT_ROOT)],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            status_message = result.stdout.strip()

            # Delete thinking message
            await thinking_msg.delete()

            # Send status message
            await update.message.reply_html(status_message)
        else:
            await thinking_msg.edit_text(
                f"❌ Error analyzing project:\n<code>{result.stderr}</code>",
                parse_mode='HTML'
            )

    except subprocess.TimeoutExpired:
        await thinking_msg.edit_text("⏱️ Status check timed out. Please try again.")
    except Exception as e:
        await thinking_msg.edit_text(
            f"❌ Error: {str(e)}\n\nMake sure project_status_tracker.py exists in tools/",
            parse_mode='HTML'
        )


async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle errors"""
    print(f'Update {update} caused error {context.error}')


def main():
    """Start the bot"""
    print(f"🤖 Starting Wibecode Notification Bot...")
    print(f"📁 Project root: {PROJECT_ROOT}")
    print(f"👤 Authorized chat ID: {AUTHORIZED_CHAT_ID}")

    # Create application
    application = Application.builder().token(BOT_TOKEN).build()

    # Add command handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("status", status_command))

    # Add error handler
    application.add_error_handler(error_handler)

    # Start polling
    print("✅ Bot is running! Press Ctrl+C to stop.")
    print("💬 Send /status to the bot to get project status.")

    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
