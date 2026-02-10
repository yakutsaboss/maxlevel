#!/usr/bin/env python3
"""
Quest Manager - Handles quest operations for Telegram RPG Quest Bot
Part of the WAT Framework (Tools Layer)

Uses actual DB schema:
  - quests: Quest templates (title, quest_type, xp_reward, difficulty, mode_id)
  - quest_instances: User-specific quest occurrences (user_id, quest_id, instance_date, status)

Usage:
    python tools/quest_manager.py --assign-daily --user-id 1 --count 3
    python tools/quest_manager.py --get-active --user-id 1
    python tools/quest_manager.py --complete-quest --quest-id 5
    python tools/quest_manager.py --get-stats --user-id 1
"""

import os
import sys
import json
import argparse
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from tools.db_operations import execute_query, execute_insert, execute_update, close_pool
from tools.validators import validate_user_id, validate_quest_id, validate_quest_count


def assign_quest(user_id: int, quest_id: int, instance_date: Optional[str] = None) -> Dict[str, Any]:
    """Assign a quest to a user by creating a quest_instance."""
    user_id = validate_user_id(user_id)
    quest_id = validate_quest_id(quest_id)

    quest = execute_query(
        "SELECT * FROM quests WHERE id = %s",
        (quest_id,),
        fetch='one'
    )
    if not quest:
        return {"success": False, "error": "Quest template not found"}

    if not instance_date:
        instance_date = date.today().isoformat()

    # Check if already assigned for this date
    existing = execute_query("""
        SELECT id FROM quest_instances
        WHERE user_id = %s AND quest_id = %s AND instance_date = %s
    """, (user_id, quest_id, instance_date), fetch='one')

    if existing:
        return {"success": False, "error": "Quest already assigned for this date"}

    # Compute target based on quest difficulty
    difficulty = quest.get('difficulty', 'easy')
    target = {'easy': 1, 'medium': 3, 'hard': 5}.get(difficulty, 1)

    try:
        instance = execute_insert("""
            INSERT INTO quest_instances (user_id, quest_id, instance_date, status, target)
            VALUES (%s, %s, %s, 'pending', %s)
            RETURNING *
        """, (user_id, quest_id, instance_date, target))
    except psycopg2.IntegrityError as e:
        return {"success": False, "error": f"Constraint violation: {e}"}

    return {
        "success": True,
        "quest_instance": {
            "id": instance['id'],
            "quest_id": quest['id'],
            "title": quest['title'],
            "description": quest.get('description'),
            "xp_reward": quest['xp_reward'],
            "quest_type": quest['quest_type'],
            "difficulty": difficulty,
            "target": target,
            "instance_date": instance_date,
            "status": "pending"
        }
    }


def assign_daily_quests(user_id: int, count: int = 3) -> Dict[str, Any]:
    """Assign daily quests to user based on their active modes."""
    user_id = validate_user_id(user_id)
    count = validate_quest_count(count)

    mode_rows = execute_query("""
        SELECT mode_id FROM user_modes
        WHERE user_id = %s AND is_active = true
    """, (user_id,))

    mode_ids = [int(row['mode_id']) for row in mode_rows]
    if not mode_ids:
        return {"success": False, "error": "User has no active modes"}

    today = date.today().isoformat()

    # Get daily quest templates for these modes that aren't already assigned today
    placeholders = ','.join(['%s'] * len(mode_ids))
    available = execute_query(f"""
        SELECT q.* FROM quests q
        WHERE q.mode_id IN ({placeholders})
        AND q.quest_type = 'daily'
        AND q.id NOT IN (
            SELECT quest_id FROM quest_instances
            WHERE user_id = %s AND instance_date = %s
        )
        ORDER BY RANDOM()
        LIMIT %s
    """, (*mode_ids, user_id, today, count))

    if not available:
        return {"success": False, "error": "No available daily quests for user modes"}

    assigned = []
    for quest in available:
        result = assign_quest(user_id, quest['id'], today)
        if result['success']:
            assigned.append(result['quest_instance'])

    return {
        "success": True,
        "quests": assigned,
        "count": len(assigned)
    }


def assign_weekly_quests(user_id: int, count: int = 2) -> Dict[str, Any]:
    """Assign weekly quests to user based on their active modes."""
    user_id = validate_user_id(user_id)
    count = validate_quest_count(count)

    mode_rows = execute_query("""
        SELECT mode_id FROM user_modes
        WHERE user_id = %s AND is_active = true
    """, (user_id,))

    mode_ids = [int(row['mode_id']) for row in mode_rows]
    if not mode_ids:
        return {"success": False, "error": "User has no active modes"}

    today = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=7)).isoformat()

    placeholders = ','.join(['%s'] * len(mode_ids))
    available = execute_query(f"""
        SELECT q.* FROM quests q
        WHERE q.mode_id IN ({placeholders})
        AND q.quest_type = 'weekly'
        AND q.id NOT IN (
            SELECT quest_id FROM quest_instances
            WHERE user_id = %s
            AND instance_date >= %s
            AND status IN ('pending', 'ready', 'in_progress')
        )
        ORDER BY RANDOM()
        LIMIT %s
    """, (*mode_ids, user_id, week_ago, count))

    if not available:
        return {"success": False, "error": "No available weekly quests for user modes"}

    assigned = []
    for quest in available:
        result = assign_quest(user_id, quest['id'], today)
        if result['success']:
            assigned.append(result['quest_instance'])

    return {
        "success": True,
        "quests": assigned,
        "count": len(assigned)
    }


def complete_quest(quest_instance_id: int) -> Dict[str, Any]:
    """Mark a quest instance as completed and award XP."""
    quest_instance_id = validate_quest_id(quest_instance_id)

    instance = execute_query("""
        SELECT qi.*, q.title, q.xp_reward, q.quest_type, q.difficulty,
               q.mode_id, m.name as mode_name, m.icon_emoji as mode_icon
        FROM quest_instances qi
        JOIN quests q ON qi.quest_id = q.id
        LEFT JOIN modes m ON q.mode_id = m.id
        WHERE qi.id = %s
    """, (quest_instance_id,), fetch='one')

    if not instance:
        return {"success": False, "error": "Quest instance not found"}

    if instance['status'] == 'completed':
        return {"success": False, "error": "Quest already completed"}

    xp_reward = instance['xp_reward']

    # Mark as completed
    execute_update("""
        UPDATE quest_instances
        SET status = 'completed',
            completed_at = NOW(),
            xp_awarded = %s
        WHERE id = %s
    """, (xp_reward, quest_instance_id))

    # Award XP to user
    execute_update("""
        UPDATE users
        SET total_xp = total_xp + %s
        WHERE id = %s
    """, (xp_reward, instance['user_id']))

    # Check for level up (every 500 XP = 1 level)
    user = execute_query(
        "SELECT total_xp, current_level FROM users WHERE id = %s",
        (instance['user_id'],),
        fetch='one'
    )
    new_level = (user['total_xp'] // 500) + 1
    leveled_up = new_level > user['current_level']
    if leveled_up:
        execute_update(
            "UPDATE users SET current_level = %s WHERE id = %s",
            (new_level, instance['user_id'])
        )

    return {
        "success": True,
        "quest_instance_id": quest_instance_id,
        "title": instance['title'],
        "xp_awarded": xp_reward,
        "user_id": instance['user_id'],
        "new_level": new_level if leveled_up else None
    }


def get_active_quests(user_id: int) -> Dict[str, Any]:
    """Get all active (non-completed) quest instances for a user."""
    user_id = validate_user_id(user_id)
    quests = execute_query("""
        SELECT
            qi.id,
            qi.quest_id,
            q.title as name,
            q.description,
            q.xp_reward,
            q.quest_type,
            q.difficulty,
            q.mode_id,
            m.name as mode_name,
            m.icon_emoji as mode_icon,
            qi.status,
            qi.instance_date,
            qi.check_in_count,
            qi.target
        FROM quest_instances qi
        JOIN quests q ON qi.quest_id = q.id
        LEFT JOIN modes m ON q.mode_id = m.id
        WHERE qi.user_id = %s
        AND qi.status IN ('pending', 'ready', 'in_progress')
        ORDER BY qi.instance_date ASC
    """, (user_id,))

    return {
        "success": True,
        "quests": quests,
        "count": len(quests)
    }


def get_completed_quests(user_id: int, limit: int = 50) -> Dict[str, Any]:
    """Get completed quest instances for a user."""
    user_id = validate_user_id(user_id)
    quests = execute_query("""
        SELECT
            qi.id,
            q.title as name,
            q.xp_reward,
            q.quest_type,
            q.difficulty,
            m.name as mode_name,
            m.icon_emoji as mode_icon,
            qi.xp_awarded,
            qi.completed_at,
            qi.target
        FROM quest_instances qi
        JOIN quests q ON qi.quest_id = q.id
        LEFT JOIN modes m ON q.mode_id = m.id
        WHERE qi.user_id = %s
        AND qi.status = 'completed'
        ORDER BY qi.completed_at DESC
        LIMIT %s
    """, (user_id, limit))

    return {
        "success": True,
        "quests": quests,
        "count": len(quests)
    }


def get_quest_stats(user_id: int) -> Dict[str, Any]:
    """Get quest statistics for a user."""
    user_id = validate_user_id(user_id)
    total = execute_query("""
        SELECT COUNT(*) as total
        FROM quest_instances
        WHERE user_id = %s AND status = 'completed'
    """, (user_id,), fetch='one')

    active = execute_query("""
        SELECT COUNT(*) as total
        FROM quest_instances
        WHERE user_id = %s AND status IN ('pending', 'ready', 'in_progress')
    """, (user_id,), fetch='one')

    daily = execute_query("""
        SELECT COUNT(*) as total
        FROM quest_instances qi
        JOIN quests q ON qi.quest_id = q.id
        WHERE qi.user_id = %s AND qi.status = 'completed' AND q.quest_type = 'daily'
    """, (user_id,), fetch='one')

    weekly = execute_query("""
        SELECT COUNT(*) as total
        FROM quest_instances qi
        JOIN quests q ON qi.quest_id = q.id
        WHERE qi.user_id = %s AND qi.status = 'completed' AND q.quest_type = 'weekly'
    """, (user_id,), fetch='one')

    return {
        "success": True,
        "stats": {
            "total_completed": total['total'] if total else 0,
            "active_quests": active['total'] if active else 0,
            "daily_completed": daily['total'] if daily else 0,
            "weekly_completed": weekly['total'] if weekly else 0
        }
    }


def main():
    """CLI interface for quest manager"""
    parser = argparse.ArgumentParser(description='Quest Manager')

    # Operations
    parser.add_argument('--assign-quest', action='store_true', help='Assign a quest to user')
    parser.add_argument('--assign-daily', action='store_true', help='Assign daily quests')
    parser.add_argument('--assign-weekly', action='store_true', help='Assign weekly quests')
    parser.add_argument('--complete-quest', action='store_true', help='Complete a quest')
    parser.add_argument('--get-active', action='store_true', help='Get active quests')
    parser.add_argument('--get-completed', action='store_true', help='Get completed quests')
    parser.add_argument('--get-stats', action='store_true', help='Get quest statistics')

    # Parameters
    parser.add_argument('--user-id', type=int, help='User ID')
    parser.add_argument('--quest-id', type=int, help='Quest instance ID (for complete)')
    parser.add_argument('--template-id', type=int, help='Quest template ID (for assign)')
    parser.add_argument('--count', type=int, default=3, help='Number of quests to assign')
    parser.add_argument('--limit', type=int, default=50, help='Limit for results')
    parser.add_argument('--date', type=str, help='Date (YYYY-MM-DD)')

    args = parser.parse_args()

    try:
        result = None

        if args.assign_quest:
            if not args.user_id or not args.template_id:
                result = {"success": False, "error": "Missing --user-id and --template-id"}
            else:
                result = assign_quest(args.user_id, args.template_id, args.date)

        elif args.assign_daily:
            if not args.user_id:
                result = {"success": False, "error": "Missing --user-id"}
            else:
                result = assign_daily_quests(args.user_id, args.count)

        elif args.assign_weekly:
            if not args.user_id:
                result = {"success": False, "error": "Missing --user-id"}
            else:
                result = assign_weekly_quests(args.user_id, args.count)

        elif args.complete_quest:
            if not args.quest_id:
                result = {"success": False, "error": "Missing --quest-id"}
            else:
                result = complete_quest(args.quest_id)

        elif args.get_active:
            if not args.user_id:
                result = {"success": False, "error": "Missing --user-id"}
            else:
                result = get_active_quests(args.user_id)

        elif args.get_completed:
            if not args.user_id:
                result = {"success": False, "error": "Missing --user-id"}
            else:
                result = get_completed_quests(args.user_id, args.limit)

        elif args.get_stats:
            if not args.user_id:
                result = {"success": False, "error": "Missing --user-id"}
            else:
                result = get_quest_stats(args.user_id)

        else:
            parser.print_help()
            sys.exit(1)

        if result:
            print(json.dumps(result, indent=2, default=str))
            sys.exit(0 if result.get("success") else 1)

    except ValueError as e:
        print(json.dumps({"success": False, "error": f"Validation: {e}"}, indent=2))
        sys.exit(1)
    except psycopg2.IntegrityError as e:
        print(json.dumps({"success": False, "error": f"DB constraint: {e}"}, indent=2))
        sys.exit(1)
    except psycopg2.OperationalError as e:
        print(json.dumps({"success": False, "error": f"DB connection: {e}"}, indent=2))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, indent=2))
        sys.exit(1)
    finally:
        close_pool()


if __name__ == "__main__":
    main()
