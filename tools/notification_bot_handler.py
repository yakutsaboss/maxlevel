#!/usr/bin/env python3
"""
Wibecode Notification Bot (yakutsawibecode_bot)
Handles /status, /ping, /sheets, /metrics, /onboarding, /punishments, /flow, /deploy commands
and receives session notifications.
"""

import os
import sys
import json
import subprocess
import time
import ssl
import socket
import urllib.request
from datetime import datetime, timezone
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

SERVER_IP = "85.239.58.205"


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


DISK_HISTORY_PATH = "/tmp/wibecode_disk_history.json"


def _check_pm2_restarts() -> str:
    """Check if telegram-rpg-bot had recent restarts (last 60 min)."""
    try:
        proc = _run_cmd("pm2 jlist 2>/dev/null", timeout=10)
        if proc.returncode != 0 or not proc.stdout.strip():
            return "\u26A0\uFE0F PM2 \u2014 could not check"
        data = json.loads(proc.stdout.strip())
        for p in data:
            if p.get("name") == "telegram-rpg-bot":
                restart_time = p.get("pm2_env", {}).get("restart_time", 0)
                unstable_restarts = p.get("pm2_env", {}).get("unstable_restarts", 0)
                pm_uptime = p.get("pm2_env", {}).get("pm_uptime", 0)
                now_ms = time.time() * 1000
                # Check if last restart was within 60 minutes
                if pm_uptime and (now_ms - pm_uptime) < 3600000:
                    uptime_min = int((now_ms - pm_uptime) / 60000)
                    return (
                        f"\u26A0\uFE0F PM2 \u2014 restarted {uptime_min}m ago "
                        f"(total restarts: {restart_time})"
                    )
                if restart_time > 0:
                    return f"\u2705 PM2 stable \u2014 {restart_time} lifetime restarts"
                return "\u2705 PM2 stable \u2014 no restarts"
        return "\u26A0\uFE0F PM2 \u2014 telegram-rpg-bot process not found"
    except Exception as e:
        return f"\u26A0\uFE0F PM2 \u2014 {str(e)[:40]}"


def _check_ssl_expiry() -> str:
    """Check SSL certificate expiry for yakutsa.ru."""
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection(("yakutsa.ru", 443), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname="yakutsa.ru") as ssock:
                cert = ssock.getpeercert()
                expiry_str = cert.get("notAfter", "")
                if not expiry_str:
                    return "\u26A0\uFE0F SSL \u2014 no expiry date found"
                # Parse: 'Mar 15 23:59:59 2026 GMT'
                expiry = datetime.strptime(expiry_str, "%b %d %H:%M:%S %Y %Z")
                expiry = expiry.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                days_left = (expiry - now).days
                if days_left < 7:
                    return f"\u274C SSL cert expires in {days_left} days!"
                if days_left < 30:
                    return f"\u26A0\uFE0F SSL cert expires in {days_left} days"
                return f"\u2705 SSL cert \u2014 {days_left} days remaining"
    except Exception as e:
        return f"\u26A0\uFE0F SSL check \u2014 {str(e)[:40]}"


def _get_disk_trend() -> str:
    """Get disk usage with trend compared to previous readings.

    Stores last 5 readings in /tmp/wibecode_disk_history.json on the server.
    Returns a formatted string like "Disk: 45% (↑2% since yesterday)" or "Disk: 45% (stable)".
    """
    try:
        # Get current disk usage percentage
        proc = _run_cmd("df -h / | tail -1 | awk '{print $5}' | tr -d '%'", timeout=10)
        if proc.returncode != 0 or not proc.stdout.strip():
            return ""
        current_pct = int(proc.stdout.strip())

        # Read existing history from server
        history = []
        read_proc = _run_cmd(f"cat {DISK_HISTORY_PATH} 2>/dev/null", timeout=5)
        if read_proc.returncode == 0 and read_proc.stdout.strip():
            try:
                history = json.loads(read_proc.stdout.strip())
            except json.JSONDecodeError:
                history = []

        # Append current reading
        now_iso = datetime.now(timezone.utc).isoformat()
        history.append({"pct": current_pct, "ts": now_iso})
        # Keep only last 5
        history = history[-5:]

        # Save updated history
        history_json = json.dumps(history)
        _run_cmd(f"echo '{history_json}' > {DISK_HISTORY_PATH}", timeout=5)

        # Calculate trend
        if len(history) >= 2:
            oldest = history[0]
            diff = current_pct - oldest["pct"]
            # Parse how long ago the oldest reading was
            try:
                oldest_dt = datetime.fromisoformat(oldest["ts"])
                now_dt = datetime.now(timezone.utc)
                hours_ago = (now_dt - oldest_dt).total_seconds() / 3600
                if hours_ago >= 24:
                    time_label = f"{int(hours_ago / 24)}d ago"
                else:
                    time_label = f"{int(hours_ago)}h ago"
            except Exception:
                time_label = "prev reading"

            if diff > 0:
                return f"\n\n\U0001F4C8 <b>Disk trend:</b> {current_pct}% (\u2191{diff}% since {time_label})"
            elif diff < 0:
                return f"\n\n\U0001F4C9 <b>Disk trend:</b> {current_pct}% (\u2193{abs(diff)}% since {time_label})"
            else:
                return f"\n\n\U0001F4CA <b>Disk trend:</b> {current_pct}% (stable)"
        else:
            return f"\n\n\U0001F4CA <b>Disk trend:</b> {current_pct}% (first reading)"
    except Exception:
        return ""


TELEGRAM_MAX_MSG_LENGTH = 4096


async def _run_export_tool(update: Update, tool_name: str, thinking_text: str):
    """Run an export tool and send its output as Telegram message(s).

    Handles: missing tool, subprocess errors, message splitting for >4096 chars.
    """
    thinking = await update.message.reply_text(thinking_text)
    tool_path = PROJECT_ROOT / "tools" / tool_name

    if not tool_path.exists():
        await thinking.delete()
        base_name = tool_name.replace('.py', '')
        await update.message.reply_html(
            f"<b>Export tool not available yet.</b>\n\n"
            f"Run from project root:\n"
            f"<code>python tools/{tool_name}</code>"
        )
        return

    try:
        result = subprocess.run(
            [sys.executable, str(tool_path), "--format", "telegram"],
            capture_output=True, text=True, timeout=30,
            encoding='utf-8', cwd=str(PROJECT_ROOT)
        )

        await thinking.delete()

        if result.returncode == 0 and result.stdout.strip():
            text = result.stdout.strip()
            # Split into chunks if too long for Telegram
            if len(text) <= TELEGRAM_MAX_MSG_LENGTH:
                await update.message.reply_html(text)
            else:
                chunks = []
                while text:
                    if len(text) <= TELEGRAM_MAX_MSG_LENGTH:
                        chunks.append(text)
                        break
                    # Find a good split point (newline near the limit)
                    split_at = text.rfind('\n', 0, TELEGRAM_MAX_MSG_LENGTH)
                    if split_at == -1:
                        split_at = TELEGRAM_MAX_MSG_LENGTH
                    chunks.append(text[:split_at])
                    text = text[split_at:].lstrip('\n')
                for chunk in chunks:
                    await update.message.reply_html(chunk)
        else:
            error = result.stderr.strip() if result.stderr else "Unknown error"
            await update.message.reply_html(f"Error:\n<code>{error[:500]}</code>")

    except subprocess.TimeoutExpired:
        await thinking.edit_text("Timed out. Try again.")
    except Exception as e:
        await thinking.edit_text(f"Error: {e}")


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
        "/ping \u2014 Health check (VDS, bot, DB, SSL, PM2)\n"
        "/metrics \u2014 Server resource usage + disk trend\n"
        "/deploy \u2014 Last deploy info + process status\n"
        "/sheets \u2014 Export analytics to Google Sheets\n"
        "/onboarding \u2014 Onboarding questions reference\n"
        "/punishments \u2014 Punishment system reference\n"
        "/flow \u2014 Onboarding flow diagram\n"
        "/help \u2014 Show help\n\n"
        "You'll get notified when Claude starts/finishes work."
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        return

    await update.message.reply_html(
        "<b>Commands</b>\n\n"
        "<b>Health & Monitoring</b>\n"
        "<b>/ping</b> \u2014 Health check: VDS, bot API, mini app, DB, SSL cert, PM2 stability\n"
        "<b>/metrics</b> \u2014 CPU, RAM, disk usage + disk trend over time\n"
        "<b>/deploy</b> \u2014 Last deploy: commit, uptime, restarts, memory\n\n"
        "<b>Project</b>\n"
        "<b>/status</b> \u2014 Project milestones, completion %, what's left\n"
        "<b>/sheets</b> \u2014 Export analytics data to Google Sheets\n\n"
        "<b>Reference</b>\n"
        "<b>/onboarding</b> \u2014 Onboarding questions & answers reference\n"
        "<b>/punishments</b> \u2014 Punishment tiers, XP penalties, Stars costs\n"
        "<b>/flow</b> \u2014 Onboarding flow: screens, logic, branching\n\n"
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
            results.append(f"\u2705 VDS Server \u2014 {ms}ms")
        else:
            results.append(f"\u274C VDS Server \u2014 unreachable")
    except Exception:
        results.append(f"\u274C VDS Server \u2014 timeout")

    # 2. Bot Webhook / Health endpoint
    try:
        t0 = time.time()
        req = urllib.request.Request(f"https://yakutsa.ru/health", method='GET')
        with urllib.request.urlopen(req, timeout=10) as resp:
            ms = int((time.time() - t0) * 1000)
            body = json.loads(resp.read())
            if body.get("status") == "ok":
                results.append(f"\u2705 Bot API \u2014 {ms}ms")
            else:
                results.append(f"\u26A0\uFE0F Bot API \u2014 responded but status != ok")
    except Exception as e:
        results.append(f"\u274C Bot API \u2014 {str(e)[:50]}")

    # 3. Mini App
    try:
        t0 = time.time()
        req = urllib.request.Request(f"https://yakutsa.ru/levelapp/", method='GET')
        with urllib.request.urlopen(req, timeout=10) as resp:
            ms = int((time.time() - t0) * 1000)
            if resp.status == 200:
                results.append(f"\u2705 Mini App \u2014 {ms}ms")
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

    # 5. PM2 crash detection
    pm2_line = _check_pm2_restarts()
    results.append(pm2_line)

    # 6. SSL certificate expiry
    ssl_line = _check_ssl_expiry()
    results.append(ssl_line)

    # 7. Last backup info (Timeweb API)
    backup_line = ""
    try:
        tw_token = os.getenv('TIMEWEB_CLOUD_API_TOKEN', '')
        server_id = os.getenv('TIMEWEB_SERVER_ID', '6590889')
        disk_id = os.getenv('TIMEWEB_DISK_ID', '23234485')
        if tw_token:
            req = urllib.request.Request(
                f"https://api.timeweb.cloud/api/v1/servers/{server_id}/disks/{disk_id}/backups",
                headers={"Authorization": f"Bearer {tw_token}"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
                backups = data.get("backups", [])
                if backups:
                    latest = backups[0]
                    created = latest.get("created_at", "")[:16].replace("T", " ")
                    status = latest.get("status", "unknown")
                    btype = latest.get("type", "unknown")
                    icon = "\u2705" if status == "done" else "\u23F3"
                    backup_line = f"{icon} <b>Last backup:</b> {created} UTC ({btype}, {status})"
                else:
                    backup_line = "\u26A0\uFE0F <b>Last backup:</b> none found"
    except Exception as e:
        backup_line = f"\u274C <b>Backup check failed:</b> {str(e)[:40]}"

    await thinking.delete()

    # Format output
    all_ok = all("\u2705" in r for r in results)
    status_footer = "All systems operational." if all_ok else "\u26A0\uFE0F Some services have issues."

    msg = (
        "<b>\U0001F3D3 Pong!</b>\n\n"
        + "\n".join(results)
        + f"\n\n{status_footer}"
        + (f"\n\n{backup_line}" if backup_line else "")
    )
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
            # Append disk trend info
            disk_trend = _get_disk_trend()
            if disk_trend:
                msg += disk_trend
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


async def onboarding_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        await update.message.reply_text("Unauthorized.")
        return
    await _run_export_tool(update, "onboarding_text_export.py", "Loading onboarding reference...")


async def punishments_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        await update.message.reply_text("Unauthorized.")
        return
    await _run_export_tool(update, "punishment_reference_export.py", "Loading punishment reference...")


async def flow_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        await update.message.reply_text("Unauthorized.")
        return
    await _run_export_tool(update, "onboarding_flow_export.py", "Loading onboarding flow...")


async def deploy_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        await update.message.reply_text("Unauthorized.")
        return

    thinking = await update.message.reply_text("\U0001F680 Fetching deploy info...")

    try:
        # Gather deploy info in a single SSH call
        cmd = (
            "echo MARK_GIT && "
            "cd /opt/wibecode-bot && git log -1 --format='%h|%s|%ar|%ai' && "
            "echo MARK_PM2 && pm2 jlist 2>/dev/null"
        )
        proc = _run_cmd(cmd, timeout=15)

        await thinking.delete()

        if proc.returncode != 0:
            await update.message.reply_html(
                "\u274C Could not fetch deploy info from server."
            )
            return

        raw = proc.stdout
        lines = []

        # Parse git info
        git_section = ""
        if "MARK_GIT" in raw and "MARK_PM2" in raw:
            git_section = raw.split("MARK_GIT", 1)[1].split("MARK_PM2", 1)[0].strip()
        if git_section:
            parts = git_section.split("|", 3)
            if len(parts) == 4:
                commit_hash, message, relative_time, absolute_time = parts
                lines.append(f"<b>\U0001F4E6 Last Deploy</b>\n")
                lines.append(f"Commit: <code>{commit_hash}</code>")
                lines.append(f"Message: {message}")
                lines.append(f"When: {relative_time}")
                lines.append(f"Date: {absolute_time[:16]}")
            else:
                lines.append("<b>\U0001F4E6 Last Deploy</b>\n")
                lines.append(f"Git: {git_section}")

        # Parse PM2 info
        pm2_section = ""
        if "MARK_PM2" in raw:
            pm2_section = raw.split("MARK_PM2", 1)[1].strip()
        if pm2_section:
            try:
                pm2_data = json.loads(pm2_section)
                for p in pm2_data:
                    if p.get("name") == "telegram-rpg-bot":
                        status = p.get("pm2_env", {}).get("status", "unknown")
                        restart_count = p.get("pm2_env", {}).get("restart_time", 0)
                        pm_uptime = p.get("pm2_env", {}).get("pm_uptime", 0)
                        memory_mb = round(
                            p.get("monit", {}).get("memory", 0) / (1024 * 1024), 1
                        )
                        # Calculate uptime
                        if pm_uptime:
                            uptime_sec = (time.time() * 1000 - pm_uptime) / 1000
                            days = int(uptime_sec // 86400)
                            hours = int((uptime_sec % 86400) // 3600)
                            mins = int((uptime_sec % 3600) // 60)
                            uptime_str = f"{days}d {hours}h {mins}m"
                        else:
                            uptime_str = "unknown"

                        lines.append(f"\n<b>\u2699\uFE0F Process Info</b>\n")
                        lines.append(f"Status: {status}")
                        lines.append(f"Uptime: {uptime_str}")
                        lines.append(f"Memory: {memory_mb} MB")
                        lines.append(f"Restarts: {restart_count}")
                        break
            except (json.JSONDecodeError, IndexError):
                lines.append("\n\u26A0\uFE0F Could not parse PM2 data")

        if lines:
            await update.message.reply_html("\n".join(lines))
        else:
            await update.message.reply_html("\u26A0\uFE0F No deploy info available.")

    except subprocess.TimeoutExpired:
        await thinking.edit_text("Timed out connecting to server.")
    except Exception as e:
        await thinking.edit_text(f"Error: {e}")


async def post_init(application):
    """Register bot commands with Telegram so they appear in the menu and / hint."""
    commands = [
        BotCommand("status", "Project completion status"),
        BotCommand("ping", "Health check: VDS, bot, DB, SSL, PM2"),
        BotCommand("metrics", "Server resource usage + disk trend"),
        BotCommand("deploy", "Last deploy info + process status"),
        BotCommand("sheets", "Export analytics to Google Sheets"),
        BotCommand("onboarding", "Onboarding questions reference"),
        BotCommand("punishments", "Punishment system reference"),
        BotCommand("flow", "Onboarding flow diagram"),
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
    app.add_handler(CommandHandler("deploy", deploy_command))
    app.add_handler(CommandHandler("onboarding", onboarding_command))
    app.add_handler(CommandHandler("punishments", punishments_command))
    app.add_handler(CommandHandler("flow", flow_command))
    async def error_handler(update, context):
        print(f"Error: {context.error}")
    app.add_error_handler(error_handler)

    print("Bot is running. Ctrl+C to stop.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
