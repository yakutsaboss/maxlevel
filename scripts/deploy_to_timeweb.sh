#!/bin/bash
# Deployment script for Telegram RPG Bot on Timeweb Cloud VPS
# This script sets up the server environment and deploys the bot

set -e  # Exit on error

echo "=========================================="
echo "Telegram RPG Bot - Server Setup"
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Python 3 and pip
echo "📦 Installing Python 3..."
apt-get install -y python3 python3-pip python3-venv

# Install MySQL client
echo "📦 Installing MySQL client..."
apt-get install -y mysql-client

# Install git
echo "📦 Installing git..."
apt-get install -y git

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/telegram-rpg-bot
cd /opt/telegram-rpg-bot

# Install PM2 for process management
echo "📦 Installing PM2..."
npm install -g pm2

echo ""
echo "=========================================="
echo "✅ Server setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Upload your bot code to /opt/telegram-rpg-bot"
echo "2. Run: ./initialize_database.sh"
echo "3. Run: ./start_bot.sh"
echo ""
