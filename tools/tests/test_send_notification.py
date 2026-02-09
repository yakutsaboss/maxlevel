#!/usr/bin/env python3
"""Tests for tools/send_notification.py — mocks urllib, no real API calls."""

import os
import sys
import json
import pytest
from unittest.mock import MagicMock, patch, mock_open
from io import BytesIO

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Set required env vars BEFORE importing send_notification (it sys.exit(1) without them)
os.environ.setdefault('TELEGRAM_NOTIFICATION_BOT_TOKEN', 'test_token_for_tests')
os.environ.setdefault('TELEGRAM_NOTIFICATION_CHAT_ID', '123456789')


class TestTruncateMessage:
    """Test the truncate_message helper function."""

    def test_short_message_unchanged(self):
        # Import after path setup
        from tools.send_notification import truncate_message
        assert truncate_message("Hello!") == "Hello!"

    def test_exact_limit_unchanged(self):
        from tools.send_notification import truncate_message
        msg = "x" * 4096
        assert truncate_message(msg) == msg
        assert len(truncate_message(msg)) == 4096

    def test_over_limit_truncated(self):
        from tools.send_notification import truncate_message
        msg = "x" * 5000
        result = truncate_message(msg)
        assert len(result) == 4096
        assert result.endswith("...")

    def test_custom_max_length(self):
        from tools.send_notification import truncate_message
        msg = "Hello World!"
        result = truncate_message(msg, max_length=8)
        assert len(result) == 8
        assert result == "Hello..."

    def test_empty_message(self):
        from tools.send_notification import truncate_message
        assert truncate_message("") == ""


class TestSendMessage:
    """Test the send_message function with mocked HTTP calls."""

    @patch('tools.send_notification.urllib.request.urlopen')
    def test_success(self, mock_urlopen):
        from tools.send_notification import send_message

        response_data = json.dumps({
            "ok": True,
            "result": {"message_id": 123, "chat": {"id": 456}},
        }).encode('utf-8')

        mock_response = MagicMock()
        mock_response.read.return_value = response_data
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        result = send_message("Test message")

        assert result is not None
        assert result['message_id'] == 123
        mock_urlopen.assert_called_once()

    @patch('tools.send_notification.urllib.request.urlopen')
    def test_truncates_long_messages(self, mock_urlopen):
        from tools.send_notification import send_message

        response_data = json.dumps({
            "ok": True,
            "result": {"message_id": 1},
        }).encode('utf-8')

        mock_response = MagicMock()
        mock_response.read.return_value = response_data
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        long_msg = "x" * 5000
        result = send_message(long_msg)

        assert result is not None
        # Verify the request was made (message was truncated internally)
        mock_urlopen.assert_called_once()

    @patch('tools.send_notification.time.sleep')
    @patch('tools.send_notification.urllib.request.urlopen')
    def test_retry_on_500(self, mock_urlopen, mock_sleep):
        from tools.send_notification import send_message
        import urllib.error

        # First call: 500 error, Second call: success
        error_500 = urllib.error.HTTPError(
            url='', code=500, msg='Internal Server Error',
            hdrs=None, fp=BytesIO(b'')
        )
        response_data = json.dumps({
            "ok": True,
            "result": {"message_id": 1},
        }).encode('utf-8')

        mock_response = MagicMock()
        mock_response.read.return_value = response_data
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        mock_urlopen.side_effect = [error_500, mock_response]

        result = send_message("Test", max_retries=2)

        assert result is not None
        assert mock_urlopen.call_count == 2
        mock_sleep.assert_called_once_with(1)  # 2^0 = 1s backoff

    @patch('tools.send_notification.urllib.request.urlopen')
    def test_no_retry_on_400(self, mock_urlopen):
        from tools.send_notification import send_message
        import urllib.error

        error_400 = urllib.error.HTTPError(
            url='', code=400, msg='Bad Request',
            hdrs=None, fp=BytesIO(b'')
        )
        mock_urlopen.side_effect = error_400

        result = send_message("Bad <unclosed tag", max_retries=3)

        assert result is None
        assert mock_urlopen.call_count == 1  # No retries for 400

    @patch('tools.send_notification.time.sleep')
    @patch('tools.send_notification.urllib.request.urlopen')
    def test_429_rate_limit_waits_retry_after(self, mock_urlopen, mock_sleep):
        from tools.send_notification import send_message
        import urllib.error

        rate_limit_body = json.dumps({
            "parameters": {"retry_after": 3},
        }).encode('utf-8')

        error_429 = urllib.error.HTTPError(
            url='', code=429, msg='Too Many Requests',
            hdrs=None, fp=BytesIO(rate_limit_body)
        )

        response_data = json.dumps({
            "ok": True,
            "result": {"message_id": 1},
        }).encode('utf-8')

        mock_response = MagicMock()
        mock_response.read.return_value = response_data
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        mock_urlopen.side_effect = [error_429, mock_response]

        result = send_message("Test", max_retries=2)

        assert result is not None
        mock_sleep.assert_called_with(3)  # Should wait retry_after seconds

    @patch('tools.send_notification.time.sleep')
    @patch('tools.send_notification.urllib.request.urlopen')
    def test_all_retries_exhausted(self, mock_urlopen, mock_sleep):
        from tools.send_notification import send_message
        import urllib.error

        error_500 = urllib.error.HTTPError(
            url='', code=500, msg='Server Error',
            hdrs=None, fp=BytesIO(b'')
        )
        mock_urlopen.side_effect = error_500

        result = send_message("Test", max_retries=3)

        assert result is None
        assert mock_urlopen.call_count == 3

    @patch('tools.send_notification.time.sleep')
    @patch('tools.send_notification.urllib.request.urlopen')
    def test_generic_exception_retries(self, mock_urlopen, mock_sleep):
        from tools.send_notification import send_message

        response_data = json.dumps({
            "ok": True,
            "result": {"message_id": 1},
        }).encode('utf-8')

        mock_response = MagicMock()
        mock_response.read.return_value = response_data
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        mock_urlopen.side_effect = [
            ConnectionError("Network unreachable"),
            mock_response,
        ]

        result = send_message("Test", max_retries=2)

        assert result is not None
        assert mock_urlopen.call_count == 2


class TestEditMessage:
    """Test the edit_message function with mocked HTTP calls."""

    @patch('tools.send_notification.urllib.request.urlopen')
    def test_success(self, mock_urlopen):
        from tools.send_notification import edit_message

        response_data = json.dumps({"ok": True}).encode('utf-8')

        mock_response = MagicMock()
        mock_response.read.return_value = response_data
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        result = edit_message(message_id=123, text="Updated text")
        assert result is True

    @patch('tools.send_notification.urllib.request.urlopen')
    def test_bad_request_returns_false(self, mock_urlopen):
        from tools.send_notification import edit_message
        import urllib.error

        error_400 = urllib.error.HTTPError(
            url='', code=400, msg='Bad Request',
            hdrs=None, fp=BytesIO(b'')
        )
        mock_urlopen.side_effect = error_400

        result = edit_message(message_id=123, text="Test")
        assert result is False

    @patch('tools.send_notification.urllib.request.urlopen')
    def test_truncates_long_edit(self, mock_urlopen):
        from tools.send_notification import edit_message

        response_data = json.dumps({"ok": True}).encode('utf-8')
        mock_response = MagicMock()
        mock_response.read.return_value = response_data
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        long_msg = "x" * 5000
        result = edit_message(message_id=123, text=long_msg)
        assert result is True


class TestBuildSessionMessage:
    """Test message building logic."""

    def test_empty_sessions(self):
        from tools.send_notification import build_session_message
        state = {"sessions": [], "message_id": 42}
        msg = build_session_message(state)
        assert "Starting" in msg

    def test_active_session_with_tasks(self):
        from tools.send_notification import build_session_message
        state = {
            "message_id": 42,
            "date": "2025-01-15",
            "vds_summary": "",
            "sessions": [{
                "started_at": "10:00",
                "ended_at": None,
                "tasks": [
                    {"name": "Fix bug", "status": "done"},
                    {"name": "Add tests", "status": "in_progress"},
                ],
            }],
        }
        msg = build_session_message(state)
        assert "Active" in msg
        assert "Fix bug" in msg
        assert "Add tests" in msg

    def test_ended_session(self):
        from tools.send_notification import build_session_message
        state = {
            "message_id": 42,
            "date": "2025-01-15",
            "vds_summary": "",
            "sessions": [{
                "started_at": "10:00",
                "ended_at": "12:00",
                "tasks": [{"name": "Deploy", "status": "done"}],
            }],
        }
        msg = build_session_message(state)
        assert "Session Ended" in msg

    def test_waiting_approval(self):
        from tools.send_notification import build_session_message
        state = {
            "message_id": 42,
            "date": "2025-01-15",
            "vds_summary": "",
            "sessions": [{
                "started_at": "10:00",
                "ended_at": None,
                "waiting_approval": True,
                "tasks": [],
            }],
        }
        msg = build_session_message(state)
        assert "Needs Approval" in msg


class TestCalcDuration:
    def test_simple_duration(self):
        from tools.send_notification import _calc_duration
        assert _calc_duration("10:00", "12:30") == "2h 30m"

    def test_under_one_hour(self):
        from tools.send_notification import _calc_duration
        assert _calc_duration("10:00", "10:45") == "45 min"

    def test_exact_hours(self):
        from tools.send_notification import _calc_duration
        assert _calc_duration("10:00", "13:00") == "3h"

    def test_midnight_crossover(self):
        from tools.send_notification import _calc_duration
        result = _calc_duration("23:00", "01:00")
        assert result == "2h"
