#!/usr/bin/env python3
"""
Achievement Manager - Handles achievement operations for Telegram RPG Quest Bot
Part of the WAT Framework (Tools Layer)
"""

import os
import sys
import json
import argparse
from datetime import datetime
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from tools.db_operations import execute_query, get_connection
from tools.validators import validate_user_id, validate_achievement_id

# Load environment variables
load_dotenv()


class AchievementManager:
    """Manages achievement operations"""

    def __init__(self):
        self.conn = None

    def connect(self):
        """Establish database connection"""
        if not self.conn:
            self.conn = get_connection()
        return self.conn

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            self.conn = None

    def unlock_achievement(self, user_id: int, achievement_id: int) -> Dict[str, Any]:
        """Unlock an achievement for a user."""
        user_id = validate_user_id(user_id)
        achievement_id = validate_achievement_id(achievement_id)
        cursor = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Check if already unlocked
            cursor.execute("""
                SELECT id FROM user_achievements
                WHERE user_id = %s AND achievement_id = %s
            """, (user_id, achievement_id))

            if cursor.fetchone():
                return {
                    "success": False,
                    "error": "Achievement already unlocked"
                }

            # Get achievement details
            cursor.execute("""
                SELECT id, name, description, xp_bonus, rarity, badge_icon
                FROM achievements
                WHERE id = %s
            """, (achievement_id,))

            achievement = cursor.fetchone()
            if not achievement:
                return {
                    "success": False,
                    "error": "Achievement not found"
                }

            a_id, name, description, xp_bonus, rarity, badge_icon = achievement

            # Unlock achievement
            cursor.execute("""
                INSERT INTO user_achievements (
                    user_id, achievement_id, unlocked_at
                )
                VALUES (%s, %s, NOW())
                RETURNING id, unlocked_at
            """, (user_id, achievement_id))

            result = cursor.fetchone()
            conn.commit()

            return {
                "success": True,
                "achievement": {
                    "id": a_id,
                    "name": name,
                    "description": description,
                    "xp_bonus": xp_bonus,
                    "rarity": rarity,
                    "badge_icon": badge_icon,
                    "unlocked_at": result[1].isoformat() if result[1] else None
                },
                "user_id": user_id
            }

        except psycopg2.IntegrityError as e:
            if self.conn:
                self.conn.rollback()
            return {"success": False, "error": f"Constraint violation: {e}"}
        except psycopg2.OperationalError as e:
            if self.conn:
                self.conn.rollback()
            return {"success": False, "error": f"DB connection error: {e}"}
        except Exception as e:
            if self.conn:
                self.conn.rollback()
            return {"success": False, "error": str(e)}
        finally:
            if cursor:
                cursor.close()

    def check_and_unlock_achievements(self, user_id: int) -> Dict[str, Any]:
        """Check user progress and auto-unlock qualifying achievements."""
        user_id = validate_user_id(user_id)
        cursor = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Get user stats
            cursor.execute("""
                SELECT level, total_xp, current_streak, longest_streak,
                       quests_completed, daily_quests_completed, weekly_quests_completed
                FROM user_stats
                WHERE user_id = %s
            """, (user_id,))

            stats = cursor.fetchone()
            if not stats:
                return {
                    "success": False,
                    "error": "User stats not found"
                }

            level, total_xp, current_streak, longest_streak, \
                quests_completed, daily_quests, weekly_quests = stats

            # Get all achievements not yet unlocked
            cursor.execute("""
                SELECT id, name, description, xp_bonus, rarity, badge_icon, criteria
                FROM achievements
                WHERE id NOT IN (
                    SELECT achievement_id FROM user_achievements
                    WHERE user_id = %s
                )
            """, (user_id,))

            achievements = cursor.fetchall()
            newly_unlocked = []

            # Check each achievement
            for achievement in achievements:
                a_id, name, desc, xp_bonus, rarity, badge_icon, criteria = achievement

                # Parse JSONB criteria
                criteria_type = criteria.get('type') if criteria else None
                criteria_value = criteria.get('value') or criteria.get('days') or criteria.get('count')

                qualifies = False

                # Check criteria
                if criteria_type == 'level' and criteria_value and level >= criteria_value:
                    qualifies = True
                elif criteria_type == 'total_xp' and criteria_value and total_xp >= criteria_value:
                    qualifies = True
                elif criteria_type == 'quest_count' and criteria_value and quests_completed >= criteria_value:
                    qualifies = True
                elif criteria_type == 'quest_complete' and criteria_value and quests_completed >= criteria_value:
                    qualifies = True
                elif criteria_type == 'streak' and criteria_value and current_streak >= criteria_value:
                    qualifies = True
                elif criteria_type == 'longest_streak' and criteria_value and longest_streak >= criteria_value:
                    qualifies = True
                elif criteria_type == 'daily_quests' and criteria_value and daily_quests >= criteria_value:
                    qualifies = True
                elif criteria_type == 'weekly_quests' and criteria_value and weekly_quests >= criteria_value:
                    qualifies = True

                # Unlock if qualifies
                if qualifies:
                    cursor.execute("""
                        INSERT INTO user_achievements (
                            user_id, achievement_id, unlocked_at
                        )
                        VALUES (%s, %s, NOW())
                        ON CONFLICT DO NOTHING
                        RETURNING id, unlocked_at
                    """, (user_id, a_id))

                    result = cursor.fetchone()
                    if result:
                        newly_unlocked.append({
                            "id": a_id,
                            "name": name,
                            "description": desc,
                            "xp_bonus": xp_bonus,
                            "rarity": rarity,
                            "badge_icon": badge_icon,
                            "criteria": criteria,
                            "unlocked_at": result[1].isoformat() if result[1] else None
                        })

            conn.commit()

            return {
                "success": True,
                "newly_unlocked": newly_unlocked,
                "count": len(newly_unlocked)
            }

        except psycopg2.IntegrityError as e:
            if self.conn:
                self.conn.rollback()
            return {"success": False, "error": f"Constraint violation: {e}"}
        except psycopg2.OperationalError as e:
            if self.conn:
                self.conn.rollback()
            return {"success": False, "error": f"DB connection error: {e}"}
        except Exception as e:
            if self.conn:
                self.conn.rollback()
            return {"success": False, "error": str(e)}
        finally:
            if cursor:
                cursor.close()

    def get_user_achievements(self, user_id: int) -> Dict[str, Any]:
        """Get all achievements unlocked by a user."""
        user_id = validate_user_id(user_id)
        cursor = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    ua.id,
                    ua.achievement_id,
                    a.name,
                    a.description,
                    a.xp_bonus,
                    a.rarity,
                    a.badge_icon,
                    ua.unlocked_at
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = %s
                ORDER BY ua.unlocked_at DESC
            """, (user_id,))

            achievements = []
            for row in cursor.fetchall():
                achievements.append({
                    "id": row[0],
                    "achievement_id": row[1],
                    "name": row[2],
                    "description": row[3],
                    "xp_bonus": row[4],
                    "rarity": row[5],
                    "badge_icon": row[6],
                    "unlocked_at": row[7].isoformat() if row[7] else None
                })

            # Get total count
            cursor.execute("""
                SELECT COUNT(*) FROM achievements
            """)
            total = cursor.fetchone()[0]

            return {
                "success": True,
                "achievements": achievements,
                "unlocked": len(achievements),
                "total": total,
                "percentage": round((len(achievements) / total) * 100, 2) if total > 0 else 0
            }

        except psycopg2.OperationalError as e:
            return {"success": False, "error": f"DB connection error: {e}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            if cursor:
                cursor.close()

    def get_available_achievements(self, user_id: int) -> Dict[str, Any]:
        """Get achievements not yet unlocked by user."""
        user_id = validate_user_id(user_id)
        cursor = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    id, name, description, xp_bonus, rarity, badge_icon, criteria
                FROM achievements
                WHERE id NOT IN (
                    SELECT achievement_id FROM user_achievements
                    WHERE user_id = %s
                )
                ORDER BY rarity DESC, name ASC
            """, (user_id,))

            achievements = []
            for row in cursor.fetchall():
                criteria = row[6]
                achievements.append({
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "xp_bonus": row[3],
                    "rarity": row[4],
                    "badge_icon": row[5],
                    "criteria": criteria,
                    "criteria_text": self._format_criteria(criteria)
                })

            return {
                "success": True,
                "achievements": achievements,
                "count": len(achievements)
            }

        except psycopg2.OperationalError as e:
            return {"success": False, "error": f"DB connection error: {e}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            if cursor:
                cursor.close()

    def get_recent_achievements(self, user_id: int, limit: int = 5) -> Dict[str, Any]:
        """Get recently unlocked achievements."""
        user_id = validate_user_id(user_id)
        cursor = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    a.id, a.name, a.description, a.icon, a.rarity,
                    a.xp_reward, ua.unlocked_at
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = %s
                ORDER BY ua.unlocked_at DESC
                LIMIT %s
            """, (user_id, limit))

            achievements = []
            for row in cursor.fetchall():
                achievements.append({
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "icon": row[3],
                    "rarity": row[4],
                    "xp_reward": row[5],
                    "unlocked_at": row[6].isoformat() if row[6] else None
                })

            return {
                "success": True,
                "achievements": achievements,
                "count": len(achievements)
            }

        except psycopg2.OperationalError as e:
            return {"success": False, "error": f"DB connection error: {e}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            if cursor:
                cursor.close()

    def get_achievement_stats(self, user_id: int) -> Dict[str, Any]:
        """Get achievement statistics for a user."""
        user_id = validate_user_id(user_id)
        cursor = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Total achievements
            cursor.execute("""
                SELECT COUNT(*) FROM achievements WHERE is_active = true
            """)
            total = cursor.fetchone()[0]

            # Unlocked achievements
            cursor.execute("""
                SELECT COUNT(*) FROM user_achievements WHERE user_id = %s
            """, (user_id,))
            unlocked = cursor.fetchone()[0]

            # By rarity
            cursor.execute("""
                SELECT a.rarity, COUNT(*) as count
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = %s
                GROUP BY a.rarity
            """, (user_id,))

            by_rarity = {}
            for row in cursor.fetchall():
                by_rarity[row[0]] = row[1]

            # By category
            cursor.execute("""
                SELECT a.category, COUNT(*) as count
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = %s
                GROUP BY a.category
            """, (user_id,))

            by_category = {}
            for row in cursor.fetchall():
                by_category[row[0]] = row[1]

            return {
                "success": True,
                "stats": {
                    "total": total,
                    "unlocked": unlocked,
                    "locked": total - unlocked,
                    "percentage": round((unlocked / total) * 100, 2) if total > 0 else 0,
                    "by_rarity": by_rarity,
                    "by_category": by_category
                }
            }

        except psycopg2.OperationalError as e:
            return {"success": False, "error": f"DB connection error: {e}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            if cursor:
                cursor.close()

    def list_all_achievements(self) -> Dict[str, Any]:
        """List all available achievements."""
        cursor = None
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    id, name, description, icon, xp_reward, rarity, category,
                    criteria_type, criteria_value, is_active
                FROM achievements
                ORDER BY rarity DESC, category, name
            """)

            achievements = []
            for row in cursor.fetchall():
                achievements.append({
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "icon": row[3],
                    "xp_reward": row[4],
                    "rarity": row[5],
                    "category": row[6],
                    "criteria_type": row[7],
                    "criteria_value": row[8],
                    "criteria_text": self._format_criteria(row[7], row[8]),
                    "is_active": row[9]
                })

            return {
                "success": True,
                "achievements": achievements,
                "count": len(achievements)
            }

        except psycopg2.OperationalError as e:
            return {"success": False, "error": f"DB connection error: {e}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            if cursor:
                cursor.close()

    @staticmethod
    def _format_criteria(criteria_type: str, criteria_value: int) -> str:
        """Format criteria for display"""
        formats = {
            'level': f"Reach level {criteria_value}",
            'total_xp': f"Earn {criteria_value} total XP",
            'quest_count': f"Complete {criteria_value} quests",
            'streak': f"Maintain a {criteria_value}-day streak",
            'longest_streak': f"Achieve a {criteria_value}-day streak",
            'daily_quests': f"Complete {criteria_value} daily quests",
            'weekly_quests': f"Complete {criteria_value} weekly quests"
        }
        return formats.get(criteria_type, f"{criteria_type}: {criteria_value}")


def main():
    """CLI interface for achievement manager"""
    parser = argparse.ArgumentParser(description='Achievement Manager - Manage achievements for Telegram RPG Bot')

    # Operations
    parser.add_argument('--unlock', action='store_true', help='Unlock an achievement')
    parser.add_argument('--check-unlock', action='store_true', help='Check and auto-unlock qualifying achievements')
    parser.add_argument('--get-user', action='store_true', help='Get user achievements')
    parser.add_argument('--get-available', action='store_true', help='Get available (locked) achievements')
    parser.add_argument('--get-recent', action='store_true', help='Get recent achievements')
    parser.add_argument('--get-stats', action='store_true', help='Get achievement statistics')
    parser.add_argument('--list-all', action='store_true', help='List all achievements')

    # Parameters
    parser.add_argument('--user-id', type=int, help='User ID')
    parser.add_argument('--achievement-id', type=int, help='Achievement ID')
    parser.add_argument('--limit', type=int, default=5, help='Limit for results')

    args = parser.parse_args()

    manager = AchievementManager()

    try:
        result = None

        if args.unlock:
            if not args.user_id or not args.achievement_id:
                print(json.dumps({"success": False, "error": "Missing required arguments: --user-id and --achievement-id"}))
                sys.exit(1)
            result = manager.unlock_achievement(args.user_id, args.achievement_id)

        elif args.check_unlock:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "Missing required argument: --user-id"}))
                sys.exit(1)
            result = manager.check_and_unlock_achievements(args.user_id)

        elif args.get_user:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "Missing required argument: --user-id"}))
                sys.exit(1)
            result = manager.get_user_achievements(args.user_id)

        elif args.get_available:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "Missing required argument: --user-id"}))
                sys.exit(1)
            result = manager.get_available_achievements(args.user_id)

        elif args.get_recent:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "Missing required argument: --user-id"}))
                sys.exit(1)
            result = manager.get_recent_achievements(args.user_id, args.limit)

        elif args.get_stats:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "Missing required argument: --user-id"}))
                sys.exit(1)
            result = manager.get_achievement_stats(args.user_id)

        elif args.list_all:
            result = manager.list_all_achievements()

        else:
            parser.print_help()
            sys.exit(1)

        if result:
            print(json.dumps(result, indent=2))
            sys.exit(0 if result.get("success") else 1)

    except ValueError as e:
        print(json.dumps({"success": False, "error": f"Validation: {e}"}, indent=2))
        sys.exit(1)
    finally:
        manager.close()


if __name__ == "__main__":
    main()
