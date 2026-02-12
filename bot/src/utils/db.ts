/**
 * Native Node.js PostgreSQL Client
 * Replaces Python subprocess calls for database queries.
 * Uses connection pooling for high-concurrency support.
 */

import pg from 'pg';
import { logger } from './logger.js';

const dbLog = logger.child({ component: 'db' });

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * Get or create the connection pool (singleton).
 * Pool handles connection reuse, queueing, and idle timeout automatically.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      // Sizing: each connection uses ~5MB RAM on the server.
      // For thousands of users, 20 connections handles ~200 concurrent queries
      // (each query takes ~5ms, so 20 * 200 = 4,000 req/sec throughput).
      max: 20,
      min: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      // Prevent query from running forever
      statement_timeout: 10_000,
    });

    pool.on('error', (err) => {
      dbLog.error('Unexpected error on idle client', err);
    });

    dbLog.info('Connection pool created', { maxConnections: 20 });
  }

  return pool;
}

/**
 * Execute a parameterized query and return rows.
 * Uses $1, $2, ... placeholders (standard pg parameterization).
 */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = getPool();
  const result = await client.query<T>(text, params);
  return result.rows;
}

/**
 * Execute a query and return the first row or null.
 */
export async function queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Execute a statement (INSERT/UPDATE/DELETE) and return affected row count.
 */
export async function execute(
  text: string,
  params: unknown[] = []
): Promise<number> {
  const client = getPool();
  const result = await client.query(text, params);
  return result.rowCount ?? 0;
}

/**
 * Run multiple queries inside a single transaction.
 * Automatically commits on success, rolls back on error.
 */
export async function transaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Test the database connection. Returns true if healthy.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const rows = await query('SELECT 1 as ok');
    return rows[0]?.ok === 1;
  } catch (err) {
    dbLog.error('Connection test failed', err);
    return false;
  }
}

/**
 * Gracefully close all connections. Call on shutdown.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    dbLog.info('Connection pool closed');
  }
}
