@echo off
REM Start Wibecode Notification Bot
REM This bot handles /status commands and project tracking

echo.
echo ========================================
echo   Wibecode Notification Bot Launcher
echo ========================================
echo.

REM Check if .env exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo Please create .env with TELEGRAM_NOTIFICATION_BOT_TOKEN and TELEGRAM_NOTIFICATION_CHAT_ID
    pause
    exit /b 1
)

REM Check if python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Please install Python 3.8+ and add to PATH
    pause
    exit /b 1
)

echo [INFO] Checking dependencies...
python -c "import telegram" >nul 2>&1
if errorlevel 1 (
    echo [WARN] python-telegram-bot not found. Installing dependencies...
    pip install -r requirements.txt
)

echo [INFO] Starting notification bot...
echo.
echo Available commands:
echo   /start  - Get welcome message
echo   /help   - Show help
echo   /status - Get project status
echo.
echo Press Ctrl+C to stop the bot
echo ========================================
echo.

REM Start the bot
python tools\notification_bot_handler.py

pause
