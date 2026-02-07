#!/usr/bin/env python3
"""
Quest Scheduler - Automated quest assignment for Telegram RPG Quest Bot
Runs as a cron job or scheduled task to assign daily/weekly quests

Usage:
  python scripts/quest_scheduler.py --daily    # Assign daily quests to all users
  python scripts/quest_scheduler.py --weekly   # Assign weekly quests to all users
  python scripts/quest_scheduler.py --user-id 1 --daily  # Assign to specific user

Cron Examples:
  # Daily quests at midnight
  0 0 * * * /usr/bin/python3 /path/to/scripts/quest_scheduler.py --daily

  # Weekly quests every Monday at 6am
  0 6 * * 1 /usr/bin/python3 /path/to/scripts/quest_scheduler.py --weekly
"""

import os
import sys
import json
import argparse
from datetime import datetime
from typing import List, Dict, Any

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.quest_manager import QuestManager
from tools.db_operations import get_connection


class QuestScheduler:
    """Automated quest assignment scheduler"""

    def __init__(self):
        self.quest_manager = QuestManager()
        self.conn = None
        self.log_file = os.path.join(
            os.path.dirname(__file__),
            '../.tmp/quest_scheduler.log'
        )

    def log(self, message: str):
        """Log message to file and stdout"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_message = f"[{timestamp}] {message}"
        print(log_message)

        # Ensure .tmp directory exists
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)

        # Append to log file
        with open(self.log_file, 'a') as f:
            f.write(log_message + '\n')

    def get_all_active_users(self) -> List[int]:
        """Get list of all active user IDs"""
        try:
            self.conn = get_connection()
            cursor = self.conn.cursor()

            # Get users who have active modes and have logged in recently
            cursor.execute("""
                SELECT DISTINCT u.id
                FROM users u
                INNER JOIN user_modes um ON u.id = um.user_id
                WHERE um.is_active = true
                ORDER BY u.id
            """)

            user_ids = [row[0] for row in cursor.fetchall()]
            cursor.close()

            return user_ids

        except Exception as e:
            self.log(f"ERROR: Failed to get active users: {str(e)}")
            return []
        finally:
            if self.conn:
                self.conn.close()
                self.conn = None

    def assign_daily_quests_to_all(self, count: int = 3) -> Dict[str, Any]:
        """Assign daily quests to all active users"""
        self.log("=" * 60)
        self.log("DAILY QUEST ASSIGNMENT - STARTED")
        self.log("=" * 60)

        user_ids = self.get_all_active_users()
        self.log(f"Found {len(user_ids)} active users")

        results = {
            "total_users": len(user_ids),
            "successful": 0,
            "failed": 0,
            "errors": []
        }

        for user_id in user_ids:
            try:
                self.log(f"Assigning daily quests to user {user_id}...")
                result = self.quest_manager.assign_daily_quests(user_id, count)

                if result.get("success"):
                    quest_count = result.get("count", 0)
                    self.log(f"  ✓ Assigned {quest_count} daily quests to user {user_id}")
                    results["successful"] += 1
                else:
                    error = result.get("error", "Unknown error")
                    self.log(f"  ✗ Failed for user {user_id}: {error}")
                    results["failed"] += 1
                    results["errors"].append({
                        "user_id": user_id,
                        "error": error
                    })

            except Exception as e:
                self.log(f"  ✗ Exception for user {user_id}: {str(e)}")
                results["failed"] += 1
                results["errors"].append({
                    "user_id": user_id,
                    "error": str(e)
                })

        self.log("=" * 60)
        self.log(f"DAILY QUEST ASSIGNMENT - COMPLETED")
        self.log(f"Total: {results['total_users']} | Success: {results['successful']} | Failed: {results['failed']}")
        self.log("=" * 60)

        return results

    def assign_weekly_quests_to_all(self, count: int = 2) -> Dict[str, Any]:
        """Assign weekly quests to all active users"""
        self.log("=" * 60)
        self.log("WEEKLY QUEST ASSIGNMENT - STARTED")
        self.log("=" * 60)

        user_ids = self.get_all_active_users()
        self.log(f"Found {len(user_ids)} active users")

        results = {
            "total_users": len(user_ids),
            "successful": 0,
            "failed": 0,
            "errors": []
        }

        for user_id in user_ids:
            try:
                self.log(f"Assigning weekly quests to user {user_id}...")
                result = self.quest_manager.assign_weekly_quests(user_id, count)

                if result.get("success"):
                    quest_count = result.get("count", 0)
                    self.log(f"  ✓ Assigned {quest_count} weekly quests to user {user_id}")
                    results["successful"] += 1
                else:
                    error = result.get("error", "Unknown error")
                    self.log(f"  ✗ Failed for user {user_id}: {error}")
                    results["failed"] += 1
                    results["errors"].append({
                        "user_id": user_id,
                        "error": error
                    })

            except Exception as e:
                self.log(f"  ✗ Exception for user {user_id}: {str(e)}")
                results["failed"] += 1
                results["errors"].append({
                    "user_id": user_id,
                    "error": str(e)
                })

        self.log("=" * 60)
        self.log(f"WEEKLY QUEST ASSIGNMENT - COMPLETED")
        self.log(f"Total: {results['total_users']} | Success: {results['successful']} | Failed: {results['failed']}")
        self.log("=" * 60)

        return results

    def assign_daily_to_user(self, user_id: int, count: int = 3) -> Dict[str, Any]:
        """Assign daily quests to a specific user"""
        self.log(f"Assigning {count} daily quests to user {user_id}...")

        try:
            result = self.quest_manager.assign_daily_quests(user_id, count)

            if result.get("success"):
                quest_count = result.get("count", 0)
                self.log(f"✓ Successfully assigned {quest_count} daily quests")
            else:
                error = result.get("error", "Unknown error")
                self.log(f"✗ Failed: {error}")

            return result

        except Exception as e:
            self.log(f"✗ Exception: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def assign_weekly_to_user(self, user_id: int, count: int = 2) -> Dict[str, Any]:
        """Assign weekly quests to a specific user"""
        self.log(f"Assigning {count} weekly quests to user {user_id}...")

        try:
            result = self.quest_manager.assign_weekly_quests(user_id, count)

            if result.get("success"):
                quest_count = result.get("count", 0)
                self.log(f"✓ Successfully assigned {quest_count} weekly quests")
            else:
                error = result.get("error", "Unknown error")
                self.log(f"✗ Failed: {error}")

            return result

        except Exception as e:
            self.log(f"✗ Exception: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def cleanup(self):
        """Cleanup resources"""
        if self.quest_manager:
            self.quest_manager.close()


def main():
    """CLI interface"""
    parser = argparse.ArgumentParser(
        description='Quest Scheduler - Automated quest assignment',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    # Assignment type
    parser.add_argument('--daily', action='store_true',
                        help='Assign daily quests')
    parser.add_argument('--weekly', action='store_true',
                        help='Assign weekly quests')

    # Target
    parser.add_argument('--user-id', type=int,
                        help='Assign to specific user ID (default: all users)')

    # Options
    parser.add_argument('--count', type=int,
                        help='Number of quests to assign (default: 3 for daily, 2 for weekly)')

    # Output
    parser.add_argument('--json', action='store_true',
                        help='Output results as JSON')

    args = parser.parse_args()

    # Validation
    if not args.daily and not args.weekly:
        parser.error("Must specify either --daily or --weekly")

    # Create scheduler
    scheduler = QuestScheduler()

    try:
        result = None

        if args.daily:
            count = args.count if args.count else 3

            if args.user_id:
                # Assign to specific user
                result = scheduler.assign_daily_to_user(args.user_id, count)
            else:
                # Assign to all users
                result = scheduler.assign_daily_quests_to_all(count)

        elif args.weekly:
            count = args.count if args.count else 2

            if args.user_id:
                # Assign to specific user
                result = scheduler.assign_weekly_to_user(args.user_id, count)
            else:
                # Assign to all users
                result = scheduler.assign_weekly_quests_to_all(count)

        # Output result
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result:
                print("\n" + "=" * 60)
                print("SUMMARY")
                print("=" * 60)
                if isinstance(result, dict):
                    for key, value in result.items():
                        if key != "errors":
                            print(f"{key}: {value}")
                print("=" * 60)

        # Exit code
        if result and result.get("success", True):
            sys.exit(0)
        else:
            sys.exit(1)

    except Exception as e:
        scheduler.log(f"FATAL ERROR: {str(e)}")
        sys.exit(1)

    finally:
        scheduler.cleanup()


if __name__ == "__main__":
    main()
