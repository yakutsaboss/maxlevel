#!/usr/bin/env python3
"""Tests for tools/mode_manager.py — mocks db_operations, no real DB."""

import os
import sys
import pytest
from unittest.mock import MagicMock

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import tools.mode_manager as mm


@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    """Mock db functions where they're imported (on mode_manager module)."""
    mocks = {
        "execute_query": MagicMock(return_value=[]),
        "execute_insert": MagicMock(return_value=None),
        "execute_update": MagicMock(return_value=0),
        "execute_delete": MagicMock(return_value=0),
        "close_pool": MagicMock(),
    }
    for name, mock in mocks.items():
        monkeypatch.setattr(mm, name, mock)
    return type("Mocks", (), mocks)()


class TestListAllModes:
    def test_returns_all_modes(self, mock_db):
        modes = [
            {"id": 1, "name": "fitness", "display_name": "Fitness"},
            {"id": 2, "name": "hydration", "display_name": "Hydration"},
        ]
        mock_db.execute_query.return_value = modes

        result = mm.list_all_modes()
        assert result == modes
        assert len(result) == 2

    def test_returns_empty_list(self, mock_db):
        mock_db.execute_query.return_value = []
        result = mm.list_all_modes()
        assert result == []


class TestGetModeByName:
    def test_found(self, mock_db):
        mode = {"id": 1, "name": "fitness", "display_name": "Fitness"}
        mock_db.execute_query.return_value = mode

        result = mm.get_mode_by_name("fitness")
        assert result == mode
        mock_db.execute_query.assert_called_once()

    def test_not_found(self, mock_db):
        mock_db.execute_query.return_value = None
        result = mm.get_mode_by_name("nonexistent")
        assert result is None

    def test_empty_name(self, mock_db):
        result = mm.get_mode_by_name("")
        assert result is None
        mock_db.execute_query.assert_not_called()

    def test_non_string_name(self, mock_db):
        result = mm.get_mode_by_name(None)
        assert result is None
        mock_db.execute_query.assert_not_called()

    def test_strips_whitespace(self, mock_db):
        mock_db.execute_query.return_value = {"id": 1, "name": "fitness"}
        mm.get_mode_by_name("  fitness  ")
        call_args = mock_db.execute_query.call_args
        assert call_args[0][1] == ("fitness",)


class TestGetModeById:
    def test_found(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        mock_db.execute_query.return_value = mode
        result = mm.get_mode_by_id(1)
        assert result == mode

    def test_invalid_id_raises(self):
        with pytest.raises(ValueError, match="positive"):
            mm.get_mode_by_id(0)

    def test_negative_id_raises(self):
        with pytest.raises(ValueError, match="positive"):
            mm.get_mode_by_id(-1)


class TestGetUserModes:
    def test_returns_active_modes(self, mock_db):
        modes = [
            {"mode_id": 1, "name": "fitness", "is_active": True},
            {"mode_id": 2, "name": "hydration", "is_active": True},
        ]
        mock_db.execute_query.return_value = modes

        result = mm.get_user_modes(user_id=1)
        assert len(result) == 2
        # Should include "AND um.is_active = TRUE" in query
        call_sql = mock_db.execute_query.call_args[0][0]
        assert "is_active = TRUE" in call_sql

    def test_returns_all_modes_when_not_active_only(self, mock_db):
        modes = [
            {"mode_id": 1, "name": "fitness", "is_active": True},
            {"mode_id": 2, "name": "sleep", "is_active": False},
        ]
        mock_db.execute_query.return_value = modes

        result = mm.get_user_modes(user_id=1, active_only=False)
        assert len(result) == 2

    def test_invalid_user_id_raises(self):
        with pytest.raises(ValueError, match="positive"):
            mm.get_user_modes(user_id=0)


class TestAddModeToUser:
    def test_adds_new_mode(self, mock_db):
        # get_mode_by_name returns mode
        mode = {"id": 1, "name": "fitness"}
        new_user_mode = {"id": 1, "user_id": 1, "mode_id": 1, "is_active": True}

        # First call: get_mode_by_name, Second call: check existing, Third: insert result
        mock_db.execute_query.side_effect = [mode, None]
        mock_db.execute_insert.side_effect = [new_user_mode, None]  # user_mode + streak

        result = mm.add_mode_to_user(user_id=1, mode_name="fitness")
        assert result == new_user_mode

    def test_reactivates_inactive_mode(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        existing = {"id": 5, "user_id": 1, "mode_id": 1, "is_active": False}
        reactivated = {"id": 5, "user_id": 1, "mode_id": 1, "is_active": True}

        mock_db.execute_query.side_effect = [mode, existing, reactivated]
        mock_db.execute_update.return_value = 1

        result = mm.add_mode_to_user(user_id=1, mode_name="fitness")
        assert result == reactivated
        mock_db.execute_update.assert_called_once()

    def test_returns_existing_active_mode(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        existing = {"id": 5, "user_id": 1, "mode_id": 1, "is_active": True}

        mock_db.execute_query.side_effect = [mode, existing]

        result = mm.add_mode_to_user(user_id=1, mode_name="fitness")
        assert result == existing
        mock_db.execute_insert.assert_not_called()

    def test_returns_none_for_unknown_mode(self, mock_db):
        mock_db.execute_query.return_value = None
        result = mm.add_mode_to_user(user_id=1, mode_name="nonexistent")
        assert result is None

    def test_invalid_user_id(self):
        with pytest.raises(ValueError, match="positive"):
            mm.add_mode_to_user(user_id=-1, mode_name="fitness")


class TestRemoveModeFromUser:
    def test_soft_delete_success(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        mock_db.execute_query.return_value = mode
        mock_db.execute_update.return_value = 1

        result = mm.remove_mode_from_user(user_id=1, mode_name="fitness")
        assert result is True

    def test_soft_delete_not_found(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        mock_db.execute_query.return_value = mode
        mock_db.execute_update.return_value = 0

        result = mm.remove_mode_from_user(user_id=1, mode_name="fitness")
        assert result is False

    def test_hard_delete(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        mock_db.execute_query.return_value = mode
        mock_db.execute_delete.return_value = 1

        result = mm.remove_mode_from_user(user_id=1, mode_name="fitness", soft_delete=False)
        assert result is True
        mock_db.execute_delete.assert_called_once()

    def test_mode_not_found(self, mock_db):
        mock_db.execute_query.return_value = None
        result = mm.remove_mode_from_user(user_id=1, mode_name="nonexistent")
        assert result is False

    def test_invalid_user_id(self):
        with pytest.raises(ValueError, match="positive"):
            mm.remove_mode_from_user(user_id=0, mode_name="fitness")


class TestRemoveModeById:
    def test_success(self, mock_db):
        mock_db.execute_update.return_value = 1
        result = mm.remove_mode_by_id(user_id=1, mode_id=1)
        assert result is True

    def test_not_found(self, mock_db):
        mock_db.execute_update.return_value = 0
        result = mm.remove_mode_by_id(user_id=1, mode_id=999)
        assert result is False

    def test_invalid_ids(self):
        with pytest.raises(ValueError):
            mm.remove_mode_by_id(user_id=0, mode_id=1)
        with pytest.raises(ValueError):
            mm.remove_mode_by_id(user_id=1, mode_id=0)


class TestToggleModeStatus:
    def test_toggle_on(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        updated = {"id": 5, "user_id": 1, "mode_id": 1, "is_active": True}

        mock_db.execute_query.side_effect = [mode, updated]
        mock_db.execute_update.return_value = 1

        result = mm.toggle_mode_status(user_id=1, mode_name="fitness", is_active=True)
        assert result == updated

    def test_toggle_not_found(self, mock_db):
        mock_db.execute_query.return_value = None
        result = mm.toggle_mode_status(user_id=1, mode_name="nonexistent", is_active=True)
        assert result is None

    def test_no_rows_affected(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        mock_db.execute_query.return_value = mode
        mock_db.execute_update.return_value = 0

        result = mm.toggle_mode_status(user_id=1, mode_name="fitness", is_active=True)
        assert result is None


class TestIsModeActiveForUser:
    def test_active(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        mock_db.execute_query.side_effect = [mode, {"is_active": True}]

        result = mm.is_mode_active_for_user(user_id=1, mode_name="fitness")
        assert result is True

    def test_inactive(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        mock_db.execute_query.side_effect = [mode, {"is_active": False}]

        result = mm.is_mode_active_for_user(user_id=1, mode_name="fitness")
        assert result is False

    def test_not_found(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        mock_db.execute_query.side_effect = [mode, None]

        result = mm.is_mode_active_for_user(user_id=1, mode_name="fitness")
        assert result is False

    def test_mode_not_found(self, mock_db):
        mock_db.execute_query.return_value = None
        result = mm.is_mode_active_for_user(user_id=1, mode_name="nonexistent")
        assert result is False


class TestAddMultipleModes:
    def test_adds_multiple(self, mock_db):
        # add_multiple_modes calls for EACH mode:
        # 1. get_mode_by_name (execute_query) — in add_multiple_modes
        # 2. execute_query existing check — in add_multiple_modes
        # 3. add_mode_to_user → get_mode_by_name (execute_query)
        # 4. add_mode_to_user → execute_query existing check
        # 5. add_mode_to_user → execute_insert user_mode
        # 6. add_mode_to_user → execute_insert streak
        fitness = {"id": 1, "name": "fitness"}
        hydration = {"id": 2, "name": "hydration"}
        user_mode1 = {"id": 1, "user_id": 1, "mode_id": 1, "is_active": True}
        user_mode2 = {"id": 2, "user_id": 1, "mode_id": 2, "is_active": True}

        mock_db.execute_query.side_effect = [
            fitness, None,       # add_multiple_modes: get_mode + check existing (fitness)
            fitness, None,       # add_mode_to_user: get_mode + check existing (fitness)
            hydration, None,     # add_multiple_modes: get_mode + check existing (hydration)
            hydration, None,     # add_mode_to_user: get_mode + check existing (hydration)
        ]
        mock_db.execute_insert.side_effect = [user_mode1, None, user_mode2, None]

        result = mm.add_multiple_modes(user_id=1, mode_names=["fitness", "hydration"])
        assert len(result['added']) == 2
        assert len(result['failed']) == 0

    def test_unknown_mode_fails(self, mock_db):
        mock_db.execute_query.return_value = None

        result = mm.add_multiple_modes(user_id=1, mode_names=["nonexistent"])
        assert len(result['failed']) == 1
        assert result['failed'][0]['reason'] == 'Mode not found'

    def test_already_active_skipped(self, mock_db):
        mode = {"id": 1, "name": "fitness"}
        existing = {"id": 5, "user_id": 1, "mode_id": 1, "is_active": True}

        mock_db.execute_query.side_effect = [mode, existing]

        result = mm.add_multiple_modes(user_id=1, mode_names=["fitness"])
        assert len(result['already_active']) == 1
        assert result['already_active'][0] == 'fitness'

    def test_invalid_user_id(self):
        with pytest.raises(ValueError):
            mm.add_multiple_modes(user_id=0, mode_names=["fitness"])
