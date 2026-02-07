#!/usr/bin/env python3
"""
Database Operations Tool
Provides connection pooling, query helpers, and transaction management.

Usage:
    python tools/db_operations.py --test-connection
    python tools/db_operations.py --query "SELECT * FROM users LIMIT 1"

This is a utility module that other tools import for database access.
"""

import os
import sys
import json
import argparse
from typing import Any, Dict, List, Optional, Tuple
from contextlib import contextmanager

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import psycopg2
from psycopg2 import pool, extras, sql
from psycopg2.extensions import connection as Connection
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Global connection pool
_connection_pool: Optional[pool.SimpleConnectionPool] = None


def get_connection_pool() -> pool.SimpleConnectionPool:
    """
    Get or create the global connection pool.

    Returns:
        SimpleConnectionPool instance

    Raises:
        ValueError: If DATABASE_URL is not set
        psycopg2.Error: If connection fails
    """
    global _connection_pool

    if _connection_pool is None:
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise ValueError("DATABASE_URL environment variable not set")

        # Build SSL parameters if configured (required for Timeweb Cloud)
        ssl_mode = os.getenv('DB_SSL_MODE')
        ssl_root_cert = os.getenv('DB_SSL_ROOT_CERT')

        connect_kwargs = {
            'minconn': 2,
            'maxconn': 10,
            'dsn': database_url,
        }

        if ssl_mode:
            connect_kwargs['sslmode'] = ssl_mode
        if ssl_root_cert:
            connect_kwargs['sslrootcert'] = os.path.expanduser(ssl_root_cert)

        # Create connection pool (min 2, max 10 connections)
        _connection_pool = pool.SimpleConnectionPool(**connect_kwargs)

    return _connection_pool


@contextmanager
def get_connection():
    """
    Context manager to get a database connection from the pool.

    Usage:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users")
            results = cursor.fetchall()

    Yields:
        psycopg2 connection object
    """
    conn_pool = get_connection_pool()
    conn = conn_pool.getconn()

    try:
        yield conn
    finally:
        conn_pool.putconn(conn)


@contextmanager
def get_cursor(cursor_factory=None):
    """
    Context manager to get a database cursor with automatic connection management.

    Args:
        cursor_factory: Optional cursor factory (e.g., RealDictCursor for dict results)

    Usage:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()

    Yields:
        psycopg2 cursor object
    """
    with get_connection() as conn:
        if cursor_factory:
            cursor = conn.cursor(cursor_factory=cursor_factory)
        else:
            cursor = conn.cursor()

        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()


def execute_query(query: str, params: Optional[Tuple] = None, fetch: str = 'all') -> List[Dict[str, Any]]:
    """
    Execute a SELECT query and return results as list of dicts.

    Args:
        query: SQL query string (use %s for parameters)
        params: Tuple of parameters to substitute
        fetch: 'all', 'one', or 'none' for fetchall(), fetchone(), or no fetch

    Returns:
        List of dicts for fetch='all', single dict for fetch='one', empty list for fetch='none'

    Example:
        users = execute_query("SELECT * FROM users WHERE telegram_id = %s", (123456,))
    """
    with get_cursor(cursor_factory=extras.RealDictCursor) as cur:
        cur.execute(query, params or ())

        if fetch == 'all':
            results = cur.fetchall()
            return [dict(row) for row in results]
        elif fetch == 'one':
            result = cur.fetchone()
            return dict(result) if result else None
        elif fetch == 'none':
            return []
        else:
            raise ValueError(f"Invalid fetch parameter: {fetch}")


def execute_insert(query: str, params: Optional[Tuple] = None, returning: bool = True) -> Optional[Dict[str, Any]]:
    """
    Execute an INSERT query and optionally return the inserted row.

    Args:
        query: SQL INSERT query string
        params: Tuple of parameters to substitute
        returning: If True, expects RETURNING clause and returns inserted row

    Returns:
        Dict of inserted row if returning=True, None otherwise

    Example:
        user = execute_insert(
            "INSERT INTO users (telegram_id, first_name) VALUES (%s, %s) RETURNING *",
            (123456, "John")
        )
    """
    with get_cursor(cursor_factory=extras.RealDictCursor) as cur:
        cur.execute(query, params or ())

        if returning:
            result = cur.fetchone()
            return dict(result) if result else None
        return None


def execute_update(query: str, params: Optional[Tuple] = None) -> int:
    """
    Execute an UPDATE query and return number of rows affected.

    Args:
        query: SQL UPDATE query string
        params: Tuple of parameters to substitute

    Returns:
        Number of rows affected

    Example:
        affected = execute_update(
            "UPDATE users SET total_xp = total_xp + %s WHERE id = %s",
            (50, user_id)
        )
    """
    with get_cursor() as cur:
        cur.execute(query, params or ())
        return cur.rowcount


def execute_delete(query: str, params: Optional[Tuple] = None) -> int:
    """
    Execute a DELETE query and return number of rows deleted.

    Args:
        query: SQL DELETE query string
        params: Tuple of parameters to substitute

    Returns:
        Number of rows deleted

    Example:
        deleted = execute_delete("DELETE FROM users WHERE id = %s", (user_id,))
    """
    with get_cursor() as cur:
        cur.execute(query, params or ())
        return cur.rowcount


@contextmanager
def transaction():
    """
    Context manager for explicit transaction control.

    Usage:
        with transaction() as conn:
            with conn.cursor() as cur:
                cur.execute("INSERT INTO users ...")
                cur.execute("INSERT INTO user_modes ...")
            # Commits automatically if no exception
            # Rolls back if exception occurs
    """
    with get_connection() as conn:
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e


def test_connection() -> bool:
    """
    Test database connection.

    Returns:
        True if connection successful, False otherwise
    """
    try:
        with get_cursor() as cur:
            cur.execute("SELECT 1")
            result = cur.fetchone()
            return result[0] == 1
    except Exception as e:
        print(f"Connection test failed: {e}", file=sys.stderr)
        return False


def close_pool():
    """
    Close all connections in the pool.
    Call this when shutting down the application.
    """
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None


def main():
    """CLI interface for database operations."""
    parser = argparse.ArgumentParser(description='Database Operations Tool')
    parser.add_argument('--test-connection', action='store_true',
                        help='Test database connection')
    parser.add_argument('--query', type=str,
                        help='Execute a SELECT query')
    parser.add_argument('--params', type=str,
                        help='JSON string of query parameters (e.g., \'["value1", 123]\')')

    args = parser.parse_args()

    try:
        if args.test_connection:
            print("Testing database connection...")
            if test_connection():
                print("✓ Connection successful")

                # Get database info
                with get_cursor() as cur:
                    cur.execute("SELECT version()")
                    version = cur.fetchone()[0]
                    print(f"PostgreSQL version: {version}")

                    cur.execute("""
                        SELECT COUNT(*) FROM information_schema.tables
                        WHERE table_schema = 'public'
                    """)
                    table_count = cur.fetchone()[0]
                    print(f"Tables in database: {table_count}")

                return 0
            else:
                print("✗ Connection failed")
                return 1

        elif args.query:
            print(f"Executing query: {args.query}")
            params = None
            if args.params:
                params = tuple(json.loads(args.params))

            results = execute_query(args.query, params)
            print(json.dumps(results, indent=2, default=str))
            return 0

        else:
            parser.print_help()
            return 1

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    finally:
        close_pool()


if __name__ == '__main__':
    sys.exit(main())
