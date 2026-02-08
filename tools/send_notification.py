#!/usr/bin/env python3
"""
Send a notification via yakutsawibecode_bot.
Does NOT require the bot to be running — calls Telegram API directly.

Usage:
    python send_notification.py start                        # Session started + server snapshot
    python send_notification.py finish                       # Session finished + metrics delta
    python send_notification.py mission "Bug Fixing" "desc"  # Set mission & summary, edit msg
    python send_notification.py add-task "Task name"         # Add a pending task
    python send_notification.py task-progress "Task name"    # Mark task in-progress
    python send_notification.py task-done "Task name"        # Mark task completed
    python send_notification.py "Custom text"                # Any message
"""

import os
import sys
import subprocess
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
SESSION_FILE = PROJECT_ROOT / ".tmp" / "session_notification.json"

if not BOT_TOKEN or not CHAT_ID:
    print("ERROR: Missing TELEGRAM_NOTIFICATION_BOT_TOKEN or TELEGRAM_NOTIFICATION_CHAT_ID")
    sys.exit(1)


# ── Telegram API helpers ──────────────────────────────────────────────

def send_message(text: str, parse_mode: str = "HTML") -> dict | None:
    """Send a message via Telegram Bot API. Returns the message object or None."""
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
            if result.get("ok"):
                return result.get("result")
    except Exception as e:
        print(f"Failed to send: {e}")
    return None


def edit_message(message_id: int, text: str, parse_mode: str = "HTML") -> bool:
    """Edit an existing message via Telegram Bot API."""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/editMessageText"
    data = urllib.parse.urlencode({
        "chat_id": CHAT_ID,
        "message_id": message_id,
        "text": text,
        "parse_mode": parse_mode
    }).encode('utf-8')

    try:
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            return result.get("ok", False)
    except Exception as e:
        print(f"Failed to edit: {e}")
        return False


# ── Session state persistence ─────────────────────────────────────────

def load_session() -> dict:
    """Load session state from disk."""
    if SESSION_FILE.exists():
        try:
            return json.loads(SESSION_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def save_session(state: dict):
    """Save session state to disk."""
    SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
    SESSION_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


# ── Message builder ───────────────────────────────────────────────────

STATUS_ICONS = {
    "pending": "\U0001F534",     # 🔴
    "in_progress": "\U0001F7E1", # 🟡
    "done": "\U0001F7E2",        # 🟢
}

def build_session_message(state: dict) -> str:
    """Build the session notification message from current state."""
    mission = state.get("mission", "Started")
    summary = state.get("summary", "")
    started_at = state.get("started_at", "")
    date = state.get("date", "")
    vds_summary = state.get("vds_summary", "")
    tasks = state.get("tasks", [])

    # Determine header icon based on task progress
    all_done = tasks and all(t["status"] == "done" for t in tasks)
    any_progress = any(t["status"] in ("in_progress", "done") for t in tasks) if tasks else False

    if all_done:
        header_icon = "\u2705"  # ✅
    elif any_progress:
        header_icon = "\u26A1"  # ⚡
    else:
        header_icon = "\U0001F680"  # 🚀

    msg = f"{header_icon} <b>Claude Code \u2014 {mission}</b>\n\n"
    msg += f"\U0001F4C1 Project: Wibecode\n"
    msg += f"\u23F0 {started_at} | \U0001F4C5 {date}\n"

    if vds_summary and "failed" not in vds_summary.lower() and "unavailable" not in vds_summary.lower():
        msg += f"\U0001F5A5\uFE0F {vds_summary}\n"

    if summary:
        msg += f"\n\U0001F4DD {summary}\n"

    if tasks:
        msg += f"\n\U0001F4CB <b>Tasks:</b>\n"
        for t in tasks:
            icon = STATUS_ICONS.get(t["status"], "\U0001F534")
            msg += f"  {icon} {t['name']}\n"

    return msg


def update_session_message(state: dict) -> bool:
    """Edit the Telegram message with current session state."""
    message_id = state.get("message_id")
    if not message_id:
        print("No message_id in session state, cannot edit.")
        return False

    msg = build_session_message(state)
    ok = edit_message(message_id, msg)
    if ok:
        save_session(state)
    return ok


# ── Server metrics ────────────────────────────────────────────────────

def get_server_snapshot() -> str:
    """Run server_metrics.py snapshot and return summary line."""
    metrics_script = PROJECT_ROOT / "tools" / "server_metrics.py"
    try:
        result = subprocess.run(
            [sys.executable, str(metrics_script), "snapshot"],
            capture_output=True, text=True, timeout=25,
            encoding='utf-8', cwd=str(PROJECT_ROOT)
        )
        return result.stdout.strip() if result.returncode == 0 else "VDS: metrics unavailable"
    except Exception:
        return "VDS: metrics unavailable"


def get_server_report() -> str:
    """Run server_metrics.py report and return comparison."""
    metrics_script = PROJECT_ROOT / "tools" / "server_metrics.py"
    try:
        result = subprocess.run(
            [sys.executable, str(metrics_script), "report"],
            capture_output=True, text=True, timeout=8,
            encoding='utf-8', cwd=str(PROJECT_ROOT)
        )
        return result.stdout.strip() if result.returncode == 0 else "Metrics: unavailable"
    except Exception:
        return "Metrics: unavailable"


# ── Main CLI ──────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python send_notification.py [start|finish|mission|add-task|task-progress|task-done|\"message\"]")
        sys.exit(1)

    action = sys.argv[1].lower()
    now = datetime.now().strftime("%H:%M")
    date = datetime.now().strftime("%Y-%m-%d")

    if action == "start":
        # Capture server metrics snapshot
        vds_summary = get_server_snapshot()

        # Build initial session state
        state = {
            "message_id": None,
            "mission": "Started",
            "summary": "",
            "started_at": now,
            "date": date,
            "vds_summary": vds_summary,
            "tasks": [],
        }

        msg = build_session_message(state)
        result = send_message(msg)
        if result:
            state["message_id"] = result["message_id"]
            save_session(state)
            print("Notification sent.")
        else:
            print("Failed to send notification.")
            sys.exit(1)

    elif action == "mission":
        # python send_notification.py mission "Bug Fixing" "Short description"
        if len(sys.argv) < 3:
            print("Usage: python send_notification.py mission \"Mission Name\" [\"summary\"]")
            sys.exit(1)

        state = load_session()
        if not state:
            print("No active session. Run 'start' first.")
            sys.exit(1)

        state["mission"] = sys.argv[2]
        if len(sys.argv) > 3:
            state["summary"] = " ".join(sys.argv[3:])

        if update_session_message(state):
            print(f"Mission set: {state['mission']}")
        else:
            print("Failed to update message.")
            sys.exit(1)

    elif action == "add-task":
        # python send_notification.py add-task "Investigate root cause"
        if len(sys.argv) < 3:
            print("Usage: python send_notification.py add-task \"Task name\"")
            sys.exit(1)

        state = load_session()
        if not state:
            print("No active session. Run 'start' first.")
            sys.exit(1)

        task_name = " ".join(sys.argv[2:])
        state.setdefault("tasks", []).append({"name": task_name, "status": "pending"})

        if update_session_message(state):
            print(f"Task added: {task_name}")
        else:
            print("Failed to update message.")
            sys.exit(1)

    elif action == "task-progress":
        # python send_notification.py task-progress "Task name"
        if len(sys.argv) < 3:
            print("Usage: python send_notification.py task-progress \"Task name\"")
            sys.exit(1)

        state = load_session()
        if not state:
            print("No active session. Run 'start' first.")
            sys.exit(1)

        task_name = " ".join(sys.argv[2:])
        found = False
        for t in state.get("tasks", []):
            if t["name"].lower() == task_name.lower():
                t["status"] = "in_progress"
                found = True
                break

        if not found:
            # Auto-add as in_progress if not found
            state.setdefault("tasks", []).append({"name": task_name, "status": "in_progress"})

        if update_session_message(state):
            print(f"Task in progress: {task_name}")
        else:
            print("Failed to update message.")
            sys.exit(1)

    elif action == "task-done":
        # python send_notification.py task-done "Task name"
        if len(sys.argv) < 3:
            print("Usage: python send_notification.py task-done \"Task name\"")
            sys.exit(1)

        state = load_session()
        if not state:
            print("No active session. Run 'start' first.")
            sys.exit(1)

        task_name = " ".join(sys.argv[2:])
        found = False
        for t in state.get("tasks", []):
            if t["name"].lower() == task_name.lower():
                t["status"] = "done"
                found = True
                break

        if not found:
            # Auto-add as done if not found
            state.setdefault("tasks", []).append({"name": task_name, "status": "done"})

        if update_session_message(state):
            print(f"Task done: {task_name}")
        else:
            print("Failed to update message.")
            sys.exit(1)

    elif action == "finish":
        task_desc = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""

        # Mark all remaining tasks as done in the session message
        state = load_session()
        if state and state.get("message_id"):
            for t in state.get("tasks", []):
                if t["status"] != "done":
                    t["status"] = "done"
            state["mission"] = state.get("mission", "Finished")
            update_session_message(state)

        # Send the finish notification FIRST (fast, no server dependency)
        started_at = state.get("started_at", "?") if state else "?"
        msg = (
            f"\u2705 <b>Claude Code \u2014 Finished</b>\n\n"
            f"\U0001F4C1 Project: Wibecode\n"
            f"\u23F0 {started_at} \u2192 {now} | \U0001F4C5 {date}"
        )
        if task_desc:
            msg += f"\n\n\U0001F4DD Done: {task_desc}"

        result = send_message(msg)
        if result:
            # Clean up session file
            if SESSION_FILE.exists():
                SESSION_FILE.unlink()
            print("Notification sent.")

            # Try to append server metrics (best-effort, don't block)
            try:
                metrics_report = get_server_report()
                if metrics_report and metrics_report != "Metrics: unavailable":
                    msg += (
                        f"\n\n\U0001F4CA <b>Server Metrics (start \u2192 end):</b>\n"
                        f"<code>{metrics_report}</code>"
                    )
                    edit_message(result["message_id"], msg)
            except Exception:
                pass  # Metrics are optional, notification already sent
        else:
            print("Failed to send notification.")
            sys.exit(1)

    else:
        # Custom message
        msg = " ".join(sys.argv[1:])
        result = send_message(msg)
        if result:
            print("Notification sent.")
        else:
            print("Failed to send notification.")
            sys.exit(1)


if __name__ == "__main__":
    main()
