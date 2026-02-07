# Achievement Management Workflow

## Objective
Manage achievement unlocking, tracking, and rewards for users in the Telegram RPG Quest Bot.

## Required Inputs
- User ID
- Achievement ID (for manual unlocking)

## Tools Used
- `tools/achievement_manager.py` - Achievement operations
- `tools/user_manager.py` - Award XP for unlocks
- `tools/db_operations.py` - Direct queries if needed

## Process

### 1. Check and Auto-Unlock Achievements

**When:** After user completes a quest, gains XP, or updates streak

**Command:**
```bash
python tools/achievement_manager.py --check-unlock --user-id 1
```

**What happens:**
1. Gets user's current stats (level, XP, streaks, quest counts)
2. Gets all locked achievements
3. Checks each achievement's criteria against user stats
4. Automatically unlocks qualifying achievements
5. Returns list of newly unlocked achievements

**Example output:**
```json
{
  "success": true,
  "newly_unlocked": [
    {
      "id": 1,
      "name": "First Steps",
      "description": "Complete your first quest",
      "xp_reward": 25,
      "rarity": "common",
      "icon": "🎯",
      "unlocked_at": "2026-02-07T10:00:00"
    }
  ],
  "count": 1
}
```

### 2. Manual Achievement Unlock

**When:** Special events, admin actions, or rewards

**Command:**
```bash
python tools/achievement_manager.py --unlock --user-id 1 --achievement-id 5
```

**What happens:**
1. Checks if achievement already unlocked
2. Unlocks and sets unlocked_at timestamp
3. Returns achievement details with XP reward

**Follow-up:** Award XP to user
```bash
python tools/user_manager.py --add-xp --user-id 1 --xp 25
```

### 3. Get User's Achievements

**When:** User opens profile or achievements page

**Command:**
```bash
python tools/achievement_manager.py --get-user --user-id 1
```

**Returns:**
```json
{
  "success": true,
  "achievements": [...],
  "unlocked": 5,
  "total": 13,
  "percentage": 38.46
}
```

### 4. Get Available (Locked) Achievements

**When:** User wants to see what they can unlock

**Command:**
```bash
python tools/achievement_manager.py --get-available --user-id 1
```

**Returns:**
- List of achievements not yet unlocked
- Criteria for each (what user needs to do)
- Formatted criteria text (e.g., "Reach level 10")

### 5. Get Recent Achievements

**When:** Dashboard or notification display

**Command:**
```bash
python tools/achievement_manager.py --get-recent --user-id 1 --limit 3
```

**Returns:**
- Last 3 achievements unlocked
- Perfect for "Recent Achievements" section

### 6. Get Achievement Statistics

**When:** Profile page or analytics

**Command:**
```bash
python tools/achievement_manager.py --get-stats --user-id 1
```

**Returns:**
```json
{
  "success": true,
  "stats": {
    "total": 13,
    "unlocked": 5,
    "locked": 8,
    "percentage": 38.46,
    "by_rarity": {
      "common": 3,
      "rare": 2
    },
    "by_category": {
      "quests": 3,
      "streaks": 2
    }
  }
}
```

### 7. List All Achievements

**When:** Admin panel or documentation

**Command:**
```bash
python tools/achievement_manager.py --list-all
```

**Returns:**
- All achievements in system
- Criteria, rewards, rarity
- Active/inactive status

## Achievement Criteria Types

### 1. Level-based
```
criteria_type: 'level'
criteria_value: 5
```
**Meaning:** Reach level 5

**Check:** `user_stats.level >= 5`

### 2. Total XP
```
criteria_type: 'total_xp'
criteria_value: 1000
```
**Meaning:** Earn 1000 total XP

**Check:** `user_stats.total_xp >= 1000`

### 3. Quest Count
```
criteria_type: 'quest_count'
criteria_value: 10
```
**Meaning:** Complete 10 quests total

**Check:** `user_stats.quests_completed >= 10`

### 4. Current Streak
```
criteria_type: 'streak'
criteria_value: 7
```
**Meaning:** Maintain a 7-day streak

**Check:** `user_stats.current_streak >= 7`

### 5. Longest Streak
```
criteria_type: 'longest_streak'
criteria_value: 30
```
**Meaning:** Achieve a 30-day streak (ever)

**Check:** `user_stats.longest_streak >= 30`

### 6. Daily Quests
```
criteria_type: 'daily_quests'
criteria_value: 50
```
**Meaning:** Complete 50 daily quests

**Check:** `user_stats.daily_quests_completed >= 50`

### 7. Weekly Quests
```
criteria_type: 'weekly_quests'
criteria_value: 10
```
**Meaning:** Complete 10 weekly quests

**Check:** `user_stats.weekly_quests_completed >= 10`

## Achievement Flow

```
┌──────────────────┐
│  User completes  │
│  an action       │
│  (quest, XP,etc) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Trigger          │
│ achievement      │
│ check            │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Get user stats   │
│ from database    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Check all locked │
│ achievements     │
│ against criteria │
└────────┬─────────┘
         │
         ▼
    ┌────┴────┐
    │ Qualifies?│
    └─┬─────┬─┘
      No    Yes
      │     │
      │     ▼
      │  ┌──────────────┐
      │  │ Unlock       │
      │  │ achievement  │
      │  └──────┬───────┘
      │         │
      │         ▼
      │  ┌──────────────┐
      │  │ Award XP     │
      │  │ to user      │
      │  └──────┬───────┘
      │         │
      │         ▼
      │  ┌──────────────┐
      │  │ Return       │
      │  │ achievement  │
      │  │ details      │
      │  └──────────────┘
      │
      └────────────────────►
```

## Integration Points

### After Quest Completion
```bash
# 1. Complete quest
RESULT=$(python tools/quest_manager.py --complete-quest --quest-id 1)

# 2. Award XP
USER_ID=$(echo $RESULT | jq -r '.user_id')
XP=$(echo $RESULT | jq -r '.xp_reward')
python tools/user_manager.py --add-xp --user-id $USER_ID --xp $XP

# 3. Check achievements
python tools/achievement_manager.py --check-unlock --user-id $USER_ID
```

### After XP Award
```bash
# Any time XP is awarded
python tools/user_manager.py --add-xp --user-id 1 --xp 50
python tools/achievement_manager.py --check-unlock --user-id 1
```

### After Streak Update
```bash
# Daily streak update
python tools/user_manager.py --update-streak --user-id 1
python tools/achievement_manager.py --check-unlock --user-id 1
```

### Via API
```typescript
// POST /api/quests/1/complete
async function completeQuest(questId: number) {
  // 1. Complete quest (returns XP reward)
  const quest = await questManager.completeQuest(questId);

  // 2. Award XP
  await userManager.addXP(quest.user_id, quest.xp_reward);

  // 3. Check achievements
  const achievements = await achievementManager.checkAndUnlock(quest.user_id);

  // 4. Return combined response
  return {
    quest: quest,
    xpEarned: quest.xp_reward,
    newAchievements: achievements.newly_unlocked
  };
}
```

## Rarity Levels

Achievements have rarity that affects XP rewards:

- **Common** (🟢) - Easy to get, low XP (10-25)
- **Rare** (🔵) - Moderate difficulty, medium XP (50-75)
- **Epic** (🟣) - Hard to get, high XP (100-150)
- **Legendary** (🟠) - Very rare, massive XP (200-500)

## Achievement Categories

Organize achievements by category:

- **quests** - Quest-related (complete X quests)
- **streaks** - Streak-related (maintain X days)
- **levels** - Level milestones (reach level X)
- **xp** - XP milestones (earn X total XP)
- **modes** - Mode-specific achievements
- **social** - Social features (when implemented)
- **special** - Event or unique achievements

## Common Scenarios

### Scenario 1: User Completes First Quest

**Trigger:** Quest completion
**Check:** `quests_completed >= 1`
**Result:** Unlock "First Steps" achievement
**Reward:** +25 XP bonus
**Display:** Show celebration animation in Mini App

### Scenario 2: User Reaches Level 10

**Trigger:** XP award that causes level-up
**Check:** `level >= 10`
**Result:** Unlock "Level 10" achievement
**Reward:** +100 XP bonus
**Display:** Badge on profile

### Scenario 3: User Maintains 7-Day Streak

**Trigger:** Daily streak update
**Check:** `current_streak >= 7`
**Result:** Unlock "Week Warrior" achievement
**Reward:** +75 XP
**Display:** Fire emoji on profile, notification

### Scenario 4: User Earns 1000 Total XP

**Trigger:** Any XP award
**Check:** `total_xp >= 1000`
**Result:** Unlock "XP Master" achievement
**Reward:** +50 XP
**Display:** Trophy icon

## Edge Cases

### Multiple Achievements at Once
**Scenario:** User action qualifies for multiple achievements

**Handling:**
- Check returns array of all newly unlocked
- Award XP for each achievement
- Display all in notification

**Example:**
```bash
# Complete 10th quest (unlocks 2 achievements)
# 1. "Quest Novice" (complete 10 quests)
# 2. "Fitness Fan" (complete 10 fitness quests)

RESULT=$(python tools/achievement_manager.py --check-unlock --user-id 1)
# Returns 2 achievements

# Award XP for both
python tools/user_manager.py --add-xp --user-id 1 --xp 125  # 75 + 50
```

### Achievement Already Unlocked
**Scenario:** Trying to unlock same achievement twice

**Handling:**
- Check for existing unlock first
- Return error if already unlocked
- No duplicate unlocks possible (database constraint)

### Criteria Not Met
**Scenario:** Manual unlock attempted but user doesn't qualify

**Handling:**
- Manual unlock bypasses criteria check
- Use for admin rewards, events
- Document why it was manually unlocked

## Testing

### Test achievement unlock flow
```bash
# 1. Create test user
python tools/user_manager.py --create-user --telegram-id 888 --first-name "Tester"

# 2. Complete a quest to trigger achievement
python tools/quest_manager.py --complete-quest --quest-id 1

# 3. Award XP
python tools/user_manager.py --add-xp --user-id 1 --xp 50

# 4. Check achievements
python tools/achievement_manager.py --check-unlock --user-id 1

# 5. Verify unlock
python tools/achievement_manager.py --get-user --user-id 1
```

### Test specific criteria
```bash
# Set user stats to specific values
python tools/db_operations.py --query "
  UPDATE user_stats
  SET quests_completed = 10,
      total_xp = 500,
      current_streak = 7
  WHERE user_id = 1
"

# Check what achievements unlock
python tools/achievement_manager.py --check-unlock --user-id 1
```

## Best Practices

1. **Always check after major actions** - Quest completion, XP award, streak update
2. **Award XP immediately** - Don't delay achievement rewards
3. **Batch notifications** - Show all new achievements at once
4. **Cache achievement list** - Don't query every time
5. **Log unlocks** - Track when and why achievements unlock
6. **Celebrate unlocks** - Make it feel rewarding (animations, sounds)

## Notification Templates

### Achievement Unlocked
```
🏆 Achievement Unlocked!

**[Name]**
[Description]

+[XP] XP

[Icon] [Rarity]
```

### Multiple Achievements
```
🎉 You unlocked [count] achievements!

[Icon] [Name 1] (+[XP] XP)
[Icon] [Name 2] (+[XP] XP)
[Icon] [Name 3] (+[XP] XP)

Total: +[total_xp] XP
```

## Troubleshooting

### Achievement not unlocking
- Check user stats: `python tools/user_manager.py --get-stats --user-id 1`
- Verify criteria: Compare stats with achievement criteria
- Check if already unlocked: `python tools/achievement_manager.py --get-user --user-id 1`
- Verify achievement is active: `python tools/achievement_manager.py --list-all`

### Duplicate unlock attempt
- Expected behavior - tool prevents duplicates
- Check database for existing `user_achievements` entry
- If stuck, use `--unlock` to manually unlock

### Wrong XP awarded
- Check achievement XP reward in database
- Verify XP was actually added to user
- Check `user_stats.total_xp` after unlock

## Future Enhancements

1. **Achievement hints** - Show progress toward locked achievements
2. **Achievement trees** - Unlock A to access B
3. **Time-limited achievements** - Available only during events
4. **Secret achievements** - Hidden until unlocked
5. **Achievement titles** - Equip achievement as profile title
6. **Achievement leaderboard** - Most achievements unlocked
7. **Achievement points** - Separate from XP
8. **Achievement sets** - Bonus for completing a set

---

**Related Workflows:**
- [quest_management.md](quest_management.md) - Quest completion triggers achievements
- [user_management.md](user_management.md) - XP and stats affect achievements

**Related Tools:**
- [tools/achievement_manager.py](../tools/achievement_manager.py)
- [tools/quest_manager.py](../tools/quest_manager.py)
- [tools/user_manager.py](../tools/user_manager.py)
