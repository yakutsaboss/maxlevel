@echo off
REM Database Setup Script for Telegram RPG Quest Bot (Windows)
REM This script creates the PostgreSQL database and initializes it with schema and seed data

setlocal enabledelayedexpansion

echo ==========================================
echo Database Setup for Telegram RPG Quest Bot
echo ==========================================
echo.

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found
    echo Please create a .env file with DATABASE_URL
    echo Example: DATABASE_URL=postgresql://user:password@localhost:5432/telegram_rpg
    exit /b 1
)

REM Load DATABASE_URL from .env (simple parsing for Windows)
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if "%%a"=="DATABASE_URL" set DATABASE_URL=%%b
)

if "%DATABASE_URL%"=="" (
    echo [ERROR] DATABASE_URL not set in .env
    echo Example: DATABASE_URL=postgresql://user:password@localhost:5432/telegram_rpg
    exit /b 1
)

echo Loaded environment variables from .env
echo.

REM Parse DATABASE_URL (basic parsing for Windows)
REM Format: postgresql://user:password@host:port/dbname
REM For Windows, we'll use psql with connection string directly

echo [INFO] Database connection details loaded from DATABASE_URL
echo.

REM Check if psql is available
where psql >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] PostgreSQL psql command not found in PATH
    echo Please ensure PostgreSQL is installed and psql is in your PATH
    echo Example: C:\Program Files\PostgreSQL\15\bin
    pause
    exit /b 1
)

echo [1/5] Checking PostgreSQL connection...
psql "%DATABASE_URL%" -c "\q" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Cannot connect to PostgreSQL
    echo Please ensure PostgreSQL is running and DATABASE_URL is correct
    pause
    exit /b 1
)
echo [OK] PostgreSQL is accessible
echo.

echo [2/5] Checking database schema files...
if not exist "database\schema.sql" (
    echo [ERROR] database\schema.sql not found
    pause
    exit /b 1
)
if not exist "database\seed_data.sql" (
    echo [ERROR] database\seed_data.sql not found
    pause
    exit /b 1
)
echo [OK] Schema files found
echo.

echo [3/5] Creating database schema...
psql "%DATABASE_URL%" -f "database\schema.sql" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Schema creation completed with warnings
    echo This is normal if database already exists
) else (
    echo [OK] Schema created successfully
)
echo.

echo [4/5] Inserting seed data...
psql "%DATABASE_URL%" -f "database\seed_data.sql" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Seed data insertion completed with warnings
    echo This is normal if data already exists
) else (
    echo [OK] Seed data inserted successfully
)
echo.

echo [5/5] Verifying setup...
REM Count tables
for /f %%i in ('psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"') do set TABLE_COUNT=%%i
for /f %%i in ('psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM modes;"') do set MODE_COUNT=%%i
for /f %%i in ('psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM achievements;"') do set ACHIEVEMENT_COUNT=%%i
for /f %%i in ('psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM quests;"') do set QUEST_COUNT=%%i

echo   Tables created: %TABLE_COUNT%
echo   Modes: %MODE_COUNT%
echo   Achievements: %ACHIEVEMENT_COUNT%
echo   Quest templates: %QUEST_COUNT%
echo.

if %MODE_COUNT% gtr 0 (
    echo ==========================================
    echo [SUCCESS] Database setup completed!
    echo ==========================================
    echo.
    echo Next steps:
    echo   1. Update your .env file with TELEGRAM_BOT_TOKEN
    echo   2. Install Python dependencies: pip install -r requirements.txt
    echo   3. Test Python tools: python tools\user_manager.py --help
    echo   4. Set up Node.js bot: cd bot ^&^& npm install
    echo.
) else (
    echo [WARNING] Database setup completed with warnings
    echo Please check the output above for errors
)

pause
