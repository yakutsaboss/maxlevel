#!/usr/bin/env python3
"""
Server Metrics Tool
Captures VDS resource usage via SSH for session notifications.

Usage:
    python tools/server_metrics.py snapshot   # Save baseline to .tmp/metrics_start.json
    python tools/server_metrics.py current    # Print current metrics as JSON
    python tools/server_metrics.py report     # Compare current vs start snapshot
"""

import os
import sys
import json
import subprocess
import re
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

PROJECT_ROOT = Path(__file__).parent.parent.absolute()
load_dotenv(PROJECT_ROOT / ".env")

SERVER_IP = "85.239.53.57"
SSH_USER = "root"
SNAPSHOT_FILE = PROJECT_ROOT / ".tmp" / "metrics_start.json"


def ssh_exec(commands: str, timeout: int = 15) -> str:
    """Execute commands on remote server via SSH."""
    try:
        result = subprocess.run(
            ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=5",
             f"{SSH_USER}@{SERVER_IP}", commands],
            capture_output=True, text=True, timeout=timeout, encoding='utf-8'
        )
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return ""
    except Exception as e:
        print(f"SSH error: {e}", file=sys.stderr)
        return ""


def collect_metrics() -> dict:
    """Collect all metrics in a single SSH connection."""
    # Combine all commands into one SSH call for speed
    combined_cmd = (
        "echo MARK_CPU && top -bn1 | head -5 && "
        "echo MARK_MEM && free -m && "
        "echo MARK_DISK && df -h / && "
        "echo MARK_PM2 && (pm2 jlist 2>/dev/null || echo '[]') && "
        "echo MARK_UPTIME && uptime"
    )

    raw = ssh_exec(combined_cmd, timeout=20)
    if not raw:
        return {"error": "SSH connection failed", "timestamp": datetime.now().isoformat()}

    metrics = {"timestamp": datetime.now().isoformat()}

    # Parse CPU
    try:
        cpu_section = raw.split('MARK_CPU')[1].split('MARK_MEM')[0]
        # Look for %Cpu(s) line: e.g. "%Cpu(s):  2.0 us,  1.0 sy,  0.0 ni, 96.0 id"
        cpu_match = re.search(r'(\d+\.?\d*)\s*id', cpu_section)
        if cpu_match:
            idle = float(cpu_match.group(1))
            metrics['cpu_used_pct'] = round(100 - idle, 1)
        else:
            metrics['cpu_used_pct'] = None
    except Exception:
        metrics['cpu_used_pct'] = None

    # Parse Memory
    try:
        mem_section = raw.split('MARK_MEM')[1].split('MARK_DISK')[0]
        # Match: Mem: total used free shared buff/cache available
        # Works with both "Mem:" format from free -m
        mem_match = re.search(r'Mem:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)', mem_section)
        if mem_match:
            metrics['ram_total_mb'] = int(mem_match.group(1))
            metrics['ram_used_mb'] = int(mem_match.group(2))
            metrics['ram_available_mb'] = int(mem_match.group(6))
            metrics['ram_used_pct'] = round(
                (metrics['ram_used_mb'] / metrics['ram_total_mb']) * 100, 1
            ) if metrics['ram_total_mb'] > 0 else None
        else:
            metrics['ram_total_mb'] = None
            metrics['ram_used_mb'] = None
            metrics['ram_used_pct'] = None
    except Exception:
        metrics['ram_total_mb'] = None
        metrics['ram_used_mb'] = None
        metrics['ram_used_pct'] = None

    # Parse Disk
    try:
        disk_section = raw.split('MARK_DISK')[1].split('MARK_PM2')[0]
        # Match: /dev/vda1 20G 4.2G 15G 22% /
        disk_match = re.search(r'(\S+G)\s+(\S+G)\s+(\S+G)\s+(\d+)%\s+/', disk_section)
        if disk_match:
            metrics['disk_total'] = disk_match.group(1)
            metrics['disk_used'] = disk_match.group(2)
            metrics['disk_used_pct'] = int(disk_match.group(4))
        else:
            metrics['disk_total'] = None
            metrics['disk_used'] = None
            metrics['disk_used_pct'] = None
    except Exception:
        metrics['disk_total'] = None
        metrics['disk_used'] = None
        metrics['disk_used_pct'] = None

    # Parse PM2
    try:
        pm2_section = raw.split('MARK_PM2')[1].split('MARK_UPTIME')[0].strip()
        pm2_data = json.loads(pm2_section)
        if pm2_data:
            bot_proc = pm2_data[0]  # First process
            metrics['pm2_name'] = bot_proc.get('name', 'unknown')
            metrics['pm2_status'] = bot_proc.get('pm2_env', {}).get('status', 'unknown')
            metrics['pm2_memory_mb'] = round(
                bot_proc.get('monit', {}).get('memory', 0) / (1024 * 1024), 1
            )
            metrics['pm2_cpu'] = bot_proc.get('monit', {}).get('cpu', 0)
            # Calculate uptime
            pm_uptime = bot_proc.get('pm2_env', {}).get('pm_uptime', 0)
            if pm_uptime:
                uptime_sec = (datetime.now().timestamp() * 1000 - pm_uptime) / 1000
                days = int(uptime_sec // 86400)
                hours = int((uptime_sec % 86400) // 3600)
                metrics['pm2_uptime'] = f"{days}d {hours}h"
            else:
                metrics['pm2_uptime'] = "unknown"
        else:
            metrics['pm2_status'] = 'not running'
    except Exception:
        metrics['pm2_status'] = 'parse error'

    return metrics


def save_snapshot():
    """Save current metrics as start-of-session snapshot."""
    metrics = collect_metrics()
    SNAPSHOT_FILE.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_FILE.write_text(json.dumps(metrics, indent=2), encoding='utf-8')
    return metrics


def load_snapshot() -> dict:
    """Load start-of-session snapshot."""
    if not SNAPSHOT_FILE.is_file():
        return None
    try:
        return json.loads(SNAPSHOT_FILE.read_text(encoding='utf-8'))
    except Exception:
        return None


def format_current(metrics: dict) -> str:
    """Format current metrics as a Telegram HTML message."""
    if 'error' in metrics:
        return f"<b>Server Metrics</b>\n\n{metrics['error']}"

    cpu = f"{metrics.get('cpu_used_pct', '?')}%" if metrics.get('cpu_used_pct') is not None else "N/A"
    ram = f"{metrics.get('ram_used_mb', '?')}/{metrics.get('ram_total_mb', '?')} MB ({metrics.get('ram_used_pct', '?')}%)" \
        if metrics.get('ram_total_mb') is not None else "N/A"
    disk = f"{metrics.get('disk_used', '?')}/{metrics.get('disk_total', '?')} ({metrics.get('disk_used_pct', '?')}%)" \
        if metrics.get('disk_total') is not None else "N/A"
    pm2_mem = f"{metrics.get('pm2_memory_mb', '?')} MB" if metrics.get('pm2_memory_mb') else "N/A"
    pm2_status = metrics.get('pm2_status', 'unknown')
    pm2_uptime = metrics.get('pm2_uptime', 'unknown')

    msg = (
        f"<b>Server Metrics</b>\n\n"
        f"CPU: {cpu}\n"
        f"RAM: {ram}\n"
        f"Disk: {disk}\n"
        f"Bot Process: {pm2_mem} | uptime {pm2_uptime}\n"
        f"PM2 Status: {pm2_status}\n\n"
        f"<i>{datetime.now().strftime('%Y-%m-%d %H:%M')}</i>"
    )
    return msg


def format_comparison(start: dict, end: dict) -> str:
    """Format start vs end metrics comparison."""
    lines = []

    # Duration
    try:
        t_start = datetime.fromisoformat(start['timestamp'])
        t_end = datetime.fromisoformat(end['timestamp'])
        delta = t_end - t_start
        total_min = int(delta.total_seconds() // 60)
        hours = total_min // 60
        mins = total_min % 60
        if hours > 0:
            lines.append(f"Duration: {hours}h {mins}m")
        else:
            lines.append(f"Duration: {mins}m")
    except Exception:
        lines.append("Duration: unknown")

    # CPU
    cpu_s = start.get('cpu_used_pct')
    cpu_e = end.get('cpu_used_pct')
    if cpu_s is not None and cpu_e is not None:
        delta_cpu = cpu_e - cpu_s
        sign = "+" if delta_cpu >= 0 else ""
        lines.append(f"CPU: {cpu_s}% -> {cpu_e}% ({sign}{delta_cpu:.1f}%)")
    elif cpu_e is not None:
        lines.append(f"CPU: {cpu_e}%")

    # RAM
    ram_s = start.get('ram_used_mb')
    ram_e = end.get('ram_used_mb')
    ram_t = end.get('ram_total_mb')
    if ram_s is not None and ram_e is not None and ram_t:
        delta_ram = ram_e - ram_s
        sign = "+" if delta_ram >= 0 else ""
        lines.append(f"RAM: {ram_s}/{ram_t} MB -> {ram_e}/{ram_t} MB ({sign}{delta_ram} MB)")
    elif ram_e is not None and ram_t:
        lines.append(f"RAM: {ram_e}/{ram_t} MB")

    # Bot process
    pm2_s = start.get('pm2_memory_mb')
    pm2_e = end.get('pm2_memory_mb')
    if pm2_s is not None and pm2_e is not None:
        delta_pm2 = round(pm2_e - pm2_s, 1)
        sign = "+" if delta_pm2 >= 0 else ""
        lines.append(f"Bot process: {pm2_s} MB -> {pm2_e} MB ({sign}{delta_pm2} MB)")

    # Disk
    disk_used = end.get('disk_used')
    disk_total = end.get('disk_total')
    if disk_used and disk_total:
        lines.append(f"Disk: {disk_used}/{disk_total}")

    return "\n".join(lines)


def format_start_summary(metrics: dict) -> str:
    """Short summary for start notification."""
    if 'error' in metrics:
        return "VDS: connection failed"

    cpu = f"{metrics.get('cpu_used_pct', '?')}%" if metrics.get('cpu_used_pct') is not None else "?"
    ram_used = metrics.get('ram_used_mb', '?')
    ram_total = metrics.get('ram_total_mb', '?')
    ram_pct = metrics.get('ram_used_pct', '?')

    return f"VDS: CPU {cpu} | RAM {ram_pct}% ({ram_used}/{ram_total} MB)"


def main():
    if len(sys.argv) < 2:
        print("Usage: python server_metrics.py [snapshot|current|report]")
        sys.exit(1)

    action = sys.argv[1].lower()

    if action == "snapshot":
        metrics = save_snapshot()
        # Output short summary for hook use
        print(format_start_summary(metrics))

    elif action == "current":
        metrics = collect_metrics()
        print(json.dumps(metrics, indent=2))

    elif action == "report":
        end_metrics = collect_metrics()
        start_metrics = load_snapshot()

        if start_metrics:
            print(format_comparison(start_metrics, end_metrics))
        else:
            print(format_current(end_metrics))

    elif action == "telegram":
        # Full formatted message for /metrics bot command
        metrics = collect_metrics()
        print(format_current(metrics))

    else:
        print(f"Unknown action: {action}")
        sys.exit(1)


if __name__ == "__main__":
    main()
