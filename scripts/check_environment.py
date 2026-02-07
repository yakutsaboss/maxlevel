#!/usr/bin/env python3
"""
Environment Checker Script
Validates that all required dependencies, environment variables, and services
are properly configured for the Telegram RPG Quest Bot.

Usage:
    python scripts/check_environment.py
    python scripts/check_environment.py --verbose
"""

import os
import sys
import importlib
import subprocess
from typing import List, Tuple, Dict
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


class Colors:
    """ANSI color codes for terminal output."""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_header(text: str):
    """Print a formatted section header."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")


def print_success(text: str):
    """Print success message."""
    print(f"{Colors.GREEN}✓{Colors.END} {text}")


def print_warning(text: str):
    """Print warning message."""
    print(f"{Colors.YELLOW}⚠{Colors.END} {text}")


def print_error(text: str):
    """Print error message."""
    print(f"{Colors.RED}✗{Colors.END} {text}")


def print_info(text: str):
    """Print info message."""
    print(f"{Colors.BLUE}ℹ{Colors.END} {text}")


def check_python_version() -> bool:
    """Check Python version is 3.9 or higher."""
    print_header("Python Version Check")

    version = sys.version_info
    version_str = f"{version.major}.{version.minor}.{version.micro}"

    if version.major >= 3 and version.minor >= 9:
        print_success(f"Python version: {version_str}")
        return True
    else:
        print_error(f"Python version {version_str} is too old. Requires 3.9 or higher.")
        return False


def check_dependencies() -> Tuple[bool, List[str]]:
    """Check if all required Python packages are installed."""
    print_header("Python Dependencies Check")

    required_packages = [
        ('dotenv', 'python-dotenv'),
        ('requests', 'requests'),
        ('pandas', 'pandas'),
        ('psycopg2', 'psycopg2-binary'),
        ('sqlalchemy', 'sqlalchemy'),
        ('jwt', 'pyjwt'),
        ('pytz', 'pytz'),
        ('pytest', 'pytest'),
        # Optional but recommended
        ('openai', 'openai (optional)'),
        ('anthropic', 'anthropic (optional)'),
    ]

    missing = []
    optional_missing = []

    for package_name, display_name in required_packages:
        is_optional = 'optional' in display_name
        try:
            importlib.import_module(package_name)
            print_success(f"{display_name} installed")
        except ImportError:
            if is_optional:
                print_warning(f"{display_name} not installed (optional)")
                optional_missing.append(package_name)
            else:
                print_error(f"{display_name} not installed")
                missing.append(package_name)

    if missing:
        print_error(f"\nMissing required packages: {', '.join(missing)}")
        print_info("Install with: pip install -r requirements.txt")
        return False, missing
    elif optional_missing:
        print_warning(f"\nOptional packages not installed: {', '.join(optional_missing)}")
        print_info("These are only needed for AI features.")
        return True, []
    else:
        print_success("\nAll required dependencies installed!")
        return True, []


def check_env_file() -> Tuple[bool, List[str]]:
    """Check if .env file exists and has required variables."""
    print_header("Environment Variables Check")

    env_path = PROJECT_ROOT / '.env'

    if not env_path.exists():
        print_error(".env file not found")
        print_info(f"Copy .env.example to .env: cp {PROJECT_ROOT / '.env.example'} {env_path}")
        return False, []

    print_success(".env file exists")

    # Load .env
    from dotenv import load_dotenv
    load_dotenv(env_path)

    required_vars = [
        ('DATABASE_URL', 'PostgreSQL connection string'),
        ('TELEGRAM_BOT_TOKEN', 'Telegram bot token from @BotFather'),
        ('PYTHON_EXECUTABLE', 'Path to Python executable'),
    ]

    optional_vars = [
        ('OPENAI_API_KEY', 'OpenAI API key (for AI features)'),
        ('ANTHROPIC_API_KEY', 'Anthropic API key (for Claude)'),
        ('JWT_SECRET', 'JWT secret for Mini App authentication'),
        ('TIMEZONE', 'Default timezone'),
    ]

    missing_required = []
    missing_optional = []

    for var_name, description in required_vars:
        value = os.getenv(var_name)
        if value:
            # Mask sensitive values
            if 'TOKEN' in var_name or 'KEY' in var_name or 'PASSWORD' in var_name:
                display_value = f"{value[:10]}..." if len(value) > 10 else "***"
            else:
                display_value = value[:50] + "..." if len(value) > 50 else value

            print_success(f"{var_name}: {display_value}")
        else:
            print_error(f"{var_name} not set ({description})")
            missing_required.append(var_name)

    print()  # Spacing

    for var_name, description in optional_vars:
        value = os.getenv(var_name)
        if value:
            display_value = f"{value[:10]}..." if len(value) > 10 else "***"
            print_success(f"{var_name}: {display_value} (optional)")
        else:
            print_warning(f"{var_name} not set ({description})")
            missing_optional.append(var_name)

    if missing_required:
        print_error(f"\nMissing required environment variables: {', '.join(missing_required)}")
        return False, missing_required
    else:
        print_success("\nAll required environment variables set!")
        return True, []


def check_database_connection() -> bool:
    """Check if database is accessible."""
    print_header("Database Connection Check")

    try:
        from tools.db_operations import test_connection, get_cursor, close_pool

        if test_connection():
            print_success("Database connection successful")

            # Get additional info
            try:
                with get_cursor() as cur:
                    cur.execute("SELECT version()")
                    version = cur.fetchone()[0]
                    print_info(f"PostgreSQL version: {version[:50]}")

                    cur.execute("""
                        SELECT COUNT(*) FROM information_schema.tables
                        WHERE table_schema = 'public'
                    """)
                    table_count = cur.fetchone()[0]
                    print_info(f"Tables in database: {table_count}")

                    if table_count == 0:
                        print_warning("No tables found. Run database setup scripts.")

                return True
            finally:
                close_pool()
        else:
            print_error("Database connection failed")
            print_info("Check DATABASE_URL in .env and ensure PostgreSQL is running")
            return False

    except ImportError as e:
        print_error(f"Cannot import db_operations: {e}")
        print_info("Install dependencies: pip install -r requirements.txt")
        return False
    except Exception as e:
        print_error(f"Database connection error: {e}")
        print_info("Ensure PostgreSQL is running and DATABASE_URL is correct")
        return False


def check_node_installation() -> bool:
    """Check if Node.js and npm are installed (for bot)."""
    print_header("Node.js/npm Check (for Telegram Bot)")

    # Check Node.js
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        node_version = result.stdout.strip()
        print_success(f"Node.js installed: {node_version}")
        node_ok = True
    except FileNotFoundError:
        print_error("Node.js not installed")
        print_info("Install from: https://nodejs.org/")
        node_ok = False

    # Check npm
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        npm_version = result.stdout.strip()
        print_success(f"npm installed: {npm_version}")
        npm_ok = True
    except FileNotFoundError:
        print_error("npm not installed (comes with Node.js)")
        npm_ok = False

    return node_ok and npm_ok


def check_bot_dependencies() -> bool:
    """Check if bot dependencies are installed."""
    print_header("Bot Dependencies Check (Node.js packages)")

    bot_dir = PROJECT_ROOT / 'bot'
    node_modules = bot_dir / 'node_modules'
    package_json = bot_dir / 'package.json'

    if not package_json.exists():
        print_warning("bot/package.json not found")
        return False

    if not node_modules.exists():
        print_error("bot/node_modules not found")
        print_info("Install with: cd bot && npm install")
        return False

    print_success("bot/node_modules exists")

    # Check for key packages
    key_packages = ['grammy', 'typescript', 'tsx']
    all_found = True

    for package in key_packages:
        package_path = node_modules / package
        if package_path.exists():
            print_success(f"{package} installed")
        else:
            print_error(f"{package} not found")
            all_found = False

    if not all_found:
        print_info("Reinstall with: cd bot && npm install")

    return all_found


def check_directory_structure() -> bool:
    """Check if required directories exist."""
    print_header("Directory Structure Check")

    required_dirs = [
        'tools',
        'workflows',
        'scripts',
        'bot',
        'database',
        '.tmp',
    ]

    all_exist = True

    for dir_name in required_dirs:
        dir_path = PROJECT_ROOT / dir_name
        if dir_path.exists():
            print_success(f"{dir_name}/ exists")
        else:
            print_error(f"{dir_name}/ not found")
            all_exist = False

    return all_exist


def main():
    """Run all environment checks."""
    import argparse

    parser = argparse.ArgumentParser(description='Check environment setup')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Show verbose output')
    args = parser.parse_args()

    print(f"\n{Colors.BOLD}Telegram RPG Quest Bot - Environment Checker{Colors.END}")
    print(f"{Colors.BOLD}Project Root: {PROJECT_ROOT}{Colors.END}\n")

    # Run all checks
    results = {}

    results['python'] = check_python_version()
    results['dependencies'], missing_deps = check_dependencies()
    results['env'], missing_env = check_env_file()
    results['database'] = check_database_connection()
    results['node'] = check_node_installation()
    results['bot_deps'] = check_bot_dependencies()
    results['directories'] = check_directory_structure()

    # Summary
    print_header("Summary")

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    if passed == total:
        print_success(f"All checks passed! ({passed}/{total})")
        print_success("\n✅ Your environment is ready!")
        print_info("Next steps:")
        print_info("  1. Run database setup: scripts/setup_db.bat (or .sh)")
        print_info("  2. Start the bot: cd bot && npm run dev")
        return 0
    else:
        print_warning(f"Checks passed: {passed}/{total}")
        print_error("\n❌ Some checks failed. Please fix the issues above.")
        print_info("\nQuick fixes:")
        if missing_deps:
            print_info("  - Install Python packages: pip install -r requirements.txt")
        if missing_env:
            print_info(f"  - Configure environment: copy .env.example to .env and edit")
        if not results['database']:
            print_info("  - Start PostgreSQL and verify DATABASE_URL")
        if not results['node']:
            print_info("  - Install Node.js from https://nodejs.org/")
        if not results['bot_deps']:
            print_info("  - Install bot packages: cd bot && npm install")
        return 1


if __name__ == '__main__':
    sys.exit(main())
