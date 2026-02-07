# Telegram RPG Bot - Timeweb Cloud Deployment Guide

## 🎉 What's Been Set Up

### ✅ Database (Supabase)
- **Service**: Supabase PostgreSQL
- **Status**: Ready with schema and seed data
- **Cost**: Free tier (500MB)

### ✅ VPS Server (Timeweb Cloud - Creating Now)
- **Name**: wibecode-bot
- **Specs**: 1 CPU, 1GB RAM, 15GB SSD
- **OS**: Ubuntu 22.04
- **Cost**: ~149 ₽/month (~$1.50 USD)

---

## 📋 Deployment Steps

### Step 1: Wait for Server to Finish (10-15 minutes)

Check server status:
```bash
python tools/timeweb_cloud_manager.py --list-servers
```

When **Status: "on"**, you'll get:
- Server IP address
- Root password (check email from Timeweb)

### Step 2: Connect to Your Server

**Using SSH** (Windows - use PuTTY, Windows Terminal, or WSL):
```bash
ssh root@<YOUR_SERVER_IP>
```

Enter the root password when prompted.

### Step 3: Set Up Server Environment

Once connected, run these commands:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install git
apt install -y git

# Verify installations
node --version  # Should show v20.x
npm --version
pm2 --version
```

### Step 4: Upload Your Bot Code

**Option A: Using Git (Recommended)**
```bash
# If you have a GitHub repo:
cd /opt
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git wibecode-bot
cd wibecode-bot
```

**Option B: Using SCP from your local machine**
```bash
# From your Windows machine (in PowerShell or CMD):
scp -r "c:\Users\Asus\Desktop\Wibecode" root@<SERVER_IP>:/opt/wibecode-bot
```

**Option C: Manual upload using WinSCP**
- Download WinSCP: https://winscp.net/
- Connect to your server
- Upload the entire `Wibecode` folder to `/opt/wibecode-bot`

### Step 5: Configure Environment Variables

On the server:
```bash
cd /opt/wibecode-bot/bot

# Create .env file
nano .env
```

Paste this content:
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=8215188800:AAE6o-l03E_wE4eo5LoASjAjXgbsiFeb-Ac

# Database (Supabase)
DB_HOST=db.slgeolpkvulqytpazoea.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Fucksupabase2026)
DATABASE_URL=postgresql://postgres:Fucksupabase2026)@db.slgeolpkvulqytpazoea.supabase.co:5432/postgres

# Environment
NODE_ENV=production
LOG_LEVEL=info

# Python Tools
PYTHON_TOOLS_PATH=../tools
PYTHON_EXECUTABLE=python3
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### Step 6: Install Dependencies

```bash
cd /opt/wibecode-bot/bot
npm install
```

### Step 7: Start the Bot with PM2

```bash
# Start bot
pm2 start npm --name "wibecode-bot" -- start

# Save PM2 process list
pm2 save

# Set PM2 to start on system boot
pm2 startup systemd

# View logs
pm2 logs wibecode-bot
```

---

## 🔧 Useful Commands

### Check Bot Status
```bash
pm2 status
pm2 logs wibecode-bot
pm2 monit  # Real-time monitoring
```

### Restart Bot
```bash
pm2 restart wibecode-bot
```

### Stop Bot
```bash
pm2 stop wibecode-bot
```

### Update Bot Code
```bash
cd /opt/wibecode-bot
git pull  # If using Git
pm2 restart wibecode-bot
```

### View System Resources
```bash
htop  # Install with: apt install htop
df -h  # Disk space
free -h  # Memory usage
```

---

## 🐛 Troubleshooting

### Bot Not Starting
```bash
# Check logs for errors
pm2 logs wibecode-bot --lines 50

# Check if Node.js is installed
node --version

# Check if dependencies are installed
cd /opt/wibecode-bot/bot
ls node_modules  # Should list many packages
```

### Database Connection Issues
```bash
# Test database connection
apt install -y postgresql-client
psql "postgresql://postgres:Fucksupabase2026)@db.slgeolpkvulqytpazoea.supabase.co:5432/postgres" -c "SELECT 1;"
```

### Memory Issues
```bash
# Check memory usage
free -h

# Restart bot to free memory
pm2 restart wibecode-bot
```

### Can't Connect via SSH
- Check server IP in Timeweb dashboard
- Verify firewall isn't blocking port 22
- Make sure you're using the correct password

---

## 📊 Monitoring & Maintenance

### Set Up Log Rotation
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Monitor Server Health
```bash
# CPU and memory usage
pm2 monit

# Bot uptime
pm2 list
```

### Automatic Updates (Optional)
```bash
# Create update script
nano /opt/update-bot.sh
```

Paste:
```bash
#!/bin/bash
cd /opt/wibecode-bot
git pull
cd bot
npm install
pm2 restart wibecode-bot
```

Make executable:
```bash
chmod +x /opt/update-bot.sh
```

---

## 🎉 When Everything is Running

Your bot will be:
- ✅ Running 24/7 on Timeweb Cloud
- ✅ Connected to Supabase PostgreSQL
- ✅ Auto-restarting if it crashes (via PM2)
- ✅ Starting automatically on server reboot
- ✅ Accessible via Telegram

**Test it:** Send `/start` to your bot on Telegram!

---

## 📞 Support Resources

- **Timeweb Console**: https://timeweb.cloud
- **Your Server**: Check with `python tools/timeweb_cloud_manager.py --list-servers`
- **Supabase Dashboard**: https://slgeolpkvulqytpazoea.supabase.co
- **Bot Token**: @BotFather on Telegram

---

## 💰 Monthly Costs

- Timeweb VPS: ~149 ₽ (~$1.50 USD)
- Supabase: Free
- **Total: ~$1.50/month** 🎉
