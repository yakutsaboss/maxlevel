#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Initialize Timeweb Cloud PostgreSQL Database
Loads schema and seed data for Telegram RPG Bot
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

def get_db_connection():
    """Create database connection with SSL support for Timeweb Cloud"""
    try:
        connect_kwargs = {
            'host': os.getenv('DB_HOST'),
            'port': os.getenv('DB_PORT', 5432),
            'database': os.getenv('DB_NAME'),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
        }

        ssl_mode = os.getenv('DB_SSL_MODE')
        ssl_root_cert = os.getenv('DB_SSL_ROOT_CERT')
        if ssl_mode:
            connect_kwargs['sslmode'] = ssl_mode
        if ssl_root_cert:
            connect_kwargs['sslrootcert'] = os.path.expanduser(ssl_root_cert)

        conn = psycopg2.connect(**connect_kwargs)
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)

def execute_sql_file(conn, filepath):
    """Execute SQL commands from a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            sql = f.read()

        cursor = conn.cursor()
        cursor.execute(sql)
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        print(f"❌ Error executing {filepath}: {e}")
        conn.rollback()
        return False

def verify_setup(conn):
    """Verify database setup"""
    cursor = conn.cursor()

    # Count tables
    cursor.execute("""
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    """)
    table_count = cursor.fetchone()[0]

    # Count modes
    cursor.execute("SELECT COUNT(*) FROM modes")
    mode_count = cursor.fetchone()[0]

    # Count achievements
    cursor.execute("SELECT COUNT(*) FROM achievements")
    achievement_count = cursor.fetchone()[0]

    # Count quests
    cursor.execute("SELECT COUNT(*) FROM quests")
    quest_count = cursor.fetchone()[0]

    cursor.close()

    return {
        'tables': table_count,
        'modes': mode_count,
        'achievements': achievement_count,
        'quests': quest_count
    }

def main():
    print("=" * 50)
    print("Timeweb Cloud Database Initialization")
    print("=" * 50)
    print()

    # Test connection
    print("🔍 Testing database connection...")
    conn = get_db_connection()
    print("✅ Connected successfully!")
    print()

    # Load schema
    schema_file = os.path.join('database', 'schema.sql')
    print(f"📋 Loading schema from {schema_file}...")
    if execute_sql_file(conn, schema_file):
        print("✅ Schema loaded successfully!")
    else:
        print("❌ Failed to load schema")
        sys.exit(1)
    print()

    # Load seed data
    seed_file = os.path.join('database', 'seed_data.sql')
    print(f"🌱 Loading seed data from {seed_file}...")
    if execute_sql_file(conn, seed_file):
        print("✅ Seed data loaded successfully!")
    else:
        print("❌ Failed to load seed data")
        sys.exit(1)
    print()

    # Verify setup
    print("🔍 Verifying database setup...")
    stats = verify_setup(conn)
    print(f"✅ Verification complete!")
    print()
    print("=" * 50)
    print("Database Statistics")
    print("=" * 50)
    print(f"Tables:       {stats['tables']}")
    print(f"Modes:        {stats['modes']}")
    print(f"Achievements: {stats['achievements']}")
    print(f"Quests:       {stats['quests']}")
    print()

    conn.close()

    print("=" * 50)
    print("✅ Database initialization complete!")
    print("=" * 50)
    print()
    print("Next steps:")
    print("1. Navigate to bot directory: cd bot")
    print("2. Install dependencies: npm install")
    print("3. Start the bot: npm run dev")
    print()

if __name__ == "__main__":
    main()
