#!/usr/bin/env python3
"""
PostToolUse hook for TodoWrite — syncs Claude's todo list to the notification bot.

Called automatically by Claude Code after every TodoWrite tool call.
Reads hook JSON from stdin, extracts todos, and updates the Telegram session message.

Two protections against bad syncs:
1. Stale task guard: if the session just started (<15s) and has no tasks yet, rejects
   TodoWrite syncs where ≥50% of tasks are already "done" — these are carry-over from
   the previous session's context, not new work.
2. Subagent guard: if the existing task list has items AND the new list has zero name
   overlap, it's likely from a parallel Task subagent and gets skipped.
"""

import sys
import json
import time
from pathlib import Path

# Reuse send_notification internals
sys.path.insert(0, str(Path(__file__).parent))
from send_notification import load_session, save_session, update_session_message, get_current_session


STATUS_MAP = {
    "pending": "pending",
    "in_progress": "in_progress",
    "completed": "done",
}


def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except Exception:
        sys.exit(0)

    todos = hook_input.get("tool_input", {}).get("todos", [])
    if not todos:
        sys.exit(0)

    state = load_session()
    if not state or not state.get("message_id"):
        sys.exit(0)

    current = get_current_session(state)
    if not current or current.get("ended_at"):
        sys.exit(0)

    # Map TodoWrite todos to notification task format
    tasks = []
    for todo in todos:
        content = todo.get("content", "")
        status = STATUS_MAP.get(todo.get("status", ""), "pending")
        if content:
            tasks.append({"name": content, "status": status})

    if not tasks:
        sys.exit(0)

    # Stale task protection: if the session JUST started (within 15 seconds) and
    # currently has no tasks, reject TodoWrite syncs where most tasks are already
    # "completed" — these are stale tasks from the previous session's context that
    # Claude Code carried over, not genuinely new work for this session.
    existing_tasks = current.get("tasks", [])
    start_epoch = state.get("start_epoch_ts", 0)
    session_age = time.time() - start_epoch if start_epoch else 999

    if not existing_tasks and session_age < 15:
        completed_count = sum(1 for t in tasks if t["status"] == "done")
        if completed_count > 0 and completed_count >= len(tasks) * 0.5:
            # Fresh session + majority of incoming tasks already done = stale carry-over
            sys.exit(0)

    # Subagent protection: detect if this TodoWrite is from a parallel subagent.
    # If the existing task list has items AND the new task list has ZERO name overlap,
    # it's likely a subagent writing its own todo list — skip to protect the main agent's tasks.
    if existing_tasks:
        existing_names = {t["name"].lower().strip() for t in existing_tasks}
        new_names = {t["name"].lower().strip() for t in tasks}

        # Check for any overlap in task names
        overlap = existing_names & new_names
        if not overlap:
            # Zero overlap — check if all existing tasks are done (main agent moving to new phase)
            all_done = all(t["status"] == "done" for t in existing_tasks)
            if not all_done:
                # Existing tasks still in progress + completely different names = subagent
                sys.exit(0)

    current["tasks"] = tasks
    current.pop("waiting_approval", None)

    update_session_message(state)


if __name__ == "__main__":
    main()
