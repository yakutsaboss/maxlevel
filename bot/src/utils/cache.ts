/**
 * Simple in-memory TTL cache.
 * Avoids hitting the DB for data that rarely changes
 * (achievements list, modes list, leaderboard).
 *
 * No external dependencies (no Redis needed for this scale).
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<any>>();

/**
 * Get a cached value, or compute and cache it.
 * @param key   Unique cache key
 * @param ttlMs Time-to-live in milliseconds
 * @param fn    Async function to compute the value if cache miss
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key);

  if (entry && entry.expiresAt > now) {
    return entry.data;
  }

  const data = await fn();
  store.set(key, { data, expiresAt: now + ttlMs });
  return data;
}

/**
 * Invalidate a specific cache key.
 */
export function invalidate(key: string): void {
  store.delete(key);
}

/**
 * Invalidate all keys matching a prefix.
 */
export function invalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/**
 * Clear the entire cache.
 */
export function clearAll(): void {
  store.clear();
}

// Common TTL constants
export const TTL = {
  SHORT: 30_000,         // 30 seconds (leaderboard, user stats)
  MEDIUM: 5 * 60_000,    // 5 minutes (mode lists, achievement definitions)
  LONG: 30 * 60_000,     // 30 minutes (static config)
} as const;
