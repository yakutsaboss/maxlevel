#!/usr/bin/env python3
"""
Punishment Manager - Handles punishment settings, consent, and application.
Part of the WAT Framework (Tools Layer)

Uses DB schema:
  - punishment_settings: Per-user consent and punishment preferences
  - punishment_history: Audit log of applied punishments
  - users: For XP deduction
  - streaks: For streak reset
  - quest_instances: For failed quest detection

Usage:
    python tools/punishment_manager.py --get-settings --user-id 1
    python tools/punishment_manager.py --update-consent --user-id 1 --consent true
    python tools/punishment_manager.py --update-settings --user-id 1 --settings '{"intensity_level":"high"}'
    python tools/punishment_manager.py --apply --user-id 1 --quest-instance-id 5 --type xp_penalty --severity medium
    python tools/punishment_manager.py --get-history --user-id 1 --page 1 --limit 10
    python tools/punishment_manager.py --check-failed --user-id 1
"""

import os
import sys
import json
import argparse
from datetime import datetime
from typing import Dict, Any, List, Optional

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from tools.db_operations import execute_query, execute_insert, execute_update, transaction, close_pool
from tools.validators import validate_user_id


# Severity multipliers for punishment calculation
SEVERITY_MULTIPLIERS = {
    'low': 0.5,
    'medium': 1.0,
    'high': 1.5,
    'extreme': 2.0,
}

# Base XP penalty by punishment type
BASE_XP_PENALTY = {
    'xp_penalty': 50,
    'streak_reset': 0,
    'badge_revoke': 0,
    'custom': 25,
}

# Base streak days lost by punishment type
BASE_STREAK_LOSS = {
    'xp_penalty': 0,
    'streak_reset': 3,
    'badge_revoke': 0,
    'custom': 1,
}


def get_settings(user_id: int) -> Dict[str, Any]:
    """
    Get or create default punishment settings for a user.
    If no settings exist, creates a default row and returns it.
    """
    user_id = validate_user_id(user_id)

    settings = execute_query(
        "SELECT * FROM punishment_settings WHERE user_id = %s",
        (user_id,),
        fetch='one'
    )

    if settings:
        return {"success": True, "data": _format_settings(settings)}

    # Create default settings
    settings = execute_insert("""
        INSERT INTO punishment_settings (user_id)
        VALUES (%s)
        RETURNING *
    """, (user_id,))

    return {"success": True, "data": _format_settings(settings)}


def update_consent(user_id: int, consent_given: bool) -> Dict[str, Any]:
    """Update opt-in status with timestamp."""
    user_id = validate_user_id(user_id)

    # Ensure settings row exists
    get_settings(user_id)

    timestamp = datetime.utcnow().isoformat() if consent_given else None

    affected = execute_update("""
        UPDATE punishment_settings
        SET consent_given = %s, consent_timestamp = %s, updated_at = NOW()
        WHERE user_id = %s
    """, (consent_given, timestamp, user_id))

    if affected == 0:
        return {"success": False, "error": "Failed to update consent"}

    return get_settings(user_id)


def update_settings(user_id: int, settings_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update punishment settings (intensity, safe_mode, caps, custom_punishments).
    Only updates fields present in settings_dict.
    """
    user_id = validate_user_id(user_id)

    # Ensure settings row exists
    get_settings(user_id)

    allowed_fields = {
        'intensity_level': str,
        'safe_mode': bool,
        'max_xp_penalty': int,
        'max_streak_reset': int,
        'custom_punishments': dict,
    }

    updates = []
    params = []

    for field, expected_type in allowed_fields.items():
        if field in settings_dict:
            value = settings_dict[field]
            if field == 'intensity_level' and value not in ('low', 'medium', 'high', 'extreme'):
                return {"success": False, "error": f"Invalid intensity_level: {value}"}
            if field == 'custom_punishments':
                value = json.dumps(value)
            updates.append(f"{field} = %s")
            params.append(value)

    if not updates:
        return {"success": False, "error": "No valid fields to update"}

    updates.append("updated_at = NOW()")
    params.append(user_id)

    query = f"UPDATE punishment_settings SET {', '.join(updates)} WHERE user_id = %s"
    affected = execute_update(query, tuple(params))

    if affected == 0:
        return {"success": False, "error": "Failed to update settings"}

    return get_settings(user_id)


def apply_punishment(user_id: int, quest_instance_id: Optional[int],
                     punishment_type: str, severity: str) -> Dict[str, Any]:
    """
    Apply a punishment: deduct XP, reset streak, etc. and log to history.
    MUST check consent first. MUST respect max caps.
    """
    user_id = validate_user_id(user_id)

    valid_types = ('xp_penalty', 'streak_reset', 'badge_revoke', 'custom')
    if punishment_type not in valid_types:
        return {"success": False, "error": f"Invalid punishment_type: {punishment_type}. Must be one of {valid_types}"}

    if severity not in SEVERITY_MULTIPLIERS:
        return {"success": False, "error": f"Invalid severity: {severity}. Must be one of {list(SEVERITY_MULTIPLIERS.keys())}"}

    # Check consent
    settings_result = get_settings(user_id)
    settings = settings_result.get("data", {})

    if not settings.get("consent_given"):
        return {"success": False, "error": "User has not given consent for punishments"}

    # Calculate punishment amounts respecting caps
    multiplier = SEVERITY_MULTIPLIERS[severity]
    xp_to_deduct = int(BASE_XP_PENALTY.get(punishment_type, 0) * multiplier)
    streak_to_lose = int(BASE_STREAK_LOSS.get(punishment_type, 0) * multiplier)

    # Apply caps from settings
    max_xp = settings.get("max_xp_penalty", 200)
    max_streak = settings.get("max_streak_reset", 7)
    xp_to_deduct = min(xp_to_deduct, max_xp)
    streak_to_lose = min(streak_to_lose, max_streak)

    # Safe mode: halve all penalties
    if settings.get("safe_mode"):
        xp_to_deduct = xp_to_deduct // 2
        streak_to_lose = streak_to_lose // 2

    # Build punishment message
    parts = []
    if xp_to_deduct > 0:
        parts.append(f"-{xp_to_deduct} XP")
    if streak_to_lose > 0:
        parts.append(f"-{streak_to_lose} streak days")
    message = f"Punishment applied: {', '.join(parts)}" if parts else "Punishment logged (no penalties)"

    # Apply within a transaction
    with transaction() as conn:
        cur = conn.cursor()

        # Deduct XP (ensure it doesn't go below 0)
        if xp_to_deduct > 0:
            cur.execute("""
                UPDATE users
                SET total_xp = GREATEST(total_xp - %s, 0)
                WHERE id = %s
            """, (xp_to_deduct, user_id))

        # Reset streak days
        if streak_to_lose > 0:
            cur.execute("""
                UPDATE streaks
                SET current_streak = GREATEST(current_streak - %s, 0)
                WHERE user_id = %s AND current_streak > 0
            """, (streak_to_lose, user_id))

        # Log to punishment_history
        cur.execute("""
            INSERT INTO punishment_history
                (user_id, quest_instance_id, punishment_type, severity,
                 xp_deducted, streak_days_lost, message_sent)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, applied_at
        """, (user_id, quest_instance_id, punishment_type, severity,
              xp_to_deduct, streak_to_lose, message))

        row = cur.fetchone()

    return {
        "success": True,
        "data": {
            "punishment_id": row[0],
            "applied_at": str(row[1]),
            "punishment_type": punishment_type,
            "severity": severity,
            "xp_deducted": xp_to_deduct,
            "streak_days_lost": streak_to_lose,
            "message": message,
            "safe_mode_active": settings.get("safe_mode", True),
        }
    }


def get_history(user_id: int, page: int = 1, limit: int = 10) -> Dict[str, Any]:
    """Get paginated punishment history for a user."""
    user_id = validate_user_id(user_id)
    page = max(1, int(page))
    limit = max(1, min(50, int(limit)))
    offset = (page - 1) * limit

    # Get total count
    count_result = execute_query(
        "SELECT COUNT(*) as total FROM punishment_history WHERE user_id = %s",
        (user_id,),
        fetch='one'
    )
    total = count_result['total'] if count_result else 0

    # Get paginated results with quest title
    rows = execute_query("""
        SELECT ph.id, ph.quest_instance_id, ph.punishment_type, ph.severity,
               ph.xp_deducted, ph.streak_days_lost, ph.message_sent, ph.applied_at,
               q.title as quest_title
        FROM punishment_history ph
        LEFT JOIN quest_instances qi ON qi.id = ph.quest_instance_id
        LEFT JOIN quests q ON q.id = qi.quest_id
        WHERE ph.user_id = %s
        ORDER BY ph.applied_at DESC
        LIMIT %s OFFSET %s
    """, (user_id, limit, offset))

    punishments = []
    for row in rows:
        punishments.append({
            "id": row['id'],
            "quest_instance_id": row['quest_instance_id'],
            "punishment_type": row['punishment_type'],
            "severity": row['severity'],
            "xp_deducted": row['xp_deducted'],
            "streak_days_lost": row['streak_days_lost'],
            "message_sent": row['message_sent'],
            "applied_at": str(row['applied_at']),
            "quest_title": row.get('quest_title'),
        })

    return {
        "success": True,
        "data": {
            "punishments": punishments,
            "page": page,
            "limit": limit,
            "total": total,
        }
    }


def check_failed_quests(user_id: int) -> Dict[str, Any]:
    """
    Find failed quests that need punishment (status='failed', no punishment yet).
    Returns list of quest instances that should trigger punishment.
    """
    user_id = validate_user_id(user_id)

    # Find failed quests with no punishment history entry
    rows = execute_query("""
        SELECT qi.id as quest_instance_id, qi.quest_id, qi.instance_date, qi.status,
               q.title, q.xp_reward, q.difficulty, q.mode_id,
               m.name as mode_name
        FROM quest_instances qi
        JOIN quests q ON q.id = qi.quest_id
        JOIN modes m ON m.id = q.mode_id
        WHERE qi.user_id = %s
          AND qi.status = 'failed'
          AND NOT EXISTS (
              SELECT 1 FROM punishment_history ph
              WHERE ph.user_id = %s AND ph.quest_instance_id = qi.id
          )
        ORDER BY qi.instance_date DESC
    """, (user_id, user_id))

    failed_quests = []
    for row in rows:
        severity = _difficulty_to_severity(row.get('difficulty', 'easy'))
        failed_quests.append({
            "quest_instance_id": row['quest_instance_id'],
            "quest_id": row['quest_id'],
            "title": row['title'],
            "instance_date": str(row['instance_date']),
            "difficulty": row.get('difficulty'),
            "mode_name": row['mode_name'],
            "suggested_severity": severity,
            "suggested_type": "xp_penalty",
        })

    return {
        "success": True,
        "data": {
            "failed_quests": failed_quests,
            "count": len(failed_quests),
        }
    }


def _format_settings(settings: Dict[str, Any]) -> Dict[str, Any]:
    """Format punishment settings for JSON output."""
    return {
        "user_id": settings['user_id'],
        "consent_given": settings['consent_given'],
        "consent_timestamp": str(settings['consent_timestamp']) if settings.get('consent_timestamp') else None,
        "intensity_level": settings['intensity_level'],
        "safe_mode": settings['safe_mode'],
        "max_xp_penalty": settings['max_xp_penalty'],
        "max_streak_reset": settings['max_streak_reset'],
        "custom_punishments": settings.get('custom_punishments'),
        "created_at": str(settings.get('created_at', '')),
        "updated_at": str(settings.get('updated_at', '')),
    }


def _difficulty_to_severity(difficulty: str) -> str:
    """Map quest difficulty to suggested punishment severity."""
    mapping = {
        'easy': 'low',
        'medium': 'medium',
        'hard': 'high',
    }
    return mapping.get(difficulty, 'medium')


def main():
    """CLI interface for punishment operations."""
    parser = argparse.ArgumentParser(description='Punishment Manager Tool')
    parser.add_argument('--get-settings', action='store_true',
                        help='Get or create punishment settings for a user')
    parser.add_argument('--update-consent', action='store_true',
                        help='Update consent opt-in status')
    parser.add_argument('--update-settings', action='store_true',
                        help='Update punishment settings')
    parser.add_argument('--apply', action='store_true',
                        help='Apply a punishment to a user')
    parser.add_argument('--get-history', action='store_true',
                        help='Get punishment history for a user')
    parser.add_argument('--check-failed', action='store_true',
                        help='Check for failed quests needing punishment')
    parser.add_argument('--user-id', type=int, help='User ID')
    parser.add_argument('--quest-instance-id', type=int, help='Quest instance ID')
    parser.add_argument('--consent', type=str, help='Consent value (true/false)')
    parser.add_argument('--settings', type=str, help='JSON settings dict')
    parser.add_argument('--type', type=str, dest='punishment_type',
                        help='Punishment type (xp_penalty, streak_reset, badge_revoke, custom)')
    parser.add_argument('--severity', type=str,
                        help='Severity level (low, medium, high, extreme)')
    parser.add_argument('--page', type=int, default=1, help='Page number')
    parser.add_argument('--limit', type=int, default=10, help='Items per page')

    args = parser.parse_args()

    try:
        if args.get_settings:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "--user-id required"}))
                return 1
            result = get_settings(args.user_id)
            print(json.dumps(result, default=str))
            return 0

        elif args.update_consent:
            if not args.user_id or args.consent is None:
                print(json.dumps({"success": False, "error": "--user-id and --consent required"}))
                return 1
            consent = args.consent.lower() in ('true', '1', 'yes')
            result = update_consent(args.user_id, consent)
            print(json.dumps(result, default=str))
            return 0

        elif args.update_settings:
            if not args.user_id or not args.settings:
                print(json.dumps({"success": False, "error": "--user-id and --settings required"}))
                return 1
            settings_dict = json.loads(args.settings)
            result = update_settings(args.user_id, settings_dict)
            print(json.dumps(result, default=str))
            return 0

        elif args.apply:
            if not args.user_id or not args.punishment_type or not args.severity:
                print(json.dumps({"success": False, "error": "--user-id, --type, and --severity required"}))
                return 1
            result = apply_punishment(
                args.user_id,
                args.quest_instance_id,
                args.punishment_type,
                args.severity
            )
            print(json.dumps(result, default=str))
            return 0

        elif args.get_history:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "--user-id required"}))
                return 1
            result = get_history(args.user_id, args.page, args.limit)
            print(json.dumps(result, default=str))
            return 0

        elif args.check_failed:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "--user-id required"}))
                return 1
            result = check_failed_quests(args.user_id)
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
