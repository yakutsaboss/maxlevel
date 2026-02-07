# Telegram RPG Quest Bot - Setup Guide

## Phase 1: Foundation - Setup and Testing

This guide will help you set up the project for Phase 1 development and testing.

---

## Prerequisites

### Required Software

1. **PostgreSQL** (v12 or higher)
   - Download: https://www.postgresql.org/download/
   - Make sure `psql` command is available in your PATH

2. **Python** (v3.9 or higher)
   - Download: https://www.python.org/downloads/
   - Verify: `python --version` or `python3 --version`

3. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

4. **npm** (comes with Node.js)
   - Verify: `npm --version`

### Optional Tools

- **Git** (for version control)
- **VS Code** or your preferred IDE
- **Postman** or **curl** (for API testing in later phases)

---

## Step 1: Create Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow the prompts:
   - Choose a name for your bot (e.g., "My RPG Quest Bot")
   - Choose a username (must end with `bot`, e.g., "my_rpg_quest_bot")
4. **Save the bot token** - you'll need it in Step 3

**Official Guide:** https://core.telegram.org/bots/tutorial

---

## Step 2: Set Up PostgreSQL Database

### Create Database

#### Option A: Using GUI (pgAdmin)
1. Open pgAdmin
2. Right-click "Databases" → Create → Database
3. Name: `telegram_rpg` (or your preferred name)
4. Click "Save"

#### Option B: Using Command Line
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE telegram_rpg;

# Exit
\q
```

### Note Your Connection Details

You'll need:
- **Host**: Usually `localhost` (or `127.0.0.1`)
- **Port**: Usually `5432`
- **Username**: Your PostgreSQL username (default: `postgres`)
- **Password**: Your PostgreSQL password
- **Database**: `telegram_rpg` (or whatever you named it)

---

## Step 3: Configure Environment Variables

### Create `.env` File

In the project root directory (`Wibecode/`), create a `.env` file:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/telegram_rpg

# Python
PYTHON_EXECUTABLE=python
# On some systems, you may need: PYTHON_EXECUTABLE=python3

# Optional: OpenAI (for future use)
# OPENAI_API_KEY=your_openai_key_here
```

**Example:**
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/telegram_rpg
PYTHON_EXECUTABLE=python
```

⚠️ **Important:** Never commit `.env` to version control! It's already in `.gitignore`.

---

## Step 4: Install Python Dependencies

```bash
# Navigate to project root
cd c:\Users\Asus\Desktop\Wibecode

# Install Python dependencies
pip install -r requirements.txt

# Or if you use pip3
pip3 install -r requirements.txt
```

---

## Step 5: Initialize Database

### Windows Users

```batch
# Run the setup script
scripts\setup_db.bat
```

### Linux/Mac Users (or Git Bash on Windows)

```bash
# Make script executable
chmod +x scripts/setup_db.sh

# Run the setup script
./scripts/setup_db.sh
```

**Expected Output:**
```
==========================================
Database Setup for Telegram RPG Quest Bot
==========================================

[OK] PostgreSQL is accessible
[OK] Schema files found
[OK] Schema created successfully
[OK] Seed data inserted successfully
[OK] Verifying setup...

  Tables created: 15
  Modes: 2
  Achievements: 13
  Quest templates: 6

==========================================
[SUCCESS] Database setup completed!
==========================================
```

---

## Step 6: Test Python Tools

### Test Database Connection

```bash
python tools/db_operations.py --test-connection
```

**Expected Output:**
```
Testing database connection...
✓ Connection successful
PostgreSQL version: PostgreSQL 15.x ...
Tables in database: 15
```

### Test User Manager

```bash
# Create a test user
python tools/user_manager.py --create-user --telegram-id 123456 --first-name "Test User"

# Get user information
python tools/user_manager.py --get-user --telegram-id 123456

# Get user stats
python tools/user_manager.py --get-stats --user-id 1
```

### Test Mode Manager

```bash
# List all modes
python tools/mode_manager.py --list-modes

# Add modes to user
python tools/mode_manager.py --add-modes --user-id 1 --modes "fitness,hydration"

# Get user's active modes
python tools/mode_manager.py --get-active-modes --user-id 1

# Get mode summary
python tools/mode_manager.py --get-mode-summary --user-id 1
```

---

## Step 7: Install Node.js Dependencies

```bash
# Navigate to bot directory
cd bot

# Install dependencies
npm install

# This will install:
# - grammy (Telegram bot framework)
# - TypeScript
# - tsx (TypeScript executor)
# - Other dev dependencies
```

---

## Step 8: Configure Bot Environment

```bash
# In the bot/ directory, create .env.bot file
# You can copy from the example:
cp .env.example .env.bot

# Edit .env.bot and add your bot token
```

**bot/.env.bot:**
```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
PYTHON_TOOLS_PATH=../tools
PYTHON_EXECUTABLE=python
NODE_ENV=development
LOG_LEVEL=info
```

---

## Step 9: Start the Bot

```bash
# Make sure you're in the bot/ directory
cd bot

# Start in development mode (with hot reload)
npm run dev
```

**Expected Output:**
```
==================================================
🤖 Telegram RPG Quest Bot - Phase 1
==================================================

📊 Testing database connection...
✅ Database connection successful
   PostgreSQL version: PostgreSQL 15.x ...

🚀 Starting bot...
✅ Bot started successfully!
   Bot username: @your_bot_name_bot
   Bot ID: 123456789

📡 Listening for updates...
```

---

## Step 10: Test the Bot

### In Telegram App

1. Open Telegram
2. Search for your bot (e.g., `@my_rpg_quest_bot`)
3. Click "Start" or send `/start` command

**Expected Bot Response:**
```
🎉 Welcome, [Your Name]!

I'm your RPG Quest companion. Together, we'll turn your real-life goals into epic quests!

**How it works:**
🏋️ Choose your modes (Fitness, Hydration, and more)
⚔️ Complete daily and weekly quests
💎 Earn XP and level up
🏆 Unlock achievements
🔥 Build streaks and maintain momentum

Your account has been created!
⭐ Level: 1
💎 XP: 0

Let's get started! Use /menu to begin your journey.
```

### Test Other Commands

- `/menu` - Show available commands
- `/help` - Show help information
- `/ping` - Check bot status (tests database connection)

---

## Troubleshooting

### Database Connection Issues

**Error:** `psycopg2.OperationalError: could not connect to server`

**Solutions:**
1. Check PostgreSQL is running:
   ```bash
   # Windows: Check Services, or run:
   pg_ctl status

   # Linux/Mac:
   systemctl status postgresql
   ```

2. Verify DATABASE_URL in `.env`:
   - Correct username/password
   - Correct host (usually `localhost`)
   - Correct port (usually `5432`)
   - Database name exists

3. Test connection manually:
   ```bash
   psql -h localhost -U postgres -d telegram_rpg
   ```

### Python Tool Issues

**Error:** `ModuleNotFoundError: No module named 'psycopg2'`

**Solution:**
```bash
pip install -r requirements.txt
```

**Error:** `python: command not found`

**Solution:**
- Try `python3` instead
- Update PYTHON_EXECUTABLE in `.env`:
  ```env
  PYTHON_EXECUTABLE=python3
  ```

### Bot Token Issues

**Error:** `Invalid bot token`

**Solution:**
1. Check TELEGRAM_BOT_TOKEN in `.env` and `bot/.env.bot`
2. Make sure there are no extra spaces or quotes
3. Get a new token from @BotFather if needed:
   ```
   /token
   @your_bot_username_bot
   ```

### Bot Not Responding

**Possible Issues:**
1. Bot not started: Run `npm run dev` in `bot/` directory
2. Wrong bot username: Make sure you're messaging the correct bot
3. Check bot logs for errors

### Port Already in Use

**Error:** `address already in use`

**Solution:**
```bash
# Find and kill the process using the port
# Windows:
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Linux/Mac:
lsof -i :3000
kill -9 <pid>
```

---

## Verification Checklist

✅ **Database**
- [ ] PostgreSQL installed and running
- [ ] Database `telegram_rpg` created
- [ ] Schema loaded (15 tables)
- [ ] Seed data inserted (2 modes, 13 achievements, 6 quest templates)

✅ **Python Tools**
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] `db_operations.py --test-connection` succeeds
- [ ] Can create user with `user_manager.py`
- [ ] Can list modes with `mode_manager.py`

✅ **Bot**
- [ ] Node.js dependencies installed (`npm install`)
- [ ] Bot token configured in `.env.bot`
- [ ] Bot starts without errors (`npm run dev`)
- [ ] Bot responds to `/start` in Telegram
- [ ] User account created in database

---

## Next Steps

🎉 **Congratulations!** Phase 1 is complete.

You now have:
- ✅ PostgreSQL database with complete schema
- ✅ Python tools for database operations (WAT framework)
- ✅ Telegram bot with basic commands
- ✅ User registration and profile management

**Phase 2 Preview:**
Next, we'll implement the onboarding flow:
- Mode selection (Fitness + Hydration)
- Interactive quizzes for each mode
- Pain points questionnaire
- Rule-based plan generation
- Resume capability for interrupted onboarding

Stay tuned! 🚀

---

## Useful Commands Reference

### Database
```bash
# Test connection
python tools/db_operations.py --test-connection

# Query database
python tools/db_operations.py --query "SELECT * FROM users"
```

### User Management
```bash
# Create user
python tools/user_manager.py --create-user --telegram-id 123 --first-name "John"

# Get user stats
python tools/user_manager.py --get-stats --user-id 1

# List all users
python tools/user_manager.py --list-users
```

### Mode Management
```bash
# List modes
python tools/mode_manager.py --list-modes

# Add modes
python tools/mode_manager.py --add-modes --user-id 1 --modes "fitness,hydration"

# Get summary
python tools/mode_manager.py --get-mode-summary --user-id 1
```

### Bot
```bash
# Development (hot reload)
npm run dev

# Build TypeScript
npm run build

# Production
npm start
```

---

## Support

For issues or questions:
1. Check this setup guide
2. Review the plan file: `.claude/plans/groovy-skipping-lantern.md`
3. Check logs for error messages
4. Consult Telegram Bot API docs: https://core.telegram.org/bots/api

---

**Happy coding! 🎮✨**
