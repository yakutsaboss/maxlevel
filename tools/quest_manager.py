#!/usr/bin/env python3
"""
Quest Manager - Handles quest operations for Telegram RPG Quest Bot
Part of the WAT Framework (Tools Layer)
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.db_operations import execute_query, get_connection

# Load environment variables
load_dotenv()


class QuestManager:
    """Manages quest operations"""

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

    def assign_quest(
        self,
        user_id: int,
        quest_template_id: int,
        due_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Assign a quest to a user

        Args:
            user_id: User's ID
            quest_template_id: Quest template ID
            due_date: Due date (YYYY-MM-DD) or None for auto-calculation

        Returns:
            Dict with quest assignment details
        """
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Get quest template
            cursor.execute("""
                SELECT id, name, frequency, default_target, difficulty
                FROM quest_templates
                WHERE id = %s AND is_active = true
            """, (quest_template_id,))

            template = cursor.fetchone()
            if not template:
                return {
                    "success": False,
                    "error": "Quest template not found or inactive"
                }

            template_id, name, frequency, target, difficulty = template

            # Calculate due date based on frequency
            if not due_date:
                if frequency == 'daily':
                    due_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                elif frequency == 'weekly':
                    due_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
                else:
                    due_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')

            # Check if quest already assigned and active
            cursor.execute("""
                SELECT id FROM user_quests
                WHERE user_id = %s
                AND quest_template_id = %s
                AND status = 'active'
            """, (user_id, quest_template_id))

            if cursor.fetchone():
                return {
                    "success": False,
                    "error": "Quest already assigned to user"
                }

            # Assign quest
            cursor.execute("""
                INSERT INTO user_quests (
                    user_id, quest_template_id, status,
                    progress, target_value, assigned_date, due_date
                )
                VALUES (%s, %s, 'active', 0, %s, CURRENT_DATE, %s)
                RETURNING id, quest_template_id, status, progress, target_value, assigned_date, due_date
            """, (user_id, quest_template_id, target, due_date))

            result = cursor.fetchone()
            conn.commit()

            return {
                "success": True,
                "quest": {
                    "id": result[0],
                    "template_id": result[1],
                    "name": name,
                    "status": result[2],
                    "progress": result[3],
                    "target": result[4],
                    "assigned_date": result[5].isoformat() if result[5] else None,
                    "due_date": result[6].isoformat() if result[6] else None,
                    "frequency": frequency,
                    "difficulty": difficulty
                }
            }

        except Exception as e:
            if conn:
                conn.rollback()
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if cursor:
                cursor.close()

    def assign_daily_quests(self, user_id: int, count: int = 3) -> Dict[str, Any]:
        """
        Assign daily quests to user based on their active modes

        Args:
            user_id: User's ID
            count: Number of quests to assign (default 3)

        Returns:
            Dict with assigned quests
        """
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Get user's active modes
            cursor.execute("""
                SELECT mode_id FROM user_modes
                WHERE user_id = %s AND is_active = true
            """, (user_id,))

            mode_ids = [row[0] for row in cursor.fetchall()]

            if not mode_ids:
                return {
                    "success": False,
                    "error": "User has no active modes"
                }

            # Get available daily quest templates for these modes
            placeholders = ','.join(['%s'] * len(mode_ids))
            cursor.execute(f"""
                SELECT qt.id, qt.name, qt.frequency, qt.difficulty
                FROM quest_templates qt
                WHERE qt.mode_id IN ({placeholders})
                AND qt.frequency = 'daily'
                AND qt.is_active = true
                AND qt.id NOT IN (
                    SELECT quest_template_id FROM user_quests
                    WHERE user_id = %s
                    AND status = 'active'
                )
                ORDER BY RANDOM()
                LIMIT %s
            """, (*mode_ids, user_id, count))

            templates = cursor.fetchall()

            if not templates:
                return {
                    "success": False,
                    "error": "No available daily quests for user modes"
                }

            # Assign each quest
            assigned_quests = []
            for template in templates:
                result = self.assign_quest(user_id, template[0])
                if result["success"]:
                    assigned_quests.append(result["quest"])

            return {
                "success": True,
                "quests": assigned_quests,
                "count": len(assigned_quests)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if cursor:
                cursor.close()

    def assign_weekly_quests(self, user_id: int, count: int = 2) -> Dict[str, Any]:
        """Assign weekly quests to user"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Get user's active modes
            cursor.execute("""
                SELECT mode_id FROM user_modes
                WHERE user_id = %s AND is_active = true
            """, (user_id,))

            mode_ids = [row[0] for row in cursor.fetchall()]

            if not mode_ids:
                return {
                    "success": False,
                    "error": "User has no active modes"
                }

            # Get available weekly quest templates
            placeholders = ','.join(['%s'] * len(mode_ids))
            cursor.execute(f"""
                SELECT qt.id, qt.name, qt.frequency, qt.difficulty
                FROM quest_templates qt
                WHERE qt.mode_id IN ({placeholders})
                AND qt.frequency = 'weekly'
                AND qt.is_active = true
                AND qt.id NOT IN (
                    SELECT quest_template_id FROM user_quests
                    WHERE user_id = %s
                    AND status = 'active'
                )
                ORDER BY RANDOM()
                LIMIT %s
            """, (*mode_ids, user_id, count))

            templates = cursor.fetchall()

            if not templates:
                return {
                    "success": False,
                    "error": "No available weekly quests for user modes"
                }

            # Assign each quest
            assigned_quests = []
            for template in templates:
                result = self.assign_quest(user_id, template[0])
                if result["success"]:
                    assigned_quests.append(result["quest"])

            return {
                "success": True,
                "quests": assigned_quests,
                "count": len(assigned_quests)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if cursor:
                cursor.close()

    def complete_quest(self, quest_id: int, progress: Optional[int] = None) -> Dict[str, Any]:
        """
        Mark a quest as completed

        Args:
            quest_id: User quest ID
            progress: Final progress value (defaults to target_value)

        Returns:
            Dict with completion details
        """
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Get quest details
            cursor.execute("""
                SELECT uq.id, uq.user_id, uq.target_value, uq.status,
                       qt.xp_reward, qt.name
                FROM user_quests uq
                JOIN quest_templates qt ON uq.quest_template_id = qt.id
                WHERE uq.id = %s
            """, (quest_id,))

            quest = cursor.fetchone()
            if not quest:
                return {
                    "success": False,
                    "error": "Quest not found"
                }

            q_id, user_id, target, status, xp_reward, name = quest

            if status == 'completed':
                return {
                    "success": False,
                    "error": "Quest already completed"
                }

            # Use target value if progress not specified
            final_progress = progress if progress is not None else target

            # Complete the quest
            cursor.execute("""
                UPDATE user_quests
                SET status = 'completed',
                    progress = %s,
                    completed_date = CURRENT_DATE,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, status, progress, completed_date
            """, (final_progress, quest_id))

            result = cursor.fetchone()
            conn.commit()

            return {
                "success": True,
                "quest_id": result[0],
                "status": result[1],
                "progress": result[2],
                "completed_date": result[3].isoformat() if result[3] else None,
                "xp_reward": xp_reward,
                "user_id": user_id,
                "name": name
            }

        except Exception as e:
            if conn:
                conn.rollback()
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if cursor:
                cursor.close()

    def update_progress(self, quest_id: int, progress: float) -> Dict[str, Any]:
        """
        Update quest progress

        Args:
            quest_id: User quest ID
            progress: Progress value (0 to target_value)

        Returns:
            Dict with update status
        """
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Check if quest exists and is active
            cursor.execute("""
                SELECT id, target_value, status FROM user_quests
                WHERE id = %s
            """, (quest_id,))

            quest = cursor.fetchone()
            if not quest:
                return {
                    "success": False,
                    "error": "Quest not found"
                }

            if quest[2] != 'active':
                return {
                    "success": False,
                    "error": "Quest is not active"
                }

            # Update progress
            cursor.execute("""
                UPDATE user_quests
                SET progress = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING id, progress, target_value
            """, (progress, quest_id))

            result = cursor.fetchone()
            conn.commit()

            return {
                "success": True,
                "quest_id": result[0],
                "progress": result[1],
                "target": result[2],
                "percentage": round((result[1] / result[2]) * 100, 2) if result[2] > 0 else 0
            }

        except Exception as e:
            if conn:
                conn.rollback()
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if cursor:
                cursor.close()

    def get_active_quests(self, user_id: int) -> Dict[str, Any]:
        """Get all active quests for a user"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    uq.id,
                    uq.quest_template_id,
                    qt.name,
                    qt.description,
                    qt.xp_reward,
                    qt.frequency,
                    qt.difficulty,
                    qt.mode_id,
                    m.name as mode_name,
                    m.icon as mode_icon,
                    uq.status,
                    uq.progress,
                    uq.target_value,
                    uq.assigned_date,
                    uq.due_date
                FROM user_quests uq
                JOIN quest_templates qt ON uq.quest_template_id = qt.id
                LEFT JOIN modes m ON qt.mode_id = m.id
                WHERE uq.user_id = %s
                AND uq.status = 'active'
                ORDER BY uq.due_date ASC, qt.difficulty ASC
            """, (user_id,))

            quests = []
            for row in cursor.fetchall():
                quests.append({
                    "id": row[0],
                    "template_id": row[1],
                    "name": row[2],
                    "description": row[3],
                    "xp_reward": row[4],
                    "frequency": row[5],
                    "difficulty": row[6],
                    "mode_id": row[7],
                    "mode_name": row[8],
                    "mode_icon": row[9],
                    "status": row[10],
                    "progress": row[11],
                    "target": row[12],
                    "percentage": round((row[11] / row[12]) * 100, 2) if row[12] > 0 else 0,
                    "assigned_date": row[13].isoformat() if row[13] else None,
                    "due_date": row[14].isoformat() if row[14] else None
                })

            return {
                "success": True,
                "quests": quests,
                "count": len(quests)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if cursor:
                cursor.close()

    def get_completed_quests(self, user_id: int, limit: int = 50) -> Dict[str, Any]:
        """Get completed quests for a user"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    uq.id,
                    qt.name,
                    qt.xp_reward,
                    qt.frequency,
                    qt.difficulty,
                    m.name as mode_name,
                    uq.completed_date
                FROM user_quests uq
                JOIN quest_templates qt ON uq.quest_template_id = qt.id
                LEFT JOIN modes m ON qt.mode_id = m.id
                WHERE uq.user_id = %s
                AND uq.status = 'completed'
                ORDER BY uq.completed_date DESC
                LIMIT %s
            """, (user_id, limit))

            quests = []
            for row in cursor.fetchall():
                quests.append({
                    "id": row[0],
                    "name": row[1],
                    "xp_reward": row[2],
                    "frequency": row[3],
                    "difficulty": row[4],
                    "mode_name": row[5],
                    "completed_date": row[6].isoformat() if row[6] else None
                })

            return {
                "success": True,
                "quests": quests,
                "count": len(quests)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if cursor:
                cursor.close()

    def get_quest_stats(self, user_id: int) -> Dict[str, Any]:
        """Get quest statistics for a user"""
        try:
            conn = self.connect()
            cursor = conn.cursor()

            # Total quests completed
            cursor.execute("""
                SELECT COUNT(*) FROM user_quests
                WHERE user_id = %s AND status = 'completed'
            """, (user_id,))
            total_completed = cursor.fetchone()[0]

            # Active quests
            cursor.execute("""
                SELECT COUNT(*) FROM user_quests
                WHERE user_id = %s AND status = 'active'
            """, (user_id,))
            active_count = cursor.fetchone()[0]

            # Daily quests completed
            cursor.execute("""
                SELECT COUNT(*) FROM user_quests uq
                JOIN quest_templates qt ON uq.quest_template_id = qt.id
                WHERE uq.user_id = %s
                AND uq.status = 'completed'
                AND qt.frequency = 'daily'
            """, (user_id,))
            daily_completed = cursor.fetchone()[0]

            # Weekly quests completed
            cursor.execute("""
                SELECT COUNT(*) FROM user_quests uq
                JOIN quest_templates qt ON uq.quest_template_id = qt.id
                WHERE uq.user_id = %s
                AND uq.status = 'completed'
                AND qt.frequency = 'weekly'
            """, (user_id,))
            weekly_completed = cursor.fetchone()[0]

            return {
                "success": True,
                "stats": {
                    "total_completed": total_completed,
                    "active_quests": active_count,
                    "daily_completed": daily_completed,
                    "weekly_completed": weekly_completed
                }
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            if cursor:
                cursor.close()


def main():
    """CLI interface for quest manager"""
    parser = argparse.ArgumentParser(description='Quest Manager - Manage quests for Telegram RPG Bot')

    # Operations
    parser.add_argument('--assign-quest', action='store_true', help='Assign a quest to user')
    parser.add_argument('--assign-daily', action='store_true', help='Assign daily quests')
    parser.add_argument('--assign-weekly', action='store_true', help='Assign weekly quests')
    parser.add_argument('--complete-quest', action='store_true', help='Complete a quest')
    parser.add_argument('--update-progress', action='store_true', help='Update quest progress')
    parser.add_argument('--get-active', action='store_true', help='Get active quests')
    parser.add_argument('--get-completed', action='store_true', help='Get completed quests')
    parser.add_argument('--get-stats', action='store_true', help='Get quest statistics')

    # Parameters
    parser.add_argument('--user-id', type=int, help='User ID')
    parser.add_argument('--quest-id', type=int, help='Quest ID')
    parser.add_argument('--template-id', type=int, help='Quest template ID')
    parser.add_argument('--progress', type=float, help='Progress value')
    parser.add_argument('--count', type=int, default=3, help='Number of quests to assign')
    parser.add_argument('--limit', type=int, default=50, help='Limit for results')

    args = parser.parse_args()

    manager = QuestManager()

    try:
        result = None

        if args.assign_quest:
            if not args.user_id or not args.template_id:
                print(json.dumps({"success": False, "error": "Missing required arguments: --user-id and --template-id"}))
                sys.exit(1)
            result = manager.assign_quest(args.user_id, args.template_id)

        elif args.assign_daily:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "Missing required argument: --user-id"}))
                sys.exit(1)
            result = manager.assign_daily_quests(args.user_id, args.count)

        elif args.assign_weekly:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "Missing required argument: --user-id"}))
                sys.exit(1)
            result = manager.assign_weekly_quests(args.user_id, args.count)

        elif args.complete_quest:
            if not args.quest_id:
                print(json.dumps({"success": False, "error": "Missing required argument: --quest-id"}))
                sys.exit(1)
            result = manager.complete_quest(args.quest_id, args.progress)

        elif args.update_progress:
            if not args.quest_id or args.progress is None:
                print(json.dumps({"success": False, "error": "Missing required arguments: --quest-id and --progress"}))
                sys.exit(1)
            result = manager.update_progress(args.quest_id, args.progress)

        elif args.get_active:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "Missing required argument: --user-id"}))
                sys.exit(1)
            result = manager.get_active_quests(args.user_id)

        elif args.get_completed:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "Missing required argument: --user-id"}))
                sys.exit(1)
            result = manager.get_completed_quests(args.user_id, args.limit)

        elif args.get_stats:
            if not args.user_id:
                print(json.dumps({"success": False, "error": "Missing required argument: --user-id"}))
                sys.exit(1)
            result = manager.get_quest_stats(args.user_id)

        else:
            parser.print_help()
            sys.exit(1)

        if result:
            print(json.dumps(result, indent=2))
            sys.exit(0 if result.get("success") else 1)

    finally:
        manager.close()


if __name__ == "__main__":
    main()
