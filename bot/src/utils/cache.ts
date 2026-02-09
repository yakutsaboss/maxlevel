/**
 * Simple in-memory TTL cache.
 * Avoids hitting the DB for data that rarely changes
 * (achievements list, modes list, leaderboard).
 *
 * No external dependencies (no Redis needed for this scale).
 *
 * === Known Cache Keys & TTLs ===
 *
 * Key Pattern                  | TTL     | Description
 * -----------------------------|---------|-----------------------------------
 * modes:all                    | MEDIUM  | All available modes list
 * achievements:all             | MEDIUM  | All achievement definitions
 * leaderboard:weekly           | SHORT   | Weekly leaderboard data
 * leaderboard:alltime          | SHORT   | All-time leaderboard data
 * user:{userId}:stats          | SHORT   | User stats (level, XP, streaks)
 * user:{userId}:achievements   | MEDIUM  | User's unlocked achievements
 * user:{userId}:modes          | MEDIUM  | User's active modes
 * user:{userId}:quests         | SHORT   | User's active quests
 *
 * === Invalidation Strategy ===
 *
 * After quest completion:
 *   invalidatePrefix('user:{userId}:')  — clears stats, quests, achievements
 *   invalidatePrefix('leaderboard:')    — leaderboard may have changed
 *
 * After achievement unlock:
 *   invalidate('user:{userId}:achievements')
 *
 * After mode change:
 *   invalidate('user:{userId}:modes')
 *   invalidate('modes:all')
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
 * Example: invalidatePrefix('user:42:') clears all cache for user 42.
 */
export function invalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/**
 * Invalidate all keys matching a glob-like pattern.
 * Supports '*' as a wildcard segment.
 * Example: invalidatePattern('user:*:stats') clears stats for ALL users.
 */
export function invalidatePattern(pattern: string): void {
  const regexStr = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // escape regex specials
    .replace(/\*/g, '[^:]*'); // * matches any segment (not colon)
  const regex = new RegExp(`^${regexStr}$`);

  for (const key of store.keys()) {
    if (regex.test(key)) {
      store.delete(key);
    }
  }
}

/**
 * Invalidate all user-related cache after a significant action (quest completion, etc.).
 */
export function invalidateUserCache(userId: number): void {
  invalidatePrefix(`user:${userId}:`);
  invalidatePrefix('leaderboard:');
}

/**
 * Clear the entire cache.
 */
export function clearAll(): void {
  store.clear();
}

/**
 * Get current cache size (for monitoring/debugging).
 */
export function size(): number {
  return store.size;
}

// Common TTL constants
export const TTL = {
  SHORT: 30_000,         // 30 seconds (leaderboard, user stats)
  MEDIUM: 5 * 60_000,    // 5 minutes (mode lists, achievement definitions)
  LONG: 30 * 60_000,     // 30 minutes (static config)
} as const;
