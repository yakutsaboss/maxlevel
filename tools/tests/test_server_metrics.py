#!/usr/bin/env python3
"""Tests for tools/server_metrics.py — mocks SSH/subprocess, no real server calls."""

import os
import sys
import json
import pytest
from unittest.mock import MagicMock, patch, mock_open
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


# ── ssh_exec Tests ───────────────────────────────────────────────────


class TestSshExec:
    """Test the ssh_exec() helper."""

    @patch('tools.server_metrics.IS_LOCAL', False)
    @patch('tools.server_metrics.subprocess.run')
    def test_remote_uses_ssh(self, mock_run):
        from tools.server_metrics import ssh_exec

        mock_run.return_value = MagicMock(stdout="ok\n", returncode=0)

        result = ssh_exec("echo ok")

        assert result == "ok"
        args = mock_run.call_args[0][0]
        assert "ssh" in args

    @patch('tools.server_metrics.IS_LOCAL', True)
    @patch('tools.server_metrics.subprocess.run')
    def test_local_uses_bash(self, mock_run):
        from tools.server_metrics import ssh_exec

        mock_run.return_value = MagicMock(stdout="ok\n", returncode=0)

        result = ssh_exec("echo ok")

        assert result == "ok"
        args = mock_run.call_args[0][0]
        assert "bash" in args

    @patch('tools.server_metrics.IS_LOCAL', False)
    @patch('tools.server_metrics.subprocess.run', side_effect=Exception("SSH failed"))
    def test_returns_empty_on_exception(self, mock_run):
        from tools.server_metrics import ssh_exec

        result = ssh_exec("echo ok")

        assert result == ""

    @patch('tools.server_metrics.IS_LOCAL', False)
    @patch('tools.server_metrics.subprocess.run')
    def test_timeout_returns_empty(self, mock_run):
        import subprocess as sp
        from tools.server_metrics import ssh_exec

        mock_run.side_effect = sp.TimeoutExpired(cmd="ssh", timeout=15)

        result = ssh_exec("long command")

        assert result == ""


# ── _safe_split Tests ────────────────────────────────────────────────


class TestSafeSplit:
    """Test the _safe_split() helper."""

    def test_extracts_section_between_markers(self):
        from tools.server_metrics import _safe_split

        raw = "prefix MARK_A data here MARK_B suffix"
        result = _safe_split(raw, "MARK_A", "MARK_B")

        assert result == " data here "

    def test_returns_none_when_start_missing(self):
        from tools.server_metrics import _safe_split

        raw = "no markers here"
        result = _safe_split(raw, "MARK_A", "MARK_B")

        assert result is None

    def test_returns_rest_when_end_missing(self):
        from tools.server_metrics import _safe_split

        raw = "prefix MARK_A data here"
        result = _safe_split(raw, "MARK_A", "MARK_B")

        assert result == " data here"

    def test_empty_end_marker(self):
        from tools.server_metrics import _safe_split

        raw = "prefix MARK_A data here more stuff"
        result = _safe_split(raw, "MARK_A", "")

        assert result == " data here more stuff"


# ── collect_metrics Tests ────────────────────────────────────────────


class TestCollectMetrics:
    """Test collect_metrics() parsing logic."""

    @patch('tools.server_metrics.ssh_exec')
    def test_ssh_failure_returns_error(self, mock_ssh):
        from tools.server_metrics import collect_metrics

        mock_ssh.return_value = ""

        result = collect_metrics()

        assert "error" in result
        assert "SSH connection failed" in result["error"]

    @patch('tools.server_metrics.ssh_exec')
    def test_parses_cpu_from_top_output(self, mock_ssh):
        from tools.server_metrics import collect_metrics

        mock_ssh.return_value = (
            "MARK_CPU\n"
            "top - 10:00:00 up 5 days\n"
            "Tasks: 100 total\n"
            "%Cpu(s):  5.3 us,  2.1 sy,  0.0 ni, 92.0 id,  0.6 wa\n"
            "MARK_MEM\n"
            "              total        used        free      shared  buff/cache   available\n"
            "Mem:           1994         800         200         100         994        1000\n"
            "MARK_DISK\n"
            "Filesystem      Size  Used Avail Use% Mounted on\n"
            "/dev/vda2        39G   15G   22G  41% /\n"
            "MARK_PM2\n"
            "[]\n"
            "MARK_UPTIME\n"
            " 10:00:00 up 5 days,  2:30,  1 user,  load average: 0.10, 0.15, 0.20"
        )

        result = collect_metrics()

        assert result['cpu_used_pct'] == 8.0  # 100 - 92.0
        assert result['ram_total_mb'] == 1994
        assert result['ram_used_mb'] == 800
        assert result['ram_available_mb'] == 1000
        assert result['disk_total'] == '39G'
        assert result['disk_used'] == '15G'
        assert result['disk_used_pct'] == 41

    @patch('tools.server_metrics.ssh_exec')
    def test_parses_pm2_data(self, mock_ssh):
        from tools.server_metrics import collect_metrics

        pm2_data = json.dumps([{
            "name": "telegram-rpg-bot",
            "pm2_env": {"status": "online", "pm_uptime": 1700000000000},
            "monit": {"memory": 104857600, "cpu": 3}
        }])

        mock_ssh.return_value = (
            "MARK_CPU\n"
            "%Cpu(s): 95.0 id\n"
            "MARK_MEM\n"
            "Mem: 2000 500 1000 100 500 1400\n"
            "MARK_DISK\n"
            "/dev/vda2 40G 10G 28G 27% /\n"
            f"MARK_PM2\n{pm2_data}\n"
            "MARK_UPTIME\nup 1 day"
        )

        result = collect_metrics()

        assert result['pm2_name'] == 'telegram-rpg-bot'
        assert result['pm2_status'] == 'online'
        assert result['pm2_memory_mb'] == 100.0  # 104857600 / 1024 / 1024
        assert result['pm2_cpu'] == 3

    @patch('tools.server_metrics.ssh_exec')
    def test_handles_pm2_parse_error(self, mock_ssh):
        from tools.server_metrics import collect_metrics

        mock_ssh.return_value = (
            "MARK_CPU\n%Cpu(s): 90.0 id\n"
            "MARK_MEM\nMem: 2000 500 1000 100 500 1400\n"
            "MARK_DISK\n/dev/vda2 40G 10G 28G 27% /\n"
            "MARK_PM2\nNOT VALID JSON\n"
            "MARK_UPTIME\nup 1 day"
        )

        result = collect_metrics()

        assert result['pm2_status'] == 'parse error'


# ── Format Tests ─────────────────────────────────────────────────────


class TestFormatCurrent:
    """Test format_current() output."""

    def test_error_metrics(self):
        from tools.server_metrics import format_current

        result = format_current({"error": "SSH connection failed"})

        assert "Server Metrics" in result
        assert "SSH connection failed" in result

    def test_normal_metrics(self):
        from tools.server_metrics import format_current

        metrics = {
            'cpu_used_pct': 15.0,
            'ram_used_mb': 800,
            'ram_total_mb': 2000,
            'ram_used_pct': 40.0,
            'disk_used': '15G',
            'disk_total': '40G',
            'disk_used_pct': 38,
            'pm2_memory_mb': 100.0,
            'pm2_status': 'online',
            'pm2_uptime': '5d 2h',
        }

        result = format_current(metrics)

        assert "CPU: 15.0%" in result
        assert "800/2000 MB" in result
        assert "15G/40G" in result
        assert "online" in result


class TestFormatComparison:
    """Test format_comparison() output."""

    def test_normal_comparison(self):
        from tools.server_metrics import format_comparison

        start = {
            'timestamp': '2025-01-01T10:00:00',
            'cpu_used_pct': 10.0,
            'ram_used_mb': 500,
            'ram_total_mb': 2000,
            'pm2_memory_mb': 80.0,
            'disk_used': '15G',
            'disk_total': '40G',
        }
        end = {
            'timestamp': '2025-01-01T11:30:00',
            'cpu_used_pct': 25.0,
            'ram_used_mb': 700,
            'ram_total_mb': 2000,
            'pm2_memory_mb': 100.0,
            'disk_used': '16G',
            'disk_total': '40G',
        }

        result = format_comparison(start, end)

        assert "1h 30m" in result
        assert "10.0% -> 25.0%" in result
        assert "+15.0%" in result
        assert "500/2000 MB -> 700/2000 MB" in result


class TestFormatStartSummary:
    """Test format_start_summary() output."""

    def test_error_returns_failure_message(self):
        from tools.server_metrics import format_start_summary

        result = format_start_summary({"error": "SSH failed"})

        assert "connection failed" in result

    def test_normal_summary(self):
        from tools.server_metrics import format_start_summary

        metrics = {
            'cpu_used_pct': 12.0,
            'ram_used_mb': 800,
            'ram_total_mb': 2000,
            'ram_used_pct': 40.0,
        }

        result = format_start_summary(metrics)

        assert "CPU 12.0%" in result
        assert "RAM 40.0%" in result
