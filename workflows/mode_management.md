# Mode Management Workflow

## Objective
Manage user mode subscriptions: view available modes, enable/disable modes for users, track mode status, and provide mode summaries. Modes represent different goal categories (Fitness, Hydration, etc.) that users can subscribe to.

## Required Inputs
- **User ID**: Internal user ID for mode operations
- **Mode Identifier**: Mode name (e.g., "fitness", "hydration") or mode ID
- **Operation Type**: What action to perform (list, add, remove, toggle, check)
- **Mode Status**: Active/inactive status when toggling

## Tools Used
- `tools/mode_manager.py`
- `tools/db_operations.py` (used internally)

## Process

### 1. List All Available Modes
View all modes defined in the system:

```bash
python tools/mode_manager.py --list-modes
```

**Output:**
```json
[
  {
    "id": 1,
    "name": "fitness",
    "display_name": "Fitness",
    "description": "Track workouts, exercises, and physical activity",
    "icon_emoji": "🏋️"
  },
  {
    "id": 2,
    "name": "hydration",
    "display_name": "Hydration",
    "description": "Stay hydrated by tracking daily water intake",
    "icon_emoji": "💧"
  }
]
```

**When to use:**
- Building mode selection UI in bot
- Admin review of available modes
- Debugging mode-related issues
- Documentation

### 2. Get User's Active Modes
View modes currently enabled for a specific user:

```bash
# Get only active modes
python tools/mode_manager.py --get-active-modes --user-id 1

# Include inactive modes
python tools/mode_manager.py --get-active-modes --user-id 1 --include-inactive
```

**Output:**
```json
[
  {
    "mode_id": 1,
    "name": "fitness",
    "display_name": "Fitness",
    "description": "Track workouts...",
    "icon_emoji": "🏋️",
    "user_mode_id": 5,
    "enabled_at": "2024-01-15T10:30:00",
    "is_active": true
  }
]
```

**When to use:**
- Displaying user's current modes in profile
- Checking mode prerequisites before quest assignment
- Mode-specific feature access control
- Analytics and reporting

### 3. Get Mode Summary for User
Comprehensive overview of user's mode status:

```bash
python tools/mode_manager.py --get-mode-summary --user-id 1
```

**Output:**
```json
{
  "user_id": 1,
  "total_modes_available": 2,
  "active_mode_count": 1,
  "inactive_mode_count": 0,
  "available_to_add_count": 1,
  "active_modes": [...],
  "inactive_modes": [],
  "available_modes": [...]
}
```

**When to use:**
- Mode selection interface (showing what's available)
- Settings page showing mode status
- Onboarding flow (which modes to add)
- Feature recommendations

### 4. Add Modes to User
Enable one or multiple modes for a user:

**Single mode:**
```python
# In Python code
from tools.mode_manager import add_mode_to_user
result = add_mode_to_user(user_id=1, mode_name="fitness")
```

**Multiple modes (recommended for onboarding):**
```bash
python tools/mode_manager.py --add-modes \
    --user-id 1 \
    --modes "fitness,hydration"
```

**Output:**
```json
{
  "user_id": 1,
  "added": [
    {"mode": "fitness", "user_mode_id": 5},
    {"mode": "hydration", "user_mode_id": 6}
  ],
  "failed": [],
  "already_active": []
}
```

**When to use:**
- User onboarding (selecting initial modes)
- Adding new mode from settings
- Admin operations
- Bulk mode assignment

**Important:** When a mode is added:
- Creates `user_modes` record with `is_active=TRUE`
- Initializes `streaks` record with 0/0 streaks
- If mode was previously disabled, reactivates it

### 5. Remove Mode from User
Disable a mode for a user:

```bash
# Soft delete (recommended): sets is_active=FALSE
python tools/mode_manager.py --remove-mode --user-id 1 --mode "fitness"

# In Python, hard delete option available
from tools.mode_manager import remove_mode_from_user
remove_mode_from_user(user_id=1, mode_name="fitness", soft_delete=False)
```

**When to use:**
- User disables mode in settings
- User wants to simplify active modes
- Mode is no longer relevant for user

**Soft vs Hard Delete:**
- **Soft Delete (default)**: Sets `is_active=FALSE`, preserves history
- **Hard Delete**: Removes record entirely, loses history
- **Recommendation**: Always use soft delete to preserve streak history

### 6. Toggle Mode Status
Explicitly set a mode's active status:

```bash
# Disable mode
python tools/mode_manager.py --toggle-mode \
    --user-id 1 \
    --mode "fitness" \
    --active false

# Enable mode
python tools/mode_manager.py --toggle-mode \
    --user-id 1 \
    --mode "fitness" \
    --active true
```

**When to use:**
- Implementing enable/disable toggle in UI
- Batch operations (activate multiple modes)
- Admin tools

### 7. Check if Mode is Active
Quick boolean check for mode status:

```bash
python tools/mode_manager.py --is-active --user-id 1 --mode "fitness"
```

**Output:**
```json
{
  "mode": "fitness",
  "is_active": true
}
```

**When to use:**
- Access control for mode-specific features
- Conditional quest assignment
- Feature gating
- Quick status checks in bot handlers

## Python Integration

Primary use case is importing in bot code:

```python
from tools.mode_manager import (
    list_all_modes,
    get_user_modes,
    add_mode_to_user,
    add_multiple_modes,
    remove_mode_from_user,
    is_mode_active_for_user,
    get_mode_summary
)

# Onboarding: Add multiple modes
results = add_multiple_modes(user_id=1, mode_names=["fitness", "hydration"])
if results['failed']:
    # Handle failures

# Check mode access
if is_mode_active_for_user(user_id=1, mode_name="fitness"):
    # Show fitness-specific features

# Get active modes for quest assignment
active_modes = get_user_modes(user_id=1, active_only=True)
for mode in active_modes:
    assign_daily_quest(user_id, mode['mode_id'])
```

## Expected Output

All operations return JSON-serializable data:

### Add Modes Result
```json
{
  "user_id": 1,
  "added": [
    {"mode": "fitness", "user_mode_id": 5}
  ],
  "failed": [
    {"mode": "invalid_mode", "reason": "Mode not found"}
  ],
  "already_active": ["hydration"]
}
```

### Mode Summary
```json
{
  "user_id": 1,
  "total_modes_available": 5,
  "active_mode_count": 2,
  "inactive_mode_count": 1,
  "available_to_add_count": 2,
  "active_modes": [...],
  "inactive_modes": [...],
  "available_modes": [...]
}
```

## Edge Cases

### 1. Adding Already Active Mode
**Scenario:** User tries to add a mode they already have

**Behavior:** Returns existing record, no duplicate created

**Result:** Listed in `already_active` array

**This is safe:** Operation is idempotent

### 2. Adding Non-Existent Mode
**Scenario:** Trying to add mode that doesn't exist in `modes` table

**Behavior:** Returns None for single add, listed in `failed` for batch add

**Solution:**
- Validate mode names before calling
- Use `list_all_modes()` to get valid mode names
- Handle failed additions gracefully in UI

```python
all_modes = list_all_modes()
valid_mode_names = [m['name'] for m in all_modes]

if mode_name not in valid_mode_names:
    return "Invalid mode. Available modes: " + ", ".join(valid_mode_names)
```

### 3. Removing Mode Not Assigned to User
**Scenario:** Trying to remove a mode user never had

**Behavior:** Returns `False` (no rows affected)

**Solution:** Check mode exists before attempting removal

### 4. Reactivating Previously Disabled Mode
**Scenario:** User adds mode they previously disabled

**Behavior:**
- Finds existing inactive `user_modes` record
- Sets `is_active=TRUE` and updates `enabled_at`
- Preserves history (user_mode_id stays same)

**This is good:** Streak history is preserved

### 5. Mode Without Streak Record
**Scenario:** `user_modes` exists but no corresponding `streaks` record

**Prevention:** `add_mode_to_user()` automatically creates streak record

**Fix if occurs:**
```python
from tools.db_operations import execute_insert

execute_insert("""
    INSERT INTO streaks (user_id, mode_id, current_streak, longest_streak)
    VALUES (%s, %s, 0, 0)
    ON CONFLICT (user_id, mode_id) DO NOTHING
""", (user_id, mode_id), returning=False)
```

### 6. User with No Active Modes
**Scenario:** User disabled all their modes

**Behavior:**
- `get_user_modes(user_id, active_only=True)` returns empty list
- Quest generation skips this user
- Bot should prompt to enable modes

**Solution:**
```python
active_modes = get_user_modes(user_id, active_only=True)
if not active_modes:
    await ctx.reply(
        "You don't have any active modes! Use /settings to enable modes and start your quests."
    )
```

### 7. Concurrent Mode Additions
**Scenario:** Multiple processes add same mode simultaneously

**Behavior:**
- First addition creates record
- Subsequent additions find existing record
- Race condition possible but harmless (idempotent)

**Database Constraint:** UNIQUE constraint on (user_id, mode_id) prevents duplicates

### 8. Deleting Mode from Database
**Scenario:** Admin deletes a mode from `modes` table

**Impact:**
- Existing `user_modes` records have foreign key to deleted mode
- Depends on CASCADE configuration

**Prevention:**
- Don't delete modes from `modes` table
- Add `is_deprecated` flag instead
- Filter deprecated modes from `list_all_modes()` in UI

## Performance Considerations

1. **Mode Lookup by Name**: Modes table is small (<20 rows), no indexing needed
2. **User Modes Query**: Indexed on `user_id` for fast retrieval
3. **Batch Operations**: `add_multiple_modes()` loops but uses transactions
4. **Mode Summary**: Queries multiple tables but small result sets
5. **Cache Modes**: `list_all_modes()` result can be cached (rarely changes)

## Common Patterns

### Onboarding Flow Pattern
```python
from tools.mode_manager import list_all_modes, add_multiple_modes

# Step 1: Show available modes
modes = list_all_modes()
mode_buttons = [f"{m['icon_emoji']} {m['display_name']}" for m in modes]
# Display to user

# Step 2: User selects modes (e.g., ["fitness", "hydration"])
selected_modes = get_user_selection()

# Step 3: Add all selected modes
results = add_multiple_modes(user_id, selected_modes)

# Step 4: Confirm
if results['added']:
    await ctx.reply(f"✅ Enabled {len(results['added'])} modes!")
if results['failed']:
    await ctx.reply(f"⚠️ Failed to add: {', '.join([f['mode'] for f in results['failed']])}")
```

### Settings Page Pattern
```python
from tools.mode_manager import get_mode_summary, toggle_mode_status

# Get current status
summary = get_mode_summary(user_id)

# Display active modes with toggle buttons
for mode in summary['active_modes']:
    # Show "Disable" button

# Display available modes with "Add" buttons
for mode in summary['available_modes']:
    # Show "Enable" button

# Handle toggle
def handle_toggle(user_id, mode_name, new_status):
    result = toggle_mode_status(user_id, mode_name, new_status)
    if result:
        status_text = "enabled" if new_status else "disabled"
        return f"Mode {mode_name} {status_text}!"
```

### Quest Assignment Pattern
```python
from tools.mode_manager import get_user_modes

# Get active modes for quest assignment
active_modes = get_user_modes(user_id, active_only=True)

for mode in active_modes:
    # Assign daily quests for this mode
    daily_quest = get_random_quest_template(mode['mode_id'], difficulty='daily')
    create_quest_instance(user_id, daily_quest['id'])

# Assign weekly quest (common across modes)
weekly_quest = get_random_quest_template(mode_id=None, difficulty='weekly')
create_quest_instance(user_id, weekly_quest['id'])
```

### Access Control Pattern
```python
from tools.mode_manager import is_mode_active_for_user

@bot.command('fitness_stats')
async def show_fitness_stats(ctx):
    user_id = ctx.user['id']

    if not is_mode_active_for_user(user_id, 'fitness'):
        await ctx.reply("⚠️ You need to enable Fitness mode to use this feature!")
        return

    # Show fitness-specific stats
    stats = get_fitness_stats(user_id)
    await ctx.reply(format_fitness_stats(stats))
```

## Related Workflows
- `user_management.md` - User creation before mode assignment
- `database_operations.md` - Database connection and queries
- Quest generation workflow (future)
- Streak tracking workflow (future)
- Analytics and reporting (future)

## Security & Business Logic

1. **Mode Availability**: Modes are system-defined, not user-created
2. **Validation**: Always validate mode names against `list_all_modes()`
3. **Permissions**: Only user or admin should modify their modes
4. **Rate Limiting**: No rate limiting needed (low-frequency operations)
5. **Audit**: Consider logging mode changes for analytics

## Maintenance

### Regular Tasks
- Monitor mode distribution (which modes are most popular)
- Review inactive mode subscriptions
- Analyze mode addition/removal patterns

### Adding New Modes
When adding a new mode to the system:

```sql
-- Add to modes table
INSERT INTO modes (name, display_name, description, icon_emoji)
VALUES ('sleep', 'Sleep', 'Track sleep quality and duration', '😴');

-- Create quest templates for the mode
-- (handled in quest management workflow)

-- Announce to existing users (optional)
-- (notification workflow)
```

### When to Update This Tool
- Add mode categories/tags
- Add mode prerequisites (e.g., must have fitness before martial_arts)
- Add mode limits (max N modes per user)
- Add mode subscription fees (premium modes)
- Implement mode recommendations based on user profile

## Learning Notes
- Modes are relatively static (rarely change)
- `user_modes` is the join table between users and modes
- Always initialize streaks when adding a mode
- Prefer soft delete to preserve history
- Mode operations are low-frequency (mostly during onboarding/settings)
- Cache `list_all_modes()` result in bot context
- `add_mode_to_user()` and `add_multiple_modes()` are idempotent (safe to retry)
