# Onboarding Flow Workflow

## Objective
Guide new users through account setup, mode selection, and initial quest assignment to ensure a smooth start with the Telegram RPG Quest Bot.

## Required Inputs
- User's Telegram ID
- User's first name
- User's username (optional)

## Tools Used
- `bot/src/handlers/onboarding.ts` - Onboarding handlers
- `tools/user_manager.py` - User creation
- `tools/mode_manager.py` - Mode selection
- `tools/quest_manager.py` - Initial quest assignment

## Onboarding Process Flow

```
User sends /start
       ↓
Check if user exists
       ↓
   ┌───┴───┐
   │       │
  Yes     No
   │       │
   │       ↓
   │   Create user account
   │       ↓
   │   Start onboarding
   │       ↓
   │   Show mode selection
   │       ↓
   │   User selects modes
   │       ↓
   │   Assign initial quests
   │       ↓
   │   Show quick actions
   │       ↓
   │   Onboarding complete
   │
   ↓
Welcome back message
   ↓
Show status/menu
```

## Step-by-Step Process

### Step 1: User Initiates Contact

**Command:** `/start`

**What happens:**
1. Bot checks if user exists in database
2. If new user → Create account and start onboarding
3. If existing user → Show welcome back message

**New User Flow:**
```
🎮 Welcome to your RPG Quest journey, [Name]!

I'll help you turn your real-life goals into epic quests.

Let's start by setting up your account...
```

### Step 2: Mode Selection

**Display:**
```
📋 Choose Your Modes

Modes are categories of quests you want to focus on.
You can select multiple modes and change them later.

Available Modes:

[💪 Fitness] [💧 Hydration]

✅ Continue
ℹ️ More Info
```

**User Actions:**
- Tap mode buttons to add/remove modes
- Selected modes show checkmark (✓)
- Tap "ℹ️ More Info" to see mode descriptions
- Tap "✅ Continue" when done

**Validation:**
- Must select at least 1 mode before continuing
- If no modes selected, show warning

### Step 3: Mode Information (Optional)

**If user taps "ℹ️ More Info":**
```
ℹ️ Mode Information

💪 Fitness
Build strength, endurance, and healthy habits through exercise

💧 Hydration
Stay hydrated and track your daily water intake

Choose modes that align with your goals. You can change them anytime!
```

### Step 4: Quest Assignment

**After mode selection:**
```
🎯 Assigning Your First Quests...

Based on your selected modes, I'm creating personalized quests for you!

[Processing...]

✨ You're All Set!

I've assigned 3 daily quests to get you started.

What's Next:
• Check your quests: /quests
• View your profile: /profile
• Open the Mini App: /app

Complete quests to earn XP, level up, and unlock achievements! 🏆
```

### Step 5: Quick Actions

**Display quick action buttons:**
```
Choose an action:

[🎮 Open Mini App]
[📋 View Quests] [👤 My Profile]
```

**Button Actions:**
- **Open Mini App** → Opens Mini App in Telegram
- **View Quests** → Shows quick quest overview
- **My Profile** → Shows quick profile stats

### Step 6: Onboarding Complete

User is now set up and can:
- Complete quests
- Earn XP and level up
- Unlock achievements
- Manage modes

## Callback Query Handlers

### Mode Selection Callbacks

| Callback Data | Action | Handler |
|---------------|--------|---------|
| `mode_select_{id}` | Toggle mode selection | `handleModeSelection()` |
| `mode_done` | Complete mode selection | `handleModeSelection()` |
| `mode_info` | Show mode information | `handleModeSelection()` |
| `start_mode_selection` | Start/restart mode selection | Show mode selection screen |
| `mode_summary` | Show mode summary | `handleModeSummary()` |

### Quick Action Callbacks

| Callback Data | Action | Handler |
|---------------|--------|---------|
| `open_app` | Open Mini App | `handleQuickAction()` |
| `view_quests` | Quick quest view | `handleQuickAction()` |
| `view_profile` | Quick profile view | `handleQuickAction()` |

## Commands

### /start
- **For New Users:** Starts onboarding flow
- **For Existing Users:** Shows welcome back message

### /modes
- Show current modes
- Button to add/remove modes
- Show mode summary

**Example:**
```
📋 Your Active Modes

💪 Fitness
💧 Hydration

Want to change your modes?

[➕ Add/Remove Modes]
[📊 Mode Summary]
```

## Quick Views

### Quick Quest Overview

**Command:** Triggered by "View Quests" button

**Display:**
```
📋 Your Active Quests

1. 💪 Morning Workout
   ██████░░░░ 60%
   ⚡ 50 XP

2. 💧 Drink Water
   ███░░░░░░░ 30%
   ⚡ 25 XP

3. 💪 Evening Stretch
   ░░░░░░░░░░ 0%
   ⚡ 30 XP

Use /app to view all quests and track progress!
```

### Quick Profile Overview

**Command:** Triggered by "My Profile" button

**Display:**
```
👤 [Name]'s Profile

⭐ Level: 1
💎 Total XP: 75
🔥 Streak: 0 days
✅ Quests Completed: 2

Use /app to see your full profile with achievements!
```

## Mode Management

### View Current Modes

```
User: /modes

Bot: 📋 Your Active Modes

💪 Fitness
💧 Hydration

Want to change your modes?

[➕ Add/Remove Modes]
[📊 Mode Summary]
```

### Mode Summary

**Shows quest statistics per mode:**
```
📊 Mode Summary

💪 Fitness
   Active: 2 quests
   Completed: 15 quests
   Total XP: 750

💧 Hydration
   Active: 1 quest
   Completed: 20 quests
   Total XP: 500
```

## Edge Cases

### No Modes Selected

**Scenario:** User clicks "✅ Continue" without selecting modes

**Handling:**
```
⚠️ Please select at least one mode!
```

**Action:** Keep on mode selection screen

### User Returns to Onboarding

**Scenario:** User sends `/start` again after completing onboarding

**Handling:** Show welcome back message (don't re-run onboarding)

### Mode Already Selected

**Scenario:** User clicks on an already selected mode

**Handling:** Remove the mode (toggle off)

### All Quests Already Assigned

**Scenario:** User completes onboarding but quests fail to assign

**Handling:**
```
✅ Setup Complete!

Use /quests to view and manage your quests.
Use /app to open the Mini App for the best experience!
```

## Database Operations

### User Creation
```python
python tools/user_manager.py --create-user \
  --telegram-id 123456 \
  --first-name "John"
```

### Add Modes
```python
python tools/mode_manager.py --add-modes \
  --user-id 1 \
  --modes "fitness,hydration"
```

### Remove Mode
```python
python tools/mode_manager.py --remove-mode \
  --user-id 1 \
  --mode-id 1
```

### Assign Daily Quests
```python
python tools/quest_manager.py --assign-daily \
  --user-id 1 \
  --count 3
```

## Testing

### Test Onboarding Flow

```bash
# 1. Clear test user data (if exists)
python tools/db_operations.py --query \
  "DELETE FROM users WHERE telegram_id = 999999"

# 2. Start bot
cd bot && npm run dev

# 3. In Telegram, send /start to bot

# 4. Follow onboarding flow:
#    - Select modes
#    - View mode info (optional)
#    - Continue
#    - Check quest assignment

# 5. Verify user created
python tools/user_manager.py --get-user --telegram-id 999999

# 6. Verify modes added
python tools/mode_manager.py --get-active-modes --user-id 1

# 7. Verify quests assigned
python tools/quest_manager.py --get-active --user-id 1
```

### Test Mode Management

```bash
# Test /modes command
# 1. Send /modes in Telegram
# 2. Click "Add/Remove Modes"
# 3. Toggle modes on/off
# 4. Click "Continue"
# 5. Verify changes in database
```

## User Experience Flow

### Timeline

**0:00** - User sends `/start`
**0:01** - Welcome message appears
**0:03** - Mode selection screen shows
**0:15** - User selects 2 modes
**0:18** - User clicks "Continue"
**0:20** - Quest assignment message
**0:22** - Success message + quick actions
**0:25** - User clicks "View Quests"
**0:26** - Quest overview appears

**Total time: ~30 seconds**

### Key Moments

1. **Welcome** - First impression, friendly tone
2. **Mode Selection** - Clear options, easy selection
3. **Quest Assignment** - Excitement, immediate value
4. **Quick Actions** - Smooth transition to usage

## Best Practices

1. **Keep it Simple** - Don't overwhelm with too many steps
2. **Show Value Quickly** - Assign quests immediately
3. **Provide Guidance** - Clear instructions at each step
4. **Allow Flexibility** - Users can change modes later
5. **Celebrate Success** - Positive reinforcement
6. **Enable Discovery** - Show key features through quick actions

## Troubleshooting

### Mode selection not working
- Check callback query handlers registered
- Verify mode_manager.py is accessible
- Check database has modes in `modes` table

### Quests not assigning
- Verify user has selected modes
- Check quest templates exist for those modes
- Verify quest_manager.py is working
- Check database permissions

### Inline keyboard not showing
- Verify Grammy version supports InlineKeyboard
- Check callback data format
- Verify bot token is correct

## Future Enhancements

1. **Personalization Quiz** - Ask about user's goals
2. **Mode Recommendations** - Suggest modes based on goals
3. **Tutorial Quests** - Special tutorial quest to learn basics
4. **Achievement for Onboarding** - "Getting Started" achievement
5. **Progress Indicators** - Show onboarding progress (Step 1/3)
6. **Skip Option** - Allow advanced users to skip
7. **Video Tutorial** - Link to video explaining features

---

**Related Workflows:**
- [quest_management.md](quest_management.md) - Quest assignment
- [mode_management.md](mode_management.md) - Mode operations
- [user_management.md](user_management.md) - User creation

**Related Files:**
- [bot/src/handlers/onboarding.ts](../bot/src/handlers/onboarding.ts)
- [bot/src/handlers/start.ts](../bot/src/handlers/start.ts)
- [bot/src/index.ts](../bot/src/index.ts)
