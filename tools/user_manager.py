#!/usr/bin/env python3
"""
User Manager Tool
Handles user CRUD operations, profile management, and user statistics.

Usage:
    # Create a new user
    python tools/user_manager.py --create-user --telegram-id 123456 --first-name "John"

    # Get user information
    python tools/user_manager.py --get-user --telegram-id 123456

    # Update user timezone
    python tools/user_manager.py --update-timezone --user-id 1 --timezone "America/New_York"

    # Award XP to user (handled by progression_calculator, but can be called here too)
    python tools/user_manager.py --get-stats --user-id 1

    # Delete user
    python tools/user_manager.py --delete-user --user-id 1
"""

import os
import sys
import json
import argparse
from typing import Optional, Dict, Any
from datetime import datetime

# Add parent directory to path to import db_operations
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.db_operations import execute_query, execute_insert, execute_update, execute_delete, transaction, close_pool


def create_user(telegram_id: int, username: Optional[str] = None, first_name: Optional[str] = None,
                timezone: str = 'UTC') -> Optional[Dict[str, Any]]:
    """
    Create a new user.

    Args:
        telegram_id: Telegram user ID (unique)
        username: Telegram username (optional)
        first_name: User's first name
        timezone: User's timezone (default: UTC)

    Returns:
        Dict with user data if created, None if already exists

    Example:
        user = create_user(123456, "john_doe", "John", "America/New_York")
    """
    # Check if user already exists
    existing = execute_query(
        "SELECT * FROM users WHERE telegram_id = %s",
        (telegram_id,),
        fetch='one'
    )

    if existing:
        return existing

    # Create new user
    user = execute_insert("""
        INSERT INTO users (telegram_id, username, first_name, timezone, current_level, total_xp)
        VALUES (%s, %s, %s, %s, 1, 0)
        RETURNING *
    """, (telegram_id, username, first_name, timezone))

    return user


def get_user_by_telegram_id(telegram_id: int) -> Optional[Dict[str, Any]]:
    """
    Get user by Telegram ID.

    Args:
        telegram_id: Telegram user ID

    Returns:
        Dict with user data or None if not found
    """
    return execute_query(
        "SELECT * FROM users WHERE telegram_id = %s",
        (telegram_id,),
        fetch='one'
    )


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Get user by internal user ID.

    Args:
        user_id: Internal user ID

    Returns:
        Dict with user data or None if not found
    """
    return execute_query(
        "SELECT * FROM users WHERE id = %s",
        (user_id,),
        fetch='one'
    )


def update_user_profile(user_id: int, **fields) -> Optional[Dict[str, Any]]:
    """
    Update user profile fields.

    Args:
        user_id: User ID
        **fields: Fields to update (username, first_name, timezone, etc.)

    Returns:
        Updated user data

    Example:
        update_user_profile(1, timezone="America/Los_Angeles", username="new_username")
    """
    if not fields:
        return get_user_by_id(user_id)

    # Build dynamic UPDATE query
    set_clauses = []
    params = []
    for key, value in fields.items():
        set_clauses.append(f"{key} = %s")
        params.append(value)

    params.append(user_id)
    query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = %s RETURNING *"

    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            result = cur.fetchone()

            if result:
                # Convert to dict
                columns = [desc[0] for desc in cur.description]
                return dict(zip(columns, result))
    return None


def update_timezone(user_id: int, timezone: str) -> Optional[Dict[str, Any]]:
    """
    Update user's timezone.

    Args:
        user_id: User ID
        timezone: Timezone string (e.g., 'America/New_York')

    Returns:
        Updated user data
    """
    return update_user_profile(user_id, timezone=timezone)


def get_user_stats(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Get user statistics (level, XP, streaks, etc.).

    Args:
        user_id: User ID

    Returns:
        Dict with user stats including current streak across all modes
    """
    user = get_user_by_id(user_id)
    if not user:
        return None

    # Get streak information
    streaks = execute_query("""
        SELECT
            m.name as mode_name,
            m.display_name,
            s.current_streak,
            s.longest_streak,
            s.last_activity_date
        FROM streaks s
        JOIN modes m ON s.mode_id = m.id
        WHERE s.user_id = %s
    """, (user_id,))

    # Get total quests completed
    total_completed = execute_query("""
        SELECT COUNT(*) as total
        FROM quest_instances
        WHERE user_id = %s AND status = 'completed'
    """, (user_id,), fetch='one')

    # Calculate overall streak (minimum streak across active modes)
    overall_streak = min([s['current_streak'] for s in streaks]) if streaks else 0

    return {
        'user_id': user['id'],
        'telegram_id': user['telegram_id'],
        'username': user['username'],
        'first_name': user['first_name'],
        'current_level': user['current_level'],
        'total_xp': user['total_xp'],
        'timezone': user['timezone'],
        'overall_streak': overall_streak,
        'mode_streaks': streaks,
        'total_quests_completed': total_completed['total'] if total_completed else 0,
        'is_active': user['is_active']
    }


def delete_user(user_id: int) -> bool:
    """
    Delete a user and all associated data (cascades).

    Args:
        user_id: User ID

    Returns:
        True if deleted, False if user not found
    """
    affected = execute_delete("DELETE FROM users WHERE id = %s", (user_id,))
    return affected > 0


def deactivate_user(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Soft delete: deactivate user instead of deleting.

    Args:
        user_id: User ID

    Returns:
        Updated user data
    """
    return update_user_profile(user_id, is_active=False)


def reactivate_user(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Reactivate a deactivated user.

    Args:
        user_id: User ID

    Returns:
        Updated user data
    """
    return update_user_profile(user_id, is_active=True)


def list_all_users(limit: int = 100, offset: int = 0, active_only: bool = True) -> list:
    """
    List all users with pagination.

    Args:
        limit: Maximum number of users to return
        offset: Number of users to skip
        active_only: If True, only return active users

    Returns:
        List of user dicts
    """
    where_clause = "WHERE is_active = TRUE" if active_only else ""
    return execute_query(f"""
        SELECT * FROM users
        {where_clause}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """, (limit, offset))


def main():
    """CLI interface for user management."""
    parser = argparse.ArgumentParser(description='User Manager Tool')

    # Command group
    parser.add_argument('--create-user', action='store_true',
                        help='Create a new user')
    parser.add_argument('--get-user', action='store_true',
                        help='Get user information')
    parser.add_argument('--get-stats', action='store_true',
                        help='Get user statistics')
    parser.add_argument('--update-timezone', action='store_true',
                        help='Update user timezone')
    parser.add_argument('--update-profile', action='store_true',
                        help='Update user profile fields')
    parser.add_argument('--delete-user', action='store_true',
                        help='Delete user')
    parser.add_argument('--deactivate-user', action='store_true',
                        help='Deactivate user (soft delete)')
    parser.add_argument('--list-users', action='store_true',
                        help='List all users')

    # Parameters
    parser.add_argument('--telegram-id', type=int,
                        help='Telegram user ID')
    parser.add_argument('--user-id', type=int,
                        help='Internal user ID')
    parser.add_argument('--username', type=str,
                        help='Telegram username')
    parser.add_argument('--first-name', type=str,
                        help='User first name')
    parser.add_argument('--timezone', type=str,
                        help='Timezone (e.g., America/New_York)')
    parser.add_argument('--fields', type=str,
                        help='JSON object of fields to update (e.g., \'{"username": "new_name"}\')')
    parser.add_argument('--limit', type=int, default=100,
                        help='Limit for list-users')
    parser.add_argument('--offset', type=int, default=0,
                        help='Offset for list-users')

    args = parser.parse_args()

    try:
        if args.create_user:
            if not args.telegram_id:
                print("Error: --telegram-id required", file=sys.stderr)
                return 1

            user = create_user(
                telegram_id=args.telegram_id,
                username=args.username,
                first_name=args.first_name,
                timezone=args.timezone or 'UTC'
            )
            print(json.dumps(user, indent=2, default=str))
            return 0

        elif args.get_user:
            if args.telegram_id:
                user = get_user_by_telegram_id(args.telegram_id)
            elif args.user_id:
                user = get_user_by_id(args.user_id)
            else:
                print("Error: --telegram-id or --user-id required", file=sys.stderr)
                return 1

            if user:
                print(json.dumps(user, indent=2, default=str))
                return 0
            else:
                print("User not found", file=sys.stderr)
                return 1

        elif args.get_stats:
            if not args.user_id:
                print("Error: --user-id required", file=sys.stderr)
                return 1

            stats = get_user_stats(args.user_id)
            if stats:
                print(json.dumps(stats, indent=2, default=str))
                return 0
            else:
                print("User not found", file=sys.stderr)
                return 1

        elif args.update_timezone:
            if not args.user_id or not args.timezone:
                print("Error: --user-id and --timezone required", file=sys.stderr)
                return 1

            user = update_timezone(args.user_id, args.timezone)
            print(json.dumps(user, indent=2, default=str))
            return 0

        elif args.update_profile:
            if not args.user_id or not args.fields:
                print("Error: --user-id and --fields required", file=sys.stderr)
                return 1

            fields = json.loads(args.fields)
            user = update_user_profile(args.user_id, **fields)
            print(json.dumps(user, indent=2, default=str))
            return 0

        elif args.delete_user:
            if not args.user_id:
                print("Error: --user-id required", file=sys.stderr)
                return 1

            success = delete_user(args.user_id)
            if success:
                print(json.dumps({"status": "deleted", "user_id": args.user_id}))
                return 0
            else:
                print("User not found", file=sys.stderr)
                return 1

        elif args.deactivate_user:
            if not args.user_id:
                print("Error: --user-id required", file=sys.stderr)
                return 1

            user = deactivate_user(args.user_id)
            print(json.dumps(user, indent=2, default=str))
            return 0

        elif args.list_users:
            users = list_all_users(limit=args.limit, offset=args.offset)
            print(json.dumps(users, indent=2, default=str))
            return 0

        else:
            parser.print_help()
            return 1

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1
    finally:
        close_pool()


if __name__ == '__main__':
    sys.exit(main())
