#!/usr/bin/env python3
"""Tests for tools/user_manager.py — mocks db_operations, no real DB."""

import os
import sys
import pytest
from unittest.mock import MagicMock

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import tools.user_manager as um
from tools.user_manager import ALLOWED_UPDATE_FIELDS


@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    """Mock db functions where they're imported (on user_manager module)."""
    mocks = {
        "execute_query": MagicMock(return_value=None),
        "execute_insert": MagicMock(return_value=None),
        "execute_update": MagicMock(return_value=0),
        "execute_delete": MagicMock(return_value=0),
        "close_pool": MagicMock(),
    }
    for name, mock in mocks.items():
        monkeypatch.setattr(um, name, mock)
    return type("Mocks", (), mocks)()


class TestCreateUser:
    def test_returns_existing_user(self, mock_db):
        existing = {"id": 1, "telegram_id": 123, "username": "test"}
        mock_db.execute_query.return_value = existing

        result = um.create_user(telegram_id=123)
        assert result == existing
        mock_db.execute_insert.assert_not_called()

    def test_creates_new_user(self, mock_db):
        mock_db.execute_query.return_value = None
        new_user = {"id": 1, "telegram_id": 123, "username": None, "first_name": "John"}
        mock_db.execute_insert.return_value = new_user

        result = um.create_user(telegram_id=123, first_name="John")
        assert result == new_user
        mock_db.execute_insert.assert_called_once()

    def test_invalid_telegram_id_raises(self):
        with pytest.raises(ValueError, match="positive"):
            um.create_user(telegram_id=-1)

    def test_validates_timezone(self):
        with pytest.raises(ValueError, match="Invalid timezone"):
            um.create_user(telegram_id=123, timezone="Invalid/Zone")


class TestGetUserByTelegramId:
    def test_found(self, mock_db):
        user = {"id": 1, "telegram_id": 123}
        mock_db.execute_query.return_value = user
        result = um.get_user_by_telegram_id(123)
        assert result == user

    def test_not_found(self, mock_db):
        mock_db.execute_query.return_value = None
        result = um.get_user_by_telegram_id(123)
        assert result is None

    def test_invalid_id_raises(self):
        with pytest.raises(ValueError):
            um.get_user_by_telegram_id(0)


class TestGetUserById:
    def test_found(self, mock_db):
        user = {"id": 1, "telegram_id": 123}
        mock_db.execute_query.return_value = user
        result = um.get_user_by_id(1)
        assert result == user

    def test_invalid_id_raises(self):
        with pytest.raises(ValueError, match="positive"):
            um.get_user_by_id(-1)


class TestUpdateUserProfile:
    def test_no_fields_returns_current(self, mock_db):
        user = {"id": 1, "username": "test"}
        mock_db.execute_query.return_value = user
        result = um.update_user_profile(1)
        assert result == user

    def test_invalid_field_raises(self):
        with pytest.raises(ValueError, match="Invalid field"):
            um.update_user_profile(1, evil_field="drop table")

    def test_allowed_fields_accepted(self, mock_db):
        for field in ALLOWED_UPDATE_FIELDS:
            try:
                um.update_user_profile(1, **{field: "test_value"})
            except ValueError as e:
                if "Invalid field" in str(e):
                    pytest.fail(f"Field '{field}' should be allowed but was rejected")
            except Exception:
                pass  # DB errors expected — we only test whitelist validation

    def test_sql_injection_blocked(self):
        with pytest.raises(ValueError, match="Invalid field"):
            um.update_user_profile(1, **{"id; DROP TABLE users--": "hack"})

    def test_validates_timezone_value(self):
        with pytest.raises(ValueError, match="Invalid timezone"):
            um.update_user_profile(1, timezone="Not/Real")


class TestDeleteUser:
    def test_deleted(self, mock_db):
        mock_db.execute_delete.return_value = 1
        assert um.delete_user(1) is True

    def test_not_found(self, mock_db):
        mock_db.execute_delete.return_value = 0
        assert um.delete_user(1) is False

    def test_invalid_id_raises(self):
        with pytest.raises(ValueError, match="positive"):
            um.delete_user(0)
