#!/usr/bin/env python3
"""
Onboarding Text Export Tool
============================
Reads i18n files (en.ts, ru.ts) and onboardingQuestions.ts to produce
a bilingual reference table of all onboarding text.

Usage:
    python tools/onboarding_text_export.py                     # markdown (default)
    python tools/onboarding_text_export.py --format telegram   # telegram-ready chunks
    python tools/onboarding_text_export.py --format markdown   # explicit markdown

Output columns: Key | English Text | Russian Text
Organized by mode (Fitness, Hydration, Finance, Learning, Medication, Habits)
then by question.
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

# ── File paths (relative to project root) ──────────────────────────
I18N_EN = "mini-app/src/i18n/en.ts"
I18N_RU = "mini-app/src/i18n/ru.ts"
QUESTIONS_FILE = "mini-app/src/data/onboardingQuestions.ts"

TELEGRAM_MAX_LENGTH = 4096


def find_project_root() -> str:
    """Walk up from script location to find the project root (contains mini-app/)."""
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):
        if os.path.isdir(os.path.join(d, "mini-app")):
            return d
        d = os.path.dirname(d)
    # Fallback: assume CWD
    return os.getcwd()


def read_file(root: str, relpath: str) -> str:
    """Read a file and return its content, or exit with error."""
    fpath = os.path.join(root, relpath)
    if not os.path.isfile(fpath):
        print(f"ERROR: File not found: {fpath}", file=sys.stderr)
        sys.exit(1)
    with open(fpath, encoding="utf-8") as f:
        return f.read()


# ── i18n parsing ───────────────────────────────────────────────────

def parse_i18n_onboarding(content: str) -> Dict[str, str]:
    """
    Extract key-value pairs from the onboarding section of an i18n file.
    Returns flat dict like {'welcome': 'Welcome!', 'selectModes': 'Select Modes', ...}
    """
    result: Dict[str, str] = {}

    # Find the onboarding block
    match = re.search(r'onboarding:\s*\{', content)
    if not match:
        return result

    start = match.end()
    depth = 1
    pos = start

    while pos < len(content) and depth > 0:
        ch = content[pos]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
        pos += 1

    block = content[start:pos - 1]

    # Extract key: "value" pairs (handles escaped quotes, template literals)
    for m in re.finditer(
        r'(\w+)\s*:\s*"((?:[^"\\]|\\.|\\n)*)"',
        block
    ):
        key = m.group(1)
        value = m.group(2).replace('\\"', '"').replace('\\n', '\n')
        # Decode unicode escapes like \u2014
        value = value.encode('utf-8').decode('unicode_escape', errors='replace')
        result[key] = value

    return result


# ── Questions parsing ──────────────────────────────────────────────

def parse_questions(content: str) -> Dict[str, List[Dict]]:
    """
    Parse onboardingQuestions.ts to extract questions grouped by mode.
    Returns dict like:
    {
      'Fitness': [{'step': 'fitness_motivation', 'title': "What's Your Goal?", ...}, ...],
      ...
    }
    """
    modes: Dict[str, List[Dict]] = {}

    # Find each *_QUESTIONS array
    mode_pattern = re.compile(
        r'export\s+const\s+(\w+)_QUESTIONS\s*:\s*QuestionConfig\[\]\s*=\s*\[',
        re.IGNORECASE
    )

    for mm in mode_pattern.finditer(content):
        mode_name = mm.group(1).replace('_', ' ').title()
        start = mm.end()

        # Find matching closing bracket
        depth = 1
        pos = start
        while pos < len(content) and depth > 0:
            ch = content[pos]
            if ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
            pos += 1
        array_block = content[start:pos - 1]

        questions = []
        # Find each question object { ... }
        obj_starts = []
        i = 0
        while i < len(array_block):
            if array_block[i] == '{':
                # Find matching closing brace
                d = 1
                j = i + 1
                while j < len(array_block) and d > 0:
                    if array_block[j] == '{':
                        d += 1
                    elif array_block[j] == '}':
                        d -= 1
                    j += 1
                obj_starts.append(array_block[i:j])
                i = j
            else:
                i += 1

        for obj_str in obj_starts:
            q: Dict = {}

            # Extract step
            sm = re.search(r"step:\s*'(\w+)'", obj_str)
            if sm:
                q['step'] = sm.group(1)

            # Extract title (try double-quoted first to handle apostrophes)
            tm = re.search(r'title:\s*"([^"]+)"', obj_str) or re.search(r"title:\s*'([^']+)'", obj_str)
            if tm:
                q['title'] = tm.group(1)

            # Extract subtitle
            stm = re.search(r'subtitle:\s*"([^"]+)"', obj_str) or re.search(r"subtitle:\s*'([^']+)'", obj_str)
            if stm:
                q['subtitle'] = stm.group(1)

            # Extract type
            typ = re.search(r"type:\s*'(\S+?)'", obj_str)
            if typ:
                q['type'] = typ.group(1)

            # Extract dataKey
            dk = re.search(r"dataKey:\s*'(\w+)'", obj_str)
            if dk:
                q['dataKey'] = dk.group(1)

            # Extract nestedKey
            nk = re.search(r"nestedKey:\s*'(\w+)'", obj_str)
            if nk:
                q['nestedKey'] = nk.group(1)

            # Extract options
            opts_match = re.search(r'options:\s*\[', obj_str)
            if opts_match:
                options = []
                for om in re.finditer(
                    r"\{\s*value:\s*'([^']+)'\s*,\s*label:\s*'([^']*)'",
                    obj_str
                ):
                    options.append({'value': om.group(1), 'label': om.group(2)})
                q['options'] = options

            if q.get('step'):
                questions.append(q)

        modes[mode_name] = questions

    # Also extract REFERRAL_OPTIONS
    ref_match = re.search(r'export\s+const\s+REFERRAL_OPTIONS.*?=\s*\[', content)
    if ref_match:
        start = ref_match.end()
        depth = 1
        pos = start
        while pos < len(content) and depth > 0:
            if content[pos] == '[':
                depth += 1
            elif content[pos] == ']':
                depth -= 1
            pos += 1
        ref_block = content[start:pos - 1]
        options = []
        for om in re.finditer(r"\{\s*value:\s*'([^']+)'\s*,\s*label:\s*'([^']*)'", ref_block):
            options.append({'value': om.group(1), 'label': om.group(2)})
        modes['Referral'] = [{'step': 'referral', 'title': 'How Did You Find Us?',
                              'subtitle': 'Where did you hear about MaxLevel?',
                              'type': 'single-select', 'options': options}]

    return modes


# ── Output formatting ──────────────────────────────────────────────

def build_i18n_table(en_texts: Dict[str, str], ru_texts: Dict[str, str]) -> str:
    """Build a markdown table of onboarding i18n keys."""
    lines = [
        "## Onboarding UI Text (i18n)",
        "",
        "| Key | English | Russian |",
        "|-----|---------|---------|",
    ]
    for key in en_texts:
        en_val = en_texts.get(key, "—").replace("|", "\\|")
        ru_val = ru_texts.get(key, "—").replace("|", "\\|")
        lines.append(f"| `{key}` | {en_val} | {ru_val} |")

    return "\n".join(lines)


def build_questions_table(modes: Dict[str, List[Dict]]) -> str:
    """Build markdown tables for each mode's questions."""
    lines = [
        "",
        "## Onboarding Questions by Mode",
    ]

    mode_order = ['Fitness', 'Hydration', 'Finance', 'Learning', 'Medication', 'Habits', 'Referral']
    for mode in mode_order:
        questions = modes.get(mode, [])
        if not questions:
            continue

        lines.append(f"\n### {mode} ({len(questions)} questions)\n")
        lines.append("| # | Step | Title | Type | Options |")
        lines.append("|---|------|-------|------|---------|")

        for i, q in enumerate(questions, 1):
            step = q.get('step', '—')
            title = q.get('title', '—')
            qtype = q.get('type', '—')
            opts = q.get('options', [])
            if opts:
                opt_str = ", ".join(o['label'] for o in opts[:6])
                if len(opts) > 6:
                    opt_str += f" (+{len(opts) - 6})"
            else:
                opt_str = f"_{qtype}_"
            lines.append(f"| {i} | `{step}` | {title} | {qtype} | {opt_str} |")

    return "\n".join(lines)


def format_telegram(text: str) -> List[str]:
    """
    Split markdown into Telegram-safe chunks (<4096 chars).
    Splits on section boundaries (## or ###).
    """
    # Convert markdown tables to simpler format for Telegram
    # Replace table formatting
    text = text.replace("**", "")
    # Remove table header separators
    lines = text.split("\n")
    cleaned = []
    for line in lines:
        if re.match(r'^\|[-|]+\|$', line.strip()):
            continue
        # Convert table rows to readable format
        if line.startswith("|") and line.endswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            # Skip if all cells look like header separators
            cleaned.append("  ".join(cells))
        else:
            cleaned.append(line)

    full_text = "\n".join(cleaned)

    # Split into chunks at section headers
    chunks: List[str] = []
    sections = re.split(r'(?=^#{1,3} )', full_text, flags=re.MULTILINE)

    current_chunk = ""
    for section in sections:
        if not section.strip():
            continue
        if len(current_chunk) + len(section) + 2 > TELEGRAM_MAX_LENGTH:
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
            # If a single section is too long, split it further
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
    parser = argparse.ArgumentParser(description="Export onboarding text reference")
    parser.add_argument(
        "--format", choices=["markdown", "telegram"], default="markdown",
        help="Output format (default: markdown)"
    )
    args = parser.parse_args()

    root = find_project_root()

    # Read source files
    en_content = read_file(root, I18N_EN)
    ru_content = read_file(root, I18N_RU)
    questions_content = read_file(root, QUESTIONS_FILE)

    # Parse
    en_texts = parse_i18n_onboarding(en_content)
    ru_texts = parse_i18n_onboarding(ru_content)
    modes = parse_questions(questions_content)

    # Build output
    header = "# Onboarding Reference — Text & Questions\n"
    i18n_table = build_i18n_table(en_texts, ru_texts)
    questions_table = build_questions_table(modes)
    full_output = header + "\n" + i18n_table + "\n" + questions_table

    if args.format == "markdown":
        print(full_output)
    else:
        chunks = format_telegram(full_output)
        for i, chunk in enumerate(chunks, 1):
            print(f"--- Chunk {i}/{len(chunks)} ({len(chunk)} chars) ---")
            print(chunk)
            print()


if __name__ == "__main__":
    main()
