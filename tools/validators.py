#!/usr/bin/env python3
"""
Input Validators for Python Tools
Part of the WAT Framework (Tools Layer)

Centralized validation functions used by all manager scripts.
Each function raises ValueError with a descriptive message on failure.
"""

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def validate_user_id(user_id) -> int:
    """Validate user ID is a positive integer."""
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise ValueError(f"user_id must be an integer, got {type(user_id).__name__}")
    if user_id <= 0:
        raise ValueError(f"user_id must be positive, got {user_id}")
    return user_id


def validate_telegram_id(telegram_id) -> int:
    """Validate Telegram ID is a positive integer."""
    try:
        telegram_id = int(telegram_id)
    except (TypeError, ValueError):
        raise ValueError(f"telegram_id must be an integer, got {type(telegram_id).__name__}")
    if telegram_id <= 0:
        raise ValueError(f"telegram_id must be positive, got {telegram_id}")
    return telegram_id


def validate_timezone(tz: str) -> str:
    """Validate timezone string using zoneinfo."""
    if not isinstance(tz, str) or not tz.strip():
        raise ValueError("timezone must be a non-empty string")
    tz = tz.strip()
    try:
        ZoneInfo(tz)
    except (ZoneInfoNotFoundError, KeyError):
        raise ValueError(f"Invalid timezone: '{tz}'")
    return tz


def validate_quest_count(count) -> int:
    """Validate quest count is between 1 and 50."""
    try:
        count = int(count)
    except (TypeError, ValueError):
        raise ValueError(f"count must be an integer, got {type(count).__name__}")
    if count < 1 or count > 50:
        raise ValueError(f"count must be between 1 and 50, got {count}")
    return count


def validate_telegram_message(text) -> str:
    """Validate Telegram message text (max 4096 chars)."""
    if not isinstance(text, str):
        raise ValueError(f"message must be a string, got {type(text).__name__}")
    if len(text) > 4096:
        raise ValueError(f"message too long: {len(text)} chars (max 4096)")
    return text


def validate_mode_id(mode_id) -> int:
    """Validate mode ID is a positive integer."""
    try:
        mode_id = int(mode_id)
    except (TypeError, ValueError):
        raise ValueError(f"mode_id must be an integer, got {type(mode_id).__name__}")
    if mode_id <= 0:
        raise ValueError(f"mode_id must be positive, got {mode_id}")
    return mode_id


def validate_achievement_id(achievement_id) -> int:
    """Validate achievement ID is a positive integer."""
    try:
        achievement_id = int(achievement_id)
    except (TypeError, ValueError):
        raise ValueError(f"achievement_id must be an integer, got {type(achievement_id).__name__}")
    if achievement_id <= 0:
        raise ValueError(f"achievement_id must be positive, got {achievement_id}")
    return achievement_id


def validate_quest_id(quest_id) -> int:
    """Validate quest ID is a positive integer."""
    try:
        quest_id = int(quest_id)
    except (TypeError, ValueError):
        raise ValueError(f"quest_id must be an integer, got {type(quest_id).__name__}")
    if quest_id <= 0:
        raise ValueError(f"quest_id must be positive, got {quest_id}")
    return quest_id
