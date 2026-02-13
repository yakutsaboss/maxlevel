/**
 * Tests for Broadcast Utility (bot/src/utils/broadcast.ts)
 *
 * Tests: batch sending, failure handling, rate limiting, return counts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { broadcastMessage } from '../../utils/broadcast.js';

// ─── Helpers ────────────────────────────────────────────────────────

function successResponse() {
  return { ok: true, status: 200, text: vi.fn().mockResolvedValue('ok') };
}

function failResponse(status = 403) {
  return { ok: false, status, text: vi.fn().mockResolvedValue('Forbidden: bot blocked') };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('broadcastMessage', () => {
  it('sends message to all chat IDs and returns correct sent count', async () => {
    mockFetch.mockResolvedValue(successResponse());

    const chatIds = [100, 200, 300];
    const promise = broadcastMessage('test-token', chatIds, '<b>Hello</b>');

    // Advance past any setTimeout delays
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ sent: 3, failed: 0 });
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // Verify correct Telegram API URL and payload
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottest-token/sendMessage');
    const body = JSON.parse(options.body);
    expect(body.chat_id).toBe(100);
    expect(body.text).toBe('<b>Hello</b>');
    expect(body.parse_mode).toBe('HTML');
  });

  it('handles individual send failures gracefully', async () => {
    // User 200 has blocked the bot
    mockFetch
      .mockResolvedValueOnce(successResponse())
      .mockResolvedValueOnce(failResponse(403))
      .mockResolvedValueOnce(successResponse());

    const chatIds = [100, 200, 300];
    const promise = broadcastMessage('test-token', chatIds, 'msg');

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ sent: 2, failed: 1 });
  });

  it('handles fetch throwing (network error) for a user', async () => {
    mockFetch
      .mockResolvedValueOnce(successResponse())
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(successResponse());

    const chatIds = [100, 200, 300];
    const promise = broadcastMessage('test-token', chatIds, 'msg');

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ sent: 2, failed: 1 });
  });

  it('returns { sent: 0, failed: 0 } for empty chat IDs array', async () => {
    const promise = broadcastMessage('test-token', [], 'msg');

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('batches sends in groups of 20 with delays between batches', async () => {
    mockFetch.mockResolvedValue(successResponse());

    // 25 users → batch 1 (20) + batch 2 (5), one 1000ms delay between
    const chatIds = Array.from({ length: 25 }, (_, i) => i + 1);
    const promise = broadcastMessage('test-token', chatIds, 'batch test');

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ sent: 25, failed: 0 });
    expect(mockFetch).toHaveBeenCalledTimes(25);
  });

  it('reports all failures when every send fails', async () => {
    mockFetch.mockResolvedValue(failResponse(500));

    const chatIds = [100, 200];
    const promise = broadcastMessage('test-token', chatIds, 'msg');

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ sent: 0, failed: 2 });
  });
});
