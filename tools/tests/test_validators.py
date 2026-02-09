#!/usr/bin/env python3
"""Tests for tools/validators.py"""

import os
import sys
import pytest

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from tools.validators import (
    validate_user_id,
    validate_telegram_id,
    validate_timezone,
    validate_quest_count,
    validate_telegram_message,
    validate_mode_id,
    validate_achievement_id,
    validate_quest_id,
)


class TestValidateUserId:
    def test_valid_integer(self):
        assert validate_user_id(1) == 1
        assert validate_user_id(999) == 999

    def test_valid_string_number(self):
        assert validate_user_id("5") == 5

    def test_zero_raises(self):
        with pytest.raises(ValueError, match="positive"):
            validate_user_id(0)

    def test_negative_raises(self):
        with pytest.raises(ValueError, match="positive"):
            validate_user_id(-1)

    def test_none_raises(self):
        with pytest.raises(ValueError, match="integer"):
            validate_user_id(None)

    def test_string_raises(self):
        with pytest.raises(ValueError, match="integer"):
            validate_user_id("abc")

    def test_float_truncates(self):
        assert validate_user_id(3.9) == 3


class TestValidateTelegramId:
    def test_valid(self):
        assert validate_telegram_id(123456789) == 123456789

    def test_zero_raises(self):
        with pytest.raises(ValueError, match="positive"):
            validate_telegram_id(0)

    def test_none_raises(self):
        with pytest.raises(ValueError, match="integer"):
            validate_telegram_id(None)


class TestValidateTimezone:
    def test_valid_utc(self):
        assert validate_timezone("UTC") == "UTC"

    def test_valid_named(self):
        assert validate_timezone("America/New_York") == "America/New_York"

    def test_valid_with_spaces(self):
        assert validate_timezone("  Europe/Moscow  ") == "Europe/Moscow"

    def test_invalid_raises(self):
        with pytest.raises(ValueError, match="Invalid timezone"):
            validate_timezone("Not/A/Timezone")

    def test_empty_raises(self):
        with pytest.raises(ValueError, match="non-empty"):
            validate_timezone("")

    def test_none_raises(self):
        with pytest.raises(ValueError, match="non-empty"):
            validate_timezone(None)


class TestValidateQuestCount:
    def test_valid_range(self):
        assert validate_quest_count(1) == 1
        assert validate_quest_count(3) == 3
        assert validate_quest_count(50) == 50

    def test_zero_raises(self):
        with pytest.raises(ValueError, match="between 1 and 50"):
            validate_quest_count(0)

    def test_over_50_raises(self):
        with pytest.raises(ValueError, match="between 1 and 50"):
            validate_quest_count(51)

    def test_string_number(self):
        assert validate_quest_count("10") == 10

    def test_none_raises(self):
        with pytest.raises(ValueError, match="integer"):
            validate_quest_count(None)


class TestValidateTelegramMessage:
    def test_valid(self):
        assert validate_telegram_message("Hello!") == "Hello!"

    def test_max_length(self):
        msg = "x" * 4096
        assert validate_telegram_message(msg) == msg

    def test_too_long_raises(self):
        msg = "x" * 4097
        with pytest.raises(ValueError, match="too long"):
            validate_telegram_message(msg)

    def test_non_string_raises(self):
        with pytest.raises(ValueError, match="string"):
            validate_telegram_message(123)

    def test_none_raises(self):
        with pytest.raises(ValueError, match="string"):
            validate_telegram_message(None)


class TestValidateModeId:
    def test_valid(self):
        assert validate_mode_id(1) == 1

    def test_zero_raises(self):
        with pytest.raises(ValueError, match="positive"):
            validate_mode_id(0)

    def test_negative_raises(self):
        with pytest.raises(ValueError, match="positive"):
            validate_mode_id(-5)


class TestValidateAchievementId:
    def test_valid(self):
        assert validate_achievement_id(1) == 1

    def test_string_number(self):
        assert validate_achievement_id("42") == 42

    def test_zero_raises(self):
        with pytest.raises(ValueError, match="positive"):
            validate_achievement_id(0)


class TestValidateQuestId:
    def test_valid(self):
        assert validate_quest_id(1) == 1

    def test_zero_raises(self):
        with pytest.raises(ValueError, match="positive"):
            validate_quest_id(0)

    def test_none_raises(self):
        with pytest.raises(ValueError, match="integer"):
            validate_quest_id(None)
