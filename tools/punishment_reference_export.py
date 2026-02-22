#!/usr/bin/env python3
"""
Punishment Reference Export Tool
==================================
Reads punishment constants from frontend and backend to create
a comprehensive reference table of the accountability system.

Usage:
    python tools/punishment_reference_export.py                     # markdown (default)
    python tools/punishment_reference_export.py --format telegram   # telegram-ready chunks

Shows:
  - All punishment types (workout, book, money) with labels per difficulty
  - XP multipliers per intensity
  - Stars penalty rates per intensity
  - Safe mode caps
  - Level-based scaling formula
"""

import argparse
import io
import os
import re
import sys
from typing import Dict, List, Tuple

# Ensure UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── File paths ─────────────────────────────────────────────────────
FRONTEND_CONSTANTS = "mini-app/src/components/onboarding/punishment/constants.ts"
BACKEND_CONSTANTS = "bot/src/api/utils/constants.ts"
PUNISHMENT_JOB = "bot/src/jobs/definitions/punishmentCheck.ts"

TELEGRAM_MAX_LENGTH = 4096


def find_project_root() -> str:
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):
        if os.path.isdir(os.path.join(d, "mini-app")):
            return d
        d = os.path.dirname(d)
    return os.getcwd()


def read_file_safe(root: str, relpath: str) -> str:
    """Read file or return empty string with warning."""
    fpath = os.path.join(root, relpath)
    if not os.path.isfile(fpath):
        print(f"WARNING: File not found: {fpath}", file=sys.stderr)
        return ""
    with open(fpath, encoding="utf-8") as f:
        return f.read()


# ── Parsing ────────────────────────────────────────────────────────

def parse_punishment_types(content: str) -> List[Dict]:
    """Parse PUNISHMENT_TYPES from frontend constants."""
    types = []
    # Find each type object in PUNISHMENT_TYPES array
    for m in re.finditer(
        r"value:\s*'(\w+)'.*?label:\s*'([^']*)'.*?tagline:\s*'([^']*)'",
        content, re.DOTALL
    ):
        types.append({
            'value': m.group(1),
            'label': m.group(2),
            'tagline': m.group(3),
        })
    return types


def parse_difficulty_map(content: str) -> Dict[str, List[Dict]]:
    """Parse DIFFICULTY_MAP from frontend constants."""
    result: Dict[str, List[Dict]] = {}

    # Find each punishment type's difficulty array
    for ptype in ['workout', 'book', 'money']:
        pattern = rf"{ptype}:\s*\[(.*?)\]"
        m = re.search(pattern, content, re.DOTALL)
        if not m:
            continue

        difficulties = []
        for dm in re.finditer(
            r"value:\s*'(\w+)'.*?label:\s*'([^']*)'",
            m.group(1), re.DOTALL
        ):
            difficulties.append({
                'value': dm.group(1),
                'label': dm.group(2),
            })
        result[ptype] = difficulties

    return result


def parse_intensity_multiplier(content: str) -> Dict[str, float]:
    """Parse INTENSITY_MULTIPLIER from punishment job."""
    result: Dict[str, float] = {}
    m = re.search(r'INTENSITY_MULTIPLIER.*?\{(.*?)\}', content, re.DOTALL)
    if m:
        for im in re.finditer(r"(\w+):\s*([\d.]+)", m.group(1)):
            result[im.group(1)] = float(im.group(2))
    return result


def parse_stars_penalty_rates(content: str) -> Dict[str, int]:
    """Parse STARS_PENALTY_RATES from backend constants."""
    result: Dict[str, int] = {}
    m = re.search(r'STARS_PENALTY_RATES.*?\{(.*?)\}', content, re.DOTALL)
    if m:
        for sm in re.finditer(r"(\w+):\s*(\d+)", m.group(1)):
            result[sm.group(1)] = int(sm.group(2))
    return result


def parse_intensity_to_stars_key(content: str) -> Dict[str, str]:
    """Parse INTENSITY_TO_STARS_KEY mapping from punishment job."""
    result: Dict[str, str] = {}
    m = re.search(r'INTENSITY_TO_STARS_KEY.*?\{(.*?)\}', content, re.DOTALL)
    if m:
        for km in re.finditer(r"(\w+):\s*'(\w+)'", m.group(1)):
            result[km.group(1)] = km.group(2)
    return result


# ── Output ─────────────────────────────────────────────────────────

def build_reference(
    types: List[Dict],
    difficulty_map: Dict[str, List[Dict]],
    intensity_mult: Dict[str, float],
    stars_rates: Dict[str, int],
    intensity_to_stars: Dict[str, str],
) -> str:
    lines = [
        "# Punishment System Reference",
        "",
        "## 1. Punishment Types",
        "",
        "Users choose ONE punishment type during onboarding. Each type has",
        "4 difficulty levels that define the real-world consequence.",
        "",
        "| Type | Label | Tagline |",
        "|------|-------|---------|",
    ]

    for t in types:
        lines.append(f"| `{t['value']}` | {t['label']} | {t['tagline']} |")

    lines.append("")
    lines.append("## 2. Difficulty Levels per Type")
    lines.append("")
    lines.append("Each punishment type has 4 difficulties (easy → extreme):")
    lines.append("")
    lines.append("| Difficulty | Workout | Book | Money |")
    lines.append("|------------|---------|------|-------|")

    difficulties = ['easy', 'medium', 'hard', 'extreme']
    for diff in difficulties:
        workout_label = "—"
        book_label = "—"
        money_label = "—"
        for d in difficulty_map.get('workout', []):
            if d['value'] == diff:
                workout_label = d['label']
        for d in difficulty_map.get('book', []):
            if d['value'] == diff:
                book_label = d['label']
        for d in difficulty_map.get('money', []):
            if d['value'] == diff:
                money_label = d['label']
        lines.append(f"| **{diff.title()}** | {workout_label} | {book_label} | {money_label} |")

    lines.append("")
    lines.append("## 3. XP Multipliers by Intensity")
    lines.append("")
    lines.append("When a user fails a quest, the XP penalty = `quest_xp_reward * multiplier`.")
    lines.append("The `intensity_level` is stored in `punishment_settings`.")
    lines.append("")
    lines.append("| Intensity | Multiplier | Effect |")
    lines.append("|-----------|------------|--------|")

    def describe_multiplier(mult: float) -> str:
        if mult == 0.25:
            return 'Gentle — lose a quarter of the quest XP'
        elif mult == 0.5:
            return 'Moderate — lose half the quest XP'
        elif mult == 1.0:
            return 'Strict — lose the full quest XP'
        elif mult > 1.0:
            return f'Brutal — lose {mult}x the quest XP'
        else:
            return f'Lose {mult}x of the quest XP'

    for level in ['low', 'medium', 'high', 'extreme']:
        mult = intensity_mult.get(level, 1.0)
        desc = describe_multiplier(mult)
        lines.append(f"| **{level.title()}** | {mult}x | {desc} |")

    lines.append("")
    lines.append("### Formula")
    lines.append("")
    lines.append("```")
    lines.append("xp_penalty = round(quest_xp_reward * INTENSITY_MULTIPLIER[intensity_level])")
    lines.append("xp_penalty = min(xp_penalty, max_xp_penalty)  # per-quest cap")
    lines.append("")
    lines.append("# Safe mode: additional daily cap")
    lines.append("if safe_mode:")
    lines.append("    remaining = max(0, max_xp_penalty - daily_already_deducted)")
    lines.append("    xp_penalty = min(xp_penalty, remaining)")
    lines.append("```")

    lines.append("")
    lines.append("## 4. Stars Penalty Rates")
    lines.append("")
    lines.append("Stars (Telegram Stars currency) are deducted with a 2-phase system:")
    lines.append("1. **Warning** — first run sends a warning notification")
    lines.append("2. **Deduction** — next run applies the actual Stars penalty")
    lines.append("")
    lines.append("| Intensity | Stars Key | Stars per Quest |")
    lines.append("|-----------|-----------|-----------------|")

    for level in ['low', 'medium', 'high', 'extreme']:
        stars_key = intensity_to_stars.get(level, '?')
        rate = stars_rates.get(stars_key, '?')
        lines.append(f"| **{level.title()}** | {stars_key} | {rate} |")

    lines.append("")
    lines.append("### Stars Formula")
    lines.append("")
    lines.append("```")
    lines.append("stars_per_quest = STARS_PENALTY_RATES[intensity_to_stars_key[intensity_level]]")
    lines.append("total_stars = stars_per_quest * failed_quest_count")
    lines.append("")
    lines.append("# Safe mode: cap Stars using max_xp_penalty as combined cap")
    lines.append("if safe_mode:")
    lines.append("    total_stars = min(total_stars, max_xp_penalty)")
    lines.append("```")

    lines.append("")
    lines.append("## 5. Safe Mode")
    lines.append("")
    lines.append("When `safe_mode = true` in `punishment_settings`:")
    lines.append("")
    lines.append("| Protection | How it works |")
    lines.append("|------------|-------------|")
    lines.append("| **XP daily cap** | Total XP deducted per day cannot exceed `max_xp_penalty` |")
    lines.append("| **Stars cap** | Total Stars deducted per event cannot exceed `max_xp_penalty` |")
    lines.append("| **Per-quest cap** | Each individual quest penalty capped at `max_xp_penalty` |")
    lines.append("")
    lines.append("The `max_xp_penalty` value is set per user in `punishment_settings`.")
    lines.append("Default is typically 100 XP.")

    lines.append("")
    lines.append("## 6. Punishment Job Schedule")
    lines.append("")
    lines.append("| Setting | Value |")
    lines.append("|---------|-------|")
    lines.append("| **Job name** | `punishment-check` |")
    lines.append("| **Cron** | `30 0 * * *` (daily at 00:30 UTC) |")
    lines.append("| **Runs after** | `dailyQuestReset` (midnight UTC) |")
    lines.append("| **Batch size** | 50 users per batch |")
    lines.append("| **Delay** | 200ms between notifications |")
    lines.append("")
    lines.append("### Processing flow:")
    lines.append("")
    lines.append("```")
    lines.append("1. Find quests that expired yesterday (status: pending/ready/in_progress)")
    lines.append("2. Mark them as 'failed'")
    lines.append("3. Group by user")
    lines.append("4. For each user:")
    lines.append("   a. Check punishment_settings (consent required)")
    lines.append("   b. If no consent: notify only, no penalty")
    lines.append("   c. If consent: calculate XP penalty per quest")
    lines.append("   d. Apply Stars warning/deduction (2-phase)")
    lines.append("   e. Send Telegram notification with penalty breakdown")
    lines.append("```")

    lines.append("")
    lines.append("## 7. Database Tables")
    lines.append("")
    lines.append("### `punishment_settings`")
    lines.append("")
    lines.append("| Column | Type | Description |")
    lines.append("|--------|------|-------------|")
    lines.append("| `user_id` | int | FK to users |")
    lines.append("| `consent_given` | bool | Must be true for penalties |")
    lines.append("| `consent_timestamp` | timestamp | When consent was given |")
    lines.append("| `intensity_level` | text | low / medium / high / extreme |")
    lines.append("| `safe_mode` | bool | Enable daily penalty caps |")
    lines.append("| `max_xp_penalty` | int | Max XP loss per quest/day |")
    lines.append("| `custom_punishments` | jsonb | User-defined consequences (max 20) |")
    lines.append("")
    lines.append("### `punishment_history`")
    lines.append("")
    lines.append("| Column | Type | Description |")
    lines.append("|--------|------|-------------|")
    lines.append("| `id` | serial | Primary key |")
    lines.append("| `user_id` | int | FK to users |")
    lines.append("| `quest_instance_id` | int | FK to quest_instances (nullable) |")
    lines.append("| `punishment_type` | text | xp_penalty / warning / stars_deduction |")
    lines.append("| `severity` | text | Intensity level at time of penalty |")
    lines.append("| `xp_deducted` | int | Amount of XP/Stars deducted |")
    lines.append("| `message_sent` | text | Notification message content |")
    lines.append("| `applied_at` | timestamp | When the penalty was applied |")

    return "\n".join(lines)


def format_telegram(text: str) -> List[str]:
    """Split into Telegram-safe chunks."""
    chunks: List[str] = []
    sections = re.split(r'(?=^#{1,3} )', text, flags=re.MULTILINE)

    current_chunk = ""
    for section in sections:
        if not section.strip():
            continue
        if len(current_chunk) + len(section) + 2 > TELEGRAM_MAX_LENGTH:
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
            if len(section) > TELEGRAM_MAX_LENGTH:
                sub_lines = section.split("\n")
                sub_chunk = ""
                for sl in sub_lines:
                    if len(sub_chunk) + len(sl) + 2 > TELEGRAM_MAX_LENGTH:
                        if sub_chunk.strip():
                            chunks.append(sub_chunk.strip())
                        sub_chunk = sl + "\n"
                    else:
                        sub_chunk += sl + "\n"
                current_chunk = sub_chunk
            else:
                current_chunk = section
        else:
            current_chunk += "\n" + section

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


# ── Main ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Export punishment system reference")
    parser.add_argument(
        "--format", choices=["markdown", "telegram"], default="markdown",
        help="Output format (default: markdown)"
    )
    args = parser.parse_args()

    root = find_project_root()

    # Read source files
    frontend = read_file_safe(root, FRONTEND_CONSTANTS)
    backend = read_file_safe(root, BACKEND_CONSTANTS)
    job_file = read_file_safe(root, PUNISHMENT_JOB)

    if not frontend and not backend and not job_file:
        print("ERROR: No source files found. Are you running from the project root?", file=sys.stderr)
        sys.exit(1)

    # Parse
    types = parse_punishment_types(frontend) if frontend else []
    difficulty_map = parse_difficulty_map(frontend) if frontend else {}
    intensity_mult = parse_intensity_multiplier(job_file) if job_file else {}
    stars_rates = parse_stars_penalty_rates(backend) if backend else {}
    intensity_to_stars = parse_intensity_to_stars_key(job_file) if job_file else {}

    # Fallbacks if parsing failed
    if not types:
        types = [
            {'value': 'workout', 'label': 'Workout', 'tagline': 'Missed a task? Drop and give me pushups!'},
            {'value': 'book', 'label': 'Book', 'tagline': 'Skipped your goal? Time to read.'},
            {'value': 'money', 'label': 'Money', 'tagline': 'Failed today? Donate to a good cause.'},
        ]

    if not intensity_mult:
        intensity_mult = {'low': 0.5, 'medium': 1.0, 'high': 1.5, 'extreme': 2.0}

    if not stars_rates:
        stars_rates = {'light': 1, 'moderate': 3, 'strict': 5, 'extreme': 10}

    if not intensity_to_stars:
        intensity_to_stars = {'low': 'light', 'medium': 'moderate', 'high': 'strict', 'extreme': 'extreme'}

    output = build_reference(types, difficulty_map, intensity_mult, stars_rates, intensity_to_stars)

    if args.format == "markdown":
        print(output)
    else:
        chunks = format_telegram(output)
        for i, chunk in enumerate(chunks, 1):
            print(f"--- Chunk {i}/{len(chunks)} ({len(chunk)} chars) ---")
            print(chunk)
            print()


if __name__ == "__main__":
    main()
