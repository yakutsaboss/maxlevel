/**
 * Shared HTTP test mock factories.
 *
 * These helpers reduce boilerplate in supertest-based HTTP integration tests.
 * Each factory returns a vi.mock()-compatible module shape plus trackable
 * references that test code can use for assertions (.mockResolvedValueOnce, etc.).
 *
 * Usage pattern:
 *   const db = createMockDb();
 *   vi.mock('../../../utils/db.js', () => db.module);
 *   // in tests: db.query.mockResolvedValueOnce([...])
 */

import { vi } from 'vitest';

// ─── Database mock ───────────────────────────────────────────────────

export interface MockDb {
  query: ReturnType<typeof vi.fn>;
  queryOne: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
  module: Record<string, unknown>;
}

/**
 * Creates a mock db module with trackable fn references.
 * `query`, `queryOne`, `execute`, `transaction` are all vi.fn() — wire them
 * into assertions with `.mockResolvedValueOnce()` etc.
 */
export function createMockDb(): MockDb {
  const query = vi.fn();
  const queryOne = vi.fn();
  const execute = vi.fn();
  const transaction = vi.fn();
  return {
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
}

// ─── Cache mock ──────────────────────────────────────────────────────

export interface MockCache {
  cached: ReturnType<typeof vi.fn>;
  module: Record<string, unknown>;
}

/**
 * Creates a mock cache module. `cached` passes through to the factory fn
 * by default (i.e. no caching in tests).
 */
export function createMockCache(): MockCache {
  const cached = vi.fn(async (_k: string, _t: number, fn: () => Promise<unknown>) => fn());
  return {
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
}

// ─── PythonTools mock ────────────────────────────────────────────────

export interface MockPythonTools {
  executePythonTool: ReturnType<typeof vi.fn>;
  module: Record<string, unknown>;
}

/**
 * Creates a mock pythonTools module with a trackable `executePythonTool`.
 */
export function createMockPythonTools(): MockPythonTools {
  const executePythonTool = vi.fn();
  return {
    executePythonTool,
    module: {
      executePythonTool: (...args: unknown[]) => executePythonTool(...args),
      getUserByTelegramId: vi.fn(),
      getUserById: vi.fn(),
    },
  };
}

// ─── Auth middleware mock ────────────────────────────────────────────

export interface MockAuth {
  requireOwnership: ReturnType<typeof vi.fn>;
  module: Record<string, unknown>;
}

/**
 * Creates a mock auth middleware module. `authenticateTelegram` and
 * `authorizeUser` are passthroughs (call next()). `requireOwnership`
 * is a bare vi.fn() so tests can override it per-case.
 */
export function createMockAuth(): MockAuth {
  const requireOwnership = vi.fn();
  return {
    requireOwnership,
    module: {
      authenticateTelegram: (_req: unknown, _res: unknown, next: () => void) => next(),
      authorizeUser: (_req: unknown, _res: unknown, next: () => void) => next(),
      requireOwnership,
    },
  };
}

// ─── Rate limiter mock ──────────────────────────────────────────────

export interface MockRateLimiters {
  module: Record<string, unknown>;
}

/**
 * Creates a mock rateLimiter module where all limiters are passthroughs.
 */
export function createMockRateLimiters(): MockRateLimiters {
  const passthrough = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    module: {
      apiLimiter: passthrough,
      authLimiter: passthrough,
      mutationLimiter: passthrough,
      readLimiter: passthrough,
    },
  };
}

// ─── Transaction helper ─────────────────────────────────────────────

export interface MockClient {
  query: ReturnType<typeof vi.fn>;
}

/**
 * Returns a mock transaction implementation that creates a mockClient
 * and passes it to the callback fn. Use with:
 *   db.transaction.mockImplementation(createMockTransaction())
 *
 * The returned mockClient is accessible via the `.client` property
 * on the returned function for assertions.
 */
export function createMockTransaction(): ((fn: (client: MockClient) => Promise<unknown>) => Promise<unknown>) & { client: MockClient } {
  const client: MockClient = { query: vi.fn().mockResolvedValue({ rows: [] }) };
  const impl = async (fn: (client: MockClient) => Promise<unknown>) => fn(client);
  (impl as any).client = client;
  return impl as any;
}
