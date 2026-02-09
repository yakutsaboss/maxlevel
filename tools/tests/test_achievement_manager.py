#!/usr/bin/env python3
"""Tests for tools/achievement_manager.py — mocks db connections, no real DB."""

import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import tools.achievement_manager as am
from tools.achievement_manager import AchievementManager


@pytest.fixture
def manager():
    """Create AchievementManager with mocked connection."""
    mgr = AchievementManager()
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mgr.conn = mock_conn
    return mgr, mock_conn, mock_cursor


class TestUnlockAchievement:
    def test_success(self, manager):
        mgr, conn, cursor = manager
        # Not already unlocked
        cursor.fetchone.side_effect = [
            None,  # not already unlocked
            (1, 'First Steps', 'Complete your first quest', 100, 'common', '🏅'),  # achievement details
            (1, datetime(2025, 1, 15)),  # insert result
        ]

        result = mgr.unlock_achievement(user_id=1, achievement_id=1)

        assert result['success'] is True
        assert result['achievement']['name'] == 'First Steps'
        assert result['achievement']['xp_reward'] == 100
        conn.commit.assert_called_once()

    def test_already_unlocked(self, manager):
        mgr, conn, cursor = manager
        cursor.fetchone.return_value = (1,)  # already exists

        result = mgr.unlock_achievement(user_id=1, achievement_id=1)

        assert result['success'] is False
        assert 'already unlocked' in result['error']

    def test_achievement_not_found(self, manager):
        mgr, conn, cursor = manager
        cursor.fetchone.side_effect = [
            None,  # not already unlocked
            None,  # achievement not found
        ]

        result = mgr.unlock_achievement(user_id=1, achievement_id=999)

        assert result['success'] is False
        assert 'not found' in result['error']

    def test_invalid_user_id_raises(self):
        mgr = AchievementManager()
        with pytest.raises(ValueError, match="positive"):
            mgr.unlock_achievement(user_id=-1, achievement_id=1)

    def test_invalid_achievement_id_raises(self):
        mgr = AchievementManager()
        with pytest.raises(ValueError, match="positive"):
            mgr.unlock_achievement(user_id=1, achievement_id=0)

    def test_integrity_error_rollback(self, manager):
        import psycopg2
        mgr, conn, cursor = manager
        cursor.fetchone.side_effect = [None, (1, 'Test', 'Desc', 50, 'common', '🏅')]
        cursor.execute.side_effect = [None, None, psycopg2.IntegrityError("duplicate")]

        result = mgr.unlock_achievement(user_id=1, achievement_id=1)

        assert result['success'] is False
        assert 'Constraint violation' in result['error']
        conn.rollback.assert_called_once()

    def test_operational_error_rollback(self, manager):
        import psycopg2
        mgr, conn, cursor = manager
        cursor.execute.side_effect = psycopg2.OperationalError("connection lost")

        result = mgr.unlock_achievement(user_id=1, achievement_id=1)

        assert result['success'] is False
        assert 'DB connection error' in result['error']
        conn.rollback.assert_called_once()


class TestCheckAndUnlockAchievements:
    def test_unlocks_qualifying_achievements(self, manager):
        mgr, conn, cursor = manager

        # User stats
        cursor.fetchone.side_effect = [
            (5, 2500, 3, 10, 42, 30, 5),  # stats
            (1, datetime(2025, 1, 15)),  # insert return
        ]
        # Not-yet-unlocked achievements
        cursor.fetchall.side_effect = [
            [
                (1, 'Quest Master', 'Complete 10 quests', 200, 'rare', '⭐', 'quest_count', 10),
            ],
        ]

        result = mgr.check_and_unlock_achievements(user_id=1)

        assert result['success'] is True
        assert result['count'] == 1
        assert result['newly_unlocked'][0]['name'] == 'Quest Master'
        conn.commit.assert_called_once()

    def test_no_qualifying_achievements(self, manager):
        mgr, conn, cursor = manager

        # User stats: low level, no streaks, etc.
        cursor.fetchone.side_effect = [
            (1, 100, 0, 0, 0, 0, 0),  # stats
        ]
        # Achievements that user doesn't qualify for
        cursor.fetchall.side_effect = [
            [
                (1, 'Level 10', 'Reach level 10', 500, 'epic', '🌟', 'level', 10),
            ],
        ]

        result = mgr.check_and_unlock_achievements(user_id=1)

        assert result['success'] is True
        assert result['count'] == 0
        assert result['newly_unlocked'] == []

    def test_user_stats_not_found(self, manager):
        mgr, conn, cursor = manager
        cursor.fetchone.return_value = None

        result = mgr.check_and_unlock_achievements(user_id=999)

        assert result['success'] is False
        assert 'not found' in result['error']

    def test_criteria_types(self, manager):
        """Test all 7 criteria types evaluate correctly."""
        mgr, conn, cursor = manager

        # User stats: high values to qualify for everything
        stats = (10, 5000, 7, 15, 100, 50, 10)

        criteria_tests = [
            ('level', 10),
            ('total_xp', 5000),
            ('quest_count', 100),
            ('streak', 7),
            ('longest_streak', 15),
            ('daily_quests', 50),
            ('weekly_quests', 10),
        ]

        for criteria_type, criteria_value in criteria_tests:
            cursor.fetchone.side_effect = [
                stats,
                (1, datetime(2025, 1, 1)),  # insert return
            ]
            cursor.fetchall.return_value = [
                (1, f'Test {criteria_type}', 'Desc', 100, 'common', '🏆', criteria_type, criteria_value),
            ]

            result = mgr.check_and_unlock_achievements(user_id=1)
            assert result['success'] is True, f"Failed for criteria_type={criteria_type}"
            assert result['count'] == 1, f"Should qualify for criteria_type={criteria_type}"

    def test_invalid_user_id(self):
        mgr = AchievementManager()
        with pytest.raises(ValueError):
            mgr.check_and_unlock_achievements(user_id=0)


class TestGetUserAchievements:
    def test_returns_achievements(self, manager):
        mgr, conn, cursor = manager

        cursor.fetchall.return_value = [
            (1, 10, 'First Steps', 'Complete first quest', 50, 'common', '🏅', 'quests', datetime(2025, 1, 1), 100),
        ]
        cursor.fetchone.return_value = (20,)  # total count

        result = mgr.get_user_achievements(user_id=1)

        assert result['success'] is True
        assert result['unlocked'] == 1
        assert result['total'] == 20
        assert result['percentage'] == 5.0
        assert result['achievements'][0]['name'] == 'First Steps'

    def test_empty_achievements(self, manager):
        mgr, conn, cursor = manager

        cursor.fetchall.return_value = []
        cursor.fetchone.return_value = (10,)

        result = mgr.get_user_achievements(user_id=1)

        assert result['success'] is True
        assert result['unlocked'] == 0
        assert result['total'] == 10
        assert result['percentage'] == 0

    def test_zero_total_achievements(self, manager):
        mgr, conn, cursor = manager

        cursor.fetchall.return_value = []
        cursor.fetchone.return_value = (0,)

        result = mgr.get_user_achievements(user_id=1)

        assert result['success'] is True
        assert result['percentage'] == 0

    def test_invalid_user_id(self):
        mgr = AchievementManager()
        with pytest.raises(ValueError):
            mgr.get_user_achievements(user_id=-1)


class TestFormatCriteria:
    def test_level(self):
        assert AchievementManager._format_criteria('level', 10) == 'Reach level 10'

    def test_total_xp(self):
        assert AchievementManager._format_criteria('total_xp', 5000) == 'Earn 5000 total XP'

    def test_quest_count(self):
        assert AchievementManager._format_criteria('quest_count', 50) == 'Complete 50 quests'

    def test_streak(self):
        assert AchievementManager._format_criteria('streak', 7) == 'Maintain a 7-day streak'

    def test_unknown_criteria(self):
        assert AchievementManager._format_criteria('custom', 42) == 'custom: 42'
