#!/usr/bin/env python3
"""Tests for tools/sync_todos_notification.py — mocks session state and stdin."""

import os
import sys
import json
import time
import pytest
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Set required env vars (send_notification imports need them)
os.environ.setdefault('TELEGRAM_NOTIFICATION_BOT_TOKEN', 'test_token_for_tests')
os.environ.setdefault('TELEGRAM_NOTIFICATION_CHAT_ID', '123456789')


def _make_state(
    message_id=12345,
    tasks=None,
    ended_at=None,
    start_epoch_ts=None,
):
    """Create a mock session state dict."""
    return {
        "message_id": message_id,
        "date": "2025-01-01",
        "start_epoch_ts": start_epoch_ts or time.time(),
        "sessions": [{
            "started_at": "10:00",
            "ended_at": ended_at,
            "tasks": tasks or [],
        }],
    }


# ── STATUS_MAP Tests ─────────────────────────────────────────────────


class TestStatusMap:
    """Test the STATUS_MAP constant."""

    def test_maps_pending(self):
        from tools.sync_todos_notification import STATUS_MAP
        assert STATUS_MAP["pending"] == "pending"

    def test_maps_in_progress(self):
        from tools.sync_todos_notification import STATUS_MAP
        assert STATUS_MAP["in_progress"] == "in_progress"

    def test_maps_completed_to_done(self):
        from tools.sync_todos_notification import STATUS_MAP
        assert STATUS_MAP["completed"] == "done"


# ── Main Function Tests ──────────────────────────────────────────────


class TestMain:
    """Test the main() function — the core sync logic."""

    @patch('tools.sync_todos_notification.update_session_message')
    @patch('tools.sync_todos_notification.get_current_session')
    @patch('tools.sync_todos_notification.load_session')
    @patch('sys.stdin')
    def test_syncs_todos_to_session(self, mock_stdin, mock_load, mock_get_current, mock_update):
        """Normal case: TodoWrite input is synced to the session message."""
        from tools.sync_todos_notification import main

        hook_input = {
            "tool_input": {
                "todos": [
                    {"content": "Fix bug", "status": "in_progress"},
                    {"content": "Write tests", "status": "pending"},
                ]
            }
        }
        mock_stdin.read.return_value = json.dumps(hook_input)

        state = _make_state(start_epoch_ts=time.time() - 60)
        session = state["sessions"][0]
        mock_load.return_value = state
        mock_get_current.return_value = session

        main()

        # Should have updated the tasks
        assert len(session["tasks"]) == 2
        assert session["tasks"][0]["name"] == "Fix bug"
        assert session["tasks"][0]["status"] == "in_progress"
        assert session["tasks"][1]["name"] == "Write tests"
        assert session["tasks"][1]["status"] == "pending"
        mock_update.assert_called_once_with(state)

    @patch('sys.stdin')
    def test_exits_on_invalid_json(self, mock_stdin):
        """Invalid JSON input should exit silently."""
        from tools.sync_todos_notification import main

        mock_stdin.read.return_value = "NOT VALID JSON"

        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 0

    @patch('sys.stdin')
    def test_exits_on_empty_todos(self, mock_stdin):
        """Empty todos list should exit silently."""
        from tools.sync_todos_notification import main

        mock_stdin.read.return_value = json.dumps({"tool_input": {"todos": []}})

        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 0

    @patch('tools.sync_todos_notification.load_session')
    @patch('sys.stdin')
    def test_exits_when_no_session(self, mock_stdin, mock_load):
        """No active session should exit silently."""
        from tools.sync_todos_notification import main

        mock_stdin.read.return_value = json.dumps({
            "tool_input": {"todos": [{"content": "Task", "status": "pending"}]}
        })
        mock_load.return_value = {}

        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 0

    @patch('tools.sync_todos_notification.get_current_session')
    @patch('tools.sync_todos_notification.load_session')
    @patch('sys.stdin')
    def test_exits_when_session_ended(self, mock_stdin, mock_load, mock_get_current):
        """Ended session should exit silently."""
        from tools.sync_todos_notification import main

        mock_stdin.read.return_value = json.dumps({
            "tool_input": {"todos": [{"content": "Task", "status": "pending"}]}
        })

        state = _make_state(ended_at="11:00")
        mock_load.return_value = state
        mock_get_current.return_value = state["sessions"][0]

        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 0

    @patch('tools.sync_todos_notification.update_session_message')
    @patch('tools.sync_todos_notification.get_current_session')
    @patch('tools.sync_todos_notification.load_session')
    @patch('sys.stdin')
    def test_stale_task_guard_blocks_carry_over(self, mock_stdin, mock_load, mock_get_current, mock_update):
        """Fresh session (<15s) with majority-done tasks should be rejected."""
        from tools.sync_todos_notification import main

        hook_input = {
            "tool_input": {
                "todos": [
                    {"content": "Old task 1", "status": "completed"},
                    {"content": "Old task 2", "status": "completed"},
                    {"content": "Old task 3", "status": "pending"},
                ]
            }
        }
        mock_stdin.read.return_value = json.dumps(hook_input)

        # Session just started (2s ago), no existing tasks
        state = _make_state(tasks=[], start_epoch_ts=time.time() - 2)
        session = state["sessions"][0]
        mock_load.return_value = state
        mock_get_current.return_value = session

        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 0

        # Tasks should NOT have been updated
        mock_update.assert_not_called()

    @patch('tools.sync_todos_notification.update_session_message')
    @patch('tools.sync_todos_notification.get_current_session')
    @patch('tools.sync_todos_notification.load_session')
    @patch('sys.stdin')
    def test_stale_guard_allows_fresh_tasks(self, mock_stdin, mock_load, mock_get_current, mock_update):
        """Fresh session with no done tasks should be allowed."""
        from tools.sync_todos_notification import main

        hook_input = {
            "tool_input": {
                "todos": [
                    {"content": "New task 1", "status": "pending"},
                    {"content": "New task 2", "status": "in_progress"},
                ]
            }
        }
        mock_stdin.read.return_value = json.dumps(hook_input)

        # Session just started (5s ago), no existing tasks
        state = _make_state(tasks=[], start_epoch_ts=time.time() - 5)
        session = state["sessions"][0]
        mock_load.return_value = state
        mock_get_current.return_value = session

        main()

        # Tasks SHOULD have been synced
        assert len(session["tasks"]) == 2
        mock_update.assert_called_once()

    @patch('tools.sync_todos_notification.update_session_message')
    @patch('tools.sync_todos_notification.get_current_session')
    @patch('tools.sync_todos_notification.load_session')
    @patch('sys.stdin')
    def test_subagent_guard_blocks_different_tasks(self, mock_stdin, mock_load, mock_get_current, mock_update):
        """Different tasks from subagent should be rejected when existing tasks are active."""
        from tools.sync_todos_notification import main

        hook_input = {
            "tool_input": {
                "todos": [
                    {"content": "Subagent task A", "status": "in_progress"},
                    {"content": "Subagent task B", "status": "pending"},
                ]
            }
        }
        mock_stdin.read.return_value = json.dumps(hook_input)

        # Existing tasks (from main agent, still in progress)
        state = _make_state(
            tasks=[
                {"name": "Main task 1", "status": "in_progress"},
                {"name": "Main task 2", "status": "pending"},
            ],
            start_epoch_ts=time.time() - 60,
        )
        session = state["sessions"][0]
        mock_load.return_value = state
        mock_get_current.return_value = session

        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 0

        # Should NOT have replaced existing tasks
        mock_update.assert_not_called()

    @patch('tools.sync_todos_notification.update_session_message')
    @patch('tools.sync_todos_notification.get_current_session')
    @patch('tools.sync_todos_notification.load_session')
    @patch('sys.stdin')
    def test_subagent_guard_allows_overlapping_tasks(self, mock_stdin, mock_load, mock_get_current, mock_update):
        """Tasks with name overlap should be allowed (same agent updating)."""
        from tools.sync_todos_notification import main

        hook_input = {
            "tool_input": {
                "todos": [
                    {"content": "Fix bug", "status": "completed"},
                    {"content": "Write tests", "status": "in_progress"},
                    {"content": "Deploy", "status": "pending"},
                ]
            }
        }
        mock_stdin.read.return_value = json.dumps(hook_input)

        # Existing tasks share names with incoming
        state = _make_state(
            tasks=[
                {"name": "Fix bug", "status": "in_progress"},
                {"name": "Write tests", "status": "pending"},
            ],
            start_epoch_ts=time.time() - 60,
        )
        session = state["sessions"][0]
        mock_load.return_value = state
        mock_get_current.return_value = session

        main()

        # Should have synced (overlapping names = same agent)
        assert len(session["tasks"]) == 3
        mock_update.assert_called_once()

    @patch('tools.sync_todos_notification.update_session_message')
    @patch('tools.sync_todos_notification.get_current_session')
    @patch('tools.sync_todos_notification.load_session')
    @patch('sys.stdin')
    def test_subagent_guard_allows_when_all_existing_done(self, mock_stdin, mock_load, mock_get_current, mock_update):
        """Different tasks should be allowed if all existing tasks are done (new phase)."""
        from tools.sync_todos_notification import main

        hook_input = {
            "tool_input": {
                "todos": [
                    {"content": "Phase 2 task", "status": "pending"},
                ]
            }
        }
        mock_stdin.read.return_value = json.dumps(hook_input)

        # All existing tasks are done
        state = _make_state(
            tasks=[
                {"name": "Phase 1 task", "status": "done"},
            ],
            start_epoch_ts=time.time() - 60,
        )
        session = state["sessions"][0]
        mock_load.return_value = state
        mock_get_current.return_value = session

        main()

        # Should allow — all existing done means agent moved to new phase
        assert len(session["tasks"]) == 1
        assert session["tasks"][0]["name"] == "Phase 2 task"
        mock_update.assert_called_once()

    @patch('tools.sync_todos_notification.update_session_message')
    @patch('tools.sync_todos_notification.get_current_session')
    @patch('tools.sync_todos_notification.load_session')
    @patch('sys.stdin')
    def test_removes_waiting_approval_flag(self, mock_stdin, mock_load, mock_get_current, mock_update):
        """Syncing todos should remove the waiting_approval flag."""
        from tools.sync_todos_notification import main

        hook_input = {
            "tool_input": {
                "todos": [{"content": "Task", "status": "in_progress"}]
            }
        }
        mock_stdin.read.return_value = json.dumps(hook_input)

        state = _make_state(start_epoch_ts=time.time() - 60)
        session = state["sessions"][0]
        session["waiting_approval"] = True
        mock_load.return_value = state
        mock_get_current.return_value = session

        main()

        assert "waiting_approval" not in session
        mock_update.assert_called_once()
