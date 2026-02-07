#!/bin/bash
# Start Wibecode Notification Bot
# This bot handles /status commands and project tracking

echo ""
echo "========================================"
echo "  Wibecode Notification Bot Launcher"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "[ERROR] .env file not found!"
    echo "Please create .env with TELEGRAM_NOTIFICATION_BOT_TOKEN and TELEGRAM_NOTIFICATION_CHAT_ID"
    exit 1
fi

# Check if python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 not found!"
    echo "Please install Python 3.8+"
    exit 1
fi

echo "[INFO] Checking dependencies..."
python3 -c "import telegram" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[WARN] python-telegram-bot not found. Installing dependencies..."
    pip3 install -r requirements.txt
fi

echo "[INFO] Starting notification bot..."
echo ""
echo "Available commands:"
echo "  /start  - Get welcome message"
echo "  /help   - Show help"
echo "  /status - Get project status"
echo ""
echo "Press Ctrl+C to stop the bot"
echo "========================================"
echo ""

# Start the bot
python3 tools/notification_bot_handler.py
