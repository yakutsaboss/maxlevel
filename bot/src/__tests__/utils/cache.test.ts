import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cached,
  invalidate,
  invalidatePrefix,
  invalidatePattern,
  invalidateUserCache,
  clearAll,
  size,
  TTL,
} from '../../utils/cache.js';

beforeEach(() => {
  clearAll();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TTL constants', () => {
  it('exports expected TTL values', () => {
    expect(TTL.SHORT).toBe(30_000);
    expect(TTL.MEDIUM).toBe(5 * 60_000);
    expect(TTL.LONG).toBe(30 * 60_000);
  });
});

describe('cached (set + get)', () => {
  it('returns computed value on cache miss and caches it', async () => {
    const fn = vi.fn().mockResolvedValue('hello');

    const result = await cached('key1', TTL.SHORT, fn);
    expect(result).toBe('hello');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(size()).toBe(1);
  });

  it('returns cached value on subsequent calls without recomputing', async () => {
    const fn = vi.fn().mockResolvedValue(42);

    await cached('num', TTL.SHORT, fn);
    const second = await cached('num', TTL.SHORT, fn);

    expect(second).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1); // only called once
  });

  it('recomputes after TTL expires', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    const v1 = await cached('ttl-key', 1000, fn);
    expect(v1).toBe('first');

    // Advance time past TTL
    vi.advanceTimersByTime(1001);

    const v2 = await cached('ttl-key', 1000, fn);
    expect(v2).toBe('second');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('returns cached value just before TTL expires', async () => {
    const fn = vi.fn().mockResolvedValue('cached');

    await cached('edge', 1000, fn);
    vi.advanceTimersByTime(999);

    const result = await cached('edge', 1000, fn);
    expect(result).toBe('cached');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns null/undefined from cache miss when fn resolves to null', async () => {
    const fn = vi.fn().mockResolvedValue(null);

    const result = await cached('null-key', TTL.SHORT, fn);
    expect(result).toBeNull();
    expect(size()).toBe(1); // null is still cached
  });
});

describe('invalidate', () => {
  it('removes a specific cached entry', async () => {
    await cached('a', TTL.LONG, async () => 'val-a');
    await cached('b', TTL.LONG, async () => 'val-b');
    expect(size()).toBe(2);

    invalidate('a');
    expect(size()).toBe(1);

    // 'a' must recompute
    const fn = vi.fn().mockResolvedValue('new-a');
    const result = await cached('a', TTL.LONG, fn);
    expect(result).toBe('new-a');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a non-existent key', () => {
    expect(() => invalidate('nonexistent')).not.toThrow();
    expect(size()).toBe(0);
  });
});

describe('invalidatePrefix', () => {
  it('removes all keys matching a prefix', async () => {
    await cached('user:1:stats', TTL.LONG, async () => 'stats');
    await cached('user:1:modes', TTL.LONG, async () => 'modes');
    await cached('user:2:stats', TTL.LONG, async () => 'other');
    expect(size()).toBe(3);

    invalidatePrefix('user:1:');
    expect(size()).toBe(1); // only user:2:stats remains
  });
});

describe('invalidatePattern', () => {
  it('removes keys matching a wildcard pattern', async () => {
    await cached('user:1:stats', TTL.LONG, async () => 1);
    await cached('user:2:stats', TTL.LONG, async () => 2);
    await cached('user:1:modes', TTL.LONG, async () => 3);
    expect(size()).toBe(3);

    invalidatePattern('user:*:stats');
    expect(size()).toBe(1); // only user:1:modes survives
  });

  it('does not remove keys that do not match the pattern', async () => {
    await cached('modes:all', TTL.LONG, async () => 'modes');
    await cached('user:5:stats', TTL.LONG, async () => 'stats');

    invalidatePattern('user:*:stats');
    expect(size()).toBe(1); // modes:all survives
  });
});

describe('invalidateUserCache', () => {
  it('clears user-specific keys and leaderboard keys', async () => {
    await cached('user:42:stats', TTL.LONG, async () => 's');
    await cached('user:42:modes', TTL.LONG, async () => 'm');
    await cached('leaderboard:weekly', TTL.LONG, async () => 'w');
    await cached('leaderboard:alltime', TTL.LONG, async () => 'a');
    await cached('user:99:stats', TTL.LONG, async () => 'other');
    expect(size()).toBe(5);

    invalidateUserCache(42);
    expect(size()).toBe(1); // only user:99:stats remains
  });
});

describe('clearAll + size', () => {
  it('clears all cache entries', async () => {
    await cached('x', TTL.LONG, async () => 1);
    await cached('y', TTL.LONG, async () => 2);
    expect(size()).toBe(2);

    clearAll();
    expect(size()).toBe(0);
  });
});
