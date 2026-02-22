#!/usr/bin/env python3
"""
Onboarding Flow Export Tool
=============================
Reads onboardingQuestions.ts and useOnboardingNavigation.ts to create
a flow diagram showing the complete onboarding step sequence.

Usage:
    python tools/onboarding_flow_export.py                     # markdown (default)
    python tools/onboarding_flow_export.py --format telegram   # telegram-ready chunks

Shows:
  - Step sequence (splash → hero_intro → avatar → paths → ...)
  - Conditional branching (mode-specific questions based on paths selection)
  - What each answer stores (dataKey, nestedKey, DB table)
  - Special conditionals (e.g. fitness_target_weight only if motivation includes lose_weight/build_muscle)
"""

import argparse
import io
import os
import re
import sys
from typing import Dict, List, Optional, Tuple

# Ensure UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── File paths ─────────────────────────────────────────────────────
NAVIGATION_FILE = "mini-app/src/hooks/useOnboardingNavigation.ts"
QUESTIONS_FILE = "mini-app/src/data/onboardingQuestions.ts"

TELEGRAM_MAX_LENGTH = 4096


def find_project_root() -> str:
    """Walk up from script location to find the project root."""
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):
        if os.path.isdir(os.path.join(d, "mini-app")):
            return d
        d = os.path.dirname(d)
    return os.getcwd()


def read_file(root: str, relpath: str) -> str:
    fpath = os.path.join(root, relpath)
    if not os.path.isfile(fpath):
        print(f"ERROR: File not found: {fpath}", file=sys.stderr)
        sys.exit(1)
    with open(fpath, encoding="utf-8") as f:
        return f.read()


# ── Data structures ────────────────────────────────────────────────

# Fixed intro/outro steps (always present)
INTRO_STEPS = ['splash', 'hero_intro', 'avatar', 'paths', 'referral']
OUTRO_STEPS = ['punishments', 'notifications', 'summary', 'launch']

# Mode → step list (must match useOnboardingNavigation.ts)
MODE_STEPS: Dict[str, List[str]] = {
    'fitness': [
        'fitness_motivation', 'fitness_focus', 'fitness_level', 'fitness_activity',
        'fitness_age', 'fitness_height', 'fitness_weight', 'fitness_target_weight',
        'fitness_equipment', 'fitness_frequency', 'fitness_days', 'fitness_time',
    ],
    'hydration': [
        'hydration_intake', 'hydration_goals', 'hydration_target',
        'hydration_reminder', 'hydration_schedule', 'hydration_vessel',
        'hydration_barriers',
    ],
    'finance': [
        'finance_goals', 'finance_income', 'finance_spending',
        'finance_savings_target', 'finance_frequency',
    ],
    'learning': [
        'learning_goals', 'learning_style', 'learning_time',
        'learning_frequency', 'learning_days', 'learning_resources',
    ],
    'medication': [
        'medication_count', 'medication_types', 'medication_schedule',
        'medication_goals', 'medication_barriers', 'medication_reminders',
    ],
    'habits': [
        'habits_type', 'habits_frequency', 'habits_count',
        'habits_trigger', 'habits_goals', 'habits_barriers',
    ],
}

# Steps with special conditionals
CONDITIONALS: Dict[str, str] = {
    'fitness_target_weight': 'Only shown if fitness motivation includes "lose_weight" or "build_muscle"',
}


def parse_question_metadata(content: str) -> Dict[str, Dict]:
    """
    Parse onboardingQuestions.ts to extract metadata for each step:
    step -> {title, subtitle, type, dataKey, nestedKey, options_count, showIf}
    """
    meta: Dict[str, Dict] = {}

    # Parse all question arrays
    array_pattern = re.compile(
        r'export\s+const\s+\w+_QUESTIONS\s*:\s*QuestionConfig\[\]\s*=\s*\[',
        re.IGNORECASE
    )

    for am in array_pattern.finditer(content):
        start = am.end()
        depth = 1
        pos = start
        while pos < len(content) and depth > 0:
            if content[pos] == '[':
                depth += 1
            elif content[pos] == ']':
                depth -= 1
            pos += 1
        block = content[start:pos - 1]

        # Extract each question object
        i = 0
        while i < len(block):
            if block[i] == '{':
                d = 1
                j = i + 1
                while j < len(block) and d > 0:
                    if block[j] == '{':
                        d += 1
                    elif block[j] == '}':
                        d -= 1
                    j += 1
                obj = block[i:j]

                step_m = re.search(r"step:\s*'(\w+)'", obj)
                if step_m:
                    step = step_m.group(1)
                    q: Dict = {'step': step}

                    title_m = re.search(r'title:\s*"([^"]+)"', obj) or re.search(r"title:\s*'([^']+)'", obj)
                    if title_m:
                        q['title'] = title_m.group(1)

                    subtitle_m = re.search(r'subtitle:\s*"([^"]+)"', obj) or re.search(r"subtitle:\s*'([^']+)'", obj)
                    if subtitle_m:
                        q['subtitle'] = subtitle_m.group(1)

                    type_m = re.search(r"type:\s*'(\S+?)'", obj)
                    if type_m:
                        q['type'] = type_m.group(1)

                    dk_m = re.search(r"dataKey:\s*'(\w+)'", obj)
                    if dk_m:
                        q['dataKey'] = dk_m.group(1)

                    nk_m = re.search(r"nestedKey:\s*'(\w+)'", obj)
                    if nk_m:
                        q['nestedKey'] = nk_m.group(1)

                    # Count options
                    opt_count = len(re.findall(r"value:\s*'[^']+'", obj))
                    if opt_count > 0:
                        q['options_count'] = opt_count

                    # Check for showIf
                    if 'showIf' in obj:
                        q['conditional'] = True

                    meta[step] = q

                i = j
            else:
                i += 1

    return meta


# ── DB storage mapping ─────────────────────────────────────────────

DB_STORAGE = {
    'fitness': 'onboarding_state.quiz_data → mode_configs.quiz_responses (fitness)',
    'hydration': 'onboarding_state.quiz_data → mode_configs.quiz_responses (hydration)',
    'finance': 'onboarding_state.quiz_data → mode_configs.quiz_responses (finance)',
    'learning': 'onboarding_state.quiz_data → mode_configs.quiz_responses (learning)',
    'medication': 'onboarding_state.quiz_data → mode_configs.quiz_responses (medication)',
    'habits': 'onboarding_state.quiz_data → mode_configs.quiz_responses (habits)',
    'pain_points': 'onboarding_state.quiz_data → mode_configs.pain_points',
    'punishments': 'punishment_settings table',
    'notification_preferences': 'user_settings / onboarding_state.quiz_data',
    'selected_modes': 'onboarding_state.quiz_data + mode_configs rows',
    'referral_source': 'onboarding_state.quiz_data',
}


# ── Output builders ────────────────────────────────────────────────

def build_flow_diagram(meta: Dict[str, Dict]) -> str:
    lines = [
        "# Onboarding Flow Diagram",
        "",
        "## Overview",
        "",
        "The onboarding flow is a linear sequence with conditional branching",
        "based on which modes the user selects at the `paths` step.",
        "",
        "```",
        "Total possible steps: 5 (intro) + 42 (all modes) + 4 (convergence) = 51",
        "Minimum steps (1 mode): 5 + 5-12 + 4 = 14-21",
        "```",
        "",
    ]

    # Section 1: Intro steps
    lines.append("## 1. Introduction (always shown)")
    lines.append("")
    lines.append("```")
    for i, step in enumerate(INTRO_STEPS):
        arrow = " → " if i < len(INTRO_STEPS) - 1 else ""
        desc = _step_description(step)
        lines.append(f"  [{step}]{arrow}")
        lines.append(f"    {desc}")
    lines.append("```")
    lines.append("")
    lines.append("At `paths`, user selects 1+ modes from: Fitness, Hydration, Finance, Learning, Medication, Habits")
    lines.append("Selected modes determine which question blocks appear next.")
    lines.append("")

    # Section 2: Mode-specific steps
    lines.append("## 2. Mode Questions (conditional on paths selection)")
    lines.append("")

    for mode, steps in MODE_STEPS.items():
        mode_title = mode.title()
        lines.append(f"### {mode_title} ({len(steps)} steps)")
        lines.append(f"*Shown if user selected `{mode}` at paths step*")
        lines.append("")
        lines.append("| # | Step | Title | Type | Stores In | Conditional |")
        lines.append("|---|------|-------|------|-----------|-------------|")

        for i, step in enumerate(steps, 1):
            q = meta.get(step, {})
            title = q.get('title', '—')
            qtype = q.get('type', '—')
            data_key = q.get('dataKey', '—')
            nested = q.get('nestedKey', '')
            storage = f"`{data_key}.{nested}`" if nested else f"`{data_key}`"
            cond = CONDITIONALS.get(step, '—')
            if q.get('conditional') and cond == '—':
                cond = 'Has showIf condition'
            lines.append(f"| {i} | `{step}` | {title} | {qtype} | {storage} | {cond} |")

        lines.append("")

    # Section 3: Convergence steps
    lines.append("## 3. Convergence (always shown)")
    lines.append("")
    lines.append("```")
    for i, step in enumerate(OUTRO_STEPS):
        arrow = " → " if i < len(OUTRO_STEPS) - 1 else " → completed"
        desc = _step_description(step)
        lines.append(f"  [{step}]{arrow}")
        lines.append(f"    {desc}")
    lines.append("```")
    lines.append("")

    # Section 4: Data storage summary
    lines.append("## 4. Data Storage Reference")
    lines.append("")
    lines.append("| dataKey | DB Storage |")
    lines.append("|---------|------------|")
    for key, storage in DB_STORAGE.items():
        lines.append(f"| `{key}` | {storage} |")
    lines.append("")

    # Section 5: Visual flow tree
    lines.append("## 5. Full Flow Tree")
    lines.append("")
    lines.append("```")
    lines.append("splash")
    lines.append("  └─ hero_intro")
    lines.append("       └─ avatar")
    lines.append("            └─ paths (select modes)")
    lines.append("                 └─ referral")
    lines.append("                      │")
    lines.append("                      ├─ [if fitness selected] ──────────────────┐")
    lines.append("                      │   fitness_motivation → fitness_focus →    │")
    lines.append("                      │   fitness_level → fitness_activity →      │")
    lines.append("                      │   fitness_age → fitness_height →          │")
    lines.append("                      │   fitness_weight →                        │")
    lines.append("                      │     [if lose_weight/build_muscle] ──┐     │")
    lines.append("                      │       fitness_target_weight ────────┘     │")
    lines.append("                      │   fitness_equipment → fitness_frequency → │")
    lines.append("                      │   fitness_days → fitness_time ────────────┘")
    lines.append("                      │")
    lines.append("                      ├─ [if hydration selected] ────────────────┐")
    lines.append("                      │   hydration_intake → hydration_goals →   │")
    lines.append("                      │   hydration_target → hydration_reminder →│")
    lines.append("                      │   hydration_schedule → hydration_vessel →│")
    lines.append("                      │   hydration_barriers ────────────────────┘")
    lines.append("                      │")
    lines.append("                      ├─ [if finance selected] ──────────────────┐")
    lines.append("                      │   finance_goals → finance_income →       │")
    lines.append("                      │   finance_spending →                     │")
    lines.append("                      │   finance_savings_target →               │")
    lines.append("                      │   finance_frequency ─────────────────────┘")
    lines.append("                      │")
    lines.append("                      ├─ [if learning selected] ─────────────────┐")
    lines.append("                      │   learning_goals → learning_style →      │")
    lines.append("                      │   learning_time → learning_frequency →   │")
    lines.append("                      │   learning_days → learning_resources ────┘")
    lines.append("                      │")
    lines.append("                      ├─ [if medication selected] ───────────────┐")
    lines.append("                      │   medication_count → medication_types →  │")
    lines.append("                      │   medication_schedule →                  │")
    lines.append("                      │   medication_goals →                     │")
    lines.append("                      │   medication_barriers →                  │")
    lines.append("                      │   medication_reminders ──────────────────┘")
    lines.append("                      │")
    lines.append("                      ├─ [if habits selected] ───────────────────┐")
    lines.append("                      │   habits_type → habits_frequency →       │")
    lines.append("                      │   habits_count → habits_trigger →        │")
    lines.append("                      │   habits_goals → habits_barriers ────────┘")
    lines.append("                      │")
    lines.append("                      └─ punishments")
    lines.append("                           └─ notifications")
    lines.append("                                └─ summary")
    lines.append("                                     └─ launch → completed")
    lines.append("```")

    return "\n".join(lines)


def _step_description(step: str) -> str:
    """Human description for fixed steps."""
    descs = {
        'splash': 'Logo + "Level up your real life" tagline',
        'hero_intro': '"Ready to improve your life?" + avatar preview',
        'avatar': 'Pick your character (Gym Warrior, Office Boss, etc.)',
        'paths': 'Select modes: Fitness, Hydration, Finance, Learning, Medication, Habits',
        'referral': 'How did you find us? (TikTok, Instagram, Telegram, etc.)',
        'punishments': 'Accountability opt-in (workout/book/money punishment + difficulty)',
        'notifications': 'Toggle: task reminders, daily summary, achievements, streak warnings',
        'summary': 'Review your setup before starting',
        'launch': 'Achievement unlocked + first tasks created → dashboard',
    }
    return descs.get(step, step)


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
    parser = argparse.ArgumentParser(description="Export onboarding flow diagram")
    parser.add_argument(
        "--format", choices=["markdown", "telegram"], default="markdown",
        help="Output format (default: markdown)"
    )
    args = parser.parse_args()

    root = find_project_root()
    questions_content = read_file(root, QUESTIONS_FILE)
    meta = parse_question_metadata(questions_content)

    output = build_flow_diagram(meta)

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
