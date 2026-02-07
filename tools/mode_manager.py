#!/usr/bin/env python3
"""
Mode Manager Tool
Handles mode selection, enabling/disabling modes, and mode configuration.

Usage:
    # List all available modes
    python tools/mode_manager.py --list-modes

    # Add modes for a user
    python tools/mode_manager.py --add-modes --user-id 1 --modes "fitness,hydration"

    # Get user's active modes
    python tools/mode_manager.py --get-active-modes --user-id 1

    # Remove a mode from user
    python tools/mode_manager.py --remove-mode --user-id 1 --mode "fitness"

    # Toggle mode active status
    python tools/mode_manager.py --toggle-mode --user-id 1 --mode "fitness" --active false
"""

import os
import sys
import json
import argparse
from typing import Optional, Dict, Any, List
from datetime import datetime

# Add parent directory to path to import db_operations
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.db_operations import execute_query, execute_insert, execute_update, execute_delete, transaction, close_pool


def list_all_modes() -> List[Dict[str, Any]]:
    """
    List all available modes.

    Returns:
        List of mode dicts with id, name, display_name, description, icon_emoji
    """
    return execute_query("SELECT * FROM modes ORDER BY id")


def get_mode_by_name(mode_name: str) -> Optional[Dict[str, Any]]:
    """
    Get mode by name.

    Args:
        mode_name: Mode name (e.g., 'fitness', 'hydration')

    Returns:
        Mode dict or None if not found
    """
    return execute_query(
        "SELECT * FROM modes WHERE name = %s",
        (mode_name,),
        fetch='one'
    )


def get_mode_by_id(mode_id: int) -> Optional[Dict[str, Any]]:
    """
    Get mode by ID.

    Args:
        mode_id: Mode ID

    Returns:
        Mode dict or None if not found
    """
    return execute_query(
        "SELECT * FROM modes WHERE id = %s",
        (mode_id,),
        fetch='one'
    )


def get_user_modes(user_id: int, active_only: bool = True) -> List[Dict[str, Any]]:
    """
    Get all modes for a user.

    Args:
        user_id: User ID
        active_only: If True, only return active modes

    Returns:
        List of mode dicts with user_mode metadata
    """
    where_clause = "AND um.is_active = TRUE" if active_only else ""

    return execute_query(f"""
        SELECT
            m.id as mode_id,
            m.name,
            m.display_name,
            m.description,
            m.icon_emoji,
            um.id as user_mode_id,
            um.enabled_at,
            um.is_active
        FROM user_modes um
        JOIN modes m ON um.mode_id = m.id
        WHERE um.user_id = %s {where_clause}
        ORDER BY um.enabled_at
    """, (user_id,))


def add_mode_to_user(user_id: int, mode_name: str) -> Optional[Dict[str, Any]]:
    """
    Add a mode to a user.

    Args:
        user_id: User ID
        mode_name: Mode name (e.g., 'fitness')

    Returns:
        User_mode record or None if mode doesn't exist
    """
    # Get mode ID
    mode = get_mode_by_name(mode_name)
    if not mode:
        return None

    # Check if already exists
    existing = execute_query("""
        SELECT * FROM user_modes
        WHERE user_id = %s AND mode_id = %s
    """, (user_id, mode['id']), fetch='one')

    if existing:
        # If exists but inactive, reactivate it
        if not existing['is_active']:
            execute_update("""
                UPDATE user_modes
                SET is_active = TRUE, enabled_at = NOW()
                WHERE id = %s
            """, (existing['id'],))

            # Return updated record
            return execute_query(
                "SELECT * FROM user_modes WHERE id = %s",
                (existing['id'],),
                fetch='one'
            )
        return existing

    # Insert new user_mode
    user_mode = execute_insert("""
        INSERT INTO user_modes (user_id, mode_id, is_active)
        VALUES (%s, %s, TRUE)
        RETURNING *
    """, (user_id, mode['id']))

    # Also initialize streak for this mode
    execute_insert("""
        INSERT INTO streaks (user_id, mode_id, current_streak, longest_streak)
        VALUES (%s, %s, 0, 0)
        ON CONFLICT (user_id, mode_id) DO NOTHING
    """, (user_id, mode['id']), returning=False)

    return user_mode


def add_multiple_modes(user_id: int, mode_names: List[str]) -> Dict[str, Any]:
    """
    Add multiple modes to a user at once.

    Args:
        user_id: User ID
        mode_names: List of mode names (e.g., ['fitness', 'hydration'])

    Returns:
        Dict with success status and added modes
    """
    results = {
        'user_id': user_id,
        'added': [],
        'failed': [],
        'already_active': []
    }

    for mode_name in mode_names:
        mode = get_mode_by_name(mode_name)
        if not mode:
            results['failed'].append({
                'mode': mode_name,
                'reason': 'Mode not found'
            })
            continue

        # Check if already exists
        existing = execute_query("""
            SELECT * FROM user_modes
            WHERE user_id = %s AND mode_id = %s
        """, (user_id, mode['id']), fetch='one')

        if existing and existing['is_active']:
            results['already_active'].append(mode_name)
            continue

        # Add mode
        user_mode = add_mode_to_user(user_id, mode_name)
        if user_mode:
            results['added'].append({
                'mode': mode_name,
                'user_mode_id': user_mode['id']
            })

    return results


def remove_mode_from_user(user_id: int, mode_name: str, soft_delete: bool = True) -> bool:
    """
    Remove a mode from a user.

    Args:
        user_id: User ID
        mode_name: Mode name
        soft_delete: If True, set is_active=FALSE; if False, delete record

    Returns:
        True if removed, False if not found
    """
    mode = get_mode_by_name(mode_name)
    if not mode:
        return False

    if soft_delete:
        # Soft delete: set is_active = FALSE
        affected = execute_update("""
            UPDATE user_modes
            SET is_active = FALSE
            WHERE user_id = %s AND mode_id = %s
        """, (user_id, mode['id']))
    else:
        # Hard delete: remove record
        affected = execute_delete("""
            DELETE FROM user_modes
            WHERE user_id = %s AND mode_id = %s
        """, (user_id, mode['id']))

    return affected > 0


def toggle_mode_status(user_id: int, mode_name: str, is_active: bool) -> Optional[Dict[str, Any]]:
    """
    Toggle a mode's active status for a user.

    Args:
        user_id: User ID
        mode_name: Mode name
        is_active: New active status

    Returns:
        Updated user_mode record or None if not found
    """
    mode = get_mode_by_name(mode_name)
    if not mode:
        return None

    affected = execute_update("""
        UPDATE user_modes
        SET is_active = %s
        WHERE user_id = %s AND mode_id = %s
    """, (is_active, user_id, mode['id']))

    if affected > 0:
        return execute_query("""
            SELECT * FROM user_modes
            WHERE user_id = %s AND mode_id = %s
        """, (user_id, mode['id']), fetch='one')

    return None


def is_mode_active_for_user(user_id: int, mode_name: str) -> bool:
    """
    Check if a mode is active for a user.

    Args:
        user_id: User ID
        mode_name: Mode name

    Returns:
        True if active, False otherwise
    """
    mode = get_mode_by_name(mode_name)
    if not mode:
        return False

    result = execute_query("""
        SELECT is_active FROM user_modes
        WHERE user_id = %s AND mode_id = %s
    """, (user_id, mode['id']), fetch='one')

    return result['is_active'] if result else False


def get_mode_summary(user_id: int) -> Dict[str, Any]:
    """
    Get a summary of user's mode status.

    Args:
        user_id: User ID

    Returns:
        Dict with mode counts and details
    """
    all_modes = list_all_modes()
    user_modes = get_user_modes(user_id, active_only=False)

    active_modes = [um for um in user_modes if um['is_active']]
    inactive_modes = [um for um in user_modes if not um['is_active']]

    active_mode_names = [um['name'] for um in active_modes]
    available_modes = [m for m in all_modes if m['name'] not in [um['name'] for um in user_modes]]

    return {
        'user_id': user_id,
        'total_modes_available': len(all_modes),
        'active_mode_count': len(active_modes),
        'inactive_mode_count': len(inactive_modes),
        'available_to_add_count': len(available_modes),
        'active_modes': active_modes,
        'inactive_modes': inactive_modes,
        'available_modes': available_modes
    }


def main():
    """CLI interface for mode management."""
    parser = argparse.ArgumentParser(description='Mode Manager Tool')

    # Command group
    parser.add_argument('--list-modes', action='store_true',
                        help='List all available modes')
    parser.add_argument('--get-active-modes', action='store_true',
                        help='Get user\'s active modes')
    parser.add_argument('--get-mode-summary', action='store_true',
                        help='Get mode summary for user')
    parser.add_argument('--add-modes', action='store_true',
                        help='Add modes to user')
    parser.add_argument('--remove-mode', action='store_true',
                        help='Remove a mode from user')
    parser.add_argument('--toggle-mode', action='store_true',
                        help='Toggle mode active status')
    parser.add_argument('--is-active', action='store_true',
                        help='Check if mode is active for user')

    # Parameters
    parser.add_argument('--user-id', type=int,
                        help='User ID')
    parser.add_argument('--modes', type=str,
                        help='Comma-separated list of mode names (e.g., "fitness,hydration")')
    parser.add_argument('--mode', type=str,
                        help='Single mode name')
    parser.add_argument('--active', type=str, choices=['true', 'false'],
                        help='Active status (true/false)')
    parser.add_argument('--include-inactive', action='store_true',
                        help='Include inactive modes in results')

    args = parser.parse_args()

    try:
        if args.list_modes:
            modes = list_all_modes()
            print(json.dumps(modes, indent=2, default=str))
            return 0

        elif args.get_active_modes:
            if not args.user_id:
                print("Error: --user-id required", file=sys.stderr)
                return 1

            user_modes = get_user_modes(args.user_id, active_only=not args.include_inactive)
            print(json.dumps(user_modes, indent=2, default=str))
            return 0

        elif args.get_mode_summary:
            if not args.user_id:
                print("Error: --user-id required", file=sys.stderr)
                return 1

            summary = get_mode_summary(args.user_id)
            print(json.dumps(summary, indent=2, default=str))
            return 0

        elif args.add_modes:
            if not args.user_id or not args.modes:
                print("Error: --user-id and --modes required", file=sys.stderr)
                return 1

            mode_list = [m.strip() for m in args.modes.split(',')]
            results = add_multiple_modes(args.user_id, mode_list)
            print(json.dumps(results, indent=2, default=str))
            return 0

        elif args.remove_mode:
            if not args.user_id or not args.mode:
                print("Error: --user-id and --mode required", file=sys.stderr)
                return 1

            success = remove_mode_from_user(args.user_id, args.mode)
            if success:
                print(json.dumps({"status": "removed", "mode": args.mode}))
                return 0
            else:
                print("Mode not found or not active", file=sys.stderr)
                return 1

        elif args.toggle_mode:
            if not args.user_id or not args.mode or not args.active:
                print("Error: --user-id, --mode, and --active required", file=sys.stderr)
                return 1

            is_active = args.active == 'true'
            result = toggle_mode_status(args.user_id, args.mode, is_active)
            if result:
                print(json.dumps(result, indent=2, default=str))
                return 0
            else:
                print("Mode not found", file=sys.stderr)
                return 1

        elif args.is_active:
            if not args.user_id or not args.mode:
                print("Error: --user-id and --mode required", file=sys.stderr)
                return 1

            is_active = is_mode_active_for_user(args.user_id, args.mode)
            print(json.dumps({"mode": args.mode, "is_active": is_active}))
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
