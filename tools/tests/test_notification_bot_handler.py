#!/usr/bin/env python3
"""Tests for tools/notification_bot_handler.py — mocks Telegram API and subprocess."""

import os
import sys
import json
import asyncio
import pytest
from unittest.mock import MagicMock, patch, AsyncMock

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Set required env vars BEFORE importing (module sys.exit(1) without them)
os.environ.setdefault('TELEGRAM_NOTIFICATION_BOT_TOKEN', 'test_token_for_tests')
os.environ.setdefault('TELEGRAM_NOTIFICATION_CHAT_ID', '123456789')


def _make_update(chat_id: int = 123456789) -> MagicMock:
    """Create a mock Telegram Update object."""
    update = MagicMock()
    update.effective_chat.id = chat_id
    update.message.reply_text = AsyncMock()
    update.message.reply_html = AsyncMock()
    return update


def _make_context() -> MagicMock:
    """Create a mock context."""
    return MagicMock()


# ── Authorization Tests ──────────────────────────────────────────────


class TestIsAuthorized:
    """Test the is_authorized() check."""

    def test_authorized_user(self):
        from tools.notification_bot_handler import is_authorized
        update = _make_update(chat_id=123456789)
        assert is_authorized(update) is True

    def test_unauthorized_user(self):
        from tools.notification_bot_handler import is_authorized
        update = _make_update(chat_id=999999999)
        assert is_authorized(update) is False


# ── Start Command Tests ──────────────────────────────────────────────


class TestStartCommand:
    """Test /start command handler."""

    def test_authorized_shows_welcome(self):
        from tools.notification_bot_handler import start_command
        update = _make_update(chat_id=123456789)
        context = _make_context()

        asyncio.run(start_command(update, context))

        update.message.reply_html.assert_called_once()
        html = update.message.reply_html.call_args[0][0]
        assert "Wibecode Notification Bot" in html
        assert "/status" in html

    def test_unauthorized_rejected(self):
        from tools.notification_bot_handler import start_command
        update = _make_update(chat_id=999)
        context = _make_context()

        asyncio.run(start_command(update, context))

        update.message.reply_text.assert_called_once_with("Unauthorized.")
        update.message.reply_html.assert_not_called()


# ── Help Command Tests ───────────────────────────────────────────────


class TestHelpCommand:
    """Test /help command handler."""

    def test_authorized_shows_help(self):
        from tools.notification_bot_handler import help_command
        update = _make_update(chat_id=123456789)
        context = _make_context()

        asyncio.run(help_command(update, context))

        update.message.reply_html.assert_called_once()
        html = update.message.reply_html.call_args[0][0]
        assert "/status" in html
        assert "/ping" in html
        assert "/metrics" in html

    def test_unauthorized_silent(self):
        from tools.notification_bot_handler import help_command
        update = _make_update(chat_id=999)
        context = _make_context()

        asyncio.run(help_command(update, context))

        update.message.reply_html.assert_not_called()
        update.message.reply_text.assert_not_called()


# ── Status Command Tests ─────────────────────────────────────────────


class TestStatusCommand:
    """Test /status command handler."""

    def test_unauthorized_rejected(self):
        from tools.notification_bot_handler import status_command
        update = _make_update(chat_id=999)
        context = _make_context()

        asyncio.run(status_command(update, context))

        update.message.reply_text.assert_called_once_with("Unauthorized.")

    @patch('tools.notification_bot_handler.subprocess.run')
    def test_success_shows_output(self, mock_run):
        from tools.notification_bot_handler import status_command
        update = _make_update(chat_id=123456789)
        context = _make_context()

        thinking_msg = AsyncMock()
        update.message.reply_text = AsyncMock(return_value=thinking_msg)

        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="<b>Project Status</b>\n50% complete",
            stderr=""
        )

        asyncio.run(status_command(update, context))

        thinking_msg.delete.assert_called_once()
        update.message.reply_html.assert_called_once()
        html = update.message.reply_html.call_args[0][0]
        assert "Project Status" in html

    @patch('tools.notification_bot_handler.subprocess.run')
    def test_error_shows_stderr(self, mock_run):
        from tools.notification_bot_handler import status_command
        update = _make_update(chat_id=123456789)
        context = _make_context()

        thinking_msg = AsyncMock()
        update.message.reply_text = AsyncMock(return_value=thinking_msg)

        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="",
            stderr="Script crashed"
        )

        asyncio.run(status_command(update, context))

        thinking_msg.delete.assert_called_once()
        update.message.reply_html.assert_called_once()
        html = update.message.reply_html.call_args[0][0]
        assert "Script crashed" in html

    @patch('tools.notification_bot_handler.subprocess.run', side_effect=Exception("boom"))
    def test_exception_edits_thinking(self, mock_run):
        from tools.notification_bot_handler import status_command
        update = _make_update(chat_id=123456789)
        context = _make_context()

        thinking_msg = AsyncMock()
        update.message.reply_text = AsyncMock(return_value=thinking_msg)

        asyncio.run(status_command(update, context))

        thinking_msg.edit_text.assert_called_once()
        assert "Error" in thinking_msg.edit_text.call_args[0][0]


# ── Metrics Command Tests ────────────────────────────────────────────


class TestMetricsCommand:
    """Test /metrics command handler."""

    def test_unauthorized_rejected(self):
        from tools.notification_bot_handler import metrics_command
        update = _make_update(chat_id=999)
        context = _make_context()

        asyncio.run(metrics_command(update, context))

        update.message.reply_text.assert_called_once_with("Unauthorized.")

    @patch('tools.notification_bot_handler.subprocess.run')
    def test_success_shows_metrics(self, mock_run):
        from tools.notification_bot_handler import metrics_command
        update = _make_update(chat_id=123456789)
        context = _make_context()

        thinking_msg = AsyncMock()
        update.message.reply_text = AsyncMock(return_value=thinking_msg)

        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="<b>Server Metrics</b>\nCPU: 15%",
            stderr=""
        )

        asyncio.run(metrics_command(update, context))

        thinking_msg.delete.assert_called_once()
        update.message.reply_html.assert_called_once()


# ── Run Command Tests ────────────────────────────────────────────────


class TestRunCmd:
    """Test the _run_cmd helper."""

    @patch('tools.notification_bot_handler.IS_LOCAL', False)
    @patch('tools.notification_bot_handler.subprocess.run')
    def test_remote_uses_ssh(self, mock_run):
        from tools.notification_bot_handler import _run_cmd

        mock_run.return_value = MagicMock(stdout="ok", returncode=0)

        result = _run_cmd("echo ok")

        args = mock_run.call_args[0][0]
        assert "ssh" in args
        assert result.stdout == "ok"

    @patch('tools.notification_bot_handler.IS_LOCAL', True)
    @patch('tools.notification_bot_handler.subprocess.run')
    def test_local_uses_bash(self, mock_run):
        from tools.notification_bot_handler import _run_cmd

        mock_run.return_value = MagicMock(stdout="ok", returncode=0)

        result = _run_cmd("echo ok")

        args = mock_run.call_args[0][0]
        assert "bash" in args


# ── IsOnServer Test ──────────────────────────────────────────────────


class TestIsOnServer:
    """Test the _is_on_server() function."""

    @patch('tools.notification_bot_handler.sys.platform', 'win32')
    def test_returns_false_on_windows(self):
        from tools.notification_bot_handler import _is_on_server
        assert _is_on_server() is False

    @patch('tools.notification_bot_handler.sys.platform', 'linux')
    @patch('tools.notification_bot_handler.subprocess.run')
    def test_returns_true_when_server_ip_found(self, mock_run):
        from tools.notification_bot_handler import _is_on_server, SERVER_IP
        mock_run.return_value = MagicMock(stdout=f"10.0.0.1 {SERVER_IP} ", returncode=0)

        assert _is_on_server() is True

    @patch('tools.notification_bot_handler.sys.platform', 'linux')
    @patch('tools.notification_bot_handler.subprocess.run')
    def test_returns_false_when_different_ip(self, mock_run):
        from tools.notification_bot_handler import _is_on_server
        mock_run.return_value = MagicMock(stdout="10.0.0.1 192.168.1.1 ", returncode=0)

        assert _is_on_server() is False
