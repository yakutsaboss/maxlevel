# Quest Management Workflow

## Objective
Manage quests for users in the Telegram RPG Quest Bot - assign, complete, track progress, and manage quest lifecycle.

## Required Inputs
- User ID
- Quest template ID (for assignments)
- Quest ID (for completion/progress updates)
- Progress value (for progress updates)

## Tools Used
- `tools/quest_manager.py` - Quest operations
- `tools/user_manager.py` - Award XP for completions
- `tools/db_operations.py` - Direct database queries if needed

## Process

### 1. Assign Daily Quests to User

**When:** Daily at midnight or when user requests new quests

**Command:**
```bash
python tools/quest_manager.py --assign-daily --user-id 1 --count 3
```

**What happens:**
1. Gets user's active modes (fitness, hydration, etc.)
2. Randomly selects 3 daily quest templates from those modes
3. Creates active quest entries for the user
4. Sets due date to tomorrow

**Example output:**
```json
{
  "success": true,
  "quests": [
    {
      "id": 1,
      "name": "Morning Workout",
      "status": "active",
      "progress": 0,
      "target": 1,
      "due_date": "2026-02-08"
    }
  ],
  "count": 3
}
```

### 2. Assign Weekly Quests to User

**When:** Weekly (e.g., every Monday) or when user completes all weekly quests

**Command:**
```bash
python tools/quest_manager.py --assign-weekly --user-id 1 --count 2
```

**What happens:**
1. Gets user's active modes
2. Selects 2 weekly quest templates
3. Sets due date to 7 days from now

### 3. Assign Specific Quest

**When:** Manual assignment or special events

**Command:**
```bash
python tools/quest_manager.py --assign-quest --user-id 1 --template-id 5
```

**What happens:**
1. Looks up quest template
2. Checks if already assigned
3. Creates active quest for user

### 4. Get User's Active Quests

**When:** User opens Mini App or checks /quests

**Command:**
```bash
python tools/quest_manager.py --get-active --user-id 1
```

**Returns:**
- List of all active quests
- Progress percentage
- Due dates
- XP rewards
- Mode information

### 5. Update Quest Progress

**When:** User reports progress (e.g., "I drank 2 liters")

**Command:**
```bash
python tools/quest_manager.py --update-progress --quest-id 1 --progress 2
```

**What happens:**
1. Validates quest exists and is active
2. Updates progress value
3. Calculates completion percentage
4. Returns updated progress

**Example:**
```json
{
  "success": true,
  "quest_id": 1,
  "progress": 2,
  "target": 3,
  "percentage": 66.67
}
```

### 6. Complete a Quest

**When:** User completes a quest (progress reaches target or user confirms)

**Command:**
```bash
python tools/quest_manager.py --complete-quest --quest-id 1
```

**What happens:**
1. Marks quest as completed
2. Sets completed_date
3. Returns XP reward amount
4. **Follow-up:** Award XP to user
5. **Follow-up:** Check for achievement unlocks

**Full workflow:**
```bash
# 1. Complete the quest
python tools/quest_manager.py --complete-quest --quest-id 1

# Response includes user_id and xp_reward
# 2. Award XP to user
python tools/user_manager.py --add-xp --user-id 1 --xp 50

# 3. Check for new achievements
python tools/achievement_manager.py --check-unlock --user-id 1
```

### 7. Get Completed Quests

**When:** User views quest history

**Command:**
```bash
python tools/quest_manager.py --get-completed --user-id 1 --limit 20
```

**Returns:**
- Recent completed quests
- Completion dates
- XP earned
- Mode tags

### 8. Get Quest Statistics

**When:** Displaying user profile or dashboard

**Command:**
```bash
python tools/quest_manager.py --get-stats --user-id 1
```

**Returns:**
```json
{
  "success": true,
  "stats": {
    "total_completed": 45,
    "active_quests": 5,
    "daily_completed": 30,
    "weekly_completed": 15
  }
}
```

## Quest Lifecycle

```
┌─────────────┐
│  Template   │ (Quest template in database)
└──────┬──────┘
       │ Assign to user
       ▼
┌─────────────┐
│   Active    │ (User can work on it)
│ progress: 0 │
└──────┬──────┘
       │ Update progress
       ▼
┌─────────────┐
│ In Progress │
│ progress: X │
└──────┬──────┘
       │ Complete
       ▼
┌─────────────┐
│  Completed  │ (Earns XP, triggers achievements)
│ progress: T │
└─────────────┘
```

## Quest Assignment Rules

### Daily Quests
- **Frequency:** Assign at midnight or on first login of the day
- **Count:** 3 quests
- **Duration:** 24 hours
- **Selection:** Random from user's active modes
- **Difficulty:** Mix of easy/medium

### Weekly Quests
- **Frequency:** Assign on Monday or when all completed
- **Count:** 2 quests
- **Duration:** 7 days
- **Selection:** Random from user's active modes
- **Difficulty:** Medium/hard

### Special Quests
- **Frequency:** Manual or event-triggered
- **Count:** Variable
- **Duration:** Custom
- **Selection:** Specific template ID

## Integration with API

The REST API uses these tools via Python execution:

**Complete quest via API:**
```
POST /api/quests/1/complete
```

**Behind the scenes:**
1. API calls `quest_manager.py --complete-quest --quest-id 1`
2. Gets result with XP reward
3. API calls `user_manager.py --add-xp`
4. API calls `achievement_manager.py --check-unlock`
5. Returns combined response

## Edge Cases

### Quest Already Assigned
- **Scenario:** User tries to get new daily quests but already has them
- **Handling:** `--assign-daily` checks for existing active quests of same template
- **Result:** Skip if already assigned

### Quest Expired
- **Scenario:** User didn't complete quest before due_date
- **Handling:** Mark as 'expired' or keep as active (configurable)
- **Implementation:** Add scheduled task to update expired quests

### Progress Exceeds Target
- **Scenario:** User reports progress > target_value
- **Handling:** Clamp to target_value, mark as completed
- **Implementation:** Add validation in `update_progress`

### No Available Quest Templates
- **Scenario:** User has no active modes or all quests already assigned
- **Handling:** Return error message
- **User action:** Activate more modes or complete existing quests

## Common Operations

### Check if user needs new quests
```bash
# Get active quest count
python tools/quest_manager.py --get-active --user-id 1 | jq '.count'

# If count < 3 for daily, assign more
if [ $count -lt 3 ]; then
  python tools/quest_manager.py --assign-daily --user-id 1
fi
```

### Daily quest refresh (cron job)
```bash
#!/bin/bash
# Run at midnight: 0 0 * * *

# For all users, assign daily quests
python tools/db_operations.py --query "SELECT id FROM users" | \
while read user_id; do
  python tools/quest_manager.py --assign-daily --user-id $user_id --count 3
done
```

### Award XP and check achievements after quest completion
```bash
# Complete quest and get result
RESULT=$(python tools/quest_manager.py --complete-quest --quest-id 1)

# Extract user_id and xp_reward
USER_ID=$(echo $RESULT | jq -r '.user_id')
XP=$(echo $RESULT | jq -r '.xp_reward')

# Award XP
python tools/user_manager.py --add-xp --user-id $USER_ID --xp $XP

# Check achievements
python tools/achievement_manager.py --check-unlock --user-id $USER_ID
```

## Testing

### Test quest assignment
```bash
# 1. Create test user
python tools/user_manager.py --create-user --telegram-id 999 --first-name "Test"

# 2. Add modes
python tools/mode_manager.py --add-modes --user-id 1 --modes "fitness,hydration"

# 3. Assign daily quests
python tools/quest_manager.py --assign-daily --user-id 1 --count 3

# 4. Verify
python tools/quest_manager.py --get-active --user-id 1
```

### Test quest completion flow
```bash
# 1. Get first active quest ID
QUEST_ID=$(python tools/quest_manager.py --get-active --user-id 1 | jq -r '.quests[0].id')

# 2. Update progress
python tools/quest_manager.py --update-progress --quest-id $QUEST_ID --progress 1

# 3. Complete quest
python tools/quest_manager.py --complete-quest --quest-id $QUEST_ID

# 4. Verify completion
python tools/quest_manager.py --get-completed --user-id 1
```

## Best Practices

1. **Always assign quests in batches** - Don't assign one at a time
2. **Check for duplicates** - Tool handles this, but be aware
3. **Award XP immediately after completion** - Don't delay
4. **Check achievements after XP award** - User expects instant feedback
5. **Use transactions** - Quest completion + XP award should be atomic
6. **Log quest events** - Track assignments, completions for analytics

## Troubleshooting

### "No available quest templates"
- Check user has active modes: `python tools/mode_manager.py --get-active-modes --user-id 1`
- Verify quest templates exist for those modes in database
- Check if all quests already assigned

### "Quest already assigned"
- This is expected behavior
- User should complete existing quests first
- Or wait for new day to get fresh daily quests

### "Quest not found"
- Verify quest_id is correct
- Check quest belongs to this user
- Quest might have been deleted

### Quest not completing properly
- Check database constraints
- Verify user_stats table exists and has triggers
- Check for database connection issues

## Future Enhancements

1. **Quest chains** - Complete quest A to unlock quest B
2. **Quest rewards** - Items, coins, not just XP
3. **Quest difficulty scaling** - Based on user level
4. **Quest categories** - Group by theme (cardio, strength, etc.)
5. **Quest multipliers** - Bonus XP for streaks
6. **Quest sharing** - Multiplayer/social quests
7. **Quest scheduling** - Time-of-day requirements
8. **Quest progression** - Track partial completions over time

---

**Related Workflows:**
- [achievement_management.md](achievement_management.md) - Achievement unlocking
- [user_management.md](user_management.md) - XP and leveling
- [mode_management.md](mode_management.md) - Mode activation

**Related Tools:**
- [tools/quest_manager.py](../tools/quest_manager.py)
- [tools/achievement_manager.py](../tools/achievement_manager.py)
- [tools/user_manager.py](../tools/user_manager.py)
