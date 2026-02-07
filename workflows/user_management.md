# User Management Workflow

## Objective
Manage user lifecycle: create, retrieve, update, deactivate, and delete users. Handle user profiles, statistics, and timezone settings for the Telegram RPG Quest Bot.

## Required Inputs
- **User Identifier**: Either `telegram_id` (from Telegram) or `user_id` (internal database ID)
- **Operation Type**: What action to perform (create, get, update, delete, etc.)
- **Operation-Specific Data**: Depends on the operation (name, timezone, profile fields, etc.)

## Tools Used
- `tools/user_manager.py`
- `tools/db_operations.py` (used internally)

## Process

### 1. Create New User
When a user starts the bot for the first time:

```bash
python tools/user_manager.py --create-user \
    --telegram-id 123456789 \
    --username "john_doe" \
    --first-name "John" \
    --timezone "America/New_York"
```

**When to use:**
- User sends `/start` command to bot
- First-time user registration
- Onboarding flow initiation

**Notes:**
- If user already exists, returns existing user data (idempotent)
- Creates user with level 1 and 0 XP by default
- Timezone defaults to UTC if not specified

### 2. Get User Information

**By Telegram ID (most common):**
```bash
python tools/user_manager.py --get-user --telegram-id 123456789
```

**By Internal User ID:**
```bash
python tools/user_manager.py --get-user --user-id 1
```

**When to use:**
- Verifying user exists before operations
- Looking up user details for bot responses
- Debugging user-related issues

### 3. Get User Statistics
Retrieve comprehensive user stats including level, XP, streaks, and quest completion:

```bash
python tools/user_manager.py --get-stats --user-id 1
```

**Output includes:**
- Current level and total XP
- Overall streak (minimum across all active modes)
- Per-mode streak information
- Total quests completed
- Active status

**When to use:**
- Displaying user profile in bot
- Leaderboard calculations
- Progress tracking
- Analytics and reporting

### 4. Update User Profile

**Update Timezone:**
```bash
python tools/user_manager.py --update-timezone \
    --user-id 1 \
    --timezone "Europe/London"
```

**Update Multiple Fields:**
```bash
python tools/user_manager.py --update-profile \
    --user-id 1 \
    --fields '{"username": "new_username", "first_name": "Jane"}'
```

**When to use:**
- User changes settings
- Timezone detection/adjustment
- Profile updates from Telegram API changes
- Admin corrections

**Available Fields:**
- `username` - Telegram username
- `first_name` - User's first name
- `timezone` - User's timezone (affects quest scheduling)
- `is_active` - Active status (use deactivate_user instead)

### 5. Deactivate User (Soft Delete)
Preserve user data but mark as inactive:

```bash
python tools/user_manager.py --deactivate-user --user-id 1
```

**When to use:**
- User stops bot but may return
- Temporary suspension
- Data retention requirements
- GDPR "right to be forgotten" staging

**Notes:**
- User data remains in database
- Can be reactivated later
- Excluded from active user queries
- Preferred over hard delete

### 6. Delete User (Hard Delete)
⚠️ **Warning:** Permanently deletes user and ALL associated data (cascades).

```bash
python tools/user_manager.py --delete-user --user-id 1
```

**Deletes:**
- User profile
- All quest instances
- Streaks
- Achievements
- Mode subscriptions
- Complete history

**When to use:**
- GDPR deletion requests (after data export)
- Test user cleanup
- Confirmed spam/abuse accounts

**Prefer deactivation unless:**
- Legal requirement for deletion
- Explicit user request
- Test data cleanup

### 7. List All Users
Get paginated list of users:

```bash
# List first 100 active users
python tools/user_manager.py --list-users

# List with pagination
python tools/user_manager.py --list-users --limit 50 --offset 100

# Include inactive users
python tools/user_manager.py --list-users --limit 100
```

**When to use:**
- Admin dashboards
- User analytics
- Batch operations
- Export/reporting

## Expected Output

All operations return JSON:

**Create/Get User:**
```json
{
  "id": 1,
  "telegram_id": 123456789,
  "username": "john_doe",
  "first_name": "John",
  "timezone": "America/New_York",
  "current_level": 1,
  "total_xp": 0,
  "is_active": true,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

**Get Stats:**
```json
{
  "user_id": 1,
  "telegram_id": 123456789,
  "username": "john_doe",
  "first_name": "John",
  "current_level": 5,
  "total_xp": 2500,
  "timezone": "America/New_York",
  "overall_streak": 7,
  "mode_streaks": [
    {
      "mode_name": "fitness",
      "display_name": "Fitness",
      "current_streak": 7,
      "longest_streak": 14,
      "last_activity_date": "2024-01-15"
    }
  ],
  "total_quests_completed": 42,
  "is_active": true
}
```

## Python Integration

Primary use case is importing in other tools:

```python
from tools.user_manager import (
    create_user,
    get_user_by_telegram_id,
    get_user_by_id,
    get_user_stats,
    update_user_profile,
    update_timezone,
    deactivate_user,
    delete_user
)

# Create user (idempotent)
user = create_user(
    telegram_id=ctx.from_user.id,
    username=ctx.from_user.username,
    first_name=ctx.from_user.first_name
)

# Get user
user = get_user_by_telegram_id(telegram_id)

# Update profile
updated = update_user_profile(user['id'], timezone="Europe/Paris")

# Get stats for profile display
stats = get_user_stats(user['id'])
```

## Edge Cases

### 1. User Already Exists
**Scenario:** Calling create_user for existing user

**Behavior:** Returns existing user data (idempotent operation)

**Solution:** No error thrown, safe to call repeatedly

### 2. User Not Found
**Scenario:** Operating on non-existent user_id

**Behavior:** Returns `None` or empty result

**Solution:**
- Check return value before proceeding
- Handle gracefully in bot responses
- Log for debugging

```python
user = get_user_by_id(user_id)
if not user:
    return "User not found. Please use /start to register."
```

### 3. Invalid Timezone
**Scenario:** Setting timezone to invalid value

**Behavior:** Stored as-is (no validation in this tool)

**Solution:**
- Validate timezone before calling (use `pytz.all_timezones`)
- Add validation in future update
- Default to UTC on errors

```python
import pytz

if timezone not in pytz.all_timezones:
    timezone = 'UTC'

update_timezone(user_id, timezone)
```

### 4. Telegram ID Collision
**Scenario:** Two users with same Telegram ID (should never happen)

**Prevention:**
- `telegram_id` has UNIQUE constraint in database
- Will raise IntegrityError if duplicate attempted

**Solution:** Catch exception and treat as user exists

### 5. Streak Calculation with No Modes
**Scenario:** User has no active modes, get_user_stats called

**Behavior:** `overall_streak` returns 0, `mode_streaks` is empty list

**This is correct:** User without modes has 0 streak

### 6. Concurrent Updates
**Scenario:** Multiple processes updating same user simultaneously

**Risk:** Lost updates, race conditions

**Solution:**
- User profile updates use transactions
- XP updates should use atomic operations (see progression_calculator)
- For critical operations, use database locks:

```python
from tools.db_operations import transaction

with transaction() as conn:
    with conn.cursor() as cur:
        # Lock user row
        cur.execute("SELECT * FROM users WHERE id = %s FOR UPDATE", (user_id,))
        user = cur.fetchone()

        # Update safely
        cur.execute("UPDATE users SET ... WHERE id = %s", (user_id,))
```

### 7. Deleted User Data References
**Scenario:** User deleted, but other systems reference user_id

**Behavior:** Foreign key constraints will fail

**Solutions:**
- Use soft delete (deactivate) instead
- Ensure CASCADE deletes configured properly
- Check user exists before operations
- Use transactions for multi-table operations

### 8. Large Result Sets
**Scenario:** list_all_users returns thousands of users

**Solutions:**
- Always use pagination (--limit and --offset)
- Default limit is 100 (reasonable)
- For exports, process in batches:

```python
offset = 0
limit = 100
while True:
    users = list_all_users(limit=limit, offset=offset)
    if not users:
        break
    # Process batch
    offset += limit
```

## Performance Considerations

1. **Use Telegram ID for Lookups**: Indexed, faster than username
2. **Cache User Data**: In bot context/session to avoid repeated DB calls
3. **Batch Operations**: For bulk updates, use database batch functions
4. **Stats Query**: Relatively expensive (joins), cache results when possible
5. **List Operations**: Always paginate, don't load all users at once

## Security & Privacy

1. **PII Protection**:
   - First name is PII, handle per GDPR
   - Telegram ID is semi-public but still user data

2. **Deletion Requests**:
   - Export user data before deletion
   - Log deletion requests for compliance
   - Verify requester identity

3. **Access Control**:
   - Only bot should create/update users
   - Admin tools should require authentication
   - Log sensitive operations

4. **Data Retention**:
   - Define policy for inactive users
   - Automated cleanup after N days of inactivity
   - Preserve analytics in anonymized form

## Related Workflows
- `database_operations.md` - Database connection and queries
- `mode_manager.md` - Managing user's active modes
- User onboarding (future workflow)
- XP and progression (future workflow)
- Analytics and reporting (future workflow)

## Common Patterns

### Bot Handler Pattern
```python
from tools.user_manager import create_user, get_user_by_telegram_id

async def handle_start(ctx):
    telegram_id = ctx.from_user.id

    # Create or get user
    user = create_user(
        telegram_id=telegram_id,
        username=ctx.from_user.username,
        first_name=ctx.from_user.first_name
    )

    # Proceed with user data
    await ctx.reply(f"Welcome, {user['first_name']}!")
```

### Stats Display Pattern
```python
from tools.user_manager import get_user_stats

def format_user_profile(user_id):
    stats = get_user_stats(user_id)
    if not stats:
        return "User not found"

    return f"""
🎮 **{stats['first_name']}'s Profile**
⭐ Level: {stats['current_level']}
💎 XP: {stats['total_xp']}
🔥 Streak: {stats['overall_streak']} days
✅ Quests Completed: {stats['total_quests_completed']}
"""
```

## Maintenance

### Regular Tasks
- Monitor user growth rate
- Check for inactive users (deactivation candidates)
- Validate timezone data quality
- Audit deletion logs for compliance

### When to Update This Tool
- Add new profile fields (update update_user_profile)
- Optimize stats query if performance degrades
- Add validation for user input fields
- Implement user data export for GDPR

## Learning Notes
- `create_user` is idempotent (safe to call multiple times)
- Always use `user_id` for internal operations, `telegram_id` for Telegram integration
- Prefer soft delete (deactivate) over hard delete
- Stats query joins multiple tables, cache when possible
- Timezone is critical for quest scheduling, validate carefully
