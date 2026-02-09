#!/usr/bin/env python3
"""
Input Validators for RPG Bot Tools
Reusable validation functions for all manager modules.

Each function raises ValueError with a descriptive message on failure.
"""

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def validate_user_id(user_id) -> int:
    """Validate internal user ID — must be a positive integer."""
    if not isinstance(user_id, int):
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            raise ValueError(f"user_id must be a positive integer, got: {user_id!r}")
    if user_id <= 0:
        raise ValueError(f"user_id must be positive, got: {user_id}")
    return user_id


def validate_telegram_id(telegram_id) -> int:
    """Validate Telegram user ID — must be a positive integer."""
    if not isinstance(telegram_id, int):
        try:
            telegram_id = int(telegram_id)
        except (TypeError, ValueError):
            raise ValueError(f"telegram_id must be a positive integer, got: {telegram_id!r}")
    if telegram_id <= 0:
        raise ValueError(f"telegram_id must be positive, got: {telegram_id}")
    return telegram_id


def validate_timezone(tz: str) -> str:
    """Validate timezone string — must be a valid IANA timezone."""
    if not isinstance(tz, str) or not tz.strip():
        raise ValueError(f"timezone must be a non-empty string, got: {tz!r}")
    tz = tz.strip()
    try:
        ZoneInfo(tz)
    except (ZoneInfoNotFoundError, KeyError):
        raise ValueError(f"Invalid timezone: {tz!r}")
    return tz


def validate_quest_count(count) -> int:
    """Validate quest count — must be between 1 and 50."""
    if not isinstance(count, int):
        try:
            count = int(count)
        except (TypeError, ValueError):
            raise ValueError(f"count must be an integer, got: {count!r}")
    if count < 1 or count > 50:
        raise ValueError(f"count must be between 1 and 50, got: {count}")
    return count


def validate_telegram_message(text) -> str:
    """Validate Telegram message text — must be a string, max 4096 chars."""
    if not isinstance(text, str):
        raise ValueError(f"message text must be a string, got: {type(text).__name__}")
    if len(text) == 0:
        raise ValueError("message text must not be empty")
    if len(text) > 4096:
        raise ValueError(f"message text exceeds 4096 char limit (got {len(text)})")
    return text


def validate_mode_id(mode_id) -> int:
    """Validate mode ID — must be a positive integer."""
    if not isinstance(mode_id, int):
        try:
            mode_id = int(mode_id)
        except (TypeError, ValueError):
            raise ValueError(f"mode_id must be a positive integer, got: {mode_id!r}")
    if mode_id <= 0:
        raise ValueError(f"mode_id must be positive, got: {mode_id}")
    return mode_id


def validate_achievement_id(achievement_id) -> int:
    """Validate achievement ID — must be a positive integer."""
    if not isinstance(achievement_id, int):
        try:
            achievement_id = int(achievement_id)
        except (TypeError, ValueError):
            raise ValueError(f"achievement_id must be a positive integer, got: {achievement_id!r}")
    if achievement_id <= 0:
        raise ValueError(f"achievement_id must be positive, got: {achievement_id}")
    return achievement_id


def validate_quest_id(quest_id) -> int:
    """Validate quest instance ID — must be a positive integer."""
    if not isinstance(quest_id, int):
        try:
            quest_id = int(quest_id)
        except (TypeError, ValueError):
            raise ValueError(f"quest_id must be a positive integer, got: {quest_id!r}")
    if quest_id <= 0:
        raise ValueError(f"quest_id must be positive, got: {quest_id}")
    return quest_id
