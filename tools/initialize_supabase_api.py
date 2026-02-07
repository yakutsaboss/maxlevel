#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Initialize Timeweb Cloud Database - Alternative Method
Instructions for when the direct Python connection fails
"""

import os
import sys
from dotenv import load_dotenv

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

def show_manual_instructions():
    """Show manual database initialization instructions for Timeweb Cloud"""
    db_host = os.getenv('DB_HOST', '<your-host>.twc1.net')
    db_name = os.getenv('DB_NAME', 'default_db')
    db_user = os.getenv('DB_USER', 'gen_user')

    print("If the direct Python connection fails, use psql instead:")
    print()
    print("Method 1: psql command line")
    print("If you have PostgreSQL client installed:")
    print(f"  psql \"host={db_host} port=5432 dbname={db_name} user={db_user} sslmode=verify-full sslrootcert=~/.cloud-certs/root.crt\" < database/schema.sql")
    print(f"  psql \"host={db_host} port=5432 dbname={db_name} user={db_user} sslmode=verify-full sslrootcert=~/.cloud-certs/root.crt\" < database/seed_data.sql")
    print()
    print("Method 2: Timeweb Cloud Dashboard")
    print("1. Go to your Timeweb Cloud database panel")
    print("2. Open the SQL query editor")
    print("3. Copy and paste the contents of: database/schema.sql")
    print("4. Execute the query")
    print("5. Then copy and paste: database/seed_data.sql")
    print("6. Execute the query")
    print()
    print("Method 3: Use the main initialization script")
    print("  python tools/initialize_supabase.py")
    print()

def main():
    print("=" * 50)
    print("Timeweb Cloud Database Initialization (Manual)")
    print("=" * 50)
    print()

    show_manual_instructions()

if __name__ == "__main__":
    main()
