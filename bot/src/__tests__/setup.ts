/**
 * Test setup — shared mock helpers for Grammy context, Express req/res, pg pool.
 * Used by all test files in this project.
 */

import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ─── Express mock helpers ────────────────────────────────────────────

export function mockRequest(overrides: Partial<Request> = {}): Request {
  const req = {
    params: {},
    query: {},
    body: {},
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;
  return req;
}

export function mockResponse(): Response & {
  _status: number;
  _json: any;
  _headers: Record<string, string>;
} {
  const res: any = {
    _status: 200,
    _json: null,
    _headers: {} as Record<string, string>,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: any) {
      res._json = body;
      return res;
    },
    send(body: any) {
      res._json = body;
      return res;
    },
    setHeader(key: string, value: string) {
      res._headers[key] = value;
      return res;
    },
    getHeader(key: string): string | undefined {
      return res._headers[key];
    },
  };
  return res;
}

export function mockNext(): NextFunction & { called: boolean; error?: any } {
  const fn: any = vi.fn((err?: any) => {
    fn.called = true;
    fn.error = err;
  });
  fn.called = false;
  fn.error = undefined;
  return fn;
}

// ─── Database mock helpers ───────────────────────────────────────────

/**
 * Creates a mock for the db module (utils/db.ts).
 * Usage: vi.mock('../../utils/db.js', () => createDbMock())
 */
export function createDbMock() {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    transaction: vi.fn().mockImplementation(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      };
      return fn(mockClient);
    }),
    getPool: vi.fn(),
    testConnection: vi.fn().mockResolvedValue(true),
    closePool: vi.fn(),
  };
}

/**
 * Creates a mock for the pythonTools module.
 * Only executePythonTool remains — all wrapper functions were removed in Run 24
 * (migrated to native SQL in handlers/jobs).
 */
export function createPythonToolsMock() {
  return {
    executePythonTool: vi.fn().mockResolvedValue({ success: true, data: {} }),
  };
}

/**
 * Creates a mock for the cache module.
 */
export function createCacheMock() {
  return {
    cached: vi.fn().mockImplementation(async (_key: string, _ttl: number, fn: () => Promise<any>) => fn()),
    invalidate: vi.fn(),
    invalidatePrefix: vi.fn(),
    clearAll: vi.fn(),
    TTL: { SHORT: 30_000, MEDIUM: 300_000, LONG: 1_800_000 },
  };
}

// ─── Telegram test data ──────────────────────────────────────────────

export const TEST_TELEGRAM_USER = {
  id: 123456789,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser',
  language_code: 'en',
};

export const TEST_DB_USER = {
  id: 1,
  telegram_id: 123456789,
  username: 'testuser',
  first_name: 'Test',
  current_level: 5,
  total_xp: 2500,
  timezone: 'UTC',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
};