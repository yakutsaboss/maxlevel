# Tools Directory

Python scripts for deterministic execution (WAT Framework - Tools Layer).

## RPG Bot Tools
Used by `bot/` via `pythonTools.ts` subprocess calls.

| Tool | Purpose |
|------|---------|
| `db_operations.py` | Database connection pooling & query helpers (shared by all RPG tools) |
| `user_manager.py` | User CRUD, stats, XP, timezone |
| `mode_manager.py` | Mode selection & management |
| `quest_manager.py` | Quest assignment & completion |
| `achievement_manager.py` | Achievement tracking & unlocking |

## Notification Bot
Independent from RPG bot. No shared imports except `.env`.

| Tool | Purpose |
|------|---------|
| `notification_bot_handler.py` | Telegram polling bot (`/status`, `/help` commands) |
| `send_notification.py` | Direct Telegram API calls for session notifications |
| `project_status_tracker.py` | Analyzes project files to estimate completion % |

## Infrastructure

| Tool | Purpose |
|------|---------|
| `timeweb_cloud_manager.py` | Timeweb VDS server management |
| `test_database.py` | Database connection health check |
