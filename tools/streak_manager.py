#!/usr/bin/env python3
"""
Streak Manager - Handles streak calculations and broken streak detection.
Part of the WAT Framework (Tools Layer)

Uses DB schema:
  - streaks: Per-user per-mode streak tracking (current_streak, longest_streak, last_activity_date)
  - quest_instances: Used to verify activity

Usage:
    python tools/streak_manager.py --check-all-streaks
    python tools/streak_manager.py --update-streak --user-id 1 --mode-id 1
    python tools/streak_manager.py --get-streak --user-id 1
"""

import os
import sys
import json
import argparse
from datetime import date, timedelta
from typing import Dict, Any, List

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from tools.db_operations import execute_query, execute_update, close_pool
from tools.validators import validate_user_id, validate_mode_id


def check_all_streaks() -> Dict[str, Any]:
    """
    Check all streaks and reset broken ones.
    A streak is broken if last_activity_date < yesterday.
    """
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    # Get all active streaks that might be broken
    streaks = execute_query("""
        SELECT s.id, s.user_id, s.mode_id, s.current_streak, s.longest_streak,
               s.last_activity_date, u.telegram_id, u.first_name
        FROM streaks s
        JOIN users u ON u.id = s.user_id
        WHERE u.is_active = true
          AND s.current_streak > 0
    """)

    broken = 0
    maintained = 0
    broken_details = []

    for streak in streaks:
        last_date = streak['last_activity_date']
        if last_date is None or str(last_date) < yesterday:
            # Streak is broken — reset current_streak to 0
            execute_update(
                "UPDATE streaks SET current_streak = 0 WHERE id = %s",
                (streak['id'],)
            )
            broken += 1
            broken_details.append({
                "user_id": streak['user_id'],
                "telegram_id": streak['telegram_id'],
                "mode_id": streak['mode_id'],
                "was_streak": streak['current_streak'],
                "longest_streak": streak['longest_streak'],
            })
        else:
            maintained += 1

    return {
        "success": True,
        "checked_date": yesterday,
        "broken": broken,
        "maintained": maintained,
        "total_checked": broken + maintained,
        "broken_details": broken_details,
    }


def update_streak(user_id: int, mode_id: int) -> Dict[str, Any]:
    """
    Increment streak for a user+mode after quest completion.
    If last_activity_date is yesterday, increment current_streak.
    If last_activity_date is today, no change (already counted).
    If last_activity_date is older, reset to 1.
    """
    user_id = validate_user_id(user_id)
    mode_id = validate_mode_id(mode_id)

    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    streak = execute_query(
        "SELECT * FROM streaks WHERE user_id = %s AND mode_id = %s",
        (user_id, mode_id),
        fetch='one'
    )

    if not streak:
        return {"success": False, "error": "Streak record not found"}

    last_date = str(streak['last_activity_date']) if streak['last_activity_date'] else None

    if last_date == today:
        # Already counted today
        return {
            "success": True,
            "action": "no_change",
            "current_streak": streak['current_streak'],
            "longest_streak": streak['longest_streak'],
        }

    if last_date == yesterday:
        # Consecutive day — increment
        new_streak = streak['current_streak'] + 1
    else:
        # Gap in activity — reset to 1
        new_streak = 1

    new_longest = max(streak['longest_streak'], new_streak)

    execute_update("""
        UPDATE streaks
        SET current_streak = %s, longest_streak = %s, last_activity_date = %s
        WHERE user_id = %s AND mode_id = %s
    """, (new_streak, new_longest, today, user_id, mode_id))

    return {
        "success": True,
        "action": "incremented" if last_date == yesterday else "reset_to_1",
        "current_streak": new_streak,
        "longest_streak": new_longest,
        "last_activity_date": today,
    }


def get_user_streaks(user_id: int) -> List[Dict[str, Any]]:
    """Get all streaks for a user with mode info."""
    user_id = validate_user_id(user_id)
    streaks = execute_query("""
        SELECT s.*, m.name as mode_name, m.display_name, m.icon_emoji
        FROM streaks s
        JOIN modes m ON m.id = s.mode_id
        WHERE s.user_id = %s
        ORDER BY s.current_streak DESC
    """, (user_id,))

    return streaks


def main():
    """CLI interface for streak operations."""
    parser = argparse.ArgumentParser(description='Streak Manager Tool')
    parser.add_argument('--check-all-streaks', action='store_true',
                        help='Check all streaks and reset broken ones')
    parser.add_argument('--update-streak', action='store_true',
                        help='Update streak for a user+mode after activity')
    parser.add_argument('--get-streak', action='store_true',
                        help='Get all streaks for a user')
    parser.add_argument('--user-id', type=int, help='User ID')
    parser.add_argument('--mode-id', type=int, help='Mode ID')

    args = parser.parse_args()

    try:
        if args.check_all_streaks:
            result = check_all_streaks()
            print(json.dumps(result, default=str))
            return 0

        elif args.update_streak:
            if not args.user_id or not args.mode_id:
                print(json.dumps({"success": False, "error": "--user-id and --mode-id required"}))
                return 1
            result = update_streak(args.user_id, args.mode_id)
            print(json.dumps(result, default=str))
            return 0

        elif args.get_streak:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "--user-id required"}))
                return 1
            result = get_user_streaks(args.user_id)
            print(json.dumps(result, default=str))
            return 0

        else:
            parser.print_help()
            return 1

    except ValueError as e:
        print(json.dumps({"success": False, "error": f"Validation: {e}"}), file=sys.stderr)
        return 1
    except psycopg2.IntegrityError as e:
        print(json.dumps({"success": False, "error": f"DB constraint: {e}"}), file=sys.stderr)
        return 1
    except psycopg2.OperationalError as e:
        print(json.dumps({"success": False, "error": f"DB connection: {e}"}), file=sys.stderr)
        return 1
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
        return 1
    finally:
        close_pool()


if __name__ == '__main__':
    sys.exit(main())
