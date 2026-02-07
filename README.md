# WAT Framework

**Workflows, Agents, Tools** - A reliable architecture that separates AI reasoning from deterministic execution.

## Overview

The WAT framework is designed to maximize reliability by separating concerns:
- **Workflows** define what needs to be done (instructions)
- **Agents** make intelligent decisions (coordination)
- **Tools** execute tasks deterministically (implementation)

This separation keeps AI focused on orchestration while delegating execution to reliable Python scripts.

## Directory Structure

```
.tmp/           # Temporary files (regenerated as needed)
tools/          # Python scripts for deterministic execution
workflows/      # Markdown SOPs defining processes
.env            # API keys and environment variables (gitignored)
CLAUDE.md       # Agent instructions and framework documentation
```

## Quick Start

### 1. Clone and Setup

```bash
# Install Python dependencies (create requirements.txt as needed)
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env  # Edit .env with your API keys
```

### 2. Configure API Keys

Edit [.env](.env) and add your API keys:
- OpenAI API key
- Anthropic API key
- Google API key
- Any other service-specific keys

### 3. Create Your First Workflow

Create a new workflow in the `workflows/` directory:

```markdown
# workflows/example_task.md

## Objective
What this workflow accomplishes

## Required Inputs
- Input 1: Description
- Input 2: Description

## Tools Used
- `tools/script_name.py`

## Process
1. Step 1
2. Step 2
3. Step 3

## Expected Output
What gets produced

## Edge Cases
- Case 1: How to handle
- Case 2: How to handle
```

### 4. Create Corresponding Tools

Build Python scripts in the `tools/` directory:

```python
# tools/example_tool.py
import os
from dotenv import load_dotenv

load_dotenv()

def main():
    # Your implementation here
    pass

if __name__ == "__main__":
    main()
```

## How It Works

1. **Agent reads the workflow** to understand the objective and process
2. **Agent gathers required inputs** from user or previous steps
3. **Agent executes tools** in the correct sequence
4. **Agent handles failures** gracefully and adapts
5. **Agent updates workflows** with learnings for future improvement

## Core Principles

- **Local files are temporary** - Final deliverables go to cloud services
- **Tools are deterministic** - No AI decision-making in execution scripts
- **Workflows evolve** - Update them as you learn better approaches
- **Fail forward** - Every error is a chance to improve the system

## Self-Improvement Loop

When something fails:
1. Identify what broke
2. Fix the tool
3. Verify the fix works
4. Update the workflow
5. Move forward with a more robust system

## Best Practices

- Check `tools/` before building new scripts
- Store all secrets in `.env`
- Keep workflows current and accurate
- Document edge cases and solutions
- Test tools before using in production workflows

## Learn More

Read [CLAUDE.md](CLAUDE.md) for detailed agent instructions and operational guidelines.
