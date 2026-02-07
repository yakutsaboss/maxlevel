# 🚀 Staging Deployment Guide

Complete guide to deploy Telegram RPG Quest Bot to staging environment for testing.

---

## 📋 Prerequisites

### Server Requirements
- **OS:** Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM:** Minimum 1GB, recommended 2GB
- **Storage:** Minimum 10GB free space
- **CPU:** 1 vCPU minimum

### Software Requirements
- Docker & Docker Compose **OR** Node.js 18+ & Python 3.9+
- PostgreSQL 12+ (if not using Docker)
- Git
- PM2 (if not using Docker)

### Access Requirements
- SSH access to server
- Sudo privileges
- Domain name (optional but recommended)
- SSL certificate (for HTTPS)

---

## 🎯 Deployment Options

Choose one:
1. **Docker (Recommended)** - Easiest, most portable
2. **PM2** - Traditional, more control
3. **Systemd** - Native Linux service

---

## Option 1: Docker Deployment (Recommended)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

### Step 2: Clone Repository

```bash
# Create deployment directory
sudo mkdir -p /var/www
cd /var/www

# Clone repository
sudo git clone https://github.com/yourusername/telegram-rpg-bot.git
cd telegram-rpg-bot

# Checkout staging branch (if you have one)
git checkout staging
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required variables:**
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_staging_bot_token

# Database
POSTGRES_DB=telegram_rpg_staging
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_PORT=5432

# API
API_PORT=3000
NODE_ENV=staging

# Mini App
MINI_APP_URL=https://staging.yourdomain.com

# Security
SKIP_AUTH=false
SKIP_RATE_LIMIT=false
```

### Step 4: Build and Start

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f bot
```

**Expected output:**
```
telegram_rpg_bot      | 🌐 API Server running on http://localhost:3000
telegram_rpg_bot      | 🤖 Bot started successfully!
telegram_rpg_db       | database system is ready to accept connections
```

### Step 5: Verify Deployment

```bash
# Test health endpoint
curl http://localhost:3000/health

# Check database
docker-compose exec postgres psql -U postgres -d telegram_rpg_staging -c "SELECT COUNT(*) FROM users;"

# View bot logs
docker-compose logs --tail=50 bot
```

### Step 6: Setup Reverse Proxy (Nginx)

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/telegram-rpg-staging
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name staging.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.yourdomain.com;

    # SSL certificates (use certbot)
    ssl_certificate /etc/letsencrypt/live/staging.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/telegram-rpg-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Setup SSL with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d staging.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Step 8: Setup Monitoring

```bash
# Install monitoring tools
docker-compose --profile monitoring up -d

# Or manually setup monitoring
# See MONITORING.md for details
```

---

## Option 2: PM2 Deployment

### Step 1: Install Dependencies

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.9+
sudo apt install python3 python3-pip python3-venv -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2
sudo npm install -g pm2

# Verify installations
node --version
python3 --version
psql --version
pm2 --version
```

### Step 2: Setup Database

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE telegram_rpg_staging;
CREATE USER telegram_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE telegram_rpg_staging TO telegram_user;
\q
EOF

# Load schema
sudo -u postgres psql telegram_rpg_staging < database/schema.sql
sudo -u postgres psql telegram_rpg_staging < database/seed.sql
```

### Step 3: Clone and Setup Project

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/yourusername/telegram-rpg-bot.git
cd telegram-rpg-bot

# Install Node dependencies
cd bot
npm install --production
npm run build
cd ..

# Install Python dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 4: Configure Environment

```bash
# Copy and edit .env
cp .env.example .env
nano .env
```

```env
TELEGRAM_BOT_TOKEN=your_staging_bot_token
DATABASE_URL=postgresql://telegram_user:your_secure_password@localhost:5432/telegram_rpg_staging
API_PORT=3000
NODE_ENV=staging
PYTHON_EXECUTABLE=python3
```

### Step 5: Start with PM2

```bash
# Start application
pm2 start ecosystem.config.js --env staging

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Run the command it outputs

# Check status
pm2 status
pm2 logs telegram-rpg-bot

# Monitor
pm2 monit
```

### Step 6: Setup Nginx (same as Docker option)

Follow Step 6 from Docker deployment.

---

## 🔒 Security Checklist

Before going live with staging:

- [ ] Environment variables properly set
- [ ] SKIP_AUTH=false (no authentication bypass)
- [ ] SKIP_RATE_LIMIT=false (rate limiting enabled)
- [ ] HTTPS enabled (SSL certificate installed)
- [ ] Firewall configured (UFW or iptables)
- [ ] Database uses strong password
- [ ] Bot token is for staging bot (not production)
- [ ] Logs directory has proper permissions
- [ ] Sensitive files not exposed via web server
- [ ] Rate limiting configured in Nginx
- [ ] Security headers enabled

### Configure Firewall

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (only from localhost if using Docker)
# sudo ufw allow from 127.0.0.1 to any port 5432

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 📊 Monitoring & Logs

### View Logs (Docker)

```bash
# Bot logs
docker-compose logs -f bot

# Database logs
docker-compose logs -f postgres

# All services
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100 bot
```

### View Logs (PM2)

```bash
# Real-time logs
pm2 logs telegram-rpg-bot

# Error logs only
pm2 logs telegram-rpg-bot --err

# Last 100 lines
pm2 logs telegram-rpg-bot --lines 100

# Log files location
ls -la logs/
```

### Setup Log Rotation

```bash
# For PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# For Docker
# Edit docker-compose.yml:
# logging:
#   driver: "json-file"
#   options:
#     max-size: "10m"
#     max-file: "3"
```

---

## 🔄 Updates & Maintenance

### Update Code (Docker)

```bash
cd /var/www/telegram-rpg-bot

# Pull latest changes
git pull origin staging

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f bot
```

### Update Code (PM2)

```bash
cd /var/www/telegram-rpg-bot

# Pull latest changes
git pull origin staging

# Rebuild
cd bot
npm install --production
npm run build
cd ..

# Restart
pm2 reload ecosystem.config.js --env staging

# Check status
pm2 status
pm2 logs
```

### Database Migrations

```bash
# Backup database first
docker-compose exec postgres pg_dump -U postgres telegram_rpg_staging > backup_$(date +%Y%m%d).sql

# Run migration
docker-compose exec postgres psql -U postgres telegram_rpg_staging < database/migrations/001_add_column.sql

# Verify
docker-compose exec postgres psql -U postgres telegram_rpg_staging -c "\d users"
```

---

## 🐛 Troubleshooting

### Bot Not Starting

**Check logs:**
```bash
# Docker
docker-compose logs bot

# PM2
pm2 logs telegram-rpg-bot
```

**Common issues:**
1. Missing environment variables → Check `.env`
2. Database not accessible → Check `DATABASE_URL`
3. Port already in use → Change `API_PORT`
4. Build failed → Run `npm run build` manually

### Database Connection Failed

```bash
# Test connection
docker-compose exec bot node -e "require('./utils/pythonTools').testDatabaseConnection()"

# Or with Python
docker-compose exec bot python3 ../tools/db_operations.py --test-connection
```

### API Returns 502 Bad Gateway

**Check:**
1. Bot is running: `docker-compose ps` or `pm2 status`
2. Port 3000 is accessible: `curl http://localhost:3000/health`
3. Nginx config: `sudo nginx -t`
4. Firewall rules: `sudo ufw status`

### SSL Certificate Issues

```bash
# Renew manually
sudo certbot renew

# Check certificate
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

---

## ✅ Verification Checklist

After deployment, test:

- [ ] Health endpoint: `curl https://staging.yourdomain.com/health`
- [ ] Bot responds in Telegram
- [ ] User can register (`/start`)
- [ ] User can complete quest
- [ ] API authentication works
- [ ] Rate limiting active (try 101 requests)
- [ ] Database persists data (restart bot, check data)
- [ ] Logs are being written
- [ ] SSL certificate valid (check in browser)
- [ ] Monitoring tools accessible

---

## 📈 Performance Optimization

### For Production:

1. **Enable Redis caching:**
   ```bash
   docker-compose --profile cache up -d
   ```

2. **Scale API instances (PM2):**
   ```bash
   pm2 scale telegram-rpg-bot 4  # Run 4 instances
   ```

3. **Database optimization:**
   - Add indexes for frequently queried columns
   - Enable query caching
   - Use connection pooling (already implemented)

4. **CDN for static assets**
5. **Load balancer for multiple servers**

---

## 🆘 Support & Next Steps

**If deployment fails:**
1. Check logs (steps above)
2. Review `.env` configuration
3. Test database connection
4. Verify bot token is correct
5. Check firewall rules

**After successful deployment:**
1. Configure monitoring alerts
2. Set up backup automation
3. Document any custom changes
4. Test all features thoroughly
5. Plan production deployment

---

**Staging Deployment Complete!** 🎉

Your bot is now running in staging environment. Test thoroughly before production deployment.

**Next:** [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
