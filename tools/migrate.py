#!/usr/bin/env python3
"""
Database Migration Runner
Applies numbered SQL migration files to PostgreSQL in order,
tracking which have been applied via a schema_migrations table.

Usage:
    python tools/migrate.py              # Apply pending migrations
    python tools/migrate.py --dry-run    # Show what would be applied
    python tools/migrate.py --status     # Show migration status
"""

import os
import sys
import re
import argparse
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import psycopg2
from dotenv import load_dotenv

# Load environment variables from project root .env
_script_dir = Path(__file__).resolve().parent
_project_root = _script_dir.parent
load_dotenv(_project_root / '.env')

MIGRATIONS_DIR = _project_root / 'database' / 'migrations'

# Regex: files must start with digits followed by underscore
MIGRATION_PATTERN = re.compile(r'^(\d+)_.+\.sql$')


def get_connection():
    """Create a database connection from DATABASE_URL."""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print('ERROR: DATABASE_URL not set in .env')
        sys.exit(1)
    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = False
        return conn
    except psycopg2.Error as e:
        print(f'ERROR: Cannot connect to database: {e}')
        sys.exit(1)


def ensure_migrations_table(conn):
    """Create schema_migrations table if it doesn't exist."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
    conn.commit()


def get_applied_migrations(conn):
    """Return set of already-applied migration filenames."""
    with conn.cursor() as cur:
        cur.execute('SELECT filename FROM schema_migrations ORDER BY filename;')
        return {row[0] for row in cur.fetchall()}


def discover_migrations():
    """Find all numbered SQL migration files, sorted by number."""
    if not MIGRATIONS_DIR.exists():
        print(f'ERROR: Migrations directory not found: {MIGRATIONS_DIR}')
        sys.exit(1)

    migrations = []
    for f in MIGRATIONS_DIR.iterdir():
        match = MIGRATION_PATTERN.match(f.name)
        if match:
            number = int(match.group(1))
            migrations.append((number, f.name, f))

    migrations.sort(key=lambda x: (x[0], x[1]))
    return migrations


def show_status(conn):
    """Print the status of all migrations."""
    applied = get_applied_migrations(conn)
    migrations = discover_migrations()

    if not migrations:
        print('No migration files found.')
        return

    print(f'{"Status":<12} {"Filename"}')
    print('-' * 60)
    for _num, name, _path in migrations:
        status = 'applied' if name in applied else 'pending'
        marker = '[+]' if name in applied else '[ ]'
        print(f'{marker} {status:<8} {name}')

    pending = [name for _n, name, _p in migrations if name not in applied]
    print(f'\n{len(applied)} applied, {len(pending)} pending')


def apply_migrations(conn, dry_run=False):
    """Apply all pending migrations in order."""
    applied = get_applied_migrations(conn)
    migrations = discover_migrations()

    pending = [(num, name, path) for num, name, path in migrations if name not in applied]

    if not pending:
        print('All migrations are up to date.')
        return

    if dry_run:
        print('DRY RUN - the following migrations would be applied:\n')
        for _num, name, _path in pending:
            print(f'  [ ] {name}')
        print(f'\n{len(pending)} migration(s) pending.')
        return

    print(f'Applying {len(pending)} migration(s)...\n')
    for _num, name, path in pending:
        print(f'  Applying {name}...', end=' ')
        sql_content = path.read_text(encoding='utf-8')
        try:
            with conn.cursor() as cur:
                cur.execute(sql_content)
                cur.execute(
                    'INSERT INTO schema_migrations (filename) VALUES (%s);',
                    (name,)
                )
            conn.commit()
            print('OK')
        except psycopg2.Error as e:
            conn.rollback()
            print(f'FAILED\n\nERROR applying {name}:\n{e}')
            sys.exit(1)

    print(f'\nDone. {len(pending)} migration(s) applied successfully.')


def main():
    parser = argparse.ArgumentParser(description='Database migration runner')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show pending migrations without applying them')
    parser.add_argument('--status', action='store_true',
                        help='Show status of all migrations')
    args = parser.parse_args()

    conn = get_connection()
    try:
        ensure_migrations_table(conn)

        if args.status:
            show_status(conn)
        else:
            apply_migrations(conn, dry_run=args.dry_run)
    finally:
        conn.close()


if __name__ == '__main__':
    main()
