#!/usr/bin/env python3
"""
Project Status Tracker for Wibecode
Tracks MVP recovery progress: core features + re-enablement of disabled features.
"""

import os
import sys
import re
import codecs
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple


class ProjectStatusTracker:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)

    def _file_exists(self, path: str) -> bool:
        return (self.project_root / path).is_file()

    def _dir_exists(self, path: str) -> bool:
        return (self.project_root / path).is_dir()

    def _file_contains(self, path: str, text: str) -> bool:
        full_path = self.project_root / path
        if not full_path.is_file():
            return False
        try:
            content = full_path.read_text(encoding='utf-8')
            return text.lower() in content.lower()
        except Exception:
            return False

    def _file_contains_pattern(self, path: str, pattern: str) -> bool:
        full_path = self.project_root / path
        if not full_path.is_file():
            return False
        try:
            content = full_path.read_text(encoding='utf-8')
            return bool(re.search(pattern, content, re.IGNORECASE))
        except Exception:
            return False

    def _route_is_enabled(self, route_text: str) -> bool:
        """Check if a route is active (NOT commented with [MVP-DISABLED]) in server.ts"""
        full_path = self.project_root / "bot" / "src" / "api" / "server.ts"
        if not full_path.is_file():
            return False
        try:
            content = full_path.read_text(encoding='utf-8')
            for line in content.split('\n'):
                if route_text in line:
                    stripped = line.strip()
                    if stripped.startswith('// [MVP-DISABLED]'):
                        return False
                    return True
            return False
        except Exception:
            return False

    def _page_is_enabled(self, page_name: str) -> bool:
        """Check if a page lazy import is active (NOT commented) in App.tsx"""
        full_path = self.project_root / "mini-app" / "src" / "App.tsx"
        if not full_path.is_file():
            return False
        try:
            content = full_path.read_text(encoding='utf-8')
            for line in content.split('\n'):
                if f"import('@/pages/{page_name}" in line or f"import(\"@/pages/{page_name}" in line:
                    stripped = line.strip()
                    if stripped.startswith('// [MVP-DISABLED]') or stripped.startswith('{/* [MVP-DISABLED]'):
                        return False
                    return True
            return False
        except Exception:
            return False

    def _job_is_enabled(self, job_name: str) -> bool:
        """Check if a job import is active (NOT commented) in registerJobs.ts"""
        full_path = self.project_root / "bot" / "src" / "jobs" / "registerJobs.ts"
        if not full_path.is_file():
            return False
        try:
            content = full_path.read_text(encoding='utf-8')
            for line in content.split('\n'):
                if job_name in line and 'import' in line:
                    stripped = line.strip()
                    if stripped.startswith('// [MVP-DISABLED]'):
                        return False
                    return True
            return False
        except Exception:
            return False

    def _get_milestones(self) -> Dict[str, Dict]:
        return {
            "mvp_core": {
                "name": "MVP Core",
                "emoji": "\U0001F3D7\uFE0F",
                "weight": 20,
                "tasks": [
                    {"name": "Bot framework running", "check": lambda: self._file_exists("bot/src/index.ts")},
                    {"name": "Database schema", "check": lambda: self._file_exists("database/schema.sql")},
                    {"name": "Deploy config (yakutsa.ru)", "check": lambda: self._file_contains("ecosystem.config.js", "yakutsa.ru")},
                    {"name": "User routes enabled", "check": lambda: self._route_is_enabled("userRouter")},
                    {"name": "Quest routes enabled", "check": lambda: self._route_is_enabled("questRouter")},
                    {"name": "Mode routes enabled", "check": lambda: self._route_is_enabled("modeRouter")},
                    {"name": "Leaderboard routes enabled", "check": lambda: self._route_is_enabled("leaderboardRouter")},
                    {"name": "Onboarding routes enabled", "check": lambda: self._route_is_enabled("onboardingRouter")},
                    {"name": "Check-in routes enabled", "check": lambda: self._route_is_enabled("checkinRouter")},
                    {"name": "Dashboard page", "check": lambda: self._file_exists("mini-app/src/pages/Dashboard.tsx")},
                    {"name": "Quests page", "check": lambda: self._file_exists("mini-app/src/pages/Quests.tsx")},
                    {"name": "Profile page", "check": lambda: self._file_exists("mini-app/src/pages/Profile.tsx")},
                    {"name": "Leaderboard page", "check": lambda: self._file_exists("mini-app/src/pages/Leaderboard.tsx")},
                    {"name": "Settings page", "check": lambda: self._file_exists("mini-app/src/pages/Settings.tsx")},
                ]
            },
            "achievements": {
                "name": "Achievements & Trophies",
                "emoji": "\U0001F3C6",
                "weight": 12,
                "tasks": [
                    {"name": "Achievement route enabled", "check": lambda: self._route_is_enabled("achievementRouter")},
                    {"name": "Trophy route enabled", "check": lambda: self._route_is_enabled("trophyRouter")},
                    {"name": "Achievements page enabled", "check": lambda: self._page_is_enabled("Achievements")},
                    {"name": "TrophyCase page enabled", "check": lambda: self._page_is_enabled("TrophyCase")},
                    {"name": "Achievement batch job enabled", "check": lambda: self._job_is_enabled("achievementBatchCheck")},
                    {"name": "Achievement notifier job enabled", "check": lambda: self._job_is_enabled("achievementNotifier")},
                    {"name": "Achievement tests exist", "check": lambda: self._file_exists("bot/src/__tests__/routes/achievements.test.ts")},
                ]
            },
            "payments": {
                "name": "Payments & Subscriptions",
                "emoji": "\U0001F4B3",
                "weight": 10,
                "tasks": [
                    {"name": "Payment route enabled", "check": lambda: self._route_is_enabled("paymentRouter")},
                    {"name": "Payment route file exists", "check": lambda: self._file_exists("bot/src/api/routes/payments.ts")},
                    {"name": "Premium gate middleware", "check": lambda: self._file_exists("bot/src/api/middleware/premiumGate.ts")},
                    {"name": "Payment DB tables", "check": lambda: self._file_contains_pattern("database/schema.sql", r"CREATE TABLE.*payment")},
                    {"name": "Subscription management", "check": lambda: self._file_contains_pattern("bot/src/api/routes/payments.ts", r"subscription|upgrade|cancel")},
                ]
            },
            "shop_inventory": {
                "name": "Shop & Inventory",
                "emoji": "\U0001F6D2",
                "weight": 10,
                "tasks": [
                    {"name": "Shop route enabled", "check": lambda: self._route_is_enabled("shopRouter")},
                    {"name": "Inventory route enabled", "check": lambda: self._route_is_enabled("inventoryRouter")},
                    {"name": "Avatar route enabled", "check": lambda: self._route_is_enabled("avatarRouter")},
                    {"name": "Shop page enabled", "check": lambda: self._page_is_enabled("Shop")},
                    {"name": "Inventory page enabled", "check": lambda: self._page_is_enabled("Inventory")},
                    {"name": "AvatarCustomizer page enabled", "check": lambda: self._page_is_enabled("AvatarCustomizer")},
                ]
            },
            "social": {
                "name": "Social Features",
                "emoji": "\U0001F465",
                "weight": 10,
                "tasks": [
                    {"name": "Social route enabled", "check": lambda: self._route_is_enabled("socialRouter")},
                    {"name": "Social page enabled", "check": lambda: self._page_is_enabled("Social")},
                    {"name": "Friend requests table", "check": lambda: self._file_contains_pattern("database/schema.sql", r"friend_requests")},
                    {"name": "Challenges table", "check": lambda: self._file_contains_pattern("database/schema.sql", r"CREATE TABLE.*challenges")},
                    {"name": "Challenge participants table", "check": lambda: self._file_contains_pattern("database/schema.sql", r"challenge_participants")},
                ]
            },
            "finance": {
                "name": "Finance Mode",
                "emoji": "\U0001F4B0",
                "weight": 8,
                "tasks": [
                    {"name": "Finance route enabled", "check": lambda: self._route_is_enabled("financeRouter")},
                    {"name": "Finance page enabled", "check": lambda: self._page_is_enabled("Finance")},
                    {"name": "Budget tracker component", "check": lambda: self._file_exists("mini-app/src/components/finance/BudgetTracker.tsx")},
                    {"name": "Savings goal component", "check": lambda: self._file_exists("mini-app/src/components/finance/SavingsGoal.tsx")},
                ]
            },
            "content_activities": {
                "name": "Content & Activities",
                "emoji": "\U0001F4DA",
                "weight": 10,
                "tasks": [
                    {"name": "Content route enabled", "check": lambda: self._route_is_enabled("contentRouter")},
                    {"name": "Activity route enabled", "check": lambda: self._route_is_enabled("activityRouter")},
                    {"name": "ContentFeed page enabled", "check": lambda: self._page_is_enabled("ContentFeed")},
                    {"name": "ActivityHub page enabled", "check": lambda: self._page_is_enabled("ActivityHub")},
                    {"name": "ActivityHistory page enabled", "check": lambda: self._page_is_enabled("ActivityHistory")},
                    {"name": "Recommendations route enabled", "check": lambda: self._route_is_enabled("recommendationRouter")},
                ]
            },
            "admin": {
                "name": "Admin Panel",
                "emoji": "\u2699\uFE0F",
                "weight": 10,
                "tasks": [
                    {"name": "Admin route enabled", "check": lambda: self._route_is_enabled("adminRouter")},
                    {"name": "Admin auth middleware", "check": lambda: self._file_exists("bot/src/api/middleware/adminAuth.ts")},
                    {"name": "AdminDashboard page enabled", "check": lambda: self._page_is_enabled("AdminDashboard")},
                    {"name": "AdminPlayerList page enabled", "check": lambda: self._page_is_enabled("AdminPlayerList")},
                    {"name": "AdminPlayerDetail page enabled", "check": lambda: self._page_is_enabled("AdminPlayerDetail")},
                ]
            },
            "i18n": {
                "name": "i18n & Localization",
                "emoji": "\U0001F310",
                "weight": 5,
                "tasks": [
                    {"name": "i18n framework", "check": lambda: self._file_exists("mini-app/src/i18n/index.ts")},
                    {"name": "Russian translations", "check": lambda: self._file_exists("mini-app/src/i18n/ru.ts") and self._file_contains("mini-app/src/i18n/ru.ts", "onboarding")},
                    {"name": "Chinese translations", "check": lambda: self._file_exists("mini-app/src/i18n/zh.ts") and self._file_contains("mini-app/src/i18n/zh.ts", "onboarding")},
                    {"name": "Bot messages localized", "check": lambda: self._file_exists("bot/src/i18n/messages.ts")},
                ]
            },
            "quality": {
                "name": "Quality & Polish",
                "emoji": "\u2728",
                "weight": 5,
                "tasks": [
                    {"name": "Core pages exist", "check": lambda: self._file_exists("mini-app/src/pages/Dashboard.tsx") and self._file_exists("mini-app/src/pages/Quests.tsx")},
                    {"name": "PWA manifest", "check": lambda: self._file_exists("mini-app/public/manifest.json")},
                    {"name": "Onboarding flow", "check": lambda: self._file_exists("mini-app/src/pages/Onboarding.tsx")},
                    {"name": "Settings page", "check": lambda: self._file_exists("mini-app/src/pages/Settings.tsx")},
                    {"name": "Theme support", "check": lambda: self._file_contains_pattern("mini-app/src/pages/Settings.tsx", r"theme|themeParams")},
                    {"name": "Notification bot", "check": lambda: self._file_exists("tools/notification_bot_handler.py")},
                ]
            },
        }

    def calculate_progress(self) -> Tuple[float, Dict]:
        milestones = self._get_milestones()
        milestone_status = {}
        total_weight = 0
        completed_weight = 0

        for mid, milestone in milestones.items():
            tasks = milestone['tasks']
            completed_tasks = sum(1 for task in tasks if task['check']())
            total_tasks = len(tasks)
            progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

            milestone_status[mid] = {
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
        return '\u2588' * filled + '\u2591' * (length - filled)

    def format_telegram_message(self) -> str:
        overall, milestones = self.calculate_progress()

        msg = f"<b>\U0001F4CA Wibecode Project Status</b>\n\n"
        msg += f"<b>Overall: {overall:.0f}%</b>\n"
        msg += f"<code>{self.progress_bar(overall, 20)}</code>\n\n"

        for mid, ms in milestones.items():
            icon = "\u2705" if ms['progress'] == 100 else ("\U0001F504" if ms['progress'] > 0 else "\u23F3")
            msg += f"{icon} <b>{ms['emoji']} {ms['name']}</b> ({ms['completed']}/{ms['total']})\n"
            msg += f"   <code>{self.progress_bar(ms['progress'])}</code> {ms['progress']:.0f}%\n"

            # Show what's left (max 3 items)
            todo = [t['name'] for t in ms['tasks'] if not t['done']]
            for item in todo[:3]:
                msg += f"   \u2022 {item}\n"
            if len(todo) > 3:
                msg += f"   \u2022 <i>...and {len(todo) - 3} more</i>\n"
            msg += "\n"

        # Next priorities
        msg += "<b>\U0001F4DD Next Priorities:</b>\n"
        priorities = []
        for mid, ms in milestones.items():
            if ms['progress'] < 100:
                todo = [t['name'] for t in ms['tasks'] if not t['done']]
                if todo:
                    priorities.append(f"{ms['emoji']} {todo[0]}")
        for p in priorities[:5]:
            msg += f"\u2022 {p}\n"

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
