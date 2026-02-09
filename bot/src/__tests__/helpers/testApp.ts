/**
 * Shared HTTP test infrastructure.
 *
 * Provides a minimal Express app factory for supertest-based integration tests.
 * Each test file should:
 *   1. Set up vi.mock() calls for db, cache, auth, pythonTools, rateLimiter
 *   2. Call createTestApp() to get a bare Express instance
 *   3. Mount the router under test
 *   4. Use supertest(app) to issue requests
 */

import express, { Express } from 'express';

/**
 * Creates a minimal Express app suitable for HTTP integration tests.
 * Includes only JSON body parsing — no helmet, cors, compression, rate limiting,
 * or any other middleware that would interfere with test assertions.
 */
export function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  return app;
}

/** Standard mock references re-exported for convenience. */
export { mockRequest, mockResponse, mockNext, TEST_TELEGRAM_USER, TEST_DB_USER } from '../setup.js';
