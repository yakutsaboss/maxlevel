# Telegram RPG Bot - Deployment Guide

## ✅ What's Been Set Up

### 1. **MySQL Database** (Timeweb Cloud)
- **Database ID**: 4131461
- **Status**: ✅ Running
- **Cost**: 496 ₽/month (~$5 USD)

**Connection Details:**
```
Host: 192.168.0.4 (internal Timeweb Cloud network)
Port: 3306
Database: default_db
Username: gen_user
Password: n@!fOXG|P*lQ9
```

### 2. **VPS Server** (Timeweb Cloud)
- **Server ID**: 6578335
- **Name**: telegram-rpg-bot
- **Status**: 🔄 Installing (will be ready soon)
- **Specs**: 1 CPU, 1GB RAM, 15GB SSD
- **OS**: Ubuntu 22.04
- **Cost**: 149 ₽/month (~$1.50 USD)

**Total Monthly Cost**: ~645 ₽ (~$6.50 USD)

### 3. **Files Created**
- ✅ MySQL-compatible schema ([database/schema_mysql.sql](database/schema_mysql.sql))
- ✅ MySQL-compatible seed data ([database/seed_data_mysql.sql](database/seed_data_mysql.sql))
- ✅ Server setup script ([scripts/deploy_to_timeweb.sh](scripts/deploy_to_timeweb.sh))
- ✅ Database initialization script ([scripts/initialize_database.sh](scripts/initialize_database.sh))
- ✅ Bot startup script ([scripts/start_bot.sh](scripts/start_bot.sh))

---

## 📋 Next Steps

### Step 1: Wait for Server to Finish Installing

Check server status:
```bash
python tools/timeweb_cloud_manager.py --list-servers
```

When status shows **"on"**, you'll get:
- Server IP address
- Root password (check your email from Timeweb or the console)

### Step 2: Connect to Your Server

Use an SSH client like:
- **Windows**: PuTTY, Windows Terminal, or WSL
- **Mac/Linux**: Terminal

```bash
ssh root@<server_ip>
```

### Step 3: Deploy Your Bot

Once connected to the server, run these commands:

```bash
# 1. Set up the server environment
curl -o setup.sh https://raw.githubusercontent.com/YOUR_REPO/setup.sh
chmod +x setup.sh
./setup.sh

# OR manually:
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs python3 python3-pip mysql-client git
npm install -g pm2
```

### Step 4: Upload Your Code

**Option A: Using Git** (Recommended)
```bash
cd /opt
git clone <your-repo-url> telegram-rpg-bot
cd telegram-rpg-bot
```

**Option B: Using SCP from your local machine**
```bash
# From your Windows machine:
scp -r c:\Users\Asus\Desktop\Wibecode root@<server_ip>:/opt/telegram-rpg-bot
```

### Step 5: Initialize Database

```bash
cd /opt/telegram-rpg-bot
chmod +x scripts/*.sh
./scripts/initialize_database.sh
```

This will:
- Create all database tables
- Insert seed data (modes, achievements, quests)

### Step 6: Install Dependencies and Start Bot

```bash
# Install Node.js dependencies
cd bot
npm install

# Start with PM2 (process manager)
pm2 start npm --name "telegram-rpg-bot" -- run dev
pm2 save
pm2 startup

# View logs
pm2 logs telegram-rpg-bot
```

---

## 🔧 Useful Commands

### Check Bot Status
```bash
pm2 status
pm2 logs telegram-rpg-bot
```

### Restart Bot
```bash
pm2 restart telegram-rpg-bot
```

### Stop Bot
```bash
pm2 stop telegram-rpg-bot
```

### Database Access
```bash
mysql -h 192.168.0.4 -u gen_user -p default_db
# Password: n@!fOXG|P*lQ9
```

### View Database Tables
```sql
USE default_db;
SHOW TABLES;
SELECT COUNT(*) FROM users;
```

---

## 🐛 Troubleshooting

### Bot Not Starting
```bash
# Check logs
pm2 logs telegram-rpg-bot

# Check if Node.js is installed
node --version

# Reinstall dependencies
cd /opt/telegram-rpg-bot/bot
rm -rf node_modules
npm install
```

### Database Connection Issues
```bash
# Test connection
mysql -h 192.168.0.4 -u gen_user -p -e "SELECT 1;"

# Check if database exists
mysql -h 192.168.0.4 -u gen_user -p -e "SHOW DATABASES;"
```

### Get Server IP
```bash
# On your local machine:
python tools/timeweb_cloud_manager.py --list-servers
```

---

## 📞 Support

- Timeweb Cloud Console: https://timeweb.cloud
- Your Database ID: 4131461
- Your Server ID: 6578335

---

## 🎉 When Everything is Running

Your bot will be:
- ✅ Running 24/7 on Timeweb Cloud
- ✅ Connected to MySQL database
- ✅ Auto-restarting if it crashes (via PM2)
- ✅ Starting automatically on server reboot

Test it by sending `/start` to your bot on Telegram!
