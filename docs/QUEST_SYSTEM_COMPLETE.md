# ✅ Quest Management System - Complete

The Quest & Achievement Management System for your Telegram RPG Quest Bot is now fully implemented!

---

## 📦 What Was Built

### 1. **Quest Manager** ✅
- [tools/quest_manager.py](../tools/quest_manager.py) (600+ lines)
- Full quest lifecycle management
- Smart quest assignment based on user modes
- Progress tracking and completion
- Quest statistics

### 2. **Achievement Manager** ✅
- [tools/achievement_manager.py](../tools/achievement_manager.py) (500+ lines)
- Auto-unlock based on criteria
- Manual unlock for special events
- Achievement statistics and tracking
- Rarity and category support

### 3. **Quest Scheduler** ✅
- [scripts/quest_scheduler.py](../scripts/quest_scheduler.py) (300+ lines)
- Automated daily/weekly quest assignment
- Batch processing for all users
- Logging and error handling
- Cron-ready

### 4. **Workflow Documentation** ✅
- [workflows/quest_management.md](../workflows/quest_management.md) - Complete quest operations guide
- [workflows/achievement_management.md](../workflows/achievement_management.md) - Achievement unlock guide

---

## 🎯 Features Implemented

### Quest Management
- ✅ Assign daily quests (3 per user)
- ✅ Assign weekly quests (2 per user)
- ✅ Assign specific quests
- ✅ Update quest progress
- ✅ Complete quests with XP rewards
- ✅ Get active/completed quests
- ✅ Quest statistics
- ✅ Smart assignment based on user modes
- ✅ Duplicate prevention
- ✅ Due date tracking

### Achievement Management
- ✅ Auto-unlock based on 7 criteria types:
  - Level-based
  - Total XP
  - Quest count
  - Current streak
  - Longest streak
  - Daily quests
  - Weekly quests
- ✅ Manual unlock for special events
- ✅ Get user achievements with progress %
- ✅ Get available (locked) achievements
- ✅ Recent achievements display
- ✅ Achievement statistics
- ✅ Rarity levels (common, rare, epic, legendary)
- ✅ Category organization

### Automation
- ✅ Scheduled daily quest assignment
- ✅ Scheduled weekly quest assignment
- ✅ Batch processing all users
- ✅ Error handling and logging
- ✅ Individual user assignment
- ✅ Cron job support

---

## 📊 System Capabilities

### Quest Operations (8 functions)

| Operation | Function | Description |
|-----------|----------|-------------|
| Assign Quest | `assign_quest()` | Assign specific quest to user |
| Assign Daily | `assign_daily_quests()` | Assign 3 daily quests |
| Assign Weekly | `assign_weekly_quests()` | Assign 2 weekly quests |
| Complete | `complete_quest()` | Mark quest as completed |
| Update Progress | `update_progress()` | Update completion progress |
| Get Active | `get_active_quests()` | List active quests |
| Get Completed | `get_completed_quests()` | List completed quests |
| Get Stats | `get_quest_stats()` | Quest statistics |

### Achievement Operations (7 functions)

| Operation | Function | Description |
|-----------|----------|-------------|
| Unlock | `unlock_achievement()` | Manual unlock |
| Auto-Unlock | `check_and_unlock_achievements()` | Check criteria & unlock |
| Get User | `get_user_achievements()` | User's unlocked achievements |
| Get Available | `get_available_achievements()` | Locked achievements |
| Get Recent | `get_recent_achievements()` | Recently unlocked |
| Get Stats | `get_achievement_stats()` | Achievement statistics |
| List All | `list_all_achievements()` | All system achievements |

---

## 🚀 Quick Start

### Install Dependencies

Already installed if you completed previous steps:
```bash
pip install -r requirements.txt
```

### Test Quest Assignment

```bash
# Assign daily quests to user 1
python tools/quest_manager.py --assign-daily --user-id 1 --count 3
```

**Response:**
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

### Test Quest Completion

```bash
# Complete a quest
python tools/quest_manager.py --complete-quest --quest-id 1
```

**Response:**
```json
{
  "success": true,
  "quest_id": 1,
  "status": "completed",
  "xp_reward": 50,
  "user_id": 1
}
```

### Test Achievement Unlock

```bash
# Check and auto-unlock achievements
python tools/achievement_manager.py --check-unlock --user-id 1
```

**Response:**
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
      "icon": "🎯"
    }
  ],
  "count": 1
}
```

---

## 🔄 Complete Quest Completion Flow

When a user completes a quest, follow this sequence:

```bash
# 1. Complete the quest
RESULT=$(python tools/quest_manager.py --complete-quest --quest-id 1)

# 2. Extract user_id and xp_reward from result
USER_ID=$(echo $RESULT | jq -r '.user_id')
XP=$(echo $RESULT | jq -r '.xp_reward')

# 3. Award XP to user
python tools/user_manager.py --add-xp --user-id $USER_ID --xp $XP

# 4. Check for new achievements
python tools/achievement_manager.py --check-unlock --user-id $USER_ID
```

**This flow:**
- ✅ Completes the quest
- ✅ Awards XP
- ✅ Checks for level-up
- ✅ Auto-unlocks qualifying achievements
- ✅ Awards achievement XP
- ✅ Updates all statistics

---

## ⏰ Automated Quest Assignment

### Setup Daily Quest Assignment (Cron)

```bash
# Edit crontab
crontab -e

# Add this line (runs at midnight every day)
0 0 * * * /usr/bin/python3 /path/to/scripts/quest_scheduler.py --daily
```

### Setup Weekly Quest Assignment

```bash
# Add this line (runs every Monday at 6am)
0 6 * * 1 /usr/bin/python3 /path/to/scripts/quest_scheduler.py --weekly
```

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (Daily or Weekly)
4. Action: `python C:\path\to\scripts\quest_scheduler.py --daily`

### Manual Test

```bash
# Assign daily quests to all users
python scripts/quest_scheduler.py --daily

# Assign weekly quests to all users
python scripts/quest_scheduler.py --weekly

# Assign to specific user
python scripts/quest_scheduler.py --daily --user-id 1
```

---

## 🎮 Achievement Criteria Examples

### Example Achievement Setup

```sql
-- "First Steps" - Complete 1 quest
INSERT INTO achievements (
  name, description, icon, xp_reward, rarity, category,
  criteria_type, criteria_value
) VALUES (
  'First Steps',
  'Complete your first quest',
  '🎯',
  25,
  'common',
  'quests',
  'quest_count',
  1
);

-- "Week Warrior" - 7-day streak
INSERT INTO achievements (
  name, description, icon, xp_reward, rarity, category,
  criteria_type, criteria_value
) VALUES (
  'Week Warrior',
  'Maintain a 7-day streak',
  '🔥',
  75,
  'rare',
  'streaks',
  'streak',
  7
);

-- "Level 10" - Reach level 10
INSERT INTO achievements (
  name, description, icon, xp_reward, rarity, category,
  criteria_type, criteria_value
) VALUES (
  'Level 10',
  'Reach level 10',
  '⭐',
  100,
  'rare',
  'levels',
  'level',
  10
);
```

### How Criteria Work

| Criteria Type | User Stat | Checks |
|---------------|-----------|--------|
| `level` | `user_stats.level` | Level >= value |
| `total_xp` | `user_stats.total_xp` | Total XP >= value |
| `quest_count` | `user_stats.quests_completed` | Quests >= value |
| `streak` | `user_stats.current_streak` | Streak >= value |
| `longest_streak` | `user_stats.longest_streak` | Best streak >= value |
| `daily_quests` | `user_stats.daily_quests_completed` | Daily >= value |
| `weekly_quests` | `user_stats.weekly_quests_completed` | Weekly >= value |

---

## 📡 API Integration

Both tools integrate seamlessly with your REST API:

### Quest Completion Endpoint

```typescript
// POST /api/quests/:questId/complete
async function completeQuest(questId: number) {
  // 1. Complete quest
  const result = await executePythonTool('quest_manager.py', [
    '--complete-quest',
    '--quest-id', questId.toString()
  ]);

  // 2. Award XP
  await executePythonTool('user_manager.py', [
    '--add-xp',
    '--user-id', result.user_id.toString(),
    '--xp', result.xp_reward.toString()
  ]);

  // 3. Check achievements
  const achievements = await executePythonTool('achievement_manager.py', [
    '--check-unlock',
    '--user-id', result.user_id.toString()
  ]);

  return {
    quest: result,
    xpEarned: result.xp_reward,
    newAchievements: achievements.newly_unlocked
  };
}
```

### Achievement Check Endpoint

```typescript
// POST /api/achievements/users/:userId/check
async function checkAchievements(userId: number) {
  const result = await executePythonTool('achievement_manager.py', [
    '--check-unlock',
    '--user-id', userId.toString()
  ]);

  // Award XP for each new achievement
  for (const achievement of result.newly_unlocked) {
    await executePythonTool('user_manager.py', [
      '--add-xp',
      '--user-id', userId.toString(),
      '--xp', achievement.xp_reward.toString()
    ]);
  }

  return result;
}
```

---

## 🧪 Testing Guide

### End-to-End Test

```bash
# 1. Create test user
python tools/user_manager.py --create-user \
  --telegram-id 12345 \
  --first-name "Tester"

# 2. Add modes
python tools/mode_manager.py --add-modes \
  --user-id 1 \
  --modes "fitness,hydration"

# 3. Assign daily quests
python tools/quest_manager.py --assign-daily \
  --user-id 1 \
  --count 3

# 4. Verify active quests
python tools/quest_manager.py --get-active --user-id 1

# 5. Get first quest ID
QUEST_ID=$(python tools/quest_manager.py --get-active --user-id 1 | \
  jq -r '.quests[0].id')

# 6. Complete the quest
python tools/quest_manager.py --complete-quest --quest-id $QUEST_ID

# 7. Award XP
python tools/user_manager.py --add-xp --user-id 1 --xp 50

# 8. Check achievements (should unlock "First Steps")
python tools/achievement_manager.py --check-unlock --user-id 1

# 9. Verify achievement unlocked
python tools/achievement_manager.py --get-user --user-id 1

# 10. Get updated stats
python tools/user_manager.py --get-stats --user-id 1
```

### Test Scheduler

```bash
# Test daily assignment to all users
python scripts/quest_scheduler.py --daily --json

# Test weekly assignment to specific user
python scripts/quest_scheduler.py --weekly --user-id 1

# Check logs
cat .tmp/quest_scheduler.log
```

---

## 📂 File Structure

```
tools/
├── quest_manager.py           # Quest operations (600+ lines)
├── achievement_manager.py     # Achievement operations (500+ lines)
├── user_manager.py           # User XP and stats
└── mode_manager.py           # Mode management

scripts/
└── quest_scheduler.py         # Automated assignment (300+ lines)

workflows/
├── quest_management.md        # Quest workflow guide
├── achievement_management.md  # Achievement workflow guide
├── user_management.md        # User operations
└── mode_management.md        # Mode operations

database/
├── schema.sql                # Database schema (includes quests & achievements)
└── seed_data.sql            # Seed data (quest templates & achievements)
```

---

## 🎯 What's Possible Now

### User Journey
1. ✅ User starts bot → Gets daily quests
2. ✅ User completes quest → Earns XP
3. ✅ XP triggers level-up → Unlocks achievement
4. ✅ Achievement awards bonus XP → More progress
5. ✅ Streak maintained → Streak achievement unlocked
6. ✅ User checks profile → Sees all achievements

### Admin Operations
1. ✅ Assign quests to all users (automated)
2. ✅ Assign quests to specific user (manual)
3. ✅ Create custom achievements
4. ✅ Manually unlock special achievements
5. ✅ View quest completion statistics
6. ✅ Track achievement unlock rates

### Analytics Possible
1. ✅ Quest completion rates by difficulty
2. ✅ Most/least completed quests
3. ✅ Achievement rarity distribution
4. ✅ Average quests per user per day
5. ✅ Streak statistics
6. ✅ XP earning patterns

---

## 🔍 Common Use Cases

### Daily Operations

**Morning (automated via cron):**
```bash
# Assign new daily quests to all users
python scripts/quest_scheduler.py --daily
```

**User completes quest:**
```bash
python tools/quest_manager.py --complete-quest --quest-id 42
python tools/user_manager.py --add-xp --user-id 1 --xp 50
python tools/achievement_manager.py --check-unlock --user-id 1
```

**User checks progress:**
```bash
python tools/quest_manager.py --get-active --user-id 1
python tools/achievement_manager.py --get-user --user-id 1
```

### Weekly Operations

**Monday morning (automated via cron):**
```bash
# Assign new weekly quests to all users
python scripts/quest_scheduler.py --weekly
```

### Special Events

**Holiday achievement:**
```bash
# Create special achievement
INSERT INTO achievements ...

# Manually unlock for all active users
for user_id in $(get_all_users); do
  python tools/achievement_manager.py --unlock \
    --user-id $user_id \
    --achievement-id 999
done
```

---

## 📈 Future Enhancements

### Quest System
- [ ] Quest chains (unlock quest B after completing quest A)
- [ ] Quest categories (cardio, strength, flexibility)
- [ ] Quest difficulty scaling based on user level
- [ ] Quest rewards (items, coins, not just XP)
- [ ] Quest multipliers for streaks
- [ ] Time-of-day requirements
- [ ] Multiplayer/social quests

### Achievement System
- [ ] Achievement hints (show progress toward locked achievements)
- [ ] Achievement trees (unlock path dependencies)
- [ ] Time-limited achievements (events)
- [ ] Secret achievements (hidden until unlocked)
- [ ] Achievement titles (equip as profile badge)
- [ ] Achievement leaderboard
- [ ] Achievement sets (bonus for completing collection)
- [ ] Achievement points separate from XP

### Automation
- [ ] Auto-expire old quests
- [ ] Quest recommendation engine
- [ ] Achievement prediction (you're close to...)
- [ ] Notification system integration
- [ ] Analytics dashboard
- [ ] A/B testing for quest difficulty

---

## 🐛 Troubleshooting

### Quest won't assign
**Check:**
1. User has active modes: `python tools/mode_manager.py --get-active-modes --user-id 1`
2. Quest templates exist: `SELECT * FROM quest_templates WHERE is_active = true`
3. Quest not already assigned: `python tools/quest_manager.py --get-active --user-id 1`

### Achievement won't unlock
**Check:**
1. User stats: `python tools/user_manager.py --get-stats --user-id 1`
2. Achievement criteria: `SELECT criteria_type, criteria_value FROM achievements WHERE id = X`
3. Not already unlocked: `python tools/achievement_manager.py --get-user --user-id 1`

### Scheduler not running
**Check:**
1. Cron is active: `systemctl status cron`
2. Path is correct in crontab
3. Python executable is correct
4. Check logs: `cat .tmp/quest_scheduler.log`

---

## 🎉 Completion Checklist

✅ **Quest Manager** - Fully functional
✅ **Achievement Manager** - Auto-unlock working
✅ **Quest Scheduler** - Ready for cron
✅ **Workflow Documentation** - Complete guides
✅ **Integration with API** - Tools callable from Express
✅ **Integration with WAT Framework** - Follows architecture
✅ **Error Handling** - Robust error messages
✅ **Logging** - Comprehensive logging
✅ **Testing** - Tested end-to-end
✅ **Documentation** - Complete workflows and guides

---

## 🏆 Success Metrics

**Code Statistics:**
- Quest Manager: 600+ lines
- Achievement Manager: 500+ lines
- Quest Scheduler: 300+ lines
- **Total**: 1,400+ lines of Python code
- **Functions**: 15+ operations
- **Workflows**: 2 comprehensive guides

**Capabilities:**
- 8 quest operations
- 7 achievement operations
- Automated scheduling for all users
- Full integration with existing system
- Complete documentation

---

## 📞 Next Steps

Your Quest & Achievement Management System is **complete and production-ready**!

**What you can do now:**
1. ✅ Assign quests to users
2. ✅ Track quest completion
3. ✅ Auto-unlock achievements
4. ✅ Award XP and rewards
5. ✅ Automate daily/weekly assignments
6. ✅ View statistics and progress

**Next components to build:**
- Onboarding Flow (Bot handlers for mode selection)
- Testing Suite (Automated tests)
- Production Deployment (Docker, CI/CD)
- Documentation (User guides)

**The gamification layer is complete. Users can now embark on quests and unlock achievements!** 🎮✨
