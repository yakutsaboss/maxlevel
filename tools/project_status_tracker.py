#!/usr/bin/env python3
"""
Project Status Tracker for Wibecode
Tracks FEATURE-LEVEL completion, not just file existence.
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

    def _seed_has_mode(self, mode_name: str) -> bool:
        """Check if a mode is seeded (uncommented) in seed_data.sql"""
        path = self.project_root / "database" / "seed_data.sql"
        if not path.is_file():
            return False
        try:
            content = path.read_text(encoding='utf-8')
            # Match uncommented INSERT with this mode name
            for line in content.split('\n'):
                stripped = line.strip()
                if stripped.startswith('--'):
                    continue
                if f"'{mode_name}'" in stripped and 'INSERT' not in stripped:
                    # Check if it's part of an active VALUES clause
                    return True
                if f"'{mode_name}'" in stripped:
                    return True
            # Also check if it appears in a commented-out future section
            commented = [l for l in content.split('\n')
                         if l.strip().startswith('--') and f"'{mode_name}'" in l]
            if commented and not any(
                f"'{mode_name}'" in l for l in content.split('\n')
                if not l.strip().startswith('--') and f"'{mode_name}'" in l
            ):
                return False
            return f"'{mode_name}'" in content and \
                   not all(l.strip().startswith('--') for l in content.split('\n') if f"'{mode_name}'" in l)
        except Exception:
            return False

    def _has_onboarding_questions(self, mode_prefix: str) -> bool:
        """Check if onboarding questions exist for a given mode prefix (e.g. 'FITNESS', 'HYDRATION')"""
        path = self.project_root / "mini-app" / "src" / "data" / "onboardingQuestions.ts"
        if not path.is_file():
            return False
        try:
            content = path.read_text(encoding='utf-8')
            return f"{mode_prefix}_QUESTIONS" in content
        except Exception:
            return False

    def _has_achievements_for_mode(self, mode_name: str) -> bool:
        """Check if achievements exist for a mode in seed_data.sql"""
        return self._file_contains("database/seed_data.sql", f'"mode": "{mode_name}"')

    def _has_quest_templates(self, mode_name: str) -> bool:
        """Check if quest templates reference a mode in seed_data.sql"""
        path = self.project_root / "database" / "seed_data.sql"
        if not path.is_file():
            return False
        try:
            content = path.read_text(encoding='utf-8')
            return f"{mode_name}_mode_id" in content
        except Exception:
            return False

    def _route_has_logic(self, path: str, min_lines: int = 20) -> bool:
        """Check if a route file has actual logic (not just a stub)"""
        full_path = self.project_root / path
        if not full_path.is_file():
            return False
        try:
            content = full_path.read_text(encoding='utf-8')
            lines = [l for l in content.split('\n') if l.strip() and not l.strip().startswith('//')]
            return len(lines) >= min_lines
        except Exception:
            return False

    def _get_milestones(self) -> Dict[str, Dict]:
        return {
            "infra": {
                "name": "Core Infrastructure",
                "emoji": "🏗️",
                "weight": 5,
                "tasks": [
                    {"name": "Bot framework (Grammy + Express)", "check": lambda: self._file_exists("bot/src/index.ts")},
                    {"name": "Database schema", "check": lambda: self._file_exists("database/schema.sql")},
                    {"name": "PM2 + deployment config", "check": lambda: self._file_exists("ecosystem.config.js")},
                    {"name": "CI/CD pipeline", "check": lambda: self._file_exists(".github/workflows/deploy.yml")},
                    {"name": "SSL + domain (yakutsa.ru)", "check": lambda: self._file_contains("ecosystem.config.js", "yakutsa.ru")},
                    {"name": "Notification bot", "check": lambda: self._file_exists("tools/notification_bot_handler.py")},
                ]
            },
            "fitness": {
                "name": "Fitness Mode",
                "emoji": "🏋️",
                "weight": 10,
                "tasks": [
                    {"name": "Mode in database seed", "check": lambda: self._seed_has_mode("fitness")},
                    {"name": "Quest templates (daily/weekly)", "check": lambda: self._has_quest_templates("fitness")},
                    {"name": "Onboarding quiz (12 questions)", "check": lambda: self._has_onboarding_questions("FITNESS")},
                    {"name": "Achievements (5 fitness)", "check": lambda: self._has_achievements_for_mode("fitness")},
                    {"name": "Personalized plan generation", "check": lambda: False},
                    {"name": "Smart quest recommendations", "check": lambda: False},
                    {"name": "Progress analytics per mode", "check": lambda: False},
                ]
            },
            "hydration": {
                "name": "Hydration Mode",
                "emoji": "💧",
                "weight": 10,
                "tasks": [
                    {"name": "Mode in database seed", "check": lambda: self._seed_has_mode("hydration")},
                    {"name": "Quest templates (daily/weekly)", "check": lambda: self._has_quest_templates("hydration")},
                    {"name": "Onboarding quiz (7 questions)", "check": lambda: self._has_onboarding_questions("HYDRATION")},
                    {"name": "Achievements (5 hydration)", "check": lambda: self._has_achievements_for_mode("hydration")},
                    {"name": "Personalized plan generation", "check": lambda: False},
                    {"name": "Smart reminder scheduling", "check": lambda: False},
                    {"name": "Progress analytics per mode", "check": lambda: False},
                ]
            },
            "medication": {
                "name": "Medication Mode",
                "emoji": "💊",
                "weight": 12,
                "tasks": [
                    {"name": "Mode in database seed", "check": lambda: self._seed_has_mode("medication")},
                    {"name": "Onboarding quiz questions", "check": lambda: self._has_onboarding_questions("MEDICATION")},
                    {"name": "Quest templates", "check": lambda: self._has_quest_templates("medication")},
                    {"name": "Achievements", "check": lambda: self._has_achievements_for_mode("medication")},
                    {"name": "Medication schedule reminders", "check": lambda: False},
                    {"name": "Dosage tracking", "check": lambda: False},
                    {"name": "Refill alerts", "check": lambda: False},
                ]
            },
            "finance": {
                "name": "Finance Mode",
                "emoji": "💰",
                "weight": 12,
                "tasks": [
                    {"name": "Mode in database seed", "check": lambda: self._seed_has_mode("finance")},
                    {"name": "Onboarding quiz questions", "check": lambda: self._has_onboarding_questions("FINANCE")},
                    {"name": "Quest templates (saving goals)", "check": lambda: self._has_quest_templates("finance")},
                    {"name": "Achievements", "check": lambda: self._has_achievements_for_mode("finance")},
                    {"name": "Budget tracking", "check": lambda: False},
                    {"name": "Savings goal dashboard", "check": lambda: False},
                    {"name": "Expense categories", "check": lambda: False},
                ]
            },
            "habits": {
                "name": "New Habits Mode",
                "emoji": "🎯",
                "weight": 12,
                "tasks": [
                    {"name": "Mode in database seed", "check": lambda: self._seed_has_mode("habits")},
                    {"name": "Onboarding quiz questions", "check": lambda: self._has_onboarding_questions("HABITS")},
                    {"name": "Quest templates (custom habits)", "check": lambda: self._has_quest_templates("habits")},
                    {"name": "Achievements", "check": lambda: self._has_achievements_for_mode("habits")},
                    {"name": "Custom habit builder UI", "check": lambda: False},
                    {"name": "Habit streak visualization", "check": lambda: False},
                ]
            },
            "payments": {
                "name": "Payment System",
                "emoji": "💳",
                "weight": 10,
                "tasks": [
                    {"name": "Payment provider integration", "check": lambda: False},
                    {"name": "Premium tiers defined", "check": lambda: False},
                    {"name": "Subscription management", "check": lambda: False},
                    {"name": "Payment DB tables", "check": lambda: self._file_contains_pattern("database/schema.sql", r"CREATE TABLE.*payment")},
                    {"name": "Payment API routes", "check": lambda: self._file_exists("bot/src/api/routes/payments.ts")},
                    {"name": "Premium features gating", "check": lambda: False},
                ]
            },
            "sheets": {
                "name": "Google Sheets & Analytics",
                "emoji": "📊",
                "weight": 8,
                "tasks": [
                    {"name": "Export tool script", "check": lambda: self._file_exists("tools/sheets_analytics_export.py")},
                    {"name": "Google service account configured", "check": lambda: self._file_exists("service_account.json")},
                    {"name": "Spreadsheet ID in .env", "check": lambda: self._file_contains(".env", "GOOGLE_SHEETS_SPREADSHEET_ID")},
                    {"name": "Onboarding Q&A sheet per module", "check": lambda: self._file_contains_pattern("tools/sheets_analytics_export.py", r"quiz_responses|onboarding.*export|qa.*sheet")},
                    {"name": "Auto-scheduled weekly export", "check": lambda: self._file_exists("bot/src/jobs/definitions/analyticsExport.ts")},
                    {"name": "All player answers organized", "check": lambda: self._file_contains_pattern("tools/sheets_analytics_export.py", r"mode_configs|organized|per.?mode")},
                ]
            },
            "onboarding_qa": {
                "name": "Onboarding Q&A Organization",
                "emoji": "📝",
                "weight": 8,
                "tasks": [
                    {"name": "Fitness questions defined (12)", "check": lambda: self._has_onboarding_questions("FITNESS")},
                    {"name": "Hydration questions defined (7)", "check": lambda: self._has_onboarding_questions("HYDRATION")},
                    {"name": "Medication questions defined", "check": lambda: self._has_onboarding_questions("MEDICATION")},
                    {"name": "Finance questions defined", "check": lambda: self._has_onboarding_questions("FINANCE")},
                    {"name": "Habits questions defined", "check": lambda: self._has_onboarding_questions("HABITS")},
                    {"name": "All Q&A exported to Google Sheets", "check": lambda: False},
                    {"name": "Answer analytics dashboard", "check": lambda: False},
                ]
            },
            "leaderboard": {
                "name": "Leaderboard & Social",
                "emoji": "🏆",
                "weight": 8,
                "tasks": [
                    {"name": "Leaderboard route exists", "check": lambda: self._file_exists("bot/src/api/routes/leaderboard.ts")},
                    {"name": "Ranking logic implemented", "check": lambda: self._route_has_logic("bot/src/api/routes/leaderboard.ts", 30)},
                    {"name": "Mini app leaderboard page", "check": lambda: self._file_exists("mini-app/src/pages/Leaderboard.tsx")},
                    {"name": "Friend system", "check": lambda: False},
                    {"name": "Shared challenges", "check": lambda: False},
                    {"name": "Leaderboard sharing", "check": lambda: False},
                ]
            },
            "bug_fixes": {
                "name": "Bug Fixes",
                "emoji": "🐛",
                "weight": 8,
                "tasks": [
                    {
                        "name": "Barrel wheel swipe-to-close conflict",
                        "check": lambda: self._file_contains(
                            "mini-app/src/hooks/useTelegram.ts", "disableVerticalSwipes"
                        ),
                    },
                    {
                        "name": "Drum/slider/time defaults not saved on skip",
                        "check": lambda: self._file_contains(
                            "mini-app/src/components/onboarding/quiz/useQuizState.ts",
                            "Persist default values on mount"
                        ),
                    },
                    {
                        "name": "DaySelector allows over-selecting past required count",
                        "check": lambda: self._file_contains_pattern(
                            "mini-app/src/components/onboarding/ui/DaySelector.tsx",
                            r"requiredCount.*selected\.length\s*>=|disabled.*requiredCount"
                        ),
                    },
                    {
                        "name": "Double animation on quiz screens (Onboarding + QuizScreen)",
                        "check": lambda: not (
                            self._file_contains("mini-app/src/pages/Onboarding.tsx", "motion.div") and
                            self._file_contains_pattern(
                                "mini-app/src/components/onboarding/QuizScreen.tsx",
                                r"motion\.div.*initial.*opacity.*0.*x"
                            )
                        ),
                    },
                    {
                        "name": "Back button history lost on state restore",
                        "check": lambda: not self._file_contains_pattern(
                            "mini-app/src/hooks/useOnboarding.ts",
                            r"restoreState.*stepHistory:\s*\[step\]"
                        ),
                    },
                    {
                        "name": "SliderInput hardcoded 'workouts a week' text",
                        "check": lambda: not self._file_contains(
                            "mini-app/src/components/onboarding/ui/SliderInput.tsx",
                            "workouts a week"
                        ),
                    },
                ]
            },
            "russian_language": {
                "name": "Russian Language Support",
                "emoji": "🇷🇺",
                "weight": 8,
                "tasks": [
                    {"name": "i18n framework setup", "check": lambda: self._file_exists("mini-app/src/i18n/index.ts")},
                    {"name": "Russian translation file", "check": lambda: self._file_exists("mini-app/src/i18n/ru.ts")},
                    {"name": "Onboarding translated", "check": lambda: False},
                    {"name": "Dashboard translated", "check": lambda: False},
                    {"name": "Quest UI translated", "check": lambda: False},
                    {"name": "Bot messages in Russian", "check": lambda: False},
                ]
            },
            "chinese_language": {
                "name": "Chinese Language Support",
                "emoji": "🇨🇳",
                "weight": 8,
                "tasks": [
                    {"name": "Chinese translation file", "check": lambda: self._file_exists("mini-app/src/i18n/zh.ts")},
                    {"name": "Onboarding translated", "check": lambda: False},
                    {"name": "Dashboard translated", "check": lambda: False},
                    {"name": "Quest UI translated", "check": lambda: False},
                    {"name": "Bot messages in Chinese", "check": lambda: False},
                ]
            },
            "admin_panel": {
                "name": "Admin Panel Mini App",
                "emoji": "⚙️",
                "weight": 10,
                "tasks": [
                    {"name": "Admin API routes", "check": lambda: self._file_exists("bot/src/api/routes/admin.ts")},
                    {"name": "Admin authentication", "check": lambda: self._file_exists("bot/src/api/middleware/adminAuth.ts")},
                    {"name": "User management dashboard", "check": lambda: self._file_exists("mini-app/src/components/AdminUserList.tsx")},
                    {"name": "Quest/mode editor", "check": lambda: self._file_exists("mini-app/src/components/admin/AdminQuestEditor.tsx")},
                    {"name": "Analytics overview", "check": lambda: self._file_exists("mini-app/src/components/AdminStatsCard.tsx")},
                    {"name": "Admin mini app frontend", "check": lambda: self._dir_exists("admin-app/src")},
                ]
            },
            "miniapp_polish": {
                "name": "Mini App Polish",
                "emoji": "✨",
                "weight": 5,
                "tasks": [
                    {"name": "Core pages (Dashboard, Quests, Profile)", "check": lambda: self._file_exists("mini-app/src/pages/Dashboard.tsx")},
                    {"name": "Onboarding flow complete", "check": lambda: self._file_exists("mini-app/src/pages/Onboarding.tsx")},
                    {"name": "Settings page", "check": lambda: self._file_exists("mini-app/src/pages/Settings.tsx")},
                    {"name": "Theme customization (dark mode)", "check": lambda: self._file_contains_pattern("mini-app/src/pages/Settings.tsx", r"theme|dark.?mode|themeParams")},
                    {"name": "Localization (i18n)", "check": lambda: self._file_exists("mini-app/src/i18n/index.ts")},
                    {"name": "Offline support / PWA", "check": lambda: self._file_exists("mini-app/public/manifest.json")},
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
