#!/usr/bin/env python3
"""
Temporary Files Cleanup Script
Cleans up temporary files from the .tmp/ directory.

The .tmp/ directory stores intermediate processing files that can be regenerated.
This script helps maintain a clean workspace and free up disk space.

Usage:
    # Dry run (show what would be deleted without deleting)
    python scripts/cleanup_temp.py --dry-run

    # Delete all files
    python scripts/cleanup_temp.py

    # Delete files older than N days
    python scripts/cleanup_temp.py --older-than 7

    # Keep specific patterns
    python scripts/cleanup_temp.py --keep-pattern "*.json"

    # Force delete without confirmation
    python scripts/cleanup_temp.py --force
"""

import os
import sys
import argparse
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Tuple


class Colors:
    """ANSI color codes for terminal output."""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def format_size(size_bytes: int) -> str:
    """Format bytes to human-readable size."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"


def get_file_age(file_path: Path) -> int:
    """Get file age in days."""
    mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
    age = datetime.now() - mtime
    return age.days


def scan_temp_directory(
    temp_dir: Path,
    older_than_days: int = None,
    keep_patterns: List[str] = None
) -> Tuple[List[Path], int]:
    """
    Scan .tmp directory for files to delete.

    Args:
        temp_dir: Path to .tmp directory
        older_than_days: Only include files older than this many days
        keep_patterns: List of glob patterns to keep (e.g., ["*.json", "important_*"])

    Returns:
        Tuple of (files_to_delete, total_size_bytes)
    """
    if not temp_dir.exists():
        return [], 0

    files_to_delete = []
    total_size = 0

    keep_patterns = keep_patterns or []

    for item in temp_dir.rglob('*'):
        # Skip directories and .gitkeep
        if item.is_dir() or item.name == '.gitkeep':
            continue

        # Check keep patterns
        should_keep = False
        for pattern in keep_patterns:
            if item.match(pattern):
                should_keep = True
                break

        if should_keep:
            continue

        # Check age if specified
        if older_than_days is not None:
            age = get_file_age(item)
            if age < older_than_days:
                continue

        files_to_delete.append(item)
        total_size += item.stat().st_size

    return files_to_delete, total_size


def print_file_list(files: List[Path], temp_dir: Path, verbose: bool = False):
    """Print list of files to be deleted."""
    if not files:
        print(f"{Colors.GREEN}No files to delete.{Colors.END}")
        return

    print(f"\n{Colors.BOLD}Files to delete:{Colors.END}")

    # Group by subdirectory
    by_dir = {}
    for file in files:
        rel_path = file.relative_to(temp_dir)
        parent = rel_path.parent
        by_dir.setdefault(str(parent), []).append(file)

    for dir_name, dir_files in sorted(by_dir.items()):
        print(f"\n{Colors.BLUE}{dir_name}/{Colors.END}")
        for file in sorted(dir_files):
            rel_path = file.relative_to(temp_dir)
            size = format_size(file.stat().st_size)
            age = get_file_age(file)

            if verbose:
                mtime = datetime.fromtimestamp(file.stat().st_mtime).strftime('%Y-%m-%d %H:%M')
                print(f"  • {rel_path.name} ({size}, {age}d old, modified: {mtime})")
            else:
                print(f"  • {rel_path.name} ({size}, {age}d old)")


def delete_files(files: List[Path], dry_run: bool = False) -> Tuple[int, int]:
    """
    Delete files.

    Args:
        files: List of files to delete
        dry_run: If True, don't actually delete

    Returns:
        Tuple of (files_deleted, files_failed)
    """
    deleted = 0
    failed = 0

    for file in files:
        try:
            if not dry_run:
                file.unlink()
            deleted += 1
        except Exception as e:
            print(f"{Colors.RED}Failed to delete {file.name}: {e}{Colors.END}")
            failed += 1

    return deleted, failed


def confirm_deletion(file_count: int, total_size: int) -> bool:
    """Ask user to confirm deletion."""
    print(f"\n{Colors.YELLOW}About to delete {file_count} files ({format_size(total_size)}){Colors.END}")
    response = input(f"{Colors.BOLD}Continue? [y/N]: {Colors.END}").strip().lower()
    return response in ['y', 'yes']


def main():
    """Main cleanup function."""
    parser = argparse.ArgumentParser(
        description='Clean up temporary files from .tmp/ directory',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument('--dry-run', '-n', action='store_true',
                        help='Show what would be deleted without deleting')
    parser.add_argument('--older-than', '-o', type=int, metavar='DAYS',
                        help='Only delete files older than N days')
    parser.add_argument('--keep-pattern', '-k', action='append', metavar='PATTERN',
                        help='Keep files matching pattern (can be used multiple times)')
    parser.add_argument('--force', '-f', action='store_true',
                        help='Delete without confirmation')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Show detailed file information')

    args = parser.parse_args()

    # Get project root and .tmp directory
    project_root = Path(__file__).parent.parent
    temp_dir = project_root / '.tmp'

    print(f"{Colors.BOLD}Temporary Files Cleanup{Colors.END}")
    print(f"Directory: {temp_dir}\n")

    # Check if .tmp exists
    if not temp_dir.exists():
        print(f"{Colors.YELLOW}⚠ .tmp directory does not exist{Colors.END}")
        print(f"Creating it at: {temp_dir}")
        temp_dir.mkdir(parents=True, exist_ok=True)
        (temp_dir / '.gitkeep').touch()
        return 0

    # Scan directory
    print(f"{Colors.BLUE}Scanning directory...{Colors.END}")

    filters = []
    if args.older_than:
        filters.append(f"files older than {args.older_than} days")
    if args.keep_pattern:
        filters.append(f"keeping patterns: {', '.join(args.keep_pattern)}")

    if filters:
        print(f"{Colors.BLUE}Filters: {', '.join(filters)}{Colors.END}")

    files_to_delete, total_size = scan_temp_directory(
        temp_dir,
        older_than_days=args.older_than,
        keep_patterns=args.keep_pattern
    )

    # Print results
    print(f"\nFound {Colors.BOLD}{len(files_to_delete)}{Colors.END} files " +
          f"({Colors.BOLD}{format_size(total_size)}{Colors.END})")

    if not files_to_delete:
        print(f"{Colors.GREEN}✓ Nothing to clean up!{Colors.END}")
        return 0

    # Show file list
    print_file_list(files_to_delete, temp_dir, verbose=args.verbose)

    # Dry run mode
    if args.dry_run:
        print(f"\n{Colors.YELLOW}[DRY RUN] No files were deleted{Colors.END}")
        print(f"Remove --dry-run flag to actually delete files")
        return 0

    # Confirm deletion
    if not args.force:
        if not confirm_deletion(len(files_to_delete), total_size):
            print(f"\n{Colors.YELLOW}Cancelled.{Colors.END}")
            return 0

    # Delete files
    print(f"\n{Colors.BLUE}Deleting files...{Colors.END}")
    deleted, failed = delete_files(files_to_delete, dry_run=False)

    # Summary
    print(f"\n{Colors.BOLD}Summary:{Colors.END}")
    if deleted > 0:
        print(f"{Colors.GREEN}✓ Deleted {deleted} files ({format_size(total_size)}){Colors.END}")
    if failed > 0:
        print(f"{Colors.RED}✗ Failed to delete {failed} files{Colors.END}")

    if failed > 0:
        return 1
    else:
        print(f"\n{Colors.GREEN}✓ Cleanup complete!{Colors.END}")
        return 0


if __name__ == '__main__':
    sys.exit(main())
