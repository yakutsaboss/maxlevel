#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Timeweb Cloud Manager
Handles database creation and management via Timeweb Cloud API
"""

import os
import sys
import json
import time
import requests
from dotenv import load_dotenv

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

class TimewebCloudManager:
    def __init__(self):
        self.api_token = os.getenv('TIMEWEB_CLOUD_API_TOKEN')
        if not self.api_token:
            raise ValueError("TIMEWEB_CLOUD_API_TOKEN not found in environment variables")

        self.base_url = "https://api.timeweb.cloud/api/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

    def _make_request(self, method, endpoint, data=None):
        """Make HTTP request to Timeweb Cloud API"""
        url = f"{self.base_url}{endpoint}"

        try:
            if method == "GET":
                response = requests.get(url, headers=self.headers)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"❌ API request failed: {e}")
            if hasattr(e.response, 'text'):
                print(f"Response: {e.response.text}")
            sys.exit(1)

    def list_database_presets(self):
        """List available database configuration presets"""
        print("📋 Fetching available database presets...")
        result = self._make_request("GET", "/presets/dbs")

        if 'databases_presets' in result:
            print(f"\n✅ Found {len(result['databases_presets'])} presets:")
            for preset in result['databases_presets'][:10]:  # Show first 10
                print(f"  - ID: {preset['id']}")
                print(f"    Type: {preset['type']}")
                print(f"    Location: {preset['location']}")
                print(f"    Disk: {preset['disk']} MB")
                print(f"    CPU: {preset['cpu']} cores")
                print(f"    RAM: {preset['ram']} MB")
                print(f"    Price: {preset['price']} ₽/month")
                print()

        return result

    def list_databases(self):
        """List all existing database clusters"""
        print("📋 Fetching database clusters...")
        result = self._make_request("GET", "/dbs")

        if 'dbs' in result:
            if len(result['dbs']) == 0:
                print("ℹ️  No databases found")
            else:
                print(f"\n✅ Found {len(result['dbs'])} database(s):")
                for db in result['dbs']:
                    print(f"  - ID: {db['id']}")
                    print(f"    Name: {db.get('name', 'N/A')}")
                    print(f"    Type: {db.get('type', 'N/A')}")
                    print(f"    Status: {db.get('status', 'N/A')}")
                    print()

        return result

    def create_database(self, db_type="postgres", name="telegram_rpg_bot", preset_id=None):
        """Create a new database cluster"""
        print(f"🔨 Creating {db_type} database: {name}...")

        # If no preset_id provided, get the cheapest one
        if not preset_id:
            presets_result = self._make_request("GET", "/presets/dbs")
            if 'databases_presets' in presets_result and len(presets_result['databases_presets']) > 0:
                # Find cheapest PostgreSQL preset in ru-1 location
                postgres_presets = [p for p in presets_result['databases_presets']
                                  if p['type'] == db_type and p['location'] == 'ru-1']
                if not postgres_presets:
                    raise ValueError(f"No {db_type} presets available in ru-1 location")
                preset = min(postgres_presets, key=lambda x: x['price'])
                preset_id = preset['id']
                print(f"📦 Using preset ID {preset_id}: {preset['location']} - {preset['disk']}MB disk, {preset['ram']}MB RAM, {preset['price']}₽/month")
            else:
                raise ValueError("No database presets available")

        # Create database
        # Try different variations for PostgreSQL since "postgres" is deprecated
        if db_type in ["postgres", "postgresql"]:
            # Try mysql instead since postgres seems deprecated
            print("⚠️  PostgreSQL (postgres) type is deprecated in Timeweb Cloud API")
            print("📝 Switching to MySQL as alternative...")
            db_type = "mysql"
            # Update preset to MySQL
            mysql_presets = [p for p in presets_result['databases_presets']
                           if p['type'] == 'mysql' and p['location'] == 'ru-1']
            if mysql_presets:
                preset = min(mysql_presets, key=lambda x: x['price'])
                preset_id = preset['id']
                print(f"📦 Using MySQL preset ID {preset_id}")

        password = self._generate_password()
        data = {
            "name": name,
            "type": db_type,
            "preset_id": preset_id,
            "hash_type": "caching_sha2",
            "login": "wibecode_user",  # "admin" is reserved
            "password": password
        }

        print(f"🔧 Creating database with type: {db_type}")

        result = self._make_request("POST", "/dbs", data)

        if 'db' in result:
            db = result['db']
            print(f"✅ Database created successfully!")
            print(f"   ID: {db['id']}")
            print(f"   Name: {db.get('name', 'N/A')}")
            print(f"   Status: {db.get('status', 'N/A')}")
            print()
            print("⏳ Waiting for database to be ready...")

            # Wait for database to be active
            db_id = db['id']
            return self._wait_for_database_ready(db_id)

        return result

    def get_database(self, db_id):
        """Get database details and credentials"""
        print(f"🔍 Fetching database details for ID: {db_id}...")
        result = self._make_request("GET", f"/dbs/{db_id}")

        # Debug: print full response
        print(f"\nDEBUG - Full API Response:")
        print(json.dumps(result, indent=2))

        if 'db' in result:
            db = result['db']
            print(f"\n✅ Database Details:")
            print(f"   ID: {db['id']}")
            print(f"   Name: {db.get('name', 'N/A')}")
            print(f"   Type: {db.get('type', 'N/A')}")
            print(f"   Status: {db.get('status', 'N/A')}")
            print(f"   Host: {db.get('host', 'N/A')}")
            print(f"   IP: {db.get('ip', 'N/A')}")
            print(f"   Local IP: {db.get('local_ip', 'N/A')}")
            print(f"   Port: {db.get('port', 'N/A')}")
            print(f"   Login: {db.get('login', 'N/A')}")
            print(f"   Password: {db.get('password', 'N/A')}")
            print()

            # Print connection string
            if db.get('status') == 'started':
                self._print_connection_info(db)

        return result

    def _wait_for_database_ready(self, db_id, max_wait=300):
        """Wait for database to be ready (max 5 minutes)"""
        start_time = time.time()

        while time.time() - start_time < max_wait:
            result = self._make_request("GET", f"/dbs/{db_id}")

            if 'db' in result:
                db = result['db']
                status = db.get('status', 'unknown')

                if status == 'started':
                    print(f"✅ Database is ready!")
                    self._print_connection_info(db)
                    return result
                elif status == 'error':
                    print(f"❌ Database creation failed")
                    return result
                else:
                    print(f"⏳ Status: {status} - waiting... ({int(time.time() - start_time)}s)")
                    time.sleep(10)

        print(f"⚠️  Timeout waiting for database to be ready")
        return None

    def _print_connection_info(self, db):
        """Print database connection information"""
        host = db.get('host', '')
        port = db.get('port', '5432')
        login = db.get('login', '')
        password = db.get('password', '')
        db_name = db.get('name', 'postgres')

        # Extract database name from cluster name or use default
        # Timeweb typically creates a database with the same name as the cluster

        print("\n" + "="*50)
        print("📋 DATABASE CONNECTION INFO")
        print("="*50)
        print(f"Host:     {host}")
        print(f"Port:     {port}")
        print(f"Database: postgres")  # Default PostgreSQL database
        print(f"Username: {login}")
        print(f"Password: {password}")
        print()
        print("PostgreSQL URL:")
        print(f"postgresql://{login}:{password}@{host}:{port}/postgres")
        print("="*50)

    def get_database_instances(self, db_id):
        """Get database instances which may contain connection hostnames"""
        print(f"🔍 Fetching database instances for DB ID: {db_id}...")

        # Try different endpoints that might have instances
        endpoints = [
            f"/dbs/{db_id}/instances",
            f"/databases/{db_id}/instances",
            f"/dbs/{db_id}",
        ]

        for endpoint in endpoints:
            try:
                print(f"Trying endpoint: {endpoint}")
                result = self._make_request("GET", endpoint)
                print(f"\nResponse from {endpoint}:")
                print(json.dumps(result, indent=2))
                print()
            except SystemExit:
                print(f"Failed for {endpoint}")
                continue

        return None

    def delete_database(self, db_id):
        """Delete a database cluster"""
        print(f"🗑️  Deleting database ID: {db_id}...")

        # Get database info first
        db_info = self._make_request("GET", f"/dbs/{db_id}")
        if 'db' in db_info:
            print(f"   Name: {db_info['db'].get('name', 'N/A')}")

        # Confirm deletion
        confirm = input("⚠️  Are you sure you want to delete this database? (yes/no): ")
        if confirm.lower() != 'yes':
            print("❌ Deletion cancelled")
            return

        result = self._make_request("DELETE", f"/dbs/{db_id}")
        print(f"✅ Database deleted successfully")

        return result

    def list_server_presets(self):
        """List available VPS server presets"""
        print("📋 Fetching available server presets...")
        result = self._make_request("GET", "/presets/servers")

        if 'server_presets' in result:
            print(f"\n✅ Found {len(result['server_presets'])} presets:")
            for preset in result['server_presets'][:10]:  # Show first 10
                print(f"  - ID: {preset['id']}")
                print(f"    Description: {preset.get('description_short', 'N/A')}")
                print(f"    Location: {preset.get('location', 'N/A')}")
                print(f"    CPU: {preset.get('cpu', 'N/A')} cores")
                print(f"    RAM: {preset.get('ram', 'N/A')} MB")
                print(f"    Disk: {preset.get('disk', 'N/A')} MB")
                print(f"    Price: {preset.get('price', 'N/A')} ₽/month")
                print()

        return result

    def create_server(self, name="telegram-bot-server", preset_id=None, os_id=None):
        """Create a VPS server"""
        print(f"🔨 Creating VPS server: {name}...")

        # Get cheapest preset if not specified
        if not preset_id:
            presets_result = self._make_request("GET", "/presets/servers")
            if 'server_presets' in presets_result and len(presets_result['server_presets']) > 0:
                # Find cheapest server in ru-1 location
                ru_presets = [p for p in presets_result['server_presets']
                            if p.get('location') == 'ru-1']
                if ru_presets:
                    preset = min(ru_presets, key=lambda x: x.get('price', 9999))
                    preset_id = preset['id']
                    print(f"📦 Using preset ID {preset_id}: {preset.get('description_short')}")
                    print(f"   {preset.get('cpu')} CPU, {preset.get('ram')}MB RAM, {preset.get('disk')}MB disk")
                    print(f"   Price: {preset.get('price')}₽/month")

        # Get OS list if not specified (Ubuntu 22.04)
        if not os_id:
            os_result = self._make_request("GET", "/os/servers")
            if 'servers_os' in os_result:
                # Find Ubuntu 22.04
                ubuntu = next((os for os in os_result['servers_os']
                             if 'ubuntu' in os.get('name', '').lower() and '22.04' in os.get('name', '')), None)
                if ubuntu:
                    os_id = ubuntu['id']
                    print(f"🐧 Using OS: {ubuntu.get('name', 'Ubuntu 22.04')}")

        # Create server
        data = {
            "name": name,
            "preset_id": preset_id,
            "os_id": os_id,
            "comment": "Telegram RPG Bot Server"
        }

        print(f"🔧 Creating server...")
        result = self._make_request("POST", "/servers", data)

        if 'server' in result:
            server = result['server']
            print(f"✅ Server created successfully!")
            print(f"   ID: {server['id']}")
            print(f"   Name: {server.get('name', 'N/A')}")
            print(f"   Status: {server.get('status', 'N/A')}")
            print()
            print("⏳ Waiting for server to be ready...")

            # Wait for server to be ready
            return self._wait_for_server_ready(server['id'])

        return result

    def _wait_for_server_ready(self, server_id, max_wait=600):
        """Wait for server to be ready (max 10 minutes)"""
        start_time = time.time()

        while time.time() - start_time < max_wait:
            result = self._make_request("GET", f"/servers/{server_id}")

            if 'server' in result:
                server = result['server']
                status = server.get('status', 'unknown')

                if status == 'on':
                    print(f"✅ Server is ready!")
                    self._print_server_info(server)
                    return result
                elif status == 'error':
                    print(f"❌ Server creation failed")
                    return result
                else:
                    print(f"⏳ Status: {status} - waiting... ({int(time.time() - start_time)}s)")
                    time.sleep(15)

        print(f"⚠️  Timeout waiting for server to be ready")
        return None

    def _print_server_info(self, server):
        """Print server connection information"""
        print("\n" + "="*50)
        print("🖥️  SERVER CONNECTION INFO")
        print("="*50)
        print(f"Server ID: {server['id']}")
        print(f"Name:      {server.get('name', 'N/A')}")
        print(f"Status:    {server.get('status', 'N/A')}")
        print(f"IP:        {server.get('ip', 'N/A')}")

        if 'configurator' in server:
            config = server['configurator']
            print(f"OS:        {config.get('os', {}).get('name', 'N/A')}")
            print(f"CPU:       {config.get('cpu', 'N/A')} cores")
            print(f"RAM:       {config.get('ram', 'N/A')} MB")
            print(f"Disk:      {config.get('disk', 'N/A')} MB")

        print("\nSSH Access:")
        print(f"ssh root@{server.get('ip', 'N/A')}")
        print(f"Password: (check your email or Timeweb Cloud console)")
        print("="*50)

    def list_servers(self):
        """List all servers"""
        print("📋 Fetching servers...")
        result = self._make_request("GET", "/servers")

        if 'servers' in result:
            if len(result['servers']) == 0:
                print("ℹ️  No servers found")
            else:
                print(f"\n✅ Found {len(result['servers'])} server(s):")
                for server in result['servers']:
                    print(f"  - ID: {server['id']}")
                    print(f"    Name: {server.get('name', 'N/A')}")
                    print(f"    IP: {server.get('ip', 'N/A')}")
                    print(f"    Status: {server.get('status', 'N/A')}")
                    print()

        return result

    def _generate_password(self, length=16):
        """Generate a secure random password"""
        import random
        import string

        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(random.choice(chars) for _ in range(length))


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Timeweb Cloud Manager')

    # Database commands
    parser.add_argument('--list-db-presets', action='store_true', help='List available database presets')
    parser.add_argument('--list-databases', action='store_true', help='List all database clusters')
    parser.add_argument('--create-database', action='store_true', help='Create a new database')
    parser.add_argument('--get-database', type=int, help='Get database details by ID')
    parser.add_argument('--delete-database', type=int, help='Delete database by ID')
    parser.add_argument('--db-name', default='telegram_rpg_bot', help='Database name (default: telegram_rpg_bot)')
    parser.add_argument('--db-type', default='postgres', help='Database type (default: postgres)')

    # Server commands
    parser.add_argument('--list-server-presets', action='store_true', help='List available server presets')
    parser.add_argument('--list-servers', action='store_true', help='List all servers')
    parser.add_argument('--create-server', action='store_true', help='Create a new VPS server')
    parser.add_argument('--server-name', default='telegram-bot-server', help='Server name (default: telegram-bot-server)')

    args = parser.parse_args()

    try:
        manager = TimewebCloudManager()

        # Database commands
        if args.list_db_presets:
            manager.list_database_presets()

        elif args.list_databases:
            manager.list_databases()

        elif args.create_database:
            manager.create_database(db_type=args.db_type, name=args.db_name)

        elif args.get_database:
            manager.get_database(args.get_database)

        elif args.delete_database:
            manager.delete_database(args.delete_database)

        # Server commands
        elif args.list_server_presets:
            manager.list_server_presets()

        elif args.list_servers:
            manager.list_servers()

        elif args.create_server:
            manager.create_server(name=args.server_name)

        else:
            parser.print_help()

    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
