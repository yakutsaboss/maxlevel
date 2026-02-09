#!/usr/bin/env python3
"""Tests for tools/quest_manager.py — mocks db_operations, no real DB."""

import os
import sys
import pytest
from unittest.mock import MagicMock

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import tools.quest_manager as qm


@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    """Mock db functions where they're imported (on quest_manager module)."""
    mocks = {
        "execute_query": MagicMock(return_value=None),
        "execute_insert": MagicMock(return_value=None),
        "execute_update": MagicMock(return_value=0),
        "close_pool": MagicMock(),
    }
    for name, mock in mocks.items():
        monkeypatch.setattr(qm, name, mock)
    return type("Mocks", (), mocks)()


class TestAssignQuest:
    def test_quest_not_found(self, mock_db):
        mock_db.execute_query.return_value = None
        result = qm.assign_quest(1, 999)
        assert result["success"] is False
        assert "not found" in result["error"]

    def test_already_assigned(self, mock_db):
        quest = {"id": 1, "title": "Test", "xp_reward": 50, "quest_type": "daily", "difficulty": "easy"}
        existing = {"id": 10}

        def side_effect(query, params=None, fetch='all'):
            if "FROM quests" in query:
                return quest
            if "FROM quest_instances" in query:
                return existing
            return None

        mock_db.execute_query.side_effect = side_effect

        result = qm.assign_quest(1, 1, "2026-01-01")
        assert result["success"] is False
        assert "already assigned" in result["error"]

    def test_successful_assignment(self, mock_db):
        quest = {"id": 1, "title": "Run 5km", "description": "Go run", "xp_reward": 50,
                 "quest_type": "daily", "difficulty": "medium"}
        instance = {"id": 10}

        def side_effect(query, params=None, fetch='all'):
            if "FROM quests" in query:
                return quest
            if "FROM quest_instances" in query:
                return None
            return None

        mock_db.execute_query.side_effect = side_effect
        mock_db.execute_insert.return_value = instance

        result = qm.assign_quest(1, 1, "2026-01-01")
        assert result["success"] is True
        assert result["quest_instance"]["title"] == "Run 5km"
        assert result["quest_instance"]["xp_reward"] == 50

    def test_invalid_user_id_raises(self):
        with pytest.raises(ValueError, match="positive"):
            qm.assign_quest(0, 1)

    def test_invalid_quest_id_raises(self):
        with pytest.raises(ValueError, match="positive"):
            qm.assign_quest(1, -1)


class TestAssignDailyQuests:
    def test_no_active_modes(self, mock_db):
        mock_db.execute_query.return_value = []
        result = qm.assign_daily_quests(1)
        assert result["success"] is False
        assert "no active modes" in result["error"]

    def test_no_available_quests(self, mock_db):
        def side_effect(query, params=None, fetch='all'):
            if "FROM user_modes" in query:
                return [{"mode_id": 1}]
            return []

        mock_db.execute_query.side_effect = side_effect

        result = qm.assign_daily_quests(1)
        assert result["success"] is False
        assert "No available" in result["error"]

    def test_invalid_user_id_raises(self):
        with pytest.raises(ValueError, match="positive"):
            qm.assign_daily_quests(-1)

    def test_invalid_count_raises(self):
        with pytest.raises(ValueError, match="between 1 and 50"):
            qm.assign_daily_quests(1, count=0)

    def test_count_over_50_raises(self):
        with pytest.raises(ValueError, match="between 1 and 50"):
            qm.assign_daily_quests(1, count=100)


class TestAssignWeeklyQuests:
    def test_no_active_modes(self, mock_db):
        mock_db.execute_query.return_value = []
        result = qm.assign_weekly_quests(1)
        assert result["success"] is False

    def test_invalid_user_id_raises(self):
        with pytest.raises(ValueError, match="positive"):
            qm.assign_weekly_quests(0)


class TestCompleteQuest:
    def test_instance_not_found(self, mock_db):
        mock_db.execute_query.return_value = None
        result = qm.complete_quest(999)
        assert result["success"] is False
        assert "not found" in result["error"]

    def test_already_completed(self, mock_db):
        instance = {"id": 1, "status": "completed", "user_id": 1}
        mock_db.execute_query.return_value = instance
        result = qm.complete_quest(1)
        assert result["success"] is False
        assert "already completed" in result["error"]

    def test_successful_completion(self, mock_db):
        instance = {
            "id": 1, "status": "pending", "user_id": 1, "quest_id": 1,
            "title": "Test Quest", "xp_reward": 100, "quest_type": "daily",
            "difficulty": "easy", "mode_id": 1, "mode_name": "fitness",
            "mode_icon": "x"
        }
        user_after = {"total_xp": 100, "current_level": 1}

        def side_effect(query, params=None, fetch='all'):
            if "FROM quest_instances" in query and "JOIN" in query:
                return instance
            if "FROM users" in query:
                return user_after
            return None

        mock_db.execute_query.side_effect = side_effect

        result = qm.complete_quest(1)
        assert result["success"] is True
        assert result["xp_awarded"] == 100
        assert result["title"] == "Test Quest"

    def test_invalid_id_raises(self):
        with pytest.raises(ValueError, match="positive"):
            qm.complete_quest(0)


class TestGetActiveQuests:
    def test_returns_quests(self, mock_db):
        quests = [{"id": 1, "name": "Run"}, {"id": 2, "name": "Read"}]
        mock_db.execute_query.return_value = quests
        result = qm.get_active_quests(1)
        assert result["success"] is True
        assert result["count"] == 2

    def test_empty_list(self, mock_db):
        mock_db.execute_query.return_value = []
        result = qm.get_active_quests(1)
        assert result["success"] is True
        assert result["count"] == 0

    def test_invalid_user_id_raises(self):
        with pytest.raises(ValueError):
            qm.get_active_quests(-1)


class TestGetCompletedQuests:
    def test_returns_quests(self, mock_db):
        quests = [{"id": 1}]
        mock_db.execute_query.return_value = quests
        result = qm.get_completed_quests(1)
        assert result["success"] is True
        assert result["count"] == 1


class TestGetQuestStats:
    def test_returns_stats(self, mock_db):
        mock_db.execute_query.return_value = {"total": 5}
        result = qm.get_quest_stats(1)
        assert result["success"] is True
        assert "stats" in result

    def test_invalid_user_id_raises(self):
        with pytest.raises(ValueError):
            qm.get_quest_stats(0)
