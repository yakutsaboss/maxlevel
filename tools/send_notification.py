#!/usr/bin/env python3
"""
Send a notification via yakutsawibecode_bot.
Does NOT require the bot to be running — calls Telegram API directly.

Uses a SINGLE Telegram message that gets progressively updated:
- Session start: 🟡 Starting (no tasks yet)
- Task updates: 🟢 Active (doing tasks)
- Waiting: 🔴 Needs approval
- Session end: ⚫ Session Ended with completed tasks (same message, no second msg)
- Resume (same day): edits same message, adds new session segment

Usage:
    python send_notification.py start                        # Session started
    python send_notification.py finish                       # Session finished (edits start msg)
    python send_notification.py finish "key moments summary" # Finish with summary
    python send_notification.py waiting                      # Mark as waiting for approval
    python send_notification.py mission "Bug Fixing" "desc"  # Set mission & summary
    python send_notification.py add-task "Task name"         # Add a pending task
    python send_notification.py task-progress "Task name"    # Mark task in-progress
    python send_notification.py task-done "Task name"        # Mark task completed
    python send_notification.py set-summary "key moments"    # Store session summary
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

TASK_ICONS = {
    "pending": "\U0001F534",     # 🔴
    "in_progress": "\U0001F7E1", # 🟡
    "done": "\U0001F7E2",        # 🟢
}


def get_current_session(state: dict) -> dict | None:
    """Get the last (current) session segment."""
    sessions = state.get("sessions", [])
    return sessions[-1] if sessions else None


def _calc_duration(start_time: str, end_time: str) -> str:
    """Calculate human-readable duration between HH:MM times."""
    try:
        sh, sm = map(int, start_time.split(":"))
        eh, em = map(int, end_time.split(":"))
        total_min = (eh * 60 + em) - (sh * 60 + sm)
        if total_min < 0:
            total_min += 24 * 60  # crossed midnight
        if total_min < 60:
            return f"{total_min} min"
        hours, mins = divmod(total_min, 60)
        return f"{hours}h {mins}m" if mins else f"{hours}h"
    except Exception:
        return ""


def build_session_message(state: dict) -> str:
    """Build the single living session message from current state.

    Supports multiple session segments (resume) within the same day.
    """
    sessions = state.get("sessions", [])
    date = state.get("date", "")
    vds_summary = state.get("vds_summary", "")
    msg_id = state.get("message_id", "")
    session_label = f"Session {msg_id}" if msg_id else "Claude Code"

    if not sessions:
        return f"\U0001F7E1 <b>{session_label} \u2014 Starting</b>"

    current = sessions[-1]
    is_active = current.get("ended_at") is None

    # Header icon by state:
    # 🟡 Yellow - session started, no tasks yet
    # 🟢 Green  - active, doing tasks
    # 🔴 Red    - waiting for user approval
    # ⚫ Black  - session ended
    if not is_active:
        header = f"\u26AB <b>{session_label} \u2014 Session Ended</b>"
    elif current.get("waiting_approval"):
        header = f"\U0001F534 <b>{session_label} \u2014 Needs Approval</b>"
    elif any(t["status"] in ("in_progress", "done") for t in current.get("tasks", [])):
        header = f"\U0001F7E2 <b>{session_label} \u2014 Active</b>"
    else:
        header = f"\U0001F7E1 <b>{session_label} \u2014 Starting</b>"

    msg = header + "\n\n"
    msg += f"\U0001F4C1 Wibecode | \U0001F4C5 {date}\n"

    if vds_summary and "failed" not in vds_summary.lower() and "unavailable" not in vds_summary.lower():
        msg += f"\U0001F5A5\uFE0F {vds_summary}\n"

    multi = len(sessions) > 1

    for i, session in enumerate(sessions):
        started = session.get("started_at", "?")
        ended = session.get("ended_at")
        tasks = session.get("tasks", [])
        summary = session.get("summary", "")
        key_moments = session.get("key_moments", "")
        is_last = (i == len(sessions) - 1)

        # Calculate duration if session has ended
        duration_str = ""
        if started != "?" and ended:
            duration_str = _calc_duration(started, ended)

        if multi:
            # Multiple sessions: show separator with time range
            time_str = f"{started} \u2192 {ended}" if ended else f"{started} \u2192 ..."
            if duration_str and ended:
                time_str += f" ({duration_str})"
            msg += f"\n\u2500\u2500 {time_str} \u2500\u2500\n"
        else:
            # Single session: show time inline
            if ended:
                msg += f"\u23F0 {started} \u2192 {ended}"
                if duration_str:
                    msg += f" ({duration_str})"
                msg += "\n"
            else:
                msg += f"\u23F0 {started}\n"

        # Summary for active session
        if is_last and is_active and summary:
            msg += f"\n\U0001F4DD {summary}\n"

        # Tasks
        if tasks:
            if not multi:
                msg += "\n"
            for t in tasks:
                if ended is not None:
                    # Finished session — all tasks show ✅
                    msg += f"  \u2705 {t['name']}\n"
                else:
                    # Active session — show status icons
                    icon = TASK_ICONS.get(t["status"], "\U0001F534")
                    msg += f"  {icon} {t['name']}\n"
        elif is_last and is_active and not summary:
            msg += f"\n\U0001F4AC Session in progress...\n"

        # Key moments — shown at bottom of finished sessions
        if ended and key_moments:
            msg += f"\n\U0001F4CB <i>{key_moments}</i>\n"

    return msg.rstrip() + "\n"


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


# ── Main CLI ──────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python send_notification.py [start|finish|waiting|mission|add-task|task-progress|task-done|\"message\"]")
        sys.exit(1)

    action = sys.argv[1].lower()
    now = datetime.now().strftime("%H:%M")
    date = datetime.now().strftime("%Y-%m-%d")

    if action == "start":
        # Always send a fresh message for each new session
        vds_summary = get_server_snapshot()

        state = {
            "message_id": None,
            "date": date,
            "vds_summary": vds_summary,
            "sessions": [{
                "started_at": now,
                "ended_at": None,
                "mission": "",
                "summary": "",
                "tasks": [],
            }],
        }

        msg = build_session_message(state)
        result = send_message(msg)
        if result:
            state["message_id"] = result["message_id"]
            save_session(state)
            # Re-edit to include session number in header
            update_session_message(state)
            print("Notification sent.")
        else:
            print("Failed to send notification.")
            sys.exit(1)

    elif action == "mission":
        if len(sys.argv) < 3:
            print("Usage: python send_notification.py mission \"Mission Name\" [\"summary\"]")
            sys.exit(1)

        state = load_session()
        if not state:
            print("No active session. Run 'start' first.")
            sys.exit(1)

        current = get_current_session(state)
        if current:
            current["mission"] = sys.argv[2]
            if len(sys.argv) > 3:
                current["summary"] = " ".join(sys.argv[3:])

        if update_session_message(state):
            print(f"Mission set: {sys.argv[2]}")
        else:
            print("Failed to update message.")
            sys.exit(1)

    elif action == "add-task":
        if len(sys.argv) < 3:
            print("Usage: python send_notification.py add-task \"Task name\"")
            sys.exit(1)

        state = load_session()
        if not state:
            print("No active session. Run 'start' first.")
            sys.exit(1)

        current = get_current_session(state)
        task_name = " ".join(sys.argv[2:])
        if current:
            current.setdefault("tasks", []).append({"name": task_name, "status": "pending"})
            current.pop("waiting_approval", None)

        if update_session_message(state):
            print(f"Task added: {task_name}")
        else:
            print("Failed to update message.")
            sys.exit(1)

    elif action == "task-progress":
        if len(sys.argv) < 3:
            print("Usage: python send_notification.py task-progress \"Task name\"")
            sys.exit(1)

        state = load_session()
        if not state:
            print("No active session. Run 'start' first.")
            sys.exit(1)

        current = get_current_session(state)
        task_name = " ".join(sys.argv[2:])
        if current:
            current.pop("waiting_approval", None)
            found = False
            for t in current.get("tasks", []):
                if t["name"].lower() == task_name.lower():
                    t["status"] = "in_progress"
                    found = True
                    break
            if not found:
                current.setdefault("tasks", []).append({"name": task_name, "status": "in_progress"})

        if update_session_message(state):
            print(f"Task in progress: {task_name}")
        else:
            print("Failed to update message.")
            sys.exit(1)

    elif action == "task-done":
        if len(sys.argv) < 3:
            print("Usage: python send_notification.py task-done \"Task name\"")
            sys.exit(1)

        state = load_session()
        if not state:
            print("No active session. Run 'start' first.")
            sys.exit(1)

        current = get_current_session(state)
        task_name = " ".join(sys.argv[2:])
        if current:
            current.pop("waiting_approval", None)
            found = False
            for t in current.get("tasks", []):
                if t["name"].lower() == task_name.lower():
                    t["status"] = "done"
                    found = True
                    break
            if not found:
                current.setdefault("tasks", []).append({"name": task_name, "status": "done"})

        if update_session_message(state):
            print(f"Task done: {task_name}")
        else:
            print("Failed to update message.")
            sys.exit(1)

    elif action == "set-summary":
        if len(sys.argv) < 3:
            print("Usage: python send_notification.py set-summary \"key moments\"")
            sys.exit(1)

        state = load_session()
        if not state:
            print("No active session. Run 'start' first.")
            sys.exit(1)

        current = get_current_session(state)
        summary_text = " ".join(sys.argv[2:])
        if current:
            current["key_moments"] = summary_text

        if update_session_message(state):
            print(f"Summary set: {summary_text}")
        else:
            print("Failed to update message.")
            sys.exit(1)

    elif action == "waiting":
        state = load_session()
        if not state:
            print("No active session. Run 'start' first.")
            sys.exit(1)

        current = get_current_session(state)
        if current:
            current["waiting_approval"] = True

        if update_session_message(state):
            print("Session marked as waiting for approval.")
        else:
            print("Failed to update message.")
            sys.exit(1)

    elif action == "finish":
        state = load_session()
        if not state or not state.get("message_id"):
            print("No active session to finish.")
            sys.exit(0)

        current = get_current_session(state)
        if current:
            # Store key moments if passed as argument
            if len(sys.argv) > 2:
                current["key_moments"] = " ".join(sys.argv[2:])

            # Mark all remaining tasks as done
            for t in current.get("tasks", []):
                if t["status"] != "done":
                    t["status"] = "done"
            # Set end time
            current["ended_at"] = now

        # Edit the original message to ⚫ Session Ended — no second message
        if update_session_message(state):
            print("Session finished (message updated).")
        else:
            print("Failed to update message.")
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
