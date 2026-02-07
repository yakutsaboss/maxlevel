/**
 * Admin Authentication & Authorization Middleware
 * Provides secure access control for admin endpoints
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Admin user interface
 */
export interface AdminUser {
  id: string;
  username: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
}

/**
 * Admin users configuration
 * In production, store in database with hashed passwords
 */
const ADMIN_USERS: Record<string, { username: string; passwordHash: string; role: string; permissions: string[] }> = {
  // Default admin (CHANGE IN PRODUCTION!)
  admin: {
    username: 'admin',
    // Hash of 'admin123' - MUST CHANGE IN PRODUCTION
    passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    role: 'super_admin',
    permissions: ['*'], // All permissions
  },
};

/**
 * Hash password using SHA-256
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verify password
 */
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Extract Basic Auth credentials from header
 */
function extractBasicAuth(authHeader: string): { username: string; password: string } | null {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (!username || !password) {
      return null;
    }

    return { username, password };
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to authenticate admin users
 * Uses HTTP Basic Authentication
 *
 * Usage:
 *   router.get('/admin/users', authenticateAdmin, handler);
 */
export function authenticateAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const ip = req.ip || req.socket.remoteAddress;

  if (!authHeader) {
    logAdminAuth('failed', 'missing_auth_header', ip);
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required',
    });
    return;
  }

  // Extract credentials
  const credentials = extractBasicAuth(authHeader);

  if (!credentials) {
    logAdminAuth('failed', 'invalid_auth_format', ip);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication format',
    });
    return;
  }

  // Check if user exists
  const adminUser = ADMIN_USERS[credentials.username];

  if (!adminUser) {
    logAdminAuth('failed', 'user_not_found', ip, credentials.username);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials',
    });
    return;
  }

  // Verify password
  if (!verifyPassword(credentials.password, adminUser.passwordHash)) {
    logAdminAuth('failed', 'invalid_password', ip, credentials.username);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials',
    });
    return;
  }

  // Attach admin user to request
  (req as any).adminUser = {
    id: credentials.username,
    username: adminUser.username,
    role: adminUser.role,
    permissions: adminUser.permissions,
  } as AdminUser;

  logAdminAuth('success', undefined, ip, credentials.username);
  next();
}

/**
 * Middleware to check admin permissions
 *
 * Usage:
 *   router.delete('/admin/users/:id', authenticateAdmin, requirePermission('users:delete'), handler);
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const adminUser = (req as any).adminUser as AdminUser | undefined;

    if (!adminUser) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin authentication required',
      });
      return;
    }

    // Super admins have all permissions
    if (adminUser.permissions.includes('*')) {
      next();
      return;
    }

    // Check specific permission
    if (!adminUser.permissions.includes(permission)) {
      console.warn(`[ADMIN AUTHZ] User ${adminUser.username} denied: missing permission '${permission}'`);
      res.status(403).json({
        error: 'Forbidden',
        message: `You do not have permission: ${permission}`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require specific admin role
 *
 * Usage:
 *   router.post('/admin/settings', authenticateAdmin, requireRole('super_admin'), handler);
 */
export function requireRole(role: 'super_admin' | 'admin' | 'moderator') {
  const roleHierarchy = {
    super_admin: 3,
    admin: 2,
    moderator: 1,
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const adminUser = (req as any).adminUser as AdminUser | undefined;

    if (!adminUser) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin authentication required',
      });
      return;
    }

    const userRoleLevel = roleHierarchy[adminUser.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[role];

    if (userRoleLevel < requiredRoleLevel) {
      console.warn(`[ADMIN AUTHZ] User ${adminUser.username} (${adminUser.role}) denied: requires ${role}`);
      res.status(403).json({
        error: 'Forbidden',
        message: `Requires ${role} role`,
      });
      return;
    }

    next();
  };
}

/**
 * Log admin authentication attempt
 */
function logAdminAuth(
  status: 'success' | 'failed',
  reason?: string,
  ip?: string,
  username?: string
): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    status,
    ip,
    username,
    reason,
  };

  if (status === 'success') {
    console.log(`[ADMIN AUTH SUCCESS] ${JSON.stringify(logData)}`);
  } else {
    console.warn(`[ADMIN AUTH FAILED] ${JSON.stringify(logData)}`);
  }
}

/**
 * Utility: Add new admin user
 * Use this function to create new admin accounts
 */
export function addAdminUser(
  username: string,
  password: string,
  role: 'super_admin' | 'admin' | 'moderator' = 'admin',
  permissions: string[] = []
): void {
  const passwordHash = hashPassword(password);

  ADMIN_USERS[username] = {
    username,
    passwordHash,
    role,
    permissions,
  };

  console.log(`[ADMIN] Created admin user: ${username} (${role})`);
  console.log(`[ADMIN] Permissions: ${permissions.length > 0 ? permissions.join(', ') : 'inherited from role'}`);
}

/**
 * Utility: Generate password hash
 * Use this to generate hashes for ADMIN_USERS configuration
 */
export function generatePasswordHash(password: string): string {
  return hashPassword(password);
}

// Log warning about default admin
if (ADMIN_USERS.admin && ADMIN_USERS.admin.passwordHash === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9') {
  console.warn('⚠️  [SECURITY] Default admin password detected! Change immediately in production!');
  console.warn('⚠️  Use: generatePasswordHash("your_secure_password") to create a new hash');
}
