#!/usr/bin/env python3
"""
Google Sheets Analytics Export Tool
Exports user analytics data to Google Sheets via service account.
Part of the WAT Framework (Tools Layer)

Usage:
    python tools/sheets_analytics_export.py --export-all
    python tools/sheets_analytics_export.py --export-users
    python tools/sheets_analytics_export.py --export-engagement
    python tools/sheets_analytics_export.py --export-qa
"""

import os
import sys
import json
import argparse
from datetime import datetime, date
from typing import Dict, Any, List

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.db_operations import execute_query, close_pool
from dotenv import load_dotenv

# Load env from project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))

# Google API imports
from google.oauth2 import service_account
from googleapiclient.discovery import build


def get_sheets_service():
    """Authenticate and return Google Sheets API service.

    Tries OAuth user credentials (token.json) first, then falls back to
    service account. OAuth tokens are managed by sheets_oauth_helper.py
    and the /sheets_login bot command.
    """
    # Try OAuth user credentials first (from /sheets_login flow)
    try:
        from tools.sheets_oauth_helper import load_oauth_credentials
        oauth_creds = load_oauth_credentials()
        if oauth_creds:
            return build('sheets', 'v4', credentials=oauth_creds)
    except ImportError:
        pass

    # Fall back to service account
    creds_file = os.getenv('GOOGLE_SERVICE_ACCOUNT_FILE', '../service_account.json')

    # Resolve relative paths from project root
    if not os.path.isabs(creds_file):
        creds_file = os.path.join(PROJECT_ROOT, creds_file)

    if not os.path.exists(creds_file):
        raise FileNotFoundError(
            f"No authentication available.\n"
            "Either:\n"
            "  1. Use /sheets_login in the notification bot to authorize with Google OAuth, or\n"
            "  2. Set up a service account: download JSON key as service_account.json\n"
            f"     and set GOOGLE_SERVICE_ACCOUNT_FILE in .env"
        )

    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    credentials = service_account.Credentials.from_service_account_file(
        creds_file, scopes=scopes
    )
    return build('sheets', 'v4', credentials=credentials)


def get_spreadsheet_id() -> str:
    """Get target spreadsheet ID from environment."""
    sheet_id = os.getenv('GOOGLE_SHEETS_SPREADSHEET_ID')
    if not sheet_id:
        raise ValueError(
            "GOOGLE_SHEETS_SPREADSHEET_ID not set in .env\n"
            "Create a Google Spreadsheet, share it with the service account email, "
            "and set the spreadsheet ID."
        )
    return sheet_id


def clear_and_write_sheet(service, spreadsheet_id: str, sheet_name: str, headers: List[str], rows: List[List]):
    """Clear a sheet and write new data with headers."""
    # Try to clear; if sheet doesn't exist, create it
    try:
        service.spreadsheets().values().clear(
            spreadsheetId=spreadsheet_id,
            range=f'{sheet_name}!A:ZZ',
        ).execute()
    except Exception:
        # Sheet might not exist yet — create it
        try:
            service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={
                    'requests': [{
                        'addSheet': {
                            'properties': {'title': sheet_name}
                        }
                    }]
                }
            ).execute()
        except Exception:
            pass  # Sheet already exists, clear failed for another reason

    # Write header + data
    values = [headers] + rows
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=f'{sheet_name}!A1',
        valueInputOption='RAW',
        body={'values': values},
    ).execute()

    return len(rows)


def export_users(service, spreadsheet_id: str) -> int:
    """Export user data to Users sheet."""
    rows_data = execute_query("""
        SELECT telegram_id, username, first_name, created_at, timezone,
               current_level, total_xp, is_active
        FROM users
        ORDER BY id
    """)

    headers = ['telegram_id', 'username', 'first_name', 'created_at', 'timezone',
               'current_level', 'total_xp', 'is_active']
    rows = [[str(r.get(h, '')) for h in headers] for r in rows_data]

    return clear_and_write_sheet(service, spreadsheet_id, 'Users', headers, rows)


def export_modes(service, spreadsheet_id: str) -> int:
    """Export user mode selections to Modes sheet."""
    rows_data = execute_query("""
        SELECT u.id as user_id, u.telegram_id,
               STRING_AGG(m.display_name, ', ' ORDER BY m.name) as active_modes,
               COUNT(um.id) as mode_count,
               STRING_AGG(um.enabled_at::text, ', ' ORDER BY m.name) as enabled_dates
        FROM users u
        LEFT JOIN user_modes um ON um.user_id = u.id AND um.is_active = true
        LEFT JOIN modes m ON m.id = um.mode_id
        WHERE u.is_active = true
        GROUP BY u.id, u.telegram_id
        ORDER BY u.id
    """)

    headers = ['user_id', 'telegram_id', 'active_modes', 'mode_count', 'enabled_dates']
    rows = [[str(r.get(h, '')) for h in headers] for r in rows_data]

    return clear_and_write_sheet(service, spreadsheet_id, 'Modes', headers, rows)


def export_activity(service, spreadsheet_id: str) -> int:
    """Export quest activity to Activity sheet."""
    rows_data = execute_query("""
        SELECT
            u.id as user_id,
            u.telegram_id,
            COUNT(qi.id) FILTER (WHERE qi.status = 'completed') as total_quests_completed,
            COUNT(qi.id) FILTER (WHERE qi.status = 'completed' AND q.quest_type = 'daily') as daily_completed,
            COUNT(qi.id) FILTER (WHERE qi.status = 'completed' AND q.quest_type = 'weekly') as weekly_completed,
            CASE
                WHEN COUNT(qi.id) > 0
                THEN ROUND(100.0 * COUNT(qi.id) FILTER (WHERE qi.status = 'completed') / COUNT(qi.id), 1)
                ELSE 0
            END as completion_rate,
            MAX(qi.completed_at)::text as last_quest_date
        FROM users u
        LEFT JOIN quest_instances qi ON qi.user_id = u.id
        LEFT JOIN quests q ON q.id = qi.quest_id
        WHERE u.is_active = true
        GROUP BY u.id, u.telegram_id
        ORDER BY total_quests_completed DESC
    """)

    headers = ['user_id', 'telegram_id', 'total_quests_completed', 'daily_completed',
               'weekly_completed', 'completion_rate', 'last_quest_date']
    rows = [[str(r.get(h, '')) for h in headers] for r in rows_data]

    return clear_and_write_sheet(service, spreadsheet_id, 'Activity', headers, rows)


def export_engagement(service, spreadsheet_id: str) -> int:
    """Export engagement metrics to Engagement sheet."""
    rows_data = execute_query("""
        SELECT
            u.id as user_id,
            u.telegram_id,
            (CURRENT_DATE - u.created_at::date) as days_since_signup,
            COUNT(DISTINCT al.created_at::date) as days_active,
            CASE
                WHEN (CURRENT_DATE - u.created_at::date) > 0
                THEN ROUND(
                    7.0 * COALESCE(
                        (SELECT COUNT(*) FROM quest_instances qi2
                         WHERE qi2.user_id = u.id AND qi2.status = 'completed'),
                        0
                    ) / GREATEST((CURRENT_DATE - u.created_at::date), 1), 1
                )
                ELSE 0
            END as quests_per_week,
            COALESCE(MAX(s.last_activity_date)::text, '') as last_activity_date,
            COALESCE(MAX(s.current_streak), 0) as best_current_streak,
            COALESCE(MAX(s.longest_streak), 0) as best_longest_streak
        FROM users u
        LEFT JOIN user_activity_log al ON al.user_id = u.id
        LEFT JOIN streaks s ON s.user_id = u.id
        WHERE u.is_active = true
        GROUP BY u.id, u.telegram_id, u.created_at
        ORDER BY u.id
    """)

    headers = ['user_id', 'telegram_id', 'days_since_signup', 'days_active',
               'quests_per_week', 'last_activity_date', 'best_current_streak', 'best_longest_streak']
    rows = [[str(r.get(h, '')) for h in headers] for r in rows_data]

    return clear_and_write_sheet(service, spreadsheet_id, 'Engagement', headers, rows)


def export_punishment(service, spreadsheet_id: str) -> int:
    """Export punishment data to Punishment sheet."""
    rows_data = execute_query("""
        SELECT
            u.id as user_id,
            u.telegram_id,
            COUNT(ph.id) as total_punishments,
            COALESCE(SUM(ph.xp_deducted), 0) as total_xp_deducted,
            COALESCE(SUM(ph.streak_days_lost), 0) as total_streak_days_lost,
            COALESCE(ps.intensity_level, 'none') as intensity_level,
            MAX(ph.applied_at)::text as last_punishment_date
        FROM users u
        LEFT JOIN punishment_history ph ON ph.user_id = u.id
        LEFT JOIN punishment_settings ps ON ps.user_id = u.id
        WHERE u.is_active = true
        GROUP BY u.id, u.telegram_id, ps.intensity_level
        ORDER BY total_punishments DESC
    """)

    headers = ['user_id', 'telegram_id', 'total_punishments', 'total_xp_deducted',
               'total_streak_days_lost', 'intensity_level', 'last_punishment_date']
    rows = [[str(r.get(h, '')) for h in headers] for r in rows_data]

    return clear_and_write_sheet(service, spreadsheet_id, 'Punishment', headers, rows)


def export_summary(service, spreadsheet_id: str) -> int:
    """Export summary metrics to Summary sheet."""
    stats = execute_query("""
        SELECT
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
            (SELECT ROUND(AVG(current_level), 1) FROM users WHERE is_active = true) as avg_level,
            (SELECT ROUND(AVG(total_xp), 0) FROM users WHERE is_active = true) as avg_xp,
            (SELECT ROUND(AVG(s.current_streak), 1) FROM streaks s
             JOIN users u ON u.id = s.user_id WHERE u.is_active = true) as avg_streak,
            (SELECT COUNT(*) FROM users
             WHERE is_active = true
             AND created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
            (SELECT COUNT(DISTINCT qi.user_id) FROM quest_instances qi
             WHERE qi.instance_date >= CURRENT_DATE - 7) as active_7d,
            (SELECT COUNT(DISTINCT qi.user_id) FROM quest_instances qi
             WHERE qi.instance_date >= CURRENT_DATE - 30) as active_30d,
            (SELECT m.display_name FROM modes m
             JOIN user_modes um ON um.mode_id = m.id AND um.is_active = true
             GROUP BY m.display_name ORDER BY COUNT(*) DESC LIMIT 1) as top_mode
    """, fetch='one')

    headers = ['Metric', 'Value']
    rows = [
        ['Total Users', str(stats.get('total_users', 0))],
        ['Active Users', str(stats.get('active_users', 0))],
        ['Avg Level', str(stats.get('avg_level', 0))],
        ['Avg XP', str(stats.get('avg_xp', 0))],
        ['Avg Streak', str(stats.get('avg_streak', 0))],
        ['New Users (7d)', str(stats.get('new_users_7d', 0))],
        ['Active Users (7d)', str(stats.get('active_7d', 0))],
        ['Active Users (30d)', str(stats.get('active_30d', 0))],
        ['Top Mode', str(stats.get('top_mode', 'N/A'))],
        ['Export Date', datetime.now().isoformat()],
    ]

    return clear_and_write_sheet(service, spreadsheet_id, 'Summary', headers, rows)


def export_quiz_responses(service, spreadsheet_id: str) -> Dict[str, int]:
    """Export onboarding Q&A per module from mode_configs quiz_responses.

    Reads quiz_responses JSONB from mode_configs, groups by mode,
    and writes each mode's Q&A to a separate sheet tab.

    Returns:
        Dict mapping mode name to number of rows written.
    """
    rows_data = execute_query("""
        SELECT
            mc.id,
            mc.user_id,
            u.telegram_id,
            u.username,
            m.name AS mode_name,
            m.display_name,
            mc.quiz_responses,
            mc.created_at
        FROM mode_configs mc
        JOIN users u ON u.id = mc.user_id
        JOIN modes m ON m.id = mc.mode_id
        WHERE mc.quiz_responses IS NOT NULL
        ORDER BY m.name, mc.created_at
    """)

    # Group rows by mode
    per_mode_data: Dict[str, List[Dict]] = {}
    for row in rows_data:
        mode = row.get('mode_name', 'unknown')
        if mode not in per_mode_data:
            per_mode_data[mode] = []
        per_mode_data[mode].append(row)

    results = {}
    for mode_name, mode_rows in per_mode_data.items():
        display = mode_rows[0].get('display_name', mode_name)
        sheet_name = f'QA_{display}'

        # Collect all unique question keys across responses for this mode
        all_questions = set()
        for row in mode_rows:
            responses = row.get('quiz_responses') or {}
            if isinstance(responses, str):
                try:
                    responses = json.loads(responses)
                except (json.JSONDecodeError, TypeError):
                    responses = {}
            for key in responses.keys():
                all_questions.add(key)

        question_keys = sorted(all_questions)
        headers = ['user_id', 'telegram_id', 'username', 'created_at'] + question_keys

        sheet_rows = []
        for row in mode_rows:
            responses = row.get('quiz_responses') or {}
            if isinstance(responses, str):
                try:
                    responses = json.loads(responses)
                except (json.JSONDecodeError, TypeError):
                    responses = {}
            sheet_row = [
                str(row.get('user_id', '')),
                str(row.get('telegram_id', '')),
                str(row.get('username', '')),
                str(row.get('created_at', '')),
            ]
            for qk in question_keys:
                val = responses.get(qk, '')
                if isinstance(val, (list, dict)):
                    val = json.dumps(val, ensure_ascii=False)
                sheet_row.append(str(val))
            sheet_rows.append(sheet_row)

        count = clear_and_write_sheet(service, spreadsheet_id, sheet_name, headers, sheet_rows)
        results[mode_name] = count

    return results


def organize_answers_per_mode(service, spreadsheet_id: str) -> int:
    """Organize all player answers by mode with aggregated response statistics.

    Reads mode_configs, groups answers by mode then by question,
    and writes organized summary with response distributions.

    Returns:
        Number of rows written to the organized answers sheet.
    """
    rows_data = execute_query("""
        SELECT
            m.name AS mode_name,
            m.display_name,
            mc.quiz_responses,
            COUNT(*) OVER (PARTITION BY m.name) AS total_respondents_in_mode
        FROM mode_configs mc
        JOIN modes m ON m.id = mc.mode_id
        WHERE mc.quiz_responses IS NOT NULL
        ORDER BY m.name
    """)

    # Build aggregation: mode -> question -> answer -> count
    organized: Dict[str, Dict[str, Dict[str, int]]] = {}
    mode_display_names: Dict[str, str] = {}
    mode_respondent_counts: Dict[str, int] = {}

    for row in rows_data:
        mode = row.get('mode_name', 'unknown')
        mode_display_names[mode] = row.get('display_name', mode)
        mode_respondent_counts[mode] = int(row.get('total_respondents_in_mode', 0))

        responses = row.get('quiz_responses') or {}
        if isinstance(responses, str):
            try:
                responses = json.loads(responses)
            except (json.JSONDecodeError, TypeError):
                responses = {}

        if mode not in organized:
            organized[mode] = {}

        for question, answer in responses.items():
            if question not in organized[mode]:
                organized[mode][question] = {}
            answer_str = str(answer) if not isinstance(answer, (list, dict)) else json.dumps(answer, ensure_ascii=False)
            organized[mode][question][answer_str] = organized[mode][question].get(answer_str, 0) + 1

    # Write to sheet: one row per mode/question/answer combination
    headers = ['Mode', 'Mode Display', 'Total Respondents', 'Question',
               'Answer', 'Count', 'Percentage']
    sheet_rows = []

    for mode in sorted(organized.keys()):
        display = mode_display_names.get(mode, mode)
        total = mode_respondent_counts.get(mode, 0)

        for question in sorted(organized[mode].keys()):
            answers = organized[mode][question]
            for answer, count in sorted(answers.items(), key=lambda x: -x[1]):
                pct = round(100.0 * count / total, 1) if total > 0 else 0
                sheet_rows.append([
                    mode,
                    display,
                    str(total),
                    question,
                    answer,
                    str(count),
                    f'{pct}%',
                ])

    return clear_and_write_sheet(service, spreadsheet_id, 'Organized Answers', headers, sheet_rows)


def export_qa(service, spreadsheet_id: str) -> Dict[str, Any]:
    """Export all Q&A data: per-module sheets + organized summary.

    Combines export_quiz_responses (one tab per mode) with
    organize_answers_per_mode (aggregated statistics tab).
    """
    qa_results = export_quiz_responses(service, spreadsheet_id)
    organized_rows = organize_answers_per_mode(service, spreadsheet_id)

    total_qa_rows = sum(qa_results.values())
    return {
        "per_mode_sheets": qa_results,
        "organized_summary_rows": organized_rows,
        "total_qa_rows": total_qa_rows,
    }


def export_all() -> Dict[str, Any]:
    """Run all exports and return summary."""
    service = get_sheets_service()
    spreadsheet_id = get_spreadsheet_id()

    exports = [
        ('Users', export_users),
        ('Modes', export_modes),
        ('Activity', export_activity),
        ('Engagement', export_engagement),
        ('Punishment', export_punishment),
        ('Summary', export_summary),
    ]

    total_rows = 0
    sheets_updated = []

    for sheet_name, export_fn in exports:
        try:
            rows = export_fn(service, spreadsheet_id)
            total_rows += rows
            sheets_updated.append(sheet_name)
        except Exception as e:
            print(f"Warning: Failed to export {sheet_name}: {e}", file=sys.stderr)

    return {
        "success": True,
        "sheets_updated": sheets_updated,
        "total_rows": total_rows,
        "spreadsheet_url": f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}",
        "exported_at": datetime.now().isoformat(),
    }


def main():
    """CLI interface for analytics export."""
    parser = argparse.ArgumentParser(description='Google Sheets Analytics Export')
    parser.add_argument('--export-all', action='store_true',
                        help='Export all analytics data')
    parser.add_argument('--export-users', action='store_true',
                        help='Export users sheet only')
    parser.add_argument('--export-engagement', action='store_true',
                        help='Export engagement sheet only')
    parser.add_argument('--export-qa', action='store_true',
                        help='Export onboarding Q&A per module + organized answers')

    args = parser.parse_args()

    try:
        if args.export_all:
            result = export_all()
            print(json.dumps(result, default=str))
            return 0

        elif args.export_users:
            service = get_sheets_service()
            spreadsheet_id = get_spreadsheet_id()
            rows = export_users(service, spreadsheet_id)
            print(json.dumps({"success": True, "sheet": "Users", "rows": rows}))
            return 0

        elif args.export_engagement:
            service = get_sheets_service()
            spreadsheet_id = get_spreadsheet_id()
            rows = export_engagement(service, spreadsheet_id)
            print(json.dumps({"success": True, "sheet": "Engagement", "rows": rows}))
            return 0

        elif args.export_qa:
            service = get_sheets_service()
            spreadsheet_id = get_spreadsheet_id()
            qa_result = export_qa(service, spreadsheet_id)
            print(json.dumps({
                "success": True,
                "per_mode_sheets": qa_result["per_mode_sheets"],
                "organized_summary_rows": qa_result["organized_summary_rows"],
                "total_qa_rows": qa_result["total_qa_rows"],
            }, default=str))
            return 0

        else:
            parser.print_help()
            return 1

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        return 1
    finally:
        close_pool()


if __name__ == '__main__':
    sys.exit(main())
