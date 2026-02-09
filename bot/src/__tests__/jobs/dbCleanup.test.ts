/**
 * Tests for Database Cleanup Job (bot/src/jobs/definitions/dbCleanup.ts)
 *
 * Tests: transaction behavior, all cleanups execute, rollback on failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockTransaction = vi.fn();

vi.mock('../../utils/db.js', () => ({
  transaction: (...args: any[]) => mockTransaction(...args),
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  getPool: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { handler, JOB_NAME, CRON_SCHEDULE } from '../../jobs/definitions/dbCleanup.js';

// ─── Tests ───────────────────────────────────────────────────────────

describe('dbCleanup', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('db-cleanup');
    expect(CRON_SCHEDULE).toBe('0 3 * * 0');
  });

  it('should run all 4 cleanup statements in a transaction', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rowCount: 10 }),
    };

    mockTransaction.mockImplementationOnce(async (fn: any) => fn(mockClient));

    await handler([{} as any]);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });

  it('should execute cleanup statements for correct tables', async () => {
    const queryCalls: string[] = [];
    const mockClient = {
      query: vi.fn().mockImplementation((stmt: string) => {
        queryCalls.push(stmt);
        return { rowCount: 5 };
      }),
    };

    mockTransaction.mockImplementationOnce(async (fn: any) => fn(mockClient));

    await handler([{} as any]);

    expect(queryCalls).toHaveLength(4);
    expect(queryCalls[0]).toContain('quest_instances');
    expect(queryCalls[1]).toContain('punishment_history');
    expect(queryCalls[2]).toContain('onboarding_state');
    expect(queryCalls[3]).toContain('user_activity_log');
  });

  it('should report total rows deleted', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rowCount: 100 })
        .mockResolvedValueOnce({ rowCount: 50 })
        .mockResolvedValueOnce({ rowCount: 25 })
        .mockResolvedValueOnce({ rowCount: 10 }),
    };

    mockTransaction.mockImplementationOnce(async (fn: any) => fn(mockClient));

    await handler([{} as any]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('185 total rows deleted')
    );

    consoleSpy.mockRestore();
  });

  it('should rollback all cleanups if any fails (transaction behavior)', async () => {
    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rowCount: 10 })
        .mockRejectedValueOnce(new Error('FK constraint violation')),
    };

    mockTransaction.mockImplementationOnce(async (fn: any) => fn(mockClient));

    await expect(handler([{} as any])).rejects.toThrow('FK constraint violation');
  });

  it('should handle null rowCount gracefully', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rowCount: null }),
    };

    mockTransaction.mockImplementationOnce(async (fn: any) => fn(mockClient));

    await expect(handler([{} as any])).resolves.toBeUndefined();
  });
});
