# BuddyRide API - Deployment Guide

**Target:** Hostinger VPS / Ubuntu 22.04 LTS  
**Domain:** api.buddyride.com  
**Stack:** Node.js 20 LTS · NestJS · PostgreSQL 16 · PostGIS · Redis 7 · Nginx · PM2

---

## Table of Contents

1. [Initial Server Setup](#1-initial-server-setup)
2. [Install Node.js 20 LTS via nvm](#2-install-nodejs-20-lts-via-nvm)
3. [Install PostgreSQL 16 with PostGIS](#3-install-postgresql-16-with-postgis)
4. [Install Redis 7](#4-install-redis-7)
5. [Install Nginx and PM2](#5-install-nginx-and-pm2)
6. [Clone Repository and Install Dependencies](#6-clone-repository-and-install-dependencies)
7. [Configure .env File](#7-configure-env-file)
8. [Run Prisma Migrations](#8-run-prisma-migrations)
9. [Build the Application](#9-build-the-application)
10. [Start with PM2](#10-start-with-pm2)
11. [Configure Nginx](#11-configure-nginx)
12. [SSL with Certbot](#12-ssl-with-certbot)
13. [Setup Cron Jobs](#13-setup-cron-jobs)
14. [Database Backup Strategy](#14-database-backup-strategy)
15. [Monitoring](#15-monitoring)

---

## 1. Initial Server Setup

```bash
# Log in as root (or use sudo throughout)
ssh root@YOUR_VPS_IP

# Update system packages
apt update && apt upgrade -y

# Install essential utilities
apt install -y curl wget git unzip build-essential software-properties-common \
               ca-certificates gnupg lsb-release ufw fail2ban

# ------- Firewall (UFW) -------
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp        # SSH
ufw allow 80/tcp        # HTTP
ufw allow 443/tcp       # HTTPS
ufw --force enable
ufw status verbose

# ------- Fail2Ban (SSH brute-force protection) -------
systemctl enable fail2ban
systemctl start fail2ban

# Configure Fail2Ban jail for SSH
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled  = true
port     = 22
logpath  = /var/log/auth.log
EOF

systemctl restart fail2ban
fail2ban-client status sshd

# ------- Create deploy user (avoid running as root) -------
adduser deploy
usermod -aG sudo deploy

# Copy your SSH key to the deploy user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

---

## 2. Install Node.js 20 LTS via nvm

```bash
# Switch to deploy user
su - deploy

# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell profile
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v   # v20.x.x
npm -v
```

---

## 3. Install PostgreSQL 16 with PostGIS

```bash
# Add PostgreSQL official repo
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Install PostgreSQL 16 + PostGIS
sudo apt install -y postgresql-16 postgresql-16-postgis-3 postgresql-client-16

# Start and enable PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql << 'SQL'
CREATE USER buddyride WITH PASSWORD 'YOUR_DB_PASSWORD_HERE';
CREATE DATABASE buddyride_db OWNER buddyride;
\c buddyride_db
CREATE EXTENSION IF NOT EXISTS postgis;
GRANT ALL PRIVILEGES ON DATABASE buddyride_db TO buddyride;
GRANT ALL ON SCHEMA public TO buddyride;
SQL

# Verify PostGIS is active
sudo -u postgres psql -d buddyride_db -c "SELECT PostGIS_version();"

# (Optional) Tune postgresql.conf for small VPS (2 GB RAM)
sudo nano /etc/postgresql/16/main/postgresql.conf
# Recommended settings for 2 GB RAM VPS:
# shared_buffers = 256MB
# effective_cache_size = 768MB
# maintenance_work_mem = 64MB
# checkpoint_completion_target = 0.9
# wal_buffers = 16MB
# max_connections = 50

sudo systemctl restart postgresql
```

---

## 4. Install Redis 7

```bash
# Add Redis official repo
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor \
  -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] \
  https://packages.redis.io/deb $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt update
sudo apt install -y redis

# Enable and start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Secure Redis (bind to localhost, set password)
sudo nano /etc/redis/redis.conf
# Set: bind 127.0.0.1 ::1
# Set: requirepass YOUR_REDIS_PASSWORD_HERE
# Set: maxmemory 128mb
# Set: maxmemory-policy allkeys-lru

sudo systemctl restart redis-server

# Verify
redis-cli -a YOUR_REDIS_PASSWORD_HERE ping   # PONG
```

---

## 5. Install Nginx and PM2

```bash
# Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Install PM2 globally
npm install -g pm2

# Install pm2-logrotate module
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# Verify versions
nginx -v
pm2 -v
```

---

## 6. Clone Repository and Install Dependencies

```bash
# As the deploy user
cd /home/deploy

# Clone the repository
git clone https://github.com/YOUR_ORG/buddyride-backend.git buddyride
cd buddyride/backend

# Install production dependencies only
npm ci --omit=dev

# Generate Prisma client
npx prisma generate

# Create logs directory
mkdir -p logs
```

---

## 7. Configure .env File

```bash
cd /home/deploy/buddyride/backend

# Create .env from example
cp .env.example .env
nano .env
```

Populate all required variables:

```dotenv
# ── Application ──────────────────────────────────────────
NODE_ENV=production
PORT=3000

# ── Database ─────────────────────────────────────────────
DATABASE_URL="postgresql://buddyride:YOUR_DB_PASSWORD_HERE@127.0.0.1:5432/buddyride_db?schema=public"

# ── Redis ────────────────────────────────────────────────
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD_HERE

# ── JWT ──────────────────────────────────────────────────
JWT_SECRET=your_very_long_random_jwt_secret_at_least_64_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_very_long_random_refresh_secret_at_least_64_chars
JWT_REFRESH_EXPIRES_IN=30d

# ── Razorpay ─────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXX
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# ── Cloudinary ───────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ── SMS / OTP Provider ───────────────────────────────────
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=BDRIDE

# ── CORS ─────────────────────────────────────────────────
CORS_ORIGINS=https://buddyride.com,https://admin.buddyride.com

# ── Rate Limiting ────────────────────────────────────────
THROTTLE_TTL=60
THROTTLE_LIMIT=30
```

Secure the .env file:

```bash
chmod 600 .env
```

---

## 8. Run Prisma Migrations

```bash
cd /home/deploy/buddyride/backend

# Deploy all pending migrations (does NOT prompt in production)
npx prisma migrate deploy

# Seed initial data (admin user, pricing config, branding)
npx ts-node prisma/seed.ts

# Verify schema applied
npx prisma db pull   # optional: inspect current DB state
```

---

## 9. Build the Application

```bash
cd /home/deploy/buddyride/backend

# Compile TypeScript -> dist/
npm run build

# Verify the entry point exists
ls -la dist/main.js
```

---

## 10. Start with PM2

```bash
cd /home/deploy/buddyride/backend

# Start using the ecosystem config in production mode
pm2 start ecosystem.config.js --env production

# Check that all instances are online
pm2 list
pm2 status

# Save current process list (auto-restore after reboot)
pm2 save

# Generate and enable startup script
pm2 startup systemd -u deploy --hp /home/deploy
# Copy and run the command printed by the above output. Example:
# sudo env PATH=$PATH:/home/deploy/.nvm/versions/node/v20.x.x/bin \
#   /home/deploy/.nvm/versions/node/v20.x.x/lib/node_modules/pm2/bin/pm2 \
#   startup systemd -u deploy --hp /home/deploy

# Verify service is enabled
sudo systemctl status pm2-deploy
```

---

## 11. Configure Nginx

```bash
# Copy the BuddyRide Nginx config
sudo cp /home/deploy/buddyride/backend/nginx/buddyride.conf \
        /etc/nginx/sites-available/buddyride

# Enable the site
sudo ln -s /etc/nginx/sites-available/buddyride \
           /etc/nginx/sites-enabled/buddyride

# Remove default site if still enabled
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Confirm Nginx is running and listening on 80/443
sudo ss -tlnp | grep nginx
```

---

## 12. SSL with Certbot

```bash
# Install Certbot and the Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install certificate for api.buddyride.com
# (Make sure your DNS A record points to this VPS IP first)
sudo certbot --nginx -d api.buddyride.com \
  --non-interactive --agree-tos \
  --email admin@buddyride.com \
  --redirect

# Verify auto-renewal timer
sudo systemctl status certbot.timer
sudo certbot renew --dry-run

# Check certificate expiry
sudo certbot certificates
```

---

## 13. Setup Cron Jobs

```bash
crontab -e
```

Add the following cron entries:

```cron
# ── BuddyRide Cron Jobs ──────────────────────────────────

# Check and expire subscriptions every hour
0 * * * * cd /home/deploy/buddyride/backend && node dist/cron/subscription-expiry.js >> logs/cron-subscription.log 2>&1

# Daily database backup at 2:30 AM
30 2 * * * /home/deploy/scripts/db-backup.sh >> /home/deploy/backups/backup.log 2>&1

# Clean expired OTP records every 6 hours
0 */6 * * * cd /home/deploy/buddyride/backend && node dist/cron/cleanup-otp.js >> logs/cron-cleanup.log 2>&1

# Certbot renewal check (already handled by systemd timer, but keep as fallback)
0 4 * * * certbot renew --quiet
```

---

## 14. Database Backup Strategy

### Setup backup script

```bash
mkdir -p /home/deploy/scripts /home/deploy/backups

cat > /home/deploy/scripts/db-backup.sh << 'SCRIPT'
#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/deploy/backups"
DB_NAME="buddyride_db"
DB_USER="buddyride"
RETENTION_DAYS=7

# Dump database
PGPASSWORD="YOUR_DB_PASSWORD_HERE" pg_dump \
  -h 127.0.0.1 \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F c \
  -Z 9 \
  -f "${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"

echo "[$(date)] Backup created: ${DB_NAME}_${TIMESTAMP}.dump"

# Remove backups older than RETENTION_DAYS days
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Old backups pruned (retention: ${RETENTION_DAYS} days)"

# Optional: Sync to S3 (requires aws-cli configured)
# aws s3 cp "${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump" \
#   s3://your-bucket/buddyride-backups/ --storage-class STANDARD_IA
SCRIPT

chmod +x /home/deploy/scripts/db-backup.sh

# Test the backup script
/home/deploy/scripts/db-backup.sh
ls -lh /home/deploy/backups/
```

### Restore from backup

```bash
# List available backups
ls -lh /home/deploy/backups/

# Restore a specific backup
PGPASSWORD="YOUR_DB_PASSWORD_HERE" pg_restore \
  -h 127.0.0.1 \
  -U buddyride \
  -d buddyride_db \
  --clean --if-exists \
  /home/deploy/backups/buddyride_db_YYYYMMDD_HHMMSS.dump
```

---

## 15. Monitoring

### PM2 Monitoring

```bash
# Real-time dashboard (CPU, memory, logs)
pm2 monit

# View application logs
pm2 logs buddyride-api
pm2 logs buddyride-api --lines 200

# View only error logs
pm2 logs buddyride-api --err

# Application status summary
pm2 list
pm2 show buddyride-api

# Reload all instances with zero downtime
pm2 reload ecosystem.config.js --env production
```

### Nginx Monitoring

```bash
# Live access log
sudo tail -f /var/log/nginx/buddyride.access.log

# Live error log
sudo tail -f /var/log/nginx/buddyride.error.log

# Request count last hour
sudo awk '{print $4}' /var/log/nginx/buddyride.access.log \
  | cut -d: -f2-3 | sort | uniq -c | sort -rn | head -20
```

### System Health

```bash
# CPU / memory overview
htop

# Disk usage
df -h

# Open connections on port 3000
sudo ss -tlnp | grep :3000

# Check PostgreSQL connection count
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Redis memory usage
redis-cli -a YOUR_REDIS_PASSWORD_HERE info memory
```

---

## Quick Reference: Common Commands

| Task | Command |
|---|---|
| Deploy new code | `git pull && npm ci --omit=dev && npm run build && pm2 reload ecosystem.config.js --env production` |
| Run migrations | `npx prisma migrate deploy` |
| Restart all PM2 processes | `pm2 restart all` |
| View all logs | `pm2 logs` |
| Nginx config test | `sudo nginx -t && sudo systemctl reload nginx` |
| Check SSL cert | `sudo certbot certificates` |
| Manual DB backup | `/home/deploy/scripts/db-backup.sh` |
| Check UFW rules | `sudo ufw status verbose` |
| Fail2Ban status | `sudo fail2ban-client status` |
