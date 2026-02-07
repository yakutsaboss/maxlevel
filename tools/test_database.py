#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Timeweb Cloud Database Connection
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

load_dotenv()

def test_connection():
    """Test database connection and verify data"""
    print("=" * 50)
    print("Testing Timeweb Cloud Database Connection")
    print("=" * 50)
    print()

    try:
        # Try connection with connection string + SSL
        database_url = os.getenv('DATABASE_URL')
        print(f"🔍 Connecting to database...")
        print(f"Host: {database_url.split('@')[1].split('/')[0] if '@' in database_url else 'Invalid URL'}")
        print()

        connect_kwargs = {'dsn': database_url}
        ssl_mode = os.getenv('DB_SSL_MODE')
        ssl_root_cert = os.getenv('DB_SSL_ROOT_CERT')
        if ssl_mode:
            connect_kwargs['sslmode'] = ssl_mode
        if ssl_root_cert:
            connect_kwargs['sslrootcert'] = os.path.expanduser(ssl_root_cert)

        conn = psycopg2.connect(**connect_kwargs)
        cursor = conn.cursor()

        print("✅ Connection successful!")
        print()

        # Test queries
        print("📊 Database Statistics:")
        print("-" * 50)

        # Count tables
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """)
        table_count = cursor.fetchone()[0]
        print(f"Tables:       {table_count}")

        # Count modes
        cursor.execute("SELECT COUNT(*) FROM modes")
        mode_count = cursor.fetchone()[0]
        print(f"Modes:        {mode_count}")

        # List modes
        cursor.execute("SELECT name, display_name, icon_emoji FROM modes")
        modes = cursor.fetchall()
        for mode in modes:
            print(f"  • {mode[2]} {mode[1]} ({mode[0]})")

        # Count achievements
        cursor.execute("SELECT COUNT(*) FROM achievements")
        achievement_count = cursor.fetchone()[0]
        print(f"\nAchievements: {achievement_count}")

        # Count quests
        cursor.execute("SELECT COUNT(*) FROM quests")
        quest_count = cursor.fetchone()[0]
        print(f"Quests:       {quest_count}")

        print()
        print("=" * 50)
        print("✅ Database is ready for the bot!")
        print("=" * 50)

        cursor.close()
        conn.close()
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("Troubleshooting:")
        print("1. Check your DATABASE_URL in .env")
        print("2. Verify Timeweb Cloud database is active")
        print("3. Ensure SSL cert exists at ~/.cloud-certs/root.crt")
        print("4. Check if SQL scripts were run successfully")
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
