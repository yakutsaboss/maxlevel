#!/usr/bin/env python3
"""
Wibecode Notification Bot (yakutsawibecode_bot)
Handles /status, /ping, /sheets, /metrics commands and receives session notifications.
"""

import os
import sys
import json
import subprocess
import time
import urllib.request
from pathlib import Path
from telegram import BotCommand, BotCommandScopeAllPrivateChats, Update
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

SERVER_IP = "85.239.53.57"


def _is_on_server() -> bool:
    """Check if running on the VDS itself."""
    if sys.platform != 'linux':
        return False
    try:
        result = subprocess.run(
            ["hostname", "-I"], capture_output=True, text=True, timeout=5
        )
        return SERVER_IP in result.stdout
    except Exception:
        return False


IS_LOCAL = _is_on_server()


def _run_cmd(cmd: str, timeout: int = 10) -> subprocess.CompletedProcess:
    """Run a command on the server — locally if on VDS, via SSH otherwise."""
    if IS_LOCAL:
        return subprocess.run(
            ["bash", "-c", cmd],
            capture_output=True, text=True, timeout=timeout, encoding='utf-8'
        )
    return subprocess.run(
        ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=5",
         f"root@{SERVER_IP}", cmd],
        capture_output=True, text=True, timeout=timeout, encoding='utf-8'
    )


def is_authorized(update: Update) -> bool:
    return update.effective_chat.id == CHAT_ID


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        await update.message.reply_text("Unauthorized.")
        return

    await update.message.reply_html(
        "<b>Wibecode Notification Bot</b>\n\n"
        "Commands:\n"
        "/status \u2014 Project completion status\n"
        "/ping \u2014 Health check (server, bot, DB, mini app)\n"
        "/metrics \u2014 Current server resource usage\n"
        "/sheets \u2014 Export analytics to Google Sheets\n"
        "/help \u2014 Show help\n\n"
        "You'll get notified when Claude starts/finishes work."
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        return

    await update.message.reply_html(
        "<b>Commands</b>\n\n"
        "<b>/status</b> \u2014 Project milestones, completion %, what's left\n"
        "<b>/ping</b> \u2014 Health check: VDS, bot API, mini app, database\n"
        "<b>/metrics</b> \u2014 Current CPU, RAM, disk, PM2 process stats\n"
        "<b>/sheets</b> \u2014 Export analytics data to Google Sheets\n"
        "<b>/help</b> \u2014 This message\n\n"
        "<b>Auto-notifications:</b>\n"
        "\u2022 Claude Code session started (with VDS metrics)\n"
        "\u2022 Claude Code session finished (with metrics delta)"
    )


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
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


async def ping_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        await update.message.reply_text("Unauthorized.")
        return

    thinking = await update.message.reply_text("\U0001F3D3 Running health checks...")
    results = []

    # 1. VDS Server
    try:
        t0 = time.time()
        proc = _run_cmd("echo ok", timeout=10)
        ms = int((time.time() - t0) * 1000)
        if proc.returncode == 0 and "ok" in proc.stdout:
            results.append(f"\u2705 VDS Server ({SERVER_IP}) \u2014 {ms}ms")
        else:
            results.append(f"\u274C VDS Server ({SERVER_IP}) \u2014 unreachable")
    except Exception:
        results.append(f"\u274C VDS Server ({SERVER_IP}) \u2014 timeout")

    # 2. Bot Webhook / Health endpoint
    try:
        t0 = time.time()
        req = urllib.request.Request(f"https://yakutsa.ru/health", method='GET')
        with urllib.request.urlopen(req, timeout=10) as resp:
            ms = int((time.time() - t0) * 1000)
            body = json.loads(resp.read())
            if body.get("status") == "ok":
                results.append(f"\u2705 Bot API (yakutsa.ru/health) \u2014 {ms}ms")
            else:
                results.append(f"\u26A0\uFE0F Bot API \u2014 responded but status != ok")
    except Exception as e:
        results.append(f"\u274C Bot API (yakutsa.ru/health) \u2014 {str(e)[:50]}")

    # 3. Mini App
    try:
        t0 = time.time()
        req = urllib.request.Request(f"https://yakutsa.ru/", method='GET')
        with urllib.request.urlopen(req, timeout=10) as resp:
            ms = int((time.time() - t0) * 1000)
            if resp.status == 200:
                results.append(f"\u2705 Mini App (yakutsa.ru) \u2014 {ms}ms")
            else:
                results.append(f"\u26A0\uFE0F Mini App \u2014 HTTP {resp.status}")
    except Exception as e:
        results.append(f"\u274C Mini App \u2014 {str(e)[:50]}")

    # 4. Database (psql)
    try:
        t0 = time.time()
        proc = _run_cmd(
            "PGPASSWORD=postgres psql -h localhost -U postgres -d telegram_rpg -c 'SELECT 1' -t -q",
            timeout=15
        )
        ms = int((time.time() - t0) * 1000)
        if proc.returncode == 0 and "1" in proc.stdout:
            results.append(f"\u2705 Database (PostgreSQL) \u2014 {ms}ms")
        else:
            results.append(f"\u274C Database \u2014 query failed")
    except Exception:
        results.append(f"\u274C Database \u2014 timeout")

    await thinking.delete()

    # Format output
    all_ok = all("\u2705" in r for r in results)
    footer = "\n\nAll systems operational." if all_ok else "\n\n\u26A0\uFE0F Some services have issues."

    msg = "<b>\U0001F3D3 Health Check</b>\n\n" + "\n".join(results) + footer
    await update.message.reply_html(msg)


async def metrics_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        await update.message.reply_text("Unauthorized.")
        return

    thinking = await update.message.reply_text("\U0001F4CA Collecting server metrics...")

    try:
        metrics_path = PROJECT_ROOT / "tools" / "server_metrics.py"
        result = subprocess.run(
            [sys.executable, str(metrics_path), "telegram"],
            capture_output=True, text=True, timeout=30,
            encoding='utf-8', cwd=str(PROJECT_ROOT)
        )

        await thinking.delete()

        if result.returncode == 0 and result.stdout.strip():
            msg = "\U0001F5A5\uFE0F " + result.stdout.strip()
            await update.message.reply_html(msg)
        else:
            error = result.stderr.strip() if result.stderr else "Unknown error"
            await update.message.reply_html(f"Error collecting metrics:\n<code>{error[:500]}</code>")

    except subprocess.TimeoutExpired:
        await thinking.edit_text("Timed out connecting to server.")
    except Exception as e:
        await thinking.edit_text(f"Error: {e}")


async def sheets_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        await update.message.reply_text("Unauthorized.")
        return

    thinking = await update.message.reply_text("\U0001F4CA Exporting to Google Sheets...")

    try:
        sheets_path = PROJECT_ROOT / "tools" / "sheets_analytics_export.py"
        result = subprocess.run(
            [sys.executable, str(sheets_path), "--export-all"],
            capture_output=True, text=True, timeout=60,
            encoding='utf-8', cwd=str(PROJECT_ROOT)
        )

        await thinking.delete()

        if result.returncode == 0 and result.stdout.strip():
            try:
                data = json.loads(result.stdout.strip())
                if data.get("success"):
                    sheets_list = "\n".join(
                        f"  \u2022 {s}" for s in data.get("sheets_updated", [])
                    )
                    msg = (
                        f"<b>\U0001F4CA Google Sheets Export</b>\n\n"
                        f"\u2705 Exported {len(data.get('sheets_updated', []))} sheets:\n"
                        f"{sheets_list}\n\n"
                        f"Total rows: {data.get('total_rows', '?')}\n\n"
                        f"\U0001F4CE <a href=\"{data.get('spreadsheet_url', '#')}\">Open Spreadsheet</a>\n\n"
                        f"<i>{data.get('exported_at', '')[:16]}</i>"
                    )
                    await update.message.reply_html(msg, disable_web_page_preview=True)
                else:
                    error = data.get("error", "Unknown error")
                    await update.message.reply_html(
                        f"<b>Export failed:</b>\n<code>{error[:500]}</code>"
                    )
            except json.JSONDecodeError:
                await update.message.reply_html(
                    f"<code>{result.stdout.strip()[:500]}</code>"
                )
        else:
            error = result.stderr.strip() if result.stderr else "Unknown error"
            # Check for common configuration issues
            if "GOOGLE_SERVICE_ACCOUNT_FILE" in error or "service_account" in error.lower():
                await update.message.reply_html(
                    "<b>\u26A0\uFE0F Google Sheets not configured</b>\n\n"
                    "To set up:\n"
                    "1. Create a Google Cloud service account\n"
                    "2. Download the JSON key as <code>service_account.json</code>\n"
                    "3. Set <code>GOOGLE_SERVICE_ACCOUNT_FILE</code> in .env\n"
                    "4. Create a spreadsheet and share it with the service account email\n"
                    "5. Set <code>GOOGLE_SHEETS_SPREADSHEET_ID</code> in .env"
                )
            elif "GOOGLE_SHEETS_SPREADSHEET_ID" in error:
                await update.message.reply_html(
                    "<b>\u26A0\uFE0F Missing spreadsheet ID</b>\n\n"
                    "Set <code>GOOGLE_SHEETS_SPREADSHEET_ID</code> in your .env file."
                )
            else:
                await update.message.reply_html(f"Error:\n<code>{error[:500]}</code>")

    except subprocess.TimeoutExpired:
        await thinking.edit_text("Export timed out. Try again.")
    except Exception as e:
        await thinking.edit_text(f"Error: {e}")


async def post_init(application):
    """Register bot commands with Telegram so they appear in the menu and / hint."""
    commands = [
        BotCommand("status", "Project completion status"),
        BotCommand("ping", "Health check: VDS, bot, DB, mini app"),
        BotCommand("metrics", "Server resource usage"),
        BotCommand("sheets", "Export analytics to Google Sheets"),
        BotCommand("help", "Show available commands"),
    ]
    await application.bot.set_my_commands(commands)
    await application.bot.set_my_commands(commands, scope=BotCommandScopeAllPrivateChats())
    print("Bot commands registered with Telegram.")


def main():
    print(f"Starting Wibecode Notification Bot...")
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Chat ID: {CHAT_ID}")

    app = Application.builder().token(BOT_TOKEN).post_init(post_init).build()
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(CommandHandler("ping", ping_command))
    app.add_handler(CommandHandler("metrics", metrics_command))
    app.add_handler(CommandHandler("sheets", sheets_command))
    app.add_error_handler(lambda update, ctx: print(f"Error: {ctx.error}"))

    print("Bot is running. Ctrl+C to stop.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
