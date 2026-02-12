/**
 * Shared HTTP test mock factories.
 *
 * Reduces boilerplate in supertest-based HTTP integration tests.
 * Each `createMock*()` factory returns a vi.mock()-compatible `.module`
 * shape plus trackable fn references for test assertions.
 *
 * Because vitest hoists `vi.mock()` above static imports, the factories
 * must be called via async dynamic import inside the `vi.mock` factory:
 *
 *   vi.mock('../../../utils/db.js', async () =>
 *     (await import('../../helpers/httpMocks.js')).createMockDb().module);
 *
 * Then retrieve the mock refs at module scope via the getter:
 *
 *   import { getMockDb } from '../../helpers/httpMocks.js';
 *   const db = getMockDb();
 *   // in tests: db.query.mockResolvedValueOnce([...])
 */

import { vi } from 'vitest';

// ─── Internal state (per-test-file since vitest isolates modules) ────

let _db: MockDb | null = null;
let _cache: MockCache | null = null;
let _pythonTools: MockPythonTools | null = null;
let _auth: MockAuth | null = null;
let _rateLimiters: MockRateLimiters | null = null;

// ─── Database mock ───────────────────────────────────────────────────

export interface MockDb {
  query: ReturnType<typeof vi.fn>;
  queryOne: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  module: Record<string, unknown>;
}

export function createMockDb(): MockDb {
  const query = vi.fn();
  const queryOne = vi.fn();
  const execute = vi.fn();
  const transaction = vi.fn();
  _db = {
    query,
    queryOne,
    execute,
    transaction,
    module: {
      query: (...args: unknown[]) => query(...args),
      queryOne: (...args: unknown[]) => queryOne(...args),
      execute: (...args: unknown[]) => execute(...args),
      transaction: (...args: unknown[]) => transaction(...args),
      getPool: vi.fn(),
    },
  };
  return _db;
}

export function getMockDb(): MockDb {
  if (!_db) throw new Error('createMockDb() not called — add vi.mock for db.js');
  return _db;
}

// ─── Cache mock ──────────────────────────────────────────────────────

export interface MockCache {
  cached: ReturnType<typeof vi.fn>;
  module: Record<string, unknown>;
}

export function createMockCache(): MockCache {
  const cached = vi.fn(async (_k: string, _t: number, fn: () => Promise<unknown>) => fn());
  _cache = {
    cached,
    module: {
      cached,
      invalidate: vi.fn(),
      invalidatePrefix: vi.fn(),
      invalidateUserCache: vi.fn(),
      clearAll: vi.fn(),
      TTL: { SHORT: 30_000, MEDIUM: 300_000, LONG: 1_800_000 },
    },
  };
  return _cache;
}

export function getMockCache(): MockCache {
  if (!_cache) throw new Error('createMockCache() not called — add vi.mock for cache.js');
  return _cache;
}

// ─── PythonTools mock ────────────────────────────────────────────────

export interface MockPythonTools {
  executePythonTool: ReturnType<typeof vi.fn>;
  module: Record<string, unknown>;
}

export function createMockPythonTools(): MockPythonTools {
  const executePythonTool = vi.fn();
  _pythonTools = {
    executePythonTool,
    module: {
      executePythonTool: (...args: unknown[]) => executePythonTool(...args),
      getUserByTelegramId: vi.fn(),
      getUserById: vi.fn(),
    },
  };
  return _pythonTools;
}

export function getMockPythonTools(): MockPythonTools {
  if (!_pythonTools) throw new Error('createMockPythonTools() not called');
  return _pythonTools;
}

// ─── Auth middleware mock ────────────────────────────────────────────

export interface MockAuth {
  requireOwnership: ReturnType<typeof vi.fn>;
  module: Record<string, unknown>;
}

export function createMockAuth(): MockAuth {
  const requireOwnership = vi.fn();
  _auth = {
    requireOwnership,
    module: {
      authenticateTelegram: (_req: unknown, _res: unknown, next: () => void) => next(),
      authorizeUser: (_req: unknown, _res: unknown, next: () => void) => next(),
      requireOwnership,
    },
  };
  return _auth;
}

export function getMockAuth(): MockAuth {
  if (!_auth) throw new Error('createMockAuth() not called — add vi.mock for auth.js');
  return _auth;
}

// ─── Rate limiter mock ──────────────────────────────────────────────

export interface MockRateLimiters {
  module: Record<string, unknown>;
}

export function createMockRateLimiters(): MockRateLimiters {
  const passthrough = (_req: unknown, _res: unknown, next: () => void) => next();
  _rateLimiters = {
    module: {
      apiLimiter: passthrough,
      authLimiter: passthrough,
      mutationLimiter: passthrough,
      readLimiter: passthrough,
    },
  };
  return _rateLimiters;
}

export function getMockRateLimiters(): MockRateLimiters {
  if (!_rateLimiters) throw new Error('createMockRateLimiters() not called');
  return _rateLimiters;
}

// ─── Transaction helper ─────────────────────────────────────────────

export interface MockClient {
  query: ReturnType<typeof vi.fn>;
}

/**
 * Returns a mock transaction implementation. Use with:
 *   db.transaction.mockImplementation(createMockTransaction())
 *
 * The mockClient is accessible via `.client` for assertions.
 */
export function createMockTransaction(): ((fn: (client: MockClient) => Promise<unknown>) => Promise<unknown>) & { client: MockClient } {
  const client: MockClient = { query: vi.fn().mockResolvedValue({ rows: [] }) };
  const impl = async (fn: (client: MockClient) => Promise<unknown>) => fn(client);
  (impl as any).client = client;
  return impl as any;
}
