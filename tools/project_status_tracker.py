#!/usr/bin/env python3
"""
Project Status Tracker for Wibecode
Analyzes project state and calculates completion percentage
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Tuple

class ProjectStatusTracker:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.milestones = self._define_milestones()

    def _define_milestones(self) -> Dict[str, Dict]:
        """Define project milestones and their completion criteria"""
        return {
            "setup": {
                "name": "🎯 Project Setup",
                "weight": 10,
                "tasks": [
                    {"name": "WAT Framework structure", "check": lambda: self._check_file_exists("CLAUDE.md")},
                    {"name": "Environment variables", "check": lambda: self._check_file_exists(".env")},
                    {"name": "Git repository", "check": lambda: self._check_dir_exists(".git")},
                    {"name": "Requirements file", "check": lambda: self._check_file_exists("requirements.txt")},
                    {"name": "README documentation", "check": lambda: self._check_file_exists("README.md")},
                ]
            },
            "bot_foundation": {
                "name": "🤖 Bot Foundation",
                "weight": 20,
                "tasks": [
                    {"name": "Bot directory structure", "check": lambda: self._check_dir_exists("bot")},
                    {"name": "Bot configuration", "check": lambda: self._check_bot_config()},
                    {"name": "Command handlers", "check": lambda: self._check_dir_exists("bot/commands")},
                    {"name": "Webhook setup", "check": lambda: self._check_dir_exists("bot/handlers")},
                ]
            },
            "database": {
                "name": "🗄️ Database Layer",
                "weight": 15,
                "tasks": [
                    {"name": "Database structure", "check": lambda: self._check_dir_exists("database")},
                    {"name": "Database schema", "check": lambda: self._check_file_exists("database/schema.sql")},
                    {"name": "Database models", "check": lambda: self._check_file_exists("database/models.py")},
                    {"name": "Migration scripts", "check": lambda: self._check_dir_exists("database/migrations")},
                ]
            },
            "miniapp": {
                "name": "🎨 Mini App Frontend",
                "weight": 25,
                "tasks": [
                    {"name": "Mini App directory", "check": lambda: self._check_dir_exists("miniapp")},
                    {"name": "Package.json", "check": lambda: self._check_file_exists("miniapp/package.json")},
                    {"name": "React setup", "check": lambda: self._check_file_exists("miniapp/src/App.jsx") or self._check_file_exists("miniapp/src/App.tsx")},
                    {"name": "TON Connect integration", "check": lambda: self._check_ton_connect()},
                    {"name": "Telegram WebApp SDK", "check": lambda: self._check_telegram_webapp()},
                ]
            },
            "tools": {
                "name": "🔧 Tools & Scripts",
                "weight": 10,
                "tasks": [
                    {"name": "Tools directory", "check": lambda: self._check_dir_exists("tools")},
                    {"name": "Deployment scripts", "check": lambda: self._count_files_in_dir("tools") >= 1},
                    {"name": "Status tracker", "check": lambda: self._check_file_exists("tools/project_status_tracker.py")},
                ]
            },
            "workflows": {
                "name": "📋 Workflows & SOPs",
                "weight": 10,
                "tasks": [
                    {"name": "Workflows directory", "check": lambda: self._check_dir_exists("workflows")},
                    {"name": "Bot deployment workflow", "check": lambda: self._check_file_exists("workflows/deploy_bot.md")},
                    {"name": "Mini App deployment workflow", "check": lambda: self._check_file_exists("workflows/deploy_miniapp.md")},
                ]
            },
            "deployment": {
                "name": "🚀 Deployment & CI/CD",
                "weight": 10,
                "tasks": [
                    {"name": "Docker configuration", "check": lambda: self._check_file_exists("Dockerfile") or self._check_file_exists("docker-compose.yml")},
                    {"name": "CI/CD pipeline", "check": lambda: self._check_dir_exists(".github/workflows") or self._check_file_exists(".gitlab-ci.yml")},
                    {"name": "Environment configs", "check": lambda: self._check_file_exists(".env.example")},
                ]
            }
        }

    def _check_file_exists(self, path: str) -> bool:
        """Check if file exists"""
        return (self.project_root / path).is_file()

    def _check_dir_exists(self, path: str) -> bool:
        """Check if directory exists"""
        return (self.project_root / path).is_dir()

    def _count_files_in_dir(self, path: str) -> int:
        """Count files in directory"""
        dir_path = self.project_root / path
        if not dir_path.is_dir():
            return 0
        return len([f for f in dir_path.iterdir() if f.is_file()])

    def _check_bot_config(self) -> bool:
        """Check if bot configuration exists"""
        return (self._check_file_exists("bot/config.py") or
                self._check_file_exists("bot/config.json") or
                self._check_file_exists("bot/bot.py"))

    def _check_ton_connect(self) -> bool:
        """Check if TON Connect is configured"""
        package_json = self.project_root / "miniapp" / "package.json"
        if not package_json.is_file():
            return False
        try:
            with open(package_json, 'r') as f:
                data = json.load(f)
                deps = data.get('dependencies', {})
                return '@tonconnect/ui-react' in deps or '@tonconnect/ui' in deps
        except:
            return False

    def _check_telegram_webapp(self) -> bool:
        """Check if Telegram WebApp SDK is integrated"""
        # Check in HTML files
        miniapp_dir = self.project_root / "miniapp"
        if not miniapp_dir.is_dir():
            return False

        for html_file in miniapp_dir.rglob("*.html"):
            try:
                with open(html_file, 'r') as f:
                    content = f.read()
                    if 'telegram-web-app.js' in content:
                        return True
            except:
                continue
        return False

    def calculate_progress(self) -> Tuple[float, Dict]:
        """Calculate overall progress and milestone details"""
        milestone_status = {}
        total_weight = 0
        completed_weight = 0

        for milestone_id, milestone in self.milestones.items():
            tasks = milestone['tasks']
            completed_tasks = sum(1 for task in tasks if task['check']())
            total_tasks = len(tasks)
            milestone_progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

            milestone_status[milestone_id] = {
                'name': milestone['name'],
                'weight': milestone['weight'],
                'progress': milestone_progress,
                'completed': completed_tasks,
                'total': total_tasks,
                'tasks': [
                    {
                        'name': task['name'],
                        'completed': task['check']()
                    }
                    for task in tasks
                ]
            }

            total_weight += milestone['weight']
            completed_weight += (milestone_progress / 100) * milestone['weight']

        overall_progress = (completed_weight / total_weight * 100) if total_weight > 0 else 0

        return overall_progress, milestone_status

    def generate_progress_bar(self, percentage: float, length: int = 10) -> str:
        """Generate a visual progress bar"""
        filled = int(length * percentage / 100)
        empty = length - filled
        return '█' * filled + '░' * empty

    def format_telegram_message(self) -> str:
        """Generate formatted message for Telegram"""
        overall_progress, milestones = self.calculate_progress()

        # Header
        message = f"<b>📊 Wibecode Project Status</b>\n\n"
        message += f"<b>Overall Progress: {overall_progress:.1f}%</b>\n"
        message += f"{self.generate_progress_bar(overall_progress, 20)}\n\n"

        # Milestones
        message += "<b>🎯 Milestones:</b>\n\n"

        for milestone_id, status in milestones.items():
            name = status['name']
            progress = status['progress']
            completed = status['completed']
            total = status['total']

            # Status emoji
            if progress == 100:
                status_emoji = "✅"
            elif progress > 0:
                status_emoji = "🔄"
            else:
                status_emoji = "⏳"

            message += f"{status_emoji} <b>{name}</b> ({completed}/{total})\n"
            message += f"   {self.generate_progress_bar(progress, 10)} {progress:.0f}%\n"

            # Show incomplete tasks
            incomplete_tasks = [t for t in status['tasks'] if not t['completed']]
            if incomplete_tasks and len(incomplete_tasks) <= 3:
                for task in incomplete_tasks[:2]:
                    message += f"   • {task['name']}\n"

            message += "\n"

        # Next steps
        message += "<b>📝 Next Steps:</b>\n"
        next_steps = self._get_next_steps(milestones)
        for step in next_steps[:3]:
            message += f"• {step}\n"

        message += f"\n<i>Generated: {self._get_timestamp()}</i>"

        return message

    def _get_next_steps(self, milestones: Dict) -> List[str]:
        """Determine next steps based on incomplete milestones"""
        next_steps = []

        # Find first incomplete task in each milestone
        for milestone_id, status in milestones.items():
            if status['progress'] < 100:
                incomplete = [t['name'] for t in status['tasks'] if not t['completed']]
                if incomplete:
                    next_steps.append(f"{status['name']}: {incomplete[0]}")

        return next_steps

    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def main():
    """Main entry point"""
    import sys
    import codecs

    # Fix Windows console encoding for emojis
    if sys.platform == 'win32':
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

    # Get project root (default to current directory)
    project_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()

    tracker = ProjectStatusTracker(project_root)
    message = tracker.format_telegram_message()

    # Print message
    print(message)

    # Also output JSON for programmatic use
    if '--json' in sys.argv:
        overall_progress, milestones = tracker.calculate_progress()
        output = {
            'overall_progress': overall_progress,
            'milestones': milestones
        }
        print("\n--- JSON OUTPUT ---")
        print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
