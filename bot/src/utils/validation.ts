/**
 * Shared validation utilities for safe parsing and pagination clamping.
 */

/**
 * Safely parse a string to integer, returning defaultVal when the input
 * is undefined, empty, or not a valid number.
 *
 * Unlike `parseInt(val) || default`, this correctly handles '0' as a valid value
 * instead of falling through to the default.
 */
export function safeParseInt(value: string | undefined, defaultVal: number): number {
  if (value === undefined || value === '') return defaultVal;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultVal : parsed;
}

/**
 * Clamp pagination parameters to safe bounds.
 * - limit: clamped to [1, maxLimit] (default maxLimit = 200)
 * - offset: clamped to [0, Infinity)
 */
export function clampPagination(
  limit: number,
  offset: number,
  maxLimit: number = 200
): { limit: number; offset: number } {
  return {
    limit: Math.max(1, Math.min(limit, maxLimit)),
    offset: Math.max(0, offset),
  };
}
