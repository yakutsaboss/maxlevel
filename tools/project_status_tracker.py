#!/usr/bin/env python3
"""
Project Status Tracker for Wibecode
Analyzes actual project state and calculates completion percentage.
"""

import os
import json
import sys
import codecs
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple


class ProjectStatusTracker:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.milestones = self._define_milestones()

    def _define_milestones(self) -> Dict[str, Dict]:
        """Define project milestones matching actual project structure"""
        return {
            "setup": {
                "name": "Project Setup",
                "emoji": "🎯",
                "weight": 8,
                "tasks": [
                    {"name": "WAT framework (CLAUDE.md)", "check": lambda: self._file_exists("CLAUDE.md")},
                    {"name": "Environment config (.env)", "check": lambda: self._file_exists(".env")},
                    {"name": "Git repository", "check": lambda: self._dir_exists(".git")},
                    {"name": "Docker setup", "check": lambda: self._file_exists("docker-compose.yml")},
                    {"name": "PM2 ecosystem config", "check": lambda: self._file_exists("ecosystem.config.js")},
                    {"name": "Centralized config module", "check": lambda: self._file_exists("bot/src/config.ts")},
                ]
            },
            "database": {
                "name": "Database Layer",
                "emoji": "🗄️",
                "weight": 12,
                "tasks": [
                    {"name": "Schema (PostgreSQL)", "check": lambda: self._file_exists("database/schema.sql")},
                    {"name": "Seed data", "check": lambda: self._file_exists("database/seed_data.sql")},
                    {"name": "DB operations tool", "check": lambda: self._file_exists("tools/db_operations.py")},
                    {"name": "User manager tool", "check": lambda: self._file_exists("tools/user_manager.py")},
                    {"name": "Quest manager tool", "check": lambda: self._file_exists("tools/quest_manager.py")},
                    {"name": "Mode manager tool", "check": lambda: self._file_exists("tools/mode_manager.py")},
                    {"name": "Achievement manager tool", "check": lambda: self._file_exists("tools/achievement_manager.py")},
                    {"name": "Migrations framework", "check": lambda: self._dir_exists("database/migrations")},
                    {"name": "Leaderboard materialized view", "check": lambda: self._file_exists("database/migrations/001_leaderboard_and_activity.sql")},
                ]
            },
            "bot": {
                "name": "Telegram Bot Core",
                "emoji": "🤖",
                "weight": 20,
                "tasks": [
                    {"name": "Bot instance (Grammy)", "check": lambda: self._file_exists("bot/src/bot.ts")},
                    {"name": "Entry point", "check": lambda: self._file_exists("bot/src/index.ts")},
                    {"name": "/start + onboarding", "check": lambda: self._file_exists("bot/src/handlers/onboarding.ts")},
                    {"name": "Mini app handler", "check": lambda: self._file_exists("bot/src/handlers/miniapp.ts")},
                    {"name": "Webhook support", "check": lambda: self._file_contains("bot/src/index.ts", "webhook")},
                    {"name": "Python tools bridge", "check": lambda: self._file_exists("bot/src/utils/pythonTools.ts")},
                    {"name": "Notification system", "check": lambda: self._file_exists("tools/notification_bot_handler.py")},
                ]
            },
            "api": {
                "name": "REST API",
                "emoji": "🔌",
                "weight": 12,
                "tasks": [
                    {"name": "Express server + middleware", "check": lambda: self._file_exists("bot/src/api/server.ts")},
                    {"name": "Auth middleware", "check": lambda: self._file_exists("bot/src/api/middleware/auth.ts")},
                    {"name": "Users routes", "check": lambda: self._file_exists("bot/src/api/routes/users.ts")},
                    {"name": "Quests routes", "check": lambda: self._file_exists("bot/src/api/routes/quests.ts")},
                    {"name": "Achievements routes", "check": lambda: self._file_exists("bot/src/api/routes/achievements.ts")},
                    {"name": "Modes routes", "check": lambda: self._file_exists("bot/src/api/routes/modes.ts")},
                    {"name": "Admin routes", "check": lambda: self._file_exists("bot/src/api/routes/admin.ts")},
                ]
            },
            "jobs": {
                "name": "Background Jobs (pg-boss)",
                "emoji": "⚙️",
                "weight": 10,
                "tasks": [
                    {"name": "Job queue manager (boss.ts)", "check": lambda: self._file_exists("bot/src/jobs/boss.ts")},
                    {"name": "Job registration", "check": lambda: self._file_exists("bot/src/jobs/registerJobs.ts")},
                    {"name": "Daily quest reset job", "check": lambda: self._file_exists("bot/src/jobs/definitions/dailyQuestReset.ts")},
                    {"name": "Streak check job", "check": lambda: self._file_exists("bot/src/jobs/definitions/streakCheck.ts")},
                    {"name": "Quest reminders job", "check": lambda: self._file_exists("bot/src/jobs/definitions/questReminders.ts")},
                    {"name": "Leaderboard refresh job", "check": lambda: self._file_exists("bot/src/jobs/definitions/leaderboardRefresh.ts")},
                    {"name": "DB cleanup job", "check": lambda: self._file_exists("bot/src/jobs/definitions/dbCleanup.ts")},
                    {"name": "Analytics export job", "check": lambda: self._file_exists("bot/src/jobs/definitions/analyticsExport.ts")},
                    {"name": "Streak manager tool", "check": lambda: self._file_exists("tools/streak_manager.py")},
                    {"name": "Sheets analytics export tool", "check": lambda: self._file_exists("tools/sheets_analytics_export.py")},
                    {"name": "Jobs integrated in index.ts", "check": lambda: self._file_contains("bot/src/index.ts", "startJobQueue")},
                ]
            },
            "miniapp": {
                "name": "Mini App Frontend",
                "emoji": "🎨",
                "weight": 15,
                "tasks": [
                    {"name": "React + Vite setup", "check": lambda: self._file_exists("mini-app/vite.config.ts")},
                    {"name": "Tailwind CSS", "check": lambda: self._file_exists("mini-app/tailwind.config.js")},
                    {"name": "App component", "check": lambda: self._file_exists("mini-app/src/App.tsx")},
                    {"name": "Page components", "check": lambda: self._dir_exists("mini-app/src/pages")},
                    {"name": "API hooks", "check": lambda: self._dir_exists("mini-app/src/hooks")},
                    {"name": "Telegram WebApp SDK", "check": lambda: self._html_contains("mini-app", "telegram-web-app.js")},
                    {"name": "Production build", "check": lambda: self._file_exists("mini-app/dist/index.html")},
                ]
            },
            "workflows": {
                "name": "Workflows & SOPs",
                "emoji": "📋",
                "weight": 8,
                "tasks": [
                    {"name": "Database operations", "check": lambda: self._file_exists("workflows/database_operations.md")},
                    {"name": "User management", "check": lambda: self._file_exists("workflows/user_management.md")},
                    {"name": "Quest management", "check": lambda: self._file_exists("workflows/quest_management.md")},
                    {"name": "Mode management", "check": lambda: self._file_exists("workflows/mode_management.md")},
                    {"name": "Achievement management", "check": lambda: self._file_exists("workflows/achievement_management.md")},
                    {"name": "Onboarding flow", "check": lambda: self._file_exists("workflows/onboarding_flow.md")},
                    {"name": "API reference", "check": lambda: self._file_exists("workflows/api_endpoints_reference.md")},
                    {"name": "Mini app auth", "check": lambda: self._file_exists("workflows/telegram_miniapp_authentication.md")},
                ]
            },
            "deployment": {
                "name": "Deployment & DevOps",
                "emoji": "🚀",
                "weight": 15,
                "tasks": [
                    {"name": "Dockerfile", "check": lambda: self._file_exists("Dockerfile")},
                    {"name": "docker-compose.yml", "check": lambda: self._file_exists("docker-compose.yml")},
                    {"name": "Deployment docs", "check": lambda: self._file_exists("docs/TIMEWEB_DEPLOYMENT.md")},
                    {"name": "CI/CD pipeline (GitHub Actions)", "check": lambda: self._file_exists(".github/workflows/deploy.yml")},
                    {"name": "Server provisioned (Timeweb VDS)", "check": lambda: self._file_contains(".github/workflows/deploy.yml", "SSH_HOST")},
                    {"name": "SSL/HTTPS configured", "check": lambda: False},  # Manual check
                ]
            },
        }

    def _file_exists(self, path: str) -> bool:
        return (self.project_root / path).is_file()

    def _dir_exists(self, path: str) -> bool:
        return (self.project_root / path).is_dir()

    def _file_contains(self, path: str, text: str) -> bool:
        full_path = self.project_root / path
        if not full_path.is_file():
            return False
        try:
            content = full_path.read_text(encoding='utf-8').lower()
            return text.lower() in content
        except Exception:
            return False

    def _html_contains(self, directory: str, text: str) -> bool:
        dir_path = self.project_root / directory
        if not dir_path.is_dir():
            return False
        for html_file in dir_path.rglob("*.html"):
            try:
                if text in html_file.read_text(encoding='utf-8'):
                    return True
            except Exception:
                continue
        return False

    def calculate_progress(self) -> Tuple[float, Dict]:
        milestone_status = {}
        total_weight = 0
        completed_weight = 0

        for milestone_id, milestone in self.milestones.items():
            tasks = milestone['tasks']
            completed_tasks = sum(1 for task in tasks if task['check']())
            total_tasks = len(tasks)
            progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

            milestone_status[milestone_id] = {
                'name': milestone['name'],
                'emoji': milestone['emoji'],
                'weight': milestone['weight'],
                'progress': progress,
                'completed': completed_tasks,
                'total': total_tasks,
                'tasks': [
                    {'name': task['name'], 'done': task['check']()}
                    for task in tasks
                ]
            }

            total_weight += milestone['weight']
            completed_weight += (progress / 100) * milestone['weight']

        overall = (completed_weight / total_weight * 100) if total_weight > 0 else 0
        return overall, milestone_status

    def progress_bar(self, pct: float, length: int = 10) -> str:
        filled = int(length * pct / 100)
        return '█' * filled + '░' * (length - filled)

    def format_telegram_message(self) -> str:
        overall, milestones = self.calculate_progress()

        msg = f"<b>📊 Wibecode Project Status</b>\n\n"
        msg += f"<b>Overall: {overall:.0f}%</b>\n"
        msg += f"<code>{self.progress_bar(overall, 20)}</code>\n\n"

        for mid, ms in milestones.items():
            icon = "✅" if ms['progress'] == 100 else ("🔄" if ms['progress'] > 0 else "⏳")
            msg += f"{icon} <b>{ms['emoji']} {ms['name']}</b> ({ms['completed']}/{ms['total']})\n"
            msg += f"   <code>{self.progress_bar(ms['progress'])}</code> {ms['progress']:.0f}%\n"

            # Show what's left (max 3 items)
            todo = [t['name'] for t in ms['tasks'] if not t['done']]
            for item in todo[:3]:
                msg += f"   • {item}\n"
            if len(todo) > 3:
                msg += f"   • <i>...and {len(todo) - 3} more</i>\n"
            msg += "\n"

        # Next priorities
        msg += "<b>📝 Next Priorities:</b>\n"
        priorities = []
        for mid, ms in milestones.items():
            if ms['progress'] < 100:
                todo = [t['name'] for t in ms['tasks'] if not t['done']]
                if todo:
                    priorities.append(f"{ms['emoji']} {todo[0]}")
        for p in priorities[:4]:
            msg += f"• {p}\n"

        msg += f"\n<i>{datetime.now().strftime('%Y-%m-%d %H:%M')}</i>"
        return msg


def main():
    if sys.platform == 'win32':
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

    project_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    tracker = ProjectStatusTracker(project_root)
    print(tracker.format_telegram_message())


if __name__ == "__main__":
    main()
