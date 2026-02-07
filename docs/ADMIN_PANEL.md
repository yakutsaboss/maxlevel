# 👑 Admin Panel - Complete Guide

Secure administrative interface for managing Telegram RPG Quest Bot.

---

## 🔐 Security Overview

The admin panel uses **HTTP Basic Authentication** with the following features:
- ✅ Password hashing (SHA-256)
- ✅ Role-based access control (RBAC)
- ✅ Permission-based authorization
- ✅ Audit logging
- ✅ IP tracking

**Important:** Change default admin password before deployment!

---

## 🚀 Quick Start

### 1. Change Default Admin Password

```typescript
// In bot/src/api/middleware/adminAuth.ts

import { generatePasswordHash } from './middleware/adminAuth';

// Generate new password hash
console.log(generatePasswordHash('your_secure_password_here'));

// Copy the hash and update ADMIN_USERS:
const ADMIN_USERS = {
  admin: {
    username: 'admin',
    passwordHash: 'paste_generated_hash_here',
    role: 'super_admin',
    permissions: ['*'],
  },
};
```

### 2. Access Admin Panel

```bash
# Using curl
curl -u admin:your_password http://localhost:3000/api/admin/stats

# Using browser
# Navigate to: http://localhost:3000/api/admin/stats
# Enter credentials when prompted
```

---

## 👥 User Roles & Permissions

### Roles (Hierarchical)

1. **Super Admin** (`super_admin`)
   - Full access to all features
   - Can delete users
   - Can modify system settings
   - Permissions: `['*']` (all)

2. **Admin** (`admin`)
   - Can manage users
   - Can view logs
   - Can send broadcasts
   - Cannot delete users

3. **Moderator** (`moderator`)
   - Can view user data
   - Can deactivate users
   - Limited permissions

### Permissions

- `users:read` - View user information
- `users:update` - Modify user data
- `users:delete` - Delete users (super admin only)
- `quests:manage` - Manage quests
- `modes:manage` - Manage modes
- `system:logs` - View system logs
- `system:broadcast` - Send broadcasts

---

## 📡 API Endpoints

### Base URL
```
http://your-domain.com/api/admin
```

### Authentication
All requests require HTTP Basic Authentication:
```
Authorization: Basic base64(username:password)
```

---

### GET /api/admin/stats
Get system statistics

**Auth Required:** Yes (any admin role)

**Response:**
```json
{
  "users": {
    "total": 1523,
    "active": 1401
  },
  "quests": {
    "total": 45678,
    "active": 3421,
    "completed": 42257
  },
  "achievements": {
    "users_with_achievements": 987
  },
  "timestamp": "2026-02-07T15:30:00.000Z"
}
```

**Example:**
```bash
curl -u admin:password http://localhost:3000/api/admin/stats
```

---

### GET /api/admin/users
List all users with pagination

**Auth Required:** Yes + `users:read` permission

**Query Parameters:**
- `limit` (number) - Max users to return (default: 50)
- `offset` (number) - Skip N users (default: 0)
- `active` (boolean) - Only active users (default: false)

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "telegram_id": 123456789,
      "username": "john_doe",
      "first_name": "John",
      "current_level": 5,
      "total_xp": 2500,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "limit": 50,
  "offset": 0,
  "timestamp": "2026-02-07T15:30:00.000Z"
}
```

**Example:**
```bash
curl -u admin:password "http://localhost:3000/api/admin/users?limit=10&active=true"
```

---

### GET /api/admin/users/:userId
Get detailed user information

**Auth Required:** Yes + `users:read`

**Response:**
```json
{
  "user": {
    "id": 1,
    "telegram_id": 123456789,
    "username": "john_doe",
    "first_name": "John",
    "timezone": "America/New_York",
    "current_level": 5,
    "total_xp": 2500,
    "is_active": true
  },
  "stats": {
    "overall_streak": 7,
    "total_quests_completed": 42,
    "mode_streaks": [...]
  },
  "timestamp": "2026-02-07T15:30:00.000Z"
}
```

**Example:**
```bash
curl -u admin:password http://localhost:3000/api/admin/users/1
```

---

### PATCH /api/admin/users/:userId
Update user details

**Auth Required:** Yes + `users:update`

**Request Body:**
```json
{
  "username": "new_username",
  "first_name": "Jane",
  "timezone": "Europe/London",
  "is_active": true
}
```

**Allowed Fields:**
- `username`
- `first_name`
- `timezone`
- `is_active`

**Response:**
```json
{
  "message": "User updated successfully",
  "user": { /* updated user */ }
}
```

**Example:**
```bash
curl -u admin:password -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"timezone":"Europe/Paris"}' \
  http://localhost:3000/api/admin/users/1
```

---

### POST /api/admin/users/:userId/deactivate
Deactivate user (soft delete - recommended)

**Auth Required:** Yes + `users:update`

**Response:**
```json
{
  "message": "User deactivated successfully",
  "user": { /* updated user */ }
}
```

**Example:**
```bash
curl -u admin:password -X POST \
  http://localhost:3000/api/admin/users/1/deactivate
```

---

### POST /api/admin/users/:userId/reactivate
Reactivate a deactivated user

**Auth Required:** Yes + `users:update`

**Response:**
```json
{
  "message": "User reactivated successfully",
  "user": { /* updated user */ }
}
```

---

### DELETE /api/admin/users/:userId
Delete user (hard delete - use with caution!)

**Auth Required:** Yes + `super_admin` role

**Response:**
```json
{
  "message": "User deleted successfully",
  "deletedUser": {
    "id": 1,
    "telegram_id": 123456789,
    "username": "john_doe"
  }
}
```

**Warning:** This permanently deletes the user and ALL associated data. Prefer `/deactivate` instead.

---

### GET /api/admin/modes
List all available modes

**Auth Required:** Yes (any role)

**Response:**
```json
{
  "modes": [
    {
      "id": 1,
      "name": "fitness",
      "display_name": "Fitness",
      "description": "Track workouts and exercises",
      "icon_emoji": "🏋️"
    }
  ],
  "timestamp": "2026-02-07T15:30:00.000Z"
}
```

---

### POST /api/admin/broadcast
Send broadcast message to users (not yet implemented)

**Auth Required:** Yes + `admin` role

**Request Body:**
```json
{
  "message": "System maintenance in 1 hour",
  "userFilter": {
    "active": true,
    "minLevel": 5
  }
}
```

**Status:** Coming soon (501 Not Implemented)

---

## 🛠️ Adding Admin Users

### Method 1: Using the Utility Function

```typescript
// In your code
import { addAdminUser, generatePasswordHash } from './middleware/adminAuth';

// Add new admin
addAdminUser('jane_admin', 'secure_password', 'admin', ['users:read', 'users:update']);

// Add moderator
addAdminUser('john_mod', 'another_password', 'moderator', ['users:read']);
```

### Method 2: Manually in Configuration

```typescript
// In bot/src/api/middleware/adminAuth.ts

const ADMIN_USERS = {
  admin: {
    username: 'admin',
    passwordHash: generatePasswordHash('your_password'),
    role: 'super_admin',
    permissions: ['*'],
  },
  jane: {
    username: 'jane',
    passwordHash: generatePasswordHash('jane_password'),
    role: 'admin',
    permissions: ['users:read', 'users:update', 'quests:manage'],
  },
  john: {
    username: 'john',
    passwordHash: generatePasswordHash('john_password'),
    role: 'moderator',
    permissions: ['users:read'],
  },
};
```

### Method 3: Store in Database (Recommended for Production)

For production, you should:
1. Create `admin_users` table in database
2. Store hashed passwords with bcrypt (stronger than SHA-256)
3. Load admin users from database on startup
4. Add admin user management endpoints

**Future enhancement:** See "Production Recommendations" section.

---

## 📊 Usage Examples

### Dashboard Script

```bash
#!/bin/bash
# admin-dashboard.sh

ADMIN_USER="admin"
ADMIN_PASS="your_password"
API_URL="http://localhost:3000/api/admin"

echo "=== Telegram RPG Bot Admin Dashboard ==="
echo ""

# System stats
echo "System Statistics:"
curl -s -u "$ADMIN_USER:$ADMIN_PASS" "$API_URL/stats" | jq

echo ""

# Recent users
echo "Recent Users (Last 5):"
curl -s -u "$ADMIN_USER:$ADMIN_PASS" "$API_URL/users?limit=5" | jq '.users[] | {id, username, level: .current_level, active: .is_active}'

echo ""

# Modes
echo "Available Modes:"
curl -s -u "$ADMIN_USER:$ADMIN_PASS" "$API_URL/modes" | jq '.modes[] | {name: .display_name, users: .user_count}'
```

### Python Admin Client

```python
import requests
from requests.auth import HTTPBasicAuth

class AdminClient:
    def __init__(self, base_url, username, password):
        self.base_url = base_url
        self.auth = HTTPBasicAuth(username, password)

    def get_stats(self):
        response = requests.get(f"{self.base_url}/admin/stats", auth=self.auth)
        return response.json()

    def list_users(self, limit=50, offset=0, active_only=False):
        params = {'limit': limit, 'offset': offset}
        if active_only:
            params['active'] = 'true'
        response = requests.get(f"{self.base_url}/admin/users", auth=self.auth, params=params)
        return response.json()

    def deactivate_user(self, user_id):
        response = requests.post(f"{self.base_url}/admin/users/{user_id}/deactivate", auth=self.auth)
        return response.json()

# Usage
client = AdminClient('http://localhost:3000/api', 'admin', 'password')
stats = client.get_stats()
print(f"Total users: {stats['users']['total']}")
```

---

## 🔒 Security Best Practices

### 1. Change Default Credentials

```bash
# NEVER use default admin:admin123 in production!
# Generate new password hash:
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_STRONG_PASSWORD').digest('hex'))"
```

### 2. Use HTTPS in Production

```nginx
# Nginx config
server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    # SSL certificates
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Admin panel (basic auth in Nginx for extra security)
    location /api/admin {
        auth_basic "Admin Area";
        auth_basic_user_file /etc/nginx/.htpasswd;

        proxy_pass http://localhost:3000;
        # ... proxy settings
    }
}
```

### 3. Restrict IP Access

```nginx
# Only allow admin access from specific IPs
location /api/admin {
    allow 192.168.1.100;  # Your office IP
    allow 10.0.0.0/8;     # VPN range
    deny all;

    proxy_pass http://localhost:3000;
}
```

### 4. Add Rate Limiting

Already implemented in `apiLimiter`, but you can add stricter limits:

```typescript
// In rateLimiter.ts
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,  // Very strict for admin
  message: 'Too many admin requests',
});

// In server.ts
app.use('/api/admin', adminLimiter);
```

### 5. Enable Audit Logging

All admin actions are logged:
```
[ADMIN] User 123 updated by jane_admin: {timezone: 'Europe/Paris'}
[ADMIN AUTH SUCCESS] {"timestamp":"...","ip":"192.168.1.100","username":"jane"}
```

Monitor logs for suspicious activity!

---

## 🐛 Troubleshooting

### Authentication Fails

**Error:** 401 Unauthorized

**Solutions:**
1. Check username/password are correct
2. Verify password hash matches in `ADMIN_USERS`
3. Check logs for auth attempts: `[ADMIN AUTH FAILED]`
4. Ensure Basic Auth header is properly formatted

### Permission Denied

**Error:** 403 Forbidden

**Solution:** User doesn't have required permission or role.
```
[ADMIN AUTHZ] User john_mod (moderator) denied: requires admin
```

Check user's `permissions` array includes required permission.

### CORS Issues

**Error:** Cross-Origin Request Blocked

**Solution:** Add admin domain to CORS whitelist:
```typescript
app.use(cors({
  origin: ['https://yourdomain.com', 'https://admin.yourdomain.com'],
  credentials: true,
}));
```

---

## 🚀 Production Recommendations

### 1. Database-Backed Admin Users

Create `admin_users` table:
```sql
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

### 2. Use Bcrypt for Passwords

```bash
npm install bcrypt
```

```typescript
import bcrypt from 'bcrypt';

// Hash password
const hash = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(password, hash);
```

### 3. Add Session Management

Use JWT or session cookies instead of Basic Auth:
```bash
npm install jsonwebtoken
```

### 4. Create Admin UI

Build a web interface:
- React/Vue admin dashboard
- Display stats, charts, user list
- Manage users, quests, modes
- Real-time monitoring

### 5. Add Two-Factor Authentication (2FA)

For critical operations like user deletion.

---

## ✅ Checklist

Before deploying admin panel:

- [ ] Changed default admin password
- [ ] Configured HTTPS for admin routes
- [ ] Restricted IP access (optional)
- [ ] Added additional admin users
- [ ] Tested all endpoints
- [ ] Verified permissions work correctly
- [ ] Set up audit log monitoring
- [ ] Documented custom admin users
- [ ] Added rate limiting
- [ ] Secured with firewall rules

---

**Admin Panel: Ready!** 👑

You now have a secure administrative interface for managing your Telegram RPG Quest Bot!

**Next:** Build a web UI for the admin panel or integrate with existing admin tools.
