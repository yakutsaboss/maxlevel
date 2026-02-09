#!/usr/bin/env python3
"""Tests for tools/streak_manager.py — mocks db_operations, no real DB."""

import os
import sys
import pytest
from unittest.mock import MagicMock
from datetime import date, timedelta

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import tools.streak_manager as sm


@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    """Mock db functions where they're imported (on streak_manager module)."""
    mocks = {
        "execute_query": MagicMock(return_value=[]),
        "execute_update": MagicMock(return_value=0),
        "close_pool": MagicMock(),
    }
    for name, mock in mocks.items():
        monkeypatch.setattr(sm, name, mock)
    return type("Mocks", (), mocks)()


class TestCheckAllStreaks:
    def test_breaks_old_streaks(self, mock_db):
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        two_days_ago = (date.today() - timedelta(days=2)).isoformat()

        streaks = [
            {
                "id": 1, "user_id": 1, "mode_id": 1,
                "current_streak": 5, "longest_streak": 10,
                "last_activity_date": two_days_ago,
                "telegram_id": 111, "first_name": "Alice",
            },
        ]
        mock_db.execute_query.return_value = streaks
        mock_db.execute_update.return_value = 1

        result = sm.check_all_streaks()

        assert result['success'] is True
        assert result['broken'] == 1
        assert result['maintained'] == 0
        assert result['total_checked'] == 1
        assert result['broken_details'][0]['user_id'] == 1
        assert result['broken_details'][0]['was_streak'] == 5
        mock_db.execute_update.assert_called_once()

    def test_maintains_recent_streaks(self, mock_db):
        yesterday = (date.today() - timedelta(days=1)).isoformat()

        streaks = [
            {
                "id": 1, "user_id": 1, "mode_id": 1,
                "current_streak": 3, "longest_streak": 3,
                "last_activity_date": yesterday,
                "telegram_id": 111, "first_name": "Alice",
            },
        ]
        mock_db.execute_query.return_value = streaks

        result = sm.check_all_streaks()

        assert result['success'] is True
        assert result['broken'] == 0
        assert result['maintained'] == 1
        mock_db.execute_update.assert_not_called()

    def test_today_activity_maintains_streak(self, mock_db):
        today = date.today().isoformat()

        streaks = [
            {
                "id": 1, "user_id": 1, "mode_id": 1,
                "current_streak": 7, "longest_streak": 7,
                "last_activity_date": today,
                "telegram_id": 111, "first_name": "Alice",
            },
        ]
        mock_db.execute_query.return_value = streaks

        result = sm.check_all_streaks()

        assert result['broken'] == 0
        assert result['maintained'] == 1

    def test_null_last_activity_breaks_streak(self, mock_db):
        streaks = [
            {
                "id": 1, "user_id": 1, "mode_id": 1,
                "current_streak": 2, "longest_streak": 5,
                "last_activity_date": None,
                "telegram_id": 111, "first_name": "Alice",
            },
        ]
        mock_db.execute_query.return_value = streaks
        mock_db.execute_update.return_value = 1

        result = sm.check_all_streaks()

        assert result['broken'] == 1

    def test_no_active_streaks(self, mock_db):
        mock_db.execute_query.return_value = []

        result = sm.check_all_streaks()

        assert result['success'] is True
        assert result['broken'] == 0
        assert result['maintained'] == 0
        assert result['total_checked'] == 0

    def test_mixed_broken_and_maintained(self, mock_db):
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        week_ago = (date.today() - timedelta(days=7)).isoformat()

        streaks = [
            {
                "id": 1, "user_id": 1, "mode_id": 1,
                "current_streak": 3, "longest_streak": 5,
                "last_activity_date": yesterday,
                "telegram_id": 111, "first_name": "Alice",
            },
            {
                "id": 2, "user_id": 2, "mode_id": 1,
                "current_streak": 10, "longest_streak": 10,
                "last_activity_date": week_ago,
                "telegram_id": 222, "first_name": "Bob",
            },
        ]
        mock_db.execute_query.return_value = streaks
        mock_db.execute_update.return_value = 1

        result = sm.check_all_streaks()

        assert result['broken'] == 1
        assert result['maintained'] == 1
        assert result['total_checked'] == 2


class TestUpdateStreak:
    def test_increment_consecutive_day(self, mock_db):
        yesterday = (date.today() - timedelta(days=1)).isoformat()

        mock_db.execute_query.return_value = {
            "current_streak": 5, "longest_streak": 10,
            "last_activity_date": yesterday,
        }
        mock_db.execute_update.return_value = 1

        result = sm.update_streak(user_id=1, mode_id=1)

        assert result['success'] is True
        assert result['action'] == 'incremented'
        assert result['current_streak'] == 6
        assert result['longest_streak'] == 10

    def test_reset_after_gap(self, mock_db):
        week_ago = (date.today() - timedelta(days=7)).isoformat()

        mock_db.execute_query.return_value = {
            "current_streak": 5, "longest_streak": 10,
            "last_activity_date": week_ago,
        }
        mock_db.execute_update.return_value = 1

        result = sm.update_streak(user_id=1, mode_id=1)

        assert result['success'] is True
        assert result['action'] == 'reset_to_1'
        assert result['current_streak'] == 1

    def test_no_change_if_already_today(self, mock_db):
        today = date.today().isoformat()

        mock_db.execute_query.return_value = {
            "current_streak": 5, "longest_streak": 10,
            "last_activity_date": today,
        }

        result = sm.update_streak(user_id=1, mode_id=1)

        assert result['success'] is True
        assert result['action'] == 'no_change'
        assert result['current_streak'] == 5
        mock_db.execute_update.assert_not_called()

    def test_updates_longest_streak(self, mock_db):
        yesterday = (date.today() - timedelta(days=1)).isoformat()

        mock_db.execute_query.return_value = {
            "current_streak": 10, "longest_streak": 10,
            "last_activity_date": yesterday,
        }
        mock_db.execute_update.return_value = 1

        result = sm.update_streak(user_id=1, mode_id=1)

        assert result['current_streak'] == 11
        assert result['longest_streak'] == 11  # new record

    def test_streak_record_not_found(self, mock_db):
        mock_db.execute_query.return_value = None

        result = sm.update_streak(user_id=1, mode_id=1)

        assert result['success'] is False
        assert 'not found' in result['error']

    def test_null_last_activity_resets_to_1(self, mock_db):
        mock_db.execute_query.return_value = {
            "current_streak": 0, "longest_streak": 5,
            "last_activity_date": None,
        }
        mock_db.execute_update.return_value = 1

        result = sm.update_streak(user_id=1, mode_id=1)

        assert result['action'] == 'reset_to_1'
        assert result['current_streak'] == 1

    def test_invalid_user_id(self):
        with pytest.raises(ValueError, match="positive"):
            sm.update_streak(user_id=0, mode_id=1)

    def test_invalid_mode_id(self):
        with pytest.raises(ValueError, match="positive"):
            sm.update_streak(user_id=1, mode_id=-1)


class TestGetUserStreaks:
    def test_returns_streaks_with_mode_info(self, mock_db):
        streaks = [
            {"user_id": 1, "mode_id": 1, "current_streak": 5, "mode_name": "fitness", "display_name": "Fitness", "icon_emoji": "💪"},
            {"user_id": 1, "mode_id": 2, "current_streak": 3, "mode_name": "hydration", "display_name": "Hydration", "icon_emoji": "💧"},
        ]
        mock_db.execute_query.return_value = streaks

        result = sm.get_user_streaks(user_id=1)

        assert len(result) == 2
        assert result[0]['mode_name'] == 'fitness'
        assert result[1]['current_streak'] == 3

    def test_empty_streaks(self, mock_db):
        mock_db.execute_query.return_value = []
        result = sm.get_user_streaks(user_id=1)
        assert result == []

    def test_invalid_user_id(self):
        with pytest.raises(ValueError, match="positive"):
            sm.get_user_streaks(user_id=0)
