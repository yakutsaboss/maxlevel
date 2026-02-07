#!/bin/bash
# Start the Telegram RPG Bot using PM2

set -e

echo "=========================================="
echo "Starting Telegram RPG Bot"
echo "=========================================="

# Navigate to bot directory
cd /opt/telegram-rpg-bot/bot

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Start bot with PM2
echo "🚀 Starting bot with PM2..."
pm2 start npm --name "telegram-rpg-bot" -- run dev

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

echo ""
echo "=========================================="
echo "✅ Bot started successfully!"
echo "=========================================="
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status              - Check bot status"
echo "  pm2 logs telegram-rpg-bot - View bot logs"
echo "  pm2 restart telegram-rpg-bot - Restart bot"
echo "  pm2 stop telegram-rpg-bot - Stop bot"
echo ""
