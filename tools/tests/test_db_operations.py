#!/usr/bin/env python3
"""Tests for tools/db_operations.py — mocks psycopg2, no real DB calls."""

import os
import sys
import json
import pytest
from unittest.mock import MagicMock, patch, PropertyMock

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Set DATABASE_URL before importing db_operations
os.environ.setdefault('DATABASE_URL', 'postgresql://test:test@localhost:5432/testdb')


# ── Connection Pool Tests ────────────────────────────────────────────


class TestGetConnectionPool:
    """Test get_connection_pool() function."""

    def setup_method(self):
        """Reset global pool before each test."""
        import tools.db_operations as db_ops
        db_ops._connection_pool = None

    @patch('tools.db_operations.pool.SimpleConnectionPool')
    def test_creates_pool_on_first_call(self, mock_pool_cls):
        from tools.db_operations import get_connection_pool
        mock_pool = MagicMock()
        mock_pool_cls.return_value = mock_pool

        result = get_connection_pool()

        assert result is mock_pool
        mock_pool_cls.assert_called_once()

    @patch('tools.db_operations.pool.SimpleConnectionPool')
    def test_reuses_existing_pool(self, mock_pool_cls):
        from tools.db_operations import get_connection_pool
        import tools.db_operations as db_ops

        mock_pool = MagicMock()
        db_ops._connection_pool = mock_pool

        result = get_connection_pool()

        assert result is mock_pool
        mock_pool_cls.assert_not_called()

    @patch.dict(os.environ, {'DATABASE_URL': ''})
    def test_raises_if_no_database_url(self):
        from tools.db_operations import get_connection_pool
        import tools.db_operations as db_ops
        db_ops._connection_pool = None

        with pytest.raises(ValueError, match="DATABASE_URL"):
            get_connection_pool()

    @patch.dict(os.environ, {
        'DATABASE_URL': 'postgresql://test:test@localhost/testdb',
        'DB_SSL_MODE': 'require',
        'DB_SSL_ROOT_CERT': '~/.postgresql/root.crt',
    })
    @patch('tools.db_operations.pool.SimpleConnectionPool')
    def test_passes_ssl_params(self, mock_pool_cls):
        from tools.db_operations import get_connection_pool
        import tools.db_operations as db_ops
        db_ops._connection_pool = None

        get_connection_pool()

        call_kwargs = mock_pool_cls.call_args[1]
        assert call_kwargs['sslmode'] == 'require'
        assert 'sslrootcert' in call_kwargs


# ── Connection Context Manager Tests ─────────────────────────────────


class TestGetConnection:
    """Test get_connection() context manager."""

    def setup_method(self):
        import tools.db_operations as db_ops
        db_ops._connection_pool = None

    @patch('tools.db_operations.get_connection_pool')
    def test_gets_and_returns_connection(self, mock_get_pool):
        from tools.db_operations import get_connection

        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_pool.getconn.return_value = mock_conn
        mock_get_pool.return_value = mock_pool

        with get_connection() as conn:
            assert conn is mock_conn

        mock_pool.getconn.assert_called_once()
        mock_pool.putconn.assert_called_once_with(mock_conn)

    @patch('tools.db_operations.get_connection_pool')
    def test_returns_connection_on_exception(self, mock_get_pool):
        from tools.db_operations import get_connection

        mock_pool = MagicMock()
        mock_conn = MagicMock()
        mock_pool.getconn.return_value = mock_conn
        mock_get_pool.return_value = mock_pool

        with pytest.raises(RuntimeError):
            with get_connection() as conn:
                raise RuntimeError("test error")

        mock_pool.putconn.assert_called_once_with(mock_conn)


# ── Cursor Context Manager Tests ─────────────────────────────────────


class TestGetCursor:
    """Test get_cursor() context manager."""

    @patch('tools.db_operations.get_connection')
    def test_commits_on_success(self, mock_get_conn):
        from tools.db_operations import get_cursor

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        with get_cursor() as cur:
            cur.execute("SELECT 1")

        mock_conn.commit.assert_called_once()
        mock_cursor.close.assert_called_once()

    @patch('tools.db_operations.get_connection')
    def test_rollback_on_exception(self, mock_get_conn):
        from tools.db_operations import get_cursor

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        with pytest.raises(ValueError):
            with get_cursor() as cur:
                raise ValueError("bad query")

        mock_conn.rollback.assert_called_once()
        mock_cursor.close.assert_called_once()

    @patch('tools.db_operations.get_connection')
    def test_uses_cursor_factory(self, mock_get_conn):
        from tools.db_operations import get_cursor
        from psycopg2 import extras

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        with get_cursor(cursor_factory=extras.RealDictCursor) as cur:
            pass

        mock_conn.cursor.assert_called_once_with(cursor_factory=extras.RealDictCursor)


# ── execute_query Tests ──────────────────────────────────────────────


class TestExecuteQuery:
    """Test execute_query() function."""

    @patch('tools.db_operations.get_cursor')
    def test_fetch_all_returns_list_of_dicts(self, mock_get_cursor):
        from tools.db_operations import execute_query

        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            {'id': 1, 'name': 'Alice'},
            {'id': 2, 'name': 'Bob'},
        ]
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = execute_query("SELECT * FROM users")

        assert len(result) == 2
        assert result[0]['name'] == 'Alice'
        assert result[1]['name'] == 'Bob'

    @patch('tools.db_operations.get_cursor')
    def test_fetch_one_returns_single_dict(self, mock_get_cursor):
        from tools.db_operations import execute_query

        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = {'id': 1, 'name': 'Alice'}
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = execute_query("SELECT * FROM users WHERE id = %s", (1,), fetch='one')

        assert result['name'] == 'Alice'

    @patch('tools.db_operations.get_cursor')
    def test_fetch_one_returns_none_for_no_result(self, mock_get_cursor):
        from tools.db_operations import execute_query

        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = execute_query("SELECT * FROM users WHERE id = %s", (999,), fetch='one')

        assert result is None

    @patch('tools.db_operations.get_cursor')
    def test_fetch_none_returns_empty_list(self, mock_get_cursor):
        from tools.db_operations import execute_query

        mock_cursor = MagicMock()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = execute_query("INSERT INTO log ...", fetch='none')

        assert result == []

    @patch('tools.db_operations.get_cursor')
    def test_invalid_fetch_raises_valueerror(self, mock_get_cursor):
        from tools.db_operations import execute_query

        mock_cursor = MagicMock()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        with pytest.raises(ValueError, match="Invalid fetch parameter"):
            execute_query("SELECT 1", fetch='invalid')


# ── execute_insert Tests ─────────────────────────────────────────────


class TestExecuteInsert:
    """Test execute_insert() function."""

    @patch('tools.db_operations.get_cursor')
    def test_returns_inserted_row(self, mock_get_cursor):
        from tools.db_operations import execute_insert

        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = {'id': 5, 'name': 'Charlie'}
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = execute_insert(
            "INSERT INTO users (name) VALUES (%s) RETURNING *",
            ('Charlie',)
        )

        assert result['id'] == 5
        assert result['name'] == 'Charlie'

    @patch('tools.db_operations.get_cursor')
    def test_returning_false(self, mock_get_cursor):
        from tools.db_operations import execute_insert

        mock_cursor = MagicMock()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = execute_insert(
            "INSERT INTO log (msg) VALUES (%s)",
            ('test',),
            returning=False
        )

        assert result is None


# ── execute_update / execute_delete Tests ────────────────────────────


class TestExecuteUpdate:
    """Test execute_update() function."""

    @patch('tools.db_operations.get_cursor')
    def test_returns_rowcount(self, mock_get_cursor):
        from tools.db_operations import execute_update

        mock_cursor = MagicMock()
        mock_cursor.rowcount = 3
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = execute_update("UPDATE users SET active = TRUE WHERE id > %s", (10,))

        assert result == 3


class TestExecuteDelete:
    """Test execute_delete() function."""

    @patch('tools.db_operations.get_cursor')
    def test_returns_rowcount(self, mock_get_cursor):
        from tools.db_operations import execute_delete

        mock_cursor = MagicMock()
        mock_cursor.rowcount = 1
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = execute_delete("DELETE FROM users WHERE id = %s", (42,))

        assert result == 1


# ── Transaction Context Manager Tests ────────────────────────────────


class TestTransaction:
    """Test transaction() context manager."""

    @patch('tools.db_operations.get_connection')
    def test_commits_on_success(self, mock_get_conn):
        from tools.db_operations import transaction

        mock_conn = MagicMock()
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        with transaction() as conn:
            assert conn is mock_conn

        mock_conn.commit.assert_called_once()

    @patch('tools.db_operations.get_connection')
    def test_rollback_on_exception(self, mock_get_conn):
        from tools.db_operations import transaction

        mock_conn = MagicMock()
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        with pytest.raises(RuntimeError):
            with transaction() as conn:
                raise RuntimeError("boom")

        mock_conn.rollback.assert_called_once()


# ── test_connection Tests ────────────────────────────────────────────


class TestTestConnection:
    """Test test_connection() function."""

    @patch('tools.db_operations.get_cursor')
    def test_returns_true_on_success(self, mock_get_cursor):
        from tools.db_operations import test_connection

        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (1,)
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        assert test_connection() is True

    @patch('tools.db_operations.get_cursor')
    def test_returns_false_on_exception(self, mock_get_cursor):
        from tools.db_operations import test_connection

        mock_get_cursor.return_value.__enter__ = MagicMock(
            side_effect=Exception("connection refused")
        )
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        assert test_connection() is False


# ── close_pool Tests ─────────────────────────────────────────────────


class TestClosePool:
    """Test close_pool() function."""

    def test_closes_existing_pool(self):
        import tools.db_operations as db_ops
        from tools.db_operations import close_pool

        mock_pool = MagicMock()
        db_ops._connection_pool = mock_pool

        close_pool()

        mock_pool.closeall.assert_called_once()
        assert db_ops._connection_pool is None

    def test_noop_when_no_pool(self):
        import tools.db_operations as db_ops
        from tools.db_operations import close_pool

        db_ops._connection_pool = None
        close_pool()  # Should not raise
        assert db_ops._connection_pool is None
