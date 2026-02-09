/**
 * Tests for admin authentication middleware (bot/src/api/middleware/adminAuth.ts)
 *
 * Tests authenticateAdmin, requirePermission, and requireRole middleware
 * using mock Express req/res objects.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockNext } from '../setup.js';
import crypto from 'crypto';

// ─── Import module under test ──────────────────────────────────────

import {
  authenticateAdmin,
  requirePermission,
  requireRole,
  addAdminUser,
} from '../../api/middleware/adminAuth.js';

// ─── Set up test admin user via the exported function ──────────────
// (Avoids env-var timing issues with ESM static imports)

const TEST_USERNAME = 'testadmin';
const TEST_PASSWORD = 'testpass123';
addAdminUser(TEST_USERNAME, TEST_PASSWORD, 'super_admin', ['*']);

// ─── Helpers ───────────────────────────────────────────────────────

function basicAuthHeader(user: string, pass: string): string {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

// Using shared mockResponse() from setup.ts (now includes setHeader/getHeader)

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('authenticateAdmin', () => {
  it('should call next() with valid credentials', () => {
    const req = mockRequest({
      headers: { authorization: basicAuthHeader(TEST_USERNAME, TEST_PASSWORD) },
    });
    const res = mockResponse();
    const next = mockNext();

    authenticateAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res._status).toBe(200);
    expect((req as any).adminUser).toBeDefined();
    expect((req as any).adminUser.username).toBe(TEST_USERNAME);
    expect((req as any).adminUser.role).toBe('super_admin');
  });

  it('should return 401 when authorization header is missing', () => {
    const req = mockRequest({ headers: {} });
    const res = mockResponse();
    const next = mockNext();

    authenticateAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(res._json.error).toBe('Unauthorized');
    expect(res._json.message).toBe('Admin authentication required');
    expect(res._headers['WWW-Authenticate']).toBe('Basic realm="Admin Area"');
  });

  it('should return 401 for invalid credentials (wrong password)', () => {
    const req = mockRequest({
      headers: { authorization: basicAuthHeader(TEST_USERNAME, 'wrongpassword') },
    });
    const res = mockResponse();
    const next = mockNext();

    authenticateAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Invalid credentials');
  });

  it('should return 401 for unknown username', () => {
    const req = mockRequest({
      headers: { authorization: basicAuthHeader('unknownuser', TEST_PASSWORD) },
    });
    const res = mockResponse();
    const next = mockNext();

    authenticateAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Invalid credentials');
  });

  it('should return 401 for malformed Basic Auth header', () => {
    const req = mockRequest({
      headers: { authorization: 'Basic !!!not-valid!!!' },
    });
    const res = mockResponse();
    const next = mockNext();

    authenticateAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  it('should return 401 for non-Basic auth scheme', () => {
    const req = mockRequest({
      headers: { authorization: 'Bearer some-token' },
    });
    const res = mockResponse();
    const next = mockNext();

    authenticateAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  it('should return 401 when password is empty', () => {
    const req = mockRequest({
      headers: { authorization: 'Basic ' + Buffer.from(`${TEST_USERNAME}:`).toString('base64') },
    });
    const res = mockResponse();
    const next = mockNext();

    authenticateAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });
});

describe('requirePermission', () => {
  it('should call next() when admin has wildcard permission', () => {
    const req = mockRequest();
    (req as any).adminUser = {
      id: 'admin1',
      username: 'admin1',
      role: 'super_admin',
      permissions: ['*'],
    };
    const res = mockResponse();
    const next = mockNext();

    requirePermission('users:delete')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should call next() when admin has specific permission', () => {
    const req = mockRequest();
    (req as any).adminUser = {
      id: 'mod1',
      username: 'mod1',
      role: 'moderator',
      permissions: ['users:read', 'users:delete'],
    };
    const res = mockResponse();
    const next = mockNext();

    requirePermission('users:delete')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when admin lacks the required permission', () => {
    const req = mockRequest();
    (req as any).adminUser = {
      id: 'mod1',
      username: 'mod1',
      role: 'moderator',
      permissions: ['users:read'],
    };
    const res = mockResponse();
    const next = mockNext();

    requirePermission('users:delete')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
    expect(res._json.error).toBe('Forbidden');
  });

  it('should return 401 when no admin user is attached', () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = mockNext();

    requirePermission('users:read')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });
});

describe('requireRole', () => {
  it('should call next() when admin has sufficient role', () => {
    const req = mockRequest();
    (req as any).adminUser = {
      id: 'sa',
      username: 'sa',
      role: 'super_admin',
      permissions: ['*'],
    };
    const res = mockResponse();
    const next = mockNext();

    requireRole('admin')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when admin role is insufficient', () => {
    const req = mockRequest();
    (req as any).adminUser = {
      id: 'mod',
      username: 'mod',
      role: 'moderator',
      permissions: [],
    };
    const res = mockResponse();
    const next = mockNext();

    requireRole('super_admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
    expect(res._json.error).toBe('Forbidden');
  });
});
